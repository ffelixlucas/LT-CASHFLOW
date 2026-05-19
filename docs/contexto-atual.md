# Contexto atual — LT CashFlow

Este arquivo é o ponto de entrada para qualquer IA continuar o trabalho com economia de tokens.

Leia este arquivo primeiro. Só abra documentos detalhados quando a tarefa pedir.

## Estado do projeto

- Produto: LT CashFlow, controle financeiro pessoal/familiar.
- Stack: Next.js, TypeScript, MySQL/Railway, pnpm workspace.
- Diretório principal: `apps/web`.
- Banco compartilhado com isolamento lógico por `gestao_id`.
- Gestão mais usada no desenvolvimento atual: Lucas / gestão `2`.
- Dados pessoais detalhados e planejamento financeiro privado devem ficar em `pessoal/`, que está no `.gitignore`.

## Fase 1 multitenant — status (revisão 2026-05-19)

**Concluído:** helpers tipados (`gestao-access`), guards HTTP, logs estruturados, mutations/APIs/assistente/conciliação/dashboard leitura, 51 Vitest + 6 E2E, CI MySQL `lt_cashflow_e2e`.

**Fora do escopo entregue (documentado — iniciar antes/durante Fase 2 se prioridade de produto):**

| Tema | Status | Notas |
|------|--------|--------|
| Convites | Schema only | Tabela `convites` no Drizzle/SQL; **sem rotas/UI/aceite** no app. Expiração e bloqueio de pendente não implementados. |
| Soft delete | Hard delete | `deleteLancamentos` faz `DELETE` físico; auditoria via `auditoria` em outras ops. Política soft delete = Fase 2+. |
| Rate limiting | Pendente | Só tratamento de rate limit **do provedor LLM** (Groq); sem limite app em login/assistant/search/import. |
| Logs em server actions | Parcial | `denyGestaoAccess` em guards principais; algumas actions usam `userCanMutateGestao` + redirect **sem** `security-log`. |

**Recomendação:** pode iniciar **Fase 2** (índices, pool, cache por `gestaoId`) em paralelo com convites/rate limit se o produto exigir compartilhamento familiar em breve.

## Lançamento controlado familiar (2026-05-19)

**Liberado para uso familiar privado** (“produção da família”), com regra operacional:

- **Não divulgar URL** do app.
- **Não abrir para amigos** ainda.

Guia: `docs/lancamento-controlado-familiar.md` (7 passos antes do dia a dia + smoke test). Deploy: `docs/deploy-railway.md`. Esposa: `/cadastro` + `gestao_membros` via SQL. **Fase 2 não bloqueia** uso dos dois; performance é evolução. Antes de amigos: cadastro restrito, rate limit, convites, backup/restore testado.

## Prioridade técnica atual

1. Operar lançamento familiar (smoke test do guia).
2. Fase 2 multitenant: índices, pool, cache com `gestaoId` na chave.
3. Convites + rate limiting antes de SaaS/amigos.

## Arquivos que dão contexto rápido

- `docs/contexto-atual.md`: este resumo curto.
- `docs/protocolo-handoff-ia.md`: regra de como qualquer IA deve registrar e continuar trabalho.
- `docs/diario-desenvolvimento.md`: histórico cronológico das sessões relevantes.
- `docs/modelagem/architecture/arquitetura-multitenant-seguranca-performance.md`: plano multitenant, segurança, índices, pool e cache.
- `pessoal/planejamento-financeiro-pessoal.md`: planejamento financeiro privado, ignorado pelo Git.

## Últimas decisões importantes

- O tenant oficial é `gestao`.
- Compartilhamento só deve ocorrer via `gestao_membros`.
- Antes de considerar multitenant seguro, é obrigatório bloquear IDOR:
  - usuário precisa pertencer à gestão;
  - papel precisa permitir a ação;
  - todos os IDs filhos precisam pertencer à mesma gestão.
- Evitar helper genérico com tabela dinâmica, como `assertEntityInGestao(entity, ...)`.
- Helpers tipados em `apps/web/src/lib/server/gestao-access.ts`:
  - `assertCanReadGestao` / `assertCanMutateGestao`;
  - `assertContaInGestao`, `assertCategoriaInGestao`, `assertLancamentoInGestao`;
  - `assertFinancialRefsInGestao` / `ensureFinancialRefsInGestao` (repository).
- Já aplicados em: lançamentos (dashboard + repository), quick-add (leitura + save batch), assistente (`route.ts` + rotas dedicadas), conciliação (preview/import), busca IA, gastos fixos/plano fixos, fechamento semanal.
- `gestao-api-guard.ts`: respostas HTTP 403 padronizadas para APIs; chama `security-log` uma vez por bloqueio.
- `security-log.ts`: eventos `financial.read.denied`, `financial.mutation.denied`, `financial.entity.denied` (JSON via `console.warn`, sink injetável em testes). Sem senha, token, extrato ou descrição de lançamento.
- Dashboard/actions e `dashboard/semana/actions`: redirect `acesso-negado` com log único (`denyGestaoAccess` / catch explícito).
- Assistente `route.ts`: tools negadas logam em `toolAccessDeniedResult` (não duplica com guard HTTP nas rotas dedicadas).
- `gestao-read-page.ts`: `resolveGestaoAtivaForRead` — páginas de leitura do dashboard usam `listUserGestoes` + `assertCanReadGestao` quando `?gestao=` aponta para ID fora da lista (redirect `acesso-negado` + log `financial.read.denied`).
- Novos helpers: `assertLancamentoIdsInGestao`, `assertContaIdsInGestao`.
- Cache sempre deve ter `gestaoId` na chave.
- Invalidação de cache financeiro deve ser aguardada antes da resposta da mutation.
- Convites com expiração entram na fase inicial de segurança.

## Estado financeiro/dados recentes

- Houve reconciliação manual de cartão, fatura, fechamento semanal e reservas entre 17/05/2026 e 19/05/2026.
- O diário contém os lançamentos e IDs ajustados.
- Para análises financeiras pessoais, consultar o usuário antes de expor ou mover dados para documentos versionados.
- Para planejamento pessoal, usar `pessoal/` e não `docs/`.

## Mudanças locais conhecidas

- `.gitignore` foi alterado para ignorar `pessoal/`.
- `apps/web/src/app/dashboard/page.tsx` tem ajustes recentes de texto/UX para reduzir confusão no dashboard.
- `docs/modelagem/architecture/arquitetura-multitenant-seguranca-performance.md` foi criado e revisado.
- Hardening multitenant Fase 1 (APIs/actions): ver entrada `2026-05-19 — Multitenant assistente e conciliação` no diário.

## Testes IDOR (Vitest)

- Pacote: `apps/web` — `pnpm --filter web test` (51 testes).
- Unitários: `gestao-access.test.ts`, `security-log.test.ts`, `gestao-read-page.test.ts`.
- HTTP: `src/test/api/*-routes.test.ts` (conciliação com assert de log em 403, quick-add/save, assistente delete/update).
- Helpers: `src/test/helpers/` (fixtures sintéticos, mock DB, `postJson`, mock de `auth`).
- Sem banco real; IDs sintéticos (gestões 101/202).

## E2E multitenant (Playwright)

- Doc: `docs/e2e-multitenant.md`.
- Seed: `pnpm --filter web seed:e2e` (usuários `e2e-*@ltcashflow.test`, banco **dedicado** via `apps/web/.env.test`).
- Testes: `pnpm --filter web test:e2e` (6 cenários em `e2e/multitenant-isolation.spec.ts`).
- Sem `.env.test`/MySQL: seed falha com aviso e testes são **skipped** (não usa banco real).

## CI (GitHub Actions)

- Workflow: `.github/workflows/ci.yml` — MySQL 8 service `lt_cashflow_e2e`, `scripts/ci-mysql-init.mjs`, typecheck, lint, Vitest (51), seed E2E, Playwright (6).
- Local equivalente: `pnpm db:ci:init` + `seed:e2e` + `test:e2e` (ver `docs/e2e-multitenant.md`).
- **Limitação:** CI aplica `backend/database/schema.sql` consolidado; Drizzle `db:migrate` ainda sem migrations versionadas em `packages/db/drizzle`.

## Pendências multitenant

- Fase 2: índices, pool, cache com `gestaoId` na chave.
- Convites (fluxo completo), rate limiting app, soft delete de lançamentos (se exigido por auditoria).
- Automatizar migrations incrementais no CI quando Drizzle/SQL estiver unificado.
- Unificar logs em server actions que ainda só fazem redirect sem `security-log`.

## Comandos úteis

```bash
pnpm --filter web test
pnpm --filter web test:watch
pnpm --filter web seed:e2e
pnpm --filter web test:e2e
pnpm db:ci:init
pnpm test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web start
```

Quando alterar frontend e precisar testar localmente:

```bash
pkill -f 'next-server|next start|pnpm --filter web start|pnpm start' || true
pnpm --filter web build
pnpm --filter web start
```

## Como continuar uma conversa

Para qualquer IA:

1. Leia `docs/contexto-atual.md`.
2. Leia a última entrada de `docs/diario-desenvolvimento.md`.
3. Abra só os documentos específicos da tarefa.
4. Faça a alteração.
5. Atualize `docs/contexto-atual.md` se o estado atual mudou.
6. Atualize `docs/diario-desenvolvimento.md` se houve decisão, ajuste de dados, arquitetura ou comportamento importante.
