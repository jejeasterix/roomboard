// OG11 (DA-3) : rendu « dessiné à la main » par roughjs (MIT), sans DOM : `rough.generator()` calcule les opérations,
// rejouées sur le contexte reçu (écran, miniature ou `RecordingContext2D` de l'export vectoriel). Jamais le peintre
// canvas de roughjs, qui dessinerait sur un canvas du DOM et perdrait le PDF vectoriel.
// Adapté d'Excalidraw (packages/element/src/shape.ts, utils.ts), MIT, © 2020 Excalidraw : options roughjs
// (`generateRoughOptions`, shape.ts:172-246), tirets sans multi-trait, rectangle arrondi en chemin (shape.ts), rayon
// adaptatif des angles (utils.ts, `getCornerRadius`).
import rough from "roughjs/bin/rough";
import type { Op, OpSet, Options } from "roughjs/bin/core";
import type { ShapeData, StrokeStyle } from "../../core/api";
import { arrowWings } from "../../core/shapes";
import { roughnessOf, roundnessOf, strokeKindOf, type Look, type StrokeKind } from "../../core/look";

const gen = rough.generator();

/** Tirets du trait : plein [] · tirets [max(8, 2w), 8 + w] · pointillés [0, 6 + w] (points par l'embout rond). */
export function dashOf(kind: StrokeKind, w: number): number[] {
  if (kind === "dashed") return [Math.max(8, 2 * w), 8 + w];
  if (kind === "dotted") return [0, 6 + w];
  return [];
}

/** Rayon des angles arrondis : min(0,25 · min(|w|, |h|), 32). */
export function cornerRadius(w: number, h: number): number {
  return Math.min(0.25 * Math.min(Math.abs(w), Math.abs(h)), 32);
}

/** Graine d'un élément sans graine enregistrée : FNV-1a 32 bits de son id (stable d'un rendu à l'autre). */
export function seedOf(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Graine neuve d'un geste : entier 32 bits non signé. */
export function newSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

/** Rectangle arrondi (0, 0)-(w, h) en chemin SVG, pour `generator.path` (comme Excalidraw). */
function roundedPath(w: number, h: number): string {
  const r = cornerRadius(w, h);
  return `M ${r} 0 L ${w - r} 0 Q ${w} 0, ${w} ${r} L ${w} ${h - r} Q ${w} ${h}, ${w - r} ${h} L ${r} ${h} Q 0 ${h}, 0 ${h - r} L 0 ${r} Q 0 0, ${r} 0`;
}

function replay(ctx: CanvasRenderingContext2D, ops: readonly Op[]): void {
  ctx.beginPath();
  for (const o of ops) {
    const d = o.data;
    if (o.op === "move") ctx.moveTo(d[0] ?? 0, d[1] ?? 0);
    else if (o.op === "bcurveTo") ctx.bezierCurveTo(d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0, d[4] ?? 0, d[5] ?? 0);
    else ctx.lineTo(d[0] ?? 0, d[1] ?? 0);
  }
}

/** Forme dans son repère local, tracé roughjs de la graine `seed` (0 : 1, roughjs tirant une graine au hasard sur 0). */
export function sketchShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle, look: Look, seed: number): void {
  const w = style.width;
  const kind = strokeKindOf(look);
  const dash = dashOf(kind, w);
  const closed = s.shape === "rect" || s.shape === "ellipse";
  const opts: Options = {
    roughness: roughnessOf(look),
    seed: seed === 0 ? 1 : seed,
    stroke: style.color,
    strokeWidth: w,
    strokeLineDash: dash,
    // Excalidraw : sans multi-trait pour les tirets, qui se recouvriraient.
    disableMultiStroke: kind !== "solid",
    preserveVertices: true,
    ...(closed && s.fill !== null ? { fill: s.fill, fillStyle: "solid" } : {}),
  };
  const sets: OpSet[] = [];
  if (s.shape === "rect") {
    sets.push(...(roundnessOf(look) === "round" ? gen.path(roundedPath(s.w, s.h), opts) : gen.rectangle(0, 0, s.w, s.h, opts)).sets);
  } else if (s.shape === "ellipse") {
    sets.push(...gen.ellipse(s.w / 2, s.h / 2, s.w, s.h, opts).sets);
  } else {
    sets.push(...gen.line(0, 0, s.w, s.h, opts).sets);
    const head = s.shape === "arrow" ? arrowWings(s.w, s.h, w) : null;
    if (head) {
      sets.push(...gen.line(head[0], head[1], s.w, s.h, opts).sets);
      sets.push(...gen.line(s.w, s.h, head[2], head[3], opts).sets);
    }
  }
  for (const set of sets) {
    if (set.type === "fillPath") {
      replay(ctx, set.ops);
      ctx.fillStyle = s.fill ?? style.color;
      ctx.fill();
    } else if (set.type === "path") {
      replay(ctx, set.ops);
      if (dash.length > 0) ctx.setLineDash(dash);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      if (dash.length > 0) ctx.setLineDash([]);
    }
  }
}
