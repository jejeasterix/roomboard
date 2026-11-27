/**
 * Hôte de la coque Tauri (D26, DA8) : boîtes natives (`plugin-dialog`), lecture et écriture (`plugin-fs`, portée
 * limitée aux chemins choisis dans la boîte), fermeture interceptée (`onCloseRequested` : la fenêtre se ferme par
 * `destroy()` si le gestionnaire n'appelle pas `preventDefault`). Les paquets Tauri ne sont chargés que dans la coque.
 */
import {
  ensureExtension,
  FILE_FILTER,
  IMPORT_FILTER,
  type DroppedFile,
  type DropHandler,
  type FileHost,
  type NoticeKind,
  type OpenedFile,
  type Point,
  type SaveTarget,
  type ShellPort,
} from "./files";
import { OfficeConvertError, type OriginalChange } from "./office-import";
import { validLink } from "../core/look";

export interface DialogFilter {
  readonly name: string;
  readonly extensions: readonly string[];
}

export interface TauriDialog {
  open(o: { readonly multiple: false; readonly directory: false; readonly filters: readonly DialogFilter[] }): Promise<string | null>;
  /** Boîte « Importer » (R18) : plusieurs fichiers ; [] si annulée. */
  openMany(o: { readonly filters: readonly DialogFilter[] }): Promise<readonly string[]>;
  save(o: { readonly defaultPath: string; readonly filters: readonly DialogFilter[] }): Promise<string | null>;
  ask(message: string, o: { readonly title: string; readonly kind: "warning" }): Promise<boolean>;
  message(message: string, o: { readonly title: string; readonly kind: NoticeKind }): Promise<void>;
}

export interface TauriFs {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
}

/** C4 (D7, DA3) : dossiers de la bibliothèque (`Documents/RoomBoard/Ressources`, dossier partagé choisi). */
export interface TauriDirFs {
  readDir(path: string): Promise<readonly { readonly name: string; readonly isDirectory: boolean }[]>;
  mkdir(path: string, o: { readonly recursive: true }): Promise<void>;
  remove(path: string, o: { readonly recursive: true }): Promise<void>;
}

export interface CloseEventLike {
  preventDefault(): void;
}

export interface TauriWindow {
  onCloseRequested(h: (e: CloseEventLike) => Promise<void>): Promise<() => void>;
  setTitle(title: string): Promise<void>;
}

export const APP_TITLE = "RoomBoard";

export function baseName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export interface TauriIpc {
  /** C16 (O20) : `args` peut être un corps brut (`Uint8Array`), avec des en-têtes. */
  invoke<T>(cmd: string, args?: Record<string, unknown> | Uint8Array, options?: { readonly headers: Readonly<Record<string, string>> }): Promise<T>;
  listen<T>(event: string, cb: (e: { readonly payload: T }) => void): Promise<() => void>;
  /** C11a (P21) : événement vers une seule fenêtre ; charge JSON (octets en base64). Absent (faux des tests) : pas d'annotation. */
  emitTo?<T>(target: string, event: string, payload: T): Promise<void>;
}

export const DROPPED_EVENT = "roomboard://dropped";
export const QUIT_EVENT = "roomboard://quit-requested";
export const READ_CHUNK = 8 * 1024 * 1024;
/** C16 (O21) : une copie d'original a été enregistrée dans l'application d'origine. */
export const ORIGINAL_CHANGED_EVENT = "roomboard://original-changed";
/** C16 (O20) : nom de l'original, encodé en pourcentage (lu par `originals::decode_name`). */
export const NAME_HEADER = "x-roomboard-name";

/** Positions en pixels physiques ; la coque accorde les chemins avant d'émettre (CL5b-13). */
export interface DropPayload {
  readonly paths: readonly string[];
  readonly position: Point | null;
}

/** Fichier accordé par la coque : lu par `read_granted_file`, par morceaux (jamais par `plugin-fs`). */
export function grantedFile(ipc: TauriIpc, path: string, size: number): DroppedFile {
  return {
    name: baseName(path),
    size,
    mime: "",
    path,
    async head(n: number) {
      return new Uint8Array(await ipc.invoke<ArrayBuffer>("read_granted_file", { path, offset: 0, len: n }));
    },
    async blob() {
      const parts: Uint8Array<ArrayBuffer>[] = [];
      let offset = 0;
      for (;;) {
        const chunk = new Uint8Array(await ipc.invoke<ArrayBuffer>("read_granted_file", { path, offset, len: READ_CHUNK }));
        parts.push(chunk);
        offset += chunk.byteLength;
        if (chunk.byteLength < READ_CHUNK) break;
      }
      return new Blob(parts);
    },
  };
}

async function filesOf(ipc: TauriIpc, paths: readonly string[]): Promise<DroppedFile[]> {
  return Promise.all(paths.map(async (p) => grantedFile(ipc, p, await ipc.invoke<number>("granted_file_size", { path: p }))));
}

export async function launchFiles(ipc: TauriIpc): Promise<DroppedFile[]> {
  return filesOf(ipc, await ipc.invoke<string[]>("launch_files"));
}
export const onQuitRequested = (ipc: TauriIpc, cb: () => void): Promise<() => void> => ipc.listen(QUIT_EVENT, () => cb());
/** C14 : accorde le fichier média choisi, rend son empreinte SHA-256 ; la coque ajoute le chemin à la portée du protocole d'assets. */
export const linkMedia = (ipc: TauriIpc, path: string): Promise<string> => ipc.invoke<string>("link_media", { path });
/** C14 : revérifie un média lié à l'ouverture (taille) et le ré-accorde ; false : introuvable. */
export const relinkMedia = (ipc: TauriIpc, path: string, size: number): Promise<boolean> => ipc.invoke<boolean>("relink_media", { path, size });

/** C16 (O24) : vrai si la coque a trouvé LibreOffice ou Microsoft Office au lancement ; appel en échec : faux. */
export async function officeConverter(ipc: TauriIpc): Promise<boolean> {
  try {
    return (await ipc.invoke<boolean>("office_converter")) === true;
  } catch {
    return false;
  }
}

/** C16 (O35) : conversion par la coque ; le PDF accordé est lu par morceaux (`read_granted_file`), puis
 *  `release_conversion` retire l'accord et le dossier, que la lecture réussisse ou non. Rejet de la coque (chaîne) :
 *  `OfficeConvertError(code)`. */
export async function convertOffice(ipc: TauriIpc, path: string): Promise<Blob> {
  type Converted = { readonly id: string; readonly pdf: string; readonly size: number };
  let converted: Converted;
  try {
    converted = await ipc.invoke<Converted>("convert_office", { path });
  } catch (e) {
    throw new OfficeConvertError(typeof e === "string" ? e : "failed");
  }
  try {
    return await grantedFile(ipc, converted.pdf, converted.size).blob();
  } finally {
    await ipc.invoke<void>("release_conversion", { id: converted.id }).catch(() => undefined);
  }
}

/** C16 (O20) : l'original en corps brut, le nom dans l'en-tête ; la coque l'écrit, le contrôle et l'ouvre. */
export async function openOriginal(ipc: TauriIpc, name: string, blob: Blob): Promise<void> {
  await ipc.invoke<string>("open_original", new Uint8Array(await blob.arrayBuffer()), { headers: { [NAME_HEADER]: encodeURIComponent(name) } });
}

/** C16 (O22) : la coque accorde sa copie `id` et émet un dépôt ; aucun chemin ne part de la page. */
export const reimportOriginal = (ipc: TauriIpc, id: string): Promise<void> => ipc.invoke<void>("reimport_original", { id });

/** C16 (O21) : abonnement à « original modifié » ; le désabonnement attend la fin de `listen` s'il le faut. */
export function onOriginalChanged(ipc: TauriIpc, cb: (e: OriginalChange) => void): () => void {
  let stop: (() => void) | null = null;
  let stopped = false;
  ipc
    .listen<OriginalChange>(ORIGINAL_CHANGED_EVENT, (e) => cb({ id: e.payload.id, name: e.payload.name }))
    .then(
      (s) => {
        if (stopped) s();
        else stop = s;
      },
      (err: unknown) => console.warn("RoomBoard : écoute des originaux indisponible", err),
    );
  return () => {
    stopped = true;
    stop?.();
  };
}
export const quitApp = (ipc: TauriIpc): Promise<void> => ipc.invoke<void>("quit_app");

export interface TauriFileHost extends FileHost {
  /** Se résout quand l'écoute de DROPPED_EVENT posée par le dernier `onDrop` est en place (immédiat si ipc null). */
  dropListening(): Promise<void>;
}

export function createTauriHost(
  dialog: TauriDialog,
  fs: TauriFs,
  ipc: TauriIpc | null = null,
  dpr: () => number = () => 1,
): TauriFileHost {
  // `ipc.listen` rend une promesse : tant qu'elle n'est pas tenue, un évènement émis par la coque se perd (écart T87).
  let lastSub: Promise<() => void> | null = null;
  return {
    kind: "tauri",
    dropListening: () => (lastSub ?? Promise.resolve()).then(() => undefined),
    onDrop(handler: DropHandler): () => void {
      if (ipc === null) return () => undefined;
      const sub = ipc.listen<DropPayload>(DROPPED_EVENT, (e) => {
        const { paths, position } = e.payload;
        filesOf(ipc, paths).then(
          (files) => {
            if (files.length > 0) handler(files, position && { x: position.x / dpr(), y: position.y / dpr() });
          },
          (err: unknown) => {
            console.warn("RoomBoard : dépôt dans la coque abandonné", err);
          },
        );
      });
      lastSub = sub;
      return () => {
        void sub.then((un) => {
          un();
        });
      };
    },
    async open(): Promise<OpenedFile | null> {
      const path = await dialog.open({ multiple: false, directory: false, filters: [FILE_FILTER] });
      if (path === null) return null;
      const bytes = await fs.readFile(path);
      const name = baseName(path);
      return { name, bytes, target: { kind: "tauri", name, path } };
    },
    async pick(): Promise<DroppedFile[]> {
      const paths = await dialog.openMany({ filters: [IMPORT_FILTER] });
      // Portée donnée par la boîte, comme Ouvrir (HR9) : fichier lu en une fois par plugin-fs.
      return Promise.all(
        paths.map(async (path) => {
          const bytes = await fs.readFile(path);
          return { name: baseName(path), size: bytes.byteLength, mime: "", path, head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes.slice()]) };
        }),
      );
    },
    async save(encode: (target: SaveTarget) => Promise<Uint8Array>, target: SaveTarget): Promise<SaveTarget | null> {
      let path = target.kind === "tauri" ? target.path : null;
      if (path === null) {
        path = await dialog.save({ defaultPath: ensureExtension(target.name), filters: [FILE_FILTER] });
        if (path === null) return null;
      }
      const chosen: SaveTarget = { kind: "tauri", name: baseName(path), path };
      await fs.writeFile(path, await encode(chosen));
      return chosen;
    },
  };
}

/** `window.confirm` de la page, lu au dernier moment (absent hors navigateur). */
const pageConfirm = (message: string): boolean => globalThis.confirm(message);

/** `openUrl` (T18) : commande `open_url` de tauri-plugin-opener, portée http, https, mailto (capabilities/default.json). */
export function createTauriShell(
  dialog: TauriDialog,
  win: TauriWindow,
  confirmPage: (message: string) => boolean = pageConfirm,
  openUrl?: (url: string) => Promise<unknown>,
): ShellPort {
  return {
    openLink(url) {
      if (validLink(url)) void openUrl?.(url).catch(() => undefined);
    },
    confirm: (message) => dialog.ask(message, { title: APP_TITLE, kind: "warning" }),
    notify: (message, kind = "error") => dialog.message(message, { title: APP_TITLE, kind }),
    guardClose(isDirty, message, divert) {
      let stop: (() => void) | null = null;
      let stopped = false;
      void win
        .onCloseRequested(async (e) => {
          if (divert?.() === true) {
            e.preventDefault();
            return;
          }
          if (!isDirty()) return;
          try {
            const ok = await dialog.ask(message, { title: APP_TITLE, kind: "warning" });
            if (!ok) e.preventDefault();
          } catch {
            // `ask` et `message` passent par la même commande native : si l'une échoue, l'autre aussi. On se replie sur
            // la boîte de la page ; si elle échoue à son tour, on garde le document et la fenêtre reste ouverte.
            let ok = false;
            try {
              ok = confirmPage(message);
            } catch {
              ok = false;
            }
            if (!ok) e.preventDefault();
          }
        })
        .then((un) => {
          if (stopped) un();
          else stop = un;
        });
      return () => {
        stopped = true;
        stop?.();
      };
    },
    setTitle(title) {
      void win.setTitle(title).catch(() => undefined);
    },
  };
}

/** Ports réels de la coque (imports dynamiques : absents du bundle du navigateur). Prouvé par l'essai T78. */
export async function loadTauriPorts(): Promise<{
  dialog: TauriDialog;
  fs: TauriFs;
  win: TauriWindow;
  ipc: TauriIpc;
  assetUrl: (path: string) => string;
  dirFs: TauriDirFs;
  pickFolder(defaultPath: string | null): Promise<string | null>;
  documentDir(): Promise<string>;
}> {
  const [d, f, w, core, ev, path] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
    import("@tauri-apps/api/window"),
    import("@tauri-apps/api/core"),
    import("@tauri-apps/api/event"),
    import("@tauri-apps/api/path"),
  ]);
  const current = w.getCurrentWindow();
  const filters = (list: readonly DialogFilter[]) => list.map((x) => ({ name: x.name, extensions: [...x.extensions] }));
  return {
    dialog: {
      open: async (o) => {
        const r = await d.open({ multiple: false, directory: false, filters: filters(o.filters) });
        return typeof r === "string" ? r : null;
      },
      openMany: async (o) => (await d.open({ multiple: true, directory: false, filters: filters(o.filters) })) ?? [],
      save: (o) => d.save({ defaultPath: o.defaultPath, filters: filters(o.filters) }),
      ask: (m, o) => d.ask(m, { title: o.title, kind: o.kind }),
      message: async (m, o) => {
        await d.message(m, { title: o.title, kind: o.kind });
      },
    },
    fs: {
      readFile: (p) => f.readFile(p),
      writeFile: (p, data) => f.writeFile(p, data),
    },
    win: {
      onCloseRequested: (h) => current.onCloseRequested(h),
      setTitle: (t) => current.setTitle(t),
    },
    ipc: {
      invoke: (cmd, args, options) => core.invoke(cmd, args, options === undefined ? undefined : { headers: { ...options.headers } }),
      listen: (event, cb) => ev.listen(event, cb),
      emitTo: (target, event, payload) => ev.emitTo(target, event, payload),
    },
    assetUrl: (p) => core.convertFileSrc(p),
    dirFs: {
      readDir: async (p) => (await f.readDir(p)).map((e) => ({ name: e.name, isDirectory: e.isDirectory })),
      mkdir: (p, o) => f.mkdir(p, o),
      remove: (p, o) => f.remove(p, o),
    },
    // Le dossier choisi entre dans la portée fs, récursif (plugin dialog 2.8.4, `commands.rs:163-180`).
    pickFolder: async (defaultPath) => {
      const r = await d.open({ directory: true, recursive: true, multiple: false, ...(defaultPath !== null ? { defaultPath } : {}) });
      return typeof r === "string" ? r : null;
    },
    documentDir: () => path.documentDir(),
  };
}
