import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { weightEntries } from "@/lib/db/schema";
import { z } from "zod";
import { entrySchema } from "@/lib/validations/entry.schema";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Session manquante ou expirée" } },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const { searchParams } = request.nextUrl;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sortDir = searchParams.get("sort") === "asc" ? asc : desc;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10") || 10));
  const offset = (page - 1) * limit;

  const conditions = [eq(weightEntries.userId, userId)];
  if (from) conditions.push(gte(weightEntries.entryDate, from));
  if (to) conditions.push(lte(weightEntries.entryDate, to));

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: weightEntries.id,
        entry_date: weightEntries.entryDate,
        weight_kg: weightEntries.weightKg,
        notes: weightEntries.notes,
        created_at: weightEntries.createdAt,
      })
      .from(weightEntries)
      .where(where)
      .orderBy(sortDir(weightEntries.entryDate))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(weightEntries).where(where),
  ]);

  const total = countResult[0]?.count ?? 0;
  const total_pages = Math.ceil(total / limit);

  return NextResponse.json({
    data,
    pagination: { page, limit, total, total_pages },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Session manquante ou expirée" } },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const body = await request.json();

  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0].message,
          details: z.treeifyError(parsed.error),
        },
      },
      { status: 400 }
    );
  }

  const { entry_date, weight_kg, notes } = parsed.data;

  // Vérification préalable pour déterminer 200 vs 201
  const existing = await db
    .select({ id: weightEntries.id })
    .from(weightEntries)
    .where(
      and(eq(weightEntries.userId, userId), eq(weightEntries.entryDate, entry_date))
    )
    .limit(1);

  const isUpdate = existing.length > 0;

  await db
    .insert(weightEntries)
    .values({ userId, entryDate: entry_date, weightKg: weight_kg, notes: notes ?? null })
    .onConflictDoUpdate({
      target: [weightEntries.userId, weightEntries.entryDate],
      set: { weightKg: weight_kg, notes: notes ?? null },
    });

  const result = await db
    .select({
      id: weightEntries.id,
      entry_date: weightEntries.entryDate,
      weight_kg: weightEntries.weightKg,
      notes: weightEntries.notes,
      created_at: weightEntries.createdAt,
    })
    .from(weightEntries)
    .where(
      and(eq(weightEntries.userId, userId), eq(weightEntries.entryDate, entry_date))
    )
    .limit(1);

  return NextResponse.json({ data: result[0] }, { status: isUpdate ? 200 : 201 });
}
