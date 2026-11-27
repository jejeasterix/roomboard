/**
 * Amorce de la fenêtre `annotate` (C11a, P1, P13, P14) : un cœur Wasm à elle, une session de dessin transparente, la
 * page d'annotation branchée sur les événements de la coque. Ni fichier ni boîte : le document arrive en base64 et
 * repart en base64 (DA1) ; aucun point d'encre ne sort de la page (GC1).
 */
import { createAnnotationPage, mountAnnotationFrame } from "./app/annotation-page";
import { createBoardSession, type SessionShared } from "./app/board-session";
import { createContainerIO } from "./app/container-io";
import type { CoreFactory } from "./core/api";
import { createAssetStore } from "./core/asset-store";
import type { KeyLike } from "./engine/input/keys";
import { detectSupport } from "./engine/input/support";
import { createSettingsStore, parseSettings } from "./engine/settings";
import { measureOrFallback } from "./engine/text-layout";
import { MAIN_LABEL } from "./platform/annotation-port";
import { createPageCodec } from "./platform/container";
import { loadFormatsModule } from "./platform/container-load";
import { APP_VERSION } from "./platform/controller";
import type { TauriIpc } from "./platform/host-tauri";

export async function startAnnotateWindow(core: CoreFactory, ipc: TauriIpc, keyOf: (e: KeyboardEvent) => KeyLike): Promise<void> {
  const emitTo = ipc.emitTo;
  if (emitTo === undefined) throw new Error("événements entre fenêtres indisponibles");
  document.documentElement.dataset["fenetre"] = "annotation";
  const root = document.getElementById("app");
  if (root === null) throw new Error("élément absent : #app");
  const stages = document.createElement("main");
  stages.className = "rb-stages";
  root.append(stages);
  // design-l4 (L4-12) : cadre violet de 3 px, élément du DOM de cette fenêtre ; montré ou caché par chaque document reçu.
  const frame = mountAnnotationFrame(document);
  const parsed = parseSettings(window.location.search);
  const measureCtx = document.createElement("canvas").getContext("2d");
  const measure = measureOrFallback(measureCtx);
  // OG25 (déc. 30) : gomme automatique à la paume, reçue avec chaque document ; lue à chaque pose par la session.
  let palmEraser = true;
  const shared: SessionShared = {
    container: stages,
    settings: createSettingsStore(parsed.settings),
    parsed,
    support: detectSupport(),
    measure,
    coreVersion: core.version(),
    transparent: true,
    palmEraser: () => palmEraser,
  };
  const io = createContainerIO({
    core,
    codec: createPageCodec(loadFormatsModule),
    say: async (m) => console.warn(`RoomBoard (annotation) : ${m}`),
    makeAssets: () => createAssetStore(),
  });
  const page = createAnnotationPage({
    channel: {
      emit: <T>(event: string, payload: T) => emitTo<T>(MAIN_LABEL, event, payload),
      listen: <T>(event: string, cb: (payload: T) => void) => ipc.listen<T>(event, (e) => cb(e.payload)),
    },
    read: async (bytes) => {
      const r = await io.read("annotation.roomboard", bytes, "document");
      return r === null ? null : { doc: r.doc, assets: r.assets };
    },
    encode: (doc, assets) => io.encode(doc, assets, new Date().toISOString(), APP_VERSION, { kind: "document" }),
    makeSession: (doc, assets, opaque) => createBoardSession(doc, { ...shared, transparent: !opaque }, assets),
    cursor: () => ipc.invoke<[number, number] | null>("annotation_cursor"),
    ignore: (on) => ipc.invoke<void>("annotation_ignore", { ignore: on }),
    frame,
    palmEraser: (on) => {
      palmEraser = on;
    },
  });
  window.addEventListener("keydown", (e) => {
    if (page.key(keyOf(e))) e.preventDefault();
  });
  window.addEventListener("pointerdown", () => page.pointerDown(), true);
  window.addEventListener("pointerup", () => page.pointerUp(), true);
  window.addEventListener("pointercancel", () => page.pointerUp(), true);
  // P18 : un dépôt sur `annotate` est ignoré.
  for (const type of ["dragover", "drop"] as const) window.addEventListener(type, (e) => e.preventDefault());
  await page.start();
}
