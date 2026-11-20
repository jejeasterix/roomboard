/**
 * Espace de travail (D27 amendée, Q1, T98) : la fenêtre tient plusieurs onglets, chacun avec sa `BoardSession` (T93)
 * et son contrôleur de fichiers. Ouvrir, Nouveau, le dépôt et le fichier du lancement ouvrent un onglet, sans question
 * (CL5b-3). Une seule garde de fermeture pour la fenêtre, vraie si un onglet au moins est modifié (CL5b-6) ; le titre
 * de la fenêtre est celui de l'onglet actif. Le marquage `#stage[data-fichiers|data-modifie|data-fichier|data-tab]` est
 * tenu sur le stage de chaque onglet : l'id `stage` suivant l'onglet actif (CL5b-2), `#stage` décrit l'onglet montré.
 */
import type { CoreDocument, CoreFactory } from "../core/api";
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
import type { DroppedFile, FileHost, HostKind, Point, SaveTarget, ShellPort } from "../platform/files";
import { baseName } from "../platform/host-tauri";
import type { ImageDecoder, ImageTarget } from "../platform/image-import";
import { createImporter, WEB_MAX_BYTES, type ImportReport } from "../platform/import";
import type { StartedDocument } from "../platform/mount";
import type { BoardSession } from "./board-session";
import { createContainerIO, missingOf } from "./container-io";
import { createTabs, MAX_TABS, TOO_MANY_TABS, type Tabs } from "./tabs";

export { CODEC_FALLBACK_MESSAGE } from "./container-io";

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
  readonly first: StartedDocument;
  makeSession(doc: CoreDocument, assets: AssetStore): Promise<BoardSession>;
  /** Attendue après `host.onDrop` et avant `launch` (écart T87). */
  dropReady(): Promise<void>;
  /** Fichiers du lancement (Tauri : `() => launchFiles(ipc)`) ; absent hors coque. */
  launch?(): Promise<readonly DroppedFile[]>;
  readonly now: () => string;
  readonly newId: () => string;
}

export interface Workspace {
  readonly tabs: Tabs<TabSession>;
  active(): TabSession;
  openDocument(file: { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget | null }): Promise<boolean>;
  newBlank(): Promise<void>;
  /** Question si l'onglet est modifié ; dernier onglet : un vierge d'abord (CL5b-5). */
  close(id: string): Promise<boolean>;
  importFiles(files: readonly DroppedFile[], at?: Point | null): Promise<ImportReport>;
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

  /** Onglet qui reçoit les images (R3) : session active, magasin de l'onglet, moteur, rectangle du stage. */
  const imageTarget = (t: TabSession): ImageTarget => ({
    assets: t.assets,
    alive: () => !released.has(t),
    page: () => t.board.engine.state().page,
    camera: () => t.board.engine.camera(),
    stageRect: () => t.board.stage.getBoundingClientRect(),
    run: (cmd) => t.board.engine.run(cmd),
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
  });
  const anyDirty = (): boolean => tabs.list().some((t) => t.session.files.isDirty());

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
