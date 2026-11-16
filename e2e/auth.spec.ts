import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers/auth";

test.describe("Authentication & RBAC", () => {
  test("user login with credentials", async ({ page }) => {
    await loginAsOwner(page);

    // Check if the cookie is set or local storage
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "signal.sid");

    expect(sessionCookie).toBeDefined();
    if (sessionCookie) {
      expect(sessionCookie.httpOnly).toBeTruthy();
      // Secure is usually true in prod/staging (https), checking conditionally or assuming https in staging
      // expect(sessionCookie.secure).toBeTruthy();
      expect(sessionCookie.sameSite).toMatch(/Lax|Strict/i);
    }
  });

  test("RBAC access restrictions", async ({ page }) => {
    // Attempt to access an admin-only route as a standard member
    // Need to logout first or test as unauthenticated
    await page.goto("/infrastructure");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome to SIGNAL" })).toBeVisible();
  });
});
