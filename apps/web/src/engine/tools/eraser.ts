/**
 * Gomme (OG41, D2-D8 ; D12, D38, D39 du socle) : une seule gomme, dont l'effet dépend de ce qu'elle touche. Trait à main
 * levée : coupé là où elle passe (`Erase` partiel du cœur, qui coupe tous les traits du chemin). Objet au premier plan
 * sous le centre de la gomme (forme, image, texte, ligne, flèche, média, objet 3D, genre inconnu) : effacé entier
 * (`Delete`) ; à tolérance 0 d'abord (un trait ne compte que sous son contour), au rayon si rien n'est sous le centre.
 * Jamais effacés : tableau, remplissage du pot (D4, D30). Rectangle ou ellipse sans fond : seulement sur son trait
 * (`edgeHit`, D31). Un plan par geste : le document ne change qu'au relâché (D32).
 * Coût borné (D8) : candidats fixés au début du geste, échantillons au pas du cœur (`sample_path`) gardés près d'un
 * candidat non touché, au plus `ERASER_PROBES_PER_FRAME` appels `hitTest` par image, tout le reste au relâché.
 * Aperçu sans écriture : traînée partielle, objets touchés masqués (D6) ; au relâché, une seule écriture
 * `runAll([Erase, Delete])`, une étape (D5) ; "cancel" et "abort" n'écrivent rien. Rayon constant à l'écran (HL3-1) ;
 * `resize` (OG25, paume) l'agrandit et relance la sonde des objets depuis le début (D7).
 */
import type { Bounds, Change, Command } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { EraserPreview } from "../render/renderer";
import type { GestureTool, LivePart, ToolContext } from "./tool";

export const ERASER_RADIUS_PX = 12;
/** D8 : appels `hitTest` au plus par image (toutes passes comprises) ; le reste à l'image suivante, tout au relâché. */
export const ERASER_PROBES_PER_FRAME = 8;
/** Genres bruts jamais effacés en entier : l'encre (coupée par `Erase`), le tableau, le remplissage du pot. */
const NEVER_WHOLE: readonly string[] = ["stroke", "table", "fill"];
/** Pas minimal du cœur (`sample_path`, ink/hit.rs:126). */
const MIN_STEP = 0.25;

interface Pass {
  readonly page: string;
  radius: number;
  /** Paires x, y monde. */
  readonly path: number[];
  /** Candidats (D8) et leur boîte monde, figés au début du geste. */
  readonly boxes: readonly (readonly [string, Bounds])[];
  readonly ids: ReadonlySet<string>;
  /** Échantillons à sonder (x, y monde), lus depuis `next`. */
  queue: number[];
  next: number;
  /** Paires du chemin déjà échantillonnées. */
  sampled: number;
  readonly hits: Set<string>;
  /** Rectangle ou ellipse sans fond (D31), lu une fois par id. */
  readonly outline: Map<string, boolean>;
}

export function createEraserTool(ctx: ToolContext, radiusPx: number = ERASER_RADIUS_PX): GestureTool {
  const runAll = ctx.runAll;
  if (runAll === undefined) throw new Error("createEraserTool : ToolContext.runAll requis (OG41, D5 : une seule étape)");
  const passes = new Map<number, Pass>();

  const candidates = (page: string): (readonly [string, Bounds])[] => {
    const skip = new Set<string>();
    for (const k of NEVER_WHOLE) for (const id of ctx.doc.elementIdsOfKind(page, k)) skip.add(id);
    const out: (readonly [string, Bounds])[] = [];
    for (const id of ctx.doc.elementIds(page)) {
      if (skip.has(id)) continue;
      const b = ctx.doc.bounds([id]);
      if (b !== null) out.push([id, b]);
    }
    return out;
  };

  const add = (p: Pass, samples: readonly InputSample[]): void => {
    const cam = ctx.camera();
    for (const s of samples) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const [x, y] = screenToWorld(cam, s.x, s.y);
      p.path.push(x, y);
    }
  };

  /** Un candidat non encore touché dont la boîte, élargie du rayon, contient (x, y). */
  const near = (p: Pass, x: number, y: number): boolean =>
    p.boxes.some(([id, b]) => !p.hits.has(id) && x >= b.x0 - p.radius && x <= b.x1 + p.radius && y >= b.y0 - p.radius && y <= b.y1 + p.radius);

  const keep = (p: Pass, x: number, y: number): void => {
    if (near(p, x, y)) p.queue.push(x, y);
  };

  /** Échantillons des paires nouvelles du chemin, au pas `max(rayon / 2, 0,25)`. */
  const sample = (p: Pass): void => {
    if (p.boxes.length === 0) return;
    const pairs = p.path.length / 2;
    const step = Math.max(p.radius / 2, MIN_STEP);
    for (let i = p.sampled; i < pairs; i++) {
      const x = p.path[2 * i]!;
      const y = p.path[2 * i + 1]!;
      if (i === 0) {
        keep(p, x, y);
        continue;
      }
      const px = p.path[2 * i - 2]!;
      const py = p.path[2 * i - 1]!;
      const n = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / step));
      for (let j = 1; j <= n; j++) keep(p, px + ((x - px) * j) / n, py + ((y - py) * j) / n);
    }
    p.sampled = pairs;
  };

  const outlineOnly = (p: Pass, id: string): boolean => {
    let v = p.outline.get(id);
    if (v === undefined) {
      const el = ctx.doc.element(id);
      v = el?.kind === "shape" && (el.shape.shape === "rect" || el.shape.shape === "ellipse") && el.shape.fill === null;
      p.outline.set(id, v);
    }
    return v;
  };

  /** Sonde au premier plan, au plus `budget` appels `hitTest` (deux au plus par échantillon) ; rend les appels faits. */
  const probe = (p: Pass, budget: number): number => {
    let used = 0;
    while (p.next < p.queue.length && used + 2 <= budget) {
      const x = p.queue[p.next]!;
      const y = p.queue[p.next + 1]!;
      p.next += 2;
      if (!near(p, x, y)) continue;
      used++;
      let top = ctx.doc.hitTest(p.page, x, y, 0);
      if (top === null) {
        used++;
        top = ctx.doc.hitTest(p.page, x, y, p.radius);
      }
      if (top === null || !p.ids.has(top) || p.hits.has(top)) continue;
      if (outlineOnly(p, top) && !ctx.doc.edgeHit(top, x, y, p.radius)) continue;
      p.hits.add(top);
    }
    return used;
  };

  const write = (p: Pass): Change | null => {
    sample(p);
    probe(p, Number.POSITIVE_INFINITY);
    const present = new Set(ctx.doc.elementIds(p.page));
    const ids = [...p.hits].filter((id) => present.has(id));
    const cmds: Command[] = [{ type: "Erase", page: p.page, path: new Float32Array(p.path), radius: p.radius, mode: "partial" }];
    if (ids.length > 0) cmds.push({ type: "Delete", ids });
    return runAll(cmds);
  };

  return {
    begin(pointerId, samples) {
      const page = ctx.page();
      const boxes = candidates(page);
      const p: Pass = {
        page,
        radius: radiusPx / ctx.camera().zoom,
        path: [],
        boxes,
        ids: new Set(boxes.map(([id]) => id)),
        queue: [],
        next: 0,
        sampled: 0,
        hits: new Set<string>(),
        outline: new Map<string, boolean>(),
      };
      passes.set(pointerId, p);
      add(p, samples);
    },
    extend(pointerId, samples) {
      const p = passes.get(pointerId);
      if (p) add(p, samples);
    },
    frame() {
      let budget = ERASER_PROBES_PER_FRAME;
      for (const p of passes.values()) {
        sample(p);
        budget -= probe(p, budget);
      }
    },
    close(pointerId: number, how: CloseReason) {
      const p = passes.get(pointerId);
      if (!p) return;
      passes.delete(pointerId);
      if (how !== "end" || p.path.length < 2) return;
      write(p);
    },
    resize(pointerId: number, px: number) {
      const p = passes.get(pointerId);
      if (!p || !Number.isFinite(px) || px <= 0) return;
      const r = px / ctx.camera().zoom;
      if (!(r > p.radius)) return;
      p.radius = r;
      // D7 : le chemin déjà passé est sondé de nouveau, au rayon nouveau (les objets déjà touchés le restent).
      p.sampled = 0;
      p.queue = [];
      p.next = 0;
    },
    live(): LivePart {
      const erasers: EraserPreview[] = [];
      const hidden = new Set<string>();
      for (const p of passes.values()) {
        erasers.push({ path: new Float32Array(p.path), radius: p.radius, mode: "partial" });
        for (const id of p.hits) hidden.add(id);
      }
      return { strokes: [], erasers, hidden };
    },
    active: () => passes.size > 0,
  };
}
