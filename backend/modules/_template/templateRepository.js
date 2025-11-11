const { pool } = require("../../config/db");
const { logger } = require("../../utils/logger");

exports.buscarTodos = async () => {
  logger.debug("templateRepository.buscarTodos()");
  const db = pool(); // <- chama dinamicamente
  const [rows] = await db.query("SELECT * FROM template");
  return rows;
};

exports.inserir = async (dados) => {
  logger.debug("templateRepository.inserir()", { dados });
  const db = pool(); // <- chama dinamicamente
  const [result] = await db.query("INSERT INTO template SET ?", [dados]);
  return { id: result.insertId, ...dados };
};
