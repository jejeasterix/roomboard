/**
 * Session de la CLI (cadrage cli, D5, D7, DA3, H4) : onglets (`createTabs`, ids t1, t2… dans l'ordre de création),
 * opérations jouées dans un seul processus, historique du cœur le temps de la session ; rien n'est écrit sans `save`.
 * `$n` vise les ids de l'opération n, ou ses pages quand elle n'a créé aucun élément (AddPage) ; une opération en cours
 * ou échouée ne résout rien. Une opération refusée lève une `CliError` ; l'appelant arrête la session (H4).
 * cli-lot2 (D22, D23, D29) : un tableau `.iwb .ubz .notebook .olf .flipchart` est lu par `readBoardFile` du produit en
 * onglet sans fichier ; un document ne s'enregistre qu'en `.roomboard` (`documentTarget`) ; après une panique du module
 * des formats (`interrupted`), plus aucune écriture.
 */
import { basename } from "node:path";
import { readBoardFile } from "../../web/src/app/board-convert";
import { boardWarningsMessage } from "../../web/src/app/board-files";
import type { BoardPorts, BoardSourceFormat } from "../../web/src/app/board-io";
import type { FragmentOps } from "../../web/src/app/fragments";
import { createContainerIO, type ContainerIO, type ReadKind, type ReadResult } from "../../web/src/app/container-io";
import { createTabs, MAX_TABS, TOO_MANY_TABS, type TabEntry, type Tabs } from "../../web/src/app/tabs";
import type { Change, CoreDocument, CoreFactory } from "../../web/src/core/api";
import { createAssetStore, type AssetStore } from "../../web/src/core/asset-store";
import { createPageCodec, type ContainerCodec, type SheetFormatsBinding } from "../../web/src/platform/container";
import { APP_VERSION, messageOf } from "../../web/src/platform/controller";
import type { Point } from "../../web/src/platform/files";
import { nodeBoardPorts } from "./board-node";
import { asCliError, CliError, type CliIO } from "./contract";
import { nowOf, readBytes, writeAtomic } from "./disk";
import { exportFragment } from "./exporter";
import { cliFragments, type CliPage } from "./fragment-view";
import { extOf, formatOf } from "./formats";
import { atOf, importInto, nodeDecode, partialMessage } from "./importer";
import { needString, optString, parseOp, type CliOpName, type RefContext } from "./ops";
import { stateOf } from "./state";
import { loadCore, loadFormats } from "./wasm-node";

export interface CliTab {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  /** Chemin d'enregistrement ; null pour un onglet neuf jamais enregistré. */
  file: string | null;
}

export interface SessionDeps {
  readonly core: CoreFactory;
  readonly io: ContainerIO;
  readonly codec: ContainerCodec;
  /** Avis du produit (`say`, `notify`), dans l'ordre. */
  readonly notices: string[];
  readonly formats: () => Promise<SheetFormatsBinding>;
  readonly fragments: FragmentOps<CliPage>;
  readonly board: BoardPorts;
  /** D29 : vrai après une panique du module des formats dans ce processus. */
  interrupted(): boolean;
  now(): string;
}

export const INTERRUPTED_MESSAGE = "module des formats interrompu : rien n'est enregistré";
const BOARD_HANDLERS: ReadonlySet<string> = new Set(["iwb", "ubz", "notebook", "olf", "flipchart"]);

/** D22 : format de tableau d'un chemin, null pour un conteneur. */
export function boardFormatOf(path: string): BoardSourceFormat | null {
  const e = formatOf(path);
  return e !== null && BOARD_HANDLERS.has(e.handler) ? (e.handler as BoardSourceFormat) : null;
}

/** D23 : extension .roomboard (sans casse), sinon CliError usage. */
export function documentTarget(path: string): string {
  if (extOf(path) !== ".roomboard") {
    throw new CliError("usage", `${basename(path)} : un document s'enregistre en .roomboard (convert ou export pour un autre format)`);
  }
  return path;
}

export type OpResult = { readonly op: number; readonly ok: true } & Readonly<Record<string, unknown>>;
export interface TabInfo {
  readonly id: string;
  readonly file: string | null;
  readonly active: boolean;
}

export interface Session {
  readonly deps: SessionDeps;
  readonly tabs: Tabs<CliTab>;
  /** Onglet actif ; CliError command s'il n'y en a aucun. */
  active(): CliTab;
  newTab(): TabEntry<CliTab>;
  /** Lit un conteneur ou, en document, un tableau (D22) ; CliError format avec l'avis du produit s'il est refusé. */
  readDoc(path: string, kind: ReadKind): Promise<Pick<ReadResult, "doc" | "assets">>;
  open(path: string): Promise<TabEntry<CliTab>>;
  /** Ouverture par l'importeur (`openDocument`) : null si refusé, l'avis est déjà dans `notices`. */
  openBytes(name: string, bytes: Uint8Array, path: string | null): Promise<TabEntry<CliTab> | null>;
  /** Tableau ouvert par l'importeur (`openBoard`) en onglet sans fichier : false si refusé, l'avis est dans `notices`. */
  openBoard(file: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }): Promise<boolean>;
  save(tab: CliTab, to?: string | null): Promise<string>;
  /** Écriture atomique d'un fichier de la session (document ou fragment), retenue par `written`. */
  write(path: string, bytes: Uint8Array): Promise<void>;
  /** Fichiers écrits par la session, sans doublon, dans l'ordre de leur première écriture. */
  written(): readonly string[];
  tabList(): TabInfo[];
  exec(line: unknown): Promise<OpResult>;
}

export function createSession(deps: SessionDeps): Session {
  let next = 0;
  const tabs = createTabs<CliTab>(() => `t${++next}`);
  /** recorded[n - 1] : ids retenus de l'opération n. */
  const recorded: (readonly string[])[] = [];
  const written = new Set<string>();
  const writable = (): void => {
    if (deps.interrupted()) throw new CliError("command", INTERRUPTED_MESSAGE);
  };
  async function write(path: string, bytes: Uint8Array): Promise<void> {
    writable();
    await writeAtomic(path, bytes);
    written.add(path);
  }

  const active = (): CliTab => {
    const t = tabs.active();
    if (t === null) throw new CliError("command", "aucun onglet ouvert");
    return t.session;
  };
  const add = (tab: CliTab): TabEntry<CliTab> => {
    try {
      return tabs.add("board", tab);
    } catch (e) {
      tab.doc.free();
      throw asCliError(e, "command");
    }
  };
  const newTab = (): TabEntry<CliTab> => add({ doc: deps.core.blank(), assets: createAssetStore(), file: null });

  const readBoard = (name: string, blob: Blob, format: BoardSourceFormat) =>
    readBoardFile({ name, blob, format }, { core: deps.core, ports: deps.board, makeAssets: () => createAssetStore(), decode: nodeDecode, now: () => deps.now(), appVersion: APP_VERSION });

  async function readDoc(path: string, kind: ReadKind): Promise<Pick<ReadResult, "doc" | "assets">> {
    const bytes = await readBytes(path);
    const format = kind === "document" ? boardFormatOf(path) : null;
    if (format !== null) {
      const name = basename(path);
      let read: Awaited<ReturnType<typeof readBoard>>;
      try {
        read = await readBoard(name, new Blob([bytes as BlobPart]), format);
      } catch (e) {
        throw new CliError("format", `Ouverture impossible (${name}) : ${messageOf(e)}`);
      }
      if (read.warnings.length > 0) deps.notices.push(boardWarningsMessage(name, read.warnings));
      return { doc: read.doc, assets: read.assets };
    }
    const before = deps.notices.length;
    const read = await deps.io.read(basename(path), bytes, kind, path);
    if (read === null) throw new CliError("format", deps.notices.slice(before).join(" ; ") || `ouverture impossible : ${path}`);
    return read;
  }
  async function open(path: string): Promise<TabEntry<CliTab>> {
    if (tabs.list().length >= MAX_TABS) throw new CliError("command", TOO_MANY_TABS);
    const read = await readDoc(path, "document");
    // D22 : un tableau ouvert est un onglet sans fichier (comme `target: null` de la page) : jamais réécrit à son chemin.
    return add({ doc: read.doc, assets: read.assets, file: boardFormatOf(path) === null ? path : null });
  }
  async function openBoard(file: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }): Promise<boolean> {
    if (tabs.list().length >= MAX_TABS) {
      deps.notices.push(`Ouverture impossible (${file.name}) : ${TOO_MANY_TABS}`);
      return false;
    }
    try {
      const read = await readBoard(file.name, file.blob, file.format);
      add({ doc: read.doc, assets: read.assets, file: null });
      if (read.warnings.length > 0) deps.notices.push(boardWarningsMessage(file.name, read.warnings));
      return true;
    } catch (e) {
      deps.notices.push(`Ouverture impossible (${file.name}) : ${messageOf(e)}`);
      return false;
    }
  }
  async function openBytes(name: string, bytes: Uint8Array, path: string | null): Promise<TabEntry<CliTab> | null> {
    if (tabs.list().length >= MAX_TABS) {
      deps.notices.push(`Ouverture impossible (${name}) : ${TOO_MANY_TABS}`);
      return null;
    }
    const read = await deps.io.read(name, bytes, "document", path);
    return read === null ? null : add({ doc: read.doc, assets: read.assets, file: path });
  }
  async function save(tab: CliTab, to: string | null = null): Promise<string> {
    writable();
    const path = to ?? tab.file;
    if (path === null) throw new CliError("usage", "enregistrer : aucun chemin (champ « to » ou option --out)");
    documentTarget(path);
    let bytes: Uint8Array;
    try {
      bytes = await deps.io.encode(tab.doc, tab.assets, deps.now(), APP_VERSION, { kind: "document" });
    } catch (e) {
      throw asCliError(e, "command");
    }
    await write(path, bytes);
    tab.file = path;
    return path;
  }
  const tabList = (): TabInfo[] => {
    const current = tabs.active()?.id ?? null;
    return tabs.list().map((t) => ({ id: t.id, file: t.session.file, active: t.id === current }));
  };
  const knownTab = (args: Readonly<Record<string, unknown>>): string => {
    const id = needString(args, "tab");
    if (!tabs.list().some((t) => t.id === id)) throw new CliError("command", `onglet inconnu : ${id}`);
    return id;
  };
  const ctx: RefContext = {
    idsOf: (n) => (n >= 1 ? recorded[n - 1] : undefined),
    pageIds: () => tabs.active()?.session.doc.pageIds() ?? [],
    tabIds: () => tabs.list().map((t) => t.id),
  };

  async function runCli(name: CliOpName, args: Readonly<Record<string, unknown>>): Promise<Record<string, unknown>> {
    switch (name) {
      case "undo":
      case "redo": {
        const doc = active().doc;
        const can = name === "undo" ? doc.canUndo() : doc.canRedo();
        return { change: can ? (name === "undo" ? doc.undo() : doc.redo()) : null };
      }
      case "state": {
        const tab = active();
        return { state: stateOf(tab.doc, tab.file, { page: optString(args, "page"), points: args["points"] === true }) };
      }
      case "save":
        return { file: await save(active(), optString(args, "to") ?? null) };
      case "import": {
        const files = args["files"];
        if (!Array.isArray(files) || files.length === 0 || !files.every((f) => typeof f === "string")) {
          throw new CliError("usage", "files : liste de chemins attendue");
        }
        const at = args["at"];
        let point: Point | null = null;
        if (at !== undefined) {
          if (!Array.isArray(at) || at.length !== 2) throw new CliError("usage", "at : [x, y] attendu");
          point = atOf(at[0], at[1]);
        }
        const report = await importInto(session, { sources: files as string[], page: optString(args, "page"), at: point });
        if (report.failed.length + report.refused.length > 0) throw new CliError("command", partialMessage(report), { ...report });
        return { ...report };
      }
      case "export": {
        const ids = args["ids"];
        if (ids !== undefined && (!Array.isArray(ids) || !ids.every((i) => typeof i === "string"))) throw new CliError("usage", "ids : liste d'ids attendue");
        const grid = args["grid"];
        if (grid !== undefined && typeof grid !== "boolean") throw new CliError("usage", "grid : booléen attendu");
        return { ...(await exportFragment(session, { to: needString(args, "to"), page: optString(args, "page"), ids: ids as string[] | undefined, name: optString(args, "name"), grid: grid === true })) };
      }
      case "tab.new":
        newTab();
        return { tabs: tabList() };
      case "tab.open":
        await open(needString(args, "file"));
        return { tabs: tabList() };
      case "tab.select":
        tabs.activate(knownTab(args));
        return { tabs: tabList() };
      case "tab.close":
        tabs.remove(knownTab(args))?.session.doc.free();
        return { tabs: tabList() };
      case "tab.list":
        return { tabs: tabList() };
    }
  }

  const session: Session = {
    deps,
    tabs,
    active,
    newTab,
    readDoc,
    open,
    openBytes,
    openBoard,
    save,
    write,
    written: () => [...written],
    tabList,
    async exec(line) {
      const n = recorded.length + 1;
      recorded.push([]); // réservée : une référence à l'opération en cours ou échouée ne résout rien
      const before = deps.notices.length;
      const op = parseOp(line, ctx);
      let body: Record<string, unknown>;
      if (op.kind === "command") {
        const doc = active().doc;
        let change: Change;
        try {
          change = doc.apply(op.cmd);
        } catch (e) {
          // Champ absent ou d'un autre type : la colle du cœur lève un TypeError JS (« reading 'color' »), enveloppé ici.
          if (e instanceof TypeError) throw new CliError("command", `${op.cmd.type} : champ manquant ou mal formé (${e.message})`);
          throw asCliError(e, "command");
        }
        recorded[n - 1] = change.ids.length > 0 ? change.ids : change.pages;
        body = { change };
      } else {
        try {
          body = await runCli(op.op, op.args);
        } catch (e) {
          throw asCliError(e, "command");
        }
      }
      const fresh = deps.notices.slice(before);
      return { op: n, ok: true as const, ...body, ...(fresh.length > 0 ? { notices: fresh } : {}) };
    },
  };
  return session;
}

/** Session branchée sur les vrais modules : cœur, conteneur (module formats chargé au premier besoin), date du manifeste. */
export async function nodeSession(io: CliIO): Promise<Session> {
  nowOf(io.env); // ROOMBOARD_NOW mal formée : usage (code 2) avant tout chargement ni écriture
  const core = await loadCore(io.wasmDir);
  const formats = loadFormats(io.wasmDir);
  const notices: string[] = [];
  const codec = createPageCodec(formats);
  const containerIO = createContainerIO({
    core,
    codec,
    say: async (m) => {
      notices.push(m);
    },
    makeAssets: () => createAssetStore(),
  });
  const now = (): string => nowOf(io.env);
  let interrupted = false;
  return createSession({
    core,
    io: containerIO,
    codec,
    notices,
    formats,
    now,
    fragments: cliFragments({ io: containerIO, core, now, notices }),
    board: nodeBoardPorts(formats, () => {
      interrupted = true;
    }),
    interrupted: () => interrupted,
  });
}
