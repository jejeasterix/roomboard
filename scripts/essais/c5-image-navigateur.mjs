#!/usr/bin/env node
// Essai C5 « édition d'image non destructive » au navigateur (S1, S2 du cadrage usage-c5-image). Application construite
// (apps/web/dist) servie avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure
// figée. PNG fabriqué ici (fond blanc, anneau rouge fermé à intérieur blanc), jamais téléchargé. Oracles : couleurs lues
// dans `#scene` (`inkIn` avec `rgb`), attributs de `#stage` (`data-image`, `data-pixels`, `data-bounds`) ; aucune requête
// hors de 127.0.0.1. Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c5-image-navigateur.mjs [--captures]
// (--captures : docs/essais/c5-image-rognee-transparente.png).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, rgbPng, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C5 image";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
const W = 200;
const H = 150;
const RED = [220, 38, 38];
const WHITE = [255, 255, 255];
const BLUE = [29, 78, 216];
const LIGHT_RED = [255, 166, 166];
/** Points de la scène (px de la scène, caméra du premier onglet). */
const VOID = [1100, 560];
const DROP1 = [400, 360];
const DROP2 = [700, 380];
/** Points de la boîte affichée (pixels source) : coin blanc, centre de l'anneau, pixel de l'anneau. */
const CORNER = [12, 12];

/** 200 × 150 : fond blanc, anneau rouge fermé (rayons 30 à 45 autour de (100, 75)), intérieur blanc. */
const ringPng = () =>
  rgbPng(W, H, (x, y) => {
    const d = Math.hypot(x + 0.5 - 100, y + 0.5 - 75);
    return d >= 30 && d <= 45 ? RED : WHITE;
  });

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const press = async (k) => {
    await page.keyboard.press(k);
    await fr();
  };
  const waitAttr = (name, v) =>
    page
      .waitForFunction(([n, w]) => document.querySelector("#stage")?.getAttribute(n) === w, [name, v], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
      });
  /** Attend qu'une sonde devienne vraie (15 s au plus, une image d'animation entre deux lectures). */
  const until = async (probe, msg, ms = 15000) => {
    const end = Date.now() + ms;
    for (;;) {
      if (await probe()) {
        console.log(`ok — ${msg}`);
        return;
      }
      if (Date.now() > end) throw new Echec(msg);
      await fr();
    }
  };
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const screen = async ([wx, wy]) => {
    const c = await camera();
    return [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  };
  /** Boîte de l'image sélectionnée seule : bornes monde, taille affichée en pixels source, échelle monde par pixel. */
  const box = async () => {
    const [x0, y0, x1, y1] = ((await attr("data-bounds")) ?? "").split(",").map(Number);
    const [bw, bh] = ((await attr("data-image")) ?? "").split("x").map(Number);
    return { x0, y0, x1, y1, bw, bh, s: (x1 - x0) / bw };
  };
  /** Point monde d'un point de la boîte affichée. */
  const at = async ([dx, dy]) => {
    const b = await box();
    return [b.x0 + dx * b.s, b.y0 + dy * b.s];
  };
  const near = async (w, rgb, tol = 30, r = 3) => {
    const [x, y] = await screen(w);
    return inkIn(page, [x - r, y - r, x + r, y + r], { rgb, tol });
  };
  const nearDisplay = async (d, rgb, tol = 30) => near(await at(d), rgb, tol);
  const clickWorld = async (w) => {
    const [x, y] = await screen(w);
    await mouse.click(x, y);
    await fr();
  };
  const act = async (id) => {
    await page.click(`[data-image-action="${id}"]`);
    await fr();
  };
  const setRange = async (name, v) => {
    await page.$eval(`[data-image-input="${name}"]`, (el, value) => {
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, v);
    await fr();
  };
  const openPanel = async () => {
    await page.click('button[data-selection-action="image"]');
    await page.waitForSelector("#image-retouche", { timeout: 5000 });
    await fr();
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  const openFile = async (file) => {
    const before = await page.locator(TAB).count();
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Control+o");
    await (await chooser).setFiles(file);
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
    await fr();
  };

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await fr();
  const c0 = await camera();
  const world = ([x, y]) => [(x - c0.tx) / c0.zoom, (y - c0.ty) / c0.zoom];
  const voidW = world(VOID);

  // S1 : fond de la page bleu (pot de C6a), pour que la transparence se voie.
  await page.click(item("fill"));
  await page.click('button[data-preset="bleu"]');
  await clickWorld(voidW);
  check((await near(voidW, BLUE, 40, 8)) > 150, "S1 : fond de la page bleu (pot)");

  // S1 : dépôt, sélection, panneau ouvert, scène ≥ 640 px.
  await dropFile(page, "#stage", "anneau.png", ringPng(), "image/png", DROP1);
  await waitAttr("data-elements", "1");
  await page.click(item("select"));
  await fr();
  await mouse.click(DROP1[0], DROP1[1]);
  await waitAttr("data-image", "200x150");
  await openPanel();
  const h640 = (await stageBox(page)).height;
  check(h640 >= 640, `S1 : outil Sélection, image sélectionnée, panneau ouvert : scène mesurée ${Math.round(h640)} px (>= 640)`);

  // S1 : rogner (poignée sud-est vers le haut et la gauche de 40 × 30 pixels source) ; les pixels gardés ne bougent pas.
  const ringBefore = await screen(await at([100, 38]));
  check((await inkIn(page, [ringBefore[0] - 2, ringBefore[1] - 2, ringBefore[0] + 2, ringBefore[1] + 2], { rgb: RED, tol: 40 })) > 8, "S1 : anneau rouge avant le rognage");
  const b0 = await box();
  await act("crop");
  const se = await screen([b0.x1, b0.y1]);
  const to = await screen([b0.x1 - 40 * b0.s, b0.y1 - 30 * b0.s]);
  await mouse.move(se[0], se[1]);
  await mouse.down();
  await mouse.move(to[0], to[1], { steps: 8 });
  await mouse.up();
  await fr();
  await act("crop-apply");
  await waitAttr("data-image", "160x120");
  check((await inkIn(page, [ringBefore[0] - 2, ringBefore[1] - 2, ringBefore[0] + 2, ringBefore[1] + 2], { rgb: RED, tol: 40 })) > 8, "S1 : « Valider le rognage » : data-image 160x120, les pixels gardés n'ont pas bougé");

  // S1 : Retourner ↔, pipette sur un coin blanc ; global puis contigu.
  await act("flip-h");
  const interior = [60, 75]; // centre de l'anneau, rogné puis retourné (160 − 100, 75)
  await act("pick");
  await clickWorld(await at(CORNER));
  await page.waitForSelector('[data-image-color="#ffffff"]', { timeout: 5000 });
  await page.selectOption('[data-image-input="mode"]', "global");
  await fr();
  await until(async () => (await nearDisplay(CORNER, BLUE)) > 20 && (await nearDisplay(interior, BLUE)) > 20, "S1 : global, tolérance 10 : du bleu au coin et dans l'anneau");
  await page.selectOption('[data-image-input="mode"]', "contiguous");
  await fr();
  await until(async () => (await nearDisplay(CORNER, BLUE)) > 20 && (await nearDisplay(interior, WHITE, 6)) > 20, "S1 : contigu : du bleu au coin, l'intérieur de l'anneau reste blanc");

  // S1 : Valider (une étape) ; Ctrl+Z, Ctrl+Y.
  await act("apply");
  await press("Control+z");
  await until(async () => (await nearDisplay(CORNER, WHITE, 6)) > 20, "S1 : Ctrl+Z : le coin redevient blanc");
  await press("Control+y");
  await until(async () => (await nearDisplay(CORNER, BLUE)) > 20, "S1 : Ctrl+Y : il redevient bleu");
  await waitAttr("data-pixels", "pret");
  if (captures) {
    await fr();
    const path = join(ROOT, "docs", "essais", "c5-image-rognee-transparente.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // S1 : enregistrer, rouvrir : même boîte, coin bleu, intérieur blanc.
  const bounds1 = await attr("data-bounds");
  const centreW = await at([80, 60]);
  await act("close");
  const file = await saveTo("c5.roomboard");
  await openFile(file);
  await waitAttr("data-pixels", "pret");
  await page.click(item("select"));
  await fr();
  await clickWorld(centreW);
  await waitAttr("data-image", "160x120");
  check((await attr("data-bounds")) === bounds1, `S1 : rouvert, même boîte (${bounds1})`);
  await until(async () => (await nearDisplay(CORNER, BLUE)) > 20 && (await nearDisplay(interior, WHITE, 6)) > 20, "S1 : rouvert : data-pixels pret, coin bleu, intérieur blanc");

  // S1 : Rétablir l'original, puis Ctrl+Z.
  await openPanel();
  await act("restore");
  await waitAttr("data-image", "200x150");
  await until(async () => (await nearDisplay(CORNER, WHITE, 6)) > 20, "S1 : « Rétablir l'original » : data-image 200x150, coin blanc");
  await act("close");
  await press("Control+z");
  await waitAttr("data-image", "160x120");
  await until(async () => (await nearDisplay(CORNER, BLUE)) > 20, "S1 : Ctrl+Z : les retouches reviennent");

  // S2 : image neuve, Tourner ⟳, Luminosité +50, Tourner ⟳, Fermer sans valider, Annuler ×2, Valider la luminosité.
  await dropFile(page, "#stage", "anneau.png", ringPng(), "image/png", DROP2);
  await waitAttr("data-elements", "2");
  await page.click(item("select"));
  await fr();
  await mouse.click(DROP2[0], DROP2[1]);
  await waitAttr("data-image", "200x150");
  await openPanel();
  const b2 = await box();
  const v0 = Number(await attr("data-version"));
  await act("turn-right");
  await waitAttr("data-image", "150x200");
  const b3 = await box();
  const centreOk = Math.abs((b2.x0 + b2.x1) / 2 - (b3.x0 + b3.x1) / 2) <= 0.5 && Math.abs((b2.y0 + b2.y1) / 2 - (b3.y0 + b3.y1) / 2) <= 0.5;
  check(centreOk && Number(await attr("data-version")) === v0 + 1, "S2 : Tourner ⟳ : 150x200, centre en place, une étape");
  await setRange("brightness", 50);
  await until(async () => (await nearDisplay([112, 100], LIGHT_RED)) > 20, "S2 : Luminosité +50 : l'aperçu s'éclaircit (anneau rose)");
  await act("turn-right");
  await waitAttr("data-image", "200x150");
  await until(async () => (await nearDisplay([100, 112], LIGHT_RED)) > 20, "S2 : Tourner ⟳ encore : l'aperçu reste éclairci (brouillon gardé)");
  await act("close");
  await until(async () => (await nearDisplay([100, 112], RED)) > 20, "S2 : Fermer sans valider : la luminosité n'est pas écrite");
  await press("Control+z");
  await waitAttr("data-image", "150x200");
  await press("Control+z");
  await waitAttr("data-image", "200x150");
  check((await attr("data-elements")) === "2", "S2 : Annuler défait les deux quarts de tour seulement");
  await openPanel();
  const v1 = Number(await attr("data-version"));
  await setRange("brightness", 50);
  await act("apply");
  check(Number(await attr("data-version")) === v1 + 1, "S2 : Luminosité +50, « Valider » : une étape");
  await until(async () => (await nearDisplay([100, 38], LIGHT_RED)) > 20, "S2 : luminosité écrite");
  const hEnd = (await stageBox(page)).height;
  check(hEnd >= 640, `S2 : panneau ouvert : scène mesurée ${Math.round(hEnd)} px (>= 640)`);
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c5-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp });
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
