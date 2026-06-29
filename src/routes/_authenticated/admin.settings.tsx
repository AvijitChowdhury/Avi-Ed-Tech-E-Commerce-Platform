import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { testBDCourierConnection } from "@/lib/fraud.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <Tabs defaultValue="zones">
        <TabsList>
          <TabsTrigger value="zones">Delivery zones</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="ann">Announcements</TabsTrigger>
          <TabsTrigger value="fraud">Fraud check</TabsTrigger>
        </TabsList>
        <TabsContent value="zones"><Zones /></TabsContent>
        <TabsContent value="banners"><Banners /></TabsContent>
        <TabsContent value="ann"><Announcements /></TabsContent>
        <TabsContent value="fraud"><FraudSettings /></TabsContent>
      </Tabs>
    </div>
  );
}

function FraudSettings() {
  const [autoCheck, setAutoCheck] = useState(true);
  const [blockHigh, setBlockHigh] = useState(false);
  const [ratio, setRatio] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const testFn = useServerFn(testBDCourierConnection);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "fraud").maybeSingle().then(({ data }) => {
      const v = (data?.value as any) ?? {};
      if (typeof v.auto_check === "boolean") setAutoCheck(v.auto_check);
      if (typeof v.block_high_risk === "boolean") setBlockHigh(v.block_high_risk);
      if (typeof v.high_risk_ratio === "number") setRatio(v.high_risk_ratio);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({
      key: "fraud",
      value: { auto_check: autoCheck, block_high_risk: blockHigh, high_risk_ratio: ratio },
    });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const runTest = async () => {
    if (!testPhone) return toast.error("Enter a phone number");
    setTesting(true); setTestResult(null);
    try {
      const r: any = await testFn({ data: { phone: testPhone } });
      setTestResult(r.summary);
      toast.success(`Connection OK – ${r.summary.risk} risk`);
    } catch (e: any) { toast.error(e?.message ?? "Test failed"); }
    finally { setTesting(false); }
  };

  return (
    <div className="card-elevated rounded-2xl p-5 mt-4 space-y-6">
      <div>
        <h2 className="font-semibold text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> BD Courier fraud check</h2>
        <p className="text-sm text-muted-foreground mt-1">
          API key is stored securely on the server. To update it, ask the admin to update the <code>BDCOURIER_API_KEY</code> secret.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>Auto-check at checkout</Label>
          <p className="text-xs text-muted-foreground">Run a fraud check automatically when customers reach the review step.</p>
        </div>
        <Switch checked={autoCheck} onCheckedChange={setAutoCheck} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>Require acknowledgement on high-risk orders</Label>
          <p className="text-xs text-muted-foreground">Customers must confirm before placing a high-risk order.</p>
        </div>
        <Switch checked={blockHigh} onCheckedChange={setBlockHigh} />
      </div>

      <div className="max-w-xs">
        <Label>High-risk threshold (success ratio)</Label>
        <Input type="number" min={0} max={1} step="0.05" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
        <p className="text-xs text-muted-foreground mt-1">Orders below this delivery ratio are flagged as high risk.</p>
      </div>

      <Button onClick={save} disabled={saving} className="gradient-primary-bg text-primary-foreground">
        {saving ? "Saving…" : "Save settings"}
      </Button>

      <div className="border-t border-border pt-5">
        <Label>Test connection</Label>
        <div className="flex gap-2 mt-2">
          <Input placeholder="Phone number to test" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="max-w-xs" />
          <Button onClick={runTest} disabled={testing} variant="outline">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
          </Button>
        </div>
        {testResult && (
          <div className="mt-3 text-sm">
            <span className="capitalize font-semibold">{testResult.risk}</span> · {testResult.success}/{testResult.total_parcel} delivered ({Math.round(testResult.success_ratio * 100)}%)
          </div>
        )}
      </div>
    </div>
  );
}


function Zones() {
  const [rows, setRows] = useState<any[]>([]);
  const [n, setN] = useState(""); const [p, setP] = useState("0");
  const load = () => supabase.from("delivery_zones").select("*").order("sort_order").then(({ data }) => setRows((data as any) ?? []));
  useEffect(() => { load(); }, []);
  const add = async () => { if (!n) return; await supabase.from("delivery_zones").insert({ name: n, price: Number(p) }); setN(""); setP("0"); load(); };
  const update = async (id: string, patch: any) => { await supabase.from("delivery_zones").update(patch).eq("id", id); load(); };
  const del = async (id: string) => { await supabase.from("delivery_zones").delete().eq("id", id); load(); };
  return (
    <div className="card-elevated rounded-2xl p-5 mt-4 space-y-3">
      {rows.map((z) => (
        <div key={z.id} className="flex gap-2 items-center">
          <Input value={z.name} onChange={(e) => update(z.id, { name: e.target.value })} className="flex-1" />
          <Input type="number" value={z.price} onChange={(e) => update(z.id, { price: Number(e.target.value) })} className="w-28" />
          <Switch checked={z.active} onCheckedChange={(v) => update(z.id, { active: v })} />
          <Button size="icon" variant="ghost" onClick={() => del(z.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ))}
      <div className="flex gap-2 pt-3 border-t border-border">
        <Input placeholder="Zone name" value={n} onChange={(e) => setN(e.target.value)} className="flex-1" />
        <Input type="number" placeholder="Price" value={p} onChange={(e) => setP(e.target.value)} className="w-28" />
        <Button onClick={add} className="gradient-primary-bg text-primary-foreground"><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function Banners() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("banners").select("*").order("sort_order").then(({ data }) => setRows((data as any) ?? []));
  useEffect(() => { load(); }, []);
  const update = async (id: string, patch: any) => { await supabase.from("banners").update(patch).eq("id", id); load(); };
  const add = async () => { await supabase.from("banners").insert({ type: "promo", title: "New banner", subtitle: "", active: true }); load(); };
  const del = async (id: string) => { await supabase.from("banners").delete().eq("id", id); load(); };
  return (
    <div className="space-y-3 mt-4">
      <Button onClick={add} className="gradient-primary-bg text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Add banner</Button>
      {rows.map((b) => (
        <div key={b.id} className="card-elevated rounded-2xl p-4 grid grid-cols-2 gap-2">
          <Input value={b.title ?? ""} onChange={(e) => update(b.id, { title: e.target.value })} placeholder="Title" />
          <Input value={b.subtitle ?? ""} onChange={(e) => update(b.id, { subtitle: e.target.value })} placeholder="Subtitle" />
          <Input value={b.cta_label ?? ""} onChange={(e) => update(b.id, { cta_label: e.target.value })} placeholder="CTA label" />
          <Input value={b.cta_link ?? ""} onChange={(e) => update(b.id, { cta_link: e.target.value })} placeholder="CTA link" />
          <Input value={b.image_url ?? ""} onChange={(e) => update(b.id, { image_url: e.target.value })} placeholder="Image URL" className="col-span-2" />
          <div className="col-span-2 flex justify-between items-center">
            <div className="flex gap-3 items-center text-sm">
              <span className="text-muted-foreground capitalize">{b.type}</span>
              <Switch checked={b.active} onCheckedChange={(v) => update(b.id, { active: v })} /> Active
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Announcements() {
  const [rows, setRows] = useState<any[]>([]);
  const [t, setT] = useState("");
  const load = () => supabase.from("announcements").select("*").order("sort_order").then(({ data }) => setRows((data as any) ?? []));
  useEffect(() => { load(); }, []);
  const update = async (id: string, patch: any) => { await supabase.from("announcements").update(patch).eq("id", id); load(); };
  const add = async () => { if (!t) return; await supabase.from("announcements").insert({ text: t, active: true }); setT(""); load(); };
  const del = async (id: string) => { await supabase.from("announcements").delete().eq("id", id); load(); };
  return (
    <div className="card-elevated rounded-2xl p-5 mt-4 space-y-3">
      {rows.map((a) => (
        <div key={a.id} className="flex gap-2 items-center">
          <Input value={a.text} onChange={(e) => update(a.id, { text: e.target.value })} className="flex-1" />
          <Switch checked={a.active} onCheckedChange={(v) => update(a.id, { active: v })} />
          <Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ))}
      <div className="flex gap-2 pt-3 border-t border-border">
        <Input placeholder="New announcement text" value={t} onChange={(e) => setT(e.target.value)} className="flex-1" />
        <Button onClick={add} className="gradient-primary-bg text-primary-foreground"><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
