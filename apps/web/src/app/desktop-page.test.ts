// C11b (P2, P3, P10, P11, P13) : page envoyée au tableau, sur le faux cœur et sur le vrai module Wasm (chargé en Node
// comme `workspace.test.ts`).
import { describe, expect, it } from "vitest";
import type { AssetRef, CoreDocument, CoreFactory, Matrix } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { createWasmCore, type WasmModule } from "../core/wasm-core";
import { capturePage, IDENTITY_MATRIX, type PageBackdrop } from "./desktop-page";

interface NodeFs { existsSync(p: string): boolean; readFileSync(p: string): Uint8Array }
const nodeFs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const proc = (globalThis as { process?: { env: Record<string, string | undefined>; cwd(): string } }).process;
const webRoot = proc?.cwd() ?? "."; // vitest tourne depuis `apps/web`
const wasmPath = `${webRoot}/src/wasm/roomboard_wasm_bg.wasm`;
const present = nodeFs.existsSync(wasmPath);
async function loadReal(): Promise<CoreFactory> {
  const mod = (await import(/* @vite-ignore */ `file://${webRoot}/src/wasm/roomboard_wasm.js`)) as WasmModule & { initSync(o: { module: Uint8Array }): unknown };
  mod.initSync({ module: nodeFs.readFileSync(wasmPath) });
  return createWasmCore(mod);
}
const real: CoreFactory | null = present ? await loadReal() : null;

it("C11b : le vrai cœur est présent quand il est exigé", () => {
  if (proc?.env["ROOMBOARD_WASM_REQUIRED"] === "1") expect(present).toBe(true);
});

const REF: AssetRef = { id: "ab".repeat(32), name: "capture-du-bureau.png", mime: "image/png", size: 100 };
const FOND: PageBackdrop = { ref: REF, w: 320, h: 180 };
/** Trait du faux hôte (P30) : de (200, 200) à (600, 200), épaisseur 8. */
function inked(core: CoreFactory): { doc: CoreDocument; page: string } {
  const doc = core.blank();
  const page = doc.pageIds()[0]!;
  const points = new Float32Array([200, 200, 0.5, 400, 200, 0.5, 600, 200, 0.5]);
  doc.apply({ type: "CommitStroke", page, points, style: { color: "#000000", width: 8 } });
  return { doc, page };
}
const only = (d: CoreDocument): string => {
  expect(d.pageIds()).toHaveLength(1);
  return d.pageIds()[0]!;
};
const centre = (d: CoreDocument): [number, number] => {
  const p = only(d);
  const b = d.bounds(d.elementIds(p))!;
  return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
};
const near = (got: [number, number], want: [number, number]): void => {
  expect(Math.abs(got[0] - want[0])).toBeLessThan(3);
  expect(Math.abs(got[1] - want[1])).toBeLessThan(3);
};

const cores: ReadonlyArray<readonly [string, CoreFactory | null]> = [
  ["faux cœur", fakeCore],
  ["vrai cœur", real],
];
for (const [name, core] of cores) {
  describe.skipIf(core === null)(`capturePage (C11b, P2, P3, P11, P13) — ${name}`, () => {
    const c = core!;
    it(`${name} : fond et trait : une page, fond image fit width 320 × 180, trait recopié, source intacte`, () => {
      const ink = inked(c);
      const doc = capturePage(c, ink, FOND, IDENTITY_MATRIX)!;
      const p = only(doc);
      expect(doc.page(p)!.backdrop).toMatchObject({ asset: REF.id, kind: "image", w: 320, h: 180, fit: "width" });
      expect(doc.elementIds(p)).toHaveLength(1);
      expect(doc.element(doc.elementIds(p)[0]!)!.kind).toBe("stroke");
      near(centre(doc), [400, 200]);
      expect(ink.doc.elementIds(ink.page)).toHaveLength(1);
      expect(ink.doc.page(ink.page)!.backdrop).toBeNull();
      doc.free();
      ink.doc.free();
    });
    it(`${name} : matrice de vue : le trait est placé (P13)`, () => {
      const ink = inked(c);
      const m: Matrix = [0.5, 0, 0, 0.5, 10, 20];
      const doc = capturePage(c, ink, FOND, m)!;
      near(centre(doc), [210, 120]);
      doc.free();
      ink.doc.free();
    });
    it(`${name} : sans fond (capture impossible) : page à fond blanc avec le trait (P10)`, () => {
      const ink = inked(c);
      const doc = capturePage(c, ink, null, IDENTITY_MATRIX)!;
      const p = only(doc);
      expect(doc.page(p)!.backdrop).toBeNull();
      expect(doc.elementIds(p)).toHaveLength(1);
      doc.free();
      ink.doc.free();
    });
    it(`${name} : capture sans encre : la page porte le fond seul (P11)`, () => {
      const empty = c.blank();
      const doc = capturePage(c, { doc: empty, page: empty.pageIds()[0]! }, FOND, IDENTITY_MATRIX)!;
      const p = only(doc);
      expect(doc.page(p)!.backdrop).toMatchObject({ asset: REF.id });
      expect(doc.elementIds(p)).toHaveLength(0);
      doc.free();
      empty.free();
      const alone = capturePage(c, null, FOND, IDENTITY_MATRIX)!;
      expect(alone.elementIds(only(alone))).toHaveLength(0);
      alone.free();
    });
    it(`${name} : rien à envoyer : ni fond ni élément → null (P11)`, () => {
      const empty = c.blank();
      expect(capturePage(c, { doc: empty, page: empty.pageIds()[0]! }, null, IDENTITY_MATRIX)).toBeNull();
      expect(capturePage(c, null, null, IDENTITY_MATRIX)).toBeNull();
      empty.free();
    });
  });
}
