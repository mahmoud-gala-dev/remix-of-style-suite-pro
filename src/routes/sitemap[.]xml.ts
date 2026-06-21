import { createFileRoute } from "@tanstack/react-router";

// TODO: replace with your project URL once a custom domain is set.
const BASE_URL = "";

// P25 — basic sitemap for public pages.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = ["/", "/book", "/auth"];
        const lastmod = new Date().toISOString().split("T")[0];
        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map(
              (u) =>
                `  <url><loc>${BASE_URL}${u}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`,
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