/**
 * Hôte de repli (D26, DA8) : navigateurs sans File System Access, et essai Playwright (`?fichiers=repli`, D33).
 * Ouvrir : <input type=file>. Enregistrer : téléchargement (le navigateur choisit le dossier ; Ctrl+S retélécharge).
 * Annuler un téléchargement ne se voit pas : `save` ne rend jamais null.
 */
import {
  ensureExtension,
  IMPORT_EXTENSIONS,
  ROOMBOARD_EXTENSION,
  ROOMBOARD_MIME,
  type DroppedFile,
  type FileHost,
  type OpenedFile,
  type SaveTarget,
} from "./files";
import { droppedFromFile, listenWebDrop, type DropTargetLike } from "./drop-web";

export interface PickedFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface FallbackDeps {
  pickFile(accept: string): Promise<PickedFile | null>;
  /** Plusieurs fichiers (« Importer », R18) ; [] : rien choisi ou annulé. */
  pickFiles(accept: string): Promise<File[]>;
  download(name: string, bytes: Uint8Array, mime: string): void;
}

export interface UrlApi {
  createObjectURL(b: Blob): string;
  revokeObjectURL(u: string): void;
}

export const FALLBACK_ACCEPT = `${ROOMBOARD_EXTENSION},${ROOMBOARD_MIME}`;
/** `accept` de « Importer » (R18) : extensions du registre. */
export const IMPORT_ACCEPT = IMPORT_EXTENSIONS.map((e) => `.${e}`).join(",");
/** Délai avant de révoquer l'URL du téléchargement : le navigateur a commencé à lire. */
const REVOKE_MS = 1000;

export function createFallbackHost(d: FallbackDeps, dropTarget: DropTargetLike | null = null): FileHost {
  return {
    kind: "repli",
    onDrop: (h) => listenWebDrop(dropTarget, h),
    async open(): Promise<OpenedFile | null> {
      const f = await d.pickFile(FALLBACK_ACCEPT);
      if (f === null) return null;
      return { name: f.name, bytes: f.bytes, target: { kind: "download", name: f.name } };
    },
    async pick(): Promise<DroppedFile[]> {
      return (await d.pickFiles(IMPORT_ACCEPT)).map(droppedFromFile);
    },
    async save(encode: (target: SaveTarget) => Promise<Uint8Array>, target: SaveTarget): Promise<SaveTarget | null> {
      const chosen: SaveTarget = { kind: "download", name: ensureExtension(target.name) };
      d.download(chosen.name, await encode(chosen), ROOMBOARD_MIME);
      return chosen;
    },
  };
}

/** Planifie `cb` dans `ms` ms ; rend l'annulation. */
export type Schedule = (cb: () => void, ms: number) => () => void;

/** Délai entre le retour du focus sur la page et l'annulation : le `change` d'un vrai choix arrive avant. */
const FOCUS_CANCEL_MS = 1000;

const timeoutSchedule: Schedule = (cb, ms) => {
  const id = setTimeout(cb, ms);
  return () => {
    clearTimeout(id);
  };
};

export function browserFallbackDeps(
  doc: Document,
  urls: UrlApi,
  later: (cb: () => void) => void = (cb) => {
    setTimeout(cb, REVOKE_MS);
  },
  schedule: Schedule = timeoutSchedule,
): FallbackDeps {
  /** Se règle toujours (voir pickFile) ; null : rien choisi ou annulé. */
  const choose = (accept: string, multiple: boolean): Promise<File[] | null> =>
    new Promise((resolve, reject) => {
      const input = doc.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = "none";
      const view = doc.defaultView;
      let settled = false;
      let cancelTimer: (() => void) | null = null;
      const back = (): void => {
        if (settled || cancelTimer !== null) return;
        cancelTimer = schedule(() => settle(() => resolve(null)), FOCUS_CANCEL_MS);
      };
      const settle = (then: () => void): void => {
        if (settled) return;
        settled = true;
        cancelTimer?.();
        view?.removeEventListener("focus", back);
        view?.removeEventListener("pointerdown", back);
        input.remove();
        then();
      };
      input.addEventListener("change", () => {
        const files = Array.from(input.files ?? []);
        settle(() => resolve(files.length > 0 ? files : null));
      });
      input.addEventListener("cancel", () => {
        settle(() => resolve(null));
      });
      view?.addEventListener("focus", back);
      view?.addEventListener("pointerdown", back);
      doc.body.append(input);
      try {
        input.click();
      } catch (e) {
        settle(() => reject(e instanceof Error ? e : new Error(String(e))));
      }
    });

  return {
    /**
     * Se règle toujours : `change`, `cancel`, ou, pour les navigateurs sans `cancel` (Safari < 16.4, Firefox < 91,
     * Chrome < 113) et le `click()` sans effet, le retour du focus (ou un geste) sur la page sans `change` dans le
     * délai. `click()` qui lève : rejet. Dans tous les cas l'input est retiré du DOM et les écouteurs aussi.
     */
    async pickFile(accept: string): Promise<PickedFile | null> {
      const file = (await choose(accept, false))?.[0];
      if (!file) return null;
      return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
    },
    /** Plusieurs fichiers (« Importer », R18) ; [] : rien choisi ou annulé. */
    async pickFiles(accept: string): Promise<File[]> {
      return (await choose(accept, true)) ?? [];
    },
    download(name: string, bytes: Uint8Array, mime: string): void {
      const url = urls.createObjectURL(new Blob([bytes.slice()], { type: mime }));
      const a = doc.createElement("a");
      a.href = url;
      a.download = name;
      a.style.display = "none";
      doc.body.append(a);
      a.click();
      a.remove();
      later(() => urls.revokeObjectURL(url));
    },
  };
}
