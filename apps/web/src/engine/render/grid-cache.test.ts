import { describe, expect, it, vi } from "vitest";
import { MAX_GRID_DOTS, NO_CHANGE, type Bounds, type CoreDocument, type CoreFactory, type GridLevel, type GridLines } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import { createWasmCore } from "../../core/wasm-core";
import type { Camera } from "../camera";
import { visibleGridRect } from "../page";
import { cacheMargin, cacheRect, EDGE_EPS, GridLinesCache, visibleLines } from "./grid-cache";
import { MIN_DOT_PX, MIN_GRID_PX } from "./grid-paint";

// Vrai module Wasm, patron du contrat (`core/wasm-core.contract.test.ts`) : chargé en Node par `initSync` sur les octets ;
// sous `ROOMBOARD_WASM_REQUIRED=1`, un `.wasm` absent fait échouer ce fichier au lieu de sauter la parité sur le vrai cœur.
interface NodeFs { existsSync(p: URL): boolean; readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const wasmFile = new URL("../../wasm/roomboard_wasm_bg.wasm", import.meta.url);
const present = fs.existsSync(wasmFile);
type WasmJs = typeof import("../../wasm/roomboard_wasm");
async function loadWasm(): Promise<CoreFactory> {
  const href = new URL("../../wasm/roomboard_wasm.js", import.meta.url).href;
  const mod = (await import(/* @vite-ignore */ href)) as WasmJs;
  mod.initSync({ module: fs.readFileSync(wasmFile) });
  return createWasmCore(mod);
}
const wasmCore: CoreFactory | null = present ? await loadWasm() : null;

it("le module wasm est présent quand il est exigé (parité du cache sur le vrai cœur)", () => {
  if (env["ROOMBOARD_WASM_REQUIRED"] === "1") expect(present).toBe(true);
});

const V: Bounds = { x0: 0, y0: 1000, x1: 800, y1: 1600 };
const one = (segments: number[], dots: number[] = []): GridLines => ({
  above: true,
  levels: [{ color: "#000000", line: "solid", alpha: 1, lineWidth: 1, segments, dots }],
});

describe("rectangle gardé (E3, S4)", () => {
  it("S4, Review Focus 3 : vues jusqu'à 3840 × 2160, tout zoom : le rectangle gardé tient sous MAX_GRID_DOTS au pas minimal ; vue seule au-delà : marge 0", () => {
    for (const [w, h] of [[800, 600], [1280, 720], [1920, 1080], [3840, 2160]] as const) {
      for (const z of [0.15, 0.37, 1, 2.5, 8]) {
        const v = { x0: 0, y0: 5000, x1: w / z, y1: 5000 + h / z };
        const r = cacheRect(v, z, 1920);
        const dots = (b: Bounds): number => (((Math.min(b.x1, 1920) - b.x0) * z) / MIN_DOT_PX + 1) * (((b.y1 - b.y0) * z) / MIN_DOT_PX + 1);
        expect(r.x0 <= v.x0 && r.y0 <= v.y0 && r.x1 >= v.x1 && r.y1 >= v.y1, `${w}×${h} z=${z}`).toBe(true);
        expect(r.y1 - v.y1).toBeLessThanOrEqual(h / 2 / z + 1e-9);
        if (dots(v) <= MAX_GRID_DOTS) expect(dots(r), `${w}×${h} z=${z}`).toBeLessThanOrEqual(MAX_GRID_DOTS);
        else expect(r).toEqual(v);
      }
    }
  });

  it("marge : une demi-hauteur de vue quand elle tient (786,7 × 600 à z = 1 : 300 px) ; vue vide : 0", () => {
    expect(cacheMargin(786.7, 600, 1, 1920)).toBe(300);
    expect(cacheMargin(0, 0, 1, 1920)).toBe(0);
  });
});

describe("visibleLines (E3)", () => {
  it("verticales et horizontales bornées à la vue, valeurs exactes ; hors vue retirées ; above gardé", () => {
    const lines = one([0, 400, 0, 2200, 40, 400, 40, 2200, 900, 400, 900, 2200, 0, 1040, 1920, 1040, 0, 1700, 1920, 1700]);
    expect(visibleLines(lines, V)).toEqual(one([0, 1000, 0, 1600, 40, 1000, 40, 1600, 0, 1040, 800, 1040]));
  });

  it("ligne posée sur un bord de la vue : gardée (Review Focus 2)", () => {
    expect(visibleLines(one([800, 400, 800, 2200, 0, 1000, 1920, 1000]), V)).toEqual(one([800, 1000, 800, 1600, 0, 1000, 800, 1000]));
  });

  it("EDGE_EPS (relecture T7) : tolérance absolue de 1e-6, quel que soit le pas (le cœur : 1e-9 · pas)", () => {
    expect(EDGE_EPS).toBe(1e-6);
    // Horizontales à 9e-7 et 2e-6 sous le bas de la vue (y1 = 1600) : la première gardée, la seconde écartée.
    const lines = one([0, 1600 + 9e-7, 800, 1600 + 9e-7, 0, 1600 + 2e-6, 800, 1600 + 2e-6]);
    expect(visibleLines(lines, V)).toEqual(one([0, 1600 + 9e-7, 800, 1600 + 9e-7]));
  });

  it("oblique recoupée (Liang-Barsky) ; points hors vue retirés ; groupe vidé retiré", () => {
    const iso: GridLines = {
      above: false,
      levels: [
        { color: "#111111", line: "solid", alpha: 1, lineWidth: 2, segments: [0, 900, 1000, 1900], dots: [] },
        { color: "#222222", line: "solid", alpha: 1, lineWidth: 1, segments: [], dots: [10, 1010, 900, 1010, 10, 2000] },
        { color: "#333333", line: "solid", alpha: 0.5, lineWidth: 1, segments: [900, 0, 900, 50], dots: [] },
      ],
    };
    const out = visibleLines(iso, V);
    expect(out.levels.map((l) => [l.color, l.lineWidth])).toEqual([["#111111", 2], ["#222222", 1]]);
    // y = x + 900 : entre dans V en (100, 1000), en sort en (700, 1600).
    expect(out.levels[0]!.segments.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([100, 1000, 700, 1600]);
    expect(out.levels[1]!.dots).toEqual([10, 1010]);
  });
});

describe("GridLinesCache (E3, S4)", () => {
  const setup = () => {
    const compute = vi.fn((_page: string, r: Bounds, _minStep: number, _minDotStep: number): GridLines | null => one([0, r.y0, 0, r.y1]));
    return { compute, cache: new GridLinesCache(compute) };
  };
  const at = (dy: number): Bounds => ({ x0: 0, y0: 1000 + dy, x1: 800, y1: 1600 + dy });

  it("S4 : même vue → 1 appel ; défilement dans la marge → 1 ; au-delà → 2 ; zoom → 3 ; page → 4", () => {
    const { compute, cache } = setup();
    for (let i = 0; i < 10; i++) cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(compute.mock.calls[0]?.slice(2)).toEqual([4, 8]);
    expect(cache.get("p", at(50), 1, 1920)).toEqual(one([0, 1050, 0, 1650]));
    expect(compute).toHaveBeenCalledTimes(1);
    cache.get("p", at(400), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(2);
    cache.get("p", at(400), 2, 1920);
    expect(compute).toHaveBeenCalledTimes(3);
    expect(compute.mock.calls[2]?.slice(2)).toEqual([2, 4]);
    cache.get("q", at(400), 2, 1920);
    expect(compute).toHaveBeenCalledTimes(4);
  });

  it("invalidate : autre page → rien ; la page ou full → recalcul ; clear → recalcul", () => {
    const { compute, cache } = setup();
    cache.get("p", at(0), 1, 1920);
    cache.invalidate({ ...NO_CHANGE, pages: ["q"] });
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(1);
    cache.invalidate({ ...NO_CHANGE, pages: ["p"] });
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(2);
    cache.invalidate({ ...NO_CHANGE, full: true });
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(3);
    cache.clear();
    cache.get("p", at(0), 1, 1920);
    expect(compute).toHaveBeenCalledTimes(4);
  });

  it("marge 0 (relecture T7) : l'entrée est la vue exacte, servie à cette vue seule ; une vue plus petite comprise est recalculée", () => {
    // Calcul qui saute ses points comme le cœur (grid.rs, dot_grid) : au-delà de MAX_GRID_DOTS dans le rectangle demandé, aucun.
    const compute = vi.fn((_page: string, r: Bounds): GridLines => {
      const n = (Math.floor((r.x1 - r.x0) / 4.5) + 1) * (Math.floor((r.y1 - r.y0) / 4.5) + 1);
      return n > MAX_GRID_DOTS ? { above: false, levels: [] } : one([], [r.x0, r.y0]);
    });
    const cache = new GridLinesCache(compute);
    const full: Bounds = { x0: 0, y0: 0, x1: 1920, y1: 1080 };
    const up: Bounds = { x0: 0, y0: 0, x1: 1920, y1: 480 };
    expect(cacheMargin(3840, 2160, 2, 1920)).toBe(0);
    expect(cache.get("p", full, 2, 1920)).toEqual({ above: false, levels: [] });
    expect(cache.get("p", full, 2, 1920)).toEqual({ above: false, levels: [] });
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cache.get("p", up, 2, 1920)).toEqual(one([], [0, 0]));
    expect(compute).toHaveBeenCalledTimes(2);
    expect(compute.mock.calls[1]?.[1]).toEqual(cacheRect(up, 2, 1920));
  });

  it("page sans grille : null gardé aussi (aucun appel par image)", () => {
    const compute = vi.fn(() => null);
    const cache = new GridLinesCache(compute);
    expect(cache.get("p", at(0), 1, 1920)).toBeNull();
    expect(cache.get("p", at(10), 1, 1920)).toBeNull();
    expect(compute).toHaveBeenCalledTimes(1);
  });
});

const level = (kind: string, s: number): GridLevel => ({
  kind,
  spacingX: s,
  spacingY: s,
  originX: 0,
  originY: 0,
  color: "#000000",
  line: "solid",
  lineWidth: 1,
  snap: true,
  visible: true,
});

/** Document à une page portant `levels`, et un cache qui interroge son cœur comme `Canvas2DRenderer`. */
function gridDoc(f: CoreFactory, levels: GridLevel[]) {
  const d = f.blank();
  const p = d.pageIds()[0];
  if (p === undefined) throw new Error("aucune page");
  d.apply({ type: "SetGrid", page: p, grid: { visible: true, snap: true, above: false, levels } });
  const compute = vi.fn((page: string, r: Bounds, minStep: number, minDotStep: number) => d.gridLines(page, r, minStep, minDotStep));
  return { d, p, compute, cache: new GridLinesCache(compute) };
}

/** Ce que le cœur rend pour la vue seule, sans cache (le chemin d'avant E3). */
const direct = (d: CoreDocument, p: string, v: Bounds, zoom: number): GridLines | null =>
  d.gridLines(p, v, MIN_GRID_PX / zoom, MIN_DOT_PX / zoom);

/** Attendu du calcul direct : obliques à 1e-6 près (recoupe Liang-Barsky contre le calcul du cœur), le reste exact. */
function approx(lines: GridLines | null): unknown {
  if (lines === null) return null;
  const levels = lines.levels.map((l) => {
    const segments: unknown[] = [];
    for (let i = 0; i + 3 < l.segments.length; i += 4) {
      const s = l.segments.slice(i, i + 4);
      segments.push(...(s[0] !== s[2] && s[1] !== s[3] ? s.map((v) => expect.closeTo(v, 6)) : s));
    }
    return { ...l, segments };
  });
  return { ...lines, levels };
}

// La fausse liaison ne rend aucune ligne pour ces types : la parité n'a de sens que sur le vrai cœur.
describe.skipIf(wasmCore === null)("cache contre calcul direct sur le vrai module (E3, relecture T7)", () => {
  const f = wasmCore ?? fakeCore;

  it("marge 0 (vue 3840 × 2160 à z = 2) : la décision « points sautés » de la vue entière n'est pas resservie à une vue plus petite", () => {
    const { d, p, cache } = gridDoc(f, [level("dots", 4.5)]);
    const cam: Camera = { zoom: 2, tx: 0, ty: 0 };
    const full = visibleGridRect(cam, 3840, 2160);
    expect(full).toEqual({ x0: 0, y0: 0, x1: 1920, y1: 1080 });
    expect(cacheMargin(3840, 2160, 2, 1920)).toBe(0);
    // 427 × 241 points > MAX_GRID_DOTS : le cœur saute le niveau pour la vue entière.
    expect(direct(d, p, full!, 2)?.levels).toEqual([]);
    expect(cache.get(p, full!, 2, 1920)).toEqual(direct(d, p, full!, 2));
    // Défilement de 1 200 px vers le haut : vue bornée à y ≥ 0, comprise dans l'entrée gardée ; 427 × 107 points tiennent.
    const up = visibleGridRect({ ...cam, ty: 1200 }, 3840, 2160);
    expect(up).toEqual({ x0: 0, y0: 0, x1: 1920, y1: 480 });
    const want = direct(d, p, up!, 2);
    expect((want?.levels[0]?.dots.length ?? 0) / 2).toBe(427 * 107);
    expect(cache.get(p, up!, 2, 1920)).toEqual(want);
  });

  it.each([
    ["dots", 40],
    ["isometric", 40],
    ["music", 20],
    ["seyes", 30.24],
  ] as const)("parité %s (pas %s) : lignes recoupées par visibleLines = gridLines(vue), défilements dans la marge, 3 zooms", (kind, step) => {
    // Vue 800 × 600 px : marge de 300 px à ces zooms ; défilements (dx, dy) en px, dont un haut de vue posé sur une ligne.
    const moves: readonly (readonly [number, number])[] = [[0, 0], [0, 37.3], [0, -120.6], [-150.2, 0], [123.4, -260.1], [299, 299], [-299, -299]];
    for (const zoom of [0.37, 1, 2.5]) {
      const { d, p, compute, cache } = gridDoc(f, [level(kind, step)]);
      for (const [dx, dy] of [...moves, [0, step * zoom] as const]) {
        const v = visibleGridRect({ zoom, tx: -200 * zoom - dx, ty: -5000 * zoom - dy }, 800, 600);
        if (v === null) throw new Error("vue vide");
        const want = direct(d, p, v, zoom);
        expect(want?.levels.length, `${kind} z=${zoom} (${dx}, ${dy})`).toBeGreaterThan(0);
        expect(cache.get(p, v, zoom, 1920), `${kind} z=${zoom} (${dx}, ${dy})`).toEqual(approx(want));
      }
      // Toutes ces vues servies par l'entrée gardée : la parité porte bien sur la recoupe, pas sur un recalcul.
      expect(compute, `${kind} z=${zoom}`).toHaveBeenCalledTimes(1);
    }
  });
});
