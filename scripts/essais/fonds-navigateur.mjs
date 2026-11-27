#!/usr/bin/env node
// Essai personnalisation 1b « fonds de page » au navigateur (docs/plans/personnalisation-1b-cadrage.md, § 6, S1 à S5) :
// application construite servie sous la CSP de la coque (`coqueCsp()`), Chromium de Playwright, contexte tactile
// (`hasTouch`) 1920 × 1080 à 2x, repli de fichiers (`?fichiers=repli`), heure figée. Toute requête hors de 127.0.0.1
// fait échouer l'essai : le pack se charge hors ligne sous la CSP réelle (Q37). Netteté § 10 : icône « Fonds », bord
// et texte d'une carte. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/fonds-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/design/captures/personnalisation-1b/<nom>-*.png (2x) ; --nom avant : barre seule, scénarios sautés.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { clickItem, coqueCsp, DIST, dropFile, Echec, frames, gitSha, item, loadPlaywright, ROOT, serve, solidPng, zipEntries } from "./commun.mjs";
import { pdfPages } from "./fabriques/pdf.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "personnalisation 1b";
const FIXED = new Date("2026-11-27T09:00:00.000Z");
const VIEW = { width: 1920, height: 1080 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const DIALOG = '[role="dialog"][data-panel="backgrounds"]';
const CARD = (id) => `${DIALOG} button[data-fond="${id}"]`;
const SECTION = (id) => `${DIALOG} [data-edit="fonds-section"] [data-choice="${id}"]`;
const SEARCH = `${DIALOG} input[data-fonds="search"]`;
const ALL = `${DIALOG} button[data-fonds="all"]`;
const MINE = `${DIALOG} button[data-fond^="mine:"]`;
const TOOLS = '[data-toolbar="outils"]';
const TRACES = ["polyhaven", "poly haven", "wikimedia", "commons", "openverse", "flickr", "unsplash", "pixabay", "pexels", "http", "www."];
const CAPTURES = join(ROOT, "docs", "design", "captures", "personnalisation-1b");
const BIN = join(ROOT, "apps", "cli", "dist", "roomboard.mjs");
const SEA = JSON.parse(readFileSync(join(ROOT, "apps", "web", "backgrounds", "SOURCES.json"), "utf8")).photos.filter((p) => p.theme === "mer-ciel").map((p) => p.id);
const { PDFDocument, StandardFonts } = createRequire(join(ROOT, "apps", "web", "package.json"))("pdf-lib");
const [WHITE, NAVY, GRAY_300] = [hex("#ffffff"), hex("#182946"), hex("#E0E0E8")];
const BLANK = "#ffffff|-|-";
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};
const settle = async (page) => {
  await frames(page);
  await frames(page);
};
const look = (page) => page.getAttribute("#stage", "data-look");
const ids = (page) => page.$$eval(`${DIALOG} button[data-fond]`, (bs) => bs.map((b) => b.dataset.fond));
// Hors de la coque, l'avis passe par la boîte du navigateur (`window.alert`) : on les relève et on les accepte.
const dialogs = [];
const toast = async (page, text) => {
  for (let i = 0; i < 150 && !dialogs.some((m) => m.includes(text)); i++) await page.waitForTimeout(100);
  if (!dialogs.some((m) => m.includes(text))) throw new Echec(`avis « ${text} » jamais montré (${dialogs.join(" | ")})`);
  console.log(`ok — avis : ${text}`);
};
const blur = (page) => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
const cli = (args) => {
  const r = spawnSync("node", [BIN, ...args], { encoding: "utf8", env: { ...process.env, ROOMBOARD_NOW: "1700000000000" } });
  return { code: r.status, lignes: (r.stdout ?? "").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l)), brut: `${r.stdout}${r.stderr}` };
};
async function shot(page, name, selector) {
  const clip = selector === null ? undefined : await page.locator(selector).first().boundingBox();
  await page.screenshot({ path: join(CAPTURES, `${name}.png`), scale: "device", animations: "disabled", caret: "hide", ...(clip ? { clip } : {}) });
  console.log(`capture : docs/design/captures/personnalisation-1b/${name}.png`);
}
async function openDialog(page) {
  await page.tap(item("backgrounds"));
  await page.waitForSelector(DIALOG, { state: "visible", timeout: 15000 });
  await settle(page);
}
async function closed(page) {
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 15000 });
  await settle(page);
}
/** data-look de chaque page, de la première à la dernière (boutons de la barre des pages). */
async function allLooks(page, n) {
  while (await page.locator(item("page-prev")).isEnabled()) await page.tap(item("page-prev"));
  await settle(page);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(await look(page));
    if (i < n - 1) {
      await page.tap(item("page-next"));
      await settle(page);
    }
  }
  return out;
}
async function newTab(page) {
  const n = await page.locator('[role="tab"][data-tab]').count();
  await blur(page);
  await page.keyboard.press("Control+n");
  await page.waitForFunction((k) => document.querySelectorAll('[role="tab"][data-tab]').length === k, n + 1, { timeout: 15000 });
  await settle(page);
}

async function sharpness(page) {
  const b = await page.locator(`${item("backgrounds")} svg`).boundingBox();
  const px = await pixelsOf(page, { x: b.x, y: b.y, width: 24, height: 24 });
  // Rangée 12 à 2x (y = 6 px CSS) : seuls les deux bords verticaux du cadre de `wallpaper` (x = 2 et 22), sous le coin.
  const row = edgeRow(px, 12, 0, px.width, WHITE, NAVY);
  console.log(`icône Fonds, rangée 12 : ${row.gray.join(" ")}`);
  check(row.intermediate === 0 && row.runs.length === 2 && row.runs.every((r) => r === 3), "§ 10 : bords du cadre de l'icône « Fonds » en 3 pixels pleins, aucun intermédiaire");
  await openDialog(page);
  const t = await page.locator(`${DIALOG} .rb-bg-thumb`).first().boundingBox();
  const edge = await pixelsOf(page, { x: Math.round(t.x) - 4, y: Math.round(t.y + t.height / 2), width: 8, height: 1 });
  const e = edgeRow(edge, 0, 0, edge.width, WHITE, GRAY_300);
  console.log(`bord de carte : ${e.gray.join(" ")}`);
  check(e.intermediate === 0 && e.runs.length === 1 && e.runs[0] === 2, "§ 10 : bord de 1 px d'une carte en 2 pixels pleins à 2x");
  const l = await page.locator(`${DIALOG} .rb-bg-label`).first().boundingBox();
  check(fringes(await pixelsOf(page, l), WHITE, NAVY) === 0, "§ 10 : libellé d'une carte sans frange colorée");
  await page.keyboard.press("Escape");
  await closed(page);
}

async function s1(page, captures) {
  await openDialog(page);
  check((await page.getAttribute(SECTION("colors"), "aria-checked")) === "true", "S1 : la fenêtre s'ouvre sur « Couleurs »");
  if (captures) await shot(page, "apres-fenetre-couleurs", DIALOG);
  await page.tap(SECTION("lines"));
  await settle(page);
  if (captures) await shot(page, "apres-fenetre-lignes", DIALOG);
  await page.tap(CARD("seyes-8mm"));
  await closed(page);
  const l = await look(page);
  check(l === "#fbf7ec|seyes|-", `S1 : « Seyès 8 mm » sur fond crème (${l})`);
  if (captures) await shot(page, "apres-seyes-page", null);
  await page.tap(item("undo"));
  await settle(page);
  check((await look(page)) === BLANK, "S1 : un « Annuler » rend la page blanche, sans grille");
}

async function s2(page, captures) {
  await newTab(page);
  await page.tap(item("page-add"));
  await page.tap(item("page-add"));
  await settle(page);
  await openDialog(page);
  await page.fill(SEARCH, "ocean");
  await settle(page);
  const a = await ids(page);
  check(a.some((id) => SEA.includes(id)), `S2 : « ocean » montre des photos de mer (${a.filter((id) => SEA.includes(id)).length})`);
  if (captures) await shot(page, "apres-recherche-ocean", DIALOG);
  await page.fill(SEARCH, "oséan");
  await settle(page);
  check((await ids(page)).some((id) => SEA.includes(id)), "S2 : « oséan » (faute) aussi");
  await page.fill(SEARCH, "tableau noir");
  await settle(page);
  check((await ids(page)).includes("ardoise"), "S2 : « tableau noir » sort la couleur « Ardoise »");
  const text = ((await page.textContent(DIALOG)) ?? "").toLowerCase();
  check(TRACES.every((t) => !text.includes(t)), "S2 : le texte visible de la fenêtre ne nomme aucun site, aucun « http »");
  await page.fill(SEARCH, "ocean");
  await settle(page);
  const sea = (await ids(page)).find((id) => SEA.includes(id));
  await page.tap(ALL);
  check((await page.getAttribute(ALL, "aria-checked")) === "true", "S2 : « Toutes les pages » mis");
  await page.tap(CARD(sea));
  await closed(page);
  await toast(page, "Fond appliqué à 3 pages");
  const looks = await allLooks(page, 3);
  check(new Set(looks).size === 1 && looks[0].includes("|image:"), `S2 : trois pages, même fond, une seule empreinte (${looks[0]})`);
  await page.tap(item("undo"));
  await settle(page);
  check((await allLooks(page, 3)).every((l) => l === BLANK), "S2 : un seul « Annuler » rend les trois pages blanches");
  await dropFile(page, "#stage", "essai-2-pages.pdf", await pdfPages({ PDFDocument, StandardFonts }, 2), "application/pdf");
  await page.waitForFunction(() => /pdf-page:/.test(document.querySelector("#stage")?.dataset.look ?? ""), null, { timeout: 30000 });
  await settle(page);
  await openDialog(page);
  await page.tap(SECTION("lines"));
  await page.tap(ALL);
  await page.tap(CARD("quadrillage-5mm"));
  await closed(page);
  await toast(page, "pages PDF gardent leur page");
  check((await allLooks(page, 2)).every((l) => /^#ffffff\|squares\|pdf-page:/.test(l)), "S2 : pages PDF : page gardée, quadrillage posé, l'avis le dit");
  await page.tap(item("undo"));
  await settle(page);
  check((await allLooks(page, 2)).every((l) => /^#ffffff\|-\|pdf-page:/.test(l)), "S2 : un « Annuler » rend les pages PDF telles quelles");
}

async function s3(page, captures) {
  await newTab(page);
  await page.tap(item("pen"));
  const box = await page.locator("#stage").boundingBox();
  for (const y of [300, 420]) {
    await page.mouse.move(box.x + 400, box.y + y);
    await page.mouse.down();
    await page.mouse.move(box.x + 900, box.y + y, { steps: 12 });
    await page.mouse.up();
  }
  await settle(page);
  const elements = await page.getAttribute("#stage", "data-elements");
  await openDialog(page);
  await page.tap(SECTION("mine"));
  await page.tap(`${DIALOG} button[data-fonds="page"]`);
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 1, MINE, { timeout: 15000 });
  check(true, "S3 : « Cette page » : une carte dans Mes fonds");
  await page.tap(`${DIALOG} button[data-fonds="close"]`);
  await closed(page);
  await clickItem(page, "grid");
  await page.waitForSelector("#grille", { state: "visible" });
  await page.selectOption('#grille [data-grille="kind"]', "dots");
  await page.tap('#grille [data-grille="save-background"]');
  await toast(page, "Grille enregistrée dans Mes fonds");
  await page.tap('#grille [data-grille="cancel"]');
  await openDialog(page);
  await page.tap(SECTION("mine"));
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 2, MINE, { timeout: 15000 });
  check(true, "S3 : « Enregistrer comme fond » (Points) : une deuxième carte");
  await dropFile(page, DIALOG, "rouge.png", solidPng(64, 36, [220, 40, 40]), "image/png", [300, 300]);
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 3, MINE, { timeout: 15000 });
  check((await page.getAttribute("#stage", "data-elements")) === elements && (await look(page)) === BLANK, "S3 : PNG déposé : une troisième carte, la page n'a reçu aucune image");
  if (captures) await shot(page, "apres-mes-fonds", DIALOG);
  await page.reload();
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await settle(page);
  check((await look(page)) === BLANK, "S3 : après rechargement, aucun fond dans le document");
  await openDialog(page);
  await page.tap(SECTION("mine"));
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 3, MINE, { timeout: 15000 });
  check(true, "S3 : après rechargement, les trois cartes de Mes fonds sont là");
  await page.keyboard.press("Escape");
  await closed(page);
}

async function s4(page, tmp) {
  await page.tap(item("page-add"));
  await settle(page);
  await openDialog(page);
  await page.tap(SECTION("mine"));
  await page.tap(`${DIALOG} button[data-fond^="mine:page-"]`);
  await closed(page);
  const l = await look(page);
  check(l.includes("|image:"), `S4 : « Cette page » appliquée à la deuxième page (${l})`);
  await blur(page);
  const dl = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const file = join(tmp, "fonds.roomboard");
  await (await dl).saveAs(file);
  const asset = l.split("|image:")[1];
  check(zipEntries(readFileSync(file)).some((n) => n.startsWith(`assets/${asset}`)), "S4 : l'image du fond est dans assets/ du fichier enregistré");
  await dropFile(page, "#stage", "fonds.roomboard", readFileSync(file), "");
  await page.waitForFunction((k) => document.querySelector("#stage")?.dataset.look?.includes(k) ?? false, `|image:${asset}`, { timeout: 30000 }).catch(() => undefined);
  const reopened = await allLooks(page, 2);
  check(reopened[1].includes(`|image:${asset}`), "S4 : rouvert, la deuxième page montre toujours l'image");
  const list = cli(["backgrounds", "--search", "seyes"]);
  check(list.code === 0 && list.lignes.some((x) => x.id === "seyes-8mm"), "S4 : roomboard backgrounds --search seyes liste seyes-8mm");
  const copie = join(tmp, "copie.roomboard");
  copyFileSync(file, copie);
  const tous = join(tmp, "s4-tous.roomboard");
  const ap = cli(["apply", copie, '{"op":"background","id":"seyes-8mm","pages":"all"}', "--out", tous]);
  const st = cli(["state", tous]).lignes[0];
  check(ap.code === 0 && st.pages.every((p) => p.page.grid?.levels[0]?.kind === "seyes"), `S4 : apply seyes-8mm sur toutes les pages : code 0, grille seyes partout (${ap.brut.slice(0, 80)})`);
  const une = join(tmp, "s4-une.roomboard");
  const ar = cli(["apply", tous, '{"op":"background","id":"ardoise","page":"$page:1"}', "--out", une]);
  const su = cli(["state", une]).lignes[0];
  check(ar.code === 0 && su.pages[0].page.background === "#fbf7ec" && su.pages[1].page.background === "#2f3e46", "S4 : ardoise sur $page:1 : seule la deuxième page change");
  check(cli(["apply", copie, '{"op":"background","id":"ardoise","page":"$page:0","pages":"all"}', "--out", join(tmp, "ko.roomboard")]).code === 2, "S4 : page et pages ensemble : code 2");
}

async function s5(page) {
  await newTab(page);
  await page.tap(item("page-add"));
  await settle(page);
  await page.tap(item("page-prev"));
  await page.tap(item("rect"));
  const box = await page.locator("#stage").boundingBox();
  await page.mouse.move(box.x + 500, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 800, box.y + 500, { steps: 8 });
  await page.mouse.up();
  await page.tap(item("select"));
  await page.mouse.click(box.x + 650, box.y + 400);
  await settle(page);
  await blur(page);
  await page.keyboard.press("Control+Shift+F");
  await page.waitForSelector(DIALOG, { state: "visible" });
  check((await page.evaluate(() => document.activeElement?.getAttribute("data-fonds"))) === "search", "S5 : Ctrl+Maj+F ouvre la fenêtre, focus dans la recherche");
  await page.keyboard.type("portee");
  await settle(page);
  for (let i = 0; i < 12 && !(await page.evaluate(() => document.activeElement?.hasAttribute("data-fond"))); i++) await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowRight");
  const id = await page.evaluate(() => document.activeElement?.getAttribute("data-fond"));
  check(typeof id === "string" && id.startsWith("portees-"), `S5 : Tab jusqu'aux cartes, flèche droite : ${id}`);
  await page.keyboard.press("Shift+Enter");
  await closed(page);
  check((await page.evaluate(() => document.activeElement?.getAttribute("data-item"))) === "backgrounds", "S5 : fenêtre fermée, focus rendu au bouton « Fonds »");
  check((await allLooks(page, 2)).every((l) => l.includes("|music|")), "S5 : Maj+Entrée : la portée sur toutes les pages");
  await page.keyboard.press("Control+z");
  await settle(page);
  check((await allLooks(page, 2)).every((l) => l === BLANK), "S5 : Ctrl+Z défait tout");
  await page.tap(item("page-prev")).catch(() => undefined);
  await page.mouse.click(box.x + 650, box.y + 400);
  await settle(page);
  const [elements, selection] = [await page.getAttribute("#stage", "data-elements"), await page.getAttribute("#stage", "data-selection")];
  check(selection !== null && selection !== "", "S5 : rectangle sélectionné avant la contre-épreuve");
  await blur(page);
  await page.keyboard.press("Control+Shift+F");
  await page.waitForSelector(DIALOG, { state: "visible" });
  for (const k of ["Delete", "Space"]) await page.keyboard.press(k);
  await page.keyboard.press("Escape");
  await closed(page);
  check((await page.getAttribute("#stage", "data-elements")) === elements && (await page.getAttribute("#stage", "data-selection")) === selection, "S5 : Suppr, Espace puis Échap dans la fenêtre : fermée, rectangle toujours là et sélectionné");
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = arg("--dist") ? resolve(arg("--dist")) : DIST;
  const nom = arg("--nom") ?? "apres";
  const captures = process.argv.includes("--captures");
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist} sans index.html : lancer d'abord scripts/verifier.sh`);
    return 1;
  }
  if (nom !== "avant" && !existsSync(join(dist, "backgrounds", "photos"))) {
    console.error(`${LABEL} : ÉCHEC — pack absent de ${dist}`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable`);
    return 2;
  }
  const server = await serve({ dist, headers: { "Content-Security-Policy": coqueCsp() } });
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-fonds-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, hasTouch: true, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.accept();
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => (m.type() === "error" ? errors.push(m.text()) : undefined));
    await page.clock.setFixedTime(FIXED);
    await page.goto(`http://127.0.0.1:${server.address().port}/?fichiers=repli`);
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
    await settle(page);
    if (captures) mkdirSync(CAPTURES, { recursive: true });
    if (nom === "avant") {
      if (!captures) throw new Echec("--nom avant exige --captures");
      await shot(page, "avant-barre", TOOLS);
    } else {
      if (captures) await shot(page, "apres-barre", TOOLS);
      await sharpness(page);
      await s1(page, captures);
      await s2(page, captures);
      await s3(page, captures);
      await s4(page, tmp);
      await s5(page);
    }
    check(errors.length === 0, `aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
    check(external.length === 0, `aucune requête hors de 127.0.0.1${external.length ? ` : ${external.join(", ")}` : ""}`);
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
