-- 20260511 - Tabela de fechamentos de periodo (semanal/mensal)
-- Persiste o "fechamento" da semana (ou mes) com snapshot das metricas chave
-- na hora em que o usuario apertou "Fechar". Snapshot historico facilita
-- comparar semanas/meses no /insights e nao se perde por re-calculo.

CREATE TABLE IF NOT EXISTS fechamentos_periodo (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gestao_id BIGINT UNSIGNED NOT NULL,
  tipo ENUM('semanal','mensal') NOT NULL DEFAULT 'semanal',
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  fechado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechado_por_usuario_id BIGINT UNSIGNED NOT NULL,
  entradas DECIMAL(14,2) NOT NULL DEFAULT 0,
  saidas_corrente DECIMAL(14,2) NOT NULL DEFAULT 0,
  compras_cartao DECIMAL(14,2) NOT NULL DEFAULT 0,
  sobra DECIMAL(14,2) NOT NULL DEFAULT 0,
  reservado DECIMAL(14,2) NOT NULL DEFAULT 0,
  pagamento_fatura DECIMAL(14,2) NOT NULL DEFAULT 0,
  ajuste_dia_a_dia_tipo ENUM('nenhum','aporte','resgate') NOT NULL DEFAULT 'nenhum',
  ajuste_dia_a_dia_valor DECIMAL(14,2) NOT NULL DEFAULT 0,
  apenas_snapshot TINYINT(1) NOT NULL DEFAULT 0,
  lancamento_reserva_id BIGINT UNSIGNED DEFAULT NULL,
  observacoes TEXT,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_fechamento_periodo (gestao_id, tipo, periodo_inicio),
  KEY idx_fechamento_gestao_inicio (gestao_id, periodo_inicio),
  CONSTRAINT fk_fech_gestao FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_fech_user FOREIGN KEY (fechado_por_usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_fech_lancamento FOREIGN KEY (lancamento_reserva_id) REFERENCES lancamentos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
