/**
 * Export d'objets en `.rbitem` (cadrage cli, D12) : `doc.extract(page, ids)` puis `io.encode(…, { kind: "fragment" })`,
 * deux interfaces existantes ; un fragment dont une image manque au magasin est refusé par le conteneur. Sans ids : toute
 * la page. Écart connu avec `encodeSelection` (`fragments.ts:147-160`, non appelable sans `TabSession`), fermé au lot 2.
 */
import { basename } from "node:path";
import type { CoreDocument } from "../../web/src/core/api";
import { APP_VERSION } from "../../web/src/platform/controller";
import { asCliError, CliError } from "./contract";
import { exportBlocked, extOf, unsupportedMessage } from "./formats";
import type { Session } from "./session";
import { pageOf } from "./state";

export interface ExportRequest {
  readonly to: string;
  readonly page?: string | undefined;
  readonly ids?: readonly string[] | undefined;
  readonly name?: string | undefined;
}

/** `.rbitem` seul au lot 1 ; un format écrit plus tard : code 3 ; tout autre : usage. Avant toute lecture. */
export function checkExportTarget(to: string): void {
  if (extOf(to) === ".rbitem") return;
  const lot = exportBlocked(to);
  if (lot !== null) throw new CliError("unsupported", unsupportedMessage(to, lot));
  throw new CliError("usage", `export : ${basename(to)} : seul .rbitem est écrit par la CLI au lot 1`);
}

export async function exportFragment(session: Session, req: ExportRequest): Promise<{ file: string; kind: "fragment"; elements: number }> {
  checkExportTarget(req.to);
  const tab = session.active();
  const page = pageOf(tab, req.page);
  const ids = req.ids ?? tab.doc.elementIds(page);
  if (ids.length === 0) throw new CliError("command", "rien à exporter : aucun objet");
  let frag: CoreDocument;
  try {
    frag = tab.doc.extract(page, ids);
  } catch (e) {
    throw asCliError(e, "command");
  }
  try {
    const fp = frag.pageIds()[0];
    const elements = fp === undefined ? 0 : frag.elementIds(fp).length;
    const name = req.name ?? basename(req.to).replace(/\.rbitem$/i, "");
    let bytes: Uint8Array;
    try {
      bytes = await session.deps.io.encode(frag, tab.assets, session.deps.now(), APP_VERSION, { kind: "fragment", name });
    } catch (e) {
      throw asCliError(e, "command");
    }
    await session.write(req.to, bytes);
    return { file: req.to, kind: "fragment", elements };
  } finally {
    frag.free();
  }
}
