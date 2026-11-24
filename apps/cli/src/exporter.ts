/**
 * Export en `.rbitem` (cadrage cli-lot2, D19) : objets par `encodeIds`, grille par `encodeGrid` (`fragments.ts`) ;
 * image absente : avis du produit `MISSING_EXPORT_MESSAGE`, code 1 ; page sans grille : `NO_GRID_MESSAGE`, code 1 (H21).
 */
import { basename } from "node:path";
import { writeBoardFile } from "../../web/src/app/board-convert";
import type { BoardFormat } from "../../web/src/app/board-io";
import { missingOf } from "../../web/src/app/container-io";
import { MISSING_EXPORT_MESSAGE, NO_GRID_MESSAGE } from "../../web/src/app/fragments";
import { UNREAD_ASSETS_MESSAGE } from "../../web/src/platform/controller";
import { asCliError, CliError } from "./contract";
import { sameFile } from "./disk";
import { exportBlocked, extOf, importBlocked, packMessage, unsupportedMessage, type Lot } from "./formats";
import type { Session } from "./session";
import { pageOf } from "./state";

export interface ExportRequest {
  readonly to: string;
  readonly page?: string | undefined;
  readonly ids?: readonly string[] | undefined;
  readonly name?: string | undefined;
  readonly grid?: boolean | undefined;
}

const BOARD_OUT: ReadonlySet<string> = new Set([".iwb", ".ubz"]);
export const isBoardOut = (to: string): boolean => BOARD_OUT.has(extOf(to));

/** `.rbitem`, `.iwb`, `.ubz` ; `.rbpack` : usage (bibliothèque) ; un format écrit plus tard : code 3 ; tout autre : usage. */
export function checkExportTarget(to: string): void {
  const ext = extOf(to);
  if (ext === ".rbitem" || BOARD_OUT.has(ext)) return;
  if (ext === ".rbpack") throw new CliError("usage", packMessage(to));
  const lot = exportBlocked(to);
  if (lot !== null) throw new CliError("unsupported", unsupportedMessage(to, lot));
  throw new CliError("usage", `export : ${basename(to)} : sorties .rbitem, .iwb ou .ubz`);
}

/** Constat T11 : une sortie ne remplace jamais un fichier source ouvert (chemin résolu, casse, `realpath`) ; usage, avant toute écriture. */
export async function checkNotSource(source: string, to: string): Promise<void> {
  if (await sameFile(source, to)) throw new CliError("usage", `${basename(to)} : la sortie est le fichier source, il ne serait pas relu fidèlement ; choisis une autre sortie`);
}

export async function exportBoardFile(session: Session, to: string): Promise<{ file: string; kind: BoardFormat }> {
  checkExportTarget(to);
  const tab = session.active();
  if (missingOf(tab.doc, tab.assets).length > 0) throw new CliError("command", UNREAD_ASSETS_MESSAGE);
  const format = extOf(to).slice(1) as BoardFormat;
  let r: { bytes: Uint8Array; warnings: string[] };
  try {
    r = await writeBoardFile(tab.doc, tab.assets, format, session.deps.board);
  } catch (e) {
    throw asCliError(e, "command");
  }
  await session.write(to, r.bytes);
  session.deps.notices.push(...r.warnings); // D24 : avertissements d'écriture dans notices
  return { file: to, kind: format };
}

const CONVERT_SOURCES: ReadonlySet<string> = new Set([".roomboard", ".iwb", ".ubz", ".notebook", ".olf", ".flipchart"]);
const CONVERT_TARGETS: ReadonlySet<string> = new Set([".roomboard", ".iwb", ".ubz"]);
function convertSide(path: string, allowed: ReadonlySet<string>, blocked: (p: string) => Lot | null, what: string): void {
  if (allowed.has(extOf(path))) return;
  const lot = blocked(path);
  if (lot === 3) throw new CliError("unsupported", unsupportedMessage(path, lot));
  if (extOf(path) === ".rbpack") throw new CliError("usage", packMessage(path));
  throw new CliError("usage", `convert : ${basename(path)} : ${what} ${[...allowed].join(" ")} attendue (export pour un .rbitem)`);
}
/** D25 : avant tout chargement ; `.pdf` : 3 (seul format du lot 3) ; `.rbitem`, `.rbpack` et tout autre : 2. */
export function checkConvert(from: string, to: string): void {
  convertSide(from, CONVERT_SOURCES, importBlocked, "source");
  convertSide(to, CONVERT_TARGETS, exportBlocked, "sortie");
}

export async function exportFragment(session: Session, req: ExportRequest): Promise<{ file: string; kind: "fragment"; elements: number } | { file: string; kind: "grid" }> {
  checkExportTarget(req.to);
  if (extOf(req.to) !== ".rbitem") throw new CliError("usage", `export : ${basename(req.to)} : un fragment s'écrit en .rbitem`);
  const tab = session.active();
  const page = pageOf(tab, req.page);
  const name = req.name ?? basename(req.to).replace(/\.rbitem$/i, "");
  const { notices, fragments } = session.deps;
  const before = notices.length;
  const refused = (fallback: string): CliError => new CliError("command", notices.slice(before).join(" ; ") || fallback);
  if (req.grid === true) {
    if (req.ids !== undefined) throw new CliError("usage", "--grid exclut --ids et --all");
    let bytes: Uint8Array | null;
    try {
      bytes = await fragments.encodeGrid({ tab, page }, name);
    } catch (e) {
      throw asCliError(e, "command");
    }
    if (bytes === null) throw refused(NO_GRID_MESSAGE);
    await session.write(req.to, bytes);
    return { file: req.to, kind: "grid" };
  }
  const ids = req.ids ?? tab.doc.elementIds(page);
  if (ids.length === 0) throw new CliError("command", "rien à exporter : aucun objet");
  let out: { readonly bytes: Uint8Array; readonly elements: number } | null;
  try {
    out = await fragments.encodeIds({ tab, page }, page, ids, name, "export");
  } catch (e) {
    throw asCliError(e, "command");
  }
  if (out === null) throw refused(MISSING_EXPORT_MESSAGE);
  await session.write(req.to, out.bytes);
  return { file: req.to, kind: "fragment", elements: out.elements };
}
