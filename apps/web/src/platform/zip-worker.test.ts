import { unzipSync, zipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZIP_TOO_BIG_MESSAGE } from "./model3d-import";
import { buildPack, readPack, type PackItem } from "./rbpack";
import { keepBoardPath, keepPackPath, unzipEntries, zipStored } from "./zip-worker";

const enc = (s: string) => new TextEncoder().encode(s);
const item = (path: string): PackItem => ({ path, name: path.split("/").pop()!, keywords: [], description: "", kind: "fragment", bytes: enc(`rb:${path}`), thumbnail: enc(`png:${path}`) });

describe("C4 : Worker ZIP du paquet", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("C4 : zipStored : entrées stockées, dans l'ordre, octets stables", () => {
    const files = [{ path: "manifest.json", bytes: enc("{}") }, { path: "items/a.rbitem", bytes: enc("abc") }];
    const a = zipStored(files);
    expect(zipStored(files)).toEqual(a);
    const back = unzipSync(a);
    expect(Object.keys(back)).toEqual(["manifest.json", "items/a.rbitem"]);
    expect(new TextDecoder().decode(back["items/a.rbitem"])).toBe("abc");
    // méthode 0 (stockée) dans l'en-tête local de la première entrée (octets 8-9)
    expect(a[8]).toBe(0);
    expect(a[9]).toBe(0);
  });

  it("C4 : zipStored n'écrit aucune date d'horloge (1980-01-01 00:00 dans l'en-tête local)", () => {
    const files = [{ path: "manifest.json", bytes: enc("{}") }];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2031, 5, 7, 13, 45, 10));
    const a = zipStored(files);
    vi.setSystemTime(new Date(2042, 10, 21, 8, 0, 0));
    const b = zipStored(files);
    expect(b).toEqual(a);
    // heure (octets 10-11) puis date DOS (octets 12-13) : 0 et (0 << 9) | (1 << 5) | 1
    expect(Array.from(a.subarray(10, 14))).toEqual([0, 0, 33, 0]);
  });

  it("C4 : unzipEntries en mode paquet garde les chemins tels quels", () => {
    const zip = zipStored(buildPack("F", [{ path: "sous/Moitié", name: "Moitié", keywords: [], description: "", kind: "fragment", bytes: enc("x"), thumbnail: null }], { appVersion: "c4", now: "n" }));
    expect(unzipEntries(zip, keepPackPath).map((e) => e.path)).toEqual(["manifest.json", "items/sous/Moitié.rbitem"]);
  });

  it("C4 : keepPackPath ne garde que le manifeste et items/*.rbitem(.png)", () => {
    expect(["manifest.json", "items/a.rbitem", "items/a.rbitem.png"].every(keepPackPath)).toBe(true);
    expect(["x.txt", "items/a.png", "items/a.rbitem.json", "a.rbitem"].some(keepPackPath)).toBe(false);
  });

  // Patron écarté : la lecture 3D (`unzipModelEntries`) filtre par `keepZipPath` et normalise par `normalizePath` ;
  // `items/a/../b.rbitem` y deviendrait `items/b.rbitem` (ou disparaîtrait). Le paquet arrive brut jusqu'au contrôle.
  it("C4 : ZIP → unzipEntries → readPack : a/../b n'est jamais normalisé avant contrôle", () => {
    const zip = zipStored(buildPack("F", [item("a/../b"), item("ok")], { appVersion: "c4", now: "n" }));
    const entries = unzipEntries(zip, keepPackPath);
    expect(entries.map((e) => e.path)).toEqual(["manifest.json", "items/a/../b.rbitem", "items/a/../b.rbitem.png", "items/ok.rbitem", "items/ok.rbitem.png"]);
    expect(readPack(entries).items.map((i) => i.path)).toEqual(["a/../b", "ok"]);
  });

  it("C4 : unzipEntries en mode paquet garde les bornes de la lecture 3D (entrées, octets)", () => {
    const four = zipSync({ "manifest.json": enc("{}"), "items/a.rbitem": enc("v"), "items/b.rbitem": enc("v"), "items/c.rbitem": enc("v") });
    expect(() => unzipEntries(four, keepPackPath, { entries: 3, bytes: 1e9 })).toThrow(ZIP_TOO_BIG_MESSAGE);
    expect(unzipEntries(four, keepPackPath, { entries: 4, bytes: 1e9 })).toHaveLength(4);
    const eleven = zipStored([{ path: "items/a.rbitem", bytes: enc("v 0 0 0 0 0") }]);
    expect(() => unzipEntries(eleven, keepPackPath, { entries: 1000, bytes: 10 })).toThrow(ZIP_TOO_BIG_MESSAGE);
  });

  it("C4 : le Worker route op zip, unzip mode pack, et { bytes } seul vers la lecture 3D", async () => {
    const posted: unknown[] = [];
    vi.stubGlobal("WorkerGlobalScope", function WorkerGlobalScope() {});
    vi.stubGlobal("onmessage", null);
    vi.stubGlobal("postMessage", (m: unknown) => posted.push(m));
    vi.resetModules();
    await import("./zip-worker");
    const onmessage = (globalThis as unknown as { onmessage: (e: { data: unknown }) => void }).onmessage;
    const pack = buildPack("F", [item("a/../b")], { appVersion: "c4", now: "n" });
    onmessage({ data: { op: "zip", files: pack } });
    const zipped = (posted[0] as { bytes: Uint8Array }).bytes;
    expect(zipped).toEqual(zipStored(pack));
    onmessage({ data: { op: "unzip", mode: "pack", bytes: zipped } });
    expect((posted[1] as { entries: Array<{ path: string }> }).entries.map((e) => e.path)).toEqual(["manifest.json", "items/a/../b.rbitem", "items/a/../b.rbitem.png"]);
    onmessage({ data: { bytes: zipSync({ "ok/c.obj": enc("v 1 2 3"), "items/x.rbitem": enc("x") }) } });
    expect((posted[2] as { entries: Array<{ path: string }> }).entries.map((e) => e.path)).toEqual(["ok/c.obj"]);
  });
});

describe("C13 : Worker ZIP des tableaux (mode board, D3)", () => {
  it("C13 : keepBoardPath garde content.xml, pageN.svg et les images", () => {
    for (const ok of ["content.xml", "Content.XML", "page001.svg", "page12.svg", "images/a.png", "images/b.JPG", "objects/c.jpeg", "d.gif", "e.webp", "f.bmp", "g.svg"]) {
      expect(keepBoardPath(ok), ok).toBe(true);
    }
  });

  it("C13 : keepBoardPath refuse les chemins qui sortent, __MACOSX, les dossiers, médias et autres", () => {
    for (const no of ["../evil.png", "images/../../evil.png", "/abs.png", "\\abs.png", "C:/x.png", "C:\\x.png", "__MACOSX/._a.png", "images/", "videos/film.mpg", "audios/son.mp3", "flash/a.swf", "images/a.emf", "metadata.rdf", "widgets/w.wgt/index.html", ""]) {
      expect(keepBoardPath(no), no).toBe(false);
    }
  });

  it("C13 : unzipEntries(keepBoardPath) ne rend ni ../evil.png ni /abs.png ni la vidéo (S5)", () => {
    const zip = zipSync({
      "content.xml": enc("<iwb/>"),
      "images/a.png": enc("png"),
      "../evil.png": enc("evil"),
      "/abs.png": enc("abs"),
      "videos/film.mpg": enc("mpg"),
    });
    expect(unzipEntries(zip, keepBoardPath).map((e) => e.path).sort()).toEqual(["content.xml", "images/a.png"]);
  });

  it("C13 : plus de 1 000 entrées : refus « ZIP trop gros » (U26)", () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < 1001; i++) files[`images/i${i}.png`] = enc("x");
    expect(() => unzipEntries(zipSync(files), keepBoardPath)).toThrow(ZIP_TOO_BIG_MESSAGE);
  });
});
