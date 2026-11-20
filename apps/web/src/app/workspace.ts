/**
 * Espace de travail (D27 amendée, Q1, T98) : la fenêtre tient plusieurs onglets, chacun avec sa `BoardSession` (T93)
 * et son contrôleur de fichiers. Ouvrir, Nouveau, le dépôt et le fichier du lancement ouvrent un onglet, sans question
 * (CL5b-3). Une seule garde de fermeture pour la fenêtre, vraie si un onglet au moins est modifié (CL5b-6) ; le titre
 * de la fenêtre est celui de l'onglet actif. Le marquage `#stage[data-fichiers|data-modifie|data-fichier|data-tab]` est
 * tenu sur le stage de chaque onglet : l'id `stage` suivant l'onglet actif (CL5b-2), `#stage` décrit l'onglet montré.
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import {
  APP_VERSION,
  createFileController,
  DISCARD_MESSAGE,
  messageOf,
  type FileController,
  type FileKey,
} from "../platform/controller";
import type { DroppedFile, FileHost, HostKind, Point, SaveTarget, ShellPort } from "../platform/files";
import { baseName } from "../platform/host-tauri";
import { createImporter, type ImportReport } from "../platform/import";
import type { StartedDocument } from "../platform/mount";
import type { BoardSession } from "./board-session";
import { createTabs, MAX_TABS, TOO_MANY_TABS, type Tabs } from "./tabs";

export interface TabSession {
  readonly board: BoardSession;
  readonly files: FileController;
}

export interface WorkspaceDeps {
  readonly core: CoreFactory;
  readonly host: FileHost;
  /** Pour `data-fichiers`. */
  readonly kind: HostKind;
  readonly shell: ShellPort;
  readonly first: StartedDocument;
  makeSession(doc: CoreDocument): Promise<BoardSession>;
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

  const release = (tab: TabSession): void => {
    slots.delete(tab);
    tab.files.dispose();
    tab.board.dispose();
  };

  const full = (): boolean => tabs.list().length >= MAX_TABS;

  async function addTab(
    doc: CoreDocument,
    opened: { readonly name: string; readonly target: SaveTarget | null } | null,
  ): Promise<TabSession | null> {
    let board: BoardSession;
    try {
      board = await deps.makeSession(doc);
    } catch (e) {
      try {
        doc.free();
      } catch {
        // déjà libéré par la session qui a échoué
      }
      await say(`Nouvel onglet impossible : ${messageOf(e)}`);
      return null;
    }
    const slot: Slot = { tab: null, id: "", title: "" };
    const files = createFileController({
      encode: async (now, appVersion) => board.doc.save(now, appVersion),
      importFiles: (f) => ws.importFiles(f, null),
      versions: board.engine,
      host,
      shell: tabShell(slot),
      opened,
      openInTab: (f) => ws.openDocument(f),
      newTab: () => ws.newBlank(),
      now: deps.now,
      appVersion: APP_VERSION,
    });
    const tab: TabSession = { board, files };
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

  const importer = createImporter({ openDocument: (f) => ws.openDocument(f), notify: say, full });
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
      let doc: CoreDocument;
      try {
        doc = core.load(file.bytes);
      } catch (e) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return false;
      }
      return (await addTab(doc, { name, target: file.target })) !== null;
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
  const first = await addTab(
    deps.first.doc,
    deps.first.opened === null ? null : { name: baseName(deps.first.opened.name), target: deps.first.opened.target },
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
