/** Tableaux blancs sans onglet (cadrage cli-lot2, DA8, D21) : lecture d'un .iwb .ubz .notebook .olf .flipchart en document, écriture d'un .iwb .ubz, ports branchés sur les Workers ; code déplacé de workspace.ts (openBoard, exportBoard) et de main.ts. La page et la CLI passent par ici. Constats suivis, non corrigés : workspace.ts:552 (BoardSources), board-files.ts:89 (flipchartSources). */
import { PDF_MAX_PAGES, type CoreDocument, type CoreFactory } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { BAMBOO_NOT_FLIPCHART, hasBambooMagic } from "../platform/bamboo";
import type { BoardCodec, BoardPart } from "../platform/board-reader";
import type { ImageDecoder } from "../platform/image-import";
import { hasZipMagic } from "../platform/import";
import type { WorkerLike } from "../platform/one-shot-worker";
import { createOlfReader, createZipReader, createZipWriter } from "../platform/zip-read";
import { boardListOf, buildBoardDocument, decodeBoardList, type BoardFormat, type BoardListPage, type BoardPorts, type BoardSourceFormat } from "./board-io";
import { BOARD_MAX_OBJECTS, BOARD_NO_PAGE_MESSAGE, boardFirstPagesMessage, boardNoContentMessage, boardObjectCount, boardSources, flipchartSources, mergeBoardWarnings, resolveBoardFormat, UBZ_NOT_ZIP_MESSAGE, type BoardSources } from "./board-files";

export interface BoardFile {
  readonly name: string;
  readonly blob: Blob;
  readonly format: BoardSourceFormat;
}
export interface BoardReadDeps {
  readonly core: CoreFactory;
  readonly ports: BoardPorts;
  makeAssets(): AssetStore;
  readonly decode: ImageDecoder;
  now(): string;
  readonly appVersion: string;
}

/** Lève une Error au message du produit (endommagé, trop gros, sans page…). */
export async function readBoardFile(file: BoardFile, deps: BoardReadDeps): Promise<{ doc: CoreDocument; assets: AssetStore; warnings: string[] }> {
  const board = deps.ports;
    const head = new Uint8Array(await file.blob.slice(0, 8).arrayBuffer()); // signature ZIP (4 octets) ou Bamboo (8)
    let src: BoardSources;
    let parts: readonly BoardPart[];
    let total: number;
    if (file.format === "flipchart") {
      // Signature contrôlée ici aussi (le registre l'a vue, un appel direct non) ; le Worker ZIP la contrôle encore.
      if (!hasBambooMagic(head)) throw new Error(BAMBOO_NOT_FLIPCHART);
      const split = flipchartSources(await board.unbamboo(file.blob));
      src = { xml: [], names: [], manifest: null, json: null, media: split.media, total: 1 };
      const structure = await Promise.all(split.structure.map(async (e) => ({ path: e.path, bytes: new Uint8Array(await e.blob.arrayBuffer()) })));
      parts = [await board.readFlipchart(structure)];
      total = 1; // l'avis des 500 premières pages vient du lecteur Rust
    } else if (hasZipMagic(head)) {
      const entries = await board.unzip(file.blob);
      const fmt = resolveBoardFormat(file.format, entries.map((e) => e.path));
      if (fmt === null) throw new Error(boardNoContentMessage(file.format));
      src = boardSources(fmt, entries);
      if (fmt === "olf") {
        const part = await board.readOlf(src.json!); // Worker ZIP : JSON lu hors du fil principal
        parts = [part];
        total = part.total;
      } else {
        const xml = await Promise.all(src.xml.map(async (b) => new Uint8Array(await b.arrayBuffer())));
        const manifest = src.manifest === null ? null : new Uint8Array(await src.manifest.arrayBuffer());
        parts = await board.read(xml, fmt, fmt === "notebook" ? { names: src.names, manifest, max: PDF_MAX_PAGES } : undefined);
        total = src.total;
      }
    } else if (file.format === "iwb") {
      src = { xml: [file.blob], names: ["content.xml"], manifest: null, json: null, media: new Map(), total: 1 };
      parts = await board.read([new Uint8Array(await file.blob.arrayBuffer())], "iwb");
      total = 1;
    } else throw new Error(file.format === "ubz" ? UBZ_NOT_ZIP_MESSAGE : boardNoContentMessage(file.format));
    // D16 : budget d'objets restant passé au décodage, part par part : la borne tient avant le pic de mémoire.
    const pages: BoardListPage[] = [];
    let left = BOARD_MAX_OBJECTS;
    for (const p of parts) {
      const got = decodeBoardList(p.ops, p.texts, left);
      left -= boardObjectCount(got);
      pages.push(...got);
    }

  if (pages.length === 0) throw new Error(BOARD_NO_PAGE_MESSAGE);
  const built = await buildBoardDocument(deps.core, pages, src.media, {
    makeAssets: () => deps.makeAssets(),
    decode: deps.decode,
    now: deps.now(),
    appVersion: deps.appVersion,
  });
  const warnings = [...(total > PDF_MAX_PAGES ? [boardFirstPagesMessage(total)] : []), ...mergeBoardWarnings([parts.flatMap((p) => p.warnings), built.warnings])];
  return { doc: built.doc, assets: built.assets, warnings };
}

export async function writeBoardFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, format: BoardFormat, ports: Pick<BoardPorts, "write" | "zip">): Promise<{ bytes: Uint8Array; warnings: string[] }> {
  const r = await boardListOf(doc, assets, format);
  const xml = await ports.write(r.list, format);
  return { bytes: await ports.zip([...xml, ...r.files]), warnings: r.warnings };
}

export function createBoardPorts(spawn: { readonly zip: () => WorkerLike }, codec: BoardCodec): BoardPorts {
  return {
    unzip: createZipReader(spawn.zip, undefined, "board"),
    unbamboo: createZipReader(spawn.zip, undefined, "bamboo"),
    zip: createZipWriter(spawn.zip),
    read: (files, format, opts) => codec.read(files, format, opts),
    readFlipchart: (entries) => codec.readFlipchart(entries),
    readOlf: createOlfReader(spawn.zip),
    write: (list, format) => codec.write(list, format),
  };
}
