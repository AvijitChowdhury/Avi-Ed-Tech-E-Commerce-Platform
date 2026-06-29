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
    const sb = await adminClient();
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

export const bulkUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      ids: z.array(z.string().uuid()).min(1).max(200),
      status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("orders").update({ status: data.status }).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const trashOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("orders").update({ deleted_at: new Date().toISOString() }).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("orders").update({ deleted_at: null }).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrdersPermanently = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const sb = await adminClient();
    const { error } = await sb.from("orders").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const manualOrderItem = z.object({
  product_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(300),
  price: z.number().nonnegative(),
  qty: z.number().int().positive().max(999),
  image_url: z.string().nullable().optional(),
});

export const createManualOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      customer_name: z.string().trim().min(1).max(200),
      customer_email: z.string().trim().email().max(255),
      customer_phone: z.string().trim().min(1).max(40),
      shipping_address: z.object({
        line1: z.string().trim().min(1).max(300),
        line2: z.string().max(300).optional().nullable(),
        city: z.string().trim().min(1).max(120),
        area: z.string().max(120).optional().nullable(),
        postal_code: z.string().max(40).optional().nullable(),
      }),
      zone_id: z.string().uuid().nullable().optional(),
      shipping: z.number().nonnegative().default(0),
      payment_method: z.enum(["COD", "bKash", "Nagad", "Rocket", "Card", "Bank", "Other"]).default("COD"),
      payment_status: z.enum(["unpaid", "paid", "partial", "failed", "refunded"]).default("unpaid"),
      paid_amount: z.number().nonnegative().default(0),
      transaction_id: z.string().max(120).optional().nullable(),
      sender_number: z.string().max(40).optional().nullable(),
      notes: z.string().max(1000).optional().nullable(),
      status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).default("pending"),
      items: z.array(manualOrderItem).min(1).max(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const sb = await adminClient();
    const subtotal = data.items.reduce((s, l) => s + Number(l.price) * Number(l.qty), 0);
    const total = subtotal + Number(data.shipping || 0);
    const due = Math.max(total - Number(data.paid_amount || 0), 0);
    const { data: order, error } = await sb
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        shipping_address: data.shipping_address,
        zone_id: data.zone_id ?? null,
        subtotal,
        shipping: data.shipping || 0,
        total,
        payment_method: data.payment_method,
        payment_status: data.payment_status,
        paid_amount: data.paid_amount || 0,
        due_amount: due,
        transaction_id: data.transaction_id ?? null,
        sender_number: data.sender_number ?? null,
        notes: data.notes ?? null,
        status: data.status,
      })
      .select("id, order_number")
      .single();
    if (error || !order) throw new Error(error?.message || "Failed to create order");
    const { error: itemsErr } = await sb.from("order_items").insert(
      data.items.map((l) => ({
        order_id: order.id,
        product_id: l.product_id ?? null,
        title: l.title,
        price: l.price,
        qty: l.qty,
        image_url: l.image_url ?? null,
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);
    return { id: order.id, order_number: order.order_number };
  });
