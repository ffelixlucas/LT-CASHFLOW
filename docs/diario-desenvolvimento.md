# Diário de desenvolvimento — LT CashFlow

Registro cronológico de entregas, decisões técnicas e ajustes de dados feitos no projeto.  
Formato: uma entrada por sessão relevante (mais recente no topo).

---

## 2026-05-18 — Conciliação cartão, parcelas futuras e melhorias de fechamento

### Código entregue

- Assistente financeiro: melhor interpretação de lançamentos em linguagem natural, incluindo:
  - variações/erros como “crédtio”, “debido”, “cartão de credito”;
  - `Pix enviado` como despesa por padrão;
  - descrições com melhor capitalização/acentuação;
  - categorias mais seguras para mesada/filhos e fallback em “Outros”.
- Página **Fatura do cartão**:
  - lista de movimentos virou componente editável;
  - clique em movimento abre modal para alterar descrição, status, meio, conta, categoria, valor, data, hora e competência da fatura;
  - ao trocar compra de crédito/cartão para débito/conta corrente, a competência da fatura é limpa;
  - select de mês da fatura corrigido para opções legíveis no dropdown.
- Página **Fechamento semanal**:
  - totais da tabela “Dia a dia” ficaram clicáveis;
  - modal de conferência mostra os lançamentos que compõem Entradas, Débito/Pix, Cartão e Tudo;
  - formulário de fechamento separado em passos: cartão, pagamento de fatura, reservas e conferência em caixa;
  - fechamento passa a registrar pagamento de fatura e transferências de reservas no extrato para a Liquidez bater.

### Ajustes de dados feitos diretamente no MySQL

- Corrigido lançamento `#1411 Aviario Raul Seixas`: saiu de crédito/cartão para débito/Banco Inter e competência de fatura limpa.
- Criados lançamentos faltantes:
  - `#1423` Uber 19:45 — R$ 17,95 — cartão — 16/05/2026.
  - `#1424` APPLE.COM/BILL — R$ 9,99 — cartão — 15/05/2026.
  - `#1425` Future Trade — R$ 86,45 — receita Pix — 17/05/2026.
- Fechamento 11–17/05:
  - `#1426` pagamento fatura — R$ 889,34.
  - `#1427` aplicação Reserva 10% — R$ 230,26.
  - `#1428` aplicação Reserva Dia a Dia — R$ 298,91.
- Parcelas futuras do cartão criadas até abril/2027:
  - julho/2026: R$ 1.325,54;
  - agosto a dezembro/2026: R$ 975,58 por mês;
  - janeiro/2027: R$ 299,06 após correção da série Mercado Livre Cajamar;
  - fevereiro a abril/2027: R$ 154,80 por mês.
- Corrigida série `MERCADO MERCADOLIVRE CAJAMAR`:
  - Inter mostra abril=1/10, maio=2/10, junho=3/10;
  - lançamento incorreto de março foi cancelado;
  - parcela 10/10 criada em janeiro/2027.
- Ajuste pós-fechamento para seguir o valor aberto exibido pelo Inter:
  - `#1471` resgate Reserva Dia a Dia → Banco Inter — R$ 362,99 — 18/05/2026.
  - `#1472` pagamento ajuste fatura Cartão Inter — R$ 362,99 — 18/05/2026.
  - observação anexada ao snapshot semanal `#11`.

### Decisão operacional

Para fatura aberta do Inter, o LT não deve tratar o saldo mensal isolado como verdade absoluta. O uso prático fica:

1. Fechamento semanal segue pelo modelo do caderno.
2. Compras da semana e pagamentos realizados ficam registrados no extrato.
3. Diferenças de fatura aberta entram como ajuste de conciliação documentado.
4. Fatura fechada deve ser conciliada por CSV item a item.

### Validação

- `pnpm --filter web typecheck`
- `pnpm --filter web lint` — passou com os dois warnings antigos:
  - `apps/web/src/app/global-error.tsx`: uso de `<img>`;
  - `apps/web/src/components/onboarding/onboarding-contas-builder.tsx`: `index` não utilizado.

---

## 2026-05-17 — Fechamento semanal 11–17/05 (snapshot, caderno)

### Contexto

Fechamento feito no caderno com corrente zerada após pagar fatura e distribuir poupança. Os valores do formulário LT (sobra operacional R$ 1.181,72) não batiam com o que sobrou em caixa (R$ 529,17).

### Registro gravado (`fechamentos_periodo` id **11**, gestão 2)

| Campo | Valor |
|-------|-------|
| Período | 11/05 → 17/05/2026 |
| Entradas | R$ 2.302,60 |
| Saídas débito/Pix | R$ 231,55 |
| Compras cartão (semana) | R$ 889,34 |
| Pagamento fatura (registro) | R$ 889,34 |
| Reservado total | R$ 529,17 |
| Reserva 10% (conta 4) | R$ 230,26 |
| Reserva Dia a dia (conta 3) | R$ 298,91 |
| Apenas snapshot | Sim (sem criar transferências) |
| Ajuste Dia a dia | Nenhum (corrente já zerada no banco) |

Observação no snapshot: fechamento por caixa; corrente zerada para a próxima semana.

### Como ver

`/dashboard/semana?gestao=2&inicio=2026-05-11`

### Correção — Liquidez no dashboard (R$ 1.418,51 → R$ 0,00)

**Problema:** o card **Liquidez** usa saldo real da corrente (`saldo_inicial` + lançamentos liquidados). O fechamento foi gravado como **apenas snapshot** (sem criar movimentos), mas no Inter já tinham saído **R$ 889,34** (fatura) + **R$ 529,17** (reservas) — exatamente o saldo exibido.

**Lançamentos criados (17/05/2026):**

| ID | Tipo | Valor |
|----|------|-------|
| 1426 | Pagamento fatura (fechamento 11–17/05) | R$ 889,34 |
| 1427 | Aplicação → Reserva 10% | R$ 230,26 |
| 1428 | Aplicação → Reserva Dia a dia | R$ 298,91 |

**Lição:** fechar semana com “já fiz no banco” só grava histórico; o extrato precisa dos Pix/transferências para a **Liquidez** bater.

**Correção de produto (mesmo dia):** `createFechamentoSemanal` passa a **sempre** criar lançamentos de pagamento de fatura e transferências para reservas (idempotente por semana). Formulário com passo separado “Fatura — pagamento na corrente” e conferência no modelo do caderno (resultado − fatura − reservas).

---

## 2026-05-17 — Contas fixas fora do fechamento semanal

### Contexto

No fechamento da semana de **11/05 → 17/05/2026**, vários Pix de **contas fixas** (impostos, moradia, parcelamento, doação) inflavam a “contabilidade da semana”, embora não representem gasto discricionário do período. O pedido foi: **sumir da semana**, mas **manter** em movimentações, mês, fatura e saldos.

### O que fizemos

1. **Flag em metadados** — `excluir_fechamento_semanal: true` em `lancamentos.metadados` (JSON).
2. **Filtro SQL** — helper `sqlLancamentoEntraFechamentoSemanal` em `apps/web/src/lib/server/repository.ts`, aplicado só nas queries do **fechamento semanal**:
   - `getSemanaMetricas` (KPIs: entradas, saídas corrente, cartão, sobra)
   - `getSemanaResumoPorDia` (tabela Dia a dia)
   - `listSemanaConferenciaLancamentos` (modal de conferência)
   - `getSemanaPagamentosFatura` (destaque de pagamento de fatura na semana)
3. **Função de serviço** — `setLancamentosExcluirFechamentoSemanal({ gestaoId, lancamentoIds, excluir })` para marcar/desmarcar em lote (ainda sem UI).
4. **Dados** — marcados no MySQL (gestão `2`) os lançamentos abaixo.

### Lançamentos marcados

| ID   | Data   | Descrição                         | Categoria      | Valor     |
|------|--------|-----------------------------------|----------------|-----------|
| 1003 | 11/05  | Pix enviado - Receita Federal     | Impostos       | R$ 87,05  |
| 1004 | 11/05  | Pix enviado - Copeldis            | Moradia        | R$ 384,27 |
| 1005 | 11/05  | Pix enviado - Ricardo Morais Felix| Moradia        | R$ 578,00 |
| 1006 | 11/05  | TV Gisela - parcela 02/15         | Parcelamentos  | R$ 233,27 |
| 1356 | 11/05  | Rifa do afilhado                  | Doação         | R$ 50,00  |

**Total excluído das somas da semana:** R$ 1.332,59.

### Comportamento esperado

| Área                         | Comportamento                                      |
|-----------------------------|----------------------------------------------------|
| `/dashboard/semana`         | Lançamentos **não** entram em KPIs, Dia a dia e conferência |
| `/dashboard/movimentacoes`  | Continua listando normalmente                      |
| Dashboard mês / categorias  | Sem alteração                                      |
| Fatura do cartão            | Sem alteração                                      |
| Saldos e extrato            | Sem alteração                                      |

### Detalhe técnico (MySQL)

Comparação de boolean JSON no MySQL não funciona com `JSON_EXTRACT(...) = false`. O filtro usa:

```sql
COALESCE(JSON_UNQUOTE(JSON_EXTRACT(l.metadados, '$.excluir_fechamento_semanal')), '') NOT IN ('true', '1')
```

Atualização em lote (referência):

```sql
UPDATE lancamentos
SET metadados = JSON_MERGE_PATCH(
  COALESCE(metadados, JSON_OBJECT()),
  JSON_OBJECT('excluir_fechamento_semanal', true)
)
WHERE gestao_id = ? AND id IN (...);
```

### Relação com “gastos fixos” existentes

- **Previstos sintéticos** (`metadados.origem = 'gasto_fixo'`, `status = previsto`) já eram excluídos de fluxo mês/semana via `sqlLancamentoNaoEhPrevistoSinteticoGastoFixo`.
- **Despesas reais** vinculadas a `gastos_fixos` (`origem = gasto_fixo_vinculo`) **ainda contam** na semana, salvo esta nova flag.
- A flag `excluir_fechamento_semanal` é independente do cadastro em `gastos_fixos` — serve para “não contar na semana” sem mudar o restante da contabilidade.

### Pendências / próximos passos

- [ ] Botão na UI (ex.: tabela de lançamentos ou modal da semana): “Não contar na semana” / “Contar na semana”.
- [ ] Documentar a flag em `docs/modelagem/database/modelagem-lancamentos.md` (campo `metadados`).
- [ ] Commit + deploy quando o fluxo estiver validado no app.

### Como validar

1. Reiniciar o dev server se estiver rodando (`pnpm dev` em `apps/web`).
2. Abrir `/dashboard/semana?gestao=2&inicio=2026-05-11`.
3. Conferir que os cinco Pix acima **não** aparecem na conferência e que **Saídas corrente** caiu ~R$ 1.332,59 em relação ao total bruto da semana.

---

<!-- Próximas entradas: adicionar acima desta linha, mantendo ordem cronológica inversa. -->
