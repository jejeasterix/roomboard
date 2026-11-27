import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPageThumbs } from "./page-thumbs";

let n = 0;
beforeEach(() => {
  n = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:t${++n}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

const png = (): Blob => new Blob([new Uint8Array([1])], { type: "image/png" });

describe("createPageThumbs (DA7)", () => {
  it("cache par version, invalidate : même page et largeur → un rendu ; invalidate → nouveau rendu, ancienne URL révoquée", async () => {
    const render = vi.fn(async (_p: string, _w: number) => png());
    const thumbs = createPageThumbs(render);
    const a1 = await thumbs.get("a", 120);
    expect(await thumbs.get("a", 120)).toBe(a1);
    expect(render).toHaveBeenCalledTimes(1);
    thumbs.invalidate(["b"]);
    expect(await thumbs.get("a", 120)).toBe(a1);
    expect(render).toHaveBeenCalledTimes(1);
    thumbs.invalidate(["a"]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(a1);
    const a2 = await thumbs.get("a", 120);
    expect(a2).not.toBe(a1);
    expect(render).toHaveBeenCalledTimes(2);
    await thumbs.get("a", 240);
    expect(render).toHaveBeenLastCalledWith("a", 240);
    thumbs.dispose();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    expect(await thumbs.get("a", 240)).toBeNull();
  });

  it("forme du cadre : un mode de page autre que le précédent refait la miniature (même version, même largeur)", async () => {
    const render = vi.fn(async (_p: string, _w: number) => png());
    const thumbs = createPageThumbs(render);
    const a1 = await thumbs.get("a", 120, "landscape");
    expect(await thumbs.get("a", 120, "landscape")).toBe(a1);
    expect(render).toHaveBeenCalledTimes(1);
    const a2 = await thumbs.get("a", 120, "portrait");
    expect(a2).not.toBe(a1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(a1);
    expect(render).toHaveBeenCalledTimes(2);
    expect(await thumbs.get("a", 120)).toBe(a2); // sans `form` : rien ne change
    thumbs.dispose();
  });

  it("un seul rendu à la fois ; la même demande en cours est partagée ; rendu nul → null", async () => {
    let live = 0;
    let peak = 0;
    const gates: (() => void)[] = [];
    const render = vi.fn(async (p: string) => {
      live++;
      peak = Math.max(peak, live);
      await new Promise<void>((res) => gates.push(res));
      live--;
      return p === "vide" ? null : png();
    });
    const thumbs = createPageThumbs(render);
    const a = thumbs.get("a", 120);
    const a2 = thumbs.get("a", 120);
    const b = thumbs.get("b", 120);
    const vide = thumbs.get("vide", 120);
    expect(a2).toBe(a);
    await vi.waitFor(() => expect(gates).toHaveLength(1));
    expect(render).toHaveBeenCalledTimes(1);
    gates[0]?.();
    await vi.waitFor(() => expect(gates).toHaveLength(2));
    gates[1]?.();
    await vi.waitFor(() => expect(gates).toHaveLength(3));
    gates[2]?.();
    expect([await a, await b, await vide]).toEqual(["blob:t1", "blob:t2", null]);
    expect(peak).toBe(1);
  });

  it("invalidate pendant le rendu : la version nouvelle est rendue, l'ancienne jamais servie", async () => {
    const gates: (() => void)[] = [];
    const render = vi.fn(async () => {
      await new Promise<void>((res) => gates.push(res));
      return png();
    });
    const thumbs = createPageThumbs(render);
    const a = thumbs.get("a", 120);
    await vi.waitFor(() => expect(gates).toHaveLength(1));
    thumbs.invalidate(["a"]);
    gates[0]?.();
    await vi.waitFor(() => expect(gates).toHaveLength(2));
    gates[1]?.();
    expect(await a).toBe("blob:t1");
    expect(render).toHaveBeenCalledTimes(2);
  });
});
