type Level = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const ENV_LEVEL = (process.env.LOG_LEVEL ?? "debug").toLowerCase() as Level;
const ACTIVE_LEVEL: Level = LEVEL_PRIORITY[ENV_LEVEL] !== undefined
  ? ENV_LEVEL
  : "debug";

function shouldLog(level: Level): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[ACTIVE_LEVEL];
}

function format(level: Level, scope: string, message: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const tag = `[${level.toUpperCase()}]`;
  const head = `${ts} ${tag} [${scope}] ${message}`;
  if (meta === undefined) return head;
  try {
    return `${head} ${JSON.stringify(meta)}`;
  } catch {
    return `${head} [unserializable meta]`;
  }
}

export interface ScopedLogger {
  debug: (message: string, meta?: unknown) => void;
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
}

export function createLogger(scope: string): ScopedLogger {
  return {
    debug: (m, meta) =>
      shouldLog("debug") &&
      console.debug(format("debug", scope, m, meta)),
    info: (m, meta) =>
      shouldLog("info") && console.info(format("info", scope, m, meta)),
    warn: (m, meta) =>
      shouldLog("warn") && console.warn(format("warn", scope, m, meta)),
    error: (m, meta) =>
      shouldLog("error") &&
      console.error(format("error", scope, m, meta)),
  };
}
