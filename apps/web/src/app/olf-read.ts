/**
 * Lecteur `.olf` de myViewBoard (C13 lot 2, N8, N9, DA3) : `content.json` → pages BoardList et avertissements. Lu dans
 * le Worker ZIP (`zip-worker.ts`, `op: "olf"`), jamais sur le fil principal ; la page repasse le flux par
 * `decodeBoardList` (mêmes bornes que le Rust). Matrice d'élément lue par lignes (`a,c,e,b,d,f,0,0,1`), composée à gauche
 * par l'échelle `PAGE_WIDTH / largeur du viewbox` ; la matrice de page est une caméra, jamais appliquée ; `custom-data`
 * (XAML) jamais lu. Tout champ lu est contrôlé : une valeur absurde rend l'objet illisible, jamais une exception (sauf
 * racine illisible). Aucun DOM.
 */
import { PAGE_HEIGHT, PAGE_WIDTH, PDF_MAX_PAGES, type Matrix, type TextAttrs, type TextSpan } from "../core/api";
import { safeArchivePath } from "../platform/archive-path";
import { MAX_POINTS, MAX_SPANS, type BoardListPage, type BoardObject } from "./board-io";
import { BOARD_MAX_OBJECTS, BOARD_OBJECTS_MESSAGE, SKIPPED_LABEL } from "./board-files";

export const OLF_BROKEN_MESSAGE = "fichier endommagé : content.json illisible";
/** Plus gros exemple relevé : 2,6 Mo. */
export const OLF_MAX_JSON_BYTES = 64 * 1024 * 1024;
export const OLF_TOO_BIG_MESSAGE = "fichier endommagé : content.json trop gros (plus de 64 Mio)";

type Label = readonly [string, string];
const HIGHLIGHTER_LABEL: Label = ["surligneur rendu en trait", "surligneurs rendus en trait"];
const HIDDEN_LABEL: Label = ["page masquée importée", "pages masquées importées"];
const WIDGET_LABEL: Label = ["widget non lu", "widgets non lus"];
const UNKNOWN_LABEL: Label = ["objet d'un type non lu", "objets d'un type non lu"];
const BACKGROUND_LABEL: Label = ["fond non lu", "fonds non lus"];
const REMOTE_LABEL: Label = ["image distante ou hors de l'archive non chargée", "images distantes ou hors de l'archive non chargées"];
const DEFAULT_TEXT_SIZE = 24;
const DEFAULT_TEXT_COLOR = "#000000";

const COLOR = /^#(?:([0-9a-f]{2}))?([0-9a-f]{6})$/i;
/** `#RRGGBB` ou `#AARRGGBB` (alpha ignoré) → `#rrggbb` ; null si illisible. */
export function olfColor(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = COLOR.exec(s.trim());
  return m === null ? null : `#${m[2]!.toLowerCase()}`;
}

/** Matrice 3×3 par lignes `a,c,e,b,d,f,0,0,1` → `[a, b, c, d, e, f]`, échelle `s` appliquée ; absente : l'échelle seule ; null si illisible (dont toute valeur non chaîne). */
export function olfMatrix(s: unknown, scale: number): Matrix | null {
  if (s === undefined) return [scale, 0, 0, scale, 0, 0];
  if (typeof s !== "string") return null;
  const v = s.split(",").map((x) => Number(x.trim()));
  if (v.length < 6 || v.slice(0, 6).some((x) => !Number.isFinite(x))) return null;
  const [a, c, e, b, d, f] = v as [number, number, number, number, number, number];
  return [scale * a, scale * b, scale * c, scale * d, scale * e, scale * f];
}

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Avertissements `page N : K <libellé>`, comptés par (page, sorte), dans l'ordre de première apparition. */
class Notes {
  private readonly rows = new Map<string, { page: number; label: Label; n: number }>();
  add(page: number, label: Label): void {
    const key = `${page}|${label[0]}`;
    const row = this.rows.get(key);
    if (row === undefined) this.rows.set(key, { page, label, n: 1 });
    else row.n++;
  }
  list(): string[] {
    return [...this.rows.values()].map((r) => `page ${r.page} : ${r.n} ${r.n === 1 ? r.label[0] : r.label[1]}`);
  }
}

/** Largeur et hauteur d'un viewbox `x y w h` (espaces ou virgules) ; null si illisible. */
function viewBoxSize(v: unknown): [number, number] | null {
  if (typeof v !== "string") return null;
  const n = v.trim().split(/[\s,]+/).map(Number);
  if (n.length !== 4 || !n.every((x) => Number.isFinite(x)) || n[2]! <= 0 || n[3]! <= 0) return null;
  return [n[2]!, n[3]!];
}

/** Repli sans viewbox de page : `olf.width` (puis `PAGE_WIDTH`), `olf.height` (puis au format de la page). */
function fallbackSize(olf: Rec): [number, number] {
  const w = num(olf.width);
  const width = w !== null && w > 0 ? w : PAGE_WIDTH;
  const h = num(olf.height);
  return [width, h !== null && h > 0 ? h : (width * PAGE_HEIGHT) / PAGE_WIDTH];
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
/** Chemin relatif à l'archive, ou null : schéma (`http:`, `file:`, `data:`, lettre de lecteur), absolu, `..`. */
function localPath(v: string): string | null {
  const t = v.trim();
  return SCHEME.test(t) ? null : safeArchivePath(t);
}

const positive = (v: number | null): v is number => v !== null && v > 0;

/** `x,y x,y …` (repère local) → triplets `x, y, pression` (1) ; null si moins de 2 points, plus de `MAX_POINTS`, ou illisible. */
function olfPoints(v: unknown): number[] | null {
  if (typeof v !== "string") return null;
  const text = v.trim();
  // Borne avant l'allocation : les jetons sont comptés un à un, sans tableau, et le décompte s'arrête à `MAX_POINTS + 1`.
  const token = /\S+/g;
  let tokens = 0;
  while (token.exec(text) !== null) if (++tokens > MAX_POINTS) return null;
  const pairs = text.split(/\s+/);
  if (pairs.length < 2) return null;
  const out: number[] = [];
  for (const p of pairs) {
    const xy = p.split(",");
    if (xy.length !== 2 || xy[0] === "" || xy[1] === "") return null;
    const x = Number(xy[0]);
    const y = Number(xy[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    out.push(x, y, 1);
  }
  return out;
}

function readStroke(b: Rec, scale: number): BoardObject | null {
  const m = olfMatrix(b.matrix, scale);
  const color = olfColor(b.stroke);
  const width = num(b["pen-width"]);
  const points = olfPoints(b.points);
  if (m === null || color === null || !positive(width) || points === null) return null;
  return { kind: "stroke", m, color, width, points };
}

function readImage(b: Rec, scale: number, path: string): BoardObject | null {
  const m = olfMatrix(b.matrix, scale);
  const x = num(b.x);
  const y = num(b.y);
  const w = num(b.width);
  const h = num(b.height);
  if (m === null || x === null || y === null || !positive(w) || !positive(h)) return null;
  return { kind: "image", m, x, y, w, h, path };
}

const isBold = (w: unknown): boolean => w === "bold" || (typeof w === "number" ? w >= 600 : typeof w === "string" && Number(w) >= 600);

/** Segment `text-list-container[].text` ; null si illisible (texte non chaîne, taille non finie ou négative). */
function readSpan(t: Rec | null): TextSpan | null {
  if (t === null || typeof t.text !== "string") return null;
  const rawSize = t["font-size"];
  const size = rawSize === undefined ? undefined : num(rawSize);
  if (size === null || (size !== undefined && size < 0)) return null;
  const color = olfColor(t.fill);
  const font = t["font-family"];
  const attrs: TextAttrs = {
    ...(isBold(t["font-weight"]) ? { bold: true as const } : {}),
    ...(t["font-style"] === "italic" ? { italic: true as const } : {}),
    ...(typeof t["text-decoration"] === "string" && /\bunderline\b/.test(t["text-decoration"]) ? { underline: true as const } : {}),
    ...(color !== null ? { color } : {}),
    ...(size !== undefined && size > 0 ? { size } : {}),
    ...(typeof font === "string" && font !== "" ? { font } : {}),
  };
  return { text: t.text, attrs };
}

/** Paragraphes séparés par un segment `"\n"` ; taille et couleur de boîte : celles du premier segment (repli 24, noir). */
function readText(b: Rec, scale: number): BoardObject | null {
  const m = olfMatrix(b.matrix, scale);
  const x = num(b.x);
  const y = num(b.y);
  const boxWidth = num(b.width);
  const boxHeight = num(b.height);
  if (m === null || x === null || y === null || boxWidth === null || boxHeight === null || boxWidth < 0 || boxHeight < 0) return null;
  const blocks = b["text-blocks-container"] ?? [];
  if (!Array.isArray(blocks)) return null;
  const spans: TextSpan[] = [];
  let first: TextSpan | undefined;
  for (const [i, block] of blocks.entries()) {
    const para = rec(rec(block)?.paragraph);
    const list = para?.["text-list-container"] ?? [];
    if (para === null || !Array.isArray(list)) return null;
    // `MAX_SPANS` tient à chaque ajout : un bloc géant n'est jamais lu en entier.
    if (i > 0) {
      if (spans.length >= MAX_SPANS) return null;
      spans.push({ text: "\n", attrs: {} });
    }
    for (const item of list) {
      const span = readSpan(rec(rec(item)?.text));
      if (span === null || spans.length >= MAX_SPANS) return null;
      first ??= span;
      spans.push(span);
    }
  }
  const size = first?.attrs.size ?? DEFAULT_TEXT_SIZE;
  const color = first?.attrs.color ?? DEFAULT_TEXT_COLOR;
  return { kind: "text", m, x, y, boxWidth, boxHeight, size, color, spans };
}

interface Ctx {
  readonly n: number;
  readonly scale: number;
  readonly notes: Notes;
  readonly push: (o: BoardObject) => void;
}

function readElement(el: unknown, c: Ctx): void {
  const r = rec(el);
  const type = r === null ? undefined : Object.keys(r)[0];
  if (r === null || type === undefined) {
    c.notes.add(c.n, SKIPPED_LABEL);
    return;
  }
  const body = rec(r[type]);
  const skip = (): void => c.notes.add(c.n, SKIPPED_LABEL);
  switch (type) {
    case "stroke": {
      const o = body === null ? null : readStroke(body, c.scale);
      if (o === null) return skip();
      if (body!["is-highlighter"] === true) c.notes.add(c.n, HIGHLIGHTER_LABEL);
      return c.push(o);
    }
    case "image": {
      if (body === null || typeof body.source !== "string") return skip();
      const path = localPath(body.source);
      if (path === null) return c.notes.add(c.n, REMOTE_LABEL);
      const o = readImage(body, c.scale, path);
      return o === null ? skip() : c.push(o);
    }
    case "textarea": {
      const o = body === null ? null : readText(body, c.scale);
      return o === null ? skip() : c.push(o);
    }
    case "widget-player":
      return c.notes.add(c.n, WIDGET_LABEL);
    default:
      return c.notes.add(c.n, UNKNOWN_LABEL);
  }
}

function readPage(p: Rec | null, n: number, olf: Rec, notes: Notes, count: { leaves: number }): BoardListPage {
  const objects: BoardObject[] = [];
  let background: string | null = null;
  if (p === null) {
    notes.add(n, SKIPPED_LABEL);
    return { background, objects };
  }
  if (p["is-hidden"] === true) notes.add(n, HIDDEN_LABEL);
  const [w, h] = viewBoxSize(p.viewbox) ?? fallbackSize(olf);
  const scale = PAGE_WIDTH / w;
  // D16 : contrôlé à chaque objet, avant que le fichier entier ne devienne des objets.
  const push = (o: BoardObject): void => {
    if (++count.leaves > BOARD_MAX_OBJECTS) throw new Error(BOARD_OBJECTS_MESSAGE);
    objects.push(o);
  };
  const c: Ctx = { n, scale, notes, push };
  // Fonds d'abord : une image de fond est en bas de pile, couvrant la page.
  for (const item of Array.isArray(p.backgrounds) ? p.backgrounds : []) {
    const bg = rec(rec(item)?.background);
    if (bg === null) {
      notes.add(n, SKIPPED_LABEL);
      continue;
    }
    if (bg.type === undefined) continue; // fond vide (identifiant seul) : rien à lire.
    if (bg.type === "color") {
      const fill = olfColor(bg.fill);
      if (fill === null) notes.add(n, SKIPPED_LABEL);
      else background = fill;
    } else if (bg.type === "image") {
      const src = bg["image-source"] ?? bg.source;
      const path = typeof src === "string" ? localPath(src) : null;
      if (typeof src !== "string") notes.add(n, SKIPPED_LABEL);
      else if (path === null) notes.add(n, REMOTE_LABEL);
      else push({ kind: "image", m: [scale, 0, 0, scale, 0, 0], x: 0, y: 0, w, h, path });
    } else notes.add(n, BACKGROUND_LABEL);
  }
  if (p.elements !== undefined && !Array.isArray(p.elements)) notes.add(n, SKIPPED_LABEL);
  for (const el of Array.isArray(p.elements) ? p.elements : []) readElement(el, c);
  return { background, objects };
}

/** `content.json` → pages (500 au plus, `PDF_MAX_PAGES`), avertissements et `total` (pages avant la coupe, pour
 *  `boardFirstPagesMessage` écrit par la page). Lève `OLF_BROKEN_MESSAGE` (JSON invalide, pile dépassée, racine sans
 *  `olf.pageset` tableau) et `BOARD_OBJECTS_MESSAGE` au-delà de `BOARD_MAX_OBJECTS` objets. */
export function readOlf(json: string): { pages: BoardListPage[]; warnings: string[]; total: number } {
  let root: unknown;
  try {
    root = JSON.parse(json);
  } catch {
    throw new Error(OLF_BROKEN_MESSAGE);
  }
  const olf = rec(rec(root)?.olf);
  const set = olf?.pageset;
  if (olf === null || !Array.isArray(set)) throw new Error(OLF_BROKEN_MESSAGE);
  const notes = new Notes();
  const count = { leaves: 0 };
  const pages = set.slice(0, PDF_MAX_PAGES).map((entry, i) => readPage(rec(rec(entry)?.page), i + 1, olf, notes, count));
  return { pages, warnings: notes.list(), total: set.length };
}
