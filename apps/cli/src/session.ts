/**
 * Session de la CLI (cadrage cli, D5, D7, DA3, H4) : onglets (`createTabs`, ids t1, t2… dans l'ordre de création),
 * opérations jouées dans un seul processus, historique du cœur le temps de la session ; rien n'est écrit sans `save`.
 * `$n` vise les ids de l'opération n, ou ses pages quand elle n'a créé aucun élément (AddPage) ; une opération en cours
 * ou échouée ne résout rien. Une opération refusée lève une `CliError` ; l'appelant arrête la session (H4).
 * cli-lot2 (D22, D23, D29) : un tableau `.iwb .ubz .notebook .olf .flipchart` est lu par `readBoardFile` du produit en
 * onglet sans fichier ; un document ne s'enregistre qu'en `.roomboard` (`documentTarget`) ; après une panique du module
 * des formats (`interrupted`), plus aucune écriture.
 * cli-lot3 (D40) : un `.pdf` est lu par `readPdfFile` du produit en onglet sans fichier ; pdf-lib, moteur pdf.js et écrivain
 * krilla en dépendances (T6 écrit le PDF).
 * cli-lot4 (D57, D59) : un fichier Office (lecteur `office` de `FORMAT_LOTS`) est converti par `roomboard-office`
 * (`office-node.ts`), puis lu comme un PDF, l'original gardé, en onglet sans fichier.
 * cli-partage (D3, D5) : ouverture par `open-export.ts` du produit (`openBoardDocument`, `openPdfDocument`), onglets
 * pleins par `tabs.full()` ; messages et canaux de la CLI inchangés.
 */
import { basename } from "node:path";
import type { BoardPorts, BoardSourceFormat } from "../../web/src/app/board-io";
import type { FragmentOps } from "../../web/src/app/fragments";
import { createContainerIO, type ContainerIO, type ReadKind, type ReadResult } from "../../web/src/app/container-io";
import { openBoardDocument, openFailedMessage, openPdfDocument, type OpenedDocument } from "../../web/src/app/open-export";
import type { PdfLib } from "../../web/src/app/pdf-export";
import type { PdfWriter } from "../../web/src/app/pdf-overlay-vector";
import type { PdfEngine } from "../../web/src/engine/render/pdf-port";
import { createTabs, TOO_MANY_TABS, type TabEntry, type Tabs } from "../../web/src/app/tabs";
import type { Change, CoreDocument, CoreFactory } from "../../web/src/core/api";
import { createAssetStore, type AssetStore } from "../../web/src/core/asset-store";
import { createPageCodec, type ContainerCodec, type FormatsBinding, type SheetFormatsBinding } from "../../web/src/platform/container";
import { APP_VERSION, messageOf } from "../../web/src/platform/controller";
import { convertFailureMessage, OfficeConvertError } from "../../web/src/platform/office-import";
import { loadPdfLib } from "../../web/src/platform/pdf-load";
import type { Point } from "../../web/src/platform/files";
import { nodeBoardPorts } from "./board-node";
import { asCliError, CliError, type CliIO } from "./contract";
import { nowOf, readBytes, writeAtomic } from "./disk";
import { checkNotSource, exportFragment, exportWhole, isBoardOut, isPdfOut } from "./exporter";
import { cliFragments, type CliPage } from "./fragment-view";
import { extOf, formatOf } from "./formats";
import { atOf, importInto, nodeDecode, partialMessage } from "./importer";
import { checkOffice, convertOfficeFile, isOfficeDoc, NO_SOFFICE, unavailableMessage } from "./office-node";
import { needString, optString, parseOp, type CliOpName, type RefContext } from "./ops";
import { nodePdfEngine, nodePdfWriter } from "./pdf-node";
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
  /** cli-lot3 (D44) : pdf-lib résolu depuis `apps/web` ; `TestableIO.pdfLib` le remplace dans les tests. */
  loadPdfLib(): Promise<PdfLib>;
  /** cli-lot3 (D32) : pdf.js en processus, sans rendu (`nodePdfEngine`). */
  readonly pdf: PdfEngine;
  /** cli-lot3 (D38) : écrivain krilla en processus (`nodePdfWriter`) ; panique → `interrupted` (D29). */
  readonly pdfWriter: PdfWriter;
  /** cli-lot4 (D55, D56) : variables du processus (`ROOMBOARD_OFFICE`, `XDG_CACHE_HOME`) ; absent : `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>>;
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
  /** PDF ouvert par l'importeur (`openPdf`, `openOffice` : `original` gardé, D57) en onglet sans fichier : false si
   *  refusé, l'avis est dans `notices`. */
  openPdf(file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }): Promise<boolean>;
  save(tab: CliTab, to?: string | null): Promise<string>;
  /** Retient un fichier lu par la session hors onglet (source d'import) : une sortie ne le remplace pas. */
  noteSource(path: string): void;
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
  /** Fichiers lus par la session : une sortie d'export ne les remplace pas (`checkNotSource`). */
  const sources = new Set<string>();
  const writable = (): void => {
    if (deps.interrupted()) throw new CliError("command", INTERRUPTED_MESSAGE);
  };
  async function put(path: string, bytes: Uint8Array): Promise<void> {
    writable();
    await writeAtomic(path, bytes);
    written.add(path);
  }
  /** Écriture d'une sortie (export) : refusée si elle vise un fichier source de la session. */
  async function write(path: string, bytes: Uint8Array): Promise<void> {
    for (const source of sources) await checkNotSource(source, path);
    await put(path, bytes);
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

  /** Ouvre un document ; échec : message complet du produit en CliError format ; avis du lecteur poussés dans les
   *  notices, avant l'ajout de l'onglet (D4, D31). */
  async function noticed(open: () => Promise<OpenedDocument>): Promise<OpenedDocument> {
    let read: OpenedDocument;
    try {
      read = await open();
    } catch (e) {
      throw new CliError("format", messageOf(e));
    }
    deps.notices.push(...read.notices);
    return read;
  }

  /** Lit un tableau (`openBoardDocument`) ; échec : « Ouverture impossible (nom) : … ». */
  const readBoardNoticed = (name: string, blob: Blob, format: BoardSourceFormat): Promise<OpenedDocument> =>
    noticed(() => openBoardDocument({ name, blob, format }, { core: deps.core, ports: deps.board, makeAssets: () => createAssetStore(), decode: nodeDecode, now: () => deps.now(), appVersion: APP_VERSION }));

  /** Lit un PDF (D35, D40) ; avis d'ouverture (500 pages) dans les notices (D31). */
  const readPdfNoticed = (name: string, blob: Blob, original?: Blob): Promise<OpenedDocument> =>
    noticed(() => openPdfDocument({ name, blob, ...(original === undefined ? {} : { original }) }, { core: deps.core, pdf: deps.pdf, makeAssets: () => createAssetStore() }));

  async function readDoc(path: string, kind: ReadKind): Promise<Pick<ReadResult, "doc" | "assets">> {
    const bytes = await readBytes(path);
    sources.add(path);
    if (kind === "document" && isOfficeDoc(path)) {
      // D56, D59 : le fichier est lu d'abord (absent : `io`, code 1), le convertisseur contrôlé ensuite (code 3).
      const name = basename(path);
      const env = deps.env;
      await checkOffice([path], env);
      let pdf: Blob;
      try {
        pdf = await convertOfficeFile(path, env);
      } catch (e) {
        const code = e instanceof OfficeConvertError ? e.code : "failed";
        if (code === "no-program") throw new CliError("unsupported", unavailableMessage(name, NO_SOFFICE)); // course après --check
        throw new CliError("format", convertFailureMessage(name, code));
      }
      const read = await readPdfNoticed(name, pdf, new Blob([bytes as BlobPart]));
      return { doc: read.doc, assets: read.assets };
    }
    if (kind === "document" && isPdfOut(path)) {
      const read = await readPdfNoticed(basename(path), new Blob([bytes as BlobPart]));
      return { doc: read.doc, assets: read.assets };
    }
    const format = kind === "document" ? boardFormatOf(path) : null;
    if (format !== null) {
      const read = await readBoardNoticed(basename(path), new Blob([bytes as BlobPart]), format);
      return { doc: read.doc, assets: read.assets };
    }
    const before = deps.notices.length;
    const read = await deps.io.read(basename(path), bytes, kind, path);
    if (read === null) throw new CliError("format", deps.notices.slice(before).join(" ; ") || `ouverture impossible : ${path}`);
    return read;
  }
  async function open(path: string): Promise<TabEntry<CliTab>> {
    if (tabs.full()) throw new CliError("command", TOO_MANY_TABS);
    const read = await readDoc(path, "document");
    // D22, D40, D59 : un tableau, un PDF ou un Office ouvert est un onglet sans fichier (comme `target: null` de la page) :
    // jamais réécrit à son chemin.
    return add({ doc: read.doc, assets: read.assets, file: boardFormatOf(path) === null && !isPdfOut(path) && !isOfficeDoc(path) ? path : null });
  }
  /**
   * D22, D40 : fichier lu par l'importeur (`read`, lancé après le contrôle du nombre d'onglets) en onglet sans fichier ;
   * false si refusé, l'avis est dans `notices`.
   */
  async function openReadTab(name: string, read: () => Promise<Pick<ReadResult, "doc" | "assets">>): Promise<boolean> {
    if (tabs.full()) {
      deps.notices.push(openFailedMessage(name, TOO_MANY_TABS));
      return false;
    }
    let r: Pick<ReadResult, "doc" | "assets">;
    try {
      r = await read();
    } catch (e) {
      deps.notices.push(messageOf(e)); // déjà le message complet du produit (« Ouverture impossible (nom) : … »)
      return false;
    }
    try {
      add({ doc: r.doc, assets: r.assets, file: null });
      return true;
    } catch (e) {
      deps.notices.push(openFailedMessage(name, e));
      return false;
    }
  }
  const openBoard = (file: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }): Promise<boolean> =>
    openReadTab(file.name, () => readBoardNoticed(file.name, file.blob, file.format));
  const openPdf = (file: { readonly name: string; readonly blob: Blob; readonly original?: Blob }): Promise<boolean> =>
    openReadTab(file.name, () => readPdfNoticed(file.name, file.blob, file.original));
  async function openBytes(name: string, bytes: Uint8Array, path: string | null): Promise<TabEntry<CliTab> | null> {
    if (tabs.full()) {
      deps.notices.push(openFailedMessage(name, TOO_MANY_TABS));
      return null;
    }
    if (path !== null) sources.add(path);
    const read = await deps.io.read(name, bytes, "document", path);
    return read === null ? null : add({ doc: read.doc, assets: read.assets, file: path });
  }
  async function save(tab: CliTab, to: string | null = null): Promise<string> {
    const path = to ?? tab.file;
    if (path === null) throw new CliError("usage", "enregistrer : aucun chemin (champ « to » ou option --out)");
    documentTarget(path); // l'usage avant l'interruption : x.iwb rend 2, jamais 1
    // Un chemin qui désigne un fichier source autre qu'un .roomboard (lien symbolique) ne le remplace pas ; un
    // .roomboard ouvert garde le droit de s'enregistrer à son propre chemin.
    for (const source of sources) if (extOf(source) !== ".roomboard") await checkNotSource(source, path);
    writable();
    let bytes: Uint8Array;
    try {
      bytes = await deps.io.encode(tab.doc, tab.assets, deps.now(), APP_VERSION, { kind: "document" });
    } catch (e) {
      throw asCliError(e, "command");
    }
    await put(path, bytes);
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
        const to = needString(args, "to");
        if (isBoardOut(to) || isPdfOut(to)) {
          for (const k of ["ids", "page", "grid", "name"]) {
            if (args[k] !== undefined) throw new CliError("usage", `export ${extOf(to)} : document entier, « ${k} » ne s'y applique pas`);
          }
          return { ...(await exportWhole(session, to)) };
        }
        const ids = args["ids"];
        if (ids !== undefined && (!Array.isArray(ids) || !ids.every((i) => typeof i === "string"))) throw new CliError("usage", "ids : liste d'ids attendue");
        const grid = args["grid"];
        if (grid !== undefined && typeof grid !== "boolean") throw new CliError("usage", "grid : booléen attendu");
        return { ...(await exportFragment(session, { to, page: optString(args, "page"), ids: ids as string[] | undefined, name: optString(args, "name"), grid: grid === true })) };
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
    openPdf,
    save,
    noteSource: (path) => void sources.add(path),
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

export interface TestableIO extends CliIO {
  /** Test seulement : module des formats des tableaux, à la place du vrai (câblage de D29). */
  readonly formats?: () => Promise<FormatsBinding>;
  /** Test seulement : pdf-lib à la place du vrai (PDF d'origine refusé, D39). */
  readonly pdfLib?: () => Promise<PdfLib>;
}
/** Session branchée sur les vrais modules : cœur, conteneur (module formats chargé au premier besoin), date du manifeste. */
export async function nodeSession(io: TestableIO): Promise<Session> {
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
  const onPanic = (): void => {
    interrupted = true;
  };
  return createSession({
    core,
    io: containerIO,
    codec,
    notices,
    formats,
    now,
    fragments: cliFragments({ io: containerIO, core, now, notices }),
    board: nodeBoardPorts(io.formats ?? formats, onPanic),
    loadPdfLib: io.pdfLib ?? loadPdfLib,
    pdf: nodePdfEngine(),
    pdfWriter: nodePdfWriter(io.formats ?? formats, onPanic),
    interrupted: () => interrupted,
    env: io.env,
  });
}
