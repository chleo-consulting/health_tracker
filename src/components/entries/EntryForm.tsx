"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { entrySchema, type EntryInput } from "@/lib/validations/entry.schema";
import type { WeightEntry } from "@/types/index";

interface Props {
  entry?: WeightEntry;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EntryForm({ entry, onSuccess, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntryInput>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      entry_date: entry?.entry_date ?? today,
      weight_kg: entry?.weight_kg ?? undefined,
      notes: entry?.notes ?? "",
    },
  });

  const onSubmit = async (data: EntryInput) => {
    setServerError(null);
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Une erreur est survenue.");
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <Input
        label="Date"
        type="date"
        max={today}
        error={errors.entry_date?.message}
        {...register("entry_date")}
      />

      <Input
        label="Poids (kg)"
        type="number"
        step="0.1"
        min="3"
        max="150"
        placeholder="ex : 75.3"
        error={errors.weight_kg?.message}
        {...register("weight_kg", { valueAsNumber: true })}
      />

      <Input
        label="Notes (optionnel)"
        placeholder="Remarques…"
        error={errors.notes?.message}
        {...register("notes")}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement…" : entry ? "Mettre à jour" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
