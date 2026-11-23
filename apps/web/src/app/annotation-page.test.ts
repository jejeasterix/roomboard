import { describe, expect, it, vi } from "vitest";
import type { CoreDocument } from "../core/api";
import { createAssetStore, type AssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import type { EngineState } from "../engine/engine";
import { ANNOTATION_EVENTS } from "../platform/annotation-port";
import { toBase64 } from "../platform/clipboard";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import type { BoardSession } from "./board-session";
import { createAnnotationPage, passThrough, viewMatrix, type PageChannel } from "./annotation-page";

function channel() {
  const listeners = new Map<string, (p: unknown) => void>();
  const out: { event: string; payload: unknown }[] = [];
  const ch: PageChannel = {
    async emit(event, payload) {
      out.push({ event, payload: JSON.parse(JSON.stringify(payload ?? null)) });
    },
    async listen(event, cb) {
      listeners.set(event, cb as (p: unknown) => void);
      return () => listeners.delete(event);
    },
  };
  const send = (event: string, payload: unknown) => listeners.get(event)?.(JSON.parse(JSON.stringify(payload)));
  return { ch, out, send };
}

function fakeBoard(doc: CoreDocument) {
  let tool = "pen";
  const cbs = new Set<(s: EngineState) => void>();
  const state = () => ({ tool, eraserMode: "partial", canUndo: false, canRedo: false, page: doc.pageIds()[0] ?? "", pageIndex: 0, pageCount: 1, selection: [], selectionBounds: null, selectionUnits: 0, selectionGrouped: false, tableCell: null, tableMerges: 0, tableShades: 0, textFormat: null, elementCount: 0, version: doc.version(), error: null }) as unknown as EngineState;
  const engine = {
    state,
    onState: (cb: (s: EngineState) => void) => { cbs.add(cb); return () => cbs.delete(cb); },
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    key: vi.fn(() => true),
    setTool: vi.fn((t: string) => { tool = t; for (const cb of cbs) cb(state()); }),
    setPenStyle: vi.fn(), setFillColor: vi.fn(), setFillTolerance: vi.fn(), setEraserMode: vi.fn(), undo: vi.fn(), redo: vi.fn(), textFormat: vi.fn(),
    bump: () => { for (const cb of cbs) cb(state()); },
  };
  const board = { doc, engine, stage: {}, activate: vi.fn(), dispose: vi.fn() } as unknown as BoardSession;
  return { board, engine };
}

function setup(o: { hit?: boolean; gate?: boolean; slowRead?: boolean; viewWidth?: number } = {}) {
  const opaques: boolean[] = [];
  const c = channel();
  const boards: ReturnType<typeof fakeBoard>[] = [];
  const ignores: boolean[] = [];
  const gates: Array<() => void> = [];
  let tick: (() => void) | null = null;
  let stops = 0;
  const reads: Array<() => void> = [];
  const calls: string[] = [];
  const page = createAnnotationPage({
    channel: c.ch,
    read: async (bytes) => {
      if (o.slowRead === true) await new Promise<void>((resolve) => reads.push(resolve));
      return { doc: fakeCore.load(bytes), assets: createAssetStore() };
    },
    encode: async (doc: CoreDocument, _a: AssetStore) => doc.save("2026-11-23T00:00:00Z", "0.1.0"),
    makeSession: async (doc, _assets, opaque) => {
      opaques.push(opaque);
      const b = fakeBoard(doc);
      if (o.hit !== undefined) (doc as unknown as { hitTest: () => string | null }).hitTest = () => (o.hit ? "e1" : null);
      boards.push(b);
      return b.board;
    },
    viewWidth: () => o.viewWidth ?? 960,
    cursor: () =>
      (calls.push("cursor"), o.gate === true)
        ? new Promise<readonly [number, number] | null>((resolve) => {
            gates.push(() => resolve([10, 10] as const));
          })
        : Promise.resolve([10, 10] as const),
    ignore: async (on) => {
      calls.push("ignore");
      ignores.push(on);
    },
    every: (_ms, cb) => {
      tick = cb;
      return () => {
        stops += 1;
        tick = null;
      };
    },
  });
  return { page, c, boards, ignores, opaques, gates, reads, calls, tick: async () => { tick?.(); await new Promise((r) => setTimeout(r, 0)); }, stops: () => stops, polling: () => tick !== null };
}
const blank = () => toBase64(fakeCore.blank().save("2026-11-23T00:00:00Z", "0.1.0"));
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("page annotate (C11a, P2, P4, P9, P24)", () => {
  it("passThrough : vrai hors objet, faux sur un objet et pendant un geste tenu", () => {
    expect(passThrough(false, false)).toBe(true);
    expect(passThrough(true, false)).toBe(false);
    expect(passThrough(false, true)).toBe(false);
    expect(passThrough(true, true)).toBe(false);
  });
  it("start : écoute posée puis ready", async () => {
    const { page, c } = setup();
    await page.start();
    expect(c.out.map((m) => m.event)).toEqual([ANNOTATION_EVENTS.ready]);
  });
  it("document : lu depuis le base64, session créée et activée, vue publiée", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    expect(boards).toHaveLength(1);
    expect(boards[0]!.board.activate).toHaveBeenCalled();
    expect(c.out.at(-1)!.event).toBe(ANNOTATION_EVENTS.view);
    expect(c.out.at(-1)!.payload).toMatchObject({ tool: "pen", pageCount: 1 });
  });
  it("base64 illisible : ignoré, aucune session (RF3)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: "@@@" });
    await flush();
    expect(boards).toHaveLength(0);
    expect(page.board()).toBeNull();
    warn.mockRestore();
  });
  it("commande setTool rejouée sur l'hôte local, préréglage du profil reçu", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.profile, BUILTIN_PROFILES[0]);
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "pen", preset: "rouge" });
    expect(boards[0]!.engine.setPenStyle).toHaveBeenCalledWith({ color: "#dc2626", width: 4 });
    expect(boards[0]!.engine.setTool).toHaveBeenCalledWith("pen");
    c.send(ANNOTATION_EVENTS.command, { kind: "runAction", id: "undo" });
    expect(boards[0]!.engine.undo).toHaveBeenCalled();
  });
  it("collect : { id, base64, changed: false } sans trait ; changed vrai après un trait", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.collect, { id: 4 });
    await flush();
    expect(c.out.at(-1)).toMatchObject({ event: ANNOTATION_EVENTS.returned, payload: { id: 4, changed: false } });
    const doc = boards[0]!.board.doc;
    doc.apply({ type: "CommitStroke", page: doc.pageIds()[0]!, points: new Float32Array([0, 10, 0.5, 50, 10, 0.5]), style: { color: "#000000", width: 4 } });
    c.send(ANNOTATION_EVENTS.collect, { id: 5 });
    await flush();
    const back = c.out.at(-1)!.payload as { id: number; base64: string; changed: boolean };
    expect(back).toMatchObject({ id: 5, changed: true });
    expect(typeof back.base64).toBe("string");
  });
  it("nouveau document : ancienne session libérée", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    expect(boards).toHaveLength(2);
    expect(boards[0]!.board.dispose).toHaveBeenCalled();
  });
  it("Échap → demande de sortie ; Ctrl+Z → engine.key", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    const k = (key: string, ctrlKey = false) => ({ key, ctrlKey, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null });
    expect(page.key(k("Escape"))).toBe(true);
    await flush();
    expect(c.out.at(-1)!.event).toBe(ANNOTATION_EVENTS.exitRequest);
    page.key(k("z", true));
    expect(boards[0]!.engine.key).toHaveBeenCalled();
  });
  it("mode souris : sondage toutes les 30 ms, objet → clic capté, geste tenu → capté, arrêt en quittant Sélection", async () => {
    const onObject = setup({ hit: true });
    await onObject.page.start();
    onObject.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    expect(onObject.polling()).toBe(false);
    onObject.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "select" });
    expect(onObject.polling()).toBe(true);
    await onObject.tick();
    expect(onObject.ignores.at(-1)).toBe(false);
    await onObject.tick();
    expect(onObject.ignores).toHaveLength(1); // état inchangé : aucun appel de plus

    const empty = setup({ hit: false });
    await empty.page.start();
    empty.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    empty.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "select" });
    await empty.tick();
    expect(empty.ignores.at(-1)).toBe(true);
    empty.page.pointerDown();
    await empty.tick();
    expect(empty.ignores.at(-1)).toBe(false);
    empty.page.pointerUp();
    empty.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "pen" });
    await flush();
    expect(empty.polling()).toBe(false);
    expect(empty.stops()).toBe(1);
    expect(empty.ignores.at(-1)).toBe(false);
  });
  it("sondage en vol puis Stylo : dernier ignore = false", async () => {
    const s = setup({ hit: false, gate: true });
    await s.page.start();
    s.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    s.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "select" });
    await s.tick(); // sondage lancé, curseur en attente
    s.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "pen" });
    await flush();
    for (const release of s.gates) release();
    await flush();
    expect(s.ignores.at(-1)).toBe(false);
  });
});

describe("page annotate : corrections de relecture (T12)", () => {
  const key = (k: string, o: Record<string, unknown> = {}) => ({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null, ...o });
  it("collect arrête le sondage : plus aucun appel cursor/ignore après la sortie", async () => {
    const s = setup({ hit: false });
    await s.page.start();
    s.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    s.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "select" });
    await s.tick();
    s.c.send(ANNOTATION_EVENTS.collect, { id: 1 });
    await flush();
    expect(s.polling()).toBe(false);
    const before = s.calls.length;
    await s.tick();
    s.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "select" });
    await flush();
    await s.tick();
    expect(s.calls).toHaveLength(before);
    expect(s.polling()).toBe(false);
  });
  it("un nouveau document relance le sondage après une sortie", async () => {
    const s = setup({ hit: false });
    await s.page.start();
    s.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    s.c.send(ANNOTATION_EVENTS.collect, { id: 1 });
    await flush();
    s.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    s.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "select" });
    expect(s.polling()).toBe(true);
  });
  it("commande reçue pendant un chargement : mise en file et rejouée sur la nouvelle session", async () => {
    const s = setup({ slowRead: true });
    await s.page.start();
    s.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    s.reads.shift()!();
    await flush();
    s.c.send(ANNOTATION_EVENTS.document, { base64: blank() }); // rentrée : lecture lente
    await flush();
    s.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "rect" });
    expect(s.boards[0]!.engine.setTool).not.toHaveBeenCalledWith("rect");
    s.reads.shift()!();
    await flush();
    expect(s.boards).toHaveLength(2);
    expect(s.boards[1]!.engine.setTool).toHaveBeenCalledWith("rect");
    expect(s.boards[0]!.engine.setTool).not.toHaveBeenCalledWith("rect");
  });
  it("deux chargements concurrents : une seule session reste, l'autre est libérée", async () => {
    const s = setup({ slowRead: true });
    await s.page.start();
    s.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    s.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    for (const r of s.reads.splice(0)) r();
    await flush();
    const alive = s.boards.filter((b) => (b.board.dispose as ReturnType<typeof vi.fn>).mock.calls.length === 0);
    expect(alive).toHaveLength(1);
    expect(s.page.board()).toBe(alive[0]!.board);
  });
  it("Échap pendant une composition IME ou dans un champ éditable : pas de sortie", async () => {
    const s = setup();
    await s.page.start();
    s.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    const n = s.c.out.length;
    s.page.key(key("Escape", { isComposing: true }));
    s.page.key(key("Escape", { target: { tagName: "INPUT" } }));
    s.page.key(key("Escape", { target: { isContentEditable: true } }));
    await flush();
    expect(s.c.out.filter((m) => m.event === ANNOTATION_EVENTS.exitRequest)).toHaveLength(0);
    expect(s.c.out).toHaveLength(n);
  });
});

describe("page annotate (C11b, P13, P15, P16)", () => {
  it("viewMatrix : monde → page envoyée (PAGE_WIDTH / largeur de vue) ; largeur nulle : identité", () => {
    expect(viewMatrix({ zoom: 0.5, tx: 30, ty: 16 }, 960)).toEqual([1, 0, 0, 1, 60, 32]);
    expect(viewMatrix({ zoom: 1, tx: 0, ty: 0 }, 1920)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(viewMatrix({ zoom: 2, tx: 5, ty: 5 }, 0)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(viewMatrix({ zoom: 2, tx: 5, ty: 5 }, Number.NaN)).toEqual([1, 0, 0, 1, 0, 0]);
  });
  it("opaque : session opaque, aucun sondage en Sélection, clic à travers coupé (P15)", async () => {
    const { page, c, boards, ignores, opaques, polling } = setup({ hit: false });
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), opaque: true });
    await flush();
    expect(opaques).toEqual([true]);
    expect(ignores).toEqual([false]);
    boards[0]!.engine.setTool("select");
    await flush();
    expect(polling()).toBe(false);
    expect(ignores.includes(true)).toBe(false);
  });
  it("sans opaque (charge d'avant C11b) : session transparente, Sélection sonde comme en C11a", async () => {
    const { page, c, boards, opaques, polling } = setup({ hit: false });
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    expect(opaques).toEqual([false]);
    boards[0]!.engine.setTool("select");
    await flush();
    expect(polling()).toBe(true);
  });
  it("figé puis vivant (P16) : un nouveau document sans opaque rend le sondage en Sélection", async () => {
    const { page, c, boards, opaques, polling } = setup({ hit: false });
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), opaque: true });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), opaque: false });
    await flush();
    expect(opaques).toEqual([true, false]);
    boards.at(-1)!.engine.setTool("select");
    await flush();
    expect(polling()).toBe(true);
  });
  it("collect rend la vue (P13) : page montrée 0, matrice PAGE_WIDTH / largeur de vue", async () => {
    const { page, c } = setup({ viewWidth: 960 });
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.collect, { id: 9 });
    await flush();
    expect(c.out.at(-1)).toMatchObject({
      event: ANNOTATION_EVENTS.returned,
      payload: { id: 9, view: { page: 0, matrix: [2, 0, 0, 2, 0, 0] } },
    });
  });
});
