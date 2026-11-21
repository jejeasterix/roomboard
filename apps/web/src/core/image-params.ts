/**
 * Géométrie d'affichage d'une image retouchée (C5, DAI1, I8-I11) : source → rognage → retournements → quarts de tour
 * (sens horaire). Module pur de la couche `core` (le faux cœur l'importe ; `core` n'importe pas `engine`) ; le cœur Rust
 * ne garde que `display_size` et reçoit la matrice toute faite (`placeAfter`). Aussi le domaine et les neutres (I4, I5),
 * partagés par le faux cœur et le panneau, et la clé des pixels (I19).
 */
import type { Bounds, ImageData, ImageParams, Matrix, TransparentColor } from "./api";
import { applyMatrix, composeMatrix, invertMatrix } from "./shapes";

/** Rognage `[x, y, w, h]` en pixels source. */
export type Crop = readonly [number, number, number, number];

const MAX_INT = 4294967295;
const HEX6 = /^#[0-9a-f]{6}$/;
const intIn = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
const odd = (p: ImageParams): boolean => ((p.quarterTurns ?? 0) & 1) === 1;

/** Rognage effectif : `crop`, sinon l'image entière. */
export function cropOf(i: ImageData): Crop {
  return i.crop ?? [0, 0, i.w, i.h];
}

/** Boîte affichée (I8) : taille du rognage, échangée par un nombre impair de quarts de tour. */
export function displaySize(i: ImageData): [number, number] {
  const [, , cw, ch] = cropOf(i);
  return odd(i) ? [ch, cw] : [cw, ch];
}

/** Point du rognage (u, v ∈ [0, cw] × [0, ch]) vers l'affichage : retournements, puis quarts de tour horaires
 *  ((u, v) → (h − v, u) dans une boîte w × h, qui devient h × w). */
function cropToDisplay(i: ImageData, u: number, v: number): [number, number] {
  const [, , cw, ch] = cropOf(i);
  let x = i.flipX ? cw - u : u;
  let y = i.flipY ? ch - v : v;
  let w = cw;
  let h = ch;
  for (let k = 0; k < (i.quarterTurns ?? 0); k++) {
    [x, y] = [h - y, x];
    [w, h] = [h, w];
  }
  return [x, y];
}

/** Inverse de `cropToDisplay` : quarts de tour défaits ((X, Y) → (Y, w − X) dans la boîte affichée w × h), puis
 *  retournements. */
function displayToCrop(i: ImageData, x: number, y: number): [number, number] {
  const [, , cw, ch] = cropOf(i);
  let [w, h]: [number, number] = odd(i) ? [ch, cw] : [cw, ch];
  let u = x;
  let v = y;
  for (let k = 0; k < (i.quarterTurns ?? 0); k++) {
    [u, v] = [v, w - u];
    [w, h] = [h, w];
  }
  return [i.flipX ? cw - u : u, i.flipY ? ch - v : v];
}

/** Pixel source (x, y) → point de la boîte affichée (0, 0)-(bw, bh). */
export function sourceToDisplay(i: ImageData, x: number, y: number): [number, number] {
  const [cx, cy] = cropOf(i);
  return cropToDisplay(i, x - cx, y - cy);
}

/** Point de la boîte affichée → pixel source (pipette, I29 ; cadre de rognage, I28). */
export function displayToSource(i: ImageData, x: number, y: number): [number, number] {
  const [cx, cy] = cropOf(i);
  const [u, v] = displayToCrop(i, x, y);
  return [u + cx, v + cy];
}

/** Pixel source sous le point monde (x, y) d'une image de matrice `m` (C6b, B5 ; pipette, I29) : monde → boîte affichée
 *  (0, 0)-(bw, bh) → rognage, retournements et quarts de tour défaits → pixel entier, borné au rognage (donc à l'image).
 *  Hors de la boîte : `clamp` (pot, bande de tolérance de 6 px) y ramène le point ; sinon null (pipette). Matrice non
 *  inversible : null. */
export function sourcePixelAt(m: Matrix, i: ImageData, x: number, y: number, clamp: boolean): [number, number] | null {
  const inv = invertMatrix(m);
  if (inv === null) return null;
  const [lx, ly] = applyMatrix(inv, x, y);
  const [bw, bh] = displaySize(i);
  if (!clamp && (lx < 0 || ly < 0 || lx > bw || ly > bh)) return null;
  const [sx, sy] = displayToSource(i, Math.min(Math.max(lx, 0), bw), Math.min(Math.max(ly, 0), bh));
  const [cx, cy, cw, ch] = cropOf(i);
  return [Math.min(cx + cw - 1, Math.max(cx, Math.floor(sx))), Math.min(cy + ch - 1, Math.max(cy, Math.floor(sy)))];
}

/** Matrice du repère du rognage vers l'affichage (I23) : le dessin pose le rectangle source en (0, 0)-(cw, ch). */
export function orientMatrix(i: ImageData): Matrix {
  const [ox, oy] = cropToDisplay(i, 0, 0);
  const [ux, uy] = cropToDisplay(i, 1, 0);
  const [vx, vy] = cropToDisplay(i, 0, 1);
  return [ux - ox, uy - oy, vx - ox, vy - oy, ox, oy];
}

/** Neutres retirés (I4) : `false`, 0 et champs absents ne sont pas écrits ; seuls les sept réglages sont gardés. */
export function clean(p: ImageParams): ImageParams {
  return {
    ...(p.crop !== undefined ? { crop: p.crop } : {}),
    ...(p.flipX ? { flipX: true } : {}),
    ...(p.flipY ? { flipY: true } : {}),
    ...(p.quarterTurns ? { quarterTurns: p.quarterTurns } : {}),
    ...(p.brightness ? { brightness: p.brightness } : {}),
    ...(p.contrast ? { contrast: p.contrast } : {}),
    ...(p.transparent !== undefined ? { transparent: p.transparent } : {}),
  };
}

/** Réglages d'une image (sans asset ni taille). */
export const paramsOf = (i: ImageData): ImageParams => clean(i);
/** Rognage, retournements, quarts de tour. */
export const geometryOf = (p: ImageParams): ImageParams => clean({ crop: p.crop, flipX: p.flipX, flipY: p.flipY, quarterTurns: p.quarterTurns });
/** Luminosité, contraste, couleur transparente (calculés dans le Worker). */
export const pixelsOf = (p: ImageParams): ImageParams => clean({ brightness: p.brightness, contrast: p.contrast, transparent: p.transparent });
export const isPlainGeometry = (p: ImageParams): boolean => p.crop === undefined && !p.flipX && !p.flipY && !p.quarterTurns;
export const needsPixels = (p: ImageParams): boolean => p.transparent !== undefined || !!p.brightness || !!p.contrast;
export const isNeutral = (p: ImageParams): boolean => isPlainGeometry(p) && !needsPixels(p);

const canon = (p: ImageParams): string => {
  const t = p.transparent;
  return JSON.stringify([
    p.crop ?? null,
    p.flipX === true,
    p.flipY === true,
    p.quarterTurns ?? 0,
    p.brightness ?? 0,
    p.contrast ?? 0,
    t === undefined ? null : [t.color, t.tolerance, t.soft, t.contiguous],
  ]);
};
/** Même état (neutres compris) : comparaison du faux cœur (D38). */
export const sameParams = (a: ImageParams, b: ImageParams): boolean => canon(a) === canon(b);

/** Retourner « tel qu'on le voit » (I11) : avec un nombre impair de quarts de tour, c'est l'autre axe de la source. */
export function flipShown(p: ImageParams, axis: "h" | "v"): ImageParams {
  const sourceX = (axis === "h") !== odd(p);
  return clean(sourceX ? { ...p, flipX: !p.flipX } : { ...p, flipY: !p.flipY });
}

/** Tourner l'image affichée d'un quart de tour (1 : horaire ⟳, −1 : antihoraire ⟲). */
export function turnShown(p: ImageParams, dir: 1 | -1): ImageParams {
  return clean({ ...p, quarterTurns: ((p.quarterTurns ?? 0) + dir + 4) % 4 });
}

/** Quart de tour horaire (x, y) → (−y, x) et son inverse, parties linéaires seules. */
const CW: Matrix = [0, 1, -1, 0, 0, 0];
const CCW: Matrix = [0, -1, 1, 0, 0, 0];

/**
 * Matrice après une retouche (I9) : le centre de la zone source commune aux réglages avant et après (intersection des
 * deux rognages ; vide : centre du nouveau rognage) reste au même point de la page. Partie linéaire inchangée si la
 * parité des quarts de tour ne change pas ; sinon conjuguée par le quart de tour ajouté (L' = Q · L · Q⁻¹ : l'étirement
 * suit le contenu).
 */
export function placeAfter(m: Matrix, i: ImageData, next: ImageParams): Matrix {
  const after: ImageData = { asset: i.asset, w: i.w, h: i.h, ...next };
  const [ax, ay, aw, ah] = cropOf(i);
  const [bx, by, bw, bh] = cropOf(after);
  const x0 = Math.max(ax, bx);
  const y0 = Math.max(ay, by);
  const x1 = Math.min(ax + aw, bx + bw);
  const y1 = Math.min(ay + ah, by + bh);
  const [px, py]: [number, number] = x1 > x0 && y1 > y0 ? [(x0 + x1) / 2, (y0 + y1) / 2] : [bx + bw / 2, by + bh / 2];
  const [wx, wy] = applyMatrix(m, ...sourceToDisplay(i, px, py));
  const d = ((((after.quarterTurns ?? 0) - (i.quarterTurns ?? 0)) % 4) + 4) % 4;
  const linear: Matrix = [m[0], m[1], m[2], m[3], 0, 0];
  const l = d % 2 === 1 ? composeMatrix(d === 1 ? CW : CCW, composeMatrix(linear, d === 1 ? CCW : CW)) : linear;
  const [dx, dy] = sourceToDisplay(after, px, py);
  return [l[0], l[1], l[2], l[3], wx - (l[0] * dx + l[2] * dy), wy - (l[1] * dx + l[3] * dy)];
}

/** Cadre (boîte affichée de `i`) d'un rognage source : rectangle aligné, retournements et quarts de tour compris. */
export function frameOf(i: ImageData, c: Crop): Bounds {
  const [ax, ay] = sourceToDisplay(i, c[0], c[1]);
  const [bx, by] = sourceToDisplay(i, c[0] + c[2], c[1] + c[3]);
  return { x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) };
}

/** Rognage source d'un cadre tracé dans la boîte affichée de `i` (image entière) : arrondi au pixel, borné à l'image,
 *  1 pixel source au moins (I28). */
export function cropFromDisplay(i: ImageData, b: Bounds): Crop {
  const [ax, ay] = displayToSource(i, b.x0, b.y0);
  const [bx, by] = displayToSource(i, b.x1, b.y1);
  const span = (a: number, z: number, max: number): [number, number] => {
    const lo = Math.min(max - 1, Math.max(0, Math.round(Math.min(a, z))));
    const hi = Math.min(max, Math.max(lo + 1, Math.round(Math.max(a, z))));
    return [lo, hi - lo];
  };
  const [x, w] = span(ax, bx, i.w);
  const [y, h] = span(ay, by, i.h);
  return [x, y, w, h];
}

function transparentOf(t: unknown): TransparentColor | null {
  if (typeof t !== "object" || t === null) return null;
  const { color, tolerance, soft, contiguous } = t as Record<string, unknown>;
  if (typeof color !== "string" || !HEX6.test(color) || !intIn(tolerance, 0, 100) || !intIn(soft, 0, 100) || typeof contiguous !== "boolean") return null;
  return { color, tolerance, soft, contiguous };
}

/** Rognage du domaine (I5) ; "full" = l'image entière (neutre). */
function cropIn(c: unknown, w: number, h: number): Crop | "full" | null {
  if (!Array.isArray(c) || c.length !== 4) return null;
  const [x, y, cw, ch] = c as unknown[];
  if (!intIn(x, 0, MAX_INT) || !intIn(y, 0, MAX_INT) || !intIn(cw, 1, MAX_INT) || !intIn(ch, 1, MAX_INT)) return null;
  if (x + cw > w || y + ch > h) return null;
  return x === 0 && y === 0 && cw === w && ch === h ? "full" : [x, y, cw, ch];
}

/** Domaine de I5 et neutres retirés (I4) ; null hors domaine. Mêmes règles que `normalize` du cœur (`image.rs`). */
export function normalizeParams(p: ImageParams, w: number, h: number): ImageParams | null {
  const raw = p as Readonly<Record<string, unknown>>;
  let crop: Crop | undefined;
  if (raw["crop"] !== undefined) {
    const c = cropIn(raw["crop"], w, h);
    if (c === null) return null;
    crop = c === "full" ? undefined : c;
  }
  for (const k of ["flipX", "flipY"]) if (raw[k] !== undefined && typeof raw[k] !== "boolean") return null;
  const q = raw["quarterTurns"] ?? 0;
  const b = raw["brightness"] ?? 0;
  const ct = raw["contrast"] ?? 0;
  if (!intIn(q, 0, 3) || !intIn(b, -100, 100) || !intIn(ct, -100, 100)) return null;
  let transparent: TransparentColor | undefined;
  if (raw["transparent"] !== undefined) {
    const t = transparentOf(raw["transparent"]);
    if (t === null) return null;
    transparent = t;
  }
  return clean({ crop, flipX: raw["flipX"] === true, flipY: raw["flipY"] === true, quarterTurns: q, brightness: b, contrast: ct, transparent });
}

const KEYS = ["crop", "flipX", "flipY", "quarterTurns", "brightness", "contrast", "transparent"] as const;

/** Lecture tolérante (U3, I5) : chaque champ est contrôlé seul ; illisible ou hors domaine, il est lu comme absent. */
export function readParams(raw: Readonly<Record<string, unknown>>, w: number, h: number): ImageParams {
  let out: ImageParams = {};
  for (const key of KEYS) {
    const v = raw[key];
    if (v === undefined || v === null) continue;
    const one = normalizeParams({ [key]: v } as ImageParams, w, h);
    if (one !== null) out = { ...out, ...one };
  }
  return out;
}

/** Clé des pixels d'une image (I19) : asset et réglages calculés par le Worker, rien de la géométrie. */
export function pixelKey(i: ImageData): string {
  const t = i.transparent;
  return JSON.stringify([i.asset, t === undefined ? null : [t.color, t.tolerance, t.soft, t.contiguous], i.brightness ?? 0, i.contrast ?? 0]);
}

/** Échelle écran d'une image : zoom de la caméra par l'échelle de sa matrice (racine du déterminant). */
export const screenScale = (zoom: number, m: Matrix): number => zoom * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
