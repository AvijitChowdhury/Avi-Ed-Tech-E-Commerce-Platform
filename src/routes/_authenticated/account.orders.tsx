import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/auth";
import { money } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/account/orders")({ component: OrdersPage });

const STEPS = ["pending", "processing", "shipped", "delivered"];

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders((data as any) ?? []));
  }, [user]);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">My orders</h1>
      {!orders.length && <p className="text-muted-foreground">You haven't placed any orders yet.</p>}
      {orders.map((o) => (
        <div key={o.id} className="card-elevated rounded-2xl p-5">
          <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
            <div>
              <div className="font-mono font-bold">{o.order_number}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
            </div>
            <Badge variant={o.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">{o.status}</Badge>
            <div className="font-bold gradient-text">{money(o.total)}</div>
          </div>
          <div className="text-sm text-muted-foreground mb-3">
            {(o.order_items ?? []).map((i: any) => `${i.qty}× ${i.title}`).join(" · ")}
          </div>
          <div className="flex gap-2">
            {STEPS.map((s, i) => {
              const reached = STEPS.indexOf(o.status) >= i;
              return <div key={s} className={`h-1.5 flex-1 rounded-full ${reached ? "gradient-primary-bg" : "bg-muted"}`} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
