import { expect, type Page } from "@playwright/test";

export async function loginWithCredentials(page: Page, email: string, password: string) {
  const csrfResponse = await page.request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBe(true);

  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const loginResponse = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email,
      password,
      json: "true",
    },
  });

  expect(loginResponse.ok()).toBe(true);
  const loginResult = (await loginResponse.json()) as { error?: string | null };
  expect(loginResult.error ?? null).toBeNull();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 });
}
