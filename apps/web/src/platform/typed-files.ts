/**
 * Port des fichiers typés (C3, DAZ4) : un type (extension, MIME, filtre, accept) ; web : `<input type=file>` et
 * téléchargement de l'hôte de repli ; coque : boîtes natives filtrées, lecture et écriture par `plugin-fs` au chemin
 * choisi. `FileHost` reste réservé au `.roomboard` (décision C1).
 */
import type { FallbackDeps } from "./host-repli";
import { PDF_EXTENSION, PDF_MIME, RBITEM_EXTENSION, RBITEM_MIME, RBPACK_EXTENSION, RBPACK_MIME } from "./files";
import { baseName, type TauriDialog, type TauriFs } from "./host-tauri";

export interface FileType {
  readonly extension: string;
  readonly mime: string;
  readonly filter: { readonly name: string; readonly extensions: readonly string[] };
  readonly accept: string;
}

/** C3 (Z11) : objet RoomBoard exporté par « Exporter ». */
export const RBITEM_TYPE: FileType = {
  extension: RBITEM_EXTENSION,
  mime: RBITEM_MIME,
  filter: { name: "Objet RoomBoard", extensions: [RBITEM_EXTENSION.slice(1)] },
  accept: `${RBITEM_EXTENSION},${RBITEM_MIME}`,
};

/** C4 (D17, D19) : paquet de ressources exporté ou importé par la bibliothèque. */
export const RBPACK_TYPE: FileType = {
  extension: RBPACK_EXTENSION,
  mime: RBPACK_MIME,
  filter: { name: "Paquet RoomBoard", extensions: [RBPACK_EXTENSION.slice(1)] },
  accept: `${RBPACK_EXTENSION},${RBPACK_MIME}`,
};

/** C12 (PF19) : PDF écrit par « Exporter en PDF… » (web : téléchargement ; coque : boîte native filtrée). */
export const PDF_TYPE: FileType = {
  extension: PDF_EXTENSION,
  mime: PDF_MIME,
  filter: { name: "Document PDF", extensions: [PDF_EXTENSION.slice(1)] },
  accept: `${PDF_EXTENSION},${PDF_MIME}`,
};

export interface TypedFiles {
  /** null : boîte annulée. Lève si la lecture échoue. */
  pick(): Promise<{ readonly name: string; readonly bytes: Uint8Array } | null>;
  /** faux : boîte annulée. Lève si l'écriture échoue. */
  save(name: string, bytes: Uint8Array): Promise<boolean>;
}

export function createWebTypedFiles(deps: Pick<FallbackDeps, "pickFile" | "download">, type: FileType): TypedFiles {
  return {
    async pick() {
      const f = await deps.pickFile(type.accept);
      return f === null ? null : { name: f.name, bytes: f.bytes };
    },
    async save(name, bytes) {
      deps.download(name, bytes, type.mime);
      return true;
    },
  };
}

export function createTauriTypedFiles(dialog: Pick<TauriDialog, "open" | "save">, fs: TauriFs, type: FileType): TypedFiles {
  return {
    async pick() {
      const path = await dialog.open({ multiple: false, directory: false, filters: [type.filter] });
      if (path === null) return null;
      return { name: baseName(path), bytes: await fs.readFile(path) };
    },
    async save(name, bytes) {
      const path = await dialog.save({ defaultPath: name, filters: [type.filter] });
      if (path === null) return false;
      await fs.writeFile(path, bytes);
      return true;
    },
  };
}
