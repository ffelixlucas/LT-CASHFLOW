-- Lote de lançamentos: 06/02/2026 a 28/02/2026 (sem 15/02 - sem movimento)
-- Banco Inter Lucas (1), Reserva 1 Porquinho (3), Reserva 2 Porq Obj (4)
-- gestao_id=2, criado_por_usuario_id=1
-- Categorias: 1=Renda, 4=Alimentacao, 5=Transporte, 8=Saida da conta, 9=Outros, 12=Assinaturas
-- Idempotente: origem_externa = dia_2026-MM-DD

START TRANSACTION;

-- ============================================================
-- 06/02/2026 (sex)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'debito',        'Compra no débito - Andreogabriel Almirante Tam Bra',   5.00, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',         47.01, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'debito',        'Compra no débito - Grm Curitiba Bra',                  4.00, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',         86.45, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',         86.45, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  4, 1, 'despesa', 'liquidado', 'pix',           'Pix enviado - Valdecir Aparecido Moreira Pizzaria',   44.90, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',           'Pix enviado - Tayler Goncalves',                      48.40, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',         86.45, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',         68.95, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',         68.95, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',         86.45, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06'),
  (2, 1, NULL, 12, 1, 'despesa', 'liquidado', 'debito',        'Compra no débito - Netflix Entretenimento Barueri Bra', 20.90, '2026-02-06', '2026-02-06', NOW(), 'dia_2026-02-06');

-- ============================================================
-- 07/02/2026 (sab)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-02-07', '2026-02-07', NOW(), 'dia_2026-02-07'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-07', '2026-02-07', NOW(), 'dia_2026-02-07'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-07', '2026-02-07', NOW(), 'dia_2026-02-07'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-07', '2026-02-07', NOW(), 'dia_2026-02-07');

-- ============================================================
-- 08/02/2026 (dom)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, 3,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porquinho Banco Inter S A', 680.25, '2026-02-08', '2026-02-08', NOW(), 'dia_2026-02-08'),
  (2, 1, 4,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porq Obj Banco Inter S A',  243.63, '2026-02-08', '2026-02-08', NOW(), 'dia_2026-02-08'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-08', '2026-02-08', NOW(), 'dia_2026-02-08'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-08', '2026-02-08', NOW(), 'dia_2026-02-08');

-- ============================================================
-- 09/02/2026 (seg)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  8, 1, 'despesa', 'liquidado', 'transferencia', 'Pagamento efetuado - Fatura Cartão Inter',  1389.14, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  4, 1, 'despesa', 'liquidado', 'debito',        'Compra no débito - Italo Supermercados Francisco Bel Bra', 300.26, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 48.50, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 47.02, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 306.67, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 50.94, '2026-02-09', '2026-02-09', NOW(), 'dia_2026-02-09');

-- ============================================================
-- 10/02/2026 (ter)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-10', '2026-02-10', NOW(), 'dia_2026-02-10'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 100.89, '2026-02-10', '2026-02-10', NOW(), 'dia_2026-02-10'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  72.02, '2026-02-10', '2026-02-10', NOW(), 'dia_2026-02-10'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-10', '2026-02-10', NOW(), 'dia_2026-02-10');

-- ============================================================
-- 11/02/2026 (qua)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-11', '2026-02-11', NOW(), 'dia_2026-02-11'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 137.91, '2026-02-11', '2026-02-11', NOW(), 'dia_2026-02-11'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-02-11', '2026-02-11', NOW(), 'dia_2026-02-11'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-02-11', '2026-02-11', NOW(), 'dia_2026-02-11'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  51.45, '2026-02-11', '2026-02-11', NOW(), 'dia_2026-02-11');

-- ============================================================
-- 12/02/2026 (qui)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-12', '2026-02-12', NOW(), 'dia_2026-02-12'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-12', '2026-02-12', NOW(), 'dia_2026-02-12'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-12', '2026-02-12', NOW(), 'dia_2026-02-12'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-12', '2026-02-12', NOW(), 'dia_2026-02-12'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-02-12', '2026-02-12', NOW(), 'dia_2026-02-12'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-12', '2026-02-12', NOW(), 'dia_2026-02-12'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-12', '2026-02-12', NOW(), 'dia_2026-02-12'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-12', '2026-02-12', NOW(), 'dia_2026-02-12'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-12', '2026-02-12', NOW(), 'dia_2026-02-12');

-- ============================================================
-- 13/02/2026 (sex)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 72.77, '2026-02-13', '2026-02-13', NOW(), 'dia_2026-02-13');

-- ============================================================
-- 14/02/2026 (sab)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-14', '2026-02-14', NOW(), 'dia_2026-02-14');

-- 15/02/2026 (dom) - sem movimento

-- ============================================================
-- 16/02/2026 (seg)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-16', '2026-02-16', NOW(), 'dia_2026-02-16'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 73.51, '2026-02-16', '2026-02-16', NOW(), 'dia_2026-02-16'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-16', '2026-02-16', NOW(), 'dia_2026-02-16'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-16', '2026-02-16', NOW(), 'dia_2026-02-16'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-16', '2026-02-16', NOW(), 'dia_2026-02-16'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-16', '2026-02-16', NOW(), 'dia_2026-02-16');

-- ============================================================
-- 17/02/2026 (ter)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.46, '2026-02-17', '2026-02-17', NOW(), 'dia_2026-02-17'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-17', '2026-02-17', NOW(), 'dia_2026-02-17'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-17', '2026-02-17', NOW(), 'dia_2026-02-17'),
  (2, 1, NULL,    4, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Alright Beer Curitiba Bra',  1.90, '2026-02-17', '2026-02-17', NOW(), 'dia_2026-02-17'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-02-17', '2026-02-17', NOW(), 'dia_2026-02-17'),
  (2, 1, 3,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porquinho Banco Inter S A',   928.57, '2026-02-17', '2026-02-17', NOW(), 'dia_2026-02-17'),
  (2, 1, NULL,    8, 1, 'despesa',       'liquidado', 'transferencia', 'Pagamento efetuado - Fatura Cartão Inter',   1378.24, '2026-02-17', '2026-02-17', NOW(), 'dia_2026-02-17'),
  (2, 1, 4,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porq Obj Banco Inter S A',    253.21, '2026-02-17', '2026-02-17', NOW(), 'dia_2026-02-17');

-- ============================================================
-- 18/02/2026 (qua)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  51.45, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.01, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.01, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.01, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.01, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.02, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.01, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.01, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  98.71, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 230.33, '2026-02-18', '2026-02-18', NOW(), 'dia_2026-02-18');

-- ============================================================
-- 19/02/2026 (qui) - 4 recebidos + 13 enviados Marcelo + 2 Transp
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19'),
  (2, 1, NULL,  5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-02-19', '2026-02-19', NOW(), 'dia_2026-02-19');

-- ============================================================
-- 20/02/2026 (sex)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-20', '2026-02-20', NOW(), 'dia_2026-02-20'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix',    'Pix enviado devolvido - Marcelo Oliveira Palma', 0.01, '2026-02-20', '2026-02-20', NOW(), 'dia_2026-02-20'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix',    'Pix enviado devolvido - Marcelo Oliveira Palma', 0.01, '2026-02-20', '2026-02-20', NOW(), 'dia_2026-02-20'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix',    'Pix enviado devolvido - Marcelo Oliveira Palma', 0.01, '2026-02-20', '2026-02-20', NOW(), 'dia_2026-02-20'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-02-20', '2026-02-20', NOW(), 'dia_2026-02-20'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 51.45, '2026-02-20', '2026-02-20', NOW(), 'dia_2026-02-20'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Marcelo Oliveira Palma',         0.01, '2026-02-20', '2026-02-20', NOW(), 'dia_2026-02-20'),
  (2, 1, NULL,  5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-02-20', '2026-02-20', NOW(), 'dia_2026-02-20');

-- ============================================================
-- 21/02/2026 (sab)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - Fabio Roberto Schmidt',        500.00, '2026-02-21', '2026-02-21', NOW(), 'dia_2026-02-21'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-21', '2026-02-21', NOW(), 'dia_2026-02-21'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-21', '2026-02-21', NOW(), 'dia_2026-02-21'),
  (2, 1, NULL, 12, 1, 'despesa', 'liquidado', 'debito', 'Deb Cartao + Protegido - Seguro Cartão Protegido/Plano Standard', 5.90, '2026-02-21', '2026-02-21', NOW(), 'dia_2026-02-21');

-- ============================================================
-- 22/02/2026 (dom)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, 3,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porquinho Banco Inter S A', 1967.07, '2026-02-22', '2026-02-22', NOW(), 'dia_2026-02-22'),
  (2, 1, 4,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porq Obj Banco Inter S A',   282.39, '2026-02-22', '2026-02-22', NOW(), 'dia_2026-02-22'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-22', '2026-02-22', NOW(), 'dia_2026-02-22'),
  (2, 1, NULL,    9, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - Brasilcap',                     1.56, '2026-02-22', '2026-02-22', NOW(), 'dia_2026-02-22'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-22', '2026-02-22', NOW(), 'dia_2026-02-22');

-- ============================================================
-- 23/02/2026 (seg)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  8, 1, 'despesa', 'liquidado', 'transferencia', 'Pagamento efetuado - Fatura Cartão Inter',    558.02, '2026-02-23', '2026-02-23', NOW(), 'dia_2026-02-23'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-02-23', '2026-02-23', NOW(), 'dia_2026-02-23'),
  (2, 1, NULL,  5, 1, 'despesa', 'liquidado', 'debito',        'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-02-23', '2026-02-23', NOW(), 'dia_2026-02-23'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 100.84, '2026-02-23', '2026-02-23', NOW(), 'dia_2026-02-23'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-02-23', '2026-02-23', NOW(), 'dia_2026-02-23'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-23', '2026-02-23', NOW(), 'dia_2026-02-23'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-23', '2026-02-23', NOW(), 'dia_2026-02-23');

-- ============================================================
-- 24/02/2026 (ter)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-24', '2026-02-24', NOW(), 'dia_2026-02-24'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-24', '2026-02-24', NOW(), 'dia_2026-02-24'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-24', '2026-02-24', NOW(), 'dia_2026-02-24'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 123.51, '2026-02-24', '2026-02-24', NOW(), 'dia_2026-02-24'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 144.05, '2026-02-24', '2026-02-24', NOW(), 'dia_2026-02-24'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.10, '2026-02-24', '2026-02-24', NOW(), 'dia_2026-02-24'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.10, '2026-02-24', '2026-02-24', NOW(), 'dia_2026-02-24'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.10, '2026-02-24', '2026-02-24', NOW(), 'dia_2026-02-24');

-- ============================================================
-- 25/02/2026 (qua)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.01, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma', 0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'receita', 'liquidado', 'pix', 'Pix enviado devolvido - Marcelo Oliveira Palma',10.00, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',          0.10, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Marcelo Oliveira Palma',         10.00, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  57.55, '2026-02-25', '2026-02-25', NOW(), 'dia_2026-02-25');

-- ============================================================
-- 26/02/2026 (qui)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-26', '2026-02-26', NOW(), 'dia_2026-02-26'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-02-26', '2026-02-26', NOW(), 'dia_2026-02-26'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-02-26', '2026-02-26', NOW(), 'dia_2026-02-26'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-02-26', '2026-02-26', NOW(), 'dia_2026-02-26'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 122.86, '2026-02-26', '2026-02-26', NOW(), 'dia_2026-02-26');

-- ============================================================
-- 27/02/2026 (sex)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 51.45, '2026-02-27', '2026-02-27', NOW(), 'dia_2026-02-27'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-02-27', '2026-02-27', NOW(), 'dia_2026-02-27'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-02-27', '2026-02-27', NOW(), 'dia_2026-02-27'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-02-27', '2026-02-27', NOW(), 'dia_2026-02-27'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 72.02, '2026-02-27', '2026-02-27', NOW(), 'dia_2026-02-27'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-02-27', '2026-02-27', NOW(), 'dia_2026-02-27');

-- ============================================================
-- 28/02/2026 (sab)
-- ============================================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-28', '2026-02-28', NOW(), 'dia_2026-02-28'),
  (2, 1, NULL,  9, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Samueldosanjos Matinhos Bra', 4.00, '2026-02-28', '2026-02-28', NOW(), 'dia_2026-02-28'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-02-28', '2026-02-28', NOW(), 'dia_2026-02-28'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-28', '2026-02-28', NOW(), 'dia_2026-02-28'),
  (2, 1, NULL,  1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-02-28', '2026-02-28', NOW(), 'dia_2026-02-28');

COMMIT;
