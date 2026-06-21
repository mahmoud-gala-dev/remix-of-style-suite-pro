# E2E tests

```bash
bun add -D @playwright/test
bunx playwright install chromium
E2E_EMAIL=staff@example.com E2E_PASSWORD=... bunx playwright test
```

- `smoke.spec.ts` — public routes render.
- `flow.spec.ts` — full login → bookings → queue → reports (needs seeded staff).