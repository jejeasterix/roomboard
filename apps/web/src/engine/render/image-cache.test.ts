import { describe, expect, it, vi } from "vitest";
import { createImageCache, DECODED_BUDGET_PX, type BitmapLike, type ImageCache } from "./image-cache";
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

  it("C5 (I33) : l'échec d'une image n'est pas affiché sur une page dont l'image retouchée est saine", async () => {
    const { c, calls } = await ready();
    c.beginScene(); // page 2 : image f retouchée, calcul réussi
    c.bitmapOf(el({ brightness: 40 }, "f"));
    c.endScene();
    calls[0]?.resolve(out("f"));
    await flush();
    expect(c.pixelState()).toBe("pret");
    c.beginScene(); // page 1 : image e, calcul en échec
    c.bitmapOf(el({ brightness: 20 }));
    c.endScene();
    calls[1]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(c.pixelState()).toBe("echec");
    c.beginScene(); // retour à la page 2, aucun nouveau calcul
    c.bitmapOf(el({ brightness: 40 }, "f"));
    c.endScene();
    expect(c.pixelState()).toBe("pret");
    c.beginScene(); // retour à la page 1 : l'image brute de e est toujours un échec
    c.bitmapOf(el({ brightness: 20 }));
    c.endScene();
    expect(c.pixelState()).toBe("echec");
    expect(calls).toHaveLength(2);
  });

  it("C5 (I33) : Valider après l'échec de l'aperçu : l'élément, brut, reste en échec", async () => {
    const { c, raw, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }), true);
    calls[0]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(c.pixelState()).toBe("echec");
    c.dropPreview("e");
    expect(c.bitmapOf(el({ brightness: 20 }))).toBe(raw);
    expect(c.pixelState()).toBe("echec");
    expect(calls).toHaveLength(1);
  });

  it("C5 (I33) : échec puis aperçu réussi puis Valider : l'élément dessine l'aperçu, data-pixels pret", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    calls[0]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(c.pixelState()).toBe("echec");
    c.bitmapOf(el({ brightness: 40 }), true);
    const p = out("apercu");
    calls[1]?.resolve(p);
    await flush();
    expect(c.bitmapOf(el({ brightness: 40 }))).toBe(p);
    expect(c.pixelState()).toBe("pret");
  });

  it("C5 (I33) : K1 réussi, K2 en échec, retour à K1 : bitmap de K1 servi, data-pixels pret", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const k1 = out("k1");
    calls[0]?.resolve(k1);
    await flush();
    c.bitmapOf(el({ brightness: 40 }));
    calls[1]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(c.pixelState()).toBe("echec");
    expect(c.bitmapOf(el({ brightness: 20 }))).toBe(k1);
    expect(c.pixelState()).toBe("pret");
  });

  it("C6b B16 : annuler un remplissage d'image retouchée : bitmap retouché aussitôt, aucun calcul", async () => {
    const { c, calls, runner } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const k1 = out("k1");
    calls[0]?.resolve(k1);
    await flush();
    const filled = { width: 4, height: 2, close: vi.fn() } as unknown as BitmapLike;
    c.adopt("cd".repeat(32), filled);
    expect(c.bitmapOf(el({ asset: "cd".repeat(32) }))).toBe(filled);
    expect(k1.close).not.toHaveBeenCalled();
    expect(c.pixelState()).toBe("");
    expect(c.bitmapOf(el({ brightness: 20 }))).toBe(k1);
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(c.pixelState()).toBe("pret");
  });

  it("C6b B16 : emplacement gardé puis autre retouche : l'ancien bitmap est fermé, l'image brute est dessinée pendant le calcul", async () => {
    const { c, calls, raw } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const k1 = out("k1");
    calls[0]?.resolve(k1);
    await flush();
    c.bitmapOf(el());
    expect(c.bitmapOf(el({ contrast: 30 }))).toBe(raw);
    expect(k1.close).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it("C6b B16 : l'aperçu ne retombe jamais sur un emplacement gardé d'une autre clé", async () => {
    const { c, calls, raw } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    calls[0]?.resolve(out("k1"));
    await flush();
    c.bitmapOf(el());
    expect(c.bitmapOf(el({ contrast: 30 }), true)).toBe(raw);
  });

  it("C6b B16 : forget ferme l'emplacement gardé", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const k1 = out("k1");
    calls[0]?.resolve(k1);
    await flush();
    c.bitmapOf(el());
    c.forget(["e"]);
    expect(k1.close).toHaveBeenCalledTimes(1);
  });
});

describe("C6b : adoption, copie, budget (B14, B15)", () => {
  const sized = (w: number, h: number, tag = "") => ({ tag, width: w, height: h, close: vi.fn() }) as unknown as BitmapLike & { close: ReturnType<typeof vi.fn> };
  const hash = (c: string): string => c.repeat(64);
  const img = (asset: string, id = "e"): ImageElement => ({ id, kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset, w: 3000, h: 2000 } });
  const scene = (c: ImageCache, ...els: ImageElement[]): void => {
    c.beginScene();
    for (const e of els) c.bitmapOf(e);
    c.endScene();
  };

  it("adopt : servi sans décodage, ready appelé ; déjà présent ou cache fermé : le bitmap reçu est fermé", () => {
    const decode = vi.fn(async () => sized(1, 1));
    const ready = vi.fn();
    const c = createImageCache(store({}), decode, ready);
    const a = sized(10, 10);
    c.adopt(hash("1"), a);
    expect(c.bitmap(hash("1"))).toBe(a);
    expect([decode.mock.calls.length, ready.mock.calls.length]).toEqual([0, 1]);
    const twice = sized(10, 10);
    c.adopt(hash("1"), twice);
    expect(twice.close).toHaveBeenCalledTimes(1);
    c.dispose();
    const late = sized(1, 1);
    c.adopt(hash("2"), late);
    expect(late.close).toHaveBeenCalledTimes(1);
  });

  it("adopt pendant un décodage : le décodé arrivé ensuite est fermé, l'adopté reste", async () => {
    let resolve!: (b: BitmapLike) => void;
    const c = createImageCache(store(), () => new Promise<BitmapLike>((r) => (resolve = r)), vi.fn());
    expect(c.bitmap(ID)).toBeNull();
    const adopted = sized(4, 2);
    c.adopt(ID, adopted);
    const decoded = sized(4, 2);
    resolve(decoded);
    await flush();
    expect(c.bitmap(ID)).toBe(adopted);
    expect(decoded.close).toHaveBeenCalledTimes(1);
  });

  it("copyOf : copie du bitmap décodé ; null avant le décodage", async () => {
    const copy = vi.fn(async (b: BitmapLike) => ({ copied: b }) as unknown as ImageBitmap);
    const decoded = sized(4, 2);
    const c = createImageCache(store(), async () => decoded, vi.fn(), undefined, { copy });
    expect(c.copyOf(ID)).toBeNull();
    c.bitmap(ID);
    await flush();
    await expect(c.copyOf(ID)).resolves.toEqual({ copied: decoded });
  });

  it("S5 g : dix remplissages d'une image de 3000 × 2000 restent sous le budget ; le bitmap de la scène n'est jamais fermé", () => {
    const c = createImageCache(store({}), async () => sized(1, 1), vi.fn());
    const bitmaps = Array.from({ length: 10 }, (_, k) => sized(3000, 2000, String(k)));
    bitmaps.forEach((b, k) => {
      c.adopt(hash(String(k)), b);
      scene(c, img(hash(String(k))));
    });
    const open = bitmaps.filter((b) => b.close.mock.calls.length === 0);
    expect(open.length * 6_000_000).toBeLessThanOrEqual(DECODED_BUDGET_PX);
    expect(bitmaps[9]?.close).not.toHaveBeenCalled();
    expect(bitmaps[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("un bitmap de la scène n'est jamais fermé, même au-delà du budget ; hors scène, le moins récemment dessiné part", () => {
    const c = createImageCache(store({}), async () => sized(1, 1), vi.fn(), undefined, { budgetPx: 10 });
    const a = sized(100, 100);
    const b = sized(100, 100);
    c.adopt(hash("a"), a);
    c.adopt(hash("b"), b);
    scene(c, img(hash("a")), img(hash("b"), "f"));
    expect([a.close.mock.calls.length, b.close.mock.calls.length]).toEqual([0, 0]);
    scene(c, img(hash("b"), "f"));
    expect([a.close.mock.calls.length, b.close.mock.calls.length]).toEqual([1, 0]);
  });

  it("budget : le brut d'une image dont un calcul C5 attend le lanceur n'est pas fermé ; calcul fini, il redevient évinçable", async () => {
    const [X, Y] = [hash("1"), hash("2")];
    const blobs = { [X]: new Blob([new Uint8Array([1])]), [Y]: new Blob([new Uint8Array([2])]) };
    const raws = { [X]: sized(100, 100, "x"), [Y]: sized(100, 100, "y") };
    const decode = async (b: Blob): Promise<BitmapLike> => (b === blobs[X] ? raws[X]! : raws[Y]!);
    const calls: { job: PixelJob; resolve: (b: ImageBitmap | null) => void }[] = [];
    const runner: PixelRunner = { run: (_slot, job) => new Promise((resolve) => void calls.push({ job, resolve })), dispose: () => undefined };
    // Comme createImageBitmap : refus sur un bitmap fermé (InvalidStateError).
    const copy = async (b: BitmapLike): Promise<ImageBitmap> => {
      if ((b as unknown as { close: ReturnType<typeof vi.fn> }).close.mock.calls.length > 0) throw new Error("InvalidStateError");
      return sized(100, 100, "copie") as unknown as ImageBitmap;
    };
    const onFailure = vi.fn();
    const c = createImageCache(store(blobs), decode, vi.fn(), runner, { copy, budgetPx: 15_000, onFailure });
    const ex: ImageElement = { id: "x", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: X, w: 100, h: 100, brightness: 20 } };
    const ey = img(Y, "y");
    scene(c, ex, ey);
    await flush();
    scene(c, ex, ey); // brut prêt : calcul de x demandé, pas encore parti (le lanceur est occupé)
    expect(calls).toHaveLength(1);
    scene(c, ey); // x hors de la scène ; 2 × 10 000 px > 15 000
    expect(raws[X]!.close).not.toHaveBeenCalled();
    await expect(calls[0]!.job.bitmap()).resolves.toMatchObject({ tag: "copie" });
    calls[0]!.resolve(sized(100, 100, "retouche") as unknown as ImageBitmap);
    await flush();
    expect(onFailure).not.toHaveBeenCalled();
    scene(c, ey); // calcul fini : le brut de x, hors de la scène, part au budget
    expect(raws[X]!.close).toHaveBeenCalledTimes(1);
  });

  it("fermé par le budget puis redessiné : redécodé depuis le magasin", async () => {
    const decode = vi.fn(async () => sized(100, 100, "re"));
    const c = createImageCache(store({ [hash("a")]: new Blob([new Uint8Array([1])]) }), decode, vi.fn(), undefined, { budgetPx: 10 });
    c.adopt(hash("a"), sized(100, 100));
    c.adopt(hash("b"), sized(100, 100));
    scene(c, img(hash("b")));
    expect(c.bitmap(hash("a"))).toBeNull();
    await flush();
    expect(c.bitmap(hash("a"))).toMatchObject({ tag: "re" });
  });
});
