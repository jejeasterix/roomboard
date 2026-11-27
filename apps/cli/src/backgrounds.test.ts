import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, expect, it, vi } from "vitest";
import { backgroundCommand, resolvePack, type PackFiles } from "../../web/src/app/backgrounds-apply";
import { loadPack } from "../../web/src/backgrounds/catalog";
import { MAX_PIXELS, TOO_MANY_PIXELS } from "../../web/src/platform/image-import";
import { diskPackFiles, listBackgrounds, packDir } from "./backgrounds";
import { main } from "./main";
import { nodeSession } from "./session";
import { describeWasm, memoryIO, pngBytes, warmModules, WEB_SRC, type Json } from "./testing";

// Chemin commun (Q32) : la CLI doit appeler `resolvePack` et `backgroundCommand` du web ; espions sur les originaux.
vi.mock("../../web/src/app/backgrounds-apply", async (importOriginal) => {
  const m = await importOriginal<typeof import("../../web/src/app/backgrounds-apply")>();
  return { ...m, resolvePack: vi.fn(m.resolvePack), backgroundCommand: vi.fn(m.backgroundCommand) };
});

const dir = mkdtempSync(join(tmpdir(), "roomboard-cli-fonds-"));
const noFiles: PackFiles = {
  read: async (file) => {
    throw new Error(`lecture inattendue : ${file}`);
  },
};
const two = async () => {
  const s = await nodeSession(memoryIO());
  s.newTab();
  await s.exec('{"type":"AddPage","after":"$page:0"}');
  return s;
};
const looks = (st: Json): Json => ({
  pages: st.pages.map((p: Json) => ({ background: p.page.background, grid: p.page.grid, backdrop: p.page.backdrop })),
  assets: st.assets,
});

it("listBackgrounds : recherche « seyes » : seyes-8mm en tête ; section lines : 54 fonds", async () => {
  expect((await listBackgrounds({ search: "seyes" }))[0]).toEqual({ id: "seyes-8mm", section: "lines", theme: "seyes", label: "Seyès 8 mm", kind: "grid" });
  const lines = await listBackgrounds({ section: "lines" });
  expect(lines).toHaveLength(54);
  expect(lines.every((l) => l.section === "lines")).toBe(true);
});
it("listBackgrounds : section inconnue (ou « mine ») : usage", async () => {
  for (const section of ["bidule", "mine"]) await expect(listBackgrounds({ section })).rejects.toMatchObject({ code: "usage" });
});
it("packDir : ROOMBOARD_BACKGROUNDS d'abord, sinon apps/web/public/backgrounds/ à côté des modules", () => {
  expect(packDir({ ROOMBOARD_BACKGROUNDS: dir }, WEB_SRC).href).toBe(pathToFileURL(`${dir}/`).href);
  const own = packDir({}, WEB_SRC);
  expect(own.href.endsWith("/apps/web/public/backgrounds/")).toBe(true);
  expect(existsSync(fileURLToPath(own))).toBe(true);
});
it("diskPackFiles : octets du fichier du pack ; fichier absent : command « fond introuvable : … »", async () => {
  writeFileSync(join(dir, "essai.webp"), new Uint8Array([1, 2, 3]));
  const files = diskPackFiles(pathToFileURL(`${dir}/`));
  expect(new Uint8Array(await (await files.read("essai.webp")).arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  await expect(files.read("absent.webp")).rejects.toMatchObject({ code: "command", message: "fond introuvable : absent.webp" });
});

describeWasm("personnalisation-1b : CLI des fonds (Q32, S4)", () => {
  beforeAll(warmModules);
  it("parité avec l'interface (patron écarté) : resolvePack puis backgroundCommand du web, même état, une étape", async () => {
    const venn = (await loadPack()).find((b) => b.id === "venn");
    expect(venn).toBeDefined();
    const s = await two();
    vi.mocked(resolvePack).mockClear();
    vi.mocked(backgroundCommand).mockClear();
    await s.exec('{"op":"background","id":"venn","pages":"all"}');
    const tab = s.tabs.active()!.session;
    expect(vi.mocked(resolvePack)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(resolvePack).mock.calls[0]![0]).toEqual(venn);
    expect(vi.mocked(backgroundCommand)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(backgroundCommand).mock.calls[0]![2]).toEqual(tab.doc.pageIds());
    // Onglet jumeau : la commande du web jouée telle quelle ; la CLI doit donner le même aspect et le même magasin.
    const t = await two();
    const twin = t.tabs.active()!.session;
    twin.doc.apply(await backgroundCommand(twin.assets, await resolvePack(venn!, noFiles), twin.doc.pageIds()));
    const cli: Json = await s.exec('{"op":"state"}');
    const web: Json = await t.exec('{"op":"state"}');
    expect(looks(cli.state)).toEqual(looks(web.state));
    // Une seule étape d'annulation pour les deux pages (pas de pose page par page).
    await s.exec('{"op":"undo"}');
    const back: Json = await s.exec('{"op":"state"}');
    expect(back.state.pages.map((p: Json) => p.page.backdrop)).toEqual([null, null]);
  });
  it("roomboard backgrounds --search seyes : une ligne JSON par fond, code 0 ; argument en trop, section inconnue : code 2", async () => {
    const io = memoryIO();
    expect(await main(["backgrounds", "--search", "seyes"], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ id: "seyes-8mm" });
    expect(await main(["backgrounds", "trop"], memoryIO())).toBe(2);
    expect(await main(["backgrounds", "--section", "bidule"], memoryIO())).toBe(2);
  });
  it("background id + pages all : grille seyes sur chaque page, une étape", async () => {
    const s = await two();
    await s.exec('{"op":"background","id":"seyes-8mm","pages":"all"}');
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages.map((p: Json) => p.page.grid?.levels[0]?.kind)).toEqual(["seyes", "seyes"]);
    await s.exec('{"op":"undo"}');
    const back: Json = await s.exec('{"op":"state"}');
    expect(back.state.pages.map((p: Json) => p.page.grid)).toEqual([null, null]);
  });
  it("background id ardoise + page $page:1 : seule la deuxième page ; sans page : la première", async () => {
    const s = await two();
    await s.exec('{"op":"background","id":"ardoise","page":"$page:1"}');
    let st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages.map((p: Json) => p.page.background)).toEqual(["#ffffff", "#2f3e46"]);
    await s.exec('{"op":"background","id":"creme"}');
    st = await s.exec('{"op":"state"}');
    expect(st.state.pages.map((p: Json) => p.page.background)).toEqual(["#fbf7ec", "#2f3e46"]);
  });
  it("background SVG (venn) : fond image/svg+xml cité, un seul asset sur deux pages", async () => {
    const s = await two();
    await s.exec('{"op":"background","id":"venn","pages":"all"}');
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages.map((p: Json) => p.page.backdrop?.kind)).toEqual(["image", "image"]);
    expect(st.state.assets.filter((a: Json) => a.mime === "image/svg+xml")).toHaveLength(1);
  });
  it("page et pages ensemble, id et file ensemble, ni l'un ni l'autre, pages autre que all : usage", async () => {
    const s = await two();
    for (const op of ['{"op":"background","id":"ardoise","page":"$page:0","pages":"all"}', '{"op":"background","id":"ardoise","file":"x.png"}', '{"op":"background"}', '{"op":"background","id":"ardoise","pages":"deux"}']) {
      await expect(s.exec(op), op).rejects.toMatchObject({ code: "usage" });
    }
  });
  it("id inconnu, page inconnue : command (code 1) ; file non image : unsupported (code 3)", async () => {
    const s = await two();
    await expect(s.exec('{"op":"background","id":"bidule"}')).rejects.toMatchObject({ code: "command", message: "fond inconnu : bidule" });
    await expect(s.exec('{"op":"background","id":"ardoise","page":"nulle-part"}')).rejects.toMatchObject({ code: "command" });
    const txt = join(dir, "notes.txt");
    writeFileSync(txt, "bonjour");
    await expect(s.exec(JSON.stringify({ op: "background", file: txt }))).rejects.toMatchObject({ code: "unsupported" });
  });
  it("file PNG : fond image de la page (blanc, comme « Mes fonds »), taille lue dans l'en-tête ; trop de pixels : command", async () => {
    const s = await two();
    const f = join(dir, "fond.png");
    writeFileSync(f, pngBytes(640, 360));
    await s.exec(JSON.stringify({ op: "background", file: f }));
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages[0].page.backdrop).toMatchObject({ kind: "image", w: 640, h: 360 });
    expect(st.state.pages[0].page.background).toBe("#ffffff");
    expect(st.state.pages[1].page.backdrop).toBeNull();
    expect(st.state.assets.filter((a: Json) => a.mime === "image/png")).toHaveLength(1);
    const side = Math.ceil(Math.sqrt(MAX_PIXELS)) + 1;
    const big = join(dir, "immense.png");
    writeFileSync(big, pngBytes(side, side));
    await expect(s.exec(JSON.stringify({ op: "background", file: big }))).rejects.toMatchObject({ code: "command", message: TOO_MANY_PIXELS });
  });
  it("commande brute ApplyBackground acceptée par run (COMMAND_TYPES, T1)", async () => {
    const s = await two();
    await s.exec('{"type":"ApplyBackground","pages":["$page:0","$page:1"],"color":"#2f3e46","backdrop":null,"grid":null}');
    const st: Json = await s.exec('{"op":"state"}');
    expect(st.state.pages.map((p: Json) => p.page.background)).toEqual(["#2f3e46", "#2f3e46"]);
  });
});
