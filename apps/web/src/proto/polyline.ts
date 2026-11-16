/** Dessin du banc du stylet : polyligne à largeur variable assumée (cadrage D29), pas le contour du produit. */

export interface InkPointLike {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
}

export interface StrokeCtx {
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
}

/** Épaisseur pour une pression dans [0, 1] : de 0,2 × base à 1,8 × base ; 0,5 donne la base. */
export function widthFor(pressure: number, base: number): number {
  const p = Math.min(1, Math.max(0, pressure));
  return base * (0.2 + 1.6 * p);
}

/**
 * Dessine les segments qui aboutissent aux points d'indice ≥ `from` (chacun part du point précédent).
 * Rend le nombre de points désormais dessinés (`points.length`).
 */
export function drawSegments(
  ctx: StrokeCtx,
  points: readonly InkPointLike[],
  from: number,
  base: number,
  color: string,
): number {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 1;
  const only = points[0];
  if (points.length === 1 && from === 0 && only) {
    ctx.lineWidth = widthFor(only.pressure, base);
    ctx.beginPath();
    ctx.moveTo(only.x, only.y);
    ctx.lineTo(only.x, only.y);
    ctx.stroke();
    return 1;
  }
  for (let i = Math.max(1, from); i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    ctx.lineWidth = widthFor((a.pressure + b.pressure) / 2, base);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  return points.length;
}

/** Queue prédite, provisoire : semi-transparente, jamais enregistrée (D20). */
export function drawPredicted(
  ctx: StrokeCtx,
  last: InkPointLike,
  predicted: readonly InkPointLike[],
  base: number,
  color: string,
): void {
  if (predicted.length === 0) return;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = widthFor(last.pressure, base);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  for (const q of predicted) ctx.lineTo(q.x, q.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
