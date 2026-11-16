/** Statistiques du banc du stylet (cadrage D30) et rapport `roomboard-stylet/1`. Fonctions pures. */

export const REPORT_FORMAT = "roomboard-stylet/1";
/** Seuil d'image longue (journal du prototype ActCraft, D30). */
export const FRAME_BUDGET_MS = 25;

/** Percentile au rang le plus proche ; `null` sans données. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1] ?? null;
}

export interface PressureStats {
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly stdDev: number;
  readonly zeroShare: number;
  readonly halfShare: number;
}

export function pressureStats(values: readonly number[]): PressureStats | null {
  const n = values.length;
  if (n === 0) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let zero = 0;
  let half = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    if (v === 0) zero++;
    if (v === 0.5) half++;
  }
  const mean = sum / n;
  let variance = 0;
  for (const v of values) variance += (v - mean) ** 2;
  return { count: n, min, max, stdDev: Math.sqrt(variance / n), zeroShare: zero / n, halfShare: half / n };
}

/** Vrai si la pression n'apporte rien : seulement 0 et 0,5 (D8), ou quasi fixe, ou absente. */
export function isConstantPressure(stats: PressureStats | null): boolean {
  if (stats === null) return true;
  return stats.zeroShare + stats.halfShare >= 0.99 || stats.stdDev < 0.005;
}

/**
 * Fréquence (Hz) d'une suite d'instants en ms : 1000 / médiane des intervalles positifs. La médiane ignore une pause
 * du stylet au milieu du trait (la moyenne sur la durée totale la comptait). Intervalles nuls ignorés (horodatages
 * répétés) ; `null` sans intervalle positif.
 */
export function frequencyHz(times: readonly number[]): number | null {
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const a = times[i - 1];
    const b = times[i];
    if (a !== undefined && b !== undefined && b > a) gaps.push(b - a);
  }
  if (gaps.length === 0) return null;
  gaps.sort((x, y) => x - y);
  const mid = gaps.length >> 1;
  const median = gaps.length % 2 === 1 ? (gaps[mid] ?? 0) : ((gaps[mid - 1] ?? 0) + (gaps[mid] ?? 0)) / 2;
  return median > 0 ? 1000 / median : null;
}

export interface FrameStats {
  readonly count: number;
  readonly p50: number;
  readonly p95: number;
  readonly overBudgetShare: number;
}

export function frameStats(durations: readonly number[], budgetMs: number = FRAME_BUDGET_MS): FrameStats | null {
  const p50 = percentile(durations, 50);
  const p95 = percentile(durations, 95);
  if (p50 === null || p95 === null) return null;
  const over = durations.filter((d) => d > budgetMs).length;
  return { count: durations.length, p50, p95, overBudgetShare: over / durations.length };
}

export interface BenchOptions {
  readonly coalesced: boolean;
  readonly predicted: boolean;
  readonly raw: boolean;
  readonly desynchronized: boolean;
  readonly inkTrail: boolean;
}

/**
 * Options réellement appliquées : sous `pointerrawupdate`, Chromium ne donne aucun point prédit, donc `predicted`
 * effectif est faux (le JSON et le panneau le disent, au lieu de la case cochée).
 */
export function effectiveOptions(o: BenchOptions): BenchOptions {
  return o.raw && o.predicted ? { ...o, predicted: false } : o;
}

export interface StrokeMeasure {
  readonly pointerType: string;
  readonly options: BenchOptions;
  readonly pressures: readonly number[];
  readonly tiltX: readonly number[];
  readonly tiltY: readonly number[];
  /** instant du dernier échantillon de chaque message `move` (fréquence des événements) */
  readonly moveTimes: readonly number[];
  /** instant de chaque échantillon (fréquence des échantillons fusionnés) */
  readonly sampleTimes: readonly number[];
  /** retard interne par échantillon dessiné : `performance.now()` au rAF − `timeStamp` (ms) */
  readonly latencies: readonly number[];
  readonly eraserSeen: boolean;
  readonly cancelled: boolean;
  /** contact `touch` annulé parce que le stylet touchait (paume, D18) ; compté à part des traits interrompus */
  readonly palm: boolean;
}

export interface Support {
  readonly coalesced: boolean;
  readonly predicted: boolean;
  readonly desynchronized: boolean;
  readonly inkPresenter: boolean;
  readonly pointerRawUpdate: boolean;
  readonly secureContext: boolean;
}

export interface Environment {
  readonly userAgent: string;
  readonly devicePixelRatio: number;
  readonly support: Support;
}

export interface Counters {
  readonly pointerCancels: number;
  readonly lostCaptures: number;
  readonly touchIgnored: number;
  /** messages move reçus (pointermove ou pointerrawupdate) */
  readonly moveEvents: number;
  /** échantillons reçus, fusionnés compris */
  readonly samples: number;
  /** pointerrawupdate réellement écouté depuis la remise à zéro */
  readonly rawUpdateUsed: boolean;
}

/** Cumule les compteurs de deux échantillonneurs successifs (bascules de réglage). */
export function sumCounters(a: Counters, b: Counters): Counters {
  return {
    pointerCancels: a.pointerCancels + b.pointerCancels,
    lostCaptures: a.lostCaptures + b.lostCaptures,
    touchIgnored: a.touchIgnored + b.touchIgnored,
    moveEvents: a.moveEvents + b.moveEvents,
    samples: a.samples + b.samples,
    rawUpdateUsed: a.rawUpdateUsed || b.rawUpdateUsed,
  };
}

export interface StrokeSummary {
  readonly index: number;
  readonly pointerType: string;
  readonly options: BenchOptions;
  readonly points: number;
  readonly pressure: PressureStats | null;
  readonly constantPressure: boolean;
  readonly maxTiltX: number;
  readonly maxTiltY: number;
  readonly eraserSeen: boolean;
  readonly cancelled: boolean;
  readonly palm: boolean;
  readonly eventsHz: number | null;
  readonly samplesHz: number | null;
  readonly latencyP50: number | null;
  readonly latencyP95: number | null;
}

export interface ReportTotals {
  readonly strokes: number;
  readonly penStrokes: number;
  /** traits interrompus (pointercancel, capture perdue, bascule), paumes D18 exclues */
  readonly cancelledStrokes: number;
  /** contacts `touch` annulés parce que le stylet touchait (D18) */
  readonly palmStrokes: number;
  readonly penPressure: PressureStats | null;
  readonly penConstantPressure: boolean;
  readonly penEventsHzP50: number | null;
  readonly penSamplesHzP50: number | null;
  readonly latencyP50: number | null;
  readonly latencyP95: number | null;
  readonly penLatencyP50: number | null;
  readonly penLatencyP95: number | null;
  /** souris et doigt */
  readonly otherLatencyP50: number | null;
  readonly otherLatencyP95: number | null;
}

export interface BenchReport {
  readonly format: typeof REPORT_FORMAT;
  readonly createdAt: string;
  readonly environment: Environment;
  readonly counters: Counters;
  readonly frames: FrameStats | null;
  readonly totals: ReportTotals;
  readonly strokes: readonly StrokeSummary[];
}

export interface ReportInput {
  readonly createdAt: string;
  readonly environment: Environment;
  readonly counters: Counters;
  readonly frameDurations: readonly number[];
  readonly strokes: readonly StrokeMeasure[];
}

const maxAbs = (values: readonly number[]): number => values.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

export function summarizeStroke(m: StrokeMeasure, index: number): StrokeSummary {
  const pressure = pressureStats(m.pressures);
  return {
    index,
    pointerType: m.pointerType,
    options: m.options,
    points: m.pressures.length,
    pressure,
    constantPressure: isConstantPressure(pressure),
    maxTiltX: maxAbs(m.tiltX),
    maxTiltY: maxAbs(m.tiltY),
    eraserSeen: m.eraserSeen,
    cancelled: m.cancelled,
    palm: m.palm,
    eventsHz: frequencyHz(m.moveTimes),
    samplesHz: frequencyHz(m.sampleTimes),
    latencyP50: percentile(m.latencies, 50),
    latencyP95: percentile(m.latencies, 95),
  };
}

const notNull = (v: number | null): v is number => v !== null;

export function buildReport(input: ReportInput): BenchReport {
  const strokes = input.strokes.map((m, i) => summarizeStroke(m, i + 1));
  const penMeasures = input.strokes.filter((m) => m.pointerType === "pen");
  const penSummaries = strokes.filter((s) => s.pointerType === "pen");
  const penPressure = pressureStats(penMeasures.flatMap((m) => m.pressures));
  const latencies = input.strokes.flatMap((m) => m.latencies);
  const penLatencies = penMeasures.flatMap((m) => m.latencies);
  const otherLatencies = input.strokes.filter((m) => m.pointerType !== "pen").flatMap((m) => m.latencies);
  return {
    format: REPORT_FORMAT,
    createdAt: input.createdAt,
    environment: input.environment,
    counters: input.counters,
    frames: frameStats(input.frameDurations),
    totals: {
      strokes: strokes.length,
      penStrokes: penSummaries.length,
      cancelledStrokes: strokes.filter((s) => s.cancelled && !s.palm).length,
      palmStrokes: strokes.filter((s) => s.palm).length,
      penPressure,
      // Sans donnée de pression du stylet, rien à juger : faux, et le panneau dit « aucun trait au stylet ».
      penConstantPressure: penPressure !== null && isConstantPressure(penPressure),
      penEventsHzP50: percentile(penSummaries.map((s) => s.eventsHz).filter(notNull), 50),
      penSamplesHzP50: percentile(penSummaries.map((s) => s.samplesHz).filter(notNull), 50),
      latencyP50: percentile(latencies, 50),
      latencyP95: percentile(latencies, 95),
      penLatencyP50: percentile(penLatencies, 50),
      penLatencyP95: percentile(penLatencies, 95),
      otherLatencyP50: percentile(otherLatencies, 50),
      otherLatencyP95: percentile(otherLatencies, 95),
    },
    strokes,
  };
}

/** Note du panneau sur la pression du stylet : « aucun trait au stylet », « CONSTANTE », ou rien. */
export function penPressureNote(t: ReportTotals): string {
  if (t.penStrokes === 0 || t.penPressure === null) return "aucun trait au stylet";
  return t.penConstantPressure ? "CONSTANTE" : "";
}
