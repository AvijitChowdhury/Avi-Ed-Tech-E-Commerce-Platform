import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AnnouncementTicker from "@/components/layout/AnnouncementTicker";
import { LayoutDashboard, Package, Heart, MapPin, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({ component: AccountLayout });

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/account/orders", label: "Orders", icon: Package },
  { to: "/account/wishlist", label: "Wishlist", icon: Heart },
  { to: "/account/addresses", label: "Addresses", icon: MapPin },
  { to: "/account/profile", label: "Profile", icon: User },
];

function AccountLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementTicker />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 grid md:grid-cols-[220px_1fr] gap-8">
        <aside className="card-elevated rounded-2xl p-3 h-fit">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as any}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${active ? "gradient-primary-bg text-primary-foreground" : "hover:bg-muted"}`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </aside>
        <div><Outlet /></div>
      </main>
      <Footer />
    </div>
  );
}
