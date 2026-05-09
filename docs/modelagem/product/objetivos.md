# Objetivos

## Objetivos estratégicos

1. **Clareza antes de volume:** priorizar compreensão sobre quantidade de métricas exibidas.
2. **Confiança nos dados:** extrato e conciliação são cidadãos de primeira classe.
3. **Uso recorrente calmante:** experiência que reduz ansiedade e não a amplifica com alarmismo visual.
4. **Escalabilidade humana:** suportar famílias e pequenas estruturas compartilhadas sem complexidade de ERP.

## Objetivos de produto (12–18 meses)

- Consolidar **modelo mental único** para cartão vs conta corrente, poupança/objetivos e investimentos.
- Padronizar **narrativas** (“disponível”, “comprometido”, “provisionado”) com definições documentadas em `docs/modelagem/database/`.
- Entregar **insights acionáveis** com linguagem natural + confirmação, conforme `docs/assistente-ia.md`.

## Objetivos de engenharia

- Monólito modular TypeScript com fronteiras claras (`docs/modelagem/architecture/`, `docs/modelagem/codebase/`).
- Contratos de dados com validação (`zod`) e migrações disciplinadas (`docs/modelagem/database/`).
- Observabilidade mínima madura: logs estruturados, métricas de erro e funil de valor (`docs/modelagem/observability/`).

## Objetivos explícitos de não-fazer (guardrails)

- Não adicionar telas que só duplicam planilha sem nova compreensão.
- Não criar novas agregações financeiras sem especificar **fonte**, **janela temporal** e **regra de liquidação**.
