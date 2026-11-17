#!/usr/bin/env node
// Scénario S2 au navigateur, partie du lot 3 (cadrage § 6 ; plan du lot 3, T25) : l'application web construite
// (apps/web/dist) servie en local, Chromium headless de Playwright, souris simulée. Trois traits, gomme au milieu du
// deuxième, Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z, boutons de la barre ; lit le nombre d'éléments (#stage[data-elements]) et les
// pixels d'encre du canvas de scène. Hors de scripts/verifier.sh : exige Playwright (cache npx) et son Chromium.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/s2-navigateur.mjs [--capture docs/essais/s2-lot3-vm.png]
import { existsSync, readdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DIST = join(ROOT, "apps", "web", "dist");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

class Echec extends Error {}

function captureTarget(argv) {
  const i = argv.indexOf("--capture");
  if (i < 0) return null;
  return resolve(ROOT, argv[i + 1] ?? "docs/essais/s2-lot3-vm.png");
}

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  const npx = join(homedir(), ".npm", "_npx");
  if (existsSync(npx)) {
    for (const d of readdirSync(npx)) candidates.push(join(npx, d, "node_modules", "playwright", "index.mjs"));
  }
  const found = candidates.find((c) => existsSync(c));
  return found ? import(pathToFileURL(found).href) : null;
}

function serve() {
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
      res.writeHead(200, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function scenario(page, port, capture) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const frames = () =>
    page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))));
  const elements = async () => Number(await page.getAttribute("#stage", "data-elements"));
  const disabled = (action) => page.$eval(`#barre button[data-action="${action}"]`, (b) => b.disabled);
  // Pixels d'encre (somme RVB < 300) dans une boîte en px CSS du canvas de scène.
  const ink = (box) =>
    page.$eval(
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
  const drag = async (points) => {
    const [first, ...rest] = points;
    await page.mouse.move(first[0], first[1]);
    await page.mouse.down();
    for (const [x, y] of rest) await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.up();
    await frames();
  };
  const press = async (keys) => {
    await page.keyboard.press(keys);
    await frames();
  };
  const click = async (action) => {
    await page.click(`#barre button[data-action="${action}"]`);
    await frames();
  };

  await page.goto(`http://127.0.0.1:${port}/`);
  try {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  } catch {
    throw new Echec(`l'application ne démarre pas (#stage[data-ready="1"] absent) ${errors.join(" | ")}`);
  }
  await frames();

  const MID = [645, 340, 655, 360]; // milieu du deuxième trait (y = 350), sous la gomme
  const REST = [450, 340, 500, 360]; // partie gauche du deuxième trait, loin de la gomme

  check((await elements()) === 0, "page vide au démarrage");
  check(await disabled("undo"), "Annuler désactivé sur un document neuf");
  await press("Control+z");
  check((await elements()) === 0 && (await page.textContent("#etat")) === "", "Ctrl+Z sur un document neuf : rien, aucune erreur");

  for (const y of [250, 350, 450]) await drag([[400, y], [650, y], [900, y]]);
  check((await elements()) === 3, "trois traits tracés à la souris");
  check((await ink(MID)) > 0, "encre visible au milieu du deuxième trait");

  await click("eraser");
  check((await page.getAttribute('#barre button[data-action="eraser"]', "aria-pressed")) === "true", "gomme choisie dans la barre");
  await drag([[650, 310], [650, 350], [650, 390]]);
  check((await elements()) === 4, "gomme en travers du deuxième trait : il reste quatre traits");
  check((await ink(MID)) === 0, "l'encre a disparu sous la gomme");
  check((await ink(REST)) > 0, "le reste du deuxième trait est toujours là");

  await press("Control+z");
  check((await elements()) === 3, "Ctrl+Z : trois traits");
  check((await ink(MID)) > 0, "Ctrl+Z : l'encre revient");
  await press("Control+y");
  check((await elements()) === 4 && (await ink(MID)) === 0, "Ctrl+Y : quatre traits, encre de nouveau effacée");
  await press("Control+z");
  await press("Control+Shift+z");
  check((await elements()) === 4, "Ctrl+Maj+Z : rétablit aussi");
  await click("undo");
  check((await elements()) === 3, "bouton Annuler");
  await click("redo");
  check((await elements()) === 4, "bouton Rétablir");
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);

  if (capture) {
    await page.screenshot({ path: capture });
    console.log(`capture : ${capture}`);
  }
}

async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.error("S2 lot 3 : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)");
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(
      "S2 lot 3 : outil absent — Playwright introuvable (le poser : npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=<chemin de playwright/index.mjs>)",
    );
    return 2;
  }
  const server = await serve();
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`S2 lot 3 : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await scenario(page, server.address().port, captureTarget(process.argv.slice(2)));
    console.log("S2 lot 3 : OK");
    return 0;
  } catch (e) {
    console.error(`S2 lot 3 : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exitCode = await main();
