import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { CASCADE_STEP } from "../../web/src/platform/image-import";
import { streamLines } from "./contract";
import { main } from "./main";
import { describeWasm, memoryIO, pngBytes, stampOf, tmpDir, XLSX_FIXTURE, type Json } from "./testing";

async function board(): Promise<{ dir: string; a: string }> {
  const dir = tmpDir();
  const a = join(dir, "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  return { dir, a };
}

describeWasm("S3 — images et classeur", () => {
  it("S3 — import image.png valeurs.xlsx --at 400,300 : deux insérés, image aux dimensions PNG, tableau du classeur", async () => {
    const { dir, a } = await board();
    const png = join(dir, "image.png");
    const xlsx = join(dir, "valeurs.xlsx");
    writeFileSync(png, pngBytes(40, 30));
    copyFileSync(XLSX_FIXTURE, xlsx);
    const io = memoryIO();
    expect(await main(["import", a, png, xlsx, "--at", "400,300"], io)).toBe(0);
    const [report] = io.json();
    expect(report).toMatchObject({ opened: [], inserted: ["image.png", "valeurs.xlsx"], refused: [], failed: [] });
    expect(report.notices).toContain("valeurs.xlsx : tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)");
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    const [state] = st.json();
    const [image, table] = state.pages[0].elements;
    expect(image.kind).toBe("image");
    expect([image.image.w, image.image.h]).toEqual([40, 30]);
    expect(image.transform).toEqual([1, 0, 0, 1, 380, 285]);
    expect(state.assets).toEqual([expect.objectContaining({ id: image.image.asset, name: "image.png", mime: "image/png" })]);
    expect(table.kind).toBe("table");
    expect([table.table.cols.length, table.table.rows.length]).toEqual([6, 64]);
    expect(table.table.cells.slice(0, 2).map((c: Json) => c.text)).toEqual(["texte", "42"]);
  });
  it("deux PNG d'un même appel : cascade de la page (CASCADE_STEP), placement calculé par l'importeur seul", async () => {
    // Discrimine le patron écarté : un `AddImage` posé par la CLI (centre sur --at) mettrait les deux images au même endroit.
    const { dir, a } = await board();
    const one = join(dir, "un.png");
    const two = join(dir, "deux.png");
    writeFileSync(one, pngBytes(40, 30));
    writeFileSync(two, pngBytes(20, 10));
    const io = memoryIO();
    expect(await main(["import", a, one, two, "--at", "400,300"], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ inserted: ["un.png", "deux.png"], refused: [], failed: [] });
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    const [first, second] = st.json()[0].pages[0].elements;
    expect(first.transform).toEqual([1, 0, 0, 1, 380, 285]);
    expect(second.transform).toEqual([1, 0, 0, 1, 390 + CASCADE_STEP, 295 + CASCADE_STEP]);
  });
  it("import doc.pdf : code 3 « lot 3 », rien lu ni écrit", async () => {
    const { dir, a } = await board();
    const pdf = join(dir, "doc.pdf");
    writeFileSync(pdf, "%PDF-1.4\n%%EOF\n");
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, pdf], io)).toBe(3);
    expect(io.stdout).toEqual([]);
    expect(io.errors()[0].error.code).toBe("unsupported");
    expect(io.errors()[0].error.message).toContain("lot 3");
    expect(stampOf(a)).toEqual(before);
    // Rien lu : tableau et source absents du disque, une lecture rendrait io (code 1) au lieu de 3.
    const docx = memoryIO();
    expect(await main(["import", join(dir, "absent.roomboard"), join(dir, "lettre.docx")], docx)).toBe(3);
    expect(docx.errors()[0].error).toEqual({ code: "unsupported", message: "lettre.docx : format pris en charge par la CLI au lot 4" });
  });
  it("--at hors de la scène (5000,10) ou mal formé : code 2 avant tout import", async () => {
    const { dir, a } = await board();
    const png = join(dir, "image.png");
    writeFileSync(png, pngBytes(4, 4));
    for (const at of ["5000,10", "10", "a,b", ",3"]) {
      const io = memoryIO();
      expect(await main(["import", a, png, "--at", at], io)).toBe(2);
      expect(io.errors()[0].error.code).toBe("usage");
    }
  });
  it("source d'extension inconnue (notes.txt) : refusée, code 1, fichier inchangé", async () => {
    const { dir, a } = await board();
    const txt = join(dir, "notes.txt");
    writeFileSync(txt, "bonjour");
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, txt], io)).toBe(1);
    expect(io.json()[0]).toMatchObject({ inserted: [], refused: ["notes.txt"] });
    expect(io.errors()[0].error.code).toBe("command");
    expect(stampOf(a)).toEqual(before);
  });
  it("run : op import (at) puis op export dans la même session", async () => {
    const { dir, a } = await board();
    const png = join(dir, "image.png");
    const frag = join(dir, "objet.rbitem");
    writeFileSync(png, pngBytes(8, 6));
    const io = memoryIO([JSON.stringify({ op: "import", files: [png], at: [400, 300] }), JSON.stringify({ op: "export", to: frag })]);
    expect(await main(["run", a, "--save"], io)).toBe(0);
    const [imp, exp] = io.json();
    expect(imp).toMatchObject({ op: 1, ok: true, inserted: ["image.png"] });
    expect(exp).toEqual({ op: 2, ok: true, file: frag, kind: "fragment", elements: 1 });
  });
});

describe("lignes de stdin (bin.ts)", () => {
  it("readline créé à la première lecture : une attente entre lines() et la lecture ne perd ni ligne ni fin", async () => {
    const input = new PassThrough();
    const lines = streamLines(input);
    input.end('{"op":"tab.list"}\n{"op":"undo"}\n');
    // Attentes du processus avant la lecture (chargement du Wasm, ouverture, lecture des sources d'un import).
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
    const collect = async (): Promise<string[]> => {
      const got: string[] = [];
      for await (const l of lines) got.push(l);
      return got;
    };
    const stalled = new Promise<string>((r) => setTimeout(() => r("fin de stdin perdue"), 1000));
    expect(await Promise.race([collect(), stalled])).toEqual(['{"op":"tab.list"}', '{"op":"undo"}']);
  });
});
