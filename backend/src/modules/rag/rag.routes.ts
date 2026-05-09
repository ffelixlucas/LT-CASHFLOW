import type { Router } from "express";
import type { RagController } from "./rag.controller";

export function registerAskRoute(parent: Router, controller: RagController): void {
  parent.post("/ask", controller.ask);
}
