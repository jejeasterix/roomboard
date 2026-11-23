/**
 * Ligne de commande de RoomBoard (cadrage cli, DA2) : une commande, ses arguments, une ligne JSON par résultat sur
 * stdout, une ligne `{"error":…}` sur stderr en échec ; code de sortie 0, 1, 2 ou 3 (D9). Table des commandes : clés
 * propres seulement (`toString`, `__proto__` sont des usages inconnus).
 */
import { APP_VERSION } from "../../web/src/platform/controller";
import { asCliError, CLI_VERSION, CliError, SCHEMA, usage, type CliIO } from "./contract";
import { formatRows } from "./formats";
import { loadCore } from "./wasm-node";

type Handler = (args: readonly string[], io: CliIO) => Promise<number>;

const USAGE = {
  version: "version",
  formats: "formats",
} as const;

const none = (args: readonly string[], name: keyof typeof USAGE): void => {
  if (args.length > 0) throw usage(USAGE[name]);
};

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
