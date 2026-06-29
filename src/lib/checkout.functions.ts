import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const cartLine = z.object({
  product_id: z.string().uuid(),
  title: z.string().max(200),
  price: z.number().nonnegative(),
  qty: z.number().int().positive().max(99),
  image: z.string().nullable().optional(),
});

const incompleteSchema = z.object({
  session_id: z.string().min(8).max(80),
  user_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().max(120).nullable().optional(),
  customer_email: z.string().email().max(255).nullable().optional(),
  customer_phone: z.string().max(40).nullable().optional(),
  shipping_address: z.any().nullable().optional(),
  zone_id: z.string().uuid().nullable().optional(),
  cart: z.array(cartLine).max(50),
  subtotal: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  total: z.number().nonnegative(),
  last_field: z.string().max(40).nullable().optional(),
});

export const upsertIncompleteOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => incompleteSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { error } = await sb
      .from("incomplete_orders")
      .upsert(
        {
          session_id: data.session_id,
          user_id: data.user_id ?? null,
          customer_name: data.customer_name ?? null,
          customer_email: data.customer_email ?? null,
          customer_phone: data.customer_phone ?? null,
          shipping_address: data.shipping_address ?? null,
          zone_id: data.zone_id ?? null,
          cart: data.cart as any,
          subtotal: data.subtotal,
          shipping: data.shipping,
          total: data.total,
          last_field: data.last_field ?? null,
        },
        { onConflict: "session_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const placeOrderSchema = z.object({
  session_id: z.string().min(8).max(80),
  customer_name: z.string().min(2).max(120),
  customer_email: z.string().email().max(255),
  customer_phone: z.string().min(5).max(40),
  shipping_address: z.object({
    line1: z.string().min(2).max(200),
    line2: z.string().max(200).optional().nullable(),
    city: z.string().min(2).max(80),
    postal_code: z.string().max(40).optional().nullable(),
  }),
  zone_id: z.string().uuid(),
  cart: z.array(cartLine).min(1).max(50),
  notes: z.string().max(500).optional().nullable(),
  user_id: z.string().uuid().nullable().optional(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => placeOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    // Look up zone price
    const { data: zone, error: zErr } = await sb.from("delivery_zones").select("price").eq("id", data.zone_id).maybeSingle();
    if (zErr || !zone) throw new Error("Invalid delivery zone");

    const subtotal = data.cart.reduce((s, l) => s + l.price * l.qty, 0);
    const shipping = Number(zone.price);
    const total = subtotal + shipping;

    const { data: order, error: oErr } = await sb
      .from("orders")
      .insert({
        user_id: data.user_id ?? null,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        shipping_address: data.shipping_address as any,
        zone_id: data.zone_id,
        subtotal,
        shipping,
        total,
        payment_method: "COD",
        notes: data.notes ?? null,
      })
      .select("id, order_number")
      .single();
    if (oErr || !order) throw new Error(oErr?.message || "Failed to create order");

    const { error: iErr } = await sb.from("order_items").insert(
      data.cart.map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        title: l.title,
        price: l.price,
        qty: l.qty,
        image_url: l.image ?? null,
      })),
    );
    if (iErr) throw new Error(iErr.message);

    // Mark the matching incomplete order as converted (if exists)
    await sb
      .from("incomplete_orders")
      .update({ converted_to_order_id: order.id })
      .eq("session_id", data.session_id);

    return { id: order.id, order_number: order.order_number };
  });

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ order_number: z.string().min(4).max(40), email: z.string().email().max(255) }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: order } = await sb
      .from("orders")
      .select("id, order_number, status, customer_name, total, created_at, updated_at, shipping_address")
      .eq("order_number", data.order_number)
      .eq("customer_email", data.email)
      .maybeSingle();
    if (!order) return { found: false as const };
    return { found: true as const, order };
  });
