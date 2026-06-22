# CI / CD

## GitHub Actions
`.github/workflows/ci.yml` builds the app on every push/PR.
Required secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## E2E tests (Playwright)
```bash
bun add -d @playwright/test
bunx playwright install --with-deps chromium
bunx playwright test
```
Then flip `if: ${{ false }}` → `if: true` in the `e2e` job.

## Bundle analysis
```bash
bun add -d rollup-plugin-visualizer
ANALYZE=1 bun run build  # opens stats.html
```

## Accessibility audit (dev)
```bash
bun add -d @axe-core/react
```
Imported lazily in `src/router.tsx` when `import.meta.env.DEV`.

## Deployment
Production deploys via Lovable. CI is build-verification only.