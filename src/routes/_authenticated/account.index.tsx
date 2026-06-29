import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/auth";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/account/")({ component: AccountOverview });

function AccountOverview() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setOrders((data as any) ?? []));
  }, [user]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Welcome back</h1>
      <p className="text-muted-foreground">{user?.email}</p>
      <section>
        <h2 className="font-semibold mb-3">Recent orders</h2>
        {orders.length ? (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link key={o.id} to="/account/orders" className="card-elevated rounded-xl p-4 flex justify-between hover:glow-primary transition-all">
                <div>
                  <div className="font-mono font-bold">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground capitalize">{o.status} · {new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div className="font-bold gradient-text">{money(o.total)}</div>
              </Link>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No orders yet.</p>}
      </section>
    </div>
  );
}
