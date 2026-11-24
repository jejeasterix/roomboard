/**
 * Ligne de commande de RoomBoard (cadrage cli, DA2) : une commande, ses arguments, une ligne JSON par résultat sur
 * stdout, une ligne `{"error":…}` sur stderr en échec ; code de sortie 0, 1, 2 ou 3 (D9). Table des commandes : clés
 * propres seulement (`toString`, `__proto__` sont des usages inconnus). `run` s'arrête à la première opération refusée
 * (H4) ; le fichier n'est écrit que par `save`, `--save` ou `--out` en fin de session réussie. `--save` et `--out`
 * enregistrent toujours le document passé à `run` (onglet t1), quel que soit l'onglet actif ; `--save` l'écrit dans le
 * fichier passé à `run`, même si une opération `save` avec `to` l'a enregistré ailleurs entre-temps ; les autres
 * onglets s'enregistrent par l'opération `save`. `help`, `--help`, `-h` : usage sur stdout ; sans commande : usage sur stderr.
 * cli-lot2 : `convert` (D25), `library` (DA9, H13).
 * cli-lot2 (D23) : toute écriture de document vise un `.roomboard`, contrôlé avant tout chargement par `documentTarget`.
 */
import { APP_VERSION } from "../../web/src/platform/controller";
import { flagStr, parseArgs } from "./args";
import { asCliError, CLI_VERSION, CliError, SCHEMA, usage, type CliIO } from "./contract";
import { exists, readBytes } from "./disk";
import { checkConvert, checkExportTarget, checkNotSource, exportBoardFile, exportFragment, isBoardOut } from "./exporter";
import { extOf, formatRows } from "./formats";
import { libraryExport, libraryImport, libraryList, openLibrary } from "./library";
import { checkSources, importInto, parseAt, partialMessage } from "./importer";
import { documentTarget, nodeSession, type CliTab, type Session } from "./session";
import { stateOf } from "./state";
import type { TabEntry } from "../../web/src/app/tabs";
import { loadCore } from "./wasm-node";

type Handler = (args: readonly string[], io: CliIO) => Promise<number>;

const USAGE = {
  version: "version",
  formats: "formats",
  new: "new <sortie.roomboard> [--replace]",
  state: "state <fichier.roomboard | fichier.rbitem | tableau .iwb .ubz .notebook .olf .flipchart> [--page <id>] [--points]",
  run: "run <fichier.roomboard | --new> [--ops <fichier.jsonl> | -] [--save] [--out <fichier>]",
  apply: "apply <fichier.roomboard> '<opération JSON>' [--out <fichier>]",
  import: "import <fichier.roomboard> <source>… [--page <id>] [--at x,y] [--out <fichier>]",
  export: "export <fichier> <sortie.rbitem | .iwb | .ubz> [--page <id>] [--ids a,b | --all | --grid] [--name <nom>]",
  convert: "convert <source> <sortie.roomboard | .iwb | .ubz>",
  library: "library list <dossier> [--folder <f>] | library import <dossier> <paquet.rbpack> | library export <dossier> <sortie.rbpack> [--folder <f>]",
} as const;

const HELP = ["help", "--help", "-h"];
const USAGE_HELP = "help | --help | -h";
const REFS =
  "opérations : une ligne JSON par commande du cœur ({\"type\":…}) ou de la CLI ({\"op\":…}) ; références (chaîne entière) : " +
  "$n, $n.k, $page:i, $tab:i ; $$ donne un $ littéral";
const ENV = "ROOMBOARD_NOW=<millisecondes depuis 1970> : date du manifeste (essais reproductibles), sinon l'heure du système";
const usageLines = (): string[] => [...Object.values(USAGE), USAGE_HELP].map((u) => `roomboard ${u}`);

const none = (args: readonly string[], name: keyof typeof USAGE): void => {
  if (args.length > 0) throw usage(USAGE[name]);
};

const linesOf = (bytes: Uint8Array): string[] => new TextDecoder().decode(bytes).split(/\r?\n/);

/** Enregistre l'onglet ouvert par la commande (`run`, `apply`) ; refus s'il a été fermé pendant la session. */
async function saveOpened(session: Session, entry: TabEntry<CliTab>, to: string | null): Promise<void> {
  if (!session.tabs.list().some((t) => t.id === entry.id)) {
    throw new CliError("command", `onglet ${entry.id} fermé pendant la session : rien à enregistrer`);
  }
  await session.save(entry.session, to);
}

/** Avis de lecture poussés à l'ouverture d'un tableau (vidéo, TIFF…) : une ligne `{"notices":[…]}` avant les opérations. */
function openingNotices(session: Session, io: CliIO): void {
  if (session.deps.notices.length > 0) io.out(JSON.stringify({ notices: [...session.deps.notices] }));
}

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
    const p = parseArgs(args, { "--replace": "bool" });
    const out = p.positional[0];
    if (out === undefined || p.positional.length !== 1) throw usage(USAGE.new);
    documentTarget(out);
    if (!p.flags.has("--replace") && (await exists(out))) throw new CliError("io", `${out} existe déjà (--replace pour le remplacer)`);
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
    const read = await session.readDoc(file, extOf(file) === ".rbitem" ? "fragment" : "document");
    const notices = session.deps.notices; // avis de lecture d'un tableau (vidéo, TIFF…)
    io.out(JSON.stringify({ ...stateOf(read.doc, file, { page: flagStr(p, "--page"), points: p.flags.has("--points") }), ...(notices.length > 0 ? { notices } : {}) }));
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
    if (save) documentTarget(out ?? file ?? "");
    const ops = flagStr(p, "--ops");
    const fromFile = ops === undefined || ops === "-" ? null : linesOf(await readBytes(ops));
    const session = await nodeSession(io);
    const opened = file === undefined ? session.newTab() : await session.open(file);
    openingNotices(session, io);
    // stdin ouvert ici seulement : readline lit dès sa création, une attente entre les deux perdrait lignes et fin.
    await play(session, fromFile ?? io.lines(), io);
    if (save) {
      // Le fichier passé à run, jamais le chemin courant de t1 : une opération save avec « to » le change (H4, DA2).
      await saveOpened(session, opened, out ?? file ?? null);
      io.out(JSON.stringify({ written: session.written() }));
    }
    return 0;
  },
  apply: async (args, io) => {
    const p = parseArgs(args, { "--out": "value" });
    const [file, op] = p.positional;
    if (file === undefined || op === undefined || p.positional.length !== 2) throw usage(USAGE.apply);
    documentTarget(flagStr(p, "--out") ?? file);
    const session = await nodeSession(io);
    const opened = await session.open(file);
    openingNotices(session, io);
    await play(session, [op], io);
    await saveOpened(session, opened, flagStr(p, "--out") ?? file);
    return 0;
  },
  import: async (args, io) => {
    const p = parseArgs(args, { "--page": "value", "--at": "value", "--out": "value" });
    const [file, ...sources] = p.positional;
    if (file === undefined || sources.length === 0) throw usage(USAGE.import);
    documentTarget(flagStr(p, "--out") ?? file);
    checkSources(sources); // code 3 avant toute lecture (D9)
    const atText = flagStr(p, "--at");
    const at = atText === undefined ? null : parseAt(atText); // code 2 avant tout import (H7)
    const session = await nodeSession(io);
    const tab = (await session.open(file)).session;
    const report = await importInto(session, { sources, page: flagStr(p, "--page"), at });
    try {
      if (report.inserted.length > 0) await session.save(tab, flagStr(p, "--out") ?? file);
    } catch (e) {
      if (session.deps.interrupted()) io.out(JSON.stringify(report)); // D29 : rapport imprimé, puis le refus d'enregistrer
      throw e;
    }
    io.out(JSON.stringify(report));
    if (report.failed.length + report.refused.length > 0) throw new CliError("command", partialMessage(report)); // H10
    return 0;
  },
  export: async (args, io) => {
    const p = parseArgs(args, { "--page": "value", "--ids": "value", "--all": "bool", "--grid": "bool", "--name": "value" });
    const [file, to] = p.positional;
    if (file === undefined || to === undefined || p.positional.length !== 2) throw usage(USAGE.export);
    const idsText = flagStr(p, "--ids");
    if (idsText !== undefined && p.flags.has("--all")) throw new CliError("usage", "--ids et --all s'excluent");
    const grid = p.flags.has("--grid");
    if (grid && (idsText !== undefined || p.flags.has("--all"))) throw new CliError("usage", "--grid exclut --ids et --all");
    checkExportTarget(to); // code 2 ou 3 avant toute lecture
    await checkNotSource(file, to); // code 2 : jamais la source
    if (isBoardOut(to) && (p.flags.has("--page") || idsText !== undefined || p.flags.has("--all") || grid || p.flags.has("--name"))) {
      throw new CliError("usage", `export ${extOf(to)} : document entier ; --page, --ids, --all, --grid et --name ne s'y appliquent pas`);
    }
    const session = await nodeSession(io);
    await session.open(file);
    const ids = idsText?.split(",").map((s) => s.trim()).filter((s) => s !== "");
    const result = isBoardOut(to)
      ? await exportBoardFile(session, to)
      : await exportFragment(session, { to, page: flagStr(p, "--page"), ids, name: flagStr(p, "--name"), grid });
    const notices = session.deps.notices;
    io.out(JSON.stringify({ ...result, ...(notices.length > 0 ? { notices } : {}) }));
    return 0;
  },
  convert: async (args, io) => {
    const p = parseArgs(args, {});
    const [from, to] = p.positional;
    if (from === undefined || to === undefined || p.positional.length !== 2) throw usage(USAGE.convert);
    checkConvert(from, to); // code 2 ou 3 avant tout chargement (D25)
    await checkNotSource(from, to); // code 2 : jamais la source
    const session = await nodeSession(io);
    const tab = (await session.open(from)).session;
    if (extOf(to) === ".roomboard") await session.save(tab, to);
    else await exportBoardFile(session, to);
    io.out(JSON.stringify({ file: to, from, pages: tab.doc.pageIds().length, notices: session.deps.notices }));
    return 0;
  },
  library: async (args, io) => {
    const [sub, ...rest] = args;
    const p = parseArgs(rest, { "--folder": "value" });
    const [dir, file] = p.positional;
    const n = p.positional.length;
    const ok = (sub === "list" && n === 1) || (sub === "import" && n === 2 && !p.flags.has("--folder")) || (sub === "export" && n === 2);
    if (!ok || dir === undefined) throw usage(USAGE.library);
    if (file !== undefined && extOf(file) !== ".rbpack") throw new CliError("usage", `library ${sub} : ${file} : un paquet .rbpack est attendu`);
    const folder = flagStr(p, "--folder") ?? "";
    const session = await nodeSession(io);
    const lib = openLibrary(dir, { core: session.deps.core, codec: session.deps.codec, now: () => session.deps.now() });
    if (sub === "list") io.out(JSON.stringify({ library: dir, ...(await libraryList(lib, folder)) }));
    else if (sub === "import") io.out(JSON.stringify({ library: dir, ...(await libraryImport(lib, file!)) }));
    else io.out(JSON.stringify(await libraryExport(lib, file!, folder)));
    return 0;
  },
};

export async function main(argv: readonly string[], io: CliIO): Promise<number> {
  const [name, ...rest] = argv;
  try {
    if (name !== undefined && HELP.includes(name)) {
      if (rest.length > 0) throw usage(USAGE_HELP);
      io.out(JSON.stringify({ usage: usageLines(), refs: REFS, env: ENV }));
      return 0;
    }
    if (name === undefined) throw new CliError("usage", `aucune commande ; usage : ${usageLines().join(" ; ")} ; ${REFS} ; ${ENV}`);
    const handler = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
    if (handler === undefined) {
      throw new CliError("usage", `commande inconnue : ${name} ; commandes : ${[...Object.keys(COMMANDS), "help"].join(", ")}`);
    }
    return await handler(rest, io);
  } catch (e) {
    const err = asCliError(e);
    io.err(JSON.stringify({ error: err }));
    return err.exit;
  }
}
