CREATE DATABASE IF NOT EXISTS lt_cashflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE lt_cashflow;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NULL,
  avatar_url VARCHAR(255) NULL,
  status ENUM('ativo', 'inativo', 'pendente') NOT NULL DEFAULT 'ativo',
  ultimo_login_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gestoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  tipo ENUM('pessoal', 'familiar', 'profissional', 'projeto') NOT NULL DEFAULT 'familiar',
  moeda_padrao CHAR(3) NOT NULL DEFAULT 'BRL',
  fuso_horario VARCHAR(60) NOT NULL DEFAULT 'America/Sao_Paulo',
  criado_por_usuario_id BIGINT UNSIGNED NOT NULL,
  status ENUM('ativa', 'arquivada') NOT NULL DEFAULT 'ativa',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gestoes_criado_por_usuario (criado_por_usuario_id),
  CONSTRAINT fk_gestoes_criado_por_usuario
    FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gestao_membros (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gestao_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  papel ENUM('proprietario', 'administrador', 'editor', 'visualizador') NOT NULL DEFAULT 'editor',
  status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  entrou_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_gestao_membros_gestao_usuario (gestao_id, usuario_id),
  KEY idx_gestao_membros_usuario (usuario_id),
  CONSTRAINT fk_gestao_membros_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_gestao_membros_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS convites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gestao_id BIGINT UNSIGNED NOT NULL,
  convidado_por_usuario_id BIGINT UNSIGNED NOT NULL,
  usuario_convidado_id BIGINT UNSIGNED NULL,
  email_destino VARCHAR(150) NOT NULL,
  nome_destino VARCHAR(120) NULL,
  token CHAR(64) NOT NULL,
  papel_sugerido ENUM('proprietario', 'administrador', 'editor', 'visualizador') NOT NULL DEFAULT 'editor',
  status ENUM('pendente', 'aceito', 'expirado', 'cancelado') NOT NULL DEFAULT 'pendente',
  expira_em DATETIME NOT NULL,
  aceito_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_convites_token (token),
  KEY idx_convites_gestao_status (gestao_id, status),
  KEY idx_convites_email_status (email_destino, status),
  CONSTRAINT fk_convites_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_convites_convidado_por_usuario
    FOREIGN KEY (convidado_por_usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_convites_usuario_convidado
    FOREIGN KEY (usuario_convidado_id) REFERENCES usuarios (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gestao_id BIGINT UNSIGNED NOT NULL,
  criado_por_usuario_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  instituicao VARCHAR(120) NULL,
  tipo ENUM('carteira', 'corrente', 'poupanca', 'cartao_credito', 'investimento', 'caixa', 'outro') NOT NULL DEFAULT 'corrente',
  saldo_inicial DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  limite_credito DECIMAL(14,2) NULL,
  fechamento_dia TINYINT UNSIGNED NULL,
  vencimento_dia TINYINT UNSIGNED NULL,
  ativa TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_contas_gestao_nome (gestao_id, nome),
  KEY idx_contas_criado_por_usuario (criado_por_usuario_id),
  CONSTRAINT fk_contas_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_contas_criado_por_usuario
    FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_contas_fechamento_dia
    CHECK (fechamento_dia IS NULL OR fechamento_dia BETWEEN 1 AND 31),
  CONSTRAINT chk_contas_vencimento_dia
    CHECK (vencimento_dia IS NULL OR vencimento_dia BETWEEN 1 AND 31)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gestao_id BIGINT UNSIGNED NOT NULL,
  criada_por_usuario_id BIGINT UNSIGNED NOT NULL,
  categoria_pai_id BIGINT UNSIGNED NULL,
  nome VARCHAR(120) NOT NULL,
  natureza ENUM('receita', 'despesa', 'ambos') NOT NULL DEFAULT 'despesa',
  cor_hex CHAR(7) NULL,
  icone VARCHAR(50) NULL,
  sistema TINYINT(1) NOT NULL DEFAULT 0,
  ativa TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categorias_gestao_nome_natureza (gestao_id, nome, natureza),
  KEY idx_categorias_pai (categoria_pai_id),
  CONSTRAINT fk_categorias_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_categorias_criada_por_usuario
    FOREIGN KEY (criada_por_usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_categorias_pai
    FOREIGN KEY (categoria_pai_id) REFERENCES categorias (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lancamentos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gestao_id BIGINT UNSIGNED NOT NULL,
  conta_id BIGINT UNSIGNED NOT NULL,
  conta_destino_id BIGINT UNSIGNED NULL,
  categoria_id BIGINT UNSIGNED NULL,
  criado_por_usuario_id BIGINT UNSIGNED NOT NULL,
  tipo ENUM('receita', 'despesa', 'transferencia', 'ajuste') NOT NULL,
  status ENUM('previsto', 'pendente', 'liquidado', 'cancelado') NOT NULL DEFAULT 'pendente',
  meio ENUM('pix', 'debito', 'credito', 'dinheiro', 'boleto', 'ted_doc', 'transferencia', 'outro') NULL,
  descricao VARCHAR(150) NOT NULL,
  observacoes TEXT NULL,
  valor_total DECIMAL(14,2) NOT NULL,
  competencia_data DATE NOT NULL,
  competencia_hora TIME NULL,
  vencimento_data DATE NULL,
  liquidado_em DATETIME NULL,
  recorrente TINYINT(1) NOT NULL DEFAULT 0,
  origem_externa VARCHAR(100) NULL,
  anexos JSON NULL,
  metadados JSON NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lancamentos_gestao_competencia (gestao_id, competencia_data),
  KEY idx_lancamentos_gestao_competencia_hora (gestao_id, competencia_data, competencia_hora),
  KEY idx_lancamentos_gestao_status (gestao_id, status),
  KEY idx_lancamentos_categoria (categoria_id),
  KEY idx_lancamentos_conta (conta_id),
  KEY idx_lancamentos_criado_por_usuario (criado_por_usuario_id),
  CONSTRAINT fk_lancamentos_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_lancamentos_conta
    FOREIGN KEY (conta_id) REFERENCES contas (id),
  CONSTRAINT fk_lancamentos_conta_destino
    FOREIGN KEY (conta_destino_id) REFERENCES contas (id),
  CONSTRAINT fk_lancamentos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT fk_lancamentos_criado_por_usuario
    FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_lancamentos_valor_total
    CHECK (valor_total > 0),
  CONSTRAINT chk_lancamentos_categoria
    CHECK (
      (tipo = 'transferencia' AND categoria_id IS NULL)
      OR (tipo <> 'transferencia' AND categoria_id IS NOT NULL)
    ),
  CONSTRAINT chk_lancamentos_transferencia
    CHECK (
      (tipo <> 'transferencia' AND conta_destino_id IS NULL)
      OR (tipo = 'transferencia' AND conta_destino_id IS NOT NULL AND conta_destino_id <> conta_id)
    )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lancamento_rateios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lancamento_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  valor DECIMAL(14,2) NOT NULL,
  percentual DECIMAL(7,4) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_lancamento_rateios_lancamento_usuario (lancamento_id, usuario_id),
  KEY idx_lancamento_rateios_usuario (usuario_id),
  CONSTRAINT fk_lancamento_rateios_lancamento
    FOREIGN KEY (lancamento_id) REFERENCES lancamentos (id),
  CONSTRAINT fk_lancamento_rateios_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_lancamento_rateios_valor
    CHECK (valor > 0),
  CONSTRAINT chk_lancamento_rateios_percentual
    CHECK (percentual IS NULL OR (percentual >= 0 AND percentual <= 100))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS metas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gestao_id BIGINT UNSIGNED NOT NULL,
  criada_por_usuario_id BIGINT UNSIGNED NOT NULL,
  categoria_id BIGINT UNSIGNED NULL,
  conta_id BIGINT UNSIGNED NULL,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  tipo ENUM('economia', 'gasto_maximo', 'receita_minima', 'saldo_conta') NOT NULL,
  periodicidade ENUM('mensal', 'trimestral', 'anual', 'livre') NOT NULL DEFAULT 'mensal',
  valor_alvo DECIMAL(14,2) NOT NULL,
  valor_inicial DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  inicio_em DATE NOT NULL,
  fim_em DATE NULL,
  status ENUM('ativa', 'concluida', 'cancelada') NOT NULL DEFAULT 'ativa',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_metas_gestao_status (gestao_id, status),
  CONSTRAINT fk_metas_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id),
  CONSTRAINT fk_metas_criada_por_usuario
    FOREIGN KEY (criada_por_usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_metas_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT fk_metas_conta
    FOREIGN KEY (conta_id) REFERENCES contas (id),
  CONSTRAINT chk_metas_valor_alvo
    CHECK (valor_alvo > 0),
  CONSTRAINT chk_metas_periodo
    CHECK (fim_em IS NULL OR fim_em >= inicio_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notificacoes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  gestao_id BIGINT UNSIGNED NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensagem TEXT NOT NULL,
  canal ENUM('in_app', 'email', 'push') NOT NULL DEFAULT 'in_app',
  status ENUM('pendente', 'enviada', 'lida', 'erro') NOT NULL DEFAULT 'pendente',
  payload JSON NULL,
  lida_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notificacoes_usuario_status (usuario_id, status),
  KEY idx_notificacoes_gestao (gestao_id),
  CONSTRAINT fk_notificacoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_notificacoes_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auditoria (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NULL,
  gestao_id BIGINT UNSIGNED NULL,
  acao VARCHAR(50) NOT NULL,
  modulo VARCHAR(50) NOT NULL,
  entidade VARCHAR(50) NULL,
  entidade_id BIGINT UNSIGNED NULL,
  origem VARCHAR(50) NOT NULL DEFAULT 'api',
  request_id CHAR(36) NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  detalhes JSON NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_usuario_criado_em (usuario_id, criado_em),
  KEY idx_auditoria_gestao_modulo (gestao_id, modulo),
  KEY idx_auditoria_request_id (request_id),
  CONSTRAINT fk_auditoria_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_auditoria_gestao
    FOREIGN KEY (gestao_id) REFERENCES gestoes (id)
) ENGINE=InnoDB;
