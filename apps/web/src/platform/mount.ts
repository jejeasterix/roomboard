/**
 * Branchement des fichiers dans l'amorce (D26, DA8, T98). `startDocument` rend le document du premier onglet : le
 * fichier en attente d'une version précédente, sinon une page vide. `prepareHost` choisit l'hôte et le shell de la
 * fenêtre ; l'espace de travail (`app/workspace.ts`) tient ensuite les onglets, leurs contrôleurs et leur marquage.
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import { messageOf, openFailedMessage } from "./messages";
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
import { createWebShell } from "./shell-web";

export interface StartedDocument {
  readonly doc: CoreDocument;
  readonly opened: PendingOpen | null;
  readonly error: string | null;
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
    return { doc: core.blank(), opened: null, error: openFailedMessage(opened.name, e) };
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
