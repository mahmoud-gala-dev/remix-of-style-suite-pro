import { test, expect } from "@playwright/test";

// P16 — extended scenarios. Auth-gated tests skip when no session is provided
// (CI sets LOVABLE_BROWSER_SUPABASE_SESSION_JSON + STORAGE_KEY locally).
const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const haveSession = Boolean(session && storageKey);

async function seedSession(page: import("@playwright/test").Page, baseURL: string) {
  await page.goto(baseURL);
  await page.evaluate(([k, v]) => window.localStorage.setItem(k!, v!), [storageKey!, session!]);
}

test.describe("RBAC", () => {
  test("unauthenticated /tenants redirects to /auth", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/tenants`);
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("Authenticated flows", () => {
  test.skip(!haveSession, "no session env vars");

  test("calendar loads", async ({ page, baseURL }) => {
    await seedSession(page, baseURL!);
    await page.goto(`${baseURL}/calendar`);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("invoices page loads", async ({ page, baseURL }) => {
    await seedSession(page, baseURL!);
    await page.goto(`${baseURL}/invoices`);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("2FA settings reachable", async ({ page, baseURL }) => {
    await seedSession(page, baseURL!);
    await page.goto(`${baseURL}/settings`);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("bookings page loads", async ({ page, baseURL }) => {
    await seedSession(page, baseURL!);
    await page.goto(`${baseURL}/bookings`);
    await expect(page.getByRole("main")).toBeVisible();
  });
});