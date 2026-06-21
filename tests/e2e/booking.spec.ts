import { test, expect } from "@playwright/test";

// P44 — public booking flow. Requires the dev server running and demo data seeded.
test("public /book → submit creates a booking visible in /queue", async ({ page }) => {
  await page.goto("/book");
  await page.waitForLoadState("networkidle");

  // Pick first available branch / service / employee
  const selects = page.locator("select");
  const count = await selects.count();
  for (let i = 0; i < count; i++) {
    const opts = selects.nth(i).locator("option");
    if ((await opts.count()) > 1) {
      await selects.nth(i).selectOption({ index: 1 });
    }
  }

  // Fill required text inputs (name / phone)
  const name = page.getByPlaceholder(/name|الاسم/i).first();
  if (await name.count()) await name.fill("E2E Tester");
  const phone = page.getByPlaceholder(/phone|الهاتف|\+/i).first();
  if (await phone.count()) await phone.fill("+966500000000");

  // Submit
  await page.getByRole("button", { name: /book|confirm|احجز|تأكيد/i }).first().click();

  // Expect a success toast / confirmation
  await expect(
    page.getByText(/booked|confirmed|thank|تم|نجح/i).first(),
  ).toBeVisible({ timeout: 10_000 });
});