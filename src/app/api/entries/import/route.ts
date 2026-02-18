import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { weightEntries } from "@/lib/db/schema";
import { entrySchema } from "@/lib/validations/entry.schema";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Session manquante ou expirée" } },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Champ 'file' manquant" } },
      { status: 400 }
    );
  }

  const text = await (file as File).text();
  const lines = text.split(/\r?\n/).filter(Boolean);

  // Skip header line
  const dataLines = lines.slice(1);

  let imported = 0;
  let skipped = 0;
  const errors: { line: number; message: string }[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const lineNum = i + 2; // 1-indexed, accounting for header
    const raw = dataLines[i];

    // Parse CSV line (handle quoted notes field)
    const match = raw.match(/^([^,]+),([^,]+),(.*)$/);
    if (!match) {
      errors.push({ line: lineNum, message: "Format de ligne invalide" });
      skipped++;
      continue;
    }

    const [, date, weightRaw, notesRaw] = match;
    const weightNum = parseFloat(weightRaw.trim());
    const notes = notesRaw.trim().replace(/^"|"$/g, "").replace(/""/g, '"') || null;

    const parsed = entrySchema.safeParse({
      entry_date: date.trim(),
      weight_kg: weightNum,
      notes,
    });

    if (!parsed.success) {
      errors.push({ line: lineNum, message: parsed.error.issues[0].message });
      skipped++;
      continue;
    }

    const { entry_date, weight_kg } = parsed.data;
    const userId = session.user.id;

    await db
      .insert(weightEntries)
      .values({ userId, entryDate: entry_date, weightKg: weight_kg, notes: parsed.data.notes ?? null })
      .onConflictDoUpdate({
        target: [weightEntries.userId, weightEntries.entryDate],
        set: { weightKg: weight_kg, notes: parsed.data.notes ?? null },
      });

    imported++;
  }

  if (imported === 0 && dataLines.length > 0) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Aucune ligne valide dans le fichier" }, errors },
      { status: 400 }
    );
  }

  return Response.json({ imported, skipped, errors });
}
