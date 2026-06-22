import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      // Focus coverage on hand-written app code under src/lib (server fns + helpers).
      // Coverage is scoped to pure-logic units (no `.functions.ts` server
      // entrypoints — those need integration harnesses and are covered by
      // dedicated handler tests under tests/*.functions.test.ts).
      include: [
        "src/lib/access-policy.ts",
        "src/lib/billing.ts",
        "src/lib/booking-shift.ts",
        "src/lib/cancel-policy.ts",
        "src/lib/csv-parse.ts",
        "src/lib/csv.ts",
        "src/lib/error-capture.ts",
        "src/lib/error-page.ts",
        "src/lib/format.ts",
        "src/lib/layout.ts",
        "src/lib/logger.ts",
        "src/lib/modules.ts",
        "src/lib/otp-helpers.ts",
        "src/lib/push-vapid.ts",
        "src/lib/rate-limit.ts",
        "src/lib/recurring.ts",
        "src/lib/reports-aggregate.ts",
        "src/lib/require-admin.ts",
        "src/lib/retry-policy.ts",
        "src/lib/stripe-verify.ts",
        "src/lib/theme.ts",
        "src/lib/utils.ts",
        "src/lib/whatsapp.ts",
        "src/lib/images.ts",
        "src/lib/storage.ts",
      ],
      thresholds: { lines: 60, statements: 60, functions: 55, branches: 65 },
    },
  },
});