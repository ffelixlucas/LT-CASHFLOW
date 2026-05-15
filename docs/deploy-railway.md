# Deploy no Railway

O serviço certo para produção hoje é o app Next em `apps/web`.

Nao suba o `backend/` legado. O produto atual roda como app fullstack em Next.js:
- interface em `apps/web/src/app`
- rotas de API em `apps/web/src/app/api`
- server actions em `apps/web/src/app/dashboard/actions.ts`

## O que subir

- App: `apps/web`
- Banco: `MySQL` no Railway

## Config as Code

O repositório já tem um arquivo pronto:
- [railway.json](/home/lucas/Documentos/Projetos/LT-CashFlow/railway.json)

No Railway, em `Railway Config File`, use:

```text
/railway.json
```

Isso aplica:
- builder `Railpack`
- build com `corepack + pnpm`
- start com `next start` direto no app `apps/web`
- healthcheck em `/api/health`
- watch paths do monorepo

## Antes do deploy

O app já foi ajustado para deploy self-hosted no Railway:
- `apps/web/next.config.ts` transpila os pacotes compartilhados do workspace
- o Railway usa `next start` direto no app `apps/web`

## Fluxo recomendado

1. Crie um projeto novo no Railway.
2. Adicione um serviço `MySQL`.
3. Adicione um serviço a partir do repositório `LT-CASHFLOW`.
4. No import do monorepo, selecione o app `web` como serviço principal.
5. Gere um domínio público para o serviço web.
6. Configure as variáveis de ambiente no serviço web.

## Variaveis de ambiente

Use estas variáveis no serviço `web`:

```env
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=lt_cashflow
NEXTAUTH_URL=https://seu-dominio-no-railway
NEXTAUTH_SECRET=gere-um-segredo-forte
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

## Como mapear o MySQL

No Railway, conecte as credenciais do serviço MySQL ao serviço `web`:
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

## Comandos esperados

Se você preferir configurar manualmente no painel, use:

- Build command:
```bash
corepack enable && corepack prepare pnpm@10.30.3 --activate && pnpm install --frozen-lockfile && pnpm --filter web build
```

- Start command:
```bash
PORT=${PORT:-3000} node apps/web/node_modules/next/dist/bin/next start apps/web -H 0.0.0.0 -p ${PORT:-3000}
```

## Observacoes

- O app principal usa pacotes compartilhados do workspace em `packages/`.
- Por isso, o deploy correto e pelo monorepo atual, apontando para o serviço `web`, nao para a pasta `backend/`.
- Depois do primeiro deploy, atualize `NEXTAUTH_URL` com o domínio real publicado pelo Railway.

## Banco unico (dev + producao)

O app Next (`apps/web`) le `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` de `apps/web/.env.local`.

**Producao (Railway):** essas variaveis vêm do servico MySQL ligado ao servico `web` no painel.

**Desenvolvimento:** se `DB_HOST=localhost`, voce usa um MySQL **na maquina**, separado do Railway. Os dados ficam diferentes — e isso explica divergencia entre `localhost:3000` e o site em producao.

Padrao recomendado: copiar as mesmas variaveis `DB_*` do MySQL do Railway para `apps/web/.env.local` (host publico TCP, nao o host interno `*.railway.internal`).

Conferir o alvo atual:

```bash
pnpm db:check
```

Deve mostrar `railway: sim` e as mesmas contagens que voce espera em producao.

### Migrar dados locais para o Railway

Use quando o banco local tiver dados que ainda nao estao no Railway (faca backup do Railway antes).

1. No painel Railway, exporte/backup do MySQL de producao (opcional mas recomendado).
2. Com `apps/web/.env.local` ainda apontando para **localhost**, gere o dump:

```bash
source apps/web/.env.local
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction --routines --triggers "$DB_NAME" > /tmp/lt_cashflow_local.sql
```

3. Troque `DB_*` em `.env.local` para as credenciais **publicas** do MySQL no Railway.
4. Rode as migrations pendentes no Railway, se houver (`backend/database/migrations/`).
5. Importe (ajuste usuario/host conforme o Railway):

```bash
source apps/web/.env.local
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < /tmp/lt_cashflow_local.sql
```

6. `pnpm db:check` de novo e reinicie `pnpm dev`.

**Atencao:** `NEXTAUTH_SECRET` pode ser diferente entre ambientes; isso afeta sessao, nao os lancamentos. `NEXTAUTH_URL` no local deve continuar `http://localhost:3000`.

## Validacao local antes de subir

```bash
pnpm db:check
pnpm lint
pnpm typecheck
pnpm build
```
