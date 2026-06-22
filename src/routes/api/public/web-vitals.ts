import { createFileRoute } from "@tanstack/react-router";
import { rateLimitByIp } from "@/lib/rate-limit";

// P49 — Public ingestion endpoint for browser Core Web Vitals beacons.
// Mirrors /api/public/client-errors: tight rate-limit, no PII, structured log.
// Aggregation can be added later (e.g. roll up by p75/route).
export const Route = createFileRoute("/api/public/web-vitals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await rateLimitByIp(request, "web-vitals", { capacity: 60, refillPerMin: 60 });
        } catch (e) {
          if (e instanceof Response) return e;
        }
        try {
          const body = (await request.json()) as {
            kind?: string;
            name?: string;
            value?: number;
            route?: string;
            rating?: string;
            id?: string;
          };
          const safe = {
            name: String(body.name ?? "").slice(0, 20),
            value: Number.isFinite(body.value) ? Number(body.value) : null,
            route: String(body.route ?? "").slice(0, 200),
            rating: String(body.rating ?? "").slice(0, 16),
            id: String(body.id ?? "").slice(0, 64),
            ip:
              request.headers.get("cf-connecting-ip") ??
              request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
              "unknown",
            at: new Date().toISOString(),
          };
          console.log("[web-vital]", JSON.stringify(safe));
          return Response.json({ ok: true });
        } catch {
          return new Response("bad request", { status: 400 });
        }
      },
    },
  },
});