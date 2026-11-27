/**
 * Fonds du pack dans la CLI (personnalisation-1b, Q32) : liste et recherche (`roomboard backgrounds`), opération
 * `{"op":"background",…}` de `run` et `apply`. Même résolution et même commande que l'interface (`resolvePack`,
 * `backgroundCommand` de `apps/web/src/app/backgrounds-apply.ts`) ; un fichier image passe par la sonde de « Mes fonds »
 * (`probeImage`). La CLI n'ajoute que la lecture sur disque (pack dans `apps/web/public/backgrounds/` ou
 * `ROOMBOARD_BACKGROUNDS`) et les contrôles d'usage. « Mes fonds » n'a pas de commande (bibliothèque de l'appareil, pas
 * du document).
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { backgroundCommand, missingPackFile, resolvePack, type PackFiles } from "../../web/src/app/backgrounds-apply";
import { probeImage } from "../../web/src/app/my-backgrounds";
import { loadPack, type PackBackground, type PackSectionId } from "../../web/src/backgrounds/catalog";
import { imageSource } from "../../web/src/backgrounds/image-source";
import { createBackgroundSearch } from "../../web/src/backgrounds/search";
import type { BackgroundSource } from "../../web/src/backgrounds/source";
import type { Command, CoreDocument } from "../../web/src/core/api";
import type { AssetStore } from "../../web/src/core/asset-store";
import { TOO_MANY_PIXELS } from "../../web/src/platform/image-import";
import { CliError } from "./contract";
import { readBytes } from "./disk";
import { optString } from "./ops";
import { pageOf } from "./state";

export const PACK_SECTIONS: readonly PackSectionId[] = ["colors", "lines", "lessons", "images"];
export interface PackLine {
  readonly id: string;
  readonly section: PackSectionId;
  readonly theme: string;
  readonly label: string;
  readonly kind: PackBackground["kind"];
}

/** Dossier du pack : `ROOMBOARD_BACKGROUNDS`, sinon à côté des modules (`dist/` de la CLI ou `apps/web/src/` des tests). */
export function packDir(env: Readonly<Record<string, string | undefined>>, wasmDir: URL): URL {
  const own = env["ROOMBOARD_BACKGROUNDS"];
  if (own !== undefined && own !== "") return pathToFileURL(own.endsWith("/") ? own : `${own}/`);
  return new URL("../../web/public/backgrounds/", wasmDir);
}

/** Fichiers du pack lus sur disque ; absent ou illisible : command « fond introuvable : <fichier> » (message du web). */
export function diskPackFiles(dir: URL): PackFiles {
  return {
    async read(file) {
      try {
        return new Blob([(await readFile(fileURLToPath(new URL(file, dir)))) as BlobPart]);
      } catch {
        throw new CliError("command", missingPackFile(file));
      }
    },
  };
}

/** Une ligne par fond du pack ; `search` : ordre de la recherche du web ; `section` inconnue (ou « mine ») : usage. */
export async function listBackgrounds(o: { readonly search?: string | undefined; readonly section?: string | undefined }): Promise<readonly PackLine[]> {
  if (o.section !== undefined && !(PACK_SECTIONS as readonly string[]).includes(o.section)) {
    throw new CliError("usage", `section inconnue : ${o.section} ; sections : ${PACK_SECTIONS.join(", ")}`);
  }
  const pack = await loadPack();
  let items: readonly PackBackground[] = pack;
  if (o.search !== undefined && o.search.trim() !== "") {
    const byId = new Map(pack.map((b) => [b.id, b] as const));
    items = createBackgroundSearch(pack).search(o.search).flatMap((id) => byId.get(id) ?? []);
  }
  return items
    .filter((b) => o.section === undefined || b.section === o.section)
    .map((b) => ({ id: b.id, section: b.section, theme: b.theme, label: b.label, kind: b.kind }));
}

/** `page` (première page par défaut, `pageOf`) ou `pages: "all"` (`doc.pageIds()`), jamais les deux. */
function pagesOf(tab: { readonly doc: CoreDocument }, args: Readonly<Record<string, unknown>>): readonly string[] {
  const page = optString(args, "page");
  const pages = args["pages"];
  if (page !== undefined && pages !== undefined) throw new CliError("usage", "background : « page » ou « pages », pas les deux");
  if (pages !== undefined) {
    if (pages !== "all") throw new CliError("usage", "pages : seule la valeur « all » est admise");
    return tab.doc.pageIds();
  }
  return [pageOf(tab, page)];
}

/** Fichier image : même sonde et même source que « Mes fonds » (`probeImage`, page blanche, refus au-delà de `MAX_PIXELS`). */
async function fileSource(path: string): Promise<BackgroundSource> {
  const bytes = await readBytes(path);
  const name = basename(path);
  const blob = new Blob([bytes as BlobPart]);
  const probed = await probeImage(blob, name);
  if (probed === null) throw new CliError("unsupported", `${path} : en-tête d'image illisible`);
  const source = imageSource(blob, name, probed);
  if (source === null) throw new CliError("command", TOO_MANY_PIXELS);
  return source;
}

async function sourceOf(id: string | undefined, file: string | undefined, files: PackFiles): Promise<BackgroundSource> {
  if (id === undefined) return fileSource(file!);
  const b = (await loadPack()).find((x) => x.id === id);
  if (b === undefined) throw new CliError("command", `fond inconnu : ${id}`);
  return resolvePack(b, files);
}

/** Usage contrôlé d'abord (code 2), puis page (1), puis source (1 ou 3) ; une seule commande `ApplyBackground` (web). */
export async function backgroundOp(tab: { readonly doc: CoreDocument; readonly assets: AssetStore }, args: Readonly<Record<string, unknown>>, files: PackFiles): Promise<Command> {
  const id = optString(args, "id");
  const file = optString(args, "file");
  if ((id === undefined) === (file === undefined)) throw new CliError("usage", "background : « id » ou « file », l'un des deux");
  const pages = pagesOf(tab, args);
  return backgroundCommand(tab.assets, await sourceOf(id, file, files), pages);
}
