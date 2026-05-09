# Modelagem de transações (lançamentos)

## Entidade central

`lancamentos` representa movimentações financeiras com tipo (`receita`, `despesa`, `transferencia`, `ajuste`), conta de origem/destino, valores, datas de competência e liquidação conforme schema.

## Campos conceituais críticos

- **Competência:** quando o gasto/receita “vale” no orçamento mental.
- **Liquidação / caixa:** quando o dinheiro efetivamente move — pode coincidir ou não com competência.
- **Meio:** pix, débito, crédito… afeta relatórios operacionais.
- **Status:** previsto vs confirmado vs conciliado (detalhar conforme enum real no schema).

## Transferências

Devem gerar par consistente ou registro único com duas pernas conforme decisão implementada — documentar aqui quando estabilizar para evitar UX enganosa.

## Integridade UX

Toda tela que mostra “gasto do mês” declara se usa competência ou caixa.

## Relação com extrato

Importações marcam `origem_externa` para rastrear linhas reconciliadas.
