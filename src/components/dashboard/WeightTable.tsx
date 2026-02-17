"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import type { WeightEntry } from "@/types/index";

interface Props {
  entries: WeightEntry[];
  onEdit: (e: WeightEntry) => void;
  onDelete: (e: WeightEntry) => void;
}

type SortField = "entry_date" | "weight_kg";
type SortDir = "asc" | "desc";

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const PAGE_SIZES = [10, 25, 50] as const;

export function WeightTable({ entries, onEdit, onDelete }: Props) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<10 | 25 | 50>(10);
  const [sortField, setSortField] = useState<SortField>("entry_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [entries, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / limit));
  const safePage = Math.min(page, totalPages);
  const pageEntries = sorted.slice((safePage - 1) * limit, safePage * limit);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th
                className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                onClick={() => toggleSort("entry_date")}
              >
                Date <SortIcon field="entry_date" />
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                onClick={() => toggleSort("weight_kg")}
              >
                Poids <SortIcon field="weight_kg" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Notes</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Aucune pesée dans cette période.
                </td>
              </tr>
            ) : (
              pageEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900">{fmtDate(entry.entry_date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.weight_kg} kg</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{entry.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(entry)}
                        aria-label="Modifier"
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDelete(entry)}
                        aria-label="Supprimer"
                        className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>Lignes par page :</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value) as 10 | 25 | 50); setPage(1); }}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>{sorted.length} entrée{sorted.length !== 1 ? "s" : ""}</span>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              ‹
            </Button>
            <span className="px-2 py-1">{safePage} / {totalPages}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
