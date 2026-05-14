-- Lote março 2026 (01/03 a 31/03) - Banco Inter Lucas
-- Categorias: 1=Renda 3=Moradia 4=Alimentação 5=Transporte 7=Lazer 8=Saida da conta 9=Outros 10=Impostos 12=Assinaturas 15=Pet 17=Delivery 18=Testes
-- Contas: 1=Banco Inter, 3=Reserva 1 (Porquinho), 4=Reserva 2 (Porq Obj)

START TRANSACTION;

-- =========================================
-- 01/03/2026 (dom) saldo R$ 0,00 (mov -2.274,07)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, 3,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porquinho Banco Inter S A', 1294.49, '2026-03-01', '2026-03-01', NOW(), 'dia_2026-03-01'),
  (2, 1, NULL,    9, 1, 'despesa',       'liquidado', 'pix',           'Pix enviado - Taylaine Goncalves Felix',     716.25, '2026-03-01', '2026-03-01', NOW(), 'dia_2026-03-01'),
  (2, 1, NULL,    8, 1, 'despesa',       'liquidado', 'transferencia', 'Pagamento efetuado - Fatura Cartão Inter',   234.49, '2026-03-01', '2026-03-01', NOW(), 'dia_2026-03-01'),
  (2, 1, 4,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porq Obj Banco Inter S A',   254.69, '2026-03-01', '2026-03-01', NOW(), 'dia_2026-03-01'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-01', '2026-03-01', NOW(), 'dia_2026-03-01'),
  (2, 1, NULL,    9, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Dilato Matinhos Bra',      16.00, '2026-03-01', '2026-03-01', NOW(), 'dia_2026-03-01'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-01', '2026-03-01', NOW(), 'dia_2026-03-01'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-01', '2026-03-01', NOW(), 'dia_2026-03-01');

-- =========================================
-- 02/03/2026 (seg) saldo R$ 759,61 (mov +759,61)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-02', '2026-03-02', NOW(), 'dia_2026-03-02'),
  (2, 1, NULL, 4, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Sos Conveniencia Pinhais Bra', 8.50, '2026-03-02', '2026-03-02', NOW(), 'dia_2026-03-02'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-02', '2026-03-02', NOW(), 'dia_2026-03-02'),
  (2, 1, NULL, 9, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - Danielli Magalhaes Fanha',      40.00, '2026-03-02', '2026-03-02', NOW(), 'dia_2026-03-02'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-02', '2026-03-02', NOW(), 'dia_2026-03-02'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-02', '2026-03-02', NOW(), 'dia_2026-03-02'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-02', '2026-03-02', NOW(), 'dia_2026-03-02'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-02', '2026-03-02', NOW(), 'dia_2026-03-02'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 251.41, '2026-03-02', '2026-03-02', NOW(), 'dia_2026-03-02');

-- =========================================
-- 03/03/2026 (ter) saldo R$ 1.802,20 (mov +1.042,59)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 123.09, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-03', '2026-03-03', NOW(), 'dia_2026-03-03');

-- =========================================
-- 04/03/2026 (qua) saldo R$ 2.593,48 (mov +791,28)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 4, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Sos Conveniencia Pinhais Bra', 8.50, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 9, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - Tais Fanha Felix',              67.00, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 110.58, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Isabella Fanha Felix',          168.35, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Ricardo Morais Felix',           80.00, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-04', '2026-03-04', NOW(), 'dia_2026-03-04');

-- =========================================
-- 05/03/2026 (qui) saldo R$ 3.064,18 (mov +470,70)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-05', '2026-03-05', NOW(), 'dia_2026-03-05'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Ricardo Morais Felix',          20.00, '2026-03-05', '2026-03-05', NOW(), 'dia_2026-03-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-05', '2026-03-05', NOW(), 'dia_2026-03-05'),
  (2, 1, NULL,15, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Aviariojkm Pinhais Bra',   17.00, '2026-03-05', '2026-03-05', NOW(), 'dia_2026-03-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-05', '2026-03-05', NOW(), 'dia_2026-03-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-05', '2026-03-05', NOW(), 'dia_2026-03-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-05', '2026-03-05', NOW(), 'dia_2026-03-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 48.50, '2026-03-05', '2026-03-05', NOW(), 'dia_2026-03-05'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-05', '2026-03-05', NOW(), 'dia_2026-03-05');

-- =========================================
-- 06/03/2026 (sex) saldo R$ 3.685,38 (mov +621,20)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Um Teto Para Meu Pais Brasil', 100.00, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 48.50, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 71.55, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 48.50, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-06', '2026-03-06', NOW(), 'dia_2026-03-06');

-- =========================================
-- 07/03/2026 (sab) saldo R$ 3.982,05 (mov +296,67)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-07', '2026-03-07', NOW(), 'dia_2026-03-07'),
  (2, 1, NULL,12, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Netflix.com Sp Bra',       20.90, '2026-03-07', '2026-03-07', NOW(), 'dia_2026-03-07'),
  (2, 1, NULL,17, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Ifoodcom Agencia De Restaurantes Online Sa', 141.78, '2026-03-07', '2026-03-07', NOW(), 'dia_2026-03-07'),
  (2, 1, NULL, 9, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - Roberto Martins De Souza',    200.00, '2026-03-07', '2026-03-07', NOW(), 'dia_2026-03-07'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-07', '2026-03-07', NOW(), 'dia_2026-03-07'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-07', '2026-03-07', NOW(), 'dia_2026-03-07');

-- =========================================
-- 08/03/2026 (dom) saldo R$ 61,95 (mov -3.920,10)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, 3,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porquinho Banco Inter S A',    76.63, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,    8, 1, 'despesa',       'liquidado', 'transferencia', 'Pagamento efetuado - Fatura Cartão Inter',   2915.78, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,    3, 1, 'despesa',       'liquidado', 'pix',           'Pix enviado - Telefonica Bras',                54.93, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,   10, 1, 'despesa',       'liquidado', 'pix',           'Pix enviado - Receita Federal',                86.05, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,   10, 1, 'despesa',       'liquidado', 'pix',           'Pix enviado - Receita Federal',                87.05, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,    9, 1, 'despesa',       'liquidado', 'pix',           'Pix enviado - Ricardo Morais Felix',          274.00, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,    3, 1, 'despesa',       'liquidado', 'pix',           'Pix enviado - Copeldis',                      299.53, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, 4,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porq Obj Banco Inter S A',    477.45, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  72.02, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-08', '2026-03-08', NOW(), 'dia_2026-03-08');

-- =========================================
-- 09/03/2026 (seg) saldo R$ 929,23 (mov +867,28)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-09', '2026-03-09', NOW(), 'dia_2026-03-09'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-09', '2026-03-09', NOW(), 'dia_2026-03-09'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-09', '2026-03-09', NOW(), 'dia_2026-03-09'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-09', '2026-03-09', NOW(), 'dia_2026-03-09'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-09', '2026-03-09', NOW(), 'dia_2026-03-09'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-09', '2026-03-09', NOW(), 'dia_2026-03-09'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-09', '2026-03-09', NOW(), 'dia_2026-03-09'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-09', '2026-03-09', NOW(), 'dia_2026-03-09'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 235.18, '2026-03-09', '2026-03-09', NOW(), 'dia_2026-03-09');

-- =========================================
-- 10/03/2026 (ter) saldo R$ 1.659,13 (mov +729,90)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL,18, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Lucas Fanha Felix',               0.01, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL,18, 1, 'receita', 'liquidado', 'pix',    'Pix enviado devolvido - Lucas Fanha Felix',     0.02, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL,18, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Lucas Fanha Felix',               0.02, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL,18, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Lucas Fanha Felix',               0.01, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 1, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Flavio Lucas Buzzi',             25.00, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  49.00, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 156.42, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10'),
  (2, 1, NULL, 4, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Panif Guths Curitiba Bra',   6.65, '2026-03-10', '2026-03-10', NOW(), 'dia_2026-03-10');

-- =========================================
-- 11/03/2026 (qua) saldo R$ 2.470,29 (mov +811,16)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  88.00, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  70.19, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 138.27, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-11', '2026-03-11', NOW(), 'dia_2026-03-11');

-- =========================================
-- 12/03/2026 (qui) saldo R$ 2.556,74 (mov +86,45)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-12', '2026-03-12', NOW(), 'dia_2026-03-12');

-- =========================================
-- 13/03/2026 (sex) saldo R$ 2.922,13 (mov +365,39)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 48.50, '2026-03-13', '2026-03-13', NOW(), 'dia_2026-03-13'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-13', '2026-03-13', NOW(), 'dia_2026-03-13'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-13', '2026-03-13', NOW(), 'dia_2026-03-13'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-13', '2026-03-13', NOW(), 'dia_2026-03-13'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 57.54, '2026-03-13', '2026-03-13', NOW(), 'dia_2026-03-13');

-- =========================================
-- 14/03/2026 (sab) saldo R$ 3.243,43 (mov +321,30)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-14', '2026-03-14', NOW(), 'dia_2026-03-14'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-14', '2026-03-14', NOW(), 'dia_2026-03-14'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-14', '2026-03-14', NOW(), 'dia_2026-03-14'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-14', '2026-03-14', NOW(), 'dia_2026-03-14');

-- =========================================
-- 15/03/2026 (dom) saldo R$ 3.381,33 (mov +137,90)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-15', '2026-03-15', NOW(), 'dia_2026-03-15'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-15', '2026-03-15', NOW(), 'dia_2026-03-15');

-- =========================================
-- 16/03/2026 (seg) saldo R$ 4.313,29 (mov +931,96)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 222.04, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Materiais De Construcao Caravella', 207.94, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 403.16, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-16', '2026-03-16', NOW(), 'dia_2026-03-16');

-- =========================================
-- 17/03/2026 (ter) saldo R$ 4.362,54 (mov +49,25)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-17', '2026-03-17', NOW(), 'dia_2026-03-17'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  61.95, '2026-03-17', '2026-03-17', NOW(), 'dia_2026-03-17'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-17', '2026-03-17', NOW(), 'dia_2026-03-17'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-17', '2026-03-17', NOW(), 'dia_2026-03-17'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-17', '2026-03-17', NOW(), 'dia_2026-03-17'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Materiais De Construcao Caravella', 299.00, '2026-03-17', '2026-03-17', NOW(), 'dia_2026-03-17');

-- =========================================
-- 18/03/2026 (qua) saldo R$ 3.635,78 (mov -726,76)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 8, 1, 'despesa', 'liquidado', 'transferencia', 'Pagamento efetuado - Fatura Cartão Inter',   1004.50, '2026-03-18', '2026-03-18', NOW(), 'dia_2026-03-18'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-18', '2026-03-18', NOW(), 'dia_2026-03-18'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-18', '2026-03-18', NOW(), 'dia_2026-03-18'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 122.34, '2026-03-18', '2026-03-18', NOW(), 'dia_2026-03-18');

-- =========================================
-- 19/03/2026 (qui) saldo R$ 1.251,75 (mov -2.384,03)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 5, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Associacao M*bus 2941 Curitiba Bra', 6.13, '2026-03-19', '2026-03-19', NOW(), 'dia_2026-03-19'),
  (2, 1, NULL, 5, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-03-19', '2026-03-19', NOW(), 'dia_2026-03-19'),
  (2, 1, NULL, 1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-19', '2026-03-19', NOW(), 'dia_2026-03-19'),
  (2, 1, NULL, 1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-19', '2026-03-19', NOW(), 'dia_2026-03-19'),
  (2, 1, NULL, 1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-19', '2026-03-19', NOW(), 'dia_2026-03-19'),
  (2, 1, NULL, 1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-19', '2026-03-19', NOW(), 'dia_2026-03-19'),
  (2, 1, 3, NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porquinho Banco Inter S A', 2346.57, '2026-03-19', '2026-03-19', NOW(), 'dia_2026-03-19'),
  (2, 1, 4, NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porq Obj Banco Inter S A',   336.00, '2026-03-19', '2026-03-19', NOW(), 'dia_2026-03-19');

-- =========================================
-- 20/03/2026 (sex) saldo R$ 1.089,75 (mov -162,00)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix', 'Pix enviado - Karla Tamyres Schnorr Mazeto', 162.00, '2026-03-20', '2026-03-20', NOW(), 'dia_2026-03-20');

-- =========================================
-- 21/03/2026 (sab) saldo R$ 1.140,80 (mov +51,05)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-21', '2026-03-21', NOW(), 'dia_2026-03-21'),
  (2, 1, NULL, 4, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Mercado Da Familia Vaz Curitiba Bra', 12.00, '2026-03-21', '2026-03-21', NOW(), 'dia_2026-03-21'),
  (2, 1, NULL,12, 1, 'despesa', 'liquidado', 'debito', 'Deb Cartao + Protegido - Seguro Cartão Protegido/Plano Standard', 5.90, '2026-03-21', '2026-03-21', NOW(), 'dia_2026-03-21');

-- 22/03/2026 (dom) sem movimento

-- =========================================
-- 23/03/2026 (seg) saldo R$ 1.508,06 (mov +367,26)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-23', '2026-03-23', NOW(), 'dia_2026-03-23'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-23', '2026-03-23', NOW(), 'dia_2026-03-23'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 194.36, '2026-03-23', '2026-03-23', NOW(), 'dia_2026-03-23');

-- =========================================
-- 24/03/2026 (ter) saldo R$ 1.730,93 (mov +222,87)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-24', '2026-03-24', NOW(), 'dia_2026-03-24'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Associacao M*bus 2941 Curitiba Bra', 6.13, '2026-03-24', '2026-03-24', NOW(), 'dia_2026-03-24'),
  (2, 1, NULL,15, 1, 'despesa', 'liquidado', 'transferencia', 'Pagamento efetuado - Carlos Mocelin C A P Pet Ltda', 168.35, '2026-03-24', '2026-03-24', NOW(), 'dia_2026-03-24'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-24', '2026-03-24', NOW(), 'dia_2026-03-24'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-24', '2026-03-24', NOW(), 'dia_2026-03-24'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-24', '2026-03-24', NOW(), 'dia_2026-03-24'),
  (2, 1, NULL, 9, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Ag Closet Ltda',                 106.00, '2026-03-24', '2026-03-24', NOW(), 'dia_2026-03-24'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 144.05, '2026-03-24', '2026-03-24', NOW(), 'dia_2026-03-24'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  51.45, '2026-03-24', '2026-03-24', NOW(), 'dia_2026-03-24');

-- =========================================
-- 25/03/2026 (qua) saldo R$ 1.978,54 (mov +247,61)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-25', '2026-03-25', NOW(), 'dia_2026-03-25'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-25', '2026-03-25', NOW(), 'dia_2026-03-25'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Associacao M*bus 2942 Curitiba Bra', 6.13, '2026-03-25', '2026-03-25', NOW(), 'dia_2026-03-25'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-25', '2026-03-25', NOW(), 'dia_2026-03-25'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-03-25', '2026-03-25', NOW(), 'dia_2026-03-25'),
  (2, 1, NULL,10, 1, 'despesa', 'liquidado', 'pix',    'Pix enviado - Prefeitura Municipal De Pinhais', 137.40, '2026-03-25', '2026-03-25', NOW(), 'dia_2026-03-25'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 72.03, '2026-03-25', '2026-03-25', NOW(), 'dia_2026-03-25'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 72.02, '2026-03-25', '2026-03-25', NOW(), 'dia_2026-03-25'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-03-25', '2026-03-25', NOW(), 'dia_2026-03-25');

-- =========================================
-- 26/03/2026 (qui) saldo R$ 2.279,74 (mov +301,20)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Associacao M*bus 2941 Curitiba Bra', 6.13, '2026-03-26', '2026-03-26', NOW(), 'dia_2026-03-26'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  68.95, '2026-03-26', '2026-03-26', NOW(), 'dia_2026-03-26'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-03-26', '2026-03-26', NOW(), 'dia_2026-03-26'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  86.45, '2026-03-26', '2026-03-26', NOW(), 'dia_2026-03-26'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix',  48.50, '2026-03-26', '2026-03-26', NOW(), 'dia_2026-03-26'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 115.69, '2026-03-26', '2026-03-26', NOW(), 'dia_2026-03-26'),
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-03-26', '2026-03-26', NOW(), 'dia_2026-03-26');

-- =========================================
-- 27/03/2026 (sex) saldo R$ 2.880,89 (mov +601,15)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-27', '2026-03-27', NOW(), 'dia_2026-03-27'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-27', '2026-03-27', NOW(), 'dia_2026-03-27'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-27', '2026-03-27', NOW(), 'dia_2026-03-27'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-27', '2026-03-27', NOW(), 'dia_2026-03-27'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-27', '2026-03-27', NOW(), 'dia_2026-03-27'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-27', '2026-03-27', NOW(), 'dia_2026-03-27'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 48.50, '2026-03-27', '2026-03-27', NOW(), 'dia_2026-03-27'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-27', '2026-03-27', NOW(), 'dia_2026-03-27');

-- =========================================
-- 28/03/2026 (sab) saldo R$ 3.390,49 (mov +509,60)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-28', '2026-03-28', NOW(), 'dia_2026-03-28'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-28', '2026-03-28', NOW(), 'dia_2026-03-28'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-28', '2026-03-28', NOW(), 'dia_2026-03-28'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-28', '2026-03-28', NOW(), 'dia_2026-03-28'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 64.40, '2026-03-28', '2026-03-28', NOW(), 'dia_2026-03-28'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-28', '2026-03-28', NOW(), 'dia_2026-03-28'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-28', '2026-03-28', NOW(), 'dia_2026-03-28');

-- =========================================
-- 29/03/2026 (dom) saldo R$ 3.918,64 (mov +528,15)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 51.45, '2026-03-29', '2026-03-29', NOW(), 'dia_2026-03-29'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-29', '2026-03-29', NOW(), 'dia_2026-03-29'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-29', '2026-03-29', NOW(), 'dia_2026-03-29'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-29', '2026-03-29', NOW(), 'dia_2026-03-29'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 68.95, '2026-03-29', '2026-03-29', NOW(), 'dia_2026-03-29'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-29', '2026-03-29', NOW(), 'dia_2026-03-29'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix', 'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-29', '2026-03-29', NOW(), 'dia_2026-03-29');

-- =========================================
-- 30/03/2026 (seg) saldo R$ 544,63 (mov -3.374,01)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, 3,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porquinho Banco Inter S A',  786.12, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,    8, 1, 'despesa',       'liquidado', 'transferencia', 'Pagamento efetuado - Fatura Cartão Inter',  2304.16, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, 4,    NULL, 1, 'transferencia', 'liquidado', 'transferencia', 'Aplicação - Cdb Porq Obj Banco Inter S A',   537.81, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,    4, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Superdia Curitiba Bra',   272.29, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,    5, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 62.30, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,   18, 1, 'despesa',       'liquidado', 'pix',           'Pix recebido devolvido - Lucas Fanha Felix',  10.00, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,   18, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - Lucas Fanha Felix',            10.00, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',  4.00, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix',323.93, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,    1, 1, 'receita',       'liquidado', 'pix',           'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30'),
  (2, 1, NULL,    5, 1, 'despesa',       'liquidado', 'debito',        'Compra no débito - Transp Colet*transp. E Curitiba Bra', 6.13, '2026-03-30', '2026-03-30', NOW(), 'dia_2026-03-30');

-- =========================================
-- 31/03/2026 (ter) saldo R$ 1.198,64 (mov +654,01)
-- =========================================
INSERT INTO lancamentos (gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 1, NULL, 5, 1, 'despesa', 'liquidado', 'debito', 'Compra no débito - Associacao M*bus 2940 Curitiba Bra', 6.13, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 51.45, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 61.95, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 86.45, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 19.38, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 24.25, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 50.31, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 50.94, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 57.54, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31'),
  (2, 1, NULL, 1, 1, 'receita', 'liquidado', 'pix',    'Pix recebido - 63.156.552 Lucas Fanha Felix', 72.02, '2026-03-31', '2026-03-31', NOW(), 'dia_2026-03-31');

COMMIT;
