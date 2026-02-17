import { describe, expect, it, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import type { StatsResponse } from "@/types/index";

afterEach(cleanup);

const baseStats: StatsResponse = {
  count: 3,
  min: { weight_kg: 70.0, entry_date: "2026-01-01" },
  max: { weight_kg: 75.0, entry_date: "2026-01-15" },
  average: 72.3,
  latest: { weight_kg: 72.0, entry_date: "2026-02-01" },
  delta: 2.0,
  average_last_month: null,
  average_previous_month: null,
  average_last_quarter: null,
  average_previous_quarter: null,
  average_last_year: null,
  average_previous_year: null,
};

describe("StatsCards", () => {
  it("retourne null si stats est null", () => {
    const { container } = render(<StatsCards stats={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("affiche les valeurs de dernière pesée, min, max et moyenne", () => {
    render(<StatsCards stats={baseStats} />);
    expect(screen.getAllByText("72.0 kg").length).toBeGreaterThan(0);
    expect(screen.getAllByText("70.0 kg").length).toBeGreaterThan(0);
    expect(screen.getAllByText("75.0 kg").length).toBeGreaterThan(0);
    expect(screen.getAllByText("72.3 kg").length).toBeGreaterThan(0);
  });

  it("affiche — pour les valeurs nulles", () => {
    const stats: StatsResponse = {
      ...baseStats,
      min: null,
      max: null,
      average: null,
      latest: null,
      delta: null,
    };
    render(<StatsCards stats={stats} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("affiche le delta positif en rouge", () => {
    render(<StatsCards stats={{ ...baseStats, delta: 2.0 }} />);
    const deltaEl = screen.getByText("+2.0 kg");
    expect(deltaEl).toHaveClass("text-red-600");
  });

  it("affiche le delta négatif en vert", () => {
    render(<StatsCards stats={{ ...baseStats, delta: -1.5 }} />);
    const deltaEl = screen.getByText("-1.5 kg");
    expect(deltaEl).toHaveClass("text-green-600");
  });

  it("affiche la flèche ↓ quand le mois actuel est inférieur au précédent", () => {
    const stats: StatsResponse = {
      ...baseStats,
      average_last_month: 70.0,
      average_previous_month: 72.0,
    };
    render(<StatsCards stats={stats} />);
    expect(screen.getByText("↓")).toBeTruthy();
  });

  it("affiche la flèche ↑ quand le mois actuel est supérieur au précédent", () => {
    const stats: StatsResponse = {
      ...baseStats,
      average_last_month: 73.0,
      average_previous_month: 71.0,
    };
    render(<StatsCards stats={stats} />);
    expect(screen.getByText("↑")).toBeTruthy();
  });
});
