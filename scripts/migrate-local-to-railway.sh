#!/usr/bin/env bash
# Importa dump local no banco apontado por apps/web/.env.local (deve ser Railway).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="${1:-}"

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Uso: bash scripts/migrate-local-to-railway.sh /tmp/lt_cashflow_local_before_railway.sql"
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/apps/web/.env.local"

if [[ "$DB_HOST" == "localhost" || "$DB_HOST" == "127.0.0.1" ]]; then
  echo "DB_HOST ainda e local. Rode antes: bash scripts/use-railway-db.sh"
  exit 1
fi

read -r -p "Importar $DUMP em ${DB_HOST}/${DB_NAME}? [y/N] " ans
if [[ "${ans,,}" != "y" ]]; then
  echo "Cancelado."
  exit 0
fi

mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <"$DUMP"
cd "$ROOT" && pnpm db:check
