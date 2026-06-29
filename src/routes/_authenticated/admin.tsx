import { createFileRoute, Link, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/stores/auth";
import { LayoutDashboard, ShoppingBag, AlertCircle, BarChart3, Package, FolderTree, Users, Settings, MessageSquare, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminLayout });

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/incomplete", label: "Incomplete Orders", icon: AlertCircle },
  { to: "/admin/analytics", label: "Recovery Analytics", icon: BarChart3 },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/chat", label: "Live Chat", icon: MessageSquare },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const load = () => {
      supabase.from("chat_sessions").select("unread_admin").then(({ data }) => {
        setUnread((data ?? []).reduce((s, r: any) => s + (r.unread_admin || 0), 0));
      });
    };
    load();
    const ch = supabase
      .channel("admin-chat-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-border bg-card/40 p-4 flex flex-col gap-1">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="gradient-primary-bg h-9 w-9 rounded-lg flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold">Avi<span className="gradient-text">EdTech</span></div>
            <div className="text-xs text-muted-foreground">Admin</div>
          </div>
        </Link>
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          const showBadge = n.to === "/admin/chat" && unread > 0;
          return (
            <Link
              key={n.to}
              to={n.to as any}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium relative ${active ? "gradient-primary-bg text-primary-foreground" : "hover:bg-muted"}`}
            >
              <n.icon className="h-4 w-4" /> {n.label}
              {showBadge && <span className="ml-auto bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold h-5 min-w-5 px-1.5 flex items-center justify-center">{unread}</span>}
            </Link>
          );
        })}
        <div className="mt-auto pt-4 border-t border-border">
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary">← Back to store</Link>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
