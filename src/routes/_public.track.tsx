import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackOrder } from "@/lib/checkout.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_public/track")({
  component: TrackPage,
  head: () => ({
    meta: [
      { title: "Track your order — AviEdTech" },
      { name: "description", content: "Enter your AviEdTech order number and email to see the current status and delivery updates." },
      { property: "og:title", content: "Track your order — AviEdTech" },
      { property: "og:description", content: "Check the status of your AviEdTech course or lab order." },
      { property: "og:url", content: "https://avi-ed-tech.lovable.app/track" },
    ],
    links: [{ rel: "canonical", href: "https://avi-ed-tech.lovable.app/track" }],
  }),
});


const STEPS = ["pending", "processing", "shipped", "delivered"];

function TrackPage() {
  const fn = useServerFn(trackOrder);
  const [ordn, setOrdn] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fn({ data: { order_number: ordn, email } });
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-14 max-w-xl">
      <h1 className="font-display text-3xl font-bold mb-6">Track your order</h1>
      <form onSubmit={submit} className="card-elevated rounded-2xl p-6 space-y-4">
        <div><Label>Order number</Label><Input value={ordn} onChange={(e) => setOrdn(e.target.value)} placeholder="ORD-..." /></div>
        <div><Label>Email used at checkout</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <Button disabled={loading} className="gradient-primary-bg text-primary-foreground w-full">{loading ? "Searching..." : "Track"}</Button>
      </form>

      {result && (result.found ? (
        <div className="card-elevated rounded-2xl p-6 mt-6">
          <div className="flex justify-between mb-3">
            <div className="font-semibold">Order {result.order.order_number}</div>
            <div className="font-bold gradient-text">{money(result.order.total)}</div>
          </div>
          <div className="text-sm text-muted-foreground mb-4">Placed {new Date(result.order.created_at).toLocaleString()}</div>
          <div className="space-y-3">
            {STEPS.map((s, i) => {
              const reached = STEPS.indexOf(result.order.status) >= i;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${reached ? "gradient-primary-bg" : "bg-muted"}`} />
                  <div className={`text-sm capitalize ${reached ? "" : "text-muted-foreground"}`}>{s}</div>
                </div>
              );
            })}
            {result.order.status === "cancelled" && <div className="text-destructive font-medium">Cancelled</div>}
          </div>
        </div>
      ) : (
        <p className="text-center text-muted-foreground mt-6">No order found with that number and email.</p>
      ))}
    </div>
  );
}
