/**
 * Hôte de repli (D26, DA8) : navigateurs sans File System Access, et essai Playwright (`?fichiers=repli`, D33).
 * Ouvrir : <input type=file>. Enregistrer : téléchargement (le navigateur choisit le dossier ; Ctrl+S retélécharge).
 * Annuler un téléchargement ne se voit pas : `save` ne rend jamais null.
 */
import {
  ensureExtension,
  ROOMBOARD_EXTENSION,
  ROOMBOARD_MIME,
  type FileHost,
  type OpenedFile,
  type SaveTarget,
} from "./files";

export interface PickedFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface FallbackDeps {
  pickFile(accept: string): Promise<PickedFile | null>;
  download(name: string, bytes: Uint8Array, mime: string): void;
}

export interface UrlApi {
  createObjectURL(b: Blob): string;
  revokeObjectURL(u: string): void;
}

export const FALLBACK_ACCEPT = `${ROOMBOARD_EXTENSION},${ROOMBOARD_MIME}`;
/** Délai avant de révoquer l'URL du téléchargement : le navigateur a commencé à lire. */
const REVOKE_MS = 1000;

export function createFallbackHost(d: FallbackDeps): FileHost {
  return {
    kind: "repli",
    async open(): Promise<OpenedFile | null> {
      const f = await d.pickFile(FALLBACK_ACCEPT);
      if (f === null) return null;
      return { name: f.name, bytes: f.bytes, target: { kind: "download", name: f.name } };
    },
    async save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null> {
      const name = ensureExtension(target.name);
      d.download(name, bytes, ROOMBOARD_MIME);
      return { kind: "download", name };
    },
  };
}

export function browserFallbackDeps(
  doc: Document,
  urls: UrlApi,
  later: (cb: () => void) => void = (cb) => {
    setTimeout(cb, REVOKE_MS);
  },
): FallbackDeps {
  return {
    pickFile(accept: string): Promise<PickedFile | null> {
      return new Promise((resolve, reject) => {
        const input = doc.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.style.display = "none";
        input.addEventListener(
          "change",
          () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) {
              resolve(null);
              return;
            }
            file.arrayBuffer().then((b) => resolve({ name: file.name, bytes: new Uint8Array(b) }), reject);
          },
          { once: true },
        );
        input.addEventListener(
          "cancel",
          () => {
            input.remove();
            resolve(null);
          },
          { once: true },
        );
        doc.body.append(input);
        input.click();
      });
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
