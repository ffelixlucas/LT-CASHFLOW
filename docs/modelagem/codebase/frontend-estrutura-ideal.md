# Frontend — estrutura ideal de pastas

Base: **Next.js App Router** em `apps/web/src`.

```
apps/web/src/
├── app/                         # rotas, layouts, metadata
│   ├── (marketing)/
│   ├── (auth)/
│   ├── dashboard/
│   └── api/
├── components/
│   ├── ui/                      # shadcn + wrappers
│   └── system/                  # navegação, breadcrumbs
├── features/
│   ├── ledger/                  # extrato, lançamentos
│   ├── accounts/                # contas, buckets
│   ├── cards/                   # fatura / cartão
│   ├── goals/
│   ├── categories/
│   └── assistant/               # UI do copiloto
├── widgets/
│   ├── snapshot/
│   ├── charts/
│   └── reconciliation/
├── hooks/
│   ├── use-gestao-ativa.ts
│   ├── use-periodo-financeiro.ts
│   └── queries/                 # tanstack keys/helpers
├── lib/
│   ├── api-client.ts
│   ├── format/
│   └── constants.ts
└── styles/
```

## Contextos

Preferir **providers mínimos** em `app/layout.tsx` ou layouts segmentados:

- `GestaoProvider`
- `PeriodoProvider`
- `ThemeProvider`

Evitar context profundo para dados remotos — TanStack Query cobre isso melhor.

## Layouts

- `app/dashboard/layout.tsx` — shell autenticado + navegação.
- Layouts aninhados por feature quando filtros compartilhados forem pesados.

## Pages vs features

- `page.tsx` só **compõe** widgets/features e faz fetch inicial quando adequado.
- Lógica de domínio na camada `features/*/services` + hooks.

## Componentização

Regra prática: se aparece em 3+ telas com variações pequenas → sobe para `widgets/` ou `components/system`.
