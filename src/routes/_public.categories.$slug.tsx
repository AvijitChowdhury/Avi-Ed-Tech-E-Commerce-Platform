import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { type ProductLike } from "@/components/products/ProductCard";

export const Route = createFileRoute("/_public/categories/$slug")({ component: CategoryPage });

function CategoryPage() {
  const { slug } = Route.useParams();
  const [cat, setCat] = useState<any | null>(null);
  const [items, setItems] = useState<ProductLike[]>([]);

  useEffect(() => {
    supabase.from("categories").select("*").eq("slug", slug).maybeSingle().then(async ({ data }) => {
      setCat(data);
      if (data) {
        const { data: ps } = await supabase.from("products").select("*").eq("category_id", data.id).eq("active", true);
        setItems((ps as any) ?? []);
      }
    });
  }, [slug]);

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{cat?.name ?? "Category"}</h1>
        {cat?.description && <p className="text-muted-foreground">{cat.description}</p>}
      </header>
      <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {!items.length && <p className="text-muted-foreground text-center py-12">No products in this category yet.</p>}
    </div>
  );
}
