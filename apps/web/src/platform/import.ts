/**
 * Entrée unique des fichiers (usage § 8 point 12, Q1) : dépôt web, dépôt dans la coque et fichier passé au lancement
 * passent par `importFiles`. Un `.roomboard` s'ouvre dans un nouvel onglet (fonction de l'appelant), le reste est refusé.
 */
import { messageOf } from "./controller";
import { ROOMBOARD_EXTENSION, type DroppedFile, type Point, type SaveTarget } from "./files";

export const LATER_FORMAT_MESSAGE = "format pris en charge dans une prochaine version";

export interface ImportReport {
  readonly opened: readonly string[];
  readonly refused: readonly string[];
  readonly failed: readonly string[];
}

export interface ImportDeps {
  /** Ouvre le document dans un nouvel onglet (T93) ; false si illisible (le message est déjà dit). */
  openDocument(file: { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget | null }): Promise<boolean>;
  notify(message: string): Promise<void>;
  /** Vrai quand plus aucun onglet ne peut s'ouvrir : un refus de `openDocument` arrête alors la boucle. */
  full?(): boolean;
}

export interface Importer {
  importFiles(files: readonly DroppedFile[], at?: Point | null): Promise<ImportReport>;
}

export function isRoomboardName(name: string): boolean {
  return name.toLowerCase().endsWith(ROOMBOARD_EXTENSION) && name.length > ROOMBOARD_EXTENSION.length;
}

export function createImporter(deps: ImportDeps): Importer {
  return {
    // `at` est reçu et ignoré au lot 5b : l'insertion au point de dépôt vient avec C2/C3.
    async importFiles(files, _at = null) {
      const opened: string[] = [];
      const refused: string[] = [];
      const failed: string[] = [];
      let stopped = false; // onglets pleins : une seule boîte, les .roomboard suivants ne sont pas tentés
      for (const f of files) {
        if (!isRoomboardName(f.name)) {
          refused.push(f.name);
          continue;
        }
        if (stopped) {
          failed.push(f.name);
          continue;
        }
        let bytes: Uint8Array;
        try {
          bytes = new Uint8Array(await (await f.blob()).arrayBuffer());
        } catch (e) {
          failed.push(f.name);
          await deps.notify(`Ouverture impossible (${f.name}) : ${messageOf(e)}`);
          continue;
        }
        if (await deps.openDocument({ name: f.name, bytes, target: null })) opened.push(f.name);
        else {
          failed.push(f.name);
          if (deps.full?.() === true) stopped = true;
        }
      }
      if (refused.length > 0) await deps.notify(`${refused.join(", ")} : ${LATER_FORMAT_MESSAGE}`);
      return { opened, refused, failed };
    },
  };
}
