/**
 * Recherche des fonds (personnalisation-1b, Q15, Q16, DA5) : locale, française, sans dépendance ni réseau.
 * Normalisation de la bibliothèque (`normalizeSearch`), mots sans les mots vides, pluriels simples, synonymes écrits à la
 * main (`synonyms.ts`, expressions comprises), fautes par distance de Damerau-Levenshtein bornée (1 de 4 à 7 lettres,
 * 2 au-delà), préfixe pour la frappe en cours. Rang : mot exact > préfixe > synonyme > faute ; tous les mots de la
 * requête doivent trouver un écho (ET), puis l'ordre du catalogue départage. ≈ 200 entrées : parcours complet.
 */
import { normalizeSearch } from "../app/library";
import { SYNONYMS } from "./synonyms";

export interface SearchDoc {
  readonly id: string;
  readonly label: string;
  readonly keywords: readonly string[];
}
export interface BackgroundSearch {
  search(q: string): readonly string[];
  /** Terme du dictionnaire le plus proche du premier mot (distance ≤ 2), tel qu'écrit ; null sinon. */
  suggest(q: string): string | null;
}

const STOP = new Set(["de", "du", "des", "la", "le", "les", "l", "d", "et", "en", "a", "au", "aux", "un", "une", "sur", "pour", "avec"]);
const EXACT = 4;
const PREFIX = 3;
const SYNONYM = 2;
const FAULT = 1;
const SUGGEST_MAX = 2;

export function stem(w: string): string {
  if (w.length > 4 && w.endsWith("eaux")) return w.slice(0, -1);
  if (w.length > 4 && w.endsWith("aux")) return `${w.slice(0, -3)}al`;
  if (w.length > 3 && (w.endsWith("s") || w.endsWith("x"))) return w.slice(0, -1);
  return w;
}

export function faultBound(len: number): number {
  return len < 4 ? 0 : len <= 7 ? 1 : 2;
}

/** Distance de Damerau-Levenshtein (alignement optimal : transposition de deux voisines), arrêtée dès qu'elle dépasse
 *  `max` (rend alors `max + 1`). */
export function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [Array.from({ length: b.length + 1 }, (_, j) => j)];
  for (let i = 1; i <= a.length; i++) {
    const row: number[] = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1]![j]! + 1, row[j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2]![j - 2]! + 1);
      row.push(v);
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
    rows.push(row);
  }
  return rows[a.length]![b.length]!;
}

const flat = (s: string): string => normalizeSearch(s).replace(/[^a-z0-9]+/g, " ").trim();

interface Prepared {
  /** Expression normalisée → mot qui la porte, les plus longues d'abord. */
  readonly phrases: readonly (readonly [string, string])[];
  /** Mot (racine) → groupes qui le contiennent. */
  readonly groupOf: ReadonlyMap<string, readonly number[]>;
  /** Mots (racines) de chaque groupe, porteurs des expressions compris. */
  readonly members: readonly (readonly string[])[];
}

function prepare(groups: readonly (readonly string[])[]): Prepared {
  const phrases: [string, string][] = [];
  const groupOf = new Map<string, number[]>();
  const members = groups.map((g, gi) => {
    const terms = g.map(flat).filter((t) => t !== "");
    const single = terms.find((t) => !t.includes(" "));
    const carrier = single ?? (terms[0] ?? "").replaceAll(" ", "");
    for (const t of terms) if (t.includes(" ")) phrases.push([t, carrier]);
    const words = [...new Set([...terms.filter((t) => !t.includes(" ")), carrier].map(stem))];
    for (const w of words) groupOf.set(w, [...(groupOf.get(w) ?? []), gi]);
    return words;
  });
  phrases.sort((x, y) => y[0].length - x[0].length);
  return { phrases, groupOf, members };
}

/** Mots d'un texte : normalisé, chaque expression connue suivie de son mot porteur, mots vides retirés, racines. */
function wordsOf(text: string, p: Prepared): string[] {
  let t = ` ${flat(text)} `;
  for (const [phrase, carrier] of p.phrases) t = t.replaceAll(` ${phrase} `, ` ${phrase} ${carrier} `);
  return t.split(" ").filter((w) => w !== "" && !STOP.has(w)).map(stem);
}

export function createBackgroundSearch(docs: readonly SearchDoc[], groups: readonly (readonly string[])[] = SYNONYMS): BackgroundSearch {
  const p = prepare(groups);
  const indexed = docs.map((d) => ({ id: d.id, tokens: new Set(wordsOf([d.label, ...d.keywords].join(" "), p)) }));
  const vocab = new Set<string>([...indexed.flatMap((d) => [...d.tokens]), ...p.members.flat()]);
  const matchesOf = (t: string): Map<string, number> => {
    const m = new Map<string, number>();
    const put = (term: string, score: number): void => {
      if ((m.get(term) ?? 0) < score) m.set(term, score);
    };
    const bound = faultBound(t.length);
    for (const v of vocab) {
      if (v === t) put(v, EXACT);
      else if (t.length >= 2 && v.startsWith(t)) put(v, PREFIX);
      else if (bound > 0 && distance(t, v, bound) <= bound) put(v, FAULT);
    }
    for (const [v, score] of [...m]) {
      for (const gi of p.groupOf.get(v) ?? []) for (const w of p.members[gi] ?? []) put(w, score === FAULT ? FAULT : SYNONYM);
    }
    return m;
  };
  return {
    search(q) {
      const words = wordsOf(q, p);
      if (words.length === 0) return [];
      const per = [...new Set(words)].map(matchesOf);
      const hits: { id: string; total: number; rank: number }[] = [];
      indexed.forEach((d, rank) => {
        let total = 0;
        for (const m of per) {
          let best = 0;
          for (const t of d.tokens) best = Math.max(best, m.get(t) ?? 0);
          if (best === 0) return;
          total += best;
        }
        hits.push({ id: d.id, total, rank });
      });
      return hits.sort((a, b) => b.total - a.total || a.rank - b.rank).map((h) => h.id);
    },
    suggest(q) {
      const first = wordsOf(q, p)[0];
      if (first === undefined) return null;
      let best: string | null = null;
      let bestD = SUGGEST_MAX + 1;
      for (const g of groups) {
        for (const term of g) {
          const d = distance(first, stem(flat(term).replaceAll(" ", "")), SUGGEST_MAX);
          if (d < bestD) {
            bestD = d;
            best = term;
          }
        }
      }
      return best;
    },
  };
}
