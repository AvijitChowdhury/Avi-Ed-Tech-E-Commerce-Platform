import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updateOrderStatus } from "@/lib/admin.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: AdminOrders });

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const updateFn = useServerFn(updateOrderStatus);

  const load = () => supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).then(({ data }) => setOrders((data as any) ?? []));
  useEffect(() => {
    load();
    const ch = supabase.channel("admin-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const change = async (id: string, status: any) => {
    try {
      await updateFn({ data: { id, status } });
      toast.success("Status updated");
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold">Orders</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="card-elevated rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Source</th><th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3 font-mono">{o.order_number}</td>
                <td className="p-3"><div>{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.customer_email}</div></td>
                <td className="p-3 font-bold gradient-text">{money(o.total)}</td>
                <td className="p-3">
                  <Select value={o.status} onValueChange={(v) => change(o.id, v)}>
                    <SelectTrigger className="w-36 h-8 capitalize"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-3">{o.recovered_from_incomplete && <Badge variant="secondary">Recovered</Badge>}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
