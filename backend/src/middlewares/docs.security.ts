import type { NextFunction, Request, Response } from "express";
import { createLogger } from "../utils/logger";

const log = createLogger("docs.security");

/**
 * Middleware mínimo de segurança para o Doc Engine.
 *
 * - exige `Content-Type: application/json` em métodos com body;
 * - opcional: header `x-docs-engine-token` quando `DOCS_ENGINE_TOKEN` estiver setado;
 * - tudo que for além disso (rate limit, IP allowlist, RBAC) entra em camadas
 *   futuras sem alterar a assinatura desse middleware.
 */
export function docsSecurity(req: Request, res: Response, next: NextFunction) {
  const requiredToken = process.env.DOCS_ENGINE_TOKEN;
  if (requiredToken) {
    const provided = req.header("x-docs-engine-token");
    if (provided !== requiredToken) {
      log.warn("token_invalid", { ip: req.ip, path: req.path });
      res.status(401).json({ success: false, error: "unauthorized" });
      return;
    }
  }

  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const ct = req.header("content-type") ?? "";
    if (!ct.toLowerCase().includes("application/json")) {
      log.warn("invalid_content_type", { ct, path: req.path });
      res
        .status(415)
        .json({ success: false, error: "content_type_must_be_json" });
      return;
    }
  }

  next();
}
