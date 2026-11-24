/**
 * Garde des couches de `platform/` (OF13, cadrage platform-feuilles D2, D3) : (a) aucun cycle d'import entre les fichiers
 * non-test de `platform/`, imports de type compris ; (b) aucun import, de type compris, d'un fichier non-test de
 * `platform/` vers `src/app/` ; (c) tout import relatif se résout, sauf le dossier généré `wasm-formats/`. Les `*.test.ts`
 * ne sont pas lus (`zip-worker.test.ts` décode par `app/board-io`, voulu). Imports lus par `ts.preProcessFile` (`import`,
 * `import type`, `export … from`, `import()`) et par `new URL("<relatif>", import.meta.url)` (Workers).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PLATFORM = dirname(fileURLToPath(import.meta.url));
const SRC = dirname(PLATFORM);
const APP = join(SRC, "app");
/** Dossiers générés par `scripts/verifier.sh`, absents d'un worktree neuf (H7) : un nouveau dossier généré se nomme ici. */
const GENERATED: readonly string[] = [join(SRC, "wasm-formats")];
const NEW_URL = /new\s+URL\(\s*(["'])(\.{1,2}\/[^"']+)\1\s*,\s*import\.meta\.url\s*\)/g;

interface ImportRef {
  readonly spec: string;
  readonly line: number;
}
interface Edge {
  readonly from: string;
  readonly line: number;
  readonly to: string;
}

const lineAt = (text: string, pos: number): number => text.slice(0, pos).split("\n").length;

/** Spécificateurs importés par `text`, avec leur ligne (1 = première). */
function importsOf(text: string): ImportRef[] {
  const found: ImportRef[] = ts.preProcessFile(text, true, true).importedFiles.map((f) => ({ spec: f.fileName, line: lineAt(text, f.pos) }));
  for (const m of text.matchAll(NEW_URL)) found.push({ spec: m[2]!, line: lineAt(text, m.index ?? 0) });
  return found;
}

/** `file` est sous `dir`. */
function inside(dir: string, file: string): boolean {
  const r = relative(dir, file);
  return r !== "" && !r.startsWith("..") && !r.startsWith("/");
}

/** Relatif résolu en `.ts`, `.tsx` ou `/index.ts` existant, sinon null. */
function resolveSpec(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")].filter((c) => c.endsWith(".ts") || c.endsWith(".tsx"));
  return candidates.find((c) => existsSync(c)) ?? null;
}

/** Fichiers `.ts`/`.tsx` non-test sous `dir` (récursif, hors `.d.ts` et dossiers générés), chemins absolus triés. */
function sourceFilesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((n) => join(dir, n))
    .filter((f) => /\.tsx?$/.test(f) && !/\.(test|d)\.tsx?$/.test(f) && !GENERATED.some((g) => inside(g, f)))
    .sort();
}

/** Fichiers non-test de `platform/`, sous-dossiers compris. */
const sourceFiles = (): string[] => sourceFilesUnder(PLATFORM);

/**
 * Imports relatifs des fichiers non-test de `src/` ; `unresolved` : `fichier:ligne → spécificateur`, limité à `platform/`
 * (ailleurs, un spécificateur non résolu — asset, `?url`, module généré — est ignoré).
 */
function srcEdges(): { readonly edges: Edge[]; readonly unresolved: string[] } {
  const edges: Edge[] = [];
  const unresolved: string[] = [];
  for (const from of sourceFilesUnder(SRC)) {
    const inPlatform = inside(PLATFORM, from);
    for (const { spec, line } of importsOf(readFileSync(from, "utf8"))) {
      if (!spec.startsWith(".")) continue;
      const target = resolve(dirname(from), spec);
      if (GENERATED.some((g) => inside(g, target))) continue;
      // Un import de `platform/` vers `src/app/` compte même si le fichier manque (D3).
      const to = resolveSpec(from, spec) ?? (inPlatform && inside(APP, target) ? target : null);
      if (to === null) {
        if (inPlatform) unresolved.push(`${basename(from)}:${line} → ${spec}`);
      } else edges.push({ from, line, to });
    }
  }
  return { edges, unresolved };
}

/** Un cycle par composante fortement connexe (Tarjan) : nœuds du cycle dans l'ordre, le premier répété à la fin. */
function findCycles(graph: ReadonlyMap<string, readonly string[]>): string[][] {
  let next = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];
  const visit = (v: string): void => {
    index.set(v, next);
    low.set(v, next);
    next++;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!graph.has(w)) continue;
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) !== index.get(v)) return;
    const comp: string[] = [];
    let w: string;
    do {
      w = stack.pop()!;
      onStack.delete(w);
      comp.push(w);
    } while (w !== v);
    if (comp.length > 1 || (graph.get(v) ?? []).includes(v)) cycles.push(cycleIn(graph, new Set(comp)));
  };
  for (const v of [...graph.keys()].sort()) if (!index.has(v)) visit(v);
  return cycles;
}

/** Plus court cycle de la composante qui passe par son plus petit nœud (parcours en largeur). */
function cycleIn(graph: ReadonlyMap<string, readonly string[]>, comp: ReadonlySet<string>): string[] {
  const start = [...comp].sort()[0]!;
  const parent = new Map<string, string>();
  const queue = [start];
  while (queue.length > 0) {
    const v = queue.shift()!;
    for (const w of [...(graph.get(v) ?? [])].sort()) {
      if (w === start) {
        const path = [v];
        while (path[0] !== start) path.unshift(parent.get(path[0]!)!);
        return [...path, start];
      }
      if (comp.has(w) && !parent.has(w)) {
        parent.set(w, v);
        queue.push(w);
      }
    }
  }
  return [start];
}

describe("détecteur de la garde (D2)", () => {
  it("rend le cycle a → b → a d'un faux graphe, la boucle a → a, et rien sans cycle", () => {
    expect(findCycles(new Map([["a", ["b"]], ["b", ["a"]], ["c", ["a"]]]))).toEqual([["a", "b", "a"]]);
    expect(findCycles(new Map([["a", ["a"]]]))).toEqual([["a", "a"]]);
    expect(findCycles(new Map([["a", ["b"]], ["b", ["c"]], ["c", []]]))).toEqual([]);
  });

  it("lit import, import type, export … from, import() et new URL(…, import.meta.url), avec leur ligne", () => {
    const text = [
      'import { a } from "./a";',
      'import type { B } from "./b";',
      'export { c } from "./c";',
      'const d = () => import("./d");',
      'new Worker(new URL("./e.ts", import.meta.url));',
      'import x from "fflate";',
    ].join("\n");
    expect(importsOf(text).map((r) => `${r.line} ${r.spec}`).sort()).toEqual(["1 ./a", "2 ./b", "3 ./c", "4 ./d", "5 ./e.ts", "6 fflate"]);
  });
});

describe("couches de platform/ (OF13, D2)", () => {
  const { edges: allEdges, unresolved } = srcEdges();
  const edges = allEdges.filter((e) => inside(PLATFORM, e.from));

  it("lit bien le dossier : au moins 53 fichiers et 150 imports relatifs", () => {
    expect(sourceFiles().length).toBeGreaterThanOrEqual(53);
    expect(edges.length).toBeGreaterThanOrEqual(150);
  });

  it("tout import relatif de platform/ se résout (sauf wasm-formats/, généré)", () => {
    expect(unresolved).toEqual([]);
  });

  it("aucun fichier non-test de platform/ n'importe src/app/", () => {
    expect(edges.filter((e) => inside(APP, e.to)).map((e) => `${basename(e.from)}:${e.line} → ${relative(SRC, e.to)}`)).toEqual([]);
  });

  it("aucun cycle d'import, dans src/, qui touche un fichier non-test de platform/", () => {
    const graph = new Map<string, string[]>(sourceFilesUnder(SRC).map((f) => [f, []]));
    for (const e of allEdges) graph.get(e.from)?.push(e.to);
    const touching = findCycles(graph).filter((c) => c.some((f) => inside(PLATFORM, f)));
    expect(touching.map((c) => c.map((f) => relative(SRC, f)).join(" → "))).toEqual([]);
  });
});
