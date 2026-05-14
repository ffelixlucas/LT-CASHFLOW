import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const globalForDb = globalThis as typeof globalThis & {
  __ltCashflowMysqlPool?: mysql.Pool;
};

const connectionString = {
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "lt_cashflow",
};

function createPool() {
  return mysql.createPool({
    ...connectionString,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z",
  });
}

const pool = globalForDb.__ltCashflowMysqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ltCashflowMysqlPool = pool;
}

export const db = drizzle({ client: pool });
export { pool };
