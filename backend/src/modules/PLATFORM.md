# Plataforma de conhecimento arquitetural — LTCashFlow

Este `backend/` deixa de ser “só um Doc Engine” e passa a ser uma **plataforma de memória arquitetural viva** para o produto:

- **Persistência** de documentos `.md` gerados por humanos ou IA;
- **Registry** com metadata e hash;
- **Versionamento leve** (snapshot do estado anterior em cada sobrescrita);
- **Embeddings locais** (default `Xenova/all-MiniLM-L6-v2`);
- **Busca semântica** (`POST /docs/search`);
- **RAG retrieval** (chunking heading-aware + montagem de contexto, sem LLM ainda);
- **Health endpoint** (`GET /docs/health`);
- **Foundation para agentes especializados** (UX/financeiro/banco/IA/conciliação) lendo a mesma base.

> A FASE 1 (`/docs/save` + registry) **não foi quebrada**. Tudo novo é opt-in.

---

## Endpoints

| Método | Path | Função | Fase |
|--------|------|--------|------|
| `POST` | `/docs/save` | persiste 1 markdown + dispara hooks | 1 |
| `POST` | `/docs/save-many` | ingestão massiva (≤ 50 docs/req, tolerante a falhas) | 1 |
| `POST` | `/docs/search` | busca semântica top-K | 2 |
| `POST` | `/docs/ask` | RAG retrieval + context assembly (sem LLM) | 3 |
| `GET`  | `/docs/health` | snapshot de saúde da plataforma | 3 |

Detalhe operacional dos códigos de erro: [`docs/README.md`](./docs/README.md).

### Exemplos

```http
POST /docs/save
{ "path": "docs/modelagem/ux/fluxo-extrato.md",
  "content": "# ...",
  "categoria": "ux",
  "tags": ["extrato", "financeiro", "mobile"] }
```

```http
POST /docs/save-many
{ "docs": [
    { "path": "docs/modelagem/product/visao.md", "content": "# ..." },
    { "path": "docs/modelagem/ux/extrato.md",   "content": "# ..." }
  ]
}

# resposta agregada
{ "success": true, "processed": 2, "failed": 0,
  "results": [
    { "ok": true,  "index": 0, "path": "...", "result": { ... } },
    { "ok": false, "index": 1, "path": "...",
      "error": { "code": "invalid_path:extension_not_allowed", "message": "..." } }
  ] }
```

```http
POST /docs/search
{ "query": "como funciona competência", "topK": 5 }
```

```http
POST /docs/ask
{ "query": "como funciona parcelamento?",
  "topK": 6, "maxContextChars": 6000 }
```

```http
GET /docs/health
{ "docs": 42, "embeddings": 42, "chunks": 380,
  "registryHealthy": true, "embeddingsHealthy": true, "chunksHealthy": true }
```

---

## Como rodar

```bash
cd backend
pnpm install --ignore-workspace
pnpm dev:engine        # tsx watch, default :4001 (embeddings: local, RAG: on)
pnpm smoke:engine      # cobertura in-process (usa stub provider)
pnpm typecheck
```

### Variáveis de ambiente

| Env | Default | Descrição |
|-----|---------|-----------|
| `DOCS_ENGINE_PORT` | `4001` | porta HTTP |
| `DOCS_ENGINE_MAX_BYTES` | `1000000` | limite de payload (`/docs/save`) |
| `DOCS_ENGINE_TOKEN` | *(off)* | header `x-docs-engine-token` exigido |
| `DOCS_EMBEDDINGS_ENABLED` | `true` | desligar embeddings/search/ask |
| `DOCS_EMBEDDINGS_PROVIDER` | `local` | `local` (Xenova) \| `stub` (sem rede) |
| `DOCS_RAG_ENABLED` | `true` | desliga chunks + `/docs/ask` |
| `DOCS_VERSIONING_ENABLED` | `true` | desliga `.versions/` |

Raiz canônica de escrita: **raiz do repositório** (resolvida via `path.resolve(__dirname, "..", "..")` em `server.ts`).

---

## Layout em disco

```
docs/
├── modelagem/...                 # docs versionados pelo Git (canônicos)
├── .registry.json                # metadata por path (FASE 1)
├── .embeddings/<hash>.json       # 1 vetor por hash de conteúdo (FASE 2)
├── .chunks/<hash>.json           # chunks heading-aware + vetor por chunk (FASE 3)
└── .versions/<isoTs>-<basename>  # snapshots em sobrescrita (FASE 3)
```

Os 4 sidecars são **opcionais e regeneráveis** a partir dos `.md` originais. Se algum corrompe, o engine reseta na próxima escrita sem bloquear.

> **`.gitignore` recomendado** no nível raiz do repositório para os sidecars (são regeneráveis e crescem com volume):
>
> ```
> docs/.embeddings/
> docs/.chunks/
> docs/.versions/
> ```
>
> O `docs/.registry.json` pode (a) ser versionado para servir de “mapa” legível em PR, ou (b) ser ignorado quando o time preferir manter docs leves. Decida conforme política de revisão.

---

## Arquitetura de código

```
backend/src/
├── server.ts                       # bootstrap; lê ENV; monta /docs router
├── middlewares/
│   └── docs.security.ts            # content-type + token opcional
├── utils/
│   ├── logger.ts
│   └── normalizePath.ts
└── modules/
    ├── docs/                       # FASE 1 — persistência markdown
    │   ├── docs.routes.ts          # composição do router unificado
    │   ├── docs.controller.ts
    │   ├── docs.service.ts         # IO + pre/post hooks + hash
    │   ├── docs.registry.ts        # docs/.registry.json (atomic + queue)
    │   ├── docs.types.ts
    │   └── README.md
    ├── embeddings/                 # FASE 2 — vetores
    │   ├── embeddings.types.ts
    │   ├── embeddings.provider.ts  # factory polimórfica
    │   ├── embeddings.local.ts     # Xenova/all-MiniLM-L6-v2 (lazy load)
    │   ├── embeddings.stub.ts      # determinístico (testes/air-gapped)
    │   ├── embeddings.store.ts     # docs/.embeddings/<hash>.json
    │   ├── embeddings.search.ts    # cosine + filtros
    │   ├── embeddings.hook.ts      # postWrite: gerar OU reusar
    │   ├── embeddings.controller.ts
    │   └── embeddings.routes.ts    # POST /docs/search
    ├── rag/                        # FASE 3 — chunks + retrieval + context
    │   ├── rag.types.ts            # CHUNKER_VERSION + shapes
    │   ├── rag.chunker.ts          # heading-aware markdown
    │   ├── rag.store.ts            # docs/.chunks/<hash>.json
    │   ├── rag.hook.ts             # postWrite: chunkar + embedar chunks
    │   ├── rag.retriever.ts        # doc-level → chunk-level → merge
    │   ├── rag.context.ts          # buildContext (sem LLM)
    │   ├── rag.controller.ts
    │   └── rag.routes.ts           # POST /docs/ask
    ├── versioning/                 # snapshot pré-write
    │   └── versioning.hook.ts
    ├── health/                     # GET /docs/health
    │   ├── health.controller.ts
    │   └── health.routes.ts
    └── PLATFORM.md                 # ← você está aqui
```

---

## Fluxo end-to-end de um save

```
HTTP POST /docs/save
   │
   ▼
DocsController.save
   │ valida payload (zod-like + tipos)
   ▼
DocsService.saveMarkdown
   │ normaliza path, calcula hash SHA-256
   │
   ├─▶ preWriteHooks (rodam ANTES da escrita)
   │       └─ versioning.hook   → docs/.versions/<isoTs>-<basename>
   │
   │  fs.writeFile(absolute, content)
   │
   └─▶ postWriteHooks (rodam DEPOIS da escrita)
           ├─ registry.hook     → docs/.registry.json (atomic upsert)
           ├─ embeddings.hook   → docs/.embeddings/<hash>.json
           │     │ se store.has(hash) → embedding_reused
           │     └ senão           → provider.embed(content) + store.save
           └─ chunks.hook       → docs/.chunks/<hash>.json
                 │ chunkMarkdown(content) → embed por chunk
                 └ store.save({chunkingVersion, chunks: [...]})

return SaveDocResult { path, savedAt, bytes, hash, categoria, tags }
```

**Chave única do cache** = `hash` do conteúdo. Mudou conteúdo → todos os sidecars atualizam. Conteúdo igual → reuso.

---

## Fluxo end-to-end de um `/docs/ask`

```
HTTP POST /docs/ask  { query, topK?, maxContextChars? }
   │
   ▼
RagController.ask  →  buildContext(deps, query, opts)
   │
   ▼
retrieve(deps, query)
   │ provider.embed(query)        ── 1 chamada de modelo
   │ embeddingsStore.list()       ── doc-level
   │ rank doc-level por cosine    ── top N docs
   │ for each top doc:
   │    chunksStore.get(docHash)  ── chunks já vetorizados
   │    rank chunks por cosine    ── top M por doc
   │ merge global, sort, slice    ── top K total
   ▼
buildContext: monta blocos
   "--- <docPath> › <h1 › h2>\n<chunkContent>\n"
   corta no limite (maxContextChars)
   ▼
return { query, matches, context, tokensEstimate }
```

> A IA externa (ChatGPT/Claude/etc.) **plugaria** aqui: `prompt = systemRules + context + query`. O endpoint atual deixa o usuário ver e validar o contexto **antes** de gastar token de LLM.

---

## Observabilidade

Eventos estruturados (`utils/logger.ts`, JSON-friendly):

| Escopo | Evento | Significado |
|--------|--------|-------------|
| `docs.service` | `save_start`, `save_ok` | ciclo completo do save |
| `docs.registry` | `registry_upserted`, `registry_unreadable_resetting` | mutação no índice |
| `versioning` | `version_created`, `read_existing_failed`, `version_write_failed` | snapshots |
| `embeddings.hook` | `embedding_generated`, `embedding_reused` | hit/miss de vetor |
| `embeddings.local` | `loading_model`, `model_loaded` | warmup do Xenova |
| `embeddings.search` | `search_start`, `search_ok` | métricas de busca |
| `rag.hook` | `chunks_generated`, `chunks_reused` | sidecar de chunks |
| `rag.retriever` | `retrieve_start`, `retrieve_ok` | retrieval |
| `rag.context` | `rag_context_built` | montagem de contexto |
| `health` | `*_unhealthy` | degradação visível |

Quando subir Prometheus/Datadog, basta plugar um transport adicional ao `logger`.

---

## Decisões deliberadas

1. **Sem banco de dados.** Tudo é arquivo JSON sidecar. Migração para Postgres/`pgvector` é trivial: trocar `EmbeddingsStore` e `ChunksStore` mantendo a interface.
2. **Cache pelo `hash` do conteúdo.** Embeddings nunca regeneram pra conteúdo igual; é por isso que `hash` foi cravado no `SaveDocResult` desde a FASE 1.
3. **Provider polimórfico.** Trocar `local` por `openai`/`voyage`/`cohere` = nova classe + nova variante em `ProviderConfig`. Nada mais muda.
4. **Cosine puro, sem ANN.** Direto e correto até ~5k docs. HNSW (`hnswlib-node`) entra atrás da mesma `searchByQuery`.
5. **RAG sem LLM ainda.** O `/docs/ask` retorna `context` + `tokensEstimate`. Plugar OpenAI/Anthropic é um único módulo `rag.llm.ts` no futuro.
6. **Pre/post hooks no service.** Versionamento, embeddings, chunks, índice — todos plugam fora da regra de IO. Adicionar “publicar para fila”, “webhook”, “telemetria custom” = um hook a mais.
7. **Stub provider de produção.** Permite CI air-gapped, smoke determinístico e fallback se o modelo falhar.

---

## Roadmap

### Concluído

- [x] FASE 1 — Doc Engine + Registry
- [x] FASE 2 — Embeddings locais + Search
- [x] FASE 3 — Chunks + Retrieval + `/docs/ask` foundation
- [x] Versionamento leve
- [x] Health endpoint
- [x] Observabilidade estruturada

### Próximos sem mudança de contrato

- [ ] **`rag.llm.ts`** plugando OpenAI/Anthropic em `/docs/ask`, mantendo `context` no payload de retorno (modo `dryRun`).
- [ ] **Agentes especializados** (`backend/src/agents/{ux,financial,backend,reconciliation}.ts`) consumindo `searchByQuery` com filtros por `categoria` + system prompts próprios.
- [ ] **`rag.qa.ts`** — eval set com perguntas-padrão (cartão, competência, conciliação) e cosine threshold de regressão.
- [ ] **HNSW** sob a mesma `searchByQuery` quando o catálogo crescer.
- [ ] **Multi-root** em `DocsEngineConfig` (`Record<alias, root>`) para misturar `docs/` + `apps/web/content/` + repos externos.
- [ ] **Embeddings Postgres/`pgvector`** trocando o `EmbeddingsStore` (interface estável).

### Fora de escopo até pedido explícito

- [ ] Deletar arquivos via API (não é parte do contrato HTTP).
- [ ] UI de admin / search no Next.
- [ ] Autenticação além do token compartilhado.
- [ ] Workers/queue para processamento assíncrono (tudo síncrono in-process por ora).

---

## Garantias de regressão

```bash
pnpm typecheck        # verde
pnpm smoke:engine     # 25 asserts: save+meta, registry, embeddings (gen/reuse),
                      # versioning, chunks, search (rank+filter+det),
                      # retrieve, rag-context, chunker, health, recovery,
                      # router-builds, traversal/ext/invalid-tags
```

`docs/COMPACTO-CHATGPT.md` e `docs/ORQUESTRADOR-*.md` continuam sendo a fonte para subir esse repositório no ChatGPT como “memória arquitetural” externa enquanto o RAG interno cobre o uso programático.
