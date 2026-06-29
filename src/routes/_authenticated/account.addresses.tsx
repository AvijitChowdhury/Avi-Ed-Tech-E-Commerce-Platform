import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/addresses")({ component: AddressesPage });

function AddressesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [form, setForm] = useState({ full_name: "", phone: "", line1: "", line2: "", city: "", postal_code: "", zone_id: "", label: "" });

  const load = () => {
    if (!user) return;
    supabase.from("addresses").select("*, delivery_zones(name)").eq("user_id", user.id).then(({ data }) => setItems((data as any) ?? []));
  };
  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    supabase.from("delivery_zones").select("id, name").eq("active", true).then(({ data }) => setZones((data as any) ?? []));
  }, []);

  const add = async () => {
    if (!user) return;
    const { error } = await supabase.from("addresses").insert({ ...form, user_id: user.id, zone_id: form.zone_id || null });
    if (error) toast.error(error.message); else { toast.success("Address added"); setForm({ full_name: "", phone: "", line1: "", line2: "", city: "", postal_code: "", zone_id: "", label: "" }); load(); }
  };
  const del = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Addresses</h1>
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="card-elevated rounded-2xl p-4 flex justify-between gap-4">
            <div className="text-sm">
              {a.label && <div className="font-semibold">{a.label}</div>}
              <div>{a.full_name} — {a.phone}</div>
              <div className="text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}</div>
              {a.delivery_zones?.name && <div className="text-xs text-muted-foreground">Zone: {a.delivery_zones.name}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
      <div className="card-elevated rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold">Add a new address</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Home / Office" /></div>
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        </div>
        <div><Label>Address line 1</Label><Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></div>
        <div><Label>Address line 2</Label><Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Postal code</Label><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
          <div>
            <Label>Zone</Label>
            <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={add} className="gradient-primary-bg text-primary-foreground">Add address</Button>
      </div>
    </div>
  );
}
