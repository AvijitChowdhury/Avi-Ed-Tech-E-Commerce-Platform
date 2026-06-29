import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Download } from "lucide-react";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_public/order-confirmation/$id")({ component: ConfirmPage });

function ConfirmPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("orders").select("*").eq("id", id).maybeSingle().then(({ data }) => setOrder(data));
    supabase.from("order_items").select("*").eq("order_id", id).then(({ data }) => setItems((data as any) ?? []));
  }, [id]);

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

  return (
    <div className="container mx-auto px-4 py-14 max-w-2xl text-center">
      <div className="h-16 w-16 mx-auto rounded-full gradient-primary-bg flex items-center justify-center glow-primary mb-5">
        <Check className="h-8 w-8 text-primary-foreground" />
      </div>
      <h1 className="font-display text-3xl font-bold mb-2">Thank you for your order!</h1>
      <p className="text-muted-foreground mb-8">Your order <span className="font-mono font-bold text-foreground">{order.order_number}</span> has been placed. We'll email you a confirmation shortly.</p>

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
        <Button onClick={downloadInvoice} className="gradient-primary-bg text-primary-foreground">
          <Download className="mr-2 h-4 w-4" /> Download invoice
        </Button>
        <Link to="/products"><Button variant="outline">Keep shopping</Button></Link>
        <Link to="/track"><Button variant="outline">Track order</Button></Link>
      </div>
    </div>
  );
}
