import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [incomplete, setIncomplete] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("orders").select("id, total, created_at, recovered_from_incomplete"),
      supabase.from("incomplete_orders").select("id, total, customer_email, shipping_address, converted_to_order_id, created_at, customer_name"),
    ]).then(([o, i]) => {
      setOrders((o.data as any) ?? []);
      setIncomplete((i.data as any) ?? []);
    });
  }, []);

  const recovered = orders.filter((o) => o.recovered_from_incomplete);
  const totalRecoveredRevenue = recovered.reduce((s, o) => s + Number(o.total), 0);

  // Funnel
  const started = incomplete.length + recovered.length;
  const withEmail = incomplete.filter((i) => i.customer_email).length + recovered.length;
  const withAddress = incomplete.filter((i) => i.shipping_address).length + recovered.length;
  const converted = recovered.length;

  // Conversion rate over time (per day)
  const byDay = new Map<string, { started: number; converted: number }>();
  incomplete.forEach((i) => {
    const d = new Date(i.created_at).toISOString().slice(0, 10);
    const e = byDay.get(d) ?? { started: 0, converted: 0 };
    e.started += 1;
    if (i.converted_to_order_id) e.converted += 1;
    byDay.set(d, e);
  });
  const series = [...byDay.entries()].sort().slice(-14).map(([date, v]) => ({
    date: date.slice(5),
    rate: v.started ? Math.round((v.converted / v.started) * 100) : 0,
  }));

  // Top recovered amounts
  const topRecovered = [...recovered].sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Recovery Analytics</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 card-elevated">
          <div className="text-sm text-muted-foreground">Total recovered orders</div>
          <div className="font-display text-3xl font-bold mt-1">{converted}</div>
        </Card>
        <Card className="p-5 card-elevated">
          <div className="text-sm text-muted-foreground">Recovered revenue</div>
          <div className="font-display text-3xl font-bold gradient-text mt-1">{money(totalRecoveredRevenue)}</div>
        </Card>
        <Card className="p-5 card-elevated">
          <div className="text-sm text-muted-foreground">Conversion rate</div>
          <div className="font-display text-3xl font-bold mt-1">{started ? Math.round((converted / started) * 100) : 0}%</div>
        </Card>
      </div>

      <Card className="p-5 card-elevated">
        <div className="font-semibold mb-3">Conversion rate over time (%)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="rate" stroke="hsl(305 80% 65%)" strokeWidth={3} dot={{ fill: "hsl(195 90% 70%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5 card-elevated">
        <div className="font-semibold mb-3">Recovery funnel</div>
        <div className="space-y-3">
          {[
            { l: "Started checkout", v: started, w: 100 },
            { l: "Provided email", v: withEmail, w: started ? (withEmail / started) * 100 : 0 },
            { l: "Provided address", v: withAddress, w: started ? (withAddress / started) * 100 : 0 },
            { l: "Converted", v: converted, w: started ? (converted / started) * 100 : 0 },
          ].map((s) => (
            <div key={s.l}>
              <div className="flex justify-between text-sm mb-1"><span>{s.l}</span><span className="font-bold">{s.v}</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full gradient-primary-bg transition-all" style={{ width: `${s.w}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 card-elevated">
        <div className="font-semibold mb-3">Top recovered amounts</div>
        <div className="space-y-2">
          {topRecovered.length ? topRecovered.map((o) => (
            <div key={o.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
              <span className="font-mono text-xs">{o.id.slice(0, 8)}</span>
              <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
              <span className="font-bold gradient-text">{money(o.total)}</span>
            </div>
          )) : <p className="text-sm text-muted-foreground">No recovered orders yet.</p>}
        </div>
      </Card>
    </div>
  );
}
