/**
 * Tableaux `.iwb` et `.ubz` côté espace de travail (C13, D3, D5, D16, D17) : choix des entrées d'une archive
 * (`content.xml` ou pages `pageNNN.svg` triées par numéro, images à côté), noms d'onglet et de copie, avis. Aucun DOM.
 */
import { PDF_MAX_PAGES } from "../core/api";
import { BOARD_OBJECTS_MESSAGE, normalBoardPath } from "../platform/board-reader";
import { ROOMBOARD_EXTENSION } from "../platform/files";
import type { BoardFormat, BoardListPage, BoardObject, BoardSourceFormat } from "./board-io";

export const BOARD_NO_PAGE_MESSAGE = "tableau sans page";
export const IWB_NO_CONTENT_MESSAGE = "fichier endommagé : aucun content.xml dans ce .iwb";
export const UBZ_NO_PAGE_MESSAGE = "fichier endommagé : aucune page pageNNN.svg dans ce .ubz";
/** D16 : borne par fichier (`.ubz` : toutes pages ensemble) ; même texte que `BoardError::TooBig` du module `formats`. */
export { BOARD_OBJECTS_MESSAGE };
export const BOARD_MAX_OBJECTS = 100_000;
export const UBZ_NOT_ZIP_MESSAGE = "fichier endommagé : un .ubz est une archive ZIP";

export interface BoardSources {
  readonly xml: readonly Blob[];
  readonly names: readonly string[];
  readonly manifest: Blob | null;
  readonly json: Blob | null;
  readonly media: ReadonlyMap<string, Blob>;
  readonly total: number;
}

type ZipBoard = "iwb" | "ubz" | "notebook" | "olf";

/** C13 (N4) : dialecte d'un ZIP de tableau sur son contenu ; celui de l'extension gagne si ses marques sont là. */
export function resolveBoardFormat(ext: ZipBoard, paths: readonly string[]): ZipBoard | null {
  const lower = paths.map((p) => normalBoardPath(p).toLowerCase());
  const has = (n: string): boolean => lower.includes(n);
  const pages = lower.some((p) => /^page\d+\.svg$/.test(p));
  // N6 : un `.notebook` sans manifeste reste un `notebook` (ordre déduit des noms, T5) ; un autre ZIP de pages sans manifeste est un `.ubz`.
  const marks = { iwb: has("content.xml"), notebook: pages && (has("imsmanifest.xml") || ext === "notebook"), olf: has("content.json"), ubz: pages && !has("imsmanifest.xml") } as const;
  if (marks[ext]) return ext;
  for (const f of ["iwb", "notebook", "olf", "ubz"] as const) if (marks[f]) return f;
  return null;
}

export const boardNoContentMessage = (ext: string): string => `fichier endommagé : contenu de tableau introuvable dans ce .${ext}`;

/** Entrées gardées par le Worker ZIP (`keepBoardPath`) → XML à lire et images par chemin normalisé.
 *  `ubz` : 500 pages au plus ; `notebook` : toutes les pages (la coupe est au Worker) ; `olf` : `content.json`. */
export function boardSources(format: ZipBoard, entries: readonly { readonly path: string; readonly blob: Blob }[]): BoardSources {
  const media = new Map<string, Blob>();
  const pages: Array<{ n: number; name: string; blob: Blob }> = [];
  let content: Blob | null = null;
  let manifest: Blob | null = null;
  let json: Blob | null = null;
  for (const e of entries) {
    const path = normalBoardPath(e.path);
    const lower = path.toLowerCase();
    if (format === "iwb" && lower === "content.xml") {
      content = e.blob;
      continue;
    }
    if (format === "olf" && lower === "content.json") {
      json = e.blob;
      continue;
    }
    if (format === "notebook" && lower === "imsmanifest.xml") {
      manifest = e.blob;
      continue;
    }
    const page = /^page(\d+)\.svg$/.exec(lower);
    if ((format === "ubz" || format === "notebook") && page !== null) {
      pages.push({ n: Number(page[1]), name: path, blob: e.blob });
      continue;
    }
    media.set(path, e.blob);
  }
  if (format === "iwb") {
    if (content === null) throw new Error(IWB_NO_CONTENT_MESSAGE);
    return { xml: [content], names: ["content.xml"], manifest: null, json: null, media, total: 1 };
  }
  if (format === "olf") {
    if (json === null) throw new Error(boardNoContentMessage("olf"));
    return { xml: [], names: [], manifest: null, json, media, total: 1 };
  }
  if (pages.length === 0) throw new Error(format === "notebook" ? boardNoContentMessage("notebook") : UBZ_NO_PAGE_MESSAGE);
  pages.sort((a, b) => a.n - b.n);
  const kept = format === "ubz" ? pages.slice(0, PDF_MAX_PAGES) : pages;
  return { xml: kept.map((p) => p.blob), names: kept.map((p) => p.name), manifest, json: null, media, total: pages.length };
}

/** C13 lot 3 (N11) : entrées `.in`, `.io`, `.ir` et `version` d'un paperboard (lues par le Rust) ; le reste (images) va en
 *  `media`, clé = chemin normalisé : jamais envoyé au Worker des tableaux. */
const FLIPCHART_STRUCTURE = /(^|\/)version$|\.(in|io|ir)$/i;
export function flipchartSources(entries: readonly { readonly path: string; readonly blob: Blob }[]): {
  readonly structure: readonly { readonly path: string; readonly blob: Blob }[];
  readonly media: ReadonlyMap<string, Blob>;
} {
  const structure: { path: string; blob: Blob }[] = [];
  const media = new Map<string, Blob>();
  for (const e of entries) {
    const path = normalBoardPath(e.path);
    if (FLIPCHART_STRUCTURE.test(path)) structure.push({ path, blob: e.blob });
    else media.set(path, e.blob);
  }
  return { structure, media };
}

const listOf = (warnings: readonly string[]): string => warnings.map((w) => `- ${w}`).join("\n");
const count = (n: number): string => `${n} avertissement${n > 1 ? "s" : ""}`;
export const stem = (name: string, ext: string): string => (name.toLowerCase().endsWith(ext) && name.length > ext.length ? name.slice(0, -ext.length) : name);

/** D16 : même forme que `pdfFirstPagesMessage`, sans le nom (l'avis le porte). */
export const boardFirstPagesMessage = (total: number): string => `${PDF_MAX_PAGES} premières pages importées sur ${total}`;
/** D15 : un seul avis à l'ouverture, une ligne par avertissement. */
export const boardWarningsMessage = (name: string, warnings: readonly string[]): string => `${name} : ouvert avec ${count(warnings.length)} :\n${listOf(warnings)}`;
export const boardSavedMessage = (format: BoardFormat, warnings: readonly string[]): string =>
  warnings.length === 0 ? `Copie enregistrée au format .${format}` : `Copie enregistrée au format .${format}, avec ${count(warnings.length)} :\n${listOf(warnings)}`;
/** D5 : onglet `<nom>.roomboard`, jamais l'original. */
export const boardTabName = (name: string, format: BoardSourceFormat): string => `${stem(name, `.${format}`)}${ROOMBOARD_EXTENSION}`;
export const boardExportName = (tabName: string, format: BoardFormat): string => `${stem(tabName, ROOMBOARD_EXTENSION)}.${format}`;

const countObjects = (objects: readonly BoardObject[]): number => objects.reduce((n, o) => n + (o.kind === "group" ? countObjects(o.children) : 1), 0);
/** D16 : objets de toutes les pages ; les feuilles seules comptent, un groupe non (comme `board::read` du module `formats`). */
export const boardObjectCount = (pages: readonly BoardListPage[]): number => pages.reduce((n, p) => n + countObjects(p.objects), 0);

/** Libellés (singulier, pluriel) des avertissements que la page et le lecteur Rust écrivent à l'identique. */
export const SKIPPED_LABEL = ["objet illisible ignoré", "objets illisibles ignorés"] as const;
export const MISSING_LABEL = ["image absente de l'archive", "images absentes de l'archive"] as const;
const KNOWN_LABELS: readonly (readonly [string, string])[] = [SKIPPED_LABEL, MISSING_LABEL];
const WARNING_LINE = /^(?:page (\d+) : )?(\d+) (.+)$/;

/** Avertissements du lecteur Rust puis de la page, mis bout à bout : les comptes de même (page, sorte) s'additionnent
 *  (une seule ligne « page 1 : 2 objets illisibles ignorés ») ; ordre des pages, document entier d'abord. Une ligne
 *  d'une sorte inconnue reste telle quelle. */
export function mergeBoardWarnings(lists: readonly (readonly string[])[]): string[] {
  const rows: Array<{ page: number; text: string; pair?: readonly [string, string]; n: number }> = [];
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const w of lists.flat()) {
    const m = WARNING_LINE.exec(w);
    const pair = m === null ? undefined : KNOWN_LABELS.find(([one, many]) => m[3] === one || m[3] === many);
    if (m === null || pair === undefined) {
      rows.push({ page: m?.[1] === undefined ? 0 : Number(m[1]), text: w, n: 0 });
      continue;
    }
    const page = m[1] === undefined ? 0 : Number(m[1]);
    const key = `${page}|${pair[0]}`;
    const row = byKey.get(key);
    if (row === undefined) {
      const fresh = { page, text: "", pair, n: Number(m[2]) };
      byKey.set(key, fresh);
      rows.push(fresh);
    } else row.n += Number(m[2]);
  }
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.page - b.r.page || a.i - b.i)
    .map(({ r }) => (r.pair === undefined ? r.text : `${r.page === 0 ? "" : `page ${r.page} : `}${r.n} ${r.n === 1 ? r.pair[0] : r.pair[1]}`));
}
