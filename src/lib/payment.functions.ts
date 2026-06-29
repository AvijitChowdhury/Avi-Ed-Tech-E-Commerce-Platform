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

/** Friendly error that is safe to show to end users. */
class PaymentError extends Error {
  constructor(message: string, public detail?: unknown) {
    super(message);
    this.name = "PaymentError";
  }
}

function logEvent(event: string, payload: Record<string, unknown>) {
  // Cloudflare Workers / TanStack server runtime captures console.* into worker logs.
  try {
    console.log(`[uddoktapay] ${event}`, JSON.stringify(payload));
  } catch {
    console.log(`[uddoktapay] ${event}`, payload);
  }
}

async function callGateway(path: string, body: unknown) {
  const base = gatewayBase();
  if (!base) {
    logEvent("config_missing", { reason: "UDDOKTAPAY_BASE_URL not set" });
    throw new PaymentError("Payment gateway is not configured. Please contact support.");
  }
  if (!process.env.UDDOKTAPAY_API_KEY) {
    logEvent("config_missing", { reason: "UDDOKTAPAY_API_KEY not set" });
    throw new PaymentError("Payment gateway is not configured. Please contact support.");
  }

  const url = `${base}${path}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "RT-UDDOKTAPAY-API-KEY": process.env.UDDOKTAPAY_API_KEY!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    logEvent("network_error", { path, ms: Date.now() - started, error: e?.message ?? String(e) });
    throw new PaymentError("Could not reach the payment gateway. Please check your connection and try again.");
  }

  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* keep raw text */ }

  if (!res.ok) {
    logEvent("gateway_error", { path, status: res.status, ms: Date.now() - started, body: text.slice(0, 500) });
    const msg = data?.message || data?.error;
    if (res.status === 401 || res.status === 403) {
      throw new PaymentError("Payment gateway rejected the request (authentication failed). Please contact support.");
    }
    if (res.status >= 500) {
      throw new PaymentError("The payment gateway is temporarily unavailable. Please try again in a moment.");
    }
    throw new PaymentError(msg ? `Payment gateway: ${msg}` : "Payment gateway returned an unexpected response. Please try again.");
  }

  logEvent("gateway_ok", { path, status: res.status, ms: Date.now() - started });
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
    try {
      const sb = admin();
      const { data: order, error } = await sb
        .from("orders")
        .select("id, order_number, total, customer_email, customer_name, payment_status")
        .eq("id", data.order_id)
        .maybeSingle();
      if (error) {
        logEvent("order_lookup_error", { order_id: data.order_id, error: error.message });
        throw new PaymentError("We couldn't load your order. Please refresh and try again.");
      }
      if (!order) {
        logEvent("order_not_found", { order_id: data.order_id });
        throw new PaymentError("Order not found. Please refresh and try again.");
      }
      if ((order as any).payment_status === "paid") {
        throw new PaymentError("This order has already been paid.");
      }

      const redirect_url = `${data.origin}/api/public/payment/callback?order_id=${order.id}`;
      const cancel_url = `${data.origin}/order-confirmation/${order.id}?cancelled=1`;

      logEvent("create_charge_start", {
        order_id: order.id, order_number: order.order_number, amount: data.amount, partial: !!data.partial,
      });

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
      if (!payment_url) {
        logEvent("create_charge_no_url", { order_id: order.id, resp });
        throw new PaymentError("Payment gateway didn't return a checkout link. Please try again.");
      }

      const { error: upErr } = await sb.from("orders").update({
        payment_provider: "uddoktapay",
        payment_status: data.partial ? "partial_pending" : "pending",
        due_amount: data.partial ? Number((order as any).total) - data.amount : 0,
      } as any).eq("id", order.id);
      if (upErr) logEvent("order_update_warn", { order_id: order.id, error: upErr.message });

      logEvent("create_charge_ok", { order_id: order.id });
      return { payment_url };
    } catch (e: any) {
      if (e instanceof PaymentError) throw e;
      logEvent("create_charge_unexpected", { order_id: data.order_id, error: e?.message ?? String(e) });
      throw new PaymentError("Something went wrong while starting your payment. Please try again.");
    }
  });

export const verifyPaymentInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ invoice_id: z.string().min(4) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const resp = await callGateway("/api/verify-payment", { invoice_id: data.invoice_id });
      const status: string = (resp.status || resp.payment_status || "").toString().toUpperCase();
      const success = status === "COMPLETED" || status === "PAID" || status === "SUCCESS";
      const order_id: string | undefined = resp?.metadata?.order_id;
      const partial = resp?.metadata?.partial === "1";

      logEvent("verify_result", { invoice_id: data.invoice_id, status, success, order_id });

      if (success && order_id) {
        const sb = admin();
        const { data: order, error: ordErr } = await sb.from("orders").select("id,total").eq("id", order_id).maybeSingle();
        if (ordErr) logEvent("verify_order_lookup_error", { order_id, error: ordErr.message });
        if (order) {
          const paid = Number(resp.amount ?? 0);
          const newStatus = partial ? "partial_paid" : paid >= Number((order as any).total) ? "paid" : "partial_paid";
          const { error: upErr } = await sb.from("orders").update({
            payment_status: newStatus,
            paid_amount: paid,
            due_amount: Math.max(0, Number((order as any).total) - paid),
            transaction_id: resp.transaction_id || resp.payment_id || null,
            sender_number: resp.sender_number || null,
            invoice_id: data.invoice_id,
            payment_method: partial ? "PARTIAL" : "ONLINE",
            payment_meta: resp as any,
          } as any).eq("id", order_id);
          if (upErr) logEvent("verify_order_update_error", { order_id, error: upErr.message });
        }
      } else if (order_id) {
        const sb = admin();
        const { error: upErr } = await sb.from("orders").update({
          payment_status: "failed",
          invoice_id: data.invoice_id,
          payment_meta: resp as any,
        } as any).eq("id", order_id);
        if (upErr) logEvent("verify_order_fail_update_error", { order_id, error: upErr.message });
      }

      return { success, status, order_id };
    } catch (e: any) {
      logEvent("verify_unexpected", { invoice_id: data.invoice_id, error: e?.message ?? String(e) });
      if (e instanceof PaymentError) throw e;
      throw new PaymentError("We couldn't verify your payment right now. If you were charged, it will sync shortly.");
    }
  });
