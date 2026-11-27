#!/usr/bin/env node
// Essai design L4 au navigateur (docs/plans/design-l4-cadrage.md, L4-20 ; S1, S3, S4, S5, S6) : barre d'annotation
// seule en annotation, commande segmentée Dessin / Souris (double clic sans retour), bande de la coque, cadre
// désactivable gardé sur l'appareil, bandeau « Envoyé au tableau » sans boîte, barre verticale du profil Simple,
// netteté du § 10 du cadrage design en annotation (calage, bord du Rectangle, franges du segment enfoncé, du bouton
// plein, de la zone et du bandeau, contre-épreuve). Faux hôte `?annotation=faux`, `?fichiers=repli`. Chromium de
// Playwright, --disable-lcd-text, --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/design-l4-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/essais/design-l4-<nom>-barre.png et design-l4-<nom>-simple.png (barre montrée en annotation, 2x) ;
//                pour l'après, design-l4-apres-bandeau.png et les recadrages de la maquette 02
//                (design-l4-maquette-barre.png, design-l4-maquette-bandeau.png) ; --dist : sert un autre build ;
//                --nom avant : captures seules, mesures sautées.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { clickItem, DIST, Echec, frames, gitSha, item, loadPlaywright, ROOT, serve, TAB, VIEWPORT } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "design L4";
const VIEW = { width: 1920, height: 1080 };
const TALL = { width: 1280, height: 1080 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const LAYOUT = ".rb-layout";
const ANN = '[data-toolbar="annotation"]';
const SHOWN_BAR = `${LAYOUT}[data-mode="annotation"] .rb-bar`;
const SEG = (m) => `button[data-segment="${m}"]`;
const TOAST = ".rb-toast";
const FRAME = 'button[data-reglage="cadre"]';
const WHITE = hex("#ffffff");
const NAVY = hex("#182946");
const VIOLET_100 = hex("#EDE8FD");
const VIOLET_600 = hex("#6044EB");
const VIOLET_700 = hex("#4F35C4");
const GRAY_800 = hex("#333333");
const SUCCESS = hex("#27AE60");
const MAQUETTE = join(ROOT, "docs", "design", "maquettes", "02-annotation-bureau");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};

function watch(page) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.accept();
  });
  return { errors, dialogs };
}
const noErrors = (w, label) => check(w.errors.length === 0, `${label} : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
}
const body = (page, key) => page.evaluate((k) => document.body.dataset[k] ?? null, key);
async function waitBody(page, key, value) {
  await page.waitForFunction(([k, v]) => document.body.dataset[k] === v, [key, value], { timeout: 15000 });
  await frames(page);
}
async function waitMode(page, mode) {
  await page.waitForSelector(`${LAYOUT}[data-mode="${mode}"]`, { timeout: 15000 });
  await frames(page);
}
async function waitStage(page, name, source) {
  await page.waitForFunction(([n, src]) => new RegExp(src).test(document.querySelector("#stage")?.getAttribute(n) ?? ""), [name, source], { timeout: 15000 });
  await frames(page);
}
const text = async (page, sel) => ((await page.textContent(sel)) ?? "").trim();
/** Barres visibles (`data-toolbar`), dans l'ordre du document. */
/** Barres du profil par défaut (design-l2) : toutes en îlots, dans l'ordre du DOM, aucune barre d'annotation. */
const DEFAULT_BARS = '["menu","panneaux","historique","outils","pages"]';
const shownBars = (page) =>
  page.$$eval("[data-toolbar]", (els) => els.filter((e) => e.getClientRects().length > 0).map((e) => e.getAttribute("data-toolbar")));
async function enter(page) {
  await page.click(item("desktop-annotation"));
  await waitMode(page, "annotation");
  await waitBody(page, "annotation", "1");
}
async function leave(page) {
  await page.click(item("ann-desktop-annotation"));
  await waitMode(page, "board");
}
async function chooseProfile(page, id) {
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click(`[data-profile="${id}"]`);
  await frames(page);
}
/** Zone de capture en px CSS entiers, élargie au pixel entier qui contient la boîte. */
const clipOf = (b) => {
  const x = Math.floor(b.x);
  const y = Math.floor(b.y);
  return { x, y, width: Math.ceil(b.x + b.width) - x, height: Math.ceil(b.y + b.height) - y };
};
const iconPixels = async (page, sel) => pixelsOf(page, await page.locator(`${sel} svg.rb-icon`).boundingBox());

/** (1) Calage : chaque svg.rb-icon visible sous `scope` a x et y × 2 entiers et mesure 24 × 24. */
async function calage(page, scope, label, min) {
  const boxes = await page.$$eval(`${scope} svg.rb-icon`, (els) =>
    els.filter((e) => e.getClientRects().length > 0).map((e) => {
      const r = e.getBoundingClientRect();
      return { icon: e.getAttribute("data-icon"), x: r.x, y: r.y, w: r.width, h: r.height };
    }));
  const bad = boxes.filter((b) => !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2) || b.w !== 24 || b.h !== 24);
  check(boxes.length >= min && bad.length === 0, `calage (${label}) : ${boxes.length} icônes sur la grille de pixels${bad.length ? `, hors grille : ${JSON.stringify(bad)}` : ""}`);
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

/** S1 : barre d'annotation seule, commande segmentée, double clic sans retour, bande de la coque, retour au tableau. */
async function s1(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  check(JSON.stringify(await shownBars(page)) === DEFAULT_BARS, "S1 tableau : barres outils et pages, aucune barre d'annotation");
  await enter(page);
  const bars = await shownBars(page);
  check(JSON.stringify(bars) === '["annotation"]' && (await page.locator('[data-role="annotation"]').count()) === 1, `S1 : seule la barre d'annotation est montrée (${bars})`);
  check((await page.getAttribute(SEG("draw"), "aria-pressed")) === "true" && (await page.getAttribute(SEG("mouse"), "aria-pressed")) === "false", "S1 : « Dessin » enfoncé à l'entrée");
  await page.click(SEG("mouse"));
  await waitBody(page, "pointeur", "mouse");
  check((await page.getAttribute(SEG("mouse"), "aria-pressed")) === "true", "S1 : « Souris » → data-pointeur=mouse, « Souris » enfoncé");
  await page.dblclick(SEG("draw"));
  await waitBody(page, "pointeur", "draw");
  await page.waitForTimeout(300);
  await frames(page);
  check((await body(page, "pointeur")) === "draw" && (await page.getAttribute(SEG("draw"), "aria-pressed")) === "true", "S1 : double clic sur « Dessin » : reste en dessin (aucun retour à la souris)");
  const h = await page.locator(ANN).evaluate((e) => Math.ceil(e.getBoundingClientRect().height));
  const bande = await body(page, "annotationBande");
  check(bande === `top:${h}`, `S1 : bande de la coque = barre d'annotation (annotationBande ${bande}, attendu top:${h})`);
  await leave(page);
  const after = await shownBars(page);
  check(
    JSON.stringify(after) === DEFAULT_BARS && (await page.locator("button[data-segment]").count()) === 0 && (await page.locator(item("annotation-pointer")).count()) === 0,
    `S1 : à la sortie, les barres du tableau reviennent, sans barre d'annotation ni « Souris » (${after})`,
  );
  noErrors(w, "S1");
  await ctx.close();
}

/** S3 : cadre désactivable, gardé sur l'appareil ; absent au web sans faux hôte. */
async function s3(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await clickItem(page, "settings");
  await page.waitForSelector("#reglages", { timeout: 15000 });
  check((await page.locator(FRAME).count()) === 0, "S3 web sans faux hôte : aucun bouton du cadre");
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  await clickItem(page, "settings");
  await page.waitForSelector(FRAME, { timeout: 15000 });
  check((await text(page, FRAME)) === "Cadre de l'annotation : affiché", "S3 : « Cadre de l'annotation : affiché »");
  await page.click(FRAME);
  check((await text(page, FRAME)) === "Cadre de l'annotation : masqué", "S3 : un clic → « Cadre de l'annotation : masqué »");
  await enter(page);
  check((await body(page, "annotationCadre")) === "0", "S3 : cadre masqué → annotationCadre=0");
  await leave(page);
  await page.reload();
  await ready(page);
  await clickItem(page, "settings");
  await page.waitForSelector(FRAME, { timeout: 15000 });
  check((await text(page, FRAME)) === "Cadre de l'annotation : masqué", "S3 : après rechargement, toujours masqué (gardé sur l'appareil)");
  await page.click(FRAME);
  check((await text(page, FRAME)) === "Cadre de l'annotation : affiché", "S3 : réaffiché");
  await enter(page);
  check((await body(page, "annotationCadre")) === "1", "S3 : cadre affiché → annotationCadre=1");
  await leave(page);
  noErrors(w, "S3");
  await ctx.close();
}

/** S4 : « Envoyer au tableau » et le bouton accolé : bandeau en bas à droite de la scène, aucune boîte. */
async function s4(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  await clickItem(page, "page-add");
  await waitStage(page, "data-page", "^2/2$");
  await page.click(item("page-prev"));
  await waitStage(page, "data-page", "^1/2$");
  await enter(page);
  const d0 = w.dialogs.length;
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  await page.locator(TOAST).waitFor({ state: "visible", timeout: 15000 });
  const t = await text(page, TOAST);
  check(t === "Envoyé au tableau : page 2", `S4 : bandeau « ${t} »`);
  await waitStage(page, "data-page", "^2/3$");
  check(w.dialogs.length === d0, `S4 : le tableau revient sur la page 2 de 3, aucune boîte (${w.dialogs.length - d0})`);
  const tb = await page.locator(TOAST).boundingBox();
  const sb = await page.locator(".rb-stages").boundingBox();
  const right = sb.x + sb.width - (tb.x + tb.width);
  const bottom = sb.y + sb.height - (tb.y + tb.height);
  check(Math.abs(right - 24) <= 1 && Math.abs(bottom - 24) <= 1, `S4 : bandeau en bas à droite de la scène (${right} px à droite, ${bottom} px en bas ; 24 attendus)`);
  const parti = await page.locator(TOAST).waitFor({ state: "detached", timeout: 7000 }).then(() => true, () => false);
  check(parti, "S4 : le bandeau part seul");
  await enter(page);
  const d1 = w.dialogs.length;
  // Instant d'apparition du bandeau, noté par la page elle-même (le minuteur de 4 s court depuis cet instant).
  await page.evaluate((sel) => {
    window.__toastApparu = null;
    const o = new MutationObserver(() => {
      if (document.querySelector(sel) !== null) { window.__toastApparu = performance.now(); o.disconnect(); }
    });
    o.observe(document.body, { childList: true, subtree: true });
  }, TOAST);
  await page.click(item("annotation-send-new"));
  await waitMode(page, "board");
  await page.locator(TOAST).waitFor({ state: "visible", timeout: 15000 });
  check((await text(page, TOAST)) === "Envoyé au tableau : page 1", "S4 : bouton accolé : bandeau « Envoyé au tableau : page 1 »");
  check(((await page.locator(`${TAB}[aria-selected="true"]`).textContent()) ?? "").includes("Capture du bureau"), "S4 : onglet « Capture du bureau » montré");
  check(w.dialogs.length === d1, "S4 : aucune boîte (nouvel onglet)");
  // Preuve indépendante du minuteur de 4 s : l'avis est là juste avant l'entrée (même évaluation que la pose de
  // l'observateur), puis il disparaît du DOM après le geste d'entrée, jamais avant (marqueur posé par la page).
  const avant = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el === null) return false;
    window.__toastRetire = null;
    new MutationObserver(() => {
      if (!el.isConnected && window.__toastRetire === null) window.__toastRetire = performance.now();
    }).observe(document.body, { childList: true, subtree: true });
    window.__toastEntree = performance.now();
    return true;
  }, TOAST);
  await enter(page);
  const retire = await page.evaluate(() => window.__toastRetire ?? null);
  const entree = await page.evaluate(() => window.__toastEntree ?? null);
  const apparu = await page.evaluate(() => window.__toastApparu ?? null);
  check(avant && retire !== null && retire >= entree && apparu !== null && retire - apparu < 4000 && (await page.locator(TOAST).count()) === 0, "S4 : bandeau présent avant l'entrée, retiré par l'entrée en annotation");
  await leave(page);
  noErrors(w, "S4");
  await ctx.close();
}

/** S5 : netteté § 10 en annotation, 1920 × 1080 à 2x. */
async function s5(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  await enter(page);
  await page.mouse.move(VIEW.width - 10, VIEW.height - 10);
  await frames(page);
  await calage(page, ANN, "barre d'annotation, M", 14);
  const px = await iconPixels(page, item("ann-rect"));
  check(px.width === 48 && px.height === 48, `capture de l'icône Rectangle : ${px.width} × ${px.height} pixels (48 × 48)`);
  const y = 24;
  const bg = [px.data[y * px.width * 4], px.data[y * px.width * 4 + 1], px.data[y * px.width * 4 + 2]];
  const row = edgeRow(px, y, 0, px.width, bg, NAVY);
  console.log(`rangée du Rectangle en annotation (gris, 2x) : ${row.gray.join(" ")}`);
  check(row.intermediate === 0, `bord du Rectangle : 0 pixel intermédiaire (${row.intermediate})`);
  check(JSON.stringify(row.runs) === "[3,3]", `bord du Rectangle : deux traits de 3 pixels d'encre (${JSON.stringify(row.runs)})`);
  check(fringes(px, bg, NAVY) === 0, "Rectangle : 0 frange colorée");
  const seg = fringes(await iconPixels(page, SEG("draw")), VIOLET_100, VIOLET_700);
  check(seg === 0, `segment « Dessin » enfoncé (#4F35C4 sur #EDE8FD) : 0 frange (${seg})`);
  const send = fringes(await iconPixels(page, item("annotation-send")), VIOLET_600, WHITE);
  check(send === 0, `« Envoyer au tableau » (blanc sur #6044EB) : 0 frange (${send})`);
  const drop = fringes(await iconPixels(page, '[data-item="depot-annotation"]'), WHITE, NAVY);
  check(drop === 0, `zone de dépôt : 0 frange (${drop})`);
  await counterProof(page);
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  await page.locator(TOAST).waitFor({ state: "visible", timeout: 15000 });
  await page.mouse.move(10, VIEW.height / 2);
  await frames(page);
  await calage(page, TOAST, "bandeau", 1);
  const ok = fringes(await iconPixels(page, ".rb-toast-ok"), SUCCESS, WHITE);
  check(ok === 0, `pastille du bandeau (blanc sur #27AE60) : 0 frange (${ok})`);
  const txt = fringes(await pixelsOf(page, clipOf(await page.locator(`${TOAST} [data-toast-text]`).boundingBox())), WHITE, GRAY_800);
  check(txt === 0, `texte du bandeau (#333333 sur blanc) : 0 frange (${txt})`);
  const strong = fringes(await pixelsOf(page, clipOf(await page.locator(`${TOAST} b`).boundingBox())), WHITE, VIOLET_700);
  check(strong === 0, `« page N » du bandeau (#4F35C4 sur blanc) : 0 frange (${strong})`);
  noErrors(w, "S5");
  await ctx.close();
}

/** Boutons de la barre d'annotation : boîtes en px CSS. */
const annButtons = (page) =>
  page.locator(`${ANN} button`).evaluateAll((bs) =>
    bs.map((b) => {
      const r = b.getBoundingClientRect();
      return { id: b.dataset.item ?? b.dataset.segment ?? b.textContent, x: r.x, y: r.y, w: r.width, h: r.height };
    }));

/** S6 : profil Simple en annotation, barre verticale (D3 : une colonne contrôlée en 1280 × 1080). */
async function s6(browser, base) {
  for (const viewport of [VIEWPORT, TALL]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    const size = `${viewport.width} × ${viewport.height}`;
    await page.goto(`${base}/?fichiers=repli&annotation=faux`);
    await ready(page);
    await chooseProfile(page, "simple");
    await enter(page);
    const bars = await shownBars(page);
    check(JSON.stringify(bars) === '["annotation"]' && (await page.locator(`${ANN}[data-dock="left"]`).count()) === 1, `S6 ${size} : la barre d'annotation à gauche est la seule barre (${bars})`);
    const wpx = await page.locator(ANN).evaluate((e) => Math.ceil(e.getBoundingClientRect().width));
    const bande = await body(page, "annotationBande");
    check(bande === `left:${wpx}`, `S6 ${size} : annotationBande ${bande} (attendu left:${wpx})`);
    const boxes = await annButtons(page);
    const out = boxes.filter((b) => b.x < 0 || b.y < 0 || b.x + b.w > viewport.width || b.y + b.h > viewport.height);
    check(boxes.length >= 10 && out.length === 0, `S6 ${size} : ${boxes.length} boutons, chacun entier dans la fenêtre${out.length ? ` (coupés : ${out.map((b) => b.id).join(", ")})` : ""}`);
    if (viewport === VIEWPORT) {
      const xs900 = [...new Set(boxes.map((b) => Math.round(b.x)))];
      check(xs900.length === 2 && bande === "left:140", `S6 ${size} : deux colonnes (x ${xs900.join(", ")}), bande ${bande} (attendu left:140)`);
    }
    if (viewport === TALL) {
      const xs = [...new Set(boxes.map((b) => Math.round(b.x)))];
      check(xs.length === 1, `S6 ${size} : une seule colonne (x ${xs.join(", ")})`);
      const draw = await page.locator(SEG("draw")).boundingBox();
      const mouse = await page.locator(SEG("mouse")).boundingBox();
      check(Math.abs(mouse.x - draw.x) < 0.5 && Math.abs(mouse.y - (draw.y + draw.height)) < 0.5, `S6 : « Souris » sous « Dessin », collé (${draw.y + draw.height} → ${mouse.y})`);
      const send = await page.locator(item("annotation-send")).boundingBox();
      const sendNew = await page.locator(item("annotation-send-new")).boundingBox();
      const gap = sendNew.y - (send.y + send.height);
      check(Math.abs(gap - 2) < 0.5 && Math.abs(sendNew.x - send.x) < 0.5, `S6 : « Envoyer dans un nouvel onglet » 2 px sous « Envoyer au tableau » (${gap} px)`);
    }
    await leave(page);
    noErrors(w, `S6 ${size}`);
    await ctx.close();
  }
}

/** Captures à 2x (T9) : barre montrée en annotation (profil par défaut, puis Simple) ; pour l'après, le bandeau. */
async function captureSet(browser, base, nom) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const out = (n) => join(ROOT, "docs", "essais", `design-l4-${nom}-${n}.png`);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  await enter(page);
  await page.mouse.move(VIEW.width - 10, VIEW.height - 10);
  await frames(page);
  await page.locator(SHOWN_BAR).first().screenshot({ path: out("barre") });
  if (nom !== "avant") {
    await page.click(item("annotation-send"));
    await waitMode(page, "board");
    await page.locator(TOAST).waitFor({ state: "visible", timeout: 15000 });
    await page.mouse.move(10, VIEW.height / 2);
    await frames(page);
    const t = await page.locator(TOAST).boundingBox();
    await page.screenshot({ path: out("bandeau"), clip: { x: t.x - 16, y: t.y - 16, width: t.width + 32, height: t.height + 32 } });
  }
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  await chooseProfile(page, "simple");
  await enter(page);
  await page.mouse.move(VIEW.width - 10, VIEW.height - 10);
  await frames(page);
  await page.locator(SHOWN_BAR).first().screenshot({ path: out("simple") });
  console.log(`captures : ${out("barre")}, ${nom === "avant" ? "" : `${out("bandeau")}, `}${out("simple")}`);
  await ctx.close();
}

/** Recadrages de docs/design/maquettes/02-annotation-bureau.png (3840 × 2160) : îlot de la barre et bandeau, boîtes lues
 *  dans la maquette HTML à 1x, découpées à 2x dans le PNG. */
async function maquetteCrops(browser) {
  const html = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const p1 = await html.newPage();
  await p1.goto(pathToFileURL(`${MAQUETTE}.html`).href);
  const boxes = { barre: await p1.locator(".island").boundingBox(), bandeau: await p1.locator(".toast").boundingBox() };
  await html.close();
  const png = await browser.newContext({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
  const p2 = await png.newPage();
  await p2.setContent(`<body style="margin:0"><img id="m" style="display:block" src="data:image/png;base64,${readFileSync(`${MAQUETTE}.png`).toString("base64")}"></body>`);
  await p2.locator("#m").evaluate((img) => img.decode());
  for (const [n, b] of Object.entries(boxes)) {
    const clip = { x: Math.max(0, Math.floor(b.x * 2) - 16), y: Math.max(0, Math.floor(b.y * 2) - 16), width: Math.ceil(b.width * 2) + 32, height: Math.ceil(b.height * 2) + 32 };
    const path = join(ROOT, "docs", "essais", `design-l4-maquette-${n}.png`);
    await p2.screenshot({ path, clip });
    console.log(`capture : ${path}`);
  }
  await png.close();
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
    if (captures) await maquetteCrops(browser);
    await s1(browser, base);
    await s3(browser, base);
    await s4(browser, base);
    await s5(browser, base);
    await s6(browser, base);
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
