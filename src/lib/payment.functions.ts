import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function admin() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function gatewayBase() {
  // Normalize: strip trailing slashes and a trailing `/api` if present,
  // so we can safely append `/api/...` paths regardless of how the user set the base URL.
  return (process.env.UDDOKTAPAY_BASE_URL || "")
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
}

async function callGateway(path: string, body: unknown) {
  const url = `${gatewayBase()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "RT-UDDOKTAPAY-API-KEY": process.env.UDDOKTAPAY_API_KEY!,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* keep text */ }
  if (!res.ok) throw new Error(data?.message || `Gateway error ${res.status}: ${text.slice(0, 200)}`);
  return data ?? {};
}

const createChargeSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive(),
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  origin: z.string().url(),
  partial: z.boolean().optional(),
});

export const createPaymentCharge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createChargeSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = admin();
    const { data: order, error } = await sb
      .from("orders")
      .select("id, order_number, total, customer_email, customer_name, payment_status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if ((order as any).payment_status === "paid") throw new Error("Order already paid");

    const redirect_url = `${data.origin}/api/public/payment/callback?order_id=${order.id}`;
    const cancel_url = `${data.origin}/order-confirmation/${order.id}?cancelled=1`;

    const resp = await callGateway("/api/checkout-v2", {
      full_name: data.full_name || order.customer_name,
      email: data.email || order.customer_email,
      amount: data.amount.toFixed(2),
      metadata: { order_id: order.id, order_number: order.order_number, partial: data.partial ? "1" : "0" },
      redirect_url,
      cancel_url,
      return_type: "GET",
    });

    const payment_url: string | undefined = resp.payment_url || resp.url || resp.checkout_url;
    if (!payment_url) throw new Error("Gateway did not return a payment URL");

    await sb.from("orders").update({
      payment_provider: "uddoktapay",
      payment_status: data.partial ? "partial_pending" : "pending",
      due_amount: data.partial ? Number((order as any).total) - data.amount : 0,
    } as any).eq("id", order.id);

    return { payment_url };
  });

export const verifyPaymentInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ invoice_id: z.string().min(4) }).parse(d))
  .handler(async ({ data }) => {
    const resp = await callGateway("/api/verify-payment", { invoice_id: data.invoice_id });
    const status: string = (resp.status || resp.payment_status || "").toString().toUpperCase();
    const success = status === "COMPLETED" || status === "PAID" || status === "SUCCESS";
    const order_id: string | undefined = resp?.metadata?.order_id;
    const partial = resp?.metadata?.partial === "1";

    if (success && order_id) {
      const sb = admin();
      const { data: order } = await sb.from("orders").select("id,total").eq("id", order_id).maybeSingle();
      if (order) {
        const paid = Number(resp.amount ?? 0);
        const newStatus = partial ? "partial_paid" : paid >= Number((order as any).total) ? "paid" : "partial_paid";
        await sb.from("orders").update({
          payment_status: newStatus,
          paid_amount: paid,
          due_amount: Math.max(0, Number((order as any).total) - paid),
          transaction_id: resp.transaction_id || resp.payment_id || null,
          sender_number: resp.sender_number || null,
          invoice_id: data.invoice_id,
          payment_method: partial ? "PARTIAL" : "ONLINE",
          payment_meta: resp as any,
        } as any).eq("id", order_id);
      }
    } else if (order_id) {
      const sb = admin();
      await sb.from("orders").update({
        payment_status: "failed",
        invoice_id: data.invoice_id,
        payment_meta: resp as any,
      } as any).eq("id", order_id);
    }

    return { success, status, order_id };
  });
