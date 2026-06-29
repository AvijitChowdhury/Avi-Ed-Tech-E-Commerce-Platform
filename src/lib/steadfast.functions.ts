import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

function sfHeaders() {
  const apiKey = process.env.STEADFAST_API_KEY;
  const secret = process.env.STEADFAST_SECRET_KEY;
  if (!apiKey || !secret) throw new Error("Steadfast credentials missing");
  return {
    "Api-Key": apiKey,
    "Secret-Key": secret,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}
function sfBase() {
  return process.env.STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1";
}

function addrToString(addr: any): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  return [addr.line1, addr.line2, addr.area, addr.city, addr.postal_code].filter(Boolean).join(", ");
}

const statusMap: Record<string, string> = {
  pending: "pending",
  delivered_approval_pending: "shipped",
  partial_delivered_approval_pending: "shipped",
  cancelled_approval_pending: "processing",
  unknown_approval_pending: "processing",
  delivered: "delivered",
  partial_delivered: "delivered",
  cancelled: "cancelled",
  hold: "processing",
  in_review: "processing",
  unknown: "processing",
};

export const shipOrdersToSteadfast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    if (!orders?.length) throw new Error("No orders found");

    const toShip = orders.filter((o: any) => !o.steadfast_consignment_id);
    if (!toShip.length) return { created: 0, skipped: orders.length, errors: [] as string[] };

    const payload = toShip.map((o: any) => ({
      invoice: o.order_number,
      recipient_name: (o.customer_name || "Customer").slice(0, 100),
      recipient_phone: String(o.customer_phone || "").replace(/\D/g, "").slice(-11),
      recipient_address: addrToString(o.shipping_address).slice(0, 250) || "N/A",
      cod_amount: o.payment_status === "paid" ? 0 : Number(o.total || 0),
      note: o.notes || "",
    }));

    const res = await fetch(`${sfBase()}/create_order/bulk-order`, {
      method: "POST",
      headers: sfHeaders(),
      body: JSON.stringify({ data: payload }),
    });
    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch { /* noop */ }
    if (!res.ok) throw new Error(`Steadfast bulk failed: ${res.status} ${text.slice(0, 300)}`);

    const items: any[] = json.data || [];
    const errors: string[] = [];
    let created = 0;

    for (let i = 0; i < toShip.length; i++) {
      const order = toShip[i];
      const r = items[i];
      if (!r || r.status === "error") {
        errors.push(`${order.order_number}: ${r?.message || "no response"}`);
        continue;
      }
      const upd = {
        steadfast_consignment_id: String(r.consignment_id ?? ""),
        steadfast_tracking_code: r.tracking_code ?? null,
        steadfast_status: r.status ?? "in_review",
        steadfast_shipped_at: new Date().toISOString(),
        steadfast_synced_at: new Date().toISOString(),
        status: "shipped",
      };
      await supabaseAdmin.from("orders").update(upd as any).eq("id", order.id);
      created++;
    }
    return { created, skipped: orders.length - toShip.length, errors };
  });

export const syncSteadfastStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    return await runSteadfastSync();
  });

export async function runSteadfastSync() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, steadfast_consignment_id, steadfast_status, status")
    .not("steadfast_consignment_id", "is", null)
    .not("status", "in", "(delivered,cancelled)")
    .limit(200);

  let updated = 0;
  const errors: string[] = [];
  for (const o of orders || []) {
    try {
      const res = await fetch(`${sfBase()}/status_by_cid/${o.steadfast_consignment_id}`, {
        method: "GET",
        headers: sfHeaders(),
      });
      if (!res.ok) { errors.push(`${o.order_number}: ${res.status}`); continue; }
      const j: any = await res.json();
      const sfStatus: string = j.delivery_status || j.status || "unknown";
      const mapped = statusMap[sfStatus] || (o as any).status;
      const patch: any = {
        steadfast_status: sfStatus,
        steadfast_synced_at: new Date().toISOString(),
      };
      if (mapped !== (o as any).status) patch.status = mapped;
      await supabaseAdmin.from("orders").update(patch as any).eq("id", o.id);
      updated++;
    } catch (e: any) {
      errors.push(`${o.order_number}: ${e?.message || "fetch error"}`);
    }
  }
  return { checked: orders?.length || 0, updated, errors };
}

export const getSteadfastBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const res = await fetch(`${sfBase()}/get_balance`, { method: "GET", headers: sfHeaders() });
    if (!res.ok) throw new Error(`Steadfast balance failed: ${res.status}`);
    return await res.json();
  });
