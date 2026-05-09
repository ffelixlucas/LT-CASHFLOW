import { createLogger } from "../../utils/logger";
import { retrieve, type RetrieveDeps, type RetrieveOptions } from "./rag.retriever";
import type { BuildContextResult, RetrievalMatch } from "./rag.types";

const log = createLogger("rag.context");

/** Razão chars/token aproximada para conteúdo PT-BR/EN técnico. */
const TOKENS_PER_CHAR_RATIO = 1 / 4;

export interface BuildContextOptions extends RetrieveOptions {
  /** Limite de caracteres do contexto final. */
  maxContextChars?: number;
}

/**
 * Roda retrieval e empacota o contexto pronto para um prompt RAG.
 *
 * - cada match vira um bloco `--- <docPath> › <headingPath>` + conteúdo;
 * - corta no `maxContextChars` (mas garante pelo menos 1 match);
 * - **não chama LLM** — esse é o contrato da fase atual.
 */
export async function buildContext(
  deps: RetrieveDeps,
  query: string,
  opts: BuildContextOptions = {}
): Promise<BuildContextResult> {
  const maxContext = Math.max(500, opts.maxContextChars ?? 6000);
  const matches = await retrieve(deps, query, opts);

  const lines: string[] = [];
  let used = 0;

  for (const m of matches) {
    if (!m.content) continue;
    const breadcrumb = m.headingPath.length
      ? ` › ${m.headingPath.join(" › ")}`
      : "";
    const block = `--- ${m.docPath}${breadcrumb}\n${m.content}\n`;
    if (lines.length > 0 && used + block.length > maxContext) break;
    lines.push(block);
    used += block.length;
  }

  const context = lines.join("\n");
  const result: BuildContextResult = {
    query,
    matches: matches as RetrievalMatch[],
    context,
    tokensEstimate: Math.ceil(context.length * TOKENS_PER_CHAR_RATIO),
  };

  log.info("rag_context_built", {
    queryChars: query.length,
    matches: matches.length,
    contextChars: context.length,
    tokensEstimate: result.tokensEstimate,
  });

  return result;
}
