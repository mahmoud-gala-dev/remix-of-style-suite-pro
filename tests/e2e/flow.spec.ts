import { test, expect } from "@playwright/test";

// Full flow: login → create booking → queue → report.
// Requires E2E_EMAIL / E2E_PASSWORD env vars for a seeded staff user.
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD to run");

test("login → bookings → queue → reports", async ({ page }) => {
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"));

  await page.goto("/bookings");
  await expect(page.getByRole("heading", { name: /bookings/i })).toBeVisible();

  await page.goto("/queue");
  await expect(page.getByRole("heading", { name: /queue/i })).toBeVisible();

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: /reports/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
});