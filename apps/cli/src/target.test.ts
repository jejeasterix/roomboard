import { describe, expect, it } from "vitest";
import type { CoreDocument } from "../../web/src/core/api";
import { createAssetStore } from "../../web/src/core/asset-store";
import { IDENTITY } from "../../web/src/engine/camera";
import type { FragmentOps } from "../../web/src/app/fragments";
import type { CliPage } from "./fragment-view";
import { headlessTarget, SCENE } from "./target";

const NONE = {} as unknown as FragmentOps<CliPage>;

describe("headlessTarget (DA5, H7)", () => {
  it("scène fixe 1920 × 1080, caméra identité, style du stylo, mesure de repli", () => {
    const doc = { apply: () => ({ pages: [], ids: ["e"], removed: [], full: false, version: 1 }) } as unknown as CoreDocument;
    const t = headlessTarget({ doc, assets: createAssetStore(), file: null }, "p1", [], NONE);
    expect(t.page()).toBe("p1");
    expect(t.camera()).toBe(IDENTITY);
    expect(t.stageRect()).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
    expect(SCENE).toEqual(t.stageRect());
    expect(t.textStyle()).toEqual({ color: "#000000", size: 36 });
    expect(t.measure()("abcd", 10)).toBeCloseTo(24);
  });
  it("refus du cœur : run rend null et l'avis est gardé", () => {
    const doc = {
      apply: () => {
        throw new Error("page inconnue");
      },
    } as unknown as CoreDocument;
    const notices: string[] = [];
    const t = headlessTarget({ doc, assets: createAssetStore(), file: null }, "p1", notices, NONE);
    expect(t.run({ type: "Delete", ids: [] })).toBeNull();
    expect(notices).toEqual(["page inconnue"]);
  });

  it("insertFragment : fragments.insertResource({ tab, page }, octets, nom, at, rang) ; vrai si « inserted »", async () => {
    const doc = {} as CoreDocument;
    const tab = { doc, assets: createAssetStore(), file: null };
    const seen: unknown[] = [];
    const fragments = { insertResource: async (...a: unknown[]) => (seen.push(a), "inserted") } as unknown as FragmentOps<CliPage>;
    const t = headlessTarget(tab, "p1", [], fragments);
    const bytes = new Uint8Array([1]);
    expect(await t.insertFragment!(bytes, { x: 1, y: 2 }, 3, "x.rbitem")).toBe(true);
    expect(seen).toEqual([[{ tab, page: "p1" }, bytes, "x.rbitem", { x: 1, y: 2 }, 3]]);
  });
  it("insertFragment : tout résultat autre que « inserted » rend faux", async () => {
    const tab = { doc: {} as CoreDocument, assets: createAssetStore(), file: null };
    const fragments = { insertResource: async () => "refused" } as unknown as FragmentOps<CliPage>;
    expect(await headlessTarget(tab, "p1", [], fragments).insertFragment!(new Uint8Array([1]), { x: 0, y: 0 }, 0, "x.rbitem")).toBe(false);
  });
});
