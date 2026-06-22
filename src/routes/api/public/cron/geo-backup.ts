import { createFileRoute } from "@tanstack/react-router";
import { signedS3Fetch } from "@/lib/aws-sigv4";
import { logger } from "@/lib/logger";

// P-C — Geo-backup cron. Daily snapshot of every tenant's core tables to an
// off-region S3 bucket via AWS SigV4 (no SDK, Worker-safe). Run once per day.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return headers.join(",") + "\n" +
    rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
}

const TABLES = [
  "tenants", "branches", "customers", "employees", "services",
  "bookings", "invoices", "payments", "customer_memberships",
] as const;

export const Route = createFileRoute("/api/public/cron/geo-backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Off by default — admin must enable in Settings → Data.
        const { data: flagRow } = await supabaseAdmin
          .from("app_settings")
          .select("value")
          .eq("key", "geo_backup_enabled")
          .maybeSingle();
        if (!flagRow || flagRow.value !== true) {
          return Response.json({ skipped: true, reason: "geo_backup_enabled is off" });
        }

        const region = process.env.BACKUP_S3_REGION;
        const bucket = process.env.BACKUP_S3_BUCKET;
        const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID;
        const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY;
        if (!region || !bucket || !accessKeyId || !secretAccessKey) {
          return Response.json({ skipped: true, reason: "BACKUP_S3_* not configured" });
        }

        const stamp = new Date().toISOString().slice(0, 10);
        const uploaded: Record<string, number> = {};
        const errors: string[] = [];

        for (const table of TABLES) {
          try {
            const { data, error } = await supabaseAdmin.from(table).select("*");
            if (error) { errors.push(`${table}: ${error.message}`); continue; }
            const csv = toCsv((data ?? []) as Array<Record<string, unknown>>);
            const body = new TextEncoder().encode(csv);
            const key = `backups/${stamp}/${table}.csv`;
            const res = await signedS3Fetch({
              method: "PUT",
              region, bucket, key, body,
              accessKeyId, secretAccessKey,
              extraHeaders: { "content-type": "text/csv" },
            });
            if (!res.ok) {
              errors.push(`${table}: s3 ${res.status} ${await res.text()}`);
            } else {
              uploaded[table] = data?.length ?? 0;
            }
          } catch (e) {
            errors.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        logger.info("geo-backup complete", { stamp, uploaded, errors });
        return Response.json({ stamp, uploaded, errors });
      },
    },
  },
});