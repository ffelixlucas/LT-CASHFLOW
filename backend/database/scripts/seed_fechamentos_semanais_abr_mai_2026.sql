-- Mapeamento histórico dos fechamentos semanais ja realizados fora do LT-CashFlow.
-- Ambos foram fechados de fato no dia 06/05/2026 (atrasado), por isso o movimento
-- real no extrato esta agrupado:
--   * Reserva 10% aplicada em 06/05: R$ 553,36 = 332,29 + 221,07
--   * Faturas pagas em 06/05: R$ 1.474,28 + R$ 1.063,63 = R$ 2.537,91
-- Usamos apenas_snapshot=1 para nao criar nova transferencia/duplicar movimentos.
-- Idempotente: se rodar de novo, o ON DUPLICATE KEY UPDATE refaz os campos do snapshot.

SET @gestao := (SELECT id FROM gestoes WHERE nome = 'Lucas' LIMIT 1);
SET @usuario := (
  SELECT m.usuario_id FROM gestao_membros m
  WHERE m.gestao_id = @gestao AND m.papel = 'proprietario'
  ORDER BY m.id LIMIT 1
);

-- Semana 20/04 a 26/04 (10% guardado no fechamento de 06/05 junto da semana seguinte).
INSERT INTO fechamentos_periodo (
  gestao_id, tipo, periodo_inicio, periodo_fim,
  fechado_em, fechado_por_usuario_id,
  entradas, saidas_corrente, compras_cartao, sobra,
  reservado, pagamento_fatura, ajuste_dia_a_dia_tipo, ajuste_dia_a_dia_valor, apenas_snapshot,
  lancamento_reserva_id, observacoes
) VALUES (
  @gestao, 'semanal', '2026-04-20', '2026-04-26',
  '2026-05-06 22:00:00', @usuario,
  3322.90, 1100.03, 468.79, 2222.87,
  332.29, 1474.28, 'aporte', 1421.79, 1,
  NULL,
  'Fechamento historico (PDF). Aplicado de fato em 06/05/2026 junto da semana seguinte: aporte 10% R$ 553,36 = 332,29 + 221,07; faturas 1.474,28 + 1.063,63.'
)
ON DUPLICATE KEY UPDATE
  entradas = VALUES(entradas),
  saidas_corrente = VALUES(saidas_corrente),
  compras_cartao = VALUES(compras_cartao),
  sobra = VALUES(sobra),
  reservado = VALUES(reservado),
  pagamento_fatura = VALUES(pagamento_fatura),
  ajuste_dia_a_dia_tipo = VALUES(ajuste_dia_a_dia_tipo),
  ajuste_dia_a_dia_valor = VALUES(ajuste_dia_a_dia_valor),
  apenas_snapshot = VALUES(apenas_snapshot),
  fechado_em = VALUES(fechado_em),
  fechado_por_usuario_id = VALUES(fechado_por_usuario_id),
  observacoes = VALUES(observacoes);

-- Semana 27/04 a 03/05 (fechada junto da anterior em 06/05).
INSERT INTO fechamentos_periodo (
  gestao_id, tipo, periodo_inicio, periodo_fim,
  fechado_em, fechado_por_usuario_id,
  entradas, saidas_corrente, compras_cartao, sobra,
  reservado, pagamento_fatura, ajuste_dia_a_dia_tipo, ajuste_dia_a_dia_valor, apenas_snapshot,
  lancamento_reserva_id, observacoes
) VALUES (
  @gestao, 'semanal', '2026-04-27', '2026-05-03',
  '2026-05-06 22:00:00', @usuario,
  2210.67, 1113.59, 1814.34, 1097.08,
  221.07, 1063.63, 'resgate', 938.33, 1,
  NULL,
  'Fechamento historico (PDF). Aplicado de fato em 06/05/2026 junto da semana anterior.'
)
ON DUPLICATE KEY UPDATE
  entradas = VALUES(entradas),
  saidas_corrente = VALUES(saidas_corrente),
  compras_cartao = VALUES(compras_cartao),
  sobra = VALUES(sobra),
  reservado = VALUES(reservado),
  pagamento_fatura = VALUES(pagamento_fatura),
  ajuste_dia_a_dia_tipo = VALUES(ajuste_dia_a_dia_tipo),
  ajuste_dia_a_dia_valor = VALUES(ajuste_dia_a_dia_valor),
  apenas_snapshot = VALUES(apenas_snapshot),
  fechado_em = VALUES(fechado_em),
  fechado_por_usuario_id = VALUES(fechado_por_usuario_id),
  observacoes = VALUES(observacoes);
