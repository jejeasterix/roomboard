#!/usr/bin/env node
// Contrôle des licences (U39, R21) : crates de `cargo metadata` hors membres du workspace et paquets npm de
// node_modules/.pnpm (liens exclus, développement compris). Une expression SPDX passe si l'une de ses alternatives ne
// porte que des licences permises ; exceptions écrites une fois dans scripts/licences-acceptees.json.
// Usage : node scripts/controle-licences.mjs [--cargo-json f]… [--npm-root d] [--exceptions f]
// Sans --cargo-json : `cargo metadata --format-version 1 --locked --offline` du workspace, puis de src-tauri (R22).
// Code de sortie : 0 conforme, 1 écart (une ligne par écart) ou relevé npm vide, 2 option inconnue.
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** Licences permises (U39) ; `MIT-0` et `Unlicense` en plus (R21). OFL-1.1 (polices seulement) passe par une exception. */
export const ALLOWED = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "Zlib", "Unicode-3.0", "Unicode-DFS-2016",
  "BSL-1.0", "0BSD", "CC0-1.0", "MPL-2.0", "MIT-0", "Unlicense",
]);

const OPS = new Set(["OR", "AND", "WITH"]);

/** Arbre SPDX : `{ or: [] }`, `{ and: [] }` ou `{ id }` ; `/` lu comme `OR` ; `X WITH Y` gardé comme une seule licence. */
export function parseSpdx(expr) {
  const tokens = expr
    .replace(/\//g, " OR ")
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (OPS.has(t.toUpperCase()) ? t.toUpperCase() : t));
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const fail = (why) => {
    throw new Error(`${why} : ${expr}`);
  };
  function primary() {
    const t = next();
    if (t === undefined) fail("expression incomplète");
    if (t === "(") {
      const n = or();
      if (next() !== ")") fail("parenthèse non fermée");
      return n;
    }
    if (t === ")" || OPS.has(t)) fail(`jeton inattendu « ${t} »`);
    if (peek() === "WITH") {
      next();
      const ex = next();
      if (ex === undefined || ex === "(" || ex === ")" || OPS.has(ex)) fail("exception WITH absente");
      return { id: `${t} WITH ${ex}` };
    }
    return { id: t };
  }
  function and() {
    const parts = [primary()];
    while (peek() === "AND") {
      next();
      parts.push(primary());
    }
    return parts.length === 1 ? parts[0] : { and: parts };
  }
  function or() {
    const parts = [and()];
    while (peek() === "OR") {
      next();
      parts.push(and());
    }
    return parts.length === 1 ? parts[0] : { or: parts };
  }
  const tree = or();
  if (i !== tokens.length) fail(`jeton en trop « ${tokens[i]} »`);
  return tree;
}

export function permitted(node) {
  if ("or" in node) return node.or.some(permitted);
  if ("and" in node) return node.and.every(permitted);
  return ALLOWED.has(node.id);
}

function cargoMetadata(manifest) {
  const args = ["metadata", "--format-version", "1", "--locked", "--offline", ...(manifest ? ["--manifest-path", manifest] : [])];
  return JSON.parse(execFileSync("cargo", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }));
}

/** Nom et version des membres de tous les workspaces : le crate du projet vu comme dépendance dans un autre relevé reste exclu. */
function memberKeys(metas) {
  const keys = new Set();
  for (const meta of metas) {
    const ids = new Set(meta.workspace_members);
    for (const p of meta.packages) if (ids.has(p.id)) keys.add(`${p.name} ${p.version}`);
  }
  return keys;
}

function cargoPackages(meta, members) {
  return meta.packages
    .filter((p) => !members.has(`${p.name} ${p.version}`))
    .map((p) => ({ kind: "cargo", name: p.name, version: p.version, license: p.license ?? null }));
}

const licenseOf = (pkg) => {
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license && typeof pkg.license.type === "string") return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => (typeof l === "string" ? l : l.type)).join(" OR ");
  return null;
};

/** `<racine>/<entrée>/node_modules/<paquet>` et `…/@portée/<paquet>` ; un lien n'est jamais relevé (son paquet l'est ailleurs). */
function npmPackages(root) {
  const out = [];
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root)) {
    const nm = join(root, entry, "node_modules");
    if (!existsSync(nm)) continue;
    for (const d of readdirSync(nm)) {
      const rels = d.startsWith("@") ? readdirSync(join(nm, d)).map((x) => join(d, x)) : [d];
      for (const rel of rels) {
        const dir = join(nm, rel);
        if (lstatSync(dir).isSymbolicLink()) continue;
        const file = join(dir, "package.json");
        if (!existsSync(file)) continue;
        const pkg = JSON.parse(readFileSync(file, "utf8"));
        out.push({ kind: "npm", name: pkg.name ?? rel, version: pkg.version ?? "?", license: licenseOf(pkg) });
      }
    }
  }
  return out;
}

function main(argv) {
  const args = { cargo: [], npmRoot: join(ROOT, "node_modules", ".pnpm"), exceptions: join(ROOT, "scripts", "licences-acceptees.json") };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    if (a === "--cargo-json" && v !== undefined) args.cargo.push(argv[++i]);
    else if (a === "--npm-root" && v !== undefined) args.npmRoot = argv[++i];
    else if (a === "--exceptions" && v !== undefined) args.exceptions = argv[++i];
    else {
      console.error(`controle-licences : option inconnue ${a}`);
      return 2;
    }
  }
  const metas = [];
  if (args.cargo.length > 0) {
    for (const f of args.cargo) metas.push(JSON.parse(readFileSync(f, "utf8")));
  } else {
    try {
      metas.push(cargoMetadata(null));
    } catch (e) {
      console.error(`licences : cargo metadata du workspace impossible (${e instanceof Error ? e.message.split("\n")[0] : e})`);
      return 1;
    }
    try {
      metas.push(cargoMetadata(join(ROOT, "apps", "desktop", "src-tauri", "Cargo.toml")));
    } catch {
      console.log("licences : src-tauri non contrôlé (métadonnées hors ligne absentes)");
    }
  }
  const exceptions = JSON.parse(readFileSync(args.exceptions, "utf8"));
  const members = memberKeys(metas);
  const seen = new Set();
  const all = [];
  for (const p of [...metas.flatMap((m) => cargoPackages(m, members)), ...npmPackages(args.npmRoot)]) {
    const key = `${p.kind} ${p.name} ${p.version} ${p.license}`;
    if (!seen.has(key)) {
      seen.add(key);
      all.push(p);
    }
  }
  const crates = all.filter((p) => p.kind === "cargo").length;
  const npm = all.length - crates;
  if (npm === 0) {
    console.error(`licences : relevé npm vide (${args.npmRoot}) : échec (pnpm install d'abord)`);
    return 1;
  }
  let gaps = 0;
  let excused = 0;
  for (const p of all) {
    const exc = exceptions[p.kind]?.[p.name];
    if (exc && exc.licence === p.license) {
      excused += 1;
      continue;
    }
    let why = null;
    if (p.license === null || p.license.trim() === "") why = "licence absente";
    else {
      try {
        if (!permitted(parseSpdx(p.license))) why = p.license;
      } catch (e) {
        why = `expression illisible (${e.message})`;
      }
    }
    if (why !== null) {
      gaps += 1;
      console.error(`licences : ÉCART ${p.kind} ${p.name} ${p.version} : ${why}`);
    }
  }
  console.log(`licences : ${crates} crates, ${npm} paquets npm contrôlés, ${excused} exception(s)`);
  if (gaps > 0) return 1;
  console.log("controle-licences : OK");
  return 0;
}

process.exitCode = main(process.argv.slice(2));
