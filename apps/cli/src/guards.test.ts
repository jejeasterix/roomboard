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

describeWasm("D25 — sources du lot 4 (constat 2)", () => {
  it("convert : .webp et .docx : 2 ; .pdf : 3", async () => {
    const dir = tmpDir();
    const out = join(dir, "x.roomboard");
    expect(await main(["convert", join(dir, "photo.webp"), out], memoryIO())).toBe(2);
    expect(await main(["convert", join(dir, "photo.gif"), out], memoryIO())).toBe(2);
    expect(await main(["convert", join(dir, "texte.docx"), out], memoryIO())).toBe(2);
    expect(await main(["convert", join(dir, "doc.pdf"), out], memoryIO())).toBe(3);
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
    expect(io.json().some((l: Json) => Array.isArray(l.notices) && l.notices.join(" ").includes("vidéo"))).toBe(true);
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
