# Guia de uso do LT-CashFlow

Bem-vindo. Este guia te mostra, passo a passo, como usar o sistema **na prática**
para o seu fluxo real: **lançar transações do dia, conferir saldos e fechar a semana**.

> Atalho mental: o sistema gira em torno de **3 contas e 1 cartão**.
> - **Banco Inter Lucas** (conta corrente) — sua conta do dia a dia.
> - **Cartão de crédito Lucas** — todas as compras no crédito.
> - **Reserva Dia a Dia (CDB Porquinho)** — poupança movimentada (CDB).
> - **Reserva 10% (CDB Porquinho Objetivo)** — reserva objetivada.

---

## 1. Mapa do sistema (rotas)

Na barra superior do dashboard você vai ver as áreas em ordem de uso:

| Área | Para que serve | Quando entrar |
|---|---|---|
| **Dashboard** | Visão geral em 3 segundos. Saldos + semana atual + atalhos. | Toda vez que abre o sistema. |
| **Semana** | Fechamento semanal (seg→dom). KPIs, dia a dia, sobra e reserva. | Toda **segunda-feira de manhã** ou domingo à noite. |
| **Cartão** | Fatura atual + histórico de faturas. | Quando o Inter manda a fatura. |
| **Reservas** | Saldo das poupanças, aportes, resgates, rendimentos. | Quando quer ver "quanto guardei?". |
| **Movimentações** | Extrato cru. Filtros, edição em massa. | Quando precisa corrigir/buscar algo. |
| **Insights** | Gráficos, tendências, recorrências. | De vez em quando, pra reflexão. |

---

## 2. Rotina diária (≤ 2 minutos)

Você não precisa abrir o sistema todo dia, mas se quiser:

1. Abra o **Dashboard** (`/dashboard`).
2. Olha o card **Tenho hoje** — bate com a soma dos saldos no Inter?
3. Se gastou algo em dinheiro/desconhecido, vai em **Lançar** (mesma página, abaixo).
4. Pronto. Pix e débito você já vê no extrato Inter — o LT importa via scripts.

---

## 3. **Rotina semanal** (a mais importante) — `/dashboard/semana`

A semana fecha **segunda 00:00 até domingo 23:59**.
O ideal é fechar **segunda-feira de manhã** olhando para o que passou.

### 3.1. Abrir a área

No dashboard, clica em **Semana**, ou direto `/dashboard/semana`.
Sem parâmetros, ele mostra a **semana atual**. Pra ver outras semanas:

- "← Semana anterior" / "Próxima semana →" no topo.
- Ou usar o link na tabela "Histórico" no fim da página.

### 3.2. Ler os 4 KPIs do topo

| KPI | O que é |
|---|---|
| **Entradas** | Tudo que recebeu na corrente (salário, reembolso, Pix recebido). |
| **Saídas corrente** | Débito + Pix enviado + pagamento de fatura. |
| **Cartão (compras)** | Tudo que comprou no crédito naquela semana (purchase-date, não fatura). |
| **Sobra** | Entradas − Saídas corrente. Verde se sobrou, vermelho se faltou. |

> ⚠️ **Cartão NÃO entra em "Saídas corrente"** porque o cartão é só uma promessa.
> A saída real só acontece quando você paga a fatura — e aí entra como "Saída corrente".

### 3.3. Ler o "Dia a dia"

Tabela com 7 linhas (segunda a domingo), cada uma com **Entradas / Saídas corrente / Cartão**.
Útil pra responder coisas como:
- "Em que dia eu mais gastei essa semana?"
- "Sábado de viagem foi mesmo o gasto pesado?"

### 3.4. Registrar o fechamento (reserva + fatura)

Há **dois níveis** de informação:

1. **Movimentação automática** — os 4 cards do topo vêm dos lançamentos (extrato). Em **Saídas corrente** aparece um destaque com quanto foi **pagamento de fatura** na semana (soma dos lançamentos tipo "Fatura Cartão").
2. **Registro do fechamento** — campos que você preenche para o histórico bater com a sua rotina:
   - **Pagamento de fatura (registro)** — vem pré-preenchido com a soma do extrato; você pode ajustar (ex.: parte do pagamento caiu em outra semana). **Não cria lançamento** — o dinheiro já saiu na corrente.
   - **Valor guardado na reserva** — o quanto você associa a "guardei neste fechamento", com sugestão de 10% da sobra.

### 3.5. **Só registro histórico** (semanas já feitas)

Se você **já aplicou** no Inter (reserva + fatura) e só quer **mapear a semana no LT** sem duplicar movimento:

- Marque **Só registro histórico**.
- Preencha os valores de reserva e fatura como lembra daquela semana.
- Ao fechar: grava o snapshot, **mas não cria** transferência corrente → poupança.

Use isso para meses passados ou para corrigir o mapa sem gerar lançamento duplicado.

### 3.6. Apertar **Fechar semana**

1. **Snapshot** salvo em `fechamentos_periodo` (entradas, saídas, compras no cartão, sobra, **reserva registrada**, **fatura registrada**, flag só-histórico).
2. Se **não** marcou "Só registro" e o valor da reserva > 0: cria **uma transferência** (Corrente → Poupança) no domingo da semana.
3. A página mostra o resultado com badges **Só registro histórico** ou **Transferência criada**.

> 💡 Erro na transferência: apague em `/dashboard/movimentacoes` e reabra o fechamento (em breve: botão "reabrir semana").

### 3.7. Conferir no Histórico

A tabela lista **Reserva** e **Fatura** por semana; linhas com selo **hist.** foram fechadas só como registro (sem nova transferência).

---

## 4. Cartão de crédito — `/dashboard/cartao`

Cada **fatura** é identificada pelo **1º dia do mês de pagamento**:

| Fatura | `fatura_competencia_data` | Período de compras |
|---|---|---|
| paga em jan/26 | 2026-01-01 | ~30/nov a ~28/dez |
| paga em fev/26 | 2026-02-01 | ~30/dez a ~28/jan |
| paga em mar/26 | 2026-03-01 | ~30/jan a ~26/fev |
| ... | | |

A página mostra:
- **Gasto no ciclo** — soma das compras da fatura selecionada.
- **Limite total** / **Limite disponível**.
- **Lançamentos** — cada compra da fatura, com data real da compra.

> 📌 Para saber **gasto real do mês** (igual o Bússola do Inter):
> entrar em `/dashboard/insights` (vai ter um filtro por `competencia_data` = data da compra).

---

## 5. Reservas — `/dashboard/reservas`

Mostra:
- **Saldo de cada poupança** (cards no topo).
- **Fluxo geral** — aportado / resgatado / rendimentos do **mês anterior**, **mês atual** e **ano**.
- **Lista de movimentos** de cada poupança (até 50 mais recentes do ano).

> 📌 Rendimento do CDB Inter: **registrado como `receita` na poupança** (categoria `Rendimentos`).
> Para atualizar depois (Inter rende dia a dia), basta lançar manualmente como receita ou usar `tipo='ajuste'`.

---

## 6. Lançamentos manuais

No `/dashboard`, role até **Lançar**. Você pode criar:

| Tipo | Quando usar |
|---|---|
| **Receita** | Salário, Pix recebido, reembolso. |
| **Despesa** | Compra ou conta paga (débito/pix/crédito). |
| **Transferência** | Mover dinheiro entre suas próprias contas (corrente↔reserva, etc). |

Campos importantes:
- **Conta**: de onde sai (despesa/transferência) ou para onde entra (receita).
- **Categoria**: pra agrupar nos gráficos. Categorias atuais: `Alimentação`, `Transporte`, `Saúde`, `Lazer`, `Moradia`, `Pet`, `Filhos`, `Cuidados pessoais`, `Estudo`, `Doação`, `Marketplace`, `Casa/Reforma`, `Delivery`, `Impostos`, `Assinaturas`, `Parcelamentos`, `Rendimentos`, `Renda`, `Outros`.
- **Meio**: PIX / Débito / Crédito / Dinheiro / Transferência.
- **Data**: data em que a coisa aconteceu (compra real).
- **`fatura_competencia_data`** (só crédito): 1º dia do mês da fatura em que esta compra vai cair.

---

## 7. Conceitos chave (jargão do sistema)

| Termo | Significado |
|---|---|
| **gestão** | Container de tudo: contas, categorias, lançamentos, membros. Você tem uma só. |
| **conta** | Banco/cartão/poupança. Você tem 4. |
| **lançamento** | Cada movimento individual (receita/despesa/transferência/ajuste). |
| **competencia_data** | Data **real** da compra/recebimento (o dia que aconteceu). |
| **fatura_competencia_data** | 1º dia do mês da fatura em que a compra de cartão cai. |
| **saldo inicial** | Saldo da conta antes do primeiro lançamento (data: 31/dez/2025). |
| **fechamento de semana** | Snapshot dos KPIs + **registro** de quanto guardou e quanto associou à fatura; transferência opcional. |
| **percentual de reserva** | Quanto da sobra vai automaticamente pra reserva (default 10%). |

---

## 8. FAQ rápido

**"Por que o saldo da corrente está 'baixo' (R$ 100) se eu sei que tenho mais?"**
→ Porque o resto está nas **Reservas**. Olhe o "**Tenho hoje**" do dashboard (= corrente + reservas).

**"O que conta como 'Saída' na semana?"**
→ Débito, Pix enviado, pagamento de fatura e aplicação na reserva são saídas da corrente.
   Compras de cartão **NÃO** — elas viram saída só quando a fatura é paga.

**"Bússola do Inter diz X, LT diz Y. Por quê?"**
→ Bússola conta **PAGAMENTO ON LINE** somados por mês corrido. LT conta **fatura por ciclo**.
   Os dois estão certos, são métricas diferentes.

**"Esqueci de fechar uma semana antiga — dá pra fechar depois?"**
→ Sim. Abre `/dashboard/semana?inicio=AAAA-MM-DD` (segunda-feira da semana desejada) e fecha normal.

**"Adicionei a transferência errada no fechamento, como reverter?"**
→ Por ora: vai em `/dashboard/movimentacoes`, busca por "Reserva do fechamento semanal", deleta.
   Refaz o fechamento. (Em breve: botão "Reabrir semana".)

---

## 9. Cheatsheet (cole na geladeira)

```
Toda segunda-feira:
  1. Dashboard → Semana
  2. Lê os 4 KPIs (Entradas / Saídas / Cartão / Sobra)
  3. Ajusta valor da reserva (ou aceita o 10%)
  4. Aperta "Fechar semana"
  5. Confere histórico

Quando chegar a fatura:
  1. Dashboard → Cartão → seleciona o mês
  2. Confere o total com o app do Inter

Quando guardar/resgatar dinheiro fora do fechamento:
  1. Dashboard → role até "Lançar" → "Transferência"
  2. Origem = corrente, Destino = reserva (ou vice-versa)
```

---

## 10. Atalhos importantes

- **Configurar % de reserva**: `/dashboard` → `Config` → "Percentual de reserva"
- **Adicionar uma categoria nova**: `/dashboard` → `Config` → "Categoria" (na verdade fica no DashboardActionCenter)
- **Ver fluxo de uma semana antiga**: `/dashboard/semana?inicio=2026-04-27`
- **Ver fatura de um mês específico**: `/dashboard/cartao?conta=2&period=month` (e navega no seletor)

---

Esse guia evolui junto com o sistema. Se tiver dúvida ou achar algo confuso,
me chama que ajusto **a interface E o guia** ao mesmo tempo.
