import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/auth";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingCart } from "lucide-react";
import { money } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/wishlist")({ component: WishlistPage });

function WishlistPage() {
  const { user } = useAuth();
  const { add } = useCart();
  const [items, setItems] = useState<any[]>([]);

  const load = () => {
    if (!user) return;
    supabase.from("wishlist").select("id, product:products(*)").eq("user_id", user.id).then(({ data }) => setItems((data as any) ?? []));
  };
  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    await supabase.from("wishlist").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Wishlist</h1>
      {!items.length && <p className="text-muted-foreground">Your wishlist is empty. <Link to="/products" className="text-primary hover:underline">Browse products</Link></p>}
      <div className="grid gap-3">
        {items.map((w) => {
          const p = w.product;
          if (!p) return null;
          return (
            <div key={w.id} className="card-elevated rounded-2xl p-4 flex items-center gap-4">
              {p.cover_image && <img src={p.cover_image} alt={p.title} className="w-16 h-16 rounded-lg object-cover" />}
              <Link to="/products/$slug" params={{ slug: p.slug }} className="flex-1 font-medium hover:text-primary">{p.title}</Link>
              <div className="gradient-text font-bold">{money(p.price)}</div>
              <Button size="sm" onClick={() => { add({ product_id: p.id, slug: p.slug, title: p.title, price: Number(p.price), image: p.cover_image }); toast.success("Added to cart"); }} className="gradient-primary-bg text-primary-foreground">
                <ShoppingCart className="mr-1 h-3 w-3" /> Add
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
