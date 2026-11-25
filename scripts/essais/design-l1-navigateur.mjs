#!/usr/bin/env node
// Essai design L1 au navigateur (docs/plans/design-l1-cadrage.md, L1-7, L1-8 ; S1, S2, S5) : netteté du § 10 du cadrage
// design (calage des icônes sur la grille de pixels, bord du Rectangle, franges, contre-épreuve), tailles S/M/L,
// infobulle (survol, clavier, appui long au doigt par CDP). Chromium de Playwright, 1920 × 1080 à 2x, --disable-lcd-text,
// --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e,
// jamais avec --captures.
// Usage : node scripts/essais/design-l1-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/essais/design-l1-<nom>.png (fenêtre 3840 × 2160), design-l1-<nom>-barre.png, et pour l'après
//                design-l1-infobulle.png ; --dist : sert un autre build ; --nom avant : captures seules, mesures sautées.
// Pixels lus dans une capture Playwright à 2x (nettete.mjs, pixelsOf), jamais par inkIn (canvas #scene, sans les boutons).
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { DIST, Echec, ROOT, frames, gitSha, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "design L1";
const VIEW = { width: 1920, height: 1080 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const OUTILS = '[data-toolbar="outils"]';
const TIP = '[role="tooltip"]';
const WHITE = hex("#ffffff");
const NAVY = hex("#182946");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};

async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
}

/** Scène des captures (design-cadrage.md:49-50) : trois traits et un rectangle à la souris, puis Stylo actif, souris
 *  au milieu de la scène (hors de toute barre). */
async function drawScene(page) {
  const mouse = stageMouse(page);
  await page.click(item("pen"));
  for (const [y, dx] of [[200, 500], [300, 420], [400, 560]]) {
    await mouse.move(200, y);
    await mouse.down();
    await mouse.move(200 + dx, y + 60, { steps: 12 });
    await mouse.up();
  }
  await page.click(item("rect"));
  await mouse.move(900, 200);
  await mouse.down();
  await mouse.move(1300, 500, { steps: 12 });
  await mouse.up();
  await page.click(item("pen"));
  await page.mouse.move(VIEW.width / 2, VIEW.height / 2);
  await frames(page);
}

/** (1) Calage : chaque svg.rb-icon visible a x et y × 2 entiers et mesure 24 × 24. */
async function calage(page, label, min) {
  const boxes = await page.$$eval("svg.rb-icon", (els) =>
    els.filter((e) => e.getClientRects().length > 0).map((e) => {
      const r = e.getBoundingClientRect();
      return { icon: e.getAttribute("data-icon"), x: r.x, y: r.y, w: r.width, h: r.height };
    }));
  const bad = boxes.filter((b) => !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2) || b.w !== 24 || b.h !== 24);
  check(boxes.length >= min && bad.length === 0, `calage (${label}) : ${boxes.length} icônes sur la grille de pixels${bad.length ? `, hors grille : ${JSON.stringify(bad)}` : ""}`);
}

async function size(page, sel, px, msg) {
  const b = await page.locator(sel).boundingBox();
  check(b !== null && b.width === px && b.height === px, `${msg} : ${b?.width} × ${b?.height} (attendu ${px} × ${px})`);
}

/** (2) Bord et (3) franges du Rectangle, souris hors de la barre. */
async function rectEdge(page) {
  const b = await page.locator(`${item("rect")} svg.rb-icon`).boundingBox();
  const px = await pixelsOf(page, b);
  check(px.width === 48 && px.height === 48, `capture de l'icône Rectangle : ${px.width} × ${px.height} pixels (48 × 48)`);
  const y = 12 * 2;
  const bg = [px.data[y * px.width * 4], px.data[y * px.width * 4 + 1], px.data[y * px.width * 4 + 2]];
  const row = edgeRow(px, y, 0, px.width, bg, NAVY);
  console.log(`rangée du Rectangle (gris, 2x) : ${row.gray.join(" ")}`);
  check(row.intermediate === 0, `bord du Rectangle : 0 pixel intermédiaire (${row.intermediate})`);
  check(JSON.stringify(row.runs) === "[3,3]", `bord du Rectangle : deux traits de 3 pixels d'encre (${JSON.stringify(row.runs)})`);
  const f = fringes(px, bg, NAVY);
  check(f === 0, `Rectangle : 0 frange colorée (${f})`);
}

/** (4) Contre-épreuve : un témoin sans calage (viewBox 0 0 24 24) doit montrer du flou, sinon la mesure est aveugle. */
async function counterProof(page) {
  await page.evaluate(() => {
    const ns = "http://www.w3.org/2000/svg";
    const host = document.createElement("div");
    host.id = "temoin-nettete";
    host.style.cssText = "position:fixed;left:200px;top:400px;width:24px;height:24px;background:#ffffff;color:#182946;z-index:50";
    const svg = document.createElementNS(ns, "svg");
    const attrs = { viewBox: "0 0 24 24", width: "24", height: "24", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round" };
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    svg.style.display = "block";
    const rect = document.createElementNS(ns, "rect");
    for (const [k, v] of Object.entries({ width: "18", height: "18", x: "3", y: "3", rx: "2" })) rect.setAttribute(k, v);
    svg.append(rect);
    host.append(svg);
    document.body.append(host);
  });
  await frames(page);
  const px = await pixelsOf(page, { x: 200, y: 400, width: 24, height: 24 });
  const row = edgeRow(px, 24, 0, px.width, WHITE, NAVY);
  console.log(`contre-épreuve (viewBox 0 0 24 24, gris) : ${row.gray.join(" ")}`);
  await page.evaluate(() => document.getElementById("temoin-nettete")?.remove());
  check(row.intermediate >= 2, `contre-épreuve : le témoin sans calage donne ${row.intermediate} pixels intermédiaires (≥ 2), la mesure n'est pas aveugle`);
}

/** S2 au survol, puis (3) franges de l'infobulle (coins arrondis exclus : 6 px de chaque côté). */
async function hoverTip(page, captures) {
  await page.hover(item("rect"));
  const tip = page.locator(TIP);
  await tip.waitFor({ state: "visible", timeout: 5000 });
  check((await tip.textContent()) === "Rectangle", "S2 : survol de « Rectangle » : infobulle « Rectangle »");
  const t = await tip.boundingBox();
  const b = await page.locator(item("rect")).boundingBox();
  check(t.y >= b.y + b.height, `S2 : infobulle sous le bouton (haut ${t.y}, bas du bouton ${b.y + b.height})`);
  check(Number.isInteger(t.x) && Number.isInteger(t.y), `infobulle posée en px entiers (${t.x}, ${t.y})`);
  check(await tip.evaluate((e) => e.closest(".rb-bar") === null), "infobulle hors de la barre");
  const px = await pixelsOf(page, { x: t.x + 6, y: t.y, width: Math.floor(t.width) - 12, height: t.height });
  const f = fringes(px, NAVY, WHITE);
  check(f === 0, `infobulle : 0 frange colorée (${f})`);
  if (captures) {
    const x = Math.floor(Math.min(b.x, t.x) - 16);
    const y = Math.floor(b.y - 16);
    const right = Math.ceil(Math.max(b.x + b.width, t.x + t.width) + 16);
    const bottom = Math.ceil(t.y + t.height + 16);
    const path = join(ROOT, "docs", "essais", "design-l1-infobulle.png");
    await page.screenshot({ path, clip: { x, y, width: right - x, height: bottom - y } });
    console.log(`capture : ${path}`);
  }
  await page.mouse.move(VIEW.width / 2, VIEW.height / 2);
  await tip.waitFor({ state: "detached", timeout: 5000 });
}

/** S2 et S3 au clavier : Tab jusqu'à « Annuler ». */
async function keyboardTip(page) {
  await page.focus(item("undo"));
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  check((await page.evaluate(() => document.activeElement?.getAttribute("data-item"))) === "undo", "Tab : focus sur « Annuler »");
  const tips = page.locator(TIP);
  check((await tips.count()) === 1 && (await tips.textContent()) === "Annuler", "S2 : au clavier, une seule infobulle « Annuler »");
  check((await page.getAttribute(item("undo"), "aria-label")) === "Annuler", "S3 : nom accessible « Annuler »");
  await page.evaluate(() => document.activeElement?.blur());
}

/** S5 : profil simple (gauche, L) puis retour au défaut ; taille S forcée sur la barre (aucun profil livré en S). */
async function sizes(page) {
  await size(page, item("pen"), 48, "S5 : bouton M du profil par défaut");
  await page.evaluate((sel) => document.querySelector(sel)?.setAttribute("data-size", "s"), OUTILS);
  await size(page, item("pen"), 44, "S5 : bouton S");
  await calage(page, "taille S", 20);
  await page.evaluate((sel) => document.querySelector(sel)?.setAttribute("data-size", "m"), OUTILS);
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click('[data-profile="simple"]');
  await frames(page);
  check((await page.locator(`${OUTILS}[data-dock="left"][data-size="l"]`).count()) === 1, "S5 : profil simple : barre à gauche, taille l");
  await size(page, item("pen"), 64, "S5 : bouton L du profil simple");
  await calage(page, "profil simple, L", 8);
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click('[data-profile="defaut"]');
  await frames(page);
  check((await page.locator(`${OUTILS}[data-dock="floating"]`).count()) === 1, "retour au profil par défaut");
}

/** (5) Appui long au doigt (S2), contexte tactile, séance CDP : infobulle, clic au relâcher, aucun menu contextuel. */
/** Bouton à icône grisé (`disabled`) : l'infobulle dépend de `pointerenter` sur un `<button disabled>`. */
async function disabledTip(page) {
  check(await page.locator(item("redo")).isDisabled(), "« Rétablir » est grisé au démarrage");
  await page.hover(item("redo"), { force: true });
  const tip = page.locator(TIP);
  const vu = await tip.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false);
  console.log(`survol de « Rétablir » grisé : infobulle ${vu ? "montrée" : "absente"}`);
  check(vu && (await tip.textContent()) === "Rétablir", "S2 : survol de « Rétablir » grisé : infobulle « Rétablir »");
  await page.mouse.move(VIEW.width / 2, VIEW.height / 2);
  await tip.waitFor({ state: "detached", timeout: 5000 });
}

async function longPress(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, hasTouch: true });
  try {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(url);
    await ready(page);
    await page.evaluate(() => {
      const b = document.querySelector('[data-item="eraser"]');
      window.__appui = [];
      for (const t of ["pointerdown", "pointerup", "click", "contextmenu"]) b.addEventListener(t, () => window.__appui.push(t));
    });
    const b = await page.locator(item("eraser")).boundingBox();
    const cdp = await ctx.newCDPSession(page);
    const pt = { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
    await page.waitForTimeout(800);
    const tip = page.locator(TIP);
    check((await tip.isVisible()) && (await tip.textContent()) === "Gomme", "S2 : appui de 800 ms au doigt sur « Gomme » : infobulle « Gomme »");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await frames(page);
    const ev = await page.evaluate(() => window.__appui);
    console.log(`appui long : ${ev.join(", ")}`);
    check(["pointerdown", "pointerup", "click"].every((t) => ev.includes(t)) && !ev.includes("contextmenu"), "S2 : appui long : pointerdown, pointerup, click reçus, aucun contextmenu");
    check((await page.getAttribute(item("eraser"), "aria-pressed")) === "true", "S2 : au relâcher, la gomme est choisie");
    check(errors.length === 0, `aucune erreur dans la page après l'appui long${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
  } finally {
    await ctx.close();
  }
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const captures = process.argv.includes("--captures");
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
  const url = `http://127.0.0.1:${server.address().port}/`;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(url);
    await ready(page);
    await drawScene(page);
    if (captures) {
      const win = join(ROOT, "docs", "essais", `design-l1-${nom}.png`);
      await page.screenshot({ path: win });
      await page.locator(OUTILS).screenshot({ path: join(ROOT, "docs", "essais", `design-l1-${nom}-barre.png`) });
      console.log(`captures : ${win}, design-l1-${nom}-barre.png`);
    }
    if (nom === "avant") {
      console.log(`${LABEL} : captures « avant » seules, mesures sautées`);
      return 0;
    }
    await calage(page, "profil par défaut, M", 20);
    await rectEdge(page);
    await counterProof(page);
    await hoverTip(page, captures);
    await disabledTip(page);
    await keyboardTip(page);
    await sizes(page);
    check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
    await longPress(browser, url);
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
