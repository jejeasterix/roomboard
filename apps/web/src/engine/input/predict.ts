/**
 * Échelon 2 de DA9 : source des points prédits qui prolongent le contour vif du stylo (OF44), jamais enregistrés (D20).
 * Décorateur du GestureSink : le routeur, les outils et le moteur ne changent pas. Trois sources : `linear`, prédiction
 * linéaire en TS (navigateurs sans `getPredictedEvents`, WebKit ; comparaison sous Edge, HL3b-2) ; `native`, prédits du
 * navigateur passés par `guardNative` ; `none`, aucun point prédit. OF73 : la souris n'a jamais de point prédit (sa
 * latence ne le justifie pas, et les prédits natifs de Chromium y faisaient gigoter la pointe d'une image à l'autre).
 */
import type { GestureSink } from "./gesture";
import type { InputSample } from "./sampler";

export const PREDICT_HORIZON_MS = 16;
export const PREDICT_WINDOW_MS = 32;
export const PREDICT_POINTS = 2;
export const PREDICT_MAX_PX = 48;
/** OF73 : longueur des prédits natifs gardés, depuis le dernier point réel (Chromium en donnait jusqu'à ~50 px). */
export const PREDICT_NATIVE_MAX_PX = 24;
/** OF73 : écart d'angle permis entre un prédit natif et la direction des derniers points réels. */
export const PREDICT_NATIVE_MAX_TURN_DEG = 30;
/** En dessous, les derniers points réels ne donnent pas de direction fiable. */
const MIN_DIRECTION_PX = 0.5;

/** Source des points prédits (réglage É2 résolu, voir `predictionSource`). */
export type PredictionSource = "linear" | "native" | "none";
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

/** Plus ancien échantillon de la fenêtre qui précède le dernier ; `undefined` s'il n'y en a pas. */
function windowRef(history: readonly InputSample[], windowMs: number): InputSample | undefined {
  const last = history[history.length - 1];
  if (!last) return undefined;
  let ref: InputSample | undefined;
  for (let i = history.length - 2; i >= 0; i--) {
    const h = history[i];
    if (!h) continue;
    if (last.t - h.t > windowMs) break;
    ref = h;
  }
  return ref;
}

/**
 * Extrapole depuis le dernier échantillon, à la vitesse mesurée entre lui et le plus ancien de la fenêtre. Aucune
 * prédiction sans durée positive ou sur une vitesse non finie ; déplacement total borné à `maxPx`.
 */
export function predictLinear(history: readonly InputSample[], o: PredictOptions = DEFAULT_PREDICT): InputSample[] {
  const last = history[history.length - 1];
  const ref = windowRef(history, o.windowMs);
  if (!last || !ref) return [];
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

/**
 * OF73 : garde des prédits natifs. Direction = du plus ancien échantillon de la fenêtre au dernier (comme
 * `predictLinear`). On garde les prédits dans l'ordre jusqu'au premier dont le segment depuis le point gardé avant lui
 * (le dernier point réel pour le premier) s'écarte de plus de `PREDICT_NATIVE_MAX_TURN_DEG` de cette direction ou du
 * segment précédent (pas de zigzag dans une même image), est nul
 * ou n'est pas fini ; celui qui porte la longueur cumulée au-delà de `PREDICT_NATIVE_MAX_PX` est ramené sur la borne et
 * clôt la liste. Sans direction fiable, aucun prédit : la pointe ne peut pas tourner seule.
 */
export function guardNative(
  history: readonly InputSample[],
  predicted: readonly InputSample[],
  windowMs: number = PREDICT_WINDOW_MS,
): InputSample[] {
  const last = history[history.length - 1];
  const ref = windowRef(history, windowMs);
  if (!last || !ref || predicted.length === 0) return [];
  const dx = last.x - ref.x;
  const dy = last.y - ref.y;
  const span = Math.hypot(dx, dy);
  if (!(span >= MIN_DIRECTION_PX)) return [];
  const ux = dx / span;
  const uy = dy / span;
  const minCos = Math.cos((PREDICT_NATIVE_MAX_TURN_DEG * Math.PI) / 180);
  const out: InputSample[] = [];
  let prev: InputSample = last;
  let along = 0;
  let px = ux;
  let py = uy;
  for (const p of predicted) {
    // Chaque segment (dernier point gardé → prédit) reste dans le cône : ni repli, ni zigzag dans une même image.
    const vx = p.x - prev.x;
    const vy = p.y - prev.y;
    const len = Math.hypot(vx, vy);
    if (!Number.isFinite(len) || len === 0) break;
    if ((vx * ux + vy * uy) / len < minCos) break;
    if (along > 0 && (vx * px + vy * py) / len < minCos) break;
    if (along + len > PREDICT_NATIVE_MAX_PX) {
      const k = (PREDICT_NATIVE_MAX_PX - along) / len;
      out.push({ ...p, x: prev.x + vx * k, y: prev.y + vy * k });
      break;
    }
    out.push(p);
    along += len;
    prev = p;
    px = vx / len;
    py = vy / len;
  }
  return out;
}

/**
 * Décore un GestureSink : `source()` est lue à chaque `extend` (réglage à chaud) ; le type de pointeur vient de `begin`
 * (souris : aucun prédit, quelle que soit la source).
 */
export function withPrediction(
  sink: GestureSink,
  source: () => PredictionSource,
  o: PredictOptions = DEFAULT_PREDICT,
): GestureSink {
  const histories = new Map<number, InputSample[]>();
  const mice = new Set<number>();
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
    begin(pointerId, tool, samples, pointerType) {
      histories.delete(pointerId);
      if (pointerType === "mouse") mice.add(pointerId);
      else mice.delete(pointerId);
      remember(pointerId, samples);
      sink.begin(pointerId, tool, samples, pointerType);
    },
    extend(pointerId, samples, predicted) {
      const h = remember(pointerId, samples);
      const src = source();
      let ahead: readonly InputSample[] = [];
      if (samples.length > 0 && !mice.has(pointerId)) {
        if (src === "linear") ahead = predictLinear(h, o);
        else if (src === "native") ahead = guardNative(h, predicted, o.windowMs);
      }
      sink.extend(pointerId, samples, ahead);
    },
    close(pointerId, how) {
      histories.delete(pointerId);
      mice.delete(pointerId);
      sink.close(pointerId, how);
    },
    resize(pointerId, radiusPx) {
      sink.resize?.(pointerId, radiusPx);
    },
  };
}
