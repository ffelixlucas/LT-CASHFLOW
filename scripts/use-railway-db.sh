#!/usr/bin/env bash
# Carrega variaveis do MySQL no Railway e grava em apps/web/.env.local
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VARS_FILE="$(mktemp)"

cleanup() {
  rm -f "$VARS_FILE"
}
trap cleanup EXIT

# Caminho 1: variaveis ja exportadas no shell (painel Railway → Connect)
if [[ -n "${DB_HOST:-}" && "${DB_HOST}" != "localhost" && "${DB_HOST}" != "127.0.0.1" ]] \
  || [[ -n "${MYSQLHOST:-}" ]] \
  || [[ -n "${MYSQL_PUBLIC_URL:-}" ]]; then
  echo "=== Usando variaveis de ambiente do shell ==="
  node scripts/sync-db-env.mjs
  pnpm db:check
  exit 0
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "Railway CLI nao encontrado. Instale: https://docs.railway.com/guides/cli"
  echo "Ou exporte DB_* / MYSQL* do painel e rode de novo."
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Faca login: railway login"
  echo "Ou exporte DB_* / MYSQL* do painel Railway (host publico TCP)."
  exit 1
fi

echo "=== Buscando variaveis do MySQL no Railway ==="
SERVICE=""
for candidate in MySQL mysql Database database db; do
  if railway variable list -k -s "$candidate" >"$VARS_FILE" 2>/dev/null && grep -qE '^(MYSQL|DB_)' "$VARS_FILE"; then
    SERVICE="$candidate"
    echo "Servico: $SERVICE"
    break
  fi
done

if [[ -z "$SERVICE" ]]; then
  echo "Tentando variaveis do projeto (sem -s)..."
  railway variable list -k >"$VARS_FILE" 2>/dev/null || true
fi

if ! grep -qE '^(MYSQL|DB_)' "$VARS_FILE" 2>/dev/null; then
  echo "Nao achei MYSQL* ou DB_* no Railway."
  echo "Linke o projeto: railway link"
  echo "Ou exporte manualmente e rode: node scripts/sync-db-env.mjs"
  exit 1
fi

echo "=== Backup do .env.local (DB_*) ==="
cp apps/web/.env.local "/tmp/lt_cashflow_env_local_backup_$(date +%Y%m%d_%H%M%S)"

echo "=== Dump do banco local (se ainda for localhost) ==="
LOCAL_DUMP="/tmp/lt_cashflow_local_before_railway.sql"
if grep -q '^DB_HOST=localhost' apps/web/.env.local 2>/dev/null; then
  # shellcheck disable=SC1091
  source apps/web/.env.local
  mysqldump -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" \
    --single-transaction --routines --triggers "$DB_NAME" >"$LOCAL_DUMP" 2>/dev/null || true
  if [[ -s "$LOCAL_DUMP" ]]; then
    echo "Dump local salvo em $LOCAL_DUMP"
  fi
fi

echo "=== Aplicando variaveis do Railway no ambiente ==="
set -a
# shellcheck disable=SC1090
source "$VARS_FILE"
set +a

node scripts/sync-db-env.mjs

echo "=== Conferindo banco Railway ==="
pnpm db:check

if [[ -s "${LOCAL_DUMP:-}" ]]; then
  echo ""
  echo "Ha dump local em $LOCAL_DUMP"
  read -r -p "Importar dump local para o Railway? [y/N] " ans
  if [[ "${ans,,}" == "y" ]]; then
    # shellcheck disable=SC1091
    source apps/web/.env.local
    mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <"$LOCAL_DUMP"
    echo "Import concluido."
    pnpm db:check
  fi
fi

echo ""
echo "Reinicie o dev server: pnpm dev"
