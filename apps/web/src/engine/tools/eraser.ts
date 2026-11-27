/**
 * Gomme (D12, D38) : aperçu sans écriture, une seule commande Erase au relâché ; "cancel" et "abort" n'écrivent rien
 * (D39). Gomme d'objet : hitTestPath (lecture seule) sur le segment nouveau à chaque image, traits touchés masqués.
 * Rayon constant à l'écran (HL3-1), converti en unités monde au début du geste. Mode figé au début du geste.
 * OG25 : `resize` agrandit le rayon d'un passage (le plus grand vu) ; une seule Erase au rayon final.
 */
import type { EraseMode } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { EraserPreview } from "../render/renderer";
import type { GestureTool, LivePart, ToolContext } from "./tool";

export const ERASER_RADIUS_PX = 12;

interface Pass {
  readonly page: string;
  readonly mode: EraseMode;
  radius: number;
  /** Paires x, y monde. */
  readonly path: number[];
  /** Paires déjà soumises à hitTestPath. */
  checked: number;
  readonly hits: Set<string>;
}

export function createEraserTool(
  ctx: ToolContext,
  mode: () => EraseMode,
  radiusPx: number = ERASER_RADIUS_PX,
): GestureTool {
  const passes = new Map<number, Pass>();

  const add = (p: Pass, samples: readonly InputSample[]): void => {
    const cam = ctx.camera();
    for (const s of samples) {
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const [x, y] = screenToWorld(cam, s.x, s.y);
      p.path.push(x, y);
    }
  };

  const probe = (p: Pass): void => {
    const pairs = p.path.length / 2;
    if (p.mode !== "object" || pairs <= p.checked) return;
    const from = Math.max(0, p.checked - 1); // le point de jonction : le segment qui relie deux images est testé
    for (const id of ctx.doc.hitTestPath(p.page, new Float32Array(p.path.slice(from * 2)), p.radius)) p.hits.add(id);
    p.checked = pairs;
  };

  return {
    begin(pointerId, samples) {
      const p: Pass = {
        page: ctx.page(),
        mode: mode(),
        radius: radiusPx / ctx.camera().zoom,
        path: [],
        checked: 0,
        hits: new Set<string>(),
      };
      passes.set(pointerId, p);
      add(p, samples);
    },
    extend(pointerId, samples) {
      const p = passes.get(pointerId);
      if (p) add(p, samples);
    },
    frame() {
      for (const p of passes.values()) probe(p);
    },
    close(pointerId: number, how: CloseReason) {
      const p = passes.get(pointerId);
      if (!p) return;
      passes.delete(pointerId);
      if (how !== "end" || p.path.length < 2) return;
      ctx.run({ type: "Erase", page: p.page, path: new Float32Array(p.path), radius: p.radius, mode: p.mode });
    },
    resize(pointerId: number, radiusPx: number) {
      const p = passes.get(pointerId);
      if (!p || !Number.isFinite(radiusPx) || radiusPx <= 0) return;
      const r = radiusPx / ctx.camera().zoom;
      if (!(r > p.radius)) return;
      p.radius = r;
      // Gomme d'objet : le chemin déjà passé est sondé de nouveau, au rayon nouveau.
      if (p.mode === "object") p.checked = 0;
    },
    live(): LivePart {
      const erasers: EraserPreview[] = [];
      const hidden = new Set<string>();
      for (const p of passes.values()) {
        erasers.push({ path: new Float32Array(p.path), radius: p.radius, mode: p.mode });
        for (const id of p.hits) hidden.add(id);
      }
      return { strokes: [], erasers, hidden };
    },
    active: () => passes.size > 0,
  };
}
