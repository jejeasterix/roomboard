#!/usr/bin/env node
// Essai OG69 « Créateur de grille, lot 1 » (G1 à G5) au navigateur : refait les gestes de l'état des lieux OG65 (dont
// l'essai n'est pas dans le dépôt) au doigt (événements tactiles du protocole) et au clavier, sur l'application construite
// (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless, mode repli, heure figée. Aucune requête hors
// de 127.0.0.1. Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Usage : node scripts/essais/grille-createur-navigateur.mjs [--captures] [--avant <dist>]
//   --captures : captures 2x « après » dans docs/design/captures/grille-createur/ ;
//   --avant <dist> : captures 2x « avant » du panneau d'une autre construction (main d'avant OG69), sans vérification.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { clickItem, coqueCsp, DIST, Echec, frames, gitSha, inkIn, item, loadPlaywright, ROOT, serve, stageBox } from "./commun.mjs";

const LABEL = "grille Créateur (OG69)";
const FIXED = new Date("2026-11-28T08:00:00.000Z");
const PANEL = "#grille";
const field = (k) => `${PANEL} [data-grille="${k}"]`;
const OUT = join(ROOT, "docs", "design", "captures", "grille-createur");
const DESKTOP = { width: 1280, height: 900 };
const IPAD = { width: 820, height: 1180 };
const TOO_FINE = "Trop fin à ce zoom : agrandissez la page ou le pas";

const args = process.argv.slice(2);
const captures = args.includes("--captures");
const avantAt = args.indexOf("--avant");
const avant = avantAt === -1 ? null : resolve(args[avantAt + 1] ?? "");

async function open(browser, base, size, scale) {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: scale, hasTouch: true });
  const external = [];
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1") return route.continue();
    external.push(u.href);
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.clock.setFixedTime(FIXED);
  await page.goto(`${base}/?fichiers=repli`);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  const cdp = await context.newCDPSession(page);
  return { context, page, cdp, errors, external };
}

const settle = async (page) => {
  await frames(page);
  await frames(page);
};
const version = async (page) => Number(await page.getAttribute("#stage", "data-version"));
const center = async (page, sel) => {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Echec(`absent : ${sel}`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
};
/** Toucher, ou appui tenu `holdMs`, par les événements tactiles du protocole (pointerType « touch »). */
async function touch(page, cdp, sel, holdMs = 0) {
  const { x, y } = await center(page, sel);
  const pt = [{ x, y, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt });
  if (holdMs > 0) await page.waitForTimeout(holdMs);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await settle(page);
}
async function shot(page, name, clip) {
  mkdirSync(OUT, { recursive: true });
  const path = join(OUT, name);
  await page.screenshot({ path, ...(clip ? { clip } : {}) });
  console.log(`capture : ${path}`);
}
const panelClip = async (page) => {
  const b = await page.locator(PANEL).boundingBox();
  if (!b) throw new Echec("panneau absent");
  const m = 24;
  return { x: Math.max(0, Math.floor(b.x - m)), y: Math.max(0, Math.floor(b.y - m)), width: Math.ceil(b.width + 2 * m), height: Math.ceil(b.height + 2 * m) };
};

/** Captures « avant » : panneau ouvert par le menu ☰, Carreaux choisis (select natif), desktop puis iPad. */
async function before(browser, base) {
  for (const [size, tag] of [[DESKTOP, "desktop"], [IPAD, "ipad-820"]]) {
    const { context, page } = await open(browser, base, size, 2);
    await clickItem(page, "grid");
    await page.waitForSelector(PANEL, { state: "visible", timeout: 15000 });
    await page.selectOption(field("kind"), "squares");
    await settle(page);
    await shot(page, `avant-panneau-${tag}.png`);
    await context.close();
  }
}

async function after(browser, base) {
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const { context, page, cdp, errors, external } = await open(browser, base, DESKTOP, captures ? 2 : 1);
  const stage = await stageBox(page);
  const zone = [stage.width * 0.55, stage.height * 0.55, stage.width * 0.8, stage.height * 0.85];
  const painted = () => inkIn(page, zone, { max: 750 });
  const v0 = await version(page);

  // G4 — bouton Grille dans l'îlot « Annuler et vue », à côté d'« Ajuster la page » ; l'îlot d'outils tient sur une ligne.
  const toggle = item("grid-toggle");
  check((await page.locator(`[data-toolbar="historique"] ${toggle}`).count()) === 1, "G4 : « Afficher la grille » est dans l'îlot « Annuler et vue »");
  const tools = await page.locator('[data-toolbar="outils"]').boundingBox();
  check(tools !== null && tools.y < 40, `G4 : l'îlot d'outils reste sur la ligne du haut (y = ${tools?.y})`);
  const tb = (await center(page, toggle)).b;
  check(tb.width >= 44 && tb.height >= 44, `G4 : bouton Grille de ${tb.width} × ${tb.height} px (≥ 44)`);
  check((await painted()) === 0, "avant : aucune grille dans la zone vide");
  await touch(page, cdp, toggle);
  check((await painted()) > 0 && (await version(page)) === v0 + 1, "G4 : un toucher pose la grille (une étape)");
  check((await page.getAttribute(toggle, "aria-pressed")) === "true", "G4 : bouton enfoncé, grille montrée");
  if (captures) {
    const h = await page.locator('[data-toolbar="historique"]').boundingBox();
    await shot(page, "apres-bouton-grille.png", { x: Math.floor(h.x - 16), y: Math.floor(h.y - 16), width: Math.ceil(h.width + 32), height: Math.ceil(h.height + 32) });
  }
  await touch(page, cdp, toggle);
  check((await painted()) === 0 && (await version(page)) === v0 + 2, "G4 : un second toucher la retire");
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await page.keyboard.press("Control+Quote");
  await settle(page);
  check((await painted()) > 0, "G4 : Ctrl+' rend la dernière grille");
  await page.keyboard.press("Control+Quote");
  await settle(page);
  check((await painted()) === 0, "G4 : Ctrl+' la retire");

  // G4 — appui long : le Créateur, sans bascule.
  const v1 = await version(page);
  await touch(page, cdp, toggle, 800);
  check((await page.locator(PANEL).count()) === 1 && (await version(page)) === v1, "G4 : appui long → Créateur ouvert, rien d'écrit");

  // G1 — focus sur Type, Échap ferme sans appliquer, focus rendu.
  const focusInType = () => page.evaluate(() => document.activeElement?.closest('[data-grille="kind"]') !== null && document.activeElement?.getAttribute("role") === "radio");
  check(await focusInType(), "G1 : focus sur Type à l'ouverture");
  await page.keyboard.press("Escape");
  await settle(page);
  check((await page.locator(PANEL).count()) === 0 && (await version(page)) === v1, "G1 : Échap ferme sans appliquer");
  check(await page.evaluate(() => document.activeElement?.getAttribute("data-item") === "grid-toggle"), "G1 : focus rendu au bouton Grille");

  // G1, G2 au clavier : Ctrl+Maj+' ouvre, flèche → Carreaux, Entrée applique.
  await page.keyboard.press("Control+Shift+Quote");
  await page.waitForSelector(PANEL, { state: "visible", timeout: 15000 });
  check(await focusInType(), "G1 : Ctrl+Maj+' ouvre le Créateur, focus sur Type");
  await page.keyboard.press("ArrowRight");
  await settle(page);
  check((await page.getAttribute(`${field("kind")} [aria-checked="true"]`, "data-choice")) === "squares", "G2 : flèche → dans les pastilles : Carreaux");
  check((await page.getAttribute(field("snap"), "aria-checked")) === "true", "G5 : aimant allumé d'office sur une grille neuve");

  // G2 — cibles de 48 px.
  for (const sel of [`${field("kind")} [data-choice="squares"]`, field("spacing"), field("snap"), field("apply"), `${field("lineWidth")} [data-choice="2"]`]) {
    const { b } = await center(page, sel);
    check(b.height >= 48, `G2 : ${sel} haut de ${b.height} px (≥ 48)`);
  }
  // G2 — Espace bascule l'interrupteur.
  await page.focus(field("snap"));
  await page.keyboard.press(" ");
  await settle(page);
  check((await page.getAttribute(field("snap"), "aria-checked")) === "false", "G2 : Espace bascule l'interrupteur Magnétisme");
  await page.keyboard.press(" ");
  await settle(page);

  // G3 — pas trop fin : le dire ; borne dès la saisie.
  await page.fill(field("spacing"), "900");
  await settle(page);
  check((await page.inputValue(field("spacing"))) === "400", "G3 : 900 ramené à 400 dès la saisie");
  await page.fill(field("spacing"), "2");
  await settle(page);
  const status = (await page.textContent(field("too-fine")))?.trim();
  check(status === TOO_FINE, `G3 : pas 2 : « ${status} » (role=status)`);
  check((await page.getAttribute(field("too-fine"), "role")) === "status", "G3 : message lu par role=status");
  if (captures) await shot(page, "apres-trop-fin.png", await panelClip(page));
  await page.fill(field("spacing"), "40");
  await settle(page);
  check(((await page.textContent(field("too-fine"))) ?? "").trim() === "", "G3 : pas 40 : plus de message");
  if (captures) await shot(page, "apres-panneau-desktop.png");
  await page.focus(`${field("kind")} [aria-checked="true"]`);
  await page.keyboard.press("Enter");
  await settle(page);
  check((await page.locator(PANEL).count()) === 0 && (await painted()) > 0, "G1 : Entrée sur une pastille applique");

  // G5 — Aimant dans la ligne de contexte d'un outil de forme.
  check((await page.locator("[data-magnet]").count()) === 0, "G5 : pas d'Aimant hors d'un outil de forme");
  await touch(page, cdp, item("rect"));
  const magnet = "button[data-magnet]";
  await page.waitForSelector(magnet, { state: "visible", timeout: 15000 });
  check((await page.getAttribute(magnet, "aria-pressed")) === "true", "G5 : Rectangle : Aimant visible et allumé");
  if (captures) {
    const { b } = await center(page, magnet);
    await shot(page, "apres-aimant-barre.png", { x: Math.floor(b.x - 240), y: Math.floor(b.y - 24), width: 320, height: Math.ceil(b.height + 48) });
  }
  const v2 = await version(page);
  await touch(page, cdp, magnet);
  check((await page.getAttribute(magnet, "aria-pressed")) === "false" && (await version(page)) === v2 + 1, "G5 : un toucher coupe l'aimant (une étape)");
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await page.keyboard.press("Alt+g");
  await settle(page);
  check((await page.getAttribute(magnet, "aria-pressed")) === "true", "G5 : Alt+G rallume l'aimant");
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
  check(external.length === 0, "aucune requête hors de 127.0.0.1");
  await context.close();

  if (captures) {
    const ipad = await open(browser, base, IPAD, 2);
    await ipad.page.keyboard.press("Control+Shift+Quote");
    await ipad.page.waitForSelector(PANEL, { state: "visible", timeout: 15000 });
    await ipad.page.click(`${field("kind")} [data-choice="squares"]`);
    await settle(ipad.page);
    await shot(ipad.page, "apres-panneau-ipad-820.png");
    await ipad.context.close();
  }
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = avant ?? DIST;
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist}/index.html absent : lancer d'abord scripts/verifier.sh`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() }, dist });
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (avant !== null) await before(browser, base);
    else await after(browser, base);
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exitCode = await main();
