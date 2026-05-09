# Arquitetura backend

## Estado atual e alvo

O produto evolui como **aplicação Next.js fullstack** com dados em **MySQL**. A pasta `backend/` legado não é alvo de novas features; novos fluxos devem seguir o monólito modular documentado em [`../stack-padrao.md`](../../stack-padrao.md).

## Camadas lógicas

| Camada | Papel |
|--------|--------|
| **Transport** | Route handlers (`app/api`), server actions |
| **Validation** | schemas zod (`packages/validation`) |
| **Application services** | orquestração de caso de uso |
| **Repositories** | SQL parametrizado / Drizzle queries |
| **Domain helpers** | motor financeiro puro onde possível |

## Contratos

- Erros com **código estável** + mensagem humana + detalhes opcionais em dev.
- Autenticação via **Auth.js**; escopo sempre filtrado por **gestão ativa** e membership.

## Integrações externas

- Importação de extrato, email transacional (Resend), storage (R2) conforme stack oficial.
