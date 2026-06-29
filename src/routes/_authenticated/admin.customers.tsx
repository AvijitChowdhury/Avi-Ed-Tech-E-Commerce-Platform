import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/customers")({ component: CustomersPage });

function CustomersPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState<Record<string, { count: number; total: number }>>({});

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: o } = await supabase.from("orders").select("user_id, total");
      const stats: Record<string, { count: number; total: number }> = {};
      (o ?? []).forEach((r: any) => {
        if (!r.user_id) return;
        stats[r.user_id] ??= { count: 0, total: 0 };
        stats[r.user_id].count += 1;
        stats[r.user_id].total += Number(r.total);
      });
      setProfiles((p as any) ?? []);
      setOrderStats(stats);
    })();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-bold">Customers</h1>
      <div className="card-elevated rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr className="text-left"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Orders</th><th className="p-3">Lifetime value</th><th className="p-3">Joined</th></tr></thead>
          <tbody>
            {profiles.map((p) => {
              const s = orderStats[p.id] ?? { count: 0, total: 0 };
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-medium">{p.full_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{p.email}</td>
                  <td className="p-3">{s.count}</td>
                  <td className="p-3 font-bold gradient-text">{money(s.total)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {!profiles.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
