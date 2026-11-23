/** Disque de la CLI (D3, H6) : lecture, écriture atomique (temporaire du même dossier puis `rename`), date du manifeste. */
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { CliError } from "./contract";

const reason = (e: unknown): string => (e as NodeJS.ErrnoException).code ?? (e instanceof Error ? e.message : String(e));

export async function readBytes(path: string): Promise<Uint8Array> {
  try {
    return new Uint8Array(await readFile(path));
  } catch (e) {
    throw new CliError("io", `lecture impossible (${path}) : ${reason(e)}`);
  }
}

let seq = 0;
/** Aucun fichier à moitié écrit : une panique ou un échec laisse la cible telle qu'elle était (H8). */
export async function writeAtomic(path: string, bytes: Uint8Array): Promise<void> {
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.${++seq}.tmp`);
  try {
    await writeFile(tmp, bytes);
    await rename(tmp, path);
  } catch (e) {
    await rm(tmp, { force: true });
    throw new CliError("io", `écriture impossible (${path}) : ${reason(e)}`);
  }
}

/** Date écrite au manifeste : `ROOMBOARD_NOW` si posée (essais reproductibles), sinon l'heure du système (H6). */
export const nowOf = (env: Readonly<Record<string, string | undefined>>): string => env["ROOMBOARD_NOW"] ?? new Date().toISOString();
