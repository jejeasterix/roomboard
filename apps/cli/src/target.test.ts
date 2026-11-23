import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../../web/src/core/api";
import { createAssetStore } from "../../web/src/core/asset-store";
import { IDENTITY } from "../../web/src/engine/camera";
import { headlessTarget, SCENE } from "./target";

describe("headlessTarget (DA5, H7)", () => {
  it("scène fixe 1920 × 1080, caméra identité, style du stylo, mesure de repli", () => {
    const doc = { apply: () => ({ pages: [], ids: ["e"], removed: [], full: false, version: 1 }) } as unknown as CoreDocument;
    const t = headlessTarget({ doc, assets: createAssetStore(), file: null }, "p1", []);
    expect(t.page()).toBe("p1");
    expect(t.camera()).toBe(IDENTITY);
    expect(t.stageRect()).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
    expect(SCENE).toEqual(t.stageRect());
    expect(t.textStyle()).toEqual({ color: "#000000", size: 36 });
    expect(t.measure()("abcd", 10)).toBeCloseTo(24);
    expect(t.insertFragment).toBeUndefined();
  });
  it("refus du cœur : run rend null et l'avis est gardé", () => {
    const doc = {
      apply: () => {
        throw new Error("page inconnue");
      },
    } as unknown as CoreDocument;
    const notices: string[] = [];
    const t = headlessTarget({ doc, assets: createAssetStore(), file: null }, "p1", notices);
    expect(t.run({ type: "Delete", ids: [] })).toBeNull();
    expect(notices).toEqual(["page inconnue"]);
  });
});
