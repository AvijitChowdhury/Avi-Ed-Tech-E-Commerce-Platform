import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { money } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({ component: AdminProducts });

const empty = { slug: "", title: "", short_description: "", description: "", price: 0, compare_price: null as number | null, category_id: "", type: "course", level: "", duration: "", cover_image: "", featured: false, stock: 999, active: true };

function AdminProducts() {
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const load = () => supabase.from("products").select("*, category:categories(name)").order("created_at", { ascending: false }).then(({ data }) => setItems((data as any) ?? []));
  useEffect(() => { load(); supabase.from("categories").select("id, name").order("sort_order").then(({ data }) => setCats((data as any) ?? [])); }, []);

  const openNew = () => { setEditing({ ...empty }); setOpen(true); };
  const openEdit = (it: any) => { setEditing({ ...it }); setOpen(true); };

  const save = async () => {
    if (!editing) return;
    const payload = { ...editing };
    delete payload.category;
    payload.price = Number(payload.price);
    payload.compare_price = payload.compare_price ? Number(payload.compare_price) : null;
    payload.stock = Number(payload.stock);
    if (!payload.id) {
      const { error } = await supabase.from("products").insert(payload);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("products").update(payload).eq("id", payload.id);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete product?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-bold">Products</h1>
        <Button onClick={openNew} className="gradient-primary-bg text-primary-foreground"><Plus className="mr-2 h-4 w-4" />New product</Button>
      </div>
      <div className="card-elevated rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/40"><tr className="text-left"><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Featured</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3"><div className="flex items-center gap-2">{p.cover_image && <img src={p.cover_image} alt="" className="w-10 h-10 rounded object-cover" />}<div><div className="font-medium">{p.title}</div><div className="text-xs text-muted-foreground capitalize">{p.type}</div></div></div></td>
                <td className="p-3 text-xs">{p.category?.name ?? "—"}</td>
                <td className="p-3 font-bold">{money(p.price)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">{p.featured ? "✓" : ""}</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              </div>
              <div><Label>Short description</Label><Input value={editing.short_description ?? ""} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Price</Label><Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
                <div><Label>Compare price</Label><Input type="number" value={editing.compare_price ?? ""} onChange={(e) => setEditing({ ...editing, compare_price: e.target.value || null })} /></div>
                <div><Label>Stock</Label><Input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Type</Label>
                  <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="course">Course</SelectItem><SelectItem value="lab">Lab</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Level</Label><Input value={editing.level ?? ""} onChange={(e) => setEditing({ ...editing, level: e.target.value })} /></div>
                <div><Label>Duration</Label><Input value={editing.duration ?? ""} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} /></div>
              </div>
              <div><Label>Category</Label>
                <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Cover image URL</Label><Input value={editing.cover_image ?? ""} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} /></div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} /> Featured</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /> Active</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="gradient-primary-bg text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
