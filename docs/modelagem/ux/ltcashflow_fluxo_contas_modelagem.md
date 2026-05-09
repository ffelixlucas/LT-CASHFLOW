# LTCashFlow — Fluxo de Contas

Status: em modelagem

---

# Objetivo

Este documento define:

- modelagem UX de contas
- visão patrimonial
- buckets financeiros
- transferências
- poupança
- investimentos
- porquinho
- reconciliação
- histórico de saldo
- relação entre contas
- fluxo operacional entre origens

---

# Filosofia do Módulo

O módulo de contas representa:

> “Onde o dinheiro realmente está.”

Ele NÃO deve funcionar como:

- lista técnica bancária
- tabela de contas seca
- painel bancário tradicional

O módulo deve transmitir:

- organização patrimonial
- clareza financeira
- localização do dinheiro
- segurança operacional

---

# Pergunta Principal da Tela

O usuário deve conseguir responder:

> “Quanto temos e onde esse dinheiro está?”

---

# Estrutura de Navegação

## Lista de contas

```txt
/dashboard/contas
```

---

## Conta específica

```txt
/dashboard/contas/:id
```

---

## Relação principal

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

# Conceito de Buckets

O sistema deve separar claramente:

- dinheiro disponível
- dinheiro reservado
- dinheiro investido
- dívida cartão

---

# Buckets Oficiais

## Disponível

Contas:

- corrente
- carteira
- caixa

Representa:

Dinheiro imediatamente utilizável.

---

## Poupança

Contas:

- porquinho
- reserva
- objetivo
- poupança tradicional

Representa:

Dinheiro separado do uso diário.

---

## Investimento

Contas:

- renda fixa
- corretora
- ações
- investimentos reais

Representa:

Patrimônio investido.

---

## Cartão

Representa:

- dívida futura
- faturas
- comprometimento

---

# Regras Importantes

## Porquinho

Porquinho deve ser tratado como:

```txt
poupanca
```

E NÃO como:

```txt
investimento
```

Quando representar apenas reserva.

---

# Tela — Lista de Contas

## Objetivo

Mostrar visão consolidada das origens financeiras.

---

# Estrutura

Lista por bucket.

---

# Exemplo

```txt
Disponível
- Banco Inter
- Carteira

Poupança
- Porquinho Inter
- Reserva Emergência

Investimentos
- XP Investimentos
```

---

# Cada Conta Deve Mostrar

- nome
- tipo
- saldo atual
- tendência simples
- últimas movimentações

---

# Regras Visuais

## NÃO usar

- excesso de números pequenos
- visual bancário pesado
- excesso de gráficos

---

## Priorizar

- clareza
- localização rápida
- leitura simples
- organização por contexto

---

# Tela — Conta Específica

## Objetivo

Mostrar vida financeira daquela origem.

---

# Estrutura Mobile

```txt
Resumo conta
↓
Saldo
↓
Últimas movimentações
↓
Transferências
↓
Histórico
↓
Conciliação
```

---

# Estrutura Desktop

Pode:

- usar múltiplos painéis
- mostrar gráficos leves
- expandir histórico

Mas sem parecer software contábil.

---

# Bloco — Resumo da Conta

## Informações

- nome
- instituição
- tipo
- saldo atual
- bucket

---

# Bloco — Saldo

## Objetivo

Transmitir confiança.

---

# Regras

Saldo deve ser:

- derivado
- consistente
- conciliável

---

# Mostrar

- saldo atual
- saldo conciliado
- diferença se existir

---

# Histórico de Saldo

## Objetivo

Mostrar evolução simples.

---

# Mostrar

- tendência
- movimentações importantes
- evolução temporal

---

# Regras

Evitar:

- excesso de gráficos
- analytics exagerado

---

# Últimas Movimentações

## Objetivo

Permitir acesso rápido ao extrato filtrado.

---

# Estrutura

Semelhante ao extrato principal.

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

# Transferências

## Objetivo

Explicar movimentação entre contas.

---

# Estrutura Mental

Transferência NÃO é:

- nova receita
- nova despesa

Transferência é:

```txt
Dinheiro mudando de origem.
```

---

# Fluxo de Transferência

```txt
Selecionar origem
↓
Selecionar destino
↓
Valor
↓
Preview impacto
↓
Confirmar
```

---

# Preview Obrigatório

Mostrar:

```txt
Conta origem: -500
Conta destino: +500
```

---

# Regras

Transferência deve:

- preservar consistência
- evitar dupla contagem
- manter rastreabilidade

---

# Transferência para Poupança

## Objetivo

Representar separação financeira.

---

# Exemplo

```txt
Corrente → Porquinho
```

---

# Regra

Não tratar como despesa.

---

# Transferência para Investimento

## Objetivo

Representar movimentação patrimonial.

---

# Exemplo

```txt
Corrente → Corretora
```

---

# Conciliação da Conta

## Objetivo

Garantir confiança no saldo.

---

# Casos

- saldo divergente
- lançamento faltando
- duplicidade
- saldo inicial incorreto
- transferência inconsistente

---

# Fluxo

```txt
Detectar divergência
↓
Explicar possível causa
↓
Mostrar impacto
↓
Usuário confirma ajuste
```

---

# Importação de Extrato

## Objetivo

Facilitar reconciliação.

---

# Fluxo

```txt
Importar extrato
↓
Upload
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

# Regras

Nunca:

- sobrescrever automaticamente
- importar silenciosamente
- alterar saldo sem confirmação

---

# Quick Actions

## Mobile

- swipe
- FAB
- long press

---

## Desktop

- hover actions
- filtros persistentes
- painéis laterais

---

# FAB

## Objetivo

Acesso rápido.

---

# Opções

- nova transferência
- importar extrato
- ajustar saldo inicial
- usar IA

---

# IA nas Contas

## Objetivo

Ajudar entendimento patrimonial.

---

# IA pode

- explicar saldo
- detectar divergências
- localizar movimentações
- iniciar conciliação
- sugerir categorização
- explicar transferências

---

# IA nunca

- altera saldo automaticamente
- cria movimentação sem confirmação
- inventa dados
- ajusta saldo silenciosamente

---

# Estados da Página

## Loading

Usar:

- skeletons
- placeholders contextuais

---

## Empty State

Exemplo:

```txt
Nenhuma movimentação encontrada nesta conta.
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
- operações rápidas
- thumb zone
- clareza visual

---

## Desktop

Pode:

- expandir histórico
- usar múltiplos painéis
- melhorar reconciliação

Mas sem parecer:

- ERP bancário
- sistema contábil complexo

---

# Relação com Banco de Dados

A UX deve respeitar:

- gestoes
- contas
- saldo_inicial
- lancamentos
- transferências
- buckets
- competencia
- liquidação
- auditoria

Nunca quebrar consistência financeira.

---

# Objetivo Final

O usuário deve conseguir:

- localizar dinheiro rapidamente
- confiar nos saldos
- entender reservas
- entender investimentos
- entender transferências
- conciliar contas facilmente

O módulo deve transmitir:

- estabilidade
- organização
- clareza patrimonial
- segurança operacional

Nunca:

- confusão patrimonial
- números contraditórios
- sensação bancária pesada
- sensação de planilha.

---

# Status dos Documentos

## Concluídos

- navegacao-global.md
- fluxo-dashboard.md
- fluxo-extrato.md
- modais-e-sheets.md
- fluxo-cartoes.md
- fluxo-contas.md

---

# Próximo Documento

```txt
fluxo-assistente.md
```

Próxima etapa:

Modelar:

- IA operacional
- copiloto financeiro
- contexto da gestão
- tools
- confirmações
- preview
- criação em lote
- manutenção
- reparo
- fluxo conversacional
- comportamento contextual

