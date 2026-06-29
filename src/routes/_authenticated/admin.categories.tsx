import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: AdminCategories });

const empty = { slug: "", name: "", description: "", icon: "", image_url: "", sort_order: 0 };

function AdminCategories() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = () => supabase.from("categories").select("*").order("sort_order").then(({ data }) => setItems((data as any) ?? []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const p = { ...editing, sort_order: Number(editing.sort_order) };
    const { error } = p.id ? await supabase.from("categories").update(p).eq("id", p.id) : await supabase.from("categories").insert(p);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); load();
  };
  const del = async (id: string) => { if (confirm("Delete?")) { await supabase.from("categories").delete().eq("id", id); load(); } };

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h1 className="font-display text-3xl font-bold">Categories</h1>
        <Button onClick={() => { setEditing({ ...empty }); setOpen(true); }} className="gradient-primary-bg text-primary-foreground"><Plus className="mr-2 h-4 w-4" />New</Button>
      </div>
      <div className="card-elevated rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr className="text-left"><th className="p-3">Name</th><th className="p-3">Slug</th><th className="p-3">Sort</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground font-mono text-xs">{c.slug}</td>
                <td className="p-3">{c.sort_order}</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...c }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Image URL</Label><Input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></div>
              <div><Label>Sort order</Label><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="gradient-primary-bg text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
