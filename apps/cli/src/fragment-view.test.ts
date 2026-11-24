import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../../web/src/core/api";
import { createAssetStore } from "../../web/src/core/asset-store";
import { cliView, SCENE } from "./fragment-view";

const change = { pages: [], ids: ["e"], removed: [], full: false, version: 1 };
describe("cliView (D17, H7)", () => {
  it("état sans sélection, ancre sur la scène fixe (centre sans point), page passée au cœur", () => {
    const calls: unknown[] = [];
    const doc = { insertFragment: (...a: unknown[]) => (calls.push(a), change), insertPages: (...a: unknown[]) => (calls.push(a), change) } as unknown as CoreDocument;
    const v = cliView({ tab: { doc, assets: createAssetStore(), file: null }, page: "p2" }, []);
    expect(v.state()).toEqual({ page: "p2", selection: [] });
    expect(v.anchor(null)).toEqual([SCENE.width / 2, SCENE.height / 2]);
    expect(v.anchor({ x: 400, y: 300 })).toEqual([400, 300]);
    const src = {} as CoreDocument;
    v.insertFragment(src, 3, 4);
    v.insertPages(src);
    expect(calls).toEqual([[src, "p2", 3, 4], [src, "p2"]]);
  });
  it("refus du cœur : null et avis gardé", () => {
    const doc = { apply: () => { throw new Error("page inconnue"); } } as unknown as CoreDocument;
    const notices: string[] = [];
    expect(cliView({ tab: { doc, assets: createAssetStore(), file: null }, page: "p1" }, notices).run({ type: "Delete", ids: [] })).toBeNull();
    expect(notices).toEqual(["page inconnue"]);
  });
});
