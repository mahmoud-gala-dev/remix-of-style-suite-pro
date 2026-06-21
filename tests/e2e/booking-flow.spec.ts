import { test, expect } from "@playwright/test";

/**
 * P7 — Critical-path E2E with five scenarios:
 *   1) public landing renders
 *   2) protected route redirects to /auth
 *   3) /auth renders sign-in
 *   4) authed shell loads dashboard (session injection)
 *   5) authed customers route reachable
 *
 * Scenarios 4 & 5 require LOVABLE_BROWSER_SUPABASE_SESSION_JSON +
 * LOVABLE_BROWSER_SUPABASE_STORAGE_KEY to be present in CI.
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

const STORAGE_KEY = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const SESSION_JSON = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const authed = test.extend({});
const skipReason = "Set LOVABLE_BROWSER_SUPABASE_SESSION_JSON + _STORAGE_KEY to run";

authed("authed dashboard loads", async ({ page }) => {
  test.skip(!STORAGE_KEY || !SESSION_JSON, skipReason);
  await page.goto("/auth");
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k as string, v as string),
    [STORAGE_KEY!, SESSION_JSON!],
  );
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/auth/);
  await expect(page.locator("body")).toBeVisible();
});

authed("authed customers route reachable", async ({ page }) => {
  test.skip(!STORAGE_KEY || !SESSION_JSON, skipReason);
  await page.goto("/auth");
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k as string, v as string),
    [STORAGE_KEY!, SESSION_JSON!],
  );
  await page.goto("/customers");
  await expect(page).toHaveURL(/\/customers/);
});