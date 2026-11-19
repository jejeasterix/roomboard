/**
 * Contrôleur des fichiers (D26) : Ouvrir, Enregistrer, Enregistrer sous, Nouveau ; état « modifié » ; question avant
 * d'abandonner ; garde de fermeture. Ignore la plateforme (DA8). « Modifié » = version du document (monotone,
 * annulation comprise) différente de celle du dernier enregistrement réussi, lue avant l'écriture. Ouvrir valide le
 * fichier, le met en attente et recharge la page (le moteur garde son document).
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import { UNTITLED, type FileHost, type OpenedFile, type PendingStore, type SaveTarget, type ShellPort } from "./files";

export const APP_VERSION = "0.1.0";
export const DISCARD_MESSAGE = "Le document a des modifications non enregistrées. Les abandonner ?";

/** Sous-ensemble de `Engine` (engine.ts : `state().version`, `onState`). */
export interface VersionSource {
  state(): { readonly version: number };
  onState(cb: (s: { readonly version: number }) => void): () => void;
}

export type FileCommand = "open" | "save" | "saveAs" | "new";

export interface FileKey {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  /** Répétition d'une touche tenue : ignorée (Ctrl+S tenu ne relance pas dix téléchargements). */
  readonly repeat?: boolean;
}

export interface FileControllerDeps {
  readonly core: Pick<CoreFactory, "load">;
  readonly doc: Pick<CoreDocument, "save">;
  readonly versions: VersionSource;
  readonly host: FileHost;
  readonly shell: ShellPort;
  readonly pending: PendingStore;
  /** Fichier d'où vient le document (attente prise au démarrage), sinon null. */
  readonly opened: { readonly name: string; readonly target: SaveTarget | null } | null;
  readonly reload: () => void;
  readonly now: () => string;
  readonly appVersion: string;
}

export interface FileController {
  run(cmd: FileCommand): Promise<boolean>;
  isDirty(): boolean;
  name(): string;
  onChange(cb: () => void): () => void;
  dispose(): void;
}

export function fileCommandOf(e: FileKey): FileCommand | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.repeat === true) return null;
  const k = e.key.toLowerCase();
  if (k === "s") return e.shiftKey ? "saveAs" : "save";
  if (e.shiftKey) return null;
  if (k === "o") return "open";
  if (k === "n") return "new";
  return null;
}

export function titleOf(name: string, dirty: boolean): string {
  return `${dirty ? "• " : ""}${name} — RoomBoard`;
}

export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function createFileController(d: FileControllerDeps): FileController {
  let saved = d.versions.state().version;
  let target: SaveTarget | null = d.opened?.target ?? null;
  let name = d.opened?.name ?? UNTITLED;
  let leaving = false;
  let busy = false;
  let lastTitle = "";
  const listeners = new Set<() => void>();

  const isDirty = (): boolean => d.versions.state().version !== saved;
  const changed = (): void => {
    const title = titleOf(name, isDirty());
    if (title !== lastTitle) {
      lastTitle = title;
      d.shell.setTitle(title);
    }
    for (const cb of listeners) cb();
  };
  const fail = async (prefix: string, e: unknown): Promise<false> => {
    await d.shell.notify(`${prefix} : ${messageOf(e)}`);
    return false;
  };
  const leave = (): void => {
    leaving = true;
    d.reload();
  };
  const discardOk = async (): Promise<boolean> => !isDirty() || d.shell.confirm(DISCARD_MESSAGE);

  async function save(as: boolean): Promise<boolean> {
    const version = d.versions.state().version; // lue avant l'écriture : un trait tracé pendant reste « modifié »
    let bytes: Uint8Array;
    try {
      bytes = d.doc.save(d.now(), d.appVersion);
    } catch (e) {
      return fail("Enregistrement impossible", e);
    }
    const to: SaveTarget = !as && target !== null ? target : { kind: "ask", name };
    let result: SaveTarget | null;
    try {
      result = await d.host.save(bytes, to);
    } catch (e) {
      return fail("Enregistrement impossible", e);
    }
    if (result === null) return false;
    target = result;
    name = result.name;
    saved = version;
    changed();
    return true;
  }

  async function open(): Promise<boolean> {
    // Sélecteur d'abord, appelé sans attente préalable : l'activation de l'utilisateur (keydown) est encore fraîche.
    let file: OpenedFile | null;
    try {
      file = await d.host.open();
    } catch (e) {
      return fail("Ouverture impossible", e);
    }
    if (file === null) return false;
    try {
      d.core.load(file.bytes).free();
    } catch (e) {
      return fail(`Ouverture impossible (${file.name})`, e);
    }
    if (!(await discardOk())) return false;
    try {
      await d.pending.put({ name: file.name, bytes: file.bytes, target: file.target });
    } catch (e) {
      return fail(`Ouverture impossible (${file.name})`, e);
    }
    leave();
    return true;
  }

  async function fresh(): Promise<boolean> {
    if (!(await discardOk())) return false;
    await d.pending.clear().catch(() => undefined);
    leave();
    return true;
  }

  const stopState = d.versions.onState(() => changed());
  const stopClose = d.shell.guardClose(() => !leaving && isDirty(), DISCARD_MESSAGE);
  changed();

  return {
    async run(cmd) {
      if (busy || leaving) return false;
      busy = true;
      try {
        if (cmd === "save") return await save(false);
        if (cmd === "saveAs") return await save(true);
        if (cmd === "open") return await open();
        return await fresh();
      } finally {
        busy = false;
      }
    },
    isDirty,
    name: () => name,
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose() {
      stopState();
      stopClose();
      listeners.clear();
    },
  };
}
