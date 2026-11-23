// Aides des tests de la CLI : vrai Wasm (sauté s'il manque, exigé sous ROOMBOARD_WASM_REQUIRED=1, D2), entrées et
// sorties en mémoire, dossier temporaire sous os.tmpdir() (nettoyé), PNG fabriqué, ids du cœur normalisés par rang.
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";
import { afterAll, describe } from "vitest";
import { CliError, type CliIO } from "./contract";
import { wasmPresent } from "./wasm-node";

// Sorties JSON lues par les tests : forme libre, vérifiée par les assertions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export const WEB_SRC = new URL("../../web/src/", import.meta.url);
export const PRESENT = wasmPresent(WEB_SRC);
export const REQUIRED = process.env["ROOMBOARD_WASM_REQUIRED"] === "1";
/** Blocs au vrai module : sautés sans `.wasm`, jamais sous `ROOMBOARD_WASM_REQUIRED=1` (le test de présence échoue). */
export const describeWasm = PRESENT ? describe : describe.skip;
export const XLSX_FIXTURE = fileURLToPath(new URL("../../../crates/roomboard-formats/tests/fixtures/valeurs.xlsx", import.meta.url));
export const FIXED_NOW = "2026-11-23T00:00:00.000Z";

export interface MemoryIO extends CliIO {
  readonly stdout: string[];
  readonly stderr: string[];
  json(): Json[];
  errors(): Json[];
}

export function memoryIO(input: readonly string[] = [], env: Readonly<Record<string, string>> = {}, wasmDir: URL = WEB_SRC): MemoryIO {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    out: (line) => {
      stdout.push(line);
    },
    err: (line) => {
      stderr.push(line);
    },
    lines: () =>
      (async function* () {
        yield* input;
      })(),
    env: { ROOMBOARD_NOW: FIXED_NOW, ...env },
    wasmDir,
    stdout,
    stderr,
    json: () => stdout.map((l) => JSON.parse(l) as Json),
    errors: () => stderr.map((l) => JSON.parse(l) as Json),
  };
}

const made: string[] = [];
afterAll(() => {
  for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true });
});
/** Dossier neuf sous `os.tmpdir()`, retiré à la fin du fichier de test. */
export function tmpDir(): string {
  const d = mkdtempSync(join(tmpdir(), "roomboard-cli-t-"));
  made.push(d);
  return d;
}

/**
 * Empreinte d'un fichier : octets, date de modification et inode. Un `writeAtomic` à l'identique change l'inode (rename
 * d'un temporaire) : comparer les empreintes distingue « non écrit » de « réécrit avec les mêmes octets » (H4).
 */
export function stampOf(path: string): { readonly bytes: string; readonly mtimeMs: number; readonly ino: number } {
  const st = statSync(path);
  return { bytes: readFileSync(path).toString("base64"), mtimeMs: st.mtimeMs, ino: st.ino };
}

/** Code de la `CliError` levée par `f`, « autre » pour une autre erreur, « aucune » sans erreur. */
export function codeOf(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return e instanceof CliError ? e.code : "autre";
  }
  return "aucune";
}

/** PNG RVB 8 bits valide `w × h`, gris uni. */
export function pngBytes(w: number, h: number): Uint8Array {
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = 1 + 3 * w;
  const raw = Buffer.alloc(h * row, 0x80);
  for (let y = 0; y < h; y++) raw[y * row] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Ids du cœur (UUID) remplacés par leur rang d'apparition (`#1`, `#2`…) ; les empreintes d'assets restent. */
export function normalizeIds(v: unknown, seen: Map<string, string> = new Map()): unknown {
  if (typeof v === "string" && UUID.test(v)) {
    if (!seen.has(v)) seen.set(v, `#${seen.size + 1}`);
    return seen.get(v);
  }
  if (Array.isArray(v)) return v.map((x) => normalizeIds(x, seen));
  if (typeof v === "object" && v !== null) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalizeIds(x, seen)]));
  return v;
}
