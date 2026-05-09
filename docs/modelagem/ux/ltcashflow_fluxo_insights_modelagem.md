# LTCashFlow — Fluxo de Insights e Inteligência Financeira

Status: em modelagem

---

# Objetivo

Este documento define:

- modelagem UX de insights
- analytics leves
- comportamento financeiro
- tendências
- comparativos
- alertas inteligentes
- interpretação financeira
- IA analítica
- leitura contextual dos dados

---

# Filosofia do Módulo

O módulo de insights NÃO deve parecer:

- BI corporativo
- painel analítico pesado
- dashboard de métricas frias
- software contábil empresarial

O módulo deve funcionar como:

```txt
interpretação financeira humana.
```

---

# Objetivo Principal

O sistema deve ajudar o usuário a responder:

> “O que está acontecendo com nosso comportamento financeiro?”

---

# Papel dos Insights

Insights devem:

- revelar padrões
- facilitar entendimento
- antecipar problemas
- mostrar tendências
- ajudar tomada de decisão

Sem:

- gerar ansiedade
- parecer julgamento
- parecer cobrança

---

# Estrutura de Navegação

## Página principal

```txt
/dashboard/insights
```

---

# Estrutura da Página

## Mobile

```txt
Resumo geral
↓
Mudanças importantes
↓
Comparativos
↓
Tendências
↓
Insights IA
↓
Alertas inteligentes
```

---

## Desktop

Pode:

- expandir comparativos
- usar grids
- exibir múltiplos painéis
- melhorar análises temporais

Mas sem parecer software corporativo.

---

# Resumo Geral

## Objetivo

Mostrar leitura rápida do momento financeiro.

---

# Informações

- receitas
- despesas
- saldo
- tendência
- categorias dominantes

---

# Regras

Resumo deve:

- ser simples
- contextualizar números
- evitar overload visual

---

# Mudanças Importantes

## Objetivo

Destacar alterações relevantes.

---

# Exemplos

- alimentação aumentou
- transporte caiu
- cartão cresceu acima da média
- novas assinaturas detectadas
- despesas recorrentes aumentaram

---

# Estrutura

Cards curtos.

Cada insight deve conter:

- contexto
- explicação simples
- impacto
- possível ação

---

# Comparativos

## Objetivo

Mostrar evolução temporal.

---

# Tipos

## Período atual vs anterior

Exemplo:

```txt
Abril vs Março
```

---

## Semana atual vs passada

---

## Categoria atual vs média histórica

---

# Regras

Comparativos devem:

- evitar excesso de precisão
- focar tendência
- evitar linguagem técnica

---

# Tendências

## Objetivo

Mostrar direção financeira.

---

# Exemplos

- gastos aumentando
- economia crescente
- cartão estabilizando
- metas evoluindo

---

# Regras

Tendências devem:

- ser suaves
- evitar alarmismo
- mostrar contexto temporal

---

# Categorias Financeiras

## Objetivo

Explicar comportamento do dinheiro.

---

# Mostrar

- categorias dominantes
- categorias crescentes
- categorias incomuns

---

# Regras

Evitar:

- pizza charts exagerados
- analytics corporativos
- dashboards complexos

---

# Assinaturas e Recorrências

## Objetivo

Ajudar percepção de gastos contínuos.

---

# Mostrar

- serviços recorrentes
- crescimento recorrente
- impacto mensal

---

# Exemplos

- streaming
- academia
- apps
- seguros

---

# Alertas Inteligentes

## Objetivo

Antecipar problemas financeiros.

---

# Casos

- categoria acima da média
- saldo projetado negativo
- fatura crescendo rapidamente
- meta sem movimentação
- duplicidade suspeita

---

# Regras

Alertas devem:

- ser úteis
- ser contextuais
- evitar excesso

---

# Limite de Alertas

Máximo recomendado:

```txt
3 a 5 simultaneamente
```

---

# IA Analítica

## Objetivo

Interpretar comportamento financeiro.

---

# IA pode

- resumir período
- explicar aumento de gastos
- localizar mudanças relevantes
- identificar padrões
- sugerir revisão

---

# IA nunca

- julga usuário
- faz pressão emocional
- cria medo
- assume decisões financeiras

---

# Linguagem da IA

## Correto

```txt
Os gastos com alimentação aumentaram nas últimas semanas.
```

---

## Evitar

```txt
Você está gastando demais.
```

---

# Insights Contextuais

## Objetivo

Relacionar comportamento ao contexto.

---

# Exemplos

- aumento temporário
- mês atípico
- parcela extraordinária
- sazonalidade

---

# Projeções

## Objetivo

Ajudar previsão leve.

---

# Exemplos

- projeção de saldo
- impacto de cartão
- tendência mensal
- previsão simples de metas

---

# Regras

Projeções devem:

- ser aproximadas
- evitar falsa precisão
- mostrar contexto

---

# Visualização

## Priorizar

- clareza
- leitura rápida
- comparação simples
- narrativa visual leve

---

## Evitar

- dashboards densos
- excesso de mini gráficos
- BI corporativo
- poluição visual

---

# Quick Actions

## Mobile

- abrir extrato filtrado
- revisar categoria
- abrir cartão
- usar IA

---

## Desktop

Pode:

- expandir análises
- usar múltiplos painéis
- mostrar comparativos avançados

---

# FAB

## Objetivo

Atalho contextual.

---

# Opções

- perguntar para IA
- revisar lançamentos
- conciliar
- ajustar categorias

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
Ainda não existem dados suficientes para gerar insights.
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

- leitura rápida
- poucos gráficos
- contexto claro
- thumb zone
- comparação simples

---

# Responsividade

## Mobile

Fluxo vertical.

---

## Desktop

Pode:

- expandir comparativos
- usar grids
- mostrar múltiplas tendências

Mas sem parecer:

- BI empresarial
- plataforma financeira corporativa

---

# Relação com Banco de Dados

Insights devem respeitar:

- competência
- liquidação
- categorias
- cartões
- metas
- transferências
- recorrências
- saldos

Nunca gerar interpretação inconsistente.

---

# Relação Emocional

O módulo deve transmitir:

- clareza
- percepção
- entendimento
- organização
- consciência financeira

Nunca:

- culpa
- medo
- julgamento
- ansiedade financeira

---

# Objetivo Final

O usuário deve conseguir:

- entender padrões financeiros
- perceber mudanças importantes
- antecipar problemas
- acompanhar evolução
- tomar decisões melhores

O módulo deve parecer:

- inteligente
- humano
- leve
- interpretativo
- útil

Nunca:

- corporativo
- excessivamente técnico
- frio
- julgador.

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
- fluxo-insights.md

---

# Próximo Documento

```txt
fluxo-configuracoes.md
```

Próxima etapa:

Modelar:

- configurações
- gestão ativa
- membros
- permissões
- categorias
- notificações
- integrações
- perfil
- segurança
- UX administrativa

