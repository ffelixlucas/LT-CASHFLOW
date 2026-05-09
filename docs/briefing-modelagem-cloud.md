# Briefing para modelagem e arquitetura (Cloud)

Status: rascunho vivo para handoff  
Projeto: **LT CashFlow**  
Objetivo deste documento: dar contexto completo ao Cloud (ou outro agente) para propor **UX premium**, **arquitetura**, **modelagem de dados** e **roadmap de telas**, alinhados ao que já existe e ao foco oficial do produto.

---

## 1. Foco do produto (fonte da verdade)

Leitura obrigatória no repositório:

- `docs/modelagem/README.md` — pacote centralizado (produto, UX, arquitetura, dados, fluxos, ops)
- `docs/produto-roadmap.md` — posicionamento, problema, núcleo, MVP
- `docs/stack-padrao.md` — stack congelada
- `backend/docs/modelagem-dados.md` — modelo canônico (gestões, contas, lançamentos)
- `docs/assistente-ia.md` — como a IA deve operar (ferramentas, confirmação, não inventar)

**Definição oficial (resumo):**  
O LT CashFlow não é “mais um app de gráficos”. É um **sistema operacional financeiro pessoal/familiar**, centrado em **extrato**, **conciliação com o banco**, **linguagem natural** e **operação rápida**, **mobile first**, com **gestão compartilhada**.

**Núcleo que precisa ficar impecável:** entrada, despesa, saída da conta, estorno, origem (conta), categoria, meio, datas, saldo, extrato, conciliação.

---

## 2. Stack e infra atuais

Conforme `docs/stack-padrao.md` e monorepo:

| Camada | Escolha oficial |
|--------|-----------------|
| Runtime | Node.js 20 LTS |
| Pacotes | pnpm workspaces |
| App web | Next.js App Router (`apps/web`) |
| UI | Tailwind + shadcn/ui |
| Dados | MySQL 8 + cliente mysql2 / Drizzle em evolução (`packages/db`) |
| Validação | zod (`packages/validation`) |
| Auth | Auth.js (NextAuth) |
| Estado remoto / forms | TanStack Query, RHF + zod (alvo) |

**Deploy alvo documentado:** Vercel (app) + MySQL gerenciado + R2 + Resend (vide `docs/deploy-railway.md` como referência de env).

**Estado real de implementação:** o produto “vivo” é o app Next em `apps/web` (dashboard, APIs em `apps/web/src/app/api`, server actions). Pasta `backend/` é legado — não é o alvo de novas features.

---

## 3. Modelo de dados no banco (MySQL)

Schema SQL canônico: `backend/database/schema.sql`.

**Conceitos-chave:**

- **`gestoes`**: espaço financeiro (pessoal, familiar, etc.). Relação N:N com usuários via **`gestao_membros`**.
- **`contas`**: origens (carteira, corrente, poupança, cartão, investimento, caixa, outro). **`saldo_atual` não é persistido** — deriva de `saldo_inicial` + lançamentos liquidados.
- **`lancamentos`**: movimentação central (`receita`, `despesa`, `transferencia`, `ajuste`), com `meio` (pix, débito, crédito, etc.), `competencia_data`, opcional `competencia_hora`, `origem_externa`, `status`.
- **`lancamento_rateios`**: participação por pessoa (base para “conjunto” vs individual).
- **`categorias`**, **`metas`**, **`auditoria`**, **`notificacoes`**: previstos no modelo.

**Lacunas conhecidas vs intenção do modelo:**

- **`transferencia`** entre contas está no schema (`conta_destino_id`), mas o fluxo completo na UI/API de criação nem sempre está plugado como primeiro-class (muitas movimentações ainda entram como receita/despesa nas pontas).
- **Cartão vs conta corrente:** compras ficam na conta `cartao_credito`; pagamentos da fatura aparecem na **corrente** como despesa agregada e podem aparecer na **fatura do cartão** como crédito — é preciso **modelo mental e UX** para não duplicar nem confundir totais.
- **Investimento vs poupança:** no Inter, “Porquinho” comporta-se como **poupança/objetivo**, não necessariamente “investimento” de mercado. Decisão de produto em curso: **tratar Porquinho como `poupanca`** na conta, não como `investimento`, para refletir uso real e relatórios.

---

## 4. O que já está implementado (alto nível)

- Login / sessão, gestão ativa, lista de contas e categorias.
- Dashboard com separação recente entre **disponível (corrente/carteira/caixa)** vs **poupança** vs **investimentos** nos totais e na conciliação por origem (`apps/web/src/app/dashboard/page.tsx` + `getGestaoSaldosPorBucket` em `repository.ts`).
- Extrato recente, filtros, criação/edição de lançamentos via UI e fluxos de API.
- **Conciliação / importação** de extrato bancário via rotas em `apps/web/src/app/api/reconciliacao/` (validações com zod).
- **Assistente global** com integração a LLM e operações sobre dados reais (`docs/assistente-ia.md`, `apps/web/src/app/api/assistant/`).

**Dados reais já carregados em ambiente de desenvolvimento (exemplo de uso):**

- Import de extrato PDF da conta corrente Inter para conta específica, com `origem_externa` marcada.
- Cartão: lançamentos manuais e lote com `origem_externa` por fatura (ex.: `fatura_cartao_jan2026`).
- Contas separadas para cartão e porquinhos; **ajuste de `saldo_inicial`** na corrente para fechar com extrato.

---

## 5. O que queremos evoluir (pedido explícito ao Cloud)

### 5.1 Experiência (UX premium)

- Hierarquia clara: **o que posso gastar hoje** vs **reserva / poupança / objetivos** vs **cartão (dívida competência)** vs **investimentos de verdade** (se existirem).
- Fluxos rápidos no mobile: registrar, corrigir, conciliar, ver discrepâncias.
- Visual consistente, não genérico; leitura de extrato como produto principal.

### 5.2 Faturas de cartão

- **Tela ou fluxo dedicado** por cartão: ciclo de fechamento, total da fatura, pagamento mínimo (se aplicável), lista de transações, pagamentos já debitados na corrente.
- Importação confiável (PDF/CSV) com **deduplicação** e vínculo ao **mesmo `gestao_id` / `conta_id`**.
- Cruzamento explícito: **pagamento na corrente ↔ abatimento na fatura**, sem double-count no patrimônio líquido.

### 5.3 Poupança / Porquinho / investimentos

- Padronizar: **Porquinho Inter → tipo conta `poupanca`** (ou tipo dedicado “objetivo” no futuro), não misturar com investimento de renda variável.
- Movimentos **Aplicação / Resgate** devem tender a **`transferencia`** entre corrente e poupança (quando o fluxo estiver completo), não só despesa genérica na corrente.

### 5.4 Assinaturas e cobranças suspeitas

- Detectar **recorrências** (mesmo beneficiário, valor similar, intervalo ~mensal).
- Alertas para **assinaturas esquecidas** ou **valores que mudaram**.
- Lista “**revisar este mês**”: cargos duplicados, PIX repetido, microvalor suspeito.

Isso pode começar com **heurísticas + consultas SQL** e evoluir para scoring; a IA só sugere a partir de **dados agregados reais**, não inventando lançamentos.

### 5.5 Métricas educativas

- Poucas métricas que ajudem decisão: **taxa de poupança**, **ritmo de gasto vs média**, **maiores categorias no período**, **previsão simples de fim de mês** baseada em histórico.
- Linguagem acessível (“você gastou X a mais que no mês passado em Y”) com link para o extrato filtrado.

### 5.6 IA confiável (requisito central)

Princípios já documentados em `docs/assistente-ia.md`:

- Fonte de verdade: **banco da gestão**, schemas zod, rotas versionadas.
- **Não inventar** valores/datas/contas/categorias.
- Para escrita: **mostrar rascunho** e **confirmar** antes de gravar.
- Preferir **agente com ferramentas** (buscar, resumir, propor lançamento estruturado) a chat solto.

**Pedido adicional:** pipeline para **validar sugestões** da IA contra regras (limites de valor, conta obrigatória, duplicidade com últimos 30 dias, etc.) antes de persistir.

---

## 6. Sugestão de mapa de páginas (para o Cloud detalhar)

O Cloud deve propor navegação e states; lista inicial sugerida:

| Área | Finalidade |
|------|------------|
| Dashboard | Saldo por bucket, alertas, atalhos |
| Extrato | Lista principal filtrável (gestão, conta, período, texto) |
| Contas / Origens | CRUD, tipos, saldo inicial, fechamento cartão |
| Cartões | Por conta: faturas, import, pagamentos, conciliação |
| Poupança / Objetivos | Porquinho, metas, transferências |
| Assinaturas / Recorrências | Detecção + lista de revisão |
| Relatórios / Insights | Métricas período, comparativo |
| Configurações | Gestão, membros, categorias, export |
| Assistente | Painel lateral/modal com confirmação de ações |

---

## 7. Entregáveis esperados do Cloud

1. **Arquitetura de informação** (IA + fluxos) alinhada ao roadmap.
2. **Modelagem de dados**: extensões mínimas (ex.: `fechamento_fatura`, vínculo pagamento↔fatura, flags de recorrência) vs reuso de `lancamentos` + `metadados` JSON.
3. **Wireframes ou descrição de telas** premium mobile-first.
4. **Estratégia de conciliação** cartão/corrente e anti-duplicação.
5. **Plano de IA**: ferramentas, validação, limites, auditoria.

---

## 8. Restrições

- Não trocar stack oficial sem decisão documentada (`docs/stack-padrao.md`).
- Gestão compartilhada permanece central; filtros por pessoa vêm de **rateios**, não de colunas fixas inventadas.
- Bootstrap não é stack do produto principal.

---

## 9. Próximo passo operacional (humano)

- Recategorizar contas **Porquinho** de `investimento` para `poupanca` quando for só objetivo/poupança Inter.
- Garantir PDFs de fatura **válidos** no repositório ou fluxo de upload (os PDFs só na pasta do Cursor às vezes vêm corrompidos/vazios no ambiente de agente).

---

*Este arquivo foi gerado para handoff; evoluções devem referenciar `docs/produto-roadmap.md` como autoridade de produto.*
