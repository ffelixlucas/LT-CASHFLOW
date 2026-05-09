# Logs e tracing

## Logs estruturados

Campos mínimos: `timestamp`, `level`, `requestId`, `userId` hash opcional, `gestaoId` quando aplicável, `feature`, `message`, `error.code`.

## Correlação

Propagar `requestId` entre server action / route handler e chamadas SQL externas quando possível.

## Alertas

Erros 5xx, falhas de importação massivas, latência p95 de endpoints críticos.

## Retenção

Balancear custo vs debugging financeiro; máscaras obrigatórias em dev/staging.
