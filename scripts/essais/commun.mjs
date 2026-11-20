// Outils communs des scripts d'essai au navigateur (lot 4, T57). Repris à l'identique de s2-navigateur.mjs
// (même cache npx, même PLAYWRIGHT_MODULE, mêmes types MIME) . Migrés : s2, fichiers (lot 5b, T85) et s34.
import { existsSync, readdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

/** Pixels d'encre (somme RVB < 300) dans une boîte [x0, y0, x1, y1] en px CSS du canvas de scène `#scene`. */
export function inkIn(page, box) {
  return page.$eval(
    "#scene",
    (c, [x0, y0, x1, y1]) => {
      const ctx = c.getContext("2d");
      const sx = c.width / c.clientWidth;
      const sy = c.height / c.clientHeight;
      const w = Math.max(1, Math.round((x1 - x0) * sx));
      const h = Math.max(1, Math.round((y1 - y0) * sy));
      const d = ctx.getImageData(Math.round(x0 * sx), Math.round(y0 * sy), w, h).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 300) n++;
      return n;
    },
    box,
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
/** Chaque élément `selector` (ex. `button[data-item]`) hors du rectangle de #stage ; rend la liste des fautifs. */
export async function overlapping(page, selector, stageSelector = "#stage") {
  const stage = await page.locator(stageSelector).boundingBox();
  if (!stage) throw new Echec(`rectangle absent : ${stageSelector}`);
  const bad = [];
  for (const el of await page.locator(selector).all()) {
    const a = await el.boundingBox();
    if (!a) continue; // élément caché : ne recouvre rien
    const apart = a.x + a.width <= stage.x + 0.5 || stage.x + stage.width <= a.x + 0.5 || a.y + a.height <= stage.y + 0.5 || stage.y + stage.height <= a.y + 0.5;
    if (!apart) bad.push((await el.getAttribute("data-item")) ?? selector);
  }
  return bad;
}
/** Rectangles de la barre et de la scène ; `apart` vrai s'ils ne se chevauchent pas. */
export async function noOverlap(page, barSelector, stageSelector = "#stage") {
  const [a, b] = await Promise.all([page.locator(barSelector).boundingBox(), page.locator(stageSelector).boundingBox()]);
  if (!a || !b) throw new Echec(`rectangle absent : ${!a ? barSelector : stageSelector}`);
  const apart = a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
  return { apart, bar: a, stage: b };
}
/** Dépôt simulé (DataTransfer construit dans la page) sur un sélecteur. */
export async function dropFile(page, selector, name, bytes, type = "") {
  await page.evaluate(({ selector, name, bytes, type }) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], name, { type }));
    const target = document.querySelector(selector);
    const r = target.getBoundingClientRect();
    for (const t of ["dragover", "drop"]) {
      target.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.x + 50, clientY: r.y + 50 }));
    }
  }, { selector, name, bytes: Array.from(bytes), type });
}
/** Onglets de la barre (`[data-tab]` seul attrape aussi les scènes cachées `.rb-stage[data-tab]`). */
export const TAB = '[role="tab"][data-tab]';
