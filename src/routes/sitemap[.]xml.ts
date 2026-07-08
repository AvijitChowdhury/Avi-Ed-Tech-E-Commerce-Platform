import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://avi-ed-tech.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const sb = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const [{ data: products }, { data: cats }] = await Promise.all([
          sb.from("products").select("slug, updated_at").eq("active", true),
          sb.from("categories").select("slug"),
        ]);
        const paths = [
          "/",
          "/products",
          "/cart",
          "/checkout",
          "/track",
          "/auth",
          ...(cats ?? []).map((c) => `/categories/${c.slug}`),
          ...(products ?? []).map((p) => `/products/${p.slug}`),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${BASE_URL}${p}</loc></url>`).join("\n")}
</urlset>`;
        return new Response(xml, {
          headers: {
            "content-type": "application/xml",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
