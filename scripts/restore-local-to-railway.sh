#!/usr/bin/env bash
# Restaura o MySQL do Railway com dump completo do banco local (fonte de verdade).
# Requer apps/web/.env.railway com DB_* do Railway (host publico TCP).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_DIR="$ROOT/tmp/railway-sync"
LOCAL_ENV="$ROOT/apps/web/.env.local"
RAILWAY_ENV="$ROOT/apps/web/.env.railway"
TS="$(date +%Y%m%d_%H%M%S)"

TABLES=(
  usuarios gestoes categorias contas gastos_fixos fechamentos_periodo
  lancamentos lancamento_rateios auditoria
)

mkdir -p "$SYNC_DIR"

if [[ ! -f "$LOCAL_ENV" ]]; then
  echo "Falta $LOCAL_ENV"
  exit 1
fi

if [[ ! -f "$RAILWAY_ENV" ]]; then
  if [[ -n "${MYSQLHOST:-}" || -n "${MYSQL_PUBLIC_URL:-}" ]]; then
    {
      echo "DB_HOST=${DB_HOST:-${MYSQLHOST:-}}"
      echo "DB_PORT=${DB_PORT:-${MYSQLPORT:-3306}}"
      echo "DB_USER=${DB_USER:-${MYSQLUSER:-root}}"
      echo "DB_PASSWORD=${DB_PASSWORD:-${MYSQLPASSWORD:-}}"
      echo "DB_NAME=${DB_NAME:-${MYSQLDATABASE:-railway}}"
    } >"$RAILWAY_ENV"
    echo "Gerado $RAILWAY_ENV a partir de MYSQL* / DB_* do shell."
  else
    echo "Falta $RAILWAY_ENV (copie de .env.railway.example ou exporte MYSQLHOST/MYSQLPASSWORD)."
    exit 1
  fi
fi

# shellcheck disable=SC1090
source "$LOCAL_ENV"
LOCAL_HOST=$DB_HOST LOCAL_PORT=$DB_PORT LOCAL_USER=$DB_USER LOCAL_PASS=$DB_PASSWORD LOCAL_DB=$DB_NAME

# shellcheck disable=SC1090
source "$RAILWAY_ENV"
RW_HOST=$DB_HOST RW_PORT=$DB_PORT RW_USER=$DB_USER RW_PASS=$DB_PASSWORD RW_DB=$DB_NAME

if [[ "$LOCAL_HOST" != "localhost" && "$LOCAL_HOST" != "127.0.0.1" ]]; then
  echo "LOCAL em $LOCAL_ENV deve ser localhost (fonte local)."
  exit 1
fi

if [[ "$RW_HOST" == "localhost" || "$RW_HOST" == "127.0.0.1" ]]; then
  echo "Railway em $RAILWAY_ENV nao pode ser localhost."
  exit 1
fi

run_counts() {
  local label=$1 host=$2 port=$3 user=$4 pass=$5 db=$6
  echo "=== $label ($host / $db) ==="
  for t in "${TABLES[@]}"; do
    c=$(mysql -h "$host" -P "$port" -u "$user" -p"$pass" "$db" -N -e "SELECT COUNT(*) FROM \`${t}\`" 2>/dev/null || echo "ERR")
    printf "  %-22s %s\n" "$t" "$c"
  done
}

echo ">>> 1) Backup Railway"
RW_DUMP="$SYNC_DIR/railway_backup_${TS}.sql"
mysqldump -h "$RW_HOST" -P "$RW_PORT" -u "$RW_USER" -p"$RW_PASS" \
  --single-transaction --routines --triggers --set-gtid-purged=OFF \
  "$RW_DB" >"$RW_DUMP"
echo "    $RW_DUMP ($(du -h "$RW_DUMP" | cut -f1))"

echo ">>> 2) Backup local"
LOCAL_DUMP="$SYNC_DIR/local_lt_cashflow_${TS}.sql"
mysqldump -h "$LOCAL_HOST" -P "$LOCAL_PORT" -u "$LOCAL_USER" -p"$LOCAL_PASS" \
  --single-transaction --routines --triggers --set-gtid-purged=OFF \
  "$LOCAL_DB" >"$LOCAL_DUMP"
echo "    $LOCAL_DUMP ($(du -h "$LOCAL_DUMP" | cut -f1))"

echo ">>> 3) Contagens ANTES"
run_counts "Local" "$LOCAL_HOST" "$LOCAL_PORT" "$LOCAL_USER" "$LOCAL_PASS" "$LOCAL_DB"
run_counts "Railway" "$RW_HOST" "$RW_PORT" "$RW_USER" "$RW_PASS" "$RW_DB"

echo ">>> 4-5) Preparar dump e restaurar no Railway (FK off, drop via mysqldump)"
IMPORT_SQL="$SYNC_DIR/local_import_to_railway_${TS}.sql"
sed \
  -e "s/\`${LOCAL_DB}\`/\`${RW_DB}\`/g" \
  -e "s/USE \`${LOCAL_DB}\`/USE \`${RW_DB}\`/g" \
  -e "s/USE ${LOCAL_DB}/USE ${RW_DB}/g" \
  "$LOCAL_DUMP" >"$IMPORT_SQL"

mysql -h "$RW_HOST" -P "$RW_PORT" -u "$RW_USER" -p"$RW_PASS" "$RW_DB" -e "SET FOREIGN_KEY_CHECKS=0; SET UNIQUE_CHECKS=0; SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';"
mysql -h "$RW_HOST" -P "$RW_PORT" -u "$RW_USER" -p"$RW_PASS" "$RW_DB" <"$IMPORT_SQL"
mysql -h "$RW_HOST" -P "$RW_PORT" -u "$RW_USER" -p"$RW_PASS" "$RW_DB" -e "SET FOREIGN_KEY_CHECKS=1; SET UNIQUE_CHECKS=1;"

echo ">>> 6-7) Contagens DEPOIS (Railway deve = Local)"
run_counts "Local" "$LOCAL_HOST" "$LOCAL_PORT" "$LOCAL_USER" "$LOCAL_PASS" "$LOCAL_DB"
run_counts "Railway" "$RW_HOST" "$RW_PORT" "$RW_USER" "$RW_PASS" "$RW_DB"

echo ">>> Comparacao"
MISMATCH=0
for t in "${TABLES[@]}"; do
  lc=$(mysql -h "$LOCAL_HOST" -P "$LOCAL_PORT" -u "$LOCAL_USER" -p"$LOCAL_PASS" "$LOCAL_DB" -N -e "SELECT COUNT(*) FROM \`${t}\`")
  rc=$(mysql -h "$RW_HOST" -P "$RW_PORT" -u "$RW_USER" -p"$RW_PASS" "$RW_DB" -N -e "SELECT COUNT(*) FROM \`${t}\`")
  if [[ "$lc" != "$rc" ]]; then
    echo "  DIFERENTE $t: local=$lc railway=$rc"
    MISMATCH=1
  fi
done

if [[ "$MISMATCH" -ne 0 ]]; then
  echo "FALHA: contagens nao batem."
  exit 1
fi

echo "OK: Railway restaurado com dados locais. Backups em $SYNC_DIR"
echo "Local mantido em $LOCAL_HOST/$LOCAL_DB (nao alterado)."
