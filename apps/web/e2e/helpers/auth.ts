import type { Page } from "@playwright/test";

export async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}
