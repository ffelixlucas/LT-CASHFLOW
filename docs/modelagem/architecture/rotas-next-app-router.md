# Arquitetura de rotas (Next.js App Router)

## Organização recomendada

```
apps/web/src/app/
├── (marketing)/...
├── (auth)/...
├── dashboard/
│   ├── layout.tsx          # shell autenticado
│   ├── page.tsx            # snapshot
│   ├── extrato/page.tsx
│   ├── contas/page.tsx
│   └── ...
└── api/
    ├── assistant/...
    └── reconciliacao/...
```

## Convenções

- `layout.tsx` define shell e providers locais.
- `loading.tsx` e `error.tsx` por segmento quando UX crítica.
- Rotas `api/` apenas quando necessário (streaming, webhooks, clients externos).

## Coerência com UX

Árvore conceitual em [`../ux/estrutura-paginas-layouts-navegacao.md`](../ux/estrutura-paginas-layouts-navegacao.md).
