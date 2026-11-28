#!/usr/bin/env node
// OG39 : panneau Réglages au design des îlots (cadrage docs/plans/reglages-design-cadrage.md, § 5, S1 à S5).
// Application construite servie en local, Chromium sans tête de Playwright, `deviceScaleFactor` 2, faux hôte
// d'annotation (`?annotation=faux`) : les trois sections du panneau sont montrées.
// `--captures <dossier>` : capture 2x du panneau entier, prise dès l'ouverture, avant les contrôles (`--nom` : préfixe
// du fichier, `apres` par défaut ; `avant` sert à la capture de `main`, dont les contrôles échouent ensuite).
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/reglages-design-navigateur.mjs [--dist <build>] [--captures <dossier>] [--nom <préfixe>]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Echec, VIEWPORT, clickItem, frames, loadPlaywright, serve } from "./commun.mjs";
import { fringes, hex, pixelsOf } from "./nettete.mjs";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
};
const dist = opt("--dist");
const captures = opt("--captures");
const nom = opt("--nom") ?? "apres";

const PANEL = "#reglages";
const ROW = (k) => `${PANEL} button[data-reglage="${k}"]`;
const WHITE = [255, 255, 255];
const NAVY = hex("#182946");
const OFF = "Gomme automatique à la paume : coupée";
const ON = "Gomme automatique à la paume : active";

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright absent (cache npx)");
  process.exit(2);
}
if (captures) mkdirSync(captures, { recursive: true });
const server = await serve(dist ? { dist } : {});
const url = `http://127.0.0.1:${server.address().port}/?fichiers=repli&annotation=faux`;
const browser = await pw.chromium.launch({ args: ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"] });
let failed = false;
try {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const check = (cond, msg) => {
    if (!cond) throw new Echec(`échec — ${msg}`);
    console.log(`ok — ${msg}`);
  };
  const text = async (sel) => ((await page.textContent(sel)) ?? "").trim();
  const clipOf = (b, pad = 0) => {
    const x = Math.floor(b.x) - pad;
    const y = Math.floor(b.y) - pad;
    return { x, y, width: Math.ceil(b.x + b.width) - x + pad, height: Math.ceil(b.y + b.height) - y + pad };
  };

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  await frames(page);
  await clickItem(page, "settings");
  await page.waitForSelector(PANEL, { timeout: 15000 });
  await frames(page);
  const popover = page.locator(".rb-popover", { has: page.locator(PANEL) });
  if (captures) {
    const file = join(captures, `${nom}-clair.png`);
    await page.screenshot({ path: file, clip: clipOf(await popover.boundingBox(), 8), animations: "disabled", caret: "hide", scale: "device" });
    console.log(`capture : ${file}`);
  }

  // S1 — sections et icônes.
  const heads = await page.$$eval(`${PANEL} .rb-set-h`, (l) => l.map((h) => h.textContent));
  check(JSON.stringify(heads) === JSON.stringify(["Stylet et doigt", "Rendu de l'encre", "Annotation"]), `S1 : trois sections titrées (${heads.join(", ")})`);

  // S2 — cibles tactiles : chaque rangée fait 44 px au moins ; le panneau tient sans défilement horizontal.
  const rows = await page.$$eval(`${PANEL} button[data-reglage]`, (l) => l.map((b) => ({ k: b.dataset.reglage, h: b.getBoundingClientRect().height })));
  const low = rows.filter((r) => r.h < 44);
  check(rows.length === 7 && low.length === 0, `S2 : ${rows.length} rangées, toutes de 44 px au moins${low.length ? ` (trop basses : ${JSON.stringify(low)})` : ""}`);
  const overflow = await popover.evaluate((el) => el.scrollWidth - el.clientWidth);
  check(overflow <= 0, `S2 : aucun défilement horizontal du panneau (${overflow} px de trop)`);

  // S3 — netteté § 10 : icônes calées sur la grille de pixels, 24 × 24 ; 0 frange colorée sur une icône et un texte.
  const boxes = await page.$$eval(`${PANEL} svg.rb-icon`, (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { icon: e.getAttribute("data-icon"), x: r.x, y: r.y, w: r.width, h: r.height };
    }));
  const bad = boxes.filter((b) => !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2) || b.w !== 24 || b.h !== 24);
  check(boxes.length === 5 && bad.length === 0, `S3 calage : ${boxes.length} icônes sur la grille de pixels${bad.length ? `, hors grille : ${JSON.stringify(bad)}` : ""}`);
  const icon = fringes(await pixelsOf(page, clipOf(await page.locator(`${PANEL} [data-section="saisie"] .rb-set-h svg`).boundingBox())), WHITE, NAVY);
  check(icon === 0, `S3 : icône de section, ${icon} frange colorée`);
  const name = fringes(await pixelsOf(page, clipOf(await page.locator(`${ROW("finger")} .rb-set-name`).boundingBox())), WHITE, NAVY);
  check(name === 0, `S3 : nom d'une rangée, ${name} frange colorée`);

  // S4 — interrupteur : un appui coupe la gomme automatique, un autre la rallume ; texte des essais inchangé.
  const palm = ROW("gomme-paume");
  check((await page.getAttribute(palm, "role")) === "switch" && (await page.getAttribute(palm, "aria-checked")) === "true" && (await text(palm)) === ON, "S4 : interrupteur à « active »");
  await page.tap(palm);
  check((await page.getAttribute(palm, "aria-checked")) === "false" && (await text(palm)) === OFF, "S4 : un toucher → « coupée »");
  await page.tap(palm);
  check((await page.getAttribute(palm, "aria-checked")) === "true", "S4 : un autre toucher → « active »");

  // S5 — clavier : Entrée et Espace sur une rangée passent à la valeur suivante, comme un clic.
  await page.focus(ROW("finger"));
  await page.keyboard.press("Enter");
  check((await text(ROW("finger"))) === "Doigt : trace", "S5 : Entrée → « Doigt : trace »");
  await page.keyboard.press("Space");
  check((await text(ROW("finger"))) === "Doigt : vue", "S5 : Espace → « Doigt : vue »");

  check(errors.length === 0, `aucune erreur de page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
} catch (e) {
  failed = true;
  console.error(e instanceof Echec ? e.message : e);
} finally {
  await browser.close();
  server.close();
}
if (failed) process.exit(1);
console.log("reglages-design : OK");
