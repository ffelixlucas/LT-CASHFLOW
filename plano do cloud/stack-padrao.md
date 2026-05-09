# LT CashFlow - Stack e Padroes Oficiais

Status: oficial  
Data de congelamento: 2026-03-31

Este documento define a stack canonica, a arquitetura alvo, os criterios de UX e SEO, as decisoes de infraestrutura e as regras que qualquer IA, dev ou colaborador deve seguir no projeto.

Se houver conflito entre opiniao individual e este documento, este documento vence.

## Objetivos do projeto

O LT CashFlow deve priorizar ao mesmo tempo:

- boa UX em mobile e desktop
- boa indexacao SEO nas paginas publicas
- baixo custo de manutencao
- baixo custo de infraestrutura no inicio
- boa capacidade de reaproveitamento de codigo
- stack moderna, mas com curva de aprendizado racional
- arquitetura que suporte crescimento sem microservicos prematuros

## Decisao principal

O projeto adota um monolito modular em TypeScript, com renderizacao moderna e SEO nativo.

Padrao oficial:

- runtime: `Node.js 20 LTS`
- gerenciador de pacotes: `pnpm`
- linguagem: `TypeScript` em todo o projeto
- framework principal: `Next.js` com `App Router`
- UI e estilo: `Tailwind CSS` + `shadcn/ui`
- banco: `MySQL 8`
- acesso a dados: `Drizzle ORM`
- validacao: `zod`
- autenticacao: `Auth.js`
- email transacional: `Resend` + `React Email`
- armazenamento de arquivos: `Cloudflare R2`
- testes: `Vitest` + `Playwright`

## Por que esta stack

### 1. Next.js em vez de Vite SPA

Padrao oficial: usar `Next.js`.

Motivos:

- entrega SSR, SSG, metadata, sitemap e robots como recursos nativos
- melhora SEO nas paginas publicas
- facilita performance e carregamento inicial
- reduz a necessidade de manter frontend e backend como sistemas separados logo no inicio
- permite route handlers e server actions quando fizer sentido

Regra:

- paginas publicas devem aproveitar renderizacao no servidor e metadata nativa
- area autenticada pode ser dinamica, mas continua dentro da mesma aplicacao

### 2. Tailwind em vez de Bootstrap

Padrao oficial: usar `Tailwind CSS`.

Bootstrap nao sera usado na aplicacao principal.

Motivos:

- queremos uma identidade visual propria, nao uma interface generica
- Tailwind favorece design system com tokens e composicao
- permite componentes altamente customizaveis sem brigar com estilos prontos
- facilita reaproveitamento entre paginas, componentes e futuros produtos

Bootstrap so seria aceitavel em prototipos descartaveis externos ao produto, nunca como base do sistema oficial.

### 3. shadcn/ui em vez de biblioteca fechada de componentes

Padrao oficial: `shadcn/ui` sobre Tailwind.

Motivos:

- os componentes entram no repositorio como codigo editavel
- isso melhora manutencao, customizacao e legibilidade para IA
- a composicao e previsivel e facilita escalar um design system proprio

### 4. Drizzle em vez de ORM pesado

Padrao oficial: `Drizzle ORM`.

Motivos:

- curva mais proxima de SQL, o que ajuda no aprendizado
- tipagem boa sem esconder demais o banco
- leve, rapido e facil de organizar em monorepo
- combina bem com MySQL e com migrations versionadas

Fonte de verdade do banco:

- o schema precisa existir em SQL versionado
- o Drizzle sera usado para tipagem, query builder e migrations controladas

### 5. Auth.js como camada de autenticacao

Padrao oficial: `Auth.js`.

Modos previstos:

- `Credentials` para email e senha
- `Magic Link` por email quando for interessante
- OAuth opcional no futuro

Regra:

- tokens de sessao e autenticacao nao devem ser guardados em `localStorage`
- sessao deve ser baseada em cookies `httpOnly`, `secure` e boas praticas do framework

### 6. Resend + React Email

Padrao oficial para emails:

- envio: `Resend`
- templates: `React Email`

Casos de uso:

- convite para gestao
- recuperacao de acesso
- alertas e notificacoes transacionais
- resumo financeiro opcional

### 7. Cloudflare R2 para arquivos

Padrao oficial:

- anexos, comprovantes e uploads vao para `Cloudflare R2`

Motivos:

- custo egress-friendly para comecar
- API compativel com S3
- bom encaixe para arquivos, recibos e imagens nao criticas

## Arquitetura alvo

### Estrutura oficial do repositorio

```text
apps/
  web/                  # Next.js App Router
  worker/               # opcional, so quando houver necessidade real

packages/
  ui/                   # design system do projeto
  db/                   # schema, cliente Drizzle, migrations e seeds
  validation/           # schemas zod
  auth/                 # auth config e helpers
  email/                # templates React Email
  config/               # eslint, tsconfig, env helpers, constants

docs/
  stack-padrao.md
```

### Monolito modular primeiro

Regra oficial:

- o sistema comeca como monolito modular
- nao quebrar em microservicos no inicio
- separar servicos somente quando existir necessidade operacional real

### Quando separar servicos

Criar `apps/worker` ou outro servico somente se ocorrer ao menos um destes cenarios:

- jobs longos ou pesados de exportacao, importacao ou processamento de arquivos
- filas com retries, webhooks ou tarefas assicronas de alta confiabilidade
- emails em alto volume fora do ciclo de request/resposta
- necessidade de escalar API e frontend de forma independente
- integracao com app mobile ou API publica exigindo fronteira operacional clara

Se nada disso estiver doendo, nao separar.

## UX oficial

### Principios

- mobile first
- desktop premium para dashboards
- acessibilidade minima AA
- carregamento percebido rapido
- formularios claros e com feedback imediato
- filtros, tabelas e graficos precisam priorizar leitura e decisao, nao enfeite

### Regras de interface

- nada de visual generico de template
- nada de interface "bootstrap cara de admin pronto"
- usar tipografia, espacamento, contraste e hierarquia de forma intencional
- todo componente reutilizavel importante deve entrar em `packages/ui`
- componentes visuais nao podem conter regra de negocio

### Estado de frontend

- estado remoto: `TanStack Query`
- formularios: `React Hook Form` + `zod`
- estado global: apenas o minimo necessario, como sessao, gestao ativa e filtros globais

## SEO oficial

### Regras

- paginas publicas devem usar metadata do Next.js
- sitemap e robots devem ser gerados pelo app
- paginas publicas devem ter Open Graph e Twitter cards
- conteudo institucional e landing pages devem ser indexaveis
- paginas autenticadas da area interna devem ser `noindex`

### Escopo de SEO

SEO importa para:

- home
- pagina de produto
- funcionalidades
- planos
- ajuda ou blog, se existirem

SEO nao e prioridade para:

- dashboard logado
- relatorios internos
- configuracoes do usuario

## Banco de dados e modelagem

Padrao oficial:

- banco relacional `MySQL 8`
- modelagem centrada em `gestoes`
- schema SQL versionado
- migrations obrigatorias
- constraints e indices devem ser definidos de forma explicita

Documentos obrigatorios relacionados:

- `backend/database/schema.sql`
- `backend/docs/modelagem-dados.md`

## Observabilidade e auditoria

Padrao oficial:

- logs estruturados obrigatorios
- `requestId` obrigatorio
- auditoria obrigatoria para acoes relevantes

Mesmo com a migracao de stack, os principios de observabilidade definidos em `backend/docs/readme_observabilidade.md` continuam valendo.

## Testes e qualidade

Padrao oficial:

- unitarios e integracao: `Vitest`
- ponta a ponta: `Playwright`
- lint: `ESLint`
- formatacao: `Prettier`

Regras:

- nao aceitar mudanca relevante sem validacao automatizada
- fluxos criticos precisam de E2E: login, criacao de gestao, convite, criacao de lancamento, filtros e resumo

## Infraestrutura oficial

### Stack inicial recomendada

- hospedagem web: `Vercel`
- banco: `MySQL` gerenciado em provedor que suporte SQL padrao e foreign keys
- arquivos: `Cloudflare R2`
- email: `Resend`

### Filosofia de custo

- manter o menor numero de servicos possivel no inicio
- pagar por servico extra so quando ele resolver um problema real
- evitar ferramentas que prendam o projeto em abstracoes caras cedo demais

## Convencoes obrigatorias

### Ferramentas

- usar `pnpm`, nao `yarn`
- usar `TypeScript`, nao criar arquivos novos em JS para codigo de app
- usar `Tailwind`, nao `Bootstrap`
- usar `Drizzle`, nao introduzir ORM concorrente
- usar `Auth.js`, nao criar autenticacao paralela sem justificativa forte

### Padrao de codigo

- modular
- tipado
- validado
- testavel
- sem dependencia ciclica
- sem logica de negocio em componente de UI
- sem SQL espalhado em componentes ou handlers sem camada apropriada

## Decisoes explicitas

### Escolha final entre Tailwind e Bootstrap

Decisao: `Tailwind CSS`.

Bootstrap esta oficialmente rejeitado para o produto principal.

### Escolha final entre monolito e microservicos

Decisao: `monolito modular`.

Microservicos estao oficialmente rejeitados no inicio.

### Escolha final entre SPA simples e app com SEO nativo

Decisao: `Next.js App Router`.

Vite SPA pura nao e mais a arquitetura alvo.

## Roadmap tecnico de migracao

1. migrar o frontend de `frontend/` para `apps/web` com Next.js + TypeScript
2. migrar o backend atual para a estrutura modular da nova stack
3. mover schema e cliente de banco para `packages/db`
4. implementar auth, gestoes e membros
5. implementar contas, categorias e lancamentos
6. implementar convites, metas, notificacoes e auditoria completa
7. adicionar testes E2E dos fluxos criticos

## Leitura obrigatoria para agentes e IAs

Antes de propor ou aplicar mudancas, a IA deve ler:

1. `AGENTS.md`
2. `docs/stack-padrao.md`
3. `backend/docs/modelagem-dados.md`
4. `backend/docs/readme_observabilidade.md`

Nenhuma IA deve:

- trocar a stack oficial sem aprovar uma nova decisao documentada
- introduzir Bootstrap
- introduzir microservicos sem gatilho operacional real
- ignorar SEO nas paginas publicas
- quebrar a modelagem oficial baseada em `gestoes`

## Fontes oficiais consultadas

- Next.js docs: metadata, sitemap, image and font optimization
- Tailwind CSS docs: utility classes e theme-driven styling
- Bootstrap docs: CSS variables e utilitarios
- Auth.js docs: metodos de autenticacao e adapters
- Drizzle docs: SQL-like ORM, migrations e suporte a MySQL
- Resend docs: envio de emails com Node.js
- Cloudflare R2 docs: object storage e compatibilidade de uso
- Playwright docs: testes cross-browser paralelos
