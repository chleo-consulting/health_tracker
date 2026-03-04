import type { StatsResponse } from "@/types/index";

interface Props {
  stats: StatsResponse | null;
}

const MONTH_SHORT_FR = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month, 1); // gère les débordements (mois négatifs, > 11)
  return `${MONTH_SHORT_FR[d.getMonth()]}-${d.getFullYear()}`;
}

function quarterLabel(year: number, quarter: number): string {
  // quarter : 0-indexed (0=Q1)
  if (quarter < 0) return quarterLabel(year - 1, quarter + 4);
  return `Q${quarter + 1}-${year}`;
}

function periodLabels(latestDate: string | null | undefined) {
  const ref = latestDate ? new Date(latestDate + "T12:00:00") : new Date();
  const y = ref.getFullYear();
  const m = ref.getMonth(); // 0-indexed
  const q = Math.floor(m / 3); // 0-indexed
  return {
    currentMonth: monthLabel(y, m),
    previousMonth: monthLabel(y, m - 1),
    currentQuarter: quarterLabel(y, q),
    previousQuarter: quarterLabel(q === 0 ? y - 1 : y, q === 0 ? 3 : q - 1),
    currentYear: `${y}`,
    previousYear: `${y - 1}`,
  };
}

function fmt(v: number | null, decimals = 1): string {
  if (v === null) return "—";
  return v.toFixed(decimals);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">—</span>;
  const sign = value > 0 ? "+" : value < 0 ? "" : "±";
  const color = value < 0 ? "text-green-600" : value > 0 ? "text-red-600" : "text-gray-500";
  return <span className={color}>{sign}{value.toFixed(1)} kg</span>;
}

interface ComparativeCardProps {
  label: string;
  current: number | null;
  previous: number | null;
  currentLabel: string;
  previousLabel: string;
}

function ComparativeCard({ label, current, previous, currentLabel, previousLabel }: ComparativeCardProps) {
  const diff = current !== null && previous !== null ? current - previous : null;
  const arrow = diff === null ? null : diff < 0 ? "↓" : diff > 0 ? "↑" : "=";
  const color = diff === null ? "" : diff < 0 ? "text-green-600" : diff > 0 ? "text-red-600" : "text-gray-500";

  return (
    <div className="rounded-lg border border-t-2 border-t-peach-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-gray-400">{currentLabel}</p>
          <p className="text-lg font-semibold text-gray-900">{fmt(current)} kg</p>
        </div>
        {arrow && (
          <span className={`text-2xl font-bold ${color}`}>{arrow}</span>
        )}
        <div className="flex-1 text-right">
          <p className="text-xs text-gray-400">{previousLabel}</p>
          <p className="text-lg font-semibold text-gray-900">{fmt(previous)} kg</p>
        </div>
      </div>
    </div>
  );
}

export function StatsCards({ stats }: Props) {
  if (!stats) return null;

  const periods = periodLabels(stats.latest?.entry_date);

  return (
    <div className="flex flex-col gap-4">
      {/* Ligne 1 : stats globales */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border border-t-2 border-t-peach-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dernière pesée</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(stats.latest?.weight_kg ?? null)} kg</p>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(stats.latest?.entry_date ?? null)}</p>
        </div>
        <div className="rounded-lg border border-t-2 border-t-peach-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Minimum</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(stats.min?.weight_kg ?? null)} kg</p>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(stats.min?.entry_date ?? null)}</p>
        </div>
        <div className="rounded-lg border border-t-2 border-t-peach-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Maximum</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(stats.max?.weight_kg ?? null)} kg</p>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(stats.max?.entry_date ?? null)}</p>
        </div>
        <div className="rounded-lg border border-t-2 border-t-peach-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Moyenne</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(stats.average)} kg</p>
          <p className="text-xs text-gray-400 mt-0.5">{stats.count} pesées</p>
        </div>
        <div className="rounded-lg border border-t-2 border-t-peach-300 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Évolution</p>
          <p className="text-xl font-bold mt-1"><Delta value={stats.delta} /></p>
          <p className="text-xs text-gray-400 mt-0.5">depuis le début</p>
        </div>
      </div>

      {/* Ligne 2 : comparaisons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ComparativeCard
          label="Mois"
          current={stats.average_current_month}
          previous={stats.average_previous_month}
          currentLabel={periods.currentMonth}
          previousLabel={periods.previousMonth}
        />
        <ComparativeCard
          label="Trimestre"
          current={stats.average_current_quarter}
          previous={stats.average_previous_quarter}
          currentLabel={periods.currentQuarter}
          previousLabel={periods.previousQuarter}
        />
        <ComparativeCard
          label="Année"
          current={stats.average_current_year}
          previous={stats.average_previous_year}
          currentLabel={periods.currentYear}
          previousLabel={periods.previousYear}
        />
      </div>
    </div>
  );
}
