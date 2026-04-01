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
- copia `._next/static` e `public/` para dentro do standalone
- start sem depender de `pnpm` em runtime
- healthcheck em `/api/health`
- watch paths do monorepo

## Antes do deploy

O app já foi ajustado para deploy self-hosted no Railway:
- `apps/web/next.config.ts` usa `output: "standalone"`
- `apps/web/package.json` inicia com `node .next/standalone/apps/web/server.js`

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
corepack enable && corepack prepare pnpm@10.30.3 --activate && pnpm install --frozen-lockfile && pnpm --filter web build && mkdir -p apps/web/.next/standalone/apps/web/.next && rm -rf apps/web/.next/standalone/apps/web/.next/static apps/web/.next/standalone/apps/web/public && cp -R apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static && cp -R apps/web/public apps/web/.next/standalone/apps/web/public
```

- Start command:
```bash
HOSTNAME=0.0.0.0 node apps/web/.next/standalone/apps/web/server.js
```

## Observacoes

- O app principal usa pacotes compartilhados do workspace em `packages/`.
- Por isso, o deploy correto e pelo monorepo atual, apontando para o serviço `web`, nao para a pasta `backend/`.
- Depois do primeiro deploy, atualize `NEXTAUTH_URL` com o domínio real publicado pelo Railway.

## Validacao local antes de subir

```bash
pnpm lint
pnpm typecheck
pnpm build
```
