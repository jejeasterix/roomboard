/**
 * Liens relatifs des médias liés (C14, M30) : le chemin gardé dans le document est relatif au dossier du document quand
 * les deux partagent une racine, absolu sinon (autre lecteur, autre partage UNC). Pur : aucune API de fichiers.
 * Séparateur écrit : `/`. Windows : lecteurs, partages et segments comparés sans casse ; préfixe `\\?\` ignoré.
 */
interface Parsed {
  /** `posix` : `/` ; `drive` : `C:` ; `unc` : `\\serveur\partage`. */
  readonly kind: "posix" | "drive" | "unc";
  readonly root: string;
  readonly segments: string[];
}

const ABSOLUTE = /^(?:[A-Za-z]:[\\/]|[\\/]{2}|\/)/;

export function isAbsoluteLink(path: string): boolean {
  return ABSOLUTE.test(path);
}

function parse(path: string): Parsed {
  let p = path;
  if (p.startsWith("\\\\?\\UNC\\")) p = `\\\\${p.slice(8)}`;
  else if (p.startsWith("\\\\?\\")) p = p.slice(4);
  const parts = (s: string): string[] => s.split(/[\\/]+/).filter((x) => x !== "");
  if (/^[\\/]{2}[^\\/]/.test(p)) {
    const [server = "", share = "", ...rest] = parts(p);
    return { kind: "unc", root: `\\\\${server}\\${share}`, segments: rest };
  }
  const drive = /^([A-Za-z]):(?:[\\/]|$)/.exec(p);
  if (drive) return { kind: "drive", root: `${drive[1]!}:`, segments: parts(p.slice(2)) };
  return { kind: "posix", root: "/", segments: parts(p) };
}

const windows = (p: Parsed): boolean => p.kind !== "posix";
const same = (a: string, b: string, ci: boolean): boolean => (ci ? a.toLowerCase() === b.toLowerCase() : a === b);

export function relativeLink(docPath: string, mediaPath: string): string {
  if (!isAbsoluteLink(mediaPath) || !isAbsoluteLink(docPath)) return mediaPath;
  const doc = parse(docPath);
  const media = parse(mediaPath);
  if (doc.kind !== media.kind || !same(doc.root, media.root, windows(doc))) return mediaPath;
  const dir = doc.segments.slice(0, -1);
  let common = 0;
  while (common < dir.length && common < media.segments.length - 1 && same(dir[common]!, media.segments[common]!, windows(doc))) common += 1;
  return [...Array<string>(dir.length - common).fill(".."), ...media.segments.slice(common)].join("/");
}

export function resolveLink(docPath: string, linked: string): string {
  if (isAbsoluteLink(linked)) return linked;
  const doc = parse(docPath);
  const out = doc.segments.slice(0, -1);
  for (const seg of linked.split(/[\\/]+/)) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return windows(doc) ? `${doc.root}\\${out.join("\\")}` : `/${out.join("/")}`;
}
