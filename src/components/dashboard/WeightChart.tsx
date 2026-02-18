"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { WeightEntry } from "@/types/index";

interface Props {
  entries: WeightEntry[];
  onPointClick?: (entry: WeightEntry) => void;
}

function fmtShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function fmtFull(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

interface TooltipPayload {
  payload: WeightEntry;
  value: number;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-md border bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-900">{fmtFull(entry.entry_date)}</p>
      <p className="text-peach-600">{entry.weight_kg} kg</p>
      {entry.notes && <p className="text-gray-500 mt-0.5 text-xs">{entry.notes}</p>}
    </div>
  );
};

export function WeightChart({ entries, onPointClick }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-lg border bg-white text-gray-400 text-sm">
        Aucune donnée à afficher.
      </div>
    );
  }

  // activeDot onClick reçoit (dotProps, event) où dotProps.payload est l'entrée
  const handleDotClick = (dotProps: { payload?: WeightEntry }) => {
    if (dotProps.payload) onPointClick?.(dotProps.payload);
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={entries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="entry_date"
            tickFormatter={fmtShort}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            minTickGap={20}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v} kg`}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="weight_kg"
            stroke="#FF7F51"
            strokeWidth={2}
            dot={{ r: 4, fill: "#FF7F51", strokeWidth: 0 }}
            activeDot={{
              r: 6,
              style: { cursor: "pointer" },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick: (dotProps: any) => handleDotClick(dotProps),
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
