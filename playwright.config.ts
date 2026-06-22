import { defineConfig } from "@playwright/test";

// Smoke tests. Enable in CI after `bun add -d @playwright/test`
// and `bunx playwright install chromium`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
});