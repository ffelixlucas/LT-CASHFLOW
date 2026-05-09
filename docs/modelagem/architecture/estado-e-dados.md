# Arquitetura de estados e dados

## Fontes de verdade

1. **Servidor / DB** para saldos derivados e lançamentos.
2. **Cliente** mantém apenas estado de UI e caches com política explícita.

## Server state

- TanStack Query para dados remotos com chaves namespaced por `gestaoId`, entidade e filtros.
- Invalidação após mutações bem-sucedidas (lista + detalhe + agregações relacionadas).

## Form state

- React Hook Form + zod resolver para formulários densos.
- Valores monetários como string controlada ou bigint decimal encapsulado — decisão única por codebase.

## Estado global mínimo

- Gestão ativa, preferências de UI (densidade, tema), feature flags leves.

## URL como estado

Filtros compartilháveis (período, conta, categoria) devem vivenciar na query string quando melhorar colaboração e bookmark.

## Realtime

Futuro opcional (notificações); até lá, polling estratégico ou refetch on focus.
