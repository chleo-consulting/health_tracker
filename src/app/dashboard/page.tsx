"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import type { WeightEntry, StatsResponse, PaginationMeta } from "@/types/index";

type Period = "3m" | "6m" | "1y" | "all";

const periodLabels: Record<Period, string> = {
  "3m": "3 mois",
  "6m": "6 mois",
  "1y": "1 an",
  all: "Tout",
};

function getPeriodDates(period: Period): { dateFrom?: string; dateTo?: string } {
  if (period === "all") return {};
  const now = new Date();
  const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);
  return { dateFrom: from.toISOString().slice(0, 10) };
}

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("3m");
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { dateFrom, dateTo } = getPeriodDates(period);
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const qs = params.toString();

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/entries${qs ? `?${qs}` : ""}`).then((r) => r.json()),
      fetch(`/api/entries/stats${qs ? `?${qs}` : ""}`).then((r) => r.json()),
    ])
      .then(([entriesData, statsData]: [{ data: WeightEntry[]; meta: PaginationMeta }, StatsResponse]) => {
        setEntries(entriesData.data ?? []);
        setStats(statsData);
      })
      .catch(() => setError("Erreur lors du chargement des données."))
      .finally(() => setLoading(false));
  }, [period]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Weight Tracker</h1>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Se déconnecter
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 flex flex-col gap-8">
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Section stats */}
        <section aria-label="Statistiques">
          {/* TODO Step 8 : <StatsCards stats={stats} /> */}
          {loading && <p className="text-sm text-gray-500">Chargement des statistiques…</p>}
        </section>

        {/* Section graphique */}
        <section aria-label="Graphique d'évolution">
          <div className="mb-4 flex gap-2">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "primary" : "secondary"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
          {/* TODO Step 8 : <WeightChart entries={entries} /> */}
          {loading && <p className="text-sm text-gray-500">Chargement du graphique…</p>}
        </section>

        {/* Section tableau */}
        <section aria-label="Liste des pesées">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Pesées</h2>
            <Button size="sm" onClick={() => {/* TODO Step 8 */}}>
              Ajouter une pesée
            </Button>
          </div>
          {/* TODO Step 8 : <WeightTable entries={entries} /> */}
          {loading && <p className="text-sm text-gray-500">Chargement des données…</p>}
        </section>
      </main>
    </div>
  );
}
