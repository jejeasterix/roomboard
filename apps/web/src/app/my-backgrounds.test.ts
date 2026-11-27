import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import type { GridInput } from "../core/api";
import type { BackgroundSource } from "../backgrounds/source";
import { createIdbLibraryFiles, createMemoryLibraryFiles } from "../platform/library-files";
import { TOO_MANY_PIXELS } from "../platform/image-import";
import { fileNameOf, ROOT_LABELS } from "./library";
import { createMyBackgrounds, NOT_AN_IMAGE_MESSAGE, probeImage, stampOf, type ProbedImage } from "./my-backgrounds";

const DOTS: GridInput = { visible: true, snap: false, above: false, levels: [{ kind: "dots", spacingX: 37.8, spacingY: 37.8, originX: 0, originY: 0, color: "#94a3b8", line: "solid", lineWidth: 1, snap: true, visible: true }] };
const pngHead = (w: number, h: number): Uint8Array => {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};
function setup(probe: (b: Blob, n: string) => Promise<ProbedImage | null> = async () => ({ mime: "image/png", w: 64, h: 36 })) {
  const files = createMemoryLibraryFiles("backgrounds");
  let t = 0;
  const thumbnail = vi.fn(async (_src: BackgroundSource) => new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
  const mine = createMyBackgrounds(files, { now: () => `2026-11-27T10:00:0${t++}.000Z`, probe, thumbnail });
  return { files, mine, thumbnail };
}
const paths = async (files: ReturnType<typeof createMemoryLibraryFiles>) => (await files.list()).filter((p) => !p.dir).map((p) => p.path).sort();

/** Clés brutes du magasin `entrees` d'une base de bibliothèque, et sa version (chemin de référence `library-files.ts:120-129`). */
async function rawEntries(name: string): Promise<{ readonly version: number; readonly keys: readonly string[] }> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(name);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  try {
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const r = db.transaction(["entrees"], "readonly").objectStore("entrees").getAllKeys();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return { version: db.version, keys: keys.map(String).sort() };
  } finally {
    db.close();
  }
}

describe("personnalisation-1b : Mes fonds (Q18, Q19, Q22, DA4)", () => {
  it("racine backgrounds : libellé « Mes fonds »", () => {
    expect(ROOT_LABELS.backgrounds).toBe("Mes fonds");
  });

  it("addImage : compagnon, octets gardés tels quels, miniature ; list le relit", async () => {
    const { files, mine, thumbnail } = setup();
    const bytes = new Uint8Array([9, 8, 7, 6]);
    const e = await mine.addImage(new Blob([bytes]), "Ma photo");
    expect(e).toMatchObject({ file: "ma-photo.json", name: "Ma photo", origin: "image", color: "#ffffff", grid: null, image: { file: "ma-photo.png", mime: "image/png", w: 64, h: 36 } });
    // Pas un paquet `.rbitem` de C4 (`ResourceLibrary`) : compagnon `<nom>.json`, image `<nom>.<ext>`, miniature `<nom>.thumb.png`.
    expect(await paths(files)).toEqual(["ma-photo.json", "ma-photo.png", "ma-photo.thumb.png"]);
    expect(new Uint8Array(await (await files.read("ma-photo.png")).arrayBuffer())).toEqual(bytes);
    expect(JSON.parse(await (await files.read("ma-photo.json")).text())).toMatchObject({ format: "roomboard-background", schema: 1, name: "Ma photo", origin: "image" });
    expect(thumbnail).toHaveBeenCalledTimes(1);
    expect(await mine.list()).toEqual([e]);
  });

  it("addSource « page » puis « grille » : la plus récente d'abord ; grille sans image", async () => {
    const { mine } = setup();
    const page = await mine.addSource({ color: "#ffffff", grid: null, image: { blob: new Blob([new Uint8Array([1])]), name: "p.png", mime: "image/png", w: 3840, h: 2160 } }, "Page 1 — 27/11 10:00", "page");
    const grid = await mine.addSource({ color: "#fbf7ec", grid: DOTS, image: null }, "Grille Points — 27/11 10:01", "grid");
    expect((await mine.list()).map((e) => e.file)).toEqual([grid.file, page.file]);
    expect(grid).toMatchObject({ origin: "grid", grid: DOTS, image: null, color: "#fbf7ec" });
    expect(page.file).toBe("page-1-27-11-10-00.json");
  });

  it("même nom : suffixes -2, -3", async () => {
    const { mine } = setup();
    const a = await mine.addSource({ color: "#ffffff", grid: DOTS, image: null }, "Grille", "grid");
    const b = await mine.addSource({ color: "#ffffff", grid: DOTS, image: null }, "Grille", "grid");
    const c = await mine.addSource({ color: "#ffffff", grid: DOTS, image: null }, "Grille", "grid");
    expect([a.file, b.file, c.file]).toEqual(["grille.json", "grille-2.json", "grille-3.json"]);
  });

  it("nom de fichier : fileNameOf seul, aucun troisième slug (accents, vide, plus de 80 caractères, symboles)", async () => {
    const { mine } = setup();
    const names = ["Été à l'école", "", `${"x".repeat(120)} fin`, "Fond 🌅 n°2 — 27/11"];
    const files: string[] = [];
    for (const n of names) files.push((await mine.addSource({ color: "#ffffff", grid: DOTS, image: null }, n, "grid")).file);
    expect(files).toEqual(names.map((n) => `${fileNameOf(n)}.json`));
    expect(files[1]).toBe("ressource.json");
  });

  it("Review Focus — compagnon illisible ou d'un autre format : ignoré, les autres listés", async () => {
    const { files, mine } = setup();
    const ok = await mine.addSource({ color: "#ffffff", grid: DOTS, image: null }, "Bon", "grid");
    await files.write("casse.json", new Blob(["{ pas du json"]));
    await files.write("autre.json", new Blob([JSON.stringify({ format: "roomboard-item", schema: 1, name: "x" })]));
    await files.write("sans-image.json", new Blob([JSON.stringify({ format: "roomboard-background", schema: 1, name: "x", created: "2026", origin: "image", color: "#fff" })]));
    expect((await mine.list()).map((e) => e.file)).toEqual([ok.file]);
  });

  it("Review Focus — image de plus de 100 Mpx : refusée, rien n'est écrit", async () => {
    const { files, mine } = setup(async () => ({ mime: "image/png", w: 20000, h: 6000 }));
    await expect(mine.addImage(new Blob([new Uint8Array([1])]), "géante")).rejects.toThrow(TOO_MANY_PIXELS);
    expect(await paths(files)).toEqual([]);
  });

  it("fichier qui n'est pas une image : NOT_AN_IMAGE_MESSAGE, rien n'est écrit", async () => {
    const { files, mine } = setup(async () => null);
    await expect(mine.addImage(new Blob(["texte"]), "notes")).rejects.toThrow(NOT_AN_IMAGE_MESSAGE);
    expect(NOT_AN_IMAGE_MESSAGE).toBe("seules les images deviennent des fonds");
    expect(await paths(files)).toEqual([]);
  });

  it("read rend la source ; thumbnail la miniature ; remove retire compagnon, image et miniature", async () => {
    const { files, mine } = setup();
    const e = await mine.addImage(new Blob([new Uint8Array([4, 5])]), "Fond");
    const src = await mine.read(e);
    expect(src).toMatchObject({ color: "#ffffff", grid: null, image: { mime: "image/png", w: 64, h: 36, name: "fond.png" } });
    expect(new Uint8Array(await src.image!.blob.arrayBuffer())).toEqual(new Uint8Array([4, 5]));
    expect((await mine.thumbnail(e))?.size).toBe(3);
    const changed = vi.fn();
    mine.onChange(changed);
    await mine.remove(e);
    expect(await paths(files)).toEqual([]);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(await mine.thumbnail(e)).toBeNull();
  });

  it("T13 : image.file hors de la base du compagnon (vide, copie, autre entrée, compagnon, miniature) : entrée rejetée", async () => {
    const { files, mine } = setup();
    const doc = (file: string): Blob => new Blob([JSON.stringify({ format: "roomboard-background", schema: 1, name: file, created: "2026-11-27T09:00:00.000Z", origin: "image", color: "#ffffff", grid: null, image: { file, mime: "image/png", w: 1, h: 1 } })]);
    await files.write("vide.json", doc(""));
    await files.write("plage - Copie.json", doc("plage.jpg"));
    await files.write("a.json", doc("autre.json"));
    await files.write("b.json", doc("b.thumb.png"));
    await files.write("c.json", doc("c.json"));
    await files.write("d.json", doc("d.dossier/x.png"));
    await files.write("bon.json", doc("bon.png"));
    expect((await mine.list()).map((e) => e.file)).toEqual(["bon.json"]);
  });

  it("T13 : remove ne passe jamais un chemin vide à files.remove (la racine reste intacte)", async () => {
    const { files, mine } = setup();
    await files.write("autre.png", new Blob([new Uint8Array([1])]));
    await mine.remove({ file: "x.json", name: "x", created: "", origin: "image", color: "#ffffff", grid: null, image: { file: "", mime: "image/png", w: 1, h: 1 } });
    expect(await paths(files)).toEqual(["autre.png"]);
  });

  it("T13 : le compagnon s'écrit en dernier ; miniature ou compagnon en échec : l'image écrite est retirée", async () => {
    const a = setup();
    a.thumbnail.mockRejectedValueOnce(new Error("miniature"));
    await expect(a.mine.addImage(new Blob([new Uint8Array([4, 5])]), "Fond")).rejects.toThrow("miniature");
    expect(await paths(a.files)).toEqual([]);
    const b = setup();
    const write = b.files.write.bind(b.files);
    const order: string[] = [];
    b.files.write = async (p, blob) => {
      order.push(p);
      if (p.endsWith(".json")) throw new Error("compagnon");
      return write(p, blob);
    };
    await expect(b.mine.addImage(new Blob([new Uint8Array([4, 5])]), "Fond")).rejects.toThrow("compagnon");
    expect(order).toEqual(["fond.png", "fond.thumb.png", "fond.json"]);
    expect(await paths(b.files)).toEqual([]);
  });

  it("clés inconnues du compagnon : gardées (aucune réécriture à la lecture)", async () => {
    const { files, mine } = setup();
    const text = JSON.stringify({ format: "roomboard-background", schema: 1, name: "Futur", created: "2026-11-27T09:00:00.000Z", origin: "grid", color: "#ffffff", grid: DOTS, image: null, motsCles: ["plus tard"] });
    await files.write("futur.json", new Blob([text]));
    expect((await mine.list())[0]?.name).toBe("Futur");
    expect(await (await files.read("futur.json")).text()).toBe(text);
  });

  it("probeImage : PNG lu dans l'en-tête ; texte : null", async () => {
    expect(await probeImage(new Blob([pngHead(640, 360) as BlobPart]), "a.png")).toEqual({ mime: "image/png", w: 640, h: 360 });
    expect(await probeImage(new Blob(["bonjour"]), "a.txt")).toBeNull();
  });

  it("stampOf : JJ/MM HH:MM", () => {
    expect(stampOf(new Date(2026, 10, 27, 9, 5))).toBe("27/11 09:05");
  });

  it("IndexedDB : même base, clés backgrounds/<chemin>, invisibles depuis « Mes ressources »", async () => {
    const name = `essai-fonds-${Math.random()}`;
    const fonds = createIdbLibraryFiles(indexedDB, "backgrounds", name, async () => true);
    const ressources = createIdbLibraryFiles(indexedDB, "mine", name, async () => true);
    await createMyBackgrounds(fonds, { now: () => "2026-11-27T10:00:00.000Z", probe: async () => null, thumbnail: async () => null }).addSource({ color: "#ffffff", grid: DOTS, image: null }, "Grille", "grid");
    expect((await fonds.list()).map((p) => p.path)).toEqual(["grille.json"]);
    expect(await ressources.list()).toEqual([]);
  });

  it("IndexedDB : une racine = un préfixe de clé dans la base v2, ni base neuve ni migration", async () => {
    const name = `essai-fonds-brut-${Math.random()}`;
    const ressources = createIdbLibraryFiles(indexedDB, "mine", name, async () => true);
    await ressources.write("note.rbitem", new Blob([new Uint8Array([1])]));
    const fonds = createIdbLibraryFiles(indexedDB, "backgrounds", name, async () => true);
    await createMyBackgrounds(fonds, { now: () => "2026-11-27T10:00:00.000Z", probe: async () => ({ mime: "image/jpeg", w: 8, h: 8 }), thumbnail: async () => new Blob([new Uint8Array([7])]) }).addImage(new Blob([new Uint8Array([0xff, 0xd8])]), "Photo");
    expect(await rawEntries(name)).toEqual({
      version: 2,
      keys: ["backgrounds/photo.jpg", "backgrounds/photo.json", "backgrounds/photo.thumb.png", "mine/note.rbitem"],
    });
    expect((await ressources.list()).map((p) => p.path)).toEqual(["note.rbitem"]);
  });
});
