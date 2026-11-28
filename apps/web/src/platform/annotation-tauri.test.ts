import { afterEach, describe, expect, it, vi } from "vitest";
import { ANNOTATION_EVENTS } from "./annotation-port";
import { READ_CHUNK } from "./host-tauri";
import { createTauriAnnotationWindows, type AnnotationIpc } from "./annotation-tauri";
import { toBase64 } from "./clipboard";
import { BUILTIN_PROFILES } from "../toolbar-profiles";

const SHOT = { id: "4242-1", path: "/cache/captures/4242-1.png", size: 3, width: 320, height: 180 };
function fakeIpc(o: { autoReady?: boolean; shot?: typeof SHOT | string; bytes?: Uint8Array | null; transparent?: boolean; release?: string } = {}) {
  const listeners = new Map<string, Set<(e: { payload: unknown }) => void>>();
  const invokes: [string, unknown][] = [];
  const emitted: { target: string; event: string; payload: unknown }[] = [];
  const fire = (event: string, payload: unknown): void => {
    for (const cb of listeners.get(event) ?? []) cb({ payload: JSON.parse(JSON.stringify(payload ?? null)) });
  };
  const ipc: AnnotationIpc = {
    async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
      invokes.push([cmd, args]);
      if (cmd === "annotation_enter") {
        if (o.autoReady !== false) queueMicrotask(() => fire(ANNOTATION_EVENTS.ready, {}));
        return 0 as T;
      }
      if (cmd === "annotation_support") return { supported: true, reason: null, screens: 2, ...(o.transparent === undefined ? {} : { transparent: o.transparent }) } as T;
      if (cmd === "annotation_capture") {
        if (typeof o.shot === "string") throw o.shot;
        return (o.shot ?? SHOT) as T;
      }
      if (cmd === "read_granted_file") {
        if (o.bytes === null) throw "lecture impossible";
        return (o.bytes ?? new Uint8Array([1, 2, 3])).slice().buffer as T;
      }
      if (cmd === "release_capture" && o.release !== undefined) throw o.release;
      return undefined as T;
    },
    async listen<T>(event: string, cb: (e: { readonly payload: T }) => void) {
      const set = listeners.get(event) ?? new Set();
      set.add(cb as (e: { payload: unknown }) => void);
      listeners.set(event, set);
      return () => set.delete(cb as (e: { payload: unknown }) => void);
    },
    async emitTo<T>(target: string, event: string, payload: T) {
      emitted.push({ target, event, payload: JSON.parse(JSON.stringify(payload)) });
    },
  };
  return { ipc, invokes, emitted, fire };
}
const place = { screen: null, dock: "top" as const, thickness: 48 };
const doc = new Uint8Array([80, 75, 3, 4, 255]);

afterEach(() => vi.useRealTimers());

describe("hôte des fenêtres de la coque (C11a, P13, P21)", () => {
  it("enter : annotation_enter, attend ready, puis profil puis document en base64 (charge JSON sans Uint8Array)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    expect(await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! })).toBe(0);
    expect(f.invokes[0]).toEqual(["annotation_enter", { screen: null, dock: "top", thickness: 48 }]);
    expect(f.emitted.map((e) => [e.target, e.event])).toEqual([
      ["annotate", ANNOTATION_EVENTS.profile],
      ["annotate", ANNOTATION_EVENTS.document],
    ]);
    expect(f.emitted[1]!.payload).toEqual({ base64: toBase64(doc), opaque: false });
  });
  it("réentrée sans recréation : pas d'attente d'un nouveau ready", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! });
    const g = fakeIpc({ autoReady: false });
    f.ipc.invoke = g.ipc.invoke; // plus aucun ready ne viendra
    await expect(w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! })).resolves.toBe(0);
  });
  it("close : annotation_close, puis la prochaine entrée attend ready (muette → rejet)", async () => {
    vi.useFakeTimers();
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc, 1000);
    await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! });
    await w.close();
    expect(f.invokes.at(-1)).toEqual(["annotation_close", undefined]);
    f.ipc.invoke = fakeIpc({ autoReady: false }).ipc.invoke;
    const p = w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! });
    const caught = p.catch((e: unknown) => (e as Error).message);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await caught).toBe("fenêtre d'annotation muette");
  });
  it("collect : réponse d'id égal rendue ; réponse d'un autre id ignorée (RF1, P4)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const p = w.collect();
    await vi.waitFor(() => expect(f.emitted.at(-1)?.event).toBe(ANNOTATION_EVENTS.collect));
    const asked = f.emitted.at(-1)!;
    expect(asked.event).toBe(ANNOTATION_EVENTS.collect);
    const id = (asked.payload as { id: number }).id;
    f.fire(ANNOTATION_EVENTS.returned, { id: id - 1, base64: toBase64(new Uint8Array([9])), changed: true });
    f.fire(ANNOTATION_EVENTS.returned, { id, base64: toBase64(doc), changed: true });
    expect(await p).toEqual({ bytes: doc, changed: true });
  });
  it("collect : base64 illisible → null", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const p = w.collect();
    await vi.waitFor(() => expect(f.emitted.at(-1)?.event).toBe(ANNOTATION_EVENTS.collect));
    const id = (f.emitted.at(-1)!.payload as { id: number }).id;
    f.fire(ANNOTATION_EVENTS.returned, { id, base64: "@@@", changed: true });
    expect(await p).toBeNull();
  });
  it("pointer : annotation_ignore { ignore } ; leave : annotation_exit ; place : annotation_enter sans document", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    await w.pointer("mouse");
    await w.pointer("draw");
    await w.leave();
    await w.place({ screen: 1, dock: "left", thickness: 60 });
    expect(f.invokes).toEqual([
      ["annotation_ignore", { ignore: true }],
      ["annotation_ignore", { ignore: false }],
      ["annotation_exit", undefined],
      ["annotation_enter", { screen: 1, dock: "left", thickness: 60 }],
    ]);
  });
  it("onView et onExitRequest relayés ; send et sendProfile émis vers annotate", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const views: string[] = [];
    let exits = 0;
    w.onView((v) => views.push(v.tool));
    w.onExitRequest(() => (exits += 1));
    await w.support();
    f.fire(ANNOTATION_EVENTS.view, { tool: "select", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 });
    f.fire(ANNOTATION_EVENTS.exitRequest, {});
    w.send({ kind: "runAction", id: "undo" });
    w.sendProfile(BUILTIN_PROFILES[0]!);
    await Promise.resolve();
    expect(views).toEqual(["select"]);
    expect(exits).toBe(1);
    expect(f.emitted.map((e) => e.event)).toEqual([ANNOTATION_EVENTS.command, ANNOTATION_EVENTS.profile]);
  });
  it("support relayé ; relaunchCompat → relaunch_compat", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    expect(await w.support()).toEqual({ supported: true, reason: null, screens: 2 });
    await w.relaunchCompat();
    expect(f.invokes.at(-1)).toEqual(["relaunch_compat", undefined]);
  });
});

describe("hôte des fenêtres de la coque (C11b, P24, P27, P28)", () => {
  it("capture : annotation_capture (écran, côté, épaisseur), lecture du fichier accordé, puis release_capture ; PNG 320 × 180", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const r = await w.capture(place);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect([r.image.width, r.image.height, r.image.blob.type, r.image.blob.size]).toEqual([320, 180, "image/png", 3]);
    expect(f.invokes.map(([c]) => c)).toEqual(["annotation_capture", "read_granted_file", "release_capture"]);
    expect(f.invokes[0]![1]).toEqual({ screen: null, dock: "top", thickness: 48 });
    expect(f.invokes[1]![1]).toEqual({ path: SHOT.path, offset: 0, len: READ_CHUNK });
    expect(f.invokes[2]![1]).toEqual({ id: SHOT.id });
  });
  it("capture refusée par la coque : denied, wayland ; tout autre rejet → failed ; aucun release (aucun fichier)", async () => {
    for (const [shot, reason] of [["denied", "denied"], ["wayland", "wayland"], ["io", "failed"]] as const) {
      const f = fakeIpc({ shot });
      expect(await createTauriAnnotationWindows(f.ipc).capture(place)).toEqual({ ok: false, reason });
      expect(f.invokes.some(([c]) => c === "release_capture")).toBe(false);
    }
  });
  it("lecture du fichier en échec : failed, et release_capture appelé quand même (P24)", async () => {
    const f = fakeIpc({ bytes: null });
    expect(await createTauriAnnotationWindows(f.ipc).capture(place)).toEqual({ ok: false, reason: "failed" });
    expect(f.invokes.at(-1)).toEqual(["release_capture", { id: SHOT.id }]);
  });
  it("revue C : lecture du PNG et release_capture en échec : chaque cause est dite par console.warn, le refus reste failed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const f = fakeIpc({ bytes: null, release: "fichier introuvable" });
      expect(await createTauriAnnotationWindows(f.ipc).capture(place)).toEqual({ ok: false, reason: "failed" });
      const said = warn.mock.calls.map((c) => String(c[0]));
      expect(said).toHaveLength(2);
      expect(said[0]).toContain("lecture impossible");
      expect(said[1]).toContain("fichier introuvable");
    } finally {
      warn.mockRestore();
    }
  });
  it("enter porte opaque (vrai sur demande) ; load renvoie le document sans annotation_enter (P15, P28)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]!, opaque: true });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: true });
    const enters = f.invokes.filter(([c]) => c === "annotation_enter").length;
    await w.load({ document: new Uint8Array([7]), opaque: false });
    expect(f.emitted.at(-1)).toEqual({ target: "annotate", event: ANNOTATION_EVENTS.document, payload: { base64: toBase64(new Uint8Array([7])), opaque: false } });
    expect(f.invokes.filter(([c]) => c === "annotation_enter").length).toBe(enters);
  });
  it("design-l4 (L4-13) : frame dans la charge du document seulement s'il est donné (enter et load)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]!, frame: false });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: false, frame: false });
    await w.load({ document: doc, opaque: true, frame: true });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: true, frame: true });
    await w.load({ document: doc, opaque: false });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: false });
  });
  it("OG25 : palmEraser dans la charge du document seulement s'il est donné (enter et load)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]!, palmEraser: false });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: false, palmEraser: false });
    await w.load({ document: doc, opaque: true, palmEraser: true });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: true, palmEraser: true });
    await w.load({ document: doc, opaque: false });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: false });
  });
  it("collect : vue lisible rendue ; vue illisible ignorée (RF5)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const p = w.collect();
    await vi.waitFor(() => expect(f.emitted.at(-1)?.event).toBe(ANNOTATION_EVENTS.collect));
    const id = (f.emitted.at(-1)!.payload as { id: number }).id;
    f.fire(ANNOTATION_EVENTS.returned, { id, base64: toBase64(doc), changed: true, view: { page: 1, matrix: [2, 0, 0, 2, 3, 4] } });
    expect(await p).toEqual({ bytes: doc, changed: true, view: { page: 1, matrix: [2, 0, 0, 2, 3, 4] } });
    const q = w.collect();
    await vi.waitFor(() => expect((f.emitted.at(-1)!.payload as { id: number }).id).toBe(id + 1));
    f.fire(ANNOTATION_EVENTS.returned, { id: id + 1, base64: toBase64(doc), changed: true, view: { page: -1, matrix: [Number.NaN, 0, 0, 1, 0, 0] } });
    const back = await q;
    expect(back).toEqual({ bytes: doc, changed: true });
  });
  it("support : transparent relayé ; absent (coque d'avant C11b) laissé absent", async () => {
    expect((await createTauriAnnotationWindows(fakeIpc({ transparent: false }).ipc).support()).transparent).toBe(false);
    expect((await createTauriAnnotationWindows(fakeIpc().ipc).support()).transparent).toBeUndefined();
  });
});
