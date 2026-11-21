#!/usr/bin/env node
// Contrôle hors ligne (cadrage D27) : aucune ressource réseau à l'exécution.
// (1) Aucun nom d'hôte distant dans le dist de l'application (html, js, css, json, svg ; le .wasm est exclu : binaire,
//     il ne charge rien lui-même). (2) CSP de la coque en objet : default-src 'self', script-src avec
//     'wasm-unsafe-eval' et sans 'unsafe-inline', aucune source distante, aucun joker ni schéma nu, pas d'unsafe-eval.
// (3) Dépôts hors de la portée fs (scopeDroppedPaths: false) et dépôt gardé sur la fenêtre main (dragDropEnabled).
// Usage : node scripts/controle-hors-ligne.mjs <dossier dist> <tauri.conf.json>   (0 : OK ; 1 : écart)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const TEXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt", ".webmanifest"]);
/** Hôtes cités mais jamais chargés, chacun avec sa raison : toute entrée nouvelle se justifie ici. */
export const NON_FETCHED_HOSTS = new Map([
  ["www.w3.org", "espaces de noms XML (SVG, XHTML), jamais chargés"],
  ["example.com", "base d'URL fictive de pdf.js pour analyser une adresse relative (C12), jamais chargée"],
  ["foo.bar", "base d'URL fictive de pdf.js pour analyser une adresse relative (C12), jamais chargée"],
  ["github.com", "licence de core-js citée par pdf.js et nom de producteur de pdf-lib (C12), jamais chargés"],
  ["ns.adobe.com", "espaces de noms XFA et XMP comparés comme chaînes par pdf.js (C12), jamais chargés"],
  ["i.test", "fin de l'expression /^https?:\\/\\//i.test de three (LoaderUtils.js), lue comme un hôte ; .test est réservé (RFC 2606), jamais chargé (C15)"],
  ["www.xfa.org", "espaces de noms XFA comparés comme chaînes par pdf.js (C12), jamais chargés"],
]);
// Schéma explicite (insensible à la casse) ou `//hôte` sans schéma (précédé ni de « : », ni d'un caractère de mot, ni de « / »).
const URL_RE = /(?:\b(?:https?|wss?):\/\/|(?<![:\w/])\/\/)([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/gi;
const FORBIDDEN_TOKENS = new Set(["*", "http:", "https:", "ws:", "wss:", "'unsafe-eval'"]);
/** Schémas sans hôte admis, et les seules directives où ils le sont. */
const SCHEME_TOKENS = new Map([
  ["ipc:", new Set(["connect-src"])],
  ["data:", new Set(["img-src", "font-src", "media-src"])],
  ["blob:", new Set(["img-src", "media-src", "connect-src"])],
  ["asset:", new Set(["media-src"])],
]);
const SCRIPT_TOKENS = new Set(["'self'", "'wasm-unsafe-eval'"]);
const isLocalHost = (h) => h === "localhost" || h.endsWith(".localhost") || /^127(?:\.\d{1,3}){3}$/.test(h);

export function remoteHosts(text) {
  const found = new Set();
  for (const m of text.matchAll(URL_RE)) {
    const host = m[1].toLowerCase();
    if (isLocalHost(host) || NON_FETCHED_HOSTS.has(host)) continue;
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
  for (const d of Object.keys(csp)) {
    if (!d.startsWith("script-src")) continue;
    for (const t of tokens(d)) if (!SCRIPT_TOKENS.has(t)) errors.push(`${d} : seuls 'self' et 'wasm-unsafe-eval' sont admis, trouvé ${t}`);
  }
  for (const d of Object.keys(csp)) {
    const list = tokens(d);
    for (const t of list) if (FORBIDDEN_TOKENS.has(t)) errors.push(`${d} : source interdite ${t}`);
    for (const t of list) {
      if (FORBIDDEN_TOKENS.has(t)) continue;
      if (/^'[a-z-]+'$/.test(t)) continue; // mot-clé entre quotes
      if (SCHEME_TOKENS.has(t)) {
        if (!SCHEME_TOKENS.get(t).has(d)) errors.push(`${d} : schéma ${t} non admis ici`);
        continue;
      }
      const host = t.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, "").replace(/[/?#].*$/, "").replace(/:(?:\d+|\*)$/, "").toLowerCase();
      // Forme Windows et Android de `asset:` : admise dans media-src seulement, comme `asset:`.
      if (host === "asset.localhost" && d !== "media-src") {
        errors.push(`${d} : source ${t} non admise ici (media-src seulement)`);
        continue;
      }
      if (isLocalHost(host.replace(/^\*\./, "x."))) continue;
      errors.push(`${d} : source non locale ou inconnue ${t}`);
    }
  }
  return errors;
}

/**
 * tauri-plugin-fs 2.7.1 ajoute de lui-même à sa portée tout chemin déposé sur la fenêtre, dossiers compris et
 * récursivement (`scopeDroppedPaths`, vrai par défaut, `src/config.rs:19-23`, `src/lib.rs:629-646`). Avec
 * `fs:allow-read-file` et `fs:allow-write-file`, un dossier glissé deviendrait lisible et inscriptible par la page.
 */
export function checkFsScope(conf) {
  if (conf?.plugins?.fs?.scopeDroppedPaths === false) return [];
  return ["plugins.fs.scopeDroppedPaths doit valoir false (un dossier déposé entrerait dans la portée fs de la page)"];
}

/**
 * Le dépôt passe par la coque (lot 5b, CL5b-13) : elle accorde les fichiers déposés sur la fenêtre `main`, puis les
 * annonce à la page. `dragDropEnabled: false` sur cette fenêtre couperait l'entrée des fichiers. Une fenêtre sans
 * `label` est nommée `main` par Tauri.
 */
export function checkDragDrop(conf) {
  const windows = Array.isArray(conf?.app?.windows) ? conf.app.windows : [];
  return windows
    .filter((w) => (w?.label ?? "main") === "main" && w?.dragDropEnabled === false)
    .map(() => "app.windows[main].dragDropEnabled doit valoir true (le dépôt des fichiers passe par la coque)");
}

/**
 * Protocole d'assets (C14, M27-M29) : la coque accorde chaque vidéo liée par `allow_file`, la configuration ne doit
 * donc porter aucune portée statique. Activation (`app.security.assetProtocol.enable`) et feature `protocol-asset`
 * de tauri (src-tauri/Cargo.toml) vont ensemble.
 */
export function checkAssetProtocol(conf, cargoToml) {
  const ap = conf?.app?.security?.assetProtocol;
  const enabled = ap?.enable === true;
  const feature = /^\s*tauri\s*=\s*\{[^}]*["']protocol-asset["']/m.test(cargoToml ?? "");
  const errors = [];
  if (enabled && !(Array.isArray(ap.scope) && ap.scope.length === 0)) {
    errors.push("app.security.assetProtocol.scope doit être vide (chaque fichier lié est accordé par la coque)");
  }
  if (enabled && !feature) errors.push("assetProtocol activé sans la feature protocol-asset de tauri (src-tauri/Cargo.toml)");
  if (!enabled && feature) errors.push("feature protocol-asset de tauri sans app.security.assetProtocol.enable");
  return errors;
}

/**
 * Office (C16, O29, O36) : l'original s'ouvre depuis Rust (crate `open`) et le relevé des enregistrements se fait en
 * Rust : ni `tauri-plugin-opener`, ni feature `watch` de `tauri-plugin-fs`, ni permission `opener:*` ou `fs:*watch`.
 */
export function checkOpener(cargoToml, capabilities) {
  const toml = cargoToml ?? "";
  const errors = [];
  if (/tauri-plugin-opener/.test(toml)) errors.push("tauri-plugin-opener dans src-tauri/Cargo.toml (l'original s'ouvre depuis Rust, crate open)");
  if (/^\s*tauri-plugin-fs\s*=\s*\{[^}]*["']watch["']/m.test(toml)) errors.push("feature watch de tauri-plugin-fs (le relevé des originaux se fait en Rust)");
  const perms = Array.isArray(capabilities?.permissions) ? capabilities.permissions : [];
  for (const p of perms) {
    const id = typeof p === "string" ? p : typeof p?.identifier === "string" ? p.identifier : "";
    if (id.startsWith("opener:") || /^fs:(allow|deny)-(un)?watch$/.test(id)) errors.push(`permission ${id} interdite (C16 : aucune permission pour la page)`);
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
  const conf = JSON.parse(readFileSync(confPath, "utf8"));
  let cargoToml = "";
  try {
    cargoToml = readFileSync(join(dirname(confPath), "Cargo.toml"), "utf8");
  } catch {
    cargoToml = "";
  }
  let capabilities = null;
  try {
    capabilities = JSON.parse(readFileSync(join(dirname(confPath), "capabilities", "default.json"), "utf8"));
  } catch {
    capabilities = null;
  }
  errors.push(...checkCsp(conf), ...checkFsScope(conf), ...checkDragDrop(conf), ...checkAssetProtocol(conf, cargoToml), ...checkOpener(cargoToml, capabilities));
  if (errors.length > 0) {
    for (const e of errors) console.error(`controle-hors-ligne : ${e}`);
    return 1;
  }
  console.log(`controle-hors-ligne : OK (${scanned} fichiers sans hôte distant, CSP stricte, dépôts hors de la portée fs, dépôt sur main)`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
