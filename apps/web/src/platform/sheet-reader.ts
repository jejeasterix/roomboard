/**
 * Lecture d'un classeur hors de l'instance qui enregistre (C10b, F28, DAB4) : un Worker jetable par lecture charge sa
 * propre instance du module `formats`, lit la première feuille (`SheetReader`), répond `{ grid }` ou `{ error }`, puis
 * est arrêté — après la réponse, l'erreur ou une panique Wasm (`onerror`). Un `panic` de `calamine` (`panic = abort` en
 * wasm32) ne casse donc jamais l'instance de la page qui enregistre le `.roomboard` (HR6). Le Worker est créé par
 * l'amorce (`main.ts`, PC20) : aucun test ne résout `sheet-worker.ts` ni `src/wasm-formats/`.
 */
import type { GridMerge, TableGrid } from "./html-table";

export const EMPTY_SHEET_MESSAGE = "la première feuille est vide";
export const SHEET_TOO_BIG_MESSAGE = "classeur trop gros pour un import en valeurs";
export const WORKER_FAILED_MESSAGE = "lecture du classeur interrompue";

/** Forme d'un Worker utile ici (le vrai `Worker` du navigateur, un faux dans les tests). */
export interface WorkerLike {
  onmessage: ((e: { readonly data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
  terminate(): void;
}
export interface SheetReader {
  read(file: Blob): Promise<TableGrid>;
}
/** Forme du lecteur généré par wasm-bindgen (`SheetReader` de `roomboard-formats-wasm`, T3). */
export interface SheetBinding {
  rows(): number;
  cols(): number;
  cells(): string[];
  merges(): Uint32Array;
  source_rows(): number;
  source_cols(): number;
  cut_cells(): boolean;
  free(): void;
}

/** Grille d'un lecteur ouvert ; fusions bout à bout en quadruplets `[ligne, colonne, lignes, colonnes]`. */
export function gridOf(r: SheetBinding): TableGrid {
  const flat = Array.from(r.merges());
  const merges: GridMerge[] = [];
  for (let i = 0; i + 3 < flat.length; i += 4) {
    merges.push({ row: flat[i] ?? 0, col: flat[i + 1] ?? 0, rows: flat[i + 2] ?? 1, cols: flat[i + 3] ?? 1 });
  }
  return { rows: r.rows(), cols: r.cols(), cells: r.cells(), merges, sourceRows: r.source_rows(), sourceCols: r.source_cols(), cutCells: r.cut_cells() };
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** Réponse du Worker contrôlée (même prudence que `toTable`). */
export function isTableGrid(v: unknown): v is TableGrid {
  if (typeof v !== "object" || v === null) return false;
  const g = v as Record<string, unknown>;
  const cells = g["cells"];
  const merges = g["merges"];
  return (
    isCount(g["rows"]) && isCount(g["cols"]) && Array.isArray(cells) && cells.length === g["rows"] * g["cols"] &&
    cells.every((c) => typeof c === "string") && Array.isArray(merges) &&
    merges.every((m) => typeof m === "object" && m !== null && ["row", "col", "rows", "cols"].every((k) => isCount((m as Record<string, unknown>)[k]))) &&
    isCount(g["sourceRows"]) && isCount(g["sourceCols"]) && typeof g["cutCells"] === "boolean"
  );
}

/**
 * Un Worker neuf par lecture, jamais gardé (DAB4) : à l'inverse de `createPageCodec`, qui garde son instance jusqu'au
 * rechargement (HR6). Même port que le codec de la page (`read(file: Blob)`, octets copiés une fois), arrêté dans
 * `finally` comme le lecteur y est libéré.
 */
export function createSheetReader(spawn: () => WorkerLike): SheetReader {
  return {
    async read(file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const worker = spawn();
      try {
        return await new Promise<TableGrid>((resolve, reject) => {
          worker.onmessage = (e) => {
            const d = e.data;
            const g = typeof d === "object" && d !== null ? (d as { grid?: unknown }).grid : undefined;
            const err = typeof d === "object" && d !== null ? (d as { error?: unknown }).error : undefined;
            if (isTableGrid(g)) resolve(g);
            else reject(new Error(typeof err === "string" ? err : WORKER_FAILED_MESSAGE));
          };
          worker.onerror = () => reject(new Error(WORKER_FAILED_MESSAGE));
          worker.postMessage({ bytes }, [bytes.buffer]);
        });
      } finally {
        worker.terminate();
      }
    },
  };
}
