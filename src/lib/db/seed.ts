import { db } from "./index";
import { user, weightEntries } from "./schema";
import { auth } from "@/lib/auth";

const CSV_PATH = "./data/seed/weights_chcdc.csv";
const DEMO_EMAIL = "ch.decourcel@gmail.com";
const DEMO_PASSWORD = "Demo1234!";

async function runSeed() {
  console.log("Création de l'utilisateur de démo...");

  const result = await auth.api.signUpEmail({
    body: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      name: "Demo",
    },
  });

  const userId = result.user.id;
  console.log(`Utilisateur créé : ${DEMO_EMAIL} (id: ${userId})`);

  const csvText = await Bun.file(CSV_PATH).text();
  const lines = csvText.trim().split("\n").slice(1); // skip header

  const entries = lines
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split(",");
      const entryDate = parts[0].trim(); // déjà en YYYY-MM-DD
      const weightKg = parseFloat(parts[1]);
      const notes = parts.slice(2).join(",").trim() || null;
      return { userId, entryDate, weightKg, notes };
    });

  await db.transaction(async (tx) => {
    for (const entry of entries) {
      await tx.insert(weightEntries).values(entry);
    }
  });

  console.log(`Seed terminé : ${entries.length} pesées insérées.`);
}

// Auto-trigger si la table user est vide
const existingUsers = await db.select().from(user).limit(1);
if (existingUsers.length === 0) {
  await runSeed();
} else {
  console.log("Base déjà initialisée, seed ignoré.");
}