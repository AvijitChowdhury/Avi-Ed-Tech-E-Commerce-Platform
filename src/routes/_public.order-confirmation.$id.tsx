import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Download, AlertCircle } from "lucide-react";
import { money } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { createPaymentCharge } from "@/lib/payment.functions";
import { getOrderForConfirmation } from "@/lib/checkout.functions";
import { fbCapiEvent } from "@/lib/fbcapi.functions";
import { fbTrack } from "@/lib/fbpixel";
import { toast } from "sonner";

export const Route = createFileRoute("/_public/order-confirmation/$id")({
  component: ConfirmPage,
  validateSearch: (s: Record<string, unknown>) => ({ payment: (s.payment as string | undefined) ?? undefined }),
  head: () => ({
    meta: [
      { title: "Order confirmed — AviEdTech" },
      { name: "description", content: "Your AviEdTech order confirmation and next steps." },
      { name: "robots", content: "noindex" },
    ],
  }),
});


function ConfirmPage() {
  const { id } = Route.useParams();
  const { payment } = useSearch({ from: "/_public/order-confirmation/$id" });
  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [retrying, setRetrying] = useState(false);
  const createChargeFn = useServerFn(createPaymentCharge);
  const fetchOrder = useServerFn(getOrderForConfirmation);
  const sendCapi = useServerFn(fbCapiEvent);
  const purchaseFiredRef = useRef(false);

  useEffect(() => {
    fetchOrder({ data: { id } }).then((r) => {
      setOrder(r.order);
      setItems(r.items);
    });
  }, [id]);

  // Fire Purchase (browser pixel + Conversions API) once we have the order
  // and payment is not in a failed state.
  useEffect(() => {
    if (!order || purchaseFiredRef.current) return;
    const paid = order.payment_status === "paid" || order.payment_status === "partial_paid";
    const cod = order.payment_method === "COD";
    if (!paid && !cod) return;
    purchaseFiredRef.current = true;
    const eventId = `purchase_${order.id}`;
    const contents = (items || []).map((it: any) => ({
      id: it.product_id ?? it.id,
      quantity: it.qty,
      item_price: Number(it.price),
    }));
    const value = Number(order.total);
    fbTrack("Purchase", {
      value,
      currency: "USD",
      contents,
      content_ids: contents.map((c) => c.id),
      content_type: "product",
      order_id: order.order_number,
    });
    sendCapi({
      data: {
        event_name: "Purchase",
        event_id: eventId,
        event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
        email: order.customer_email,
        phone: order.customer_phone,
        value,
        currency: "USD",
        contents,
        content_ids: contents.map((c) => c.id),
        content_type: "product",
        order_id: order.order_number,
      },
    }).catch(() => {});
  }, [order, items, sendCapi]);


  const retry = async () => {
    if (!order) return;
    setRetrying(true);
    try {
      const partial = order.payment_method === "PARTIAL";
      const amount = partial ? Number(order.shipping) : Number(order.total) - Number(order.paid_amount || 0);
      const r = await createChargeFn({
        data: { order_id: order.id, amount, full_name: order.customer_name, email: order.customer_email, origin: window.location.origin, partial },
      });
      window.location.href = r.payment_url;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start payment");
      setRetrying(false);
    }
  };


  const downloadInvoice = async () => {
    if (!order) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("AviEdTech — Invoice", 14, 18);
    doc.setFontSize(10);
    doc.text(`Order: ${order.order_number}`, 14, 28);
    doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, 14, 34);
    doc.text(`Customer: ${order.customer_name}`, 14, 40);
    doc.text(`Email: ${order.customer_email}`, 14, 46);
    doc.text(`Phone: ${order.customer_phone}`, 14, 52);
    const addr = order.shipping_address || {};
    doc.text(`Shipping: ${addr.line1 ?? ""}, ${addr.city ?? ""}`, 14, 58);

    let y = 72;
    doc.setFontSize(12);
    doc.text("Items", 14, y);
    y += 6;
    doc.setFontSize(10);
    items.forEach((it) => {
      doc.text(`${it.qty}x ${it.title}`, 14, y);
      doc.text(`$${(Number(it.price) * it.qty).toFixed(2)}`, 180, y, { align: "right" });
      y += 6;
    });
    y += 4;
    doc.line(14, y, 196, y);
    y += 6;
    doc.text(`Subtotal:`, 140, y); doc.text(`$${Number(order.subtotal).toFixed(2)}`, 180, y, { align: "right" }); y += 6;
    doc.text(`Shipping:`, 140, y); doc.text(`$${Number(order.shipping).toFixed(2)}`, 180, y, { align: "right" }); y += 6;
    doc.setFontSize(12);
    doc.text(`Total:`, 140, y); doc.text(`$${Number(order.total).toFixed(2)}`, 180, y, { align: "right" });
    doc.save(`invoice-${order.order_number}.pdf`);
  };

  if (!order) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading...</div>;

  const paymentFailed = payment === "failed" || order.payment_status === "failed";
  const paymentSuccess = payment === "success" || order.payment_status === "paid" || order.payment_status === "partial_paid";
  const needsPayment = (order.payment_method === "ONLINE" || order.payment_method === "PARTIAL") && !paymentSuccess;

  return (
    <div className="container mx-auto px-4 py-14 max-w-2xl text-center">
      <div className={`h-16 w-16 mx-auto rounded-full flex items-center justify-center mb-5 ${paymentFailed ? "bg-destructive text-destructive-foreground" : "gradient-primary-bg glow-primary"}`}>
        {paymentFailed ? <AlertCircle className="h-8 w-8" /> : <Check className="h-8 w-8 text-primary-foreground" />}
      </div>
      <h1 className="font-display text-3xl font-bold mb-2">
        {paymentFailed ? "Payment didn't complete" : "Thank you for your order!"}
      </h1>
      <p className="text-muted-foreground mb-6">
        Order <span className="font-mono font-bold text-foreground">{order.order_number}</span>
        {paymentSuccess ? " is confirmed." : paymentFailed ? " was placed but payment did not go through." : " has been placed."}
      </p>

      {(Number(order.paid_amount) > 0 || Number(order.due_amount) > 0) && (
        <div className="card-elevated rounded-xl p-4 mb-4 text-sm inline-flex flex-col">
          {Number(order.paid_amount) > 0 && <div>Paid: <b>{money(order.paid_amount)}</b>{order.transaction_id && <> · Txn <span className="font-mono">{order.transaction_id}</span></>}</div>}
          {Number(order.due_amount) > 0 && <div>Due on delivery: <b>{money(order.due_amount)}</b></div>}
        </div>
      )}

      <div className="card-elevated rounded-2xl p-6 text-left space-y-3 mb-6">
        {items.map((it) => (
          <div key={it.id} className="flex justify-between text-sm">
            <div>{it.qty}× {it.title}</div>
            <div>{money(Number(it.price) * it.qty)}</div>
          </div>
        ))}
        <div className="border-t border-border pt-3 flex justify-between font-bold">
          <span>Total</span><span className="gradient-text">{money(order.total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {needsPayment && (
          <Button onClick={retry} disabled={retrying} className="gradient-primary-bg text-primary-foreground glow-primary">
            {retrying ? "Redirecting…" : paymentFailed ? "Retry payment" : "Pay now"}
          </Button>
        )}
        <Button onClick={downloadInvoice} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Download invoice
        </Button>
        <Link to="/products"><Button variant="outline">Keep shopping</Button></Link>
        <Link to="/track"><Button variant="outline">Track order</Button></Link>
      </div>
    </div>
  );
}
