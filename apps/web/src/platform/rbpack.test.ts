import { describe, expect, it } from "vitest";
import { unknownKindMessage } from "../core/api";
import { ZIP_MAX_BYTES, ZIP_MAX_ENTRIES, ZIP_TOO_BIG_MESSAGE } from "./model3d-import";
import { buildPack, PACK_MANIFEST, PACK_NEWER_MESSAGE, PACK_NOT_ROOMBOARD_MESSAGE, PACK_UNSAFE_PATH_MESSAGE, packMissingMessage, readPack, type PackItem, type ZipFile } from "./rbpack";

const enc = (s: string) => new TextEncoder().encode(s);
const item = (path: string, over: Partial<PackItem> = {}): PackItem => ({
  path, name: path.split("/").pop()!, keywords: ["fraction"], description: "", kind: "fragment", bytes: enc(`rb:${path}`), thumbnail: enc(`png:${path}`), ...over,
});
const manifestOf = (files: readonly ZipFile[]) => JSON.parse(new TextDecoder().decode(files.find((f) => f.path === "manifest.json")!.bytes));
const withManifest = (files: readonly ZipFile[], patch: Record<string, unknown>): ZipFile[] =>
  files.map((f) => (f.path === "manifest.json" ? { path: f.path, bytes: enc(JSON.stringify({ ...manifestOf(files), ...patch })) } : f));

describe("C4 : paquet .rbpack", () => {
  it("C4 : buildPack trie les entrées, manifeste d'abord", () => {
    const files = buildPack("Fractions", [item("Seyès", { kind: "grid", thumbnail: null }), item("Moitié")], { appVersion: "c4", now: "2026-11-21T08:00:00Z" });
    expect(files.map((f) => f.path)).toEqual(["manifest.json", "items/Moitié.rbitem", "items/Moitié.rbitem.png", "items/Seyès.rbitem"]);
    expect(manifestOf(files)).toEqual({
      format: "roomboard", formatVersion: 1, schema: 1, kind: "pack", name: "Fractions", appVersion: "c4", created: "2026-11-21T08:00:00Z", modified: "2026-11-21T08:00:00Z",
      items: [
        { path: "items/Moitié.rbitem", name: "Moitié", keywords: ["fraction"], description: "", kind: "fragment", thumbnail: "items/Moitié.rbitem.png" },
        { path: "items/Seyès.rbitem", name: "Seyès", keywords: ["fraction"], description: "", kind: "grid", thumbnail: null },
      ],
    });
  });

  it("C4 : readPack(buildPack) rend les mêmes ressources", () => {
    const items = [item("Moitié"), item("sous/Tiers", { keywords: [], description: "un tiers" })];
    const back = readPack(buildPack("Fractions", items, { appVersion: "c4", now: "n" }));
    expect(back.name).toBe("Fractions");
    expect(back.items).toEqual(items);
  });

  it("C4 : readPack refuse un kind autre que pack (message de UnknownKind)", () => {
    const files = withManifest(buildPack("F", [item("a")], { appVersion: "c4", now: "n" }), { kind: "autre" });
    expect(() => readPack(files)).toThrow(unknownKindMessage("autre"));
  });

  it("C4 : readPack refuse une version plus récente", () => {
    expect(() => readPack(withManifest(buildPack("F", [], { appVersion: "c4", now: "n" }), { formatVersion: 2 }))).toThrow(PACK_NEWER_MESSAGE);
  });

  it("C4 : readPack refuse un chemin hors de la forme items/….rbitem (le reste : safeLibraryPath à l'import, T8)", () => {
    for (const p of ["../x.rbitem", "/items/x.rbitem", "autre/x.rbitem", "items/x.txt", "items/.rbitem"]) {
      const files = withManifest(buildPack("F", [item("x")], { appVersion: "c4", now: "n" }), {
        items: [{ path: p, name: "x", keywords: [], description: "", kind: "fragment", thumbnail: null }],
      });
      expect(() => readPack(files), p).toThrow(PACK_UNSAFE_PATH_MESSAGE);
    }
  });

  it("C4 : readPack refuse une entrée du manifeste absente du ZIP", () => {
    const files = buildPack("F", [item("x")], { appVersion: "c4", now: "n" }).filter((f) => f.path !== "items/x.rbitem");
    expect(() => readPack(files)).toThrow(packMissingMessage("items/x.rbitem"));
  });

  it("C4 : readPack sans manifeste, format autre ou JSON illisible : pas un paquet", () => {
    expect(() => readPack([])).toThrow(PACK_NOT_ROOMBOARD_MESSAGE);
    expect(() => readPack([{ path: "manifest.json", bytes: enc("{") }])).toThrow(PACK_NOT_ROOMBOARD_MESSAGE);
    expect(() => readPack(withManifest(buildPack("F", [], { appVersion: "c4", now: "n" }), { format: "autre" }))).toThrow(PACK_NOT_ROOMBOARD_MESSAGE);
  });

  // Patron écarté (lecture 3D, `zip-worker.ts:34,50`) : filtrer en silence et normaliser. Un paquet n'est jamais lu en
  // partie, et ses chemins arrivent tels quels au contrôle de l'import (`safeLibraryPath`, T8).
  it("C4 : un chemin non sûr parmi des chemins sûrs refuse tout le paquet, rien n'est lu en partie", () => {
    const files = buildPack("F", [item("bon"), item("x")], { appVersion: "c4", now: "n" });
    const listed = manifestOf(files).items as Array<Record<string, unknown>>;
    const hostile = withManifest(files, { items: [listed[0], { ...listed[1], path: "../x.rbitem", thumbnail: null }] });
    expect(() => readPack(hostile)).toThrow(PACK_UNSAFE_PATH_MESSAGE);
  });

  it("C4 : readPack ne normalise aucun chemin (a/../b reste a/../b pour safeLibraryPath, T8)", () => {
    const back = readPack(buildPack("F", [item("a/../b"), item("ok")], { appVersion: "c4", now: "n" }));
    expect(back.items.map((i) => i.path)).toEqual(["a/../b", "ok"]);
  });

  it("C4 : le kind inconnu est coupé à 64 caractères, pas à 64 unités UTF-16 (comme le cœur)", () => {
    const kind = "😀".repeat(70);
    const files = withManifest(buildPack("F", [], { appVersion: "c4", now: "n" }), { kind });
    expect(() => readPack(files)).toThrow(unknownKindMessage("😀".repeat(64)));
  });

  it("C4 : formatVersion absent ou non numérique : paquet endommagé, pas « version plus récente »", () => {
    for (const v of [undefined, "1", "2", null]) {
      const base = buildPack("F", [], { appVersion: "c4", now: "n" });
      const files = base.map((f) => (f.path === PACK_MANIFEST ? { path: f.path, bytes: enc(JSON.stringify({ ...manifestOf(base), formatVersion: v })) } : f));
      expect(() => readPack(files), String(v)).toThrow(/endommagé/);
    }
  });

  it("C4 : items qui n'est pas un tableau : paquet refusé (jamais un paquet vide en silence)", () => {
    for (const items of ["x", {}, null, 3]) {
      expect(() => readPack(withManifest(buildPack("F", [], { appVersion: "c4", now: "n" }), { items })), JSON.stringify(items)).toThrow(/endommagé/);
    }
  });

  it("C4 : bornes de lecture : trop d'entrées ou trop d'octets refusés avant tout le reste", () => {
    const many = Array.from({ length: ZIP_MAX_ENTRIES + 1 }, (_, i): ZipFile => ({ path: `x${i}`, bytes: new Uint8Array() }));
    expect(() => readPack(many)).toThrow(ZIP_TOO_BIG_MESSAGE);
    const big = { path: "x", bytes: { length: ZIP_MAX_BYTES + 1 } as unknown as Uint8Array };
    expect(() => readPack([big])).toThrow(ZIP_TOO_BIG_MESSAGE);
    const ok = buildPack("F", [item("a")], { appVersion: "c4", now: "n" });
    expect(readPack(ok).items).toHaveLength(1);
  });

  it("C4 : vignette : seul `<chemin>.png` est admis, et elle doit exister dans le ZIP", () => {
    const base = buildPack("F", [item("x")], { appVersion: "c4", now: "n" });
    const listed = manifestOf(base).items as Array<Record<string, unknown>>;
    const withThumb = (thumbnail: unknown, files: readonly ZipFile[] = base) => withManifest(files, { items: [{ ...listed[0], thumbnail }] });
    expect(() => readPack(withThumb("items/autre.png"))).toThrow(PACK_UNSAFE_PATH_MESSAGE);
    expect(() => readPack(withThumb("../x.rbitem.png"))).toThrow(PACK_UNSAFE_PATH_MESSAGE);
    expect(() => readPack(withThumb("items/x.rbitem.png", base.filter((f) => f.path !== "items/x.rbitem.png")))).toThrow(packMissingMessage("items/x.rbitem.png"));
    expect(readPack(withThumb(null)).items[0]!.thumbnail).toBeNull();
    expect(readPack(withThumb("items/x.rbitem.png")).items[0]!.thumbnail).toEqual(enc("png:x"));
  });
});
