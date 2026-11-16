import { expect, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL || "admin@signal.local";
const password = process.env.E2E_PASSWORD || "SignalE2EPassword1!";

export async function loginAsOwner(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);

  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  const response = await loginResponse;
  expect(response.status(), await response.text()).toBe(200);
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Email sign in" })).toBeHidden();
}
