import type { Router } from "express";
import type { HealthController } from "./health.controller";

export function registerHealthRoute(
  parent: Router,
  controller: HealthController
): void {
  parent.get("/health", controller.health);
}
