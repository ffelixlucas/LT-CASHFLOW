import { expect, test } from "@playwright/test";

import { loginWithCredentials } from "./helpers/auth";
import { hasE2ESeedState, loadE2ESeedState, type E2ESeedState } from "./helpers/seed-state";

test.describe("isolamento multitenant (E2E)", () => {
  let seed: E2ESeedState;

  test.beforeAll(async ({}, testInfo) => {
    if (!hasE2ESeedState()) {
      testInfo.skip(true, "Seed E2E ausente — configure .env.test e rode pnpm --filter web seed:e2e");
      return;
    }

    seed = loadE2ESeedState();
  });

  test.beforeEach(async ({}, testInfo) => {
    if (!hasE2ESeedState()) {
      testInfo.skip(true, "Seed E2E ausente");
    }
  });

  test("editor A acessa a propria gestao no dashboard", async ({ page }) => {
    const { password } = seed;
    const gestaoA = seed.gestoes.a;
    const gestaoB = seed.gestoes.b;

    await loginWithCredentials(page, seed.users.editorA.email, password);
    await page.goto(`/dashboard?gestao=${gestaoA.id}`);

    await expect(page.getByRole("heading", { name: gestaoA.nome })).toBeVisible();
    await expect(page.getByText(gestaoB.marker)).not.toBeVisible();
  });

  test("editor B acessa a propria gestao no dashboard", async ({ page }) => {
    const { password } = seed;
    const gestaoA = seed.gestoes.a;
    const gestaoB = seed.gestoes.b;

    await loginWithCredentials(page, seed.users.editorB.email, password);
    await page.goto(`/dashboard?gestao=${gestaoB.id}`);

    await expect(page.getByRole("heading", { name: gestaoB.nome })).toBeVisible();
    await expect(page.getByText(gestaoA.marker)).not.toBeVisible();
  });

  test("editor A com ?gestao= da gestao B nao ve dados da gestao B", async ({ page }) => {
    const { password } = seed;
    const gestaoB = seed.gestoes.b;

    await loginWithCredentials(page, seed.users.editorA.email, password);
    await page.goto(`/dashboard?gestao=${gestaoB.id}`);

    await expect(page).toHaveURL(/status=acesso-negado/);
    await expect(page.getByText(/nao tem acesso a essa gestao/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: gestaoB.nome })).not.toBeVisible();
    await expect(page.getByText(gestaoB.marker)).not.toBeVisible();
  });

  test("visualizador le a gestao A no dashboard", async ({ page }) => {
    const { password } = seed;
    const gestaoA = seed.gestoes.a;

    await loginWithCredentials(page, seed.users.viewerA.email, password);
    await page.goto(`/dashboard?gestao=${gestaoA.id}`);

    await expect(page.getByRole("heading", { name: gestaoA.nome })).toBeVisible();
  });

  test("visualizador recebe 403 ao tentar mutacao via API na gestao A", async ({ page }) => {
    const { password } = seed;
    const gestaoA = seed.gestoes.a;

    await loginWithCredentials(page, seed.users.viewerA.email, password);

    const response = await page.request.post("/api/reconciliacao/import", {
      data: {
        gestaoId: gestaoA.id,
        items: [
          {
            descricao: "E2E mutation bloqueada",
            tipo: "despesa",
            status: "liquidado",
            valorTotal: 1,
            competenciaData: "2026-05-19",
            contaId: gestaoA.contaId,
            categoriaId: gestaoA.categoriaId,
            confianca: 1,
            motivo: "E2E",
          },
        ],
      },
    });

    expect(response.status()).toBe(403);
    const body = (await response.json()) as { error?: string };
    expect(body.error ?? "").toMatch(/permissao|gestao/i);
  });

  test("editor A recebe 403 ao chamar API com gestao B", async ({ page }) => {
    const { password } = seed;
    const gestaoB = seed.gestoes.b;

    await loginWithCredentials(page, seed.users.editorA.email, password);

    const response = await page.request.post("/api/reconciliacao/preview", {
      data: {
        gestaoId: gestaoB.id,
        contaId: gestaoB.contaId,
        text: "01/05/2026 E2E extrato sintetico -10,00",
      },
    });

    expect(response.status()).toBe(403);
    const body = (await response.json()) as { error?: string };
    expect(body.error ?? "").toMatch(/gestao|acesso|permissao/i);
  });
});
