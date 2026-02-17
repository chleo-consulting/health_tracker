import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../../lib/db/schema";
import { NextRequest } from "next/server";

// ─── Base de données in-memory pour les tests ───────────────────────────────

const testSqlite = new Database(":memory:");
testSqlite.run("PRAGMA foreign_keys = OFF");
testSqlite.run(`
  CREATE TABLE IF NOT EXISTS weight_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    weight_kg REAL NOT NULL CHECK(weight_kg >= 3 AND weight_kg <= 150),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, entry_date)
  )
`);
const testDb = drizzle(testSqlite, { schema });

// ─── Session mockable ────────────────────────────────────────────────────────

let currentSession: { user: { id: string }; session: object } | null = {
  user: { id: "user1" },
  session: {},
};

// ─── Mocks des modules (avant import des routes) ─────────────────────────────

mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () => currentSession,
    },
  },
}));

mock.module("next/headers", () => ({
  headers: async () => new Headers(),
}));

mock.module("@/lib/db/index", () => ({
  db: testDb,
}));

// ─── Import dynamique des handlers (après les mocks) ────────────────────────

const { GET: listEntries, POST: createEntry } = await import(
  "../../app/api/entries/route"
);
const { GET: getStats } = await import("../../app/api/entries/stats/route");
const { GET: getById, DELETE: deleteById } = await import(
  "../../app/api/entries/[id]/route"
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

function insertEntry(userId: string, date: string, weight: number, notes?: string) {
  testSqlite.run(
    `INSERT INTO weight_entries (user_id, entry_date, weight_kg, notes) VALUES (?, ?, ?, ?)`,
    [userId, date, weight, notes ?? null]
  );
  const row = testSqlite
    .query("SELECT id FROM weight_entries ORDER BY id DESC LIMIT 1")
    .get() as { id: number };
  return row.id;
}

// ─── Reset entre chaque test ──────────────────────────────────────────────────

beforeEach(() => {
  testSqlite.run("DELETE FROM weight_entries");
  currentSession = { user: { id: "user1" }, session: {} };
});

// ─── GET /api/entries ─────────────────────────────────────────────────────────

describe("GET /api/entries", () => {
  it("retourne une liste vide si aucune pesée", async () => {
    const res = await listEntries(makeRequest("http://localhost:3000/api/entries"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(0);
    expect(json.pagination.total).toBe(0);
    expect(json.pagination.total_pages).toBe(0);
  });

  it("retourne les pesées avec pagination", async () => {
    insertEntry("user1", "2026-01-01", 75.0);
    insertEntry("user1", "2026-01-02", 74.5);

    const res = await listEntries(
      makeRequest("http://localhost:3000/api/entries?page=1&limit=10")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
    expect(json.pagination.total_pages).toBe(1);
  });

  it("tri décroissant par défaut", async () => {
    insertEntry("user1", "2026-01-01", 75.0);
    insertEntry("user1", "2026-01-10", 74.0);

    const res = await listEntries(makeRequest("http://localhost:3000/api/entries"));
    const json = await res.json();

    expect(json.data[0].entry_date).toBe("2026-01-10");
    expect(json.data[1].entry_date).toBe("2026-01-01");
  });

  it("filtre par plage de dates (from/to)", async () => {
    insertEntry("user1", "2025-12-01", 76.0);
    insertEntry("user1", "2026-01-15", 75.0);
    insertEntry("user1", "2026-02-01", 74.0);

    const res = await listEntries(
      makeRequest(
        "http://localhost:3000/api/entries?from=2026-01-01&to=2026-01-31"
      )
    );
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].entry_date).toBe("2026-01-15");
  });

  it("n'expose pas les pesées d'autres utilisateurs", async () => {
    insertEntry("user1", "2026-01-01", 75.0);
    insertEntry("user2", "2026-01-02", 80.0);

    const res = await listEntries(makeRequest("http://localhost:3000/api/entries"));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].weight_kg).toBe(75.0);
  });
});

// ─── POST /api/entries ────────────────────────────────────────────────────────

describe("POST /api/entries", () => {
  it("crée une pesée (201)", async () => {
    const res = await createEntry(
      makeRequest("http://localhost:3000/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_date: "2026-01-15", weight_kg: 75.0, notes: "test" }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.entry_date).toBe("2026-01-15");
    expect(json.data.weight_kg).toBe(75.0);
    expect(json.data.notes).toBe("test");
  });

  it("met à jour une pesée existante (upsert → 200)", async () => {
    insertEntry("user1", "2026-01-15", 75.0);

    const res = await createEntry(
      makeRequest("http://localhost:3000/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_date: "2026-01-15", weight_kg: 74.5 }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.weight_kg).toBe(74.5);
  });

  it("rejette une date future (400)", async () => {
    const res = await createEntry(
      makeRequest("http://localhost:3000/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_date: "2099-01-01", weight_kg: 75.0 }),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejette un poids hors plage (400)", async () => {
    const res = await createEntry(
      makeRequest("http://localhost:3000/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_date: "2026-01-15", weight_kg: 200 }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejette une précision > 1 décimale (400)", async () => {
    const res = await createEntry(
      makeRequest("http://localhost:3000/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_date: "2026-01-15", weight_kg: 75.55 }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejette des notes trop longues (400)", async () => {
    const res = await createEntry(
      makeRequest("http://localhost:3000/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_date: "2026-01-15",
          weight_kg: 75.0,
          notes: "x".repeat(501),
        }),
      })
    );
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/entries/stats ───────────────────────────────────────────────────

describe("GET /api/entries/stats", () => {
  it("retourne des stats nulles si aucune pesée", async () => {
    const res = await getStats(makeRequest("http://localhost:3000/api/entries/stats"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.count).toBe(0);
    expect(json.data.min).toBeNull();
    expect(json.data.max).toBeNull();
    expect(json.data.average).toBeNull();
    expect(json.data.latest).toBeNull();
    expect(json.data.delta).toBeNull();
  });

  it("calcule correctement les agrégats", async () => {
    insertEntry("user1", "2026-01-01", 70.0);
    insertEntry("user1", "2026-01-15", 75.0);
    insertEntry("user1", "2026-02-01", 72.0);

    const res = await getStats(makeRequest("http://localhost:3000/api/entries/stats"));
    const json = await res.json();

    expect(json.data.count).toBe(3);
    expect(json.data.min.weight_kg).toBe(70.0);
    expect(json.data.min.entry_date).toBe("2026-01-01");
    expect(json.data.max.weight_kg).toBe(75.0);
    expect(json.data.average).toBe(72.3); // (70+75+72)/3 = 72.333 → 72.3
    expect(json.data.latest.entry_date).toBe("2026-02-01");
    expect(json.data.delta).toBe(2.0); // 72.0 - 70.0
  });

  it("applique le filtre from", async () => {
    insertEntry("user1", "2025-12-01", 80.0);
    insertEntry("user1", "2026-01-15", 75.0);

    const res = await getStats(
      makeRequest("http://localhost:3000/api/entries/stats?from=2026-01-01")
    );
    const json = await res.json();

    expect(json.data.count).toBe(1);
    expect(json.data.min.weight_kg).toBe(75.0);
  });

  it("inclut les champs de périodes calendaires", async () => {
    const res = await getStats(makeRequest("http://localhost:3000/api/entries/stats"));
    const json = await res.json();

    expect("average_last_month" in json.data).toBe(true);
    expect("average_previous_month" in json.data).toBe(true);
    expect("average_last_quarter" in json.data).toBe(true);
    expect("average_previous_quarter" in json.data).toBe(true);
    expect("average_last_year" in json.data).toBe(true);
    expect("average_previous_year" in json.data).toBe(true);
  });
});

// ─── GET /api/entries/:id ─────────────────────────────────────────────────────

describe("GET /api/entries/:id", () => {
  it("retourne une pesée par id", async () => {
    const id = insertEntry("user1", "2026-01-15", 75.0, "note test");

    const res = await getById(makeRequest(`http://localhost:3000/api/entries/${id}`), {
      params: Promise.resolve({ id: String(id) }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe(id);
    expect(json.data.weight_kg).toBe(75.0);
    expect(json.data.notes).toBe("note test");
  });

  it("retourne 404 si la pesée n'existe pas", async () => {
    const res = await getById(makeRequest("http://localhost:3000/api/entries/9999"), {
      params: Promise.resolve({ id: "9999" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("ENTRY_NOT_FOUND");
  });

  it("retourne 404 pour une pesée d'un autre utilisateur", async () => {
    const id = insertEntry("user2", "2026-01-15", 80.0);

    const res = await getById(makeRequest(`http://localhost:3000/api/entries/${id}`), {
      params: Promise.resolve({ id: String(id) }),
    });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/entries/:id ──────────────────────────────────────────────────

describe("DELETE /api/entries/:id", () => {
  it("supprime une pesée (204)", async () => {
    const id = insertEntry("user1", "2026-01-15", 75.0);

    const res = await deleteById(
      makeRequest(`http://localhost:3000/api/entries/${id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: String(id) }) }
    );
    expect(res.status).toBe(204);

    const remaining = testSqlite
      .query(`SELECT id FROM weight_entries WHERE id = ?`)
      .all(id);
    expect(remaining).toHaveLength(0);
  });

  it("retourne 404 si la pesée n'existe pas", async () => {
    const res = await deleteById(
      makeRequest("http://localhost:3000/api/entries/9999", { method: "DELETE" }),
      { params: Promise.resolve({ id: "9999" }) }
    );
    expect(res.status).toBe(404);
  });

  it("ne supprime pas la pesée d'un autre utilisateur (404)", async () => {
    const id = insertEntry("user2", "2026-01-15", 80.0);

    const res = await deleteById(
      makeRequest(`http://localhost:3000/api/entries/${id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: String(id) }) }
    );
    expect(res.status).toBe(404);

    const remaining = testSqlite
      .query(`SELECT id FROM weight_entries WHERE id = ?`)
      .all(id);
    expect(remaining).toHaveLength(1);
  });
});
