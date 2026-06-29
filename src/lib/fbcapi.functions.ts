import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { createHash } from "crypto";

type CapiInput = {
  event_name: string;
  event_id?: string;
  event_source_url?: string;
  email?: string | null;
  phone?: string | null;
  value?: number;
  currency?: string;
  contents?: { id: string; quantity: number; item_price?: number }[];
  content_ids?: string[];
  content_type?: string;
  order_id?: string;
};

const sha256 = (s: string) =>
  createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

const normPhone = (p: string) => p.replace(/[^\d]/g, "");

export const fbCapiEvent = createServerFn({ method: "POST" })
  .inputValidator((d: CapiInput) => d)
  .handler(async ({ data }) => {
    const pixelId = process.env.FB_PIXEL_ID;
    const accessToken = process.env.FB_PIXEL_ACCESS_TOKEN;
    const testCode = process.env.FB_PIXEL_TEST_EVENT_CODE;
    if (!pixelId || !accessToken) return { ok: false, reason: "missing_config" };

    const ua = getRequestHeader("user-agent") ?? "";
    const ip = (() => {
      try { return getRequestIP({ xForwardedFor: true }) ?? undefined; } catch { return undefined; }
    })();

    const user_data: Record<string, any> = {
      client_user_agent: ua,
      ...(ip ? { client_ip_address: ip } : {}),
      ...(data.email ? { em: [sha256(data.email)] } : {}),
      ...(data.phone ? { ph: [sha256(normPhone(data.phone))] } : {}),
    };

    const custom_data: Record<string, any> = {};
    if (data.value != null) custom_data.value = data.value;
    if (data.currency) custom_data.currency = data.currency;
    if (data.contents) custom_data.contents = data.contents;
    if (data.content_ids) custom_data.content_ids = data.content_ids;
    if (data.content_type) custom_data.content_type = data.content_type;
    if (data.order_id) custom_data.order_id = data.order_id;

    const body: any = {
      data: [
        {
          event_name: data.event_name,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          ...(data.event_id ? { event_id: data.event_id } : {}),
          ...(data.event_source_url ? { event_source_url: data.event_source_url } : {}),
          user_data,
          custom_data,
        },
      ],
    };
    if (testCode) body.test_event_code = testCode;

    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[fbcapi] error", res.status, json);
        return { ok: false, status: res.status };
      }
      return { ok: true, result: json };
    } catch (e: any) {
      console.error("[fbcapi] fetch failed", e?.message);
      return { ok: false, reason: "fetch_failed" };
    }
  });
