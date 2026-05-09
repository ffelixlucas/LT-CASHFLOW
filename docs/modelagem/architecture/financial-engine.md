# Financial engine (motor financeiro)

Objetivo: concentrar regras **determinísticas** de cálculo para evitar divergência entre telas.

## Escopo

- Derivação de saldos a partir de `saldo_inicial` + lançamentos liquidados.
- Agregações por bucket (disponível, poupança, investimento, cartão).
- Regras de competência vs caixa quando ambos coexistirem na UI.
- Prevenção de dupla contagem em fluxos cartão ↔ corrente.

## Princípios

1. **Funções puras** quando possível: entrada = conjunto de lançamentos filtrados + parâmetros.
2. **Testes unitários** obrigatórios para novas regras de agregação.
3. **Documentação espelhada** em `docs/modelagem/database/` para qualquer nova métrica exposta ao usuário.

## Local sugerido no monorepo

- Pacote `packages/finance-core` (futuro) ou módulo `lib/server/finance/` até extração.

## Relação com IA

IA **não** recalcula saldo autoritativo; apenas interpreta outputs já calculados ou propõe lançamentos para confirmação (`docs/assistente-ia.md`).
