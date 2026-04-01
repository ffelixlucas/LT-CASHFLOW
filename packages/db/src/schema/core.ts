import { sql } from "drizzle-orm";
import {
  bigint,
  char,
  datetime,
  index,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const usuarios = mysqlTable(
  "usuarios",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    nome: varchar("nome", { length: 120 }).notNull(),
    email: varchar("email", { length: 150 }).notNull(),
    senhaHash: varchar("senha_hash", { length: 255 }).notNull(),
    telefone: varchar("telefone", { length: 20 }),
    avatarUrl: varchar("avatar_url", { length: 255 }),
    status: mysqlEnum("status", ["ativo", "inativo", "pendente"]).default("ativo").notNull(),
    ultimoLoginEm: datetime("ultimo_login_em", { mode: "date" }),
    criadoEm: datetime("criado_em", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    atualizadoEm: datetime("atualizado_em", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [uniqueIndex("uk_usuarios_email").on(table.email)],
);

export const gestoes = mysqlTable(
  "gestoes",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    nome: varchar("nome", { length: 120 }).notNull(),
    descricao: text("descricao"),
    tipo: mysqlEnum("tipo", ["pessoal", "familiar", "profissional", "projeto"])
      .default("familiar")
      .notNull(),
    moedaPadrao: char("moeda_padrao", { length: 3 }).default("BRL").notNull(),
    fusoHorario: varchar("fuso_horario", { length: 60 })
      .default("America/Sao_Paulo")
      .notNull(),
    criadoPorUsuarioId: bigint("criado_por_usuario_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => usuarios.id),
    status: mysqlEnum("status", ["ativa", "arquivada"]).default("ativa").notNull(),
    criadoEm: datetime("criado_em", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    atualizadoEm: datetime("atualizado_em", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [index("idx_gestoes_criado_por_usuario").on(table.criadoPorUsuarioId)],
);

export const gestaoMembros = mysqlTable(
  "gestao_membros",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    gestaoId: bigint("gestao_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => gestoes.id),
    usuarioId: bigint("usuario_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => usuarios.id),
    papel: mysqlEnum("papel", ["proprietario", "administrador", "editor", "visualizador"])
      .default("editor")
      .notNull(),
    status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
    entrouEm: datetime("entrou_em", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    criadoEm: datetime("criado_em", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    atualizadoEm: datetime("atualizado_em", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uk_gestao_membros_gestao_usuario").on(table.gestaoId, table.usuarioId),
    index("idx_gestao_membros_usuario").on(table.usuarioId),
  ],
);

export const convites = mysqlTable(
  "convites",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    gestaoId: bigint("gestao_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => gestoes.id),
    convidadoPorUsuarioId: bigint("convidado_por_usuario_id", {
      mode: "number",
      unsigned: true,
    })
      .notNull()
      .references(() => usuarios.id),
    usuarioConvidadoId: bigint("usuario_convidado_id", {
      mode: "number",
      unsigned: true,
    }).references(() => usuarios.id),
    emailDestino: varchar("email_destino", { length: 150 }).notNull(),
    nomeDestino: varchar("nome_destino", { length: 120 }),
    token: char("token", { length: 64 }).notNull(),
    papelSugerido: mysqlEnum("papel_sugerido", [
      "proprietario",
      "administrador",
      "editor",
      "visualizador",
    ])
      .default("editor")
      .notNull(),
    status: mysqlEnum("status", ["pendente", "aceito", "expirado", "cancelado"])
      .default("pendente")
      .notNull(),
    expiraEm: datetime("expira_em", { mode: "date" }).notNull(),
    aceitoEm: datetime("aceito_em", { mode: "date" }),
    criadoEm: datetime("criado_em", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    atualizadoEm: datetime("atualizado_em", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("uk_convites_token").on(table.token),
    index("idx_convites_gestao_status").on(table.gestaoId, table.status),
    index("idx_convites_email_status").on(table.emailDestino, table.status),
  ],
);
