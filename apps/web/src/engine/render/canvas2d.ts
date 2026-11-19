/**
 * Rendu Canvas 2D à deux canvas (D19, DA2) : scène fixe (redessinée sur changement ou caméra) et interaction
 * (`desynchronized`, effacée à chaque image : encre vive, queue prédite, aperçu de gomme). `Path2D` en cache par id,
 * invalidé par `Change`. Échelle exacte tampon / CSS : l'arrondi du tampon ne décale pas l'encre (lot 1, T6c).
 */
import type { Change } from "../../core/api";
import type { Camera } from "../camera";
import { PAGE_BACKGROUND, PAGE_HEIGHT, PAGE_WIDTH, SURROUND_COLOR } from "../page";
import type { EraserPreview, LiveLayer, LiveStrokeView, PageView, Renderer, SceneSource } from "./renderer";

export interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
}

export interface Canvas2DOptions {
  /** Fabrique de chemins : Node n'a pas Path2D, les tests en passent une fausse. */
  readonly makePath?: () => Path2D;
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

export class Canvas2DRenderer implements Renderer {
  private readonly paths = new Map<string, Path2D | null>();
  private readonly makePath: () => Path2D;
  private sx = 1;
  private sy = 1;

  constructor(
    private readonly scene: CanvasRenderingContext2D,
    /** Canvas d'interaction ; null quand WebGL2 le dessine (échelon 4, `webgl2.ts`). */
    private readonly live: CanvasRenderingContext2D | null,
    private readonly source: SceneSource,
    opts: Canvas2DOptions = {},
  ) {
    this.makePath = opts.makePath ?? (() => new Path2D());
  }

  resize(width: number, height: number, dpr: number): void {
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    for (const ctx of [this.scene, this.live]) {
      if (!ctx) continue;
      if (ctx.canvas.width !== w) ctx.canvas.width = w;
      if (ctx.canvas.height !== h) ctx.canvas.height = h;
    }
    this.sx = width > 0 ? w / width : dpr;
    this.sy = height > 0 ? h / height : dpr;
  }

  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>): void {
    const ctx = this.scene;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = SURROUND_COLOR;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.setView(ctx, camera);
    ctx.fillStyle = PAGE_BACKGROUND;
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    for (const id of page.elementIds) {
      if (hidden.has(id)) continue;
      const el = this.source.element(id);
      if (!el) continue;
      const path = this.pathOf(id);
      if (!path) continue;
      const [a, b, c, d, e, f] = el.transform;
      ctx.save();
      ctx.transform(a, b, c, d, e, f);
      ctx.fillStyle = el.style.color;
      ctx.fill(path, "nonzero");
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
    for (const e of live.erasers) this.paintEraser(ctx, e);
    for (const s of live.strokes) this.paintStroke(ctx, s);
  }

  invalidate(change: Change): void {
    if (change.full) {
      this.paths.clear();
      return;
    }
    for (const id of change.ids) this.paths.delete(id);
    for (const id of change.removed) this.paths.delete(id);
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
  private paintEraser(ctx: CanvasRenderingContext2D, e: EraserPreview): void {
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
    along(PAGE_BACKGROUND, () => ctx.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT));
    along(SURROUND_COLOR, () => {
      ctx.rect(-FAR, -FAR, 2 * FAR, 2 * FAR);
      ctx.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    });
  }
}

/** Ouvre les deux contextes : scène opaque, interaction `desynchronized` quand le navigateur le permet (D19). */
export function createCanvas2DRenderer(
  scene: HTMLCanvasElement,
  live: HTMLCanvasElement,
  source: SceneSource,
): Canvas2DRenderer {
  const sceneCtx = scene.getContext("2d", { alpha: false });
  const liveCtx = live.getContext("2d", { desynchronized: true });
  if (!sceneCtx || !liveCtx) throw new Error("canvas 2D indisponible");
  return new Canvas2DRenderer(sceneCtx, liveCtx, source);
}
