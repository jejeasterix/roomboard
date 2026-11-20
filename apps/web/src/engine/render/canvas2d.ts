/**
 * Rendu Canvas 2D à deux canvas (D19, DA2) : scène fixe (redessinée sur changement ou caméra) et interaction
 * (`desynchronized`, effacée à chaque image : encre vive, queue prédite, aperçu de gomme). `Path2D` en cache par id,
 * invalidé par `Change`. Échelle exacte tampon / CSS : l'arrondi du tampon ne décale pas l'encre (lot 1, T6c). Lignes de
 * grille gardées par `GridLinesCache` (C9 éditeur, E3).
 */
import { PDF_PAGE_KIND } from "../../core/api";
import type { BackdropView, Bounds, Change, ElementView, GridLines, Matrix, MediaData, ShapeData, StrokeStyle, TableData, TextData } from "../../core/api";
import { arrowWings, normalizeShape } from "../../core/shapes";
import type { Camera } from "../camera";
import { PAGE_BACKGROUND, PAGE_WIDTH, SURROUND_COLOR, visibleGridRect, visiblePageRect, type PageRect } from "../page";
import { faceOf, layoutRich, measureWith, textFont, type RichLine } from "../text-layout";
import { HANDLE_PX, handlesOf } from "../tools/handles";
import type { ImageSource } from "./image-cache";
import type { MediaFrames } from "./media-frames";
import { GridLinesCache } from "./grid-cache";
import { MIN_DOT_PX, MIN_GRID_PX, paintGrid } from "./grid-paint";
import { EMPTY_OVERLAY, type EditOverlay } from "./overlay";
import type { BackdropPainter, BackdropState, EraserPreview, GridPreview, LiveLayer, LiveStrokeView, PageView, Renderer, SceneSource } from "./renderer";
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
  /** C14 (R7) : nom de l'asset d'un son, pour sa carte ; absent ou null : « Son ». */
  readonly assetName?: (asset: string) => string | null;
  /** C14 (R7) : rendu d'export : le badge « lecture » n'est pas dessiné. */
  readonly forExport?: boolean;
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

/** Bord lointain du pourtour pour la découpe de l'aperçu de gomme (unités monde). */
const FAR = 1e7;

/** Demi-épaisseur du stylo par défaut (4 unités, HL3-3) : la coupe réelle vaut rayon + demi-épaisseur (HL3-2). */
export const PEN_HALF_WIDTH = 2;

export const SELECTION_COLOR = "#1e3a8a";
export const BAND_FILL = "rgba(30, 58, 138, 0.08)";
export const HANDLE_FILL = "#ffffff";

/** Cadre d'une image pas encore décodée et d'un élément inconnu (U3, R16). */
export const PLACEHOLDER_FILL = "#e5e7eb";
export const PLACEHOLDER_STROKE = "#9ca3af";
export const UNKNOWN_LABEL = "objet non pris en charge";
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

/** Chemin d'une forme dans son repère local (boîte (0, 0)-(w, h) ou segment (0, 0)-(w, h)). */
export function traceShape(ctx: CanvasRenderingContext2D, s: ShapeData, width: number): void {
  ctx.beginPath();
  if (s.shape === "rect") {
    ctx.rect(0, 0, s.w, s.h);
  } else if (s.shape === "ellipse") {
    ctx.ellipse(s.w / 2, s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(0, 0);
    ctx.lineTo(s.w, s.h);
    const head = s.shape === "arrow" ? arrowWings(s.w, s.h, width) : null;
    if (head) {
      ctx.moveTo(head[0], head[1]);
      ctx.lineTo(s.w, s.h);
      ctx.lineTo(head[2], head[3]);
    }
  }
}

function paintShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle): void {
  traceShape(ctx, s, style.width);
  if (s.fill !== null && (s.shape === "rect" || s.shape === "ellipse")) {
    ctx.fillStyle = s.fill;
    ctx.fill();
  }
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** Décalage de ligne de base d'un segment plus petit que sa ligne, position et épaisseur du souligné (HC7-5). */
export const BASELINE_SHIFT = 0.8;
export const UNDERLINE_OFFSET = 0.92;

/**
 * Texte (D14, CL4-4, C7, C10a ; élément `text` et cellules de tableau) : mêmes lignes que la hauteur de boîte mesurée par l'outil (`layoutRich`) ; un fillText par
 * segment ; une ligne d'une seule taille est dessinée comme au socle (même police, `y` = haut de la ligne).
 */
function paintText(ctx: CanvasRenderingContext2D, lines: readonly RichLine[], color: string): void {
  ctx.textBaseline = "top";
  for (const line of lines) {
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
      ctx.fillText(s.text, s.x, y);
      if (st.underline) ctx.fillRect(s.x, y + st.size * UNDERLINE_OFFSET, s.width, st.size / 16);
    }
  }
}

export class Canvas2DRenderer implements Renderer {
  private readonly paths = new Map<string, Path2D | null>();
  /** Lignes des textes par id (clé : taille, largeur de boîte, segments), invalidées par `Change` comme `paths`. */
  private readonly textLines = new Map<string, { readonly key: string; readonly lines: readonly RichLine[] }>();
  /** Lignes du texte des cellules, par tableau (B1) : même cache et même invalidation que `textLines`. */
  private readonly cellLines = new Map<string, { readonly key: string; readonly lines: readonly (readonly RichLine[])[] }>();
  /** Lignes de grille gardées (E3) : recalculées sur page, zoom, `resize`, sortie du rectangle gardé ou `Change`. */
  private readonly gridCache = new GridLinesCache((page, rect, minStep, minDotStep) => this.computeGrid(page, rect, minStep, minDotStep));
  /** Aperçu de l'éditeur de grille (DAE1) : sur sa page, sa grille remplace celle du document ; servi par le même cache. */
  private gridPreview: GridPreview | null = null;
  private readonly makePath: () => Path2D;
  private readonly images: ImageSource | null;
  private readonly media: MediaFrames | null;
  private readonly assetName: ((asset: string) => string | null) | null;
  private readonly forExport: boolean;
  private readonly backdrop: BackdropPainter | null;
  private readonly onBackdrop: ((s: BackdropState) => void) | null;
  /** Fond du dernier drawScene, repeint par l'aperçu de gomme partielle (D20). */
  private background = PAGE_BACKGROUND;

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
    this.assetName = opts.assetName ?? null;
    this.forExport = opts.forExport === true;
    this.backdrop = opts.backdrop ?? null;
    this.onBackdrop = opts.onBackdrop ?? null;
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = SURROUND_COLOR;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.setView(ctx, camera);
    // Blanc d'abord : le canvas ignore une couleur qu'il ne sait pas lire (un nom CSS accepté par le cœur) ; on retient
    // ce qu'il a vraiment accepté (relu normalisé), que l'aperçu de gomme repeint et que WebGL2 relit (`pageColor`).
    ctx.fillStyle = PAGE_BACKGROUND;
    ctx.fillStyle = page.background ?? PAGE_BACKGROUND;
    this.background = String(ctx.fillStyle);
    const rect = visiblePageRect(camera, this.cssHeight);
    if (rect) ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
    // Fond de page (U6, C12 PF14) : sous la grille et sous les éléments (G11).
    const state = page.backdrop ? this.paintBackdrop(ctx, page.backdrop, camera) : "";
    this.onBackdrop?.(state);
    const grid = this.gridOf(page.id, camera);
    if (grid && !grid.above) paintGrid(ctx, grid, camera, this.sx, this.sy, this.dpr);
    for (const id of page.elementIds) {
      if (hidden.has(id)) continue;
      const el = this.source.element(id);
      if (el) this.paintElement(ctx, el, null);
    }
    this.paintOverlayContent(ctx, overlay);
    if (grid && grid.above) paintGrid(ctx, grid, camera, this.sx, this.sy, this.dpr);
    this.paintOverlayChrome(ctx, overlay, camera.zoom);
  }

  /** Lignes visibles de la grille de la page (G9), servies par le cache (E3) ; null sans source, sans grille ou hors page. */
  private gridOf(page: string, camera: Camera): GridLines | null {
    const rect = visibleGridRect(camera, this.cssWidth, this.cssHeight);
    if (!rect) return null;
    return this.gridCache.get(page, rect, camera.zoom, PAGE_WIDTH);
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
    const path = el.kind === "stroke" ? this.pathOf(el.id) : null;
    if (el.kind === "stroke" && !path) return;
    ctx.save();
    if (pre) ctx.transform(pre[0], pre[1], pre[2], pre[3], pre[4], pre[5]);
    const [a, b, c, d, e, f] = el.transform;
    ctx.transform(a, b, c, d, e, f);
    if (el.kind === "stroke" && path) {
      ctx.fillStyle = el.style.color;
      ctx.fill(path, "nonzero");
    } else if (el.kind === "shape") {
      paintShape(ctx, el.shape, el.style);
    } else if (el.kind === "text") {
      paintText(ctx, this.linesOf(ctx, el.id, el.text), el.style.color);
    } else if (el.kind === "image") {
      const bmp = this.images?.bitmap(el.image.asset) ?? null;
      if (bmp !== null) ctx.drawImage(bmp, 0, 0, el.image.w, el.image.h);
      else paintPlaceholder(ctx, el.image.w, el.image.h, null);
    } else if (el.kind === "media") {
      const audio = el.media.mediaType === "audio";
      paintMedia(
        ctx, el.media, this.media?.frame(el.id) ?? null, this.media?.progress(el.id) ?? null, this.images,
        audio ? (this.assetName?.(el.media.asset) ?? null) : null, !this.forExport,
      );
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

  /** Contenu du calque d'édition (CL4-1) : fantômes et formes en cours, sous une grille `above` (G11). */
  private paintOverlayContent(ctx: CanvasRenderingContext2D, o: EditOverlay): void {
    for (const g of o.ghosts) {
      const el = this.source.element(g.id);
      if (el) this.paintElement(ctx, el, g.matrix);
    }
    for (const s of o.shapes) {
      const n = normalizeShape(s.shape, s.x0, s.y0, s.x1, s.y1);
      ctx.save();
      ctx.transform(1, 0, 0, 1, n.tx, n.ty);
      paintShape(ctx, { shape: s.shape, w: n.w, h: n.h, fill: s.fill }, s.style);
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
        ctx.fillStyle = HANDLE_FILL;
        const half = (HANDLE_PX / 2) * px;
        for (const h of handlesOf(o.frame)) {
          ctx.beginPath();
          ctx.rect(h.x - half, h.y - half, 2 * half, 2 * half);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  drawLive(live: LiveLayer, camera: Camera): void {
    const ctx = this.live;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (live.strokes.length === 0 && live.erasers.length === 0) return;
    this.setView(ctx, camera);
    const rect = visiblePageRect(camera, this.cssHeight);
    for (const e of live.erasers) this.paintEraser(ctx, e, rect);
    for (const s of live.strokes) this.paintStroke(ctx, s);
  }

  invalidate(change: Change): void {
    this.gridCache.invalidate(change);
    if (change.full) {
      this.paths.clear();
      this.textLines.clear();
      this.cellLines.clear();
      return;
    }
    for (const id of [...change.ids, ...change.removed]) {
      this.paths.delete(id);
      this.textLines.delete(id);
      this.cellLines.delete(id);
    }
  }

  setGridPreview(p: GridPreview | null): void {
    this.gridPreview = p;
    this.gridCache.clear();
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

  private pathOf(id: string): Path2D | null {
    const cached = this.paths.get(id);
    if (cached !== undefined) return cached;
    const outline = this.source.outline(id);
    let path: Path2D | null = null;
    if (outline && outline.length >= 6) {
      path = this.makePath();
      tracePolygons(path, outline);
    }
    this.paths.set(id, path);
    return path;
  }

  private paintStroke(ctx: CanvasRenderingContext2D, s: LiveStrokeView): void {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    tracePolygons(ctx, s.outline);
    ctx.fill("nonzero");
    if (s.predicted.length < 4) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(s.predicted[0] ?? 0, s.predicted[1] ?? 0);
    for (let i = 2; i + 1 < s.predicted.length; i += 2) ctx.lineTo(s.predicted[i] ?? 0, s.predicted[i + 1] ?? 0);
    ctx.stroke();
  }

  /**
   * Gomme partielle (D38, HL3-2) : la couleur du fond est peinte le long du chemin, découpée au cadre de la page
   * (blanc dedans, pourtour dehors). Gomme d'objet : rien ici, les traits touchés sont masqués de la scène.
   */
  private paintEraser(ctx: CanvasRenderingContext2D, e: EraserPreview, page: PageRect | null): void {
    if (e.mode !== "partial" || e.path.length < 2) return;
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
  const sceneCtx = scene.getContext("2d", { alpha: false });
  const liveCtx = live.getContext("2d", { desynchronized: true });
  if (!sceneCtx || !liveCtx) throw new Error("canvas 2D indisponible");
  return new Canvas2DRenderer(sceneCtx, liveCtx, source, opts);
}
