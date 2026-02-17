import { describe, expect, it, mock, afterEach } from "bun:test";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import type { WeightEntry } from "@/types/index";

const { EntryForm } = await import("@/components/entries/EntryForm");

const today = new Date().toISOString().slice(0, 10);

const existingEntry: WeightEntry = {
  id: 1,
  entry_date: "2026-01-15",
  weight_kg: 75.0,
  notes: "note existante",
  created_at: "2026-01-15T00:00:00",
};

const originalFetch = global.fetch;

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

function mockFetchSuccess(status = 201) {
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ data: { id: 1, entry_date: today, weight_kg: 75.0, notes: null, created_at: "" } }),
        { status }
      )
    )
  );
}

function mockFetchError() {
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 })
    )
  );
}

/** Simule la saisie dans un input numérique en utilisant le setter natif. */
function setNativeValue(element: HTMLElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  nativeSetter?.call(element, value);
  fireEvent.input(element, { target: { value } });
  fireEvent.change(element, { target: { value } });
}

describe("EntryForm", () => {
  it("affiche les champs Date, Poids et Notes", () => {
    render(<EntryForm onSuccess={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText("Date")).toBeTruthy();
    expect(screen.getByLabelText("Poids (kg)")).toBeTruthy();
    expect(screen.getByLabelText("Notes (optionnel)")).toBeTruthy();
  });

  it("pré-remplit la date avec aujourd'hui en mode création", () => {
    render(<EntryForm onSuccess={() => {}} onCancel={() => {}} />);
    const dateInput = screen.getByLabelText("Date") as HTMLInputElement;
    expect(dateInput.value).toBe(today);
  });

  it("pré-remplit les champs avec les valeurs existantes en mode édition", () => {
    render(<EntryForm entry={existingEntry} onSuccess={() => {}} onCancel={() => {}} />);
    const dateInput = screen.getByLabelText("Date") as HTMLInputElement;
    const weightInput = screen.getByLabelText("Poids (kg)") as HTMLInputElement;
    const notesInput = screen.getByLabelText("Notes (optionnel)") as HTMLInputElement;
    expect(dateInput.value).toBe("2026-01-15");
    expect(Number(weightInput.value)).toBe(75.0);
    expect(notesInput.value).toBe("note existante");
  });

  it("appelle fetch POST /api/entries à la soumission valide", async () => {
    mockFetchSuccess(201);
    const { container } = render(<EntryForm onSuccess={() => {}} onCancel={() => {}} />);

    setNativeValue(screen.getByLabelText("Poids (kg)"), "75");
    await act(async () => {
      fireEvent.submit(container.querySelector("form")!);
    });

    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof mock>).mock.calls.length).toBe(1);
    });
    const [url, options] = (global.fetch as ReturnType<typeof mock>).mock.calls[0];
    expect(url).toBe("/api/entries");
    expect((options as RequestInit)?.method).toBe("POST");
  });

  it("appelle onSuccess après une réponse réussie", async () => {
    mockFetchSuccess(201);
    const onSuccess = mock(() => {});
    const { container } = render(<EntryForm onSuccess={onSuccess} onCancel={() => {}} />);

    setNativeValue(screen.getByLabelText("Poids (kg)"), "75");
    await act(async () => {
      fireEvent.submit(container.querySelector("form")!);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("affiche l'erreur serveur en cas d'échec", async () => {
    mockFetchError();
    const { container } = render(<EntryForm onSuccess={() => {}} onCancel={() => {}} />);

    setNativeValue(screen.getByLabelText("Poids (kg)"), "75");
    await act(async () => {
      fireEvent.submit(container.querySelector("form")!);
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText("Erreur serveur")).toBeTruthy();
    });
  });
});
