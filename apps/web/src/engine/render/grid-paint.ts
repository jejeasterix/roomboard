/**
 * Grille calée sur les pixels (C9, G10). Les lignes viennent du cœur (`gridLines`, unités de page) : elles passent en
 * pixels physiques par `worldToScreen` puis × (sx, sy). Une ligne verticale ou horizontale tombe sur `round(X) + 0,5`
 * si l'épaisseur est impaire, sur `round(X)` sinon ; épaisseur `max(1, round(lineWidth·dpr))` pixels physiques (`lineWidth`
 * du niveau, pixels CSS d'écran, E1 ; 1 par défaut, soit un pixel CSS à tout zoom) ; obliques (isométrique) sans calage ;
 * point = carré de `max(2, round(2·lineWidth·dpr))` pixels, coin sur un pixel entier. Motifs `dashed` [6, 4] et `dotted` [1, 3]
 * en épaisseurs de trait : × lineWidth × dpr, arrondis (au moins 1), si bien qu'un point de `dotted` est aussi long que le
 * trait est large ; décalés depuis l'origine du monde arrondie au pixel : le motif ne glisse pas au défilement et ses
 * bords tombent sur des pixels entiers. Un `line` inconnu se dessine plein (G2) ; une couleur que le canvas refuse donne
 * la couleur par défaut.
 */
import { DEFAULT_GRID_COLOR, type GridLines } from "../../core/api";
import { worldToScreen, type Camera } from "../camera";

/** Pas minimal d'une famille de lignes, en pixels CSS d'écran (G9) : `min_step = MIN_GRID_PX / zoom`. */
export const MIN_GRID_PX = 4;
/** Pas minimal des points (G9) : `min_dot_step = MIN_DOT_PX / zoom`. */
export const MIN_DOT_PX = 8;
export const DASHED = [6, 4] as const;
export const DOTTED = [1, 3] as const;

/** Groupe de lignes prêt à peindre, en pixels physiques. */
export interface DeviceLevel {
  readonly color: string;
  readonly alpha: number;
  /** Épaisseur en pixels physiques. */
  readonly width: number;
  /** Motif en pixels physiques ; vide = trait plein. */
  readonly dash: readonly number[];
  /** x0, y0, x1, y1 à la suite, calés. */
  readonly segments: readonly number[];
  /** Décalage du motif de chaque segment, dans [0, période) ; 0 pour un trait plein. */
  readonly offsets: readonly number[];
  /** Coin haut gauche de chaque point, en pixels physiques entiers. */
  readonly dots: readonly number[];
  /** Côté d'un point en pixels physiques. */
  readonly dot: number;
}

export const lineWidthPx = (dpr: number, lineWidth = 1): number => Math.max(1, Math.round(lineWidth * dpr));
export const dotSizePx = (dpr: number, lineWidth = 1): number => Math.max(2, Math.round(2 * lineWidth * dpr));
/** Coordonnée d'une ligne sur la grille des pixels : centre d'un pixel (épaisseur impaire) ou bord (paire). */
export const alignLine = (v: number, width: number): number => (width % 2 === 1 ? Math.round(v) + 0.5 : Math.round(v));

/** Motif en pixels physiques, à l'échelle de l'épaisseur du niveau (`lineWidth`, pixels CSS) ; vide = trait plein. */
function dashOf(line: string, dpr: number, lineWidth: number): number[] {
  const base = line === "dashed" ? DASHED : line === "dotted" ? DOTTED : null;
  return base === null ? [] : base.map((v) => Math.max(1, Math.round(v * lineWidth * dpr)));
}

/** Phase du motif au début d'un segment : distance le long du segment depuis la projection de l'origine du monde. */
function phase(rx: number, ry: number, dx: number, dy: number, period: number): number {
  const len = Math.hypot(dx, dy);
  if (len === 0) return 0;
  const along = (rx * dx + ry * dy) / len;
  return ((along % period) + period) % period;
}

export function alignedSegments(lines: GridLines, camera: Camera, sx: number, sy: number, dpr: number): DeviceLevel[] {
  const [ox, oy] = worldToScreen(camera, 0, 0);
  // Origine arrondie au pixel : avec des longueurs entières, chaque bord de tiret tombe sur un pixel entier.
  const originX = Math.round(ox * sx);
  const originY = Math.round(oy * sy);
  return lines.levels.map((l) => {
    const width = lineWidthPx(dpr, l.lineWidth);
    const dot = dotSizePx(dpr, l.lineWidth);
    const dash = dashOf(l.line, dpr, l.lineWidth);
    const period = dash.reduce((a, b) => a + b, 0);
    const segments: number[] = [];
    const offsets: number[] = [];
    for (let i = 0; i + 3 < l.segments.length; i += 4) {
      const wx0 = l.segments[i] ?? 0;
      const wy0 = l.segments[i + 1] ?? 0;
      const wx1 = l.segments[i + 2] ?? 0;
      const wy1 = l.segments[i + 3] ?? 0;
      const [ax, ay] = worldToScreen(camera, wx0, wy0);
      const [bx, by] = worldToScreen(camera, wx1, wy1);
      let x0 = ax * sx;
      let y0 = ay * sy;
      let x1 = bx * sx;
      let y1 = by * sy;
      if (wx0 === wx1) {
        x0 = alignLine(x0, width);
        x1 = x0;
      } else if (wy0 === wy1) {
        y0 = alignLine(y0, width);
        y1 = y0;
      }
      segments.push(x0, y0, x1, y1);
      offsets.push(period > 0 ? phase(x0 - originX, y0 - originY, x1 - x0, y1 - y0, period) : 0);
    }
    const dots: number[] = [];
    for (let i = 0; i + 1 < l.dots.length; i += 2) {
      const [px, py] = worldToScreen(camera, l.dots[i] ?? 0, l.dots[i + 1] ?? 0);
      dots.push(Math.round(px * sx - dot / 2), Math.round(py * sy - dot / 2));
    }
    return { color: l.color, alpha: l.alpha, width, dash, segments, offsets, dots, dot };
  });
}

/** Peint la grille en pixels physiques (transformation identité), puis rend la transformation de la vue. */
export function paintGrid(ctx: CanvasRenderingContext2D, lines: GridLines, camera: Camera, sx: number, sy: number, dpr: number): void {
  const levels = alignedSegments(lines, camera, sx, sy, dpr);
  if (levels.length === 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const l of levels) {
    ctx.globalAlpha = l.alpha;
    // Le canvas ignore une couleur invalide et garderait celle du niveau d'avant : défaut d'abord.
    ctx.strokeStyle = DEFAULT_GRID_COLOR;
    ctx.fillStyle = DEFAULT_GRID_COLOR;
    ctx.strokeStyle = l.color;
    ctx.fillStyle = l.color;
    ctx.lineWidth = l.width;
    ctx.lineCap = "butt";
    ctx.setLineDash([...l.dash]);
    if (l.dash.length === 0) {
      if (l.segments.length > 0) {
        ctx.beginPath();
        for (let i = 0; i + 3 < l.segments.length; i += 4) {
          ctx.moveTo(l.segments[i] ?? 0, l.segments[i + 1] ?? 0);
          ctx.lineTo(l.segments[i + 2] ?? 0, l.segments[i + 3] ?? 0);
        }
        ctx.stroke();
      }
    } else {
      for (let i = 0; i + 3 < l.segments.length; i += 4) {
        ctx.lineDashOffset = l.offsets[i / 4] ?? 0;
        ctx.beginPath();
        ctx.moveTo(l.segments[i] ?? 0, l.segments[i + 1] ?? 0);
        ctx.lineTo(l.segments[i + 2] ?? 0, l.segments[i + 3] ?? 0);
        ctx.stroke();
      }
    }
    for (let i = 0; i + 1 < l.dots.length; i += 2) ctx.fillRect(l.dots[i] ?? 0, l.dots[i + 1] ?? 0, l.dot, l.dot);
  }
  ctx.restore();
}
