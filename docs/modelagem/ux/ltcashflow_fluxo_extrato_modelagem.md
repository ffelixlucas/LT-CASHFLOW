# LTCashFlow — Fluxo do Extrato

Status: em modelagem

---

# Objetivo do Extrato

O extrato é o núcleo operacional do LTCashFlow.

Esta é provavelmente a tela mais importante do sistema.

O extrato NÃO deve funcionar como:

- tabela bancária fria
- planilha financeira
- grid corporativo
- lista técnica sem contexto

O extrato deve funcionar como:

- linha do tempo financeira
- centro operacional
- visão viva do dinheiro
- local principal de manutenção financeira

---

# Pergunta Principal da Tela

O extrato deve responder:

> “O que aconteceu com nosso dinheiro?”

E permitir imediatamente:

- entender
- localizar
- corrigir
- conciliar
- editar
- organizar

---

# Filosofia da Tela

O extrato precisa:

- reduzir caos
- reduzir retrabalho
- facilitar leitura
- permitir manutenção rápida
- funcionar perfeitamente no mobile
- priorizar clareza temporal
- transmitir confiança

---

# Estrutura Geral

## Mobile

Fluxo principal:

```txt
Header
↓
Filtros rápidos
↓
Saldo contextual
↓
Agrupamentos temporais
↓
Lista de lançamentos
↓
FAB
```

---

## Desktop

Desktop pode:

- expandir filtros
- usar múltiplas colunas
- manter painel lateral
- aumentar densidade

Mas sem parecer ERP.

---

# Header do Extrato

## Objetivo

Manter contexto financeiro claro.

---

# Elementos

## Gestão ativa

Sempre visível.

---

## Período atual

Exemplo:

- hoje
- esta semana
- este mês
- últimos 30 dias

---

## Busca rápida

Busca textual.

Deve localizar:

- descrição
- categoria
- conta
- valor
- observação

---

## Atalho IA

Abrir assistente contextual.

---

# Filtros Rápidos

## Objetivo

Permitir navegação operacional rápida.

---

# Filtros principais

## Período

- hoje
- ontem
- semana
- mês
- personalizado

---

## Conta

- corrente
- carteira
- poupança
- cartão
- investimento

---

## Categoria

- alimentação
- transporte
- moradia
- saúde
- outros

---

## Tipo

- receita
- despesa
- transferência
- ajuste

---

## Pessoa

Baseado em:

```txt
lancamento_rateios
```

---

## Status

- conciliado
- pendente
- suspeito
- duplicado

---

# Comportamento dos Filtros

Filtros devem:

- persistir durante navegação relacionada
- atualizar URL quando fizer sentido
- permitir combinação simples
- evitar complexidade excessiva

---

# Agrupamento Temporal

## Objetivo

Facilitar leitura cronológica.

---

# Estrutura recomendada

```txt
Hoje
Ontem
Esta semana
Semana passada
Abril 2026
Março 2026
```

---

# Regras

Agrupamentos devem:

- reduzir sensação de lista infinita
- melhorar memória temporal
- facilitar reconciliação mental

---

# Lista de Lançamentos

## Objetivo

Permitir leitura rápida e manutenção operacional.

---

# Estrutura de Cada Item

## Informações principais

- descrição
- valor
- tipo
- conta
- categoria
- data
- meio

---

## Informações secundárias

- observação
- participantes
- status
- origem externa

---

# Hierarquia Visual

## Mais importante

- descrição
- valor

---

## Médio

- conta
- categoria

---

## Menos importante

- metadata
- auditoria
- origem externa

---

# Cores

Usar cor com moderação.

Evitar:

- vermelho agressivo
- verde neon
- excesso de destaque

---

# Interações do Item

Ao clicar:

```txt
Abrir detalhe lançamento
```

---

# Swipe Mobile

## Swipe esquerda

- editar
- excluir

---

## Swipe direita

- conciliar
- duplicar

---

# Hover Desktop

Mostrar:

- editar
- excluir
- duplicar
- conciliar

---

# Detalhe do Lançamento

## Objetivo

Mostrar contexto completo.

---

# Estrutura

## Dados principais

- descrição
- valor
- tipo
- conta
- categoria
- meio
- competência
- liquidação

---

## Dados complementares

- observação
- origem externa
- tags
- anexos
- participantes

---

## Auditoria

- criado em
- atualizado em
- origem alteração

---

# Ações do Detalhe

- editar
- excluir
- duplicar
- reclassificar
- conciliar

---

# Modal Editar Lançamento

## Objetivo

Permitir manutenção rápida.

---

# Campos

## Obrigatórios

- valor
- tipo
- conta

---

## Opcionais

- categoria
- observação
- participantes
- anexos
- tags

---

# Regras

Nunca salvar silenciosamente.

Sempre:

- preview
- confirmação visual
- feedback claro

---

# Criação Rápida

## Objetivo

Reduzir atrito operacional.

---

# FAB

Presente sempre no extrato.

---

# Action Sheet

## Opções

- nova despesa
- nova receita
- transferência
- importar extrato
- usar IA

---

# Fluxo de Criação Manual

```txt
FAB
↓
Novo lançamento
↓
Preencher
↓
Preview
↓
Salvar
```

---

# Fluxo IA

## Exemplo

```txt
mercado 89,90 hoje débito
```

---

# Comportamento esperado

IA interpreta:

- tipo
- valor
- conta
- meio
- data
- categoria provável

---

# Regra Obrigatória

Antes de persistir:

- mostrar rascunho
- pedir confirmação

---

# Criação em Lote

## Exemplo

```txt
pix hoje 50 70 120
```

---

# Resultado

Criar:

- múltiplos lançamentos
- preview completo
- soma total

---

# Importação de Extrato

## Objetivo

Facilitar conciliação.

---

# Fluxo

```txt
Importar
↓
Upload arquivo
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

# Tipos de Arquivo

- PDF
- CSV
- OFX futuro

---

# Detecção de Duplicidade

Sistema deve analisar:

- valor
- data
- conta
- descrição
- proximidade temporal

---

# Regras

Nunca:

- importar automaticamente
- duplicar silenciosamente
- sobrescrever dados

---

# Conciliação

## Objetivo

Garantir confiança no saldo.

---

# Casos

- saldo divergente
- lançamento faltando
- duplicidade
- lançamento não categorizado
- diferença banco vs sistema

---

# Fluxo

```txt
Detectar divergência
↓
Explicar possível causa
↓
Mostrar ações
↓
Usuário confirma
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
- atalhos teclado futuros
- seleção múltipla futura

---

# Estados da Tela

## Loading

Usar:

- skeletons reais
- placeholders contextuais

Nunca:

- spinner infinito

---

## Empty State

Exemplo:

```txt
Ainda não existem lançamentos neste período.
```

---

## Sem Resultados

Exemplo:

```txt
Nenhum lançamento encontrado com estes filtros.
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

Prioridade máxima.

Foco:

- listas
- leitura rápida
- polegar
- ações rápidas
- pouca digitação

---

## Tablet

Pode:

- melhorar filtros
- expandir detalhe

---

## Desktop

Pode:

- aumentar densidade
- usar painéis
- melhorar produtividade

---

# Relação com o Banco de Dados

A UX do extrato deve respeitar:

- gestoes
- contas
- lancamentos
- competencia
- liquidação
- transferências
- cartão vs corrente
- rateios
- auditoria

Nunca simplificar a UX quebrando a lógica financeira oficial.

---

# Objetivo Final do Extrato

O usuário deve sentir:

- controle
- clareza
- confiança
- facilidade de manutenção
- tranquilidade operacional

O extrato deve parecer:

- vivo
- organizado
- rápido
- confiável

Nunca:

- pesado
- técnico demais
- corporativo
- caótico
- parecido com ERP.

---

# Status dos Documentos

## Concluídos

- navegacao-global.md
- fluxo-dashboard.md
- fluxo-extrato.md

---

# Próximo Documento

```txt
modais-e-sheets.md
```

Próxima etapa:

Modelar:

- modais
- drawers
- action sheets
- comportamento mobile
- detalhes de lançamento
- confirmações
- edição
- exclusão
- conciliação
- overlays globais

