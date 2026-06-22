import { createFileRoute } from "@tanstack/react-router";

// P25 — sitemap for public pages. Origin is derived from the incoming
// request so it works on preview, production, and custom domains without
// editing this file.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const urls = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/book", priority: "0.9", changefreq: "daily" },
          { path: "/auth", priority: "0.3", changefreq: "yearly" },
        ];
        const lastmod = new Date().toISOString().split("T")[0];
        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map(
              (u) =>
                `  <url><loc>${origin}${u.path}</loc><lastmod>${lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
            )
            .join("\n") +
          `\n</urlset>\n`;
        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});