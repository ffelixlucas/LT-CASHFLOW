-- Fechamento semanal: pagamento de fatura no snapshot + modo "só registro"
-- (semanas já feitas no passado sem duplicar transferência para reserva).

ALTER TABLE fechamentos_periodo
  ADD COLUMN pagamento_fatura DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER reservado,
  ADD COLUMN apenas_snapshot TINYINT(1) NOT NULL DEFAULT 0 AFTER pagamento_fatura;
