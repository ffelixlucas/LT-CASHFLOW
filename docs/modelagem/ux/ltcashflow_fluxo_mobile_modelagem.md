# LTCashFlow — Fluxo Mobile e Experiência Mobile-First

Status: em modelagem

---

# Objetivo

Este documento define:

- filosofia mobile-first
- ergonomia mobile
- thumb zone
- bottom navigation
- FAB
- gestures
- swipe
- comportamento touch
- densidade mobile
- overlays mobile
- performance percebida
- experiência operacional no celular

---

# Filosofia Mobile-First

O LTCashFlow deve ser pensado:

```txt
mobile primeiro
```

E NÃO:

```txt
adaptado para mobile depois.
```

---

# Regra Principal

O sistema deve funcionar:

- rapidamente
- com uma mão
- com poucos toques
- em movimento
- no cotidiano real

---

# Contexto Real de Uso

O usuário utilizará o sistema:

- no mercado
- no carro parado
- em filas
- durante pagamentos
- rapidamente durante o dia
- para corrigir lançamentos
- para consultar saldo

---

# Objetivo da UX Mobile

A experiência mobile deve:

- reduzir esforço
- reduzir digitação
- acelerar manutenção
- facilitar leitura
- evitar menus complexos
- evitar telas densas

---

# Estrutura Mobile Global

## Ordem mental

```txt
Ver rapidamente
↓
Entender
↓
Agir rápido
↓
Voltar ao contexto
```

---

# Bottom Navigation

## Objetivo

Permitir acesso imediato às áreas principais.

---

# Regra

Máximo:

```txt
5 itens
```

---

# Estrutura Oficial

## 1. Hoje

```txt
/dashboard
```

---

## 2. Extrato

```txt
/dashboard/extrato
```

---

## 3. Planejar

```txt
/dashboard/metas
```

---

## 4. Contas

```txt
/dashboard/contas
```

---

## 5. Assistente

```txt
/dashboard/assistant
```

---

# Regras Visuais da Bottom Nav

## Priorizar

- ícones simples
- labels claros
- área clicável confortável

---

## Evitar

- excesso de itens
- labels longos
- menus escondidos excessivos

---

# Thumb Zone

## Objetivo

Garantir ergonomia.

---

# Áreas Prioritárias

Ações importantes devem ficar:

- parte inferior
- centro inferior
- canto inferior acessível

---

# Ações críticas

- FAB
- confirmar
- salvar
- quick actions
- bottom sheets

---

# FAB

## Objetivo

Permitir criação rápida.

---

# Local

Inferior direito.

---

# Regras

FAB deve:

- estar sempre acessível
- não bloquear conteúdo
- possuir contraste claro
- ter ação principal evidente

---

# Action Sheet Principal

## Objetivo

Evitar menus profundos.

---

# Estrutura

- nova despesa
- nova receita
- transferência
- importar extrato
- usar IA

---

# Bottom Sheets

## Objetivo

Substituir modais pesados no mobile.

---

# Uso recomendado

- filtros
- quick actions
- preview rápido
- confirmação leve
- criação rápida

---

# Regras

Bottom sheet deve:

- surgir naturalmente
- permitir swipe para fechar
- preservar contexto visual
- evitar sensação de interrupção brusca

---

# Swipe Gestures

## Objetivo

Reduzir toques.

---

# Extrato

## Swipe esquerda

- editar
- excluir

---

## Swipe direita

- conciliar
- duplicar

---

# Cartões

Swipe possível para:

- pagar
- abrir detalhe
- conciliar

---

# Long Press

## Objetivo

Expor ações secundárias.

---

# Exemplos

- duplicar lançamento
- selecionar múltiplos
- abrir quick actions

---

# Densidade Mobile

## Regra Principal

Menos informação por tela.

---

# Priorizar

- hierarquia forte
- foco operacional
- leitura rápida
- contexto visível

---

# Evitar

- grids densos
- tabelas grandes
- excesso de mini widgets
- excesso de gráficos

---

# Estrutura das Telas

## Mobile deve usar

- fluxo vertical
- cards claros
- agrupamentos temporais
- listas simples

---

# Performance Percebida

## Objetivo

Transmitir rapidez.

---

# Estratégias

- skeletons reais
- carregamento progressivo
- evitar travas visuais
- evitar reflows bruscos

---

# Regras

Mesmo em conexão ruim o app deve parecer:

- estável
- previsível
- utilizável

---

# Inputs Mobile

## Objetivo

Reduzir esforço de digitação.

---

# Estratégias

- máscaras inteligentes
- autocomplete
- sugestões
- categorias recentes
- IA operacional

---

# Criação Rápida

## Exemplo

```txt
mercado 89,90 hoje débito
```

---

# Resultado Esperado

Pouca interação.

Máxima velocidade.

---

# Navegação Mobile

## Regras

Sempre:

- poucos níveis
- retorno simples
- contexto visível
- ação principal clara

---

## Nunca:

- múltiplas barras
- menus escondidos excessivos
- navegação profunda demais

---

# Modais Mobile

## Prioridade

Preferir:

- bottom sheets
- drawers leves
- overlays compactos

---

## Evitar

- modais gigantes
- formulários enormes
- overlays complexos

---

# Scroll

## Objetivo

Preservar orientação.

---

# Regras

Scroll deve:

- manter fluidez
- evitar jumps
- preservar posição
- manter contexto temporal

---

# Feedback Visual

## Objetivo

Transmitir controle.

---

# Regras

Feedback deve:

- ser imediato
- discreto
- claro
- não bloquear operação

---

# Estados Mobile

## Loading

Usar:

- skeletons compactos
- placeholders reais

---

## Empty State

Mostrar:

- orientação
- ação principal

---

## Erro

Mostrar:

- contexto
- retry
- linguagem simples

---

# Mobile e IA

## Objetivo

Permitir operação natural.

---

# IA no mobile deve:

- reduzir digitação
- reduzir menus
- acelerar manutenção
- contextualizar automaticamente

---

# IA nunca deve:

- bloquear fluxo
- criar complexidade
- exigir múltiplas confirmações desnecessárias

---

# Responsividade Tablet

## Tablet pode:

- expandir listas
- usar dois painéis leves
- melhorar conciliação

---

# Responsividade Desktop

Desktop NÃO é prioridade principal.

Mas pode:

- expandir produtividade
- aumentar densidade
- melhorar operação prolongada

---

# Acessibilidade Mobile

Todos elementos devem:

- possuir área touch confortável
- funcionar com leitor de tela
- possuir contraste adequado
- evitar targets pequenos

---

# Relação com UX do Produto

A experiência mobile deve transmitir:

- leveza
- rapidez
- simplicidade
- controle
- clareza

Nunca:

- ERP no celular
- dashboard corporativo miniaturizado
- caos visual
- excesso de informação

---

# Objetivo Final

O usuário deve conseguir:

- consultar saldo rapidamente
- lançar despesas em segundos
- entender cartões facilmente
- corrigir lançamentos rapidamente
- operar o sistema naturalmente

O app deve parecer:

- moderno
- rápido
- fluido
- confiável
- operacional

Nunca:

- pesado
- técnico demais
- burocrático
- complicado.

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

---

# Próximo Documento

```txt
fluxo-metas.md
```

Próxima etapa:

Modelar:

- metas
- objetivos financeiros
- porquinhos
- reserva
- progresso
- previsibilidade
- separação emocional do dinheiro
- planejamento financeiro
- UX de evolução

