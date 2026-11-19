/**
 * Hôte de la coque Tauri (D26, DA8) : boîtes natives (`plugin-dialog`), lecture et écriture (`plugin-fs`, portée
 * limitée aux chemins choisis dans la boîte), fermeture interceptée (`onCloseRequested` : la fenêtre se ferme par
 * `destroy()` si le gestionnaire n'appelle pas `preventDefault`). Les paquets Tauri ne sont chargés que dans la coque.
 */
import { ensureExtension, FILE_FILTER, type FileHost, type OpenedFile, type SaveTarget, type ShellPort } from "./files";

export interface DialogFilter {
  readonly name: string;
  readonly extensions: readonly string[];
}

export interface TauriDialog {
  open(o: { readonly multiple: false; readonly directory: false; readonly filters: readonly DialogFilter[] }): Promise<string | null>;
  save(o: { readonly defaultPath: string; readonly filters: readonly DialogFilter[] }): Promise<string | null>;
  ask(message: string, o: { readonly title: string; readonly kind: "warning" }): Promise<boolean>;
  message(message: string, o: { readonly title: string; readonly kind: "error" }): Promise<void>;
}

export interface TauriFs {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
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

export function createTauriHost(dialog: TauriDialog, fs: TauriFs): FileHost {
  return {
    kind: "tauri",
    async open(): Promise<OpenedFile | null> {
      const path = await dialog.open({ multiple: false, directory: false, filters: [FILE_FILTER] });
      if (path === null) return null;
      const bytes = await fs.readFile(path);
      const name = baseName(path);
      return { name, bytes, target: { kind: "tauri", name, path } };
    },
    async save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null> {
      let path = target.kind === "tauri" ? target.path : null;
      if (path === null) {
        path = await dialog.save({ defaultPath: ensureExtension(target.name), filters: [FILE_FILTER] });
        if (path === null) return null;
      }
      await fs.writeFile(path, bytes);
      return { kind: "tauri", name: baseName(path), path };
    },
  };
}

export function createTauriShell(dialog: TauriDialog, win: TauriWindow): ShellPort {
  return {
    confirm: (message) => dialog.ask(message, { title: APP_TITLE, kind: "warning" }),
    notify: (message) => dialog.message(message, { title: APP_TITLE, kind: "error" }),
    guardClose(isDirty, message) {
      let stop: (() => void) | null = null;
      let stopped = false;
      void win
        .onCloseRequested(async (e) => {
          if (!isDirty()) return;
          try {
            const ok = await dialog.ask(message, { title: APP_TITLE, kind: "warning" });
            if (!ok) e.preventDefault();
          } catch (err) {
            // Boîte en erreur : on ne perd pas le document, la fenêtre reste ouverte et l'utilisateur est prévenu.
            e.preventDefault();
            const why = err instanceof Error ? err.message : String(err);
            await dialog
              .message(`Fermeture annulée : la question n'a pas pu s'afficher (${why}).`, { title: APP_TITLE, kind: "error" })
              .catch(() => undefined);
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
export async function loadTauriPorts(): Promise<{ dialog: TauriDialog; fs: TauriFs; win: TauriWindow }> {
  const [d, f, w] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
    import("@tauri-apps/api/window"),
  ]);
  const current = w.getCurrentWindow();
  const filters = (list: readonly DialogFilter[]) => list.map((x) => ({ name: x.name, extensions: [...x.extensions] }));
  return {
    dialog: {
      open: async (o) => {
        const r = await d.open({ multiple: false, directory: false, filters: filters(o.filters) });
        return typeof r === "string" ? r : null;
      },
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
  };
}
