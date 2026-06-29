import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2, Upload, X, GripVertical } from "lucide-react";
import { money } from "@/lib/format";
import { toast } from "sonner";
import { uploadProductImage } from "@/lib/uploadProductImage";

export const Route = createFileRoute("/_authenticated/admin/products")({ component: AdminProducts });

type Variation = {
  id?: string;
  name: string;
  sku?: string | null;
  price: number;
  compare_price?: number | null;
  stock: number;
  image_url?: string | null;
  attributes?: Record<string, string>;
  sort_order?: number;
  active?: boolean;
  _new?: boolean;
};

const emptyProduct = {
  slug: "",
  title: "",
  short_description: "",
  description: "",
  price: 0,
  compare_price: null as number | null,
  category_id: "",
  brand_id: null as string | null,
  type: "course",
  kind: "simple" as "simple" | "variable",
  level: "",
  duration: "",
  cover_image: "",
  featured: false,
  stock: 999,
  active: true,
  shipping_cost: null as number | null,
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function AdminProducts() {
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [gallery, setGallery] = useState<{ id?: string; url: string; sort_order: number; _new?: boolean; _delete?: boolean }[]>([]);
  const [productTagIds, setProductTagIds] = useState<string[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationsToDelete, setVariationsToDelete] = useState<string[]>([]);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () =>
    supabase
      .from("products")
      .select("*, category:categories(name), brand:brands(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as any) ?? []));

  useEffect(() => {
    load();
    supabase.from("categories").select("id, name").order("sort_order").then(({ data }) => setCats((data as any) ?? []));
    supabase.from("brands").select("id, name").order("name").then(({ data }) => setBrands((data as any) ?? []));
    supabase.from("tags").select("id, name, slug").order("name").then(({ data }) => setTags((data as any) ?? []));
  }, []);

  const openNew = () => {
    setEditing({ ...emptyProduct });
    setGallery([]); setProductTagIds([]); setVariations([]); setVariationsToDelete([]); setRelatedIds([]);
    setOpen(true);
  };

  const openEdit = async (it: any) => {
    setEditing({ ...it, shipping_cost: it.shipping_cost ?? null });
    const [imgs, ptags, vars, rel] = await Promise.all([
      supabase.from("product_images").select("*").eq("product_id", it.id).order("sort_order"),
      supabase.from("product_tags").select("tag_id").eq("product_id", it.id),
      supabase.from("product_variations").select("*").eq("product_id", it.id).order("sort_order"),
      supabase.from("related_products").select("related_id, sort_order").eq("product_id", it.id).order("sort_order"),
    ]);
    setGallery(((imgs.data as any) ?? []).map((g: any) => ({ id: g.id, url: g.url, sort_order: g.sort_order })));
    setProductTagIds(((ptags.data as any) ?? []).map((t: any) => t.tag_id));
    setVariations(((vars.data as any) ?? []).map((v: any) => ({ ...v, attributes: v.attributes ?? {} })));
    setVariationsToDelete([]);
    setRelatedIds(((rel.data as any) ?? []).map((r: any) => r.related_id));
    setOpen(true);
  };

  const handleCoverUpload = async (file: File) => {
    try { const url = await uploadProductImage(file); setEditing((e: any) => ({ ...e, cover_image: url })); }
    catch (err: any) { toast.error(err?.message || "Upload failed"); }
  };

  const handleGalleryUpload = async (files: FileList) => {
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadProductImage(f)));
      setGallery((g) => [...g, ...urls.map((url, i) => ({ url, sort_order: g.length + i, _new: true }))]);
    } catch (err: any) { toast.error(err?.message || "Upload failed"); }
  };

  const removeGalleryItem = (idx: number) => {
    setGallery((g) => g.map((it, i) => (i === idx ? { ...it, _delete: true } : it)));
  };

  const toggleTag = (id: string) => {
    setProductTagIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  };

  const addNewTag = async (name: string) => {
    const slug = slugify(name);
    if (!slug) return;
    const { data, error } = await supabase.from("tags").insert({ name: name.trim(), slug }).select("id, name, slug").single();
    if (error) { toast.error(error.message); return; }
    setTags((t) => [...t, data as any]);
    setProductTagIds((ids) => [...ids, (data as any).id]);
  };

  const addVariation = () => {
    setVariations((v) => [...v, { name: "", price: 0, stock: 0, attributes: {}, sort_order: v.length, active: true, _new: true }]);
  };
  const setVar = (i: number, patch: Partial<Variation>) =>
    setVariations((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const removeVar = (i: number) => {
    const v = variations[i];
    if (v.id) setVariationsToDelete((d) => [...d, v.id!]);
    setVariations((vs) => vs.filter((_, idx) => idx !== i));
  };

  const toggleRelated = (id: string) => {
    setRelatedIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) return toast.error("Title required");
    setSaving(true);
    try {
      const payload: any = { ...editing };
      delete payload.category;
      delete payload.brand;
      payload.slug = (payload.slug?.trim() || slugify(payload.title));
      payload.price = Number(payload.price) || 0;
      payload.compare_price = payload.compare_price === null || payload.compare_price === "" ? null : Number(payload.compare_price);
      payload.stock = Number(payload.stock) || 0;
      payload.brand_id = payload.brand_id || null;
      payload.category_id = payload.category_id || null;
      payload.shipping_cost = payload.shipping_cost === null || payload.shipping_cost === "" ? null : Number(payload.shipping_cost);

      let productId: string = payload.id;
      if (!productId) {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw new Error(error.message);
        productId = (data as any).id;
      } else {
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw new Error(error.message);
      }

      // gallery
      const galleryToDelete = gallery.filter((g) => g.id && g._delete).map((g) => g.id!);
      if (galleryToDelete.length) await supabase.from("product_images").delete().in("id", galleryToDelete);
      const galleryToInsert = gallery.filter((g) => g._new && !g._delete).map((g, i) => ({ product_id: productId, url: g.url, sort_order: i }));
      if (galleryToInsert.length) await supabase.from("product_images").insert(galleryToInsert);

      // tags
      await supabase.from("product_tags").delete().eq("product_id", productId);
      if (productTagIds.length) {
        await supabase.from("product_tags").insert(productTagIds.map((tag_id) => ({ product_id: productId, tag_id })));
      }

      // variations
      if (variationsToDelete.length) await supabase.from("product_variations").delete().in("id", variationsToDelete);
      for (const [i, v] of variations.entries()) {
        const row = {
          product_id: productId,
          name: v.name,
          sku: v.sku || null,
          price: Number(v.price) || 0,
          compare_price: v.compare_price === null || v.compare_price === undefined || (v.compare_price as any) === "" ? null : Number(v.compare_price),
          stock: Number(v.stock) || 0,
          image_url: v.image_url || null,
          attributes: v.attributes || {},
          sort_order: i,
          active: v.active ?? true,
        };
        if (v.id) await supabase.from("product_variations").update(row).eq("id", v.id);
        else await supabase.from("product_variations").insert(row);
      }

      // related
      await supabase.from("related_products").delete().eq("product_id", productId);
      if (relatedIds.length) {
        await supabase.from("related_products").insert(relatedIds.map((rid, i) => ({ product_id: productId, related_id: rid, sort_order: i })));
      }

      toast.success("Saved");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete product? This cannot be undone.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl font-bold">Products</h1>
        <Button onClick={openNew} className="gradient-primary-bg text-primary-foreground"><Plus className="mr-2 h-4 w-4" />New product</Button>
      </div>
      <div className="card-elevated rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Brand</th>
              <th className="p-3">Kind</th><th className="p-3">Price</th><th className="p-3">Stock</th>
              <th className="p-3">Featured</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {p.cover_image && <img src={p.cover_image} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div><div className="font-medium">{p.title}</div><div className="text-xs text-muted-foreground capitalize">{p.type}</div></div>
                  </div>
                </td>
                <td className="p-3 text-xs">{p.category?.name ?? "—"}</td>
                <td className="p-3 text-xs">{p.brand?.name ?? "—"}</td>
                <td className="p-3"><Badge variant="outline" className="capitalize">{p.kind ?? "simple"}</Badge></td>
                <td className="p-3 font-bold">{money(p.price)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">{p.featured ? "✓" : ""}</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {editing && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="taxonomy">Tags & Brand</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="shipping">Shipping</TabsTrigger>
                <TabsTrigger value="related">Related</TabsTrigger>
              </TabsList>

              {/* GENERAL */}
              <TabsContent value="general" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Product name</Label>
                    <Input
                      value={editing.title}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Short description</Label>
                  <Textarea rows={2} value={editing.short_description ?? ""} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} />
                </div>
                <div>
                  <Label>Long description</Label>
                  <Textarea rows={8} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
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
                    <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                    <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex gap-6 pt-1">
                  <label className="flex items-center gap-2 text-sm"><Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} /> Featured</label>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /> Active</label>
                </div>
              </TabsContent>

              {/* IMAGES */}
              <TabsContent value="images" className="space-y-5 mt-4">
                <div>
                  <Label>Cover image</Label>
                  <div className="mt-1 flex items-start gap-3">
                    {editing.cover_image ? (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                        <img src={editing.cover_image} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setEditing({ ...editing, cover_image: "" })} className="absolute top-1 right-1 bg-background/90 rounded-full p-1"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <UploadBox onFiles={(fs) => fs[0] && handleCoverUpload(fs[0])} label="Upload cover" />
                    )}
                  </div>
                  <Input className="mt-2" placeholder="Or paste image URL" value={editing.cover_image ?? ""} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} />
                </div>

                <div>
                  <Label>Gallery images</Label>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {gallery.map((g, i) => !g._delete && (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img src={g.url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removeGalleryItem(i)} className="absolute top-1 right-1 bg-background/90 rounded-full p-1"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <UploadBox multiple onFiles={(fs) => handleGalleryUpload(fs)} label="Add" />
                  </div>
                </div>
              </TabsContent>

              {/* TAGS & BRAND */}
              <TabsContent value="taxonomy" className="space-y-4 mt-4">
                <div>
                  <Label>Brand</Label>
                  <Select value={editing.brand_id ?? "__none"} onValueChange={(v) => setEditing({ ...editing, brand_id: v === "__none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="No brand" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No brand</SelectItem>
                      {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <BrandQuickAdd onCreated={(b) => { setBrands((arr) => [...arr, b]); setEditing((e: any) => ({ ...e, brand_id: b.id })); }} />
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={`px-3 py-1 rounded-full text-xs border ${productTagIds.includes(t.id) ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                      >{t.name}</button>
                    ))}
                  </div>
                  <TagQuickAdd onAdd={addNewTag} />
                </div>
              </TabsContent>

              {/* DATA — simple vs variable */}
              <TabsContent value="data" className="space-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <Label>Product kind</Label>
                  <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v })}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple product</SelectItem>
                      <SelectItem value="variable">Variable product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editing.kind === "simple" ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Price</Label><Input type="number" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
                    <div><Label>Compare price</Label><Input type="number" step="0.01" value={editing.compare_price ?? ""} onChange={(e) => setEditing({ ...editing, compare_price: e.target.value || null })} /></div>
                    <div><Label>Stock</Label><Input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} /></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Each variation has its own price, stock, and image. Use attributes like "Size: M, Color: Red".</p>
                      <Button type="button" size="sm" variant="outline" onClick={addVariation}><Plus className="w-4 h-4 mr-1" />Add variation</Button>
                    </div>
                    {variations.length === 0 && <div className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded-lg">No variations yet.</div>}
                    {variations.map((v, i) => (
                      <div key={i} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <Input className="flex-1" placeholder="Variation name (e.g. Red / Medium)" value={v.name} onChange={(e) => setVar(i, { name: e.target.value })} />
                          <label className="flex items-center gap-2 text-xs"><Switch checked={v.active ?? true} onCheckedChange={(c) => setVar(i, { active: c })} />Active</label>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeVar(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div><Label className="text-xs">Price</Label><Input type="number" step="0.01" value={v.price} onChange={(e) => setVar(i, { price: Number(e.target.value) })} /></div>
                          <div><Label className="text-xs">Compare</Label><Input type="number" step="0.01" value={v.compare_price ?? ""} onChange={(e) => setVar(i, { compare_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                          <div><Label className="text-xs">Stock</Label><Input type="number" value={v.stock} onChange={(e) => setVar(i, { stock: Number(e.target.value) })} /></div>
                          <div><Label className="text-xs">SKU</Label><Input value={v.sku ?? ""} onChange={(e) => setVar(i, { sku: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div>
                            <Label className="text-xs">Attributes (e.g. size=M, color=Red)</Label>
                            <Input
                              placeholder="size=M, color=Red"
                              defaultValue={Object.entries(v.attributes ?? {}).map(([k, val]) => `${k}=${val}`).join(", ")}
                              onBlur={(e) => {
                                const obj: Record<string, string> = {};
                                e.target.value.split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => {
                                  const [k, ...rest] = p.split("=");
                                  if (k && rest.length) obj[k.trim()] = rest.join("=").trim();
                                });
                                setVar(i, { attributes: obj });
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Variation image</Label>
                            <div className="flex items-center gap-2">
                              {v.image_url && <img src={v.image_url} alt="" className="w-10 h-10 rounded object-cover border" />}
                              <UploadBox compact onFiles={async (fs) => { if (!fs[0]) return; try { const url = await uploadProductImage(fs[0]); setVar(i, { image_url: url }); } catch (e: any) { toast.error(e?.message); } }} label="Upload" />
                              {v.image_url && <Button type="button" size="sm" variant="ghost" onClick={() => setVar(i, { image_url: null })}>Clear</Button>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* SHIPPING */}
              <TabsContent value="shipping" className="space-y-3 mt-4">
                <div>
                  <Label>Custom shipping cost</Label>
                  <Input
                    type="number" step="0.01"
                    placeholder="Leave empty to use delivery zone rate"
                    value={editing.shipping_cost ?? ""}
                    onChange={(e) => setEditing({ ...editing, shipping_cost: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">If set, this product uses a fixed shipping cost instead of the customer's delivery zone rate.</p>
                </div>
              </TabsContent>

              {/* RELATED */}
              <TabsContent value="related" className="space-y-3 mt-4">
                <p className="text-sm text-muted-foreground">Pick products to suggest alongside this one.</p>
                <RelatedPicker
                  allProducts={items.filter((p) => p.id !== editing.id)}
                  selectedIds={relatedIds}
                  onToggle={toggleRelated}
                />
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gradient-primary-bg text-primary-foreground">{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadBox({ onFiles, label, multiple, compact }: { onFiles: (files: FileList) => void; label: string; multiple?: boolean; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => e.target.files && e.target.files.length && onFiles(e.target.files)} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:bg-muted/40 ${compact ? "h-10 px-3 flex-row" : "aspect-square"}`}
      >
        <Upload className="w-4 h-4" /> {label}
      </button>
    </>
  );
}

function BrandQuickAdd({ onCreated }: { onCreated: (b: any) => void }) {
  const [name, setName] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    const slug = slugify(name);
    const { data, error } = await supabase.from("brands").insert({ name: name.trim(), slug }).select("id, name").single();
    if (error) return toast.error(error.message);
    setName("");
    onCreated(data as any);
  };
  return (
    <div className="flex gap-2 mt-2">
      <Input placeholder="Create new brand..." value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
      <Button type="button" size="sm" variant="outline" onClick={add}>Add</Button>
    </div>
  );
}

function TagQuickAdd({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  return (
    <div className="flex gap-2 mt-3">
      <Input placeholder="Create new tag..." value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
      <Button type="button" size="sm" variant="outline" onClick={async () => { await onAdd(name); setName(""); }}>Add</Button>{/* */}
    </div>
  );
}

function RelatedPicker({ allProducts, selectedIds, onToggle }: { allProducts: any[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => allProducts.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())), [allProducts, q]);
  return (
    <div className="space-y-2">
      <Input placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-72 overflow-y-auto rounded-lg border">
        {filtered.map((p) => (
          <label key={p.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-0 hover:bg-muted/40 cursor-pointer">
            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => onToggle(p.id)} />
            {p.cover_image && <img src={p.cover_image} alt="" className="w-8 h-8 rounded object-cover" />}
            <div className="flex-1 text-sm">{p.title}</div>
            <span className="text-xs text-muted-foreground">{money(p.price)}</span>
          </label>
        ))}
        {!filtered.length && <div className="p-4 text-sm text-center text-muted-foreground">No products.</div>}
      </div>
      {selectedIds.length > 0 && <div className="text-xs text-muted-foreground">{selectedIds.length} selected</div>}
    </div>
  );
}
