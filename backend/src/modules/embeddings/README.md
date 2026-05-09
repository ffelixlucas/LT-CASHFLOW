# `embeddings/` — vetores locais para busca semântica

Implementa **FASE 2** da plataforma. Stack default: `@xenova/transformers` com `Xenova/all-MiniLM-L6-v2` (384 dim).

## Componentes

| Arquivo | Responsabilidade |
|---------|------------------|
| `embeddings.types.ts` | `EmbeddingsProvider`, `EmbeddingRecord`, `SearchMatch` |
| `embeddings.provider.ts` | Factory polimórfica (`local` \| `stub` \| `instance`) |
| `embeddings.local.ts` | Xenova com lazy-load de modelo + cache singleton |
| `embeddings.stub.ts` | Bag-of-tokens hashing — determinístico, sem rede |
| `embeddings.store.ts` | Sidecar `<dir>/<hash>.json`, atomic write |
| `embeddings.search.ts` | `searchByQuery(query, opts)` — cosine + filtros |
| `embeddings.hook.ts` | `postWriteHook` que gera/reusa embedding por hash |
| `embeddings.controller.ts` | `POST /docs/search` |
| `embeddings.routes.ts` | mount no router pai |

## Princípios

1. **Cache pelo hash.** Conteúdo igual → reuso garantido (`embedding_reused`).
2. **Provider desacoplado.** Adicionar OpenAI/Voyage/Cohere = nova classe + variante de `ProviderConfig`.
3. **Store desacoplada.** Trocar JSON sidecar por `pgvector` = nova classe com a mesma interface.
4. **Sem ANN ainda.** Cosine puro é correto e auditável até ~5k docs.

## Adicionar um novo provider

```ts
// embeddings.openai.ts
export class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  readonly model = "text-embedding-3-small";
  readonly dimensions = 1536;
  async embed(text: string) {
    // ... fetch OpenAI API ...
  }
}
```

E em `embeddings.provider.ts`:

```ts
export type ProviderConfig =
  | { kind: "local"; ... }
  | { kind: "stub"; ... }
  | { kind: "openai"; apiKey: string; model?: string }
  | { kind: "instance"; provider: EmbeddingsProvider };
```

Pronto. `searchByQuery`, `embeddings.hook`, `rag.hook` continuam intactos.
