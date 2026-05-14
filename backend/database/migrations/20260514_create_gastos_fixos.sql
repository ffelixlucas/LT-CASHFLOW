CREATE TABLE IF NOT EXISTS gastos_fixos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gestao_id BIGINT UNSIGNED NOT NULL,
  criado_por_usuario_id BIGINT UNSIGNED NOT NULL,
  conta_id BIGINT UNSIGNED NOT NULL,
  categoria_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  descricao VARCHAR(160) NULL,
  valor_estimado DECIMAL(14,2) NOT NULL,
  dia_vencimento TINYINT UNSIGNED NOT NULL,
  meio ENUM('pix', 'debito', 'credito', 'dinheiro', 'boleto', 'ted_doc', 'transferencia', 'outro') NULL,
  status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gastos_fixos_gestao_status (gestao_id, status),
  KEY idx_gastos_fixos_conta (conta_id),
  KEY idx_gastos_fixos_categoria (categoria_id),
  CONSTRAINT fk_gastos_fixos_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_gastos_fixos_criado_por_usuario
    FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_gastos_fixos_conta
    FOREIGN KEY (conta_id) REFERENCES contas (id),
  CONSTRAINT fk_gastos_fixos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT chk_gastos_fixos_valor
    CHECK (valor_estimado > 0),
  CONSTRAINT chk_gastos_fixos_dia
    CHECK (dia_vencimento BETWEEN 1 AND 31)
) ENGINE=InnoDB;
