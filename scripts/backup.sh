#!/bin/bash
###############################################################################
# Trading Forge - Backup Script
# Usage: sudo ./scripts/backup.sh
# Cron:  0 3 * * * cd /opt/Trade-Forge && ./scripts/backup.sh >> logs/backup.log 2>&1
###############################################################################
set -euo pipefail

ENV_FILE=".env.production"
BACKUP_DIR="database/backups"
RETENTION_DAYS=7

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; }

# Must run from project root
if [ ! -f "$ENV_FILE" ]; then
    err "Run from project root (where $ENV_FILE lives)"
    exit 1
fi

set -a; source "$ENV_FILE"; set +a
mkdir -p "$BACKUP_DIR"

STAMP=$(date +%Y%m%d_%H%M%S)
FAILED=0

###############################################################################
# 1. POSTGRESQL DUMP
###############################################################################
log "Backing up PostgreSQL..."
PG_FILE="${BACKUP_DIR}/pg_${STAMP}.sql.gz"

if docker exec crypto_db pg_isready -U "${DB_USER}" -d crypto_platform >/dev/null 2>&1; then
    docker exec crypto_db pg_dump -U "${DB_USER}" --clean --if-exists crypto_platform \
        | gzip > "$PG_FILE"
    PG_SIZE=$(du -h "$PG_FILE" | cut -f1)
    ok "PostgreSQL backup: $PG_FILE ($PG_SIZE)"
else
    err "PostgreSQL is not running -- skipping"
    FAILED=1
fi

###############################################################################
# 2. REDIS SNAPSHOT
###############################################################################
log "Backing up Redis..."
REDIS_FILE="${BACKUP_DIR}/redis_${STAMP}.rdb"

if docker exec crypto_redis redis-cli -a "${REDIS_PASSWORD}" ping 2>/dev/null | grep -q PONG; then
    # Trigger a synchronous save
    docker exec crypto_redis redis-cli -a "${REDIS_PASSWORD}" BGSAVE >/dev/null 2>&1
    sleep 2
    docker cp crypto_redis:/data/dump.rdb "$REDIS_FILE" 2>/dev/null && {
        gzip "$REDIS_FILE"
        REDIS_SIZE=$(du -h "${REDIS_FILE}.gz" | cut -f1)
        ok "Redis backup: ${REDIS_FILE}.gz ($REDIS_SIZE)"
    } || {
        warn "Redis dump.rdb not found (empty cache?). Skipping."
    }
else
    err "Redis is not running -- skipping"
    FAILED=1
fi

###############################################################################
# 3. ENV BACKUP
###############################################################################
log "Backing up environment..."
ENV_BACKUP="${BACKUP_DIR}/env_${STAMP}.enc"

if command -v openssl >/dev/null 2>&1 && [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "$ENV_FILE" -out "$ENV_BACKUP" \
        -pass "pass:${BACKUP_ENCRYPTION_KEY}" 2>/dev/null
    ok "Encrypted env backup: $ENV_BACKUP"
else
    cp "$ENV_FILE" "${BACKUP_DIR}/env_${STAMP}.bak"
    chmod 600 "${BACKUP_DIR}/env_${STAMP}.bak"
    ok "Plain env backup: ${BACKUP_DIR}/env_${STAMP}.bak (set BACKUP_ENCRYPTION_KEY to encrypt)"
fi

###############################################################################
# 4. RETENTION CLEANUP
###############################################################################
log "Cleaning backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "pg_*" -o -name "redis_*" -o -name "env_*" | \
    xargs -I{} find {} -mtime +${RETENTION_DAYS} -print -delete 2>/dev/null | wc -l)
ok "Removed $DELETED old backup files"

###############################################################################
# SUMMARY
###############################################################################
echo ""
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
FILE_COUNT=$(find "$BACKUP_DIR" -type f | wc -l)

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}Backup complete${NC} -- $FILE_COUNT files, $TOTAL_SIZE total"
else
    echo -e "${YELLOW}Backup completed with warnings${NC} -- check errors above"
fi
