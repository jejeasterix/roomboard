/**
 * Rendu Canvas 2D à deux canvas (D19, DA2) : scène fixe (redessinée sur changement ou caméra) et interaction
 * (`desynchronized`, effacée à chaque image : encre vive, queue prédite, aperçu de gomme). `Path2D` en cache par id,
 * invalidé par `Change`. Échelle exacte tampon / CSS : l'arrondi du tampon ne décale pas l'encre (lot 1, T6c).
 */
import type { Bounds, Change, ElementView, GridLines, Matrix, ShapeData, StrokeStyle, TextData } from "../../core/api";
import { arrowWings, normalizeShape } from "../../core/shapes";
import type { Camera } from "../camera";
import { PAGE_BACKGROUND, PAGE_WIDTH, SURROUND_COLOR, visibleGridRect, visiblePageRect, type PageRect } from "../page";
import { faceOf, layoutRich, measureWith, textFont, type RichLine } from "../text-layout";
import { HANDLE_PX, handlesOf } from "../tools/handles";
import type { ImageSource } from "./image-cache";
import { MIN_DOT_PX, MIN_GRID_PX, paintGrid } from "./grid-paint";
import { EMPTY_OVERLAY, type EditOverlay } from "./overlay";
import type { EraserPreview, LiveLayer, LiveStrokeView, PageView, Renderer, SceneSource } from "./renderer";

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
 * Texte (D14, CL4-4, C7) : mêmes lignes que la hauteur de boîte mesurée par l'outil (`layoutRich`) ; un fillText par
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
  private readonly makePath: () => Path2D;
  private readonly images: ImageSource | null;
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
  }

  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay: EditOverlay = EMPTY_OVERLAY): void {
    const ctx = this.scene;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = SURROUND_COLOR;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.setView(ctx, camera);
    ctx.fillStyle = PAGE_BACKGROUND;
    const rect = visiblePageRect(camera, this.cssHeight);
    if (rect) ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
    // Place du backdrop (U6, partie « reste » de C2) : ici, sous la grille et sous les éléments (G11).
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

  /** Lignes visibles de la grille de la page (G9) ; null sans source de grille, sans grille ou vue hors page. */
  private gridOf(page: string, camera: Camera): GridLines | null {
    const rect = visibleGridRect(camera, this.cssWidth, this.cssHeight);
    if (!rect) return null;
    return this.source.gridLines?.(page, rect, MIN_GRID_PX / camera.zoom, MIN_DOT_PX / camera.zoom) ?? null;
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
    if (change.full) {
      this.paths.clear();
      this.textLines.clear();
      return;
    }
    for (const id of [...change.ids, ...change.removed]) {
      this.paths.delete(id);
      this.textLines.delete(id);
    }
  }

  private linesOf(ctx: CanvasRenderingContext2D, id: string, t: TextData): readonly RichLine[] {
    const key = `${t.size}|${t.boxWidth}|${JSON.stringify(t.spans)}`;
    const cached = this.textLines.get(id);
    if (cached && cached.key === key) return cached.lines;
    const lines = layoutRich(t.spans, { size: t.size }, t.boxWidth, measureWith(ctx));
    this.textLines.set(id, { key, lines });
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
    if (page) along(PAGE_BACKGROUND, pageRect);
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
