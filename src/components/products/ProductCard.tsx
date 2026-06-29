import { Link } from "@tanstack/react-router";
import { Star, Clock, BookOpen, FlaskConical } from "lucide-react";
import { money } from "@/lib/format";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type ProductLike = {
  id: string;
  slug: string;
  title: string;
  short_description?: string | null;
  price: number | string;
  compare_price?: number | string | null;
  cover_image?: string | null;
  type?: "course" | "lab" | null;
  level?: string | null;
  duration?: string | null;
  rating?: number | string | null;
  rating_count?: number | null;
};

export default function ProductCard({ p }: { p: ProductLike }) {
  const { add } = useCart();
  const price = Number(p.price);
  const compare = p.compare_price ? Number(p.compare_price) : null;
  const Icon = p.type === "lab" ? FlaskConical : BookOpen;
  return (
    <div className="group card-elevated rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-elegant hover:border-primary/30 h-full flex flex-col">
      <Link to="/products/$slug" params={{ slug: p.slug }} className="block aspect-[4/3] overflow-hidden bg-muted relative">
        {p.cover_image ? (
          <img
            src={p.cover_image}
            alt={p.title}
            loading="lazy"
            width={800}
            height={600}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="card-glass px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5">
            <Icon className="h-3 w-3" />
            {p.type === "lab" ? "Lab" : "Course"}
          </span>
          {compare && compare > price && (
            <span className="gradient-accent-bg text-accent-foreground px-2.5 py-1 rounded-full text-[11px] font-bold">
              -{Math.round((1 - price / compare) * 100)}%
            </span>
          )}
        </div>
      </Link>
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {p.level && <span>{p.level}</span>}
          {p.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.duration}</span>}
        </div>
        <Link to="/products/$slug" params={{ slug: p.slug }} className="font-display font-semibold text-[15px] leading-snug line-clamp-2 hover:text-primary transition-colors">
          {p.title}
        </Link>
        {p.short_description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{p.short_description}</p>
        )}
        <div className="flex items-center gap-1 text-xs">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          <span className="font-semibold">{Number(p.rating ?? 4.8).toFixed(1)}</span>
          <span className="text-muted-foreground">({p.rating_count ?? 0})</span>
        </div>
        <div className="flex items-end justify-between mt-auto pt-2">
          <div>
            <span className="font-display text-2xl font-bold gradient-text">{money(price)}</span>
            {compare && compare > price && (
              <span className="ml-2 text-xs text-muted-foreground line-through">{money(compare)}</span>
            )}
          </div>
          <Button
            size="sm"
            className="gradient-primary-bg text-primary-foreground hover:opacity-90 hover:scale-105 transition-transform font-semibold"
            onClick={() => {
              add({ product_id: p.id, slug: p.slug, title: p.title, price, image: p.cover_image ?? null });
              toast.success("Added to cart");
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
