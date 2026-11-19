/**
 * Échelon 2 de DA9 : prédiction linéaire en TS, pour les navigateurs sans `getPredictedEvents` (WebKit). Les points
 * prédits sont dessinés en queue provisoire par le stylo, jamais enregistrés (D20). Décorateur du GestureSink : le
 * routeur, les outils et le moteur ne changent pas. Allumée : elle remplace les prédits natifs (comparaison sous Edge,
 * HL3b-2) ; éteinte : les prédits natifs passent tels quels.
 */
import type { GestureSink } from "./gesture";
import type { InputSample } from "./sampler";

export const PREDICT_HORIZON_MS = 16;
export const PREDICT_WINDOW_MS = 32;
export const PREDICT_POINTS = 2;
export const PREDICT_MAX_PX = 48;
/** Échantillons gardés par pointeur : assez pour couvrir la fenêtre à 240 Hz fusionnés. */
const HISTORY = 8;

export interface PredictOptions {
  readonly horizonMs: number;
  readonly windowMs: number;
  readonly points: number;
  readonly maxPx: number;
}

export const DEFAULT_PREDICT: PredictOptions = {
  horizonMs: PREDICT_HORIZON_MS,
  windowMs: PREDICT_WINDOW_MS,
  points: PREDICT_POINTS,
  maxPx: PREDICT_MAX_PX,
};

/**
 * Extrapole depuis le dernier échantillon, à la vitesse mesurée entre lui et le plus ancien de la fenêtre. Aucune
 * prédiction sans durée positive ou sur une vitesse non finie ; déplacement total borné à `maxPx`.
 */
export function predictLinear(history: readonly InputSample[], o: PredictOptions = DEFAULT_PREDICT): InputSample[] {
  const last = history[history.length - 1];
  if (!last) return [];
  let ref: InputSample | undefined;
  for (let i = history.length - 2; i >= 0; i--) {
    const h = history[i];
    if (!h) continue;
    if (last.t - h.t > o.windowMs) break;
    ref = h;
  }
  if (!ref) return [];
  const dt = last.t - ref.t;
  if (!(dt > 0)) return [];
  const vx = (last.x - ref.x) / dt;
  const vy = (last.y - ref.y) / dt;
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) return [];
  const full = Math.hypot(vx, vy) * o.horizonMs;
  const scale = full > o.maxPx ? o.maxPx / full : 1;
  const out: InputSample[] = [];
  for (let k = 1; k <= o.points; k++) {
    const ahead = (o.horizonMs * k) / o.points;
    out.push({
      x: last.x + vx * ahead * scale,
      y: last.y + vy * ahead * scale,
      pressure: last.pressure,
      tiltX: last.tiltX,
      tiltY: last.tiltY,
      t: last.t + ahead,
    });
  }
  return out;
}

/** Décore un GestureSink : `enabled()` est lu à chaque `extend` (réglage à chaud). */
export function withLinearPrediction(
  sink: GestureSink,
  enabled: () => boolean,
  o: PredictOptions = DEFAULT_PREDICT,
): GestureSink {
  const histories = new Map<number, InputSample[]>();
  const remember = (pointerId: number, samples: readonly InputSample[]): InputSample[] => {
    const h = histories.get(pointerId) ?? [];
    for (const smp of samples) {
      if (Number.isFinite(smp.x) && Number.isFinite(smp.y) && Number.isFinite(smp.t)) h.push(smp);
    }
    if (h.length > HISTORY) h.splice(0, h.length - HISTORY);
    histories.set(pointerId, h);
    return h;
  };
  return {
    begin(pointerId, tool, samples) {
      histories.delete(pointerId);
      remember(pointerId, samples);
      sink.begin(pointerId, tool, samples);
    },
    extend(pointerId, samples, predicted) {
      const h = remember(pointerId, samples);
      if (!enabled()) {
        sink.extend(pointerId, samples, predicted);
        return;
      }
      sink.extend(pointerId, samples, samples.length > 0 ? predictLinear(h, o) : []);
    },
    close(pointerId, how) {
      histories.delete(pointerId);
      sink.close(pointerId, how);
    },
  };
}
