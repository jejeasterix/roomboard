/**
 * Contrôleur des fichiers d'un onglet (D26, T98) : Ouvrir, Enregistrer, Enregistrer sous, Nouveau ; état « modifié ».
 * Ignore la plateforme (DA8). « Modifié » = version du document (monotone, annulation comprise) différente de celle du
 * dernier enregistrement réussi, lue avant l'écriture. Ouvrir et Nouveau ouvrent un autre onglet (`openInTab`,
 * `newTab`), sans question : le document de cet onglet reste où il est (D27 amendée, Q1, CL5b-3). La garde de
 * fermeture n'est pas posée ici : une seule pour la fenêtre, tenue par l'espace de travail (CL5b-6).
 */
import { UNTITLED, type DroppedFile, type FileHost, type OpenedFile, type SaveTarget, type ShellPort } from "./files";

export const APP_VERSION = "0.1.0";
export const UNREAD_ASSETS_MESSAGE = "images non lues : enregistrer les perdrait";
export const IMPORT_BUSY_MESSAGE = "Import en cours : réessayez dans un instant";
export const BUSY_MESSAGE = "Opération en cours : réessayez dans un instant";
export const DISCARD_MESSAGE = "Le document a des modifications non enregistrées. Les abandonner ?";

/** Sous-ensemble de `Engine` (engine.ts : `state().version`, `onState`). */
export interface VersionSource {
  state(): { readonly version: number };
  onState(cb: (s: { readonly version: number }) => void): () => void;
}

export type FileCommand = "open" | "save" | "saveAs" | "new" | "import";

export interface FileKey {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  /** Répétition d'une touche tenue : prise par `key` mais sans relancer la commande (Ctrl+S tenu : un seul téléchargement). */
  readonly repeat?: boolean;
}

export interface FileControllerDeps {
  readonly versions: VersionSource;
  readonly host: FileHost;
  /** Shell de l'onglet : `guardClose` n'est jamais appelé ; `setTitle` n'agit que pour l'onglet actif. */
  readonly shell: ShellPort;
  /** Fichier d'où vient le document (attente prise au démarrage, onglet ouvert), sinon null. */
  readonly opened: { readonly name: string; readonly target: SaveTarget | null } | null;
  /** C11a (P4) : document remplacé au retour de l'annotation, « modifié » d'emblée ; absent : non modifié. */
  readonly dirty?: boolean;
  /** Ouvre le fichier dans un nouvel onglet ; false si illisible (le message est déjà dit). */
  openInTab(file: OpenedFile): Promise<boolean>;
  /** Ouvre un onglet vierge. */
  newTab(): Promise<void>;
  readonly now: () => string;
  readonly appVersion: string;
  /** Octets du fichier, appelé par l'hôte après le choix de la cible (R11). */
  encode(now: string, appVersion: string): Promise<Uint8Array>;
  /** « Importer » : fichiers choisis dans la boîte, vers l'entrée unique (R18). */
  importFiles(files: readonly DroppedFile[]): Promise<unknown>;
  /** Message si l'enregistrement est refusé (onglet aux images non lues, R30), sinon null. */
  saveBlocked?(): string | null;
}

export interface FileController {
  run(cmd: FileCommand): Promise<boolean>;
  /**
   * Raccourci de fichier (comme `Engine.key`) : vrai si la touche est prise, la page appelle alors preventDefault,
   * répétition comprise ; la commande n'est lancée qu'au premier appui, jamais sur une touche tenue.
   */
  key(e: FileKey): boolean;
  isDirty(): boolean;
  /** C11a (P4) : cible d'enregistrement actuelle, gardée au remplacement du document. */
  target(): SaveTarget | null;
  name(): string;
  onChange(cb: () => void): () => void;
  dispose(): void;
}

/** Reconnaît le raccourci sans tenir compte de `repeat` : la répétition se filtre dans `FileController.key`. */
export function fileCommandOf(e: FileKey): FileCommand | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
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
  let savedVersion = d.dirty === true ? -1 : d.versions.state().version; // versions ≥ 0 : -1 n'est jamais égal
  let target: SaveTarget | null = d.opened?.target ?? null;
  let name = d.opened?.name ?? UNTITLED;
  let busy: FileCommand | null = null;
  let lastTitle = "";
  const listeners = new Set<() => void>();

  const isDirty = (): boolean => d.versions.state().version !== savedVersion;
  const changed = (): void => {
    const title = titleOf(name, isDirty());
    if (title !== lastTitle) {
      lastTitle = title;
      d.shell.setTitle(title);
    }
    for (const cb of listeners) cb();
  };
  const fail = async (prefix: string, e: unknown): Promise<false> => {
    const text = `${prefix} : ${messageOf(e)}`;
    try {
      await d.shell.notify(text);
    } catch (boxError) {
      console.warn(`RoomBoard : ${text}`); // l'erreur d'origine, sinon perdue avec celle de la boîte
      throw boxError;
    }
    return false;
  };
  async function save(as: boolean): Promise<boolean> {
    const blocked = d.saveBlocked?.() ?? null;
    if (blocked !== null) {
      await d.shell.notify(blocked);
      return false;
    }
    const version = d.versions.state().version; // lue avant l'écriture : un trait tracé pendant reste « modifié »
    const to: SaveTarget = !as && target !== null ? target : { kind: "ask", name };
    let result: SaveTarget | null;
    try {
      result = await d.host.save(() => d.encode(d.now(), d.appVersion), to);
    } catch (e) {
      return fail("Enregistrement impossible", e);
    }
    if (result === null) return false;
    target = result;
    name = result.name;
    savedVersion = version;
    changed();
    return true;
  }

  async function importPicked(): Promise<boolean> {
    // Boîte d'abord, appelée sans attente préalable : l'activation de l'utilisateur est encore fraîche.
    let files: DroppedFile[];
    try {
      files = await d.host.pick();
    } catch (e) {
      return fail("Import impossible", e);
    }
    if (files.length === 0) return false;
    await d.importFiles(files);
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
    // Aucune question : le document de cet onglet n'est pas abandonné, le fichier arrive dans un autre onglet.
    try {
      return await d.openInTab(file);
    } catch (e) {
      return fail(`Ouverture impossible (${file.name})`, e);
    }
  }

  async function newDocument(): Promise<boolean> {
    await d.newTab();
    return true;
  }

  const stopState = d.versions.onState(() => changed());
  changed();

  async function run(cmd: FileCommand): Promise<boolean> {
    if (busy !== null) {
      // refus dit à voix haute : sinon Ctrl+S pendant un import semble ignoré (R18)
      try {
        await d.shell.notify(busy === "import" ? IMPORT_BUSY_MESSAGE : BUSY_MESSAGE);
      } catch (e) {
        console.warn(`RoomBoard : commande de fichier abandonnée (${messageOf(e)})`);
      }
      return false;
    }
    busy = cmd;
    try {
      if (cmd === "save") return await save(false);
      if (cmd === "saveAs") return await save(true);
      if (cmd === "import") return await importPicked();
      if (cmd === "open") return await open();
      return await newDocument();
    } catch (e) {
      // notify ou confirm a lui-même échoué : rien d'autre à tenter, on ne laisse pas de rejet non géré.
      console.warn(`RoomBoard : commande de fichier abandonnée (${messageOf(e)})`);
      return false;
    } finally {
      busy = null;
    }
  }

  return {
    run,
    key(e) {
      const cmd = fileCommandOf(e);
      if (cmd === null) return false;
      if (e.repeat !== true) void run(cmd); // `run` ne rejette jamais
      return true;
    },
    isDirty,
    target: () => target,
    name: () => name,
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose() {
      stopState();
      listeners.clear();
    },
  };
}
