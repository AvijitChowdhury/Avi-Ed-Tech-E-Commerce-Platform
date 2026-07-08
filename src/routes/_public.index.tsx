import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { type ProductLike } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import {
  ArrowRight, Shield, Award, Headphones, RefreshCw, Check, X, Sparkles, Zap, Trophy, Users, Star,
  GraduationCap, Code2, Briefcase,
} from "lucide-react";

export const Route = createFileRoute("/_public/")({
  component: HomePage,
  head: () => ({
    meta: [
      { property: "og:url", content: "https://avi-ed-tech.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://avi-ed-tech.lovable.app/" }],
  }),
});


type Banner = { id: string; type: string; title: string | null; subtitle: string | null; cta_label: string | null; cta_link: string | null; image_url: string | null; badge: string | null };
type Category = { id: string; slug: string; name: string; image_url: string | null };
type Review = { id: string; reviewer_name: string; reviewer_role: string | null; rating: number; body: string };

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

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
    const t = setInterval(() => setHi((i) => (i + 1) % heroes.length), 6500);
    return () => clearInterval(t);
  }, [heroes.length]);

  const hero = heroes[hi];

  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="relative">
        <div className="gradient-hero-bg relative">
          {/* Decorative orbs */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-orbit-glow" />
            <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-3xl animate-orbit-glow" style={{ animationDelay: "1.5s" }} />
          </div>

          <div className="container mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center min-h-[600px] relative">
            <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-7">
              {hero?.badge && (
                <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full card-glass text-xs font-medium tracking-wide uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {hero.badge}
                </motion.span>
              )}
              <motion.h1 variants={fadeUp} className="font-display text-5xl md:text-7xl font-bold leading-[1.02] text-balance">
                {hero?.title ? (
                  <>{hero.title.split(" ").slice(0, -2).join(" ")} <span className="gradient-text">{hero.title.split(" ").slice(-2).join(" ")}</span></>
                ) : (
                  <>Level up your <span className="gradient-text">tech career</span></>
                )}
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                {hero?.subtitle ?? "Recorded courses and hands-on labs taught by industry experts. Real outcomes, not just videos."}
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 pt-2">
                <Link to={(hero?.cta_link as any) ?? "/products"}>
                  <Button size="lg" className="gradient-primary-bg text-primary-foreground glow-primary px-7 h-12 text-base font-semibold hover:scale-[1.02] transition-transform">
                    {hero?.cta_label ?? "Browse courses"} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/track">
                  <Button size="lg" variant="outline" className="h-12 px-7 text-base border-border/80 hover:bg-card/60">Track order</Button>
                </Link>
              </motion.div>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-x-7 gap-y-3 pt-6 text-sm text-muted-foreground border-t border-border/40">
                <div className="flex items-center gap-2 pt-4"><Users className="h-4 w-4 text-primary" /> <span><span className="text-foreground font-semibold">50K+</span> learners</span></div>
                <div className="flex items-center gap-2 pt-4"><Star className="h-4 w-4 fill-warning text-warning" /> <span><span className="text-foreground font-semibold">4.9</span> avg rating</span></div>
                <div className="flex items-center gap-2 pt-4"><Trophy className="h-4 w-4 text-accent" /> <span>Industry experts</span></div>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="relative">
              {hero?.image_url && (
                <div className="relative animate-float">
                  <div className="absolute -inset-4 gradient-primary-bg opacity-30 blur-3xl rounded-[2.5rem]" />
                  <img
                    src={hero.image_url}
                    alt={hero.title ?? ""}
                    width={1600}
                    height={900}
                    className="relative rounded-[2rem] shadow-elegant w-full h-auto object-cover border border-border/60"
                  />
                  {/* Floating accents */}
                  <div className="absolute -top-4 -right-4 card-glass rounded-2xl px-4 py-3 flex items-center gap-2 shadow-soft">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs font-medium">Live cohort open</span>
                  </div>
                  <div className="absolute -bottom-5 -left-5 card-glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-soft">
                    <div className="h-9 w-9 rounded-xl gradient-primary-bg flex items-center justify-center"><Trophy className="h-4 w-4 text-primary-foreground" /></div>
                    <div>
                      <div className="text-xs text-muted-foreground">Avg salary lift</div>
                      <div className="text-sm font-bold">+42%</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {heroes.length > 1 && (
            <div className="flex justify-center pb-8 gap-2 relative">
              {heroes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHi(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === hi ? "w-10 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* LOGO STRIP / TRUST */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span className="font-medium">Trusted by engineers at</span>
          {["Google", "Meta", "Amazon", "Microsoft", "Stripe", "Netflix"].map((b) => (
            <span key={b} className="font-display font-semibold text-foreground/70 hover:text-foreground transition-colors">{b}</span>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="container mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Explore</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Browse by <span className="gradient-text">track</span></h2>
          </div>
          <Link to="/products" className="text-sm text-primary hover:text-primary-glow transition-colors font-medium group">
            View all <ArrowRight className="inline h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent className="-ml-3">
            {cats.map((c, idx) => (
              <CarouselItem key={c.id} className="pl-3 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                <Link to="/categories/$slug" params={{ slug: c.slug }}>
                  <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="card-elevated rounded-2xl overflow-hidden group">
                    <div className="aspect-square overflow-hidden bg-muted relative">
                      {c.image_url && (
                        <img src={c.image_url} alt={c.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="font-display font-semibold text-base">{c.name}</div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </motion.section>

      {/* FEATURED */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="container mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Bestsellers</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Featured <span className="gradient-text-accent">programs</span>
            </h2>
          </div>
          <Link to="/products" className="text-sm text-primary hover:text-primary-glow transition-colors font-medium group">
            View all <ArrowRight className="inline h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <motion.div key={p.id} variants={fadeUp}><ProductCard p={p} /></motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* PROMO BANNERS */}
      {promos.length > 0 && (
        <section className="container mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
          {promos.slice(0, 2).map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}>
              <Link to={(b.cta_link as any) ?? "/products"} className="relative rounded-3xl overflow-hidden group h-64 card-elevated block">
                {b.image_url && (
                  <img src={b.image_url} alt={b.title ?? ""} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" />
                )}
                <div className="relative z-10 h-full p-7 flex flex-col justify-end bg-gradient-to-t from-background via-background/70 to-transparent">
                  <h3 className="font-display text-2xl md:text-3xl font-bold mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 max-w-md">{b.subtitle}</p>
                  <span className="text-primary font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                    {b.cta_label} <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </section>
      )}

      {/* ALL PRODUCTS */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="container mx-auto px-4 py-20">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">The catalog</div>
          <h2 className="font-display text-3xl md:text-4xl font-bold">All courses &amp; labs</h2>
        </div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {all.slice(0, shown).map((p) => (
            <motion.div key={p.id} variants={fadeUp}><ProductCard p={p} /></motion.div>
          ))}
        </motion.div>
        {shown < all.length && (
          <div className="flex justify-center mt-10">
            <Button onClick={() => setShown((s) => s + 8)} variant="outline" size="lg" className="h-11 px-8 border-border/80">
              Load more
            </Button>
          </div>
        )}
      </motion.section>

      {/* BENTO: WHY US */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Why AviEdTech</div>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-balance">
            Engineered for <span className="gradient-text">real outcomes</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">Not another course library. A career operating system.</p>
        </div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {/* Big tile */}
          <motion.div variants={fadeUp} className="md:col-span-2 lg:col-span-2 lg:row-span-2 card-elevated rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 gradient-mesh-bg opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl gradient-primary-bg flex items-center justify-center mb-6 glow-primary">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">Recorded courses + live labs</h3>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-md">
                Watch at your pace, then practice on 40+ real cloud environments. No simulators. Real infra, real bugs, real shipping.
              </p>
              <div className="flex flex-wrap gap-2">
                {["AWS", "Kubernetes", "Postgres", "Terraform", "Next.js"].map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-card/60 border border-border text-xs font-medium">{t}</span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="card-elevated rounded-3xl p-6 hover-lift hover:-translate-y-1">
            <div className="h-12 w-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center mb-4"><Code2 className="h-6 w-6" /></div>
            <h3 className="font-display text-lg font-bold mb-2">Updated quarterly</h3>
            <p className="text-sm text-muted-foreground">Every course refreshed with current tooling — never stale.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="card-elevated rounded-3xl p-6 hover-lift hover:-translate-y-1">
            <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4"><Briefcase className="h-6 w-6" /></div>
            <h3 className="font-display text-lg font-bold mb-2">Career outcomes</h3>
            <p className="text-sm text-muted-foreground">Industry-recognized certificates and referrals to hiring partners.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="md:col-span-2 lg:col-span-2 card-elevated rounded-3xl p-7 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-accent/10 rounded-full blur-3xl" />
            <div className="flex items-start gap-5">
              <div className="h-12 w-12 shrink-0 rounded-xl gradient-accent-bg flex items-center justify-center"><Trophy className="h-6 w-6 text-accent-foreground" /></div>
              <div>
                <h3 className="font-display text-xl font-bold mb-2">Lifetime access, every update free</h3>
                <p className="text-sm text-muted-foreground">One purchase, forever. No subscriptions, no expiring access — own your education.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="container mx-auto px-4 py-20">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Testimonials</div>
            <h2 className="font-display text-3xl md:text-5xl font-bold">
              Loved by <span className="gradient-text">50,000+</span> learners
            </h2>
          </div>
          <Carousel opts={{ align: "start", loop: true }}>
            <CarouselContent className="-ml-4">
              {reviews.map((r) => (
                <CarouselItem key={r.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                  <div className="card-elevated rounded-3xl p-7 h-full hover-lift hover:-translate-y-1 flex flex-col">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}
                    </div>
                    <p className="text-[15px] leading-relaxed mb-6 flex-1">"{r.body}"</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                      <div className="h-10 w-10 rounded-full gradient-primary-bg flex items-center justify-center font-display font-bold text-primary-foreground">
                        {r.reviewer_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{r.reviewer_name}</div>
                        <div className="text-xs text-muted-foreground">{r.reviewer_role}</div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </motion.section>
      )}

      {/* COMPARE */}
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="container mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">The difference</div>
          <h2 className="font-display text-3xl md:text-5xl font-bold">Others vs <span className="gradient-text">AviEdTech</span></h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="card-elevated rounded-3xl p-7 opacity-70">
            <div className="font-display text-lg font-semibold mb-5 text-muted-foreground">Others</div>
            <div className="space-y-3">
              {["Recorded videos only", "Outdated material", "No real practice", "Generic certificate", "Limited access"].map((t) => (
                <div key={t} className="flex items-center gap-3 text-sm text-muted-foreground"><X className="h-4 w-4 text-destructive shrink-0" /> {t}</div>
              ))}
            </div>
          </div>
          <div className="card-elevated rounded-3xl p-7 border-primary/40 glow-primary relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="font-display text-lg font-semibold mb-5 gradient-text">AviEdTech</div>
              <div className="space-y-3">
                {["Recorded courses + live labs", "Updated every quarter", "40+ real hands-on environments", "Industry-recognized certificates", "Lifetime access, every update free"].map((t) => (
                  <div key={t} className="flex items-center gap-3 text-sm font-medium"><Check className="h-4 w-4 text-success shrink-0" /> {t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* TRUST STRIP */}
      <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="container mx-auto px-4 py-14">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { i: Shield, t: "Secure checkout", d: "All payments protected" },
            { i: Headphones, t: "24/7 support", d: "We're always here" },
            { i: Award, t: "Verified instructors", d: "Industry pros only" },
            { i: Zap, t: "Instant access", d: "Start learning today" },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="card-elevated rounded-2xl p-5 flex gap-4 items-start hover-lift hover:-translate-y-0.5">
              <div className="h-11 w-11 shrink-0 rounded-xl gradient-primary-bg flex items-center justify-center text-primary-foreground"><I className="h-5 w-5" /></div>
              <div>
                <div className="font-semibold">{t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* GUARANTEE / CTA */}
      <motion.section initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="container mx-auto px-4 pb-24">
        <div className="rounded-[2rem] gradient-primary-bg p-10 md:p-16 text-primary-foreground text-center glow-primary relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-accent/40 blur-3xl" />
          </div>
          <div className="relative">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur mb-4">
              <RefreshCw className="h-7 w-7" />
            </div>
            <h3 className="font-display text-3xl md:text-5xl font-bold mb-3 text-balance">30-day money-back guarantee</h3>
            <p className="opacity-90 max-w-xl mx-auto text-lg">If it's not for you, get a full refund within 30 days. No questions asked.</p>
            <Link to="/products" className="inline-block mt-7">
              <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold bg-background text-foreground hover:bg-background/90">
                Start learning <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
