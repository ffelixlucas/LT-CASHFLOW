import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type E2ESeedState = {
  seededAt: string;
  dbFingerprint: string;
  password: string;
  users: {
    editorA: { email: string; nome: string; id: number };
    editorB: { email: string; nome: string; id: number };
    viewerA: { email: string; nome: string; id: number };
  };
  gestoes: {
    a: {
      id: number;
      nome: string;
      marker: string;
      contaId: number;
      categoriaId: number | null;
    };
    b: {
      id: number;
      nome: string;
      marker: string;
      contaId: number;
      categoriaId: number | null;
    };
  };
};

const seedStatePath = resolve(__dirname, "../.seed-state.json");

export function hasE2ESeedState() {
  return existsSync(seedStatePath);
}

export function loadE2ESeedState(): E2ESeedState {
  if (!hasE2ESeedState()) {
    throw new Error(
      "Seed E2E ausente. Rode: cp apps/web/.env.test.example apps/web/.env.test && pnpm --filter web seed:e2e",
    );
  }

  return JSON.parse(readFileSync(seedStatePath, "utf8")) as E2ESeedState;
}
