# LTCashFlow — Fluxo de Metas e Objetivos Financeiros

Status: em modelagem

---

# Objetivo

Este documento define:

- modelagem UX de metas
- objetivos financeiros
- porquinhos
- reservas
- progresso financeiro
- planejamento
- previsibilidade
- separação emocional do dinheiro
- organização por objetivos
- buckets de economia

---

# Filosofia do Módulo

O módulo de metas NÃO deve parecer:

- planilha de investimentos
- simulador financeiro complexo
- dashboard corporativo
- ferramenta bancária fria

O módulo deve transmitir:

- motivação
- clareza
- evolução
- organização
- tranquilidade financeira

---

# Objetivo Principal

O usuário deve conseguir responder:

> “Para onde nosso dinheiro está indo?”

E:

> “Estamos evoluindo?”

---

# Estrutura Mental

O sistema deve incentivar:

- separação consciente do dinheiro
- previsibilidade
- construção de reserva
- metas alcançáveis
- progresso gradual

---

# Tipos de Meta

## 1. Reserva

Exemplo:

- emergência
- segurança
- caixa reserva

---

## 2. Objetivo

Exemplo:

- viagem
- reforma
- notebook
- carro

---

## 3. Planejamento recorrente

Exemplo:

- IPVA
- matrícula
- férias
- impostos

---

# Estrutura de Navegação

## Lista de metas

```txt
/dashboard/metas
```

---

## Meta específica

```txt
/dashboard/metas/:id
```

---

# Tela — Lista de Metas

## Objetivo

Mostrar visão organizada dos objetivos financeiros.

---

# Estrutura Mobile

```txt
Resumo geral
↓
Reservas
↓
Objetivos
↓
Planejamentos recorrentes
```

---

# Estrutura Desktop

Pode:

- usar grids
- mostrar progresso lateral
- expandir previsões

Mas sem parecer software de investimentos.

---

# Resumo Geral

## Mostrar

- total reservado
- quantidade de metas
- progresso médio
- previsão geral

---

# Regras

Resumo deve:

- ser leve
- inspirar organização
- evitar pressão excessiva

---

# Card de Meta

## Informações principais

- nome
- valor alvo
- valor atual
- progresso
- previsão

---

# Informações secundárias

- conta associada
- recorrência
- observações

---

# Regras Visuais

## Priorizar

- progresso visual simples
- leitura rápida
- clareza de evolução

---

## Evitar

- gráficos exagerados
- pressão visual
- excesso de indicadores

---

# Progresso

## Objetivo

Mostrar evolução sem ansiedade.

---

# Mostrar

- percentual
- valor acumulado
- restante
- previsão estimada

---

# Regras

O sistema deve:

- incentivar continuidade
- evitar linguagem negativa
- mostrar progresso gradual

---

# Meta Específica

## Objetivo

Explicar vida financeira daquele objetivo.

---

# Estrutura

## Resumo

- nome
- tipo
- objetivo final
- valor atual
- progresso

---

## Histórico

- aportes
- transferências
- alterações

---

## Previsão

- tempo estimado
- média mensal
- tendência

---

# Aportes

## Objetivo

Representar movimentação consciente.

---

# Estrutura Mental

```txt
Conta corrente
↓
Porquinho/meta
```

---

# Regra

Aporte NÃO é despesa.

É:

```txt
realocação patrimonial.
```

---

# Fluxo de Aporte

```txt
Selecionar conta origem
↓
Selecionar meta
↓
Valor
↓
Preview
↓
Confirmar
```

---

# Preview Obrigatório

Mostrar:

```txt
Conta origem: -300
Meta viagem: +300
```

---

# Transferência entre Metas

## Objetivo

Permitir reorganização.

---

# Exemplo

```txt
Reserva emergência → Viagem
```

---

# Regras

Sistema deve:

- preservar histórico
- manter rastreabilidade
- mostrar impacto

---

# Planejamentos Recorrentes

## Objetivo

Preparar despesas previsíveis.

---

# Exemplos

- IPVA
- matrícula
- seguro
- impostos

---

# Estrutura

Mostrar:

- valor esperado
- quanto já reservado
- prazo restante
- necessidade mensal

---

# Previsões

## Objetivo

Ajudar organização futura.

---

# Mostrar

- previsão estimada
- tendência
- média de aporte
- evolução temporal

---

# Regras

Previsões devem:

- ser simples
- evitar linguagem técnica
- evitar falsa precisão

---

# IA nas Metas

## Objetivo

Ajudar planejamento.

---

# IA pode

- sugerir aportes
- resumir evolução
- explicar atrasos
- identificar metas esquecidas
- sugerir reorganização

---

# IA nunca

- movimenta dinheiro automaticamente
- altera metas sem confirmação
- cria planejamento sozinho

---

# FAB

## Objetivo

Criar metas rapidamente.

---

# Opções

- nova meta
- novo aporte
- nova reserva
- usar IA

---

# Quick Actions

## Mobile

- aportar
- editar
- concluir
- pausar

---

## Desktop

- expandir análise
- múltiplos painéis
- filtros avançados

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
Você ainda não criou nenhuma meta.
Comece separando dinheiro para seus objetivos.
```

---

## Erro

Mostrar:

- contexto
- possível causa
- retry

---

# Mobile First

## Prioridades

- progresso claro
- ações rápidas
- leitura simples
- poucos toques
- thumb zone

---

# Responsividade

## Mobile

Fluxo vertical.

---

## Desktop

Pode:

- expandir comparações
- usar grids
- mostrar múltiplas metas

Mas sem parecer:

- software bancário
- plataforma de investimentos pesada

---

# Relação com Banco de Dados

A UX deve respeitar:

- contas
- buckets
- transferências
- patrimônio
- reservas
- histórico
- auditoria

Nunca tratar metas como despesas reais.

---

# Relação Emocional

O módulo deve transmitir:

- evolução
- tranquilidade
- organização
- esperança financeira
- sensação de progresso

Nunca:

- culpa
- cobrança
- ansiedade
- pressão exagerada

---

# Objetivo Final

O usuário deve conseguir:

- visualizar objetivos
- separar dinheiro conscientemente
- construir reservas
- entender evolução
- planejar despesas futuras
- sentir progresso financeiro

O módulo deve parecer:

- organizado
- leve
- humano
- encorajador
- previsível

Nunca:

- frio
- técnico demais
- corporativo
- assustador.

---

# Status dos Documentos

## Concluídos

- navegacao-global.md
- fluxo-dashboard.md
- fluxo-extrato.md
- modais-e-sheets.md
- fluxo-cartoes.md
- fluxo-contas.md
- fluxo-assistente.md
- estados-da-interface.md
- fluxo-mobile.md
- fluxo-metas.md

---

# Próximo Documento

```txt
fluxo-insights.md
```

Próxima etapa:

Modelar:

- insights financeiros
- analytics leves
- comparativos
- tendências
- comportamento financeiro
- IA analítica
- alertas inteligentes
- UX de interpretação financeira

