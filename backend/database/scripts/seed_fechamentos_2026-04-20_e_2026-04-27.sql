-- Fechamentos historicos das semanas 20-26/04/2026 e 27/04-03/05/2026.
-- Os dois fechamentos foram feitos JUNTOS em 06/05/2026 no Inter:
--   * Reserva 10% aplicada uma vez so: R$ 553,36 (id 972) = 332,29 + 221,07.
--   * Faturas pagas no mesmo dia: R$ 1.474,28 (id 971) + R$ 1.063,63 (id 974) = R$ 2.537,91.
-- Por isso ambos sao "apenas_snapshot": nao criam novo lancamento,
-- so registram o snapshot historico no fechamentos_periodo.

INSERT INTO fechamentos_periodo (
  gestao_id, tipo, periodo_inicio, periodo_fim,
  fechado_em, fechado_por_usuario_id,
  entradas, saidas_corrente, compras_cartao, sobra,
  reservado, pagamento_fatura, ajuste_dia_a_dia_tipo, ajuste_dia_a_dia_valor, apenas_snapshot,
  lancamento_reserva_id, observacoes
) VALUES
-- Semana 20/04 a 26/04 (segunda a domingo)
(2, 'semanal', '2026-04-20', '2026-04-26',
 '2026-05-06 18:50:00', 1,
 3322.90, 1100.03, 468.79, 2222.87,
 332.29, 1474.28, 'aporte', 1421.79, 1,
 NULL,
 'Fechamento conjunto feito em 06/05/2026. Reserva 10% aplicada em conjunto com a semana seguinte (aporte de R$ 553,36 em 06/05, lancamento id 972). Fatura associada: R$ 1.474,28 (id 971). Resto no fim do PDF: R$ 1.421,79 (entradas - debito - credito - 10%).'),

-- Semana 27/04 a 03/05 (segunda a domingo)
(2, 'semanal', '2026-04-27', '2026-05-03',
 '2026-05-06 18:51:00', 1,
 2210.67, 1113.59, 1814.34, 1097.08,
 221.07, 1063.63, 'resgate', 938.33, 1,
 972,
 'Fechamento conjunto feito em 06/05/2026. Reserva 10% acumulada: R$ 553,36 = 332,29 (20-26/04) + 221,07 (27/04-03/05), lancamento id 972. Fatura associada: R$ 1.063,63 (id 974). Resto no fim do PDF: -R$ 938,33.')

ON DUPLICATE KEY UPDATE
  periodo_fim = VALUES(periodo_fim),
  fechado_em = VALUES(fechado_em),
  fechado_por_usuario_id = VALUES(fechado_por_usuario_id),
  entradas = VALUES(entradas),
  saidas_corrente = VALUES(saidas_corrente),
  compras_cartao = VALUES(compras_cartao),
  sobra = VALUES(sobra),
  reservado = VALUES(reservado),
  pagamento_fatura = VALUES(pagamento_fatura),
  ajuste_dia_a_dia_tipo = VALUES(ajuste_dia_a_dia_tipo),
  ajuste_dia_a_dia_valor = VALUES(ajuste_dia_a_dia_valor),
  apenas_snapshot = VALUES(apenas_snapshot),
  lancamento_reserva_id = VALUES(lancamento_reserva_id),
  observacoes = VALUES(observacoes);
