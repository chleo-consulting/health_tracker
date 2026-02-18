"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { WeightChart } from "@/components/dashboard/WeightChart";
import { WeightTable } from "@/components/dashboard/WeightTable";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { EntryForm } from "@/components/entries/EntryForm";
import { DeleteConfirmDialog } from "@/components/entries/DeleteConfirmDialog";
import type { WeightEntry, StatsResponse, PaginationMeta } from "@/types/index";

export default function DashboardPage() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<WeightEntry | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const statsParams = new URLSearchParams();
    if (dateFrom) statsParams.set("from", dateFrom);
    if (dateTo) statsParams.set("to", dateTo);
    const statsQs = statsParams.toString();

    // Entries: toujours toutes, ordre chronologique, pour le graphique
    const entriesParams = new URLSearchParams({ sort: "asc", limit: "100" });
    if (dateFrom) entriesParams.set("from", dateFrom);
    if (dateTo) entriesParams.set("to", dateTo);
    const entriesQs = entriesParams.toString();

    try {
      const [entriesRes, statsRes] = await Promise.all([
        fetch(`/api/entries?${entriesQs}`),
        fetch(`/api/entries/stats${statsQs ? `?${statsQs}` : ""}`),
      ]);
      const entriesData: { data: WeightEntry[]; meta: PaginationMeta } = await entriesRes.json();
      const statsData: { data: StatsResponse } = await statsRes.json();
      setEntries(entriesData.data ?? []);
      setStats(statsData.data ?? null);
    } catch {
      setError("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRangeChange = (from?: string, to?: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const openAdd = () => {
    setEditingEntry(null);
    setShowEntryForm(true);
  };

  const openEdit = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setShowEntryForm(true);
  };

  const closeEntryForm = () => {
    setShowEntryForm(false);
    setEditingEntry(null);
  };

  const handleEntrySuccess = () => {
    closeEntryForm();
    fetchData();
  };

  const handleDeleteConfirm = async () => {
    setDeletingEntry(null);
    await fetchData();
  };

  const handleExport = async () => {
    const res = await fetch("/api/entries/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const fileMatch = disposition.match(/filename="([^"]+)"/);
    a.href = url;
    a.download = fileMatch?.[1] ?? "weight-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/entries/import", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      setImportMessage(`Erreur : ${data.error?.message ?? "Import échoué"}`);
    } else {
      setImportMessage(`Import terminé : ${data.imported} ajoutée(s), ${data.skipped} ignorée(s).`);
      await fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-peach-50">
      <header className="border-b border-peach-100 bg-gradient-to-r from-peach-50 to-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/icon.svg" alt="Weight Tracker" width={40} height={40} />
          <span className="text-xl font-bold text-gray-900">Weight Tracker</span>
        </div>
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
          {loading ? (
            <p className="text-sm text-gray-500">Chargement des statistiques…</p>
          ) : (
            <StatsCards stats={stats} />
          )}
        </section>

        {/* Section graphique */}
        <section aria-label="Graphique d'évolution">
          <div className="mb-4">
            <DateRangeFilter onRangeChange={handleRangeChange} />
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Chargement du graphique…</p>
          ) : (
            <WeightChart
              entries={entries}
              onPointClick={(entry) => openEdit(entry)}
            />
          )}
        </section>

        {/* Section tableau */}
        <section aria-label="Liste des pesées">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Pesées</h2>
            <Button size="sm" onClick={openAdd}>
              Ajouter une pesée
            </Button>
          </div>
          {importMessage && (
            <p className="mb-3 rounded-md bg-peach-50 px-4 py-2 text-sm text-peach-700">
              {importMessage}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-gray-500">Chargement des données…</p>
          ) : (
            <WeightTable
              entries={entries}
              onEdit={openEdit}
              onDelete={(entry) => setDeletingEntry(entry)}
              onExport={handleExport}
              onImport={handleImport}
            />
          )}
        </section>
      </main>

      {/* Modal ajout / édition */}
      <Modal
        isOpen={showEntryForm}
        onClose={closeEntryForm}
        title={editingEntry ? "Modifier la pesée" : "Ajouter une pesée"}
      >
        <EntryForm
          entry={editingEntry ?? undefined}
          onSuccess={handleEntrySuccess}
          onCancel={closeEntryForm}
        />
      </Modal>

      {/* Dialog suppression */}
      {deletingEntry && (
        <DeleteConfirmDialog
          entry={deletingEntry}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingEntry(null)}
        />
      )}
    </div>
  );
}
