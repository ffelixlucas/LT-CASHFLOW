import type { Router } from "express";
import type { SearchController } from "./embeddings.controller";

/**
 * Registra `POST /search` no router pai (`/docs`).
 * Mantemos mounts achatados para evitar conflito de middleware.
 */
export function registerSearchRoute(
  parent: Router,
  controller: SearchController
): void {
  parent.post("/search", controller.search);
}
