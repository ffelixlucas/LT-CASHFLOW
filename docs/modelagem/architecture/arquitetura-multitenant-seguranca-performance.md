# Arquitetura multitenant, segurança e performance

## Contexto

O LT CashFlow é um sistema financeiro pessoal/familiar em Next.js, com banco MySQL no Railway, autenticação por usuário e modelo de `gestao` como unidade lógica de dados. Hoje o produto já trabalha com o conceito de múltiplas gestões: cada usuário pode ter uma ou mais gestões, e uma gestão pode ter membros com papéis diferentes.

O objetivo desta arquitetura é permitir uso multitenant com isolamento forte de dados, sem transformar o produto em um SaaS aberto sem controle. A regra de negócio desejada é:

- O tenant principal é a `gestao`.
- Usuários só compartilham dados quando estiverem no mesmo grupo/gestão familiar.
- Uma gestão familiar pode ter vários membros autorizados.
- Usuários fora da gestão nunca podem ler, editar, inferir ou apagar dados daquela gestão.
- Dados financeiros são tratados como sensíveis por padrão.

Este documento serve como planejamento para revisão técnica por outros assistentes, Cloud/Gemini ou revisão humana.

## Estado atual observado

Pontos positivos já existentes:

- Existem tabelas de `usuarios`, `gestoes` e `gestao_membros`.
- As tabelas financeiras principais já usam `gestao_id`, como contas, categorias, lançamentos, gastos fixos e faturas.
- Há papéis de acesso: `proprietario`, `administrador`, `editor` e `visualizador`.
- Muitas rotas e server actions já verificam acesso com `userHasGestaoAccess` ou `userCanMutateGestao`.
- A UI normalmente escolhe a gestão ativa a partir das gestões do usuário.
- O pool MySQL já é reutilizado em desenvolvimento via `globalThis` e usa `mysql2/promise`.

Pontos que precisam endurecimento antes de chamar de multitenant seguro:

- Algumas mutations checam se o usuário pode mexer na `gestao_id`, mas ainda precisam validar todos os IDs filhos recebidos no formulário/API.
- Exemplo de IDs filhos: `conta_id`, `conta_destino_id`, `categoria_id`, `lancamento_id`, `gasto_fixo_id`, `fatura_id`.
- O banco não tem Row Level Security nativo como PostgreSQL; portanto o isolamento depende da aplicação, constraints e queries bem feitas.
- Ainda falta uma suíte de testes focada em IDOR: usuário A tentando acessar dados da gestão B.
- Algumas agregações financeiras são pesadas e podem virar gargalo conforme o volume de lançamentos cresce.

## Modelo de tenancy

### Tenant lógico

A tabela `gestoes` deve ser a fronteira de tenant.

Cada registro sensível precisa pertencer direta ou indiretamente a uma gestão:

- `contas.gestao_id`
- `categorias.gestao_id`
- `lancamentos.gestao_id`
- `gastos_fixos.gestao_id`
- `faturas.gestao_id`
- `metas.gestao_id`
- `fechamentos_semanais.gestao_id`
- `auditoria.gestao_id`
- `convites.gestao_id`

Quando uma tabela não tiver `gestao_id` direto, ela deve ser acessada apenas por join com uma tabela que tenha `gestao_id`.

### Compartilhamento familiar

O compartilhamento deve acontecer apenas por associação explícita em `gestao_membros`.

Regras:

- Um usuário pode ter uma gestão pessoal própria.
- Uma família deve ser uma gestão do tipo `familiar`.
- Para ver ou editar dados familiares, o usuário precisa estar em `gestao_membros` com `status = 'ativo'`.
- Convite pendente não dá acesso.
- Usuário removido ou inativo perde acesso imediatamente.

Papéis recomendados:

- `proprietario`: controle total, membros, configuração e exclusões críticas.
- `administrador`: controle operacional, membros exceto transferir propriedade.
- `editor`: pode criar, editar e conciliar lançamentos.
- `visualizador`: apenas leitura, sem exportar dados sensíveis por padrão se houver risco de compartilhamento externo.

## Regra de ouro de segurança

Nenhuma query sensível pode confiar apenas em ID enviado pelo cliente.

Sempre validar:

1. Usuário autenticado.
2. Usuário pertence à gestão.
3. Papel permite a operação.
4. O registro alvo pertence à mesma gestão.
5. Todos os IDs relacionados pertencem à mesma gestão.

Exemplo conceitual:

```ts
await assertCanMutateGestao(user.id, gestaoId);
await assertContaInGestao(contaId, gestaoId);
await assertCategoriaInGestao(categoriaId, gestaoId);
await assertLancamentoInGestao(lancamentoId, gestaoId);
```

Para transfers:

```ts
await assertContaInGestao(contaOrigemId, gestaoId);
await assertContaInGestao(contaDestinoId, gestaoId);
```

Para cartão:

```ts
await assertContaInGestao(contaCartaoId, gestaoId);
await assertContaTipo(contaCartaoId, "cartao_credito");
```

## Camadas propostas

### 1. Auth

Responsabilidade:

- Identificar o usuário.
- Garantir sessão válida.
- Nunca decidir acesso financeiro sozinha.

Funções:

- `requireUser()`
- `getSessionUser()`

### 2. Autorização

Responsabilidade:

- Resolver membership.
- Resolver papel.
- Bloquear leitura/mutação fora da gestão.

Funções recomendadas:

```ts
assertCanReadGestao(userId, gestaoId)
assertCanMutateGestao(userId, gestaoId)
assertCanAdminGestao(userId, gestaoId)
assertContaInGestao(contaId, gestaoId)
assertCategoriaInGestao(categoriaId, gestaoId)
assertLancamentoInGestao(lancamentoId, gestaoId)
assertGastoFixoInGestao(gastoFixoId, gestaoId)
assertFaturaInGestao(faturaId, gestaoId)
assertFinancialRefsInGestao({ gestaoId, contaId, categoriaId, contaDestinoId })
```

Padrão desejado:

- Server actions chamam autorização de alto nível.
- Repositories também garantem `WHERE gestao_id = ?`.
- Services validam consistência de IDs relacionados.

Evitar helper genérico com nome de entidade/tabela dinâmico, como `assertEntityInGestao(entity, id, gestaoId)`. Esse padrão incentiva interpolação de tabela em SQL e vira armadilha de SQL injection se algum dia receber input externo. Preferir funções tipadas por entidade, com SQL fixo e parâmetros.

As validações de membership também precisam considerar o ciclo de vida da gestão:

- gestão ativa permite leitura e mutação conforme papel;
- gestão arquivada/inativa deve bloquear mutação;
- gestão excluída logicamente não deve aparecer em listagens nem permitir acesso;
- membro ativo em gestão inativa não deve ser suficiente para acessar dados.

### 3. Services

Responsabilidade:

- Regras financeiras.
- Orquestração de transações.
- Validação de consistência entre conta, categoria, fatura e lançamento.

Exemplos:

- `LancamentoService.create`
- `LancamentoService.update`
- `CartaoService.createParcela`
- `FechamentoSemanalService.fechar`
- `ConciliacaoService.importar`

### 4. Repository

Responsabilidade:

- SQL parametrizado.
- Queries sempre escopadas por `gestao_id`.
- Nenhuma regra de permissão baseada em sessão.

Regra:

```sql
UPDATE lancamentos
SET ...
WHERE id = ?
  AND gestao_id = ?
```

Evitar:

```sql
UPDATE lancamentos
SET ...
WHERE id = ?
```

Para dados financeiros, hard delete deve ser exceção. A política recomendada é soft delete em entidades sensíveis:

- `lancamentos.deletado_em`;
- `lancamentos.deletado_por_usuario_id`;
- `gastos_fixos.deletado_em`;
- `contas.ativa = 0` para contas descontinuadas.

Hard delete pode continuar existindo para dados temporários, rascunhos, tokens expirados e correções administrativas controladas. Para lançamentos já usados em fechamento, conciliação ou fatura, soft delete preserva auditoria e reduz risco de inconsistência histórica.

## Proteção contra IDOR

IDOR é o principal risco deste sistema.

Ataque típico:

1. Usuário logado na própria gestão.
2. Intercepta request no navegador.
3. Troca `lancamentoId`, `contaId` ou `gestaoId`.
4. Tenta ler ou alterar dados de outra gestão.

Defesa:

- Nunca aceitar `gestaoId` do cliente como suficiente.
- Toda mutation precisa cruzar `user_id + gestao_id + entity_id`.
- Todo ID filho precisa ser validado contra `gestao_id`.
- Deletes devem usar `DELETE ... WHERE id IN (...) AND gestao_id = ?`.
- Updates devem usar `UPDATE ... WHERE id = ? AND gestao_id = ?`.
- Reads devem usar `WHERE gestao_id = ?` e não apenas `WHERE id = ?`.

## Banco de dados

### Constraints recomendadas

Toda tabela filha deve ter foreign key para `gestoes(id)`.

Exemplos:

```sql
ALTER TABLE contas
  ADD CONSTRAINT fk_contas_gestao
  FOREIGN KEY (gestao_id) REFERENCES gestoes(id);

ALTER TABLE categorias
  ADD CONSTRAINT fk_categorias_gestao
  FOREIGN KEY (gestao_id) REFERENCES gestoes(id);

ALTER TABLE lancamentos
  ADD CONSTRAINT fk_lancamentos_gestao
  FOREIGN KEY (gestao_id) REFERENCES gestoes(id);
```

Para garantir que conta/categoria usadas em lançamento pertencem à mesma gestão, MySQL não resolve isso perfeitamente com FK simples se a FK for apenas `id`. O caminho recomendado é:

- Validar na camada service antes de inserir/atualizar.
- Adicionar índices compostos `(gestao_id, id)` nas tabelas referenciadas.
- Criar testes automatizados de isolamento.
- Opcional avançado: usar constraints compostas se a modelagem for ajustada para FKs compostas.

### Índices recomendados

O sistema é dominado por consultas por gestão, período, conta, cartão e categoria. Índices devem acompanhar esse padrão.

Base de membership:

```sql
CREATE INDEX idx_gestao_membros_usuario_status
  ON gestao_membros (usuario_id, status, gestao_id);

CREATE INDEX idx_gestao_membros_gestao_status
  ON gestao_membros (gestao_id, status, usuario_id);
```

Contas e categorias:

```sql
CREATE INDEX idx_contas_gestao_tipo_ativa
  ON contas (gestao_id, tipo, ativa);

CREATE INDEX idx_categorias_gestao_natureza
  ON categorias (gestao_id, natureza);
```

Lançamentos por extrato e dashboard:

```sql
CREATE INDEX idx_lancamentos_gestao_competencia_status
  ON lancamentos (gestao_id, competencia_data, status);

CREATE INDEX idx_lancamentos_gestao_conta_competencia
  ON lancamentos (gestao_id, conta_id, competencia_data);

CREATE INDEX idx_lancamentos_gestao_categoria_competencia
  ON lancamentos (gestao_id, categoria_id, competencia_data);

CREATE INDEX idx_lancamentos_gestao_tipo_meio_competencia
  ON lancamentos (gestao_id, tipo, meio, competencia_data);
```

Cartão/fatura:

```sql
CREATE INDEX idx_lancamentos_gestao_fatura_conta
  ON lancamentos (gestao_id, fatura_competencia_data, conta_id, status);

CREATE INDEX idx_lancamentos_gestao_meio_fatura
  ON lancamentos (gestao_id, meio, fatura_competencia_data);
```

Busca e conciliação:

```sql
CREATE INDEX idx_lancamentos_gestao_valor_data
  ON lancamentos (gestao_id, valor_total, competencia_data);

CREATE INDEX idx_lancamentos_gestao_descricao_data
  ON lancamentos (gestao_id, competencia_data, descricao(80));
```

Observação sobre busca textual:

- Índice de prefixo em `descricao(80)` ajuda em filtros por prefixo e listagens por período.
- Ele não resolve bem buscas por substring, como `LIKE '%mercado%'`.
- Se busca textual virar recurso central, avaliar `FULLTEXT INDEX` em `descricao`, mantendo filtro por `gestao_id` e medindo com `EXPLAIN`.
- Para busca semântica/IA, embeddings devem sempre carregar `gestao_id` no metadado e filtrar por tenant antes de devolver resultados.

Gastos fixos:

```sql
CREATE INDEX idx_gastos_fixos_gestao_status
  ON gastos_fixos (gestao_id, status);

CREATE INDEX idx_gastos_fixos_gestao_conta_categoria
  ON gastos_fixos (gestao_id, conta_id, categoria_id);
```

Auditoria:

```sql
CREATE INDEX idx_auditoria_gestao_criado
  ON auditoria (gestao_id, criado_em);

CREATE INDEX idx_auditoria_usuario_criado
  ON auditoria (usuario_id, criado_em);
```

Antes de aplicar índices, rodar `EXPLAIN` nas consultas reais mais usadas. Índice demais também degrada escrita.

## Estratégia para reduzir gargalos de consulta

### Problema esperado

Dashboards financeiros tendem a repetir agregações caras:

- saldo atual por conta;
- entrada/saída do mês;
- cartão a fechar;
- despesas por categoria;
- fechamento semanal;
- reservas;
- patrimônio líquido.

Se cada card fizer uma query separada, a tela vira um conjunto de 10 a 30 queries por request.

### Estratégia recomendada

1. Criar queries agregadoras por tela.
2. Consolidar dados do dashboard em uma função única.
3. Usar CTEs ou subqueries para calcular blocos relacionados em uma rodada.
4. Evitar N+1 queries em listas de lançamentos, categorias, contas e rateios.
5. Medir cada query com logs de duração em desenvolvimento e produção.

Exemplo de service:

```ts
getDashboardSnapshot({ gestaoId, periodo })
```

Retorna:

- liquidez;
- reservas;
- fatura aberta;
- patrimônio líquido;
- entradas/saídas do período;
- top categorias;
- alertas.

Isso substitui várias chamadas soltas.

## Pool de conexões

Estado atual:

```ts
mysql.createPool({
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
})
```

Recomendação:

- Manter pool compartilhado por processo.
- Configurar limites por ambiente.
- Evitar abrir conexão manual sem `finally connection.release()`.
- Toda transação deve usar `try/catch/finally`.
- Monitorar saturação do pool.

Configuração proposta:

```ts
const connectionLimit = Number(process.env.DB_POOL_CONNECTION_LIMIT ?? 10);
const queueLimit = Number(process.env.DB_POOL_QUEUE_LIMIT ?? 50);

mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit,
  queueLimit,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: "Z",
});
```

Para Railway/ambiente pequeno:

- Desenvolvimento: `connectionLimit = 5`
- Produção pequena: `connectionLimit = 10`
- Produção com concorrência maior: subir com métrica, não no chute.

Métricas desejadas:

- tempo médio de query;
- queries acima de 500ms;
- número de conexões ativas;
- erros de timeout;
- fila do pool;
- endpoint mais caro.

Alerta sobre `queueLimit`:

- `queueLimit = 0` no `mysql2` significa fila ilimitada. Isso reduz erro imediato, mas pode esconder saturação e aumentar latência.
- `queueLimit = 50` falha mais cedo em picos, o que é saudável se houver log, alerta e mensagem controlada.
- A decisão recomendada é usar fila finita em produção, com timeout e log explícito quando houver saturação.
- Se não houver observabilidade ainda, manter `queueLimit = 0` temporariamente pode ser menos disruptivo, mas precisa entrar no backlog de performance.

Também é recomendado configurar timeout de aquisição/query conforme suporte da lib e infraestrutura, para evitar requests pendurados quando o banco saturar.

## Cache

Cache precisa respeitar isolamento por gestão. Nunca usar chave global sem `gestaoId`.

### O que pode cachear

Dados quase estáticos:

- contas da gestão;
- categorias da gestão;
- membros da gestão;
- configuração da gestão;
- plano de gastos fixos.

Agregados curtos:

- snapshot do dashboard;
- resumo mensal;
- resumo semanal;
- saldo por conta;
- cartão por fatura.

### O que não deve cachear sem muito cuidado

- resultado de assistente financeiro com dados sensíveis;
- extrato recém-importado;
- operações de conciliação;
- telas logo após lançamento, edição ou exclusão;
- dados cujo erro cause decisão financeira errada.

### Chaves de cache

Formato recomendado:

```txt
ltcf:v1:gestao:{gestaoId}:dashboard:{periodo}
ltcf:v1:gestao:{gestaoId}:contas
ltcf:v1:gestao:{gestaoId}:categorias
ltcf:v1:gestao:{gestaoId}:cartao:{contaId}:{faturaMes}
ltcf:v1:gestao:{gestaoId}:semana:{inicio}:{fim}
```

Nunca:

```txt
dashboard:maio
cartao:julho
categorias
```

### TTL sugerido

- Contas/categorias/configuração: 5 a 30 minutos, invalidando em mutation.
- Dashboard: 30 a 120 segundos.
- Semana/mês: 60 a 300 segundos.
- Fatura do cartão: 30 a 120 segundos.
- Relatórios fechados/snapshots imutáveis: cache longo.

### Invalidação

Após criar, editar ou excluir lançamento:

- invalidar dashboard da gestão;
- invalidar mês da competência;
- invalidar semana da competência;
- invalidar fatura se `meio = credito` ou conta cartão;
- invalidar saldo de contas origem/destino.

Após alterar conta:

- invalidar contas;
- invalidar dashboard;
- invalidar cartão se for conta de crédito.

Após alterar categoria:

- invalidar categorias;
- invalidar agregados por categoria.

Invalidação precisa ser aguardada antes da resposta da mutation quando o dado afeta decisão financeira. Evitar invalidação fire-and-forget para dashboard, fatura, extrato, reservas e fechamento, porque uma instância pode servir cache velho logo após uma alteração.

Em múltiplas instâncias, a invalidação deve ser distribuída por cache centralizado, como Redis/Upstash, ou por tags de cache consistentes no runtime usado. Cache local em memória só é aceitável para deduplicar trabalho dentro do mesmo processo/request, não como fonte de verdade cross-instance.

### Implementação incremental

Fase 1: cache em memória por request/processo apenas para evitar chamadas repetidas no mesmo render.

Fase 2: usar `unstable_cache`/cache do Next para dados de baixa volatilidade, sempre com chave por `gestaoId`.

Fase 3: Redis/Upstash se houver múltiplas instâncias, necessidade de invalidação distribuída ou dashboards pesados.

## Observabilidade

Adicionar logs estruturados sem vazar dados sensíveis.

Eventos importantes:

- acesso negado por gestão;
- leitura negada por gestão;
- tentativa de usar ID de outra gestão;
- criação/edição/exclusão de lançamento;
- importação de extrato;
- fechamento semanal;
- pagamento de fatura;
- query lenta;
- erro de pool/conexão.

Formato recomendado:

```json
{
  "event": "financial.mutation.denied",
  "userId": 123,
  "gestaoId": 2,
  "entity": "lancamento",
  "entityId": 999,
  "reason": "entity_not_in_gestao"
}
```

Não logar:

- senha;
- token;
- extrato completo;
- descrição completa de transações sensíveis em produção;
- dados de terceiros sem máscara.

Rate limiting deve ser aplicado em rotas sensíveis para reduzir enumeração e abuso:

- login;
- convite/aceite de convite;
- APIs do assistente IA;
- busca de lançamentos;
- importação de extrato;
- mutations financeiras.

Mesmo quando o IDOR está bloqueado, muitas tentativas negadas em sequência devem gerar evento de segurança.

## Testes obrigatórios

### Testes de isolamento

Cenários mínimos:

1. Usuário A não lista gestão B.
2. Usuário A não abre dashboard da gestão B.
3. Usuário A não cria lançamento na gestão B.
4. Usuário A não edita lançamento da gestão B.
5. Usuário A não deleta lançamento da gestão B.
6. Usuário A não usa `contaId` da gestão B dentro da gestão A.
7. Usuário A não usa `categoriaId` da gestão B dentro da gestão A.
8. Usuário visualizador não cria/edita/deleta.
9. Editor não altera membros.
10. Administrador não remove proprietário único.
11. Assistente IA não lista, resume, busca, cria, edita ou exclui dados de gestão fora do usuário.
12. Quick-add não salva lançamento usando conta/categoria de outra gestão.
13. Conciliação/importação não busca candidatos nem grava lançamentos em outra gestão.
14. Busca textual/semântica não retorna resultado de outra gestão.
15. Convite expirado, cancelado ou já usado não concede acesso.

### Testes de performance

Cenários:

- dashboard com 10 mil lançamentos;
- extrato mensal com 5 mil lançamentos;
- fatura com 500 lançamentos;
- busca por descrição/valor/data;
- fechamento semanal em gestão com anos de histórico.

Meta inicial:

- dashboard principal abaixo de 500ms no banco em dataset médio;
- queries individuais críticas abaixo de 150ms;
- nenhuma tela com N+1 óbvio.

## Plano de implementação

### Fase 1: Hardening de isolamento

Objetivo: impedir vazamento ou mutação entre gestões.

Tarefas:

- Criar helpers `assertCanReadGestao`, `assertCanMutateGestao`, `assertRefsInGestao`.
- Revisar todas as server actions e APIs.
- Garantir que todo update/delete usa `gestao_id`.
- Garantir que create/update valida `contaId`, `categoriaId`, `contaDestinoId`.
- Revisar assistente IA, quick-add e conciliação.
- Criar testes de IDOR.
- Implementar expiração obrigatória de convites.
- Bloquear aceite de convite expirado, cancelado ou reutilizado.
- Logar leituras negadas e mutações negadas.
- Definir política inicial de soft delete para lançamentos financeiros.

Critério de aceite:

- Um usuário malicioso não consegue operar nenhum ID fora da gestão dele.
- Visualizador não consegue mutar.
- Testes automatizados cobrem os cenários críticos.
- Convites não ficam válidos indefinidamente.

### Fase 2: Índices e EXPLAIN

Objetivo: reduzir gargalos do banco.

Tarefas:

- Mapear top 10 queries mais usadas.
- Rodar `EXPLAIN` nelas.
- Aplicar índices compostos necessários.
- Remover índices redundantes se aparecerem.
- Medir antes/depois.

Critério de aceite:

- Queries principais usam índices por `gestao_id + período`.
- Dashboard e fatura não fazem full scan relevante.

### Fase 3: Pool e resiliência

Objetivo: evitar esgotamento de conexões.

Tarefas:

- Parametrizar `DB_POOL_CONNECTION_LIMIT` e `DB_POOL_QUEUE_LIMIT`.
- Adicionar keep-alive.
- Padronizar transações.
- Logar query lenta e erros de pool.

Critério de aceite:

- Pool configurável por ambiente.
- Nenhuma transação deixa conexão presa.

### Fase 4: Cache seguro por tenant

Objetivo: acelerar leituras sem misturar dados.

Tarefas:

- Criar util de cache com chave obrigatória por `gestaoId`.
- Cachear contas/categorias/configuração.
- Cachear snapshots de dashboard com TTL curto.
- Invalidar cache nas mutations financeiras.
- Avaliar Redis apenas se houver múltiplas instâncias ou necessidade real.

Critério de aceite:

- Nenhuma chave de cache sem `gestaoId`.
- Mutations atualizam a tela sem dado velho perigoso.
- Cache reduz queries repetidas sem confundir decisões financeiras.

### Fase 5: Governança familiar

Objetivo: deixar claro quando dados são pessoais ou compartilhados.

Tarefas:

- Tela de membros da gestão familiar.
- Registro de quem fez cada alteração.
- Auditoria consultável por proprietário/admin.
- Aviso visual quando a gestão ativa é compartilhada.

Critério de aceite:

- Usuário entende se está mexendo na gestão pessoal ou familiar.
- Proprietário consegue auditar alterações relevantes.

## Decisão recomendada

O LT CashFlow deve seguir como multitenant por `gestao`, com compartilhamento explícito por `gestao_membros`.

Não recomendo criar bancos separados por família neste momento. Para o estágio atual, um banco compartilhado com `gestao_id`, boas constraints, autorização forte, testes de IDOR, índices corretos e cache por tenant é mais simples, barato e suficiente.

Separar banco por tenant só faria sentido se o produto virasse B2B, tivesse requisitos contratuais fortes, volume muito alto por tenant ou necessidade de isolamento operacional extremo.

## Resumo para revisão externa

Queremos validar uma arquitetura multitenant para um sistema financeiro familiar chamado LT CashFlow. A unidade de isolamento é `gestao`. Usuários só compartilham dados quando são membros ativos da mesma gestão familiar. O banco é MySQL, a aplicação é Next.js, e o isolamento será feito por aplicação + `gestao_id` em todas as queries.

Pedir revisão principalmente sobre:

- risco de IDOR;
- validação de IDs filhos dentro da mesma gestão;
- índices compostos para dashboards financeiros;
- estratégia de pool MySQL em Railway;
- cache seguro por tenant;
- limites dessa abordagem em comparação com banco/schema por tenant.
