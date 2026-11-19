/**
 * Contrat des fichiers (cadrage D26, DA8) : une interface, trois hôtes (coque Tauri, Chromium avec File System Access,
 * repli `<input type=file>` + téléchargement). Seul `platform/` appelle les API de fichiers. Les octets sont ceux de
 * `CoreDocument.save` (format D24) ; ils passent la frontière page ↔ Rust natif, ce n'est pas le chemin de l'encre.
 */
export const ROOMBOARD_EXTENSION = ".roomboard";
export const ROOMBOARD_MIME = "application/x-roomboard";
export const UNTITLED = "Sans titre.roomboard";
export const FILE_FILTER = { name: "Document RoomBoard", extensions: ["roomboard"] } as const;

export type HostKind = "tauri" | "fsa" | "repli";
/** Réglage `?fichiers=` : `repli` force le repli partout (essai), `fsa` le demande là où il existe. */
export type HostChoice = "auto" | "fsa" | "repli";

export interface WritableLike {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort?(reason?: unknown): Promise<void>;
}

export type PermissionLike = "granted" | "denied" | "prompt";

/** Sous-ensemble de `FileSystemFileHandle` utilisé par l'hôte FSA (T72). */
export interface FileHandleLike {
  readonly kind?: "file";
  readonly name: string;
  getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
  createWritable(): Promise<WritableLike>;
  queryPermission?(d: { mode: "readwrite" }): Promise<PermissionLike>;
  requestPermission?(d: { mode: "readwrite" }): Promise<PermissionLike>;
}

/** Où enregistrer. `ask` : demander (Enregistrer sous, premier Ctrl+S). */
export type SaveTarget =
  | { readonly kind: "ask"; readonly name: string }
  | { readonly kind: "tauri"; readonly name: string; readonly path: string }
  | { readonly kind: "fsa"; readonly name: string; readonly handle: FileHandleLike }
  | { readonly kind: "download"; readonly name: string };

export interface OpenedFile {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly target: SaveTarget;
}

export interface FileHost {
  readonly kind: HostKind;
  /** null : boîte annulée. Lève une Error si la lecture échoue. */
  open(): Promise<OpenedFile | null>;
  /** `kind: "ask"` (ou cible d'un autre hôte) : demande où enregistrer. null : annulé. Lève si l'écriture échoue. */
  save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null>;
}

/** Ce que la fenêtre offre autour des fichiers : question, message, fermeture gardée, titre. */
export interface ShellPort {
  confirm(message: string): Promise<boolean>;
  notify(message: string): Promise<void>;
  /** Garde la fermeture tant que `isDirty()` ; rend la fonction qui retire la garde. */
  guardClose(isDirty: () => boolean, message: string): () => void;
  setTitle(title: string): void;
}

/** Fichier ouvert qui attend le rechargement de la page (T75, T77). */
export interface PendingOpen {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly target: SaveTarget | null;
}

export interface PendingStore {
  put(p: PendingOpen): Promise<void>;
  /** Rend l'attente et la retire (null : rien). */
  take(): Promise<PendingOpen | null>;
  clear(): Promise<void>;
}

export interface HostEnvironment {
  readonly tauri: boolean;
  readonly fsa: boolean;
}

export function detectHostEnvironment(w: object): HostEnvironment {
  const g = w as Record<string, unknown>;
  const internals = g["__TAURI_INTERNALS__"];
  return {
    tauri: g["isTauri"] === true || (typeof internals === "object" && internals !== null),
    fsa: typeof g["showSaveFilePicker"] === "function" && typeof g["showOpenFilePicker"] === "function",
  };
}

export function parseHostChoice(search: string): HostChoice {
  const v = new URLSearchParams(search).get("fichiers");
  return v === "repli" || v === "fsa" ? v : "auto";
}

export function chooseHostKind(env: HostEnvironment, choice: HostChoice): HostKind {
  if (choice === "repli") return "repli";
  if (choice === "fsa") return env.fsa ? "fsa" : "repli";
  if (env.tauri) return "tauri";
  return env.fsa ? "fsa" : "repli";
}

export function ensureExtension(name: string): string {
  const n = name.trim();
  if (n === "") return UNTITLED;
  return n.toLowerCase().endsWith(ROOMBOARD_EXTENSION) ? n : `${n}${ROOMBOARD_EXTENSION}`;
}

/** Vrai si `e` est une erreur (ou un objet) dont le `name` vaut `name` (AbortError, DataCloneError…). */
export function hasErrorName(e: unknown, name: string): boolean {
  return typeof e === "object" && e !== null && (e as { name?: unknown }).name === name;
}
