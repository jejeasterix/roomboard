/**
 * Espace de travail (D27 amendée, Q1, T98) : la fenêtre tient plusieurs onglets, chacun avec sa `BoardSession` (T93)
 * et son contrôleur de fichiers. Ouvrir, Nouveau, le dépôt et le fichier du lancement ouvrent un onglet, sans question
 * (CL5b-3). Une seule garde de fermeture pour la fenêtre, vraie si un onglet au moins est modifié (CL5b-6) ; le titre
 * de la fenêtre est celui de l'onglet actif. Le marquage `#stage[data-fichiers|data-modifie|data-fichier|data-tab]` est
 * tenu sur le stage de chaque onglet : l'id `stage` suivant l'onglet actif (CL5b-2), `#stage` décrit l'onglet montré.
 * C13 (D5, D17) : `openBoard` ouvre un `.iwb` ou un `.ubz` dans un nouvel onglet ; `exportBoard` écrit une copie au format.
 */
import { PDF_MAX_PAGES, type CoreDocument, type AssetRef, type CoreFactory, type LinkedAsset, type PdfPageSize } from "../core/api";
import { createAssetStore, type AssetStore } from "../core/asset-store";
import { NOTHING_TO_SEND_MESSAGE, type AnnotationControl, type CapturedImage, type SendRequest, type SendResult, type SendTarget } from "../platform/annotation-port";
import type { ContainerCodec } from "../platform/container";
import {
  APP_VERSION,
  createFileController,
  DISCARD_MESSAGE,
  messageOf,
  UNREAD_ASSETS_MESSAGE,
  type FileController,
  type FileKey,
} from "../platform/controller";
import type { PdfEngine, PdfFile } from "../engine/render/pdf-port";
import { createClipboard, INTERNAL_ONLY_MESSAGE, NEWER_ITEMS_MESSAGE, TOO_BIG_ITEMS_MESSAGE, type Clipboard, type ItemsRefusal } from "../platform/clipboard";
import { PDF_EXTENSION, PDF_MIME, RBITEM_EXTENSION, ROOMBOARD_EXTENSION, type DroppedFile, type FileHost, type HostKind, type OpenedFile, type Point, type SaveTarget, type ShellPort } from "../platform/files";
import { baseName } from "../platform/host-tauri";
import { PASTE_MAX_CHARS, PASTE_TOO_BIG, tableFromHtml, type TableGrid } from "../platform/html-table";
import { decodeImage, type ImageDecoder, type ImageTarget } from "../platform/image-import";
import { PDF_ENCRYPTED_MESSAGE, PdfEncryptedError } from "../platform/pdf-render";
import { createImporter, hasZipMagic, WEB_MAX_BYTES, type ImportReport } from "../platform/import";
import { NOT_OFFICE_PAGE_MESSAGE, officeMimeOf, officeStemOf, originalChangedMessage, type OfficeOpenFile, type OriginalChange } from "../platform/office-import";
import type { LinkedMedia } from "../platform/media-import";
import type { Model3dDeps } from "../platform/model3d-handlers";
import { isAbsoluteLink, relativeLink, resolveLink } from "../platform/media-link";
import type { StartedDocument } from "../platform/mount";
import { insertTableGrid } from "../platform/table-insert";
import type { TypedFiles } from "../platform/typed-files";
import type { BoardSession } from "./board-session";
import { createContainerIO, missingOf, typed } from "./container-io";
import { createFragmentOps, SELECTION_NAME, type InsertOutcome } from "./fragments";
import { IDENTITY_MATRIX } from "../core/shapes";
import { capturePage, type PageBackdrop } from "./desktop-page";
import type { CapturedResource } from "./library";
import { renderThumbnail, type ThumbDeps } from "./thumbnail";
import { exportPdf as assemblePdf, PDF_CUT_MESSAGE, PDF_RASTER_MESSAGE, PDF_RASTER_MISSING_MESSAGE, type OverlayProducer, type PdfLib, type RasterPage } from "./pdf-export";
import { createTabs, MAX_TABS, TOO_MANY_TABS, type TabKind, type Tabs } from "./tabs";

import type { SelectionAction } from "./toolbar-host";
import type { BoardPart } from "../platform/board-reader";
import { BAMBOO_NOT_FLIPCHART, hasBambooMagic } from "../platform/bamboo";
import { boardListOf, buildBoardDocument, decodeBoardList, type BoardFormat, type BoardListPage, type BoardPorts, type BoardSourceFormat } from "./board-io";
import { BOARD_MAX_OBJECTS, boardNoContentMessage, resolveBoardFormat, BOARD_NO_PAGE_MESSAGE, boardObjectCount, boardExportName, flipchartSources, boardFirstPagesMessage, boardSavedMessage, boardSources, boardTabName, boardWarningsMessage, mergeBoardWarnings, stem, UBZ_NOT_ZIP_MESSAGE, type BoardSources } from "./board-files";

export { CODEC_FALLBACK_MESSAGE } from "./container-io";

/** C12 : avis de l'import et de l'export PDF (PF7, PF19, PC10). */
export const PDF_NO_PAGE_MESSAGE = "PDF sans page";
export const BUSY_MESSAGE = "Opération en cours";
export const pdfFirstPagesMessage = (name: string, total: number): string => `${name} : ${PDF_MAX_PAGES} premières pages importées sur ${total}`;
export const pdfExportedMessage = (pages: number): string => `PDF exporté (${pages} page${pages > 1 ? "s" : ""})`;
/** Nom proposé (PF19) : `<base> annoté.pdf` si une page d'origine est recopiée, sinon `<base>.pdf`. */
export const exportPdfName = (tabName: string, annotated: boolean): string =>
  `${stem(tabName, ROOMBOARD_EXTENSION)}${annotated ? " annoté" : ""}${PDF_EXTENSION}`;
/** C11b (P9) : nom du nouvel onglet d'un envoi. */
export const CAPTURE_TAB_NAME = "Capture du bureau";
/** C11b (P25) : asset de la capture (empreinte SHA-256 par le magasin). */
export const CAPTURE_ASSET_NAME = "capture-du-bureau.png";
export const CAPTURE_MIME = "image/png";

export interface TabSession {
  readonly board: BoardSession;
  readonly files: FileController;
  /** Octets des images de l'onglet (R12). */
  readonly assets: AssetStore;
}

/** C11a : ce que l'espace de travail demande au contrôleur d'annotation (`app/annotation.ts`). */
export type AnnotationGate = Pick<AnnotationControl, "state" | "exit" | "dropOnZone" | "close">;

/** C11a (P3, P4) : sorte, état « modifié », activation, onglet remplacé. */
interface TabOptions {
  readonly kind?: TabKind;
  readonly dirty?: boolean;
  readonly activate?: boolean;
  readonly replace?: string;
}

export interface WorkspaceDeps {
  /** C15 (X39) : rendu 3D partagé et lecteur de ZIP pour l'import ; absent : fichiers 3D refusés comme avant. */
  readonly model3d?: Model3dDeps;
  readonly core: CoreFactory;
  readonly host: FileHost;
  /** Pour `data-fichiers`. */
  readonly kind: HostKind;
  readonly shell: ShellPort;
  /** Conteneur avec assets (R7, R10) : `createPageCodec(loadFormatsModule)` dans l'amorce, un faux dans les tests. */
  readonly codec: ContainerCodec;
  /** Magasin d'un onglet (R12) ; défaut `createAssetStore()`. */
  makeAssets?(): AssetStore;
  /** Décodeur des images importées (tests) ; défaut : celui du navigateur. */
  readonly decode?: ImageDecoder;
  /** Lecture d'un classeur dans un Worker jetable (C10b, F28) : `createSheetReader` dans l'amorce ; absent : `.xlsx` refusé. */
  readSheet?(file: Blob): Promise<TableGrid>;
  /** Lecture du HTML collé en document inerte (tests) ; défaut : `DOMParser` « text/html ». */
  parseHtml?(html: string): Document;
  readonly first: StartedDocument;
  makeSession(doc: CoreDocument, assets: AssetStore): Promise<BoardSession>;
  /** Attendue après `host.onDrop` et avant `launch` (écart T87). */
  dropReady(): Promise<void>;
  /** Fichiers du lancement (Tauri : `() => launchFiles(ipc)`) ; absent hors coque. */
  launch?(): Promise<readonly DroppedFile[]>;
  readonly now: () => string;
  readonly newId: () => string;
  /** C3 (Z8) : défaut presse-papiers interne seul. */
  readonly clipboard?: Clipboard;
  /** C3 (Z11) : absent → « Exporter » sans effet. */
  readonly itemFiles?: TypedFiles;
  /** C12 (PF11, PF12) : moteur PDF de la page (`createPdfEngine(loadPdfjs)` dans l'amorce) ; absent : `.pdf` refusé. */
  readonly pdf?: PdfEngine;
  /** C12 (PF19) : écriture du PDF exporté (`PDF_TYPE`) ; absent : « Exporter en PDF… » sans effet. */
  readonly pdfFiles?: TypedFiles;
  /** C12 (PF21) : `loadPdfLib` (import dynamique) dans l'amorce. */
  loadPdfLib?(): Promise<PdfLib>;
  /** C12 (DAPF3) : producteur de superposition d'un onglet, sur `doc`, copie prise au départ de l'export. */
  overlay?(tab: TabSession, doc: CoreDocument): OverlayProducer;
  /** C12 (PF20) : page `index` du PDF `blob` rendue en PNG par pdf.js, repli quand `pdf-lib` refuse le PDF ; absent : null. */
  rasterPage?(blob: Blob, index: number): Promise<RasterPage | null>;
  /** Fin de l'export (réussi, refusé ou en erreur) : libère ce que `rasterPage` a gardé ouvert (un document par blob). */
  rasterClose?(): void;
  /** C14 (M30) : lie un média déposé par son chemin (coque) ; transmis à l'importeur ; absent : aucun média lié. */
  linkMedia?(path: string): Promise<LinkedMedia>;
  /** C14 (M31) : accorde à nouveau le fichier lié `path` s'il existe avec la taille `size` ; absent (web) : liens non lus. */
  relinkMedia?(path: string, size: number): Promise<boolean>;
  /** C4 (D12) : vignette des ressources ajoutées ; absent : ressource sans vignette (pastille du type). */
  thumbnail?: ThumbDeps;
  /** C4 (U25, D19) : `.rbpack` déposé ou passé au lancement, importé dans la bibliothèque ; transmis à l'importeur. */
  importPack?(name: string, bytes: Uint8Array): Promise<boolean>;
  /** C13 (D3, D6) : ZIP (Worker ZIP, mode `board`) et XML (Worker jetable du module `formats`) ; absent : `.iwb`, `.ubz` refusés. */
  readonly board?: BoardPorts;
  /** C13 (D17) : écriture des copies (`IWB_TYPE`, `UBZ_TYPE`) ; absentes : « Enregistrer une copie au format … » sans effet. */
  readonly iwbFiles?: TypedFiles;
  readonly ubzFiles?: TypedFiles;
  /** C16 (O4, O35) : conversion d'un fichier Office de la coque en PDF (lu par morceaux, dossier libéré) ; absent (web) :
   *  « exportez en PDF depuis Office ». Transmis à l'importeur. */
  convertOffice?(path: string): Promise<Blob>;
  /** C16 (O24) : la coque a un convertisseur ; faux : « installez… » sans lire le fichier, `.xlsx` en valeurs. Absent : vrai. Transmis à l'importeur. */
  readonly officeConverter?: boolean;
  /** C16 (O20) : envoie l'original à la coque, qui l'ouvre avec l'application du système. */
  openOriginal?(file: { readonly name: string; readonly blob: Blob }): Promise<void>;
  /** C16 (O22) : la coque accorde sa copie `id` et émet un dépôt ; la page ne nomme jamais un chemin. */
  reimportOriginal?(id: string): Promise<void>;
  /** C16 (O21) : « original modifié » émis par la coque ; rend le désabonnement. */
  onOriginalChanged?(cb: (e: OriginalChange) => void): () => void;
  /** C11a (P17, P18, P25) : contrôleur d'annotation, relu à chaque appel (il est créé après l'espace de travail). */
  annotation?(): AnnotationGate | null;
  /** C11a (P25) : sortie de l'application, relancée après la sortie de l'annotation ; absent (web) : rien n'est relancé. */
  quit?(): Promise<void>;
}

export interface Workspace {
  readonly tabs: Tabs<TabSession>;
  active(): TabSession;
  /** `path` (R1) : chemin du fichier déposé ou du lancement, pour les liens relatifs quand la cible n'est pas `tauri`. */
  openDocument(file: { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget | null; readonly path?: string | null }): Promise<boolean>;
  newBlank(): Promise<void>;
  /** Question si l'onglet est modifié ; dernier onglet : un vierge d'abord (CL5b-5). */
  close(id: string): Promise<boolean>;
  importFiles(files: readonly DroppedFile[], at?: Point | null): Promise<ImportReport>;
  /** Tableau HTML collé (C10b, F19) dans l'onglet actif, centre de la vue ; vrai si le collage est pris (tableau posé
   *  ou refusé pour sa taille), faux sans tableau lisible (PC9). */
  pasteTable(html: string): Promise<boolean>;
  /** C3 : une sélection existe dans l'onglet actif (écouteurs `copy` et `cut`). */
  hasSelection(): boolean;
  /** C3 (Z8) : copie la sélection ; `cut` : puis la supprime, en une étape. */
  copySelection(cut: boolean): Promise<void>;
  /** C3 (PC1) : objets collés, ou refus à dire ; vrai si pris. */
  pasteItems(items: Uint8Array | ItemsRefusal): Promise<boolean>;
  /** C3 : bouton « Coller », presse-papiers interne ; faux s'il est vide. */
  pasteInternal(): Promise<boolean>;
  /** C3 (Z11) : écrit la sélection en `Sélection.rbitem` ; faux sans sélection, sans port ou boîte annulée. */
  exportSelection(): Promise<boolean>;
  /** C3 (Z12) : « Insérer des pages… » : boîte d'ouverture, pages après la page montrée. */
  insertPages(): Promise<boolean>;
  /** C12 (PF2, PF7 à PF10, Q1) : PDF ouvert dans un nouvel onglet ; faux si refusé (avis déjà dit).
   *  C16 (O16) : `original`, fichier Office converti, gardé comme second asset. */
  openPdf(file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }): Promise<boolean>;
  /** C12 (PF19 à PF21) : « Exporter en PDF… » de l'onglet actif ; faux sans port, refusé, onglet fermé ou boîte annulée. */
  exportPdf(): Promise<boolean>;
  /** C13 (D5, Q1) : tableau `.iwb` (ZIP ou XML) ou `.ubz` dans un nouvel onglet ; faux si refusé (avis déjà dit). */
  openBoard(file: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }): Promise<boolean>;
  /** C13 (D17, D18) : copie de l'onglet actif au format ; faux sans port, refusé ou boîte annulée. */
  exportBoard(format: BoardFormat): Promise<boolean>;
  /** C4 (D13, D14) : ressource posée dans l'onglet actif ; `at` client, null = centre de la vue. */
  insertResource(bytes: Uint8Array, name: string, at: Point | null): Promise<InsertOutcome>;
  /** C4 (D1, D2, D12) : sélection ou grille de la page de l'onglet actif, en `.rbitem`, avec sa vignette ; null : avis dit. */
  captureResource(what: "selection" | "grid"): Promise<CapturedResource | null>;
  /** C4 (D10) : question de confirmation (suppression, Vider) ; faux si la boîte échoue. */
  ask(message: string): Promise<boolean>;
  say(message: string): Promise<void>;
  /** C3 : action de la rangée « Sélection ». */
  selection(a: SelectionAction): void;
  canPaste(): boolean;
  onClipboard(cb: () => void): () => void;
  anyDirty(): boolean;
  /** Raccourcis de fichier vers l'onglet actif ; vrai si pris. */
  key(e: FileKey): boolean;
  /** Cmd+Q (macOS) : question si un onglet est modifié, puis `quit`. */
  quitRequested(quit: () => Promise<void>): Promise<void>;
  /** C16 (O19, O20) : « Modifier dans l'application d'origine » sur la page montrée ; faux sans port, sans original ou
   *  refusé (avis dit). */
  editOriginal(): Promise<boolean>;
  /** C11a (P3) : l'onglet d'annotation, créé vierge et non montré s'il n'existe pas ; null à 12 onglets (avis dit). */
  annotationTab(): Promise<TabSession | null>;
  /** C11a (P4) : document de l'onglet en `.roomboard` (la sorte d'onglet n'est pas écrite, P26). */
  encodeTab(tab: TabSession): Promise<Uint8Array>;
  /** C11a (P4) : document de l'onglet d'annotation remplacé (même place, même id, même cible, « modifié ») ; false si
   *  illisible ou sans onglet d'annotation. */
  replaceAnnotation(bytes: Uint8Array): Promise<boolean>;
  /** C11b (P14) : pose (image) ou retire (null) le fond de la page `page` (rang ; absent : page montrée) de l'onglet
   *  d'annotation ; faux sans onglet d'annotation. */
  setAnnotationBackdrop(image: CapturedImage | null, page?: number): Promise<boolean>;
  /** C11b (P17) : fond image de la première page de l'onglet d'annotation, celle où `annotate` s'ouvre (jamais la page
   *  montrée dans la fenêtre principale) ; null : aucun. */
  annotationBackdrop(): PageBackdrop | null;
  /** C11b (P3, P6 à P11) : page envoyée (capture ou fond figé, encre de la page de la vue) après la page montrée de
   *  l'origine, en une étape, ou dans un nouvel onglet ; null : rien inséré (avis dit). */
  sendCapture(o: SendRequest): Promise<SendResult | null>;
  dispose(): void;
}

/** Ce que l'espace de travail sait d'un onglet : son entrée, son id, le dernier titre voulu par son contrôleur. */
interface Slot {
  tab: TabSession | null;
  id: string;
  title: string;
  /** Onglet aux assets non lus (R30) : Enregistrer refusé. */
  unread: boolean;
  /** M31 : chemin absolu de chaque lien tenté à l'ouverture, par id (le magasin passe avant) ; repris au retour d'annotation (OE77). */
  readonly lost: ReadonlyMap<string, string>;
}

/** C14 (M30) : à l'enregistrement en coque, chaque lien connu du magasin est réécrit relatif au document cible ; hors
 *  historique, version inchangée (`relinkAssets`) : l'onglet enregistré reste non modifié. */
function relinkFor(doc: CoreDocument, assets: AssetStore, t: SaveTarget, lost: ReadonlyMap<string, string>): void {
  if (t.kind !== "tauri") return;
  const links = doc.linkedAssets().flatMap((l): LinkedAsset[] => {
    const abs = assets.linked(l.id) ?? lost.get(l.id); // un lien introuvable à l'ouverture est gardé (M31)
    return abs === undefined ? [] : [{ id: l.id, path: relativeLink(t.path, abs) }];
  });
  if (links.length > 0) doc.relinkAssets(links);
}

/** Ordre fixe : premier onglet, `host.onDrop`, `await dropReady()`, puis `launch()` → importFiles. */
export async function createWorkspace(deps: WorkspaceDeps): Promise<Workspace> {
  const { core, host, shell } = deps;
  const tabs = createTabs<TabSession>(deps.newId);
  const slots = new Map<TabSession, Slot>();
  let shown: TabSession | null = null;

  const say = async (message: string): Promise<void> => {
    try {
      await shell.notify(message);
    } catch (e) {
      console.warn(`RoomBoard : ${message} (boîte indisponible : ${messageOf(e)})`);
    }
  };
  const ask = async (message: string): Promise<boolean> => {
    try {
      return await shell.confirm(message);
    } catch (e) {
      console.warn(`RoomBoard : question abandonnée (${messageOf(e)})`);
      return false; // rien n'est abandonné si la boîte échoue
    }
  };

  /** Montre l'onglet actif : l'ancien rend les ids, le nouveau les prend (CL5b-2) ; titre de la fenêtre. */
  const show = (): void => {
    const next = tabs.active()?.session ?? null;
    if (next === shown) return;
    shown?.board.deactivate();
    shown = next;
    if (next === null) return;
    next.board.activate();
    const slot = slots.get(next);
    if (slot !== undefined && slot.title !== "") shell.setTitle(slot.title);
  };

  const mark = (slot: Slot): void => {
    const tab = slot.tab;
    if (tab === null) return;
    const ds = tab.board.stage.dataset;
    ds["fichiers"] = deps.kind;
    ds["modifie"] = tab.files.isDirty() ? "1" : "0";
    ds["fichier"] = tab.files.name();
    ds["tab"] = slot.id;
  };

  /** Shell d'un onglet : aucune garde (celle de la fenêtre suffit), titre transmis seulement s'il est montré. */
  const tabShell = (slot: Slot): ShellPort => ({
    confirm: (m) => shell.confirm(m),
    notify: (m) => shell.notify(m),
    guardClose: () => () => undefined,
    setTitle(title) {
      slot.title = title;
      if (slot.tab !== null && tabs.active()?.session === slot.tab) shell.setTitle(title);
    },
  });

  const released = new WeakSet<TabSession>();
  const release = (tab: TabSession): void => {
    released.add(tab);
    slots.delete(tab);
    tab.files.dispose();
    tab.board.dispose();
  };

  const full = (): boolean => tabs.list().length >= MAX_TABS;
  const makeAssets = deps.makeAssets ?? (() => createAssetStore());
  const relinkMedia = deps.relinkMedia;
  /** M31 : chemin absolu (résolu contre le dossier d'origine) de chaque lien tenté à l'ouverture, par `docPath` puis id. */
  const lostLinks = new Map<string, string>();
  /** M31 : lien absolu tel quel, relatif résolu par le chemin du document (null sans lui), puis accordé par la coque. */
  const relink = async (docPath: string | null, link: LinkedAsset, size: number): Promise<string | null> => {
    if (relinkMedia === undefined) return null;
    const abs = docPath === null ? (isAbsoluteLink(link.path) ? link.path : null) : resolveLink(docPath, link.path);
    if (abs === null) return null;
    lostLinks.set(`${docPath ?? ""}\0${link.id}`, abs);
    try {
      return (await relinkMedia(abs, size)) ? abs : null;
    } catch {
      return null;
    }
  };
  /** M31 : liens tentés par la dernière lecture de `docPath`, retirés de `lostLinks` (ceux du magasin n'y servent pas). */
  const takeLost = (docPath: string | null, doc: CoreDocument | undefined): Map<string, string> => {
    const lost = new Map<string, string>();
    for (const l of doc?.linkedAssets() ?? []) {
      const key = `${docPath ?? ""}\0${l.id}`;
      const abs = lostLinks.get(key);
      if (abs !== undefined) lost.set(l.id, abs);
      lostLinks.delete(key);
    }
    return lost;
  };
  const io = createContainerIO({ core, codec: deps.codec, say, makeAssets, ...(relinkMedia ? { relink } : {}) });
  // Vignette (D29) : une relecture en échec n'est qu'une vignette en moins, dite à la console, jamais par une boîte.
  const thumbIo = createContainerIO({ core, codec: deps.codec, say: async (m) => console.warn(`RoomBoard : vignette non rendue (${m})`), makeAssets });
  const clipboard = deps.clipboard ?? createClipboard(null);
  const fragments = createFragmentOps({ io, core, now: deps.now, appVersion: APP_VERSION, say, alive: (t) => !released.has(t) });
  /** Nom dit dans les messages d'un collage (aucun fichier). */
  const PASTE_NAME = "presse-papiers";

  /** Onglet qui reçoit les images (R3) : session active, magasin de l'onglet, moteur, rectangle du stage. */
  const imageTarget = (t: TabSession): ImageTarget => ({
    assets: t.assets,
    alive: () => !released.has(t),
    page: () => t.board.engine.state().page,
    camera: () => t.board.engine.camera(),
    stageRect: () => t.board.stage.getBoundingClientRect(),
    measure: () => t.board.measure,
    textStyle: () => t.board.engine.textStyle(),
    run: (cmd) => t.board.engine.run(cmd),
    // Z10 : le `.rbitem` déposé s'insère dans cet onglet ; refus déjà dit par `fragments`.
    insertFragment: async (rbitem, at, index, name) => (await fragments.insertResource(t, rbitem, baseName(name), at, index)) === "inserted",
  });

  async function addTab(
    doc: CoreDocument,
    opened: { readonly name: string; readonly target: SaveTarget | null } | null,
    assets: AssetStore = makeAssets(),
    unread = false,
    lost: ReadonlyMap<string, string> = new Map(),
    opts: TabOptions = {},
  ): Promise<TabSession | null> {
    let board: BoardSession;
    try {
      board = await deps.makeSession(doc, assets);
    } catch (e) {
      try {
        doc.free();
      } catch {
        // déjà libéré par la session qui a échoué
      }
      await say(`Nouvel onglet impossible : ${messageOf(e)}`);
      return null;
    }
    const slot: Slot = { tab: null, id: "", title: "", unread, lost };
    // PC3 : hôte de l'onglet ; la cible choisie par la boîte fixe les chemins relatifs des médias liés avant l'encodage.
    const tabHost: FileHost = {
      kind: host.kind,
      open: () => host.open(),
      pick: () => host.pick(),
      onDrop: (h) => host.onDrop(h),
      save: (encode, to) =>
        host.save((t) => {
          relinkFor(board.doc, assets, t, lost);
          return encode(t);
        }, to),
    };
    const files = createFileController({
      encode: (now, appVersion) => io.encode(board.doc, assets, now, appVersion, { kind: "document" }),
      importFiles: (f) => ws.importFiles(f, null),
      saveBlocked: () => (slot.unread || missingOf(board.doc, assets).length > 0 ? UNREAD_ASSETS_MESSAGE : null),
      versions: board.engine,
      host: tabHost,
      shell: tabShell(slot),
      opened,
      ...(opts.dirty === true ? { dirty: true } : {}),
      openInTab: (f) => ws.openDocument(f),
      newTab: () => ws.newBlank(),
      now: deps.now,
      appVersion: APP_VERSION,
    });
    const tab: TabSession = { board, files, assets };
    slot.tab = tab;
    slots.set(tab, slot);
    let id: string;
    let replaced: TabSession | null = null;
    try {
      if (opts.replace !== undefined) {
        // C11a (P4) : même entrée (id, sorte, place, actif) ; jamais `close` + `openDocument`, qui déplaceraient l'onglet.
        const old = tabs.list().find((t) => t.id === opts.replace);
        if (old === undefined || tabs.replace(opts.replace, tab) === null) throw new Error("onglet d'annotation introuvable");
        replaced = old.session;
        id = opts.replace;
      } else {
        id = tabs.add(opts.kind ?? "board", tab, opts.activate ?? true).id;
      }
    } catch (e) {
      release(tab);
      await say(messageOf(e));
      return null;
    }
    if (replaced !== null) release(replaced); // après le `show()` de `tabs.replace` : désactivée avant d'être libérée
    slot.id = id;
    mark(slot);
    files.onChange(() => mark(slot));
    return tab;
  }

  const readSheet = deps.readSheet;
  const linkMedia = deps.linkMedia;
  const parseHtml = deps.parseHtml ?? ((s: string) => new DOMParser().parseFromString(s, "text/html"));
  const importPack = deps.importPack;
  const convertOffice = deps.convertOffice;
  const importer = createImporter({
    openDocument: (f) => ws.openDocument(f),
    notify: say,
    full,
    target: () => {
      const t = tabs.active()?.session;
      return t === undefined ? null : imageTarget(t);
    },
    maxBytes: deps.kind === "tauri" ? null : WEB_MAX_BYTES,
    ...(deps.decode ? { decode: deps.decode } : {}),
    ...(readSheet ? { readSheet } : {}),
    ...(deps.pdf ? { openPdf: (f: { readonly name: string; readonly blob: Blob }) => ws.openPdf(f) } : {}),
    ...(deps.board ? { openBoard: (f: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }) => ws.openBoard(f) } : {}),
    ...(linkMedia ? { linkMedia } : {}),
    ...(deps.model3d ? { model3d: deps.model3d } : {}),
    ...(importPack ? { importPack } : {}),
    // C16 (O4, O5) : coque seulement ; le PDF converti s'ouvre par `openPdf`, l'original gardé.
    ...(convertOffice && deps.pdf
      ? {
          convertOffice,
          ...(deps.officeConverter === undefined ? {} : { officeConverter: deps.officeConverter }),
          openOffice: (f: OfficeOpenFile) => ws.openPdf({ name: f.name, blob: f.pdf, original: f.original }),
        }
      : {}),
  });
  const anyDirty = (): boolean => tabs.list().some((t) => t.session.files.isDirty());
  const gate = (): AnnotationGate | null => deps.annotation?.() ?? null;

  /** C11b : onglet d'annotation, s'il existe. */
  const annotationEntry = () => tabs.list().find((t) => t.kind === "annotation");
  /** C11b (P14, P17) : fond image d'une page (asset cité, taille lue) ; null : aucun, ou fond d'une autre sorte. */
  const imageBackdropOf = (tab: TabSession, page: string): PageBackdrop | null => {
    const b = tab.board.doc.page(page)?.backdrop ?? null;
    if (b === null || b.kind !== "image" || b.w === null || b.h === null) return null;
    const ref = tab.board.doc.asset(b.asset);
    return ref === null ? null : { ref, w: b.w, h: b.h };
  };
  /** C11b (P25) : capture mise au magasin `assets` (empreinte SHA-256). */
  const putCapture = async (assets: AssetStore, image: CapturedImage): Promise<PageBackdrop> => {
    const blob = typed(image.blob, CAPTURE_MIME);
    const id = await assets.put(blob);
    return { ref: { id, name: CAPTURE_ASSET_NAME, mime: CAPTURE_MIME, size: blob.size }, w: image.width, h: image.height };
  };

  let exporting = false;
  const ws: Workspace = {
    tabs,
    active() {
      const tab = tabs.active();
      if (tab === null) throw new Error("aucun onglet");
      return tab.session;
    },
    async openDocument(file) {
      const name = baseName(file.name); // jamais un chemin affiché (`\\?\C:\…` compris)
      if (full()) {
        await say(TOO_MANY_TABS);
        return false;
      }
      const target = file.target;
      const docPath = target?.kind === "tauri" ? target.path : (file.path ?? null); // R1
      const read = await io.read(name, file.bytes, "document", docPath);
      const lost = takeLost(docPath, read?.doc);
      if (read === null) return false;
      return (await addTab(read.doc, { name, target: file.target }, read.assets, read.unread, lost)) !== null;
    },
    async openPdf(file) {
      const name = baseName(file.name);
      const pdf = deps.pdf;
      if (pdf === undefined) return false;
      if (full()) {
        await say(TOO_MANY_TABS);
        return false;
      }
      let opened: PdfFile;
      try {
        opened = await pdf.open(file.blob);
      } catch (e) {
        await say(e instanceof PdfEncryptedError ? `${name} : ${PDF_ENCRYPTED_MESSAGE}` : `Ouverture impossible (${name}) : ${messageOf(e)}`);
        return false;
      }
      try {
        const total = opened.pageCount;
        if (total === 0) {
          await say(`Ouverture impossible (${name}) : ${PDF_NO_PAGE_MESSAGE}`);
          return false;
        }
        const sizes: PdfPageSize[] = [];
        for (let i = 0; i < Math.min(total, PDF_MAX_PAGES); i++) sizes.push(await opened.pageSize(i));
        const assets = makeAssets();
        const blob = typed(file.blob, PDF_MIME);
        // C16 (O5, O16) : PDF converti nommé `<racine>.pdf`, original gardé (nom et type Office), onglet `<racine>.roomboard`.
        const original = file.original;
        const root = original === undefined ? stem(name, PDF_EXTENSION) : officeStemOf(name);
        const id = await assets.put(blob);
        const pdfRef: AssetRef = { id, name: original === undefined ? name : `${root}${PDF_EXTENSION}`, mime: PDF_MIME, size: blob.size };
        let originalRef: AssetRef | undefined;
        if (original !== undefined) {
          const ob = typed(original, officeMimeOf(name));
          originalRef = { id: await assets.put(ob), name, mime: ob.type, size: ob.size };
        }
        const doc = core.fromPdfPages(pdfRef, sizes, originalRef);
        if (total > PDF_MAX_PAGES) await say(pdfFirstPagesMessage(name, total));
        return (await addTab(doc, { name: `${root}${ROOMBOARD_EXTENSION}`, target: null }, assets)) !== null;
      } catch (e) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return false;
      } finally {
        opened.destroy(); // l'onglet rouvre le PDF au premier dessin (PC11, HPF2-10)
      }
    },
    async exportPdf() {
      const { pdfFiles, loadPdfLib, overlay } = deps;
      if (pdfFiles === undefined || loadPdfLib === undefined || overlay === undefined) return false;
      if (exporting) {
        await say(BUSY_MESSAGE);
        return false;
      }
      const tab = ws.active(); // onglet montré à l'appel (R3)
      if (missingOf(tab.board.doc, tab.assets).length > 0) {
        await say(UNREAD_ASSETS_MESSAGE);
        return false;
      }
      exporting = true;
      let doc: CoreDocument | null = null;
      let rasterClosed = false;
      /** Sessions de rendu ouvertes par `rasterPage` : fermées dès l'assemblage fini (avant la feuille d'enregistrement, longue), une fois. */
      const closeRaster = (): void => {
        if (rasterClosed) return;
        rasterClosed = true;
        deps.rasterClose?.();
      };
      try {
        // Copie prise au départ (DAPF3) : fermer l'onglet pendant l'export libère son document, pas celle-ci.
        const [manifest, ybin] = tab.board.doc.saveParts(deps.now(), APP_VERSION);
        doc = core.loadParts(manifest, ybin);
        const blobs = new Map<string, Blob>(); // un seul `Blob` par asset pendant l'export : `rasterPage` ouvre le PDF une fois
        const r = await assemblePdf(doc, tab.assets, {
          loadPdfLib: () => loadPdfLib(),
          overlay: overlay(tab, doc),
          alive: () => !released.has(tab),
          rasterPage: async (asset, index) => {
            const blob = blobs.get(asset) ?? tab.assets.get(asset);
            if (blob !== undefined) blobs.set(asset, blob);
            return blob === undefined || deps.rasterPage === undefined ? null : deps.rasterPage(blob, index);
          },
        });
        closeRaster();
        if (r === null) return false; // onglet fermé pendant l'export : rien à dire
        if (r.rasterized) await say(PDF_RASTER_MESSAGE);
        if (r.rasterMissing) await say(PDF_RASTER_MISSING_MESSAGE);
        if (r.cut) await say(PDF_CUT_MESSAGE);
        const saved = await pdfFiles.save(exportPdfName(tab.files.name(), r.annotated), r.bytes);
        if (saved) await say(pdfExportedMessage(r.pages));
        return saved;
      } catch (e) {
        await say(`Export impossible : ${messageOf(e)}`);
        return false;
      } finally {
        exporting = false;
        doc?.free();
        closeRaster(); // même en cas d'erreur
      }
    },
    async openBoard(file) {
      const name = baseName(file.name);
      const board = deps.board;
      if (board === undefined) return false;
      if (full()) {
        await say(TOO_MANY_TABS);
        return false;
      }
      try {
        const head = new Uint8Array(await file.blob.slice(0, 8).arrayBuffer()); // signature ZIP (4 octets) ou Bamboo (8)
        let src: BoardSources;
        let parts: readonly BoardPart[];
        let total: number;
        if (file.format === "flipchart") {
          // Signature contrôlée ici aussi (le registre l'a vue, un appel direct non) ; le Worker ZIP la contrôle encore.
          if (!hasBambooMagic(head)) throw new Error(BAMBOO_NOT_FLIPCHART);
          const split = flipchartSources(await board.unbamboo(file.blob));
          src = { xml: [], names: [], manifest: null, json: null, media: split.media, total: 1 };
          const structure = await Promise.all(split.structure.map(async (e) => ({ path: e.path, bytes: new Uint8Array(await e.blob.arrayBuffer()) })));
          parts = [await board.readFlipchart(structure)];
          total = 1; // l'avis des 500 premières pages vient du lecteur Rust
        } else if (hasZipMagic(head)) {
          const entries = await board.unzip(file.blob);
          const fmt = resolveBoardFormat(file.format, entries.map((e) => e.path));
          if (fmt === null) throw new Error(boardNoContentMessage(file.format));
          src = boardSources(fmt, entries);
          if (fmt === "olf") {
            const part = await board.readOlf(src.json!); // Worker ZIP : JSON lu hors du fil principal
            parts = [part];
            total = part.total;
          } else {
            const xml = await Promise.all(src.xml.map(async (b) => new Uint8Array(await b.arrayBuffer())));
            const manifest = src.manifest === null ? null : new Uint8Array(await src.manifest.arrayBuffer());
            parts = await board.read(xml, fmt, fmt === "notebook" ? { names: src.names, manifest, max: PDF_MAX_PAGES } : undefined);
            total = src.total;
          }
        } else if (file.format === "iwb") {
          src = { xml: [file.blob], names: ["content.xml"], manifest: null, json: null, media: new Map(), total: 1 };
          parts = await board.read([new Uint8Array(await file.blob.arrayBuffer())], "iwb");
          total = 1;
        } else throw new Error(file.format === "ubz" ? UBZ_NOT_ZIP_MESSAGE : boardNoContentMessage(file.format));
        // D16 : budget d'objets restant passé au décodage, part par part : la borne tient avant le pic de mémoire.
        const pages: BoardListPage[] = [];
        let left = BOARD_MAX_OBJECTS;
        for (const p of parts) {
          const got = decodeBoardList(p.ops, p.texts, left);
          left -= boardObjectCount(got);
          pages.push(...got);
        }
        if (pages.length === 0) {
          await say(`Ouverture impossible (${name}) : ${BOARD_NO_PAGE_MESSAGE}`);
          return false;
        }
        const built = await buildBoardDocument(core, pages, src.media, {
          makeAssets,
          decode: deps.decode ?? ((b, k) => decodeImage(b, k)),
          now: deps.now(),
          appVersion: APP_VERSION,
        });
        const warnings = [...(total > PDF_MAX_PAGES ? [boardFirstPagesMessage(total)] : []), ...mergeBoardWarnings([parts.flatMap((p) => p.warnings), built.warnings])];
        if ((await addTab(built.doc, { name: boardTabName(name, file.format), target: null }, built.assets)) === null) return false;
        if (warnings.length > 0) await say(boardWarningsMessage(name, warnings));
        return true;
      } catch (e) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return false;
      }
    },
    async exportBoard(format) {
      const board = deps.board;
      const files = format === "iwb" ? deps.iwbFiles : deps.ubzFiles;
      if (board === undefined || files === undefined) return false;
      if (exporting) {
        await say(BUSY_MESSAGE);
        return false;
      }
      const tab = ws.active(); // onglet montré à l'appel (R3)
      if (missingOf(tab.board.doc, tab.assets).length > 0) {
        await say(UNREAD_ASSETS_MESSAGE);
        return false;
      }
      exporting = true;
      let doc: CoreDocument | null = null;
      try {
        // Copie prise au départ (comme l'export PDF, DAPF3) : fermer l'onglet pendant l'écriture ne la libère pas.
        const [manifest, ybin] = tab.board.doc.saveParts(deps.now(), APP_VERSION);
        doc = core.loadParts(manifest, ybin);
        const r = await boardListOf(doc, tab.assets, format);
        const xml = await board.write(r.list, format);
        const bytes = await board.zip([...xml, ...r.files]);
        const saved = await files.save(boardExportName(tab.files.name(), format), bytes);
        if (saved) await say(boardSavedMessage(format, r.warnings));
        return saved;
      } catch (e) {
        await say(`Export impossible : ${messageOf(e)}`);
        return false;
      } finally {
        exporting = false;
        doc?.free();
      }
    },
    async newBlank() {
      if (full()) {
        await say(TOO_MANY_TABS);
        return;
      }
      await addTab(core.blank(), null);
    },
    async annotationTab() {
      const existing = tabs.list().find((t) => t.kind === "annotation");
      if (existing !== undefined) return existing.session;
      if (full()) {
        await say(TOO_MANY_TABS);
        return null;
      }
      return addTab(core.blank(), null, makeAssets(), false, new Map(), { kind: "annotation", activate: false });
    },
    encodeTab: (tab) => io.encode(tab.board.doc, tab.assets, deps.now(), APP_VERSION, { kind: "document" }),
    async replaceAnnotation(bytes) {
      const entry = tabs.list().find((t) => t.kind === "annotation");
      if (entry === undefined) return false;
      const old = entry.session;
      // OE77 : les liens du document rendu (relatifs après un enregistrement) se résolvent par l'onglet remplacé.
      const known = new Map(slots.get(old)?.lost ?? []);
      for (const l of old.board.doc.linkedAssets()) {
        const abs = old.assets.linked(l.id);
        if (abs !== undefined) known.set(l.id, abs);
      }
      const read = await io.read(old.files.name(), bytes, "document", null, known);
      const lost = takeLost(null, read?.doc);
      if (read === null) return false;
      const opened = { name: old.files.name(), target: old.files.target() };
      return (await addTab(read.doc, opened, read.assets, read.unread, lost, { kind: "annotation", dirty: true, replace: entry.id })) !== null;
    },
    async setAnnotationBackdrop(image, page) {
      const tab = annotationEntry()?.session;
      if (tab === undefined) return false;
      const id = (page === undefined ? undefined : tab.board.doc.pageIds()[page]) ?? tab.board.engine.state().page;
      const b = image === null ? null : await putCapture(tab.assets, image);
      const backdrop = b === null ? null : { asset: b.ref, w: b.w, h: b.h, fit: "width" as const };
      return tab.board.engine.run({ type: "SetBackdrop", page: id, backdrop }) !== null;
    },
    annotationBackdrop() {
      const tab = annotationEntry()?.session;
      const first = tab?.board.doc.pageIds()[0];
      return tab === undefined || first === undefined ? null : imageBackdropOf(tab, first);
    },
    async sendCapture(o) {
      const src = annotationEntry()?.session ?? null;
      const srcPages = src?.board.doc.pageIds() ?? [];
      const inkPage = srcPages[o.view?.page ?? 0] ?? srcPages[0] ?? null;
      const origin = o.to === "origin" ? tabs.list().find((t) => t.id === o.origin && t.kind === "board") : undefined;
      const to: SendTarget = origin === undefined ? "new" : "origin"; // P6 : origine fermée → nouvel onglet
      if (to === "new" && full()) {
        await say(TOO_MANY_TABS);
        return null;
      }
      const assets = origin?.session.assets ?? makeAssets();
      let doc: CoreDocument | null;
      try {
        let backdrop: PageBackdrop | null = null;
        if (o.image !== null) backdrop = await putCapture(assets, o.image);
        else if (o.frozen === true && src !== null && inkPage !== null) {
          // P14 : bureau figé : le fond de la page d'annotation part avec la page.
          const frozen = imageBackdropOf(src, inkPage);
          const blob = frozen === null ? undefined : src.assets.get(frozen.ref.id);
          if (frozen !== null && blob !== undefined) {
            assets.adopt(frozen.ref.id, blob);
            backdrop = frozen;
          }
        }
        const ink = src === null || inkPage === null ? null : { doc: src.board.doc, page: inkPage };
        doc = capturePage(core, ink, backdrop, o.view?.matrix ?? IDENTITY_MATRIX);
      } catch (e) {
        await say(`Envoi impossible : ${messageOf(e)}`);
        return null;
      }
      if (doc === null) {
        await say(NOTHING_TO_SEND_MESSAGE);
        return null;
      }
      if (origin === undefined) {
        // P9 : nouvel onglet ; copie sans historique (Ctrl+Z n'y retire pas le fond).
        let fresh: CoreDocument;
        try {
          const [manifest, ybin] = doc.saveParts(deps.now(), APP_VERSION);
          fresh = core.loadParts(manifest, ybin);
        } finally {
          doc.free();
        }
        const tab = await addTab(fresh, { name: CAPTURE_TAB_NAME, target: null }, assets, false, new Map(), { dirty: true });
        return tab === null ? null : { to, page: 1 };
      }
      const target = origin.session;
      const before = new Set(target.board.doc.pageIds());
      try {
        // P3 : une transaction, une étape ; la page insérée est montrée.
        if (target.board.engine.insertPages(doc) === null) return null;
      } finally {
        doc.free();
      }
      tabs.activate(origin.id);
      return { to, page: target.board.doc.pageIds().findIndex((p) => !before.has(p)) + 1 };
    },
    async close(id) {
      if (closing.has(id)) return false; // double clic : le second appel ne fait rien
      closing.add(id);
      try {
        return await closeTab(id);
      } finally {
        closing.delete(id);
      }
    },
    importFiles: (files, at = null) => importer.importFiles(files, at),
    async pasteTable(html) {
      const t = tabs.active()?.session;
      if (t === undefined) return false;
      if (html.length > PASTE_MAX_CHARS) {
        await say(PASTE_TOO_BIG);
        return true;
      }
      const grid = tableFromHtml(html, parseHtml);
      if (grid === null) return false;
      await insertTableGrid(imageTarget(t), grid, null, 0, say);
      return true;
    },
    hasSelection: () => ws.active().board.engine.state().selection.length > 0,
    copySelection(cut) {
      const tab = ws.active();
      const ids = [...tab.board.engine.state().selection];
      const bytes = fragments.encodeSelection(tab).then((b) => {
        if (b === null) throw new Error("sélection vide");
        return b;
      });
      fragments.resetCascade();
      // `put` est appelé ici, sans attente : l'écriture système part pendant le geste (Z8, HZ2-3).
      return clipboard.put(bytes).then(
        async (where) => {
          if (where === "internal") await say(INTERNAL_ONLY_MESSAGE);
          if (cut && !released.has(tab)) tab.board.engine.deleteElements(ids);
        },
        async (e: unknown) => {
          if (e instanceof Error && e.message === "sélection vide") return; // l'avis (images absentes) est déjà dit
          await say(`Copie impossible : ${messageOf(e)}`);
        },
      );
    },
    async pasteItems(items) {
      if (items === "newer" || items === "too-big") {
        await say(items === "newer" ? NEWER_ITEMS_MESSAGE : TOO_BIG_ITEMS_MESSAGE);
        return true;
      }
      return (await fragments.insertOutcome(ws.active(), items, PASTE_NAME, null)) !== "empty"; // pris : inséré, ou refusé avec avis (PC1) ; objet vide : avis, non pris
    },
    async pasteInternal() {
      const last = clipboard.last();
      return last === null ? false : fragments.insert(ws.active(), last, PASTE_NAME, null);
    },
    async exportSelection() {
      const files = deps.itemFiles;
      if (files === undefined) return false;
      try {
        const bytes = await fragments.encodeSelection(ws.active(), "export");
        return bytes === null ? false : await files.save(`${SELECTION_NAME}${RBITEM_EXTENSION}`, bytes);
      } catch (e) {
        await say(`Export impossible : ${messageOf(e)}`);
        return false;
      }
    },
    async insertPages() {
      const tab = ws.active(); // onglet montré à l'appel (R3) : la boîte d'ouverture peut durer
      let file: OpenedFile | null;
      try {
        file = await host.open();
      } catch (e) {
        await say(`Ouverture impossible : ${messageOf(e)}`);
        return false;
      }
      if (file === null) return false;
      return fragments.insertPages(tab, { ...file, name: baseName(file.name) });
    },
    insertResource: (bytes, name, at) => fragments.insertResource(ws.active(), bytes, name, at),
    async captureResource(what) {
      const tab = ws.active();
      const bytes = what === "grid" ? await fragments.encodeGrid(tab) : await fragments.encodeSelection(tab, "export");
      if (bytes === null) {
        if (what === "selection" && tab.board.engine.state().selection.length === 0) await say("aucune sélection, rien n'est ajouté");
        return null;
      }
      const kind = what === "grid" ? "grid" : "fragment";
      // D29 : vignette depuis la ressource relue (sélection extraite ou grille seule), jamais `tab.board.doc`.
      let thumbnail: Blob | null = null;
      const thumbDeps = deps.thumbnail;
      if (thumbDeps !== undefined) {
        const read = await thumbIo.read("vignette", bytes, kind);
        if (read !== null) {
          try {
            thumbnail = await renderThumbnail(read.doc, read.assets, kind, thumbDeps);
          } catch (e) {
            console.warn(`RoomBoard : vignette non rendue (${messageOf(e)})`);
          } finally {
            read.doc.free();
          }
        }
      }
      return { bytes, kind, thumbnail };
    },
    ask,
    say,
    selection(a) {
      const engine = ws.active().board.engine;
      const actions: Record<SelectionAction, () => void> = {
        group: () => void engine.group(),
        ungroup: () => void engine.ungroup(),
        copy: () => void ws.copySelection(false),
        paste: () => void ws.pasteInternal(),
        export: () => void ws.exportSelection(),
      };
      actions[a]();
    },
    canPaste: () => clipboard.last() !== null,
    onClipboard: (cb) => clipboard.onChange(cb),
    anyDirty,
    key: (e) => ws.active().files.key(e),
    async quitRequested(quit) {
      const a = gate();
      if (a !== null && a.state().active) await a.exit(); // P25 : sortie d'abord (document récupéré)
      if (anyDirty() && !(await ask(DISCARD_MESSAGE))) return;
      await quit();
    },
    async editOriginal() {
      const open = deps.openOriginal;
      if (open === undefined) return false;
      const tab = ws.active(); // onglet montré à l'appel (R3)
      const id = tab.board.doc.page(tab.board.engine.state().page)?.backdrop?.original ?? null;
      if (id === null) {
        await say(NOT_OFFICE_PAGE_MESSAGE);
        return false;
      }
      const blob = tab.assets.get(id);
      const info = tab.board.doc.asset(id);
      if (blob === undefined || info === null) {
        await say(UNREAD_ASSETS_MESSAGE);
        return false;
      }
      try {
        await open({ name: info.name, blob });
        return true;
      } catch (e) {
        await say(`Ouverture impossible (${info.name}) : ${messageOf(e)}`);
        return false;
      }
    },
    dispose() {
      stopGuard();
      stopDrop();
      stopOriginal();
      stopTabs();
      for (const t of tabs.list()) release(t.session);
    },
  };
  const closing = new Set<string>();
  async function closeTab(id: string): Promise<boolean> {
    const entry = tabs.list().find((t) => t.id === id);
    if (entry === undefined) return false;
    const tab = entry.session;
    if (tab.files.isDirty() && !(await ask(DISCARD_MESSAGE))) return false;
    if (tabs.list().length === 1 && (await addTab(core.blank(), null)) === null) return false;
    if (tabs.remove(id) === null) return false;
    release(tab);
    // C11a (P13) : onglet d'annotation fermé, `annotate` détruite (sortie d'abord si active).
    if (entry.kind === "annotation") {
      void gate()
        ?.close()
        .catch((e: unknown) => console.warn(`RoomBoard : fenêtre d'annotation non fermée (${messageOf(e)})`));
    }
    return true;
  }

  const stopTabs = tabs.onChange(show);
  // Premier document : `startDocument` l'a lu par `core.load` (attente IndexedDB) ; s'il cite des images, elles ne
  // sont pas lues et l'onglet est marqué (R30, HR20).
  const first = await addTab(
    deps.first.doc,
    deps.first.opened === null ? null : { name: baseName(deps.first.opened.name), target: deps.first.opened.target },
    makeAssets(),
    deps.first.doc.citedAssets().length > 0,
  );
  if (first === null) throw new Error("RoomBoard : premier onglet impossible");
  if (deps.first.error !== null) {
    first.board.stage.dataset["fichierErreur"] = deps.first.error;
    void say(deps.first.error);
  }
  // C11a (P25) : en annotation, fermeture refusée sans question, sortie, puis fermeture relancée (garde ordinaire).
  let diverting = false; // une sortie détournée en cours absorbe la suivante : une seule question
  const stopGuard = shell.guardClose(anyDirty, DISCARD_MESSAGE, () => {
    const a = gate();
    if (a === null || !a.state().active) return diverting;
    if (diverting) return true;
    diverting = true;
    const quit = deps.quit;
    void a
      .exit()
      .then(() => (quit === undefined ? undefined : ws.quitRequested(quit)))
      .catch((e: unknown) => console.warn(`RoomBoard : fermeture abandonnée (${messageOf(e)})`))
      .finally(() => {
        diverting = false;
      });
    return true;
  });
  // C11a (P17, P18) : en annotation, tout dépôt natif sur la fenêtre principale compte comme un dépôt sur la zone.
  const stopDrop = host.onDrop((files, at) => {
    const a = gate();
    const done: Promise<unknown> = a !== null && a.state().active ? a.dropOnZone(files, at) : ws.importFiles(files, at);
    void done.catch((e: unknown) => {
      console.warn(`RoomBoard : dépôt abandonné (${messageOf(e)})`);
    });
  });
  // C16 (O22) : « original modifié » → question ; oui : la coque réimporte (dépôt émis, nouvel onglet) ; non : rien, la
  // surveillance continue.
  const reimport = deps.reimportOriginal;
  const asking = new Set<string>(); // ids dont la question est ouverte : un second événement n'en pose pas une deuxième
  const stopOriginal =
    deps.onOriginalChanged?.((e) => {
      if (reimport === undefined || asking.has(e.id)) return;
      asking.add(e.id);
      void (async () => {
        try {
          if (await ask(originalChangedMessage(e.name))) await reimport(e.id);
        } finally {
          asking.delete(e.id);
        }
      })().catch((err: unknown) => {
        console.warn(`RoomBoard : réimport abandonné (${messageOf(err)})`);
      });
    }) ?? (() => undefined);
  try {
    await deps.dropReady(); // sinon un fichier émis par la coque avant l'écoute se perd (écart T87)
  } catch (e) {
    console.warn(`RoomBoard : écoute du dépôt indisponible (${messageOf(e)})`);
  }
  if (deps.launch !== undefined) {
    let launched: readonly DroppedFile[] = [];
    try {
      launched = await deps.launch();
    } catch (e) {
      console.warn(`RoomBoard : fichiers du lancement illisibles (${messageOf(e)})`);
    }
    if (launched.length > 0) {
      await ws.importFiles(launched, null).catch((e: unknown) => {
        console.warn(`RoomBoard : ouverture au lancement abandonnée (${messageOf(e)})`);
      });
    }
  }
  return ws;
}
