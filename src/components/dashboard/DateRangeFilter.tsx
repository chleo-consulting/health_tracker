"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Preset = "3m" | "6m" | "1y" | "all";

const presets: { value: Preset; label: string }[] = [
  { value: "3m", label: "3 mois" },
  { value: "6m", label: "6 mois" },
  { value: "1y", label: "1 an" },
  { value: "all", label: "Tout" },
];

function presetToDates(preset: Preset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const months = preset === "3m" ? 3 : preset === "6m" ? 6 : 12;
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);
  return { from: from.toISOString().slice(0, 10) };
}

interface Props {
  onRangeChange: (from?: string, to?: string) => void;
}

export function DateRangeFilter({ onRangeChange }: Props) {
  const [activePreset, setActivePreset] = useState<Preset | null>("3m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const selectPreset = (preset: Preset) => {
    setActivePreset(preset);
    setCustomFrom("");
    setCustomTo("");
    const { from, to } = presetToDates(preset);
    onRangeChange(from, to);
  };

  const applyCustom = () => {
    setActivePreset(null);
    onRangeChange(customFrom || undefined, customTo || undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button
          key={p.value}
          variant={activePreset === p.value ? "primary" : "secondary"}
          size="sm"
          onClick={() => selectPreset(p.value)}
        >
          {p.label}
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-2">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => { setCustomFrom(e.target.value); setActivePreset(null); }}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Date de début"
        />
        <span className="text-gray-400 text-sm">→</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => { setCustomTo(e.target.value); setActivePreset(null); }}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Date de fin"
        />
        <Button size="sm" variant="secondary" onClick={applyCustom}>
          Appliquer
        </Button>
      </div>
    </div>
  );
}
