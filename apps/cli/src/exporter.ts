/**
 * Export en `.rbitem` (cadrage cli-lot2, D19) : objets par `encodeIds`, grille par `encodeGrid` (`fragments.ts`) ;
 * image absente : avis du produit `MISSING_EXPORT_MESSAGE`, code 1 ; page sans grille : `NO_GRID_MESSAGE`, code 1 (H21).
 */
import { basename } from "node:path";
import { MISSING_EXPORT_MESSAGE, NO_GRID_MESSAGE } from "../../web/src/app/fragments";
import { asCliError, CliError } from "./contract";
import { exportBlocked, extOf, unsupportedMessage } from "./formats";
import type { Session } from "./session";
import { pageOf } from "./state";

export interface ExportRequest {
  readonly to: string;
  readonly page?: string | undefined;
  readonly ids?: readonly string[] | undefined;
  readonly name?: string | undefined;
  readonly grid?: boolean | undefined;
}

/** `.rbitem` seul au lot 1 ; un format écrit plus tard : code 3 ; tout autre : usage. Avant toute lecture. */
export function checkExportTarget(to: string): void {
  if (extOf(to) === ".rbitem") return;
  const lot = exportBlocked(to);
  if (lot !== null) throw new CliError("unsupported", unsupportedMessage(to, lot));
  throw new CliError("usage", `export : ${basename(to)} : seul .rbitem est écrit par la CLI au lot 1`);
}

export async function exportFragment(session: Session, req: ExportRequest): Promise<{ file: string; kind: "fragment"; elements: number } | { file: string; kind: "grid" }> {
  checkExportTarget(req.to);
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
