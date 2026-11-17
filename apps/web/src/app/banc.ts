/**
 * Banc du lot 1 rejoué dans l'application (plan maître, lot 3) : mêmes mesures `roomboard-stylet/1`, mais encre
 * dessinée par le moteur avec la géométrie du produit (contour freedraw du cœur). Ouvert par `?banc` (main.ts).
 * Limite : les points reçus après la dernière image d'un trait n'ont pas de retard mesuré.
 */
import type { Sampler } from "../engine/input/sampler";
import {
  buildReport,
  effectiveOptions,
  type BenchOptions,
  type BenchReport,
  type Environment,
} from "../engine/input/stats";
import { createRecorder } from "../proto/recorder";

export interface AppBenchDeps {
  readonly sampler: Pick<Sampler, "onGesture" | "stats">;
  onLiveDrawn(cb: (now: number) => void): () => void;
  frameDurations(): number[];
  readonly options: BenchOptions;
  readonly environment: Environment;
  readonly coreVersion: string;
  now(): string;
}

export interface AppBenchReport extends BenchReport {
  readonly geometry: "freedraw";
  readonly coreVersion: string;
}

export interface AppBench {
  report(): AppBenchReport;
  dispose(): void;
}

export function createAppBench(deps: AppBenchDeps): AppBench {
  const recorder = createRecorder(effectiveOptions(deps.options));
  const offGesture = deps.sampler.onGesture((g) => recorder.handle(g));
  const offDrawn = deps.onLiveDrawn((now) => recorder.markDrawn(now));
  return {
    report: () => ({
      ...buildReport({
        createdAt: deps.now(),
        environment: deps.environment,
        counters: deps.sampler.stats(),
        frameDurations: deps.frameDurations(),
        strokes: recorder.strokes(),
      }),
      geometry: "freedraw",
      coreVersion: deps.coreVersion,
    }),
    dispose() {
      offGesture();
      offDrawn();
    },
  };
}

const fmt = (v: number | null | undefined, digits = 1): string =>
  v === null || v === undefined ? "—" : v.toFixed(digits);

/** Petit panneau (DOM) : résumé toutes les 500 ms et export du JSON. Hors de la zone de dessin. */
export function mountBenchPanel(bench: AppBench, host: HTMLElement = document.body): () => void {
  const box = document.createElement("div");
  box.id = "banc";
  box.style.cssText =
    "position:absolute;right:8px;bottom:8px;z-index:3;max-width:30rem;padding:8px;background:#fafafaee;" +
    "border:1px solid #a1a1aa;border-radius:6px;font:12px ui-monospace,monospace;";
  const pre = document.createElement("pre");
  pre.style.margin = "0 0 6px";
  pre.style.whiteSpace = "pre-wrap";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Télécharger le JSON";
  button.addEventListener("click", () => {
    const text = JSON.stringify(bench.report(), null, 2);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `roomboard-appli-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  box.append(pre, button);
  host.append(box);
  const paint = (): void => {
    const r = bench.report();
    const t = r.totals;
    pre.textContent = [
      `Banc (géométrie du produit, cœur ${r.coreVersion})`,
      `Traits ${t.strokes} (stylet ${t.penStrokes}) · pression stylet ${fmt(t.penPressure?.min, 2)}–${fmt(t.penPressure?.max, 2)}`,
      `Retard interne p50 ${fmt(t.latencyP50)} / p95 ${fmt(t.latencyP95)} ms`,
      `Images ${r.frames?.count ?? 0}, p95 ${fmt(r.frames?.p95)} ms, > 25 ms ${fmt(r.frames ? r.frames.overBudgetShare * 100 : null)} %`,
    ].join("\n");
  };
  paint();
  const timer = window.setInterval(paint, 500);
  return () => {
    window.clearInterval(timer);
    box.remove();
    bench.dispose();
  };
}
