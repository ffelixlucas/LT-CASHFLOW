import { expect, type Page } from "@playwright/test";

export async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
}
