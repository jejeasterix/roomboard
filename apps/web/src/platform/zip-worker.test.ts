import { unzipSync, zipSync, zlibSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZIP_TOO_BIG_MESSAGE } from "./model3d-import";
import { buildPack, readPack, type PackItem } from "./rbpack";
import { keepBoardPath, keepPackPath, olfPart, unzipEntries, unzipModelEntries, zipJobReply, zipStored, type ZipJob } from "./zip-worker";
import { decodeBoardList } from "../app/board-io";
import { OLF_MAX_JSON_BYTES, OLF_TOO_BIG_MESSAGE, readOlf } from "./olf-read";
import { BAMBOO_NOT_FLIPCHART } from "./bamboo";
import { makeFlipchart } from "../../../../scripts/essais/fabriques/flipchart.mjs";

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

  it("C13 N15 : keepBoardPath garde imsmanifest.xml et content.json", () => {
    expect(keepBoardPath("imsmanifest.xml")).toBe(true);
    expect(keepBoardPath("content.json")).toBe(true);
    expect(keepBoardPath("sub/content.json")).toBe(false);
    expect(keepBoardPath("sub/imsmanifest.xml")).toBe(false);
  });

  it("C13 N15 : keepBoardPath refuse vidéo, Flash et miniature", () => {
    for (const no of ["video.wmv", "a.swf", "preview.thm"]) expect(keepBoardPath(no), no).toBe(false);
  });

  it("C13 N16 : keepBoardPath refuse a/__MACOSX/x.png", () => {
    expect(keepBoardPath("a/__MACOSX/x.png")).toBe(false);
  });

  it("C13 S3 : ../evil.png refusé", () => {
    expect(keepBoardPath("../evil.png")).toBe(false);
  });

  it("T14 : keepBoardPath garde ./content.xml et .\\page1.svg (normalisés avant comparaison)", () => {
    for (const ok of ["./content.xml", ".\\Content.XML", "./page1.svg", "./images/a.png"]) expect(keepBoardPath(ok), ok).toBe(true);
    expect(keepBoardPath("./../evil.png")).toBe(false);
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

describe("C13 lot 2 : content.json d'un .olf lu par le Worker ZIP (N8, N13)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const json = JSON.stringify({
    olf: {
      width: 1920,
      pageset: [
        {
          page: {
            viewbox: "0 0 3840 2160",
            matrix: "1,0,-10,0,1,-480,0,0,1",
            backgrounds: [{ background: { type: "color", fill: "#FFFFFF" } }],
            elements: [
              { stroke: { points: "10,20 30,40", stroke: "#FF0000", "pen-width": 9, matrix: "0,-1,100,1,0,50,0,0,1" } },
              {
                textarea: {
                  x: 0,
                  y: 0,
                  width: 300,
                  height: 100,
                  "text-blocks-container": [
                    { paragraph: { "text-list-container": [{ text: { text: "Piano", "font-size": 64, "font-weight": "bold", fill: "#FF000000", "font-family": "Calibri" } }] } },
                    { paragraph: { "text-list-container": [{ text: { text: "Keys", "text-decoration": "underline" } }] } },
                  ],
                },
              },
              { image: { source: "images/a.png", x: 0, y: 0, width: 294, height: 300 } },
              { "widget-player": { source: "https://x" } },
            ],
          },
        },
      ],
    },
  });

  it("C13 N8 : op olf rend un flux", async () => {
    // Le flux redécodé par `decodeBoardList` (le contrôle de la page) rend les pages de `readOlf`.
    const part = olfPart(enc(json));
    const read = readOlf(json);
    expect(part.ops).toBeInstanceOf(Float32Array);
    expect(decodeBoardList(part.ops, part.texts)).toEqual(read.pages);
    expect(part.warnings).toEqual(["page 1 : 1 widget non lu"]);
    expect(part.total).toBe(1);
    // Dans un Worker : `{ op: "olf", bytes }` → `{ part }`, tampon `ops` transféré.
    const post = vi.fn();
    vi.stubGlobal("WorkerGlobalScope", class {});
    vi.stubGlobal("postMessage", post);
    vi.stubGlobal("onmessage", null);
    vi.resetModules();
    await import("./zip-worker");
    const handler = (globalThis as unknown as { onmessage: (e: { data: unknown }) => void }).onmessage;
    handler({ data: { op: "olf", bytes: enc(json) } });
    expect(post).toHaveBeenCalledTimes(1);
    const [reply, transfer] = post.mock.calls[0] as [{ part: { ops: Float32Array; texts: string[]; warnings: string[]; total: number } }, Transferable[]];
    expect(decodeBoardList(reply.part.ops, reply.part.texts)).toEqual(read.pages);
    expect(transfer).toEqual([reply.part.ops.buffer]);
    handler({ data: { op: "olf", bytes: enc("{") } });
    expect(post.mock.calls[1]).toEqual([{ error: "fichier endommagé : content.json illisible" }, []]);
  });

  it("C13 N13 : content.json de plus de 64 Mio refusé avant décodage", () => {
    const read = vi.fn((_: string) => ({ pages: [], warnings: [], total: 0 }));
    const decoded: number[] = [];
    vi.stubGlobal(
      "TextDecoder",
      class {
        decode(b: Uint8Array): string {
          decoded.push(b.length);
          return "";
        }
      },
    );
    expect(() => olfPart(new Uint8Array(OLF_MAX_JSON_BYTES + 1), read)).toThrowError(new Error(OLF_TOO_BIG_MESSAGE));
    expect(read).not.toHaveBeenCalled();
    expect(decoded).toEqual([]);
    // À la borne : décodé puis lu.
    olfPart(new Uint8Array(OLF_MAX_JSON_BYTES), read);
    expect(decoded).toEqual([OLF_MAX_JSON_BYTES]);
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe("C13 lot 3 : conteneur Bamboo par le Worker ZIP (N11)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("C13 N11 : mode bamboo rend les entrées", async () => {
    const post = vi.fn();
    vi.stubGlobal("WorkerGlobalScope", class {});
    vi.stubGlobal("postMessage", post);
    vi.stubGlobal("onmessage", null);
    vi.resetModules();
    await import("./zip-worker");
    const handler = (globalThis as unknown as { onmessage: (e: { data: unknown }) => void }).onmessage;
    handler({ data: { op: "unzip", mode: "bamboo", bytes: makeFlipchart([{}], zlibSync) } });
    const [reply, transfer] = post.mock.calls[0] as [{ entries: Array<{ path: string; bytes: Uint8Array }> }, Transferable[]];
    expect(reply.entries.map((e) => e.path)).toEqual(["101.in", "100.io", "1003.fpg/1003.in", "1003.fpg/1002.io"]);
    expect(new TextDecoder().decode(reply.entries[0]!.bytes.subarray(0, 8))).toBe("# culm #");
    expect(transfer).toEqual([...new Set(reply.entries.map((e) => e.bytes.buffer))]);
    // Le mode board ne lit pas le paperboard : seul le mode bamboo passe par le conteneur.
    handler({ data: { op: "unzip", mode: "board", bytes: makeFlipchart([{}], zlibSync) } });
    expect(post.mock.calls[1]![0]).toHaveProperty("error");
    handler({ data: { op: "unzip", mode: "bamboo", bytes: zipSync({ "content.xml": enc("<x/>") }) } });
    expect(post.mock.calls[2]).toEqual([{ error: BAMBOO_NOT_FLIPCHART }, []]);
  });
});

describe("zipJobReply (cli-lot2, D20)", () => {
  type Reply = { entries?: { path: string; bytes: Uint8Array }[]; bytes?: Uint8Array; error?: string };
  const data = (j: ZipJob) => zipJobReply(j).data as Reply;
  it("op zip : ZIP stocké, son tampon transféré", () => {
    const r = zipJobReply({ op: "zip", files: [{ path: "a.txt", bytes: enc("a") }] });
    const bytes = (r.data as Reply).bytes!;
    expect(Object.keys(unzipSync(bytes))).toEqual(["a.txt"]);
    expect(r.transfer).toEqual([bytes.buffer]);
  });
  it("unzip mode board et mode pack : entrées gardées par keepBoardPath, keepPackPath", () => {
    const input = { "content.xml": enc("<iwb/>"), "videos/film.mpg": enc("v"), "manifest.json": enc("{}"), "autre.txt": enc("t") };
    const z = zipSync(input);
    expect(data({ op: "unzip", mode: "board", bytes: z }).entries!.map((e) => e.path).sort()).toEqual(Object.keys(input).filter(keepBoardPath).sort());
    expect(data({ op: "unzip", mode: "pack", bytes: z }).entries!.map((e) => e.path).sort()).toEqual(Object.keys(input).filter(keepPackPath).sort());
  });
  it("{ bytes } seul : lecture 3D inchangée", () => {
    const z = zipSync({ "a.obj": enc("o"), "b.txt": enc("t") });
    expect(data({ bytes: z }).entries!.map((e) => e.path)).toEqual(unzipModelEntries(z).map((e) => e.path));
  });
  it("erreurs (ZIP illisible, paperboard faux, .olf illisible) : { error } texte, aucun transfert", () => {
    for (const j of [{ op: "unzip", mode: "pack", bytes: enc("pas un zip") }, { op: "unzip", mode: "bamboo", bytes: enc("pas un paperboard") }, { op: "olf", bytes: enc("{") }] as ZipJob[]) {
      const r = zipJobReply(j);
      expect(typeof (r.data as Reply).error).toBe("string");
      expect(r.transfer).toEqual([]);
    }
  });

  // La coquille du Worker de la page poste exactement la réponse de `zipJobReply` (données et tampons), et garde son
  // comportement d'aujourd'hui quand `postMessage` lève : `{ error }` posté sans transfert.
  describe("coquille de zip-worker.ts", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetModules();
    });
    async function shell(post: (m: unknown, t: Transferable[]) => void) {
      vi.stubGlobal("WorkerGlobalScope", class {});
      vi.stubGlobal("postMessage", post);
      vi.stubGlobal("onmessage", null);
      vi.resetModules();
      await import("./zip-worker");
      return (globalThis as unknown as { onmessage: (e: { data: unknown }) => void }).onmessage;
    }
    it("poste data et transfer de zipJobReply pour chaque sorte de message", async () => {
      const posted: unknown[][] = [];
      const handler = await shell((m, t) => void posted.push([m, t]));
      const jobs: ZipJob[] = [
        { op: "zip", files: [{ path: "a.txt", bytes: enc("a") }, { path: "b/c.txt", bytes: enc("bc") }] },
        { op: "unzip", mode: "pack", bytes: zipSync({ "manifest.json": enc("{}"), "autre.txt": enc("t") }) },
        { op: "unzip", mode: "board", bytes: zipSync({ "content.xml": enc("<iwb/>"), "i.png": enc("p") }) },
        { bytes: zipSync({ "a.obj": enc("o") }) },
        { op: "olf", bytes: enc("{") },
        { op: "unzip", mode: "bamboo", bytes: enc("pas un paperboard") },
      ];
      for (const j of jobs) {
        handler({ data: j });
        const r = zipJobReply(j);
        expect(posted.splice(0)).toEqual([[r.data, r.transfer]]);
      }
    });
    it("postMessage qui lève (tampon non clonable) : { error } posté sans transfert, comme avant", async () => {
      const posted: unknown[][] = [];
      let first = true;
      const handler = await shell((m, t) => {
        if (first) {
          first = false;
          throw new Error("DataCloneError");
        }
        posted.push([m, t]);
      });
      handler({ data: { op: "zip", files: [] } });
      expect(posted).toEqual([[{ error: "DataCloneError" }, []]]);
    });
  });
});
