// Outils communs des scripts d'essai au navigateur (lot 4, T57). Repris à l'identique de s2-navigateur.mjs
// (même cache npx, même PLAYWRIGHT_MODULE, mêmes types MIME) . Migrés : s2, fichiers (lot 5b, T85) et s34.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { deflateSync, inflateRawSync } from "node:zlib";

export const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const DIST = join(ROOT, "apps", "web", "dist");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

export class Echec extends Error {}

export async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  const npx = join(homedir(), ".npm", "_npx");
  if (existsSync(npx)) {
    for (const d of readdirSync(npx)) candidates.push(join(npx, d, "node_modules", "playwright", "index.mjs"));
  }
  const found = candidates.find((c) => existsSync(c));
  return found ? import(pathToFileURL(found).href) : null;
}

/** `headers` : en-têtes ajoutés à chaque réponse 200 (ex. la CSP de la coque). */
export function serve({ headers = {} } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url ?? "/", "http://local").pathname);
      const rel = normalize(path).replace(/^[/\\]+/, "");
      const file = join(DIST, rel === "" ? "index.html" : rel);
      if (file !== DIST && !file.startsWith(DIST + sep)) {
        res.writeHead(403).end();
        return;
      }
      const target = (await stat(file)).isDirectory() ? join(file, "index.html") : file;
      const body = await readFile(target);
      res.writeHead(200, { ...headers, "content-type": TYPES[extname(target)] ?? "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

export function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "inconnu";
  }
}

/** Deux images d'animation : laisse la scène se redessiner. */
export function frames(page) {
  return page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
}

/** Pixels d'une boîte [x0, y0, x1, y1] en px CSS du canvas de scène `#scene` : d'encre (somme RVB < `max`, défaut 300),
 *  ou, si `rgb` est donné, proches de cette couleur à `tol` près par composante (C6a, D27). */
export function inkIn(page, box, opts = {}) {
  const { max = 300, rgb = null, tol = 40 } = opts;
  return page.$eval(
    "#scene",
    (c, [[x0, y0, x1, y1], max, rgb, tol]) => {
      const ctx = c.getContext("2d");
      const sx = c.width / c.clientWidth;
      const sy = c.height / c.clientHeight;
      const w = Math.max(1, Math.round((x1 - x0) * sx));
      const h = Math.max(1, Math.round((y1 - y0) * sy));
      const d = ctx.getImageData(Math.round(x0 * sx), Math.round(y0 * sy), w, h).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const hit = rgb === null
          ? d[i] + d[i + 1] + d[i + 2] < max
          : Math.abs(d[i] - rgb[0]) <= tol && Math.abs(d[i + 1] - rgb[1]) <= tol && Math.abs(d[i + 2] - rgb[2]) <= tol;
        if (hit) n++;
      }
      return n;
    },
    [box, max, rgb, tol],
  );
}

/** Fenêtre de tous les essais du lot 5b : la scène doit garder au moins 640 px de haut sous les barres. */
export const VIEWPORT = { width: 1280, height: 900 };
/** Bouton d'un élément de barre (CL5b-11). */
export const item = (id) => `button[data-item="${id}"]`;
/** Rectangle de #stage (px de page) ; Echec si absent ou plus bas que `minHeight`. */
export async function stageBox(page, minHeight = 640) {
  const b = await page.locator("#stage").boundingBox();
  if (!b) throw new Echec("#stage absent");
  if (b.height < minHeight) throw new Echec(`scène trop basse : ${b.height} px < ${minHeight} (barres sur plusieurs lignes ?)`);
  return b;
}
/** Point de page d'un point de scène : les gestes des scénarios sont écrits en px de la scène (origine = coin de #stage). */
export const onStage = (box, x, y) => [box.x + x, box.y + y];
/** Souris dont les coordonnées sont en px de la scène (rectangle de #stage relu à chaque geste). */
export function stageMouse(page) {
  const at = async (x, y) => onStage(await stageBox(page), x, y);
  return {
    move: async (x, y, o) => page.mouse.move(...(await at(x, y)), o),
    click: async (x, y, o) => page.mouse.click(...(await at(x, y)), o),
    down: (o) => page.mouse.down(o),
    up: (o) => page.mouse.up(o),
    wheel: (dx, dy) => page.mouse.wheel(dx, dy),
  };
}
/** Vrai si les deux rectangles ne se chevauchent pas (tolérance 0,5 px). */
function apart(a, b) {
  return a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
}
/** Chaque élément `selector` (ex. `button[data-item]`) hors du rectangle de #stage ; rend la liste des fautifs. */
export async function overlapping(page, selector, stageSelector = "#stage") {
  const stage = await page.locator(stageSelector).boundingBox();
  if (!stage) throw new Echec(`rectangle absent : ${stageSelector}`);
  const bad = [];
  for (const el of await page.locator(selector).all()) {
    const a = await el.boundingBox();
    if (!a) continue; // élément caché : ne recouvre rien
    if (!apart(a, stage)) bad.push((await el.getAttribute("data-item")) ?? selector);
  }
  return bad;
}
/** Rectangles de la barre et de la scène ; `apart` vrai s'ils ne se chevauchent pas. */
export async function noOverlap(page, barSelector, stageSelector = "#stage") {
  const [a, b] = await Promise.all([page.locator(barSelector).boundingBox(), page.locator(stageSelector).boundingBox()]);
  if (!a || !b) throw new Echec(`rectangle absent : ${!a ? barSelector : stageSelector}`);
  return { apart: apart(a, b), bar: a, stage: b };
}
/** Dépôt simulé (DataTransfer construit dans la page) sur un sélecteur. */
export async function dropFile(page, selector, name, bytes, type = "", at = [50, 50]) {
  await page.evaluate(({ selector, name, bytes, type, at }) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], name, { type }));
    const target = document.querySelector(selector);
    const r = target.getBoundingClientRect();
    for (const t of ["dragover", "drop"]) {
      target.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.x + at[0], clientY: r.y + at[1] }));
    }
  }, { selector, name, bytes: Array.from(bytes), type, at });
}
/** Dépôt simulé de plusieurs fichiers ensemble (C15, X13) : un seul DataTransfer, un seul `drop`. */
export async function dropFiles(page, selector, files, at = [50, 50]) {
  await page.evaluate(({ selector, files, at }) => {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(new File([new Uint8Array(f.bytes)], f.name, { type: f.type ?? "" }));
    const target = document.querySelector(selector);
    const r = target.getBoundingClientRect();
    for (const t of ["dragover", "drop"]) {
      target.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.x + at[0], clientY: r.y + at[1] }));
    }
  }, { selector, files: files.map((f) => ({ name: f.name, type: f.type ?? "", bytes: Array.from(f.bytes) })), at });
}
/** Onglets de la barre (`[data-tab]` seul attrape aussi les scènes cachées `.rb-stage[data-tab]`). */
export const TAB = '[role="tab"][data-tab]';

/** CSP de la coque (`apps/desktop/src-tauri/tauri.conf.json`), envoyée telle quelle par le serveur d'essai (R22) : un
 *  défaut de CSP se voit dans l'essai. Seule copie (R22 de C7b, F31 de C10b) : les essais l'importent. */
export function coqueCsp() {
  const conf = JSON.parse(readFileSync(join(ROOT, "apps", "desktop", "src-tauri", "tauri.conf.json"), "utf8"));
  const csp = conf.app.security.csp;
  return Object.entries(csp).map(([d, v]) => `${d} ${Array.isArray(v) ? v.join(" ") : v}`).join("; ");
}

// PNG fabriqués par les essais (C2, C6a, C5 ; I34) : RVB 8 bits, une ligne filtrée 0 par rangée ; jamais téléchargés.
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** PNG RVB 8 bits `w × h` ; `at(x, y)` rend la couleur [r, g, b] du pixel. */
export function rgbPng(w, h, at) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.concat(
    Array.from({ length: h }, (_, y) => {
      const row = Buffer.alloc(1 + 3 * w);
      for (let x = 0; x < w; x++) row.set(at(x, y), 1 + 3 * x);
      return row;
    }),
  );
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
/** PNG RVB 8 bits d'une seule couleur. */
export const solidPng = (w, h, rgb) => rgbPng(w, h, () => rgb);
/** Entrées d'un ZIP (.roomboard) par son répertoire central : nom → octets (stored ou deflate). Repris de
 *  `c2-image-navigateur.mjs` et `c14-media-navigateur.mjs`, qui en avaient deux copies (C6b, B24). */
export function zipEntries(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Echec("fichier enregistré : ZIP sans répertoire central");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Echec("fichier enregistré : répertoire central illisible");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    out.set(name, method === 0 ? Buffer.from(data) : inflateRawSync(data));
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

/** Empreinte SHA-256 en hexadécimal minuscule (nom d'entrée `assets/<sha>.<ext>`). */
export const sha256 = (b) => createHash("sha256").update(b).digest("hex");
