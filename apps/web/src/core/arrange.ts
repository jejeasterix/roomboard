// OG23 (DA-2) : dispositions de `Command::Arrange`, mêmes noms que `ArrangeHow` du cœur (crates/roomboard-core/src/arrange.rs).
// `planArrange` porte ligne à ligne `plan` du cœur. Répartir adapte `distributeElements` d'Excalidraw
// (packages/element/src/distribute.ts), Copyright (c) 2020 Excalidraw, licence MIT ; le retournement suit
// `actionFlip.ts` (le texte n'est pas inversé : seule sa place suit).
import type { Bounds, Matrix } from "./api";

export const ARRANGE_HOWS = [
  "align-left", "align-center", "align-right", "align-top", "align-middle", "align-bottom",
  "distribute-h", "distribute-v", "flip-h", "flip-v", "rotate-cw", "rotate-ccw",
] as const;
export type ArrangeHow = (typeof ARRANGE_HOWS)[number];
export const isArrangeHow = (v: unknown): v is ArrangeHow => typeof v === "string" && (ARRANGE_HOWS as readonly string[]).includes(v);
/** Message du pont et du faux cœur pour une disposition inconnue. */
export const arrangeUnknown = (how: string): string => `disposition inconnue : ${how}`;

/** `matrix` : trait, forme, image (la matrice entière) ; `place` : texte, tableau, média, objet 3D (translation seule, H5). */
export type Reach = "matrix" | "place";
export interface ArrangeMember { readonly id: string; readonly reach: Reach; readonly bounds: Bounds }
/** Unité d'une disposition : un groupe extérieur (tous ses membres de la page) ou un élément seul. */
export interface ArrangeUnit { readonly members: readonly ArrangeMember[] }

const union = (a: Bounds | null, b: Bounds): Bounds =>
  a === null ? b : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
const boxOf = (u: ArrangeUnit): Bounds | null => u.members.reduce<Bounds | null>((acc, m) => union(acc, m.bounds), null);
const shift = (dx: number, dy: number): Matrix => [1, 0, 0, 1, dx, dy];
/** `f64::total_cmp` pour des nombres finis (les boîtes le sont). */
const totalCmp = (a: number, b: number): number => (a < b ? -1 : a > b ? 1 : 0);

/** Translation d'une unité entière (tous ses membres du même pas) ; pas nul omis. */
function pushUnit(u: ArrangeUnit, dx: number, dy: number, out: Array<readonly [string, Matrix]>): void {
  if (dx !== 0 || dy !== 0) for (const m of u.members) out.push([m.id, shift(dx, dy)]);
}

/** Matrice à composer à gauche de la transformation de chaque élément ; identité omise. Vide : rien ne bouge (D38). */
export function planArrange(units: readonly ArrangeUnit[], how: ArrangeHow): Array<readonly [string, Matrix]> {
  const boxes = units.map(boxOf).filter((b): b is Bounds => b !== null);
  if (boxes.length !== units.length || boxes.length === 0) return [];
  const sel = boxes.slice(1).reduce((a, b) => union(a, b), boxes[0] as Bounds);
  const [cx, cy] = [(sel.x0 + sel.x1) / 2, (sel.y0 + sel.y1) / 2];
  const out: Array<readonly [string, Matrix]> = [];
  switch (how) {
    case "align-left": case "align-center": case "align-right": case "align-top": case "align-middle": case "align-bottom": {
      if (units.length < 2) return [];
      units.forEach((u, k) => {
        const b = boxes[k] as Bounds;
        const [dx, dy] =
          how === "align-left" ? [sel.x0 - b.x0, 0]
          : how === "align-center" ? [cx - (b.x0 + b.x1) / 2, 0]
          : how === "align-right" ? [sel.x1 - b.x1, 0]
          : how === "align-top" ? [0, sel.y0 - b.y0]
          : how === "align-middle" ? [0, cy - (b.y0 + b.y1) / 2]
          : [0, sel.y1 - b.y1];
        pushUnit(u, dx, dy, out);
      });
      break;
    }
    case "distribute-h": case "distribute-v": {
      if (units.length < 3) return [];
      const h = how === "distribute-h";
      const start = (b: Bounds): number => (h ? b.x0 : b.y0);
      const end = (b: Bounds): number => (h ? b.x1 : b.y1);
      const mid = (b: Bounds): number => (start(b) + end(b)) / 2;
      const at = (i: number): Bounds => boxes[i] as Bounds;
      const order = units.map((_, i) => i).sort((a, b) => totalCmp(mid(at(a)), mid(at(b))));
      const span = boxes.reduce((acc, b) => acc + (end(b) - start(b)), 0);
      const n = units.length;
      const step = (end(sel) - start(sel) - span) / (n - 1);
      const mv = (d: number): [number, number] => (h ? [d, 0] : [0, d]);
      if (step < 0) {
        // Excalidraw : écart négatif, répartition par les centres ; les boîtes des deux extrêmes ne bougent pas.
        const i0 = order.findIndex((i) => start(at(i)) === start(sel));
        const i1 = order.findIndex((i) => end(at(i)) === end(sel));
        if (i0 < 0 || i1 < 0) return [];
        const s = (mid(at(order[i1] as number)) - mid(at(order[i0] as number))) / (n - 1);
        let pos = mid(at(order[i0] as number));
        order.forEach((i, k) => {
          if (k !== i0 && k !== i1) {
            pos += s;
            const [dx, dy] = mv(pos - mid(at(i)));
            pushUnit(units[i] as ArrangeUnit, dx, dy, out);
          }
        });
      } else {
        let pos = start(sel);
        for (const i of order) {
          const [dx, dy] = mv(pos - start(at(i)));
          pushUnit(units[i] as ArrangeUnit, dx, dy, out);
          pos += step + end(at(i)) - start(at(i));
        }
      }
      break;
    }
    case "flip-h": case "flip-v": case "rotate-cw": case "rotate-ccw": {
      const full: Matrix =
        how === "flip-h" ? [-1, 0, 0, 1, 2 * cx, 0]
        : how === "flip-v" ? [1, 0, 0, -1, 0, 2 * cy]
        // Écran à y vers le bas : (x, y) → (cx − (y − cy), cy + (x − cx)).
        : how === "rotate-cw" ? [0, 1, -1, 0, cx + cy, cy - cx]
        : [0, -1, 1, 0, cx - cy, cy + cx];
      applyFull(units, full, out);
      break;
    }
  }
  return out;
}

/** `MIN_SHIFT` du cœur (arrange.rs) : translation en dessous de laquelle un membre `place` ne bouge pas. */
const MIN_SHIFT = 1e-9;

/** `apply_full` du cœur : matrice `full` aux membres `matrix`, translation de leur centre aux membres `place` (H5). */
function applyFull(units: readonly ArrangeUnit[], full: Matrix, out: Array<readonly [string, Matrix]>): void {
  for (const m of units.flatMap((u) => u.members)) {
    if (m.reach === "matrix") {
      out.push([m.id, full]);
    } else {
      const [px, py] = [(m.bounds.x0 + m.bounds.x1) / 2, (m.bounds.y0 + m.bounds.y1) / 2];
      const [nx, ny] = [full[0] * px + full[2] * py + full[4], full[1] * px + full[3] * py + full[5]];
      // C5 : translation de moins de 1e-9 (résidu d'arrondi d'une rotation sur son centre) omise, comme le cœur.
      if (Math.abs(nx - px) >= MIN_SHIFT || Math.abs(ny - py) >= MIN_SHIFT) out.push([m.id, shift(nx - px, ny - py)]);
    }
  }
}

/** OG33 (lot 2b) : ligne à ligne `rotation` du cœur (arrange.rs) ; `deg * (Math.PI / 180)` comme `to_radians`. Sens
 *  horaire à l'écran (y vers le bas), autour de (cx, cy), comme `rotateSingleElement` d'Excalidraw
 *  (packages/element/src/resizeElements.ts, MIT) ; un quart de tour donne la matrice exacte de `rotate-cw`. */
export function rotationMatrix(cx: number, cy: number, deg: number): Matrix {
  const snap = (v: number): number => (Math.abs(v) < 1e-12 ? 0 : Math.abs(Math.abs(v) - 1) < 1e-12 ? Math.sign(v) : v);
  const r = deg * (Math.PI / 180);
  const [c, s] = [snap(Math.cos(r)), snap(Math.sin(r))];
  return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
}

/** OG33 : matrice pleine d'une rotation autour du centre des boîtes réunies (celle que le suivi des flèches liées reçoit,
 *  comme `plan_rotate` du cœur la rend) ; null : rien ne tourne (unité sans boîte, aucune unité, angle nul modulo 360,
 *  matrice arrondie à l'identité). L'angle passe par `rem_euclid` du cœur (`r < 0 ? r + 360 : r`), à l'identique. */
export function rotationOf(units: readonly ArrangeUnit[], deg: number): Matrix | null {
  const boxes = units.map(boxOf).filter((b): b is Bounds => b !== null);
  const r = deg % 360;
  if (boxes.length !== units.length || boxes.length === 0 || (r < 0 ? r + 360 : r) === 0) return null;
  const sel = boxes.slice(1).reduce((a, b) => union(a, b), boxes[0] as Bounds);
  const full = rotationMatrix((sel.x0 + sel.x1) / 2, (sel.y0 + sel.y1) / 2, deg);
  return full[0] === 1 && full[1] === 0 && full[2] === 0 && full[3] === 1 && full[4] === 0 && full[5] === 0 ? null : full;
}

/** OG33 : `plan_rotate` du cœur ; identité (matrice arrondie) et translation de moins de 1e-9 omises (C5, D38). */
export function planRotate(units: readonly ArrangeUnit[], deg: number): Array<readonly [string, Matrix]> {
  const full = rotationOf(units, deg);
  const out: Array<readonly [string, Matrix]> = [];
  if (full !== null) applyFull(units, full, out);
  return out;
}

/** OG33 : portée d'un genre de la vue (`reach_of` du cœur) ; null : jamais bougé. */
export function reachOfKind(kind: string): Reach | null {
  return kind === "stroke" || kind === "shape" || kind === "image" ? "matrix"
    : kind === "text" || kind === "table" || kind === "media" || kind === "model3d" ? "place" : null;
}
