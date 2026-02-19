#!/usr/bin/env bash
# Usage: ./scripts/import-weights.sh <fichier.csv> [BASE_URL] [EMAIL] [PASSWORD]
# Fallback vars : SESSION_EMAIL, SESSION_PASSWORD, BASE_URL / BETTER_AUTH_URL
set -euo pipefail

# Fichier CSV obligatoire
CSV_FILE="${1:-}"
if [[ -z "$CSV_FILE" ]]; then
  echo "Usage: $0 <fichier.csv> [BASE_URL] [EMAIL] [PASSWORD]" >&2
  exit 1
fi
if [[ ! -f "$CSV_FILE" ]]; then
  echo "Erreur: fichier introuvable : $CSV_FILE" >&2
  exit 1
fi

# BASE_URL : arg > env var BASE_URL > env var BETTER_AUTH_URL > railway variable
if [[ -n "${2:-}" ]]; then
  BASE_URL="$2"
elif [[ -n "${BASE_URL:-}" ]]; then
  : # déjà défini
elif [[ -n "${BETTER_AUTH_URL:-}" ]]; then
  BASE_URL="$BETTER_AUTH_URL"
else
  RAW=$(railway variable -k 2>/dev/null | grep BETTER_AUTH_URL || true)
  BASE_URL=$(echo "$RAW" | cut -d'=' -f2-)
  if [[ -z "$BASE_URL" ]]; then
    BASE_URL="http://localhost:3000"
    echo "Warning: BASE_URL non trouvé, utilisation de $BASE_URL" >&2
  fi
fi

EMAIL="${3:-${SESSION_EMAIL:-}}"
PASSWORD="${4:-${SESSION_PASSWORD:-}}"

# Prompts si non fournis
if [[ -z "$EMAIL" ]]; then read -rp "Email: " EMAIL; fi
if [[ -z "$PASSWORD" ]]; then read -rsp "Password: " PASSWORD; echo; fi

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

# 1. Login
RESPONSE=$(curl -s -c "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if command -v jq &>/dev/null; then
  USER_EMAIL=$(echo "$RESPONSE" | jq -r '.user.email // empty')
else
  USER_EMAIL=$(echo "$RESPONSE" | grep -oP '"email"\s*:\s*"\K[^"]+' | head -1)
fi

if [[ -z "$USER_EMAIL" ]]; then
  echo "Erreur: login échoué. Réponse: $RESPONSE" >&2
  exit 1
fi

echo "Connecté en tant que : $USER_EMAIL"

# 2. Import CSV
IMPORT_RESPONSE=$(curl -s -b "$COOKIE_JAR" \
  -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/entries/import" \
  -F "file=@$CSV_FILE")

HTTP_CODE=$(echo "$IMPORT_RESPONSE" | tail -1)
BODY=$(echo "$IMPORT_RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Erreur import HTTP $HTTP_CODE" >&2
  echo "$BODY" >&2
  exit 1
fi

if command -v jq &>/dev/null; then
  IMPORTED=$(echo "$BODY" | jq '.imported')
  SKIPPED=$(echo "$BODY" | jq '.skipped')
  ERRORS=$(echo "$BODY" | jq '.errors | length')
  echo "Import terminé : $IMPORTED lignes importées, $SKIPPED ignorées, $ERRORS erreurs"
  if [[ "$ERRORS" -gt 0 ]]; then
    echo "$BODY" | jq '.errors'
  fi
else
  echo "Import terminé : $BODY"
fi
