import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { type ProductLike } from "@/components/products/ProductCard";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { z } from "zod";

const search = z.object({
  q: z.string().optional(),
  type: z.enum(["course", "lab"]).optional(),
  cat: z.string().optional(),
});

export const Route = createFileRoute("/_public/products/")({
  validateSearch: search,
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "All courses & labs — AviEdTech" },
      { name: "description", content: "Browse the full AviEdTech catalog: recorded courses and hands-on labs in cybersecurity, machine learning, and web development. Filter by type, category, price, and rating." },
      { property: "og:title", content: "All courses & labs — AviEdTech" },
      { property: "og:description", content: "Browse the full AviEdTech catalog: recorded courses and hands-on labs. Filter by type, category, price, and rating." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://avi-ed-tech.lovable.app/products" },
    ],
    links: [{ rel: "canonical", href: "https://avi-ed-tech.lovable.app/products" }],
  }),
});


type Category = { id: string; slug: string; name: string };

function ProductsPage() {
  const sp = Route.useSearch();
  const [items, setItems] = useState<ProductLike[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState(sp.q ?? "");
  const [type, setType] = useState<"course" | "lab" | "all">(sp.type ?? "all");
  const [selectedCats, setSelectedCats] = useState<string[]>(sp.cat ? [sp.cat] : []);
  const [minRating, setMinRating] = useState(0);
  const [price, setPrice] = useState<[number, number]>([0, 300]);

  useEffect(() => {
    supabase.from("categories").select("id, slug, name").order("sort_order").then(({ data }) => setCats((data as any) ?? []));
    supabase.from("products").select("*").eq("active", true).then(({ data }) => setItems((data as any) ?? []));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (type !== "all" && p.type !== type) return false;
      if (selectedCats.length) {
        const cat = cats.find((c) => c.id === (p as any).category_id);
        if (!cat || !selectedCats.includes(cat.slug)) return false;
      }
      const pr = Number(p.price);
      if (pr < price[0] || pr > price[1]) return false;
      if (Number(p.rating ?? 0) < minRating) return false;
      return true;
    });
  }, [items, cats, q, type, selectedCats, price, minRating]);

  const toggleCat = (slug: string) =>
    setSelectedCats((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-6">All AviEdTech courses &amp; hands-on labs</h1>
      <div className="grid md:grid-cols-[260px_1fr] gap-8">
        <aside className="space-y-6 card-elevated rounded-2xl p-5 h-fit sticky top-24">
          <div>
            <Label className="mb-2 block">Search</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
          </div>
          <div>
            <Label className="mb-2 block">Type</Label>
            <div className="flex flex-col gap-2 text-sm">
              {(["all", "course", "lab"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 capitalize cursor-pointer">
                  <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} /> {t === "all" ? "All" : t}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Category</Label>
            <div className="space-y-2">
              {cats.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selectedCats.includes(c.slug)} onCheckedChange={() => toggleCat(c.slug)} />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Price: ${price[0]} – ${price[1]}</Label>
            <Slider min={0} max={300} step={10} value={price} onValueChange={(v) => setPrice([v[0], v[1]] as any)} />
          </div>
          <div>
            <Label className="mb-2 block">Min rating: {minRating}★</Label>
            <Slider min={0} max={5} step={0.5} value={[minRating]} onValueChange={(v) => setMinRating(v[0])} />
          </div>
        </aside>
        <div>
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} results</p>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
          {!filtered.length && <p className="text-muted-foreground py-12 text-center">No products match your filters.</p>}
        </div>
      </div>
    </div>
  );
}
