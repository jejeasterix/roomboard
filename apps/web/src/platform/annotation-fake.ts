/**
 * Faux hôte des fenêtres d'annotation (C11a, P28, P29) : tests, et `?annotation=faux` hors coque. Chaque message passe
 * par `jsonChannel` (JSON aller-retour), comme un événement de la coque : un `Uint8Array` y casserait. Il n'y a pas de
 * seconde page : le document reçu est gardé, et rendu tel quel à la sortie (ou transformé par `draw` dans les tests).
 * L'état est publié sur `dataset` (`document.body.dataset` pour l'essai Playwright).
 */
import type { ToolbarView } from "../ui/item-state";
import { TOOL_TABLE, type Profile } from "../toolbar";
import {
  frameField,
  isViewport,
  type AnnotationCommand,
  type AnnotationPlace,
  type AnnotationViewport,
  type AnnotationWindows,
  type CaptureOutcome,
  type DocumentPayload,
  type PointerMode,
  type ReturnedPayload,
} from "./annotation-port";
import { fromBase64, toBase64 } from "./clipboard";

export const jsonChannel = <T>(m: T): T => JSON.parse(JSON.stringify(m)) as T;

export interface FakeAnnotationOptions {
  readonly screens?: number;
  readonly supported?: boolean;
  readonly reason?: "wayland" | null;
  /** Ce que `annotate` aurait tracé (tests) ; absent : document rendu tel quel, `changed: false`. */
  readonly draw?: (bytes: Uint8Array) => Promise<Uint8Array>;
  /** `collect` ne répond jamais (délai de sortie). */
  readonly mute?: boolean;
  readonly dataset?: Record<string, string | undefined>;
  /** C11b (P30) : résultat de `capture` ; absent : `FAKE_CAPTURE` (PNG 320 × 180 annoncé). */
  readonly capture?: CaptureOutcome | (() => Promise<CaptureOutcome>);
  /** C11b (P18) : `support().transparent` ; absent : vrai. */
  readonly transparent?: boolean;
  /** C11b (P13) : vue rendue par `annotate` à la collecte (tests) ; illisible : ignorée comme par la coque. */
  readonly view?: unknown;
}

export interface FakeAnnotationWindows extends AnnotationWindows {
  readonly log: string[];
  readonly sent: AnnotationCommand[];
  received(): Uint8Array | null;
  profiles(): number;
  /** Échap dans `annotate`, ou `CloseRequested` de la coque. */
  requestExit(): void;
  emitView(v: ToolbarView): void;
  /** C11b : `opaque` du dernier `enter` ou `load` ; null avant. */
  opaque(): boolean | null;
  /** C11b : nombre de captures demandées. */
  captures(): number;
  /** design-l4 (L4-13) : cadre du dernier `enter` ou `load` (absent de la charge : vrai) ; null avant. */
  frame(): boolean | null;
}

/** C11b (P30) : capture par défaut du faux hôte (tests) : 8 octets d'en-tête PNG, 320 × 180 annoncés. */
export const FAKE_CAPTURE = Object.freeze({ width: 320, height: 180 });
const defaultCapture = (): CaptureOutcome => ({
  ok: true,
  image: { blob: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), width: FAKE_CAPTURE.width, height: FAKE_CAPTURE.height },
});

export function createFakeAnnotationWindows(o: FakeAnnotationOptions = {}): FakeAnnotationWindows {
  const screens = Math.max(1, o.screens ?? 1);
  const ds = o.dataset ?? {};
  const log: string[] = [];
  const sent: AnnotationCommand[] = [];
  const views = new Set<(v: ToolbarView) => void>();
  const exits = new Set<() => void>();
  let received: Uint8Array | null = null;
  let profiles = 0;
  let entries = 0;
  let lastOpaque: boolean | null = null;
  let captures = 0;
  let lastFrame: boolean | null = null;
  let view: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
  const clamp = (s: number | null): number => (s === null || s < 0 || s >= screens ? 0 : s);
  const publish = (v: ToolbarView): void => {
    view = jsonChannel(v);
    for (const cb of [...views]) cb(view);
  };
  const w: FakeAnnotationWindows = {
    log,
    sent,
    received: () => received,
    profiles: () => profiles,
    async support() {
      return jsonChannel({ supported: o.supported ?? true, reason: o.reason ?? null, screens, transparent: o.transparent ?? true });
    },
    async enter(p) {
      const screen = clamp(p.screen);
      log.push(`enter ${screen}`);
      jsonChannel<Profile>(p.profile);
      profiles += 1;
      const payload = jsonChannel<DocumentPayload>({ base64: toBase64(p.document), opaque: p.opaque === true, ...frameField(p) });
      received = fromBase64(payload.base64);
      lastOpaque = payload.opaque === true;
      lastFrame = payload.frame !== false;
      entries += 1;
      Object.assign(ds, {
        annotation: "1",
        pointeur: "draw",
        annotationRecu: String(received?.length ?? 0),
        annotationEntrees: String(entries),
        annotationOpaque: lastOpaque ? "1" : "0",
        annotationCadre: lastFrame ? "1" : "0",
        annotationBande: `${p.dock}:${p.thickness}`,
      });
      return screen;
    },
    async load(p) {
      log.push(`load ${p.opaque ? "opaque" : "transparent"}`);
      const payload = jsonChannel<DocumentPayload>({ base64: toBase64(p.document), opaque: p.opaque, ...frameField(p) });
      received = fromBase64(payload.base64);
      lastOpaque = payload.opaque === true;
      lastFrame = payload.frame !== false;
      Object.assign(ds, { annotationRecu: String(received?.length ?? 0), annotationOpaque: lastOpaque ? "1" : "0", annotationCadre: lastFrame ? "1" : "0" });
    },
    async capture() {
      log.push("capture");
      captures += 1;
      ds["annotationCaptures"] = String(captures);
      const c = o.capture;
      return c === undefined ? defaultCapture() : typeof c === "function" ? c() : c;
    },
    async place(p: AnnotationPlace) {
      const screen = clamp(p.screen);
      log.push(`place ${screen}`);
      ds["annotationBande"] = `${p.dock}:${p.thickness}`;
      return screen;
    },
    collect() {
      log.push("collect");
      if (o.mute === true) return new Promise(() => undefined);
      return (async () => {
        const doc = received ?? new Uint8Array(0);
        const bytes = o.draw === undefined ? doc : await o.draw(doc);
        const r = jsonChannel<ReturnedPayload>({
          id: 0,
          base64: toBase64(bytes),
          changed: o.draw !== undefined,
          ...(o.view === undefined ? {} : { view: o.view as AnnotationViewport }),
        });
        const back = fromBase64(r.base64);
        if (back === null) return null;
        ds["annotationRendu"] = String(back.length);
        return { bytes: back, changed: r.changed, ...(isViewport(r.view) ? { view: r.view } : {}) };
      })();
    },
    async leave() {
      log.push("leave");
      ds["annotation"] = "0";
    },
    async close() {
      log.push("close");
      received = null;
      ds["annotation"] = "0";
    },
    async pointer(mode: PointerMode) {
      log.push(`pointer ${mode}`);
      ds["pointeur"] = mode;
    },
    sendProfile(p) {
      jsonChannel(p);
      profiles += 1;
    },
    send(m) {
      const msg = jsonChannel(m);
      sent.push(msg);
      if (msg.kind === "setTool" && Object.hasOwn(TOOL_TABLE, msg.tool)) publish({ ...view, tool: TOOL_TABLE[msg.tool]!.choice });
    },
    onView(cb) {
      views.add(cb);
      return () => {
        views.delete(cb);
      };
    },
    onExitRequest(cb) {
      exits.add(cb);
      return () => {
        exits.delete(cb);
      };
    },
    async relaunchCompat() {
      log.push("relaunch");
    },
    requestExit() {
      for (const cb of [...exits]) cb();
    },
    emitView: publish,
    opaque: () => lastOpaque,
    captures: () => captures,
    frame: () => lastFrame,
  };
  return w;
}
