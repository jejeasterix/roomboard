import { describe, expect, it } from "vitest";
import {
  BOARD_FAILED_MESSAGE,
  BOARD_OBJECTS_MESSAGE,
  BOARD_WRITE_FAILED_MESSAGE,
  NOTEBOOK_ORDER_GUESSED,
  boardErrorMessage,
  checkBoardFiles,
  checkBoardParts,
  createBoardCodec,
  notebookOrder,
  withLeadingWarnings,
  type BoardPart,
} from "./board-reader";
import boardWorkerSource from "./board-worker.ts?raw";
import { hasBoardReader, hasFlipchartReader, type FormatsBinding } from "./container";
import type { WorkerLike } from "./one-shot-worker";

function fakeWorker(reply: (m: unknown) => unknown, sent: unknown[] = [], transfers: Transferable[][] = []): WorkerLike {
  const w: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage(m, t) {
      sent.push(m);
      transfers.push(t);
      queueMicrotask(() => w.onmessage?.({ data: reply(m) }));
    },
    terminate() {},
  };
  return w;
}

describe("Worker des tableaux (C13, D1, D6)", () => {
  it("C13 : read envoie { op: \"read\", dialect, files } transférés et rend les parties contrôlées", async () => {
    const sent: unknown[] = [];
    const transfers: Transferable[][] = [];
    const codec = createBoardCodec(() => fakeWorker(() => ({ parts: [{ ops: new Float32Array([1]), texts: [], warnings: ["page 1 : 1 vidéo non lue"] }] }), sent, transfers));
    const parts = await codec.read([new Uint8Array([60, 105])], "iwb");
    expect(sent[0]).toMatchObject({ op: "read", dialect: "iwb" });
    expect(transfers[0]).toHaveLength(1);
    expect(parts[0]!.warnings).toEqual(["page 1 : 1 vidéo non lue"]);
    expect(Array.from(parts[0]!.ops)).toEqual([1]);
  });

  it("C13 : write envoie { op: \"write\", format, ops, texts } et rend les fichiers en octets UTF-8", async () => {
    const sent: unknown[] = [];
    const codec = createBoardCodec(() => fakeWorker(() => ({ files: ["content.xml", "<iwb>é</iwb>"] }), sent));
    const files = await codec.write({ ops: new Float32Array([1]), texts: ["a"] }, "iwb");
    expect(sent[0]).toMatchObject({ op: "write", format: "iwb", texts: ["a"] });
    expect(files.map((f) => [f.path, new TextDecoder().decode(f.bytes)])).toEqual([["content.xml", "<iwb>é</iwb>"]]);
  });

  it("C13 : { error } du Worker rendu tel quel ; réponse mal formée : « lecture du tableau interrompue »", async () => {
    const broken = createBoardCodec(() => fakeWorker(() => ({ error: "fichier endommagé : XML mal formé" })));
    await expect(broken.read([new Uint8Array([1])], "iwb")).rejects.toThrow("fichier endommagé : XML mal formé");
    const odd = createBoardCodec(() => fakeWorker(() => ({ parts: [{ ops: [1], texts: [], warnings: [] }] })));
    await expect(odd.read([new Uint8Array([1])], "ubz")).rejects.toThrow(BOARD_FAILED_MESSAGE);
  });

  it("C13 : délai sans réponse : rejet, puis arrêt du Worker", async () => {
    let stopped = 0;
    const silent: WorkerLike = { onmessage: null, onerror: null, postMessage() {}, terminate() { stopped++; } };
    await expect(createBoardCodec(() => silent, 10).write({ ops: new Float32Array(), texts: [] }, "ubz")).rejects.toThrow(BOARD_WRITE_FAILED_MESSAGE);
    expect(stopped).toBe(1);
  });

  it("C13 : boardErrorMessage garde les messages du module, remplace une panique Wasm", () => {
    expect(boardErrorMessage(new Error("fichier endommagé : cadre de page invalide"), BOARD_FAILED_MESSAGE)).toBe("fichier endommagé : cadre de page invalide");
    expect(boardErrorMessage(new Error(BOARD_OBJECTS_MESSAGE), BOARD_FAILED_MESSAGE)).toBe(BOARD_OBJECTS_MESSAGE);
    expect(boardErrorMessage(new Error("liste de tableau invalide : code inconnu 9 à 0"), BOARD_WRITE_FAILED_MESSAGE)).toBe("liste de tableau invalide : code inconnu 9 à 0");
    expect(boardErrorMessage(new Error("unreachable"), BOARD_FAILED_MESSAGE)).toBe(BOARD_FAILED_MESSAGE);
    expect(boardErrorMessage(42, BOARD_WRITE_FAILED_MESSAGE)).toBe(BOARD_WRITE_FAILED_MESSAGE);
  });

  it("C13 : checkBoardParts et checkBoardFiles refusent les formes inattendues", () => {
    expect(() => checkBoardParts({ parts: "x" })).toThrow(BOARD_FAILED_MESSAGE);
    expect(() => checkBoardParts({ parts: [{ ops: new Float32Array(), texts: [1], warnings: [] }] })).toThrow(BOARD_FAILED_MESSAGE);
    expect(() => checkBoardFiles({ files: ["content.xml"] })).toThrow(BOARD_WRITE_FAILED_MESSAGE);
    expect(() => checkBoardFiles({ files: [1, 2] })).toThrow(BOARD_WRITE_FAILED_MESSAGE);
  });
});

describe("Worker des tableaux, .notebook (C13 lot 2, N6)", () => {
  const part = { ops: new Float32Array([1]), texts: [], warnings: [] };

  it("C13 N6 : ordre du manifeste", async () => {
    const sent: unknown[] = [];
    const transfers: Transferable[][] = [];
    const codec = createBoardCodec(() => fakeWorker(() => ({ parts: [part, part] }), sent, transfers));
    const a = new Uint8Array([60, 97]);
    const b = new Uint8Array([60, 98]);
    const manifest = new Uint8Array([60, 109]);
    const names = ["page0.svg", "page1.svg"];
    await codec.read([a, b], "notebook", { names, manifest, max: 500 });
    // Les fichiers partent dans l'ordre reçu : l'ordre du manifeste se décide dans le Worker, par le Rust (D16).
    expect(sent[0]).toEqual({ op: "read", dialect: "notebook", files: [a, b], names, manifest, max: 500 });
    const m = sent[0] as { files: Uint8Array[]; manifest: Uint8Array };
    expect(m.files[0]).not.toBe(a);
    expect(m.manifest).not.toBe(manifest);
    expect(transfers[0]).toHaveLength(3);
    for (const own of [a.buffer, b.buffer, manifest.buffer]) expect(transfers[0]).not.toContain(own);
  });

  it("C13 N6 : write refuse un dialecte de lecture", async () => {
    const codec = createBoardCodec(() => fakeWorker(() => ({ error: "format de tableau inconnu : notebook" })));
    // @ts-expect-error N5 : import seul, aucune copie `.notebook`.
    const out = codec.write({ ops: new Float32Array(), texts: [] }, "notebook");
    await expect(out).rejects.toThrow("format de tableau inconnu : notebook");
  });

  it("C13 N6 : notebookOrder", () => {
    const [a, b, c] = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];
    // Pas du XML : seul `order` (la liaison Rust) lit le manifeste ; un `DOMParser` ou un tri par `page<N>` ne rendrait pas [b, a].
    const manifest = new Uint8Array([9, 9, 9]);
    const seen: Uint8Array[] = [];
    const order = (m: Uint8Array): string[] => {
      seen.push(m);
      return ["page1.svg", "page0.svg"];
    };
    const byManifest = notebookOrder(order, [a, b], ["page0.svg", "page1.svg"], manifest, 500);
    expect(byManifest.files).toHaveLength(2);
    expect(byManifest.files[0]).toBe(b);
    expect(byManifest.files[1]).toBe(a);
    expect(byManifest.warnings).toEqual([]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(manifest);
    // Casse et chemins : `Page1.SVG` du manifeste désigne `page1.svg`.
    expect(notebookOrder(() => ["Page1.SVG", "page0.svg"], [a, b], ["page0.svg", "page1.svg"], manifest, 500).files).toEqual([b, a]);

    // Repli : l'ordre reçu (numérique, `boardSources`), jamais retrié ici (page10 reste avant page2), avec l'avertissement.
    const reçu = ["page2.svg", "page10.svg"];
    expect(notebookOrder(() => [], [a, b], reçu, manifest, 500)).toEqual({ files: [a, b], warnings: [NOTEBOOK_ORDER_GUESSED] });
    let called = 0;
    const counted = (): string[] => {
      called++;
      return [];
    };
    expect(notebookOrder(counted, [a, b], reçu, null, 500)).toEqual({ files: [a, b], warnings: [NOTEBOOK_ORDER_GUESSED] });
    expect(called).toBe(0);
    const broken = (): string[] => {
      throw new Error("fichier endommagé : manifeste non UTF-8");
    };
    expect(notebookOrder(broken, [a, b], reçu, manifest, 500)).toEqual({ files: [a, b], warnings: [NOTEBOOK_ORDER_GUESSED] });

    // Page absente du manifeste : ajoutée à la fin, avec l'avertissement ; une entrée inconnue du manifeste est ignorée.
    const partial = notebookOrder(() => ["page2.svg", "page9.svg"], [a, b, c], ["page0.svg", "page1.svg", "page2.svg"], manifest, 500);
    expect(partial).toEqual({ files: [c, a, b], warnings: [NOTEBOOK_ORDER_GUESSED] });
    expect(partial.files[0]).toBe(c);

    // `max` : les premières pages dans l'ordre du manifeste.
    const one = notebookOrder(order, [a, b], ["page0.svg", "page1.svg"], manifest, 1);
    expect(one.files).toHaveLength(1);
    expect(one.files[0]).toBe(b);
    expect(one.warnings).toEqual([]);
  });

  it("C13 N6 : hasBoardReader exige notebook_order", () => {
    const fail = (): never => {
      throw new Error("non appelé");
    };
    const lot1 = { ContainerReader: { open: fail }, write_container: fail, BoardReader: { open: fail }, write_board_xml: fail };
    expect(hasBoardReader(lot1 as unknown as FormatsBinding)).toBe(false);
    expect(hasBoardReader({ ...lot1, notebook_order: fail } as unknown as FormatsBinding)).toBe(true);
  });

  it("C13 N6 : une panique Wasm du manifeste remonte, seul « fichier endommagé » est avalé", () => {
    const files = [new Uint8Array([1])];
    const manifest = new Uint8Array([9]);
    const panic = (): string[] => {
      throw new WebAssembly.RuntimeError("unreachable");
    };
    expect(() => notebookOrder(panic, files, ["page0.svg"], manifest, 500)).toThrow(WebAssembly.RuntimeError);
    const other = (): string[] => {
      throw new Error("autre chose");
    };
    expect(() => notebookOrder(other, files, ["page0.svg"], manifest, 500)).toThrow("autre chose");
    const damaged = (): string[] => {
      throw new Error("fichier endommagé : manifeste illisible");
    };
    expect(notebookOrder(damaged, files, ["page0.svg"], manifest, 500).warnings).toEqual([NOTEBOOK_ORDER_GUESSED]);
  });

  it("C13 N6 : withLeadingWarnings met l'avis d'ordre en tête de la première part", () => {
    const p = (w: string[]): BoardPart => ({ ops: new Float32Array(), texts: [], warnings: w });
    const parts = [p(["a"]), p(["b"])];
    const out = withLeadingWarnings(parts, [NOTEBOOK_ORDER_GUESSED]);
    expect(out.map((x) => x.warnings)).toEqual([[NOTEBOOK_ORDER_GUESSED, "a"], ["b"]]);
    expect(parts[0]!.warnings).toEqual(["a"]);
    expect(withLeadingWarnings(parts, [])).toBe(parts);
    expect(withLeadingWarnings([], ["x"])).toEqual([]);
  });

  it("C13 N6 : le Worker ordonne par notebookOrder et la liaison, sans tri ni DOMParser", () => {
    expect(boardWorkerSource).toContain("notebookOrder(mod.notebook_order");
    expect(boardWorkerSource).not.toMatch(/DOMParser|\.sort\(|localeCompare/);
  });
  it("C13 N11 : readFlipchart envoie noms, données et bornes", async () => {
    const sent: unknown[] = [];
    const transfers: Transferable[][] = [];
    const codec = createBoardCodec(() => fakeWorker(() => ({ parts: [part] }), sent, transfers));
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4, 5]);
    const out = await codec.readFlipchart([
      { path: "1.in", bytes: a },
      { path: "version", bytes: b },
    ]);
    expect(out).toEqual(part);
    expect(sent[0]).toEqual({ op: "flipchart", names: ["1.in", "version"], data: new Uint8Array([1, 2, 3, 4, 5]), ends: new Uint32Array([2, 5]) });
    // Un seul tampon transféré (les octets de l'appelant restent) : les bornes sont de petits entiers, copiés.
    const m = sent[0] as { data: Uint8Array };
    expect(transfers[0]).toEqual([m.data.buffer]);
    expect(transfers[0]).not.toContain(a.buffer);
  });

  it("C13 N11 : readFlipchart rend l'erreur du Worker, un échec reste le message d'échec", async () => {
    const broken = createBoardCodec(() => fakeWorker(() => ({ error: "fichier endommagé : index du paperboard absent" })));
    await expect(broken.readFlipchart([])).rejects.toThrow("fichier endommagé : index du paperboard absent");
    const odd = createBoardCodec(() => fakeWorker(() => ({ parts: [] })));
    await expect(odd.readFlipchart([])).rejects.toThrow(BOARD_FAILED_MESSAGE);
  });

  it("C13 N11 : hasFlipchartReader", () => {
    const fail = (): never => {
      throw new Error("non appelé");
    };
    expect(hasFlipchartReader({ ContainerReader: { open: fail }, write_container: fail } as unknown as FormatsBinding)).toBe(false);
    expect(hasFlipchartReader({ ContainerReader: { open: fail }, write_container: fail, FlipchartReader: { open: fail } } as unknown as FormatsBinding)).toBe(true);
  });

  it("C13 N11 : le Worker ouvre le paperboard par FlipchartReader, sans le tableau des pages", () => {
    expect(boardWorkerSource).toContain("FlipchartReader.open(");
  });
});
