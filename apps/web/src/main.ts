/**
 * Amorce de l'application (lot 5b, T95) : cœur Wasm, réglages lus dans l'adresse (`?echelons=`, `?paume=`, `?doigt=`,
 * engine/settings.ts), hôte de fichiers, premier document, profils de barre, capacités du poste, espace de travail
 * (un onglet = une `BoardSession`, T93/T98), puis l'interface SolidJS (`ui/App.tsx`). Les touches sont écoutées une
 * fois ici et vont à l'onglet actif. `?banc` ajoute le banc du lot 1 rejoué sur l'onglet actif.
 */
import { createBoardPorts } from "./app/board-convert";
import { annotationFailedMessage, createAnnotationController, createRemoteToolbarHost, offerCompatRelaunch } from "./app/annotation";
import { startAnnotateWindow } from "./annotate-start";
import { createFakeAnnotationWindows, type FakeAnnotationOptions } from "./platform/annotation-fake";
import type { AnnotationControl, AnnotationSupport, AnnotationWindows, CapturedImage, CaptureOutcome } from "./platform/annotation-port";
import { createTauriAnnotationWindows } from "./platform/annotation-tauri";
import { ANNOTATION_REMOTE_ACTIONS, annotationBarOf, resolveStartMode, type Dock } from "./toolbar";
import { createContainerIO } from "./app/container-io";
import { createAssetStore } from "./core/asset-store";
import { createBoardSession, createSharedItemStyle, type SessionShared } from "./app/board-session";
import { browserExportCanvas, createPngOverlay, overlayScale } from "./app/pdf-overlay";
import type { RasterPage } from "./app/pdf-export";
import { createVectorOverlay, fallbackOverlay, PDF_FONT_FILES, vectorPainter, workerPdfWriter } from "./app/pdf-overlay-vector";
import { createResourceLibrary, createSharedFolder, importedMessage, mineOrMemory, resourceKindReader } from "./app/library";
import { createWorkspace, type TabSession } from "./app/workspace";
import { APP_VERSION, messageOf } from "./platform/controller";
import { createIdbLibraryFiles, createMemoryLibraryFiles, createTauriLibraryFiles } from "./platform/library-files";
import type { CoreDocument, CoreFactory } from "./core/api";
import { Canvas2DRenderer, exportPainterOptions } from "./engine/render/canvas2d";
import { decodeImage, kindOfMime } from "./platform/image-import";
import { loadPdfjs, loadPdfLib, PDFJS_BASE } from "./platform/pdf-load";
import { createPdfEngine } from "./platform/pdf-render";
import { createModelViewLoader } from "./platform/model-view";
import { createZipReader, createZipWriter } from "./platform/zip-read";
import { createWasmCore } from "./core/wasm-core";
import type { KeyLike } from "./engine/input/keys";
import { detectSupport } from "./engine/input/support";
import { createSettingsStore, parseSettings } from "./engine/settings";
import { measureOrFallback } from "./engine/text-layout";
import { browserFallbackDeps } from "./platform/host-repli";
import { createPageCodec } from "./platform/container";
import { loadFormatsModule } from "./platform/container-load";
import { convertOffice, launchFiles, linkMedia, loadTauriPorts, officeConverter, onOriginalChanged, onQuitRequested, openOriginal, quitApp, reimportOriginal, relinkMedia, type TauriIpc } from "./platform/host-tauri";
import { prepareHost, startDocument } from "./platform/mount";
import { browserSystemClipboard, createClipboard, handleCopy } from "./platform/clipboard";
import { handlePaste } from "./platform/paste";
import { createSheetReader, type WorkerLike } from "./platform/sheet-reader";
import { createIdbPendingStore, createUnavailablePendingStore } from "./platform/pending";
import { createTauriProfileFiles, createWebProfileFiles } from "./platform/profile-files";
import { createTauriTypedFiles, createWebTypedFiles, IWB_TYPE, PDF_TYPE, RBITEM_TYPE, RBPACK_TYPE, UBZ_TYPE } from "./platform/typed-files";
import { createBoardCodec } from "./platform/board-reader";
import { browserKeyValue, createProfileStore } from "./profile-store";
import { detectPlatform, runtimeCapabilities } from "./runtime-capabilities";
import { BUILTIN_PROFILES } from "./toolbar-profiles";
import { createActiveProfile } from "./ui/active-profile";
import { mountApp, showStartError } from "./ui/App";
import { createDeviceSettings } from "./device-settings";
import { showToast } from "./ui/toast";
import { sentToBoardToast } from "./platform/annotation-port";
import init, * as wasm from "./wasm/roomboard_wasm";
import { withConversionMark, type OriginalChange } from "./platform/office-import";

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

/** C11b (P30) : capture du faux hôte (`?annotation=faux`) : PNG 320 × 180 uni `#3366cc`, peint par un canvas. */
async function fakeDesktopCapture(): Promise<CaptureOutcome> {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 180;
  const ctx = c.getContext("2d");
  if (ctx === null) return { ok: false, reason: "failed" };
  ctx.fillStyle = "#3366cc";
  ctx.fillRect(0, 0, 320, 180);
  const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
  if (blob === null) return { ok: false, reason: "failed" };
  const image: CapturedImage = { blob, width: 320, height: 180 };
  return { ok: true, image };
}

/** C11b (P30) : options du faux hôte lues de l'adresse : `&capture=refus|wayland`, `&transparence=non`, `&encre=1`
 *  (le `draw` du faux trace un trait connu, de (200, 200) à (600, 200), épaisseur 8, sur la première page, à chaque
 *  collecte ; le document passe par le conteneur, assets compris). */
function fakeAnnotationOptions(params: URLSearchParams, core: CoreFactory): FakeAnnotationOptions {
  const shot = params.get("capture");
  const capture: CaptureOutcome | (() => Promise<CaptureOutcome>) =
    shot === "refus" ? { ok: false, reason: "denied" } : shot === "wayland" ? { ok: false, reason: "wayland" } : fakeDesktopCapture;
  const io = createContainerIO({
    core,
    codec: createPageCodec(loadFormatsModule),
    say: async (m) => console.warn(`RoomBoard (faux hôte) : ${m}`),
    makeAssets: () => createAssetStore(),
  });
  const draw = async (bytes: Uint8Array): Promise<Uint8Array> => {
    const read = await io.read("annotation.roomboard", bytes, "document");
    if (read === null) return bytes;
    try {
      const page = read.doc.pageIds()[0];
      if (page !== undefined) {
        const points = new Float32Array([200, 200, 0.5, 400, 200, 0.5, 600, 200, 0.5]);
        read.doc.apply({ type: "CommitStroke", page, points, style: { color: "#000000", width: 8 } });
      }
      return await io.encode(read.doc, read.assets, new Date().toISOString(), APP_VERSION, { kind: "document" });
    } finally {
      read.doc.free();
    }
  };
  return {
    dataset: document.body.dataset as Record<string, string | undefined>,
    transparent: params.get("transparence") !== "non",
    capture,
    ...(params.get("encre") === "1" ? { draw } : {}),
  };
}

async function start(): Promise<void> {
  await init();
  const core = createWasmCore(wasm);
  // C11a (P13) : la fenêtre `annotate` n'a ni fichiers, ni profils, ni espace de travail.
  const params = new URLSearchParams(window.location.search);
  if (params.get("fenetre") === "annotation") {
    const p = await loadTauriPorts();
    await startAnnotateWindow(core, p.ipc, keyOf);
    return;
  }
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
  // Tableaux (C13, D17) : copies « Enregistrer une copie au format .iwb / .ubz » ; web : téléchargement, coque : boîte native.
  const iwbFiles =
    ports === null ? createWebTypedFiles(browserFallbackDeps(document, URL), IWB_TYPE) : createTauriTypedFiles(ports.dialog, ports.fs, IWB_TYPE);
  const ubzFiles =
    ports === null ? createWebTypedFiles(browserFallbackDeps(document, URL), UBZ_TYPE) : createTauriTypedFiles(ports.dialog, ports.fs, UBZ_TYPE);
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
  const measure = measureOrFallback(measureCtx);
  // Pixels des images (C5, I18, DAI3) : un Worker par onglet, avec sa propre instance du module `formats`.
  const spawnPixelWorker = (): WorkerLike => asWorkerLike(new Worker(new URL("./platform/pixel-worker.ts", import.meta.url), { type: "module" }));
  // Objets 3D (C15, X20, DAX3) : three chargé au premier dépôt 3D ou au premier « Tourner », jamais au démarrage.
  const modelView = createModelViewLoader(async () => (await import("./platform/model-view-three")).createThreeModelView());
  const spawnZipWorker = (): WorkerLike => asWorkerLike(new Worker(new URL("./platform/zip-worker.ts", import.meta.url), { type: "module" }));
  const shared: SessionShared = {
    container: stages, settings, parsed, support: detectSupport(), measure, coreVersion: core.version(), pdf, pixels: spawnPixelWorker, modelView,
    ...(ports === null ? {} : { mediaUrl: ports.assetUrl }),
    // OG11 (déc. 23) : style courant gardé sur l'appareil ; `device` (plus bas) n'est lu qu'à la création d'une session.
    ...createSharedItemStyle(() => device.itemStyle(), (s) => void device.setItemStyle(s)),
  };

  // C16 (O24) : capacité `officeConverter` lue de la coque avant le profil (convertisseur cherché une fois au lancement).
  // C11a (P16, P22, P29) : hôte des fenêtres d'annotation (coque, ou faux hôte `?annotation=faux` hors coque seulement),
  // et support lu avant les capacités.
  const fakeAnnotation = !tauri && params.get("annotation") === "faux";
  const emitTo = ipc?.emitTo;
  const windows: AnnotationWindows | null =
    ipc !== null && emitTo !== undefined
      ? createTauriAnnotationWindows({
          invoke: <T>(c: string, a?: Record<string, unknown>) => ipc.invoke<T>(c, a),
          listen: <T>(e: string, cb: (x: { readonly payload: T }) => void) => ipc.listen<T>(e, cb),
          emitTo,
        })
      : fakeAnnotation
        ? createFakeAnnotationWindows(fakeAnnotationOptions(params, core))
        : null;
  const support: AnnotationSupport | null =
    windows === null ? null : await windows.support().catch((): AnnotationSupport => ({ supported: false, reason: null, screens: 1, transparent: true }));
  const env = {
    tauri,
    userAgent: navigator.userAgent,
    officeConverter: ipc === null ? false : await officeConverter(ipc),
    ...(tauri && support !== null ? { annotationSupported: support.supported } : {}),
    ...(fakeAnnotation ? { forceAnnotation: true } : {}),
  };
  const settingsKv = browserKeyValue(window);
  // design-l4 (L4-14) : réglages de l'appareil, sur le même stockage que les profils (`roomboard.<zone>.<réglage>`).
  const device = createDeviceSettings(settingsKv);
  const store = createProfileStore(settingsKv, BUILTIN_PROFILES);
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
  // Tableaux (C13, D1, D3, D6) : XML lu et écrit par un Worker jetable du module `formats` ; ZIP par le Worker ZIP (mode board).
  const spawnBoardWorker = (): WorkerLike => asWorkerLike(new Worker(new URL("./platform/board-worker.ts", import.meta.url), { type: "module" }));
  const boards = createBoardCodec(spawnBoardWorker);
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
            painter: vectorPainter(doc),
            fonts,
            toPng,
            write: workerPdfWriter(spawnPdfWorker),
          }),
          pngOverlay(tab, doc),
        );

  // Bibliothèque (C4) : « Mes ressources » en IndexedDB sur le web, `Documents/RoomBoard/Ressources` dans la coque ;
  // « Ressources partagées » : coque seulement, dossier choisi par la boîte native (accès pour la session, H1-5).
  // K8 : dossier Documents introuvable : « Mes ressources » en mémoire avec un avis, le démarrage continue.
  const mine =
    ports !== null
      ? await mineOrMemory(
          async () => createTauriLibraryFiles({ ...ports.fs, ...ports.dirFs }, `${await ports.documentDir()}/RoomBoard/Ressources`, "mine"),
          () => createMemoryLibraryFiles("mine"),
        )
      : { files: typeof window.indexedDB === "undefined" ? createMemoryLibraryFiles("mine") : createIdbLibraryFiles(window.indexedDB, "mine"), notice: null };
  if (mine.notice !== null) void prepared.shell.notify(mine.notice);
  // Un seul codec des conteneurs : celui des onglets lit aussi le type d'une ressource sans compagnon (K4).
  const codec = createPageCodec(loadFormatsModule);
  const library = createResourceLibrary({
    files: [mine.files],
    zip: { unzip: createZipReader(spawnZipWorker, undefined, "pack"), zip: createZipWriter(spawnZipWorker) },
    now: () => new Date().toISOString(),
    appVersion: APP_VERSION,
    kindOf: resourceKindReader(core, codec),
  });
  // K1 (H1-5) : la clé gardée dit « déjà choisi » dès le démarrage ; l'accès se rouvre par la boîte native.
  const sharedFolder = createSharedFolder({
    kv: settingsKv,
    host:
      ports === null
        ? null
        : { pickFolder: (start) => ports.pickFolder(start), open: (path) => createTauriLibraryFiles({ ...ports.fs, ...ports.dirFs }, path, "shared") },
    library,
  });
  const packFiles =
    ports === null ? createWebTypedFiles(browserFallbackDeps(document, URL), RBPACK_TYPE) : createTauriTypedFiles(ports.dialog, ports.fs, RBPACK_TYPE);
  const markConversion = withConversionMark(document.documentElement);
  let annotation: AnnotationControl | null = null;
  const workspace = await createWorkspace({
    // C11a (P17, P18, P25) : contrôleur relu à chaque appel (créé juste après) ; sortie relancée après l'annotation.
    annotation: () => annotation,
    ...(ipc === null ? {} : { quit: () => quitApp(ipc) }),
    core,
    host: prepared.host,
    kind: prepared.kind,
    shell: prepared.shell,
    // Conteneur avec images (R7) : second module chargé au premier Ouvrir ou au premier enregistrement avec image.
    codec,
    readSheet: (b) => sheets.read(b),
    model3d: { view: () => modelView.load(), readZip: createZipReader(spawnZipWorker) },
    clipboard: createClipboard(browserSystemClipboard(navigator)),
    itemFiles,
    pdf,
    pdfFiles,
    board: createBoardPorts({ zip: spawnZipWorker }, boards),
    iwbFiles,
    ubzFiles,
    loadPdfLib,
    overlay,
    rasterPage,
    rasterClose,
    // Vignettes des ressources (C4, D12) : même peintre que la superposition PNG.
    thumbnail: { canvas: browserExportCanvas, decode: decodeBitmap, painter: (ctx, doc, images) => new Canvas2DRenderer(ctx, null, doc, exportPainterOptions(images)) },
    importPack: async (name, bytes) => {
      try {
        const r = await library.importPack(bytes, name);
        await prepared.shell.notify(importedMessage(name, r), "info");
        return true;
      } catch (e) {
        await prepared.shell.notify(`Import impossible (${name}) : ${messageOf(e)}`);
        return false;
      }
    },
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
    // Office (C16) : coque seulement ; conversion marquée sur la racine (curseur d'attente, O25), original ouvert,
    // surveillé et réimporté par la coque (O20 à O22).
    ...(ipc === null
      ? {}
      : {
          convertOffice: (p: string) => markConversion(() => convertOffice(ipc, p)),
          officeConverter: env.officeConverter,
          openOriginal: (f: { readonly name: string; readonly blob: Blob }) => openOriginal(ipc, f.name, f.blob),
          reimportOriginal: (id: string) => reimportOriginal(ipc, id),
          onOriginalChanged: (cb: (e: OriginalChange) => void) => onOriginalChanged(ipc, cb),
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

  // C11a, design-l4 (L4-2) : côté et épaisseur de la barre montrée en annotation (`annotationBarOf`, la même que le rendu
  // d'`App.tsx`), mesurés dans la page (px CSS) ; sans elle, `querySelector` rendait null et la bande prenait 64 px.
  const measureBar = (): { readonly dock: Dock; readonly thickness: number } => {
    const bar = annotationBarOf(active.profile());
    const dock: Dock = bar === null ? "top" : bar.dock;
    const el = bar === null ? null : document.querySelector(`[data-toolbar="${CSS.escape(bar.id)}"]`);
    const r = el?.getBoundingClientRect();
    const thickness = r === undefined ? 64 : Math.ceil(dock === "top" || dock === "bottom" ? r.height : r.width);
    return { dock, thickness };
  };
  const ctl =
    windows === null
      ? null
      : createAnnotationController({
          windows,
          annotationTab: () => workspace.annotationTab(),
          encodeTab: (t) => workspace.encodeTab(t),
          replaceAnnotation: (b) => workspace.replaceAnnotation(b),
          activeTabId: () => workspace.tabs.active()?.id ?? null,
          showTab: (id) => void workspace.tabs.activate(id),
          importFiles: (f, at) => workspace.importFiles(f, at),
          pageNumber: () => workspace.active().board.engine.state().pageIndex + 1,
          say: (...a) => workspace.say(...a),
          bar: measureBar,
          profile: () => active.profile(),
          screens: support?.screens ?? 1,
          // C11b (P6, P14, P17, P18) : fond figé, envoi, cible et repli.
          annotationBackdrop: () => workspace.annotationBackdrop(),
          setAnnotationBackdrop: (image, page) => workspace.setAnnotationBackdrop(image, page),
          sendCapture: (r) => workspace.sendCapture(r),
          startMode: () => resolveStartMode(active.profile(), active.capabilities()).mode,
          originKind: (id) => (id === null ? null : (workspace.tabs.list().find((t) => t.id === id)?.kind ?? null)),
          transparent: support?.transparent ?? true,
          // design-l4 (L4-13, L4-16) : cadre de l'appareil envoyé à `annotate` ; avis d'envoi en bandeau, plus une boîte.
          frame: () => device.frame(),
          sent: (page) => showToast(sentToBoardToast(page)),
        });
  annotation = ctl;
  if (windows !== null && support !== null) {
    void offerCompatRelaunch(support, active.profile().behavior.startMode, (m) => workspace.ask(m), () => windows.relaunchCompat()).catch((e: unknown) => {
      void workspace.say(annotationFailedMessage(messageOf(e)));
    });
  }

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
    library: { library, shared: sharedFolder, packs: packFiles },
    device,
    ...(ctl === null || windows === null
      ? {}
      : { annotation: { control: ctl, remote: (local) => createRemoteToolbarHost((m) => ctl.command(m), local, ANNOTATION_REMOTE_ACTIONS), onView: (cb) => windows.onView(cb) } }),
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
