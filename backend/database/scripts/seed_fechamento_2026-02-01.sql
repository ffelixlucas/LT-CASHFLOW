-- Lançamentos do fechamento semanal Seg 26/01 → Dom 01/02/2026
-- Conta corrente: Banco Inter Lucas (id=1), Reserva 1 Porquinho (id=3), Reserva 2 Porq Obj (id=4)
-- gestao_id=2, criado_por_usuario_id=1
-- Idempotente: usa origem_externa = 'fechamento_2026-02-01' para detectar reinsercoes

START TRANSACTION;

INSERT INTO lancamentos
  (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id,
   tipo, status, meio, descricao, valor_total,
   competencia_data, fatura_competencia_data, liquidado_em, origem_externa)
VALUES
  -- Aplicações no CDB Porq Obj (Conta corrente -> Reserva 2)
  (2, 1, 4, NULL, 1, 'transferencia', 'liquidado', 'transferencia',
   'Aplicação - Cdb Porq Obj Banco Inter S A', 836.00,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),
  (2, 1, 4, NULL, 1, 'transferencia', 'liquidado', 'transferencia',
   'Aplicação - Cdb Porq Obj Banco Inter S A', 1.00,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),

  -- Resgates do CDB Porquinho (Reserva 1 -> Conta corrente)
  (2, 3, 1, NULL, 1, 'transferencia', 'liquidado', 'transferencia',
   'Resgate - Cdb Porquinho Banco Inter S A', 145.11,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),
  (2, 3, 1, NULL, 1, 'transferencia', 'liquidado', 'transferencia',
   'Resgate - Cdb Porquinho Banco Inter S A', 521.17,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),
  (2, 3, 1, NULL, 1, 'transferencia', 'liquidado', 'transferencia',
   'Resgate - Cdb Porquinho Banco Inter S A', 105.62,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),
  (2, 3, 1, NULL, 1, 'transferencia', 'liquidado', 'transferencia',
   'Resgate - Cdb Porquinho Banco Inter S A', 65.11,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),
  (2, 3, 1, NULL, 1, 'transferencia', 'liquidado', 'transferencia',
   'Resgate - Cdb Porquinho Banco Inter S A', 117.33,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),

  -- Despesas
  (2, 1, NULL, 3, 1, 'despesa', 'liquidado', 'pix',
   'Pix enviado - Copeldis', 313.13,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),
  (2, 1, NULL, 10, 1, 'despesa', 'liquidado', 'pix',
   'Pix enviado - Receita Federal', 87.05,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),
  (2, 1, NULL, 8, 1, 'despesa', 'liquidado', 'transferencia',
   'Pagamento efetuado - Fatura Cartão Inter', 1630.58,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),

  -- Receitas (Pix recebido do Domingo 01/02)
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 73.88,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 73.88,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',
   'Pix recebido - 63.156.552 Lucas Fanha Felix', 92.63,
   '2026-02-01', '2026-02-01', NOW(), 'fechamento_2026-02-01');

COMMIT;
