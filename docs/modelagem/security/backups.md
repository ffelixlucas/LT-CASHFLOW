# Backups

## Objetivo

Recuperação ante falha humana, bug de migração ou desastre de provedor.

## Estratégia alvo

- Snapshots automáticos do MySQL gerenciado com retenção definida por ambiente.
- Testes periódicos de restore em staging.

## Dados de arquivo

Extratos em object storage com versionamento quando aplicável (`docs/stack-padrao.md`).

## RPO/RTO

Definir oficialmente por estágio de empresa; documentar números quando stakeholders aprovarem.

## Responsabilidades

Runbooks em `docs/modelagem/ops/incidentes.md` (futuro).
