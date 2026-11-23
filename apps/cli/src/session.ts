/**
 * Session de la CLI (cadrage cli, D5, D7, DA3, H4) : onglets (`createTabs`, ids t1, t2… dans l'ordre de création),
 * opérations jouées dans un seul processus, historique du cœur le temps de la session ; rien n'est écrit sans `save`.
 * `$n` vise les ids de l'opération n, ou ses pages quand elle n'a créé aucun élément (AddPage) ; une opération en cours
 * ou échouée ne résout rien. Une opération refusée lève une `CliError` ; l'appelant arrête la session (H4).
 */
import { basename } from "node:path";
import { createContainerIO, type ContainerIO, type ReadKind, type ReadResult } from "../../web/src/app/container-io";
import { createTabs, MAX_TABS, TOO_MANY_TABS, type TabEntry, type Tabs } from "../../web/src/app/tabs";
import type { Change, CoreDocument, CoreFactory } from "../../web/src/core/api";
import { createAssetStore, type AssetStore } from "../../web/src/core/asset-store";
import { createPageCodec, type SheetFormatsBinding } from "../../web/src/platform/container";
import { APP_VERSION } from "../../web/src/platform/controller";
import { asCliError, CliError, type CliIO } from "./contract";
import { nowOf, readBytes, writeAtomic } from "./disk";
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
  /** Avis du produit (`say`, `notify`), dans l'ordre. */
  readonly notices: string[];
  readonly formats: () => Promise<SheetFormatsBinding>;
  now(): string;
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
  /** Lit un conteneur ; CliError format avec l'avis du produit s'il est refusé. */
  readDoc(path: string, kind: ReadKind): Promise<ReadResult>;
  open(path: string): Promise<TabEntry<CliTab>>;
  /** Ouverture par l'importeur (`openDocument`) : null si refusé, l'avis est déjà dans `notices`. */
  openBytes(name: string, bytes: Uint8Array, path: string | null): Promise<TabEntry<CliTab> | null>;
  save(tab: CliTab, to?: string | null): Promise<string>;
  tabList(): TabInfo[];
  exec(line: unknown): Promise<OpResult>;
}

export function createSession(deps: SessionDeps): Session {
  let next = 0;
  const tabs = createTabs<CliTab>(() => `t${++next}`);
  /** recorded[n - 1] : ids retenus de l'opération n. */
  const recorded: (readonly string[])[] = [];

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

  async function readDoc(path: string, kind: ReadKind): Promise<ReadResult> {
    const bytes = await readBytes(path);
    const before = deps.notices.length;
    const read = await deps.io.read(basename(path), bytes, kind, path);
    if (read === null) throw new CliError("format", deps.notices.slice(before).join(" ; ") || `ouverture impossible : ${path}`);
    return read;
  }
  async function open(path: string): Promise<TabEntry<CliTab>> {
    if (tabs.list().length >= MAX_TABS) throw new CliError("command", TOO_MANY_TABS);
    const read = await readDoc(path, "document");
    return add({ doc: read.doc, assets: read.assets, file: path });
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
    const path = to ?? tab.file;
    if (path === null) throw new CliError("usage", "enregistrer : aucun chemin (champ « to » ou option --out)");
    let bytes: Uint8Array;
    try {
      bytes = await deps.io.encode(tab.doc, tab.assets, deps.now(), APP_VERSION, { kind: "document" });
    } catch (e) {
      throw asCliError(e, "command");
    }
    await writeAtomic(path, bytes);
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
    save,
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
  const core = await loadCore(io.wasmDir);
  const formats = loadFormats(io.wasmDir);
  const notices: string[] = [];
  const containerIO = createContainerIO({
    core,
    codec: createPageCodec(formats),
    say: async (m) => {
      notices.push(m);
    },
    makeAssets: () => createAssetStore(),
  });
  return createSession({ core, io: containerIO, notices, formats, now: () => nowOf(io.env) });
}
