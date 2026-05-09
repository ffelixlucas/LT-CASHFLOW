# LTCashFlow — Fluxo do Dashboard

Status: em modelagem

---

# Objetivo do Dashboard

O dashboard é a principal tela do LTCashFlow.

Ele NÃO deve funcionar como:

- painel corporativo
- parede de KPI
- dashboard contábil
- tela de gráficos aleatórios

O dashboard existe para responder:

> “Como estamos agora?”

E imediatamente depois:

> “O que precisa da minha atenção?”

---

# Papel do Dashboard no Produto

O dashboard deve:

- reduzir ansiedade financeira
- aumentar clareza
- mostrar direção
- destacar problemas importantes
- permitir acesso rápido ao extrato
- facilitar operação diária
- reduzir sensação de caos

O dashboard NÃO deve tentar mostrar tudo.

Ele deve funcionar como:

- snapshot financeiro
- centro operacional
- resumo vivo da gestão

---

# Estrutura Geral da Página

## Mobile

Fluxo vertical.

Ordem:

```txt
Header
↓
Snapshot financeiro
↓
Alertas importantes
↓
Próximas ações
↓
Resumo do período
↓
Extrato recente
↓
Insights leves
```

---

## Desktop

Desktop pode:

- aumentar densidade
- dividir seções
- usar grids
- mostrar widgets laterais

Mas SEM parecer ERP.

---

# Header do Dashboard

## Objetivo

Manter contexto da gestão.

---

# Elementos

## Gestão ativa

Exemplo:

- Casa Lucas
- Família Silva
- Projeto Reforma

---

## Período ativo

Exemplo:

- este mês
- últimos 7 dias
- abril 2026

---

## Ações rápidas

- pesquisar
- notificações
- abrir assistente

---

# Snapshot Financeiro

## Objetivo

Mostrar rapidamente:

> “Quanto temos?”

Sem exigir leitura profunda.

---

# Estrutura

## Bucket disponível

Contas:

- corrente
- carteira
- caixa

Representa:

Dinheiro utilizável imediatamente.

---

## Bucket comprometido

Representa:

- cartão
- contas futuras
- despesas previstas

---

## Bucket poupança

Representa:

- reservas
- objetivos
- porquinhos

---

## Bucket investimento

Representa:

- investimentos reais
- patrimônio separado

---

# Regras Visuais

## NÃO usar

- vermelho excessivo
- aparência alarmista
- excesso de mini gráficos
- gradientes exagerados

---

## Priorizar

- clareza
- hierarquia
- leitura rápida
- tranquilidade

---

# Interações do Snapshot

Cada bucket deve ser clicável.

---

# Exemplo

```txt
Disponível
↓
Abrir contas relacionadas
↓
Abrir extrato filtrado
```

---

# Alertas Importantes

## Objetivo

Destacar somente o que realmente importa.

---

# Exemplos

- saldo divergente
- fatura vencendo
- assinatura detectada
- gasto acima da média
- possível duplicidade
- lançamento sem categoria

---

# Regras

## Máximo recomendado

3 a 5 alertas.

Nunca transformar a tela em:

- central de erros
- mural de problemas

---

# Estrutura Visual

Cards leves.

Cada alerta deve conter:

- título curto
- explicação simples
- ação principal

---

# Próximas Ações

## Objetivo

Guiar o usuário.

O sistema deve ajudar:

- sem pressionar
- sem moralizar
- sem parecer cobrança

---

# Exemplos

- conciliar extrato
- revisar lançamentos
- confirmar categorias
- revisar duplicados
- atualizar saldo inicial

---

# Estrutura

Cards rápidos.

Com:

- contexto
- ação principal
- prioridade leve

---

# Resumo do Período

## Objetivo

Mostrar visão resumida do período ativo.

---

# Informações

## Receitas

- total
- variação
- tendência

---

## Despesas

- total
- categoria principal
- comparação simples

---

## Saldo

- resultado do período
- tendência leve

---

# Regras

## NÃO usar

- excesso de gráficos
- dashboards financeiros tradicionais
- excesso de pizza charts

---

## Preferir

- números contextualizados
- frases simples
- comparação leve

---

# Extrato Recente

## Objetivo

Dar acesso imediato ao coração do sistema.

O extrato recente é uma das partes MAIS importantes do dashboard.

---

# Estrutura

Lista compacta.

Máximo inicial:

- 5 a 10 itens

---

# Cada item mostra

- descrição
- valor
- conta
- categoria
- data
- tipo

---

# Interações

Ao clicar:

```txt
Detalhe lançamento
↓
Editar
↓
Salvar
```

---

# Quick Actions no Extrato

## Mobile

Swipe:

- editar
- excluir
- conciliar

---

## Desktop

Hover actions:

- editar
- duplicar
- excluir

---

# Insights Leves

## Objetivo

Ajudar sem transformar o dashboard em relatório.

---

# Exemplos

- você gastou mais com alimentação
- entradas cresceram este mês
- cartão está acima da média
- transporte caiu nesta semana

---

# Regras

Insights devem:

- ser curtos
- ser claros
- apontar evidência
- ter ação possível

---

# IA no Dashboard

## Objetivo

A IA deve funcionar como:

- copiloto contextual
- operador auxiliar
- facilitador de manutenção

---

# Ações possíveis

- resumir período
- explicar saldo
- localizar gasto
- iniciar conciliação
- criar lançamento
- corrigir lançamento

---

# Regras

IA nunca:

- altera automaticamente
- grava silenciosamente
- inventa dados
- muda saldo sem confirmação

---

# Mobile First

## Prioridades mobile

- thumb zone
- leitura vertical
- cards grandes
- ações rápidas
- poucos toques

---

# FAB

O FAB deve existir no dashboard.

Objetivo:

Criar operação rápida.

---

# Action Sheet

Ao abrir:

- nova despesa
- nova receita
- transferência
- importar extrato
- usar IA

---

# Estados da Página

## Loading

Usar:

- skeletons
- placeholders reais

Nunca:

- spinner infinito

---

## Empty State

Exemplo:

```txt
Ainda não existem lançamentos.
Adicione sua primeira movimentação.
```

---

## Erro

Mostrar:

- causa provável
- ação recomendada
- retry

Nunca:

```txt
Erro inesperado.
```

---

# Responsividade

## Mobile

Fluxo vertical.

---

## Tablet

Pode:

- dividir cards
- mostrar grids simples

---

## Desktop

Pode:

- usar colunas
- aumentar densidade
- manter widgets persistentes

Mas sempre preservando:

- clareza
- calma visual
- foco operacional

---

# Objetivo Final do Dashboard

Ao abrir o LTCashFlow o usuário deve sentir:

- clareza
- controle
- orientação
- confiança
- tranquilidade

O dashboard deve transmitir:

- organização
- estabilidade
- previsibilidade
- simplicidade operacional

Nunca:

- caos
- pressão
- excesso de números
- sensação de ERP
- sensação de planilha financeira corporativa.

---

# Status dos Documentos

## Concluídos

- navegacao-global.md

## Próximo Documento

```txt
fluxo-extrato.md
```

Próxima etapa:

Modelar profundamente:

- extrato
- filtros
- agrupamentos
- detalhe lançamento
- edição
- exclusão
- FAB
- sheets
- criação rápida
- importação
- conciliação
- comportamento mobile
- quick actions

