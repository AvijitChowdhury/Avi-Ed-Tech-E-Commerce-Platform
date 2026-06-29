import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: { id: string; email: string | null } | null;
  isAdmin: boolean;
  loading: boolean;
};

const Ctx = createContext<AuthState>({ user: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAdmin: false, loading: true });

  useEffect(() => {
    let mounted = true;
    const load = async (uid: string | null, email: string | null) => {
      if (!uid) {
        if (mounted) setState({ user: null, isAdmin: false, loading: false });
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const isAdmin = !!data?.some((r) => r.role === "admin");
      if (mounted) setState({ user: { id: uid, email }, isAdmin, loading: false });
    };
    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null, data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load(session?.user?.id ?? null, session?.user?.email ?? null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
