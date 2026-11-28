/**
 * Office dans la CLI (cadrage cli-lot4, D55 à D57, D79, DA16, DA17, DA20) : le binaire `roomboard-office` de la coque
 * (`crates/roomboard-shell/src/bin/roomboard-office.rs`) convertit en PDF par le même code qu'elle ; la CLI ne lit que
 * son code de sortie, le premier mot de stderr (code de `ConvertError`) et la ligne `racine :` de `--check`. Binaire :
 * `ROOMBOARD_OFFICE`, sinon `target/debug/` puis `target/release/` du dépôt (H41). `--check` une fois par binaire, par
 * racine et par processus. Délai : celui du binaire (120 s, H46). Ctrl-C (SIGINT, SIGTERM) pendant une conversion :
 * transmis au binaire ; après sa sortie, les processus qui citent `<racine>/conversions/<pid du binaire>-` (LibreOffice,
 * dans son propre groupe ; lus dans `/proc` sous Linux, par `ps` ailleurs, OG45) sont tués, puis sortie en 130 ou 143
 * avec une ligne `{"error":…}` (D79).
 */
import { execFile, execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OfficeConvertError } from "../../web/src/platform/office-import";
import { CliError } from "./contract";
import { formatOf } from "./formats";

export type Env = Readonly<Record<string, string | undefined>>;
export type OfficeReady = { readonly root: string } | { readonly reason: string };

/** Racine du dépôt : même profondeur depuis `apps/cli/src/` et `apps/cli/dist/` (D55). */
const REPO = new URL("../../../", import.meta.url);
export const BINARY_MISSING =
  "convertisseur roomboard-office introuvable (cargo build -p roomboard-shell --bin roomboard-office, ou ROOMBOARD_OFFICE=<chemin>)";
export const NO_SOFFICE = "LibreOffice introuvable (soffice ou libreoffice dans le PATH)";
export const unavailableMessage = (name: string, reason: string): string => `${basename(name)} : conversion Office indisponible : ${reason}`;
const interruptedMessage = (sig: NodeJS.Signals): string => `conversion Office interrompue (${sig}) : rien n'est enregistré`;

export function officeBinary(env: Env = process.env): string | null {
  const set = env["ROOMBOARD_OFFICE"];
  if (set !== undefined && set !== "") return existsSync(set) ? set : null;
  const exe = process.platform === "win32" ? "roomboard-office.exe" : "roomboard-office";
  for (const dir of ["target/debug/", "target/release/"]) {
    const p = fileURLToPath(new URL(dir + exe, REPO));
    if (existsSync(p)) return p;
  }
  return null;
}

const childEnv = (env: Env): NodeJS.ProcessEnv => ({ ...process.env, ...env });
const checked = new Map<string, Promise<OfficeReady>>();
/** Clé du cache de `--check` : binaire ET variables qui fixent sa racine (`XDG_CACHE_HOME`, `HOME`), telles que le binaire
 *  les reçoit ; une autre racine (autre test, autre environnement) relance `--check`, et `killLeftovers` ne reçoit jamais
 *  une racine périmée. */
const checkKey = (bin: string, env: Env): string => {
  const e = childEnv(env);
  return [bin, e["XDG_CACHE_HOME"] ?? "", e["HOME"] ?? ""].join("\0");
};

/** `--check` du binaire, une fois par binaire, par racine et par processus (D56) ; raison du code 3 sinon. */
export function officeReady(env: Env = process.env): Promise<OfficeReady> {
  const bin = officeBinary(env);
  if (bin === null) return Promise.resolve({ reason: BINARY_MISSING });
  const key = checkKey(bin, env);
  let ready = checked.get(key);
  if (ready === undefined) {
    ready = new Promise<OfficeReady>((resolve) => {
      execFile(bin, ["--check"], { env: childEnv(env), encoding: "utf8" }, (error, stdout) => {
        if (error === null) {
          const root = /^racine : (.+)$/m.exec(stdout)?.[1];
          resolve(root === undefined ? { reason: "réponse de roomboard-office --check illisible" } : { root });
        } else resolve({ reason: error.code === 3 ? NO_SOFFICE : `roomboard-office --check a échoué (${String(error.code ?? error.message)})` });
      });
    });
    checked.set(key, ready);
  }
  return ready;
}

/** cli-lot4 (D59) : fichier converti par roomboard-office (`.xlsx`, `.xlsm` : lecteur `sheet`, jamais converti, D58). */
export const isOfficeDoc = (path: string): boolean => formatOf(path)?.handler === "office";

/** D56 : avant la conversion, une source au lecteur `office` de `FORMAT_LOTS` (`.xlsx`, `.xlsm` : `sheet`, D58) exige le
 *  convertisseur ; sinon `CliError("unsupported")`, code 3. */
export async function checkOffice(sources: readonly string[], env: Env = process.env): Promise<void> {
  const first = sources.find(isOfficeDoc);
  if (first === undefined) return;
  const r = await officeReady(env);
  if ("reason" in r) throw new CliError("unsupported", unavailableMessage(first, r.reason));
}

/** Sortie de `ps -axww -o pid=,command=` → pid et ligne de commande (arguments séparés par une espace). */
export function parsePs(out: string): Array<{ pid: number; cmd: string }> {
  return out.split("\n").flatMap((line) => {
    const m = /^\s*(\d+)\s(.*)$/.exec(line);
    return m === null ? [] : [{ pid: Number(m[1]), cmd: m[2]! }];
  });
}

const fromProc = (procDir: string): Array<{ pid: number; cmd: string }> | null => {
  let names: string[];
  try {
    names = readdirSync(procDir).filter((n) => /^\d+$/.test(n));
  } catch {
    return null;
  }
  return names.flatMap((n) => {
    try {
      return [{ pid: Number(n), cmd: readFileSync(join(procDir, n, "cmdline"), "utf8").replaceAll("\0", " ") }];
    } catch {
      return [];
    }
  });
};

/** `ps` par son chemin absolu (pas de `PATH`), en locale UTF-8 : sinon `ps` écrit `é` en `M-CM-)` et une racine
 *  accentuée n'est plus trouvée. En échec : aucun processus. */
const fromPs = (): Array<{ pid: number; cmd: string }> => {
  try {
    const env = { ...process.env, LC_ALL: "en_US.UTF-8" };
    return parsePs(execFileSync("/bin/ps", ["-axww", "-o", "pid=,command="], { encoding: "utf8", env, maxBuffer: 64 * 1024 * 1024 }));
  } catch {
    return [];
  }
};

/** Processus vivants (D79, OG45) : `procDir` (`/proc`, Linux), sinon (macOS) `ps`. */
export const processCommands = (procDir = "/proc"): Array<{ pid: number; cmd: string }> => fromProc(procDir) ?? fromPs();

/** D79 : processus dont la ligne de commande cite `<racine>/conversions/<pid>-` : tués (groupe, sinon processus) ;
 *  rend leurs pids. */
export function killLeftovers(
  root: string,
  pid: number,
  procDir = "/proc",
  kill: (pid: number, sig: NodeJS.Signals) => void = (p, s) => void process.kill(p, s),
): number[] {
  let conversions = join(root, "conversions");
  try {
    conversions = realpathSync(conversions); // le binaire canonise ce dossier (office.rs, `new_conversion_dir`)
  } catch {
    // absent : le chemin tel quel
  }
  const needles = [...new Set([`${join(root, "conversions")}/${pid}-`, `${conversions}/${pid}-`])];
  const killed: number[] = [];
  for (const { pid: p, cmd } of processCommands(procDir)) {
    if (!needles.some((x) => cmd.includes(x))) continue;
    try {
      kill(-p, "SIGKILL");
    } catch {
      try {
        kill(p, "SIGKILL");
      } catch {
        continue;
      }
    }
    killed.push(p);
  }
  return killed;
}

/** Code de sortie d'une conversion interrompue (D79) : 130 pour SIGINT, 143 pour SIGTERM. */
export const interruptedExitCode = (sig: NodeJS.Signals): number => (sig === "SIGINT" ? 130 : 143);

/** Sortie d'une conversion interrompue (D79) : une ligne `{"error":…}`, puis 130 ou 143 ; appelée après le retrait du
 *  dossier `mkdtemp` (aucun `finally` sauté). Remplacée dans les tests (le processus de Vitest ne sort pas). */
export function exitInterrupted(sig: NodeJS.Signals, code: number): void {
  process.stderr.write(`${JSON.stringify({ error: new CliError("command", interruptedMessage(sig)) })}\n`);
  process.exit(code);
}

type Leftovers = (root: string, pid: number) => unknown;
type Run = { readonly code: number | null; readonly stderr: string; readonly caught: NodeJS.Signals | null };

/** Lance le binaire (`spawn`, tableau d'arguments) ; SIGINT et SIGTERM transmis le temps de la conversion. Ne sort jamais
 *  du processus : la promesse se résout, le dossier `mkdtemp` de l'appelant est retiré ensuite. */
function runConversion(bin: string, args: readonly string[], env: Env, root: string, leftovers: Leftovers): Promise<Run> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env: childEnv(env), stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let caught: NodeJS.Signals | null = null;
    const relay = (sig: NodeJS.Signals) => (): void => {
      caught ??= sig;
      child.kill(sig);
    };
    const onInt = relay("SIGINT");
    const onTerm = relay("SIGTERM");
    process.on("SIGINT", onInt);
    process.on("SIGTERM", onTerm);
    const done = (): void => {
      process.off("SIGINT", onInt);
      process.off("SIGTERM", onTerm);
    };
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (c: string) => {
      stderr += c;
    });
    child.on("error", (e) => {
      done();
      reject(e);
    });
    child.on("close", (code, signal) => {
      done();
      // Ctrl-C de groupe : le binaire (sans gestionnaire) peut mourir de SIGINT avant le relais ; son signal vaut alors
      // interruption (D79). Tout signal ou toute interruption reçue : les restes de LibreOffice sont tués.
      if (caught === null && (signal === "SIGINT" || signal === "SIGTERM")) caught = signal;
      if ((caught !== null || signal !== null) && child.pid !== undefined) leftovers(root, child.pid); // D79 : LibreOffice de cette conversion
      resolve({ code, stderr, caught }); // aucun process.exit ici : le dossier mkdtemp est retiré d'abord
    });
  });
}

/** D57 : PDF du fichier Office `path`, écrit par le binaire dans un dossier `mkdtemp` (0700) retiré à la fin, Ctrl-C
 *  compris ; rejette `OfficeConvertError(code)` (code = premier mot de stderr ; `no-program` pour le code 3, H49). Après
 *  un Ctrl-C (D79) : dossier retiré, puis `onInterrupt(signal, 130 | 143)` (par défaut : ligne `{"error":…}` et sortie). */
export async function convertOfficeFile(
  path: string,
  env: Env = process.env,
  onInterrupt: (sig: NodeJS.Signals, code: number) => void = exitInterrupted,
  leftovers: Leftovers = killLeftovers,
): Promise<Blob> {
  const ready = await officeReady(env);
  const bin = officeBinary(env);
  if ("reason" in ready || bin === null) throw new OfficeConvertError("no-program");
  const dir = await mkdtemp(join(tmpdir(), "roomboard-office-"));
  const out = join(dir, "sortie.pdf");
  const run = await runConversion(bin, [path, out], env, ready.root, leftovers)
    .then(async (r) => ({ ...r, pdf: r.caught === null && r.code === 0 ? new Blob([await readFile(out)], { type: "application/pdf" }) : null }))
    .finally(() => rm(dir, { recursive: true, force: true }));
  if (run.caught !== null) {
    onInterrupt(run.caught, interruptedExitCode(run.caught));
    throw new OfficeConvertError("interrupted"); // atteint seulement si `onInterrupt` ne sort pas (tests)
  }
  if (run.pdf === null) throw new OfficeConvertError(run.code === 3 ? "no-program" : (/^\s*([a-z-]+)/.exec(run.stderr)?.[1] ?? "failed"));
  return run.pdf;
}
