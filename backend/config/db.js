// backend/config/db.js
const mysql = require("mysql2/promise");
const { logger } = require("../utils/logger");

let pool;

async function initDB() {
  if (pool) return pool;

  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: "Z",
    });

    const [rows] = await pool.query("SELECT 1 + 1 AS resultado");
    logger.debug(`Resultado teste DB: ${rows[0].resultado}`);
  } catch (error) {
    logger.error("❌ Erro ao conectar no banco de dados:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    process.exit(1);
  }

  return pool;
}

module.exports = { pool: () => pool, initDB };
