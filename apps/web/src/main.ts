/**
 * Amorce de l'application (lot 5b, T95) : cœur Wasm, réglages lus dans l'adresse (`?echelons=`, `?paume=`, `?doigt=`,
 * engine/settings.ts), hôte de fichiers, premier document, profils de barre, capacités du poste, espace de travail
 * (un onglet = une `BoardSession`, T93/T98), puis l'interface SolidJS (`ui/App.tsx`). Les touches sont écoutées une
 * fois ici et vont à l'onglet actif. `?banc` ajoute le banc du lot 1 rejoué sur l'onglet actif.
 */
import { createBoardSession, type SessionShared } from "./app/board-session";
import { createWorkspace } from "./app/workspace";
import { createWasmCore } from "./core/wasm-core";
import type { KeyLike } from "./engine/input/keys";
import { detectSupport } from "./engine/input/support";
import { createSettingsStore, parseSettings } from "./engine/settings";
import { measureWith, type Measure } from "./engine/text-layout";
import { browserFallbackDeps } from "./platform/host-repli";
import { createPageCodec } from "./platform/container";
import { loadFormatsModule } from "./platform/container-load";
import { launchFiles, loadTauriPorts, onQuitRequested, quitApp, type TauriIpc } from "./platform/host-tauri";
import { prepareHost, startDocument } from "./platform/mount";
import { browserSystemClipboard, createClipboard, handleCopy } from "./platform/clipboard";
import { handlePaste } from "./platform/paste";
import { createSheetReader, type WorkerLike } from "./platform/sheet-reader";
import { createIdbPendingStore, createUnavailablePendingStore } from "./platform/pending";
import { createTauriProfileFiles, createWebProfileFiles } from "./platform/profile-files";
import { createTauriTypedFiles, createWebTypedFiles, RBITEM_TYPE } from "./platform/typed-files";
import { browserKeyValue, createProfileStore } from "./profile-store";
import { detectPlatform, runtimeCapabilities } from "./runtime-capabilities";
import { BUILTIN_PROFILES } from "./toolbar-profiles";
import { createActiveProfile } from "./ui/active-profile";
import { mountApp, showStartError } from "./ui/App";
import init, * as wasm from "./wasm/roomboard_wasm";

function keyOf(e: KeyboardEvent): KeyLike {
  return {
    key: e.key,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    isComposing: e.isComposing,
    target: e.target instanceof HTMLElement ? e.target : null,
  };
}

async function start(): Promise<void> {
  await init();
  const core = createWasmCore(wasm);
  const parsed = parseSettings(window.location.search);
  const settings = createSettingsStore(parsed.settings);
  // Fichiers (D26) : le premier onglet reprend le fichier mis en attente par une version précédente, sinon une page vide.
  const pending =
    typeof window.indexedDB === "undefined"
      ? createUnavailablePendingStore("ce navigateur ne peut pas garder le fichier pendant le rechargement (IndexedDB absent)")
      : createIdbPendingStore(window.indexedDB);
  const first = await startDocument(core, pending);
  const prepared = await prepareHost(window);
  const tauri = prepared.kind === "tauri";
  // `PreparedHost` n'expose ni l'ipc ni les boîtes : enrobages sans état de la coque, repris ici pour le lancement, Cmd+Q
  // et les fichiers de profil.
  const ports = tauri ? await loadTauriPorts() : null;
  const ipc: TauriIpc | null = ports === null ? null : ports.ipc;
  // Fichiers de profil (C1, P25) : boîtes natives dans la coque ; ailleurs <input type=file> et téléchargement.
  const profileFiles =
    ports === null ? createWebProfileFiles(browserFallbackDeps(document, URL)) : createTauriProfileFiles(ports.dialog, ports.fs);

  // Objets exportés (C3, Z11) : boîte native filtrée dans la coque ; ailleurs téléchargement.
  const itemFiles =
    ports === null ? createWebTypedFiles(browserFallbackDeps(document, URL), RBITEM_TYPE) : createTauriTypedFiles(ports.dialog, ports.fs, RBITEM_TYPE);

  // Conteneur des scènes, posé dans #app avant le premier onglet ; l'application le place dans la case `stage`.
  const root = document.getElementById("app");
  if (root === null) throw new Error("élément absent : #app");
  const stages = document.createElement("main");
  stages.className = "rb-stages";
  root.append(stages);
  // Mesure du texte (CL4-4) : la même police que le rendu, par un Canvas 2D hors page.
  const measureCtx = document.createElement("canvas").getContext("2d");
  const measure: Measure = measureCtx ? measureWith(measureCtx) : (s, size) => s.length * size * 0.6;
  const shared: SessionShared = { container: stages, settings, parsed, support: detectSupport(), measure, coreVersion: core.version() };

  const env = { tauri, userAgent: navigator.userAgent };
  const store = createProfileStore(browserKeyValue(window), BUILTIN_PROFILES);
  // Avertissements de l'amorce (profil stocké écarté, stockage illisible) : rien d'autre ne les lit.
  for (const w of store.warnings()) console.warn(w);
  const active = createActiveProfile(store, runtimeCapabilities(wasm.capabilities(detectPlatform(env)), env));
  let tabCount = 0;
  // Classeurs (C10b, F28, DAB4) : un Worker jetable par lecture, avec sa propre instance du module `formats`.
  const spawnSheetWorker = (): WorkerLike => {
    const w = new Worker(new URL("./platform/sheet-worker.ts", import.meta.url), { type: "module" });
    const like: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage: (m, transfer) => w.postMessage(m, transfer),
      terminate: () => w.terminate(),
    };
    w.onmessage = (e) => like.onmessage?.(e);
    w.onerror = (e) => like.onerror?.(e);
    return like;
  };
  const sheets = createSheetReader(spawnSheetWorker);
  const workspace = await createWorkspace({
    core,
    host: prepared.host,
    kind: prepared.kind,
    shell: prepared.shell,
    // Conteneur avec images (R7) : second module chargé au premier Ouvrir ou au premier enregistrement avec image.
    codec: createPageCodec(loadFormatsModule),
    readSheet: (b) => sheets.read(b),
    clipboard: createClipboard(browserSystemClipboard(navigator)),
    itemFiles,
    first,
    makeSession: (doc, assets) => createBoardSession(doc, shared, assets),
    dropReady: () => prepared.dropReady(),
    // L'ordre écoute du dépôt puis `launch_files` est tenu par le workspace (T98) : `launchFiles` n'est appelé que là.
    ...(ipc === null ? {} : { launch: () => launchFiles(ipc) }),
    now: () => new Date().toISOString(),
    newId: () => `t${++tabCount}`,
  });
  if (ipc !== null) await onQuitRequested(ipc, () => void workspace.quitRequested(() => quitApp(ipc)));

  // Choix assumé (fiche ENI) : l'espace est pris même quand un bouton de la barre a le focus, donc il n'active plus les
  // boutons ; sans cela, « espace + glisser » casserait après un clic dans la barre. Puis les raccourcis de fichier de
  // l'onglet actif (hors composition IME).
  window.addEventListener("keydown", (e) => {
    let taken = workspace.active().board.engine.key(keyOf(e));
    if (!e.isComposing && workspace.key(e)) taken = true;
    if (taken) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    if (workspace.active().board.engine.keyUp(keyOf(e))) e.preventDefault();
  });
  window.addEventListener("blur", () => workspace.active().board.engine.releaseKeys());
  // Copier et couper (C3, Z8) : la sélection de l'onglet actif, hors zone éditable ; sinon la copie native suit.
  for (const [type, cut] of [
    ["copy", false],
    ["cut", true],
  ] as const) {
    window.addEventListener(type, (e) => {
      const done = handleCopy(e, workspace, cut);
      if (done === null) return;
      e.preventDefault();
      void done.catch((err: unknown) => {
        console.warn(`RoomBoard : copie abandonnée (${err instanceof Error ? err.message : String(err)})`);
      });
    });
  }
  // Collage (R19, C3, C10b) : objets RoomBoard, puis un tableau HTML, puis les images jointes (F19, HB-9) ; zone de
  // texte : collage normal.
  window.addEventListener("paste", (e) => {
    const done = handlePaste(e, workspace);
    if (done === null) return;
    e.preventDefault();
    void done.catch((err: unknown) => {
      console.warn(`RoomBoard : collage abandonné (${err instanceof Error ? err.message : String(err)})`);
    });
  });

  const note = workspace.active().board.choice.note;
  mountApp(root, {
    workspace,
    active,
    store,
    settings,
    notes: note === null ? parsed.errors : [...parsed.errors, note],
    shell: prepared.shell,
    profileFiles,
    stages,
    navigate: (search) => {
      window.location.search = search;
    },
  });

  if (new URLSearchParams(window.location.search).has("banc")) {
    const { createAppBench, mountBenchPanel } = await import("./app/banc");
    mountBenchPanel(createAppBench(workspace.active().board.bench()));
  }
  workspace.active().board.stage.dataset["ready"] = "1";
}

start().catch((e: unknown) => {
  showStartError(document, e);
  console.error(e);
});
