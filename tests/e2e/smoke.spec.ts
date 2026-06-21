import { test, expect } from "@playwright/test";

// Public-route smoke: app renders and /auth is reachable.
test("home renders and auth route exists", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
  await page.goto("/auth");
  await expect(page.locator("body")).toBeVisible();
});