# E2E multitenant — LT CashFlow

Testes Playwright que validam isolamento entre gestões com **usuários sintéticos** (`e2e-*@ltcashflow.test`). Não usam dados reais nem o banco pessoal de produção.

## Pré-requisitos

1. MySQL **dedicado** (local ou container), por exemplo `lt_cashflow_e2e`.
2. Schema migrado no banco de teste (`pnpm db:migrate` com variáveis apontando para esse banco).
3. Arquivo `apps/web/.env.test` (copie de `apps/web/.env.test.example`).
4. `E2E_ALLOW_SEED=1` ou `DB_NAME` contendo `e2e` / `test`.

## Comandos

```bash
# 1) Configurar ambiente
cp apps/web/.env.test.example apps/web/.env.test
# Edite DB_* para o MySQL de teste

# 2) Seed idempotente (limpa só usuários e2e-*)
pnpm --filter web seed:e2e

# 3) Rodar E2E (sobe next dev e executa seed no globalSetup)
pnpm --filter web test:e2e

# UI interativa (opcional)
pnpm --filter web test:e2e:ui
```

Credenciais do seed (apenas teste):

| Usuário | Email | Papel |
|---------|-------|-------|
| Editor A | `e2e-editor-a@ltcashflow.test` | proprietário da Gestão A |
| Editor B | `e2e-editor-b@ltcashflow.test` | proprietário da Gestão B |
| Viewer A | `e2e-viewer-a@ltcashflow.test` | visualizador na Gestão A |

Senha: `E2eTestPass123!` (gravada em `e2e/.seed-state.json` após o seed).

## Cenários cobertos

- Editor A/B acessam o próprio dashboard (`h1` com nome da gestão).
- Editor A com `?gestao={idGestaoB}` → redirect `acesso-negado`, sem texto/marker da Gestão B.
- Visualizador lê a Gestão A.
- Visualizador: `POST /api/reconciliacao/import` → 403.
- Editor A: `POST /api/reconciliacao/preview` com `gestaoId` da B → 403.

## Segurança do seed

O script `scripts/seed-e2e.mjs` **recusa** rodar se `NODE_ENV=production`, se `DB_NAME` não parecer banco de teste (salvo `E2E_ALLOW_SEED=1` **e** nome com `e2e`/`test`). Remove apenas emails `e2e-%@ltcashflow.test`. **Nunca** configurar seed/E2E no Railway de produção — ver `docs/lancamento-controlado-familiar.md`.

## Limitações

- Exige MySQL acessível; sem banco, `seed:e2e` falha e os testes são **skipped** com mensagem clara.
- UI de mutação no dashboard principal não esconde todos os controles para visualizador; mutação é assertada via API 403.
- `globalSetup` reexecuta o seed a cada `test:e2e` (idempotente).

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

1. Service container MySQL 8 (`lt_cashflow_e2e`, senha fixa só no job).
2. `pnpm db:ci:init` — aplica `backend/database/schema.sql` + colunas `gestoes` faltantes.
3. `typecheck`, `lint`, `vitest`, `seed:e2e`, `test:e2e`.

Equivalente local (com MySQL rodando):

```bash
export DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASSWORD=senha
export DB_NAME=lt_cashflow_e2e
export E2E_ALLOW_SEED=1
export NEXTAUTH_SECRET=local-e2e-nextauth-secret-32chars-min
export NEXTAUTH_URL=http://127.0.0.1:3000

pnpm db:ci:init
pnpm --filter web seed:e2e
pnpm --filter web test:e2e
```

**Limitação:** `pnpm db:migrate` (Drizzle) ainda não tem pasta `packages/db/drizzle` versionada; CI usa schema consolidado, não migrations SQL incrementais de `backend/database/migrations/`.

Status Fase 1 multitenant: ver `docs/contexto-atual.md` (seção **Fase 1 multitenant — status**).
