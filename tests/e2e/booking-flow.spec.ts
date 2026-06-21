import { test, expect } from "@playwright/test";

/**
 * Critical-path smoke. Full booking→invoice→payment requires an authed
 * session — extend with LOVABLE_BROWSER_SUPABASE_SESSION_JSON injection
 * when wiring CI.
 */
test("public landing renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});

test("protected route redirects to /auth", async ({ page }) => {
  await page.goto("/bookings");
  await page.waitForURL(/\/auth/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/auth/);
});

test("auth page renders sign-in heading", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading").first()).toBeVisible();
});