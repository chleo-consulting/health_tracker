/**
 * Baseline script for databases created with `drizzle-kit push`.
 *
 * `drizzle-kit push` crée les tables sans historique de migrations
 * (`__drizzle_migrations`). Ce script insère l'entrée correspondante
 * pour que `drizzle-kit migrate` ne tente pas de recréer les tables.
 */

import { Database } from "bun:sqlite";
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";

const dbPath = process.env.DATABASE_PATH ?? "./data/health-tracker.db";

if (!existsSync(dbPath)) {
  console.log("[baseline] No database found, skipping.");
  process.exit(0);
}

const db = new Database(dbPath);

// Si __drizzle_migrations existe et a des entrées → rien à faire
const migrationsTableExists = db
  .query<{ name: string }, []>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
  )
  .get();

if (migrationsTableExists) {
  const row = db
    .query<{ count: number }, []>("SELECT COUNT(*) as count FROM __drizzle_migrations")
    .get();
  if ((row?.count ?? 0) > 0) {
    console.log("[baseline] Migration history already exists, skipping.");
    db.close();
    process.exit(0);
  }
}

// Si les tables applicatives n'existent pas → base vierge, rien à faire
const accountTable = db
  .query<{ name: string }, []>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='account'"
  )
  .get();

if (!accountTable) {
  console.log("[baseline] Fresh database, no baseline needed.");
  db.close();
  process.exit(0);
}

// La DB a des tables (créées par push) mais pas d'historique → on baseline
console.log("[baseline] Database created with drizzle-kit push detected. Baselining...");

db.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at NUMERIC
  )
`);

const sqlContent = readFileSync("./drizzle/0000_woozy_scalphunter.sql", "utf-8");
const hash = createHash("sha256").update(sqlContent).digest("hex");
const createdAt = 1771354913481; // "when" depuis drizzle/meta/_journal.json

db.query("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(hash, createdAt);

console.log(`[baseline] Done. Migration 0000_woozy_scalphunter marked as applied.`);
db.close();
