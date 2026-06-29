import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder, upsertIncompleteOrder } from "@/lib/checkout.functions";
import { createPaymentCharge } from "@/lib/payment.functions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money } from "@/lib/format";
import { getSessionId } from "@/lib/session";
import { Check, ShieldAlert, ShieldCheck, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fbTrack } from "@/lib/fbpixel";
import { checkFraud, saveOrderFraud } from "@/lib/fraud.functions";
import { getCached, setCached, normalizePhone } from "@/lib/fraudCache";

export const Route = createFileRoute("/_public/checkout")({ component: CheckoutPage });

type Zone = { id: string; name: string; price: number };

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const placeOrderFn = useServerFn(placeOrder);
  const upsertFn = useServerFn(upsertIncompleteOrder);
  const createChargeFn = useServerFn(createPaymentCharge);
  const fraudFn = useServerFn(checkFraud);
  const saveFraudFn = useServerFn(saveOrderFraud);
  const [step, setStep] = useState(0);
  const [zones, setZones] = useState<Zone[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE" | "PARTIAL">("COD");
  const [fraud, setFraud] = useState<any | null>(null);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudAck, setFraudAck] = useState(false);
  const [autoCheckOn, setAutoCheckOn] = useState(true);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "fraud").maybeSingle()
      .then(({ data }) => { if (data?.value && (data.value as any).auto_check === false) setAutoCheckOn(false); });
  }, []);

  const runFraudCheck = async (phone: string) => {
    const p = normalizePhone(phone);
    if (!p || p.length < 6) return;
    const cached = getCached(p);
    if (cached) { setFraud({ ...cached, cached: true }); return; }
    setFraudLoading(true);
    try {
      const r: any = await fraudFn({ data: { phone: p } });
      setFraud(r);
      setCached(p, r);
    } catch (e: any) {
      // silent fail; don't block checkout
    } finally { setFraudLoading(false); }
  };

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    line1: "",
    line2: "",
    city: "",
    postal_code: "",
    zone_id: "",
    notes: "",
  });

  useEffect(() => {
    supabase.from("delivery_zones").select("id, name, price").eq("active", true).order("sort_order").then(({ data }) => setZones((data as any) ?? []));
  }, []);
  useEffect(() => {
    if (user?.email && !form.customer_email) setForm((f) => ({ ...f, customer_email: user.email ?? "" }));
  }, [user?.email]);

  const zone = zones.find((z) => z.id === form.zone_id);
  const shipping = zone ? Number(zone.price) : 0;
  const total = subtotal + shipping;

  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Debounced field-by-field save to incomplete_orders
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!items.length) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      upsertFn({
        data: {
          session_id: getSessionId(),
          user_id: user?.id ?? null,
          customer_name: form.customer_name || null,
          customer_email: form.customer_email || null,
          customer_phone: form.customer_phone || null,
          shipping_address: form.line1
            ? { line1: form.line1, line2: form.line2 || null, city: form.city, postal_code: form.postal_code || null }
            : null,
          zone_id: form.zone_id || null,
          cart: items.map((i) => ({ product_id: i.product_id, title: i.title, price: i.price, qty: i.qty, image: i.image })),
          subtotal,
          shipping,
          total,
          last_field: "auto",
        },
      }).catch(() => {});
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form, items, subtotal, shipping, total, user?.id, upsertFn]);

  // Auto fraud check when phone is filled and user reaches review step
  useEffect(() => {
    if (!autoCheckOn) return;
    if (step !== 2) return;
    if (!form.customer_phone) return;
    if (fraud && normalizePhone(form.customer_phone) === normalizePhone(fraud.phone || "")) return;
    runFraudCheck(form.customer_phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form.customer_phone, autoCheckOn]);

  const submit = async () => {
    if (!items.length) return;
    setSubmitting(true);
    fbTrack("InitiateCheckout", {
      content_ids: items.map((i) => i.product_id),
      contents: items.map((i) => ({ id: i.product_id, quantity: i.qty, item_price: i.price })),
      num_items: items.reduce((s, i) => s + i.qty, 0),
      value: total,
      currency: "USD",
    });
    try {
      const r = await placeOrderFn({
        data: {
          session_id: getSessionId(),
          user_id: user?.id ?? null,
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          shipping_address: {
            line1: form.line1, line2: form.line2 || null, city: form.city, postal_code: form.postal_code || null,
          },
          zone_id: form.zone_id,
          cart: items.map((i) => ({ product_id: i.product_id, title: i.title, price: i.price, qty: i.qty, image: i.image })),
          notes: form.notes || null,
          payment_method: paymentMethod,
        },
      });
      // persist the fraud snapshot onto the order (best-effort)
      saveFraudFn({ data: { order_id: r.id, phone: form.customer_phone } }).catch(() => {});
      clear();

      if (paymentMethod === "ONLINE" || paymentMethod === "PARTIAL") {
        const amount = paymentMethod === "PARTIAL" ? shipping : total;
        if (amount <= 0) throw new Error("Invalid payment amount");
        const charge = await createChargeFn({
          data: {
            order_id: r.id,
            amount,
            full_name: form.customer_name,
            email: form.customer_email,
            origin: window.location.origin,
            partial: paymentMethod === "PARTIAL",
          },
        });
        toast.success("Redirecting to payment gateway…");
        window.location.href = charge.payment_url;
        return;
      }

      toast.success("Order placed!");
      navigate({ to: "/order-confirmation/$id", params: { id: r.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const stepValid = useMemo(() => {
    if (step === 0) return form.customer_name && /.+@.+/.test(form.customer_email) && form.customer_phone.length >= 5;
    if (step === 1) return form.line1 && form.city && form.zone_id;
    return true;
  }, [step, form]);

  if (!items.length && !submitting) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Your cart is empty.</div>;
  }

  const steps = ["Contact", "Shipping", "Review"];

  return (
    <div className="container mx-auto px-4 py-10 grid lg:grid-cols-[1fr_360px] gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold mb-6">Checkout</h1>
        <div className="flex gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-xl border ${i <= step ? "border-primary bg-primary/10" : "border-border"}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? "bg-primary text-primary-foreground" : i === step ? "gradient-primary-bg text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className="text-sm font-medium">{s}</span>
            </div>
          ))}
        </div>

        <div className="card-elevated rounded-2xl p-6 space-y-4">
          {step === 0 && (
            <>
              <div><Label>Full name</Label><Input value={form.customer_name} onChange={(e) => setField("customer_name", e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={form.customer_email} onChange={(e) => setField("customer_email", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.customer_phone} onChange={(e) => setField("customer_phone", e.target.value)} /></div>
            </>
          )}
          {step === 1 && (
            <>
              <div><Label>Address line 1</Label><Input value={form.line1} onChange={(e) => setField("line1", e.target.value)} /></div>
              <div><Label>Address line 2 (optional)</Label><Input value={form.line2} onChange={(e) => setField("line2", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setField("city", e.target.value)} /></div>
                <div><Label>Postal code</Label><Input value={form.postal_code} onChange={(e) => setField("postal_code", e.target.value)} /></div>
              </div>
              <div>
                <Label>Delivery zone</Label>
                <Select value={form.zone_id} onValueChange={(v) => setField("zone_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>{z.name} — {money(z.price)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Order notes (optional)</Label><Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} /></div>
            </>
          )}
          {step === 2 && (
            <div className="space-y-4 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {form.customer_name}</div>
              <div><span className="text-muted-foreground">Email:</span> {form.customer_email}</div>
              <div><span className="text-muted-foreground">Phone:</span> {form.customer_phone}</div>
              <div><span className="text-muted-foreground">Address:</span> {form.line1}, {form.city}</div>
              <div><span className="text-muted-foreground">Zone:</span> {zone?.name}</div>

              {autoCheckOn && (
                <div className={`rounded-xl border p-3 flex items-start gap-3 ${
                  fraudLoading ? "border-border bg-muted/30" :
                  fraud?.risk === "high" ? "border-destructive/50 bg-destructive/10" :
                  fraud?.risk === "medium" ? "border-yellow-500/40 bg-yellow-500/10" :
                  fraud?.risk === "low" ? "border-success/40 bg-success/10" :
                  "border-border bg-muted/20"
                }`}>
                  {fraudLoading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                   fraud?.risk === "high" ? <ShieldAlert className="w-5 h-5 text-destructive" /> :
                   fraud?.risk === "medium" ? <Shield className="w-5 h-5 text-yellow-500" /> :
                   fraud?.risk === "low" ? <ShieldCheck className="w-5 h-5 text-success" /> :
                   <Shield className="w-5 h-5 text-muted-foreground" />}
                  <div className="flex-1 text-xs">
                    {fraudLoading ? "Checking courier history…" :
                     !fraud ? "Fraud check will run automatically." :
                     fraud.risk === "unknown" ? "No previous courier history for this phone number." :
                     <>
                       <div className="font-semibold capitalize">{fraud.risk} risk</div>
                       <div>{fraud.success} delivered · {fraud.cancelled} cancelled out of {fraud.total_parcel} parcels ({Math.round(fraud.success_ratio * 100)}% success)</div>
                       {fraud.risk === "high" && (
                         <label className="flex items-center gap-2 mt-2 cursor-pointer">
                           <input type="checkbox" checked={fraudAck} onChange={(e) => setFraudAck(e.target.checked)} />
                           <span>I understand the risk and want to proceed.</span>
                         </label>
                       )}
                     </>}
                  </div>
                </div>
              )}


              <div className="pt-2">
                <Label className="mb-2 block">Payment method</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:border-primary">
                    <RadioGroupItem value="COD" id="pm-cod" />
                    <div>
                      <div className="font-semibold">Cash on Delivery</div>
                      <div className="text-xs text-muted-foreground">Pay {money(total)} when you receive the order.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:border-primary">
                    <RadioGroupItem value="ONLINE" id="pm-online" />
                    <div>
                      <div className="font-semibold">Pay online (UddoktaPay)</div>
                      <div className="text-xs text-muted-foreground">Pay the full {money(total)} now via bKash/Nagad/Card.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:border-primary">
                    <RadioGroupItem value="PARTIAL" id="pm-partial" />
                    <div>
                      <div className="font-semibold">Partial payment (delivery charge online + COD)</div>
                      <div className="text-xs text-muted-foreground">Pay {money(shipping)} delivery charge now, {money(subtotal)} on delivery.</div>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid} className="gradient-primary-bg text-primary-foreground">Continue</Button>
          ) : (
            <Button onClick={submit} disabled={submitting} className="gradient-primary-bg text-primary-foreground glow-primary">
              {submitting ? "Placing order..." : "Place order"}
            </Button>
          )}
        </div>
      </div>

      <aside className="card-elevated rounded-2xl p-5 h-fit lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-bold mb-4">Order summary</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {items.map((i) => (
            <div key={i.product_id} className="flex gap-2 text-sm">
              <div className="flex-1 min-w-0 truncate">{i.qty}× {i.title}</div>
              <div>{money(i.qty * i.price)}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{zone ? money(shipping) : "—"}</span></div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-border mt-2">
            <span>Total</span><span className="gradient-text">{money(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
