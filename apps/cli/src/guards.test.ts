// Gardes de fin de lot 2 (relecture T11) : sortie ≠ source, tri D25 des sources du lot 4, avis de lecture de `state` et
// `run`, contrôle d'usage avant l'interruption, garde de `exportFragment`, image absente d'un export .rbitem (D19).
import { existsSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { MISSING_EXPORT_MESSAGE } from "../../web/src/app/fragments";
import { exportFragment } from "./exporter";
import { main } from "./main";
import { INTERRUPTED_MESSAGE, nodeSession } from "./session";
import { boardFixtures, describeWasm, memoryIO, tmpDir, type Json } from "./testing";

const bytesOf = (p: string): string => readFileSync(p).toString("base64");

describeWasm("sortie ≠ source (relecture T11, constat 1)", () => {
  it("convert lecon.iwb lecon.iwb, même chemin en casse différente, ou lien : code 2, source intacte", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const before = bytesOf(f.iwb);
    expect(await main(["convert", f.iwb, f.iwb], memoryIO())).toBe(2);
    expect(await main(["convert", f.iwb, join(dir, "LECON.IWB")], memoryIO())).toBe(2);
    const link = join(dir, "lien.iwb");
    symlinkSync(f.iwb, link);
    expect(await main(["convert", f.iwb, link], memoryIO())).toBe(2);
    expect(bytesOf(f.iwb)).toBe(before);
    const doc = join(dir, "a.roomboard");
    expect(await main(["new", doc], memoryIO())).toBe(0);
    const docBefore = bytesOf(doc);
    expect(await main(["convert", doc, doc], memoryIO())).toBe(2);
    expect(bytesOf(doc)).toBe(docBefore);
  });
  it("export lecon.ubz lecon.ubz : code 2, source intacte", async () => {
    const f = boardFixtures(tmpDir());
    const before = bytesOf(f.ubz);
    const io = memoryIO();
    expect(await main(["export", f.ubz, f.ubz], io)).toBe(2);
    expect(io.errors()[0].error.code).toBe("usage");
    expect(bytesOf(f.ubz)).toBe(before);
  });
  it("run lecon.iwb avec l'op export vers lecon.iwb : code 2, source intacte", async () => {
    const f = boardFixtures(tmpDir());
    const before = bytesOf(f.iwb);
    const io = memoryIO([JSON.stringify({ op: "export", to: f.iwb })]);
    expect(await main(["run", f.iwb], io)).toBe(2);
    expect(bytesOf(f.iwb)).toBe(before);
  });
});

describeWasm("D25 — sources du lot 4 (constat 2 ; cli-lot4 D59 : Office lu)", () => {
  it("convert : .webp et .gif : 2 ; .docx et .pdf absents : 1 (lus depuis les lots 3 et 4, fichier lu avant le convertisseur)", async () => {
    const dir = tmpDir();
    const out = join(dir, "x.roomboard");
    expect(await main(["convert", join(dir, "photo.webp"), out], memoryIO())).toBe(2);
    expect(await main(["convert", join(dir, "photo.gif"), out], memoryIO())).toBe(2);
    expect(await main(["convert", join(dir, "texte.docx"), out], memoryIO())).toBe(1);
    expect(await main(["convert", join(dir, "doc.pdf"), out], memoryIO())).toBe(1);
  });
});

describeWasm("export .rbitem d'une image absente du magasin (D19, constat 3)", () => {
  it("code 1, avis MISSING_EXPORT_MESSAGE, rien d'écrit", async () => {
    const out = join(tmpDir(), "x.rbitem");
    const add = { type: "AddImage", page: "$page:0", asset: { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] };
    const io = memoryIO([JSON.stringify(add), JSON.stringify({ op: "export", to: out, ids: ["$1"] })]);
    expect(await main(["run", "--new"], io)).toBe(1);
    expect(io.errors()[0].error.message).toContain(MISSING_EXPORT_MESSAGE);
    expect(existsSync(out)).toBe(false);
  });
});

describeWasm("avis de lecture d'un tableau (constat 4)", () => {
  it("state lecon.iwb : l'avis de la vidéo est imprimé", async () => {
    const f = boardFixtures(tmpDir());
    const io = memoryIO();
    expect(await main(["state", f.iwb], io)).toBe(0);
    expect(io.json()[0].notices.join(" ")).toContain("vidéo");
  });
  it("run lecon.iwb --out : l'avis de la vidéo est imprimé", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const io = memoryIO();
    expect(await main(["run", f.iwb, "--out", join(dir, "l.roomboard")], io)).toBe(0);
    // Place et forme (T13) : une seule ligne, la dernière (`written`), qui porte les avis d'ouverture ; aucune ligne `{"notices"}` seule.
    const lines = io.json();
    expect(lines).toHaveLength(1);
    expect(lines[0].written).toEqual([join(dir, "l.roomboard")]);
    expect(lines[0].notices.join(" ")).toContain("vidéo");
  });
  it("state d'un document sans avis : aucun champ notices", async () => {
    const a = join(tmpDir(), "a.roomboard");
    await main(["new", a], memoryIO());
    const io = memoryIO();
    expect(await main(["state", a], io)).toBe(0);
    expect(io.json()[0]).not.toHaveProperty("notices");
  });
});

describeWasm("save et exportFragment (constats 5 et 6)", () => {
  it("après interruption, save vers x.iwb : usage (le chemin avant l'interruption)", async () => {
    const s = await nodeSession(memoryIO());
    const tab = s.newTab().session;
    s.deps.interrupted = () => true;
    const out = join(tmpDir(), "x.iwb");
    await expect(s.save(tab, out)).rejects.toMatchObject({ code: "usage" });
    await expect(s.save(tab, join(tmpDir(), "x.roomboard"))).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
  it("exportFragment : une sortie qui n'est pas .rbitem est refusée (usage), rien d'écrit", async () => {
    const s = await nodeSession(memoryIO());
    s.newTab();
    const out = join(tmpDir(), "x.iwb");
    await expect(exportFragment(s, { to: out })).rejects.toMatchObject({ code: "usage" });
    expect(existsSync(out)).toBe(false);
  });
});

describeWasm("avis d'ouverture : aucune ligne en plus (T13, constat 1)", () => {
  it("run lecon.iwb : la ligne 0 est le résultat de l'opération 1, avis d'ouverture en tête de notices", async () => {
    const f = boardFixtures(tmpDir());
    const io = memoryIO([JSON.stringify({ op: "tab.list" }), JSON.stringify({ op: "tab.list" })]);
    expect(await main(["run", f.iwb], io)).toBe(0);
    const lines = io.json();
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ op: 1, ok: true });
    expect(lines[0].notices[0]).toContain("vidéo");
    expect(lines[1]).toMatchObject({ op: 2, ok: true });
    expect(lines[1]).not.toHaveProperty("notices");
  });
  it("run lecon.iwb sans opération ni enregistrement : l'avis sort sur la seule ligne qui existe", async () => {
    const f = boardFixtures(tmpDir());
    const io = memoryIO();
    expect(await main(["run", f.iwb], io)).toBe(0);
    expect(io.json()).toHaveLength(1);
    expect(io.json()[0].notices.join(" ")).toContain("vidéo");
  });
  it("apply sur un .roomboard à lien manquant : une seule ligne, parsable, avec l'avis en tête", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const media = { type: "AddMedia", page: "$page:0", asset: { id: "cd".repeat(32), name: "clip.webm", mime: "video/webm", size: 3 }, linked: "videos/clip.webm", mediaType: "video", w: 320, h: 180, duration: 2.5, poster: null, matrix: [1, 0, 0, 1, 0, 0] };
    expect(await main(["run", "--new", "--out", a], memoryIO([JSON.stringify(media)]))).toBe(0);
    const io = memoryIO();
    expect(await main(["apply", a, JSON.stringify({ op: "tab.list" })], io)).toBe(0);
    expect(io.stdout).toHaveLength(1);
    const line = JSON.parse(io.stdout[0]!);
    expect(line).toMatchObject({ op: 1, ok: true });
    expect(line.notices).toHaveLength(1);
  });
});

describeWasm("sources lues par la session (T13, constats 2 et 3)", () => {
  it("run --new : import de lecon.iwb, tab.select t2, export vers lecon.iwb : code 2, source intacte", async () => {
    const f = boardFixtures(tmpDir());
    const before = bytesOf(f.iwb);
    const io = memoryIO([JSON.stringify({ op: "import", files: [f.iwb] }), JSON.stringify({ op: "tab.select", tab: "t2" }), JSON.stringify({ op: "export", to: f.iwb })]);
    expect(await main(["run", "--new"], io)).toBe(2);
    expect(bytesOf(f.iwb)).toBe(before);
  });
  it("run lecon.iwb --out lien.roomboard (lien vers lecon.iwb) : code 2, source intacte", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const before = bytesOf(f.iwb);
    const link = join(dir, "lien.roomboard");
    symlinkSync(f.iwb, link);
    const io = memoryIO();
    expect(await main(["run", f.iwb, "--out", link], io)).toBe(2);
    expect(io.errors()[0].error.code).toBe("usage");
    expect(bytesOf(f.iwb)).toBe(before);
  });
  it("save d'un .roomboard ouvert à son propre chemin : toujours accepté", async () => {
    const a = join(tmpDir(), "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const s = await nodeSession(memoryIO());
    const tab = (await s.open(a)).session;
    await expect(s.save(tab, a)).resolves.toBe(a);
  });
});
