import { createFileRoute } from "@tanstack/react-router";
import { verifyPaymentInvoice } from "@/lib/payment.functions";

async function handle(request: Request) {
  const url = new URL(request.url);
  let invoice_id = url.searchParams.get("invoice_id");
  let order_id = url.searchParams.get("order_id");

  if (!invoice_id && request.method === "POST") {
    const ct = request.headers.get("content-type") || "";
    try {
      if (ct.includes("application/json")) {
        const body = await request.json();
        invoice_id = body.invoice_id ?? invoice_id;
        order_id = body?.metadata?.order_id ?? order_id;
      } else {
        const form = await request.formData();
        invoice_id = (form.get("invoice_id") as string | null) ?? invoice_id;
      }
    } catch { /* ignore */ }
  }

  const origin = url.origin;
  if (!invoice_id) {
    return Response.redirect(`${origin}/order-confirmation/${order_id ?? ""}?payment=missing`, 302);
  }

  try {
    const r = await verifyPaymentInvoice({ data: { invoice_id } });
    const target = r.order_id || order_id || "";
    const flag = r.success ? "success" : "failed";
    return Response.redirect(`${origin}/order-confirmation/${target}?payment=${flag}`, 302);
  } catch {
    return Response.redirect(`${origin}/order-confirmation/${order_id ?? ""}?payment=failed`, 302);
  }
}

export const Route = createFileRoute("/api/public/payment/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
