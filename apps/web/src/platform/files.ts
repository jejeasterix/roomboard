/**
 * Contrat des fichiers (cadrage D26, DA8) : une interface, trois hôtes (coque Tauri, Chromium avec File System Access,
 * repli `<input type=file>` + téléchargement). Seul `platform/` appelle les API de fichiers. Les octets sont ceux de
 * `CoreDocument.save` (format D24) ; ils passent la frontière page ↔ Rust natif, ce n'est pas le chemin de l'encre.
 */
export const ROOMBOARD_EXTENSION = ".roomboard";
export const ROOMBOARD_MIME = "application/x-roomboard";
export const RBITEM_EXTENSION = ".rbitem";
export const RBITEM_MIME = "application/x-roomboard-item";
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
  getFile(): Promise<File>;
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

export interface Point { readonly x: number; readonly y: number }

/** Fichier entrant (U23) : `path` dans la coque seulement ; `head(n)` avant la détection, `blob()` seulement pour un fichier reconnu (OD56). */
export interface DroppedFile {
  readonly name: string;
  readonly size: number;
  readonly mime: string;
  readonly path?: string;
  /** Au plus les `n` premiers octets ; dans la coque, un seul `read_granted_file` (OD56, DAC5). */
  head(n: number): Promise<Uint8Array>;
  /** Tout le fichier (par morceaux dans la coque), seulement pour un fichier reconnu. */
  blob(): Promise<Blob>;
}

/** `at` en px CSS relatifs à la fenêtre ; null quand le système ne donne pas de point (ouverture par le Finder). */
export type DropHandler = (files: DroppedFile[], at: Point | null) => void;

/** C12 (PF3, PF19) : extension et type MIME d'un PDF. */
export const PDF_EXTENSION = ".pdf";
export const PDF_MIME = "application/pdf";
/** Extensions offertes par « Importer » (R18, PF3) : le `.roomboard`, l'objet `.rbitem`, le PDF et les images d'U33 que le registre reconnaît. */
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif"] as const;
/** C14 : vidéos et sons que la coque et la page savent lire (liés ou intégrés). */
export const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "webm", "ogv"] as const;
export const AUDIO_EXTENSIONS = ["m4a", "mp3", "wav", "ogg", "oga"] as const;
export const IMPORT_EXTENSIONS = ["roomboard", "rbitem", "pdf", ...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS] as const;
export const IMPORT_FILTER = { name: "Images, vidéos, sons, PDF et documents RoomBoard", extensions: IMPORT_EXTENSIONS } as const;

export interface FileHost {
  readonly kind: HostKind;
  /** null : boîte annulée. Lève une Error si la lecture échoue. */
  open(): Promise<OpenedFile | null>;
  /** Boîte « Importer » (R18) : plusieurs fichiers, filtre `IMPORT_FILTER` ; [] : annulée. */
  pick(): Promise<DroppedFile[]>;
  /**
   * Choisit d'abord la cible (boîte si `kind: "ask"` ou cible d'un autre hôte ; null : annulé, `encode` jamais appelé),
   * puis appelle `encode(cible choisie)` (C14 : le chemin relatif des médias liés en dépend), puis écrit (R11). Lève si
   * l'encodage ou l'écriture échoue. Une fonction sans paramètre reste acceptée.
   */
  save(encode: (target: SaveTarget) => Promise<Uint8Array>, target: SaveTarget): Promise<SaveTarget | null>;
  /** Abonne le dépôt de fichiers ; rend le désabonnement. Hôte sans surface de dépôt : no-op. */
  onDrop(handler: DropHandler): () => void;
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
