/**
 * Contrat de la CLI (cadrage cli, DA2, D9) : codes d'erreur et de sortie, version, schéma de l'état, entrées et sorties
 * du processus. Toute commande ou option ajoutée plus tard est additive ; un champ renommé passe le schéma à
 * `roomboard-cli/2` (DA2).
 */
import { createInterface } from "node:readline";
import { messageOf } from "../../web/src/platform/controller";

export const CLI_VERSION = "0.1.0";
export const SCHEMA = "roomboard-cli/1";

export type ErrorCode = "usage" | "io" | "format" | "command" | "unsupported";
/** 1 refus (cœur, fichier illisible, import partiel), 2 usage, 3 format d'un lot non livré (D9). */
export const EXIT: Readonly<Record<ErrorCode, 1 | 2 | 3>> = Object.freeze({ usage: 2, io: 1, format: 1, command: 1, unsupported: 3 });

export class CliError extends Error {
  readonly code: ErrorCode;
  /** Champs ajoutés à la ligne d'échec d'une opération de session (rapport d'un import partiel). */
  readonly detail: Readonly<Record<string, unknown>>;
  constructor(code: ErrorCode, message: string, detail: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.detail = detail;
  }
  get exit(): 1 | 2 | 3 {
    return EXIT[this.code];
  }
  /** Forme écrite sur stderr et dans la ligne d'échec d'une opération. */
  toJSON(): { readonly code: ErrorCode; readonly message: string } {
    return { code: this.code, message: this.message };
  }
}

/** Toute erreur en `CliError` ; une erreur du cœur ou d'un module web garde son message. */
export function asCliError(e: unknown, code: ErrorCode = "command"): CliError {
  if (e instanceof CliError) return e;
  return new CliError(code, messageOf(e));
}

export const usage = (text: string): CliError => new CliError("usage", `usage : roomboard ${text}`);

/** Entrées et sorties du processus, remplacées dans les tests. */
export interface CliIO {
  /** Une ligne sur stdout. */
  out(line: string): void;
  /** Une ligne sur stderr. */
  err(line: string): void;
  /** Lignes de stdin (`run -`). */
  lines(): AsyncIterable<string>;
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Dossier qui contient `wasm/` et `wasm-formats/` : `apps/cli/dist/`, ou `apps/web/src/` dans les tests. */
  readonly wasmDir: URL;
}

/** Flux de sortie du processus, réduit à ce qu'en utilise `lineWriter`. */
export interface OutStream {
  write(chunk: string): unknown;
  on(event: "error", listener: (e: Error) => void): unknown;
}

/** Écriture d'une ligne, et l'erreur d'écriture retenue par `lineWriter`. */
export interface LineWriter {
  (line: string): void;
  /** Première erreur d'écriture du flux, EPIPE excepté ; null s'il n'y en a pas. */
  failure(): Error | null;
}

const errnoOf = (e: Error): string | undefined => (e as NodeJS.ErrnoException).code;

/**
 * Une ligne par appel sur `stream` (stdout ou stderr de `bin.ts`). Après une erreur du flux, les lignes suivantes sont
 * ignorées, sans pile ; la commande va au bout (enregistrement compris). Lecteur parti (`| head -1` : EPIPE) : pas un
 * échec. Toute autre erreur (disque plein : ENOSPC) est retenue par `failure` et fait échouer le processus
 * (`exitAfterWrites`).
 */
export function lineWriter(stream: OutStream): LineWriter {
  let closed = false;
  let failure: Error | null = null;
  stream.on("error", (e) => {
    closed = true;
    if (failure === null && errnoOf(e) !== "EPIPE") failure = e;
  });
  return Object.assign(
    (line: string) => {
      if (!closed) stream.write(`${line}\n`);
    },
    { failure: () => failure },
  );
}

/**
 * Code de sortie après les écritures (`bin.ts`, à la sortie du processus) : une écriture perdue sur stdout ou stderr
 * fait échouer une commande réussie (code 1), avec une ligne `{"error":…}` io sur stderr si stderr écrit encore ; un
 * code d'échec de la commande reste le sien.
 */
export function exitAfterWrites(code: number, out: LineWriter, err: LineWriter): number {
  const lost = out.failure();
  const mute = err.failure();
  if (lost === null && mute === null) return code;
  if (lost !== null && mute === null) {
    err(JSON.stringify({ error: new CliError("io", `écriture impossible (stdout) : ${errnoOf(lost) ?? lost.message}`) }));
  }
  return code === 0 ? 1 : code;
}

/**
 * Lignes d'un flux (stdin de `run -`), paresseuses : readline lit dès sa création et perd les lignes, puis la fin, émises
 * avant que l'itération ne s'y branche ; il n'est donc créé qu'à la première lecture, après les attentes de la commande.
 */
export function streamLines(input: NodeJS.ReadableStream): AsyncIterable<string> {
  return (async function* () {
    yield* createInterface({ input, crlfDelay: Infinity });
  })();
}
