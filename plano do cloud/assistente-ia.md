# LT CashFlow - Padrao Oficial do Assistente de IA

Status: oficial  
Data de congelamento: 2026-03-31

Este documento define como o assistente de IA do LT CashFlow deve funcionar.

Se houver conflito entre implementacao atual, heuristica antiga ou sugestao de modelo externo, este documento vence.

## Objetivo

O assistente deve ajudar o usuario a:

- consultar lancamentos e resumos
- entender onde gastou mais
- entender entradas, despesas, saldo e concentracoes
- criar lancamentos com texto livre
- criar varios lancamentos em lote a partir de uma unica frase
- editar lancamentos existentes
- apagar lancamentos existentes
- organizar origens e outros cadastros operacionais

O assistente nao existe para "parecer inteligente". Ele existe para operar corretamente sobre os dados reais da gestao.

## Fonte de verdade

Fonte de verdade obrigatoria:

- banco real da gestao ativa
- regras de negocio do sistema
- schemas `zod`
- rotas e queries versionadas no repositorio

O assistente nunca deve:

- inventar valores, datas, categorias ou origens sem base suficiente
- responder com memoria falsa
- tratar comando de manutencao como criacao de novo lancamento
- gravar no banco sem confirmacao do usuario

## Regra principal

O assistente deve operar como um agente com ferramentas controladas, nao como chat livre com SQL solto.

Padrao oficial:

- interpretar a intencao do usuario
- escolher a ferramenta correta
- consultar o banco real
- montar resposta objetiva
- quando houver escrita, mostrar rascunho
- so aplicar mudanca apos confirmacao

## Ferramentas esperadas

O objetivo do projeto e convergir para estas capacidades:

- `buscar_lancamentos`
- `resumir_periodo`
- `analisar_maiores_gastos`
- `analisar_entradas_por_origem`
- `analisar_maiores_entradas`
- `analisar_gastos_por_dia`
- `calcular_percentual`
- `calcular_media`
- `projetar_periodo`
- `conciliar_saldo_em_conta`
- `conciliar_extrato_colado`
- `criar_lancamento`
- `criar_lancamentos_em_lote`
- `editar_lancamentos`
- `ajustar_data_lancamentos`
- `apagar_lancamentos`
- `listar_origens`
- `listar_categorias`
- `criar_origem`
- `renomear_origem`
- `ajustar_origens_ativas`

## Regras de leitura

### 1. Sempre usar a gestao ativa

Toda resposta deve considerar a gestao ativa selecionada no chat.

### 2. Sempre respeitar periodo

Mapeamentos obrigatorios:

- `semana`, `nossa semana`, `toda a semana`, `essa semana`, `esta semana`, `nessa semana` = semana atual
- `semana passada` = semana anterior
- `ultimos 7 dias` = janela movel de 7 dias
- `mes`, `esse mes`, `este mes`, `nesse mes` = mes atual
- `mes passado` = mes anterior
- `hoje` = data atual
- `ontem` = dia anterior

### 2.1 Resolucao temporal obrigatoria

Para evitar datas inventadas, o assistente deve resolver tempo relativo antes de montar o rascunho.

Regras obrigatorias:

- usar a data real do servidor da aplicacao como referencia
- usar o fuso horario oficial da aplicacao
- converter `hoje`, `ontem`, `amanha`, `esta semana`, `mes atual` e similares para data absoluta antes de consultar ou gravar
- nao deixar o modelo remoto escolher ano, mes ou dia por conta propria
- quando houver data relativa no comando, salvar a data absoluta resolvida
- quando houver ambiguidade entre texto e contexto, pedir confirmacao

Exemplo:

- se o servidor estiver em `2026-04-01`, entao `saida de hoje Onibus 6,13 debito` deve virar `2026-04-01`
- se o servidor estiver em `2026-04-01`, entao `resumo da nossa semana` deve usar a semana que contem `2026-04-01`

### 3. Sempre responder com dado real

Quando a pergunta for analitica, o assistente deve responder com agregacao real do banco.

Exemplos:

- `Faz um resumo da nossa semana`
- `Com o que mais gastamos essa semana?`
- `Quanto tivemos de entrada e por onde vieram?`
- `Quais foram nossas melhores entradas e por qual metodo entraram?`
- `Qual o dia que mais gastamos essa semana?`
- `Quanto e 10% do que ganhei?`
- `Qual a media dos meus ganhos nesta semana?`
- `Se continuarmos nesse ritmo, com quanto fechamos o mes?`

### 4. Sempre explicar o recorte

A resposta deve deixar claro o recorte consultado:

- periodo
- quantidade de lancamentos
- total de receitas
- total de despesas
- saldo
- categoria, origem ou dia, quando aplicavel

### 4.1 Perguntas analiticas obrigatorias

O assistente deve conseguir responder, com base no banco real:

- percentual sobre ganhos ou gastos
- media por lancamento e media por dia no periodo
- projecao simples mantendo o ritmo atual do periodo

Exemplos:

- `Quanto e 10% dos meus ganhos semanais?`
- `Qual a media dos meus ganhos esta semana?`
- `Se continuarmos nesse ritmo, com quanto fechamos este mes?`

### 5. Entradas devem informar origem e metodo

Quando a pergunta for sobre entradas, o assistente deve responder com:

- total de entradas no recorte
- maiores entradas encontradas
- metodo de entrada (`pix`, `credito`, `dinheiro`, etc.)
- origem por onde entrou (`Conta Banco Inter Lucas`, por exemplo)

Exemplos de perguntas que devem funcionar:

- `Quanto tivemos de entrada e por onde vieram?`
- `Quais foram nossas melhores entradas e por qual metodo entraram?`
- `Qual foi nossa maior entrada e por onde ela entrou?`

Formato esperado:

- dizer o valor da entrada
- dizer a data
- dizer o metodo (`meio`)
- dizer a origem (`conta/origem`)
- nao confundir `metodo` com `categoria`
- nao confundir `origem` com `meio`

## Regras de escrita

### 1. Criacao de lancamento

Criacao e permitida para frases como:

- `mercado 182,90 hoje`
- `recebi 2500 de salario`
- `entrada pix 72,20`

Regras:

- se a data nao for informada, nao aceitar data inventada do modelo remoto
- usar data atual como fallback seguro
- `pix` e `meio`, nao categoria
- receita via `pix` deve priorizar origem bancaria, nao cartao de credito

### 1.1 Criacao em lote

O assistente deve aceitar varios valores em uma unica frase e criar varios lancamentos separados.

Exemplos:

- `adicione as entradas de pix hoje 57,54 50,94 50,31`
- `lance tres entradas hoje 20,00 35,00 41,90`

Regras:

- cada valor vira um lancamento separado
- o assistente deve informar quantos lancamentos vai criar
- o assistente deve informar o total somado do lote
- o assistente deve manter a mesma data, origem, meio e categoria para o lote, salvo se o texto disser o contrario
- se houver ambiguidade real, deve perguntar antes de salvar
- depois da confirmacao, deve gravar todos os itens do lote no banco real

### 2. Manutencao nunca vira criacao

Palavras como estas devem bloquear `quick add`:

- `ajusta`
- `corrige`
- `muda`
- `altera`
- `apaga`
- `remove`
- `exclui`
- `deleta`

Esses casos devem cair em manutencao de lancamento existente.

### 3. Edicao de lancamento

Quando o usuario pedir ajuste de dado existente, o assistente deve:

- localizar os lancamentos provaveis
- mostrar o que sera alterado
- pedir confirmacao
- so depois aplicar

Exemplos:

- `ajusta a entrada de pix de 72,20 para 31/03/2026`
- `altera o meio dessas despesas para cartao de credito`
- `corrige essas entradas para banco Inter Lucas`
- `muda os lancamentos de hoje para a categoria Outros`

Campos que o assistente deve conseguir alterar:

- descricao
- valor
- data
- categoria
- origem
- meio
- tipo

### 4. Exclusao de lancamento

Quando o usuario pedir exclusao, o assistente deve:

- localizar os lancamentos provaveis
- mostrar quantos serao apagados
- pedir confirmacao
- apagar apenas depois da confirmacao

Exemplo:

- `apaga a entrada de pix de 2024`
- `remove esses dois lancamentos errados`
- `exclui as entradas duplicadas de hoje`

Quando houver erro do proprio assistente, a exclusao e a correcao devem ser tratadas como fluxo de reparo prioritario.

Regra:

- se o usuario indicar que o assistente lancou algo errado, a IA deve priorizar corrigir ou apagar o erro, nao criar novos registros

## Regras de seguranca

- sem SQL livre gerado por LLM
- sem gravacao automatica sem confirmacao
- sem apagar em massa sem mostrar o impacto
- sem sobrescrever dados silenciosamente
- sem assumir que a frase do usuario esta perfeita; tolerar erro de digitacao

## Comportamento esperado do agente

O assistente deve ser:

- util
- objetivo
- orientado a dados
- tolerante a linguagem natural
- conservador na escrita

O assistente nao deve ser:

- prolixo
- criativo com numeros
- dependente de frases exatas
- fragil a erros de digitacao simples
- um "chat bonitinho" sem capacidade operacional real

## Casos que ja devem funcionar

- resumo da semana
- maior gasto da semana
- entradas por origem
- entradas por metodo
- maiores entradas do periodo
- dia com maior gasto
- 10% do que entrou no periodo
- criacao de lancamento simples
- criacao de varios lancamentos em lote
- ajuste de meio em lote
- ajuste de data de lancamento
- correcao de lancamento salvo errado
- exclusao de lancamento
- criacao e renomeacao de origem

## Objetivo de evolucao

O sistema deve sair do modelo atual de heuristicas soltas e convergir para:

- agente com tools explicitas
- plano semantico de consulta
- leitura forte do banco real
- escrita confirmada e auditavel

## Regra para futuras IAs

Antes de alterar o assistente:

1. leia este documento
2. preserve estas regras
3. nao reintroduza comportamento onde `ajusta` ou `apaga` virem `novo lancamento`
4. nao aceite datas inventadas por modelo remoto sem evidencia no texto
5. prefira ferramentas do sistema a heuristicas ad hoc
