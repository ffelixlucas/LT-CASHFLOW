-- Lote maio 2026 (01/05 a 11/05)
START TRANSACTION;

-- 01/05 (sex) saldo R$ 2.563,36 (mov -152,10)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Vanessa Kwiatkowski',          325.00, '2026-05-01', '2026-05-01', NOW(), 'dia_2026-05-01'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-01', '2026-05-01', NOW(), 'dia_2026-05-01'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-01', '2026-05-01', NOW(), 'dia_2026-05-01');

-- 02/05 (sab) saldo R$ 2.920,71 (mov +357,35)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 48.50, '2026-05-02', '2026-05-02', NOW(), 'dia_2026-05-02'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-02', '2026-05-02', NOW(), 'dia_2026-05-02'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-02', '2026-05-02', NOW(), 'dia_2026-05-02'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-05-02', '2026-05-02', NOW(), 'dia_2026-05-02'),
  (2, 1, NULL, 9, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - Tais Fanha Felix',             67.00, '2026-05-02', '2026-05-02', NOW(), 'dia_2026-05-02');

-- 03/05 (dom) saldo R$ 3.093,61 (mov +172,90)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-03', '2026-05-03', NOW(), 'dia_2026-05-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-03', '2026-05-03', NOW(), 'dia_2026-05-03');

-- 04/05 (seg) saldo R$ 3.702,67 (mov +609,06)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-05-04', '2026-05-04', NOW(), 'dia_2026-05-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-04', '2026-05-04', NOW(), 'dia_2026-05-04'),
  (2, 1, NULL, 4, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Supermercado Planta Ca Pinhais Bra', 30.85, '2026-05-04', '2026-05-04', NOW(), 'dia_2026-05-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-05-04', '2026-05-04', NOW(), 'dia_2026-05-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-05-04', '2026-05-04', NOW(), 'dia_2026-05-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 57.54, '2026-05-04', '2026-05-04', NOW(), 'dia_2026-05-04'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-05-04', '2026-05-04', NOW(), 'dia_2026-05-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',302.20, '2026-05-04', '2026-05-04', NOW(), 'dia_2026-05-04');

-- 05/05 (ter) saldo R$ 4.191,43 (mov +488,76)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 48.50, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05'),
  (2, 1, NULL, 4, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Supermercado Planta Ca Pinhais Bra', 92.26, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-05-05', '2026-05-05', NOW(), 'dia_2026-05-05');

-- 06/05 (qua) saldo R$ 1.871,73 (mov -2.319,70)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 5, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Associacao M*bus 2940 Curitiba Bra', 6.13, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, NULL, 4, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Uni Lanches Curitiba Bra', 10.00, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, 3, NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porquinho Banco Inter S A',    2.34, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, NULL, 8, 1, 'despesa',       'liquidado', 'transferencia', 'Pagamento efetuado - Fatura Cartão Inter',  1474.28, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, 4, NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porq Obj Banco Inter S A',   553.36, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, NULL, 1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, NULL, 8, 1, 'despesa',       'liquidado', 'transferencia', 'Pagamento efetuado - Fatura Cartão Inter',  1063.63, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, NULL, 1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, NULL, 1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',194.35, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, NULL, 1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',359.97, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, NULL, 1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06'),
  (2, 1, NULL, 5, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-05-06', '2026-05-06', NOW(), 'dia_2026-05-06');

-- 07/05 (qui) saldo R$ 2.347,90 (mov +476,17)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 48.50, '2026-05-07', '2026-05-07', NOW(), 'dia_2026-05-07'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Associacao M*bus 2942 Curitiba Bra', 6.13, '2026-05-07', '2026-05-07', NOW(), 'dia_2026-05-07'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-07', '2026-05-07', NOW(), 'dia_2026-05-07'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-05-07', '2026-05-07', NOW(), 'dia_2026-05-07'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 25.70, '2026-05-07', '2026-05-07', NOW(), 'dia_2026-05-07'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',273.60, '2026-05-07', '2026-05-07', NOW(), 'dia_2026-05-07'),
  (2, 1, NULL,12, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Netflix.com Sp Bra',       20.90, '2026-05-07', '2026-05-07', NOW(), 'dia_2026-05-07');

-- 08/05 (sex) saldo R$ 2.647,76 (mov +299,86)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 3, 1, 'despesa', 'liquidado', 'transferencia', 'Recarga - Tim',                              60.00, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito',        'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',           'Pix enviado - Pagar Me Pagamentos',          195.21, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 57.54, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',144.04, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito',        'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-05-08', '2026-05-08', NOW(), 'dia_2026-05-08');

-- 09/05 (sab) saldo R$ 2.561,96 (mov -85,80)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,17, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Valdecir Aparecido Moreira Pizzaria', 85.80, '2026-05-09', '2026-05-09', NOW(), 'dia_2026-05-09');

-- 10/05 (dom) saldo R$ 2.710,36 (mov +148,40)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-05-10', '2026-05-10', NOW(), 'dia_2026-05-10'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-05-10', '2026-05-10', NOW(), 'dia_2026-05-10');

-- 11/05 (seg) ainda em andamento (sem saldo final no extrato)
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 9, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 64.787.364 David Allan Ribas',  12.00, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11'),
  (2, 1, NULL, 4, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Sos Conveniencia Pinhais Bra', 12.00, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11'),
  (2, 1, NULL,10, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Receita Federal',                87.05, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11'),
  (2, 1, NULL, 3, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Copeldis',                      384.27, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Ricardo Morais Felix',          578.00, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11'),
  (2, 1, NULL, 3, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Gisela Cristina Morais Felix',  233.27, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 144.04, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 216.06, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 144.04, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-05-11', '2026-05-11', NOW(), 'dia_2026-05-11');

COMMIT;
