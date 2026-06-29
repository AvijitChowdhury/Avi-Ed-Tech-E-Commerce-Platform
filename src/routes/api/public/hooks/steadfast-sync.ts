import { createFileRoute } from "@tanstack/react-router";
import { runSteadfastSync } from "@/lib/steadfast.functions";

export const Route = createFileRoute("/api/public/hooks/steadfast-sync")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await runSteadfastSync();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: e?.message || "error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
