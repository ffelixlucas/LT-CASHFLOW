# Estratégia de IA

## Posicionamento

IA como **copiloto**, não piloto: sugere, explica, prepara lançamentos — **confirmação humana** para efeitos financeiros.

## Camadas

1. **NL → intenção estruturada** (classificação segura de comandos).
2. **Intenção → plano de ferramentas** (consultas e mutações permitidas).
3. **Plano → execução audível** com logs (`docs/modelagem/observability/logs-e-tracing.md`).

## Guardrails

- Não inventar saldo ou movimentos não encontrados no DB.
- Escopo máximo por sessão e por gestão.
- Rate limit e custo monitorados.

## Roadmap IA

- Sugestão de categorização com feedback implícito/explícito.
- Alertas explicáveis (“por que achamos que é duplicado”).
- Modo planejamento: simulações com rollback.

## Privacidade

Minimizar dados enviados a provedores; política detalhada em `docs/modelagem/security/seguranca-dados.md`.
