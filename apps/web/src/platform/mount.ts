/**
 * Branchement des fichiers dans l'amorce (D26, DA8) : le seul module que `main.ts` appelle pour les fichiers.
 * `prepareFiles` (avant le moteur) rend le document : le fichier en attente du rechargement, sinon une page vide.
 * `mount` (après le moteur) choisit l'hôte, crée le contrôleur, lie Ctrl+O, Ctrl+S, Ctrl+Maj+S, Ctrl+N et publie
 * l'état dans `#stage` (`data-fichiers`, `data-modifie`, `data-fichier`, `data-fichier-erreur`).
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import {
  APP_VERSION,
  createFileController,
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

export interface PreparedFiles extends StartedDocument {
  mount(engine: VersionSource, stage: HTMLElement): Promise<FileController>;
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

async function hostFor(kind: HostKind, w: Window): Promise<{ host: FileHost; shell: ShellPort }> {
  if (kind === "tauri") {
    const { createTauriHost, createTauriShell, loadTauriPorts } = await import("./host-tauri");
    const p = await loadTauriPorts();
    return { host: createTauriHost(p.dialog, p.fs), shell: createTauriShell(p.dialog, p.win) };
  }
  const shell = createWebShell({
    confirm: (m) => w.confirm(m),
    alert: (m) => w.alert(m),
    addEventListener: (t, cb) => w.addEventListener(t, cb),
    removeEventListener: (t, cb) => w.removeEventListener(t, cb),
    document: w.document,
  });
  if (kind === "fsa") return { host: createFsaHost(w as unknown as FsaWindow), shell };
  return { host: createFallbackHost(browserFallbackDeps(w.document, URL)), shell };
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
      const kind = chooseHostKind(detectHostEnvironment(w), parseHostChoice(w.location.search));
      const { host, shell } = await hostFor(kind, w);
      const ctl = createFileController({
        core,
        doc: started.doc,
        versions: engine,
        host,
        shell,
        pending,
        opened: started.opened,
        reload: () => w.location.reload(),
        now: () => new Date().toISOString(),
        appVersion: APP_VERSION,
      });
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
        },
      };
    },
  };
}
