-- Fatura Cartão de crédito Lucas (conta_id=2) - fechamento FEV/2026
-- competencia_data = data da compra (ou data original da parcela)
-- fatura_competencia_data = 2026-02-01 (cycle do fechamento de fevereiro)
-- Categorias:
--  3=Moradia 4=Alimentacao 5=Transporte 7=Lazer 9=Outros 10=Impostos
--  11=Parcelamentos 12=Assinaturas 15=Pet 16=Estudo 17=Delivery
--  21=Cuidados pessoais 23=Casa/Reforma
-- Linhas com "+" (PAGAMENTO ON LINE / VALOR PST / PG ENT PST) NAO sao lancadas
-- pois ja existem como "Pagamento efetuado - Fatura Cartao Inter" na conta corrente.

START TRANSACTION;

-- ============== A VISTA ==============

-- 28/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 12, 1, 'despesa', 'liquidado', 'credito', 'APPLE.COM/BILL',                  5.90, '2026-01-28', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         17.52, '2026-01-28', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 10, 1, 'despesa', 'liquidado', 'credito', 'IOF INTERNACIONAL',               2.40, '2026-01-28', '2026-02-01', NOW(), 'fatura_2026-02');

-- 27/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERDIA TARUMA',               460.44, '2026-01-27', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 12, 1, 'despesa', 'liquidado', 'credito', 'RAILWAY (servidor)',             68.48, '2026-01-27', '2026-02-01', NOW(), 'fatura_2026-02');

-- 26/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 15, 1, 'despesa', 'liquidado', 'credito', 'AviarioJkm',                     15.00, '2026-01-26', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  9, 1, 'despesa', 'liquidado', 'credito', 'OZAK CURITIBA',                  29.00, '2026-01-26', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         39.31, '2026-01-26', '2026-02-01', NOW(), 'fatura_2026-02');

-- 25/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 17, 1, 'despesa', 'liquidado', 'credito', 'SALDANHA PIZZARIA',              63.90, '2026-01-25', '2026-02-01', NOW(), 'fatura_2026-02');

-- 24/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         44.47, '2026-01-24', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'ALFA DISTRIBUIDORA',             16.08, '2026-01-24', '2026-02-01', NOW(), 'fatura_2026-02');

-- 23/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'PIER 72 LTDA',                  184.90, '2026-01-23', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'RUINA BEER BAR LTDA',            20.00, '2026-01-23', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  5, 1, 'despesa', 'liquidado', 'credito', 'UBER TRIP',                      39.94, '2026-01-23', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  5, 1, 'despesa', 'liquidado', 'credito', 'UBER TRIP',                      31.94, '2026-01-23', '2026-02-01', NOW(), 'fatura_2026-02');

-- 22/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 21, 1, 'despesa', 'liquidado', 'credito', 'JEAN BARBER',                    50.00, '2026-01-22', '2026-02-01', NOW(), 'fatura_2026-02');

-- 21/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 16, 1, 'despesa', 'liquidado', 'credito', 'KALUNGA JOCKEY',                214.85, '2026-01-21', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERDIA TARUMA',                58.93, '2026-01-21', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 16, 1, 'despesa', 'liquidado', 'credito', 'KALUNGA JOCKEY',                 57.60, '2026-01-21', '2026-02-01', NOW(), 'fatura_2026-02');

-- 20/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         10.15, '2026-01-20', '2026-02-01', NOW(), 'fatura_2026-02');

-- 19/01  +R$ 1.036,04 PAGAMENTO ON LINE  -> NAO LANCAR (ja na corrente)

-- 17/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         62.27, '2026-01-17', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  5, 1, 'despesa', 'liquidado', 'credito', 'POSTO QUATRO BARRAS',           127.98, '2026-01-17', '2026-02-01', NOW(), 'fatura_2026-02');

-- 16/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         47.98, '2026-01-16', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         91.79, '2026-01-16', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'CARREFOUR CWB 9 (Parcela 01 de 06)',100.00, '2026-01-16', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  5, 1, 'despesa', 'liquidado', 'credito', 'UBER TRIP',                      21.96, '2026-01-16', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 15, 1, 'despesa', 'liquidado', 'credito', 'AviarioJkm',                     60.00, '2026-01-16', '2026-02-01', NOW(), 'fatura_2026-02');

-- 15/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERDIA TARUMA',               294.30, '2026-01-15', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 23, 1, 'despesa', 'liquidado', 'credito', 'BALAROTI PINHAIS',              177.30, '2026-01-15', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         33.58, '2026-01-15', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 12, 1, 'despesa', 'liquidado', 'credito', 'APPLE.COM/BILL',                  9.99, '2026-01-15', '2026-02-01', NOW(), 'fatura_2026-02');

-- 14/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         23.77, '2026-01-14', '2026-02-01', NOW(), 'fatura_2026-02');

-- 13/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         15.30, '2026-01-13', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERDIA TARUMA',                69.69, '2026-01-13', '2026-02-01', NOW(), 'fatura_2026-02');

-- 12/01  +R$ 461,73 PAGAMENTO ON LINE  -> NAO LANCAR
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 12, 1, 'despesa', 'liquidado', 'credito', 'APPLE.COM/BILL',                 99.90, '2026-01-12', '2026-02-01', NOW(), 'fatura_2026-02');

-- 11/01  +R$ 1.091,04 PAGAMENTO ON LINE  -> NAO LANCAR

-- 10/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'AlfaDistribuidora',             157.25, '2026-01-10', '2026-02-01', NOW(), 'fatura_2026-02');

-- 09/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERDIA TARUMA',               274.49, '2026-01-09', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'AED PANIFICADORA',               29.99, '2026-01-09', '2026-02-01', NOW(), 'fatura_2026-02');

-- 08/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  3, 1, 'despesa', 'liquidado', 'credito', 'RECARGA EPAY A VISTA',           60.00, '2026-01-08', '2026-02-01', NOW(), 'fatura_2026-02');

-- 07/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'CARREFOUR CWB 9',                23.28, '2026-01-07', '2026-02-01', NOW(), 'fatura_2026-02');

-- 05/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'ACADEMIA AMERICAN FITN (Parcela 01 de 12)',66.74, '2026-01-05', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         10.80, '2026-01-05', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         32.20, '2026-01-05', '2026-02-01', NOW(), 'fatura_2026-02');

-- 04/01  +R$ 4.281,33 VALOR PST  -> NAO LANCAR
--        +R$ 1.400,00 PG ENT PST -> NAO LANCAR
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'PARCELAMENTO SALDO TOTAL (Parcela 01 de 11)',556.53, '2026-01-04', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 10, 1, 'despesa', 'liquidado', 'credito', 'IOF CREDITO PARCELADO',         133.50, '2026-01-04', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  4, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO PLANTA CA',         51.02, '2026-01-04', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  5, 1, 'despesa', 'liquidado', 'credito', 'POSTO ATUBA',                    63.98, '2026-01-04', '2026-02-01', NOW(), 'fatura_2026-02');

-- 03/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 12, 1, 'despesa', 'liquidado', 'credito', 'DM HOSTINGER.COM',               64.99, '2026-01-03', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', '54310604JeanFabio MATINHOS',      8.00, '2026-01-03', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'RafaelGoncalves MATINHOS',       20.00, '2026-01-03', '2026-02-01', NOW(), 'fatura_2026-02');

-- 01/01
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'DeBonaSorvetesE MATINHOS',       23.00, '2026-01-01', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'JIM COM VICTOR HUGO CURITIBA',   78.00, '2026-01-01', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'JEANE CAROLINA JUNKES MATINHOS', 51.99, '2026-01-01', '2026-02-01', NOW(), 'fatura_2026-02');

-- 31/12
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'MATINHOS COMERCIO',               3.99, '2025-12-31', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'POINT DO BARBA Matinhos',        15.00, '2025-12-31', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'RafaelGoncalves MATINHOS',       14.00, '2025-12-31', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'DISTRIBUIDORA DE BEBIDAS MATINHOS',54.45, '2025-12-31', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 12, 1, 'despesa', 'liquidado', 'credito', 'DL GOOGLE YouTube',               1.99, '2025-12-31', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'BRASAO SUPERMERCADOS MATINHOS',  79.87, '2025-12-31', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'BRASAO SUPERMERCADOS MATINHOS', 368.69, '2025-12-31', '2026-02-01', NOW(), 'fatura_2026-02');

-- 30/12
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'EDSON PERREIRA MERCADO MATINHOS', 44.58, '2025-12-30', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2,  7, 1, 'despesa', 'liquidado', 'credito', 'SUPERMERCADO SIAO LTDA MATINHOS',104.59, '2025-12-30', '2026-02-01', NOW(), 'fatura_2026-02');

-- ============== PARCELAS (data original = data da compra) ==============

-- 04/12/2025
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MERCADOLIVRE MEGSEGUR (Parcela 02 de 04)', 32.52, '2025-12-04', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MERCADOLIVRE MEGSEGUR (Parcela 03 de 04)', 32.52, '2025-12-04', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MERCADOLIVRE MEGSEGUR (Parcela 04 de 04)', 32.52, '2025-12-04', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'ANDREATTA FERRAGENS (Parcela 02 de 02)',   50.90, '2025-12-04', '2026-02-01', NOW(), 'fatura_2026-02');

-- 08/09/2025
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'HAVAN PINHAIS (Parcela 05 de 05)',         142.96, '2025-09-08', '2026-02-01', NOW(), 'fatura_2026-02');

-- 13/08/2025
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MERCADOPAGO IMPORMUS (Parcela 06 de 10)',  55.29, '2025-08-13', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MERCADOPAGO IMPORMUS (Parcela 07 de 10)',  55.29, '2025-08-13', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MERCADOPAGO IMPORMUS (Parcela 08 de 10)',  55.29, '2025-08-13', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MERCADOPAGO IMPORMUS (Parcela 09 de 10)',  55.29, '2025-08-13', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MERCADOPAGO IMPORMUS (Parcela 10 de 10)',  55.29, '2025-08-13', '2026-02-01', NOW(), 'fatura_2026-02');

-- 07/07/2025
INSERT INTO lancamentos (gestao_id, conta_id, categoria_id, criado_por_usuario_id, tipo, status, meio, descricao, valor_total, competencia_data, fatura_competencia_data, liquidado_em, origem_externa) VALUES
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MARCIO MURARO PEREZ LT (Parcela 07 de 08)', 84.98, '2025-07-07', '2026-02-01', NOW(), 'fatura_2026-02'),
  (2, 2, 11, 1, 'despesa', 'liquidado', 'credito', 'MARCIO MURARO PEREZ LT (Parcela 08 de 08)', 84.98, '2025-07-07', '2026-02-01', NOW(), 'fatura_2026-02');

COMMIT;
