import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingCart, User, Search, Menu, X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/products", search: { q: q.trim() } as any });
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "bg-background/75 backdrop-blur-2xl border-b border-border/60 shadow-soft"
          : "bg-background/30 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center gap-5 px-4 py-3.5">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="gradient-primary-bg flex h-9 w-9 items-center justify-center rounded-xl glow-primary transition-transform group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Avi<span className="gradient-text">EdTech</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {[
            { to: "/", label: "Home" },
            { to: "/products", label: "Courses" },
            { to: "/products", label: "Labs", search: { type: "lab" } },
            { to: "/track", label: "Track Order" },
          ].map((l, i) => (
            <Link key={i} to={l.to as any} search={l.search as any} className="relative px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors group">
              <span>{l.label}</span>
              <span className="absolute inset-x-3 bottom-1 h-px bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden md:flex relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses & labs..."
            className="pl-9 bg-muted/40"
          />
        </form>

        <div className="flex items-center gap-1 md:ml-2 ml-auto">
          <ThemeToggle />
          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full gradient-primary-bg text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {count}
                </span>
              )}
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/account">My Account</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/account/orders">My Orders</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/account/wishlist">Wishlist</Link></DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link to="/admin">Admin Panel</Link></DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild><Link to="/auth">Sign in</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/auth" search={{ mode: "signup" } as any}>Create account</Link></DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
            <form onSubmit={submitSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="pl-9" />
            </form>
            <Link to="/" onClick={() => setOpen(false)} className="py-1">Home</Link>
            <Link to="/products" onClick={() => setOpen(false)} className="py-1">Courses</Link>
            <Link to="/products" search={{ type: "lab" } as any} onClick={() => setOpen(false)} className="py-1">Labs</Link>
            <Link to="/track" onClick={() => setOpen(false)} className="py-1">Track Order</Link>
          </div>
        </div>
      )}
    </header>
  );
}
