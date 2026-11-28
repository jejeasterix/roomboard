// OG11 (DA-3) : rendu « dessiné à la main » par roughjs (MIT), sans DOM : `rough.generator()` calcule les opérations,
// rejouées sur le contexte reçu (écran, miniature ou `RecordingContext2D` de l'export vectoriel). Jamais le peintre
// canvas de roughjs, qui dessinerait sur un canvas du DOM et perdrait le PDF vectoriel.
// Adapté d'Excalidraw (packages/element/src/shape.ts, utils.ts), MIT, © 2020 Excalidraw : options roughjs
// (`generateRoughOptions`, shape.ts:172-246), tirets sans multi-trait, rectangle arrondi en chemin (shape.ts), rayon
// adaptatif des angles (utils.ts, `getCornerRadius`), rugosité réduite des petites formes (`adjustRoughness`,
// shape.ts:176-198), pointe de flèche pleine sous un trait en tirets (`getArrowheadLineOptions`, shape.ts:330-345),
// hachures et hachures croisées (`hachureGap = 4 × w`, `fillWeight = w / 2`, shape.ts:221-225) et pointes (`getArrowheadShapes`).
import rough from "roughjs/bin/rough";
import type { Op, OpSet, Options } from "roughjs/bin/core";
import type { ShapeData, StrokeStyle } from "../../core/api";
import { arrowWings, flattenPath, isClosedShape, isFillable, lineGeomOf, linePath } from "../../core/shapes";
import { elbowedOf, endArrowheadOf, fillStyleOf, roughnessOf, roundnessOf, startArrowheadOf, strokeKindOf, type Arrowhead, type Look, type StrokeKind } from "../../core/look";

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

export { newSeed } from "../../core/look";

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

/** Rugosité réduite des petites formes (Excalidraw `adjustRoughness`) : inchangée si les deux côtés sont grands
 *  (≥ 20 et ≥ 50), si la forme arrondie a ses deux côtés ≥ 15, ou si le segment ou la flèche fait ≥ 50. */
export function adjustRoughness(shape: ShapeData["shape"], w: number, h: number, round: boolean, roughness: number): number {
  const maxSize = Math.max(Math.abs(w), Math.abs(h));
  const minSize = Math.min(Math.abs(w), Math.abs(h));
  const linear = shape === "line" || shape === "arrow";
  if ((minSize >= 20 && maxSize >= 50) || (minSize >= 15 && round && shape === "rect") || (linear && maxSize >= 50)) return roughness;
  return Math.min(roughness / (maxSize < 10 ? 3 : 2), 2.5);
}

/** Un tracé roughjs et les tirets avec lesquels il est tracé (les ailes de flèche : pleines, ou pointillés resserrés). */
export interface SketchPart {
  readonly set: OpSet;
  readonly dash: readonly number[];
}

/** Tracés calculés d'une forme, avec la clé des entrées qui les ont produits. */
export interface SketchPlan {
  readonly key: string;
  readonly parts: readonly SketchPart[];
}

/** Mémoire des tracés par id d'élément (le rendu l'invalide avec ses chemins). */
export interface SketchMemo {
  readonly id: string;
  readonly cache: Map<string, SketchPlan>;
}

/** Trace le chemin courant avec les tirets `dash` (aucun appel `setLineDash` si `dash` est vide). */
export function strokeWith(ctx: CanvasRenderingContext2D, style: StrokeStyle, dash: readonly number[]): void {
  if (dash.length > 0) ctx.setLineDash([...dash]);
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  if (dash.length > 0) ctx.setLineDash([]);
}

/** Tirets des ailes d'une flèche (Excalidraw `getArrowheadLineOptions`) : pleines sous un trait en tirets, pointillés resserrés
 *  d'un pixel sous un trait en pointillés, et seulement quand le fût a des tirets. */
export function wingDashOf(kind: StrokeKind, w: number): number[] {
  const dash = dashOf(kind, w);
  return kind === "dotted" ? [dash[0] ?? 0, (dash[1] ?? 1) - 1] : [];
}

/** Ailes d'une pointe de pointe `(tipX, tipY)` pour un fût qui arrive de `(fromX, fromY)` : `arrowWings` décalé du départ. */
export function headWings(tipX: number, tipY: number, fromX: number, fromY: number, width: number): [number, number, number, number] | null {
  const w = arrowWings(tipX - fromX, tipY - fromY, width);
  return w ? [w[0] + fromX, w[1] + fromY, w[2] + fromX, w[3] + fromY] : null;
}

/** Losange (Excalidraw arrowheads.ts, MIT) : L le long du fût, demi-largeur 0,6 L, arrière à 2 L ; pointe, flanc, arrière, flanc. */
export function diamondHead(tipX: number, tipY: number, fromX: number, fromY: number, width: number): [number, number][] {
  const l = Math.max(6, 2 * width);
  const d = Math.hypot(tipX - fromX, tipY - fromY) || 1;
  const ux = (tipX - fromX) / d;
  const uy = (tipY - fromY) / d;
  const nx = -uy * 0.6 * l;
  const ny = ux * 0.6 * l;
  return [[tipX, tipY], [tipX - ux * l + nx, tipY - uy * l + ny], [tipX - 2 * l * ux, tipY - 2 * l * uy], [tipX - ux * l - nx, tipY - uy * l - ny]];
}

/** Un fond non transparent avec hachures passe par roughjs même sans rugosité (Architecte). */
export function hatched(s: ShapeData, look: Look | undefined): boolean {
  return s.fill !== null && isFillable(s) && fillStyleOf(look) !== "solid";
}

/** OG12 : largeur et hauteur de la boîte du chemin (points intérieurs compris) d'une ligne ou flèche à points ; sinon (w, h). */
function pathExtent(s: ShapeData): [number, number] {
  if (s.points === undefined || s.points.length === 0) return [s.w, s.h];
  const pts = linePath(s.w, s.h, s.points);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
}

function keyOf(s: ShapeData, style: StrokeStyle, look: Look, seed: number): string {
  const round = roundnessOf(look) === "round";
  const [ew, eh] = pathExtent(s);
  const roughness = adjustRoughness(s.shape, ew, eh, round, roughnessOf(look));
  return JSON.stringify([s.shape, s.w, s.h, s.fill, style.color, style.width, strokeKindOf(look), roughness, round, seed, fillStyleOf(look), startArrowheadOf(look), endArrowheadOf(look), s.points ?? null, elbowedOf(look), ...(s.polygon === true ? [true] : [])]);
}

function planOf(s: ShapeData, style: StrokeStyle, look: Look, seed: number, key: string): SketchPlan {
  const w = style.width;
  const kind = strokeKindOf(look);
  const dash = dashOf(kind, w);
  const round = roundnessOf(look) === "round";
  const [ew, eh] = pathExtent(s);
  const roughness = adjustRoughness(s.shape, ew, eh, round, roughnessOf(look));
  const fillKind = fillStyleOf(look);
  const closed = isFillable(s);
  const opts: Options = {
    roughness,
    seed: seed === 0 ? 1 : seed,
    stroke: style.color,
    strokeWidth: w,
    strokeLineDash: dash,
    // Excalidraw : sans multi-trait pour les tirets, qui se recouvriraient.
    disableMultiStroke: kind !== "solid",
    preserveVertices: true,
    ...(closed && s.fill !== null
      ? { fill: s.fill, fillStyle: fillKind === "solid" ? "solid" : fillKind, hachureGap: 4 * w, fillWeight: w / 2 }
      : {}),
  };
  const parts: SketchPart[] = [];
  const add = (sets: OpSet[], d: readonly number[]): void => {
    for (const set of sets) parts.push({ set, dash: d });
  };
  if (s.shape === "rect") {
    add((round ? gen.path(roundedPath(s.w, s.h), opts) : gen.rectangle(0, 0, s.w, s.h, opts)).sets, dash);
  } else if (s.shape === "ellipse") {
    add(gen.ellipse(s.w / 2, s.h / 2, s.w, s.h, opts).sets, dash);
  } else if (s.shape === "diamond") {
    add(gen.polygon([[s.w / 2, 0], [s.w, s.h / 2], [s.w / 2, s.h], [0, s.h / 2]], opts).sets, dash);
  } else if (isClosedShape(s)) {
    add(gen.polygon(linePath(s.w, s.h, s.points ?? []).map((p) => [p[0], p[1]] as [number, number]), opts).sets, dash);
  } else {
    const g = lineGeomOf(s, look);
    const pts = linePath(s.w, s.h, g.inner);
    if (pts.length === 2) add(gen.line(0, 0, s.w, s.h, opts).sets, dash);
    else if (g.curve) add(gen.curve(pts.map((p) => [p[0], p[1]] as [number, number]), opts).sets, dash);
    else add(gen.linearPath(pts.map((p) => [p[0], p[1]] as [number, number]), opts).sets, dash);
    if (s.shape === "arrow") {
      const flat = flattenPath(pts, g.curve);
      const last = flat[flat.length - 1]!;
      const prev = flat[flat.length - 2]!;
      const first = flat[0]!;
      const second = flat[1]!;
      const wd = wingDashOf(kind, w);
      const wing: Options = { ...opts, strokeLineDash: wd, roughness: Math.min(1, roughness) };
      const addHead = (k: Arrowhead, tx: number, ty: number, fx: number, fy: number): void => {
        if (k === "none") return;
        if (k === "bar" || k === "circle" || k === "circle_outline") {
          const d = Math.hypot(tx - fx, ty - fy) || 1;
          if (k === "bar") {
            const l = Math.max(12, 3 * w) / 2;
            const nx = -(ty - fy) / d;
            const ny = (tx - fx) / d;
            add(gen.line(tx + nx * l, ty + ny * l, tx - nx * l, ty - ny * l, wing).sets, wd);
          } else {
            const r = Math.max(4, 1.5 * w);
            const circle: Options = k === "circle" ? { ...wing, fill: style.color, fillStyle: "solid" } : wing;
            add(gen.circle(tx - ((tx - fx) / d) * r, ty - ((ty - fy) / d) * r, 2 * r, circle).sets, wd);
          }
          return;
        }
        if (k === "diamond" || k === "diamond_outline") {
          const poly = diamondHead(tx, ty, fx, fy, w);
          add(gen.polygon(poly, k === "diamond" ? { ...wing, fill: style.color, fillStyle: "solid" } : wing).sets, wd);
          return;
        }
        const head = headWings(tx, ty, fx, fy, w);
        if (!head) return;
        if (k === "arrow") {
          add(gen.line(head[0], head[1], tx, ty, wing).sets, wd);
          add(gen.line(tx, ty, head[2], head[3], wing).sets, wd);
        } else {
          const poly: [number, number][] = [[head[0], head[1]], [tx, ty], [head[2], head[3]]];
          const fillOpts: Options = k === "triangle" ? { ...wing, fill: style.color, fillStyle: "solid" } : wing;
          add(gen.polygon(poly, fillOpts).sets, wd);
        }
      };
      addHead(endArrowheadOf(look), last[0], last[1], prev[0], prev[1]);
      addHead(startArrowheadOf(look), first[0], first[1], second[0], second[1]);
    }
  }
  return { key, parts };
}

/** Forme dans son repère local, tracé roughjs de la graine `seed` (0 : 1, roughjs tirant une graine au hasard sur 0).
 *  Avec `memo`, le tracé calculé est gardé sous l'id de l'élément tant que ses entrées ne changent pas. */
export function sketchShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle, look: Look, seed: number, memo?: SketchMemo): void {
  let plan = memo?.cache.get(memo.id);
  const key = keyOf(s, style, look, seed);
  if (plan === undefined || plan.key !== key) {
    plan = planOf(s, style, look, seed, key);
    memo?.cache.set(memo.id, plan);
  }
  for (const { set, dash } of plan.parts) {
    if (set.type === "fillPath") {
      replay(ctx, set.ops);
      ctx.fillStyle = s.shape === "arrow" ? style.color : (s.fill ?? style.color);
      ctx.fill();
    } else if (set.type === "fillSketch") {
      replay(ctx, set.ops);
      strokeWith(ctx, { color: s.fill ?? style.color, width: style.width / 2 }, []);
    } else if (set.type === "path") {
      replay(ctx, set.ops);
      strokeWith(ctx, style, dash);
    }
  }
}
