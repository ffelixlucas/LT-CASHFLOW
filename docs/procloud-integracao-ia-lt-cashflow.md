# LT CashFlow — Integração com IA (visão técnica)

Documento de referência para **Procloud**: como o produto usa modelo de linguagem (Groq/OpenAI), como os dados são consultados no banco e como o assistente aparece no frontend.

**Stack:** app Next.js (`apps/web`), camada server-only em TypeScript, MySQL via `mysql2` (`@ltcashflow/db`).

---

## 1. Visão geral da arquitetura

O projeto **não utiliza** o recurso de **tool/function calling** das APIs de chat (não há envio de lista `tools` nem rounds de `tool_calls`).

O fluxo é:

1. O LLM responde **somente em JSON** (`response_format: { type: "json_object" }`), guiado por um prompt de sistema que descreve o formato esperado.
2. O servidor **parseia, valida e normaliza** esse JSON.
3. Código TypeScript **deterministicamente** chama funções do módulo **`repository`**, que executam **SQL** parametrizado.
4. Opcionalmente, outra chamada ao LLM **reescreve** a resposta final (`composeAssistantReply`) com base em fatos já calculados — sem inventar números.

Isso separa claramente **interpretação de linguagem natural** (modelo) de **execução e segurança de dados** (aplicação + banco).

---

## 2. Chamada à API (Groq e fallback OpenAI)

**Arquivo central:** `apps/web/src/lib/server/ai.ts`

- Função interna **`callOpenAICompatibleJson`**: `POST {baseUrl}/chat/completions` no formato compatível com OpenAI (Groq expõe o mesmo contrato).
- Função **`getAiRuntime`**: escolhe o provedor por variáveis de ambiente:
  - **`GROQ_API_KEY`** → provedor Groq, URL padrão `https://api.groq.com/openai/v1`, modelo padrão `llama-3.1-8b-instant`.
  - Caso contrário, **`OPENAI_API_KEY`** → OpenAI (URLs/modelos configuráveis).
  - Sem chave → modo **local** (heurísticas no servidor, sem chamada remota).

Variáveis úteis (não exaustivo):

| Variável | Uso |
|----------|-----|
| `GROQ_API_KEY` | Habilita Groq |
| `GROQ_BASE_URL` | Sobrescreve base URL (opcional) |
| `GROQ_MODEL` | Sobrescreve modelo (opcional) |
| `OPENAI_API_KEY` | Habilita OpenAI se Groq não estiver definido |

---

## 3. “Tools” / funções — o que existe na prática

Na API do modelo **não** há ferramentas registradas. Em termos de produto, as capacidades são:

| Camada | Responsabilidade |
|--------|------------------|
| **LLM** | Produz JSON estruturado: planos de busca, classificação de insights, rascunhos de lançamento/conta, envelope `{"answer":"..."}` para narração. |
| **`ai.ts`** | Prompts, parsing, normalização e **fallback local** quando não há runtime remoto ou o JSON é inválido. |
| **`assistant/route.ts`** | Interpreta o plano e despacha para funções do **`repository`**. |
| **Rotas de mutação** (ex.: quick-add save) | Persistência após confirmação do usuário. |

Principais **funções exportadas** em `ai.ts` relacionadas ao assistente:

- `planAssistantSearch` — plano de consulta (`intent`, `filters`, …).
- `planAssistantInsight` — classificação de perguntas mais ricas (`action`, `timeframe`, …).
- `suggestQuickAdd`, `suggestCreateAccount`, `suggestRenameAccount`, `suggestKeepAccounts`, … — rascunhos estruturados.
- `composeAssistantReply` — texto final conversacional a partir de **fallback + fatos**.
- Funções de refinamento/estabilização (`refineAssistantSearchPlan`, `stabilizeAssistantSearchPlan`, etc.).

Schemas Zod compartilhados vivem no pacote **`@ltcashflow/validation`** (ex.: `assistantSearchPlanSchema`).

---

## 4. Execução de queries no banco

O modelo **nunca** executa SQL.

**Orquestração:** `apps/web/src/app/api/assistant/route.ts`

- Após obter o plano (via LLM ou refinamento local), o código faz ramificações por **`intent`** / **`action`** e chama, entre outras:
  - `searchLancamentos`
  - `findLatestLancamento`
  - `findLargestLancamento`
  - `summarizeLancamentos`
  - `sumLancamentos`
  - `getCashOverview`, `getAvailableBalance`
  - etc.

**Implementação SQL:** `apps/web/src/lib/server/repository.ts`

- Exemplo: `searchLancamentos` monta condições via `buildLancamentoFilters`, executa `pool.query` com SQL parametrizado e limite de resultados (ex.: 50 lançamentos).

**Persistência de lançamento sugerido pela IA:** rota `apps/web/src/app/api/ai/quick-add/save/route.ts` chama `createLancamento` ou `createTransferencia` no `repository`, após autenticação e permissões.

Outro endpoint relacionado: `apps/web/src/app/api/ai/search/route.ts` — fluxo mais direto de “pergunta → plano → busca” para uso em painéis do dashboard.

---

## 5. Frontend — estrutura do chat

**Componente principal:** `apps/web/src/components/assistant/global-assistant.tsx`

- Estado: lista **`messages`** com tipo união **`AssistantMessage`**:
  - usuário: `role: "user"`, `text`;
  - assistente: `role: "assistant"`, `text`, `provider`, `kind`, e opcionalmente `results`, `suggestion`, `plan`.
- **`kind`** exemplos: `search`, `quick_add`, `quick_add_batch`, `account_create`, `account_rename`, `transactions_update`, `info`, etc.
- Envio: **`POST /api/assistant`** com corpo JSON incluindo `prompt`, `gestaoId` e contexto da mensagem anterior (`previousPrompt`, `previousAnswer`, `previousKind`, `previousResults`, `previousPlan`, `previousSuggestion`) para follow-up.
- Confirmação de rascunho: **`POST /api/ai/quick-add/save`** (e outras rotas `/api/assistant/*` conforme ações na UI).

**Montagem global:** `apps/web/src/app/layout.tsx` renderiza `<GlobalAssistant />` quando há usuário autenticado.

Painéis adicionais no dashboard (mesma ideia de API, UI dedicada):

- `apps/web/src/components/dashboard/ai-search-panel.tsx`
- `apps/web/src/components/dashboard/ai-quick-add-panel.tsx`

---

## 6. Arquivos principais (checklist)

| Caminho | Papel |
|---------|--------|
| `apps/web/src/lib/server/ai.ts` | Cliente HTTP compatível OpenAI, runtime Groq/OpenAI, prompts JSON, fallbacks locais |
| `apps/web/src/app/api/assistant/route.ts` | Rota principal do copiloto: auth, planos, chamadas ao `repository`, narração |
| `apps/web/src/lib/server/repository.ts` | Acesso a dados (SQL) |
| `apps/web/src/components/assistant/global-assistant.tsx` | Chat, estado, chamadas fetch |
| `apps/web/src/app/api/ai/search/route.ts` | Busca assistida (dashboard) |
| `apps/web/src/app/api/ai/quick-add/save/route.ts` | Gravar lançamento a partir do rascunho |
| `packages/validation` (via `@ltcashflow/validation`) | Contratos JSON validados |

---

## 7. Resumo executivo

- **Groq** (ou OpenAI) é usado via **`/chat/completions`** com saída **forçada em JSON**.
- Não há **tools** no sentido da API; há **planos e rascunhos** interpretados pelo servidor.
- **Dados financeiros** vêm sempre do **`repository`** (SQL), com auth e regras de negócio na camada de API.
- O **chat** é um cliente React que conversa com **`/api/assistant`** e rotas auxiliares para confirmar mutações.

---

*Documento gerado para alinhamento técnico — LT CashFlow.*
