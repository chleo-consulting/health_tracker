#!/usr/bin/env bash
# Usage: ./scripts/export-weights.sh [BASE_URL] [EMAIL] [PASSWORD]
# Fallback vars : SESSION_EMAIL, SESSION_PASSWORD, BASE_URL auto via `railway variable`
set -euo pipefail

# BASE_URL : arg > env var > railway variable
if [[ -n "${1:-}" ]]; then
  BASE_URL="$1"
elif [[ -n "${BASE_URL:-}" ]]; then
  : # déjà défini
else
  RAW=$(railway variable -k 2>/dev/null | grep BETTER_AUTH_URL || true)
  BASE_URL=$(echo "$RAW" | cut -d'=' -f2-)
  if [[ -z "$BASE_URL" ]]; then
    BASE_URL="http://localhost:3000"
    echo "Warning: BASE_URL non trouvé, utilisation de $BASE_URL" >&2
  fi
fi

EMAIL="${2:-${SESSION_EMAIL:-}}"
PASSWORD="${3:-${SESSION_PASSWORD:-}}"

# Prompts si non fournis
if [[ -z "$EMAIL" ]]; then read -rp "Email: " EMAIL; fi
if [[ -z "$PASSWORD" ]]; then read -rsp "Password: " PASSWORD; echo; fi

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

# 1. Login → récupère le cookie de session + email depuis la réponse JSON
RESPONSE=$(curl -s -c "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Vérification basique (jq optionnel, fallback grep)
if command -v jq &>/dev/null; then
  USER_EMAIL=$(echo "$RESPONSE" | jq -r '.user.email // empty')
else
  USER_EMAIL=$(echo "$RESPONSE" | grep -oP '"email"\s*:\s*"\K[^"]+' | head -1)
fi

if [[ -z "$USER_EMAIL" ]]; then
  echo "Erreur: login échoué. Réponse: $RESPONSE" >&2
  exit 1
fi

# 2. Export CSV
DATE=$(date +%Y-%m-%d)
SAFE_EMAIL=$(echo "$USER_EMAIL" | tr '@' '_' | tr '.' '_')
OUTPUT_DIR="./backups/weights"
mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="$OUTPUT_DIR/${SAFE_EMAIL}_${DATE}.csv"

HTTP_CODE=$(curl -s -b "$COOKIE_JAR" \
  -w "%{http_code}" \
  -o "$OUTPUT_FILE" \
  "$BASE_URL/api/entries/export")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Erreur export HTTP $HTTP_CODE" >&2
  cat "$OUTPUT_FILE" >&2
  rm -f "$OUTPUT_FILE"
  exit 1
fi

echo "Export sauvegardé : $OUTPUT_FILE"
