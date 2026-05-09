# LTCashFlow — Fluxo de Cartões

Status: em modelagem

---

# Objetivo

Este documento define:

- modelagem UX de cartões
- fluxo de faturas
- parcelamentos
- pagamentos
- relação cartão ↔ conta corrente
- prevenção de dupla contagem
- importação de faturas
- conciliação
- limites
- experiência mobile-first

---

# Filosofia do Módulo

Cartão de crédito é uma das áreas mais sensíveis do LTCashFlow.

Grande parte da confusão financeira dos usuários vem de:

- dupla contagem
- mistura entre competência e caixa
- parcelamentos invisíveis
- faturas mal interpretadas
- pagamentos espalhados

O módulo de cartões deve transmitir:

- clareza
- previsibilidade
- confiança
- entendimento da dívida real

---

# O Que o Sistema Deve Explicar

O usuário deve conseguir entender:

- quanto já gastou
- quanto ainda vai vencer
- quanto já comprometeu do próximo mês
- quanto realmente possui disponível
- o que pertence à fatura atual
- o que pertence a parcelamentos futuros

---

# Estrutura de Navegação

## Lista de cartões

```txt
/dashboard/cartoes
```

---

## Cartão específico

```txt
/dashboard/cartoes/:id
```

---

## Relação principal

```txt
Cartões
↓
Cartão específico
↓
Fatura
↓
Compra específica
```

---

# Tela — Lista de Cartões

## Objetivo

Mostrar visão resumida de todos cartões.

---

# Cada card deve mostrar

- nome do cartão
- limite total
- limite utilizado
- limite disponível
- fechamento
- vencimento
- valor atual da fatura

---

# Regras Visuais

## NÃO usar

- aparência bancária agressiva
- excesso de gráficos
- alarmismo

---

## Priorizar

- clareza
- leitura rápida
- visão de comprometimento

---

# Indicadores Importantes

## Utilização do limite

Mostrar:

- percentual utilizado
- valor disponível

---

## Fatura atual

Mostrar:

- total atual
- parcial
- projeção simples

---

## Parcelamentos

Mostrar:

- quantidade ativa
- impacto mensal

---

# Tela — Cartão Específico

## Objetivo

Explicar a vida financeira do cartão.

---

# Estrutura da Página

## Mobile

```txt
Resumo cartão
↓
Fatura atual
↓
Compras recentes
↓
Parcelamentos
↓
Pagamentos
↓
Faturas anteriores
```

---

## Desktop

Pode:

- usar painéis laterais
- dividir compras e resumo
- manter filtros persistentes

---

# Bloco — Resumo do Cartão

## Informações

- limite total
- utilizado
- disponível
- fechamento
- vencimento

---

# Regras

O sistema deve evitar:

- confundir limite com saldo disponível da conta
- misturar patrimônio com crédito

---

# Bloco — Fatura Atual

## Objetivo

Mostrar:

> “Quanto esta fatura realmente representa?”

---

# Informações

- total da fatura
- parcial atual
- compras futuras
- pagamentos já realizados
- restante pendente

---

# Estrutura Mental

O usuário precisa entender:

```txt
Compra no cartão
≠
Saída imediata da conta corrente
```

---

# Competência vs Caixa

## Competência

Compra entra:

- na data da compra
- na fatura correspondente

---

## Caixa

Dinheiro sai:

- no pagamento da fatura
- pela conta corrente

---

# Regra Obrigatória

A UX deve evitar dupla contagem.

---

# Exemplo Correto

Compra:

```txt
Cartão → aumenta dívida da fatura
```

Pagamento:

```txt
Conta corrente → reduz saldo da conta
```

---

# Parcelamentos

## Objetivo

Dar visibilidade real da dívida futura.

---

# Cada parcelamento mostra

- descrição
- parcela atual
- restantes
- valor total
- impacto mensal

---

# Regras

Parcelamentos devem:

- ser extremamente claros
- evitar dívida invisível
- mostrar comprometimento futuro

---

# Compras Recentes

## Estrutura

Lista semelhante ao extrato.

---

# Cada item mostra

- descrição
- valor
- categoria
- parcela
- data
- status

---

# Interações

Ao clicar:

```txt
Detalhe compra
↓
Editar
↓
Reclassificar
↓
Conciliar
```

---

# Pagamentos da Fatura

## Objetivo

Explicar relação:

```txt
Conta corrente ↔ Cartão
```

---

# Estrutura

Mostrar:

- pagamentos realizados
- conta utilizada
- data
- valor

---

# Regra

O sistema deve deixar claro:

```txt
Pagamento da fatura
não é nova despesa.
```

---

# Fechamento da Fatura

## Objetivo

Explicar ciclo financeiro.

---

# Mostrar

- fechamento
- vencimento
- período atual
- próximas compras

---

# Exemplo Mental

```txt
Compra após fechamento
↓
Vai para próxima fatura
```

---

# Importação de Fatura

## Objetivo

Facilitar entrada de dados reais.

---

# Fluxo

```txt
Importar fatura
↓
Upload PDF/CSV
↓
Pré-processamento
↓
Detectar duplicidades
↓
Preview
↓
Confirmar
```

---

# Tipos Suportados

- PDF
- CSV
- OFX futuro

---

# Preview de Importação

Mostrar:

- novos lançamentos
- suspeitos
- duplicados
- ignorados

---

# Regras

Nunca:

- importar automaticamente
- sobrescrever silenciosamente
- criar duplicidade invisível

---

# Conciliação do Cartão

## Objetivo

Garantir coerência entre:

- compras
- parcelas
- pagamentos
- conta corrente
- faturas

---

# Casos

- compra duplicada
- pagamento faltando
- divergência fatura
- fechamento incorreto
- compra em fatura errada

---

# Fluxo

```txt
Detectar divergência
↓
Explicar problema
↓
Mostrar impacto
↓
Usuário confirma ajuste
```

---

# Quick Actions

## Mobile

- swipe
- FAB
- long press

---

## Desktop

- hover actions
- atalhos futuros
- seleção múltipla futura

---

# FAB

## Objetivo

Operação rápida.

---

# Opções

- nova compra
- importar fatura
- registrar pagamento
- usar IA

---

# IA no Cartão

## Objetivo

Ajudar entendimento financeiro.

---

# IA pode

- explicar fatura
- localizar maior gasto
- detectar parcelamentos pesados
- resumir compras
- identificar duplicidades
- iniciar conciliação

---

# IA nunca

- altera sem confirmação
- importa automaticamente
- inventa compras
- ajusta saldo silenciosamente

---

# Estados da Página

## Loading

Usar:

- skeletons
- placeholders reais

---

## Empty State

Exemplo:

```txt
Nenhuma compra encontrada neste período.
```

---

## Erro

Mostrar:

- contexto
- possível causa
- retry

---

# Responsividade

## Mobile

Prioridade:

- leitura simples
- parcelamentos claros
- thumb zone
- poucas ações por tela

---

## Desktop

Pode:

- expandir análise
- usar múltiplos painéis
- mostrar comparativos

Mas sem parecer:

- ERP bancário
- dashboard corporativo pesado

---

# Relação com Banco de Dados

A UX deve respeitar:

- contas tipo cartao_credito
- competencia
- liquidação
- pagamentos
- transferências
- origem externa
- auditoria

Nunca simplificar quebrando coerência financeira.

---

# Objetivo Final

O usuário deve conseguir:

- entender sua dívida real
- entender parcelamentos futuros
- entender impacto mensal
- confiar na fatura
- confiar nos pagamentos
- evitar dupla contagem

O módulo deve transmitir:

- clareza
- controle
- previsibilidade
- estabilidade

Nunca:

- confusão
- dívida invisível
- números contraditórios
- sensação de caos financeiro.

---

# Status dos Documentos

## Concluídos

- navegacao-global.md
- fluxo-dashboard.md
- fluxo-extrato.md
- modais-e-sheets.md
- fluxo-cartoes.md

---

# Próximo Documento

```txt
fluxo-contas.md
```

Próxima etapa:

Modelar:

- contas
- saldo
- transferências
- poupança
- investimento
- porqu