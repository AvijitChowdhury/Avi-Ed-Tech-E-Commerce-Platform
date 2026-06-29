import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  updateOrderStatus,
  bulkUpdateOrderStatus,
  trashOrders,
  restoreOrders,
  deleteOrdersPermanently,
  createManualOrder,
} from "@/lib/admin.functions";
import { shipOrdersToSteadfast, syncSteadfastStatuses } from "@/lib/steadfast.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { money } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, X, Truck, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({ component: AdminOrders });

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
const PAYMENT_METHODS = ["COD", "bKash", "Nagad", "Rocket", "Card", "Bank", "Other"] as const;
const PAYMENT_STATUSES = ["unpaid", "paid", "partial", "failed", "refunded"] as const;

type Zone = { id: string; name: string; price: number };
type LineItem = { title: string; price: number; qty: number; product_id?: string | null };

function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"active" | "trash">("active");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zones, setZones] = useState<Zone[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const updateFn = useServerFn(updateOrderStatus);
  const bulkUpdateFn = useServerFn(bulkUpdateOrderStatus);
  const trashFn = useServerFn(trashOrders);
  const restoreFn = useServerFn(restoreOrders);
  const deleteFn = useServerFn(deleteOrdersPermanently);
  const createFn = useServerFn(createManualOrder);

  const load = () =>
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as any) ?? []));

  useEffect(() => {
    load();
    supabase.from("delivery_zones").select("id, name, price").eq("active", true).order("sort_order").then(({ data }) => setZones((data as any) ?? []));
    const ch = supabase.channel("admin-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const visible = useMemo(() => {
    const base = orders.filter((o) => (view === "trash" ? !!o.deleted_at : !o.deleted_at));
    return filter === "all" ? base : base.filter((o) => o.status === filter);
  }, [orders, filter, view]);

  const allChecked = visible.length > 0 && visible.every((o) => selected.has(o.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) visible.forEach((o) => next.delete(o.id));
    else visible.forEach((o) => next.add(o.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const clearSel = () => setSelected(new Set());

  const change = async (id: string, status: any) => {
    try { await updateFn({ data: { id, status } }); toast.success("Status updated"); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const ids = Array.from(selected);
  const bulkStatus = async (status: any) => {
    if (!ids.length) return;
    try { await bulkUpdateFn({ data: { ids, status } }); toast.success(`Updated ${ids.length} order(s)`); clearSel(); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const bulkTrash = async () => {
    if (!ids.length) return;
    try { await trashFn({ data: { ids } }); toast.success(`Moved ${ids.length} to trash`); clearSel(); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const bulkRestore = async () => {
    if (!ids.length) return;
    try { await restoreFn({ data: { ids } }); toast.success(`Restored ${ids.length}`); clearSel(); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const bulkDelete = async () => {
    if (!ids.length) return;
    if (!confirm(`Permanently delete ${ids.length} order(s)? This cannot be undone.`)) return;
    try { await deleteFn({ data: { ids } }); toast.success("Deleted"); clearSel(); load(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold">Orders</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="inline-flex rounded-md border border-border p-0.5">
            <button onClick={() => { setView("active"); clearSel(); }} className={`px-3 py-1.5 text-sm rounded ${view === "active" ? "bg-primary text-primary-foreground" : ""}`}>Active</button>
            <button onClick={() => { setView("trash"); clearSel(); }} className={`px-3 py-1.5 text-sm rounded ${view === "trash" ? "bg-primary text-primary-foreground" : ""}`}>Trash</button>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" />Add order</Button>
            </DialogTrigger>
            <AddOrderDialog
              zones={zones}
              onCreate={async (payload) => {
                try {
                  const r = await createFn({ data: payload });
                  toast.success(`Created ${r.order_number}`);
                  setAddOpen(false);
                  load();
                } catch (e: any) { toast.error(e?.message ?? "Failed"); }
              }}
            />
          </Dialog>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap card-elevated rounded-xl px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="ghost" onClick={clearSel}><X className="w-4 h-4 mr-1" />Clear</Button>
          <div className="ml-2 flex gap-2 flex-wrap">
            {view === "active" ? (
              <>
                <Select onValueChange={(v) => bulkStatus(v)}>
                  <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Set status..." /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="destructive" onClick={bulkTrash}><Trash2 className="w-4 h-4 mr-1" />Move to trash</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={bulkRestore}><RotateCcw className="w-4 h-4 mr-1" />Restore</Button>
                <Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="w-4 h-4 mr-1" />Delete permanently</Button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="card-elevated rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3 w-10"><Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" /></th>
              <th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Total</th>
              <th className="p-3">Payment</th><th className="p-3">Txn / Sender</th>
              <th className="p-3">Status</th><th className="p-3">Source</th><th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id} className="border-t border-border align-top">
                <td className="p-3"><Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggleOne(o.id)} aria-label={`Select ${o.order_number}`} /></td>
                <td className="p-3 font-mono">{o.order_number}</td>
                <td className="p-3"><div>{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.customer_email}</div></td>
                <td className="p-3 font-bold gradient-text">{money(o.total)}</td>
                <td className="p-3">
                  <Badge variant="outline" className="capitalize">{o.payment_method}</Badge>
                  <div className={`text-xs mt-1 capitalize ${o.payment_status === "paid" ? "text-success" : o.payment_status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                    {o.payment_status?.replace("_", " ") ?? "unpaid"}
                  </div>
                  {Number(o.paid_amount) > 0 && <div className="text-xs">Paid {money(o.paid_amount)} {Number(o.due_amount) > 0 && <>· Due {money(o.due_amount)}</>}</div>}
                </td>
                <td className="p-3 text-xs">
                  {o.transaction_id && <div className="font-mono">{o.transaction_id}</div>}
                  {o.sender_number && <div className="text-muted-foreground">{o.sender_number}</div>}
                  {!o.transaction_id && !o.sender_number && <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-3">
                  {view === "active" ? (
                    <Select value={o.status} onValueChange={(v) => change(o.id, v)}>
                      <SelectTrigger className="w-36 h-8 capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="capitalize">{o.status}</Badge>
                  )}
                </td>
                <td className="p-3">{o.recovered_from_incomplete && <Badge variant="secondary">Recovered</Badge>}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!visible.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddOrderDialog({ zones, onCreate }: { zones: Zone[]; onCreate: (p: any) => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [postal, setPostal] = useState("");
  const [zoneId, setZoneId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<typeof PAYMENT_METHODS[number]>("COD");
  const [paymentStatus, setPaymentStatus] = useState<typeof PAYMENT_STATUSES[number]>("unpaid");
  const [paid, setPaid] = useState<number>(0);
  const [txn, setTxn] = useState("");
  const [sender, setSender] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<typeof STATUSES[number]>("pending");
  const [items, setItems] = useState<LineItem[]>([{ title: "", price: 0, qty: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  const shipping = zones.find((z) => z.id === zoneId)?.price ?? 0;
  const subtotal = items.reduce((s, l) => s + Number(l.price || 0) * Number(l.qty || 0), 0);
  const total = subtotal + Number(shipping || 0);

  const setItem = (i: number, patch: Partial<LineItem>) =>
    setItems((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addItem = () => setItems((a) => [...a, { title: "", price: 0, qty: 1 }]);
  const removeItem = (i: number) => setItems((a) => a.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!name || !email || !phone || !line1 || !city) return toast.error("Fill customer and address");
    if (!items.length || items.some((l) => !l.title || l.price < 0 || l.qty < 1)) return toast.error("Add at least one valid item");
    setSubmitting(true);
    try {
      await onCreate({
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        shipping_address: { line1, line2: line2 || null, city, area: area || null, postal_code: postal || null },
        zone_id: zoneId || null,
        shipping,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        paid_amount: Number(paid) || 0,
        transaction_id: txn || null,
        sender_number: sender || null,
        notes: notes || null,
        status,
        items: items.map((l) => ({ title: l.title, price: Number(l.price), qty: Number(l.qty) })),
      });
    } finally { setSubmitting(false); }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Add order manually</DialogTitle></DialogHeader>

      <div className="space-y-5">
        <section className="grid sm:grid-cols-2 gap-3">
          <div><Label>Customer name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div>
            <Label>Delivery zone</Label>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
              <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name} — {money(z.price)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Label>Address line 1</Label><Input value={line1} onChange={(e) => setLine1(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Address line 2</Label><Input value={line2} onChange={(e) => setLine2(e.target.value)} /></div>
          <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div><Label>Area</Label><Input value={area} onChange={(e) => setArea(e.target.value)} /></div>
          <div><Label>Postal code</Label><Input value={postal} onChange={(e) => setPostal(e.target.value)} /></div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <Label>Items</Label>
            <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Add item</Button>
          </div>
          <div className="space-y-2">
            {items.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-6" placeholder="Product title" value={l.title} onChange={(e) => setItem(i, { title: e.target.value })} />
                <Input className="col-span-3" type="number" min={0} step="0.01" placeholder="Price" value={l.price} onChange={(e) => setItem(i, { price: Number(e.target.value) })} />
                <Input className="col-span-2" type="number" min={1} placeholder="Qty" value={l.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => removeItem(i)} disabled={items.length === 1}><X className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Order status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment status</Label>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Paid amount</Label><Input type="number" min={0} step="0.01" value={paid} onChange={(e) => setPaid(Number(e.target.value))} /></div>
          <div><Label>Transaction ID</Label><Input value={txn} onChange={(e) => setTxn(e.target.value)} /></div>
          <div><Label>Sender number</Label><Input value={sender} onChange={(e) => setSender(e.target.value)} /></div>
        </section>

        <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{money(shipping)}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>{money(total)}</span></div>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={submit} disabled={submitting}>{submitting ? "Creating..." : "Create order"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
