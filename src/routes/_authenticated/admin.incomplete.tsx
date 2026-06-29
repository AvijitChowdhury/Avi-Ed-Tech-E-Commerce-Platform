import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { convertIncompleteToOrder, deleteIncompleteOrders } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fromNow } from "@/lib/format";
import { money } from "@/lib/format";
import { Download, RefreshCw, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/incomplete")({ component: IncompletePage });

function IncompletePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const convertFn = useServerFn(convertIncompleteToOrder);
  const deleteFn = useServerFn(deleteIncompleteOrders);

  const load = () => supabase
    .from("incomplete_orders")
    .select("*")
    .is("converted_to_order_id", null)
    .order("updated_at", { ascending: false })
    .then(({ data }) => setRows((data as any) ?? []));

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-incomplete")
      .on("postgres_changes", { event: "*", schema: "public", table: "incomplete_orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  const convertOne = async (id: string) => {
    setBusy(true);
    try {
      const r = await convertFn({ data: { ids: [id] } });
      if (r.converted.length) { toast.success(`Converted to ${r.converted[0].order_number}`); load(); }
      else toast.error("Could not convert — missing required fields");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };
  const convertBulk = async () => {
    if (!selected.size) return;
    setBusy(true);
    try {
      const r = await convertFn({ data: { ids: [...selected] } });
      toast.success(`Converted ${r.converted.length} / ${selected.size}`);
      setSelected(new Set());
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };
  const deleteBulk = async () => {
    if (!selected.size) return;
    setBusy(true);
    try {
      await deleteFn({ data: { ids: [...selected] } });
      toast.success(`Deleted ${selected.size}`);
      setSelected(new Set());
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  const exportCsv = () => {
    const cols = ["id", "customer_name", "customer_email", "customer_phone", "subtotal", "shipping", "total", "last_field", "updated_at"];
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `incomplete-orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Incomplete orders</h1>
          <p className="text-sm text-muted-foreground">Real-time. {rows.length} pending recovery.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!selected.size || busy} variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete ({selected.size})</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete selected?</AlertDialogTitle><AlertDialogDescription>This permanently removes {selected.size} incomplete order(s).</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteBulk}>Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!selected.size || busy} className="gradient-primary-bg text-primary-foreground"><RefreshCw className="mr-2 h-4 w-4" />Convert ({selected.size})</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Convert to orders?</AlertDialogTitle><AlertDialogDescription>This creates real orders from {selected.size} incomplete record(s) and links them. Rows missing customer info will be skipped.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={convertBulk}>Convert</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="card-elevated rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3 w-10"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></th>
              <th className="p-3">Customer</th><th className="p-3">Cart</th><th className="p-3">Total</th><th className="p-3">Stage</th><th className="p-3">Updated</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cart = (r.cart as any[]) ?? [];
              const canConvert = r.customer_name && r.customer_email && r.customer_phone && r.shipping_address && r.zone_id && cart.length;
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>
                  <td className="p-3">
                    <div className="font-medium">{r.customer_name ?? <span className="text-muted-foreground italic">No name</span>}</div>
                    <div className="text-xs text-muted-foreground">{r.customer_email ?? "—"}</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{cart.length} item(s)</td>
                  <td className="p-3 font-bold">{money(r.total)}</td>
                  <td className="p-3"><Badge variant={canConvert ? "default" : "secondary"}>{canConvert ? "Ready" : "Partial"}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">{fromNow(r.updated_at)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Dialog>
                        <DialogTrigger asChild><Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button></DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader><DialogTitle>Incomplete order details</DialogTitle></DialogHeader>
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-96">{JSON.stringify(r, null, 2)}</pre>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" disabled={!canConvert || busy} className="gradient-primary-bg text-primary-foreground">Convert</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Convert to order?</AlertDialogTitle><AlertDialogDescription>This creates a real order from {r.customer_name}'s incomplete checkout.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => convertOne(r.id)}>Convert</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No incomplete orders right now. 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
