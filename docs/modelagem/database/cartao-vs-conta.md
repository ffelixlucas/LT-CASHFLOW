# Cartão vs conta corrente

## Problema humano

Usuários confundem **limite**, **fatura**, **pagamento** e **saldo em conta**. O sistema deve ensinar o modelo, não punir.

## Modelo mental oficial (working)

- Compras no cartão geram lançamentos na conta `cartao_credito`.
- Pagamento da fatura é movimento na **corrente** e pode refletir como liquidação na visão de cartão.

## Armadilhas

- **Dupla contagem** se uma compra aparecer como despesa na corrente e no cartão sem vínculo explícito.
- Totais “gasto do mês” devem escolher **uma lens** por vez (competência na fatura vs caixa na corrente).

## UX

Telas de cartão devem sempre mostrar **três linhas mentais**: gastos da fatura, pagamentos, saldo devedor/remanescente — labels validados com usuários.

## Engenharia

Qualquer nova métrica que misture domínios exige revisão cruzada entre `financial-engine.md` e esta página.
