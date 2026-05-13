ALTER TABLE lancamentos
  ADD COLUMN fatura_competencia_data DATE NULL AFTER competencia_data;

CREATE INDEX idx_lancamentos_gestao_fatura_competencia
  ON lancamentos (gestao_id, fatura_competencia_data);
