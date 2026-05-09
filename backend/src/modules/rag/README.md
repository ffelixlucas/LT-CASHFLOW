# `rag/` — retrieval e montagem de contexto (sem LLM ainda)

Implementa **FASE 3**. Foundation completa pra plugar OpenAI/Anthropic depois.

## Componentes

| Arquivo | Responsabilidade |
|---------|------------------|
| `rag.types.ts` | `Chunk`, `ChunkRecord`, `RetrievalMatch`, `BuildContextResult`, `CHUNKER_VERSION` |
| `rag.chunker.ts` | `chunkMarkdown(md, opts)` heading-aware com fallback paragráfico |
| `rag.store.ts` | Sidecar `docs/.chunks/<docHash>.json` |
| `rag.hook.ts` | `postWriteHook` que chunka + embeda + persiste |
| `rag.retriever.ts` | `retrieve(deps, query)` doc-level → chunk-level → merge |
| `rag.context.ts` | `buildContext(deps, query)` — monta o markdown final |
| `rag.controller.ts` | `POST /docs/ask` |
| `rag.routes.ts` | mount no router pai |

## Pipeline

1. **Save** dispara `chunks.hook`:
   - se `store.has(docHash)` → reusa;
   - senão → `chunkMarkdown(content)` → embeda cada chunk → `store.save`.
2. **Ask** chama `buildContext`:
   - `provider.embed(query)`;
   - rank doc-level pelo `embeddingsStore`;
   - para cada top-doc, rank chunks pelo `chunksStore`;
   - merge global → top K;
   - empacota blocos `--- <docPath> › <heading>` até `maxContextChars`.

## Quando plugar LLM

Adicionar `rag.llm.ts` com:

```ts
export interface LlmProvider {
  complete(prompt: string, opts: { maxTokens: number }): Promise<string>;
}

export async function answer(deps, query, opts) {
  const built = await buildContext(deps, query, opts);
  const prompt = `${SYSTEM}\n\nContexto:\n${built.context}\n\nPergunta: ${query}`;
  const text = await llm.complete(prompt, { maxTokens: 800 });
  return { ...built, answer: text };
}
```

`/docs/ask` ganha um modo `mode: "answer"` (default segue retornando só `context`). Contrato HTTP atual continua válido.

## Configuração de chunking

Default: `maxChars = 1200`. Mude via `buildDocsRouter({ rag: { chunkMaxChars: 800 } })`.

`CHUNKER_VERSION` deve ser **incrementado** quando a heurística mudar — assim os sidecars antigos viram inválidos por design e regeneram no próximo save.
