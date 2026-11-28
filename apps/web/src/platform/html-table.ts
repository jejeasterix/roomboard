/**
 * Tableau HTML collé → grille de textes (U35, F19, F20, F22, DAB2). Le HTML est lu par un document inerte (`parse` =
 * `DOMParser` « text/html » : aucun script exécuté, aucune ressource chargée) ; seuls `rows`, `cells`, les attributs
 * `rowspan` / `colspan` et le texte sont lus, aucun nœud n'entre dans la page. Grille du modèle d'occupation du
 * tableau HTML (une case déjà prise par un `rowspan` est sautée), placée jusqu'à 64 × 64 (cases et étendues au-delà
 * jamais allouées) ; lignes et colonnes de la source comptées à part pour le message de troncature (F22). Même
 * `TableGrid` que le lecteur de classeur (`sheet-reader.ts`), posée par `insertTableGrid`.
 */
import { TABLE_MAX_LINES } from "../core/api";

/** Au-delà, le collage est refusé (F19). */
export const PASTE_MAX_CHARS = 8 * 1024 * 1024;
export const PASTE_TOO_BIG = "tableau trop gros pour être collé";
/** Caractères gardés d'une cellule (F22, HB-13), suivis de « … » ; même valeur que `sheet.rs`. */
export const MAX_CELL_CHARS = 2000;

export interface GridMerge { readonly row: number; readonly col: number; readonly rows: number; readonly cols: number }
/** Grille à poser (DAB2) : `rows × cols` textes en rangées ; zones en rangs ; source comptée à part ; un texte coupé. */
export interface TableGrid {
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly string[];
  readonly merges: readonly GridMerge[];
  readonly sourceRows: number;
  readonly sourceCols: number;
  readonly cutCells: boolean;
}

const SKIP = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"]);
const BLOCK = new Set(["P", "DIV", "LI"]);
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** Texte coupé à 2 000 caractères (points de code), suivi de « … ». */
export function cutText(s: string): [string, boolean] {
  const cps = Array.from(s);
  return cps.length > MAX_CELL_CHARS ? [cps.slice(0, MAX_CELL_CHARS).join("") + "…", true] : [s, false];
}

/** Texte d'une cellule (F20) : blancs repliés, `<br>` et bornes de `<p>`, `<div>`, `<li>`, `<tr>` imbriqué → saut de
 *  ligne ; cellules d'un tableau imbriqué séparées par une espace (PC16) ; espace insécable → espace ; bords rognés. */
export function cellText(cell: Element): string {
  let out = "";
  const space = (): void => {
    if (out !== "" && !out.endsWith(" ") && !out.endsWith("\n")) out += " ";
  };
  const newline = (): void => {
    out = out.replace(/ +$/, "");
    if (out !== "" && !out.endsWith("\n")) out += "\n";
  };
  const walk = (n: Node): void => {
    if (n.nodeType === TEXT_NODE) {
      (n.nodeValue ?? "").split(/[ \t\n\r\f]+/).forEach((p, i) => {
        if (i > 0) space();
        out += p.replace(/ /g, " ");
      });
      return;
    }
    if (n.nodeType !== ELEMENT_NODE) return;
    const el = n as Element;
    const tag = el.tagName.toUpperCase();
    if (SKIP.has(tag)) return;
    if (tag === "BR") {
      out = out.replace(/ +$/, "") + "\n";
      return;
    }
    const block = BLOCK.has(tag) || tag === "TR";
    if (block) newline();
    for (const c of Array.from(el.childNodes)) walk(c);
    if (block) newline();
    if (tag === "TD" || tag === "TH") space();
  };
  for (const c of Array.from(cell.childNodes)) walk(c);
  return out
    .split("\n")
    .map((l) => l.replace(/^ +| +$/g, ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

/** `rowspan` / `colspan` : entier ≥ 1, sinon la valeur par défaut ; `rowspan="0"` permis (jusqu'à la fin) si `zero`. */
function span(v: string | null, max: number, zero: boolean): number {
  const n = v === null ? Number.NaN : Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0 || (n === 0 && !zero)) return 1;
  return Math.min(n, max);
}

/** Rang de la section d'une ligne : `<thead>` d'abord, `<tfoot>` en dernier (ordre de `HTMLTableElement.rows`). */
const section = (tr: Element): number => {
  const p = tr.parentElement?.tagName.toUpperCase();
  return p === "THEAD" ? 0 : p === "TFOOT" ? 2 : 1;
};
/** Lignes du tableau lui-même, jamais celles d'un tableau imbriqué : `rows` de happy-dom les inclut, d'où ce calcul
 *  (même résultat que `HTMLTableElement.rows` du navigateur). */
const ownRows = (t: Element): Element[] =>
  Array.from(t.querySelectorAll("tr"))
    .filter((tr) => tr.closest("table") === t)
    .sort((a, b) => section(a) - section(b));
/** Cellules directes d'une ligne (`td`, `th`), comme `HTMLTableRowElement.cells`. */
const ownCells = (tr: Element): Element[] => Array.from(tr.children).filter((c) => ["TD", "TH"].includes(c.tagName.toUpperCase()));

/** Premier `<table>` qui a au moins une ligne, en grille ; aucun, ou aucune cellule : null. */
export function tableFromHtml(html: string, parse: (s: string) => Document): TableGrid | null {
  const doc = parse(html);
  const table = Array.from(doc.querySelectorAll("table")).find((t) => ownRows(t).length > 0);
  if (table === undefined) return null;
  const trs = ownRows(table);
  const cap = TABLE_MAX_LINES;
  const nRows = Math.min(trs.length, cap);
  const occ: boolean[] = new Array<boolean>(cap * cap).fill(false);
  const texts: string[] = new Array<string>(cap * cap).fill("");
  const merges: GridMerge[] = [];
  let cols = 0;
  let sourceCols = 0;
  let cut = false;
  trs.forEach((tr, r) => {
    let c = 0;
    for (const td of ownCells(tr)) {
      if (r < nRows) while (c < cap && occ[r * cap + c] === true) c++;
      const cs = span(td.getAttribute("colspan"), 1000, false);
      const rsRaw = span(td.getAttribute("rowspan"), 65534, true);
      const rs = rsRaw === 0 ? trs.length - r : rsRaw;
      if (r < nRows && c < cap) {
        const rg = Math.min(rs, nRows - r);
        const cg = Math.min(cs, cap - c);
        let free = true;
        for (let i = 0; i < rg && free; i++) for (let j = 0; j < cg; j++) if (occ[(r + i) * cap + c + j] === true) free = false;
        const [text, wasCut] = cutText(cellText(td));
        cut ||= wasCut;
        texts[r * cap + c] = text;
        if (free) {
          for (let i = 0; i < rg; i++) for (let j = 0; j < cg; j++) occ[(r + i) * cap + c + j] = true;
          if (rg * cg >= 2) merges.push({ row: r, col: c, rows: rg, cols: cg });
        } else {
          occ[r * cap + c] = true;
        }
        cols = Math.max(cols, c + cg);
      }
      c += cs;
    }
    let widest = c;
    if (r < nRows) for (let j = cap - 1; j >= 0; j--) if (occ[r * cap + j] === true) { widest = Math.max(widest, j + 1); break; }
    sourceCols = Math.max(sourceCols, widest);
  });
  if (cols === 0) return null;
  const cells: string[] = [];
  for (let r = 0; r < nRows; r++) for (let c = 0; c < cols; c++) cells.push(texts[r * cap + c] ?? "");
  return { rows: nRows, cols, cells, merges, sourceRows: trs.length, sourceCols, cutCells: cut };
}

/** Champ cité à partir de `start` (un `"`) : [texte, position suivante], ou null si le guillemet fermant n'est pas
 *  suivi d'une tabulation, d'une fin de ligne ou de la fin du texte (le champ est alors gardé tel quel). `\r\n` et `\r`
 *  du champ deviennent `\n` (comme `cellText` côté HTML). */
function quotedField(text: string, start: number): [string, number] | null {
  const n = text.length;
  let i = start + 1;
  let field = "";
  for (;;) {
    const j = text.indexOf('"', i);
    if (j < 0) return null;
    field += text.slice(i, j);
    if (text[j + 1] === '"') { field += '"'; i = j + 2; continue; }
    const next = text[j + 1];
    if (j + 1 >= n || next === "\t" || next === "\n" || next === "\r") return [field.replace(/\r\n?/g, "\n"), j + 1];
    return null;
  }
}

/** Texte à tabulations (Excel, Word) → grille (point 15, D22) : au moins une tabulation et deux cellules, sinon null ; une seule ligne exige la fin de ligne qu'Excel ajoute toujours.
 *  Guillemets d'Excel (`"a\nb"`, `""` pour un guillemet) ; `\r\n` ; lignes vides de fin ignorées ; lignes courtes
 *  complétées ; mêmes bornes que le HTML (64 × 64, source comptée à part, texte coupé à 2 000 caractères). */
export function tsvGrid(text: string): TableGrid | null {
  if (!text.includes("\t")) return null;
  const rows: string[][] = []; // seulement les TABLE_MAX_LINES premières lignes et colonnes
  const n = text.length;
  let i = 0;
  let nRec = 0;
  let lastNonEmpty = 0; // nombre de lignes jusqu'à la dernière non vide
  let maxCols = 0;
  let colsAtLast = 0;
  let row: string[] = [];
  let nFields = 0;
  let nonEmpty = false;
  const endRecord = (): void => {
    nRec++;
    maxCols = Math.max(maxCols, nFields);
    if (nonEmpty) { lastNonEmpty = nRec; colsAtLast = maxCols; }
    if (rows.length < TABLE_MAX_LINES) rows.push(row);
    row = [];
    nFields = 0;
    nonEmpty = false;
  };
  while (i <= n) {
    const q = text[i] === '"' ? quotedField(text, i) : null;
    let field = "";
    if (q !== null) {
      field = q[0];
      i = q[1];
      if (field.length > 0) nonEmpty = true;
    } else {
      let j = i;
      while (j < n && text[j] !== "\t" && text[j] !== "\n" && text[j] !== "\r") j++;
      if (j > i) nonEmpty = true;
      if (nRec < TABLE_MAX_LINES && nFields < TABLE_MAX_LINES) field = text.slice(i, j);
      i = j;
    }
    if (nRec < TABLE_MAX_LINES && nFields < TABLE_MAX_LINES) row.push(field);
    nFields++;
    if (i >= n) { endRecord(); break; }
    const ch = text[i];
    if (ch === "\t") { i++; continue; }
    if (ch === "\r" && text[i + 1] === "\n") i++;
    i++;
    endRecord();
    if (i >= n) break;
  }
  const records = rows;
  const sourceRowsAll = lastNonEmpty;
  const sourceCols = colsAtLast;
  if (sourceRowsAll === 0 || sourceRowsAll * sourceCols < 2) return null;
  if (nRec === 1 && !/[\r\n]$/.test(text)) return null;
  const nRows = Math.min(sourceRowsAll, TABLE_MAX_LINES);
  const cols = Math.min(sourceCols, TABLE_MAX_LINES);
  let cut = false;
  const cells: string[] = [];
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < cols; c++) {
      const [t, wasCut] = cutText(records[r]?.[c] ?? "");
      cut ||= wasCut;
      cells.push(t);
    }
  }
  return { rows: nRows, cols, cells, merges: [], sourceRows: sourceRowsAll, sourceCols, cutCells: cut };
}
