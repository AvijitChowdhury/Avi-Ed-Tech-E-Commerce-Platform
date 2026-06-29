import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { type ProductLike } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import {
  ArrowRight, Shield, Award, Headphones, RefreshCw, Check, X, Sparkles, Zap, Trophy, Users, Star,
} from "lucide-react";

export const Route = createFileRoute("/_public/")({ component: HomePage });

type Banner = { id: string; type: string; title: string | null; subtitle: string | null; cta_label: string | null; cta_link: string | null; image_url: string | null; badge: string | null };
type Category = { id: string; slug: string; name: string; image_url: string | null };
type Review = { id: string; reviewer_name: string; reviewer_role: string | null; rating: number; body: string };

function HomePage() {
  const [heroes, setHeroes] = useState<Banner[]>([]);
  const [promos, setPromos] = useState<Banner[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ProductLike[]>([]);
  const [all, setAll] = useState<ProductLike[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [shown, setShown] = useState(8);
  const [hi, setHi] = useState(0);

  useEffect(() => {
    Promise.all([
      supabase.from("banners").select("*").eq("active", true).eq("type", "hero").order("sort_order"),
      supabase.from("banners").select("*").eq("active", true).eq("type", "promo").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products").select("*").eq("featured", true).eq("active", true).limit(8),
      supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").eq("featured", true).eq("approved", true),
    ]).then(([h, p, c, f, a, r]) => {
      setHeroes((h.data as any) ?? []);
      setPromos((p.data as any) ?? []);
      setCats((c.data as any) ?? []);
      setFeatured((f.data as any) ?? []);
      setAll((a.data as any) ?? []);
      setReviews((r.data as any) ?? []);
    });
  }, []);

  useEffect(() => {
    if (heroes.length < 2) return;
    const t = setInterval(() => setHi((i) => (i + 1) % heroes.length), 6000);
    return () => clearInterval(t);
  }, [heroes.length]);

  const hero = heroes[hi];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="gradient-hero-bg">
          <div className="container mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center min-h-[520px]">
            <div className="space-y-6 animate-fade-in-up">
              {hero?.badge && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/60 border border-border text-xs">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {hero.badge}
                </span>
              )}
              <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
                {hero?.title ?? "Level up your tech career"}
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                {hero?.subtitle ?? "Recorded courses + hands-on labs taught by industry experts."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to={(hero?.cta_link as any) ?? "/products"}>
                  <Button size="lg" className="gradient-primary-bg text-primary-foreground glow-primary">
                    {hero?.cta_label ?? "Browse courses"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/track">
                  <Button size="lg" variant="outline">Track order</Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 pt-4 text-sm">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> 50K+ learners</div>
                <div className="flex items-center gap-2"><Star className="h-4 w-4 fill-warning text-warning" /> 4.9 avg rating</div>
                <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Industry experts</div>
              </div>
            </div>
            <div className="relative">
              {hero?.image_url && (
                <img
                  src={hero.image_url}
                  alt={hero.title ?? ""}
                  width={1600}
                  height={700}
                  className="rounded-3xl glow-violet w-full h-auto object-cover"
                />
              )}
            </div>
          </div>
          {heroes.length > 1 && (
            <div className="flex justify-center pb-6 gap-2">
              {heroes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHi(i)}
                  className={`h-2 rounded-full transition-all ${i === hi ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40"}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-2xl md:text-3xl font-bold">Browse by track</h2>
          <Link to="/products" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent>
            {cats.map((c) => (
              <CarouselItem key={c.id} className="basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                <Link to="/categories/$slug" params={{ slug: c.slug }}>
                  <div className="card-elevated rounded-2xl overflow-hidden group transition-all hover:-translate-y-1 hover:glow-primary">
                    <div className="aspect-square overflow-hidden bg-muted">
                      {c.image_url && (
                        <img src={c.image_url} alt={c.name} loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      )}
                    </div>
                    <div className="p-3 text-center font-medium">{c.name}</div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>

      {/* FEATURED */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-2xl md:text-3xl font-bold">
            <span className="gradient-text">Featured</span> bestsellers
          </h2>
          <Link to="/products" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* PROMO BANNERS */}
      {promos.length > 0 && (
        <section className="container mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
          {promos.slice(0, 2).map((b) => (
            <Link key={b.id} to={(b.cta_link as any) ?? "/products"} className="relative rounded-3xl overflow-hidden group h-56 card-elevated">
              {b.image_url && (
                <img src={b.image_url} alt={b.title ?? ""} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />
              )}
              <div className="relative z-10 h-full p-6 flex flex-col justify-end bg-gradient-to-t from-background/95 to-transparent">
                <h3 className="font-display text-2xl font-bold mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{b.subtitle}</p>
                <span className="text-primary font-medium text-sm">{b.cta_label} →</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* ALL PRODUCTS */}
      <section className="container mx-auto px-4 py-14">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">All courses & labs</h2>
        <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {all.slice(0, shown).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {shown < all.length && (
          <div className="flex justify-center mt-8">
            <Button onClick={() => setShown((s) => s + 8)} variant="outline" size="lg">Load more</Button>
          </div>
        )}
      </section>

      {/* REVIEWS */}
      <section className="container mx-auto px-4 py-14">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-8 text-center">Loved by <span className="gradient-text">50,000+</span> learners</h2>
        <Carousel opts={{ align: "start", loop: true }}>
          <CarouselContent>
            {reviews.map((r) => (
              <CarouselItem key={r.id} className="basis-full md:basis-1/2 lg:basis-1/3">
                <div className="card-elevated rounded-2xl p-6 h-full">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}
                  </div>
                  <p className="text-sm mb-4">"{r.body}"</p>
                  <div className="text-sm font-semibold">{r.reviewer_name}</div>
                  <div className="text-xs text-muted-foreground">{r.reviewer_role}</div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>

      {/* OTHERS VS US */}
      <section className="container mx-auto px-4 py-14">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-8 text-center">Why AviEdTech?</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="card-elevated rounded-2xl p-6">
            <div className="font-display text-lg font-semibold mb-4 text-muted-foreground">Others</div>
            {["Recorded videos only", "Outdated material", "No real practice", "Generic certificate", "Limited access"].map((t) => (
              <div key={t} className="flex gap-2 py-1.5 text-sm text-muted-foreground"><X className="h-4 w-4 text-destructive shrink-0" /> {t}</div>
            ))}
          </div>
          <div className="card-elevated rounded-2xl p-6 glow-primary border-primary/40">
            <div className="font-display text-lg font-semibold mb-4 gradient-text">AviEdTech</div>
            {["Recorded courses + live labs", "Updated every quarter", "40+ real hands-on environments", "Industry-recognized certificates", "Lifetime access, every update free"].map((t) => (
              <div key={t} className="flex gap-2 py-1.5 text-sm"><Check className="h-4 w-4 text-primary shrink-0" /> {t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="container mx-auto px-4 py-14">
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { i: Shield, t: "Secure checkout", d: "All payments protected" },
            { i: Headphones, t: "24/7 support", d: "We're always here" },
            { i: Award, t: "Verified instructors", d: "Industry pros only" },
            { i: Zap, t: "Instant access", d: "Start learning today" },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="card-elevated rounded-2xl p-5 flex gap-3 items-start">
              <div className="h-10 w-10 rounded-lg gradient-primary-bg flex items-center justify-center text-primary-foreground"><I className="h-5 w-5" /></div>
              <div>
                <div className="font-semibold">{t}</div>
                <div className="text-xs text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="container mx-auto px-4 pb-20">
        <div className="rounded-3xl gradient-primary-bg p-8 md:p-12 text-primary-foreground text-center glow-primary">
          <RefreshCw className="h-10 w-10 mx-auto mb-3" />
          <h3 className="font-display text-2xl md:text-3xl font-bold mb-2">30-day money-back guarantee</h3>
          <p className="opacity-90 max-w-xl mx-auto">If it's not for you, get a full refund within 30 days. No questions asked.</p>
        </div>
      </section>
    </div>
  );
}
