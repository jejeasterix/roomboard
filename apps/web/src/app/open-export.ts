/**
 * Ouvrir et exporter un tableau ou un PDF sans onglet (cadrage cli-partage, D2 à D8) : la couche autour de
 * `board-convert.ts` et `pdf-convert.ts` que la page (`workspace.ts`) et la CLI (`apps/cli`) recopiaient. Rien n'est dit
 * ici : un échec est une `Error` au message complet du produit, les avis sont rendus (`notices`) ; la page les dit, la
 * CLI les lève ou les range, chacune à son moment (D4). Aucun accès au DOM ; n'importe que des modules déjà dans le
 * fichier construit de la CLI (D9).
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { APP_VERSION, messageOf, UNREAD_ASSETS_MESSAGE } from "../platform/controller";
import { openFailedMessage } from "../platform/messages";
import { readBoardFile, writeBoardFile, type BoardFile, type BoardReadDeps } from "./board-convert";
import type { BoardFormat, BoardPorts } from "./board-io";
import { boardTabName, boardWarningsMessage } from "./board-files";
import { missingOf } from "./container-io";
import { readPdfFile, type PdfReadDeps, type PdfSource } from "./pdf-convert";

/** Document ouvert, sans onglet. `notices` : avis d'ouverture dans l'ordre du produit, que l'appelant dit ou range. */
export interface OpenedDocument {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  /** `<racine>.roomboard` : nom de l'onglet de la page ; la CLI l'ignore (onglet sans fichier). */
  readonly tabName: string;
  readonly notices: readonly string[];
}
export interface BoardExportDeps {
  readonly ports: Pick<BoardPorts, "write" | "zip">;
  /** Copie prise avant l'écriture (DAPF3) : donnée par la page ; absente dans la CLI, qui écrit `doc` tel quel (D7 :
   *  `saveParts` fixerait `created` sur le document d'origine). */
  readonly copy?: { readonly core: CoreFactory; now(): string };
}

/** « Ouverture impossible (<nom>) : <message> » : `platform/messages.ts` (OF13, D9), réexporté ici (page, CLI). */
export { openFailedMessage };
/** « Export impossible : <message> ». */
export const exportFailedMessage = (e: unknown): string => `Export impossible : ${messageOf(e)}`;

/**
 * `file.name` est le nom de base donné par l'appelant (page : `baseName(file.name)` ; CLI : `basename(path)`), comme
 * `PdfSource.name` ; le module ne retire aucun chemin. Rejette `new Error(openFailedMessage(file.name, e))`.
 */
export async function openBoardDocument(file: BoardFile, deps: BoardReadDeps): Promise<OpenedDocument> {
  let read: Awaited<ReturnType<typeof readBoardFile>>;
  try {
    read = await readBoardFile(file, deps);
  } catch (e) {
    throw new Error(openFailedMessage(file.name, e));
  }
  return {
    doc: read.doc,
    assets: read.assets,
    tabName: boardTabName(file.name, file.format),
    notices: read.warnings.length > 0 ? [boardWarningsMessage(file.name, read.warnings)] : [],
  };
}

/** `readPdfFile` ; rejette avec son message complet, tel quel (un seul préfixe, déjà mis). */
export async function openPdfDocument(file: PdfSource, deps: PdfReadDeps): Promise<OpenedDocument> {
  const read = await readPdfFile(file, deps);
  return { doc: read.doc, assets: read.assets, tabName: read.tabName, notices: read.warnings };
}

/** `UNREAD_ASSETS_MESSAGE` si une image citée du document manque au magasin (`missingOf`), sinon null. */
export function exportBlocked(doc: CoreDocument, assets: AssetStore): string | null {
  return missingOf(doc, assets).length > 0 ? UNREAD_ASSETS_MESSAGE : null;
}

/**
 * Avec `deps.copy` : copie (`saveParts(copy.now(), APP_VERSION)`, `copy.core.loadParts`, DAPF3), `writeBoardFile` sur
 * la copie, copie libérée dans `finally`. Sans : `writeBoardFile(doc, …)`, aucun `saveParts` sur `doc` (D7). Rejette tel
 * quel (l'appelant met son préfixe : page `exportFailedMessage`, CLI aucun, D8).
 */
export async function exportBoardDocument(doc: CoreDocument, assets: AssetStore, format: BoardFormat, deps: BoardExportDeps): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  const copy = deps.copy;
  if (copy === undefined) return writeBoardFile(doc, assets, format, deps.ports);
  const [manifest, ybin] = doc.saveParts(copy.now(), APP_VERSION);
  const own = copy.core.loadParts(manifest, ybin);
  try {
    return await writeBoardFile(own, assets, format, deps.ports);
  } finally {
    own.free();
  }
}
