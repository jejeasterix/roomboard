#!/usr/bin/env node
// Contrôle hors ligne (cadrage D27) : aucune ressource réseau à l'exécution.
// (1) Aucun nom d'hôte distant dans le dist de l'application (html, js, css, json, svg ; le .wasm est exclu : binaire,
//     il ne charge rien lui-même). (2) CSP de la coque en objet : default-src 'self', script-src avec
//     'wasm-unsafe-eval' et sans 'unsafe-inline', aucune source distante, aucun joker ni schéma nu, pas d'unsafe-eval.
// Usage : node scripts/controle-hors-ligne.mjs <dossier dist> <tauri.conf.json>   (0 : OK ; 1 : écart)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const TEXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt", ".webmanifest"]);
/** Hôtes cités mais jamais chargés, chacun avec sa raison : toute entrée nouvelle se justifie ici. */
export const NON_FETCHED_HOSTS = new Map([["www.w3.org", "espaces de noms XML (SVG, XHTML), jamais chargés"]]);
const URL_RE = /\b(?:https?|wss?):\/\/([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
const FORBIDDEN_TOKENS = new Set(["*", "http:", "https:", "ws:", "wss:", "'unsafe-eval'"]);

export function remoteHosts(text) {
  const found = new Set();
  for (const m of text.matchAll(URL_RE)) {
    const host = m[1].toLowerCase();
    if (host.endsWith(".localhost") || host.startsWith("127.") || NON_FETCHED_HOSTS.has(host)) continue;
    found.add(host);
  }
  return [...found].sort();
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

export function checkDist(dir) {
  const errors = [];
  let scanned = 0;
  for (const f of walk(dir)) {
    if (!TEXT.has(extname(f))) continue;
    scanned += 1;
    const hosts = remoteHosts(readFileSync(f, "utf8"));
    if (hosts.length > 0) errors.push(`${relative(dir, f)} : hôte distant ${hosts.join(", ")}`);
  }
  if (scanned === 0) errors.push(`${dir} : aucun fichier texte (build absent ?)`);
  return { errors, scanned };
}

export function checkCsp(conf) {
  const csp = conf?.app?.security?.csp;
  if (csp === null || csp === undefined || typeof csp !== "object" || Array.isArray(csp)) {
    return [`csp : objet de directives attendu (D27), trouvé ${JSON.stringify(csp ?? null)}`];
  }
  const errors = [];
  const tokens = (d) => (Array.isArray(csp[d]) ? csp[d].join(" ") : String(csp[d] ?? "")).split(/\s+/).filter(Boolean);
  if (tokens("default-src").join(" ") !== "'self'") errors.push("default-src doit valoir 'self'");
  const script = tokens("script-src");
  if (!script.includes("'wasm-unsafe-eval'")) errors.push("script-src sans 'wasm-unsafe-eval' (le cœur Wasm ne se charge pas)");
  if (script.includes("'unsafe-inline'")) errors.push("script-src avec 'unsafe-inline'");
  for (const d of Object.keys(csp)) {
    const list = tokens(d);
    for (const t of list) if (FORBIDDEN_TOKENS.has(t)) errors.push(`${d} : source interdite ${t}`);
    const hosts = remoteHosts(list.join(" "));
    if (hosts.length > 0) errors.push(`${d} : hôte distant ${hosts.join(", ")}`);
  }
  return errors;
}

function main(argv) {
  const [dist, confPath] = argv;
  if (!dist || !confPath) {
    console.error("usage : node scripts/controle-hors-ligne.mjs <dist> <tauri.conf.json>");
    return 1;
  }
  const { errors, scanned } = checkDist(dist);
  errors.push(...checkCsp(JSON.parse(readFileSync(confPath, "utf8"))));
  if (errors.length > 0) {
    for (const e of errors) console.error(`controle-hors-ligne : ${e}`);
    return 1;
  }
  console.log(`controle-hors-ligne : OK (${scanned} fichiers sans hôte distant, CSP stricte)`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
