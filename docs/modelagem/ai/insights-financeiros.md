# Sistema de insights financeiros

## Tipos

1. **Descritivos:** “Seu maior bucket este mês foi moradia.”
2. **Comparativos:** “+12% vs média dos últimos 3 meses.”
3. **Preditivos leves:** “Com este ritmo, a meta X atrasa ~N dias.” (sempre com disclaimers)
4. **Operacionais:** “Três lançamentos parecem duplicados.”

## Pipeline

Dados agregados → motor determinístico → NL opcional para wording calmante (`docs/modelagem/ux/filosofia-ux-ltcashflow.md`).

## Qualidade

- Insight deve carregar **evidência mínima** (links para lançamentos filtrados).
- Permitir **descarte** pelo usuário para melhorar ranking futuro.

## Anti-padrões

Insights que moralizam gastos ou geram alarmismo sem ação clara.
