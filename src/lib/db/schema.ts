import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  timestamp,
  doublePrecision,
  serial,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";

// ─── Better-auth tables ─────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).$onUpdate(() => new Date()).notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).$onUpdate(() => new Date()).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).default(sql`now()`).$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ─── Application tables ─────────────────────────────────────────────────────

export const weightEntries = pgTable(
  "weight_entries",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    entryDate: text("entry_date").notNull(),
    weightKg: doublePrecision("weight_kg").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).default(sql`now()`).notNull(),
  },
  (table) => [
    unique("uq_user_date").on(table.userId, table.entryDate),
    index("idx_weight_entries_user_date").on(table.userId, table.entryDate),
    check("chk_weight_range", sql`${table.weightKg} >= 3 AND ${table.weightKg} <= 150`),
  ],
);
