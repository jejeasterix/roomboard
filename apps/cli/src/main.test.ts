import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { FORMAT_LOTS } from "./formats";
import { main } from "./main";
import { describeWasm, memoryIO, stampOf, tmpDir, type Json } from "./testing";

describe("main : commandes sans module (D9)", () => {
  it("formats rend la table entière, code 0", async () => {
    const io = memoryIO();
    expect(await main(["formats"], io)).toBe(0);
    const [out] = io.json();
    expect(out.formats).toHaveLength(Object.keys(FORMAT_LOTS).length);
    expect(out.formats).toContainEqual({ ext: ".roomboard", read: true, write: true, readLot: 1, writeLot: 1, notes: [] });
    expect(out.formats).toContainEqual(expect.objectContaining({ ext: ".pdf", read: false, write: false, readLot: 3, writeLot: 3 }));
    expect(io.stderr).toEqual([]);
  });
  it("commande inconnue, absente, clé d'Object ou argument en trop : code 2, une erreur JSON sur stderr", async () => {
    for (const argv of [["bidule"], [], ["toString"], ["__proto__"], ["constructor"], ["formats", "en-trop"]]) {
      const io = memoryIO();
      expect(await main(argv, io)).toBe(2);
      expect(io.stdout).toEqual([]);
      expect(io.errors()).toEqual([{ error: expect.objectContaining({ code: "usage" }) }]);
    }
  });
  it("help, --help, -h : usage sur stdout (une ligne JSON), code 0 ; sans argument : usage sur stderr, code 2", async () => {
    for (const argv of [["help"], ["--help"], ["-h"]]) {
      const io = memoryIO();
      expect(await main(argv, io)).toBe(0);
      expect(io.stderr).toEqual([]);
      expect(io.stdout).toHaveLength(1);
      const [out] = io.json();
      expect(out.usage).toContain("roomboard run <fichier.roomboard | --new> [--ops <fichier.jsonl> | -] [--save] [--out <fichier>]");
      expect(out.usage).toContain("roomboard new <sortie.roomboard> [--replace]");
      expect(JSON.stringify(out)).toContain("$$");
    }
    const bare = memoryIO();
    expect(await main([], bare)).toBe(2);
    expect(bare.stdout).toEqual([]);
    expect(bare.errors()).toEqual([{ error: { code: "usage", message: expect.stringContaining("roomboard run <fichier.roomboard | --new>") } }]);
  });
  it("module Wasm absent : code 1, erreur io", async () => {
    const io = memoryIO([], {}, new URL("file:///roomboard-absent/"));
    expect(await main(["version"], io)).toBe(1);
    expect(io.errors()[0].error.code).toBe("io");
  });
});

describeWasm("main : version au vrai module", () => {
  it("version : cli, core, app et schéma", async () => {
    const io = memoryIO();
    expect(await main(["version"], io)).toBe(0);
    expect(io.json()).toEqual([{ cli: "0.1.0", core: expect.any(String), app: "0.1.0", schema: "roomboard-cli/1" }]);
  });
});

const rectOp = (page: string, x1 = 110, y1 = 220) => ({ type: "AddShape", page, shape: "rect", x0: 10, y0: 20, x1, y1, style: { color: "#1e40af", width: 4 }, fill: null });

describeWasm("S1 — créer, dessiner, annuler, enregistrer, relire", () => {
  it("S1 — new, run --save puis state : 2 éléments, forme déplacée, canUndo faux", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const made = memoryIO();
    expect(await main(["new", a], made)).toBe(0);
    expect(made.json()).toEqual([{ file: a, pages: [expect.any(String)] }]);
    const ops = join(dir, "ops.jsonl");
    writeFileSync(
      ops,
      [
        rectOp("$page:0"),
        { type: "SetText", page: "$page:0", id: null, x: 300, y: 300, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 },
        { type: "CommitStroke", page: "$page:0", points: [100, 500, 0.5, 200, 520, 0.5, 300, 500, 0.5], style: { color: "#dc2626", width: 4 } },
        { op: "undo" },
        { op: "redo" },
        { type: "Transform", ids: ["$1"], matrix: [1, 0, 0, 1, 50, 0] },
        { type: "Delete", ids: ["$2"] },
      ].map((o) => JSON.stringify(o)).join("\r\n") + "\r\n",
    );
    const run = memoryIO();
    expect(await main(["run", a, "--ops", ops, "--save"], run)).toBe(0);
    const lines = run.json();
    expect(lines.slice(0, -1).map((l: Json) => [l.op, l.ok])).toEqual([[1, true], [2, true], [3, true], [4, true], [5, true], [6, true], [7, true]]);
    expect(lines.at(-1)).toEqual({ written: [a] });
    const st = memoryIO();
    expect(await main(["state", a], st)).toBe(0);
    const [state] = st.json();
    expect(state).toMatchObject({ schema: "roomboard-cli/1", file: a, canUndo: false, canRedo: false });
    const els = state.pages[0].elements;
    expect(els.map((e: Json) => e.kind)).toEqual(["shape", "stroke"]);
    expect(els[0].transform).toEqual([1, 0, 0, 1, 60, 20]);
  });
});

describeWasm("S2 — pages et onglets", () => {
  it("S2 — AddPage, RemovePage, tab.new, rectangle dans t2, deux fichiers relus", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const b = join(dir, "b.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const io = memoryIO(
      [
        { type: "AddPage", after: "$page:0" },
        { type: "RemovePage", page: "$page:0" },
        { op: "tab.new" },
        rectOp("$page:0", 60, 60),
        { op: "save", to: b },
        { op: "tab.select", tab: "$tab:0" },
        { op: "save" },
      ].map((o) => JSON.stringify(o)),
    );
    expect(await main(["run", a, "--ops", "-"], io)).toBe(0);
    const lines = io.json();
    expect(lines.map((l: Json) => l.op)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(lines[2].tabs).toEqual([{ id: "t1", file: a, active: false }, { id: "t2", file: null, active: true }]);
    expect(lines[4].file).toBe(b);
    const added = lines[0].change.pages[0];
    const sa = memoryIO();
    expect(await main(["state", a], sa)).toBe(0);
    expect(sa.json()[0].pages.map((p: Json) => [p.page.id, p.elements.length])).toEqual([[added, 0]]);
    const sb = memoryIO();
    expect(await main(["state", b], sb)).toBe(0);
    expect(sb.json()[0].pages.map((p: Json) => p.elements.map((e: Json) => e.kind))).toEqual([["shape"]]);
  });
  it("S2 — RemovePage de la dernière page : code 1, fichier inchangé (run --save puis apply)", async () => {
    const a = join(tmpDir(), "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const remove = JSON.stringify({ type: "RemovePage", page: "$page:0" });
    const err = { code: "command", message: "la dernière page ne se supprime pas" };
    const io = memoryIO([remove]);
    expect(await main(["run", a, "--save"], io)).toBe(1);
    expect(io.json()).toEqual([{ op: 1, ok: false, error: err }]);
    expect(io.errors()).toEqual([{ error: err }]);
    expect(stampOf(a)).toEqual(before);
    const ap = memoryIO();
    expect(await main(["apply", a, remove], ap)).toBe(1);
    expect(stampOf(a)).toEqual(before);
  });
  it("H4 — une opération réussie puis une refusée, avec --save : fichier non écrit, code 1", async () => {
    const a = join(tmpDir(), "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO([JSON.stringify(rectOp("$page:0")), JSON.stringify({ type: "RemovePage", page: "$page:0" })]);
    expect(await main(["run", a, "--save"], io)).toBe(1);
    expect(io.json().map((l: Json) => [l.op, l.ok])).toEqual([[1, true], [2, false]]);
    expect(io.errors()[0].error.code).toBe("command");
    expect(stampOf(a)).toEqual(before);
  });
});

describeWasm("run et apply : entrées, usages, sortie", () => {
  it("run - : lignes vides ignorées, CRLF accepté, une ligne par opération", async () => {
    const io = memoryIO(["", '{"op":"tab.list"}\r', "   "]);
    expect(await main(["run", "--new", "--ops", "-"], io)).toBe(0);
    expect(io.json()).toEqual([{ op: 1, ok: true, tabs: [{ id: "t1", file: null, active: true }] }]);
  });
  it("run - : stdin lu par readline comme bin.ts, ouvert seulement après le chargement du cœur", async () => {
    // readline lit son flux dès sa création : créé avant les attentes de la session, il perd ses lignes et sa fin,
    // et la boucle ne se règle jamais (binaire : « unsettled top-level await », code 13).
    const io = { ...memoryIO(), lines: () => createInterface({ input: Readable.from(['{"op":"tab.list"}\r\n', '{"op":"undo"}\n']), crlfDelay: Infinity }) };
    expect(await main(["run", "--new", "--ops", "-"], io)).toBe(0);
    expect(io.json().map((l: Json) => [l.op, l.ok])).toEqual([[1, true], [2, true]]);
  });
  it("usages : run sans fichier ni --new, fichier et --new, --new --save sans --out, option inconnue, ligne non JSON", async () => {
    for (const argv of [["run"], ["run", "a.roomboard", "--new"], ["run", "--new", "--save"], ["state", "a.roomboard", "--bidule"], ["new"]]) {
      const io = memoryIO();
      expect(await main(argv, io)).toBe(2);
      expect(io.errors()[0].error.code).toBe("usage");
    }
    const bad = memoryIO(["{pas du json"]);
    expect(await main(["run", "--new"], bad)).toBe(2);
    expect(bad.json()).toEqual([{ op: 1, ok: false, error: expect.objectContaining({ code: "usage" }) }]);
  });
  it("apply enregistre à --out et laisse la source ; state d'un fichier absent : code 1", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const out = join(dir, "out.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["apply", a, JSON.stringify(rectOp("$page:0")), "--out", out], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ op: 1, ok: true });
    expect(stampOf(a)).toEqual(before);
    const st = memoryIO();
    expect(await main(["state", out], st)).toBe(0);
    expect(st.json()[0].pages[0].elements).toHaveLength(1);
    const missing = memoryIO();
    expect(await main(["state", join(dir, "absent.roomboard")], missing)).toBe(1);
    expect(missing.errors()[0].error.code).toBe("io");
  });
});

const elementsOf = async (file: string): Promise<number> => {
  const st = memoryIO();
  expect(await main(["state", file], st)).toBe(0);
  return st.json()[0].pages[0].elements.length;
};

describeWasm("run --save et --out : le fichier passé à run, quel que soit l'onglet actif", () => {
  it("run a --save après tab.open f : a enregistré (t1), f non écrit ; dernière ligne : fichiers écrits", async () => {
    // Discrimine le patron écarté : enregistrer l'onglet actif réécrirait f (t2) et laisserait a vide.
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const f = join(dir, "f.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    expect(await main(["new", f], memoryIO())).toBe(0);
    const fBefore = stampOf(f);
    const io = memoryIO([JSON.stringify(rectOp("$page:0")), JSON.stringify({ op: "tab.open", file: f })]);
    expect(await main(["run", a, "--save"], io)).toBe(0);
    expect(io.json()[1].tabs).toEqual([{ id: "t1", file: a, active: false }, { id: "t2", file: f, active: true }]);
    expect(io.json().at(-1)).toEqual({ written: [a] });
    expect(stampOf(f)).toEqual(fBefore);
    expect(await elementsOf(a)).toBe(1);
  });
  it("run a --out c après tab.open f : c reçoit le contenu de a, a et f non écrits", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const f = join(dir, "f.roomboard");
    const c = join(dir, "c.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    expect(await main(["new", f], memoryIO())).toBe(0);
    const aBefore = stampOf(a);
    const fBefore = stampOf(f);
    const io = memoryIO([JSON.stringify(rectOp("$page:0")), JSON.stringify({ op: "tab.open", file: f })]);
    expect(await main(["run", a, "--out", c], io)).toBe(0);
    expect(io.json().at(-1)).toEqual({ written: [c] });
    expect(stampOf(a)).toEqual(aBefore);
    expect(stampOf(f)).toEqual(fBefore);
    expect(await elementsOf(c)).toBe(1);
  });
  it("op save d'un autre onglet puis --save : les deux fichiers dans la dernière ligne, dans l'ordre d'écriture", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const b = join(dir, "b.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const io = memoryIO([{ op: "tab.new" }, rectOp("$page:0"), { op: "save", to: b }].map((o) => JSON.stringify(o)));
    expect(await main(["run", a, "--save"], io)).toBe(0);
    expect(io.json().at(-1)).toEqual({ written: [b, a] });
    expect(await elementsOf(b)).toBe(1);
    expect(await elementsOf(a)).toBe(0);
  });
  it("apply a '<tab.new>' : a reste le document de a (jamais l'onglet neuf)", async () => {
    const a = join(tmpDir(), "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    expect(await main(["apply", a, JSON.stringify(rectOp("$page:0"))], memoryIO())).toBe(0);
    expect(await main(["apply", a, '{"op":"tab.new"}'], memoryIO())).toBe(0);
    expect(await elementsOf(a)).toBe(1);
  });
  it("run a --save après tab.close de t1 : refus code 1, a non écrit", async () => {
    const a = join(tmpDir(), "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO([{ op: "tab.new" }, { op: "tab.close", tab: "t1" }].map((o) => JSON.stringify(o)));
    expect(await main(["run", a, "--save"], io)).toBe(1);
    expect(io.errors()[0].error.code).toBe("command");
    expect(stampOf(a)).toEqual(before);
  });
});

describeWasm("new : jamais d'écrasement sans --replace", () => {
  it("new sur un fichier existant : code 1 « existe déjà », fichier intact ; --replace le remplace", async () => {
    const a = join(tmpDir(), "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    expect(await main(["apply", a, JSON.stringify(rectOp("$page:0"))], memoryIO())).toBe(0);
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["new", a], io)).toBe(1);
    expect(io.stdout).toEqual([]);
    expect(io.errors()).toEqual([{ error: { code: "io", message: expect.stringContaining("existe déjà") } }]);
    expect(stampOf(a)).toEqual(before);
    const replaced = memoryIO();
    expect(await main(["new", a, "--replace"], replaced)).toBe(0);
    expect(stampOf(a).ino).not.toBe(before.ino);
    expect(await elementsOf(a)).toBe(0);
  });
  it("ROOMBOARD_NOW qui n'est pas un entier positif : usage, code 2, rien d'écrit", async () => {
    const a = join(tmpDir(), "a.roomboard");
    const io = memoryIO([], { ROOMBOARD_NOW: "2026-11-23" });
    expect(await main(["new", a], io)).toBe(2);
    expect(io.errors()[0].error.code).toBe("usage");
    expect(existsSync(a)).toBe(false);
  });
});
