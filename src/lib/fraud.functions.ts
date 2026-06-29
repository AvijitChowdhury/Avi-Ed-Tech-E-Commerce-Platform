import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BASE_URL = "https://api.bdcourier.com";
const CACHE_TTL_HOURS = 24;

type FraudResult = {
  phone: string;
  risk: "low" | "medium" | "high" | "unknown";
  total_parcel: number;
  success: number;
  cancelled: number;
  success_ratio: number;
  raw: any;
  cached: boolean;
  checked_at: string;
};

function normalize(phone: string) {
  return phone.replace(/\D/g, "").replace(/^88/, "");
}

function summarize(raw: any): Omit<FraudResult, "phone" | "cached" | "checked_at"> {
  // BD Courier returns { courierData: { summary: { total_parcel, success_parcel, cancelled_parcel, success_ratio } } }
  const s = raw?.courierData?.summary ?? raw?.summary ?? {};
  const total = Number(s.total_parcel ?? s.total ?? 0);
  const success = Number(s.success_parcel ?? s.success ?? 0);
  const cancelled = Number(s.cancelled_parcel ?? s.cancelled ?? 0);
  const ratio = total > 0 ? Number((success / total).toFixed(3)) : 0;
  let risk: FraudResult["risk"] = "unknown";
  if (total === 0) risk = "unknown";
  else if (ratio >= 0.8) risk = "low";
  else if (ratio >= 0.5) risk = "medium";
  else risk = "high";
  return { risk, total_parcel: total, success, cancelled, success_ratio: ratio, raw };
}

async function callBDCourier(phone: string): Promise<any> {
  const key = process.env.BDCOURIER_API_KEY;
  if (!key) throw new Error("BDCOURIER_API_KEY not configured");
  const res = await fetch(`${BASE_URL}/courier-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ phone }),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(json?.message || `BD Courier ${res.status}`);
  return json;
}

export const checkFraud = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ phone: z.string().min(4).max(40), force: z.boolean().optional() }).parse(d))
  .handler(async ({ data }): Promise<FraudResult> => {
    const phone = normalize(data.phone);
    if (!phone) throw new Error("Invalid phone");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.force) {
      const { data: cached } = await supabaseAdmin
        .from("fraud_checks")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
      if (cached) {
        const age = (Date.now() - new Date(cached.checked_at).getTime()) / 36e5;
        if (age < CACHE_TTL_HOURS) {
          return {
            phone,
            risk: (cached.risk as any) ?? "unknown",
            total_parcel: cached.total_parcel ?? 0,
            success: cached.success ?? 0,
            cancelled: cached.cancelled ?? 0,
            success_ratio: Number(cached.success_ratio ?? 0),
            raw: cached.raw,
            cached: true,
            checked_at: cached.checked_at,
          };
        }
      }
    }

    const raw = await callBDCourier(phone);
    const sum = summarize(raw);
    const checked_at = new Date().toISOString();
    await supabaseAdmin.from("fraud_checks").upsert({
      phone,
      ...sum,
      checked_at,
    });
    return { phone, ...sum, cached: false, checked_at };
  });

export const saveOrderFraud = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid(), phone: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const phone = normalize(data.phone);
    if (!phone) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let raw: any;
    try { raw = await callBDCourier(phone); }
    catch { return { ok: false }; }
    const s = summarize(raw);
    const checked_at = new Date().toISOString();
    await supabaseAdmin.from("fraud_checks").upsert({ phone, ...s, checked_at });
    await supabaseAdmin
      .from("orders")
      .update({
        fraud_risk: s.risk,
        fraud_total_parcel: s.total_parcel,
        fraud_success: s.success,
        fraud_cancelled: s.cancelled,
        fraud_success_ratio: s.success_ratio,
        fraud_checked_at: checked_at,
        fraud_raw: s.raw,
      })
      .eq("id", data.order_id);
    return { ok: true };
  });

export const recheckOrderFraud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin.data) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("customer_phone").eq("id", data.order_id).single();
    if (!order?.customer_phone) throw new Error("No phone");
    const phone = normalize(order.customer_phone);
    const raw = await callBDCourier(phone);
    const s = summarize(raw);
    const checked_at = new Date().toISOString();
    await supabaseAdmin.from("fraud_checks").upsert({ phone, ...s, checked_at });
    await supabaseAdmin.from("orders").update({
      fraud_risk: s.risk,
      fraud_total_parcel: s.total_parcel,
      fraud_success: s.success,
      fraud_cancelled: s.cancelled,
      fraud_success_ratio: s.success_ratio,
      fraud_checked_at: checked_at,
      fraud_raw: s.raw,
    }).eq("id", data.order_id);
    return { ok: true, risk: s.risk };
  });

export const testBDCourierConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ phone: z.string().min(4).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin.data) throw new Error("Forbidden");
    const raw = await callBDCourier(normalize(data.phone));
    return { ok: true, summary: summarize(raw) };
  });
