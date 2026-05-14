-- Dia 05/02/2026 - Banco Inter Lucas (1)
-- gestao_id=2, criado_por_usuario_id=1
-- origem_externa = dia_2026-02-05

START TRANSACTION;

INSERT INTO lancamentos
  (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id,
   tipo, status, meio, descricao, valor_total,
   competencia_data, fatura_competencia_data, liquidado_em, origem_externa)
VALUES
  -- Pix enviados pra Marcelo Oliveira Palma (sem categoria espec\u00edfica -> Outros)
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',
   'Pix enviado - Marcelo Oliveira Palma', 0.01,
   '2026-02-05', '2026-02-05', NOW(), 'dia_2026-02-05'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',
   'Pix enviado - Marcelo Oliveira Palma', 0.01,
   '2026-02-05', '2026-02-05', NOW(), 'dia_2026-02-05'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',
   'Pix enviado - Marcelo Oliveira Palma', 0.10,
   '2026-02-05', '2026-02-05', NOW(), 'dia_2026-02-05'),

  -- Pix recebidos
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45,
   '2026-02-05', '2026-02-05', NOW(), 'dia_2026-02-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95,
   '2026-02-05', '2026-02-05', NOW(), 'dia_2026-02-05');

COMMIT;
