/**
 * Paquet de ressources `.rbpack` (C4, D17, D18, DA2) : ZIP stocké (écrit par `zip-worker.ts`), `manifest.json`
 * `{format: "roomboard", formatVersion: 1, kind: "pack", name, appVersion, created, items}`, puis `items/<chemin>.rbitem`
 * et `items/<chemin>.rbitem.png`, triés. TS pur, jamais lu par le cœur ni par `formats` (D4). Un `.rbitem` du paquet
 * est relu par `ContainerIO` à l'insertion, pas ici. Aucun chemin n'est normalisé ni filtré en silence : une entrée hors
 * de la forme refuse tout le paquet, et le contenu des chemins est contrôlé par `safeLibraryPath` à l'import (D32).
 */
import { unknownKindMessage } from "../core/api";
import { ZIP_MAX_BYTES, ZIP_MAX_ENTRIES, ZIP_TOO_BIG_MESSAGE } from "./model3d-import";
import type { ZipFile } from "./zip-read";

export type PackItemKind = "fragment" | "grid";
export interface PackItem {
  readonly path: string;
  readonly name: string;
  readonly keywords: readonly string[];
  readonly description: string;
  readonly kind: PackItemKind;
  readonly bytes: Uint8Array;
  readonly thumbnail: Uint8Array | null;
}
export type { ZipFile };
interface ManifestItem {
  readonly path: string;
  readonly name: string;
  readonly keywords: readonly string[];
  readonly description: string;
  readonly kind: PackItemKind;
  readonly thumbnail: string | null;
}

export const PACK_MANIFEST = "manifest.json";
const PACK_FORMAT_VERSION = 1;
export const PACK_NOT_ROOMBOARD_MESSAGE = "ce fichier n'est pas un paquet RoomBoard";
export const PACK_DAMAGED_MESSAGE = "paquet RoomBoard endommagé : manifeste incomplet";
export const PACK_NEWER_MESSAGE = "paquet d'une version plus récente de RoomBoard";
export const PACK_UNSAFE_PATH_MESSAGE = "paquet refusé : chemin d'entrée non sûr";
export const packMissingMessage = (path: string): string => `paquet incomplet : ${path} absent`;

const ITEM_RE = /^items\/(.+)\.rbitem$/;
/** Entrées lues d'un ZIP de paquet (`zip-worker.ts`) : le manifeste, `items/<chemin>.rbitem` et sa vignette `.png`. */
export const isPackEntry = (name: string): boolean => name === PACK_MANIFEST || ITEM_RE.test(name.endsWith(".png") ? name.slice(0, -4) : name);
/** Forme d'une entrée (D18, D32) : `items/<chemin>.rbitem`. Les `..`, `\`, `:` et segments cachés de `<chemin>` sont
 *  refusés par `safeLibraryPath` avant la première écriture de l'import (`app/library.ts`) : aucun second normaliseur. */
function safeEntry(p: unknown): p is string {
  return typeof p === "string" && ITEM_RE.test(p);
}
const byPath = (a: { readonly path: string }, b: { readonly path: string }): number => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

export function buildPack(name: string, items: readonly PackItem[], meta: { readonly appVersion: string; readonly now: string }): ZipFile[] {
  const sortedItems = [...items].sort(byPath);
  const entries: ManifestItem[] = sortedItems.map((i) => ({
    path: `items/${i.path}.rbitem`,
    name: i.name,
    keywords: [...i.keywords],
    description: i.description,
    kind: i.kind,
    thumbnail: i.thumbnail === null ? null : `items/${i.path}.rbitem.png`,
  }));
  // `schema` et `modified` (D26) : un `.rbpack` ouvert par le cœur passe `check_manifest` jusqu'au `kind` et reçoit le message du paquet.
  const manifest = {
    format: "roomboard",
    formatVersion: PACK_FORMAT_VERSION,
    schema: 1,
    kind: "pack",
    name,
    appVersion: meta.appVersion,
    created: meta.now,
    modified: meta.now,
    items: entries,
  };
  const files: ZipFile[] = [];
  for (const i of sortedItems) {
    files.push({ path: `items/${i.path}.rbitem`, bytes: i.bytes });
    if (i.thumbnail !== null) files.push({ path: `items/${i.path}.rbitem.png`, bytes: i.thumbnail });
  }
  return [{ path: PACK_MANIFEST, bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) }, ...files.sort(byPath)];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : []);

export function readPack(files: readonly ZipFile[]): { readonly name: string; readonly items: readonly PackItem[] } {
  if (files.length > ZIP_MAX_ENTRIES || files.reduce((n, f) => n + f.bytes.length, 0) > ZIP_MAX_BYTES) throw new Error(ZIP_TOO_BIG_MESSAGE);
  const raw = files.find((f) => f.path === PACK_MANIFEST);
  if (raw === undefined) throw new Error(PACK_NOT_ROOMBOARD_MESSAGE);
  let m: unknown;
  try {
    m = JSON.parse(new TextDecoder().decode(raw.bytes));
  } catch {
    throw new Error(PACK_NOT_ROOMBOARD_MESSAGE);
  }
  if (!isRecord(m) || m["format"] !== "roomboard") throw new Error(PACK_NOT_ROOMBOARD_MESSAGE);
  if (typeof m["formatVersion"] !== "number") throw new Error(PACK_DAMAGED_MESSAGE);
  if (m["formatVersion"] > PACK_FORMAT_VERSION) throw new Error(PACK_NEWER_MESSAGE);
  // 64 caractères (points de code), comme le cœur (`chars().take(64)`).
  if (m["kind"] !== "pack") throw new Error(unknownKindMessage(Array.from(String(m["kind"] ?? "document")).slice(0, 64).join("")));
  if (!Array.isArray(m["items"])) throw new Error(PACK_DAMAGED_MESSAGE);
  const byName = new Map(files.map((f) => [f.path, f.bytes]));
  const items = (m["items"] as unknown[]).map((e): PackItem => {
    const x = isRecord(e) ? e : {};
    const path = x["path"];
    if (!safeEntry(path)) throw new Error(PACK_UNSAFE_PATH_MESSAGE);
    const thumb = x["thumbnail"];
    if (thumb !== null && thumb !== undefined && thumb !== `${path}.png`) throw new Error(PACK_UNSAFE_PATH_MESSAGE);
    const bytes = byName.get(path);
    if (bytes === undefined) throw new Error(packMissingMessage(path));
    const thumbnail = typeof thumb === "string" ? (byName.get(thumb) ?? null) : null;
    if (typeof thumb === "string" && thumbnail === null) throw new Error(packMissingMessage(thumb));
    const rel = ITEM_RE.exec(path)![1]!;
    return {
      path: rel,
      name: typeof x["name"] === "string" && x["name"] !== "" ? x["name"] : rel.split("/").pop()!,
      keywords: strings(x["keywords"]),
      description: typeof x["description"] === "string" ? x["description"] : "",
      kind: x["kind"] === "grid" ? "grid" : "fragment",
      bytes,
      thumbnail,
    };
  });
  return { name: typeof m["name"] === "string" && m["name"] !== "" ? m["name"] : "Paquet", items };
}
