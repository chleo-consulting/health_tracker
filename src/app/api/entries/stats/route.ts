import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, asc, avg, count, desc, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/index";
import { weightEntries } from "@/lib/db/schema";

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calculatePeriods(refDate: Date) {
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-indexed

  // Mois courant (celui qui contient la dernière donnée)
  const currentMonthFrom = formatDate(new Date(year, month, 1));
  const currentMonthTo = formatDate(new Date(year, month + 1, 0));

  // Mois précédent
  const prevMonthFrom = formatDate(new Date(year, month - 1, 1));
  const prevMonthTo = formatDate(new Date(year, month, 0));

  // Trimestre courant
  const currentQuarter = Math.floor(month / 3);
  const currentQuarterFrom = formatDate(new Date(year, currentQuarter * 3, 1));
  const currentQuarterTo = formatDate(new Date(year, currentQuarter * 3 + 3, 0));

  // Trimestre précédent
  const prevQuarterNum = currentQuarter === 0 ? 3 : currentQuarter - 1;
  const prevQuarterYear = currentQuarter === 0 ? year - 1 : year;
  const prevQuarterFrom = formatDate(new Date(prevQuarterYear, prevQuarterNum * 3, 1));
  const prevQuarterTo = formatDate(new Date(prevQuarterYear, prevQuarterNum * 3 + 3, 0));

  return {
    currentMonth: { from: currentMonthFrom, to: currentMonthTo },
    previousMonth: { from: prevMonthFrom, to: prevMonthTo },
    currentQuarter: { from: currentQuarterFrom, to: currentQuarterTo },
    previousQuarter: { from: prevQuarterFrom, to: prevQuarterTo },
    currentYear: { from: `${year}-01-01`, to: `${year}-12-31` },
    previousYear: { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` },
  };
}

async function getPeriodAvg(userId: string, from: string, to: string): Promise<number | null> {
  const result = await db
    .select({ average: avg(weightEntries.weightKg) })
    .from(weightEntries)
    .where(
      and(
        eq(weightEntries.userId, userId),
        gte(weightEntries.entryDate, from),
        lte(weightEntries.entryDate, to)
      )
    );
  const val = result[0]?.average;
  return val != null ? Number(Number(val).toFixed(1)) : null;
}

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

  const conditions = [eq(weightEntries.userId, userId)];
  if (from) conditions.push(gte(weightEntries.entryDate, from));
  if (to) conditions.push(lte(weightEntries.entryDate, to));

  const where = and(...conditions);

  // Récupère la dernière entrée globale pour déterminer la période courante
  const latestGlobal = await db
    .select({ entry_date: weightEntries.entryDate })
    .from(weightEntries)
    .where(eq(weightEntries.userId, userId))
    .orderBy(desc(weightEntries.entryDate))
    .limit(1);

  const refDate = latestGlobal[0]?.entry_date
    ? new Date(latestGlobal[0].entry_date + "T12:00:00")
    : new Date();
  const periods = calculatePeriods(refDate);

  const [
    aggregates,
    minEntry,
    maxEntry,
    latestEntry,
    firstEntry,
    avgCurrentMonth,
    avgPreviousMonth,
    avgCurrentQuarter,
    avgPreviousQuarter,
    avgCurrentYear,
    avgPreviousYear,
  ] = await Promise.all([
    db
      .select({ count: count(), average: avg(weightEntries.weightKg) })
      .from(weightEntries)
      .where(where),
    db
      .select({ weight_kg: weightEntries.weightKg, entry_date: weightEntries.entryDate })
      .from(weightEntries)
      .where(where)
      .orderBy(asc(weightEntries.weightKg))
      .limit(1),
    db
      .select({ weight_kg: weightEntries.weightKg, entry_date: weightEntries.entryDate })
      .from(weightEntries)
      .where(where)
      .orderBy(desc(weightEntries.weightKg))
      .limit(1),
    db
      .select({ weight_kg: weightEntries.weightKg, entry_date: weightEntries.entryDate })
      .from(weightEntries)
      .where(where)
      .orderBy(desc(weightEntries.entryDate))
      .limit(1),
    db
      .select({ weight_kg: weightEntries.weightKg, entry_date: weightEntries.entryDate })
      .from(weightEntries)
      .where(where)
      .orderBy(asc(weightEntries.entryDate))
      .limit(1),
    getPeriodAvg(userId, periods.currentMonth.from, periods.currentMonth.to),
    getPeriodAvg(userId, periods.previousMonth.from, periods.previousMonth.to),
    getPeriodAvg(userId, periods.currentQuarter.from, periods.currentQuarter.to),
    getPeriodAvg(userId, periods.previousQuarter.from, periods.previousQuarter.to),
    getPeriodAvg(userId, periods.currentYear.from, periods.currentYear.to),
    getPeriodAvg(userId, periods.previousYear.from, periods.previousYear.to),
  ]);

  const totalCount = aggregates[0]?.count ?? 0;
  const averageRaw = aggregates[0]?.average;
  const average = averageRaw != null ? Number(Number(averageRaw).toFixed(1)) : null;

  const delta =
    latestEntry[0] && firstEntry[0]
      ? Number((latestEntry[0].weight_kg - firstEntry[0].weight_kg).toFixed(1))
      : null;

  return NextResponse.json({
    data: {
      count: totalCount,
      min: minEntry[0] ?? null,
      max: maxEntry[0] ?? null,
      average,
      latest: latestEntry[0] ?? null,
      delta,
      average_current_month: avgCurrentMonth,
      average_previous_month: avgPreviousMonth,
      average_current_quarter: avgCurrentQuarter,
      average_previous_quarter: avgPreviousQuarter,
      average_current_year: avgCurrentYear,
      average_previous_year: avgPreviousYear,
    },
  });
}
