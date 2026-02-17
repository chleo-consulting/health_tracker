import { describe, expect, it, mock, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { WeightEntry } from "@/types/index";

afterEach(cleanup);

// Mocker recharts avant l'import du composant
mock.module("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({
    activeDot,
  }: {
    activeDot?: { onClick?: (p: { payload: WeightEntry }) => void };
  }) => {
    const entry: WeightEntry = {
      id: 1,
      entry_date: "2026-01-15",
      weight_kg: 75.0,
      notes: null,
      created_at: "2026-01-15T00:00:00",
    };
    return (
      <button
        data-testid="chart-dot"
        onClick={() => activeDot?.onClick?.({ payload: entry })}
      />
    );
  },
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const { WeightChart } = await import("@/components/dashboard/WeightChart");

const sampleEntries: WeightEntry[] = [
  { id: 1, entry_date: "2026-01-15", weight_kg: 75.0, notes: null, created_at: "2026-01-15T00:00:00" },
  { id: 2, entry_date: "2026-01-20", weight_kg: 74.5, notes: "note", created_at: "2026-01-20T00:00:00" },
];

describe("WeightChart", () => {
  it("affiche le message vide si entries est vide", () => {
    render(<WeightChart entries={[]} />);
    expect(screen.getByText("Aucune donnée à afficher.")).toBeTruthy();
  });

  it("se rend sans erreur avec des données valides", () => {
    const { container } = render(<WeightChart entries={sampleEntries} />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByTestId("line-chart")).toBeTruthy();
  });

  it("appelle onPointClick au clic sur un point", () => {
    const onPointClick = mock(() => {});
    render(<WeightChart entries={sampleEntries} onPointClick={onPointClick} />);

    fireEvent.click(screen.getByTestId("chart-dot"));
    expect(onPointClick).toHaveBeenCalledTimes(1);
    expect(onPointClick).toHaveBeenCalledWith(
      expect.objectContaining({ entry_date: "2026-01-15", weight_kg: 75.0 })
    );
  });
});
