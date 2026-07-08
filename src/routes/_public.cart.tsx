import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_public/cart")({
  component: CartPage,
  head: () => ({
    meta: [
      { title: "Your cart — AviEdTech" },
      { name: "description", content: "Review the courses and labs in your AviEdTech cart before checkout." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your cart — AviEdTech" },
      { property: "og:url", content: "https://avi-ed-tech.lovable.app/cart" },
    ],
    links: [{ rel: "canonical", href: "https://avi-ed-tech.lovable.app/cart" }],
  }),
});


function CartPage() {
  const { items, update, remove, subtotal } = useCart();

  if (!items.length) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Add some courses or labs to get started.</p>
        <Link to="/products"><Button className="gradient-primary-bg text-primary-foreground">Browse courses</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 grid lg:grid-cols-[1fr_360px] gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold mb-6">Your cart</h1>
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.product_id} className="card-elevated rounded-2xl p-4 flex gap-4 items-center">
              {i.image && <img src={i.image} alt={i.title} className="w-20 h-20 rounded-lg object-cover" />}
              <div className="flex-1 min-w-0">
                <Link to="/products/$slug" params={{ slug: i.slug }} className="font-semibold hover:text-primary line-clamp-2">{i.title}</Link>
                <div className="text-sm text-muted-foreground">{money(i.price)} each</div>
              </div>
              <div className="flex items-center gap-1 border border-border rounded-lg">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => update(i.product_id, i.qty - 1)}><Minus className="h-3 w-3" /></Button>
                <Input value={i.qty} onChange={(e) => update(i.product_id, Math.max(1, Number(e.target.value) || 1))} className="w-12 h-8 text-center border-0" />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => update(i.product_id, i.qty + 1)}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="font-semibold w-20 text-right">{money(i.price * i.qty)}</div>
              <Button size="icon" variant="ghost" onClick={() => remove(i.product_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>
      <aside className="card-elevated rounded-2xl p-6 h-fit lg:sticky lg:top-24">
        <h2 className="font-display text-xl font-bold mb-4">Order summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="text-muted-foreground">Calculated at checkout</span></div>
        </div>
        <div className="border-t border-border my-4" />
        <div className="flex justify-between font-bold text-lg mb-5">
          <span>Total</span><span className="gradient-text">{money(subtotal)}</span>
        </div>
        <Link to="/checkout"><Button size="lg" className="w-full gradient-primary-bg text-primary-foreground glow-primary">Proceed to checkout</Button></Link>
      </aside>
    </div>
  );
}
