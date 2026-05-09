# Backend — estrutura ideal (no monólito Next)

Pastas ilustrativas dentro de `apps/web/src` (e pacotes compartilhados).

```
apps/web/src/
├── app/api/                     # route handlers (REST/stream)
├── app/dashboard/actions.ts     # server actions (coexistência gradual)
└── lib/server/
    ├── auth/
    ├── repository/              # acesso dados por domínio
    ├── services/                # casos de uso (application layer)
    ├── finance/                 # motor determinístico
    └── integrations/            # parsers extrato, email

packages/
├── validation/                  # zod schemas compartilhados
├── db/                          # Drizzle schemas/migrations (evolução)
└── finance-core/                # (futuro) funções puras + testes
```

## Services

Orquestram fluxos: validam entrada, chamam repositories, aplicam políticas de permissão, emitem eventos/logs.

## Repositories

Somente SQL/ORM; sem regra de negócio complexa; retornam tipos estáveis consumidos por services.

## Financial engine

Funções puras para agregações e invariantes; testadas isoladamente.

## Observações sobre `backend/` legado

Novos endpoints não devem proliferar no Express legado; convergência para Next conforme `docs/modelagem/architecture/backend.md`.
