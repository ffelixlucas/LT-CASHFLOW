import "dotenv/config";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import { createLogger } from "./utils/logger";
import { buildDocsRouter } from "./modules/docs/docs.routes";
import type { ProviderConfig } from "./modules/embeddings/embeddings.provider";

const log = createLogger("server");

const PORT = Number(process.env.DOCS_ENGINE_PORT ?? process.env.PORT ?? 4001);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MAX_BYTES = Number(process.env.DOCS_ENGINE_MAX_BYTES ?? 1_000_000);

const PROVIDER_KIND =
  (process.env.DOCS_EMBEDDINGS_PROVIDER ?? "local").toLowerCase() as
    | "local"
    | "stub";

const provider: ProviderConfig =
  PROVIDER_KIND === "stub" ? { kind: "stub" } : { kind: "local" };

const ENABLE_EMBEDDINGS =
  (process.env.DOCS_EMBEDDINGS_ENABLED ?? "true").toLowerCase() !== "false";
const ENABLE_RAG =
  (process.env.DOCS_RAG_ENABLED ?? "true").toLowerCase() !== "false";
const ENABLE_VERSIONING =
  (process.env.DOCS_VERSIONING_ENABLED ?? "true").toLowerCase() !== "false";

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: `${Math.ceil(MAX_BYTES / 1024)}kb`,
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "doc-engine" });
});

app.use(
  "/docs",
  buildDocsRouter({
    root: REPO_ROOT,
    maxContentBytes: MAX_BYTES,
    versioning: { enabled: ENABLE_VERSIONING },
    embeddings: ENABLE_EMBEDDINGS ? { enabled: true, provider } : undefined,
    rag: ENABLE_EMBEDDINGS && ENABLE_RAG ? { enabled: true } : undefined,
    health: { enabled: true },
  })
);

// 404 explícito (antes do error handler).
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

// Error handler global. Captura SyntaxError do body-parser, payload too large
// e qualquer erro não tratado dos handlers — sempre devolvendo JSON em vez
// de derrubar o socket (causa do `curl: (52) Empty reply`).
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const anyErr = err as { type?: string; status?: number; message?: string };

  if (err instanceof SyntaxError && anyErr.status === 400) {
    log.warn("invalid_json_body", {
      path: req.path,
      message: anyErr.message,
    });
    res.status(400).json({
      error: "invalid_json",
      message: anyErr.message,
      hint:
        "Strings JSON não podem conter quebras de linha cruas; use \\n escapado ou envie via @arquivo.json.",
    });
    return;
  }

  if (anyErr?.type === "entity.too.large") {
    log.warn("payload_too_large", { path: req.path });
    res.status(413).json({ error: "payload_too_large" });
    return;
  }

  log.error("unhandled_error", {
    path: req.path,
    message: anyErr?.message ?? "unknown",
  });
  res.status(500).json({ error: "internal_error" });
};
app.use(errorHandler);

// Rede de segurança: nunca derrubar o processo por hooks/promises soltas.
process.on("unhandledRejection", (reason) => {
  log.error("unhandled_rejection", {
    message: (reason as Error)?.message ?? String(reason),
  });
});
process.on("uncaughtException", (err) => {
  log.error("uncaught_exception", { message: err?.message });
});

app.listen(PORT, () => {
  log.info("doc_engine_listening", {
    port: PORT,
    root: REPO_ROOT,
    maxContentBytes: MAX_BYTES,
    embeddings: ENABLE_EMBEDDINGS ? PROVIDER_KIND : "off",
    rag: ENABLE_EMBEDDINGS && ENABLE_RAG ? "on" : "off",
    versioning: ENABLE_VERSIONING ? "on" : "off",
  });
});
