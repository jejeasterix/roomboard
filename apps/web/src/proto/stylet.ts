/** Page du banc du stylet (cadrage D29, D30). Câblage DOM seulement : la logique est testée dans ses modules. */
import { createSampler, pressureOf, type GestureEvent, type Sampler } from "../engine/input/sampler";
import {
  buildReport,
  effectiveOptions,
  penPressureNote,
  sumCounters,
  type BenchOptions, type BenchReport, type Counters } from "../engine/input/stats";
import { detectSupport } from "../engine/input/support";
import { createFrameLoop } from "./frame-loop";
import { drawPredicted, drawSegments, widthFor } from "./polyline";
import { createRecorder } from "./recorder";

const BASE_WIDTH = 4;
const INK = "#1a1a1a";
const ERASER_INK = "#9a9a9a";
const PANEL_EVERY_MS = 250;

interface InkPresenterLike {
  updateInkTrailStartPoint(evt: PointerEvent, style: { color: string; diameter: number }): void;
}
interface InkLike {
  requestPresenter(param?: { presentationArea?: Element | null }): Promise<InkPresenterLike>;
}

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`élément absent : #${id}`);
  return found as T;
}

const stage = el<HTMLDivElement>("stage");
const panel = el<HTMLPreElement>("panneau");
const jsonOut = el<HTMLTextAreaElement>("json");
const status = el<HTMLSpanElement>("etat");
const toggles = {
  coalesced: el<HTMLInputElement>("opt-coalesced"),
  predicted: el<HTMLInputElement>("opt-predicted"),
  raw: el<HTMLInputElement>("opt-raw"),
  desynchronized: el<HTMLInputElement>("opt-desync"),
  inkTrail: el<HTMLInputElement>("opt-inktrail"),
};

const support = detectSupport();
const supported: Record<keyof typeof toggles, boolean> = {
  coalesced: support.coalesced,
  predicted: support.predicted,
  raw: support.pointerRawUpdate,
  desynchronized: support.desynchronized,
  inkTrail: support.inkPresenter,
};
for (const key of Object.keys(toggles) as (keyof typeof toggles)[]) {
  if (!supported[key]) {
    toggles[key].checked = false;
    toggles[key].disabled = true;
  }
}

function readOptions(): BenchOptions {
  return {
    coalesced: toggles.coalesced.checked,
    predicted: toggles.predicted.checked,
    raw: toggles.raw.checked,
    desynchronized: toggles.desynchronized.checked,
    inkTrail: toggles.inkTrail.checked,
  };
}

const ZERO: Counters = {
  pointerCancels: 0,
  lostCaptures: 0,
  touchIgnored: 0,
  moveEvents: 0,
  samples: 0,
  rawUpdateUsed: false,
};
let options = readOptions();
const recorder = createRecorder(effectiveOptions(options));
let carried: Counters = ZERO;
let sampler: Sampler | null = null;
let inkCtx!: CanvasRenderingContext2D;
let liveCtx!: CanvasRenderingContext2D;
let presenter: InkPresenterLike | null = null;
let lastPanel = 0;

const loop = createFrameLoop(
  {
    requestFrame: (cb) => requestAnimationFrame(cb),
    cancelFrame: (id) => cancelAnimationFrame(id),
    now: () => performance.now(),
  },
  renderFrame,
);

function buildCanvases(): void {
  stage.replaceChildren();
  const make = (): CanvasRenderingContext2D => {
    const canvas = document.createElement("canvas");
    stage.append(canvas);
    const ctx = canvas.getContext("2d", { desynchronized: options.desynchronized });
    if (!ctx) throw new Error("canvas 2D indisponible");
    return ctx;
  };
  inkCtx = make();
  liveCtx = make();
  fitCanvases();
  void setupInkTrail();
}

/**
 * Cale les tampons sur la taille affichée de la zone × dpr, puis redessine l'encre gardée. Appelé à chaque
 * changement de taille de la zone (panneau du bas qui grandit, clavier tactile, fenêtre) ou de dpr : sans cela,
 * le CSS étire une image restée à l'ancienne taille et l'encre tombe à côté de la pointe.
 */
function fitCanvases(): void {
  const rect = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  for (const ctx of [inkCtx, liveCtx]) {
    if (ctx.canvas.width !== width) ctx.canvas.width = width;
    if (ctx.canvas.height !== height) ctx.canvas.height = height;
    // Échelle exacte tampon / CSS : l'arrondi du tampon ne décale pas l'encre.
    ctx.setTransform(rect.width > 0 ? width / rect.width : dpr, 0, 0, rect.height > 0 ? height / rect.height : dpr, 0, 0);
  }
  redrawInk();
}

function clearCtx(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/** Redessine toute l'encre gardée : traits finis, puis la part déjà dessinée des traits vifs (jamais d'effacement). */
function redrawInk(): void {
  clearCtx(inkCtx);
  clearCtx(liveCtx);
  for (const k of recorder.ink()) drawSegments(inkCtx, k.points, 0, BASE_WIDTH, k.eraserButton ? ERASER_INK : INK);
  for (const stroke of recorder.live()) {
    drawSegments(inkCtx, stroke.points.slice(0, stroke.drawn), 0, BASE_WIDTH, stroke.eraserButton ? ERASER_INK : INK);
  }
}

function watchDevicePixelRatio(): void {
  const query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  query.addEventListener(
    "change",
    () => {
      fitCanvases();
      watchDevicePixelRatio();
    },
    { once: true },
  );
}

async function setupInkTrail(): Promise<void> {
  presenter = null;
  const nav = navigator as unknown as { ink?: InkLike };
  if (!options.inkTrail || !nav.ink) return;
  try {
    presenter = await nav.ink.requestPresenter({ presentationArea: liveCtx.canvas });
  } catch {
    presenter = null;
    flash("traînée déléguée refusée par le navigateur");
  }
}

function counters(): Counters {
  return sampler ? sumCounters(carried, sampler.stats()) : carried;
}

function buildSampler(): void {
  if (sampler) {
    carried = sumCounters(carried, sampler.stats());
    sampler.dispose();
  }
  const eff = effectiveOptions(options);
  sampler = createSampler(stage, { coalesced: eff.coalesced, predicted: eff.predicted, raw: eff.raw });
  sampler.onGesture(onGesture);
}

function clearLive(): void {
  clearCtx(liveCtx);
}

let panelTimer: ReturnType<typeof setTimeout> | null = null;

function renderFrame(now: number): void {
  clearLive();
  for (const stroke of recorder.live()) {
    const color = stroke.eraserButton ? ERASER_INK : INK;
    drawSegments(inkCtx, stroke.points, stroke.drawn, BASE_WIDTH, color);
    const last = stroke.points[stroke.points.length - 1];
    // Queue prédite seulement sur une image qui reçoit des points : stylet arrêté, elle s'efface.
    const fresh = stroke.drawn < stroke.points.length;
    if (last && fresh) drawPredicted(liveCtx, last, stroke.predicted, BASE_WIDTH, color);
  }
  recorder.markDrawn(now);
  // Hors de la mesure : le rapport (tris) ne doit pas allonger l'image mesurée par la boucle.
  if (now - lastPanel > PANEL_EVERY_MS && !panelTimer) {
    panelTimer = setTimeout(() => {
      panelTimer = null;
      updatePanel();
    }, 0);
  }
}

function onGesture(g: GestureEvent): void {
  if (g.kind === "end" || g.kind === "cancel") {
    // Dessiner et mesurer les derniers points reçus avant de clore (D39 : le trait est gardé même sur cancel).
    renderFrame(performance.now());
    recorder.handle(g);
    // D39 : un trait au bouton gomme interrompu ne laisse pas d'encre ; on redessine la page sans lui.
    if (g.kind === "cancel") redrawInk();
    if (recorder.live().length === 0) {
      loop.stop();
      clearLive();
    }
    updatePanel();
    return;
  }
  recorder.handle(g);
  loop.start();
}

stage.addEventListener("pointermove", (e: PointerEvent) => {
  if (!presenter || e.buttons === 0) return;
  presenter.updateInkTrailStartPoint(e, { color: INK, diameter: widthFor(pressureOf(e.pointerType, e.pressure), BASE_WIDTH) });
});

function report(): BenchReport {
  return buildReport({
    createdAt: new Date().toISOString(),
    environment: { userAgent: navigator.userAgent, devicePixelRatio: window.devicePixelRatio || 1, support },
    counters: counters(),
    frameDurations: loop.durations(),
    strokes: recorder.strokes(),
  });
}

const fmt = (v: number | null | undefined, digits = 1): string =>
  v === null || v === undefined ? "—" : v.toFixed(digits);
const yes = (b: boolean): string => (b ? "oui" : "non");

function updatePanel(): void {
  lastPanel = performance.now();
  const r = report();
  const t = r.totals;
  const last = r.strokes[r.strokes.length - 1];
  const s = r.environment.support;
  const penNote = penPressureNote(t);
  // Ligne seulement quand la case diffère du réglage effectif : sous pointerrawupdate, aucun point prédit.
  const rawNoPrediction = options.predicted && !effectiveOptions(options).predicted;
  panel.textContent = [
    `Prise en charge : fusionnés ${yes(s.coalesced)} · prédits ${yes(s.predicted)} · desynchronized ${yes(s.desynchronized)} · navigator.ink ${yes(s.inkPresenter)} · pointerrawupdate ${yes(s.pointerRawUpdate)} · contexte sûr ${yes(s.secureContext)} · dpr ${r.environment.devicePixelRatio}`,
    ...(rawNoPrediction ? ["Réglages effectifs : prédits non (Chromium n'en donne aucun sous pointerrawupdate)"] : []),
    `Traits : ${t.strokes} (stylet ${t.penStrokes}, interrompus ${t.cancelledStrokes}, paumes annulées ${t.palmStrokes}) · pointercancel ${r.counters.pointerCancels} · capture perdue ${r.counters.lostCaptures} · contacts tactiles ignorés ${r.counters.touchIgnored}`,
    t.penStrokes === 0
      ? `Stylet : ${penNote}`
      : `Stylet : pression ${fmt(t.penPressure?.min, 2)}–${fmt(t.penPressure?.max, 2)}, écart type ${fmt(t.penPressure?.stdDev, 3)}${penNote ? ` (${penNote})` : ""} · événements ${fmt(t.penEventsHzP50, 0)} Hz · échantillons ${fmt(t.penSamplesHzP50, 0)} Hz`,
    `Retard interne : stylet p50 ${fmt(t.penLatencyP50)} / p95 ${fmt(t.penLatencyP95)} ms · autres p50 ${fmt(t.otherLatencyP50)} / p95 ${fmt(t.otherLatencyP95)} ms · images ${r.frames?.count ?? 0}, p95 ${fmt(r.frames?.p95)} ms, > 25 ms ${fmt(r.frames ? r.frames.overBudgetShare * 100 : null)} %`,
    last
      ? `Dernier trait : ${last.pointerType}, ${last.points} points, pression ${fmt(last.pressure?.min, 2)}–${fmt(last.pressure?.max, 2)}, inclinaison max ${last.maxTiltX}/${last.maxTiltY}, gomme ${yes(last.eraserSeen)}, ${fmt(last.samplesHz, 0)} Hz, retard p95 ${fmt(last.latencyP95)} ms${last.cancelled ? ", interrompu" : ""}`
      : "Dernier trait : —",
  ].join("\n");
}

function flash(message: string): void {
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) status.textContent = "";
  }, 3000);
}

function exportJson(): string {
  const text = JSON.stringify(report(), null, 2);
  jsonOut.value = text;
  return text;
}

el<HTMLButtonElement>("btn-telecharger").addEventListener("click", () => {
  const text = exportJson();
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `roomboard-stylet-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  flash("JSON téléchargé");
});

el<HTMLButtonElement>("btn-copier").addEventListener("click", () => {
  const text = exportJson();
  navigator.clipboard.writeText(text).then(
    () => flash("JSON copié"),
    () => {
      jsonOut.focus();
      jsonOut.select();
      flash(document.execCommand("copy") ? "JSON copié" : "copie refusée : sélectionner le texte en bas à droite");
    },
  );
});

el<HTMLButtonElement>("btn-effacer").addEventListener("click", () => {
  recorder.clearInk();
  redrawInk();
  flash("page effacée (mesures gardées)");
});

el<HTMLButtonElement>("btn-zero").addEventListener("click", () => {
  recorder.reset();
  loop.clear();
  sampler?.dispose();
  sampler = null;
  carried = ZERO;
  buildSampler();
  jsonOut.value = "";
  updatePanel();
  flash("mesures remises à zéro");
});

for (const input of Object.values(toggles)) {
  input.addEventListener("change", () => {
    const before = options;
    options = readOptions();
    recorder.setOptions(effectiveOptions(options));
    if (before.coalesced !== options.coalesced || before.predicted !== options.predicted || before.raw !== options.raw) {
      buildSampler();
    }
    if (before.desynchronized !== options.desynchronized) {
      buildCanvases();
      flash("canvas recréés, encre redessinée");
    } else if (before.inkTrail !== options.inkTrail) {
      void setupInkTrail();
    }
    updatePanel();
  });
}

buildCanvases();
new ResizeObserver(() => fitCanvases()).observe(stage);
watchDevicePixelRatio();
buildSampler();
updatePanel();
