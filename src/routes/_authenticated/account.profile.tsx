import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.full_name ?? "");
      setPhone(data?.phone ?? "");
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="font-display text-3xl font-bold">Profile</h1>
      <div className="card-elevated rounded-2xl p-6 space-y-4">
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <Button onClick={save} disabled={saving} className="gradient-primary-bg text-primary-foreground">{saving ? "Saving..." : "Save changes"}</Button>
      </div>
    </div>
  );
}
