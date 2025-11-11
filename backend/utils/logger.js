const { createLogger, format, transports } = require("winston");
const { getContext } = require("./logContext");
const ENV = process.env.NODE_ENV || "development";

const levels = { error: 0, warn: 1, info: 2, echo: 3, debug: 4 };

const logger = createLogger({
  levels,
  level: ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ timestamp, level, message }) => {
      const ctx = getContext();
      const reqId = ctx?.requestId ? ` [req:${ctx.requestId}]` : "";
      return `${timestamp} [${level.toUpperCase()}]${reqId} ${message}`;
    })
  ),
  transports: [new transports.Console()],
});

logger.echo = (msg) => logger.log("echo", msg);
logger.debug = (msg) => logger.log("debug", msg);
logger.info = (msg) => logger.log("info", msg);
logger.warn = (msg) => logger.log("warn", msg);
logger.error = (msg, err) => {
  if (err instanceof Error) {
    logger.log("error", `${msg}\n${err.stack}`);
  } else {
    logger.log("error", `${msg} ${err ? JSON.stringify(err) : ""}`);
  }
};

module.exports = { logger };
