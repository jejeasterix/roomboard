/**
 * Amorce de l'application (lot 5b, T95) : cœur Wasm, réglages lus dans l'adresse (`?echelons=`, `?paume=`, `?doigt=`,
 * engine/settings.ts), hôte de fichiers, premier document, profils de barre, capacités du poste, espace de travail
 * (un onglet = une `BoardSession`, T93/T98), puis l'interface SolidJS (`ui/App.tsx`). Les touches sont écoutées une
 * fois ici et vont à l'onglet actif. `?banc` ajoute le banc du lot 1 rejoué sur l'onglet actif.
 */
import { createBoardSession, type SessionShared } from "./app/board-session";
import { browserExportCanvas, createPngOverlay, overlayScale } from "./app/pdf-overlay";
import type { RasterPage } from "./app/pdf-export";
import { createVectorOverlay, fallbackOverlay, PDF_FONT_FILES, workerPdfWriter } from "./app/pdf-overlay-vector";
import { createWorkspace, type TabSession } from "./app/workspace";
import type { CoreDocument } from "./core/api";
import { Canvas2DRenderer, exportPainterOptions } from "./engine/render/canvas2d";
import { RecordingPath } from "./engine/render/record-ctx";
import { decodeImage, kindOfMime } from "./platform/image-import";
import { loadPdfjs, loadPdfLib, PDFJS_BASE } from "./platform/pdf-load";
import { createPdfEngine } from "./platform/pdf-render";
import { createWasmCore } from "./core/wasm-core";
import type { KeyLike } from "./engine/input/keys";
import { detectSupport } from "./engine/input/support";
import { createSettingsStore, parseSettings } from "./engine/settings";
import { measureWith, type Measure } from "./engine/text-layout";
import { browserFallbackDeps } from "./platform/host-repli";
import { createPageCodec } from "./platform/container";
import { loadFormatsModule } from "./platform/container-load";
import { launchFiles, linkMedia, loadTauriPorts, onQuitRequested, quitApp, relinkMedia, type TauriIpc } from "./platform/host-tauri";
import { prepareHost, startDocument } from "./platform/mount";
import { browserSystemClipboard, createClipboard, handleCopy } from "./platform/clipboard";
import { handlePaste } from "./platform/paste";
import { createSheetReader, type WorkerLike } from "./platform/sheet-reader";
import { createIdbPendingStore, createUnavailablePendingStore } from "./platform/pending";
import { createTauriProfileFiles, createWebProfileFiles } from "./platform/profile-files";
import { createTauriTypedFiles, createWebTypedFiles, PDF_TYPE, RBITEM_TYPE } from "./platform/typed-files";
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

  // PDF (C12) : pdf.js et pdf-lib chargés au premier PDF (import dynamique) ; écriture native dans la coque.
  const pdf = createPdfEngine(loadPdfjs);
  const pdfFiles =
    ports === null ? createWebTypedFiles(browserFallbackDeps(document, URL), PDF_TYPE) : createTauriTypedFiles(ports.dialog, ports.fs, PDF_TYPE);
  const decodeBitmap = async (blob: Blob) => (await decodeImage(blob, kindOfMime(blob.type) ?? "png")).bitmap;
  // Superposition PNG (lot b) ; T13 la garde en repli du producteur vectoriel. `doc` est la copie de l'export.
  const pngOverlay = (tab: TabSession, doc: CoreDocument) =>
    createPngOverlay({
      doc,
      assets: tab.assets,
      decode: decodeBitmap,
      alive: () => true,
      canvas: browserExportCanvas,
      painter: (ctx, images) => new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images)),
    });
  // Bitmap → PNG par une toile d'export, libérée aussitôt (mémoire de l'iPad).
  const bitmapToPng = async (bitmap: CanvasImageSource, w: number, h: number): Promise<Uint8Array> => {
    const c = browserExportCanvas(Math.max(1, w), Math.max(1, h));
    try {
      c.ctx.drawImage(bitmap, 0, 0);
      return await c.png();
    } finally {
      c.release();
    }
  };
  // Repli en image (PF20) : page `index` du PDF rendue en PNG par pdf.js, quand pdf-lib refuse le fichier. Un document
  // pdf.js par blob pour tout l'export (`rasterClose`, appelé à la fin de l'export, même en erreur).
  const rasterFiles = new Map<Blob, ReturnType<typeof pdf.open>>();
  const rasterPage = async (blob: Blob, index: number): Promise<RasterPage | null> => {
    let opening = rasterFiles.get(blob);
    if (opening === undefined) {
      opening = pdf.open(blob);
      rasterFiles.set(blob, opening);
    }
    const file = await opening;
    if (index >= file.pageCount) return null;
    const { w, h } = await file.pageSize(index);
    const scale = overlayScale({ x0: 0, y0: 0, x1: w, y1: h });
    const pw = Math.max(1, Math.round(w * scale));
    const ph = Math.max(1, Math.round(h * scale));
    const bitmap = await file.renderTile(index, scale, { x: 0, y: 0, w: pw, h: ph }, new AbortController().signal);
    try {
      return { png: await bitmapToPng(bitmap, pw, ph), w, h };
    } finally {
      bitmap.close?.();
    }
  };
  const rasterClose = (): void => {
    for (const opening of rasterFiles.values()) void opening.then((f) => f.destroy(), () => undefined);
    rasterFiles.clear();
  };

  // Conteneur des scènes, posé dans #app avant le premier onglet ; l'application le place dans la case `stage`.
  const root = document.getElementById("app");
  if (root === null) throw new Error("élément absent : #app");
  const stages = document.createElement("main");
  stages.className = "rb-stages";
  root.append(stages);
  // Mesure du texte (CL4-4) : la même police que le rendu, par un Canvas 2D hors page.
  const measureCtx = document.createElement("canvas").getContext("2d");
  const measure: Measure = measureCtx ? measureWith(measureCtx) : (s, size) => s.length * size * 0.6;
  // Pixels des images (C5, I18, DAI3) : un Worker par onglet, avec sa propre instance du module `formats`.
  const spawnPixelWorker = (): WorkerLike => asWorkerLike(new Worker(new URL("./platform/pixel-worker.ts", import.meta.url), { type: "module" }));
  const shared: SessionShared = {
    container: stages, settings, parsed, support: detectSupport(), measure, coreVersion: core.version(), pdf, pixels: spawnPixelWorker,
    ...(ports === null ? {} : { mediaUrl: ports.assetUrl }),
  };

  const env = { tauri, userAgent: navigator.userAgent };
  const store = createProfileStore(browserKeyValue(window), BUILTIN_PROFILES);
  // Avertissements de l'amorce (profil stocké écarté, stockage illisible) : rien d'autre ne les lit.
  for (const w of store.warnings()) console.warn(w);
  const active = createActiveProfile(store, runtimeCapabilities(wasm.capabilities(detectPlatform(env)), env));
  let tabCount = 0;
  // Worker jetable (C10b DAB4, C12, `runOnce`) : un `Worker` du navigateur vu comme `WorkerLike`.
  const asWorkerLike = (w: Worker): WorkerLike => {
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
  // Classeurs (C10b, F28, DAB4) : un Worker jetable par lecture, avec sa propre instance du module `formats`.
  const spawnSheetWorker = (): WorkerLike => asWorkerLike(new Worker(new URL("./platform/sheet-worker.ts", import.meta.url), { type: "module" }));
  const sheets = createSheetReader(spawnSheetWorker);
  // Superposition vectorielle (C12 lot c, PF22) : un Worker jetable du module `formats` par export, jamais l'instance
  // de la page qui enregistre les `.roomboard` (HR6) ; PNG en repli (PC14). Polices lues en local, une fois.
  const spawnPdfWorker = (): WorkerLike => asWorkerLike(new Worker(new URL("./platform/pdf-vector-worker.ts", import.meta.url), { type: "module" }));
  let pdfFonts: Promise<readonly Uint8Array[]> | null = null;
  const fonts = (): Promise<readonly Uint8Array[]> =>
    (pdfFonts ??= Promise.all(
      PDF_FONT_FILES.map(async (f) => {
        const r = await fetch(new URL(`${PDFJS_BASE}standard_fonts/${f}`, document.baseURI));
        if (!r.ok) throw new Error(`police ${f} absente (${r.status})`);
        return new Uint8Array(await r.arrayBuffer());
      }),
    ).catch((e: unknown) => {
      pdfFonts = null;
      throw e;
    }));
  const toPng = async (blob: Blob, mime: string): Promise<Uint8Array> => {
    const { bitmap } = await decodeImage(blob, kindOfMime(mime) ?? "png");
    try {
      return await bitmapToPng(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  };
  // Contexte à part : `RecordingContext2D` y règle `font` et `fillStyle`, la mesure de l'écran garde le sien.
  const vectorMeasure = document.createElement("canvas").getContext("2d");
  const overlay = (tab: TabSession, doc: CoreDocument) =>
    vectorMeasure === null
      ? pngOverlay(tab, doc)
      : fallbackOverlay(
          createVectorOverlay({
            doc,
            assets: tab.assets,
            alive: () => true,
            measure: vectorMeasure,
            painter: (ctx, images) => new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images, { makePath: () => new RecordingPath() as unknown as Path2D })),
            fonts,
            toPng,
            write: workerPdfWriter(spawnPdfWorker),
          }),
          pngOverlay(tab, doc),
        );
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
    pdf,
    pdfFiles,
    loadPdfLib,
    overlay,
    rasterPage,
    rasterClose,
    first,
    makeSession: (doc, assets) => createBoardSession(doc, shared, assets),
    dropReady: () => prepared.dropReady(),
    // L'ordre écoute du dépôt puis `launch_files` est tenu par le workspace (T98) : `launchFiles` n'est appelé que là.
    ...(ipc === null ? {} : { launch: () => launchFiles(ipc) }),
    // Médias liés (C14) : coque seulement ; `linkMedia` de l'hôte rend l'empreinte, l'URL vient du protocole d'assets.
    ...(ipc === null || ports === null
      ? {}
      : {
          linkMedia: async (p: string) => ({ id: await linkMedia(ipc, p), url: ports.assetUrl(p) }),
          relinkMedia: (p: string, size: number) => relinkMedia(ipc, p, size),
        }),
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
