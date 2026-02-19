#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +%F)
FILENAME="backup-${DATE}.db"
TMP="/tmp/${FILENAME}"

# 1. Télécharger le backup depuis l'API
HTTP_CODE=$(curl -sf \
  -H "Authorization: Bearer ${BACKUP_SECRET}" \
  -o "$TMP" \
  -w "%{http_code}" \
  "${BETTER_AUTH_URL}/api/admin/backup")

if [[ "$HTTP_CODE" != "200" ]]; then
  rm -f "$TMP"
  echo "[backup-cron] Erreur HTTP ${HTTP_CODE}" >&2; exit 1
fi

echo "[backup-cron] Backup téléchargé : ${FILENAME} ($(du -h "$TMP" | cut -f1))"

# 2. Upload vers Railway Object Storage (S3-compatible)
aws s3 cp "$TMP" "s3://${AWS_S3_BUCKET_NAME}/${FILENAME}" \
  --endpoint-url "$AWS_ENDPOINT_URL" \
  --region "${AWS_DEFAULT_REGION:-auto}"

echo "[backup-cron] Upload OK : s3://${AWS_S3_BUCKET_NAME}/${FILENAME}"
rm -f "$TMP"

# 3. Purger les backups > 7 jours
CUTOFF=$(date -d "7 days ago" +%F)
aws s3 ls "s3://${AWS_S3_BUCKET_NAME}/" \
  --endpoint-url "$AWS_ENDPOINT_URL" \
  --region "${AWS_DEFAULT_REGION:-auto}" \
  | awk '{print $4}' \
  | grep '^backup-' \
  | while read -r key; do
      KEY_DATE="${key#backup-}"
      KEY_DATE="${KEY_DATE%.db}"
      if [[ "$KEY_DATE" < "$CUTOFF" ]]; then
        aws s3 rm "s3://${AWS_S3_BUCKET_NAME}/${key}" \
          --endpoint-url "$AWS_ENDPOINT_URL" \
          --region "${AWS_DEFAULT_REGION:-auto}"
        echo "[backup-cron] Supprimé : ${key}"
      fi
    done
