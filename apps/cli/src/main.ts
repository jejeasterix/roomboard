/**
 * Ligne de commande de RoomBoard (cadrage cli, DA2) : une commande, ses arguments, une ligne JSON par résultat sur
 * stdout, une ligne `{"error":…}` sur stderr en échec ; code de sortie 0, 1, 2 ou 3 (D9). Table des commandes : clés
 * propres seulement (`toString`, `__proto__` sont des usages inconnus). `run` s'arrête à la première opération refusée
 * (H4) ; le fichier n'est écrit que par `save`, `--save` ou `--out` en fin de session réussie.
 */
import { APP_VERSION } from "../../web/src/platform/controller";
import { flagStr, parseArgs } from "./args";
import { asCliError, CLI_VERSION, CliError, SCHEMA, usage, type CliIO } from "./contract";
import { readBytes } from "./disk";
import { formatRows } from "./formats";
import { nodeSession, type Session } from "./session";
import { stateOf } from "./state";
import { loadCore } from "./wasm-node";

type Handler = (args: readonly string[], io: CliIO) => Promise<number>;

const USAGE = {
  version: "version",
  formats: "formats",
  new: "new <sortie.roomboard>",
  state: "state <fichier.roomboard> [--page <id>] [--points]",
  run: "run <fichier.roomboard | --new> [--ops <fichier.jsonl> | -] [--save] [--out <fichier>]",
  apply: "apply <fichier.roomboard> '<opération JSON>' [--out <fichier>]",
} as const;

const none = (args: readonly string[], name: keyof typeof USAGE): void => {
  if (args.length > 0) throw usage(USAGE[name]);
};

const linesOf = (bytes: Uint8Array): string[] => new TextDecoder().decode(bytes).split(/\r?\n/);

/** Joue les lignes (vides ignorées) ; la première refusée est écrite sur stdout, puis levée (stderr et code par `main`). */
async function play(session: Session, lines: AsyncIterable<string> | Iterable<string>, io: CliIO): Promise<void> {
  let n = 0;
  for await (const raw of lines) {
    const line = raw.trim();
    if (line === "") continue;
    n++;
    try {
      io.out(JSON.stringify(await session.exec(line)));
    } catch (e) {
      const err = asCliError(e, "command");
      io.out(JSON.stringify({ op: n, ok: false, error: err, ...err.detail }));
      throw err;
    }
  }
}

const COMMANDS: Readonly<Record<string, Handler>> = {
  version: async (args, io) => {
    none(args, "version");
    const core = await loadCore(io.wasmDir);
    io.out(JSON.stringify({ cli: CLI_VERSION, core: core.version(), app: APP_VERSION, schema: SCHEMA }));
    return 0;
  },
  formats: async (args, io) => {
    none(args, "formats");
    io.out(JSON.stringify({ formats: formatRows() }));
    return 0;
  },
  new: async (args, io) => {
    const p = parseArgs(args, {});
    const out = p.positional[0];
    if (out === undefined || p.positional.length !== 1) throw usage(USAGE.new);
    const session = await nodeSession(io);
    const tab = session.newTab().session;
    await session.save(tab, out);
    io.out(JSON.stringify({ file: out, pages: tab.doc.pageIds() }));
    return 0;
  },
  state: async (args, io) => {
    const p = parseArgs(args, { "--page": "value", "--points": "bool" });
    const file = p.positional[0];
    if (file === undefined || p.positional.length !== 1) throw usage(USAGE.state);
    const session = await nodeSession(io);
    const read = await session.readDoc(file, "document");
    io.out(JSON.stringify(stateOf(read.doc, file, { page: flagStr(p, "--page"), points: p.flags.has("--points") })));
    return 0;
  },
  run: async (args, io) => {
    const p = parseArgs(args, { "--new": "bool", "--ops": "value", "--save": "bool", "--out": "value" });
    const isNew = p.flags.has("--new");
    const file = p.positional[0];
    if (p.positional.length > 1 || isNew === (file !== undefined)) throw usage(USAGE.run);
    const out = flagStr(p, "--out");
    const save = p.flags.has("--save") || out !== undefined;
    if (save && isNew && out === undefined) throw new CliError("usage", "run --new --save : --out <fichier> exigé");
    const ops = flagStr(p, "--ops");
    const fromFile = ops === undefined || ops === "-" ? null : linesOf(await readBytes(ops));
    const session = await nodeSession(io);
    if (file === undefined) {
      session.newTab();
    } else {
      await session.open(file);
    }
    // stdin ouvert ici seulement : readline lit dès sa création, une attente entre les deux perdrait lignes et fin.
    await play(session, fromFile ?? io.lines(), io);
    if (save) await session.save(session.active(), out ?? null);
    return 0;
  },
  apply: async (args, io) => {
    const p = parseArgs(args, { "--out": "value" });
    const [file, op] = p.positional;
    if (file === undefined || op === undefined || p.positional.length !== 2) throw usage(USAGE.apply);
    const session = await nodeSession(io);
    await session.open(file);
    await play(session, [op], io);
    await session.save(session.active(), flagStr(p, "--out") ?? file);
    return 0;
  },
};

export async function main(argv: readonly string[], io: CliIO): Promise<number> {
  const [name, ...rest] = argv;
  try {
    const handler = name !== undefined && Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
    if (handler === undefined) {
      throw new CliError("usage", `commande inconnue : ${name ?? "(aucune)"} ; commandes : ${Object.keys(COMMANDS).join(", ")}`);
    }
    return await handler(rest, io);
  } catch (e) {
    const err = asCliError(e);
    io.err(JSON.stringify({ error: err }));
    return err.exit;
  }
}
