# LTCashFlow — Modais, Sheets e Overlays

Status: em modelagem

---

# Objetivo

Este documento define:

- padrões de overlays
- modais
- drawers
- sheets
- diálogos de confirmação
- comportamento mobile-first
- comportamento desktop
- profundidade de navegação contextual

---

# Filosofia dos Overlays

O LTCashFlow deve:

- evitar navegação excessiva
- reduzir quebra de contexto
- permitir operação rápida
- manter sensação de fluidez
- preservar foco financeiro

Overlays devem:

- complementar a navegação
- não substituir arquitetura principal
- evitar caos visual
- manter clareza operacional

---

# Tipos de Overlay

O sistema possui 4 tipos principais:

---

# 1. Modal

## Objetivo

Fluxos focados.

Interrupção consciente.

---

# Uso recomendado

- editar lançamento
- confirmar exclusão
- visualizar detalhes
- resolver conflito
- configurar algo importante

---

# Regras

Modal:

- bloqueia fundo
- exige conclusão
- exige cancelamento explícito

---

# NÃO usar modal para

- navegação longa
- formulários gigantes
- múltiplas etapas profundas

---

# 2. Bottom Sheet

## Objetivo

Ações rápidas mobile-first.

---

# Uso recomendado

- FAB
- quick actions
- filtros rápidos
- criação rápida
- ações contextuais

---

# Filosofia

Bottom sheet deve:

- parecer leve
- surgir naturalmente
- funcionar com polegar
- reduzir fricção

---

# 3. Drawer

## Objetivo

Painel lateral contextual.

---

# Uso recomendado

- detalhe rápido desktop
- filtros avançados
- assistente IA contextual
- preview de conciliação

---

# Regras

Drawer NÃO deve:

- esconder informação crítica
- virar página inteira disfarçada

---

# 4. Dialog de Confirmação

## Objetivo

Evitar alterações destrutivas silenciosas.

---

# Uso obrigatório

- exclusão
- alteração financeira crítica
- importação
- conciliação
- alteração em lote

---

# Regras Gerais

## Sempre:

- título claro
- contexto
- ação principal evidente
- cancelamento simples

---

## Nunca:

- textos gigantes
- termos técnicos excessivos
- confirmação confusa

---

# Modal — Detalhe do Lançamento

## Objetivo

Mostrar contexto completo do lançamento.

---

# Estrutura

## Seção principal

- descrição
- valor
- tipo
- conta
- categoria

---

## Seção financeira

- competência
- liquidação
- meio
- origem externa

---

## Seção contextual

- observações
- participantes
- anexos

---

## Seção auditoria

- criado em
- atualizado em
- alterações

---

# Ações disponíveis

- editar
- excluir
- duplicar
- reclassificar
- conciliar

---

# Modal — Editar Lançamento

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
- tags
- observação
- participantes
- anexos

---

# Regras

## Sempre:

- feedback visual
- preview claro
- salvar explícito

---

## Nunca:

- autosave silencioso
- alteração automática

---

# Modal — Confirmar Exclusão

## Objetivo

Evitar perda acidental.

---

# Estrutura

## Mostrar

- descrição
- valor
- conta
- impacto esperado

---

# Botões

- cancelar
- excluir

---

# Regra

Ação destrutiva sempre destacada.

---

# Modal — Resolver Duplicidade

## Objetivo

Resolver conflitos de importação ou conciliação.

---

# Estrutura

Mostrar:

- lançamento A
- lançamento B
- motivo da suspeita

---

# Ações

- manter ambos
- unir
- excluir duplicado

---

# Modal — Conciliação

## Objetivo

Explicar divergências financeiras.

---

# Estrutura

## Mostrar

- saldo banco
- saldo sistema
- diferença
- possíveis causas

---

# Ações

- ajustar saldo inicial
- criar lançamento
- ignorar temporariamente

---

# Bottom Sheet — FAB Principal

## Objetivo

Criar acesso operacional rápido.

---

# Opções

- nova despesa
- nova receita
- transferência
- importar extrato
- usar IA

---

# Comportamento Mobile

Bottom sheet:

- sobe da parte inferior
- respeita thumb zone
- fecha com swipe
- mantém contexto visual

---

# Bottom Sheet — Filtros

## Objetivo

Facilitar filtros no mobile.

---

# Estrutura

- período
- conta
- categoria
- tipo
- status

---

# Regras

Filtros devem:

- ser rápidos
- evitar excesso de campos
- permitir limpar facilmente

---

# Drawer — Assistente IA

## Objetivo

Permitir IA contextual sem sair da tela.

---

# Estrutura

## Contexto atual

- período ativo
- conta ativa
- filtros ativos

---

## Entrada IA

Exemplo:

```txt
mercado 89,90 hoje débito
```

---

## Preview

Mostrar:

- interpretação
- dados identificados
- alterações propostas

---

## Ações

- confirmar
- editar
- cancelar

---

# Drawer — Preview de Importação

## Objetivo

Mostrar resultado antes de persistir.

---

# Estrutura

- novos lançamentos
- suspeitos
- duplicados
- ignorados

---

# Regras

Nunca importar automaticamente.

---

# Dialog — Alterações em Lote

## Objetivo

Evitar manutenção massiva acidental.

---

# Mostrar

- quantidade afetada
- campos alterados
- impacto esperado

---

# Exemplo

```txt
12 lançamentos terão categoria alterada.
```

---

# Overlay Loading

## Objetivo

Evitar sensação de travamento.

---

# Regras

## Usar

- skeletons
- progressos reais
- etapas de importação

---

## Nunca usar

- spinner infinito
- loading sem contexto

---

# Overlay Erro

## Objetivo

Explicar falha claramente.

---

# Estrutura

Mostrar:

- o que aconteceu
- possível causa
- ação recomendada
- retry

---

# Mobile First

## Prioridades

- polegar
- poucos toques
- overlays leves
- foco operacional
- clareza

---

# Regras Mobile

## Bottom sheet preferido para:

- ações rápidas
- filtros
- criação rápida

---

## Modal preferido para:

- confirmação
- edição crítica
- detalhe importante

---

# Regras Desktop

Desktop pode:

- usar drawers laterais
- expandir modais
- usar múltiplos painéis

Mas sem:

- excesso de janelas
- aparência de software legado

---

# Comportamento Visual

## Priorizar

- simplicidade
- foco
- clareza
- espaço negativo
- tipografia forte

---

## Evitar

- sombras exageradas
- overlays pesados
- animações excessivas
- excesso de blur

---

# Acessibilidade

Todos overlays devem:

- prender foco corretamente
- permitir ESC
- possuir navegação teclado
- possuir contraste adequado
- possuir labels acessíveis

---

# Objetivo Final

Os overlays do LTCashFlow devem:

- acelerar operação
- reduzir navegação desnecessária
- preservar contexto
- transmitir segurança
- manter fluidez

O usuário deve sentir:

- controle
- rapidez
- clareza
- confiança

Nunca:

- caos
- excesso de camadas
- sensação de sistema pesado
- sensação de ERP legado.

---

# Status dos Documentos

## Concluídos

- navegacao-global.md
- fluxo-dashboard.md
- fluxo-extrato.md
- modais-e-sheets.md

---

# Próximo Documento

```txt
fluxo-cartoes.md
```

Próxima etapa:

Modelar profundamente:

- cartões
- faturas
- parcelamentos
- fechamento
- vencimento
- pagamentos
- relação cartão ↔ corrente
- dupla contagem
- importação
- conciliação
- UX de dívida e limite

