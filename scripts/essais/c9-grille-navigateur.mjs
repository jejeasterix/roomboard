#!/usr/bin/env node
// Essai C9 « éditeur de grille » au navigateur (cadrage usage-c9-editeur, S1). L'application construite (apps/web/dist)
// servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée.
// Aucune requête hors de 127.0.0.1. Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c9-grille-navigateur.mjs [--captures]
// (--captures : docs/essais/c9-editeur-grille.png, panneau ouvert, Seyès en aperçu).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, frames, gitSha, inkIn, item, loadPlaywright, serve, stageBox } from "./commun.mjs";

const LABEL = "C9 grille";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
const PANEL = "#grille";
const field = (k) => `${PANEL} [data-grille="${k}"]`;

/** Pixels différents du fond de page (somme RVB < 750) : le gris des grilles neuves (#94a3b8, somme 495) compte, alors
 *  que l'encre seule (`inkIn` sans option, somme < 300) ne le voit pas (C6a, D27 : un seul compteur). */
const paintedIn = (page, box) => inkIn(page, box, { max: 750 });

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const settle = async () => {
    await frames(page);
    await frames(page);
  };
  const version = async () => Number(await page.getAttribute("#stage", "data-version"));
  const tabs = () => page.locator(TAB).count();
  const panelOpen = async () => (await page.locator(PANEL).count()) === 1;
  const openPanel = async () => {
    await page.click(item("grid"));
    await page.waitForSelector(PANEL, { state: "visible", timeout: 15000 });
  };
  const waitTabs = async (n) => {
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 15000 });
    await settle();
  };
  /** Focus rendu à la page : un raccourci (Ctrl+S, Ctrl+O) ne part pas d'un champ ou d'un bouton du panneau. */
  const blur = () => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  const saveTo = async (name) => {
    await blur();
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  await settle();
  const stage = await stageBox(page);
  // Zone vide de la page, loin du panneau (posé en haut à gauche de la scène) et des bords (px CSS de #scene).
  const zone = [stage.width * 0.55, stage.height * 0.55, stage.width * 0.8, stage.height * 0.85];
  const painted = () => paintedIn(page, zone);
  const v0 = await version();
  check((await painted()) === 0, "avant : aucun pixel peint dans la zone vide de la scène");

  // Séance 1 : aperçu direct, puis « Fermer sans appliquer ».
  await openPanel();
  check((await page.inputValue(field("kind"))) === "none", "« Grille » : #grille visible, type « Aucune »");
  await page.selectOption(field("kind"), "squares");
  await settle();
  const n1 = await painted();
  check(n1 > 0, `Carreaux : la grille apparaît avant « Appliquer » (${n1} pixels)`);
  check((await version()) === v0, `Carreaux en aperçu : data-version inchangé (${v0})`);
  await page.fill(field("spacing"), "80");
  await page.selectOption(field("lineWidth"), "3");
  await settle();
  const n2 = await painted();
  check(n2 > 0 && n2 !== n1, `pas 80, épaisseur 3 : la page change (${n1} → ${n2} pixels)`);
  await page.click(field("cancel"));
  await settle();
  check(!(await panelOpen()), "« Fermer sans appliquer » : panneau fermé");
  check((await painted()) === 0 && (await version()) === v0, "« Fermer sans appliquer » : zone vide, data-version inchangé");

  // CR3 : aperçu, autre onglet, retour : aucune grille.
  await openPanel();
  await page.selectOption(field("kind"), "squares");
  await settle();
  check((await painted()) > 0, "CR3 : aperçu posé sur le premier onglet");
  const t0 = await tabs();
  await blur();
  await page.keyboard.press("Control+n");
  await waitTabs(t0 + 1);
  check(!(await panelOpen()), "CR3 : autre onglet : panneau fermé");
  await page.locator(TAB).nth(0).click();
  await page.waitForFunction((sel) => document.querySelectorAll(sel)[0]?.getAttribute("aria-selected") === "true", TAB, { timeout: 15000 });
  await settle();
  check((await painted()) === 0 && (await version()) === v0, "CR3 : aperçu, autre onglet, retour : aucune grille, rien d'écrit");

  // Séance 2 : « Appliquer », une seule étape.
  await openPanel();
  await page.selectOption(field("kind"), "squares");
  await page.fill(field("spacing"), "80");
  await page.selectOption(field("lineWidth"), "3");
  await page.check(field("snap"));
  await page.click(field("apply"));
  await settle();
  check(!(await panelOpen()), "« Appliquer » : panneau fermé");
  check((await painted()) === n2, `« Appliquer » : grille visible, mêmes pixels que l'aperçu (${n2})`);
  check((await version()) === v0 + 1, `« Appliquer » : une étape (data-version ${v0} → ${v0 + 1})`);

  // Annuler, Rétablir (barre) : la séance part et revient en une étape.
  await page.click(item("undo"));
  await settle();
  check((await painted()) === 0, "« Annuler » de la barre : la grille part en une étape");
  await page.click(item("redo"));
  await settle();
  check((await painted()) === n2, "« Rétablir » : la grille revient");

  // Enregistrer, rouvrir le fichier dans un nouvel onglet, relire les réglages.
  const file = await saveTo("grille.roomboard");
  const before = await tabs();
  await blur();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await waitTabs(before + 1);
  check((await painted()) > 0, "rouvert dans un nouvel onglet : grille visible");
  await openPanel();
  check((await page.inputValue(field("kind"))) === "squares", "rouvert, « Grille » : Carreaux");
  check(Number(await page.inputValue(field("spacing"))) === 80, "rouvert : pas 80");
  check((await page.inputValue(field("lineWidth"))) === "3", "rouvert : épaisseur 3 px");
  check(await page.isChecked(field("snap")), "rouvert : magnétisme coché");
  const vR = await version();
  if (captures) {
    await page.selectOption(field("kind"), "seyes");
    // Épaisseur 1 : à 3, au zoom « ajuster la page », la règle CR2 saute les lignes fines du Seyès (ressemble à Carreaux).
    await page.selectOption(field("lineWidth"), "1");
    await settle();
    const path = join(ROOT, "docs", "essais", "c9-editeur-grille.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }
  await page.click(field("cancel"));
  await settle();
  check(!(await panelOpen()) && (await version()) === vR, "rouvert, « Fermer sans appliquer » : rien d'écrit");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c9-"));
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
