-- 20260511 - Consolidar fatura janeiro 2026
-- Corrige lancamentos legados do cartao (conta_id=2) que herdaram
-- `fatura_competencia_data` = data da compra (um valor diferente por dia)
-- ao inves do 1o dia do mes da fatura.
--
-- Todas as compras com fatura_competencia_data em dezembro/2025 sao
-- da fatura paga em janeiro/2026, logo devem apontar para '2026-01-01'.

START TRANSACTION;

UPDATE lancamentos
SET fatura_competencia_data = '2026-01-01'
WHERE conta_id = 2
  AND tipo = 'despesa'
  AND status <> 'cancelado'
  AND fatura_competencia_data BETWEEN '2025-12-01' AND '2025-12-31';

COMMIT;
