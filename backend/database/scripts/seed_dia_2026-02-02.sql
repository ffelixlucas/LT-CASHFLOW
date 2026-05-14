-- Lançamentos do dia segunda-feira 02/02/2026 - Banco Inter Lucas (id=1)
-- gestao_id=2, criado_por_usuario_id=1
-- Idempotente via origem_externa = 'dia_2026-02-02'

START TRANSACTION;

INSERT INTO lancamentos
  (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id,
   tipo, status, meio, descricao, valor_total,
   competencia_data, fatura_competencia_data, liquidado_em, origem_externa)
VALUES
  -- Despesas
  (2, 1, NULL, 8, 1, 'despesa', 'liquidado', 'transferencia',
   'Pagamento efetuado - Fatura Cartão Inter', 134.80,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',
   'Pix enviado - Ricardo Morais Felix', 345.25,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 8, 1, 'despesa', 'liquidado', 'transferencia',
   'Pagamento efetuado - Fatura Cartão Inter', 452.61,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 4, 1, 'despesa', 'liquidado', 'debito',
   'Compra no débito - Supermercado Planta Ca Pinhais Bra', 23.28,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  -- Receitas (Pix recebidos)
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 92.63,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 92.63,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 92.63,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 92.63,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 92.63,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 54.02,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 54.58,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02'),

  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 14.53,
   '2026-02-02', '2026-02-02', NOW(), 'dia_2026-02-02');

COMMIT;
