// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Command, CoreDocument } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { OUTSIDE_FRAME_MESSAGE } from "../app/backgrounds-apply";
import { createMyBackgrounds, probeImage } from "../app/my-backgrounds";
import type { ExportCanvas } from "../app/pdf-overlay";
import type { ThumbDeps } from "../app/thumbnail";
import type { PackBackground } from "../backgrounds/catalog";
import type { DroppedFile } from "../platform/files";
import { createMemoryLibraryFiles } from "../platform/library-files";
import { BACKGROUNDS_BUTTON, BackgroundsWindow, type BackgroundsHost, type BackgroundsUi } from "./BackgroundsWindow";

afterEach(cleanup);

/** Attend qu'un élément existe (un `waitFor` qui rend null aurait déjà réussi). */
const found = (selector: string): Promise<HTMLElement> =>
  vi.waitFor(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el === null) throw new Error(`absent : ${selector}`);
    return el;
  });

const pb = (id: string, label: string, color: string): PackBackground => ({ id, section: "colors", theme: "claires", label, keywords: [label.toLowerCase()], kind: "color", color, grid: null, photo: null });
const PACK = [pb("blanc", "Blanc (aucun fond)", "#ffffff"), pb("ardoise", "Ardoise", "#2f3e46")];
const png = (w: number, h: number): Uint8Array => {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};
const dropped = (name: string, bytes: Uint8Array): DroppedFile => ({ name, size: bytes.length, mime: "", head: async (n) => bytes.slice(0, n), blob: async () => new Blob([bytes as BlobPart]) });
const thumbs: ThumbDeps = {
  canvas: (): ExportCanvas => ({ ctx: { fillStyle: "", fillRect: () => undefined, drawImage: () => undefined } as unknown as CanvasRenderingContext2D, png: async () => png(4, 4), release: () => undefined }),
  painter: () => ({ paintContent: () => undefined }),
  decode: async () => ({ width: 1, height: 1, close() {} }) as never,
};

function setup(doc: CoreDocument = fakeCore.blank(), over: { loadPack?: BackgroundsUi["loadPack"]; thumbs?: ThumbDeps } = {}) {
  const files = createMemoryLibraryFiles("backgrounds");
  const mine = createMyBackgrounds(files, { now: () => "2026-11-27T10:00:00.000Z", probe: probeImage, thumbnail: async () => null });
  const ui: BackgroundsUi = { mine, thumbs: over.thumbs ?? thumbs, core: fakeCore, makeAssets: () => createAssetStore(), files: { read: async (f) => { throw new Error(`fond introuvable : ${f}`); } }, now: () => new Date(2026, 10, 27, 10, 0), loadPack: over.loadPack ?? (async () => PACK) };
  const engine = {
    run: (c: Command) => {
      try {
        return doc.apply(c);
      } catch {
        return null;
      }
    },
    state: () => ({ page: doc.pageIds()[0]!, error: null }),
  };
  const diverters: (((f: readonly DroppedFile[]) => Promise<void>) | null)[] = [];
  const host: BackgroundsHost = {
    active: () => ({ board: { doc, engine } as never, assets: createAssetStore() }),
    setDropDiverter: (h) => void diverters.push(h),
    pickFiles: vi.fn(async () => [dropped("photo.png", png(64, 36))]),
    say: vi.fn(async () => undefined),
    ask: vi.fn(async () => true),
  };
  const close = vi.fn();
  const r = render(() => <BackgroundsWindow ui={ui} host={host} close={close} />);
  return { ...r, doc, mine, host, close, diverters, ui };
}

describe("personnalisation-1b : enveloppe de la fenêtre des fonds (Q22, Q26, Q35, Q36)", () => {
  it("monte la fenêtre, pose la dérivation des dépôts puis la retire au démontage ; focus rendu au bouton Fonds", async () => {
    const button = document.createElement("button");
    button.dataset["item"] = "backgrounds";
    document.body.append(button);
    const { diverters, unmount } = setup();
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"][data-panel="backgrounds"]')).not.toBeNull());
    expect(typeof diverters[0]).toBe("function");
    unmount();
    expect(diverters.at(-1)).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector(BACKGROUNDS_BUTTON)));
    button.remove();
  });

  it("toucher une carte : une commande, la page change, fenêtre fermée, aucun avis pour une page", async () => {
    const { doc, close, host } = setup();
    const card = await found('button[data-fond="ardoise"]');
    fireEvent.click(card);
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(doc.page(doc.pageIds()[0]!)?.background).toBe("#2f3e46");
    expect(host.say).not.toHaveBeenCalled();
  });

  it("toutes les pages : avis « Fond appliqué à 3 pages » ; pages PDF : avis qu'elles gardent leur page", async () => {
    const three = fakeCore.blank();
    three.apply({ type: "AddPage", after: three.pageIds()[0]! });
    three.apply({ type: "AddPage", after: three.pageIds()[0]! });
    const a = setup(three);
    fireEvent.click(await found('button[data-fonds="all"]'));
    fireEvent.click(document.querySelector<HTMLElement>('button[data-fond="ardoise"]')!);
    await vi.waitFor(() => expect(a.host.say).toHaveBeenCalledWith("Fond appliqué à 3 pages", "info"));
    cleanup();
    const pdf = fakeCore.fromPdfPages({ id: "cd".repeat(32), name: "c.pdf", mime: "application/pdf", size: 1 }, [{ w: 612, h: 792 }, { w: 612, h: 792 }]);
    const b = setup(pdf);
    fireEvent.click(await found('button[data-fonds="all"]'));
    fireEvent.click(document.querySelector<HTMLElement>('button[data-fond="ardoise"]')!);
    await vi.waitFor(() => expect(b.host.say).toHaveBeenCalledWith("2 pages PDF gardent leur page : couleur et grille seulement", "info"));
    expect(pdf.page(pdf.pageIds()[0]!)?.backdrop?.kind).toBe("pdf-page");
  });

  it("dépôt d'un PNG : une carte « Mes fonds », la page ne change pas ; dépôt d'un texte : avis", async () => {
    const { diverters, doc, mine } = setup();
    await vi.waitFor(() => expect(typeof diverters[0]).toBe("function"));
    await diverters[0]!([dropped("tableau.png", png(64, 36))]);
    expect((await mine.list()).map((e) => e.name)).toEqual(["tableau"]);
    expect(doc.elementIds(doc.pageIds()[0]!)).toEqual([]);
    expect(doc.page(doc.pageIds()[0]!)?.backdrop ?? null).toBeNull();
    await diverters[0]!([dropped("notes.txt", new TextEncoder().encode("bonjour"))]);
    await vi.waitFor(() => expect(document.querySelector('[data-fonds="notice"]')?.textContent).toBe("seules les images deviennent des fonds"));
  });

  it("« Cette page » : entrée « Page 1 — 27/11 10:00 » ; objet hors du cadre : avis ; « Importer une image… » : boîte puis entrée", async () => {
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0]!;
    doc.apply({ type: "CommitStroke", page: p, points: new Float32Array([100, 1000, 0.5, 300, 1400, 0.5]), style: { color: "#000000", width: 4 } });
    const { mine, host } = setup(doc);
    fireEvent.click(await found('[data-edit="fonds-section"] [data-choice="mine"]'));
    fireEvent.click(document.querySelector<HTMLElement>('button[data-fonds="page"]')!);
    await vi.waitFor(async () => expect((await mine.list()).map((e) => e.name)).toEqual(["Page 1 — 27/11 10:00"]));
    await vi.waitFor(() => expect(document.querySelector('[data-fonds="notice"]')?.textContent).toBe(OUTSIDE_FRAME_MESSAGE));
    expect((await mine.list())[0]).toMatchObject({ origin: "page", image: { mime: "image/png", w: 3840, h: 2160 } });
    fireEvent.click(document.querySelector<HTMLElement>('button[data-fonds="import"]')!);
    await vi.waitFor(async () => expect((await mine.list()).length).toBe(2));
    expect(host.pickFiles).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(document.querySelectorAll('button[data-fond^="mine:"]').length).toBe(2));
  });

  it("retirer : question posée, entrée retirée si oui", async () => {
    const { mine, host } = setup();
    await mine.addSource({ color: "#ffffff", grid: null, image: null }, "Blanc", "grid");
    fireEvent.click(await found('[data-edit="fonds-section"] [data-choice="mine"]'));
    fireEvent.click(await found('button[data-fonds-remove="blanc.json"]'));
    await vi.waitFor(async () => expect(await mine.list()).toEqual([]));
    expect(host.ask).toHaveBeenCalledWith("Retirer « Blanc » de Mes fonds ?");
  });

  it("T13 : un échec n'est pas effacé par un succès qui suit ; une seule relecture après un import", async () => {
    const { diverters, mine } = setup();
    await vi.waitFor(() => expect(typeof diverters[0]).toBe("function"));
    const list = vi.spyOn(mine, "list");
    await diverters[0]!([dropped("notes.txt", new TextEncoder().encode("bonjour")), dropped("tableau.png", png(64, 36))]);
    expect((await mine.list()).map((e) => e.name)).toEqual(["tableau"]);
    expect(document.querySelector('[data-fonds="notice"]')?.textContent).toBe("seules les images deviennent des fonds");
    expect(list).toHaveBeenCalledTimes(2); // une relecture de l'import + celle de ce test
  });

  it("T13 : une tête illisible donne un avis, les autres fichiers passent", async () => {
    const { diverters, mine } = setup();
    await vi.waitFor(() => expect(typeof diverters[0]).toBe("function"));
    const bad: DroppedFile = { ...dropped("cassé.png", png(1, 1)), head: async () => { throw new Error("lecture impossible"); } };
    await diverters[0]!([bad, dropped("ok.png", png(64, 36))]);
    expect((await mine.list()).map((e) => e.name)).toEqual(["ok"]);
    expect(document.querySelector('[data-fonds="notice"]')?.textContent).toBe("lecture impossible");
  });

  it("T13 : retrait en échec et « Cette page » en échec : un avis, aucune exception", async () => {
    const t = { ...thumbs, canvas: () => { throw new Error("rendu impossible"); } } as ThumbDeps;
    const { mine, host } = setup(fakeCore.blank(), { thumbs: t });
    await mine.addSource({ color: "#ffffff", grid: null, image: null }, "Blanc", "grid");
    fireEvent.click(await found('[data-edit="fonds-section"] [data-choice="mine"]'));
    fireEvent.click(document.querySelector<HTMLElement>('button[data-fonds="page"]')!);
    await vi.waitFor(() => expect(document.querySelector('[data-fonds="notice"]')?.textContent).toBe("rendu impossible"));
    vi.spyOn(mine, "remove").mockRejectedValueOnce(new Error("retrait impossible"));
    fireEvent.click(await found('button[data-fonds-remove="blanc.json"]'));
    await vi.waitFor(() => expect(document.querySelector('[data-fonds="notice"]')?.textContent).toBe("retrait impossible"));
    expect(host.ask).toHaveBeenCalledTimes(1);
  });

  it("T13 : la dérivation des dépôts n'est posée qu'une fois le pack chargé", async () => {
    let release: (p: readonly PackBackground[]) => void = () => undefined;
    const { diverters } = setup(fakeCore.blank(), { loadPack: () => new Promise((ok) => (release = ok)) });
    await new Promise((ok) => setTimeout(ok, 10));
    expect(diverters).toEqual([]);
    release(PACK);
    await vi.waitFor(() => expect(typeof diverters[0]).toBe("function"));
  });

  it("T13 : échec du chargement du pack : avis donné à l'utilisateur et fenêtre fermée, plutôt qu'une fenêtre invisible", async () => {
    const { host, close } = setup(fakeCore.blank(), { loadPack: async () => { throw new Error("import impossible"); } });
    await vi.waitFor(() => expect(host.say).toHaveBeenCalledWith("import impossible"));
    expect(close).toHaveBeenCalledTimes(1);
  });
});
