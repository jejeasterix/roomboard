import { describe, expect, it, vi } from "vitest";
import type { TableGrid } from "./html-table";
import { createSheetReader, EMPTY_SHEET_MESSAGE, gridOf, SHEET_TOO_BIG_MESSAGE, SHEET_WORKER_TIMEOUT_MS, WORKER_FAILED_MESSAGE, workerErrorMessage, type WorkerLike } from "./sheet-reader";

class FakeWorker implements WorkerLike {
  onmessage: ((e: { readonly data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  posted: unknown[] = [];
  terminated = 0;
  postMessage(m: unknown): void {
    this.posted.push(m);
  }
  terminate(): void {
    this.terminated++;
  }
}
const G: TableGrid = { rows: 1, cols: 2, cells: ["a", "b"], merges: [], sourceRows: 1, sourceCols: 2, cutCells: false };
const blob = () => new Blob([new Uint8Array([0x50, 0x4b, 3, 4])]);

describe("lecteur de classeur en Worker (F28)", () => {
  it("un Worker par lecture, octets envoyés, arrêté après la réponse", async () => {
    const w = new FakeWorker();
    const spawn = vi.fn(() => w);
    const p = createSheetReader(spawn).read(blob());
    await vi.waitFor(() => expect(w.posted).toHaveLength(1));
    expect(w.posted[0]).toEqual({ bytes: new Uint8Array([0x50, 0x4b, 3, 4]) });
    w.onmessage?.({ data: { grid: G } });
    await expect(p).resolves.toEqual(G);
    expect([spawn.mock.calls.length, w.terminated]).toEqual([1, 1]);
  });

  it("erreur rendue par le Worker : rejet avec son message, Worker arrêté", async () => {
    const w = new FakeWorker();
    const p = createSheetReader(() => w).read(blob());
    await vi.waitFor(() => expect(w.posted).toHaveLength(1));
    w.onmessage?.({ data: { error: EMPTY_SHEET_MESSAGE } });
    await expect(p).rejects.toThrow(EMPTY_SHEET_MESSAGE);
    expect(w.terminated).toBe(1);
  });

  it("onerror du Worker (panic Wasm) : rejet, Worker arrêté ; la lecture suivante a son propre Worker (DAB4)", async () => {
    const workers = [new FakeWorker(), new FakeWorker()];
    let n = 0;
    const reader = createSheetReader(() => workers[n++] ?? new FakeWorker());
    const p = reader.read(blob());
    await vi.waitFor(() => expect(workers[0]?.posted).toHaveLength(1));
    workers[0]?.onerror?.(new Error("unreachable"));
    await expect(p).rejects.toThrow(WORKER_FAILED_MESSAGE);
    expect(workers[0]?.terminated).toBe(1);
    const q = reader.read(blob());
    await vi.waitFor(() => expect(workers[1]?.posted).toHaveLength(1));
    workers[1]?.onmessage?.({ data: { grid: G } });
    await expect(q).resolves.toEqual(G);
  });

  it("réponse mal formée : rejet", async () => {
    const w = new FakeWorker();
    const p = createSheetReader(() => w).read(blob());
    await vi.waitFor(() => expect(w.posted).toHaveLength(1));
    w.onmessage?.({ data: { grid: { rows: 1, cols: 1, cells: [] } } });
    await expect(p).rejects.toThrow(WORKER_FAILED_MESSAGE);
  });

  it("gridOf : fusions en quadruplets, dimensions de la source, textes coupés", () => {
    const freed: number[] = [];
    const g = gridOf({
      rows: () => 2, cols: () => 2, cells: () => ["a", "", "c", "d"], merges: () => new Uint32Array([0, 0, 1, 2]),
      source_rows: () => 70, source_cols: () => 6, cut_cells: () => true, free: () => freed.push(1),
    });
    expect(g).toEqual({ rows: 2, cols: 2, cells: ["a", "", "c", "d"], merges: [{ row: 0, col: 0, rows: 1, cols: 2 }], sourceRows: 70, sourceCols: 6, cutCells: true });
    expect(freed).toEqual([]);
  });
});

describe("délai d'arrêt et erreurs du Worker (constat T13)", () => {
  it("Worker muet : arrêté après SHEET_WORKER_TIMEOUT_MS (60 s), rejet WORKER_FAILED_MESSAGE", async () => {
    vi.useFakeTimers();
    try {
      const w = new FakeWorker();
      // `arrayBuffer` résolu en microtâche : l'horloge simulée n'avance pas avant le lancement du Worker (`vi.waitFor`
      // l'avancerait à chaque essai).
      const fast = { arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 3, 4]).buffer } as unknown as Blob;
      const out = createSheetReader(() => w).read(fast).then(() => null, (e: unknown) => e);
      await vi.advanceTimersByTimeAsync(0);
      expect(w.posted).toHaveLength(1);
      expect(SHEET_WORKER_TIMEOUT_MS).toBe(60_000);
      await vi.advanceTimersByTimeAsync(SHEET_WORKER_TIMEOUT_MS - 1);
      expect(w.terminated).toBe(0);
      await vi.advanceTimersByTimeAsync(1);
      expect(w.terminated).toBe(1);
      expect(await out).toEqual(new Error(WORKER_FAILED_MESSAGE));
    } finally {
      vi.useRealTimers();
    }
  });

  it("réponse avant le délai : minuterie retirée, Worker arrêté une seule fois", async () => {
    vi.useFakeTimers();
    try {
      const w = new FakeWorker();
      const p = createSheetReader(() => w).read(blob());
      await vi.waitFor(() => expect(w.posted).toHaveLength(1));
      w.onmessage?.({ data: { grid: G } });
      await expect(p).resolves.toEqual(G);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(SHEET_WORKER_TIMEOUT_MS);
      expect(w.terminated).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("panique Wasm (RuntimeError « unreachable ») ou erreur inconnue : WORKER_FAILED_MESSAGE ; messages de SheetError gardés", () => {
    expect(workerErrorMessage(new WebAssembly.RuntimeError("unreachable"))).toBe(WORKER_FAILED_MESSAGE);
    expect(workerErrorMessage("unreachable")).toBe(WORKER_FAILED_MESSAGE);
    expect(workerErrorMessage(new Error("module des classeurs indisponible"))).toBe(WORKER_FAILED_MESSAGE);
    expect(workerErrorMessage(undefined)).toBe(WORKER_FAILED_MESSAGE);
    expect(workerErrorMessage(new Error(EMPTY_SHEET_MESSAGE))).toBe(EMPTY_SHEET_MESSAGE);
    expect(workerErrorMessage(SHEET_TOO_BIG_MESSAGE)).toBe(SHEET_TOO_BIG_MESSAGE);
    expect(workerErrorMessage(new Error("classeur illisible : invalid Zip archive"))).toBe("classeur illisible : invalid Zip archive");
  });
});
