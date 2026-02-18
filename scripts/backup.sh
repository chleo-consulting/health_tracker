#!/usr/bin/env bash
set -euo pipefail

# Variables (override via env ou .env.local)
BACKUP_SECRET="${BACKUP_SECRET:-}"
BETTER_AUTH_URL="${BETTER_AUTH_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# Charger .env.local si présent
if [[ -f ".env.local" ]]; then
  set -a; source .env.local; set +a
fi

# Validation
if [[ -z "$BACKUP_SECRET" ]]; then
  echo "Erreur : BACKUP_SECRET non défini" >&2; exit 1
fi
if [[ -z "$BETTER_AUTH_URL" ]]; then
  echo "Erreur : BETTER_AUTH_URL non défini" >&2; exit 1
fi

mkdir -p "$BACKUP_DIR"

DATE=$(date +%F)
FILENAME="health-tracker-backup-${DATE}.db"
DEST="${BACKUP_DIR}/${FILENAME}"

echo "Téléchargement du backup depuis ${BETTER_AUTH_URL}..."

HTTP_CODE=$(curl -sf \
  -H "Authorization: Bearer ${BACKUP_SECRET}" \
  -o "$DEST" \
  -w "%{http_code}" \
  "${BETTER_AUTH_URL}/api/admin/backup")

if [[ "$HTTP_CODE" != "200" ]]; then
  rm -f "$DEST"
  echo "Erreur HTTP ${HTTP_CODE}" >&2; exit 1
fi

echo "Backup sauvegardé : ${DEST} ($(du -h "$DEST" | cut -f1))"
