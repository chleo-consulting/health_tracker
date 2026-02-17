import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { weightEntries } from "@/lib/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Session manquante ou expirée" } },
      { status: 401 }
    );
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: { code: "ENTRY_NOT_FOUND", message: "Pesée introuvable" } },
      { status: 404 }
    );
  }

  const userId = session.user.id;

  const result = await db
    .select({
      id: weightEntries.id,
      entry_date: weightEntries.entryDate,
      weight_kg: weightEntries.weightKg,
      notes: weightEntries.notes,
      created_at: weightEntries.createdAt,
    })
    .from(weightEntries)
    .where(and(eq(weightEntries.id, id), eq(weightEntries.userId, userId)))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json(
      { error: { code: "ENTRY_NOT_FOUND", message: "Pesée introuvable" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: result[0] });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Session manquante ou expirée" } },
      { status: 401 }
    );
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: { code: "ENTRY_NOT_FOUND", message: "Pesée introuvable" } },
      { status: 404 }
    );
  }

  const userId = session.user.id;

  const existing = await db
    .select({ id: weightEntries.id })
    .from(weightEntries)
    .where(and(eq(weightEntries.id, id), eq(weightEntries.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json(
      { error: { code: "ENTRY_NOT_FOUND", message: "Pesée introuvable" } },
      { status: 404 }
    );
  }

  await db
    .delete(weightEntries)
    .where(and(eq(weightEntries.id, id), eq(weightEntries.userId, userId)));

  return new NextResponse(null, { status: 204 });
}
