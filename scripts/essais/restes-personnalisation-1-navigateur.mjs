#!/usr/bin/env node
// Essai OG19 au navigateur (restes des chapitres 1a et 1b de la personnalisation) : S1 barre d'outils sur la rangée du haut
// à 1280 × 800 et à 1920 × 1080 (H0, îlot compacté à 1280, cibles de 44 px au moins, sans recouvrir menu, onglets ni
// panneaux) ; S2 raccourci dans l'infobulle (H1-11, Ctrl+Maj+F de « Fonds ») ; S3 fenêtre Fonds (icône propre à « Modèles
// de cours », aucune section surlignée pendant une recherche). Netteté du § 10 du cadrage design à deviceScaleFactor 2.
// Doigt : `page.tap` dans un contexte tactile. Chromium de Playwright, --disable-lcd-text, --force-color-profile=srgb.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/restes-personnalisation-1-navigateur.mjs [--captures] [--dist <dossier> [--nom avant]]
//   --captures : docs/design/captures/restes-personnalisation-1/<nom>-<vue>.png (2x) ; --nom avant : captures seules.
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DIST, Echec, ROOT, clashes, frames, gitSha, islandBoxes, item, loadPlaywright, serve } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "restes personnalisation 1";
const MID = { width: 1280, height: 800 };
const BIG = { width: 1920, height: 1080 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const TOOLS = '[data-island="outils"]';
const TIP = '[role="tooltip"]';
const DIALOG = '[role="dialog"][data-panel="backgrounds"]';
const RAIL = `${DIALOG} [data-edit="fonds-section"]`;
const SEARCH = `${DIALOG} input[data-fonds="search"]`;
const NAVY = hex("#182946");
const WHITE = hex("#ffffff");
const CAPTURES = join(ROOT, "docs", "design", "captures", "restes-personnalisation-1");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
let current = "";
let total = 0;
const check = (cond, msg) => {
  if (!cond) throw new Echec(`${current} : ${msg}`);
  total++;
  console.log(`ok — ${current} ${msg}`);
};

async function start(browser, base, { viewport, touch = false }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(`${base}/`);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  await frames(page);
  return { ctx, page, errors };
}
const noErrors = (errors) => check(errors.length === 0, `aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
async function box(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Echec(`boîte absente : ${sel}`);
  return b;
}
const clip = (b, pad = 0) => ({ x: Math.floor(b.x - pad), y: Math.floor(b.y - pad), width: Math.ceil(b.width + 2 * pad), height: Math.ceil(b.height + 2 * pad) });

/** Icône du DOM : 0 frange colorée ; `row` (fraction de la hauteur) : 0 pixel intermédiaire sur cette rangée (§ 10). */
async function crisp(page, sel, label, row = null) {
  const px = await pixelsOf(page, clip(await box(page, sel)));
  const bg = await page.$eval(sel, (svg) => {
    let el = svg;
    while (el !== null) {
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [];
      if (m.length === 3 || (m.length === 4 && m[3] === 1)) return m.slice(0, 3);
      el = el.parentElement;
    }
    return [255, 255, 255];
  });
  const fr = fringes(px, bg, NAVY);
  check(fr === 0, `${label} : 0 frange colorée (${px.width} × ${px.height} pixels)`);
  if (row !== null) {
    const r = edgeRow(px, Math.round(px.height * row), 0, px.width, bg, NAVY);
    check(r.intermediate === 0, `${label} : 0 pixel intermédiaire sur sa rangée de contrôle (traits ${JSON.stringify(r.runs)})`);
  }
}

/** S1 : îlot d'outils sur la rangée du haut, entier, sans chevauchement ; cibles ≥ 44 ; px entiers ; netteté. */
async function s1(browser, base) {
  for (const [viewport, compact] of [[MID, true], [BIG, false]]) {
    current = `S1 ${viewport.width} × ${viewport.height}`;
    const { ctx, page, errors } = await start(browser, base, { viewport, touch: true });
    try {
      const tools = await box(page, TOOLS);
      check(tools.y === 16, `îlot d'outils sur la rangée du haut (y ${tools.y})`);
      check(tools.x >= 16 && tools.x + tools.width <= viewport.width - 16, `îlot d'outils entier dans la fenêtre (${tools.x} à ${tools.x + tools.width})`);
      check(Number.isInteger(tools.x) && Number.isInteger(tools.width), `îlot posé en px entiers (${tools.x}, ${tools.width})`);
      const top = (await islandBoxes(page)).filter((b) => ["menu", "onglets", "panneaux", "outils"].includes(b.id));
      check(top.length === 4, `menu, onglets, panneaux et outils visibles (${top.map((b) => b.id).join(", ")})`);
      const c = clashes(top);
      check(c.length === 0, `aucun recouvrement sur la rangée du haut${c.length ? ` : ${c.join(", ")}` : ""}`);
      const tabs = top.find((b) => b.id === "onglets");
      check(tabs.width >= 144, `onglets à 144 px au moins (${tabs.width})`);
      check((await page.getAttribute(TOOLS, "data-compact")) === (compact ? "1" : null), compact ? "îlot compacté (data-compact)" : "îlot à sa taille naturelle, sans compaction");
      const buttons = await page.$$eval(`${TOOLS} > button, ${TOOLS} > .rb-bar > button`, (bs) =>
        bs.map((b) => {
          const r = b.getBoundingClientRect();
          return { id: b.getAttribute("data-item") ?? b.getAttribute("aria-label"), grip: b.hasAttribute("data-island-grip"), x: r.x, w: r.width, h: r.height };
        }),
      );
      // La poignée (24 de large, 48 de haut, design-l2 L2-8) se tient au doigt ; elle ne change pas ici.
      const small = buttons.filter((b) => b.w < 44 && !b.grip);
      check(buttons.length >= 17 && small.length === 0, `${buttons.length} boutons, cibles de 44 × 44 px au moins hors poignée${small.length ? ` (trop petits : ${small.map((b) => `${b.id} ${b.w}`).join(", ")})` : ""}`);
      check(buttons.every((b) => b.h >= 44), "hauteur de 44 px au moins partout");
      check(buttons.every((b) => Number.isInteger(b.x) && Number.isInteger(b.w)), "boutons posés en px entiers");
      await crisp(page, `${item("rect")} svg.rb-icon`, "icône Rectangle", 0.5);
      await crisp(page, `${item("backgrounds")} svg.rb-icon`, "icône Fonds");
      await crisp(page, `${item("page-next")} svg.rb-icon`, "icône Page suivante");
      await page.tap(item("pen"));
      await frames(page);
      check((await page.getAttribute(item("pen"), "aria-pressed")) === "true", "au doigt, Stylo se choisit");
      noErrors(errors);
    } finally {
      await ctx.close();
    }
  }
}

/** S2 : raccourci de « Fonds » dans l'infobulle, texte de la bulle = libellé, netteté de la bulle ; Ctrl+Maj+F ouvre. */
async function s2(browser, base) {
  current = "S2";
  const { ctx, page, errors } = await start(browser, base, { viewport: BIG });
  try {
    check((await page.getAttribute(item("backgrounds"), "aria-keyshortcuts")) === "Control+Shift+F", "« Fonds » annonce aria-keyshortcuts Control+Shift+F");
    await page.hover(item("backgrounds"));
    const tip = page.locator(TIP);
    await tip.waitFor({ state: "visible", timeout: 5000 });
    check((await tip.textContent()) === "Fonds", "texte de l'infobulle : « Fonds » (libellé seul)");
    check((await tip.getAttribute("data-keys")) === "Ctrl+Maj+F", "infobulle : data-keys Ctrl+Maj+F");
    const after = await tip.evaluate((e) => getComputedStyle(e, "::after").content);
    check(after === '"Ctrl+Maj+F"', `raccourci montré après le libellé (${after})`);
    const t = await tip.boundingBox();
    check(Number.isInteger(t.x) && Number.isInteger(t.y) && t.x + t.width <= BIG.width, `infobulle en px entiers, dans la fenêtre (${t.x}, ${t.y}, ${t.width})`);
    const px = await pixelsOf(page, { x: t.x + 6, y: t.y, width: Math.floor(t.width) - 12, height: t.height });
    const f = fringes(px, NAVY, WHITE);
    check(f === 0, `infobulle : 0 frange colorée, raccourci compris (${f})`);
    await page.mouse.move(BIG.width / 2, BIG.height / 2);
    await tip.waitFor({ state: "detached", timeout: 5000 });
    await page.hover(item("table"));
    await tip.waitFor({ state: "visible", timeout: 5000 });
    check((await tip.getAttribute("data-keys")) === null, "Tableau, sans raccourci dans la table : aucun data-keys");
    await page.mouse.move(BIG.width / 2, BIG.height / 2);
    await tip.waitFor({ state: "detached", timeout: 5000 });
    await page.keyboard.press("Control+Shift+F");
    await page.waitForSelector(DIALOG, { state: "visible", timeout: 15000 });
    check(true, "Ctrl+Maj+F ouvre la fenêtre des fonds");
    noErrors(errors);
  } finally {
    await ctx.close();
  }
}

/** S3 : icônes des sections, toutes différentes ; « Modèles de cours » nette ; aucune section surlignée pendant la recherche. */
async function s3(browser, base) {
  current = "S3";
  const { ctx, page, errors } = await start(browser, base, { viewport: MID, touch: true });
  try {
    await page.tap(item("backgrounds"));
    await page.waitForSelector(DIALOG, { state: "visible", timeout: 15000 });
    await frames(page);
    const icons = await page.$$eval(`${RAIL} [role="radio"] svg.rb-icon`, (s) => s.map((e) => e.getAttribute("data-icon")));
    check(new Set(icons).size === icons.length && icons.length === 5, `cinq sections, cinq icônes différentes (${icons.join(", ")})`);
    check(icons[3] === "layout-template" && icons[2] === "grid", "« Lignes et grilles » : grid ; « Modèles de cours » : layout-template");
    // Rangée à 6,5 / 24 : elle coupe les bords gauche et droit du rectangle du haut (traits verticaux).
    await crisp(page, `${RAIL} [data-choice="lessons"] svg.rb-icon`, "icône layout-template", 6.5 / 24);
    const checked = () => page.$$eval(`${RAIL} [role="radio"][aria-checked="true"]`, (bs) => bs.map((b) => b.getAttribute("data-choice")));
    check(JSON.stringify(await checked()) === '["colors"]', "à l'ouverture, « Couleurs » est surlignée");
    await page.fill(SEARCH, "mer");
    await frames(page);
    check((await page.locator(`${DIALOG} .rb-bg-results`).textContent()) === "Résultats", "recherche : titre « Résultats »");
    check((await checked()).length === 0, "pendant la recherche, aucune section surlignée");
    await page.fill(SEARCH, "");
    await frames(page);
    check(JSON.stringify(await checked()) === '["colors"]', "champ vidé : « Couleurs » de nouveau surlignée");
    await page.fill(SEARCH, "mer");
    await page.tap(`${RAIL} [data-choice="lessons"]`);
    await frames(page);
    check(JSON.stringify(await checked()) === '["lessons"]' && (await page.inputValue(SEARCH)) === "", "toucher une section pendant la recherche : la section, champ vidé");
    noErrors(errors);
  } finally {
    await ctx.close();
  }
}

async function captureSet(browser, base, nom) {
  await mkdir(CAPTURES, { recursive: true });
  const shot = async (page, name, c) => {
    const path = join(CAPTURES, `${nom}-${name}.png`);
    await page.screenshot({ path, clip: c, animations: "disabled", caret: "hide" });
    console.log(`capture : ${path}`);
  };
  for (const vp of [MID, BIG]) {
    const { ctx, page } = await start(browser, base, { viewport: vp });
    await shot(page, `barre-${vp.width}`, { x: 0, y: 0, width: vp.width, height: 240 });
    await ctx.close();
  }
  {
    const { ctx, page } = await start(browser, base, { viewport: BIG });
    await page.hover(item("backgrounds"));
    await page.locator(TIP).waitFor({ state: "visible", timeout: 5000 });
    const b = await box(page, item("backgrounds"));
    const t = await box(page, TIP);
    const x = Math.floor(Math.min(b.x, t.x) - 24);
    const right = Math.ceil(Math.max(b.x + b.width, t.x + t.width) + 24);
    await shot(page, "infobulle", { x, y: Math.floor(b.y - 16), width: right - x, height: Math.ceil(t.y + t.height + 16 - (b.y - 16)) });
    await ctx.close();
  }
  {
    const { ctx, page } = await start(browser, base, { viewport: MID });
    await page.click(item("backgrounds"));
    await page.waitForSelector(DIALOG, { state: "visible", timeout: 15000 });
    await page.fill(SEARCH, "mer");
    await page.waitForTimeout(400);
    await frames(page);
    await shot(page, "fonds-recherche", clip(await box(page, DIALOG), 8));
    await ctx.close();
  }
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const captures = process.argv.includes("--captures");
  if (nom === "avant" && !captures) {
    console.error(`${LABEL} : usage — --nom avant n'a de sens qu'avec --captures (captures « avant » seules)`);
    return 2;
  }
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist}/index.html absent : construire d'abord l'application (scripts/verifier.sh)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ dist });
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (captures) await captureSet(browser, base, nom);
    if (nom === "avant") {
      console.log(`${LABEL} : captures « avant » seules, mesures sautées`);
      return 0;
    }
    await s1(browser, base);
    await s2(browser, base);
    await s3(browser, base);
    console.log(`${total} contrôles`);
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
