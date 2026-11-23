/** Options d'une commande (DA2) : `--nom valeur` ou `--nom` ; tout autre mot est positionnel (« - » compris). */
import { CliError } from "./contract";

export type FlagSpec = Readonly<Record<string, "value" | "bool">>;
export interface ParsedArgs {
  readonly positional: readonly string[];
  readonly flags: ReadonlyMap<string, string | true>;
}

export function parseArgs(args: readonly string[], spec: FlagSpec): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const kind = Object.hasOwn(spec, a) ? spec[a] : undefined;
    if (kind === undefined) throw new CliError("usage", `option inconnue : ${a}`);
    if (flags.has(a)) throw new CliError("usage", `option répétée : ${a}`);
    if (kind === "bool") {
      flags.set(a, true);
      continue;
    }
    const v = args[i + 1];
    if (v === undefined) throw new CliError("usage", `${a} : valeur attendue`);
    flags.set(a, v);
    i++;
  }
  return { positional, flags };
}

export function flagStr(p: ParsedArgs, name: string): string | undefined {
  const v = p.flags.get(name);
  return typeof v === "string" ? v : undefined;
}
