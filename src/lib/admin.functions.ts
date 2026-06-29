import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const convertIncompleteToOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const sb = context.supabase;
    const results: { id: string; order_id: string; order_number: string }[] = [];

    for (const id of data.ids) {
      const { data: incomplete, error } = await sb
        .from("incomplete_orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !incomplete) continue;
      if (incomplete.converted_to_order_id) continue;
      if (!incomplete.customer_name || !incomplete.customer_email || !incomplete.customer_phone || !incomplete.shipping_address || !incomplete.zone_id) {
        continue;
      }
      const cart = (incomplete.cart as any[]) || [];
      if (!cart.length) continue;

      const { data: order, error: oErr } = await sb
        .from("orders")
        .insert({
          user_id: incomplete.user_id,
          customer_name: incomplete.customer_name,
          customer_email: incomplete.customer_email,
          customer_phone: incomplete.customer_phone,
          shipping_address: incomplete.shipping_address,
          zone_id: incomplete.zone_id,
          subtotal: incomplete.subtotal,
          shipping: incomplete.shipping,
          total: incomplete.total,
          payment_method: "COD",
          recovered_from_incomplete: true,
          source_incomplete_id: incomplete.id,
        })
        .select("id, order_number")
        .single();
      if (oErr || !order) continue;

      await sb.from("order_items").insert(
        cart.map((l: any) => ({
          order_id: order.id,
          product_id: l.product_id,
          title: l.title,
          price: l.price,
          qty: l.qty,
          image_url: l.image ?? null,
        })),
      );

      await sb.from("incomplete_orders").update({ converted_to_order_id: order.id }).eq("id", id);

      results.push({ id, order_id: order.id, order_number: order.order_number });
    }
    return { converted: results };
  });

export const deleteIncompleteOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("incomplete_orders").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
