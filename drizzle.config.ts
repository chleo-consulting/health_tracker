import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Connexion directe (port 5432) pour les migrations drizzle-kit
    url: process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
