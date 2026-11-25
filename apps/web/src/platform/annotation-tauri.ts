/**
 * Hôte des fenêtres d'annotation dans la coque (C11a, DA2, DA3, P13, P21) : commandes `annotation_*` et événements
 * `emitTo` / `listen`. Les écoutes sont posées une fois, avant la première commande (sinon `ready` se perdrait). Le
 * document part en base64 ; une demande de document porte un identifiant, une réponse d'une autre demande est ignorée.
 */
import type { ToolbarView } from "../ui/item-state";
import {
  ANNOTATE_LABEL,
  ANNOTATION_EVENTS,
  captureFailureOf,
  frameField,
  isViewport,
  READY_TIMEOUT_MS,
  type AnnotationSupport,
  type AnnotationWindows,
  type CollectPayload,
  type DocumentPayload,
  type Returned,
  type ReturnedPayload,
} from "./annotation-port";
import { fromBase64, toBase64 } from "./clipboard";
import { grantedFile } from "./host-tauri";

/** Cause d'un rejet de la coque (chaîne) ou d'une lecture (`Error`). */
const causeOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export interface AnnotationIpc {
  invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  listen<T>(event: string, cb: (e: { readonly payload: T }) => void): Promise<() => void>;
  emitTo<T>(target: string, event: string, payload: T): Promise<void>;
}

export function createTauriAnnotationWindows(ipc: AnnotationIpc, readyTimeoutMs: number = READY_TIMEOUT_MS): AnnotationWindows {
  const views = new Set<(v: ToolbarView) => void>();
  const exits = new Set<() => void>();
  let ready = false;
  let onReady: (() => void) | null = null;
  let nextId = 1;
  let pending: { readonly id: number; readonly resolve: (r: Returned | null) => void } | null = null;
  const subscribed = Promise.all([
    ipc.listen<unknown>(ANNOTATION_EVENTS.ready, () => {
      ready = true;
      onReady?.();
      onReady = null;
    }),
    ipc.listen<ToolbarView>(ANNOTATION_EVENTS.view, (e) => {
      for (const cb of [...views]) cb(e.payload);
    }),
    ipc.listen<ReturnedPayload>(ANNOTATION_EVENTS.returned, (e) => {
      const p = pending;
      if (p === null || e.payload?.id !== p.id) return;
      pending = null;
      const bytes = typeof e.payload.base64 === "string" ? fromBase64(e.payload.base64) : null;
      const view = isViewport(e.payload.view) ? e.payload.view : null;
      p.resolve(bytes === null ? null : { bytes, changed: e.payload.changed === true, ...(view === null ? {} : { view }) });
    }),
    ipc.listen<unknown>(ANNOTATION_EVENTS.exitRequest, () => {
      for (const cb of [...exits]) cb();
    }),
  ]);
  const waitReady = (): Promise<void> =>
    ready
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            onReady = null;
            reject(new Error("fenêtre d'annotation muette"));
          }, readyTimeoutMs);
          onReady = () => {
            clearTimeout(timer);
            resolve();
          };
        });
  const placeArgs = (o: { screen: number | null; dock: string; thickness: number }) => ({ screen: o.screen, dock: o.dock, thickness: o.thickness });

  return {
    async support() {
      await subscribed;
      return ipc.invoke<AnnotationSupport>("annotation_support");
    },
    async enter(o) {
      await subscribed;
      const screen = await ipc.invoke<number>("annotation_enter", placeArgs(o));
      await waitReady();
      await ipc.emitTo(ANNOTATE_LABEL, ANNOTATION_EVENTS.profile, o.profile);
      await ipc.emitTo<DocumentPayload>(ANNOTATE_LABEL, ANNOTATION_EVENTS.document, { base64: toBase64(o.document), opaque: o.opaque === true, ...frameField(o) });
      return screen;
    },
    async place(o) {
      await subscribed;
      return ipc.invoke<number>("annotation_enter", placeArgs(o));
    },
    async load(o) {
      await subscribed;
      await waitReady();
      await ipc.emitTo<DocumentPayload>(ANNOTATE_LABEL, ANNOTATION_EVENTS.document, { base64: toBase64(o.document), opaque: o.opaque, ...frameField(o) });
    },
    async capture(o) {
      await subscribed;
      type Shot = { readonly id: string; readonly path: string; readonly size: number; readonly width: number; readonly height: number };
      let shot: Shot;
      try {
        shot = await ipc.invoke<Shot>("annotation_capture", placeArgs(o));
      } catch (e) {
        return { ok: false, reason: captureFailureOf(e) };
      }
      try {
        // P24 : le PNG accordé est lu par morceaux (`read_granted_file`), puis toujours libéré.
        const raw = await grantedFile(ipc, shot.path, shot.size).blob();
        return { ok: true, image: { blob: new Blob([raw], { type: "image/png" }), width: shot.width, height: shot.height } };
      } catch (e) {
        console.warn(`RoomBoard : capture du bureau non lue (${causeOf(e)})`);
        return { ok: false, reason: "failed" };
      } finally {
        await ipc.invoke<void>("release_capture", { id: shot.id }).catch((e: unknown) => {
          console.warn(`RoomBoard : capture du bureau non libérée (${causeOf(e)})`);
        });
      }
    },
    collect() {
      return new Promise<Returned | null>((resolve) => {
        const id = nextId++;
        pending?.resolve(null);
        pending = { id, resolve };
        void subscribed.then(() => ipc.emitTo<CollectPayload>(ANNOTATE_LABEL, ANNOTATION_EVENTS.collect, { id }));
      });
    },
    leave: () => ipc.invoke<void>("annotation_exit"),
    async close() {
      ready = false;
      await ipc.invoke<void>("annotation_close");
    },
    pointer: (mode) => ipc.invoke<void>("annotation_ignore", { ignore: mode === "mouse" }),
    sendProfile(p) {
      void ipc.emitTo(ANNOTATE_LABEL, ANNOTATION_EVENTS.profile, p);
    },
    send(m) {
      void ipc.emitTo(ANNOTATE_LABEL, ANNOTATION_EVENTS.command, m);
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
    relaunchCompat: () => ipc.invoke<void>("relaunch_compat"),
  };
}
