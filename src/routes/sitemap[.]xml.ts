import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const sb = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const [{ data: products }, { data: cats }] = await Promise.all([
          sb.from("products").select("slug, updated_at").eq("active", true),
          sb.from("categories").select("slug"),
        ]);
        const base = "";
        const urls = [
          "/", "/products", "/track", "/auth",
          ...(cats ?? []).map((c) => `/categories/${c.slug}`),
          ...(products ?? []).map((p) => `/products/${p.slug}`),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${base}${u}</loc></url>`).join("\n")}
</urlset>`;
        return new Response(xml, { headers: { "content-type": "application/xml" } });
      },
    },
  },
});
