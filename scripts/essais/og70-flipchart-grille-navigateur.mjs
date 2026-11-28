#!/usr/bin/env node
// Essai OG70 (G11) au navigateur : un .flipchart fabriqué (fabrique de T12, jamais un fichier d'exemple) porte une grille
// ActivInspire de trois niveaux (carreaux fins, carreaux forts, un niveau à 45°) et un rectangle. Déposé dans
// l'application construite, servie avec la CSP de la coque, Chromium headless, repli (`?fichiers=repli`), heure figée :
// la grille est dessinée (pixels de sa couleur), seul le niveau à 45° est averti, l'enregistrement en .roomboard puis la
// réouverture gardent la grille. Toute requête hors de 127.0.0.1 est comptée et coupée. Lancé par verifier.sh --e2e.
// Code : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/og70-flipchart-grille-navigateur.mjs [--dist <dossier>] [--avant] [--capture <png>]
// --avant : constat d'un build d'avant G11 (avis « grille non lue », aucune grille) ; --capture : capture 2x de la scène.
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { coqueCsp, DIST, dropFile, Echec, foldOptions, frames, inkIn, loadPlaywright, serve, TAB, VIEWPORT } from "./commun.mjs";
import { makeFlipchart } from "./fabriques/flipchart.mjs";

const LABEL = "OG70 grille .flipchart";
const FIXED = new Date("2026-11-28T08:00:00.000Z");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : process.argv[i + 1] ?? null;
};
const dist = resolve(arg("--dist") ?? DIST);
const capture = arg("--capture");
const avant = process.argv.includes("--avant");

const FINE = 0x94a3b8;
const STRONG = 0x475569;
/** Page de 1 024 × 768 : carreaux de 32 gris clair, carreaux forts de 160, un niveau à 45° (averti), un rectangle. */
const lesson = () =>
  Buffer.from(
    makeFlipchart(
      [
        {
          grid: {
            shown: true,
            snap: true,
            levels: [
              { line: 3, step: [32], color: FINE },
              { line: 3, step: [160], color: STRONG, snap: false },
              { layout: 2, step: [64] },
            ],
          },
          rects: [{ x: 96, y: 96, w: 192, h: 128, fill: 0x3366cc }],
        },
      ],
      deflateSync,
    ),
  );
const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

async function scenario(page, url, tmp) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    return d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(`${msg} ; avis : ${JSON.stringify(dialogs)} ; erreurs : ${errors.join(" | ")}`);
    console.log(`ok — ${msg}`);
  };
  const attr = (name) => page.getAttribute("#stage", name);
  const waitAttr = (name, v) =>
    page.waitForFunction(([n, v]) => document.querySelector("#stage")?.getAttribute(n) === v, [name, v], { timeout: 30000 }).catch(async () => {
      throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} » ; avis : ${JSON.stringify(dialogs)} ; erreurs : ${errors.join(" | ")}`);
    });
  const tabs = () => page.locator(TAB).count();
  const drop = async (name, bytes) => {
    const n = await tabs();
    await dropFile(page, "#stage", name, bytes, "");
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n + 1, { timeout: 30000 });
    await waitAttr("data-elements", "1");
    await page.waitForTimeout(400);
    await frames(page);
    await frames(page);
  };
  // Boîte de la page entre deux lignes fortes, hors du rectangle : en coordonnées de page RoomBoard (× 1 920 / 1 024).
  const gridInk = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    const k = 1920 / 1024;
    const box = [400 * k, 300 * k, 600 * k, 460 * k].map((v, i) => v * zoom + (i % 2 === 0 ? tx : ty));
    return { fine: await inkIn(page, box, { rgb: rgb(FINE), tol: 24 }), strong: await inkIn(page, box, { rgb: rgb(STRONG), tol: 24 }) };
  };

  await foldOptions(page);
  await page.goto(url);
  await page.waitForSelector("#stage");
  await drop("grille.flipchart", lesson());
  const ink = await gridInk();
  if (avant) {
    check(dialogs.some((d) => d.includes("grille non lue")), "avant : avis « grille non lue »");
    check(ink.fine === 0 && ink.strong === 0, `avant : aucune grille dessinée (${ink.fine} et ${ink.strong} pixels)`);
  } else {
    check(!dialogs.some((d) => d.includes("grille non lue")), "après : aucun avis « grille non lue »");
    check(dialogs.some((d) => d.includes("page 1 : 1 niveau de grille oblique (45° ou angle libre) non lu")), "après : seul le niveau à 45° est averti");
    check(ink.fine > 100 && ink.strong > 50, `après : carreaux fins (${ink.fine} pixels) et forts (${ink.strong} pixels) dessinés`);
  }
  if (capture !== null) {
    await page.locator("#stage").screenshot({ path: capture });
    console.log(`capture : ${capture}`);
  }
  if (avant) return;
  // Aller-retour .roomboard : la grille fait partie du document.
  const dl = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const saved = join(tmp, "grille.roomboard");
  await (await dl).saveAs(saved);
  const k = dialogs.length;
  await drop("grille.roomboard", await readFile(saved));
  check(dialogs.length === k, "après : enregistré en .roomboard puis rouvert sans avis");
  const again = await gridInk();
  check(again.fine > 100 && again.strong > 50, `après : grille redessinée à la réouverture (${again.fine} et ${again.strong} pixels)`);
  check(errors.length === 0, "après : aucune erreur de console");
}

async function main() {
  const pw = await loadPlaywright();
  if (pw === null || !existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : outil absent — Playwright ou ${dist}/index.html`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() }, dist });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-og70-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: capture === null ? 1 : 2, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, tmp);
    if (external.length > 0) throw new Echec(`requêtes hors de 127.0.0.1 : ${external.join(", ")}`);
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
