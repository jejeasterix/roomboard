// Banc S6 du pot sur zones fermées (OE23, cadrage restes-od94-porte-s6 Q6) : vrai module Wasm chargé en Node par
// `initSync` (patron `render/grid-cache.test.ts`) ; sous `ROOMBOARD_WASM_REQUIRED=1`, un `.wasm` absent fait échouer ce
// fichier au lieu de le sauter. Témoin, pas porte : les durées vont sur la console, aucune n'est assertée (C8 Q18).
import { describe, expect, it } from "vitest";
import type { Command, CoreDocument, CoreFactory } from "../core/api";
import { createWasmCore } from "../core/wasm-core";
import { createZoneMarks } from "../app/zone-marks";
import type { FrameLoopDeps } from "../proto/frame-loop";
import { createEngine, type ToolFactories } from "./engine";
import type { Renderer } from "./render/renderer";
import { NO_LIVE, type GestureTool } from "./tools/tool";

interface NodeFs { existsSync(p: URL): boolean; readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const wasmFile = new URL("../wasm/roomboard_wasm_bg.wasm", import.meta.url);
const present = fs.existsSync(wasmFile);
type WasmJs = typeof import("../wasm/roomboard_wasm");
async function loadWasm(): Promise<CoreFactory> {
  const href = new URL("../wasm/roomboard_wasm.js", import.meta.url).href;
  const mod = (await import(/* @vite-ignore */ href)) as WasmJs;
  mod.initSync({ module: fs.readFileSync(wasmFile) });
  return createWasmCore(mod);
}
const wasmCore: CoreFactory | null = present ? await loadWasm() : null;
const need = (): CoreFactory => {
  if (wasmCore === null) throw new Error("module wasm absent");
  return wasmCore;
};

it("le module wasm est présent quand il est exigé (banc S6 sur le vrai cœur)", () => {
  if (env["ROOMBOARD_WASM_REQUIRED"] === "1") expect(present).toBe(true);
});

/** Constantes de l'essai C8 (`scripts/essais/c8-pot-zones-navigateur.mjs:17`, `:32-40`), recopiées sans changement (Q1). */
const FIXED = "2026-11-21T08:00:00.000Z";
const INSIDE: readonly [number, number] = [100, 100];
const OUTSIDE: readonly [number, number] = [900, 400];
const YELLOW = "#facc15";
const BLUE = "#1d4ed8";
const TOL = 2;
const MIN_CELLS = 4_000_000;
const PEN = { color: "#000000", width: 4 };

/** Fixture S6 de l'essai (`c8-pot-zones-navigateur.mjs:43-73`), enregistrée puis rouverte comme l'essai ouvre son fichier. */
function buildS6(core: CoreFactory): { readonly d: CoreDocument; readonly p: string } {
  const b = core.blank();
  const page = b.pageIds()[0] ?? "";
  const side = (x0: number, y0: number, x1: number, y1: number): void => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(len / 10);
    const [nx, ny] = [-(y1 - y0) / len, (x1 - x0) / len];
    const pts: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const wob = 3 * Math.sin(t * Math.PI * 7) * Math.sin(t * Math.PI); // main levée, nulle aux sommets
      pts.push(x0 + (x1 - x0) * t + nx * wob, y0 + (y1 - y0) * t + ny * wob, 0.5);
    }
    b.apply({ type: "CommitStroke", page, points: new Float32Array(pts), style: PEN });
  };
  side(-700, -700, 1300, -700);
  side(1300, -700, -700, 1300);
  side(-700, 1300, -700, -700);
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 15; j++) {
      const [x, y] = [-600 + 40 * i, -600 + 40 * j];
      b.apply({ type: "CommitStroke", page, points: new Float32Array([x, y, 0.5, x + 15, y, 0.5]), style: PEN });
    }
  }
  const d = core.load(b.save(FIXED, "essai-c8"));
  b.free();
  return { d, p: d.pageIds()[0] ?? "" };
}

const zoneAt = (p: string, [x, y]: readonly [number, number], color: string | null): Command => ({
  type: "Fill",
  page: p,
  target: { kind: "zone", x, y, tol: TOL },
  color,
});

const ms = (f: () => void): number => {
  const t0 = performance.now();
  f();
  return performance.now() - t0;
};
const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[1] ?? Number.NaN;
const show = (xs: readonly number[]): string =>
  `médiane ${median(xs).toFixed(1)} ms (ordre : ${xs.map((x) => x.toFixed(1)).join(", ")})`;

/** Empreinte d'un `fill` (Q10, H3) : nombre d'anneaux, longueur et SHA-256 des octets de `fillRings(id)`, boîte. */
interface Fingerprint { readonly rings: number; readonly length: number; readonly sha256: string; readonly bounds: readonly number[] }
async function fingerprint(d: CoreDocument, id: string): Promise<Fingerprint> {
  const rings = d.fillRings(id);
  if (rings === null) throw new Error(`pas de fill : ${id}`);
  let count = 0;
  for (let i = 0; i < rings.length; i += 1 + 2 * (rings[i] ?? 0)) count++;
  const bytes = Uint8Array.from(new Uint8Array(rings.buffer, rings.byteOffset, rings.byteLength));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const sha256 = [...hash].map((x) => x.toString(16).padStart(2, "0")).join("");
  const b = d.bounds([id]);
  if (b === null) throw new Error(`pas de boîte : ${id}`);
  return { rings: count, length: rings.length, sha256, bounds: [b.x0, b.y0, b.x1, b.y1] };
}

/** Moteur sans rendu ni image (`requestFrame` ne rappelle jamais) : `engine.run` = commande + état du moteur (`emit`). */
const NO_RENDERER: Renderer = { drawScene() {}, drawLive() {}, resize() {}, invalidate() {}, setGridPreview() {}, setImagePreview() {} };
const NO_FRAMES: FrameLoopDeps = { requestFrame: () => 0, cancelFrame: () => undefined, now: () => performance.now() };
const inert = (): GestureTool => ({ begin() {}, extend() {}, frame() {}, close() {}, live: () => NO_LIVE, active: () => false });
const TOOLS: ToolFactories = { pen: inert, eraser: inert };

describe.skipIf(wasmCore === null)("banc S6 (OE23, Q6) : vrai module, témoin sans porte", () => {
  it("S6 banc : apply seul, engine.run, fenêtre et hors fenêtre de zone-marks, boucles du pont, empreinte", async () => {
    const { d, p } = buildS6(need());
    const ids = d.elementIds(p);
    expect(ids).toHaveLength(303);
    // (a) Commande seule ; le premier clic est le premier calcul de zone du module (mémoire à froid, Q3, Q8).
    const a: number[] = [];
    let print: Fingerprint | null = null;
    for (let k = 0; k < 3; k++) {
      let id = "";
      a.push(ms(() => {
        id = d.apply(zoneAt(p, INSIDE, YELLOW)).ids[0] ?? "";
      }));
      expect(id).not.toBe("");
      if (print === null) print = await fingerprint(d, id);
      d.undo();
    }
    if (print === null) throw new Error("aucune empreinte");
    const cells = d.zoneCells(p, TOL);
    const zc = ms(() => {
      d.zoneCells(p, TOL);
    });
    expect(cells).toBeGreaterThanOrEqual(MIN_CELLS);
    // (b) engine.run : commande, puis état du moteur (tableCounts) dans emit, comme dans la session.
    const engine = createEngine({ doc: d, renderer: NO_RENDERER, frames: NO_FRAMES, tools: TOOLS });
    const b: number[] = [];
    for (let k = 0; k < 3; k++) {
      b.push(ms(() => {
        engine.run(zoneAt(p, INSIDE, YELLOW));
      }));
      expect(d.elementIds(p)).toHaveLength(304);
      engine.undo();
    }
    // (c) zone-marks branché comme la session (`board-session.ts:200`, `:331`, `:658`) : fenêtre `pot-zone`, puis hors
    // fenêtre (cellules et recompte des fill rappelé par onMarked), mesurés à part (Q2).
    let win = 0;
    const marks = createZoneMarks(
      d,
      () => performance.now(),
      (s, e) => {
        win = e - s;
      },
      () => {
        const s = engine.state();
        marks.tags(s.page, s.version);
      },
    );
    const off = engine.onState((s) => {
      marks.tags(s.page, s.version);
    });
    const timed = marks.timed((c) => engine.run(c));
    const inside: number[] = [];
    const outside: number[] = [];
    for (let k = 0; k < 3; k++) {
      const total = ms(() => {
        timed(zoneAt(p, INSIDE, YELLOW));
      });
      inside.push(win);
      outside.push(total - win);
      expect(marks.tags(p, d.version()).zones).toBe("1");
      engine.undo();
    }
    off();
    // H7 : dans la boucle `element(id)` de tableCounts, parcours de find_element (fillRings d'un trait : find_element puis
    // refus au kind) contre vue (to_js, lecture des champs).
    const loops = { ids: [] as number[], views: [] as number[], finds: [] as number[] };
    for (let k = 0; k < 3; k++) {
      loops.ids.push(ms(() => {
        d.elementIds(p);
      }));
      loops.views.push(ms(() => {
        for (const id of ids) d.element(id);
      }));
      loops.finds.push(ms(() => {
        for (const id of ids) d.fillRings(id);
      }));
    }
    console.info(`S6 banc (a) apply : ${show(a)}`);
    console.info(`S6 banc (b) engine.run : ${show(b)}`);
    console.info(`S6 banc (c) fenêtre : ${show(inside)} ; hors fenêtre : ${show(outside)}`);
    console.info(`S6 banc zoneCells : ${zc.toFixed(1)} ms (${cells} cellules)`);
    console.info(
      `S6 banc boucles (${ids.length} éléments) : elementIds ${show(loops.ids)} ; element(id) ${show(loops.views)} ; ` +
        `fillRings(id), parcours seul ${show(loops.finds)} ; vue ≈ ${(median(loops.views) - median(loops.finds)).toFixed(1)} ms`,
    );
    console.info(
      `S6 empreinte : anneaux=${print.rings} longueur=${print.length} sha256=${print.sha256} boîte=${print.bounds.join(",")}`,
    );
    engine.dispose();
    d.free();
  }, 120_000);
});
