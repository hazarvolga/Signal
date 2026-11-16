import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers/auth";
test.describe("Campaign Lifecycle", () => {
  test("create and save campaign as draft", async ({ page }) => {
    await loginAsOwner(page);

    // 2. Go to campaigns and create
    await page.goto("/campaigns");

    // Open the creation form
    await page.click('button:has-text("Create Campaign")');

    const campaignTitle = `E2E Test Campaign ${Date.now()}`;
    // Fill out the campaign draft
    await page.fill('input[placeholder="e.g. Weekly Digest Vol. 42"]', campaignTitle);
    await page.fill('input[placeholder="The headline of your broadcast"]', "E2E Test Subject");
    await page.locator(".ql-editor").fill("Hello, this is an automated E2E test email!");

    // Save as draft
    await page.click('button:has-text("Save Dispatch Draft")');

    // Wait for the creation form to close and the list to update
    await expect(page.locator(`h3:has-text("${campaignTitle}")`)).toBeVisible({ timeout: 5000 });

    // Verify that the status is DRAFT
    const row = page.locator(".grid", { hasText: campaignTitle }).first();
    await expect(row).toContainText(/DRAFT/i);
  });
});
