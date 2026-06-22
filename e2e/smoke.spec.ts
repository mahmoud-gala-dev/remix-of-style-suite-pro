import { test, expect } from "@playwright/test";

test("home renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});

test("auth page reachable", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("body")).toBeVisible();
});

test("public booking page reachable", async ({ page }) => {
  await page.goto("/book");
  await expect(page.locator("body")).toBeVisible();
});