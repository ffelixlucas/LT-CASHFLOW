# LT CashFlow - Modelagem de Dados

Este documento congela a modelagem canonica do sistema para orientar a implementacao do backend, do frontend e das consultas SQL.

## Principios

- A entidade central do dominio e `gestoes`, nao `organizacoes`.
- `usuarios` e `gestoes` se relacionam em N:N por meio de `gestao_membros`.
- O filtro "Lucas / Taylaine / Conjunto / Todos" nao deve ser uma coluna fixa do banco.
- A participacao de cada pessoa em um lancamento e modelada por `lancamento_rateios`.
- Auditoria e obrigatoria desde a primeira versao funcional.

## Entidades

### usuarios

Representa login, perfil e identidade da pessoa no sistema.

Campos principais:
- `nome`
- `email`
- `senha_hash`
- `status`
- `ultimo_login_em`

### gestoes

Representa o espaco financeiro compartilhado ou individual. Pode ser pessoal, familiar, profissional ou de projeto.

Campos principais:
- `nome`
- `descricao`
- `tipo`
- `moeda_padrao`
- `fuso_horario`
- `criado_por_usuario_id`
- `status`

### gestao_membros

Relaciona usuarios a gestoes, definindo o papel de acesso.

Campos principais:
- `gestao_id`
- `usuario_id`
- `papel`
- `status`

Papeis previstos:
- `proprietario`
- `administrador`
- `editor`
- `visualizador`

### convites

Suporta compartilhamento de gestoes por token.

Campos principais:
- `gestao_id`
- `convidado_por_usuario_id`
- `usuario_convidado_id`
- `email_destino`
- `token`
- `papel_sugerido`
- `status`
- `expira_em`

### contas

Representa carteira, conta bancaria, cartao ou outro meio financeiro da gestao.

Campos principais:
- `gestao_id`
- `nome`
- `tipo`
- `instituicao`
- `saldo_inicial`
- `limite_credito`
- `fechamento_dia`
- `vencimento_dia`

Decisao de modelagem:
- `saldo_atual` nao e persistido. O saldo atual deve ser calculado a partir de `saldo_inicial` e dos `lancamentos` liquidados, evitando divergencia.

### categorias

Classificacao dos lancamentos, com suporte a hierarquia por `categoria_pai_id`.

Campos principais:
- `gestao_id`
- `nome`
- `natureza`
- `categoria_pai_id`
- `cor_hex`
- `icone`

### lancamentos

Entidade central de movimentacao financeira.

Campos principais:
- `gestao_id`
- `conta_id`
- `conta_destino_id`
- `categoria_id`
- `criado_por_usuario_id`
- `tipo`
- `status`
- `descricao`
- `valor_total`
- `competencia_data`
- `vencimento_data`
- `liquidado_em`

Tipos previstos:
- `receita`
- `despesa`
- `transferencia`
- `ajuste`

Regras:
- transferencia usa `conta_id` + `conta_destino_id` e nao usa `categoria_id`
- receita, despesa e ajuste exigem `categoria_id`
- `valor_total` deve ser maior que zero

### lancamento_rateios

Define quem participa de um lancamento e em qual valor ou percentual.

Campos principais:
- `lancamento_id`
- `usuario_id`
- `valor`
- `percentual`

Decisao de modelagem:
- O filtro "Conjunto" e derivado quando um lancamento possui mais de um participante em `lancamento_rateios`.
- O filtro por pessoa e derivado de `usuario_id` nessa tabela.

### metas

Representa objetivos financeiros por gestao, categoria ou conta.

Campos principais:
- `gestao_id`
- `categoria_id`
- `conta_id`
- `nome`
- `tipo`
- `periodicidade`
- `valor_alvo`
- `inicio_em`
- `fim_em`
- `status`

### notificacoes

Registra alertas in-app, email ou push para usuarios.

Campos principais:
- `usuario_id`
- `gestao_id`
- `tipo`
- `titulo`
- `mensagem`
- `canal`
- `status`
- `payload`

### auditoria

Rastreia qualquer acao relevante da aplicacao.

Campos principais:
- `usuario_id`
- `gestao_id`
- `acao`
- `modulo`
- `entidade`
- `entidade_id`
- `origem`
- `request_id`
- `detalhes`

## Relacionamentos

- `usuarios` 1:N `gestoes` por `criado_por_usuario_id`
- `usuarios` N:N `gestoes` por `gestao_membros`
- `gestoes` 1:N `convites`
- `gestoes` 1:N `contas`
- `gestoes` 1:N `categorias`
- `gestoes` 1:N `lancamentos`
- `lancamentos` N:N `usuarios` por `lancamento_rateios`
- `gestoes` 1:N `metas`
- `usuarios` 1:N `notificacoes`
- `usuarios` 1:N `auditoria`

## Invariantes de aplicacao

Estas regras devem ser garantidas pelo backend mesmo quando nao forem totalmente forcaseadas por constraint SQL:

- toda gestao deve ter ao menos um membro com papel `proprietario`
- o criador da gestao deve entrar em `gestao_membros` no ato da criacao
- todo lancamento nao cancelado e nao transferencia deve ter ao menos um `lancamento_rateio`
- a soma de `lancamento_rateios.valor` deve bater com `lancamentos.valor_total`
- os usuarios em `lancamento_rateios` devem ser membros da mesma gestao do lancamento
- contas e categorias usadas em um lancamento devem pertencer a mesma gestao do lancamento

## Ordem sugerida de implementacao

1. `usuarios` + autenticacao JWT
2. `gestoes` + `gestao_membros`
3. `convites`
4. `categorias` e `contas`
5. `lancamentos` + `lancamento_rateios`
6. `metas`
7. `notificacoes`
8. `auditoria` automatizada por modulo
