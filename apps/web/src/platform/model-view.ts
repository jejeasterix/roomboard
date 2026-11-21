/**
 * Rendu 3D vu de la page (C15, DAX3) : types du rendu partagé et son chargement à la demande. Le morceau `three`
 * (`model-view-three.ts`, T7) n'est jamais importé ici : l'amorce passe `() => import(…)` à `createModelViewLoader` (X20).
 */
import type { ModelCamera } from "../engine/render/model-frames";

/** Alias provisoire, identique à `Model3dFormat` d'`api.ts` ; T7 le remplace par l'import (PC1). */
export type Model3dFormat = "glb" | "gltf" | "obj" | "stl" | "ply";

export interface ModelSource {
  readonly format: Model3dFormat;
  readonly name: string;
  readonly main: Blob;
  /** `files[].path` → contenu (X3) ; la garde d'URL n'ouvre que ceux-là (X27). */
  readonly files: ReadonlyMap<string, Blob>;
}

/** Modèle chargé dans le rendu partagé ; `missing` : références demandées par three sans fichier connu (X27). */
export interface LoadedModel {
  readonly missing: readonly string[];
}

export interface PixelSize {
  readonly w: number;
  readonly h: number;
}

export interface ModelView {
  /** Faux sans WebGL ou après la perte du contexte (X26). */
  available(): boolean;
  /** Lit le modèle (aussi sans WebGL : validation) ; rejette si illisible. */
  load(src: ModelSource): Promise<LoadedModel>;
  /** Image du modèle à cette vue (le canvas partagé) ; null sans WebGL. */
  draw(m: LoadedModel, v: ModelCamera, px: PixelSize): CanvasImageSource | null;
  /** PNG RVBA à fond transparent ; null sans WebGL. */
  snapshot(m: LoadedModel, v: ModelCamera, px: PixelSize): Promise<Blob | null>;
  release(m: LoadedModel): void;
  /** Contexte perdu (`webglcontextlost`) ; rend le désabonnement. */
  onLost(cb: () => void): () => void;
}

export interface ModelViewLoader {
  /** Charge le rendu une fois (morceau `three`) ; un échec est rejoué au prochain appel. */
  load(): Promise<ModelView>;
  /** Rendu déjà chargé, sans rien charger ; null avant le premier `load` réussi (PC3). */
  peek(): ModelView | null;
}

/** X5 : 1 024 px sur le grand côté. X22 : 2 048 px au plus à l'écran. */
export const SNAPSHOT_LONG_SIDE = 1024;
export const MAX_DRAW_SIDE = 2048;

/** Taille de l'instantané au ratio de la boîte (X5) ; boîte non finie : 1 024 × 768. */
export function snapshotSize(w: number, h: number): PixelSize {
  if (!(w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h))) return { w: SNAPSHOT_LONG_SIDE, h: 768 };
  return w >= h
    ? { w: SNAPSHOT_LONG_SIDE, h: Math.max(1, Math.round((SNAPSHOT_LONG_SIDE * h) / w)) }
    : { w: Math.max(1, Math.round((SNAPSHOT_LONG_SIDE * w) / h)), h: SNAPSHOT_LONG_SIDE };
}

/** Taille du rendu à l'écran (X22) : boîte en px CSS × `devicePixelRatio`, 2 048 px au plus sur le grand côté. */
export function drawSize(cssW: number, cssH: number, dpr: number): PixelSize {
  const r = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  let w = Math.max(1, Math.round(cssW * r));
  let h = Math.max(1, Math.round(cssH * r));
  const side = Math.max(w, h);
  if (side > MAX_DRAW_SIDE) {
    w = Math.max(1, Math.round((w * MAX_DRAW_SIDE) / side));
    h = Math.max(1, Math.round((h * MAX_DRAW_SIDE) / side));
  }
  return { w, h };
}

export function createModelViewLoader(load: () => Promise<ModelView>): ModelViewLoader {
  let view: ModelView | null = null;
  let pending: Promise<ModelView> | null = null;
  return {
    load() {
      if (view !== null) return Promise.resolve(view);
      pending ??= load().then(
        (v) => {
          view = v;
          return v;
        },
        (e: unknown) => {
          pending = null;
          throw e;
        },
      );
      return pending;
    },
    peek: () => view,
  };
}
