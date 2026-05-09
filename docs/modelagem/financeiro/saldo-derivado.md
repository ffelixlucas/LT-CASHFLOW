# Saldo Derivado

## Conceito

O LTCashFlow nunca deve persistir saldo consolidado da gestão.

Todo saldo deve ser derivado dos lançamentos válidos.

---

## Objetivos

- evitar drift financeiro
- evitar corrupção de saldo
- garantir rastreabilidade
- manter consistência

---

## O que afeta saldo

- receitas liquidadas
- despesas liquidadas
- transferências
- ajustes

---

## O que NÃO afeta saldo

- lançamentos cancelados
- lançamentos pendentes sem regra de competência

---

## Filosofia

O extrato é a verdade.

Saldo é consequência do extrato.
