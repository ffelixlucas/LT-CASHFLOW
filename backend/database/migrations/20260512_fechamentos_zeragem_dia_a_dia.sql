-- Fechamento semanal: registra a zeragem da semana no Porquinho Dia a Dia.
-- Se o resultado final sobra, e aporte. Se falta dinheiro, e resgate.
-- Snapshot apenas: nao cria lancamento de banco automaticamente.

ALTER TABLE fechamentos_periodo
  ADD COLUMN ajuste_dia_a_dia_tipo ENUM('nenhum','aporte','resgate') NOT NULL DEFAULT 'nenhum' AFTER pagamento_fatura,
  ADD COLUMN ajuste_dia_a_dia_valor DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER ajuste_dia_a_dia_tipo;
