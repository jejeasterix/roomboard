/**
 * Lecture d'une ligne d'opération (cadrage cli, D6) : une commande du cœur telle que la page l'envoie
 * (`{"type":…}`, union `Command` de `core/api.ts`, `points` et `path` en tableaux JSON convertis en `Float32Array`), ou
 * une opération de la CLI (`{"op":…}`). Références sur les chaînes entières : `$n` (1er id de l'opération n, comptée à
 * partir de 1), `$n.k` (k-ième, à partir de 1), `$page:i` (page d'indice i de l'onglet actif), `$tab:i` (onglet d'indice i).
 * Dans toute autre chaîne, `$$` donne un `$` littéral (`"$$1"` est le texte « $1 », jamais une référence).
 */
import type { Command } from "../../web/src/core/api";
import { CliError } from "./contract";

export const COMMAND_TYPES = [
  "AddPage", "RemovePage", "SetPageMode", "MovePage", "DuplicatePage", "Restack",
  "CommitStroke", "Erase", "Delete", "AddShape", "SetText", "Transform", "AddImage", "AddMedia",
  "SetMedia", "AddModel3d", "SetModel3dView", "SetBackdrop", "FormatText", "SetGrid", "AddTable", "SetTableCell",
  "InsertTableLine", "RemoveTableLine", "SetTableSizes", "SetTableFill", "MergeTableCells", "SplitTableCell",
  "SetTableShade", "ImportTable", "Fill", "SetImageParams", "Group", "Ungroup",
] as const satisfies readonly Command["type"][];
// Une commande ajoutée à `Command` sans l'être ici casse `tsc` : la CLI suit le cœur (§ 7 du cadrage).
type Missing = Exclude<Command["type"], (typeof COMMAND_TYPES)[number]>;
export const ALL_COMMANDS: [Missing] extends [never] ? true : Missing = true;

export const CLI_OPS = ["undo", "redo", "state", "save", "import", "export", "tab.new", "tab.open", "tab.select", "tab.close", "tab.list"] as const;
export type CliOpName = (typeof CLI_OPS)[number];

export type Op =
  | { readonly kind: "command"; readonly cmd: Command }
  | { readonly kind: "cli"; readonly op: CliOpName; readonly args: Readonly<Record<string, unknown>> };

export interface RefContext {
  /** Ids retenus de l'opération n (1 = la première) ; undefined si elle n'a pas encore eu lieu. */
  idsOf(n: number): readonly string[] | undefined;
  pageIds(): readonly string[];
  tabIds(): readonly string[];
}

const REF = /^\$(?:(\d+)(?:\.(\d+))?|page:(\d+)|tab:(\d+))$/;
const FLOAT_KEYS = ["points", "path"] as const;

export function resolveRefs(v: unknown, ctx: RefContext): unknown {
  if (typeof v === "string") {
    const m = REF.exec(v);
    if (m === null) return v.replaceAll("$$", "$");
    const [, n, k, page, tab] = m;
    let id: string | undefined;
    if (n !== undefined) id = ctx.idsOf(Number(n))?.[k === undefined ? 0 : Number(k) - 1];
    else id = (page !== undefined ? ctx.pageIds() : ctx.tabIds())[Number(page ?? tab)];
    if (id === undefined) throw new CliError("usage", `référence inconnue : ${v}`);
    return id;
  }
  if (Array.isArray(v)) return v.map((x) => resolveRefs(x, ctx));
  if (typeof v === "object" && v !== null) return Object.fromEntries(Object.entries(v).map(([key, x]) => [key, resolveRefs(x, ctx)]));
  return v;
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    throw new CliError("usage", `ligne JSON invalide : ${line.slice(0, 80)}`);
  }
}

export function parseOp(line: unknown, ctx: RefContext): Op {
  const raw = typeof line === "string" ? parseJson(line) : line;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new CliError("usage", "opération : objet JSON attendu");
  const v = resolveRefs(raw, ctx) as Record<string, unknown>;
  const type = v["type"];
  if (typeof type === "string") {
    if (!(COMMAND_TYPES as readonly string[]).includes(type)) throw new CliError("usage", `commande du cœur inconnue : ${type}`);
    const cmd: Record<string, unknown> = { ...v };
    for (const key of FLOAT_KEYS) {
      const a = cmd[key];
      if (a === undefined) continue;
      if (!Array.isArray(a) || !a.every((x) => typeof x === "number" && Number.isFinite(x))) {
        throw new CliError("usage", `${key} : tableau de nombres attendu`);
      }
      cmd[key] = new Float32Array(a as number[]);
    }
    return { kind: "command", cmd: cmd as unknown as Command };
  }
  const op = v["op"];
  if (typeof op === "string" && (CLI_OPS as readonly string[]).includes(op)) return { kind: "cli", op: op as CliOpName, args: v };
  throw new CliError("usage", `opération inconnue : ${JSON.stringify(raw).slice(0, 80)}`);
}

export function optString(args: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const v = args[key];
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new CliError("usage", `${key} : chaîne attendue`);
  return v;
}

export function needString(args: Readonly<Record<string, unknown>>, key: string): string {
  const v = optString(args, key);
  if (v === undefined) throw new CliError("usage", `${key} : champ exigé`);
  return v;
}
