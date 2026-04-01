# LT CashFlow - Catalogo de Comandos do Assistente

Status: oficial  
Data de criacao: 2026-04-01

Este documento registra comandos reais que o Codex ja executou manualmente e que a IA do LT CashFlow deve conseguir fazer dentro do sistema.

Objetivo:

- transformar pedidos reais do usuario em capacidades oficiais do assistente
- evitar retrabalho e "treino infinito" por frase isolada
- manter um catalogo vivo de exemplos, intencoes e comportamento esperado

Se houver conflito entre heuristica antiga e este catalogo, este catalogo deve ser considerado junto com `docs/assistente-ia.md`.

## Como usar este documento

Cada comando deve ser lido assim:

- `comando`: frase real ou frase-modelo
- `intencao`: o que a IA deve entender
- `resultado esperado`: resposta ou acao correta
- `status`: `manual no Codex`, `parcial na IA`, `obrigatorio na IA`

## Regras gerais

- o usuario nao precisa falar "bonito"
- a IA deve tolerar erro de digitacao, fala coloquial e correcao no meio da frase
- leitura pode responder direto com base no banco real
- escrita deve sempre mostrar rascunho e pedir confirmacao antes de gravar
- manutencao nunca pode virar novo lancamento
- quando o usuario disser que algo ficou errado, a IA deve entrar em modo de reparo, nao de criacao
- termos relativos de tempo devem ser resolvidos pela data real do servidor da aplicacao
- `hoje`, `ontem`, `amanha`, `esta semana` e similares nunca podem ser inventados pelo modelo

## 1. Consultas e Resumos

### 1.1 Ultimo e maiores

- comando: `qual foi o ultimo lancamento?`
  intencao: buscar ultimo lancamento da gestao ativa
  resultado esperado: informar descricao, data, origem e valor
  status: obrigatorio na IA

- comando: `qual foi a maior despesa?`
  intencao: buscar maior despesa no recorte atual ou no periodo pedido
  resultado esperado: informar descricao, valor, data e origem
  status: obrigatorio na IA

- comando: `qual foi a maior receita?`
  intencao: buscar maior receita no recorte atual ou no periodo pedido
  resultado esperado: informar descricao, valor, data e origem
  status: obrigatorio na IA

### 1.2 Resumos por periodo

- comando: `faz um resumo da nossa semana`
  intencao: resumir semana atual
  resultado esperado: informar quantidade, receitas, despesas e saldo
  status: obrigatorio na IA

- comando: `faz um resumo dos ultimos 7 dias`
  intencao: resumir janela movel de 7 dias
  resultado esperado: informar quantidade, receitas, despesas e saldo
  status: obrigatorio na IA

- comando: `faz um resumo do mes`
  intencao: resumir mes atual
  resultado esperado: informar quantidade, receitas, despesas e saldo
  status: obrigatorio na IA

### 1.3 Analise de gasto

- comando: `com o que mais gastamos essa semana?`
  intencao: identificar principal categoria de gasto no periodo
  resultado esperado: categoria principal, total, quantidade e maior gasto individual
  status: obrigatorio na IA

- comando: `qual o dia que mais gastamos essa semana?`
  intencao: identificar dia com maior despesa no periodo
  resultado esperado: data, total e quantidade de lancamentos
  status: obrigatorio na IA

- comando: `o que devo tomar cuidado qual gasto?`
  intencao: destacar principal ponto de atencao no periodo
  resultado esperado: categoria com maior peso e segunda categoria, se fizer sentido
  status: obrigatorio na IA

### 1.4 Analise de entradas

- comando: `quanto tivemos de entrada e por onde vieram?`
  intencao: resumir entradas por origem
  resultado esperado: total de entradas e distribuicao por origem
  status: obrigatorio na IA

- comando: `quais foram nossas melhores entradas e por qual metodo entraram?`
  intencao: listar maiores entradas e seus meios
  resultado esperado: valor, data, meio e origem das maiores entradas
  status: obrigatorio na IA

- comando: `quanto e 10% do que ganhei?`
  intencao: calcular 10% das receitas do recorte pedido
  resultado esperado: total de receitas e o valor correspondente a 10%
  status: obrigatorio na IA

## 2. Criacao de Lancamentos

### 2.1 Lancamento simples

- comando: `mercado 182,90 hoje`
  intencao: criar despesa simples
  resultado esperado: rascunho com descricao, valor, data, categoria e origem provavel
  status: obrigatorio na IA

- comando: `saida de hoje Onibus 6,13 debito`
  intencao: criar despesa simples com data relativa
  resultado esperado: despesa de transporte, meio `debito`, data absoluta de hoje resolvida pelo servidor
  status: manual no Codex, obrigatorio na IA

- comando: `recebi 2500 de salario`
  intencao: criar receita simples
  resultado esperado: rascunho com tipo receita, valor, categoria e origem
  status: obrigatorio na IA

- comando: `adicionar entrada de pix do Lucas 72,20`
  intencao: criar receita via pix
  resultado esperado: receita, meio `pix`, origem bancaria do Lucas, sem cair em cartao de credito
  status: obrigatorio na IA

### 2.2 Criacao em lote

- comando: `lanca essas entradas de pix hoje dia 01/04/2026 61,95 86,45 68,95`
  intencao: criar varias receitas via pix na data informada
  resultado esperado: montar um lote com 3 entradas separadas, mostrar a soma total e salvar so apos confirmacao
  status: manual no Codex, obrigatorio na IA

- comando: `adicione as entradas de pix hoje 57,54 50,94 50,31 24,25 19,38 86,45 61,95 61,95 61,95 61,95`
  intencao: criar varios lancamentos de receita em lote
  resultado esperado: um rascunho com varios itens separados, quantidade total e soma do lote
  status: obrigatorio na IA

- comando: `do dia 30 faltou adicionar 6,13 compra no debito onibus ... entradas pix 86,45 323,93 ...`
  intencao: interpretar texto misto com varias receitas e despesas
  resultado esperado: montar lote com itens separados, classificacao correta e confirmacao antes de gravar
  status: obrigatorio na IA

## 3. Edicao e Correcao

- comando: `ajusta a entrada de pix de 72,20 para 31/03/2026`
  intencao: corrigir data de lancamento existente
  resultado esperado: localizar item, mostrar ajuste e pedir confirmacao
  status: obrigatorio na IA

- comando: `altera o meio dessas despesas para cartao de credito`
  intencao: edicao em lote
  resultado esperado: selecionar os itens afetados, mostrar quantidade e aplicar so apos confirmacao
  status: obrigatorio na IA

- comando: `corrige essas entradas para banco Inter Lucas`
  intencao: corrigir origem de varios lancamentos
  resultado esperado: localizar itens, mostrar o que muda e confirmar
  status: obrigatorio na IA

- comando: `muda os lancamentos de hoje para a categoria Outros`
  intencao: editar categoria em lote
  resultado esperado: mostrar quantidade e aplicar so apos confirmacao
  status: obrigatorio na IA

## 4. Exclusao e Reparo

- comando: `apaga a entrada de pix de 2024`
  intencao: apagar item errado por data/contexto
  resultado esperado: localizar, mostrar impacto e confirmar antes de apagar
  status: obrigatorio na IA

- comando: `remove esses dois lancamentos errados`
  intencao: exclusao contextual a partir da conversa atual
  resultado esperado: usar o contexto do ultimo resultado ou rascunho
  status: obrigatorio na IA

- comando: `exclui as entradas duplicadas de hoje`
  intencao: exclusao em lote de possiveis duplicidades
  resultado esperado: localizar duplicados provaveis, explicar o criterio e pedir confirmacao
  status: obrigatorio na IA

## 5. Origens e Cadastros

- comando: `crie a conta banco Inter Lucas`
  intencao: criar origem
  resultado esperado: rascunho de origem com nome, tipo, instituicao e saldo inicial
  status: obrigatorio na IA

- comando: `altera cartao Inter Lucas para cartao credito Lucas`
  intencao: renomear origem
  resultado esperado: mostrar nome atual, novo nome e confirmar
  status: obrigatorio na IA

- comando: `quais origens temos?`
  intencao: listar origens ativas
  resultado esperado: resposta direta com os nomes das origens
  status: obrigatorio na IA

- comando: `deixa as contas apenas banco Inter Lucas e cartao de credito Lucas`
  intencao: manter apenas determinadas origens ativas
  resultado esperado: mostrar o que vai ficar e o que vai ser desativado
  status: obrigatorio na IA

## 6. Conciliacao com Extrato

- comando: `o saldo no banco esta diferente do sistema`
  intencao: iniciar conciliacao
  resultado esperado: comparar saldo inicial, entradas, despesas e saidas da conta
  status: obrigatorio na IA

- comando: `no meu banco esta faltando 4 reais`
  intencao: localizar divergencia de conciliacao
  resultado esperado: apontar o item exato ou o saldo inicial que explica a diferenca
  status: obrigatorio na IA

- comando: `veja no extrato porque essa saida aconteceu`
  intencao: cruzar lancamentos do sistema com contexto do extrato
  resultado esperado: explicar se foi despesa, transferencia, estorno ou saida da conta
  status: obrigatorio na IA

- comando: `conferir esse extrato da conta Inter`
  intencao: comparar extrato colado com os lancamentos da origem escolhida
  resultado esperado: mostrar o que ja bate, o que falta e permitir importar os faltantes
  status: obrigatorio na IA

## 7. Comandos que o Codex ja executou manualmente

Estes comandos ja foram executados manualmente no banco ou no sistema e devem virar capacidade nativa da IA:

- criar varios lancamentos em lote no mesmo dia
- ajustar saldo inicial da origem para bater com o extrato
- reclassificar lancamento como `Saida da conta`
- criar saida para poupanca
- corrigir datas salvas incorretamente
- remover lixos criados por interpretacao errada do assistente
- editar origem, meio, categoria e data de lancamentos

## 8. Proximo bloco obrigatorio de implementacao

Este catalogo so faz sentido se estas tools virarem realidade:

- `criar_lancamentos_em_lote`
- `editar_lancamentos`
- `apagar_lancamentos`
- `conciliar_com_extrato`
- `conciliar_saldo_em_conta`
- `conciliar_extrato_colado`
- `listar_maiores_entradas`
- `classificar_saida_da_conta`

## 9. Regra de manutencao deste arquivo

Sempre que o usuario disser algo como:

- `isso a IA tambem vai ter que conseguir fazer`
- `anota isso`
- `salva isso`
- `o Codex fez isso manualmente`

entao este arquivo deve ser atualizado.
