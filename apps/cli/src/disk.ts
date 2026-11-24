/** Disque de la CLI (D3, H6) : lecture, écriture atomique (temporaire du même dossier puis `rename`), date du manifeste. */
import { chmod, lstat, readFile, readlink, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { CliError } from "./contract";

const codeOf = (e: unknown): string | undefined => (e as NodeJS.ErrnoException).code;
const reason = (e: unknown): string => codeOf(e) ?? (e instanceof Error ? e.message : String(e));

export async function readBytes(path: string): Promise<Uint8Array> {
  try {
    return new Uint8Array(await readFile(path));
  } catch (e) {
    throw new CliError("io", `lecture impossible (${path}) : ${reason(e)}`);
  }
}

/** Vrai si `path` existe, lien symbolique pendant compris ; io si l'accès échoue autrement. */
export async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (e) {
    if (codeOf(e) === "ENOENT") return false;
    throw new CliError("io", `accès impossible (${path}) : ${reason(e)}`);
  }
}

/** Fichier réellement écrit : la cible d'un lien symbolique (même pendant), sinon `path` lui-même. */
async function targetOf(path: string, hops = 0): Promise<string> {
  try {
    return await realpath(path);
  } catch (e) {
    if (codeOf(e) !== "ENOENT" || hops >= 40) throw e;
  }
  let link: string;
  try {
    link = await readlink(path);
  } catch {
    return path; // absent et pas un lien : fichier neuf
  }
  return targetOf(resolve(dirname(path), link), hops + 1);
}

let seq = 0;
/**
 * Aucun fichier à moitié écrit : une panique ou un échec laisse la cible telle qu'elle était (H8). Un lien symbolique
 * reste un lien : on écrit sa cible réelle ; un fichier existant garde ses droits.
 */
export async function writeAtomic(path: string, bytes: Uint8Array): Promise<void> {
  let tmp: string | null = null;
  try {
    const target = await targetOf(path);
    const mode = await stat(target).then(
      (st) => st.mode & 0o7777,
      () => null,
    );
    tmp = join(dirname(target), `.${basename(target)}.${process.pid}.${++seq}.tmp`);
    await writeFile(tmp, bytes);
    if (mode !== null) await chmod(tmp, mode); // writeFile applique l'umask
    await rename(tmp, target);
  } catch (e) {
    if (tmp !== null) await rm(tmp, { force: true });
    throw new CliError("io", `écriture impossible (${path}) : ${reason(e)}`);
  }
}

/** Plus grande date représentable (ms depuis 1970). */
const MAX_TIME = 8.64e15;
/**
 * Date écrite au manifeste (H6) : `ROOMBOARD_NOW` si posée (essais reproductibles), en millisecondes depuis 1970 (entier
 * positif), sinon l'heure du système ; toute autre valeur est une erreur d'usage.
 */
export function nowOf(env: Readonly<Record<string, string | undefined>>): string {
  const v = env["ROOMBOARD_NOW"];
  if (v === undefined) return new Date().toISOString();
  const ms = /^[1-9]\d*$/.test(v) ? Number(v) : Number.NaN;
  if (!(ms <= MAX_TIME)) throw new CliError("usage", `ROOMBOARD_NOW : entier positif attendu (millisecondes depuis 1970), reçu « ${v} »`);
  return new Date(ms).toISOString();
}

/** Vrai si les deux chemins désignent le même fichier : chemins résolus égaux, à la casse près, ou `realpath` égaux. */
export async function sameFile(a: string, b: string): Promise<boolean> {
  const [ra, rb] = [resolve(a), resolve(b)];
  if (ra.toLowerCase() === rb.toLowerCase()) return true;
  try {
    return (await realpath(ra)) === (await realpath(rb));
  } catch {
    return false; // l'un des deux n'existe pas : seuls les chemins comptent
  }
}
