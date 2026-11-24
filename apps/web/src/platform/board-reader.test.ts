import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BOARD_FAILED_MESSAGE,
  BOARD_OBJECTS_MESSAGE,
  BOARD_WRITE_FAILED_MESSAGE,
  NOTEBOOK_ORDER_GUESSED,
  boardErrorMessage,
  boardJobReply,
  checkBoardFiles,
  checkBoardParts,
  createBoardCodec,
  notebookOrder,
  withLeadingWarnings,
  type BoardJob,
  type BoardPart,
} from "./board-reader";
import { hasBoardReader, hasFlipchartReader, type FormatsBinding } from "./container";
import { inlineWorker, type WorkerLike, type WorkerReply } from "./one-shot-worker";

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
});

describe("boardJobReply (cli-lot2, D20, D29)", () => {
  const enc = (s: string) => new TextEncoder().encode(s);
  const dec = (b: Uint8Array) => new TextDecoder().decode(b);
  const reader = (tag: string) => ({ ops: () => new Float32Array([tag.length]), texts: () => [tag], warnings: () => [], free: () => undefined });
  const fail = (): never => {
    throw new Error("non appelé");
  };
  function mod(over: { open?: (xml: Uint8Array) => unknown; order?: (m: Uint8Array) => string[]; flip?: (n: string[], d: Uint8Array, e: Uint32Array) => unknown; write?: () => string[] } = {}): FormatsBinding {
    return {
      ContainerReader: { open: fail },
      write_container: fail,
      BoardReader: { open: (xml: Uint8Array) => (over.open ?? ((x: Uint8Array) => reader(dec(x))))(xml) },
      write_board_xml: over.write ?? (() => ["content.xml", "<iwb/>"]),
      notebook_order: over.order ?? (() => []),
      FlipchartReader: { open: over.flip ?? (() => reader("flip")) },
    } as unknown as FormatsBinding;
  }
  const panic = (): never => {
    throw new WebAssembly.RuntimeError("unreachable");
  };
  it("C13 N6 : un .notebook est ordonné par notebookOrder et la liaison notebook_order, sans tri", () => {
    const r = boardJobReply(mod({ order: () => ["page1.svg", "page0.svg"] }), { op: "read", dialect: "notebook", files: [enc("A"), enc("B")], names: ["page0.svg", "page1.svg"], manifest: enc("<m/>"), max: 10 });
    expect((r.data as { parts: BoardPart[] }).parts.map((p) => p.texts[0])).toEqual(["B", "A"]);
    expect(r.transfer).toHaveLength(2);
  });
  it("C13 N6 : sans manifeste, ordre reçu (jamais trié par nom) et avis NOTEBOOK_ORDER_GUESSED", () => {
    const r = boardJobReply(mod(), { op: "read", dialect: "notebook", files: [enc("X10"), enc("X2")], names: ["page10.svg", "page2.svg"], manifest: null, max: 10 });
    const parts = (r.data as { parts: BoardPart[] }).parts;
    expect(parts.map((p) => p.texts[0])).toEqual(["X10", "X2"]);
    expect(parts[0]!.warnings).toEqual([NOTEBOOK_ORDER_GUESSED]);
  });
  it("C13 N11 : un .flipchart est ouvert par FlipchartReader en une part", () => {
    const seen: unknown[] = [];
    const r = boardJobReply(mod({ flip: (n, d, e) => (seen.push(n, d, e), reader("flip")) }), { op: "flipchart", names: ["1.in"], data: new Uint8Array([1]), ends: new Uint32Array([1]) });
    expect((r.data as { parts: BoardPart[] }).parts).toHaveLength(1);
    expect(seen[0]).toEqual(["1.in"]);
  });
  it("write : fichiers de write_board_xml, aucun transfert", () => {
    const r = boardJobReply(mod(), { op: "write", format: "iwb", ops: new Float32Array(), texts: [] });
    expect(r).toEqual({ data: { files: ["content.xml", "<iwb/>"] }, transfer: [] });
  });
  it("erreur connue rendue telle quelle ; inconnue → message d'échec du sens", () => {
    const damaged = mod({ open: () => { throw new Error("fichier endommagé : xml"); } });
    expect(boardJobReply(damaged, { op: "read", dialect: "iwb", files: [enc("x")] }).data).toEqual({ error: "fichier endommagé : xml" });
    const broken = mod({ write: () => { throw new Error("autre"); } });
    expect(boardJobReply(broken, { op: "write", format: "ubz", ops: new Float32Array(), texts: [] }).data).toEqual({ error: BOARD_WRITE_FAILED_MESSAGE });
    const bare = { ContainerReader: { open: fail }, write_container: fail } as unknown as FormatsBinding;
    expect(boardJobReply(bare, { op: "read", dialect: "iwb", files: [] }).data).toEqual({ error: BOARD_FAILED_MESSAGE });
  });
  it("D29 : une panique Wasm (RuntimeError) est relancée, jamais rendue en { error }", () => {
    const panicked = mod({ open: () => { throw new WebAssembly.RuntimeError("unreachable"); } });
    expect(() => boardJobReply(panicked, { op: "read", dialect: "iwb", files: [enc("x")] })).toThrow(WebAssembly.RuntimeError);
  });

  // Chemin de référence (DA7) : le codec de la page, inchangé, reçoit le corps en processus comme `spawn` ; les réponses
  // passent par `checkBoardParts`/`checkBoardFiles` et une panique par `onerror` → message d'échec de `runOnce`.
  // Un appel direct de `BoardReader.open` (patron écarté) rendrait l'erreur brute « unreachable ».
  it("DA7 : createBoardCodec(inlineWorker(boardJobReply)) : parts contrôlées, erreur connue, panique → message d'échec", async () => {
    const codec = (m: FormatsBinding) => createBoardCodec(inlineWorker((job) => boardJobReply(m, job as BoardJob)), 1000);
    const parts = await codec(mod()).read([enc("A"), enc("BB")], "ubz");
    expect(parts.map((p) => p.texts)).toEqual([["A"], ["BB"]]);
    expect(parts[1]!.ops).toEqual(new Float32Array([2]));
    expect((await codec(mod()).readFlipchart([{ path: "1.in", bytes: enc("i") }])).texts).toEqual(["flip"]);
    expect(await codec(mod()).write({ ops: new Float32Array(), texts: [] }, "iwb")).toEqual([{ path: "content.xml", bytes: enc("<iwb/>") }]);
    await expect(codec(mod({ open: () => { throw new Error("fichier endommagé : xml"); } })).read([enc("x")], "iwb")).rejects.toThrow("fichier endommagé : xml");
    await expect(codec(mod({ open: panic })).read([enc("x")], "iwb")).rejects.toThrow(BOARD_FAILED_MESSAGE);
    await expect(codec(mod({ write: panic })).write({ ops: new Float32Array(), texts: [] }, "iwb")).rejects.toThrow(BOARD_WRITE_FAILED_MESSAGE);
  });

  // La coquille de `board-worker.ts`, exécutée (plus lue en texte) : elle poste la réponse de `boardJobReply` telle
  // quelle et attrape la panique relancée pour poster le même `{ error }` qu'avant l'extraction (rien ne change pour la page).
  describe("coquille de board-worker.ts", () => {
    afterEach(() => {
      vi.doUnmock("./board-reader");
      vi.doUnmock("./container-load");
      vi.unstubAllGlobals();
      vi.resetModules();
    });
    async function shell(load: () => Promise<FormatsBinding>, reply?: (m: FormatsBinding, j: BoardJob) => WorkerReply) {
      const posted: unknown[][] = [];
      const scope: { onmessage: ((e: { data: unknown }) => Promise<void>) | null; postMessage: (...a: unknown[]) => void } = {
        onmessage: null,
        postMessage: (...a) => void posted.push(a),
      };
      vi.stubGlobal("self", scope);
      vi.resetModules();
      vi.doMock("./container-load", () => ({ loadFormatsModule: load }));
      if (reply) vi.doMock("./board-reader", async (orig) => ({ ...(await orig<typeof import("./board-reader")>()), boardJobReply: reply }));
      await import("./board-worker");
      return async (job: BoardJob) => {
        await scope.onmessage!({ data: job });
        return posted.splice(0);
      };
    }
    it("le Worker poste la réponse de boardJobReply(module chargé, message), tampons transférés", async () => {
      const m = mod();
      const buf = new ArrayBuffer(4);
      const calls: unknown[][] = [];
      const run = await shell(async () => m, (...a) => (calls.push(a), { data: { parts: "réponse du corps" }, transfer: [buf] }));
      const job: BoardJob = { op: "read", dialect: "iwb", files: [enc("x")] };
      expect(await run(job)).toEqual([[{ parts: "réponse du corps" }, { transfer: [buf] }]]);
      expect(calls).toEqual([[m, job]]);
    });
    it("lecture réelle : les tampons transférés sont ceux des parts", async () => {
      const run = await shell(async () => mod());
      const [[data, opts]] = (await run({ op: "read", dialect: "ubz", files: [enc("A"), enc("B")] })) as [[{ parts: BoardPart[] }, { transfer: ArrayBuffer[] }]];
      expect(data.parts.map((p) => p.texts)).toEqual([["A"], ["B"]]);
      expect(opts.transfer).toEqual(data.parts.map((p) => (p.ops as Float32Array).buffer));
      expect(opts.transfer[0]).toBe((data.parts[0]!.ops as Float32Array).buffer);
    });
    it("D29 : panique relancée par boardJobReply → la coquille poste { error } du sens, comme avant", async () => {
      expect((await (await shell(async () => mod({ open: panic })))({ op: "read", dialect: "iwb", files: [enc("x")] })).map((a) => a[0])).toEqual([{ error: BOARD_FAILED_MESSAGE }]);
      vi.resetModules();
      expect((await (await shell(async () => mod({ write: panic })))({ op: "write", format: "iwb", ops: new Float32Array(), texts: [] })).map((a) => a[0])).toEqual([{ error: BOARD_WRITE_FAILED_MESSAGE }]);
    });
    it("erreur connue et module absent : même { error } qu'avant", async () => {
      const damaged = mod({ open: () => { throw new Error("fichier endommagé : xml"); } });
      expect((await (await shell(async () => damaged))({ op: "read", dialect: "iwb", files: [enc("x")] })).map((a) => a[0])).toEqual([{ error: "fichier endommagé : xml" }]);
      const absent = await shell(() => Promise.reject(new Error("module formats absent")));
      expect((await absent({ op: "flipchart", names: [], data: new Uint8Array(), ends: new Uint32Array() })).map((a) => a[0])).toEqual([{ error: BOARD_FAILED_MESSAGE }]);
    });
  });
});
