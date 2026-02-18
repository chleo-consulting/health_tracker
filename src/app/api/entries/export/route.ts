import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { weightEntries } from "@/lib/db/schema";

export async function GET(_request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Session manquante ou expirée" } },
      { status: 401 }
    );
  }

  const rows = await db
    .select({
      entry_date: weightEntries.entryDate,
      weight_kg: weightEntries.weightKg,
      notes: weightEntries.notes,
    })
    .from(weightEntries)
    .where(eq(weightEntries.userId, session.user.id))
    .orderBy(asc(weightEntries.entryDate));

  const lines = ["date,weight,notes"];
  for (const row of rows) {
    const notes = row.notes ? `"${row.notes.replace(/"/g, '""')}"` : "";
    lines.push(`${row.entry_date},${row.weight_kg},${notes}`);
  }

  const today = new Date().toISOString().split("T")[0];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="weight-export-${today}.csv"`,
    },
  });
}
