# Dashboards e agregações

## Princípio

Toda métrica em dashboard possui **definição escrita** neste arquivo ou link para `financial-engine.md`.

## Agregações atuais (exemplo conceitual)

- **Disponível:** soma de contas líquidas imediatas (carteira, corrente, caixa) após compromissos explícitos documentados.
- **Poupança / objetivos:** conforme bucket de contas.
- **Investimentos:** separados para não misturar liquidez curta.

## Performance

- Materializar views ou summaries apenas quando necessário; preferir queries indexadas com janelas claras.

## QA

Testes de regressão quando mudar bucketização (`apps/web` repository queries).
