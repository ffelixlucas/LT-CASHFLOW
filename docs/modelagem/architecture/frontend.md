# Arquitetura frontend

## Stack canônica

Ver [`../stack-padrao.md`](../../stack-padrao.md): **Next.js App Router**, Tailwind, shadcn/ui.

## Camadas sugeridas

1. **app/** — rotas, layouts, loading/error boundaries.
2. **features/** — casos de uso verticais (extrato, contas, metas).
3. **widgets/** — composição reutilizável com narrativa (snapshot, gráficos).
4. **components/ui/** — primitivos shadcn + wrappers.
5. **lib/** — clients HTTP, formatadores, helpers puros.

## Direções

- Preferir **Server Components** onde não há interatividade; hidratar só ilhas.
- **Server Actions / route handlers** para mutações com validação zod espelhada no cliente.
- **TanStack Query** para cache client onde há staleness e invalidação explícita.

## Anti-padrões

- Lógica financeira duplicada sem teste — extrair para pacotes compartilhados quando estabilizar (`packages/validation`).
