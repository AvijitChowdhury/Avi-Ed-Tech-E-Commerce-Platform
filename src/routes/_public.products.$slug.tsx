import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { toast } from "sonner";
import { Star, Clock, BookOpen, FlaskConical, Check, ShoppingCart, Heart } from "lucide-react";
import { money } from "@/lib/format";
import ProductCard, { type ProductLike } from "@/components/products/ProductCard";

export const Route = createFileRoute("/_public/products/$slug")({
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const [p, setP] = useState<any | null>(null);
  const [related, setRelated] = useState<ProductLike[]>([]);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    setLoading(true);
    supabase.from("products").select("*, category:categories(id, name, slug)").eq("slug", slug).maybeSingle().then(async ({ data }) => {
      setP(data);
      setLoading(false);
      if (data?.category_id) {
        const { data: r } = await supabase.from("products").select("*").eq("category_id", data.category_id).neq("id", data.id).limit(4);
        setRelated((r as any) ?? []);
      }
    });
  }, [slug]);

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading...</div>;
  if (!p) return <div className="container mx-auto px-4 py-20 text-center">Product not found.</div>;

  const price = Number(p.price);
  const compare = p.compare_price ? Number(p.compare_price) : null;
  const Icon = p.type === "lab" ? FlaskConical : BookOpen;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="text-sm text-muted-foreground mb-4">
        <Link to="/products" className="hover:text-primary">Courses</Link>
        {p.category && <> / <Link to="/categories/$slug" params={{ slug: p.category.slug }} className="hover:text-primary">{p.category.name}</Link></>}
      </div>
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-[4/3] rounded-3xl overflow-hidden card-elevated">
          {p.cover_image && <img src={p.cover_image} alt={p.title} className="w-full h-full object-cover" />}
        </div>
        <div className="space-y-5">
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-card border border-border text-xs">
              <Icon className="h-3 w-3" />{p.type === "lab" ? "Hands-on lab" : "Recorded course"}
            </span>
            {p.level && <span className="px-3 py-1 rounded-full bg-card border border-border text-xs">{p.level}</span>}
            {p.duration && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-card border border-border text-xs"><Clock className="h-3 w-3" />{p.duration}</span>}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">{p.title}</h1>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="font-medium">{Number(p.rating ?? 0).toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({p.rating_count ?? 0} reviews)</span>
          </div>
          <p className="text-muted-foreground">{p.short_description}</p>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold gradient-text">{money(price)}</span>
            {compare && compare > price && (
              <>
                <span className="text-lg text-muted-foreground line-through">{money(compare)}</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-destructive text-destructive-foreground">
                  Save {money(compare - price)}
                </span>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              className="gradient-primary-bg text-primary-foreground glow-primary flex-1"
              onClick={() => {
                add({ product_id: p.id, slug: p.slug, title: p.title, price, image: p.cover_image });
                toast.success("Added to cart");
              }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
            </Button>
            <Button size="lg" variant="outline" aria-label="Wishlist"><Heart className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {["Lifetime access", "Certificate of completion", "Hands-on projects", "Updates included"].map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" /> {b}</div>
            ))}
          </div>
        </div>
      </div>

      {p.description && (
        <section className="mt-14 max-w-3xl">
          <h2 className="font-display text-2xl font-bold mb-3">About this {p.type === "lab" ? "lab" : "course"}</h2>
          <p className="text-muted-foreground whitespace-pre-line">{p.description}</p>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold mb-6">Related</h2>
          <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
