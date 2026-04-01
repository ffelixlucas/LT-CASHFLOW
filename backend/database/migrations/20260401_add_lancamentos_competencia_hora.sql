ALTER TABLE lancamentos
  ADD COLUMN competencia_hora TIME NULL AFTER competencia_data;

CREATE INDEX idx_lancamentos_gestao_competencia_hora
  ON lancamentos (gestao_id, competencia_data, competencia_hora);
