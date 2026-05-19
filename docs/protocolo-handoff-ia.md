# Protocolo de handoff entre IAs — LT CashFlow

Objetivo: permitir que ChatGPT, Gemini, Claude, Cursor ou outro agente continue o trabalho sem precisar reler conversas longas.

## Estratégia de economia de tokens

Usar três níveis de contexto:

1. **Contexto atual**
   - Arquivo: `docs/contexto-atual.md`
   - Tamanho ideal: curto, direto, atualizado.
   - Uso: primeira leitura obrigatória.

2. **Diário cronológico**
   - Arquivo: `docs/diario-desenvolvimento.md`
   - Uso: histórico das decisões, bugs, ajustes de dados e entregas.
   - Entrada mais recente sempre no topo.

3. **Documentos profundos**
   - Pasta: `docs/modelagem/**`, `docs/implementacao/**`, `docs/modelagem/architecture/**`
   - Uso: abrir apenas quando a tarefa exigir detalhes.

Dados pessoais sensíveis devem ir para `pessoal/`, ignorado pelo Git.

## Regra para iniciar qualquer sessão

Prompt recomendado:

```txt
Antes de responder ou alterar código, leia:
1. docs/contexto-atual.md
2. a entrada mais recente de docs/diario-desenvolvimento.md

Depois, abra apenas os arquivos necessários para a tarefa.
Ao terminar, atualize docs/contexto-atual.md se o estado atual mudou e registre uma entrada curta no diário se houve decisão, alteração relevante, ajuste de dados ou mudança de arquitetura.
```

## O que registrar no contexto atual

Registrar somente o que ajuda uma IA a continuar:

- prioridade técnica atual;
- arquivos relevantes;
- decisões abertas;
- estado de branches/commits quando importante;
- servidor local rodando, se relevante;
- mudanças locais não commitadas;
- riscos conhecidos;
- próximo passo recomendado.

Não registrar:

- conversa inteira;
- logs longos;
- código completo;
- dados bancários detalhados;
- segredos/env;
- outputs extensos de comandos.

## O que registrar no diário

Registrar quando houver:

- entrega de código;
- alteração em banco de dados;
- decisão de arquitetura;
- decisão financeira operacional;
- bug relevante descoberto;
- comportamento novo do produto;
- mudança de regra de negócio;
- comando de migração ou correção manual.

Formato recomendado:

```md
## AAAA-MM-DD — Título curto

### Contexto

Resumo do problema ou objetivo.

### O que foi feito

- Item 1.
- Item 2.

### Decisões

- Decisão tomada e motivo.

### Validação

- Comandos rodados ou motivo de não ter rodado.

### Próximos passos

- [ ] Item pendente.
```

## Como escrever para economizar tokens

Preferir:

- IDs e links de arquivo;
- listas curtas;
- decisões explícitas;
- “o que mudou” em vez de “tudo que conversamos”;
- datas absolutas.

Evitar:

- copiar trechos grandes de código;
- colar logs completos;
- repetir documentação existente;
- escrever contexto emocional da conversa;
- misturar planejamento pessoal sensível com docs versionados.

## Checklist de encerramento de sessão

Antes de finalizar uma sessão relevante:

- [ ] Atualizei `docs/contexto-atual.md` se algo mudou.
- [ ] Atualizei `docs/diario-desenvolvimento.md` se houve decisão ou entrega.
- [ ] Registrei comandos de validação, se rodei.
- [ ] Registrei pendências reais.
- [ ] Não gravei segredo, token, senha ou dado bancário sensível em docs versionados.

## Regra para outros agentes

Se você é uma IA continuando este projeto:

- Não presuma contexto de chat antigo.
- Confie primeiro nos arquivos de handoff.
- Se encontrar conflito entre conversa e documento, avise e confirme pelo código/banco.
- Não apague entradas antigas do diário.
- Adicione novas entradas no topo.
- Mantenha `docs/contexto-atual.md` curto.
