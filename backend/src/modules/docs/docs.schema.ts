import { z } from "zod";

/**
 * Schemas Zod do Doc Engine.
 *
 * Estratégia: **estrutura aqui, regras de negócio no service**.
 *
 * - Zod garante shape: `path:string`, `content:string`, `tags?:string[]`,
 *   `categoria?:string|null`, e os limites do envelope batch.
 * - O `DocsService` segue dono da semântica (path traversal, extensão,
 *   tamanho, hash, hooks) — então nunca duplicamos validação.
 */

/** Default exposto em `BuildDocsRouterOptions` para o teto do batch. */
export const DEFAULT_SAVE_MANY_LIMIT = 50;

const itemSchema = z.object({
  path: z.string().min(1, "path_required"),
  content: z.string("content_must_be_string"),
  categoria: z.union([z.string(), z.null()]).optional(),
  tags: z.array(z.string()).optional(),
});

export const saveDocSchema = itemSchema;
export type SaveDocSchemaInput = z.infer<typeof saveDocSchema>;

/**
 * Envelope de `POST /docs/save-many`.
 *
 * Limite de 50 docs por request por padrão (override via opção do router).
 * Vazio é rejeitado: ingestão zero não faz sentido e quase sempre é bug
 * de cliente.
 */
export function buildSaveManySchema(maxItems = DEFAULT_SAVE_MANY_LIMIT) {
  return z.object({
    docs: z
      .array(itemSchema)
      .min(1, "docs_must_be_non_empty")
      .max(maxItems, `docs_exceeds_max_${maxItems}`),
  });
}

export type SaveManySchemaInput = z.infer<
  ReturnType<typeof buildSaveManySchema>
>;

/** Util: extrai mensagem amigável a partir de `ZodError`. */
export function formatZodError(err: z.ZodError): {
  code: string;
  message: string;
  issues: Array<{ path: string; message: string; code: string }>;
} {
  const first = err.issues[0];
  return {
    code: first?.message ?? "invalid_payload",
    message: first?.message ?? "invalid_payload",
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    })),
  };
}
