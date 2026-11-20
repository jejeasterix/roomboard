/**
 * Branchement des fichiers dans l'amorce (D26, DA8, T98). `startDocument` rend le document du premier onglet : le
 * fichier en attente d'une version précédente, sinon une page vide. `prepareHost` choisit l'hôte et le shell de la
 * fenêtre ; l'espace de travail (`app/workspace.ts`) tient ensuite les onglets, leurs contrôleurs et leur marquage.
 * `prepareFiles(...).mount` est le montage d'une seule session, gardé tant que `main.ts` l'appelle (retiré par T95).
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import {
  APP_VERSION,
  createFileController,
  DISCARD_MESSAGE,
  messageOf,
  type FileController,
  type VersionSource,
} from "./controller";
import {
  chooseHostKind,
  detectHostEnvironment,
  parseHostChoice,
  type FileHost,
  type HostKind,
  type PendingOpen,
  type PendingStore,
  type ShellPort,
} from "./files";
import { createFsaHost, type FsaWindow } from "./host-fsa";
import { browserFallbackDeps, createFallbackHost } from "./host-repli";
import { createIdbPendingStore, createUnavailablePendingStore } from "./pending";
import { createWebShell } from "./shell-web";

export interface StartedDocument {
  readonly doc: CoreDocument;
  readonly opened: PendingOpen | null;
  readonly error: string | null;
}

/** @deprecated Montage d'une seule session, pour `main.ts` jusqu'à T95 ; les onglets passent par `createWorkspace`. */
export interface PreparedFiles extends StartedDocument {
  mount(engine: VersionSource, stage: HTMLElement): Promise<FileController>;
}

export interface PreparedHost {
  readonly kind: HostKind;
  readonly host: FileHost;
  readonly shell: ShellPort;
  /** Hôte Tauri : `dropListening()` ; hôtes web : `Promise.resolve()`. */
  dropReady(): Promise<void>;
}

export async function startDocument(core: CoreFactory, pending: PendingStore): Promise<StartedDocument> {
  let opened: PendingOpen | null;
  try {
    opened = await pending.take();
  } catch (e) {
    console.warn(`RoomBoard : attente du fichier illisible (${messageOf(e)})`);
    return { doc: core.blank(), opened: null, error: null };
  }
  if (opened === null) return { doc: core.blank(), opened: null, error: null };
  try {
    return { doc: core.load(opened.bytes), opened, error: null };
  } catch (e) {
    return { doc: core.blank(), opened: null, error: `Ouverture impossible (${opened.name}) : ${messageOf(e)}` };
  }
}

/** Hôte et shell de la fenêtre ; les hôtes web écoutent le dépôt sur `w.document`, l'hôte Tauri sur la coque. */
export async function prepareHost(w: Window): Promise<PreparedHost> {
  const kind = chooseHostKind(detectHostEnvironment(w), parseHostChoice(w.location.search));
  if (kind === "tauri") {
    const { createTauriHost, createTauriShell, loadTauriPorts } = await import("./host-tauri");
    const p = await loadTauriPorts();
    const host = createTauriHost(p.dialog, p.fs, p.ipc, () => w.devicePixelRatio || 1);
    return { kind, host, shell: createTauriShell(p.dialog, p.win), dropReady: () => host.dropListening() };
  }
  const shell = createWebShell({
    confirm: (m) => w.confirm(m),
    alert: (m) => w.alert(m),
    addEventListener: (t, cb) => w.addEventListener(t, cb),
    removeEventListener: (t, cb) => w.removeEventListener(t, cb),
    document: w.document,
  });
  const host =
    kind === "fsa"
      ? createFsaHost(w as unknown as FsaWindow, w.document)
      : createFallbackHost(browserFallbackDeps(w.document, URL), w.document);
  return { kind, host, shell, dropReady: () => Promise.resolve() };
}

export async function prepareFiles(core: CoreFactory, w: Window = window): Promise<PreparedFiles> {
  const pending =
    typeof w.indexedDB === "undefined"
      ? createUnavailablePendingStore("ce navigateur ne peut pas garder le fichier pendant le rechargement (IndexedDB absent)")
      : createIdbPendingStore(w.indexedDB);
  const started = await startDocument(core, pending);
  return {
    ...started,
    async mount(engine, stage) {
      // Pont jusqu'à T95 : une seule session, Ouvrir et Nouveau gardent le comportement du lot 5a (question, attente,
      // rechargement) ; la garde de fermeture est posée ici, plus par le contrôleur.
      const { kind, host, shell } = await prepareHost(w);
      let leaving = false;
      let stopClose: (() => void) | null = null;
      const leave = (): void => {
        leaving = true;
        const stop = stopClose;
        stopClose = null;
        stop?.(); // Tauri : sans cela la garde de fermeture survit au rechargement voulu
        w.location.reload();
      };
      const discardOk = async (): Promise<boolean> => !ctl.isDirty() || shell.confirm(DISCARD_MESSAGE);
      const ctl = createFileController({
        doc: started.doc,
        versions: engine,
        host,
        shell,
        opened: started.opened,
        async openInTab(file) {
          try {
            core.load(file.bytes).free();
          } catch (e) {
            await shell.notify(`Ouverture impossible (${file.name}) : ${messageOf(e)}`);
            return false;
          }
          if (!(await discardOk())) return false;
          await pending.put({ name: file.name, bytes: file.bytes, target: file.target });
          leave();
          return true;
        },
        async newTab() {
          if (!(await discardOk())) return;
          await pending.clear().catch(() => undefined);
          leave();
        },
        now: () => new Date().toISOString(),
        appVersion: APP_VERSION,
      });
      stopClose = shell.guardClose(() => !leaving && ctl.isDirty(), DISCARD_MESSAGE);
      const mark = (): void => {
        stage.dataset["fichiers"] = kind;
        stage.dataset["modifie"] = ctl.isDirty() ? "1" : "0";
        stage.dataset["fichier"] = ctl.name();
      };
      mark();
      ctl.onChange(mark);
      const onKey = (e: KeyboardEvent): void => {
        if (e.isComposing) return;
        if (ctl.key(e)) e.preventDefault();
      };
      w.addEventListener("keydown", onKey);
      if (started.error !== null) {
        stage.dataset["fichierErreur"] = started.error;
        void shell.notify(started.error);
      }
      return {
        ...ctl,
        dispose() {
          w.removeEventListener("keydown", onKey);
          ctl.dispose();
          stopClose?.();
          stopClose = null;
        },
      };
    },
  };
}
