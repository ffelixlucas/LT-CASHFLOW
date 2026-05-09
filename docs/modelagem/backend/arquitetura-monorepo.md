# Arquitetura Monorepo

## Stack principal

- Next.js 16 App Router
- TypeScript
- pnpm workspaces
- MySQL
- Drizzle ORM
- TailwindCSS
- shadcn/ui
- Zod

## Estrutura principal

```txt
apps/
  web/

packages/
  db/
  validation/
```

## Objetivo arquitetural

Centralizar frontend, backend e dominio financeiro em um monolito modular organizado.

## Decisoes arquiteturais

- evitar microservicos prematuros
- separar dominio financeiro em modulos
- manter regras financeiras centralizadas
- usar App Router como foundation fullstack
- compartilhar schemas via packages

## Beneficios

- velocidade de desenvolvimento
- menor complexidade operacional
- melhor coerencia entre frontend/backend
- facilidade para IA entender o projeto
- manutencao simplificada

## Foundation futura

A arquitetura foi preparada para:

- RAG interno
- agentes IA
- semantic search
- copiloto financeiro
- reconciliacao automatica
- insights financeiros
