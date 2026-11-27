import { describe, expect, it } from "vitest";
import { ALL_COMMANDS, COMMAND_TYPES, parseOp, type RefContext } from "./ops";
import { codeOf } from "./testing";

const ctx = (): RefContext => ({
  idsOf: (n) => (n === 1 ? ["e1", "e2"] : n === 2 ? [] : undefined),
  pageIds: () => ["p0", "p1"],
  tabIds: () => ["t1", "t2"],
});
const style = { color: "#000000", width: 4 };

describe("lecture d'une opération (D6)", () => {
  it("points et path deviennent des Float32Array", () => {
    const op = parseOp(JSON.stringify({ type: "CommitStroke", page: "p", points: [1, 2, 0.5], style }), ctx());
    if (op.kind !== "command" || op.cmd.type !== "CommitStroke") throw new Error("forme inattendue");
    expect(op.cmd.points).toBeInstanceOf(Float32Array);
    expect(Array.from(op.cmd.points)).toEqual([1, 2, 0.5]);
    const erase = parseOp({ type: "Erase", page: "p", path: [0, 0, 5, 5], radius: 4, mode: "object" }, ctx());
    expect(erase.kind === "command" && erase.cmd.type === "Erase" && erase.cmd.path instanceof Float32Array).toBe(true);
  });
  it("références $n, $n.k, $page:i, $tab:i sur les chaînes entières seulement", () => {
    const op = parseOp({ type: "Delete", ids: ["$1", "$1.2", "$page:1", "$tab:0", "x$1", "$1 ", "$page:"] }, ctx());
    expect(op.kind === "command" ? op.cmd : null).toEqual({ type: "Delete", ids: ["e1", "e2", "p1", "t1", "x$1", "$1 ", "$page:"] });
  });
  it("référence inconnue, à une opération sans id, à venir ou hors rang : usage", () => {
    for (const ref of ["$2", "$3", "$1.3", "$1.0", "$page:2", "$tab:5"]) {
      expect(codeOf(() => parseOp({ type: "Delete", ids: [ref] }, ctx()))).toBe("usage");
    }
  });
  it("opération de la CLI : nom et arguments, références résolues", () => {
    expect(parseOp('{"op":"tab.select","tab":"$tab:1"}', ctx())).toEqual({ kind: "cli", op: "tab.select", args: { op: "tab.select", tab: "t2" } });
  });
  it("commande du cœur inconnue, op inconnue ou clé d'Object, JSON invalide, tableau, nombre : usage", () => {
    for (const line of ['{"type":"Bidule"}', '{"type":"constructor"}', '{"op":"toString"}', '{"op":"__proto__"}', "{pas du json", "[1,2]", "3", '{"page":"p"}']) {
      expect(codeOf(() => parseOp(line, ctx()))).toBe("usage");
    }
  });
  it("points ou path non numériques : usage", () => {
    expect(codeOf(() => parseOp({ type: "CommitStroke", page: "p", points: [1, "a"], style }, ctx()))).toBe("usage");
    expect(codeOf(() => parseOp({ type: "Erase", page: "p", path: "0,0", radius: 4, mode: "object" }, ctx()))).toBe("usage");
  });
  it("COMMAND_TYPES couvre les 31 commandes de Command, sans doublon", () => {
    expect(ALL_COMMANDS).toBe(true);
    expect(new Set(COMMAND_TYPES).size).toBe(31);
  });
  it("SetStyle accepté", () => {
    expect(COMMAND_TYPES).toContain("SetStyle");
  });
});

describe("échappement des références (D6)", () => {
  it("$$ donne un $ littéral dans toute chaîne, jamais résolu", () => {
    const to = (text: string): unknown => {
      const op = parseOp(JSON.stringify({ op: "save", to: text }), ctx());
      if (op.kind !== "cli") throw new Error("forme inattendue");
      return op.args["to"];
    };
    expect(to("$$1")).toBe("$1");
    expect(to("$$page:0")).toBe("$page:0");
    expect(to("$$")).toBe("$");
    expect(to("prix : 5 $$")).toBe("prix : 5 $");
    expect(to("$$$1")).toBe("$$1");
    expect(to("5 $")).toBe("5 $");
    expect(to("$1")).toBe("e1");
  });
});
