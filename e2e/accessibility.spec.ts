import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAsOwner } from "./helpers/auth";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const authenticatedRoutes = [
  "/",
  "/campaigns",
  "/audiences",
  "/growth",
  "/forms",
  "/automations",
  "/media",
  "/commerce",
  "/validation",
  "/collaboration",
  "/integrations",
  "/templates",
  "/visual-studio",
  "/reports",
  "/infrastructure",
  "/data-layer",
];

async function getBlockingAccessibilitySummary(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const blocking = results.violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical"
  );
  const summary = blocking
    .map(({ id, impact, help, nodes }) => {
      const targets = nodes
        .map(({ target, html, any }) => {
          const data = any.map((check) => check.data).filter(Boolean);
          return `  - ${target.join(" > ")}\n    ${html}\n    ${JSON.stringify(data)}`;
        })
        .join("\n");
      return `${page.url()}\n${impact}: ${id} - ${help} (${nodes.length} nodes)\n${targets}`;
    })
    .join("\n");

  return summary || null;
}

test.describe("Accessibility and responsive smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("login form exposes names, landmarks and keyboard order", async ({ page }) => {
    await page.goto("/login");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();

    await expect(page.getByRole("heading", { level: 1, name: "Welcome to SIGNAL" })).toBeVisible();
    await expect(page.getByRole("form", { name: "Email sign in" })).toBeVisible();
    await expect(page.getByLabel("Corporate domain")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.getByLabel("Corporate domain").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Continue" })).toBeFocused();
  });

  test("authenticated dashboard has no viewport-level horizontal overflow", async ({ page }) => {
    await loginAsOwner(page);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });

  test("login has no serious or critical automated WCAG violations", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("form", { name: "Email sign in" })).toBeVisible();
    const summary = await getBlockingAccessibilitySummary(page);
    expect(summary, summary || "No serious or critical WCAG violations").toBeNull();
  });

  test("public landing is accessible and has no viewport-level overflow", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Campaigns, audiences and automations/i })
    ).toBeVisible();
    await expect(page.getByRole("form", { name: "Email sign in" })).toBeHidden();
    await expect(page.getByText(/ALLPLAN/i)).toHaveCount(0);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    const summary = await getBlockingAccessibilitySummary(page);
    expect(summary, summary || "No serious or critical landing-page violations").toBeNull();
  });

  test("critical authenticated routes have no serious or critical automated WCAG violations", async ({
    page,
  }) => {
    await loginAsOwner(page);
    const failures: string[] = [];

    for (const path of authenticatedRoutes) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Notifications", exact: true }),
        `Authenticated shell missing at ${path}`
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("form", { name: "Email sign in" })).toBeHidden();
      await expect(page.getByText("Loading workspace", { exact: true })).toBeHidden();
      await expect(page.locator("#main-content > div > div").first()).toHaveCSS("opacity", "1", {
        timeout: 10000,
      });
      const summary = await getBlockingAccessibilitySummary(page);
      if (summary) failures.push(summary);
    }

    expect(failures.length, failures.join("\n\n") || "No serious or critical WCAG violations").toBe(
      0
    );
  });

  test("critical authenticated routes remain accessible in dark theme", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("signal-theme", "dark"));
    await loginAsOwner(page);
    const failures: string[] = [];

    for (const path of authenticatedRoutes) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator("#main-content > div > div").first()).toHaveCSS("opacity", "1", {
        timeout: 10000,
      });
      const summary = await getBlockingAccessibilitySummary(page);
      if (summary) failures.push(summary);
    }

    expect(
      failures.length,
      failures.join("\n\n") || "No serious or critical dark-theme WCAG violations"
    ).toBe(0);
  });

  test("desktop primary navigation remains visible", async ({ page }) => {
    test.skip((page.viewportSize()?.width || 0) < 1024, "Desktop navigation assertion");
    await loginAsOwner(page);
    const navigation = page.locator('aside[aria-label="Primary navigation"]');
    await expect(navigation).toBeVisible();
    const box = await navigation.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box?.width).toBeGreaterThanOrEqual(250);
  });

  test("infrastructure remains accessible in light and dark themes", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto("/infrastructure");
    await expect(page.getByText("OIDC / SAML acceptance pending")).toBeVisible();

    const darkModeButton = page.getByTitle("Switch to Dark Mode");
    if (await darkModeButton.isVisible()) await darkModeButton.click();
    await expect(page.getByTitle("Switch to Light Mode")).toBeVisible();
    const darkSummary = await getBlockingAccessibilitySummary(page);
    expect(
      darkSummary,
      darkSummary || "Dark theme has no serious or critical WCAG violations"
    ).toBeNull();

    await page.getByTitle("Switch to Light Mode").click();
    await expect(page.getByTitle("Switch to Dark Mode")).toBeVisible();
    const lightSummary = await getBlockingAccessibilitySummary(page);
    expect(
      lightSummary,
      lightSummary || "Light theme has no serious or critical WCAG violations"
    ).toBeNull();
  });

  test("invalid preference links announce the failure", async ({ page }) => {
    await page.goto("/preferences/invalid-accessibility-token");
    await expect(page.getByRole("alert")).toContainText("Access Denied");
  });
});
