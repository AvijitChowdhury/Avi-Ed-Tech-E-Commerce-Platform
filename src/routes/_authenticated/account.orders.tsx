import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/auth";
import { money } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { createPaymentCharge } from "@/lib/payment.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/orders")({ component: OrdersPage });

const STEPS = ["pending", "processing", "shipped", "delivered"];

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const createChargeFn = useServerFn(createPaymentCharge);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders((data as any) ?? []));
  }, [user]);

  const retry = async (o: any) => {
    setRetrying(o.id);
    try {
      const partial = o.payment_method === "PARTIAL";
      const amount = partial ? Number(o.shipping) : Number(o.total) - Number(o.paid_amount || 0);
      const r = await createChargeFn({
        data: { order_id: o.id, amount, full_name: o.customer_name, email: o.customer_email, origin: window.location.origin, partial },
      });
      window.location.href = r.payment_url;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start payment");
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">My orders</h1>
      {!orders.length && <p className="text-muted-foreground">You haven't placed any orders yet.</p>}
      {orders.map((o) => {
        const failedOnline = (o.payment_method === "ONLINE" || o.payment_method === "PARTIAL") &&
          (o.payment_status === "failed" || o.payment_status === "pending" || o.payment_status === "partial_pending" || o.payment_status === "unpaid");
        return (
          <div key={o.id} className="card-elevated rounded-2xl p-5">
            <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
              <div>
                <div className="font-mono font-bold">{o.order_number}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
              </div>
              <Badge variant={o.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">{o.status}</Badge>
              <div className="text-right">
                <div className="font-bold gradient-text">{money(o.total)}</div>
                <div className="text-xs capitalize text-muted-foreground">{o.payment_method} · {(o.payment_status ?? "unpaid").replace("_"," ")}</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-3">
              {(o.order_items ?? []).map((i: any) => `${i.qty}× ${i.title}`).join(" · ")}
            </div>
            <div className="flex gap-2 mb-3">
              {STEPS.map((s, i) => {
                const reached = STEPS.indexOf(o.status) >= i;
                return <div key={s} className={`h-1.5 flex-1 rounded-full ${reached ? "gradient-primary-bg" : "bg-muted"}`} />;
              })}
            </div>
            {failedOnline && (
              <Button size="sm" onClick={() => retry(o)} disabled={retrying === o.id} className="gradient-primary-bg text-primary-foreground">
                {retrying === o.id ? "Redirecting…" : "Retry payment"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
