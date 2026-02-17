"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { WeightEntry } from "@/types/index";

interface Props {
  entry: WeightEntry;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function DeleteConfirmDialog({ entry, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Erreur lors de la suppression.");
        return;
      }
      await onConfirm();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onCancel} title="Confirmer la suppression">
      <div className="flex flex-col gap-4">
        <p className="text-gray-700">
          Supprimer la pesée du{" "}
          <span className="font-semibold">{fmtDate(entry.entry_date)}</span>{" "}
          (<span className="font-semibold">{entry.weight_kg} kg</span>) ?
        </p>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={loading}>
            {loading ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
