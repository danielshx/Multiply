import { test, expect } from "@playwright/test";

/**
 * Smoke: dashboard renders. Expand before pitch into the full demo path.
 */
test("dashboard renders", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator("text=Pipeline Value")).toBeVisible();
});
