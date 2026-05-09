# Recorrências

## Objetivo

Representar compromissos temporais (assinaturas, salários, parcelamentos) sem poluir manualmente o extrato.

## Modelagem alvo

- Entidade de **regra** (valor, periodicidade, âncora, conta padrão, categoria).
- Materialização opcional de ocorrências futuras (preview) vs geração na liquidação.

## Edge cases

- Feriados e fins de semana para débito automático.
- Reajustes e IPCA (futuro): versões da regra com vigência.

## UX

- Usuário deve distinguir claramente **previsto** vs **confirmado**.
