# Scripts

## `export-weights.sh`

**Environnement :** dev ou production

Exporte les entrées de poids d'un utilisateur au format CSV via l'API.

```bash
./scripts/export-weights.sh [BASE_URL] [EMAIL] [PASSWORD]
```

Les arguments sont optionnels. Priorité de résolution pour `BASE_URL` : argument > `$BASE_URL` > `$BETTER_AUTH_URL` > variable Railway > `http://localhost:3000`. L'email et le mot de passe sont demandés interactivement s'ils ne sont pas fournis.

**Output :** `./backups/weights/<email>_<date>.csv`

---

## `import-weights.sh`

**Environnement :** dev ou production

Importe un fichier CSV de poids dans l'application via l'API (upsert par date).

```bash
./scripts/import-weights.sh <fichier.csv> [BASE_URL] [EMAIL] [PASSWORD]
```

Le fichier CSV est obligatoire. Même résolution de `BASE_URL` qu'`export-weights.sh`.

**Output (stdout) :** `Import terminé : N lignes importées, N ignorées, N erreurs`

---

## `backup-local.sh`

**Environnement :** dev (ou CI ponctuel)

Télécharge une copie SQLite de la base de données en appelant `GET /api/admin/backup`. Lit `.env.local` automatiquement. Les variables passées en préfixe ont la priorité sur `.env.local`.

```bash
# Variables requises : BACKUP_SECRET, BETTER_AUTH_URL
# Variable optionnelle : BACKUP_DIR (défaut : ./backups)
BACKUP_SECRET=xxx BETTER_AUTH_URL=https://monapp.up.railway.app ./scripts/backup-local.sh
```

**Output :** `./backups/health-tracker-backup-<date>.db`

---

## `backup-cron.sh`

**Environnement :** production (cron Railway ou autre)

Télécharge le backup SQLite puis l'uploade dans un bucket S3-compatible (Railway Object Storage), et purge les fichiers de plus de 7 jours.

```bash
# Variables requises (toutes injectées par Railway) :
#   BACKUP_SECRET, BETTER_AUTH_URL
#   AWS_S3_BUCKET_NAME, AWS_ENDPOINT_URL, AWS_DEFAULT_REGION
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (implicites pour aws cli)
./scripts/backup-cron.sh
```

**Dépendance :** `aws` CLI installé dans l'environnement.

**Output :** upload dans `s3://<bucket>/backup-<date>.db` + suppression automatique des fichiers antérieurs à J-7.

---

## `baseline-migrate.ts`

**Environnement :** production — déploiement initial uniquement

Script de migration one-shot pour les bases créées avec `drizzle-kit push` (sans historique de migrations). Insère l'entrée correspondante dans `__drizzle_migrations` pour que `drizzle-kit migrate` ne tente pas de recréer les tables existantes.

```bash
bun scripts/baseline-migrate.ts
# ou avec une DB personnalisée :
DATABASE_PATH=/chemin/vers/app.db bun scripts/baseline-migrate.ts
```

**Comportement :**
- Si la DB n'existe pas → exit silencieux
- Si `__drizzle_migrations` contient déjà des entrées → skip
- Si la DB est vierge (pas de table `account`) → skip
- Sinon → crée la table `__drizzle_migrations` et insère le hash de la migration `0000_woozy_scalphunter`

**Output (stdout) :** messages préfixés `[baseline]` indiquant l'action effectuée.
