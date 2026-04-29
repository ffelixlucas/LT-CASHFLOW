# LT CashFlow

Sistema financeiro pessoal/familiar para controle de extratos, saldo, categorias, origem de lançamentos, conciliação e importação de dados.

## Objetivo

Organizar o fluxo financeiro em uma interface web com foco em clareza, rastreabilidade e controle de lançamentos.

## Funcionalidades

- Cadastro e listagem de transações
- Organização por categorias e origens
- Controle de saldo e extrato
- Importação e tratamento de dados financeiros
- Validações compartilhadas entre módulos
- Estrutura em monorepo para separar aplicação, banco e contratos

## Stack

- Next.js
- TypeScript
- Drizzle ORM
- NextAuth
- Zod
- pnpm workspaces

## Estrutura

```text
.
├── apps/web/              # Aplicação web principal
├── packages/db/           # Camada de banco e migrations
├── packages/validation/   # Schemas e validações compartilhadas
├── docs/                  # Documentação do produto e decisões técnicas
└── package.json
```

## Como rodar localmente

```bash
pnpm install
pnpm dev
```

Comandos úteis:

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:migrate
```

> Configure as variáveis de ambiente localmente antes de rodar banco, autenticação e integrações.

## Status

Projeto em desenvolvimento ativo.
