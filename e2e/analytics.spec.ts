import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers/auth";

test.describe("Analytics Dashboard", () => {
  // Use a logged-in session or login first if needed. Assuming login is required.
  test("verify live metrics display correctly", async ({ page }) => {
    await loginAsOwner(page);

    // Navigate to reports
    await page.goto("/reports");

    // Check that Realtime tab metrics labels are present
    const opensLabel = page.getByText("Real-time Opens"); // Depending on translation, might need fallback. Let's look for numbers.
    // Or just look for the active signals or automation cards.
    // In Reports.tsx, we have <p className="metric-label">{t("reports.realtimeOpens")}</p>
    // Assuming English translation:

    await expect(page.locator(".metric-label").first()).toBeVisible();

    // Let's assert that there are 4 metric labels in the grid
    const metricLabels = page.locator(".metric-label");
    await expect(metricLabels).toHaveCount(4);

    // And some large numbers are displayed
    const largeNumbers = page.locator(".text-4xl.font-serif.font-bold");
    try {
      await expect(largeNumbers.first()).toBeVisible({ timeout: 5000 });
    } catch (e) {
      await page.screenshot({ path: "scratch/analytics-failure.png" });
      throw e;
    }
  });
});
