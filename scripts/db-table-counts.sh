#!/usr/bin/env bash
# Contagens das tabelas principais. Uso: source .env; bash scripts/db-table-counts.sh
set -euo pipefail

TABLES=(
  usuarios
  gestoes
  categorias
  contas
  gastos_fixos
  fechamentos_periodo
  lancamentos
  lancamento_rateios
  auditoria
)

: "${DB_HOST:?DB_HOST}"
: "${DB_PORT:?DB_PORT}"
: "${DB_USER:?DB_USER}"
: "${DB_PASSWORD:?DB_PASSWORD}"
: "${DB_NAME:?DB_NAME}"

echo "host=${DB_HOST} db=${DB_NAME}"
for t in "${TABLES[@]}"; do
  c=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SELECT COUNT(*) FROM \`${t}\`" 2>/dev/null || echo "ERR")
  printf "%-22s %s\n" "$t" "$c"
done
