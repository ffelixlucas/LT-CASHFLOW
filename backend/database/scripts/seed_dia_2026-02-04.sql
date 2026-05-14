-- Dia 04/02/2026 - Banco Inter Lucas (1)
-- gestao_id=2, criado_por_usuario_id=1
-- origem_externa = dia_2026-02-04

START TRANSACTION;

INSERT INTO lancamentos
  (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id,
   tipo, status, meio, descricao, valor_total,
   competencia_data, fatura_competencia_data, liquidado_em, origem_externa)
VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - Flavio Lucas Buzzi', 50.00,
   '2026-02-04', '2026-02-04', NOW(), 'dia_2026-02-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45,
   '2026-02-04', '2026-02-04', NOW(), 'dia_2026-02-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45,
   '2026-02-04', '2026-02-04', NOW(), 'dia_2026-02-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45,
   '2026-02-04', '2026-02-04', NOW(), 'dia_2026-02-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 95.02,
   '2026-02-04', '2026-02-04', NOW(), 'dia_2026-02-04');

COMMIT;
