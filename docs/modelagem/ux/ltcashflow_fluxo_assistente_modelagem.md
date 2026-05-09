# LTCashFlow — Fluxo do Assistente Operacional

Status: em modelagem

---

# Objetivo

Este documento define:

- modelagem UX do assistente
- comportamento do copiloto financeiro
- contexto operacional
- criação e manutenção via linguagem natural
- confirmações
- previews
- ferramentas operacionais
- modo reparo
- comportamento contextual
- integração com extrato
- integração com contas
- integração com conciliação

---

# Filosofia do Assistente

O assistente do LTCashFlow NÃO é:

- chatbot genérico
- IA social
- conversa casual
- IA criativa

O assistente é:

```txt
Copiloto operacional financeiro.
```

---

# Objetivo Principal

O assistente existe para:

- reduzir atrito operacional
- acelerar manutenção financeira
- facilitar consultas
- ajudar conciliação
- explicar divergências
- interpretar linguagem natural

---

# Regra Mais Importante

A IA nunca deve:

- inventar saldo
- inventar lançamento
- alterar silenciosamente
- gravar automaticamente
- assumir contexto sem evidência

---

# Fluxo Mental do Assistente

O comportamento correto é:

```txt
Interpretar
↓
Entender intenção
↓
Consultar dados reais
↓
Montar preview
↓
Usuário confirma
↓
Executar
```

---

# Relação com Banco de Dados

O assistente sempre opera sobre:

- gestão ativa
- dados reais
- schemas oficiais
- regras financeiras oficiais

---

# Fontes Obrigatórias

- contas
- lançamentos
- categorias
- rateios
- saldos
- auditoria
- conciliação

---

# Localização da IA no Sistema

## Página dedicada

```txt
/dashboard/assistant
```

---

## Drawer contextual

Abrível de qualquer tela.

---

## Atalhos contextuais

Exemplo:

```txt
Extrato
↓
Perguntar sobre esta semana
```

---

# Estrutura da Página do Assistente

## Mobile

```txt
Header
↓
Contexto atual
↓
Histórico
↓
Input IA
↓
Sugestões rápidas
```

---

## Desktop

Pode:

- manter painel lateral
- exibir previews maiores
- dividir conversa e resultados

---

# Header do Assistente

## Mostrar

- gestão ativa
- período ativo
- contexto atual

---

# Contexto Atual

## Objetivo

Deixar claro sobre o que a IA está operando.

---

# Exemplos

```txt
Gestão: Casa Lucas
Período: Abril 2026
Conta ativa: Banco Inter
```

---

# Input Principal

## Objetivo

Aceitar linguagem natural flexível.

---

# Exemplos

```txt
mercado 89,90 hoje débito
```

```txt
quanto gastamos essa semana?
```

```txt
corrige os lançamentos de hoje para alimentação
```

```txt
qual foi nosso maior gasto?
```

---

# Tipos de Intenção

## 1. Consulta

Exemplo:

```txt
quanto gastamos esta semana?
```

---

## 2. Criação

Exemplo:

```txt
uber 18,90 hoje
```

---

## 3. Edição

Exemplo:

```txt
corrige essas entradas para pix
```

---

## 4. Exclusão

Exemplo:

```txt
remove os lançamentos duplicados
```

---

## 5. Conciliação

Exemplo:

```txt
o saldo está diferente
```

---

# Consultas

## Objetivo

Responder usando agregação real.

---

# Respostas Devem Mostrar

- período analisado
- quantidade de lançamentos
- receitas
- despesas
- saldo

---

# Regras

Nunca:

- responder sem contexto
- inventar números
- responder genericamente

---

# Criação de Lançamentos

## Objetivo

Reduzir digitação.

---

# Fluxo

```txt
Usuário digita
↓
IA interpreta
↓
Montar preview
↓
Usuário confirma
↓
Salvar
```

---

# Preview Obrigatório

Mostrar:

- descrição
- valor
- tipo
- conta
- categoria
- data
- meio

---

# Regras

Nunca persistir diretamente.

---

# Criação em Lote

## Exemplo

```txt
pix hoje 50 70 120
```

---

# Resultado Esperado

Criar:

- múltiplos lançamentos
- soma total
- preview completo

---

# Edição de Lançamentos

## Objetivo

Permitir manutenção natural.

---

# Fluxo

```txt
Usuário solicita ajuste
↓
IA localiza itens
↓
Mostrar impacto
↓
Usuário confirma
↓
Aplicar alteração
```

---

# Exemplo

```txt
muda os lançamentos de hoje para alimentação
```

---

# Mostrar

- quantidade afetada
- valores
- alteração proposta

---

# Exclusão

## Objetivo

Corrigir erros rapidamente.

---

# Fluxo

```txt
IA localiza itens
↓
Mostrar impacto
↓
Usuário confirma
↓
Excluir
```

---

# Regra Obrigatória

Nunca excluir sem confirmação.

---

# Conciliação

## Objetivo

Explicar divergências.

---

# Casos

- saldo divergente
- lançamento faltando
- duplicidade
- pagamento ausente
- fatura incorreta

---

# Fluxo

```txt
Usuário relata problema
↓
IA investiga
↓
Explica possível causa
↓
Mostra opções
↓
Usuário confirma ação
```

---

# Modo Reparo

## Objetivo

Priorizar correção de erros causados pela própria IA.

---

# Regra

Se usuário disser:

```txt
isso ficou errado
```

IA deve:

- parar criação
- entrar em reparo
- localizar erro
- corrigir
- confirmar

---

# Ferramentas Operacionais

## Leitura

- buscar lançamentos
- resumir período
- maiores gastos
- maiores entradas
- médias
- projeções

---

## Escrita

- criar lançamento
- criar em lote
- editar
- excluir
- ajustar categorias
- ajustar contas

---

## Conciliação

- detectar divergências
- comparar extrato
- identificar duplicidade
- sugerir reparo

---

# Sugestões Rápidas

## Objetivo

Acelerar uso.

---

# Exemplos

- resumo da semana
- maiores gastos
- criar despesa
- conciliar conta
- revisar duplicados

---

# Contextualização

O assistente deve herdar:

- gestão ativa
- período ativo
- conta ativa
- filtros ativos

---

# Exemplo

Se usuário estiver no extrato filtrado:

```txt
Banco Inter
Abril 2026
```

A IA deve considerar esse contexto.

---

# Histórico Conversacional

## Objetivo

Manter continuidade operacional.

---

# Deve preservar

- últimos previews
- últimas alterações
- contexto recente
- confirmação pendente

---

# Regras Visuais

## Priorizar

- clareza
- respostas objetivas
- previews organizados
- foco operacional

---

## Evitar

- conversa longa desnecessária
- respostas prolixas
- IA “social”
- emojis excessivos

---

# IA e Segurança

## Nunca permitir

- SQL livre
- alteração silenciosa
- exclusão em massa sem confirmação
- mudança de saldo automática

---

# Auditoria

Toda alteração feita via IA deve registrar:

- origem IA
- timestamp
- ação realizada
- usuário
- impacto

---

# Estados da Página

## Loading

Usar:

- skeletons
- processamento contextual

---

## Erro

Mostrar:

- contexto
- possível causa
- retry

---

## Sem Resultados

Exemplo:

```txt
Nenhum lançamento encontrado neste período.
```

---

# Mobile First

## Prioridades

- input simples
- poucas ações
- respostas rápidas
- previews compactos
- thumb zone

---

# Responsividade

## Mobile

Fluxo vertical.

---

## Desktop

Pode:

- dividir preview
- usar drawer lateral
- mostrar múltiplos resultados

---

# Relação com UX do Produto

A IA deve:

- complementar a experiência
- reduzir fricção
- acelerar manutenção
- facilitar entendimento

Ela NÃO deve substituir:

- extrato
- navegação principal
- entendimento financeiro do usuário

---

# Objetivo Final

O usuário deve sentir:

- ajuda real
- rapidez
- segurança
- controle
- clareza

O assistente deve transmitir:

- confiança
- precisão
- estabilidade
- inteligência operacional

Nunca:

- imprevisibilidade
- criatividade financeira
- conversa vazia
- sensação de chatbot genérico.

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

---

# Próximo Documento

```txt
estados-da-interface.md
```

Próxima etapa:

Modelar:

- loading
- empty states
- erros
- offline
- sem permissão
- estados financeiros
- skeletons
- feedback visual
- toasts
- confirmações
- comportamento global da interface

