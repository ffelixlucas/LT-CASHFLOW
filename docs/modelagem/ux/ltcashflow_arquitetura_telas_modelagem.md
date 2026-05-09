# LTCashFlow — Arquitetura Global de Telas

Status: em modelagem

---

# Objetivo

Este documento consolida toda a arquitetura de experiência do LTCashFlow.

Ele conecta:

- navegação
- páginas
- fluxos
- overlays
- estados
- módulos
- relações entre telas
- hierarquia operacional
- comportamento mobile-first

Este documento se torna:

```txt
a fonte oficial da arquitetura de experiência do produto.
```

---

# Filosofia Geral

O LTCashFlow NÃO deve parecer:

- ERP
- software contábil
- BI corporativo
- painel bancário tradicional
- planilha financeira gigante

O sistema deve transmitir:

- clareza
- leveza
- previsibilidade
- operação rápida
- confiança financeira

---

# Estrutura Global do Produto

O produto possui 2 grandes áreas:

---

# 1. Área Pública

Responsável por:

- aquisição
- onboarding
- autenticação
- recuperação
- marketing
- apresentação

---

# Rotas Públicas

```txt
/
/login
/registro
/esqueci-senha
/planos
/ajuda
```

---

# 2. Área Autenticada

Responsável por:

- operação financeira
- manutenção
- leitura financeira
- organização patrimonial
- planejamento
- IA operacional

---

# Shell Principal

Toda área autenticada utiliza:

- topbar global
- navegação persistente
- FAB
- overlays
- contexto ativo
- gestão ativa

---

# Estrutura Principal das Rotas

```txt
/dashboard
/dashboard/extrato
/dashboard/extrato/:id

/dashboard/cartoes
/dashboard/cartoes/:id

/dashboard/contas
/dashboard/contas/:id

/dashboard/metas
/dashboard/metas/:id

/dashboard/insights

/dashboard/assistant

/dashboard/configuracoes
```

---

# Relação Entre Módulos

---

# Dashboard

Função:

```txt
snapshot operacional
```

Conecta para:

- extrato
- cartões
- contas
- metas
- insights
- IA

---

# Extrato

Função:

```txt
centro operacional financeiro
```

Conecta para:

- detalhe lançamento
- edição
- conciliação
- categorias
- contas
- IA

---

# Cartões

Função:

```txt
controle de dívida futura
```

Conecta para:

- faturas
- parcelamentos
- pagamentos
- conta corrente
- conciliação

---

# Contas

Função:

```txt
localização patrimonial
```

Conecta para:

- saldo
- transferências
- extrato filtrado
- reconciliação

---

# Metas

Função:

```txt
planejamento financeiro
```

Conecta para:

- reservas
- porquinhos
- aportes
- previsões

---

# Insights

Função:

```txt
interpretação financeira
```

Conecta para:

- IA
- tendências
- categorias
- alertas

---

# Assistente

Função:

```txt
copiloto operacional
```

Conecta para TODOS os módulos.

---

# Configurações

Função:

```txt
administração da gestão
```

Conecta para:

- membros
- categorias
- notificações
- segurança
- preferências

---

# Estrutura Mental da Navegação

Fluxo principal:

```txt
Hoje
↓
Extrato
↓
Detalhe
↓
Ação
```

---

# Mobile First

O sistema foi desenhado:

```txt
mobile primeiro
```

---

# Bottom Navigation

Estrutura oficial:

```txt
Hoje
Extrato
Planejar
Contas
Assistente
```

---

# FAB Global

Presente nas telas operacionais.

Objetivo:

```txt
operação rápida
```

---

# Action Sheet Global

Opções principais:

- nova despesa
- nova receita
- transferência
- importar extrato
- usar IA

---

# Hierarquia de Overlays

---

# Modal

Usado para:

- edição
- confirmação
- detalhe
- conciliação

---

# Bottom Sheet

Usado para:

- quick actions
- filtros
- mobile actions

---

# Drawer

Usado para:

- IA contextual
- preview
- detalhes rápidos

---

# Estados Globais

Todos módulos seguem:

- loading
- empty
- erro
- offline
- sem permissão
- estados financeiros

---

# Estrutura Operacional

---

# Operação Manual

Fluxo:

```txt
Usuário
↓
Extrato
↓
Editar
↓
Salvar
```

---

# Operação IA

Fluxo:

```txt
Usuário
↓
IA interpreta
↓
Preview
↓
Confirmação
↓
Persistência
```

---

# Fluxos Críticos do Sistema

---

# Criação de lançamento

```txt
FAB
↓
Novo lançamento
↓
Preview
↓
Salvar
```

---

# Importação

```txt
Upload
↓
Pré-processamento
↓
Detecção duplicidade
↓
Preview
↓
Confirmar
```

---

# Conciliação

```txt
Detectar divergência
↓
Explicar problema
↓
Mostrar impacto
↓
Confirmar ajuste
```

---

# Transferência

```txt
Conta origem
↓
Conta destino
↓
Preview
↓
Confirmar
```

---

# Relação com Banco de Dados

Toda arquitetura deve respeitar:

- gestoes
- contas
- lançamentos
- competência
- liquidação
- transferências
- cartões
- auditoria
- rateios
- categorias

---

# Relação Emocional do Produto

O sistema deve transmitir:

- controle
- estabilidade
- clareza
- previsibilidade
- calma operacional

Nunca:

- culpa
- medo
- ansiedade
- sensação corporativa
- sensação contábil pesada

---

# Linguagem Global

O produto deve usar:

- frases humanas
- explicações simples
- contexto financeiro claro
- feedback previsível

Evitar:

- linguagem bancária agressiva
- excesso técnico
- termos contábeis complexos

---

# Componentes Estruturais Principais

---

# Componentes Globais

- Topbar
- BottomNav
- FAB
- ActionSheet
- DrawerIA
- Toasts
- DialogConfirmacao

---

# Componentes Operacionais

- ListaLancamentos
- CardConta
- CardCartao
- CardMeta
- CardInsight
- TimelineFinanceira

---

# Componentes Financeiros

- BucketSaldo
- ResumoFatura
- ResumoPeriodo
- Comparativo
- IndicadorTendencia

---

# Componentes IA

- InputIA
- PreviewIA
- ConfirmacaoIA
- ResultadoIA
- ReparadorIA

---

# Estrutura de Crescimento Futuro

Arquitetura preparada para:

- sincronização bancária
- OFX
- IA avançada
- múltiplas gestões
- colaboração familiar
- categorização inteligente
- projeções
- automações futuras

---

# Objetivo Final da Arquitetura

Qualquer desenvolvedor ou IA deve conseguir:

- implementar frontend
- implementar mobile
- implementar overlays
- implementar fluxos
- implementar UX
- implementar estados
- implementar IA operacional

sem reinventar comportamento.

---

# Resultado Esperado

O LTCashFlow deve parecer:

- moderno
- humano
- operacional
- inteligente
- leve
- confiável

Nunca:

- ERP
- planilha
- painel corporativo
- software bancário pesado.

