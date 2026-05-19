# Lançamento controlado — uso familiar privado

Guia para colocar o LT CashFlow em produção **apenas para Lucas e esposa**, sem abrir como SaaS público. Não substitui `docs/deploy-railway.md` (infra); este doc cobre **prontidão, checklist e operação**.

## Decisão de go-live

**Liberado para uso familiar privado** — “produção da família” — desde que:

1. **Não divulgar a URL** do app.
2. **Não abrir para amigos** nem tratar como SaaS público ainda.

Fase 2 (performance, índices, cache) é **evolução**, não pré-requisito para vocês dois usarem no dia a dia.

## Antes do uso no dia a dia (ordem sugerida)

Faça isto **uma vez** antes de passar a usar o app como rotina:

1. Rodar o [checklist pré-deploy](#checklist-pré-deploy) e validações locais deste guia.
2. Confirmar envs no Railway:
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (domínio final, com `https://`)
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `GROQ_API_KEY` / `GROQ_MODEL` ou `OPENAI_*`, se for usar assistente / quick-add
3. **Backup do MySQL** no Railway (export/snapshot no painel).
4. **Subir deploy** (ver `docs/deploy-railway.md`).
5. Rodar o [smoke test](#checklist-manual-mínimo-smoke-test) em produção.
6. Cadastrar a esposa em `/cadastro` e **vincular** em `gestao_membros` via SQL (seção [Adicionar esposa](#adicionar-esposa-hoje-sem-convite-no-app)).
7. Testar com o usuário dela:
   - abre o dashboard da gestão familiar;
   - cria um lançamento;
   - **não** acessa gestão indevida (`?gestao=` de outra gestão → `acesso-negado`);
   - vê a gestão familiar correta.

Depois disso: uso normal como produção da família.

## Escopo deste lançamento

| Incluído | Fora do escopo (por enquanto) |
|----------|-------------------------------|
| 2 usuários, 1 gestão familiar compartilhada | Cadastro aberto para “qualquer pessoa” |
| Railway + domínio privado | Convites por email no app |
| Isolamento multitenant (Fase 1) testado | Rate limiting forte no app |
| Assistente com Groq/OpenAI (opcional) | Soft delete de lançamentos |
| | Performance/cache Fase 2 |

## O que está pronto

- **App:** `apps/web` (Next.js), deploy via `railway.json`, healthcheck `/api/health`.
- **Segurança Fase 1:** guards por gestão, IDs filhos, logs de negação, leitura com `?gestao=` validado.
- **Testes:** 51 Vitest + 6 E2E (CI com MySQL `lt_cashflow_e2e`); build de produção ok.
- **Auth:** email/senha (NextAuth credentials).
- **Fluxos principais:** dashboard, meses/extrato, lançamentos, cartão/fatura, fechamento semanal, reservas, config, assistente e quick-add.

## O que não está pronto

- **Convites:** tabela existe; **sem UI/API de convite**. Ver seção “Adicionar esposa” abaixo.
- **Rate limiting** no login e APIs de IA (aceitável para 2 usuários conhecidos; revisar antes de abrir para terceiros).
- **Cadastro público** (`/cadastro`) continua aberto — mitigação: não divulgar URL; futuro: desabilitar cadastro ou allowlist.
- **Migrations automatizadas** no deploy — aplicar SQL manualmente quando necessário (`backend/database/migrations/`).
- **Adicionar membro pela UI** — config lista membros, mas não há formulário “convidar”; vínculo manual no banco.

## Variáveis de ambiente (produção)

Configure no serviço **web** do Railway (nunca commitar valores reais):

| Variável | Obrigatória | Notas |
|----------|-------------|--------|
| `DB_HOST` | Sim | Host **público** TCP do MySQL Railway |
| `DB_PORT` | Sim | Geralmente `3306` |
| `DB_USER` | Sim | Do serviço MySQL |
| `DB_PASSWORD` | Sim | Do serviço MySQL |
| `DB_NAME` | Sim | Ex.: `railway` |
| `NEXTAUTH_URL` | Sim | URL **exata** do app, ex. `https://seu-app.up.railway.app` |
| `NEXTAUTH_SECRET` | Sim | ≥ 32 caracteres aleatórios; **novo por ambiente** |
| `GROQ_API_KEY` | Não | Assistente / quick-add (recomendado) |
| `GROQ_MODEL` | Não | Ex.: `llama-3.3-70b-versatile` |
| `OPENAI_API_KEY` | Não | Fallback se não usar Groq |
| `OPENAI_MODEL` | Não | Ex.: `gpt-5-mini` |

**Não definir em produção:** `E2E_ALLOW_SEED`, arquivos `.env.test`, nem rodar `pnpm seed:e2e` (o script recusa `NODE_ENV=production` e `DB_NAME` sem `e2e`/`test`).

Conferir alvo do banco antes de operar:

```bash
pnpm db:check
```

## Checklist pré-deploy

- [ ] `pnpm --filter web test` — 51 testes passando
- [ ] `pnpm --filter web typecheck` — ok
- [ ] `pnpm --filter web lint` — ok
- [ ] `pnpm --filter web build` — ok
- [ ] Backup do MySQL Railway (export/snapshot no painel)
- [ ] `NEXTAUTH_URL` = domínio final publicado
- [ ] `NEXTAUTH_SECRET` forte e exclusivo de produção
- [ ] `DB_*` apontam para o MySQL correto (`pnpm db:check` → `railway: sim`)
- [ ] Migrations pendentes revisadas (se houver, aplicar manualmente — **não** rodar seed E2E)
- [ ] Groq ou OpenAI configurado se quiser assistente
- [ ] Domínio Railway gerado; HTTPS ativo
- [ ] `railway.json` / Config as Code apontando para `/railway.json`

Comandos locais (raiz do monorepo):

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

## Checklist pós-deploy

- [ ] `GET /api/health` retorna `{ "status": "ok" }`
- [ ] Login com usuário Lucas
- [ ] Dashboard carrega gestão familiar correta (`?gestao=` se múltiplas)
- [ ] Esposa consegue login (após cadastro + vínculo em `gestao_membros`)
- [ ] Esposa vê a **mesma** gestão no seletor / URL
- [ ] Tentativa `?gestao=<id-de-outra-gestao>` → `acesso-negado` (se existir segunda gestão de teste)
- [ ] Assistente responde (se API key configurada)
- [ ] Logs Railway sem erro repetido de conexão DB

## Gestão familiar

1. **Criar gestão** (se ainda não existir): onboarding (`/onboarding`) ou “Nova gestão” no dashboard; tipo **familiar** recomendado.
2. **Anotar `gestao_id`:** em Configurações (`/dashboard/config?gestao=ID`) ou `SELECT id, nome FROM gestoes;`.
3. **URL habitual:** `/dashboard?gestao=<id>` (o app lembra a última gestão da lista do usuário).

## Adicionar esposa hoje (sem convite no app)

1. Ela cria conta em **`/cadastro`** (email e senha próprios).
2. Você confirma o usuário no banco:

```sql
SELECT id, nome, email FROM usuarios WHERE email = 'email.dela@exemplo.com';
```

3. Você vincula à gestão familiar (substitua IDs):

```sql
INSERT INTO gestao_membros (gestao_id, usuario_id, papel, status)
VALUES (<GESTAO_ID>, <USUARIO_ID_DELA>, 'editor', 'ativo');
```

Papéis úteis:

| Papel | Uso |
|-------|-----|
| `editor` | Lançar, editar, conciliar (recomendado para cônjuge) |
| `visualizador` | Só leitura |
| `administrador` | Quase tudo + alterar papéis de outros membros (via action existente, sem UI de convite) |

4. Ela entra em `/entrar` e abre `/dashboard?gestao=<GESTAO_ID>`.

**Segurança:** só faça o `INSERT` com credenciais de admin do MySQL; não compartilhe senha do banco.

## Checklist manual mínimo (smoke test)

Faça com **cada** usuário após o vínculo:

| # | Fluxo | Rota / ação | Esperado |
|---|--------|-------------|----------|
| 1 | Login | `/entrar` | Entra no dashboard |
| 2 | Dashboard | `/dashboard?gestao=…` | Saldos e gestão corretos |
| 3 | Extrato / mês | `/dashboard/meses?gestao=…` | Lista lançamentos do mês |
| 4 | Lançamento manual | Botão **+** → lançamento | Cria e aparece no extrato |
| 5 | Assistente rascunho | Botão **+** → assistente / quick-add | Sugestão (salvar se quiser) |
| 6 | Editar lançamento | Tabela no extrato / inline | Salva alteração |
| 7 | Fatura cartão | `/dashboard/cartao?gestao=…` | Fatura e movimentos |
| 8 | Fechamento semanal | `/dashboard/semana?gestao=…` | Métricas; fechar se usarem o fluxo |
| 9 | Reservas | `/dashboard/reservas?gestao=…` | Resumo carrega |
| 10 | Mesma gestão (esposa) | Login dela, mesma `?gestao=` | Mesmos dados (conforme papel) |
| 11 | Gestão errada | `?gestao=<id-que-nao-é-dela>` | Redirect `acesso-negado`, sem vazar dados |

## Cuidados operacionais

- **Não divulgar** URL de cadastro; uso só entre vocês dois até haver convite ou cadastro fechado.
- **Não rodar** `pnpm seed:e2e`, `pnpm db:ci:init` nem `E2E_ALLOW_SEED=1` no Railway.
- **Não commitar** `.env.local`, `.env.test`, dumps SQL com dados reais.
- Planejamento financeiro pessoal detalhado: pasta `pessoal/` (gitignored), não `docs/`.
- Exclusão de lançamento é **definitiva** (hard delete) — cuidado em produção.
- Rotacionar `NEXTAUTH_SECRET` invalida sessões (todos precisam logar de novo).

## Backups

- **Railway:** use backup automático / export do serviço MySQL no painel antes de migrations ou deploys arriscados.
- **Manual periódico:**

```bash
# Com DB_* de producao no ambiente (nao commitar)
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction --routines --triggers "$DB_NAME" > backup-lt-cashflow-$(date +%F).sql
```

Guarde o arquivo **fora** do repositório (criptografado se possível).

## Rollback básico

1. **App:** no Railway, redeploy do deployment anterior estável (histórico de deploys).
2. **Banco:** restaurar dump feito no pré-deploy (somente se migration/deploy corrompeu dados).
3. **Env:** reverter variável alterada (`NEXTAUTH_URL`, `DB_*`) e reiniciar serviço.

Não use `seed:e2e` para “limpar” produção.

## Antes de abrir para amigos / SaaS (travar no mínimo)

Não é necessário para o uso familiar de dois — é **gate** antes de terceiros:

- [ ] `/cadastro` restrito ou convite obrigatório
- [ ] Rate limiting em login e rotas de IA (assistant, search, import)
- [ ] Convite com expiração e aceite no app
- [ ] Backup e **restore testados** (não só export pontual)
- [ ] Soft delete ou política clara de exclusão (se auditoria exigir)
- [ ] Revisão legal/privacidade se houver dados de terceiros

Fase 2 (performance/cache) pode seguir em paralelo; não bloqueia o lançamento familiar privado acima.

## Referências

- Deploy: `docs/deploy-railway.md`
- Multitenant / segurança: `docs/modelagem/architecture/arquitetura-multitenant-seguranca-performance.md`
- E2E e CI: `docs/e2e-multitenant.md`
- Contexto rápido: `docs/contexto-atual.md`
