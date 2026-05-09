# Doc Engine — módulo `docs`

Motor local para **persistência automática de documentos arquiteturais** gerados por IA.
Stack: Node.js + Express + TypeScript. Sem dependências de banco; só sistema de arquivos.

> **Status:** FASE 1 (Doc Engine + Registry) implementada. Foundation pronta para FASE 2 (embeddings) e FASE 3 (RAG).

## Endpoints

| Método + path | Descrição |
|---|---|
| `POST /docs/save` | Salva 1 documento markdown |
| `POST /docs/save-many` | Ingestão massiva (até 50 docs por request) |
| `POST /docs/search` | Busca semântica por query (FASE 2) |
| `POST /docs/ask` | Recuperação RAG (FASE 3, sem LLM) |
| `GET /docs/health` | Health/snapshot da plataforma |

### `POST /docs/save`

```json
{
  "path": "docs/modelagem/ux/fluxo-extrato.md",
  "content": "# markdown...",
  "categoria": "ux",
  "tags": ["extrato", "financeiro", "mobile"]
}
```

`categoria` e `tags` são **opcionais**. Quando ausentes:

- `categoria` → inferida do path (`docs/modelagem/<cat>/...` ou `docs/<cat>/...`).
- `tags` → `[]`.

**Resposta 200:**

```json
{
  "success": true,
  "path": "docs/modelagem/ux/fluxo-extrato.md",
  "savedAt": "2026-05-07T17:19:40.178Z",
  "bytes": 1234,
  "hash": "sha256-hex…",
  "categoria": "ux",
  "tags": ["extrato", "financeiro", "mobile"]
}
```

**Erros:**

| HTTP | `error` | Quando |
|------|---------|--------|
| 400 | `missing_path_or_content` | payload incompleto |
| 400 | `invalid_path:*` | path traversal, extensão inválida, vazio etc. |
| 400 | `tags_must_be_string_array` | `tags` não é array de string |
| 400 | `categoria_must_be_string_or_null` | tipo errado em `categoria` |
| 401 | `unauthorized` | `DOCS_ENGINE_TOKEN` setado e header ausente/errado |
| 413 | `content_too_large` | acima de `DOCS_ENGINE_MAX_BYTES` |
| 415 | `content_type_must_be_json` | sem `Content-Type: application/json` |
| 500 | `internal_error` | falha de IO inesperada |

### `POST /docs/save-many`

Ingestão massiva sequencial. Reaproveita 100% do pipeline de `/docs/save` por
item (registry, embeddings, chunks, versionamento). Falha de um item **não**
interrompe o batch — cada item retorna seu próprio `ok`/`error`.

```json
{
  "docs": [
    {
      "path": "docs/modelagem/product/visao.md",
      "categoria": "product",
      "tags": ["visão"],
      "content": "# markdown..."
    },
    {
      "path": "docs/modelagem/ux/extrato.md",
      "content": "# markdown..."
    }
  ]
}
```

**Resposta 200:**

```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "results": [
    {
      "ok": true,
      "index": 0,
      "path": "docs/modelagem/product/visao.md",
      "result": { "success": true, "hash": "...", "savedAt": "...", "...": "..." }
    },
    {
      "ok": true,
      "index": 1,
      "path": "docs/modelagem/ux/extrato.md",
      "result": { "...": "..." }
    }
  ]
}
```

**Erro de item (envelope ainda 200):**

```json
{
  "ok": false,
  "index": 1,
  "path": "docs/foo.txt",
  "error": { "code": "invalid_path:extension_not_allowed", "message": "..." }
}
```

**Limites e validação:**

| Validação | Onde | Erro |
|---|---|---|
| `docs` é array | Zod | `400 invalid_type` |
| `1 ≤ docs.length ≤ 50` | Zod | `400 docs_must_be_non_empty` / `400 docs_exceeds_max_50` |
| Shape de cada item (`path:string`, `content:string`, `tags?:string[]`, `categoria?:string\|null`) | Zod | `400` com `issues[]` |
| Path traversal / extensão / tamanho | `DocsService` | erro **por item** dentro de `results[]` |

> Limite via `buildDocsRouter({ saveManyMaxItems: N })`. Default: 50.

## Registry — `docs/.registry.json`

Toda chamada bem-sucedida em `/docs/save` faz **upsert** em `docs/.registry.json`.

**Forma do arquivo (array, ordenado por `path`):**

```json
[
  {
    "path": "docs/modelagem/ux/fluxo-extrato.md",
    "categoria": "ux",
    "tags": ["extrato", "financeiro", "mobile"],
    "hash": "sha256-hex...",
    "bytes": 1234,
    "createdAt": "2026-05-07T17:19:40.178Z",
    "updatedAt": "2026-05-07T17:19:40.178Z"
  }
]
```

**Garantias:**

- chave única = `path`;
- `createdAt` é **preservado** em sobrescrita (só `updatedAt` muda);
- escrita **atômica** (`tempfile + rename`) — registry nunca fica corrompido após crash;
- fila serializada in-memory evita corrida de upserts no mesmo processo;
- arquivo ausente / corrompido → engine reseta (warn) na próxima escrita; **não bloqueia o save**.

**Por que `hash`:** invalidação barata em FASE 2 (recomputar embedding só quando hash muda).

**Desligar:** `buildDocsRouter({ enableRegistry: false })` ou alterar `registryRelativePath`.

## Como rodar

A partir de `backend/`:

```bash
pnpm install --ignore-workspace
pnpm dev:engine        # tsx watch, default :4001
# pnpm start:engine    # sem watch
# pnpm smoke:engine    # teste in-process do save + registry
# pnpm typecheck
```

Variáveis (todas opcionais):

| Env | Default | Descrição |
|-----|---------|-----------|
| `DOCS_ENGINE_PORT` | `4001` | porta HTTP |
| `DOCS_ENGINE_MAX_BYTES` | `1000000` | tamanho máximo do `content` |
| `DOCS_ENGINE_TOKEN` | *(off)* | quando setado, exige header `x-docs-engine-token` |

Raiz de escrita: **raiz do repositório** (resolvida em runtime). Qualquer path com `..` ou que escape essa raiz é rejeitado.

## Arquitetura

```
backend/src/
├── server.ts                       # bootstrap (porta dedicada do engine)
├── middlewares/
│   └── docs.security.ts            # content-type + token opcional
├── utils/
│   ├── logger.ts                   # logger com escopo
│   └── normalizePath.ts            # validação anti path-traversal
├── modules/docs/
│   ├── docs.routes.ts              # Router + factory + injeção do registry hook
│   ├── docs.controller.ts          # mapeia HTTP ↔ service
│   ├── docs.service.ts             # IO + hash + saveMarkdown + saveManyMarkdown
│   ├── docs.registry.ts            # upsert atômico + serial queue + inferCategoria
│   ├── docs.schema.ts              # Zod schemas (envelope + item de save-many)
│   └── docs.types.ts               # contratos
└── _smoke/
    └── docs.smoke.ts               # cobertura in-process: save + registry + erros + save-many
```

## Pontos de extensão (contrato estável)

Todos os ganchos abaixo cabem **dentro de `postWriteHooks`** sem mexer no contrato HTTP:

1. **Versionamento** — antes de sobrescrever, mover atual para `.versions/<ts>-<basename>.md`.
2. **Embeddings (FASE 2)** — comparar `hash` com último indexado e recalcular vetor; persistir em `docs/.embeddings/<hash>.json` ou store externo.
3. **RAG (FASE 3)** — endpoint `POST /ask-docs` que combina busca semântica (registry + embeddings) + LLM.
4. **Agentes especializados (FASE 4)** — sub-rotas (`/docs/save?agent=ux`) ou prompt scopes lendo o registry filtrado por `categoria`.
5. **Multi-root** — trocar `root: string` por `Record<alias, string>` em `DocsEngineConfig`.

A regra de ouro: **`SaveDocResult` e o shape de `DocRegistryEntry` são contratos estáveis** para clientes IA.

## Restrições deliberadas

- **Sem deletar arquivos** via API (não é parte do contrato).
- **Apenas `.md`** por padrão (extensível via `allowedExtensions`).
- **Sem subir paths absolutos** ou começar com `/`.
- **Sem rodar fora da raiz do repo** (validado em `normalizePath`).
- **Sem versionamento, embeddings ou RAG** ainda — pertencem às próximas fases.
