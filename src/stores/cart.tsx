import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CART_KEY } from "@/lib/session";

export type CartLine = {
  product_id: string;
  slug: string;
  title: string;
  price: number;
  image: string | null;
  qty: number;
};

type CartCtx = {
  items: CartLine[];
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  update: (product_id: string, qty: number) => void;
  remove: (product_id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);

function readLocal(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeLocal(items: CartLine[]) {
  if (typeof window !== "undefined") localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // hydrate from localStorage on mount
  useEffect(() => {
    setItems(readLocal());
  }, []);

  // listen to auth + merge guest cart into DB on sign-in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (event === "SIGNED_IN" && uid) {
        const local = readLocal();
        if (local.length) {
          for (const l of local) {
            await supabase.from("cart_items").upsert(
              { user_id: uid, product_id: l.product_id, qty: l.qty },
              { onConflict: "user_id,product_id" },
            );
          }
        }
        // refetch from DB
        const { data: rows } = await supabase
          .from("cart_items")
          .select("qty, product:products(id, slug, title, price, cover_image)")
          .eq("user_id", uid);
        if (rows) {
          const merged: CartLine[] = rows
            .filter((r: any) => r.product)
            .map((r: any) => ({
              product_id: r.product.id,
              slug: r.product.slug,
              title: r.product.title,
              price: Number(r.product.price),
              image: r.product.cover_image,
              qty: r.qty,
            }));
          setItems(merged);
          writeLocal(merged);
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const persist = useCallback(
    async (next: CartLine[]) => {
      setItems(next);
      writeLocal(next);
      if (userId) {
        // simple replace strategy
        await supabase.from("cart_items").delete().eq("user_id", userId);
        if (next.length) {
          await supabase
            .from("cart_items")
            .insert(next.map((l) => ({ user_id: userId, product_id: l.product_id, qty: l.qty })));
        }
      }
    },
    [userId],
  );

  const add: CartCtx["add"] = (line, qty = 1) => {
    const existing = items.find((i) => i.product_id === line.product_id);
    const next = existing
      ? items.map((i) => (i.product_id === line.product_id ? { ...i, qty: i.qty + qty } : i))
      : [...items, { ...line, qty }];
    void persist(next);
  };
  const update: CartCtx["update"] = (pid, qty) => {
    const next = qty <= 0 ? items.filter((i) => i.product_id !== pid) : items.map((i) => (i.product_id === pid ? { ...i, qty } : i));
    void persist(next);
  };
  const remove: CartCtx["remove"] = (pid) => persist(items.filter((i) => i.product_id !== pid));
  const clear = () => persist([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  return <Ctx.Provider value={{ items, add, update, remove, clear, count, subtotal }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
