# LTCashFlow — Navegação Global e Estrutura Base do App

## Objetivo

Este documento define a arquitetura inicial de navegação do LTCashFlow.

O objetivo é estabelecer:

- estrutura global do aplicativo
- separação entre área pública e autenticada
- hierarquia de navegação
- comportamento mobile-first
- shell principal do app
- contextos globais persistentes
- relação entre páginas
- fluxo mental de navegação

Este documento NÃO modela ainda:

- dashboard detalhado
- extrato completo
- modais específicos
- IA operacional profunda
- cartões completos
- metas
- insights

Esses tópicos serão documentados separadamente.

---

# Filosofia da Navegação

A navegação do LTCashFlow deve:

- reduzir carga cognitiva
- manter orientação constante do usuário
- evitar excesso de níveis hierárquicos
- funcionar primeiro no mobile
- manter acesso rápido ao extrato
- permitir operação financeira rápida
- manter clareza de contexto financeiro

Princípios:

- snapshot antes de profundidade
- poucos destinos principais
- drilldown progressivo
- ações rápidas sempre acessíveis
- contexto persistente

---

# Estrutura Global

O sistema possui duas grandes áreas:

## 1. Área Pública

Responsável por:

- apresentação do produto
- SEO
- aquisição
- autenticação
- onboarding

## 2. Área Autenticada

Responsável por:

- operação financeira
- extrato
- contas
- cartões
- metas
- IA operacional
- configurações

---

# Estrutura de Rotas

## Área Pública

```txt
/
/login
/registro
/esqueci-senha
/planos
/ajuda
```

---

## Área Autenticada

```txt
/dashboard
/dashboard/extrato
/dashboard/extrato/:id
/dashboard/cartoes
/dashboard/cartoes/:id
/dashboard/contas
/dashboard/contas/:id
/dashboard/metas
/dashboard/insights
/dashboard/assistant
/dashboard/configuracoes
```

---

# Estrutura Mental do Produto

A navegação deve refletir a seguinte lógica:

```txt
HOJE
↓
EXTRATO
↓
DETALHE
↓
AÇÃO
```

O sistema deve sempre responder primeiro:

> “Como estamos agora?”

E depois:

> “O que aconteceu?”

E só então:

> “O que posso fazer?”

---

# Shell Principal do App

O shell autenticado é persistente.

Ele contém:

- navegação principal
- gestão ativa
- período ativo
- avatar
- notificações
- acesso rápido ao assistente
- FAB mobile

O shell NÃO deve recarregar completamente durante navegação interna.

---

# Topbar Global

## Objetivo

Manter orientação constante.

## Elementos

### 1. Gestão ativa

Exemplo:

- Casa Lucas
- Família Silva
- Projeto Reforma

Sempre visível.

Troca rápida.

---

### 2. Período ativo

Exemplo:

- Este mês
- Últimos 7 dias
- Abril 2026

Persistente entre páginas relacionadas.

---

### 3. Notificações

Tipos:

- operacionais
- divergências
- lembretes
- insights

---

### 4. Avatar/Menu usuário

Contém:

- perfil
- trocar gestão
- preferências
- sair

---

### 5. Acesso rápido IA

Botão global do assistente operacional.

---

# Navegação Mobile

## Filosofia

O mobile é prioridade.

A navegação deve funcionar:

- com uma mão
- com polegar
- com poucos toques
- sem menus profundos

---

# Bottom Navigation

Máximo:

5 destinos principais.

## Estrutura sugerida

### 1. Hoje

Destino:

```txt
/dashboard
```

---

### 2. Extrato

Destino:

```txt
/dashboard/extrato
```

---

### 3. Planejar

Destino:

```txt
/dashboard/metas
```

---

### 4. Contas

Destino:

```txt
/dashboard/contas
```

---

### 5. Assistente

Destino:

```txt
/dashboard/assistant
```

---

# FAB Mobile

## Objetivo

Criar operação rápida.

## Local

Inferior direito.

## Ações

Ao clicar:

Abrir Action Sheet.

---

# Action Sheet Principal

## Opções

- nova despesa
- nova receita
- transferência
- importar extrato
- usar IA

---

# Navegação Desktop

## Filosofia

Desktop deve permitir:

- maior densidade
- conciliação
- operação prolongada
- visão lateral persistente

---

# Sidebar Desktop

## Estrutura

### Grupo principal

- Dashboard
- Extrato
- Cartões
- Contas
- Metas
- Insights

---

### Grupo operacional

- Assistente
- Conciliação
- Importações

---

### Grupo sistema

- Configurações
- Gestão
- Membros

---

# Contextos Persistentes

## Gestão ativa

Persistente globalmente.

Toda query deve respeitar:

```txt
gestao_id
```

---

## Período ativo

Persistente entre:

- dashboard
- extrato
- insights

---

## Filtros rápidos

Exemplo:

- conta atual
- categoria atual
- pessoa atual

Devem sobreviver durante navegação relacionada.

---

# Relação Entre Páginas

## Fluxo principal

```txt
Dashboard
↓
Extrato
↓
Detalhe lançamento
↓
Editar lançamento
```

---

## Fluxo contas

```txt
Contas
↓
Conta específica
↓
Extrato filtrado
↓
Detalhe lançamento
```

---

## Fluxo cartões

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

# Drilldown

Toda navegação profunda deve:

- preservar contexto
- permitir retorno simples
- evitar perder filtros
- manter breadcrumbs claros

---

# Regras de Navegação

## NÃO usar

- múltiplos menus concorrentes
- navegação escondida excessiva
- excesso de subníveis
- telas órfãs
- rotas sem contexto

---

## SEMPRE usar

- contexto visível
- hierarquia clara
- título forte
- navegação previsível
- ação principal evidente

---

# Estados Globais

Toda navegação deve prever:

- loading
- erro
- vazio
- offline parcial
- sem permissão

Esses estados serão detalhados posteriormente.

---

# Comportamento Responsivo

## Mobile

Prioridade:

- leitura rápida
- operação rápida
- polegar
- listas verticais
- FAB
- sheets

---

## Tablet

Pode:

- expandir listas
- mostrar painéis laterais leves
- melhorar conciliação

---

## Desktop

Pode:

- aumentar densidade
- permitir múltiplos painéis
- mostrar filtros persistentes
- melhorar produtividade operacional

---

# Integração com IA

O assistente operacional deve ser acessível:

- via rota própria
- via botão global
- via contexto de tela
- via ações rápidas

A IA nunca deve quebrar o fluxo principal de operação financeira.

Ela complementa.

Não substitui a navegação principal.

---

# Objetivo Final da Navegação

O usuário deve:

- entender rapidamente onde está
- encontrar o extrato imediatamente
- operar sem medo
- corrigir erros facilmente
- navegar sem confusão
- manter sensação de controle financeiro

A navegação deve transmitir:

- clareza
- estabilidade
- previsibilidade
- segurança
- leveza cognitiva

Nunca:

- caos
- excesso de informação
- sensação de ERP
- sensação de planilha gigante
- sensação de painel corporativo.

