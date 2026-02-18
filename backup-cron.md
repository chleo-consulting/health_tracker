# Plan : Cron job backup quotidien à 2h

## Contexte

L'endpoint `GET /api/admin/backup` existe déjà et retourne le fichier SQLite via `VACUUM INTO`. Il est protégé par `BACKUP_SECRET`. Le SPEC (§15.9) documente la crontab `0 2 * * *`. Il manque :
1. Le script d'invocation cron
2. La configuration du service Railway cron
3. Un bucket Railway Object Storage pour stocker les backups hors du volume SQLite

## Fichiers à créer/modifier

### 1. `scripts/backup.sh` → renommé `scripts/backup-local.sh`

Script existant — usage local uniquement (charge `.env.local`, écrit dans `./backups/`). Renommage simple, aucune modification du contenu.

### 2. `scripts/backup-cron.sh` (nouveau — pour Railway)

Télécharge le backup via l'API, l'upload dans le bucket Railway Object Storage, puis purge les anciens fichiers (> 7 jours). Les vars sont injectées par Railway (pas de `.env.local`).

Railway injecte des vars sans préfixe `AWS_` : il faut les mapper pour l'AWS CLI.

```bash
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
AWS_ACCESS_KEY_ID="$ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY" \
  aws s3 cp "$TMP" "s3://${BUCKET}/${FILENAME}" \
  --endpoint-url "$ENDPOINT" \
  --region "${REGION:-auto}"

echo "[backup-cron] Upload OK : s3://${BUCKET}/${FILENAME}"
rm -f "$TMP"

# 3. Purger les backups > 7 jours
CUTOFF=$(date -d "7 days ago" +%F)
AWS_ACCESS_KEY_ID="$ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY" \
  aws s3 ls "s3://${BUCKET}/" \
  --endpoint-url "$ENDPOINT" \
  --region "${REGION:-auto}" \
  | awk '{print $4}' \
  | grep '^backup-' \
  | while read -r key; do
      KEY_DATE="${key#backup-}"
      KEY_DATE="${KEY_DATE%.db}"
      if [[ "$KEY_DATE" < "$CUTOFF" ]]; then
        AWS_ACCESS_KEY_ID="$ACCESS_KEY_ID" \
        AWS_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY" \
          aws s3 rm "s3://${BUCKET}/${key}" \
          --endpoint-url "$ENDPOINT" \
          --region "${REGION:-auto}"
        echo "[backup-cron] Supprimé : ${key}"
      fi
    done
```

## Configuration Railway (dashboard)

### Étape 1 — Créer le bucket

Railway dashboard > **Create > Bucket** → choisir la région `europe-west4` (même région que l'app).

### Étape 2 — Créer le service cron

Dans le projet Railway > **New Service** > **Empty Service** (source = même repo GitHub) :

| Paramètre | Valeur |
|---|---|
| Start command | `bash scripts/backup-cron.sh` |
| Cron schedule | `0 2 * * *` |
| Volume mount | **Aucun** (les backups vont dans le bucket) |

### Étape 3 — Variables d'environnement du service cron

| Variable | Source |
|---|---|
| `BACKUP_SECRET` | Copier depuis le service principal |
| `BETTER_AUTH_URL` | URL de prod (ex: `https://monapp.up.railway.app`) |
| `BUCKET` | Injecté automatiquement par Railway en liant le bucket |
| `ACCESS_KEY_ID` | Injecté automatiquement |
| `SECRET_ACCESS_KEY` | Injecté automatiquement |
| `ENDPOINT` | Injecté automatiquement (`https://storage.railway.app`) |
| `REGION` | Injecté automatiquement |

> Pour lier le bucket au service cron : service cron > Settings > **Linked Storage** > sélectionner le bucket créé.

## Lire / télécharger manuellement depuis le bucket S3

Les vars Railway Object Storage sont disponibles dans le dashboard (service cron > Variables). Les exporter localement pour utiliser le CLI :

```bash
export ACCESS_KEY_ID="<valeur>"
export SECRET_ACCESS_KEY="<valeur>"
export BUCKET="<valeur>"
export ENDPOINT="https://storage.railway.app"
export REGION="auto"
```

**Lister les backups disponibles :**
```bash
AWS_ACCESS_KEY_ID="$ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY" \
  aws s3 ls "s3://$BUCKET/" --endpoint-url "$ENDPOINT" --region "$REGION"
```

**Télécharger un backup spécifique :**
```bash
AWS_ACCESS_KEY_ID="$ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY" \
  aws s3 cp "s3://$BUCKET/backup-2026-02-18.db" ./backup-2026-02-18.db \
  --endpoint-url "$ENDPOINT" --region "$REGION"
```

> Prérequis : `aws` CLI installé localement (`brew install awscli` / `apt install awscli`).
> Les vars `AWS_*` sont mappées manuellement car Railway n'utilise pas le préfixe `AWS_`.

## Vérification

1. Déclencher manuellement le service cron (Railway > Restart)
2. Vérifier les logs : `[backup-cron] Upload OK : s3://...`
3. Lister les fichiers du bucket avec la commande ci-dessus
4. Télécharger le fichier et vérifier qu'il s'ouvre avec `bunx drizzle-kit studio` ou un viewer SQLite
