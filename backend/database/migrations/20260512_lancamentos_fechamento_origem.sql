-- Vincula um lancamento ao fechamento_periodo que o gerou (transferencia de reserva, pagamento de fatura associado, etc.).
-- Permite que a semana onde o lancamento caiu (data real no banco) "ignore" esse valor, ja que ele pertence
-- conceitualmente ao fechamento de uma semana anterior.

ALTER TABLE lancamentos
  ADD COLUMN fechamento_origem_id BIGINT UNSIGNED NULL AFTER conta_destino_id,
  ADD CONSTRAINT fk_lancamentos_fechamento_origem
    FOREIGN KEY (fechamento_origem_id) REFERENCES fechamentos_periodo(id)
    ON DELETE SET NULL;

CREATE INDEX idx_lancamentos_fechamento_origem ON lancamentos (fechamento_origem_id);

-- Vincula retroativamente: a transferencia de reserva apontada em fechamentos_periodo.lancamento_reserva_id
-- passa a "pertencer" ao proprio fechamento.
UPDATE lancamentos l
  JOIN fechamentos_periodo f ON f.lancamento_reserva_id = l.id
SET l.fechamento_origem_id = f.id
WHERE l.fechamento_origem_id IS NULL;
