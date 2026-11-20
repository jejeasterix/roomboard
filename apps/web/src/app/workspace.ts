/**
 * Espace de travail (D27 amendée, Q1, T98) : la fenêtre tient plusieurs onglets, chacun avec sa `BoardSession` (T93)
 * et son contrôleur de fichiers. Ouvrir, Nouveau, le dépôt et le fichier du lancement ouvrent un onglet, sans question
 * (CL5b-3). Une seule garde de fermeture pour la fenêtre, vraie si un onglet au moins est modifié (CL5b-6) ; le titre
 * de la fenêtre est celui de l'onglet actif. Le marquage `#stage[data-fichiers|data-modifie|data-fichier|data-tab]` est
 * tenu sur le stage de chaque onglet : l'id `stage` suivant l'onglet actif (CL5b-2), `#stage` décrit l'onglet montré.
 */
import { PDF_MAX_PAGES, type CoreDocument, type CoreFactory, type PdfPageSize } from "../core/api";
import { createAssetStore, type AssetStore } from "../core/asset-store";
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
import type { ImageDecoder, ImageTarget } from "../platform/image-import";
import { PDF_ENCRYPTED_MESSAGE, PdfEncryptedError } from "../platform/pdf-render";
import { createImporter, WEB_MAX_BYTES, type ImportReport } from "../platform/import";
import type { StartedDocument } from "../platform/mount";
import { insertTableGrid } from "../platform/table-insert";
import type { TypedFiles } from "../platform/typed-files";
import type { BoardSession } from "./board-session";
import { createContainerIO, missingOf, typed } from "./container-io";
import { createFragmentOps, SELECTION_NAME } from "./fragments";
import { exportPdf as assemblePdf, PDF_CUT_MESSAGE, PDF_RASTER_MESSAGE, type OverlayProducer, type PdfLib, type RasterPage } from "./pdf-export";
import { createTabs, MAX_TABS, TOO_MANY_TABS, type Tabs } from "./tabs";

import type { SelectionAction } from "./toolbar-host";

export { CODEC_FALLBACK_MESSAGE } from "./container-io";

/** C12 : avis de l'import et de l'export PDF (PF7, PF19, PC10). */
export const PDF_NO_PAGE_MESSAGE = "PDF sans page";
export const BUSY_MESSAGE = "Opération en cours";
export const pdfFirstPagesMessage = (name: string, total: number): string => `${name} : ${PDF_MAX_PAGES} premières pages importées sur ${total}`;
export const pdfExportedMessage = (pages: number): string => `PDF exporté (${pages} page${pages > 1 ? "s" : ""})`;
const stemOf = (name: string, ext: string): string => (name.toLowerCase().endsWith(ext) && name.length > ext.length ? name.slice(0, -ext.length) : name);
/** Nom proposé (PF19) : `<base> annoté.pdf` si une page d'origine est recopiée, sinon `<base>.pdf`. */
export const exportPdfName = (tabName: string, annotated: boolean): string =>
  `${stemOf(tabName, ROOMBOARD_EXTENSION)}${annotated ? " annoté" : ""}${PDF_EXTENSION}`;

export interface TabSession {
  readonly board: BoardSession;
  readonly files: FileController;
  /** Octets des images de l'onglet (R12). */
  readonly assets: AssetStore;
}

export interface WorkspaceDeps {
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
}

export interface Workspace {
  readonly tabs: Tabs<TabSession>;
  active(): TabSession;
  openDocument(file: { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget | null }): Promise<boolean>;
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
  /** C12 (PF2, PF7 à PF10, Q1) : PDF ouvert dans un nouvel onglet ; faux si refusé (avis déjà dit). */
  openPdf(file: { readonly name: string; readonly blob: Blob }): Promise<boolean>;
  /** C12 (PF19 à PF21) : « Exporter en PDF… » de l'onglet actif ; faux sans port, refusé, onglet fermé ou boîte annulée. */
  exportPdf(): Promise<boolean>;
  /** C3 : action de la rangée « Sélection ». */
  selection(a: SelectionAction): void;
  canPaste(): boolean;
  onClipboard(cb: () => void): () => void;
  anyDirty(): boolean;
  /** Raccourcis de fichier vers l'onglet actif ; vrai si pris. */
  key(e: FileKey): boolean;
  /** Cmd+Q (macOS) : question si un onglet est modifié, puis `quit`. */
  quitRequested(quit: () => Promise<void>): Promise<void>;
  dispose(): void;
}

/** Ce que l'espace de travail sait d'un onglet : son entrée, son id, le dernier titre voulu par son contrôleur. */
interface Slot {
  tab: TabSession | null;
  id: string;
  title: string;
  /** Onglet aux assets non lus (R30) : Enregistrer refusé. */
  unread: boolean;
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
  const io = createContainerIO({ core, codec: deps.codec, say, makeAssets });
  const clipboard = deps.clipboard ?? createClipboard(null);
  const fragments = createFragmentOps({ io, now: deps.now, appVersion: APP_VERSION, say, alive: (t) => !released.has(t) });
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
    insertFragment: (rbitem, at, index, name) => fragments.insert(t, rbitem, baseName(name), at, index),
  });

  async function addTab(
    doc: CoreDocument,
    opened: { readonly name: string; readonly target: SaveTarget | null } | null,
    assets: AssetStore = makeAssets(),
    unread = false,
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
    const slot: Slot = { tab: null, id: "", title: "", unread };
    const files = createFileController({
      encode: (now, appVersion) => io.encode(board.doc, assets, now, appVersion, { kind: "document" }),
      importFiles: (f) => ws.importFiles(f, null),
      saveBlocked: () => (slot.unread || missingOf(board.doc, assets).length > 0 ? UNREAD_ASSETS_MESSAGE : null),
      versions: board.engine,
      host,
      shell: tabShell(slot),
      opened,
      openInTab: (f) => ws.openDocument(f),
      newTab: () => ws.newBlank(),
      now: deps.now,
      appVersion: APP_VERSION,
    });
    const tab: TabSession = { board, files, assets };
    slot.tab = tab;
    slots.set(tab, slot);
    let id: string;
    try {
      id = tabs.add("board", tab).id;
    } catch (e) {
      release(tab);
      await say(messageOf(e));
      return null;
    }
    slot.id = id;
    mark(slot);
    files.onChange(() => mark(slot));
    return tab;
  }

  const readSheet = deps.readSheet;
  const parseHtml = deps.parseHtml ?? ((s: string) => new DOMParser().parseFromString(s, "text/html"));
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
  });
  const anyDirty = (): boolean => tabs.list().some((t) => t.session.files.isDirty());

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
      const read = await io.read(name, file.bytes, "document");
      if (read === null) return false;
      return (await addTab(read.doc, { name, target: file.target }, read.assets, read.unread)) !== null;
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
        const id = await assets.put(blob);
        const doc = core.fromPdfPages({ id, name, mime: PDF_MIME, size: blob.size }, sizes);
        if (total > PDF_MAX_PAGES) await say(pdfFirstPagesMessage(name, total));
        return (await addTab(doc, { name: `${stemOf(name, PDF_EXTENSION)}${ROOMBOARD_EXTENSION}`, target: null }, assets)) !== null;
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
      // Copie prise au départ (DAPF3) : fermer l'onglet pendant l'export libère son document, pas celle-ci.
      const [manifest, ybin] = tab.board.doc.saveParts(deps.now(), APP_VERSION);
      const doc = core.loadParts(manifest, ybin);
      try {
        const r = await assemblePdf(doc, tab.assets, {
          loadPdfLib: () => loadPdfLib(),
          overlay: overlay(tab, doc),
          alive: () => !released.has(tab),
          rasterPage: async (asset, index) => {
            const blob = tab.assets.get(asset);
            return blob === undefined || deps.rasterPage === undefined ? null : deps.rasterPage(blob, index);
          },
        });
        if (r === null) return false; // onglet fermé pendant l'export : rien à dire
        if (r.rasterized) await say(PDF_RASTER_MESSAGE);
        if (r.cut) await say(PDF_CUT_MESSAGE);
        const saved = await pdfFiles.save(exportPdfName(tab.files.name(), r.annotated), r.bytes);
        if (saved) await say(pdfExportedMessage(r.pages));
        return saved;
      } catch (e) {
        await say(`Export impossible : ${messageOf(e)}`);
        return false;
      } finally {
        exporting = false;
        doc.free();
      }
    },
    async newBlank() {
      if (full()) {
        await say(TOO_MANY_TABS);
        return;
      }
      await addTab(core.blank(), null);
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
      if (anyDirty() && !(await ask(DISCARD_MESSAGE))) return;
      await quit();
    },
    dispose() {
      stopGuard();
      stopDrop();
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
  const stopGuard = shell.guardClose(anyDirty, DISCARD_MESSAGE);
  const stopDrop = host.onDrop((files, at) => {
    void ws.importFiles(files, at).catch((e: unknown) => {
      console.warn(`RoomBoard : dépôt abandonné (${messageOf(e)})`);
    });
  });
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
