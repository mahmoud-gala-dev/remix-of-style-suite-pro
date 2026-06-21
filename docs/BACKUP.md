# Backup & Restore Policy

## What Lovable Cloud / Supabase provides automatically

- **Daily logical backups** — Postgres `pg_dump` taken every 24h, retained 7 days.
- **Point-in-Time Recovery (PITR)** — available on paid Supabase plans (5-min RPO).
- **Storage objects** — replicated across the underlying S3-compatible store.
- **Edge / config** — `supabase/migrations/*` is version-controlled in this repo; re-running migrations rebuilds the schema from scratch.

## What we add on top

- All schema changes go through `supabase/migrations/` — the repo IS the schema source of truth.
- Seed/demo data lives in migrations, never in ad-hoc psql.
- Sensitive secrets (`SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_AUTH_TOKEN`, …) are managed in Lovable Cloud secrets, not committed.

## Manual snapshot before risky changes

Before bulk imports, mass updates, or destructive migrations:

1. Export the affected tables as CSV (Lovable Cloud → Backend → SQL Editor).
2. Tag the current Git commit (`pre-migration-YYYYMMDD`).
3. Run the migration. If it fails, restore the CSV via the SQL Editor and revert the Git tag.

## Restore drill (quarterly)

Run every 3 months to confirm backups actually work:

1. Spin up a throwaway Supabase project.
2. Apply all migrations from `supabase/migrations/` in order.
3. Import the most recent CSV export of `customers`, `bookings`, `invoices`.
4. Run `bunx playwright test tests/e2e/smoke.spec.ts` against the restored env.
5. Document outcome in `docs/restore-drills.md` (date, duration, issues found).

## RPO / RTO targets

| Tier | RPO | RTO |
|---|---|---|
| Small (1 branch) | 24h | 4h |
| Medium (2–10 branches) | 1h (PITR) | 1h |
| Enterprise | 5min (PITR) | 15min |

## Incident response

If you suspect data loss:

1. **Stop writes immediately** — disable the affected route or flip a feature flag.
2. Snapshot the current state (CSV export) before any restore.
3. Restore from the latest clean backup into a side project, diff the data, then copy back only the affected rows.
4. Post-mortem in `docs/incidents/YYYY-MM-DD.md`.