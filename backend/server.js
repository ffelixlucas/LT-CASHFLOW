// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const statusMonitor = require("express-status-monitor");
const { v4: uuidv4 } = require("uuid");

const { logger } = require("./utils/logger");
const { initDB } = require("./config/db");
const { setContext } = require("./utils/logContext");
const templateRoutes = require("./modules/_template/templateRoutes");

const app = express();
const PORT = process.env.PORT || 4000;

// 🔹 Monitoramento básico (CPU, memória, uptime, requisições)
app.use(statusMonitor());

// 🔹 Configurações globais
app.use(cors());
app.use(express.json());

// 🔹 Middleware de requestId + contexto global de logs
app.use((req, res, next) => {
  const requestId = uuidv4();
  setContext({ requestId });
  res.setHeader("X-Request-Id", requestId);
  logger.info(`➡️ ${req.method} ${req.url} [${requestId}]`);
  next();
});

// 🔹 Morgan integrado ao Winston (log detalhado de requisições HTTP)
app.use(
  morgan("tiny", {
    stream: { write: (msg) => logger.debug(msg.trim()) },
  })
);

// 🔹 Rota de status da API
app.get("/api/status", (req, res) => {
  logger.echo("✅ Servidor LT CashFlow está online!");
  res.json({ status: "ok", message: "LT CashFlow API rodando com sucesso!" });
});

// 🔹 Rotas do módulo template

app.use("/api/template", templateRoutes);


// 🔹 Página de monitoramento (acesse em http://localhost:4000/status)
app.get("/status", statusMonitor().pageRoute);

// 🔹 Inicialização principal
(async () => {
  try {
    await initDB();
    logger.echo("✅ Conexão com o banco de dados estabelecida com sucesso!");

    app.listen(PORT, () => {
      logger.echo(`🚀 Servidor LT CashFlow iniciado na porta ${PORT}`);
      logger.echo("✅ Servidor LT CashFlow está online!");
    });
  } catch (err) {
    logger.error("❌ Falha ao iniciar o servidor:", err);
    process.exit(1);
  }
})();

// 🔹 Captura de erros globais
process.on("unhandledRejection", (err) => console.error("🔥 Unhandled Rejection:", err));
process.on("uncaughtException", (err) => console.error("💥 Uncaught Exception:", err));
