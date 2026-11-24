import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { FormatsBinding } from "../../web/src/platform/container";
import { nodeBoardPorts } from "./board-node";
import { main } from "./main";
import { createSession, INTERRUPTED_MESSAGE, nodeSession } from "./session";
import { boardFixtures, borrowedAfterPanic, describeWasm, memoryIO, pngBytes, stampOf, tmpDir, type Json } from "./testing";

async function stateOf(path: string): Promise<Json> {
  const io = memoryIO();
  expect(await main(["state", path], io)).toBe(0);
  return io.json()[0];
}
async function noticesOf(path: string): Promise<string> {
  const s = await nodeSession(memoryIO());
  await s.open(path);
  return s.deps.notices.join(" ");
}

describeWasm("S2 — lire les cinq tableaux (D22)", () => {
  it("S2 — .iwb ZIP : 1 page, 8 objets, avis de la vidéo non lue ; .iwb XML brut : 3 pages", async () => {
    const f = boardFixtures(tmpDir());
    const st = await stateOf(f.iwb);
    expect(st.pages).toHaveLength(1);
    expect(st.pages[0].elements).toHaveLength(8);
    expect(await noticesOf(f.iwb)).toContain("vidéo");
    expect((await stateOf(f.iwbRaw)).pages).toHaveLength(3);
  });
  it("S2 — .ubz : 4 objets ; .notebook : 2 pages dans l'ordre du manifeste (4 puis 1 objets)", async () => {
    const f = boardFixtures(tmpDir());
    expect((await stateOf(f.ubz)).pages[0].elements).toHaveLength(4);
    const nb = await stateOf(f.notebook);
    expect(nb.pages.map((p: Json) => p.elements.length)).toEqual([4, 1]);
  });
  it("S2 — .olf : 3 objets, fond #ffeecc ; .flipchart : 2 pages, 5 objets en page 1, TIFF et action en avis", async () => {
    const f = boardFixtures(tmpDir());
    const olf = await stateOf(f.olf);
    expect(olf.pages[0].elements).toHaveLength(3);
    expect(olf.pages[0].page.background.toLowerCase()).toBe("#ffeecc");
    const fc = await stateOf(f.flipchart);
    expect(fc.pages).toHaveLength(2);
    expect(fc.pages[0].elements).toHaveLength(5);
    const said = await noticesOf(f.flipchart);
    expect(said).toContain("TIFF");
    expect(said).toContain("action");
  });
  it("S2 — run lecon.iwb --save : code 2, fichier non modifié ; --out x.roomboard : 0", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const before = stampOf(f.iwb);
    expect(await main(["run", f.iwb, "--save"], memoryIO([]))).toBe(2);
    expect(stampOf(f.iwb)).toEqual(before);
    const out = join(dir, "l.roomboard");
    expect(await main(["run", f.iwb, "--out", out], memoryIO([]))).toBe(0);
    expect((await stateOf(out)).pages[0].elements).toHaveLength(8);
  });
  it("import a.roomboard lecon.iwb : ouvert en onglet (opened), a non écrit ; import a.roomboard p.rbpack : code 2, renvoi à library", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, f.iwb], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ opened: ["lecon.iwb"], inserted: [] });
    expect(stampOf(a)).toEqual(before);
    const pack = memoryIO();
    expect(await main(["import", a, join(dir, "p.rbpack")], pack)).toBe(2);
    expect(pack.errors()[0].error.message).toContain("library");
  });
  it("RF2 — majuscules : LECON.IWB lu ; run X.ROOMBOARD --save accepté (D23 sans casse)", async () => {
    const dir = tmpDir();
    const f = boardFixtures(dir);
    const upper = join(dir, "LECON.IWB");
    writeFileSync(upper, readFileSync(f.iwb));
    expect((await stateOf(upper)).pages[0].elements).toHaveLength(8);
    const x = join(dir, "X.ROOMBOARD");
    expect(await main(["new", x], memoryIO())).toBe(0);
    expect(await main(["run", x, "--save"], memoryIO([]))).toBe(0);
  });
  it("RF3 — .ubz qui n'est pas un ZIP : code 1, message du produit, rien d'écrit", async () => {
    const dir = tmpDir();
    const faux = join(dir, "faux.ubz");
    writeFileSync(faux, "bonjour");
    const io = memoryIO();
    expect(await main(["state", faux], io)).toBe(1);
    expect(io.errors()[0].error.message).toContain("un .ubz est une archive ZIP");
    const out = join(dir, "o.roomboard");
    expect(await main(["run", faux, "--out", out], memoryIO([]))).toBe(1);
    expect(existsSync(out)).toBe(false);
  });
  it("D29 — module des formats interrompu : save et write refusent (code 1), rien d'écrit", async () => {
    const s0 = await nodeSession(memoryIO());
    const s = createSession({ ...s0.deps, interrupted: () => true });
    const tab = s.newTab().session;
    const out = join(tmpDir(), "x.roomboard");
    await expect(s.save(tab, out)).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    await expect(s.write(out, pngBytes(1, 1))).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
  it("D29 — panique masquée par free() pendant la lecture d'un tableau : la session refuse ensuite d'écrire", async () => {
    // Sous le seul critère « RuntimeError relancée », la panique passerait pour une erreur ordinaire et `save` écrirait.
    const dir = tmpDir();
    const raw = join(dir, "brut.iwb");
    writeFileSync(raw, "<iwb/>");
    const fail = (): never => {
      throw new Error("non appelé");
    };
    const mod = { ContainerReader: { open: fail }, write_container: fail, BoardReader: { open: borrowedAfterPanic }, write_board_xml: () => [], notebook_order: () => [] } as unknown as FormatsBinding;
    let hit = false;
    const s0 = await nodeSession(memoryIO());
    const s = createSession({ ...s0.deps, board: nodeBoardPorts(async () => mod, () => void (hit = true)), interrupted: () => hit });
    await expect(s.open(raw)).rejects.toMatchObject({ code: "format" });
    const out = join(dir, "x.roomboard");
    await expect(s.save(s.newTab().session, out)).rejects.toMatchObject({ code: "command", message: INTERRUPTED_MESSAGE });
    expect(existsSync(out)).toBe(false);
  });
});
