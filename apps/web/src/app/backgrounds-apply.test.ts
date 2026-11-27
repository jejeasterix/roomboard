// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { Command, CoreDocument } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import type { PackBackground } from "../backgrounds/catalog";
import {
  appliedMessage, applyBackground, backgroundCommand, fetchPackFiles, lookTag, missingPackFile, outsideFrame, pdfKeptMessage,
  pdfPagesAmong, resolvePack, sourceThumbnail, THUMB_SCALE,
} from "./backgrounds-apply";
import type { ExportCanvas } from "./pdf-overlay";
import type { ThumbDeps } from "./thumbnail";

const GRID = { visible: true, snap: false, above: false, levels: [{ kind: "seyes", spacingX: 30.24, spacingY: 30.24, originX: 0, originY: 0, color: "#8f9ad6", line: "solid", lineWidth: 1, snap: true, visible: true }] };
const seyes: PackBackground = { id: "seyes-8mm", section: "lines", theme: "seyes", label: "Seyès 8 mm", keywords: ["seyès"], kind: "grid", color: "#fbf7ec", grid: GRID, photo: null };
const ardoise: PackBackground = { ...seyes, id: "ardoise", section: "colors", theme: "sombres", label: "Ardoise", kind: "color", color: "#2f3e46", grid: null };
const venn: PackBackground = { ...ardoise, id: "venn", section: "lessons", theme: "reflexion", label: "Diagramme de Venn", kind: "svg", color: "#ffffff" };
const mer: PackBackground = { ...ardoise, id: "mer-1", section: "images", theme: "mer-ciel", label: "Mer", kind: "photo", color: "#3a6f9a", photo: { file: "photos/mer-1.webp", thumb: "thumbs/mer-1.webp", w: 2560, h: 1440 } };
const filesOf = (map: Record<string, Uint8Array>) => ({
  read: vi.fn(async (f: string) => {
    const b = map[f];
    if (b === undefined) throw new Error(missingPackFile(f));
    return new Blob([b as BlobPart]);
  }),
});
const targetOf = (d: CoreDocument) => {
  const assets = createAssetStore();
  // Compteur des mises au magasin : le patron « putCapture page par page » en ferait une par page.
  const put = vi.fn((b: Blob) => assets.put(b));
  const runs: Command[] = [];
  return {
    runs,
    assets,
    put,
    target: {
      assets: { put },
      pageIds: () => d.pageIds(),
      run: (c: Command) => {
        runs.push(c);
        try {
          return d.apply(c);
        } catch {
          return null;
        }
      },
    },
  };
};
const threePages = (): CoreDocument => {
  const d = fakeCore.blank();
  d.apply({ type: "AddPage", after: d.pageIds()[0]! });
  d.apply({ type: "AddPage", after: d.pageIds()[0]! });
  return d;
};

describe("personnalisation-1b : appliquer un fond (Q14, Q26, Q31, DA1)", () => {
  it("resolvePack : couleur seule, grille seule, SVG 3840 × 2160, photo lue à la demande seulement", async () => {
    const files = filesOf({ "photos/mer-1.webp": new Uint8Array([1, 2, 3]) });
    expect(await resolvePack(ardoise, files)).toEqual({ color: "#2f3e46", grid: null, image: null });
    expect(await resolvePack(seyes, files)).toEqual({ color: "#fbf7ec", grid: GRID, image: null });
    const svg = await resolvePack(venn, files);
    expect(svg.image).toMatchObject({ name: "venn.svg", mime: "image/svg+xml", w: 3840, h: 2160 });
    expect(await svg.image!.blob.text()).toMatch(/^<svg /);
    expect(files.read).not.toHaveBeenCalled();
    const photo = await resolvePack(mer, files);
    expect(files.read).toHaveBeenCalledWith("photos/mer-1.webp");
    expect(photo.image).toMatchObject({ name: "mer-1.webp", mime: "image/webp", w: 2560, h: 1440 });
    expect(photo.image!.blob.type).toBe("image/webp");
  });

  it("applyBackground « all » : une commande pour trois pages, un seul put, un seul asset, une étape", async () => {
    const d = threePages();
    const { runs, put, target } = targetOf(d);
    expect(await applyBackground(target, await resolvePack(venn, filesOf({})), "all", d.pageIds()[0]!)).toBe(true);
    // Discriminant : page par page (SetBackdrop + putCapture), ce serait 3 commandes et 3 put.
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ type: "ApplyBackground", pages: d.pageIds() });
    expect(put).toHaveBeenCalledTimes(1);
    const assets = new Set(d.pageIds().map((p) => d.page(p)?.backdrop?.asset));
    expect(assets.size).toBe(1);
    expect(d.citedAssets()).toHaveLength(1);
    // Discriminant : une seule annulation retire le fond des trois pages (page par page, seule la dernière).
    d.undo();
    expect(d.pageIds()).toHaveLength(3);
    for (const p of d.pageIds()) expect(d.page(p)?.backdrop ?? null).toBeNull();
  });

  it("applyBackground « current » : seule la page montrée ; refus du cœur : faux", async () => {
    const d = threePages();
    const [a, b] = d.pageIds() as [string, string];
    const { target } = targetOf(d);
    expect(await applyBackground(target, await resolvePack(ardoise, filesOf({})), "current", b)).toBe(true);
    expect([d.page(a)?.background, d.page(b)?.background]).toEqual(["#ffffff", "#2f3e46"]);
    expect(await applyBackground(target, { color: "", grid: null, image: null }, "current", b)).toBe(false);
  });

  it("backgroundCommand : fond calé sur la largeur, taille du Blob, grille recopiée, magasin appelé une fois", async () => {
    const put = vi.fn(async () => "a".repeat(64));
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])]);
    const cmd = await backgroundCommand({ put }, { color: "#fbf7ec", grid: GRID, image: { blob, name: "fond.png", mime: "image/png", w: 640, h: 360 } }, ["p1", "p2"]);
    expect(cmd).toEqual({ type: "ApplyBackground", pages: ["p1", "p2"], color: "#fbf7ec", grid: GRID, backdrop: { asset: { id: "a".repeat(64), name: "fond.png", mime: "image/png", size: 4 }, w: 640, h: 360, fit: "width" } });
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("Review Focus — photo absente du pack : refus lisible, aucune commande", async () => {
    const d = fakeCore.blank();
    const { runs } = targetOf(d);
    await expect(resolvePack(mer, filesOf({}))).rejects.toThrow("fond introuvable : photos/mer-1.webp");
    const fetched = fetchPackFiles(async () => new Response(null, { status: 404 }));
    await expect(fetched.read("photos/mer-1.webp")).rejects.toThrow("fond introuvable : photos/mer-1.webp");
    const offline = fetchPackFiles(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(offline.read("photos/mer-1.webp")).rejects.toThrow("fond introuvable : photos/mer-1.webp");
    expect(runs).toEqual([]);
    expect(d.canUndo()).toBe(false);
  });

  it("fetchPackFiles : adresse relative au document, sous ./backgrounds/", async () => {
    const urls: string[] = [];
    const f = fetchPackFiles(async (u) => {
      urls.push(u);
      return new Response(new Uint8Array([7]));
    });
    expect((await f.read("thumbs/x.webp")).size).toBe(1);
    expect(urls).toEqual(["./backgrounds/thumbs/x.webp"]);
  });

  it("pdfPagesAmong compte les pages PDF ; outsideFrame voit un objet hors du cadre", () => {
    const pdf = fakeCore.fromPdfPages({ id: "cd".repeat(32), name: "c.pdf", mime: "application/pdf", size: 1 }, [{ w: 612, h: 792 }, { w: 612, h: 792 }]);
    expect(pdfPagesAmong(pdf, pdf.pageIds())).toBe(2);
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    expect(outsideFrame(d, p)).toBe(false);
    d.apply({ type: "CommitStroke", page: p, points: new Float32Array([100, 100, 0.5, 300, 300, 0.5]), style: { color: "#000000", width: 4 } });
    expect(outsideFrame(d, p)).toBe(false);
    d.apply({ type: "CommitStroke", page: p, points: new Float32Array([100, 1000, 0.5, 300, 1400, 0.5]), style: { color: "#000000", width: 4 } });
    expect(outsideFrame(d, p)).toBe(true);
  });

  it("lookTag : couleur|grille|fond ; messages des avis", async () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0]!;
    expect(lookTag(null)).toBe("");
    expect(lookTag(d.page(p))).toBe("#ffffff|-|-");
    d.apply({ type: "ApplyBackground", pages: [p], color: "#fbf7ec", grid: GRID, backdrop: { asset: { id: "b".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 10, h: 10, fit: "width" } });
    expect(lookTag(d.page(p))).toBe(`#fbf7ec|seyes|image:${"b".repeat(12)}`);
    expect(appliedMessage(3)).toBe("Fond appliqué à 3 pages");
    expect(pdfKeptMessage(1)).toBe("1 page PDF garde sa page : couleur et grille seulement");
    expect(pdfKeptMessage(2)).toBe("2 pages PDF gardent leur page : couleur et grille seulement");
  });

  it("sourceThumbnail : document temporaire libéré, rendu 480 × 270", async () => {
    const sizes: [number, number][] = [];
    const ctx = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    const deps: ThumbDeps = {
      canvas: (w, h): ExportCanvas => {
        sizes.push([w, h]);
        return { ctx, png: async () => new Uint8Array([0x89]), release: () => undefined };
      },
      painter: () => ({ paintContent: () => undefined }),
      decode: async () => ({ width: 1, height: 1, close() {} }) as never,
    };
    let freed = 0;
    const core = { blank: () => { const d = fakeCore.blank(); const free = d.free.bind(d); d.free = () => { freed++; free(); }; return d; } };
    const blob = await sourceThumbnail(core, { color: "#fbf7ec", grid: GRID, image: null }, deps, () => createAssetStore());
    expect(blob?.type).toBe("image/png");
    expect(sizes).toEqual([[1920 * THUMB_SCALE, 1080 * THUMB_SCALE]]);
    expect(freed).toBe(1);
  });
});
