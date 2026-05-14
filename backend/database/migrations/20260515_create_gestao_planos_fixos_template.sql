CREATE TABLE IF NOT EXISTS gestao_planos_fixos_template (
  gestao_id BIGINT UNSIGNED NOT NULL,
  itens JSON NOT NULL,
  atualizado_por_usuario_id BIGINT UNSIGNED NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (gestao_id),
  CONSTRAINT fk_gestao_planos_fixos_template_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_gestao_planos_fixos_template_usuario
    FOREIGN KEY (atualizado_por_usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB;
