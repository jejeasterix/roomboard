import { describe, expect, it, vi } from "vitest";
import { createImageCache, type BitmapLike } from "./image-cache";
import type { ImageData, ImageElement } from "../../core/api";
import { pixelKey } from "../../core/image-params";
import type { PixelJob, PixelRunner } from "../../platform/pixel-runner";

const ID = "ab".repeat(32);
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
function store(entries: Record<string, Blob> = { [ID]: new Blob([new Uint8Array([1])]) }) {
  return { get: vi.fn((id: string) => entries[id]) };
}
const bitmap = (): BitmapLike & { close: ReturnType<typeof vi.fn> } => ({ close: vi.fn() }) as unknown as BitmapLike & { close: ReturnType<typeof vi.fn> };

describe("cache des bitmaps par empreinte (DAR2, R16)", () => {
  it("premier appel : null et un décodage ; prêt → bitmap, ready appelé une fois", async () => {
    const bmp = bitmap();
    const decode = vi.fn(async () => bmp);
    const ready = vi.fn();
    const c = createImageCache(store(), decode, ready);
    expect(c.bitmap(ID)).toBeNull();
    expect(c.bitmap(ID)).toBeNull(); // en cours : pas de second décodage
    await flush();
    expect(c.bitmap(ID)).toBe(bmp);
    expect([decode.mock.calls.length, ready.mock.calls.length]).toEqual([1, 1]);
  });

  it("asset absent du magasin : null, aucun décodage", () => {
    const decode = vi.fn(async () => bitmap());
    expect(createImageCache(store({}), decode, vi.fn()).bitmap(ID)).toBeNull();
    expect(decode).not.toHaveBeenCalled();
  });

  it("décodage en échec : null ensuite, sans nouvel essai", async () => {
    const decode = vi.fn(async (): Promise<BitmapLike> => {
      throw new Error("illisible");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const c = createImageCache(store(), decode, vi.fn());
    c.bitmap(ID);
    await flush();
    expect(c.bitmap(ID)).toBeNull();
    expect(decode).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("dispose ferme les bitmaps prêts", async () => {
    const bmp = bitmap();
    const c = createImageCache(store(), async () => bmp, vi.fn());
    c.bitmap(ID);
    await flush();
    c.dispose();
    expect(bmp.close).toHaveBeenCalledTimes(1);
    expect(c.bitmap(ID)).toBeNull();
  });

  it("dispose puis décodage fini : bitmap fermé aussitôt, ready jamais appelé", async () => {
    const bmp = bitmap();
    let resolve!: (b: BitmapLike) => void;
    const ready = vi.fn();
    const c = createImageCache(store(), () => new Promise<BitmapLike>((r) => (resolve = r)), ready);
    c.bitmap(ID);
    c.dispose();
    resolve(bmp);
    await flush();
    expect(bmp.close).toHaveBeenCalledTimes(1);
    expect(ready).not.toHaveBeenCalled();
  });
});

describe("bitmaps retouchés par élément (C5, I19, I22)", () => {
  const out = (tag: string) => ({ tag, close: vi.fn() }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };
  const el = (image: Partial<ImageData> = {}, id = "e"): ImageElement => ({ id, kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: ID, w: 4, h: 2, ...image } });
  function fakeRunner() {
    const calls: { slot: string; job: PixelJob; resolve: (b: ImageBitmap | null) => void; reject: (e: Error) => void }[] = [];
    const runner: PixelRunner = {
      run: vi.fn((slot: string, job: PixelJob) => new Promise<ImageBitmap | null>((resolve, reject) => calls.push({ slot, job, resolve, reject }))),
      dispose: vi.fn(),
    };
    return { runner, calls };
  }
  /** Cache dont le bitmap brut est déjà décodé. */
  async function ready(opts: Parameters<typeof createImageCache>[4] = {}) {
    const raw = { width: 2, height: 1, close: vi.fn() } as unknown as BitmapLike & { close: ReturnType<typeof vi.fn> };
    const { runner, calls } = fakeRunner();
    const redraw = vi.fn();
    const copy = vi.fn(async () => out("copie"));
    const c = createImageCache(store(), async () => raw, redraw, runner, { copy, ...opts });
    c.bitmap(ID);
    await flush();
    return { c, raw, runner, calls, redraw, copy };
  }

  it("une image sans retouche ne lance aucun Worker", async () => {
    const { c, raw, runner } = await ready();
    expect(c.bitmapOf(el())).toBe(raw);
    expect(c.bitmapOf(el({ crop: [0, 0, 2, 1], quarterTurns: 1 }))).toBe(raw);
    expect(runner.run).not.toHaveBeenCalled();
    expect(c.pixelState()).toBe("");
  });

  it("retouche de pixels : brut tant que le calcul manque, puis bitmap retouché ; attente → pret", async () => {
    const onState = vi.fn();
    const { c, raw, calls, redraw, copy } = await ready({ onState });
    const e = el({ brightness: 20 });
    expect(c.bitmapOf(e)).toBe(raw);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.slot).toBe("e");
    expect(calls[0]?.job).toMatchObject({ key: pixelKey(e.image), brightness: 20 });
    expect(c.pixelState()).toBe("attente");
    await calls[0]?.job.bitmap();
    expect(copy).toHaveBeenCalledWith(raw);
    const done = out("k1");
    calls[0]?.resolve(done);
    await flush();
    expect(c.bitmapOf(e)).toBe(done);
    expect(c.pixelState()).toBe("pret");
    expect(redraw).toHaveBeenCalled();
    expect(onState.mock.calls.map((x) => x[0])).toEqual(["attente", "pret"]);
  });

  it("nouvelle clé : le dernier bitmap reste dessiné (aucun clignotement)", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const first = out("k1");
    calls[0]?.resolve(first);
    await flush();
    expect(c.bitmapOf(el({ brightness: 30 }))).toBe(first);
    expect(calls).toHaveLength(2);
    expect(c.bitmapOf(el({ brightness: 30 }))).toBe(first);
    expect(calls).toHaveLength(2);
  });

  it("S5 : résultat périmé jeté et fermé (clé changée pendant le calcul)", async () => {
    const { c, raw, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    c.bitmapOf(el({ brightness: 30 }));
    const stale = out("k1");
    calls[0]?.resolve(stale);
    await flush();
    expect(stale.close).toHaveBeenCalledTimes(1);
    expect(c.bitmapOf(el({ brightness: 30 }))).toBe(raw);
    const fresh = out("k2");
    calls[1]?.resolve(fresh);
    await flush();
    expect(c.bitmapOf(el({ brightness: 30 }))).toBe(fresh);
    expect(fresh.close).not.toHaveBeenCalled();
  });

  it("Annuler pendant un calcul (retour à l'image sans retouche) : le résultat arrivé est fermé", async () => {
    const { c, raw, calls } = await ready();
    c.bitmapOf(el({ contrast: 10 }));
    expect(c.bitmapOf(el())).toBe(raw);
    const late = out("k");
    calls[0]?.resolve(late);
    await flush();
    expect(late.close).toHaveBeenCalledTimes(1);
    expect(c.bitmapOf(el())).toBe(raw);
  });

  it("aperçu : emplacement <id>#apercu ; Valider reprend le bitmap de l'aperçu sans recalcul", async () => {
    const { c, calls, runner } = await ready();
    c.bitmapOf(el({ contrast: 10 }), true);
    expect(calls[0]?.slot).toBe("e#apercu");
    const p = out("apercu");
    calls[0]?.resolve(p);
    await flush();
    expect(c.bitmapOf(el({ contrast: 10 }))).toBe(p);
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(p.close).not.toHaveBeenCalled();
  });

  it("m4 : Valider pendant le calcul de l'aperçu : pas de second calcul, le résultat passe à l'élément à son arrivée", async () => {
    const { c, calls, runner, redraw } = await ready();
    c.bitmapOf(el({ contrast: 10 }), true);
    c.bitmapOf(el({ contrast: 10 })); // Valider : la clé de l'aperçu est celle de l'élément
    c.bitmapOf(el({ contrast: 10 })); // redessiné avant l'arrivée : l'attente continue
    expect(runner.run).toHaveBeenCalledTimes(1);
    const p = out("apercu");
    calls[0]?.resolve(p);
    await flush();
    expect(c.bitmapOf(el({ contrast: 10 }))).toBe(p);
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(p.close).not.toHaveBeenCalled();
    expect(redraw).toHaveBeenCalled();
    expect(c.pixelState()).toBe("pret");
  });

  it("m4 : dropPreview (fermeture de la séance) jette l'emplacement <id>#apercu et ferme son bitmap", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ contrast: 10 }), true);
    const p = out("apercu");
    calls[0]?.resolve(p);
    await flush();
    c.dropPreview("e");
    expect(p.close).toHaveBeenCalledTimes(1);
    expect(c.pixelState()).toBe("");
  });

  it("m5 : échec puis retour à l'image sans retouche : plus d'échec affiché (I33)", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    calls[0]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(c.pixelState()).toBe("echec");
    c.bitmapOf(el({}));
    expect(c.pixelState()).toBe("");
  });

  it("aperçu sans bitmap : celui de l'élément reste dessiné ; aperçu fini : le sien est fermé", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const doc = out("doc");
    calls[0]?.resolve(doc);
    await flush();
    expect(c.bitmapOf(el({ brightness: 50 }), true)).toBe(doc);
    const p = out("apercu");
    calls[1]?.resolve(p);
    await flush();
    expect(c.bitmapOf(el({ brightness: 50 }), true)).toBe(p);
    expect(c.bitmapOf(el({ brightness: 20 }))).toBe(doc);
    expect(p.close).toHaveBeenCalledTimes(1);
  });

  it("S5 : échec du calcul : image brute, état echec, onFailure une seule fois, aucune relance de la même clé", async () => {
    const onFailure = vi.fn();
    const { c, raw, calls, runner } = await ready({ onFailure });
    c.bitmapOf(el({ brightness: 20 }));
    calls[0]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(c.bitmapOf(el({ brightness: 20 }))).toBe(raw);
    expect(c.pixelState()).toBe("echec");
    c.bitmapOf(el({ brightness: 40 }, "f"));
    calls[1]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith("module des pixels indisponible");
    expect(runner.run).toHaveBeenCalledTimes(2);
  });

  it("forget : emplacements des éléments retirés, bitmaps fermés", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const b = out("k");
    calls[0]?.resolve(b);
    await flush();
    c.forget(["e"]);
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(c.pixelState()).toBe("");
  });

  it("colorAt : couleur du pixel source mis à l'échelle de la copie ; null avant le dessin", async () => {
    const readPixel = vi.fn((_b: BitmapLike, _x: number, _y: number): readonly [number, number, number] | null => [255, 0, 16]);
    const { c } = await ready({ readPixel });
    expect(c.colorAt(ID, 3, 1)).toBeNull();
    c.bitmapOf(el());
    expect(c.colorAt(ID, 3, 1)).toBe("#ff0010");
    expect(readPixel).toHaveBeenCalledWith(expect.anything(), 1, 0);
  });

  it("dispose : bitmaps retouchés fermés ; résultat arrivé après : fermé", async () => {
    const { c, raw, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const b = out("k");
    calls[0]?.resolve(b);
    await flush();
    // Même asset, autre élément, autres réglages : jamais le bitmap retouché d'un voisin (clé par emplacement, pas par asset).
    expect(c.bitmapOf(el({ brightness: 30 }, "f"))).toBe(raw);
    c.dispose();
    expect(b.close).toHaveBeenCalledTimes(1);
    const late = out("tard");
    calls[1]?.resolve(late);
    await flush();
    expect(late.close).toHaveBeenCalledTimes(1);
  });

  /** Aperçu 40 calculé (p40), aperçu 50 en route, Valider 50 avant l'arrivée ; `doc20` : l'élément tenait déjà un bitmap. */
  async function validatedWhileComputing(doc20 = false) {
    const r = await ready();
    const { c, calls } = r;
    const doc = out("doc20");
    if (doc20) {
      c.bitmapOf(el({ brightness: 20 }));
      calls.at(-1)?.resolve(doc);
      await flush();
    }
    c.bitmapOf(el({ brightness: 40 }), true);
    const p40 = out("p40");
    calls.at(-1)?.resolve(p40);
    await flush();
    c.bitmapOf(el({ brightness: 50 }), true);
    const pending50 = calls.at(-1);
    const atValidate = c.bitmapOf(el({ brightness: 50 }));
    return { ...r, doc, p40, pending50, atValidate };
  }

  it("T21 (I22) : Valider pendant le calcul : l'élément garde le bitmap que montrait l'aperçu, pas le sien ni le brut", async () => {
    const { c, p40, atValidate, runner } = await validatedWhileComputing(true);
    expect(atValidate).toBe(p40);
    expect(c.bitmapOf(el({ brightness: 50 }))).toBe(p40);
    expect(runner.run).toHaveBeenCalledTimes(3);
  });

  it("T21 : Valider pendant le calcul : à l'arrivée, l'ancien bitmap de l'aperçu est fermé, pas le résultat passé à l'élément", async () => {
    const { c, calls, doc, p40, pending50 } = await validatedWhileComputing(true);
    const r50 = out("r50");
    pending50?.resolve(r50);
    await flush();
    expect(c.bitmapOf(el({ brightness: 50 }))).toBe(r50);
    expect(p40.close).toHaveBeenCalledTimes(1);
    expect(doc.close).toHaveBeenCalledTimes(1);
    expect(r50.close).not.toHaveBeenCalled();
    expect(calls).toHaveLength(3);
    expect(c.pixelState()).toBe("pret");
  });

  it("T21 MAJOR : Valider pendant le calcul, curseur touché avant l'arrivée, puis Fermer : la clé validée est recalculée pour l'élément", async () => {
    const { c, calls, pending50 } = await validatedWhileComputing();
    c.bitmapOf(el({ brightness: 60 }), true); // curseur touché avant l'arrivée de 50
    const pending60 = calls.at(-1);
    pending50?.resolve(out("r50"));
    await flush();
    c.dropPreview("e"); // Fermer
    const r60 = out("r60");
    pending60?.resolve(r60);
    await flush();
    expect(r60.close).toHaveBeenCalledTimes(1);
    c.bitmapOf(el({ brightness: 50 }));
    const forElement = calls.filter((x) => x.slot === "e");
    expect(forElement.map((x) => x.job.brightness)).toEqual([50]);
    const v50 = out("v50");
    forElement[0]?.resolve(v50);
    await flush();
    expect(c.bitmapOf(el({ brightness: 50 }))).toBe(v50);
    expect(c.pixelState()).toBe("pret");
  });

  it("T21 MAJOR : même scénario, résultats arrivés puis Annuler : l'aperçu 60 est servi sans recalcul, l'élément recalcule 50", async () => {
    const { c, calls, pending50 } = await validatedWhileComputing();
    c.bitmapOf(el({ brightness: 60 }), true);
    const pending60 = calls.at(-1);
    pending50?.resolve(out("r50"));
    await flush();
    const r60 = out("r60");
    pending60?.resolve(r60);
    await flush();
    expect(c.bitmapOf(el({ brightness: 60 }), true)).toBe(r60);
    expect(calls).toHaveLength(3);
    c.bitmapOf(el({ brightness: 50 })); // Annuler : l'élément validé à 50 est dessiné sans aperçu
    expect(calls.slice(3).map((x) => [x.slot, x.job.brightness])).toEqual([["e", 50]]);
    const v50 = out("v50");
    calls[3]?.resolve(v50);
    await flush();
    expect(c.bitmapOf(el({ brightness: 50 }))).toBe(v50);
    expect(c.pixelState()).toBe("pret");
  });

  it("T21 (I33) : data-pixels ne compte que les images dessinées par la dernière scène ; au retour, ni bitmap fermé ni recalcul", async () => {
    const { c, calls } = await ready();
    c.beginScene();
    c.bitmapOf(el({ brightness: 20 }));
    c.endScene();
    const b = out("k");
    calls[0]?.resolve(b);
    await flush();
    expect(c.pixelState()).toBe("pret");
    c.beginScene(); // page sans image retouchée
    c.bitmapOf(el({}, "f"));
    c.endScene();
    expect(c.pixelState()).toBe("");
    c.beginScene(); // page vide
    c.endScene();
    expect(c.pixelState()).toBe("");
    c.beginScene(); // retour à la page de l'image retouchée
    expect(c.bitmapOf(el({ brightness: 20 }))).toBe(b);
    c.endScene();
    expect(c.pixelState()).toBe("pret");
    expect(b.close).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it("T21 (I33) : un échec ne s'affiche pas sur une page sans image retouchée, et revient avec l'image", async () => {
    const { c, calls } = await ready();
    c.beginScene();
    c.bitmapOf(el({ brightness: 20 }));
    c.endScene();
    calls[0]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(c.pixelState()).toBe("echec");
    c.beginScene();
    c.endScene();
    expect(c.pixelState()).toBe("");
    c.beginScene();
    c.bitmapOf(el({ brightness: 20 }));
    c.endScene();
    expect(c.pixelState()).toBe("echec");
  });
});
