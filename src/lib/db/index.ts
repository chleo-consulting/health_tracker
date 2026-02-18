import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _sqlite: Database | null = null;
let _db: DrizzleDb | null = null;

function init(): { sqlite: Database; db: DrizzleDb } {
  if (!_sqlite || !_db) {
    const dbPath = process.env.DATABASE_PATH ?? "./data/health-tracker.db";
    _sqlite = new Database(dbPath);
    _sqlite.run("PRAGMA journal_mode = WAL");
    _sqlite.run("PRAGMA foreign_keys = ON");
    _sqlite.run("PRAGMA busy_timeout = 5000");
    _db = drizzle(_sqlite, { schema });
  }
  return { sqlite: _sqlite, db: _db };
}

function makeProxy<T extends object>(_: T, getter: () => T): T {
  return new Proxy(_ as T, {
    get(__, prop) {
      const target = getter();
      const value = (target as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as Function).bind(target) : value;
    },
  });
}

export const sqlite: Database = makeProxy({} as Database, () => init().sqlite);
export const db: DrizzleDb = makeProxy({} as DrizzleDb, () => init().db);
