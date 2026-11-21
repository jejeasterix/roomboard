#!/usr/bin/env node
// Essai C6b « pot de peinture sur image » au navigateur (S1 du cadrage usage-c6b-pot-image). Application construite
// (apps/web/dist) servie avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure
// figée. PNG fabriqué ici (fond blanc, bande gris très clair en haut, anneau rouge fermé à intérieur blanc), jamais
// téléchargé. Oracles : couleurs lues dans `#scene` (`inkIn` avec `rgb`), attributs de `#stage` (`data-pot`,
// `data-image`, `data-bounds`), entrées du fichier enregistré ; aucune requête hors de 127.0.0.1. Lancé par
// scripts/verifier.sh --e2e, sans option de capture. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/c6b-pot-image-navigateur.mjs [--captures]
// (--captures : docs/essais/c6b-pot-image.png : image remplie avec une zone effacée).
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, rgbPng, serve, sha256, stageBox, stageMouse, zipEntries } from "./commun.mjs";

const LABEL = "C6b pot sur image";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const W = 200;
const H = 150;
const RED = [220, 38, 38];
const WHITE = [255, 255, 255];
const GREY = [240, 240, 240];
const BLUE = [29, 78, 216];
const YELLOW = [250, 204, 21];
/** Points de la scène (px de la scène, caméra du premier onglet). */
const VOID = [1100, 560];
const DROP = [400, 360];
/** Points de la boîte affichée après le rognage (160 × 120 pixels source, sans retournement) : fond, bande, intérieur. */
const FOND = [12, 60];
const BAND = [80, 5];
const INSIDE = [100, 75];

/** 200 × 150 : fond blanc ; bande #f0f0f0 sur les 12 premières lignes, collée au fond ; anneau rouge fermé (rayons 30 à
 *  45 autour de (100, 75)), intérieur blanc. Tolérance 5 : la bande reste ; tolérance 10 : elle part avec le fond. */
const potPng = () =>
  rgbPng(W, H, (x, y) => {
    const d = Math.hypot(x + 0.5 - 100, y + 0.5 - 75);
    if (d >= 30 && d <= 45) return RED;
    return y < 12 ? GREY : WHITE;
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
  const near = async (w, rgb, tol = 30, r = 3) => {
    const [x, y] = await screen(w);
    return inkIn(page, [x - r, y - r, x + r, y + r], { rgb, tol });
  };
  const nearDisplay = async (d, rgb, tol = 30) => {
    const b = await box();
    return near([b.x0 + d[0] * b.s, b.y0 + d[1] * b.s], rgb, tol);
  };
  const clickWorld = async (w) => {
    const [x, y] = await screen(w);
    await mouse.click(x, y);
    await fr();
  };
  const act = async (id) => {
    await page.click(`[data-image-action="${id}"]`);
    await fr();
  };
  const openPanel = async () => {
    await page.click('button[data-selection-action="image"]');
    await page.waitForSelector("#image-retouche", { timeout: 5000 });
    await fr();
  };
  const pot = async (preset) => {
    await page.click(item("fill"));
    if (preset !== undefined) await page.click(`button[data-preset="${preset}"]`);
    await fr();
  };
  const setTolerance = async (v) => {
    await page.$eval("input[data-fill-tolerance]", (el, value) => {
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, v);
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

  // S1 : Pot, Bleu, clic sur la page vide : fond bleu.
  await pot("bleu");
  await clickWorld(voidW);
  check((await near(voidW, BLUE, 40, 8)) > 150, "S1 : Pot Bleu, clic sur la page vide : fond bleu (#1d4ed8)");

  // S1 : dépôt, sélection, rognage de 40 × 30 pixels source par la poignée sud-est.
  const png = potPng();
  await dropFile(page, "#stage", "anneau.png", png, "image/png", DROP);
  await waitAttr("data-elements", "1");
  await page.click(item("select"));
  await fr();
  await mouse.click(DROP[0], DROP[1]);
  await waitAttr("data-image", "200x150");
  await openPanel();
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
  console.log("ok — S1 : « Valider le rognage » : data-image 160x120");
  const b1 = await box();
  const shown = (d) => [b1.x0 + d[0] * b1.s, b1.y0 + d[1] * b1.s];
  const fondW = shown(FOND);
  const bandW = shown(BAND);
  const insideW = shown(INSIDE);
  await act("close");

  // S1 : Pot, Jaune, clic dans l'intérieur de l'anneau : data-pot passe par attente puis pret.
  await page.evaluate(() => {
    const stage = document.querySelector("#stage");
    const seen = [];
    window.__pots = seen;
    new MutationObserver((ms) => {
      for (const m of ms) seen.push(m.oldValue ?? "");
    }).observe(stage, { attributes: true, attributeFilter: ["data-pot"], attributeOldValue: true });
  });
  await pot("jaune");
  await clickWorld(insideW);
  await waitAttr("data-pot", "pret");
  const pots = await page.evaluate(() => window.__pots);
  check(pots.includes("attente"), `S1 : data-pot passe par « attente » puis « pret » (${[...new Set(pots)].join(" → ")} → pret)`);
  await until(async () => (await near(insideW, YELLOW)) > 20 && (await near(fondW, WHITE, 6)) > 20, "S1 : l'intérieur de l'anneau devient jaune, le fond de l'image reste blanc");

  // S1 : « Aucune », tolérance 5, clic sur le fond : le bleu de la page apparaît, la bande grise reste.
  await page.click("button[data-fill-none]");
  await fr();
  check((await page.inputValue("input[data-fill-tolerance]")) === "5", "S1 : tolérance par défaut 5");
  await clickWorld(fondW);
  await until(
    async () => (await near(fondW, BLUE)) > 20 && (await near(bandW, GREY, 6)) > 20 && (await near(insideW, YELLOW)) > 20,
    "S1 : « Aucune », tolérance 5 : fond effacé (bleu de la page), bande grise gardée, intérieur jaune",
  );
  await press("Control+z");
  await until(async () => (await near(fondW, WHITE, 6)) > 20, "S1 : Ctrl+Z : le fond de l'image redevient blanc");
  await setTolerance(10);
  check((await page.inputValue("input[data-fill-tolerance]")) === "10", "S1 : tolérance réglée à 10");
  await clickWorld(fondW);
  await until(async () => (await near(fondW, BLUE)) > 20 && (await near(bandW, BLUE)) > 20, "S1 : tolérance 10 : le fond et la bande deviennent transparents");
  await press("Control+z");
  await until(async () => (await near(bandW, GREY, 6)) > 20, "S1 : Ctrl+Z : la bande revient");
  await press("Control+y");
  await until(async () => (await near(bandW, BLUE)) > 20 && (await near(insideW, YELLOW)) > 20, "S1 : Ctrl+Y : la bande disparaît, l'intérieur reste jaune");
  const h = (await stageBox(page)).height;
  check(h >= 640, `S1 : Pot actif, curseur visible : scène mesurée ${Math.round(h)} px (>= 640)`);
  if (captures) {
    await fr();
    const path = join(ROOT, "docs", "essais", "c6b-pot-image.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // S1 : enregistrer : deux assets PNG (l'original déposé, la version courante) ; document.ybin cite sourceAsset.
  const file = await saveTo("c6b.roomboard");
  const entries = zipEntries(await readFile(file));
  const original = `assets/${sha256(png)}.png`;
  const pngs = [...entries.keys()].filter((k) => /^assets\/[0-9a-f]{64}\.png$/.test(k));
  check(pngs.length === 2 && pngs.includes(original), `S1 : enregistré : exactement deux assets PNG, dont l'original ${original} (${pngs.join(", ")})`);
  const current = (pngs.find((k) => k !== original) ?? "").slice("assets/".length, "assets/".length + 64);
  const ybin = entries.get("document.ybin") ?? Buffer.alloc(0);
  check(
    ybin.includes(Buffer.from("sourceAsset")) && ybin.includes(Buffer.from(sha256(png))) && current !== "" && ybin.includes(Buffer.from(current)),
    "S1 : document.ybin cite sourceAsset (l'original) et le nouvel asset",
  );

  // S1 : rouvrir : intérieur jaune, fond bleu, data-image 160x120.
  await openFile(file);
  await until(async () => (await near(insideW, YELLOW)) > 20 && (await near(fondW, BLUE)) > 20, "S1 : rouvert : intérieur jaune, fond bleu");
  await page.click(item("select"));
  await fr();
  await clickWorld(insideW);
  await waitAttr("data-image", "160x120");
  console.log("ok — S1 : rouvert : data-image 160x120");

  // S1 : « Rétablir l'original » : 200x150, plus de jaune, fond blanc ; Ctrl+Z : l'image remplie revient.
  await openPanel();
  await act("restore");
  await waitAttr("data-image", "200x150");
  await until(
    async () => (await nearDisplay(INSIDE, WHITE, 6)) > 20 && (await nearDisplay(FOND, WHITE, 6)) > 20 && (await nearDisplay(INSIDE, YELLOW)) === 0,
    "S1 : « Rétablir l'original » : data-image 200x150, plus de jaune, fond blanc",
  );
  await act("close");
  await press("Control+z");
  await waitAttr("data-image", "160x120");
  await until(async () => (await near(insideW, YELLOW)) > 20, "S1 : Ctrl+Z : l'image remplie revient");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c6b-"));
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
