CREATE TABLE IF NOT EXISTS gestao_planos_fixos_mes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gestao_id BIGINT UNSIGNED NOT NULL,
  ano_mes CHAR(7) NOT NULL,
  itens JSON NOT NULL,
  atualizado_por_usuario_id BIGINT UNSIGNED NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_gestao_planos_fixos_mes_gestao_ano (gestao_id, ano_mes),
  CONSTRAINT fk_gestao_planos_fixos_mes_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_gestao_planos_fixos_mes_usuario
    FOREIGN KEY (atualizado_por_usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB;
