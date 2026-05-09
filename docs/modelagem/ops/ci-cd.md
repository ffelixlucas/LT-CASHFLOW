# CI/CD

## Objetivos

Detectar regressões financeiras e quebras de contrato antes de produção.

## Pipeline sugerido

1. **Lint + typecheck** monorepo (`pnpm`).
2. **Testes unitários** (Vitest) — motor financeiro prioritário.
3. **Testes e2e** (Playwright) fluxos críticos autenticados em staging.
4. **Build** Next.js.

## Gates

- Falha em testes de domínio financeiro bloqueia merge.
- Migrates só aplicam em prod com checklist (`docs/modelagem/database/convencoes.md`).

## Artefatos

Relatórios de cobertura opcionais; não sacrificar testes de happy path extrato/conciliação.
