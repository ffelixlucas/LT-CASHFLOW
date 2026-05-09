# LTCashFlow — Estados da Interface

Status: em modelagem

---

# Objetivo

Este documento define:

- estados globais da interface
- loading
- empty states
- erros
- offline
- feedback visual
- skeletons
- toasts
- confirmações
- estados financeiros especiais
- comportamento visual global

---

# Filosofia dos Estados

Os estados da interface do LTCashFlow devem:

- reduzir ansiedade
- transmitir clareza
- evitar pânico visual
- evitar linguagem técnica excessiva
- manter sensação de estabilidade
- preservar confiança financeira

---

# Regra Principal

O sistema nunca deve parecer:

- quebrado
- caótico
- imprevisível
- agressivo
- corporativo demais

Mesmo em erro.

---

# Categorias de Estado

O sistema possui:

1. Loading
2. Empty
3. Sem resultados
4. Erro
5. Offline
6. Sem permissão
7. Estados financeiros
8. Feedback operacional
9. Confirmações

---

# Loading

## Objetivo

Evitar sensação de travamento.

---

# Regras

## Sempre:

- indicar progresso
- preservar layout
- evitar mudança brusca
- manter estabilidade visual

---

## Nunca:

- spinner infinito
- tela vazia sem contexto
- loading piscando

---

# Skeletons

## Objetivo

Representar estrutura real.

---

# Skeletons devem parecer

- cards reais
- listas reais
- widgets reais
- tabelas reais

---

# Regras

Skeleton nunca deve:

- parecer genérico
- alterar layout após carregamento
- causar CLS visual

---

# Exemplos

## Dashboard

Skeletons:

- snapshot financeiro
- cards
- extrato recente

---

## Extrato

Skeletons:

- agrupamentos
- lançamentos
- filtros

---

## Cartões

Skeletons:

- fatura
- parcelamentos
- compras

---

# Empty State

## Objetivo

Guiar o usuário.

---

# Filosofia

Empty state não é:

```txt
Nada encontrado.
```

Empty state deve:

- explicar
- orientar
- incentivar próxima ação

---

# Estrutura Recomendada

- título
- explicação simples
- ação principal

---

# Exemplos

## Extrato vazio

```txt
Ainda não existem movimentações neste período.
Adicione sua primeira movimentação.
```

---

## Cartão vazio

```txt
Nenhuma compra encontrada nesta fatura.
```

---

## Conta vazia

```txt
Esta conta ainda não possui movimentações.
```

---

# Sem Resultados

## Objetivo

Explicar filtro sem resultado.

---

# Exemplo

```txt
Nenhum lançamento encontrado com estes filtros.
```

---

# Regras

Sempre permitir:

- limpar filtros
- voltar contexto
- tentar novamente

---

# Estado de Erro

## Objetivo

Explicar falhas claramente.

---

# Estrutura Obrigatória

Mostrar:

- o que aconteceu
- possível causa
- ação recomendada
- retry

---

# Nunca usar

```txt
Erro inesperado.
```

---

# Exemplos

## Erro de conexão

```txt
Não foi possível carregar os lançamentos.
Verifique sua conexão e tente novamente.
```

---

## Erro de importação

```txt
O arquivo não pôde ser processado.
Verifique o formato e tente novamente.
```

---

# Estado Offline

## Objetivo

Manter previsibilidade.

---

# Comportamento

Sistema deve:

- avisar claramente
- preservar dados locais possíveis
- bloquear ações perigosas

---

# Exemplo

```txt
Você está offline.
Algumas ações podem estar indisponíveis.
```

---

# Regras

Nunca:

- fingir sincronização
- esconder falha de rede

---

# Estado Sem Permissão

## Objetivo

Explicar restrições sem parecer erro.

---

# Exemplo

```txt
Você não possui acesso para alterar esta gestão.
```

---

# Regras

Nunca:

- parecer bug
- parecer falha do sistema

---

# Estados Financeiros

## Objetivo

Explicar situações financeiras importantes.

---

# Casos

- saldo divergente
- duplicidade
- fatura vencendo
- categoria ausente
- movimentação suspeita

---

# Regra

Estados financeiros devem:

- explicar contexto
- evitar pânico
- mostrar solução

---

# Exemplo

```txt
Existe diferença entre o saldo do banco e o saldo calculado.
Revise os últimos lançamentos.
```

---

# Toasts

## Objetivo

Feedback rápido.

---

# Tipos

## Sucesso

Exemplo:

```txt
Lançamento salvo.
```

---

## Erro

Exemplo:

```txt
Não foi possível salvar o lançamento.
```

---

## Aviso

Exemplo:

```txt
Possível duplicidade encontrada.
```

---

# Regras

Toasts devem:

- ser curtos
- desaparecer naturalmente
- não bloquear operação

---

# Nunca usar toast para

- erros críticos
- confirmação destrutiva
- explicações longas

---

# Confirmações

## Objetivo

Evitar alterações perigosas.

---

# Casos Obrigatórios

- exclusão
- alteração em lote
- importação
- conciliação
- ajuste de saldo

---

# Estrutura

Mostrar:

- impacto
- quantidade afetada
- consequência

---

# Exemplo

```txt
12 lançamentos serão alterados.
Deseja continuar?
```

---

# Feedback Operacional

## Objetivo

Transmitir sensação de controle.

---

# Exemplos

- lançamento salvo
- conciliação concluída
- importação processada
- transferência realizada

---

# Regras

Feedback deve:

- ser imediato
- ser claro
- confirmar ação executada

---

# Estados IA

## Objetivo

Explicar processamento da IA.

---

# IA processando

Exemplo:

```txt
Analisando lançamentos...
```

---

# IA aguardando confirmação

Exemplo:

```txt
Revise as alterações antes de confirmar.
```

---

# IA em reparo

Exemplo:

```txt
Verificando possíveis inconsistências.
```

---

# Estados de Importação

## Objetivo

Explicar processamento de arquivos.

---

# Etapas

```txt
Upload
↓
Leitura
↓
Detecção duplicidade
↓
Preview
↓
Confirmação
```

---

# Mostrar sempre

- progresso
- quantidade processada
- erros encontrados

---

# Estados de Conciliação

## Objetivo

Explicar divergências.

---

# Exemplo

```txt
Encontramos diferença entre o saldo calculado e o saldo informado.
```

---

# Mostrar

- diferença
- possível causa
- impacto
- ação sugerida

---

# Animações

## Objetivo

Melhorar fluidez.

---

# Regras

Animações devem:

- ser rápidas
- suaves
- discretas
- funcionais

---

# Evitar

- excesso de movimento
- animações chamativas
- delays desnecessários

---

# Mobile First

## Prioridades

- clareza imediata
- feedback rápido
- overlays leves
- thumb zone
- baixa carga cognitiva

---

# Responsividade

## Mobile

Estados compactos.

---

## Desktop

Pode:

- expandir contexto
- mostrar detalhes extras
- manter múltiplos painéis

---

# Acessibilidade

Todos estados devem:

- possuir contraste adequado
- funcionar com teclado
- ter labels corretos
- possuir feedback visual claro

---

# Relação com UX do Produto

Os estados do LTCashFlow devem reforçar:

- calma
- clareza
- previsibilidade
- segurança
- estabilidade

Nunca:

- medo
- caos
- pressão
- agressividade visual

---

# Objetivo Final

Mesmo durante:

- erro
- loading
- divergência
- importação
- conciliação

O usuário deve sentir:

- controle
- orientação
- segurança
- clareza

O sistema nunca deve parecer:

- quebrado
- improvisado
- instável
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

---

# Próximo Documento

```txt
fluxo-mobile.md
```

Próxima etapa:

Modelar:

- mobile-first real
- thumb zone
- bottom navigation
- FAB
- swipe
- densidade
- ergonomia
- comportamento touch
- performance percebida
- UX operacional mobile

