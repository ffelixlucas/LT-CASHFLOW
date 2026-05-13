-- Detalhe por conta de investimento/poupanca no fechamento (para o snapshot e historico).

ALTER TABLE fechamentos_periodo
  ADD COLUMN reservas_por_conta JSON NULL AFTER reservado;
