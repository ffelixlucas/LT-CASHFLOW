# Diário de desenvolvimento — LT CashFlow

Registro cronológico de entregas, decisões técnicas e ajustes de dados feitos no projeto.  
Formato: uma entrada por sessão relevante (mais recente no topo).

---

## 2026-05-27 — Conciliação extrato Inter 27/04 a 27/05

### Contexto

Usuário informou extrato completo CSV da gestão Lucas (`gestao_id=2`) para Banco Inter, período 27/04/2026 a 27/05/2026, com saldo final R$ 1.012,50. Os Pix `63.156.552 Lucas Fanha Felix` foram tratados como `Future Trade`.

### Ajustes de dados

- Criado `#1567`: `Future Trade` — receita Pix — R$ 86,45 — 26/05/2026.
- Corrigido `#1`: descrição `Future Trade` e valor R$ 51,45 — 27/05/2026.
- Criados `#1568`, `#1569`, `#1570`: transporte R$ 6,13 e receitas `Future Trade` R$ 86,45/R$ 72,02 — 27/05/2026.
- Corrigido `#1487`: saiu de 16/05/R$ 98,17 para 26/04/R$ 116,36 como ajuste anterior ao recorte do extrato.
- Corrigidos `#1542` e `#1543`: R$ 260,20 para R$ 260,19 em 24/05/2026, conforme CSV.
- Removido `#1563` e seu rateio: receita `Future Trade` R$ 86,45 em 26/07/2026, lançada com mês incorreto e fora do extrato.

### Conferência

CSV completo conferido contra a conta corrente no banco:

- CSV: 228 lançamentos.
- Banco: 228 lançamentos no período.
- Total do período: -R$ 1.316,27 em ambos.
- Dias divergentes: 0.
- Valores divergentes por dia: 0.
- Saldo derivado em 27/05/2026: R$ 1.012,50.

Movimentos finais do recorte recente:

| Dia | Movimento | Saldo do extrato |
| --- | ---: | ---: |
| 22/05/2026 | R$ 167,91 | R$ 2.653,74 |
| 23/05/2026 | R$ 68,95 | R$ 2.722,69 |
| 24/05/2026 | -R$ 2.722,69 | R$ 0,00 |
| 25/05/2026 | R$ 471,21 | R$ 471,21 |
| 26/05/2026 | R$ 265,48 | R$ 736,69 |
| 27/05/2026 | R$ 275,81 | R$ 1.012,50 |

---

## 2026-05-19 — Lançamento controlado familiar (produção privada)

### Contexto

Preparar uso em produção só para Lucas e esposa, sem SaaS público, após Fase 1 multitenant fechada.

### O que foi feito

- `docs/lancamento-controlado-familiar.md`: pronto/não pronto, envs, pré/pós-deploy, gestão familiar, vínculo da esposa via SQL, smoke test, backups, rollback.
- `apps/web/.env.local.example`: comentários produção vs E2E.
- `seed-e2e.mjs`: recusa `NODE_ENV=production` e `E2E_ALLOW_SEED=1` sem `DB_NAME` test/e2e.
- Link em `docs/deploy-railway.md` e seção em `docs/contexto-atual.md`.

### Decisão

**Apto para lançamento familiar privado** com checklist manual e vínculo de membro manual. **Não apto** para amigos/clientes sem convites, rate limit e cadastro fechado.

### Validação

- `pnpm --filter web test` — 51 passed.
- `pnpm --filter web typecheck` — ok.
- `pnpm --filter web lint` — ok.
- `pnpm --filter web build` — ok.
- CI `.github/workflows/ci.yml` — consistente (MySQL e2e, sem secrets de prod).

### Próximos passos

- [ ] Smoke test em produção (guia).
- [ ] Vincular esposa em `gestao_membros`.
- [ ] Backup Railway antes de mudanças de schema.

---

## 2026-05-19 — Revisão final Fase 1 multitenant (auditoria)

### Contexto

Fechar Fase 1 antes de performance/índices (Fase 2): auditar lacunas em convites, soft delete, rate limit, logs, CI e autorização residual.

### O que foi auditado

| Área | Resultado |
|------|-----------|
| **Convites** | Apenas schema (`packages/db`, `backend/database/schema.sql`). Sem API/UI de criar/aceitar. Expiração e status não aplicados no app — **não implementado**. |
| **Soft delete** | Lançamentos: `DELETE FROM lancamentos` em `repository.deleteLancamentos`. Risco para histórico/fechamento se exclusão frequente — **decisão: manter hard delete na Fase 1**; soft delete planejado na arquitetura para fase posterior. |
| **Rate limiting** | Sem middleware/app limit em login, `/api/assistant`, `/api/ai/search`, conciliação. Apenas retry/mensagem para rate limit do Groq — **pendência de segurança**. |
| **Logs** | Centralizados em APIs via `gestaoAccessDeniedResponse` + `security-log` (sem payload bruto). Dashboard: `denyGestaoAccess` / `gestao-read-page` logam read denied. Gap: ~5 server actions usam `userCanMutateGestao` + redirect sem log estruturado. |
| **CI** | `.github/workflows/ci.yml`: env fixo no job, sem `secrets.*` de produção; `DB_NAME=lt_cashflow_e2e`; `seed:e2e` exige nome test/e2e ou `E2E_ALLOW_SEED`. |
| **Autorização** | 12 rotas API financeiras com guards; `repository` usa `ensureFinancialRefsInGestao` em creates/updates críticos; dashboard mutations com `guardMutate*` ou `userCanMutateGestao`; páginas leitura com `resolveGestaoAtivaForRead`. `updateGestaoMembroPapel` valida membro na gestão no SQL. |

### Correções de código

Nenhuma — não foram encontrados bugs pequenos óbvios; lacunas maiores documentadas como pendência.

### Decisão

**Fase 1 de isolamento IDOR está fechada** para o escopo entregue (helpers + testes + E2E). Convites, rate limit e soft delete ficam explicitamente fora e podem entrar em sprint paralela à Fase 2.

### Validação

- `pnpm --filter web test` — 51 passed.
- `pnpm --filter web typecheck` — ok.
- `pnpm --filter web lint` — ok (2 warnings antigos).

### Próximos passos

- [ ] Fase 2: índices, pool, cache.
- [ ] Convites + rate limiting (se prioridade de produto).
- [ ] Soft delete de lançamentos (se auditoria exigir).

---

## 2026-05-19 — CI: MySQL isolado + Vitest + E2E

### Contexto

Fechar Fase 1 multitenant com pipeline que não toca banco real nem secrets pessoais.

### O que foi feito

- `.github/workflows/ci.yml`: service MySQL 8, env `lt_cashflow_e2e`, senha só no job.
- `scripts/ci-mysql-init.mjs` + `pnpm db:ci:init`: schema consolidado (`backend/database/schema.sql`) + patch `gestoes.inicio_em` / `percentual_reserva`.
- Steps: install, Playwright chromium, init DB, typecheck, lint, vitest, `seed:e2e`, `test:e2e`.
- `docs/e2e-multitenant.md` — seção CI e comando local equivalente.

### Decisão

Não rodar `pnpm db:migrate` (Drizzle) no CI: pasta `packages/db/drizzle` inexistente; migrations SQL em `backend/database/migrations/` são parciais/dados e não entram no job. Documentado como limitação até unificar migrations.

### Validação

- `pnpm --filter web test` — 51 passed.
- `pnpm --filter web typecheck` — ok.
- `pnpm --filter web lint` — ok.
- Workflow YAML revisado manualmente; E2E no runner depende do primeiro push/PR no GitHub.

### Próximos passos

- [ ] Unificar migrations (Drizzle ou runner SQL) e incluir no `db:ci:init`.
- [ ] Fase 2 multitenant (índices, cache).

---

## 2026-05-19 — E2E Playwright: isolamento multitenant (dois usuários sintéticos)

### Contexto

Fase 1 multitenant: validar na UI/URL que um usuário não acessa gestão alheia, com seed isolado (sem dados do Lucas).

### O que foi feito

- Playwright em `apps/web` (`@playwright/test`, `playwright.config.ts`).
- `scripts/seed-e2e.mjs`: limpa/recria usuários `e2e-*@ltcashflow.test`, Gestões A/B, viewer na A; grava `e2e/.seed-state.json`.
- `apps/web/.env.test.example` + proteção de seed (`DB_NAME` com e2e/test ou `E2E_ALLOW_SEED=1`).
- `docs/e2e-multitenant.md` com passo a passo.
- 6 testes em `e2e/multitenant-isolation.spec.ts`: login A/B, `?gestao=` externo → acesso negado, viewer lê, viewer 403 em import, editor A 403 em preview da gestão B.

### Decisão

Não improvisar no banco Railway/real: sem MySQL de teste configurado, `globalSetup` avisa e os testes são skipped. Mutação de visualizador assertada via API (UI do dashboard não esconde todos os controles).

### Validação

- `pnpm --filter web test` — 51 passed.
- `pnpm --filter web typecheck` — ok (`e2e/` e `playwright.config.ts` excluídos do tsc do app).
- `pnpm --filter web lint` — ok.
- `pnpm --filter web test:e2e` — 6 skipped neste ambiente (sem credencial MySQL em `.env.test`).

### Próximos passos

- [x] Job CI com MySQL + `seed:e2e` + `test:e2e` (entrada CI no mesmo dia).

---

## 2026-05-19 — Guard explícito de leitura nas páginas do dashboard

### Contexto

Fase 1 multitenant: após helpers, testes e logs, auditar páginas server-only de leitura para garantir que `gestaoId` da URL não chega ao repository sem validação.

### Auditoria (10 rotas `page.tsx`)

| Página | Antes | Depois |
|--------|-------|--------|
| `dashboard/page.tsx` | `listUserGestoes` + `find` | `resolveGestaoAtivaForRead` |
| `meses`, `cartao`, `config`, `reservas`, `semana`, `executivo`, `estado-inicial` | idem | idem |
| `movimentacoes`, `insights` | redirect puro (repassa `?gestao=`) | sem alteração — destino (`meses`) valida |

### O que foi feito

- `gestao-read-page.ts`: `parseRequestedGestaoId`, `resolveGestaoAtivaForRead` (membro na lista → sem assert extra; `?gestao=` externo → `assertCanReadGestao` + log + redirect).
- 8 páginas de leitura migradas para o helper.
- `gestao-read-page.test.ts` (5 testes).

### Decisão

Não duplicar `assertCanReadGestao` quando a gestão já veio de `listUserGestoes`. Assert + log só quando o param URL pede gestão que não está na lista do usuário.

### Validação

- `pnpm --filter web test` — 51 passed.
- `pnpm --filter web typecheck` — ok.
- `pnpm --filter web lint` — ok (2 warnings antigos).
- `pnpm --filter web build` — ok.

### Próximos passos

- [x] E2E Playwright com usuários sintéticos (ver entrada dedicada no mesmo dia).

---

## 2026-05-19 — Logs estruturados de acesso negado (Fase 1 multitenant)

### Contexto

Continuação da Fase 1: registrar negações de segurança sem vazar dados sensíveis, integrado ao guard HTTP e a redirects do dashboard.

### O que foi feito

- Módulo `apps/web/src/lib/server/security-log.ts`:
  - eventos `financial.read.denied`, `financial.mutation.denied`, `financial.entity.denied`;
  - campos: `event`, `timestamp`, `userId`, `gestaoId`, `reason`, `entity`, `entityId` / `entityCount`, `route` / `action`;
  - `setSecurityLogSink` / `resetSecurityLogSink` para testes.
- `gestao-api-guard.ts`: `gestaoAccessDeniedResponse(error, context)` loga antes do 403.
- Integração em rotas API (conciliação, quick-add, assistente dedicadas, busca IA) com `route` e metadados seguros.
- `dashboard/actions.ts`: `denyGestaoAccess` e guards de mutation; `dashboard/semana/actions.ts` no catch de `GestaoAccessDeniedError`.
- Assistente `route.ts`: `toolAccessDeniedResult` para tools (POST principal usa guard com context).
- Testes: `security-log.test.ts` (6); asserts de log em 403 em `reconciliacao-routes.test.ts` (mock do sink).

### Decisão

Um bloqueio gera um log: guard HTTP centraliza APIs; tools do assistente logam no catch da tool; dashboard usa helper único — sem log duplicado em `gestao-access.ts`.

### Validação

- `pnpm --filter web test` — 46 passed.
- `pnpm --filter web typecheck` — ok.
- `pnpm --filter web lint` — ok (2 warnings antigos).

### Próximos passos

- [x] Revisar asserts explícitos em páginas server-only de leitura (dashboard).
- [ ] E2E Playwright (opcional).

---

## 2026-05-19 — Testes HTTP de rotas críticas (IDOR)

### Contexto

Continuação dos testes Vitest: validar que APIs críticas retornam 401/403/400 sem banco real.

### O que foi feito

- Infraestrutura em `src/test/helpers/`: `tenant-fixtures`, `mock-gestao-db`, `http-route-test`, `route-payloads`.
- Testes HTTP (20 novos, total 40):
  - `reconciliacao-routes.test.ts` — preview e import;
  - `quick-add-save-route.test.ts`;
  - `assistant-lancamentos-routes.test.ts` — delete e update meio.
- Mock de `@/lib/server/auth`, `@ltcashflow/db` e funções pontuais do `repository`.
- `gestao-access.test.ts` refatorado para reutilizar `mock-gestao-db`.

### Cenários cobertos

- 401 sem sessão; 400 payload inválido; 403 outsider; 403 visualizador em mutation; 403 IDs filhos de outra gestão.

### Validação

- `pnpm --filter web test` — 40 passed.
- `pnpm --filter web typecheck` — ok.
- `pnpm --filter web lint` — ok (2 warnings antigos).

### Próximos passos

- [x] Log `financial.mutation.denied` (ver entrada de logs estruturados no mesmo dia).
- [ ] E2E Playwright para fluxos completos (opcional).

---

## 2026-05-19 — Testes Vitest de isolamento (gestao-access)

### Contexto

Fase 1 multitenant precisava de testes automatizados para evitar regressão de IDOR nos helpers tipados.

### O que foi feito

- Vitest configurado em `apps/web` (`vitest.config.ts`, stub `server-only`).
- Scripts: `pnpm --filter web test`, `test:watch`; raiz: `pnpm test`.
- `gestao-access.test.ts`: 20 testes com mock de `@ltcashflow/db` (sem MySQL real).
- Cenários: read/mutate por papel, conta/categoria/lançamento de outra gestão, lote de lançamentos, `assertFinancialRefsInGestao`, `canMutateGestao`.

### Decisão

Testes unitários mockam o pool; não usam gestão `2` nem dados reais. Integração HTTP fica para etapa seguinte.

### Validação

- `pnpm --filter web test` — 20 passed.
- `pnpm --filter web typecheck` — ok.
- `pnpm --filter web lint` — ok (2 warnings antigos).

### Próximos passos

- [x] Testes de rotas API com mock de sessão.
- [x] Log `financial.mutation.denied`.

---

## 2026-05-19 — Multitenant: assistente, conciliação e demais mutations

### Contexto

Continuação da Fase 1: aplicar o mesmo padrão de `gestao-access.ts` nos fluxos de maior risco fora do dashboard de lançamentos.

### O que foi feito

- Criado `apps/web/src/lib/server/gestao-api-guard.ts` (`gestaoAccessDeniedResponse`, `requireReadGestaoApi`, `requireMutateGestaoApi`, `requireFinancialRefsInGestaoApi`).
- `gestao-access.ts`: `assertLancamentoIdsInGestao`, `assertContaIdsInGestao`.
- Assistente: `api/assistant/route.ts` (leitura com filtros validados; mutations com refs/lançamentos); rotas dedicadas (`create-account`, `rename-account`, `keep-accounts`, `update/delete-lancamentos`, `update-lancamentos-data`).
- Conciliação: `api/reconciliacao/preview` (read + conta), `import` (mutate + refs por item).
- IA: `api/ai/quick-add` (read), `api/ai/search` (read + filtros), `quick-add/save` alinhado ao guard HTTP.
- Dashboard: `createGastoFixo`, `updateContaSaldoInicial`, `createCategoria` (update), plano fixos, `semana/actions` (contas do fechamento).
- Repository: `updateLancamentosMeio`, `updateLancamentosCompetenciaData`, `createGastoFixo` validam refs/IDs.

### Validação

- `pnpm --filter web typecheck` — ok.
- `pnpm --filter web lint` — ok (2 warnings antigos).
- `pnpm --filter web build` — ok.

### Próximos passos

- [ ] Vitest + cenários IDOR (assistente, conciliação, visualizador).
- [ ] Log estruturado `financial.mutation.denied`.

---

## 2026-05-19 — Hardening multitenant (lançamentos e refs filhas)

### Contexto

Início da Fase 1 da arquitetura multitenant: bloquear IDOR por `gestao_id` e validar IDs filhos (conta, categoria, lançamento) nas mutations financeiras críticas.

### O que foi feito

- Criado `apps/web/src/lib/server/gestao-access.ts` com helpers tipados e SQL fixo:
  - membership: `userHasGestaoAccess`, `getUserGestaoRole`, `assertCanReadGestao`, `assertCanMutateGestao`;
  - entidades: `assertContaInGestao`, `assertCategoriaInGestao`, `assertLancamentoInGestao`, `assertGastoFixoInGestao`, `assertFaturaInGestao`;
  - agregador: `assertFinancialRefsInGestao` / `ensureFinancialRefsInGestao`.
- `permissions.ts` reexporta asserts; `userCanMutateGestao` mantido para compatibilidade.
- `repository.ts`: membership movido para `gestao-access`; `createLancamento`, `createTransferencia`, `updateLancamento`, `createParcelamentoNoCartao` chamam `ensureFinancialRefsInGestao`; query de conta em create usa `gestao_id`.
- `dashboard/actions.ts`: guards em create/update/delete lançamento, transferência e parcelamento.
- `api/ai/quick-add/save/route.ts`: `assertCanMutateGestao` + `assertFinancialRefsInGestao` (item e batch).

### Decisões

- Sem helper genérico com nome de tabela dinâmico.
- Visualizador continua bloqueado via `assertCanMutateGestao` (papéis `proprietario` / `administrador` / `editor` apenas).
- `GestaoAccessDeniedError` com `reason` para respostas inline/API.

### Validação

- `pnpm --filter web typecheck` — ok.
- `pnpm --filter web lint` — ok (2 warnings antigos em outros arquivos).
- Build não rodado (sem mudança de UI; APIs com novo 403 em refs inválidas).

### Próximos passos

- [ ] Configurar Vitest e testes de isolamento (cenários 3–8 e 12 do doc de arquitetura).
- [ ] Aplicar asserts em assistente, conciliação, gastos fixos e demais mutations.
- [ ] Log estruturado em negações de acesso.

---

## 2026-05-19 — Protocolo de handoff entre IAs

### Contexto

Foi definida uma estratégia de economia de tokens para continuar conversas e tarefas entre ChatGPT, Gemini, Claude, Cursor ou outro agente sem depender do histórico completo do chat.

### O que foi feito

- Criado `docs/contexto-atual.md` como ponto de entrada curto para qualquer IA.
- Criado `docs/protocolo-handoff-ia.md` com regras de leitura, escrita, diário e encerramento de sessão.
- Definido que dados pessoais sensíveis ficam em `pessoal/`, ignorado pelo Git.

### Decisão

Toda sessão relevante deve atualizar:

- `docs/contexto-atual.md`, quando o estado atual mudar;
- `docs/diario-desenvolvimento.md`, quando houver entrega, decisão, ajuste de dados ou mudança arquitetural.

### Validação

- Alteração documental. Nenhum teste técnico rodado.

---

## 2026-05-18 — Conciliação cartão, parcelas futuras e melhorias de fechamento

### Código entregue

- Assistente financeiro: melhor interpretação de lançamentos em linguagem natural, incluindo:
  - variações/erros como “crédtio”, “debido”, “cartão de credito”;
  - `Pix enviado` como despesa por padrão;
  - descrições com melhor capitalização/acentuação;
  - categorias mais seguras para mesada/filhos e fallback em “Outros”.
- Página **Fatura do cartão**:
  - lista de movimentos virou componente editável;
  - clique em movimento abre modal para alterar descrição, status, meio, conta, categoria, valor, data, hora e competência da fatura;
  - ao trocar compra de crédito/cartão para débito/conta corrente, a competência da fatura é limpa;
  - select de mês da fatura corrigido para opções legíveis no dropdown.
- Página **Fechamento semanal**:
  - totais da tabela “Dia a dia” ficaram clicáveis;
  - modal de conferência mostra os lançamentos que compõem Entradas, Débito/Pix, Cartão e Tudo;
  - formulário de fechamento separado em passos: cartão, pagamento de fatura, reservas e conferência em caixa;
  - fechamento passa a registrar pagamento de fatura e transferências de reservas no extrato para a Liquidez bater.

### Ajustes de dados feitos diretamente no MySQL

- Corrigido lançamento `#1411 Aviario Raul Seixas`: saiu de crédito/cartão para débito/Banco Inter e competência de fatura limpa.
- Criados lançamentos faltantes:
  - `#1423` Uber 19:45 — R$ 17,95 — cartão — 16/05/2026.
  - `#1424` APPLE.COM/BILL — R$ 9,99 — cartão — 15/05/2026.
  - `#1425` Future Trade — R$ 86,45 — receita Pix — 17/05/2026.
- Fechamento 11–17/05:
  - `#1426` pagamento fatura — R$ 889,34.
  - `#1427` aplicação Reserva 10% — R$ 230,26.
  - `#1428` aplicação Reserva Dia a Dia — R$ 298,91.
- Parcelas futuras do cartão criadas até abril/2027:
  - julho/2026: R$ 1.325,54;
  - agosto a dezembro/2026: R$ 975,58 por mês;
  - janeiro/2027: R$ 299,06 após correção da série Mercado Livre Cajamar;
  - fevereiro a abril/2027: R$ 154,80 por mês.
- Corrigida série `MERCADO MERCADOLIVRE CAJAMAR`:
  - Inter mostra abril=1/10, maio=2/10, junho=3/10;
  - lançamento incorreto de março foi cancelado;
  - parcela 10/10 criada em janeiro/2027.
- Ajuste pós-fechamento para seguir o valor aberto exibido pelo Inter:
  - `#1471` resgate Reserva Dia a Dia → Banco Inter — R$ 362,99 — 18/05/2026.
  - `#1472` pagamento ajuste fatura Cartão Inter — R$ 362,99 — 18/05/2026.
  - observação anexada ao snapshot semanal `#11`.

### Decisão operacional

Para fatura aberta do Inter, o LT não deve tratar o saldo mensal isolado como verdade absoluta. O uso prático fica:

1. Fechamento semanal segue pelo modelo do caderno.
2. Compras da semana e pagamentos realizados ficam registrados no extrato.
3. Diferenças de fatura aberta entram como ajuste de conciliação documentado.
4. Fatura fechada deve ser conciliada por CSV item a item.

### Validação

- `pnpm --filter web typecheck`
- `pnpm --filter web lint` — passou com os dois warnings antigos:
  - `apps/web/src/app/global-error.tsx`: uso de `<img>`;
  - `apps/web/src/components/onboarding/onboarding-contas-builder.tsx`: `index` não utilizado.

---

## 2026-05-17 — Fechamento semanal 11–17/05 (snapshot, caderno)

### Contexto

Fechamento feito no caderno com corrente zerada após pagar fatura e distribuir poupança. Os valores do formulário LT (sobra operacional R$ 1.181,72) não batiam com o que sobrou em caixa (R$ 529,17).

### Registro gravado (`fechamentos_periodo` id **11**, gestão 2)

| Campo | Valor |
|-------|-------|
| Período | 11/05 → 17/05/2026 |
| Entradas | R$ 2.302,60 |
| Saídas débito/Pix | R$ 231,55 |
| Compras cartão (semana) | R$ 889,34 |
| Pagamento fatura (registro) | R$ 889,34 |
| Reservado total | R$ 529,17 |
| Reserva 10% (conta 4) | R$ 230,26 |
| Reserva Dia a dia (conta 3) | R$ 298,91 |
| Apenas snapshot | Sim (sem criar transferências) |
| Ajuste Dia a dia | Nenhum (corrente já zerada no banco) |

Observação no snapshot: fechamento por caixa; corrente zerada para a próxima semana.

### Como ver

`/dashboard/semana?gestao=2&inicio=2026-05-11`

### Correção — Liquidez no dashboard (R$ 1.418,51 → R$ 0,00)

**Problema:** o card **Liquidez** usa saldo real da corrente (`saldo_inicial` + lançamentos liquidados). O fechamento foi gravado como **apenas snapshot** (sem criar movimentos), mas no Inter já tinham saído **R$ 889,34** (fatura) + **R$ 529,17** (reservas) — exatamente o saldo exibido.

**Lançamentos criados (17/05/2026):**

| ID | Tipo | Valor |
|----|------|-------|
| 1426 | Pagamento fatura (fechamento 11–17/05) | R$ 889,34 |
| 1427 | Aplicação → Reserva 10% | R$ 230,26 |
| 1428 | Aplicação → Reserva Dia a dia | R$ 298,91 |

**Lição:** fechar semana com “já fiz no banco” só grava histórico; o extrato precisa dos Pix/transferências para a **Liquidez** bater.

**Correção de produto (mesmo dia):** `createFechamentoSemanal` passa a **sempre** criar lançamentos de pagamento de fatura e transferências para reservas (idempotente por semana). Formulário com passo separado “Fatura — pagamento na corrente” e conferência no modelo do caderno (resultado − fatura − reservas).

---

## 2026-05-17 — Contas fixas fora do fechamento semanal

### Contexto

No fechamento da semana de **11/05 → 17/05/2026**, vários Pix de **contas fixas** (impostos, moradia, parcelamento, doação) inflavam a “contabilidade da semana”, embora não representem gasto discricionário do período. O pedido foi: **sumir da semana**, mas **manter** em movimentações, mês, fatura e saldos.

### O que fizemos

1. **Flag em metadados** — `excluir_fechamento_semanal: true` em `lancamentos.metadados` (JSON).
2. **Filtro SQL** — helper `sqlLancamentoEntraFechamentoSemanal` em `apps/web/src/lib/server/repository.ts`, aplicado só nas queries do **fechamento semanal**:
   - `getSemanaMetricas` (KPIs: entradas, saídas corrente, cartão, sobra)
   - `getSemanaResumoPorDia` (tabela Dia a dia)
   - `listSemanaConferenciaLancamentos` (modal de conferência)
   - `getSemanaPagamentosFatura` (destaque de pagamento de fatura na semana)
3. **Função de serviço** — `setLancamentosExcluirFechamentoSemanal({ gestaoId, lancamentoIds, excluir })` para marcar/desmarcar em lote (ainda sem UI).
4. **Dados** — marcados no MySQL (gestão `2`) os lançamentos abaixo.

### Lançamentos marcados

| ID   | Data   | Descrição                         | Categoria      | Valor     |
|------|--------|-----------------------------------|----------------|-----------|
| 1003 | 11/05  | Pix enviado - Receita Federal     | Impostos       | R$ 87,05  |
| 1004 | 11/05  | Pix enviado - Copeldis            | Moradia        | R$ 384,27 |
| 1005 | 11/05  | Pix enviado - Ricardo Morais Felix| Moradia        | R$ 578,00 |
| 1006 | 11/05  | TV Gisela - parcela 02/15         | Parcelamentos  | R$ 233,27 |
| 1356 | 11/05  | Rifa do afilhado                  | Doação         | R$ 50,00  |

**Total excluído das somas da semana:** R$ 1.332,59.

### Comportamento esperado

| Área                         | Comportamento                                      |
|-----------------------------|----------------------------------------------------|
| `/dashboard/semana`         | Lançamentos **não** entram em KPIs, Dia a dia e conferência |
| `/dashboard/movimentacoes`  | Continua listando normalmente                      |
| Dashboard mês / categorias  | Sem alteração                                      |
| Fatura do cartão            | Sem alteração                                      |
| Saldos e extrato            | Sem alteração                                      |

### Detalhe técnico (MySQL)

Comparação de boolean JSON no MySQL não funciona com `JSON_EXTRACT(...) = false`. O filtro usa:

```sql
COALESCE(JSON_UNQUOTE(JSON_EXTRACT(l.metadados, '$.excluir_fechamento_semanal')), '') NOT IN ('true', '1')
```

Atualização em lote (referência):

```sql
UPDATE lancamentos
SET metadados = JSON_MERGE_PATCH(
  COALESCE(metadados, JSON_OBJECT()),
  JSON_OBJECT('excluir_fechamento_semanal', true)
)
WHERE gestao_id = ? AND id IN (...);
```

### Relação com “gastos fixos” existentes

- **Previstos sintéticos** (`metadados.origem = 'gasto_fixo'`, `status = previsto`) já eram excluídos de fluxo mês/semana via `sqlLancamentoNaoEhPrevistoSinteticoGastoFixo`.
- **Despesas reais** vinculadas a `gastos_fixos` (`origem = gasto_fixo_vinculo`) **ainda contam** na semana, salvo esta nova flag.
- A flag `excluir_fechamento_semanal` é independente do cadastro em `gastos_fixos` — serve para “não contar na semana” sem mudar o restante da contabilidade.

### Pendências / próximos passos

- [ ] Botão na UI (ex.: tabela de lançamentos ou modal da semana): “Não contar na semana” / “Contar na semana”.
- [ ] Documentar a flag em `docs/modelagem/database/modelagem-lancamentos.md` (campo `metadados`).
- [ ] Commit + deploy quando o fluxo estiver validado no app.

### Como validar

1. Reiniciar o dev server se estiver rodando (`pnpm dev` em `apps/web`).
2. Abrir `/dashboard/semana?gestao=2&inicio=2026-05-11`.
3. Conferir que os cinco Pix acima **não** aparecem na conferência e que **Saídas corrente** caiu ~R$ 1.332,59 em relação ao total bruto da semana.

---

<!-- Próximas entradas: adicionar acima desta linha, mantendo ordem cronológica inversa. -->
