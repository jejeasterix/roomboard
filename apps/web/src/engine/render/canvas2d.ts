/**
 * Rendu Canvas 2D à deux canvas (D19, DA2) : scène fixe (redessinée sur changement ou caméra) et interaction
 * (`desynchronized`, effacée à chaque image : encre vive, prédits compris, aperçu de gomme). `Path2D` en cache par id,
 * invalidé par `Change`. Échelle exacte tampon / CSS : l'arrondi du tampon ne décale pas l'encre (lot 1, T6c). Lignes de
 * grille gardées par `GridLinesCache` (C9 éditeur, E3).
 */
import { PDF_PAGE_KIND } from "../../core/api";
import { endArrowheadOf, opacityOf, roughnessOf, roundnessOf, startArrowheadOf, strokeKindOf, textAlignOf, type Arrowhead, type Look, type TextAlign } from "../../core/look";
import type { BackdropView, Bounds, Change, ElementView, GridLines, ImageElement, Matrix, MediaData, Model3dData, ShapeData, StrokeStyle, TableData, TextData } from "../../core/api";
import { cropOf, displaySize, isPlainGeometry, orientMatrix, screenScale } from "../../core/image-params";
import { arrowWings, catmullRom, flattenPath, lineGeomOf, linePath, normalizeShape } from "../../core/shapes";
import type { Camera } from "../camera";
import { PAGE_BACKGROUND, PAGE_HEIGHT, PAGE_WIDTH, SURROUND_COLOR, pageFrame, visibleGridRect, visiblePageRect, type PageRect } from "../page";
import { faceOf, layoutRich, measureWith, textFont, type RichLine } from "../text-layout";
import { HANDLE_PX, handlesOf } from "../tools/handles";
import type { ImageSource } from "./image-cache";
import type { MediaFrames } from "./media-frames";
import type { ModelFrames } from "./model-frames";
import { GridLinesCache } from "./grid-cache";
import { MIN_DOT_PX, MIN_GRID_PX, paintGrid } from "./grid-paint";
import { EMPTY_OVERLAY, type EditOverlay } from "./overlay";
import { linkBadgeBox, paintLinkBadge } from "./link-badge";
import type { BackdropPainter, BackdropState, EraserPreview, GridPreview, ImagePreview, LiveLayer, LiveStrokeView, PageView, Renderer, SceneSource } from "./renderer";
import { setLiveOpacity } from "./renderer";
import { cornerRadius, dashOf, hatched, headWings, seedOf, sketchShape, strokeWith, wingDashOf, type SketchMemo, type SketchPlan } from "./sketch";
import { cellTextBoxes, paintTableGrid, type CellTextBox } from "./table-paint";

export interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
}

export interface Canvas2DOptions {
  /** Fabrique de chemins : Node n'a pas Path2D, les tests en passent une fausse. */
  readonly makePath?: () => Path2D;
  /** Bitmaps des images par empreinte (R16, DAR2) ; absent : cadre gris. */
  readonly images?: ImageSource;
  /** C12 (DAPF2) : peintre du fond `pdf-page` ; absent : placeholder et « page PDF illisible ». */
  readonly backdrop?: BackdropPainter;
  /** C12 (PF15) : état du fond après chaque scène. */
  readonly onBackdrop?: (s: BackdropState) => void;
  /** C14 (M20) : image courante des lecteurs de média ; absent (export PDF, M34) : poster. */
  readonly media?: MediaFrames;
  /** C15 (X25) : image du rendu 3D partagé, par élément ; absent (export PDF, vignette) : instantané. */
  readonly models?: ModelFrames;
  /** C14 (R7) : nom de l'asset d'un son, pour sa carte ; absent ou null : « Son ». */
  readonly assetName?: (asset: string) => string | null;
  /** C14 (R7) : rendu d'export : le badge « lecture » n'est pas dessiné. */
  readonly forExport?: boolean;
  /** C11a (P14) : fenêtre d'annotation : pourtour et fond de page effacés au lieu d'être peints ; défaut faux. */
  readonly transparent?: boolean;
}

/** Options du peintre d'un export (PDF, superposition PNG ou vectorielle) : rendu d'export (sans badge « lecture », R7),
 *  ni lecteurs de média (poster, M34) ni nom de son. */
/** Cadre de la page montrée (DA4), règle commune aux deux rendus : `pageFrame` ; null en Infini. */
export function frameOfView(page: PageView): PageRect | null {
  return pageFrame({ width: page.width ?? PAGE_WIDTH, height: page.height ?? PAGE_HEIGHT, backdrop: page.backdrop ?? null, mode: page.mode ?? "page" });
}

export function exportPainterOptions(images: ImageSource, extra: Pick<Canvas2DOptions, "makePath"> = {}): Canvas2DOptions {
  return { images, ...extra, forExport: true };
}

/** Polygones fermés x, y alternés ; une paire non finie (NaN, NaN) commence un nouveau polygone. */
export function tracePolygons(p: PathSink, flat: ArrayLike<number>): void {
  let open = false;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const x = flat[i] ?? Number.NaN;
    const y = flat[i + 1] ?? Number.NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (open) p.closePath();
      open = false;
      continue;
    }
    if (open) p.lineTo(x, y);
    else {
      p.moveTo(x, y);
      open = true;
    }
  }
  if (open) p.closePath();
}

/** Anneaux `[n, x0, y0, …]` d'un `fill` (C8, Q12) : un sous-chemin fermé par anneau ; un compte illisible (non entier,
 *  < 3) ou un anneau tronqué arrête la lecture. */
export function traceRings(p: PathSink, flat: ArrayLike<number>): void {
  let k = 0;
  while (k < flat.length) {
    const n = flat[k] ?? 0;
    if (!Number.isInteger(n) || n < 3 || k + 1 + 2 * n > flat.length) return;
    for (let i = 0; i < n; i++) {
      const x = flat[k + 1 + 2 * i] ?? 0;
      const y = flat[k + 2 + 2 * i] ?? 0;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
    k += 1 + 2 * n;
  }
}

/** Bord lointain du pourtour pour la découpe de l'aperçu de gomme (unités monde). */
const FAR = 1e7;

/** Demi-épaisseur du stylo par défaut (4 unités, HL3-3) : la coupe réelle vaut rayon + demi-épaisseur (HL3-2). */
export const PEN_HALF_WIDTH = 2;

export const SELECTION_COLOR = "#1e3a8a";
export const BAND_FILL = "rgba(30, 58, 138, 0.08)";
export const HANDLE_FILL = "#ffffff";

/** Huit poignées d'un cadre : carrés `HANDLE_PX` à `px` unités par pixel écran, remplis puis tracés avec le style courant. */
function paintHandles(ctx: CanvasRenderingContext2D, frame: Bounds, px: number): void {
  ctx.fillStyle = HANDLE_FILL;
  const half = (HANDLE_PX / 2) * px;
  for (const h of handlesOf(frame)) {
    ctx.beginPath();
    ctx.rect(h.x - half, h.y - half, 2 * half, 2 * half);
    ctx.fill();
    ctx.stroke();
  }
}

/** Cadre d'une image pas encore décodée et d'un élément inconnu (U3, R16). */
export const PLACEHOLDER_FILL = "#e5e7eb";
export const PLACEHOLDER_STROKE = "#9ca3af";
export const UNKNOWN_LABEL = "objet non pris en charge";
/** Voile hors du cadre de rognage (C5, I28). */
export const CROP_VEIL = "rgba(15, 23, 42, 0.5)";
/** C12 (PF14) : fond de page pas encore rendu (gris clair), et libellé d'un fond PDF illisible. */
export const BACKDROP_PLACEHOLDER = "#f1f5f9";
export const BACKDROP_UNREADABLE_LABEL = "page PDF illisible";

/** Cadre gris de la boîte locale (0, 0)-(w, h), avec un libellé pour un élément inconnu. */
function paintPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number, label: string | null): void {
  ctx.fillStyle = PLACEHOLDER_FILL;
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.strokeStyle = PLACEHOLDER_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke();
  if (label !== null) {
    ctx.font = textFont(16);
    ctx.fillStyle = PLACEHOLDER_STROKE;
    ctx.textBaseline = "top";
    ctx.fillText(label, 8, 8);
  }
}

/** C14 (M20) : carte d'un son, barre d'avancement, badge « lecture ». */
export const AUDIO_CARD_FILL = "#f1f5f9";
export const AUDIO_CARD_LABEL = "Son";
export const MEDIA_PROGRESS_COLOR = "#1e3a8a";
export const MEDIA_BADGE_FILL = "rgba(15, 23, 42, 0.6)";
const AUDIO_CARD_TEXT = "#0f172a";
const MEDIA_BAR_HEIGHT = 6;
const MEDIA_BADGE_MARGIN = 8;

/** Boîte (0, 0)-(w, h) d'un média : image du lecteur, sinon poster, sinon cadre gris ; un son : sa carte. */
function paintMedia(
  ctx: CanvasRenderingContext2D,
  m: MediaData,
  frame: CanvasImageSource | null,
  progress: { readonly time: number; readonly playing: boolean } | null,
  images: ImageSource | null,
  name: string | null,
  badge: boolean,
): void {
  if (m.mediaType === "audio") {
    ctx.fillStyle = AUDIO_CARD_FILL;
    ctx.fillRect(0, 0, m.w, m.h);
    ctx.font = textFont(16);
    ctx.fillStyle = AUDIO_CARD_TEXT;
    ctx.textBaseline = "top";
    ctx.fillText(name ?? AUDIO_CARD_LABEL, 8, 8);
    if (progress !== null) {
      const end = m.trimEnd ?? m.duration;
      const span = end - m.trimStart;
      const ratio = span > 0 ? Math.min(1, Math.max(0, (progress.time - m.trimStart) / span)) : 0;
      ctx.fillStyle = MEDIA_PROGRESS_COLOR;
      ctx.fillRect(0, m.h - MEDIA_BAR_HEIGHT, m.w * ratio, MEDIA_BAR_HEIGHT);
    }
  } else {
    const bmp = frame ?? (m.poster !== null ? (images?.bitmap(m.poster) ?? null) : null);
    if (bmp !== null) ctx.drawImage(bmp, 0, 0, m.w, m.h);
    else paintPlaceholder(ctx, m.w, m.h, null);
  }
  if (badge && progress?.playing !== true) {
    const s = Math.min(m.w, m.h) / 6;
    const x = MEDIA_BADGE_MARGIN;
    const y = m.h - MEDIA_BADGE_MARGIN - s;
    ctx.fillStyle = MEDIA_BADGE_FILL;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x + s * 0.3, y + s * 0.2);
    ctx.lineTo(x + s * 0.3, y + s * 0.8);
    ctx.lineTo(x + s * 0.8, y + s * 0.5);
    ctx.closePath();
    ctx.fill();
  }
}

/** C15 (X25) : carte d'un objet 3D sans image (instantané absent ou pas encore décodé). */
export const MODEL3D_CARD_LABEL = "Objet 3D";

/** Boîte (0, 0)-(w, h) d'un objet 3D : image du rendu partagé, sinon instantané, sinon carte « Objet 3D » + nom.
 *  Même boîte pour l'image vivante et l'instantané : pas de saut au relâché. */
function paintModel3d(
  ctx: CanvasRenderingContext2D,
  m: Model3dData,
  frame: CanvasImageSource | null,
  images: ImageSource | null,
  name: string | null,
): void {
  const bmp = frame ?? (m.snapshot !== null ? (images?.bitmap(m.snapshot) ?? null) : null);
  if (bmp !== null) {
    ctx.drawImage(bmp, 0, 0, m.w, m.h);
    return;
  }
  paintPlaceholder(ctx, m.w, m.h, MODEL3D_CARD_LABEL);
  if (name !== null) {
    ctx.font = textFont(16);
    ctx.fillStyle = PLACEHOLDER_STROKE;
    ctx.textBaseline = "top";
    ctx.fillText(name, 8, 30);
  }
}

/** Quart d'angle arrondi : la quadratique (x0, y0) → (qx, qy) → (x, y) en cubique exacte (`RecordingContext2D`, l'export
 *  vectoriel, ne connaît pas `quadraticCurveTo`). */
function corner(ctx: CanvasRenderingContext2D, x0: number, y0: number, qx: number, qy: number, x: number, y: number): void {
  const k = 2 / 3;
  ctx.bezierCurveTo(x0 + k * (qx - x0), y0 + k * (qy - y0), x + k * (qx - x), y + k * (qy - y), x, y);
}

/** Avant-dernier point du chemin aplati : d'où arrive le dernier segment (la pointe de fin s'y oriente). */
function headFrom(pts: readonly (readonly [number, number])[], curve: boolean): readonly [number, number] {
  const flat = flattenPath(pts, curve);
  return flat[flat.length - 2] ?? [0, 0];
}

/** Second point du chemin aplati : où part le premier segment (la pointe de début s'y oriente). */
function headSecond(pts: readonly (readonly [number, number])[], curve: boolean): readonly [number, number] {
  const flat = flattenPath(pts, curve);
  return flat[1] ?? [0, 0];
}

/** Chemin d'une forme dans son repère local (boîte (0, 0)-(w, h) ou segment (0, 0)-(w, h)) ; `round` (OG11) : rectangle
 *  aux angles arrondis en Bézier (jamais `roundRect`), rayon `cornerRadius`. */
export function traceShape(ctx: CanvasRenderingContext2D, s: ShapeData, width: number, round = false, look?: Look, noHead = false): void {
  ctx.beginPath();
  if (s.shape === "rect" && round) {
    const { w, h } = s;
    const r = cornerRadius(w, h);
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    corner(ctx, w - r, 0, w, 0, w, r);
    ctx.lineTo(w, h - r);
    corner(ctx, w, h - r, w, h, w - r, h);
    ctx.lineTo(r, h);
    corner(ctx, r, h, 0, h, 0, h - r);
    ctx.lineTo(0, r);
    corner(ctx, 0, r, 0, 0, r, 0);
    ctx.closePath();
  } else if (s.shape === "rect") {
    ctx.rect(0, 0, s.w, s.h);
  } else if (s.shape === "ellipse") {
    ctx.ellipse(s.w / 2, s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
  } else {
    // OG12 : chemin à points intérieurs (polyligne) ou courbe (Bézier de Catmull-Rom) ; jamais `quadraticCurveTo`.
    const g = lineGeomOf(s, look);
    const pts = linePath(s.w, s.h, g.inner);
    ctx.moveTo(0, 0);
    if (g.curve && pts.length > 2) for (const [, c1, c2, p] of catmullRom(pts)) ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p[0], p[1]);
    else for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    const [fx, fy] = headFrom(pts, g.curve);
    const head = s.shape === "arrow" && !noHead ? headWings(s.w, s.h, fx, fy, width) : null;
    if (head) {
      ctx.moveTo(head[0], head[1]);
      ctx.lineTo(s.w, s.h);
      ctx.lineTo(head[2], head[3]);
    }
  }
}

/** Pointe (OG11, lot 2) : trace le chemin de la pointe dont la pointe est `(tipX, tipY)`, fût venant de `(fromX, fromY)`
 *  (ailes de `arrowWings`) ; `triangle` est rempli (de `color` s'il est donné). Le trait reste à l'appelant. `none` ou
 *  pointe dégénérée : rien n'est tracé, faux. */
export function arrowhead(
  ctx: CanvasRenderingContext2D, kind: Arrowhead, tipX: number, tipY: number, fromX: number, fromY: number, width: number, color?: string,
): boolean {
  if (kind === "bar") {
    const l = Math.max(12, 3 * width) / 2;
    const d = Math.hypot(tipX - fromX, tipY - fromY) || 1;
    const nx = -(tipY - fromY) / d;
    const ny = (tipX - fromX) / d;
    ctx.beginPath();
    ctx.moveTo(tipX + nx * l, tipY + ny * l);
    ctx.lineTo(tipX - nx * l, tipY - ny * l);
    return true;
  }
  if (kind === "circle" || kind === "circle_outline") {
    const r = Math.max(4, 1.5 * width);
    const d = Math.hypot(tipX - fromX, tipY - fromY) || 1;
    ctx.beginPath();
    ctx.arc(tipX - ((tipX - fromX) / d) * r, tipY - ((tipY - fromY) / d) * r, r, 0, Math.PI * 2);
    if (kind === "circle") {
      if (color !== undefined) ctx.fillStyle = color;
      ctx.fill();
    }
    return true;
  }
  const head = kind === "none" ? null : headWings(tipX, tipY, fromX, fromY, width);
  if (!head) return false;
  ctx.beginPath();
  ctx.moveTo(head[0], head[1]);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(head[2], head[3]);
  if (kind === "arrow") return true;
  ctx.closePath();
  if (kind === "triangle") {
    if (color !== undefined) ctx.fillStyle = color;
    ctx.fill();
  }
  return true;
}

/** Forme dans son repère local (OG11) : tracé roughjs si `roughness` > 0 (graine `look.seed`, sinon `seed`) ; sinon le
 *  tracé net, tirets et angles seulement s'ils sont demandés — aspect absent ou neutre : les appels d'avant OG11, à
 *  l'identique (`ARCHITECTE_RECT_MAIN`). L'opacité est posée par l'appelant, dans le save/restore de l'élément. */
export function paintShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle, look?: Look, seed?: number, memo?: SketchMemo): void {
  if (roughnessOf(look) > 0 || hatched(s, look)) {
    sketchShape(ctx, s, style, look ?? {}, look?.seed ?? seed ?? 0, memo);
    return;
  }
  const dash = dashOf(strokeKindOf(look), style.width);
  const startKind = startArrowheadOf(look);
  const endKind = endArrowheadOf(look);
  if (s.shape === "arrow" && (startKind !== "none" || endKind !== "arrow" || dash.length > 0)) {
    // Pointes personnalisées ou trait en tirets : le fût seul (tirets compris), puis chaque pointe à part, pleine (ou pointillés resserrés).
    traceShape(ctx, s, style.width, false, look, true);
    strokeWith(ctx, style, dash);
    const wd = wingDashOf(strokeKindOf(look), style.width);
    const g = lineGeomOf(s, look);
    const pts = linePath(s.w, s.h, g.inner);
    const [pfx, pfy] = headFrom(pts, g.curve);
    const [psx, psy] = headSecond(pts, g.curve);
    for (const [k, tx, ty, fx, fy] of [[endKind, s.w, s.h, pfx, pfy], [startKind, 0, 0, psx, psy]] as const) {
      if (k === "none") continue;
      if (arrowhead(ctx, k, tx, ty, fx, fy, style.width, style.color)) strokeWith(ctx, style, wd);
    }
    return;
  }
  traceShape(ctx, s, style.width, roundnessOf(look) === "round", look);
  if (s.fill !== null && (s.shape === "rect" || s.shape === "ellipse")) {
    ctx.fillStyle = s.fill;
    ctx.fill();
  }
  strokeWith(ctx, style, dash);
}

/** Opacité d'un aspect (0..100) appliquée au contexte ; 100 (neutre) : aucun appel. */
function applyOpacity(ctx: CanvasRenderingContext2D, look: Look | undefined): void {
  const o = opacityOf(look);
  if (o < 100) ctx.globalAlpha *= Math.max(0, o) / 100;
}

/** Décalage de ligne de base d'un segment plus petit que sa ligne, position et épaisseur du souligné (HC7-5). */
export const BASELINE_SHIFT = 0.8;
export const UNDERLINE_OFFSET = 0.92;

/**
 * Texte (D14, CL4-4, C7, C10a ; élément `text` et cellules de tableau) : mêmes lignes que la hauteur de boîte mesurée par l'outil (`layoutRich`) ; un fillText par
 * segment ; une ligne d'une seule taille est dessinée comme au socle (même police, `y` = haut de la ligne).
 */
export function paintText(ctx: CanvasRenderingContext2D, lines: readonly RichLine[], color: string, boxWidth = 0, align: TextAlign = "left"): void {
  ctx.textBaseline = "top";
  for (const line of lines) {
    // Alignement (OG11, lot 2) : décalage de la ligne entière dans la boîte (droite : `boxWidth - largeur`, centre : moitié).
    const last = line.segments[line.segments.length - 1];
    const rest = align === "left" || last === undefined ? 0 : boxWidth - (last.x + last.width);
    const dx = align === "right" ? rest : align === "center" ? rest / 2 : 0;
    // Le socle émettait fillText("") pour une ligne vide : conservé (compatibilité S3).
    if (line.segments.length === 0) {
      ctx.font = textFont(line.size);
      ctx.fillStyle = color;
      ctx.fillText("", 0, line.top);
    }
    for (const s of line.segments) {
      const st = s.style;
      const y = st.size === line.size ? line.top : line.top + (line.size - st.size) * BASELINE_SHIFT;
      ctx.font = textFont(st.size, faceOf(st));
      // Couleur de l'élément d'abord : le canvas ignore une couleur qu'il ne sait pas lire (T15 accepte tout nom de 3 à
      // 20 lettres), et `st.color ?? color` laisserait alors celle d'avant (fond de page, segment précédent).
      ctx.fillStyle = color;
      if (st.color !== null) ctx.fillStyle = st.color;
      ctx.fillText(s.text, s.x + dx, y);
      if (st.underline) ctx.fillRect(s.x + dx, y + st.size * UNDERLINE_OFFSET, s.width, st.size / 16);
    }
  }
}

export class Canvas2DRenderer implements Renderer {
  private readonly paths = new Map<string, Path2D | null>();
  /** Tracés roughjs par id (clé : forme, taille, remplissage, couleur, épaisseur, aspect, graine), invalidés comme `paths`. */
  private readonly sketches = new Map<string, SketchPlan>();
  /** Lignes des textes par id (clé : taille, largeur de boîte, segments), invalidées par `Change` comme `paths`. */
  private readonly textLines = new Map<string, { readonly key: string; readonly lines: readonly RichLine[] }>();
  /** Lignes du texte des cellules, par tableau (B1) : même cache et même invalidation que `textLines`. */
  private readonly cellLines = new Map<string, { readonly key: string; readonly lines: readonly (readonly RichLine[])[] }>();
  /** Lignes de grille gardées (E3) : recalculées sur page, zoom, `resize`, sortie du rectangle gardé ou `Change`. */
  private readonly gridCache = new GridLinesCache((page, rect, minStep, minDotStep) => this.computeGrid(page, rect, minStep, minDotStep));
  /** Aperçu de l'éditeur de grille (DAE1) : sur sa page, sa grille remplace celle du document ; servi par le même cache. */
  private gridPreview: GridPreview | null = null;
  /** Aperçu d'une image (C5, DAI4) : ses réglages et sa matrice remplacent ceux du document pour son élément. */
  private imagePreview: ImagePreview | null = null;
  /** Zoom du dernier `drawScene` : traits du cadre de rognage à 1 px écran. */
  private zoom = 1;
  private readonly makePath: () => Path2D;
  private readonly images: ImageSource | null;
  private readonly media: MediaFrames | null;
  private readonly models: ModelFrames | null;
  private readonly assetName: ((asset: string) => string | null) | null;
  private readonly forExport: boolean;
  private readonly backdrop: BackdropPainter | null;
  private readonly onBackdrop: ((s: BackdropState) => void) | null;
  /** Fond du dernier drawScene, repeint par l'aperçu de gomme partielle (D20). */
  private background = PAGE_BACKGROUND;
  /** Cadre de la dernière scène (DA4) : l'aperçu de gomme le relit ; null en Infini. */
  private frame: PageRect | null = { x0: 0, y0: 0, x1: PAGE_WIDTH, y1: PAGE_HEIGHT };

  /** Fond que le canvas a retenu au dernier `drawScene` (écriture normalisée par le navigateur). */
  get pageColor(): string {
    return this.background;
  }
  private sx = 1;
  private sy = 1;
  /** Hauteur CSS retenue par `resize` : le fond de page va jusqu'à son bas. */
  private cssHeight = 0;
  /** Largeur CSS et devicePixelRatio retenus par `resize` : partie visible et épaisseur de la grille (C9). */
  private cssWidth = 0;
  private dpr = 1;
  private readonly transparent: boolean;

  constructor(
    private readonly scene: CanvasRenderingContext2D,
    /** Canvas d'interaction ; null quand WebGL2 le dessine (échelon 4, `webgl2.ts`). */
    private readonly live: CanvasRenderingContext2D | null,
    private readonly source: SceneSource,
    opts: Canvas2DOptions = {},
  ) {
    this.makePath = opts.makePath ?? (() => new Path2D());
    this.images = opts.images ?? null;
    this.media = opts.media ?? null;
    this.models = opts.models ?? null;
    this.assetName = opts.assetName ?? null;
    this.forExport = opts.forExport === true;
    this.backdrop = opts.backdrop ?? null;
    this.onBackdrop = opts.onBackdrop ?? null;
    this.transparent = opts.transparent === true;
  }

  resize(width: number, height: number, dpr: number): void {
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    for (const ctx of [this.scene, this.live]) {
      if (!ctx) continue;
      if (ctx.canvas.width !== w) ctx.canvas.width = w;
      if (ctx.canvas.height !== h) ctx.canvas.height = h;
    }
    this.cssHeight = height;
    this.cssWidth = width;
    this.dpr = dpr;
    this.sx = width > 0 ? w / width : dpr;
    this.sy = height > 0 ? h / height : dpr;
    this.gridCache.clear();
  }

  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay: EditOverlay = EMPTY_OVERLAY): void {
    const ctx = this.scene;
    this.images?.beginScene?.(); // `data-pixels` ne compte que les images de cette scène (I33)
    this.zoom = camera.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Blanc d'abord : le canvas ignore une couleur qu'il ne sait pas lire (un nom CSS accepté par le cœur) ; on retient
    // ce qu'il a vraiment accepté (relu normalisé), que l'aperçu de gomme repeint et que WebGL2 relit (`pageColor`).
    ctx.fillStyle = PAGE_BACKGROUND;
    ctx.fillStyle = page.background ?? PAGE_BACKGROUND;
    this.background = String(ctx.fillStyle);
    this.frame = frameOfView(page);
    // Infini (DA4) : le fond de page sur tout le tampon, aucun pourtour. Page : pourtour, puis la partie visible du cadre.
    if (this.transparent) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    else if (this.frame === null) ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    else {
      ctx.fillStyle = SURROUND_COLOR;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    this.setView(ctx, camera);
    const rect = this.frame === null ? null : visiblePageRect(camera, this.cssWidth, this.cssHeight, this.frame);
    if (rect && !this.transparent) {
      ctx.fillStyle = this.background;
      ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
    }
    // Fond de page (U6, C12 PF14) : sous la grille et sous les éléments (G11).
    const state = page.backdrop ? this.paintBackdrop(ctx, page.backdrop, camera) : "";
    this.onBackdrop?.(state);
    const grid = this.gridOf(page.id, camera);
    if (grid && !grid.above) paintGrid(ctx, grid, camera, this.sx, this.sy, this.dpr);
    const linked: string[] = [];
    for (const id of page.elementIds) {
      if (hidden.has(id)) continue;
      const el = this.source.element(id);
      if (!el) continue;
      this.paintElement(ctx, this.withImagePreview(el), null);
      if (el.look?.link !== undefined) linked.push(id);
    }
    this.paintOverlayContent(ctx, overlay);
    if (grid && grid.above) paintGrid(ctx, grid, camera, this.sx, this.sy, this.dpr);
    this.paintOverlayChrome(ctx, overlay, camera.zoom);
    this.paintLinkBadges(ctx, linked, camera);
    this.images?.endScene?.();
  }

  /** T18 (déc. 38) : badge des éléments liés, en px CSS au pixel de l'appareil, au-dessus du chrome ; jamais à l'export. */
  private paintLinkBadges(ctx: CanvasRenderingContext2D, ids: readonly string[], camera: Camera): void {
    const bounds = this.source.bounds;
    if (this.forExport || ids.length === 0 || bounds === undefined) return;
    ctx.save();
    ctx.setTransform(this.sx, 0, 0, this.sy, 0, 0);
    for (const id of ids) {
      const b = bounds.call(this.source, [id]);
      if (b !== null) paintLinkBadge(ctx, linkBadgeBox(b, camera, this.dpr), SELECTION_COLOR);
    }
    ctx.restore();
  }

  /** Lignes visibles de la grille de la page (G9), servies par le cache (E3) ; null sans source, sans grille ou hors cadre.
   *  Bornées au cadre de la scène ; en Infini, aucune borne (coordonnées négatives comprises). */
  private gridOf(page: string, camera: Camera): GridLines | null {
    const rect = visibleGridRect(camera, this.cssWidth, this.cssHeight, this.frame);
    if (!rect) return null;
    return this.gridCache.get(page, rect, camera.zoom, this.frame);
  }

  /** Placeholder sur `rect`, puis le bitmap d'un fond `image` ou le peintre d'un fond `pdf-page` (PF14) ; un autre genre
   *  (version plus récente) garde le placeholder seul. */
  private paintBackdrop(ctx: CanvasRenderingContext2D, b: BackdropView, camera: Camera): BackdropState {
    const r = b.rect;
    if (r === null) return "echec";
    const w = r.x1 - r.x0;
    const h = r.y1 - r.y0;
    ctx.fillStyle = BACKDROP_PLACEHOLDER;
    ctx.fillRect(r.x0, r.y0, w, h);
    if (b.kind === "image") {
      const bmp = this.images?.bitmap(b.asset) ?? null;
      if (bmp === null) return "attente";
      ctx.drawImage(bmp, r.x0, r.y0, w, h);
      return "pret";
    }
    if (b.kind !== PDF_PAGE_KIND) return "";
    const s = this.backdrop?.paint(ctx, b, camera, { w: this.cssWidth, h: this.cssHeight, dpr: this.dpr }) ?? "echec";
    if (s === "echec") {
      ctx.save();
      ctx.font = textFont(32);
      ctx.fillStyle = PLACEHOLDER_STROKE;
      ctx.textBaseline = "top";
      ctx.fillText(BACKDROP_UNREADABLE_LABEL, r.x0 + 24, r.y0 + 24);
      ctx.restore();
    }
    return s;
  }

  /**
   * Contenu d'une page pour l'export (C12, PF20 à PF22) : grille (sous ou sur les éléments, G11) et éléments, sans
   * pourtour, fond blanc, fond de page ni habillage. `rect` (monde) est projeté sur (0, 0)-(largeur × scale,
   * hauteur × scale) du contexte et découpé ; même code de dessin que l'écran (D7).
   */
  paintContent(ctx: CanvasRenderingContext2D, page: PageView, rect: Bounds, scale: number): void {
    const camera: Camera = { zoom: scale, tx: -rect.x0 * scale, ty: -rect.y0 * scale };
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, camera.tx, camera.ty);
    ctx.beginPath();
    ctx.rect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
    ctx.clip();
    const grid = this.source.gridLines?.(page.id, rect, MIN_GRID_PX / scale, MIN_DOT_PX / scale) ?? null;
    if (grid && !grid.above) paintGrid(ctx, grid, camera, 1, 1, 1);
    for (const id of page.elementIds) {
      const el = this.source.element(id);
      if (el) this.paintElement(ctx, el, null);
    }
    if (grid && grid.above) paintGrid(ctx, grid, camera, 1, 1, 1);
    ctx.restore();
  }

  /** Un élément dans son repère ; `pre` : matrice provisoire posée avant la sienne (fantôme, D38). */
  private paintElement(ctx: CanvasRenderingContext2D, el: ElementView, pre: Matrix | null): void {
    const path = el.kind === "stroke" || el.kind === "fill" ? this.pathOf(el.id, el.kind) : null;
    if ((el.kind === "stroke" || el.kind === "fill") && !path) return;
    ctx.save();
    if (pre) ctx.transform(pre[0], pre[1], pre[2], pre[3], pre[4], pre[5]);
    const [a, b, c, d, e, f] = el.transform;
    ctx.transform(a, b, c, d, e, f);
    applyOpacity(ctx, el.look);
    if (el.kind === "stroke" && path) {
      ctx.fillStyle = el.style.color;
      ctx.fill(path, "nonzero");
    } else if (el.kind === "fill" && path) {
      // C8 (Q15) : trous compris, en pair-impair ; l'export suit par `record-ctx`.
      ctx.fillStyle = el.fill.color;
      ctx.fill(path, "evenodd");
    } else if (el.kind === "shape") {
      paintShape(ctx, el.shape, el.style, el.look, el.look === undefined ? undefined : (el.look.seed ?? seedOf(el.id)), { id: el.id, cache: this.sketches });
    } else if (el.kind === "text") {
      paintText(ctx, this.linesOf(ctx, el.id, el.text), el.style.color, el.text.boxWidth, textAlignOf(el.look));
    } else if (el.kind === "image") {
      this.paintImage(ctx, el);
    } else if (el.kind === "media") {
      const audio = el.media.mediaType === "audio";
      paintMedia(
        ctx, el.media, this.media?.frame(el.id) ?? null, this.media?.progress(el.id) ?? null, this.images,
        audio ? (this.assetName?.(el.media.asset) ?? null) : null, !this.forExport,
      );
    } else if (el.kind === "model3d") {
      paintModel3d(ctx, el.model3d, this.models?.frame(el.id) ?? null, this.images, this.assetName?.(el.model3d.asset) ?? null);
    } else if (el.kind === "table") {
      paintTableGrid(ctx, el.table);
      const boxes = cellTextBoxes(el.table);
      const lines = this.cellLinesOf(ctx, el.id, el.table, boxes);
      boxes.forEach((b, i) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(b.x, b.y, b.w, b.h);
        ctx.clip();
        ctx.transform(1, 0, 0, 1, b.x, b.y);
        paintText(ctx, lines[i] ?? [], el.table.color);
        ctx.restore();
      });
    } else if (el.kind === "unknown") {
      paintPlaceholder(ctx, el.unknown.w, el.unknown.h, UNKNOWN_LABEL);
    }
    ctx.restore();
  }

  /** L'image en aperçu (C5) : réglages et matrice de l'aperçu à la place de ceux du document. */
  private withImagePreview(el: ElementView): ElementView {
    const p = this.imagePreview;
    if (p === null || el.kind !== "image" || el.id !== p.id) return el;
    return { ...el, transform: p.matrix, image: { asset: el.image.asset, w: el.image.w, h: el.image.h, ...p.params } };
  }

  /** Image (C5, I23) : boîte affichée ; rectangle source du rognage mis à l'échelle de la copie d'affichage, retournements
   *  et quarts de tour par la matrice du contexte ; bitmap retouché (`bitmapOf`) ou brut ; jamais `ctx.filter`. Sans
   *  réglage de géométrie : le dessin d'avant C5, à l'identique. */
  private paintImage(ctx: CanvasRenderingContext2D, el: ImageElement): void {
    const i = el.image;
    const p = this.imagePreview;
    const preview = p !== null && p.id === el.id;
    const [bw, bh] = displaySize(i);
    const bmp = (this.images?.bitmapOf?.(el, preview) ?? null) ?? this.images?.bitmap(i.asset) ?? null;
    if (bmp === null) {
      paintPlaceholder(ctx, bw, bh, null);
    } else if (isPlainGeometry(i)) {
      ctx.drawImage(bmp, 0, 0, i.w, i.h);
    } else {
      // Rognage par clip puis drawImage à 5 arguments (le contexte enregistreur de l'export vectoriel, C12, n'en connaît
      // pas d'autre) ; la taille de destination est celle de l'image entière, l'échelle d'une copie réduite est implicite.
      const [cx, cy, cw, ch] = cropOf(i);
      const o = orientMatrix(i);
      ctx.save();
      ctx.transform(o[0], o[1], o[2], o[3], o[4], o[5]);
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.clip();
      ctx.drawImage(bmp, -cx, -cy, i.w, i.h);
      ctx.restore();
    }
    if (p !== null && preview && p.frame !== undefined) this.paintCropFrame(ctx, p.frame, bw, bh, p.matrix);
  }

  /** Cadre de rognage (C5, I28), repère local de l'image : voile hors du cadre, cadre et huit poignées à 1 px écran. */
  private paintCropFrame(ctx: CanvasRenderingContext2D, f: Bounds, bw: number, bh: number, m: Matrix): void {
    const scale = screenScale(this.zoom, m);
    const px = scale > 0 ? 1 / scale : 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, bw, bh);
    ctx.rect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
    ctx.fillStyle = CROP_VEIL;
    ctx.fill("evenodd");
    ctx.beginPath();
    ctx.rect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.lineWidth = px;
    ctx.stroke();
    paintHandles(ctx, f, px);
    ctx.restore();
  }

  /** Contenu du calque d'édition (CL4-1) : fantômes et formes en cours, sous une grille `above` (G11). */
  private paintOverlayContent(ctx: CanvasRenderingContext2D, o: EditOverlay): void {
    for (const g of o.ghosts) {
      const el = this.source.element(g.id);
      if (el) this.paintElement(ctx, this.withImagePreview(el), g.matrix);
    }
    for (const s of o.shapes) {
      const n = normalizeShape(s.shape, s.x0, s.y0, s.x1, s.y1);
      ctx.save();
      ctx.transform(1, 0, 0, 1, n.tx, n.ty);
      applyOpacity(ctx, s.look);
      const pts = s.points !== undefined && s.points.length > 0 ? s.points.map((v, i) => v - (i % 2 === 0 ? s.x0 : s.y0)) : undefined;
      paintShape(ctx, { shape: s.shape, w: n.w, h: n.h, fill: s.fill, ...(pts ? { points: pts } : {}) }, s.style, s.look, s.seed);
      ctx.restore();
    }
  }

  /** Habillage d'édition (CL4-1), en coordonnées monde, toujours au-dessus de la grille ; traits du cadre à 1 px écran. */
  private paintOverlayChrome(ctx: CanvasRenderingContext2D, o: EditOverlay, zoom: number): void {
    const px = 1 / zoom;
    const box = (b: Bounds): void => {
      ctx.beginPath();
      ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    };
    if (o.band) {
      ctx.save();
      ctx.fillStyle = BAND_FILL;
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = px;
      ctx.setLineDash([4 * px, 4 * px]);
      box(o.band);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (o.frame) {
      ctx.save();
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = px;
      ctx.setLineDash([6 * px, 4 * px]);
      box(o.frame);
      ctx.stroke();
      if (o.handles) {
        ctx.setLineDash([]);
        paintHandles(ctx, o.frame, px);
      }
      ctx.restore();
    }
    this.paintLineChrome(ctx, o, px);
  }

  /** OG12 : surlignage de la cible d'accroche (contour à 2 px écran, quatre ancres de 8 px), poignées de points
   *  (disque de 10 px, milieu de 8 px à demi-opacité) et poignées « + » (disque de 28 px, signe de 12 px au trait de 1,5 px). */
  private paintLineChrome(ctx: CanvasRenderingContext2D, o: EditOverlay, px: number): void {
    const disc = (x: number, y: number, diameter: number): void => {
      ctx.beginPath();
      ctx.arc(x, y, (diameter / 2) * px, 0, Math.PI * 2);
    };
    if (o.bind) {
      const el = this.source.element(o.bind.id);
      if (el) {
        ctx.save();
        ctx.strokeStyle = SELECTION_COLOR;
        ctx.lineWidth = 2 * px;
        if (el.kind === "shape" || el.kind === "text") {
          const [a, b, c, d, e, f] = el.transform;
          ctx.transform(a, b, c, d, e, f);
          if (el.kind === "shape") traceShape(ctx, el.shape, el.style.width, roundnessOf(el.look) === "round", el.look);
          else {
            ctx.beginPath();
            ctx.rect(0, 0, el.text.boxWidth, el.text.boxHeight);
          }
        } else {
          // Image, tableau, média, modèle 3D : la boîte d'accroche (cadre monde de l'élément).
          const b = this.source.bounds?.([el.id]) ?? null;
          ctx.beginPath();
          if (b !== null) ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = SELECTION_COLOR;
      for (const [x, y] of o.bind.anchors) {
        disc(x, y, 8);
        ctx.fill();
      }
      ctx.restore();
    }
    if (o.points && o.points.length > 0) {
      ctx.save();
      ctx.lineWidth = px;
      ctx.strokeStyle = SELECTION_COLOR;
      for (const p of o.points) {
        const mid = p.kind === "mid";
        ctx.globalAlpha = mid ? 0.5 : 1;
        ctx.fillStyle = p.selected ? SELECTION_COLOR : HANDLE_FILL;
        disc(p.x, p.y, mid ? 8 : 10);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    if (o.links && o.links.length > 0) {
      ctx.save();
      ctx.strokeStyle = SELECTION_COLOR;
      for (const k of o.links) {
        ctx.fillStyle = HANDLE_FILL;
        ctx.lineWidth = px;
        disc(k.x, k.y, 28);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 1.5 * px;
        ctx.beginPath();
        ctx.moveTo(k.x - 6 * px, k.y);
        ctx.lineTo(k.x + 6 * px, k.y);
        ctx.moveTo(k.x, k.y - 6 * px);
        ctx.lineTo(k.x, k.y + 6 * px);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawLive(live: LiveLayer, camera: Camera): void {
    const ctx = this.live;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    setLiveOpacity(ctx.canvas, live.opacity);
    if (live.strokes.length === 0 && live.erasers.length === 0) return;
    this.setView(ctx, camera);
    const rect = visiblePageRect(camera, this.cssWidth, this.cssHeight, this.frame);
    for (const e of live.erasers) this.paintEraser(ctx, e, rect);
    for (const s of live.strokes) this.paintStroke(ctx, s);
  }

  invalidate(change: Change): void {
    if (change.removed.length > 0) this.images?.forget?.(change.removed);
    this.gridCache.invalidate(change);
    if (change.full) {
      this.paths.clear();
      this.sketches.clear();
      this.textLines.clear();
      this.cellLines.clear();
      return;
    }
    for (const id of [...change.ids, ...change.removed]) {
      this.paths.delete(id);
      this.sketches.delete(id);
      this.textLines.delete(id);
      this.cellLines.delete(id);
    }
  }

  setGridPreview(p: GridPreview | null): void {
    this.gridPreview = p;
    this.gridCache.clear();
  }

  setImagePreview(p: ImagePreview | null): void {
    this.imagePreview = p;
  }

  /** Lignes que le cache demande : celles de l'aperçu sur sa page (DAE1), sinon celles du document. */
  private computeGrid(page: string, rect: Bounds, minStep: number, minDotStep: number): GridLines | null {
    const p = this.gridPreview;
    if (p !== null && p.page === page) {
      return p.grid === null ? null : (this.source.gridLinesOf?.(page, p.grid, rect, minStep, minDotStep) ?? null);
    }
    return this.source.gridLines?.(page, rect, minStep, minDotStep) ?? null;
  }

  private linesOf(ctx: CanvasRenderingContext2D, id: string, t: TextData): readonly RichLine[] {
    const key = `${t.size}|${t.boxWidth}|${JSON.stringify(t.spans)}`;
    const cached = this.textLines.get(id);
    if (cached && cached.key === key) return cached.lines;
    const lines = layoutRich(t.spans, { size: t.size }, t.boxWidth, measureWith(ctx));
    this.textLines.set(id, { key, lines });
    return lines;
  }

  /** Lignes de chaque cellule au texte non vide (B1) : `layoutRich` des segments de la cellule (C7b, R17) ; la clé suit
   *  la largeur de chaque boîte, donc la largeur réunie d'une zone fusionnée (C10b). */
  private cellLinesOf(ctx: CanvasRenderingContext2D, id: string, t: TableData, boxes: readonly CellTextBox[]): readonly (readonly RichLine[])[] {
    const key = `${t.size}|${JSON.stringify(boxes.map((b) => [b.w, b.spans]))}`;
    const cached = this.cellLines.get(id);
    if (cached && cached.key === key) return cached.lines;
    const measure = measureWith(ctx);
    const lines = boxes.map((b) => layoutRich(b.spans, { size: t.size }, b.w, measure));
    this.cellLines.set(id, { key, lines });
    return lines;
  }

  private setView(ctx: CanvasRenderingContext2D, c: Camera): void {
    ctx.setTransform(this.sx * c.zoom, 0, 0, this.sy * c.zoom, this.sx * c.tx, this.sy * c.ty);
  }

  private pathOf(id: string, kind: "stroke" | "fill" = "stroke"): Path2D | null {
    const cached = this.paths.get(id);
    if (cached !== undefined) return cached;
    let path: Path2D | null = null;
    if (kind === "fill") {
      // C8 (Q15) : anneaux immuables par id, lus une fois.
      const rings = this.source.fillRings?.(id) ?? null;
      if (rings && rings.length >= 7) {
        path = this.makePath();
        traceRings(path, rings);
      }
    } else {
      const outline = this.source.outline(id);
      if (outline && outline.length >= 6) {
        path = this.makePath();
        tracePolygons(path, outline);
      }
    }
    this.paths.set(id, path);
    return path;
  }

  private paintStroke(ctx: CanvasRenderingContext2D, s: LiveStrokeView): void {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    tracePolygons(ctx, s.outline);
    ctx.fill("nonzero");
  }

  /**
   * Gomme partielle (D38, HL3-2) : la couleur du fond est peinte le long du chemin, découpée au cadre de la page
   * (blanc dedans, pourtour dehors). Gomme d'objet : rien ici, les traits touchés sont masqués de la scène.
   */
  private paintEraser(ctx: CanvasRenderingContext2D, e: EraserPreview, page: PageRect | null): void {
    // Rendu transparent (C11a) : aucun fond à repeindre, l'aperçu ne laisse pas de traînée sur le bureau ; l'effacement
    // réel s'applique au relâchement.
    if (this.transparent || e.mode !== "partial" || e.path.length < 2) return;
    const x0 = e.path[0] ?? 0;
    const y0 = e.path[1] ?? 0;
    const along = (color: string, region: () => void): void => {
      ctx.save();
      ctx.beginPath();
      region();
      ctx.clip("evenodd");
      ctx.strokeStyle = color;
      ctx.lineWidth = (e.radius + PEN_HALF_WIDTH) * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      if (e.path.length === 2) ctx.lineTo(x0, y0);
      for (let i = 2; i + 1 < e.path.length; i += 2) ctx.lineTo(e.path[i] ?? x0, e.path[i + 1] ?? y0);
      ctx.stroke();
      ctx.restore();
    };
    const pageRect = (): void => {
      if (page) ctx.rect(page.x0, page.y0, page.x1 - page.x0, page.y1 - page.y0);
    };
    if (page) along(this.background, pageRect);
    // Infini : aucun pourtour (le fond couvre toute la vue).
    if (this.frame === null) return;
    along(SURROUND_COLOR, () => {
      ctx.rect(-FAR, -FAR, 2 * FAR, 2 * FAR);
      pageRect();
    });
  }
}

/** Ouvre les deux contextes : scène opaque, interaction `desynchronized` quand le navigateur le permet (D19). */
export function createCanvas2DRenderer(
  scene: HTMLCanvasElement,
  live: HTMLCanvasElement,
  source: SceneSource,
  opts: Canvas2DOptions = {},
): Canvas2DRenderer {
  const sceneCtx = scene.getContext("2d", { alpha: opts.transparent === true });
  const liveCtx = live.getContext("2d", { desynchronized: true });
  if (!sceneCtx || !liveCtx) throw new Error("canvas 2D indisponible");
  return new Canvas2DRenderer(sceneCtx, liveCtx, source, opts);
}
