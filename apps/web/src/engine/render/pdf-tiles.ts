/**
 * Fond `pdf-page` par tuiles (C12, PF13, DAPF2) : la scène reste synchrone ; `paint` dessine ce qui est en cache (paliers
 * plus grossiers d'abord, puis le palier courant : l'image la plus fine recouvre) et demande les tuiles visibles qui
 * manquent. Palier p = 2^⌈log2(zoom × dpr)⌉ borné à [1/4, 8] (pixels d'écran par unité monde) ; tuiles de 1024 px ; clé
 * `asset · page · p · colonne · rang` ; 2 rendus au plus, ceux qui sortent de la vue annulés. Un `PdfFile` par asset,
 * ouvert au premier besoin (jamais pour une vue vide), détruit à `dispose`. Une instance par onglet, un `paint` par image ; `ready`
 * (branché sur `engine.redraw()`) est appelé à chaque arrivée, comme `image-cache.ts`.
 *
 * Éviction (LRU, bitmaps fermés) : une tuile de l'image en cours (visible au palier courant, au dernier `paint`) n'est
 * jamais évincée, et la capacité est max(32, tuiles visibles + 8). Une LRU fixe de 32 serait plus petite que la vue d'un
 * écran 5K (dpr 2, palier 4 : jusqu'à 54 tuiles) : tuile prête, redessin, éviction d'une visible, sans fin, et le fond
 * n'arriverait jamais à « pret ». La vue réduite, le cache revient à 32.
 *
 * `dispose` (onglet désactivé ou fermé : board-session le fait puis recrée le cache au dessin suivant) libère tout,
 * bitmaps et PDF, et ferme aussitôt ce qui arrive après.
 */
import type { Bounds } from "../../core/api";
import type { Camera } from "../camera";
import { visibleGridRect } from "../page";
import type { PdfFile, TileBitmap, TileRect } from "./pdf-port";

export const TILE_PX = 1024;
export const LEVELS: readonly number[] = [0.25, 0.5, 1, 2, 4, 8];
export const MAX_TILES = 32;
/** Tuiles gardées au-delà de l'image en cours quand elle dépasse `MAX_TILES` (paliers plus grossiers, retour arrière). */
export const TILE_MARGIN = 8;
export const MAX_RENDERS = 2;

export type TileState = "attente" | "pret" | "echec";
/** Ce que le cache lit d'un fond : un `BackdropView` du cœur s'y branche tel quel (PC3). */
export interface PdfBackdrop {
  readonly asset: string;
  readonly page: number | null;
  readonly w: number | null;
  readonly rect: Bounds | null;
}
export interface TileView {
  readonly w: number;
  readonly h: number;
  readonly dpr: number;
}
export interface PdfTile {
  readonly key: string;
  readonly px: TileRect;
  readonly world: Bounds;
}
export interface PdfTiles {
  paint(ctx: CanvasRenderingContext2D, backdrop: PdfBackdrop, camera: Camera, view: TileView): TileState;
  /** Onglet fermé ou désactivé (la session recrée le cache au dessin suivant) : rendus annulés, bitmaps fermés, PDF
   *  détruits, et tout ce qui arrive ensuite est fermé ou détruit aussitôt. */
  dispose(): void;
}

const MIN_LEVEL = LEVELS[0] ?? 0.25;
const MAX_LEVEL = LEVELS[LEVELS.length - 1] ?? 8;

export function levelFor(zoom: number, dpr: number): number {
  const z = zoom * dpr;
  if (!Number.isFinite(z) || !(z > 0)) return 1;
  // Marge de 1e-9 : un zoom de 2 tout juste reste au palier 2 malgré l'arrondi de log2.
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, 2 ** Math.ceil(Math.log2(z) - 1e-9)));
}

/** Tuiles du palier `level` qui recoupent `visible` (monde), en ordre de lecture ; la dernière colonne et le dernier
 *  rang sont coupés au bord de la page rendue (taille arrondie au pixel supérieur). */
export function tilesFor(rect: Bounds, level: number, visible: Bounds, prefix: string): PdfTile[] {
  const wpx = Math.ceil((rect.x1 - rect.x0) * level);
  const hpx = Math.ceil((rect.y1 - rect.y0) * level);
  const x0 = Math.max(0, (visible.x0 - rect.x0) * level);
  const x1 = Math.min(wpx, (visible.x1 - rect.x0) * level);
  const y0 = Math.max(0, (visible.y0 - rect.y0) * level);
  const y1 = Math.min(hpx, (visible.y1 - rect.y0) * level);
  if (!(x1 > x0) || !(y1 > y0)) return [];
  const out: PdfTile[] = [];
  for (let r = Math.floor(y0 / TILE_PX); r <= Math.ceil(y1 / TILE_PX) - 1; r++) {
    for (let c = Math.floor(x0 / TILE_PX); c <= Math.ceil(x1 / TILE_PX) - 1; c++) {
      const px = { x: c * TILE_PX, y: r * TILE_PX, w: Math.min(TILE_PX, wpx - c * TILE_PX), h: Math.min(TILE_PX, hpx - r * TILE_PX) };
      out.push({
        key: `${prefix}|${level}|${c}|${r}`,
        px,
        world: { x0: rect.x0 + px.x / level, y0: rect.y0 + px.y / level, x1: rect.x0 + (px.x + px.w) / level, y1: rect.y0 + (px.y + px.h) / level },
      });
    }
  }
  return out;
}

type FileEntry = { readonly state: "pending" } | { readonly state: "ready"; readonly file: PdfFile } | { readonly state: "failed" };

const why = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const NONE: ReadonlySet<string> = new Set();

export function createPdfTiles(open: (asset: string) => Promise<PdfFile> | null, ready: () => void): PdfTiles {
  const files = new Map<string, FileEntry>();
  /** Ordre d'insertion = ordre d'usage (LRU) : `take` remet une tuile servie en dernier. */
  const cache = new Map<string, TileBitmap>();
  const inflight = new Map<string, AbortController>();
  const failed = new Set<string>();
  /** Tuiles de l'image en cours (palier courant, dernier `paint`) : jamais évincées. */
  let current: ReadonlySet<string> = NONE;
  let disposed = false;

  const fileFor = (asset: string): FileEntry => {
    const hit = files.get(asset);
    if (hit !== undefined) return hit;
    const pending = open(asset);
    if (pending === null) {
      const gone: FileEntry = { state: "failed" };
      files.set(asset, gone);
      return gone;
    }
    const entry: FileEntry = { state: "pending" };
    files.set(asset, entry);
    pending.then(
      (file) => {
        if (disposed) {
          file.destroy();
          return;
        }
        files.set(asset, { state: "ready", file });
        ready();
      },
      (e: unknown) => {
        if (disposed) return;
        files.set(asset, { state: "failed" });
        console.warn(`RoomBoard : PDF ${asset} illisible (${why(e)})`);
        ready();
      },
    );
    return entry;
  };
  const take = (key: string): TileBitmap | undefined => {
    const b = cache.get(key);
    if (b !== undefined) {
      cache.delete(key);
      cache.set(key, b);
    }
    return b;
  };
  /** Évince les plus anciennes hors de l'image en cours jusqu'à la capacité max(32, visibles + marge). */
  const trim = (): void => {
    const capacity = Math.max(MAX_TILES, current.size + TILE_MARGIN);
    if (cache.size <= capacity) return;
    for (const [k, b] of cache) {
      if (cache.size <= capacity) break;
      if (current.has(k)) continue;
      b.close?.();
      cache.delete(k);
    }
  };
  const keep = (key: string, b: TileBitmap): void => {
    cache.set(key, b);
    trim();
  };
  const abortExcept = (keys: ReadonlySet<string>): void => {
    for (const [k, c] of inflight) {
      if (keys.has(k)) continue;
      c.abort();
      inflight.delete(k);
    }
  };
  const draw = (ctx: CanvasRenderingContext2D, t: PdfTile, b: TileBitmap): void => {
    ctx.drawImage(b, t.world.x0, t.world.y0, t.world.x1 - t.world.x0, t.world.y1 - t.world.y0);
  };
  const start = (file: PdfFile, page: number, scale: number, t: PdfTile): void => {
    const ctrl = new AbortController();
    inflight.set(t.key, ctrl);
    const settle = (): boolean => {
      if (inflight.get(t.key) === ctrl) inflight.delete(t.key);
      return disposed || ctrl.signal.aborted;
    };
    file.renderTile(page, scale, t.px, ctrl.signal).then(
      (b) => {
        if (settle()) {
          b.close?.();
          return;
        }
        keep(t.key, b);
        ready();
      },
      (e: unknown) => {
        if (settle()) return;
        failed.add(t.key);
        console.warn(`RoomBoard : tuile ${t.key} non rendue (${why(e)})`);
        ready();
      },
    );
  };
  const release = (): void => {
    current = NONE;
    for (const c of inflight.values()) c.abort();
    inflight.clear();
    for (const b of cache.values()) b.close?.();
    cache.clear();
    failed.clear();
    for (const e of files.values()) if (e.state === "ready") e.file.destroy();
    files.clear();
  };
  const nothing = (state: TileState): TileState => {
    current = NONE;
    abortExcept(NONE);
    return state;
  };

  return {
    paint(ctx, b, camera, view) {
      const { page, w, rect } = b;
      if (disposed || page === null || w === null || rect === null) return nothing("echec");
      // Vue vide (onglet désactivé, 0 x 0) : ni ouverture de PDF ni dessin, avant même `fileFor`.
      const visible = visibleGridRect(camera, view.w, view.h);
      if (visible === null) return nothing("pret");
      const entry = fileFor(b.asset);
      if (entry.state === "failed") return nothing("echec");
      const prefix = `${b.asset}|${page}`;
      const level = levelFor(camera.zoom, view.dpr);
      for (const q of LEVELS) {
        if (q >= level) break;
        for (const t of tilesFor(rect, q, visible, prefix)) {
          const coarse = cache.get(t.key);
          if (coarse !== undefined) draw(ctx, t, coarse);
        }
      }
      const wanted = tilesFor(rect, level, visible, prefix);
      current = new Set(wanted.map((t) => t.key));
      abortExcept(current);
      const scale = (level * (rect.x1 - rect.x0)) / w;
      let missing = 0;
      let broken = false;
      for (const t of wanted) {
        const hit = take(t.key);
        if (hit !== undefined) {
          draw(ctx, t, hit);
          continue;
        }
        if (failed.has(t.key)) {
          broken = true;
          continue;
        }
        missing += 1;
        if (entry.state === "ready" && !inflight.has(t.key) && inflight.size < MAX_RENDERS) start(entry.file, page, scale, t);
      }
      trim();
      return broken ? "echec" : missing > 0 ? "attente" : "pret";
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release();
    },
  };
}
