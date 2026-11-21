/**
 * Tableaux `.iwb` et `.ubz` côté espace de travail (C13, D3, D5, D16, D17) : choix des entrées d'une archive
 * (`content.xml` ou pages `pageNNN.svg` triées par numéro, images à côté), noms d'onglet et de copie, avis. Aucun DOM.
 */
import { PDF_MAX_PAGES } from "../core/api";
import { ROOMBOARD_EXTENSION } from "../platform/files";
import type { BoardFormat, BoardListPage, BoardObject } from "./board-io";

export const BOARD_NO_PAGE_MESSAGE = "tableau sans page";
export const IWB_NO_CONTENT_MESSAGE = "fichier endommagé : aucun content.xml dans ce .iwb";
export const UBZ_NO_PAGE_MESSAGE = "fichier endommagé : aucune page pageNNN.svg dans ce .ubz";
/** D16 : borne par fichier (`.ubz` : toutes pages ensemble) ; même texte que `BoardError::TooBig` du module `formats`. */
export const BOARD_OBJECTS_MESSAGE = "fichier de tableau trop gros (plus de 100 000 objets)";
export const BOARD_MAX_OBJECTS = 100_000;
export const UBZ_NOT_ZIP_MESSAGE = "fichier endommagé : un .ubz est une archive ZIP";

export interface BoardSources {
  readonly xml: readonly Blob[];
  readonly media: ReadonlyMap<string, Blob>;
  readonly total: number;
}

/** Entrées gardées par le Worker ZIP (`keepBoardPath`) → XML à lire (500 pages au plus) et images par chemin normalisé. */
export function boardSources(format: BoardFormat, entries: readonly { readonly path: string; readonly blob: Blob }[]): BoardSources {
  const media = new Map<string, Blob>();
  const pages: Array<{ n: number; blob: Blob }> = [];
  let content: Blob | null = null;
  for (const e of entries) {
    const path = e.path.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
    const lower = path.toLowerCase();
    if (format === "iwb" && lower === "content.xml") {
      content = e.blob;
      continue;
    }
    const page = /^page(\d+)\.svg$/.exec(lower);
    if (format === "ubz" && page !== null) {
      pages.push({ n: Number(page[1]), blob: e.blob });
      continue;
    }
    media.set(path, e.blob);
  }
  if (format === "iwb") {
    if (content === null) throw new Error(IWB_NO_CONTENT_MESSAGE);
    return { xml: [content], media, total: 1 };
  }
  if (pages.length === 0) throw new Error(UBZ_NO_PAGE_MESSAGE);
  pages.sort((a, b) => a.n - b.n);
  return { xml: pages.slice(0, PDF_MAX_PAGES).map((p) => p.blob), media, total: pages.length };
}

const listOf = (warnings: readonly string[]): string => warnings.map((w) => `- ${w}`).join("\n");
const count = (n: number): string => `${n} avertissement${n > 1 ? "s" : ""}`;
const stem = (name: string, ext: string): string => (name.toLowerCase().endsWith(ext) && name.length > ext.length ? name.slice(0, -ext.length) : name);

/** D16 : même forme que `pdfFirstPagesMessage`, sans le nom (l'avis le porte). */
export const boardFirstPagesMessage = (total: number): string => `${PDF_MAX_PAGES} premières pages importées sur ${total}`;
/** D15 : un seul avis à l'ouverture, une ligne par avertissement. */
export const boardWarningsMessage = (name: string, warnings: readonly string[]): string => `${name} : ouvert avec ${count(warnings.length)} :\n${listOf(warnings)}`;
export const boardSavedMessage = (format: BoardFormat, warnings: readonly string[]): string =>
  warnings.length === 0 ? `Copie enregistrée au format .${format}` : `Copie enregistrée au format .${format}, avec ${count(warnings.length)} :\n${listOf(warnings)}`;
/** D5 : onglet `<nom>.roomboard`, jamais l'original. */
export const boardTabName = (name: string, format: BoardFormat): string => `${stem(name, `.${format}`)}${ROOMBOARD_EXTENSION}`;
export const boardExportName = (tabName: string, format: BoardFormat): string => `${stem(tabName, ROOMBOARD_EXTENSION)}.${format}`;

const countObjects = (objects: readonly BoardObject[]): number => objects.reduce((n, o) => n + 1 + (o.kind === "group" ? countObjects(o.children) : 0), 0);
/** D16 : objets de toutes les pages, membres de groupe compris. */
export const boardObjectCount = (pages: readonly BoardListPage[]): number => pages.reduce((n, p) => n + countObjects(p.objects), 0);
