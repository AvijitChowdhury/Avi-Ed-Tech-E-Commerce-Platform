import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { DollarSign, ShoppingBag, AlertCircle, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, incomplete: 0, recovered: 0, recoveredRevenue: 0, lowStock: 0 });
  const [series, setSeries] = useState<{ date: string; revenue: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: ord }, { data: inc }, { data: lo }] = await Promise.all([
        supabase.from("orders").select("id, total, created_at, recovered_from_incomplete, customer_name, order_number, status"),
        supabase.from("incomplete_orders").select("id, converted_to_order_id"),
        supabase.from("products").select("id").lt("stock", 10),
      ]);
      const orders = ord ?? [];
      const revenue = orders.reduce((s, o: any) => s + Number(o.total), 0);
      const recovered = orders.filter((o: any) => o.recovered_from_incomplete);
      setStats({
        revenue,
        orders: orders.length,
        incomplete: (inc ?? []).filter((i: any) => !i.converted_to_order_id).length,
        recovered: recovered.length,
        recoveredRevenue: recovered.reduce((s, o: any) => s + Number(o.total), 0),
        lowStock: (lo ?? []).length,
      });

      const byDay = new Map<string, number>();
      orders.forEach((o: any) => {
        const d = new Date(o.created_at).toISOString().slice(0, 10);
        byDay.set(d, (byDay.get(d) || 0) + Number(o.total));
      });
      const sorted = [...byDay.entries()].sort().slice(-14).map(([date, revenue]) => ({ date: date.slice(5), revenue }));
      setSeries(sorted);

      const recentSorted = [...orders].sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6);
      setRecent(recentSorted);
    })();
  }, []);

  const cards = [
    { l: "Revenue", v: money(stats.revenue), i: DollarSign },
    { l: "Orders", v: stats.orders, i: ShoppingBag },
    { l: "Incomplete", v: stats.incomplete, i: AlertCircle },
    { l: "Recovered", v: `${stats.recovered} (${money(stats.recoveredRevenue)})`, i: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.l} className="p-5 card-elevated">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-muted-foreground">{c.l}</span>
              <c.i className="h-4 w-4 text-primary" />
            </div>
            <div className="font-display text-2xl font-bold">{c.v}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5 card-elevated">
        <div className="font-semibold mb-3">Revenue — last 14 days</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(195 90% 70%)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(195 90% 70%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(195 90% 65%)" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5 card-elevated">
        <div className="font-semibold mb-3">Recent orders</div>
        <div className="space-y-2">
          {recent.map((o) => (
            <div key={o.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
              <span className="font-mono">{o.order_number}</span>
              <span className="text-muted-foreground">{o.customer_name}</span>
              <span className="capitalize text-xs px-2 py-0.5 rounded bg-muted">{o.status}</span>
              <span className="font-bold">{money(o.total)}</span>
            </div>
          ))}
        </div>
      </Card>

      {stats.lowStock > 0 && (
        <Card className="p-4 card-elevated border-warning/40">
          ⚠️ {stats.lowStock} product(s) are low in stock.
        </Card>
      )}
    </div>
  );
}
