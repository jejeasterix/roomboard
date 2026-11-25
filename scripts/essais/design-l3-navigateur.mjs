#!/usr/bin/env node
// Essai design L3 au navigateur (docs/plans/design-l3-cadrage.md, L3-27, L3-28 ; S1 à S6) : éditeur de profils en
// panneau latéral de 600 px, barre en direct, export et import depuis le panneau, « Revenir à l'origine », tri au
// pointeur (souris, doigt), au clic et au clavier, abandon confirmé, barre d'annotation et catalogue selon la barre,
// petit écran et barre flottante, netteté du § 10 du cadrage design dans le panneau (calage, bords sans demi-teinte,
// franges, contre-épreuve). Faux hôte `?annotation=faux`, `?fichiers=repli`. Chromium de Playwright,
// --disable-lcd-text, --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/design-l3-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/essais/design-l3-<nom>-panneau.png (panneau entier, 2x) ; pour l'après, les recadrages
//                design-l3-apres-{entete,cartes,vignettes,liste,pied}.png et ceux de la maquette 03
//                (design-l3-maquette-…png) ; --dist : sert un autre build ; --nom avant : captures seules.
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DIST, Echec, ROOT, VIEWPORT, frames, gitSha, item, loadPlaywright, noOverlap, serve } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "design L3";
const VIEW = { width: 1920, height: 1080 };
const SMALL = { width: 1024, height: 768 };
const NARROW = { width: 560, height: 700 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const PANEL = '.rb-popover[data-panel="profils"]';
const EDITOR = "[data-profile-editor]";
const BODY = "[data-sheet-body]";
const OUTILS = '[data-toolbar="outils"]';
const QUESTION = "Abandonner les changements du profil « Par défaut » ?";
const tile = (d, bar = "outils") => `[data-edit-bar="${bar}"] [data-edit="dock"] [data-choice="${d}"]`;
const seg = (s) => `[data-edit="button-size"] [data-choice="${s}"]`;
const row = (id) => `[data-edit-item="${id}"]`;
const grip = (id) => `${row(id)} button[data-edit="grip"]`;
const eye = (id) => `${row(id)} button[data-edit="shown"]`;
const WHITE = hex("#ffffff");
const NAVY = hex("#182946");
const GRAY_800 = hex("#333333");
const GRAY_500 = hex("#888888");
const GRAY_100 = hex("#FAFAFE");
const VIOLET_100 = hex("#EDE8FD");
const VIOLET_600 = hex("#6044EB");
const VIOLET_700 = hex("#4F35C4");
const MAQUETTE = join(ROOT, "docs", "design", "maquettes", "03-profils");
/** Barre d'annotation de `defaut`, dans l'ordre (apps/web/src/toolbar-profiles.ts, `defaultAnnotationBar`). */
const ANNOTATION_ORDER = ["annotation-pointer", "ann-sep-1", "ann-pen", "ann-eraser", "ann-eraser-mode", "ann-arrow", "ann-rect", "ann-text", "ann-sep-2", "ann-undo", "annotation-freeze", "annotation-screen", "ann-sep-3", "depot-annotation", "annotation-send", "annotation-send-new", "ann-sep-4", "ann-desktop-annotation"];
const KEYS = ["format", "schema", "minor", "id", "label", "basedOn", "interface", "toolbars", "presets", "behavior"];
/** Zones comparées à la maquette 03 : sélecteurs de l'application, puis de la maquette (union des boîtes). */
const ZONES = {
  entete: { app: [".rb-sheet-head", '[data-edit-section="profile"]'], maquette: [".sheet .head", ".sheet .body > section:nth-of-type(1)"] },
  cartes: { app: ['[data-edit="start-mode"]', '[data-edit-section="general"] .rb-note'], maquette: [".choices", ".sheet .body > section:nth-of-type(2) .note"] },
  vignettes: { app: ['[data-edit="button-size"]', '[data-edit-bar="outils"] [data-edit="dock"]'], maquette: [".docks", ".segs"] },
  liste: { app: ['[data-edit-bar="outils"] li[data-edit-item]:nth-child(1)', '[data-edit-bar="outils"] li[data-edit-item]:nth-child(7)'], maquette: [".items"] },
  pied: { app: [".rb-sheet-foot"], maquette: [".foot"] },
};
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};

function watch(page) {
  const w = { errors: [], dialogs: [], answer: "accept" };
  page.on("pageerror", (e) => w.errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(m.text());
  });
  page.on("dialog", async (d) => {
    w.dialogs.push({ type: d.type(), message: d.message() });
    if (w.answer === "dismiss") await d.dismiss();
    else await d.accept();
  });
  return w;
}
const noErrors = (w, label) => check(w.errors.length === 0, `${label} : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
async function waitDialog(w, from) {
  for (let i = 0; i < 200; i++) {
    const d = w.dialogs.slice(from).find((x) => x.type === "confirm");
    if (d) return d;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Echec("question « confirm » attendue, aucune reçue");
}
async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
}
async function waitFor(page, sel, state = "attached") {
  await page.waitForSelector(sel, { state, timeout: 15000 });
  await frames(page);
}
async function openEditor(page) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  await page.click('[data-profile-cmd="edit"]');
  await waitFor(page, EDITOR);
}
async function closeEditor(page) {
  await page.click('button[data-edit="close"]');
  await waitFor(page, EDITOR, "detached");
}
async function chooseProfile(page, id) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  await page.click(`[data-profile="${id}"]`);
  await frames(page);
}
async function activeProfile(page) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  const id = await page.getAttribute('[data-profile][aria-checked="true"]', "data-profile");
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]", "detached");
  return id;
}
async function box(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Echec(`boîte absente : ${sel}`);
  return b;
}
async function unionBox(page, sels) {
  const bs = [];
  for (const s of sels) bs.push(await box(page, s));
  const x = Math.min(...bs.map((b) => b.x));
  const y = Math.min(...bs.map((b) => b.y));
  return { x, y, width: Math.max(...bs.map((b) => b.x + b.width)) - x, height: Math.max(...bs.map((b) => b.y + b.height)) - y };
}
const inside = (b, vp) => b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= vp.width + 0.5 && b.y + b.height <= vp.height + 0.5;
const apart = (a, b) => a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
const barOrder = (page) => page.$$eval(`${OUTILS} button[data-item]`, (bs) => bs.map((b) => b.dataset.item));
const rowOrder = (page, bar = "outils") => page.$$eval(`[data-edit-bar="${bar}"] li[data-edit-item]`, (ls) => ls.map((l) => l.getAttribute("data-edit-item")));
const buttonsOf = (page, sel) =>
  page.locator(`${sel} button`).evaluateAll((bs) => bs.map((b) => {
    const r = b.getBoundingClientRect();
    return { id: b.dataset.item ?? b.dataset.preset ?? b.textContent, x: r.x, y: r.y, width: r.width, height: r.height };
  }));
/** Zone de capture en px CSS entiers, élargie au pixel entier qui contient la boîte. */
const clipOf = (b) => {
  const x = Math.floor(b.x);
  const y = Math.floor(b.y);
  return { x, y, width: Math.ceil(b.x + b.width) - x, height: Math.ceil(b.y + b.height) - y };
};
async function iconPixels(page, sel) {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await frames(page);
  return pixelsOf(page, await box(page, `${sel} svg.rb-icon`));
}
async function textPixels(page, sel) {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await frames(page);
  return pixelsOf(page, clipOf(await box(page, sel)));
}
/** Rangée du milieu (y = 24 à 2x) d'une icône à droites pures : 0 pixel intermédiaire, deux traits de 3 pixels. */
async function cleanRow(page, sel, bg, ink, label) {
  const px = await iconPixels(page, sel);
  check(px.width === 48 && px.height === 48, `${label} : capture ${px.width} × ${px.height} pixels (48 × 48)`);
  const r = edgeRow(px, 24, 0, px.width, bg, ink);
  console.log(`rangée de ${label} (gris, 2x) : ${r.gray.join(" ")}`);
  check(r.intermediate === 0 && JSON.stringify(r.runs) === "[3,3]", `${label} : 0 pixel intermédiaire, traits ${JSON.stringify(r.runs)}`);
  check(fringes(px, bg, ink) === 0, `${label} : 0 frange`);
}
/** Contre-épreuve : un témoin sans calage (viewBox 0 0 24 24) doit montrer du flou, sinon la mesure est aveugle. */
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
  const r = edgeRow(px, 24, 0, px.width, WHITE, NAVY);
  console.log(`contre-épreuve (viewBox 0 0 24 24, gris) : ${r.gray.join(" ")}`);
  await page.evaluate(() => document.getElementById("temoin-nettete")?.remove());
  check(r.intermediate >= 2, `contre-épreuve : le témoin sans calage donne ${r.intermediate} pixels intermédiaires (≥ 2), la mesure n'est pas aveugle`);
}

/** S1 : S1 de l'usage, barre à droite et grands boutons en direct ; export, import sur un autre appareil, origine. */
async function s1(browser, base, tmp) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  const panel = await box(page, PANEL);
  const stage = await box(page, "#stage");
  check(Math.abs(panel.width - 600) < 0.5 && Math.abs(panel.x + panel.width - VIEWPORT.width) < 0.5 && stage.x < panel.x, `S1 : panneau à droite, ${panel.width} px de large, scène visible à sa gauche`);
  await page.click(tile("right"));
  await waitFor(page, `${OUTILS}[data-dock="right"]`);
  const bar = await box(page, OUTILS);
  check(inside(bar, VIEWPORT) && (await noOverlap(page, OUTILS, PANEL)).apart && (await noOverlap(page, OUTILS)).apart, "S1 : « À droite » avant tout enregistrement : barre d'outils à droite, entière, hors du panneau et de la scène");
  await page.click(seg("l"));
  await waitFor(page, `${OUTILS}[data-size="l"]`);
  check((await page.locator(`${OUTILS}[data-dock="right"][data-size="l"]`).count()) === 1, "S1 : « Grands · 64 » : data-size=\"l\" en direct");
  await page.click(eye("eraser"));
  await waitFor(page, item("eraser"), "detached");
  check((await page.locator(item("eraser")).count()) === 0, "S1 : œil de la gomme : la gomme quitte la barre en direct");
  await page.click('button[data-edit="preset-add"]');
  await page.click('button[data-edit="preset-add"]');
  check((await page.locator("[data-edit-preset]").count()) === 5, "S1 : deux couleurs ajoutées (cinq préréglages)");
  await page.fill('input[data-edit="new-name"]', "CM1");
  await page.click('button[data-edit="save-new"]');
  await waitFor(page, EDITOR, "detached");
  await page.reload();
  await ready(page);
  check(
    (await page.locator(`${OUTILS}[data-dock="right"][data-size="l"]`).count()) === 1 && (await page.locator(item("eraser")).count()) === 0 && (await page.locator(`${OUTILS} button[data-preset]`).count()) === 5,
    "S1 : rechargé : barre à droite, en l, sans gomme, cinq data-preset",
  );
  check((await activeProfile(page)) === "cm1", "S1 : rechargé : cm1 actif");
  await openEditor(page);
  const dl = page.waitForEvent("download");
  await page.click('button[data-edit="export"]');
  const download = await dl;
  const file = join(tmp, "cm1.rbprofile");
  await download.saveAs(file);
  const json = JSON.parse(await readFile(file, "utf8"));
  const keys = Object.keys(json);
  check(download.suggestedFilename() === "cm1.rbprofile" && keys.length === KEYS.length && KEYS.every((k) => keys.includes(k)) && json.minor === 1 && json.basedOn === "defaut", `S1 : export du panneau : cm1.rbprofile, clés ${keys.join(", ")}, minor 1, basedOn defaut`);
  await closeEditor(page);
  noErrors(w, "S1");
  await ctx.close();

  const other = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const p2 = await other.newPage();
  const w2 = watch(p2);
  await p2.goto(`${base}/?fichiers=repli`);
  await ready(p2);
  await openEditor(p2);
  const chooser = p2.waitForEvent("filechooser");
  await p2.click('button[data-edit="import"]');
  await (await chooser).setFiles(file);
  await waitFor(p2, `${OUTILS}[data-dock="right"][data-size="l"]`);
  check((await p2.locator(item("eraser")).count()) === 0 && (await p2.inputValue('select[data-edit="profile"]')) === "cm1" && (await p2.locator(EDITOR).count()) === 1, "S1 : autre appareil, Importer du panneau : barre à droite, en grand, sans gomme, éditeur sur cm1");
  await p2.click('button[data-edit="revert"]');
  await waitFor(p2, `${OUTILS}[data-dock="top"][data-size="m"]`);
  check((await p2.locator(item("eraser")).count()) === 1 && (await p2.inputValue('input[data-edit="label"]')) === "CM1", "S1 : « Revenir à l'origine » : barre en haut, m, gomme revenue, nom « CM1 » gardé");
  noErrors(w2, "S1 autre appareil");
  await other.close();
}

async function mouseDrag(page, id, targetY) {
  const g = await box(page, grip(id));
  const x = g.x + g.width / 2;
  let y = g.y + g.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  while (y - 8 > targetY) {
    y -= 8;
    await page.mouse.move(x, y);
  }
  await page.mouse.move(x, targetY);
}
async function touchDrag(page, cdp, id, targetY) {
  const g = await box(page, grip(id));
  const x = Math.round(g.x + g.width / 2);
  let y = Math.round(g.y + g.height / 2);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  while (y - 8 > targetY) {
    y -= 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: Math.round(targetY) }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/** S2 : tri au pointeur (souris, doigt), Échap, clic de la poignée, clavier. */
async function s2(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const w = watch(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  const toList = async () => {
    // Première ligne en haut du corps : la liste dépasse l'écran, le glisser doit rester dans la fenêtre (le doigt n'agit pas hors écran).
    await page.locator('[data-edit-bar="outils"] li[data-edit-item]').first().evaluate((l) => l.scrollIntoView({ block: "start" }));
    await frames(page);
  };
  await toList();
  const pen = await box(page, row("pen"));
  await mouseDrag(page, "text", pen.y + 4);
  await frames(page);
  const during = (await barOrder(page))[0];
  const moving = await page.locator(row("text")).evaluate((r) => r.style.transform);
  await page.mouse.up();
  await frames(page);
  const after = (await barOrder(page))[0];
  check(during === "pen" && moving.startsWith("translateY(-") && after === "text", `S2 souris : pendant le geste la barre ne change pas (${during}), la ligne suit (${moving}) ; au lâcher le premier bouton est ${after}`);
  check((await page.locator('button[data-edit="up"]').count()) === 0, "S2 souris : le clic qui suit le glisser ne dévoile rien");
  await toList();
  const head = await box(page, row("text"));
  await touchDrag(page, cdp, "rect", head.y + 4);
  await frames(page);
  const first = (await barOrder(page))[0];
  check(first === "rect", `S2 doigt : Rectangle tiré au doigt jusqu'en tête (premier bouton : ${first})`);
  await toList();
  const before = await rowOrder(page);
  const el = await box(page, grip("ellipse"));
  await page.mouse.move(el.x + el.width / 2, el.y + el.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(el.x + el.width / 2, el.y + el.height / 2 - 8 * i);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await frames(page);
  const shifted = await page.$$eval('[data-edit-bar="outils"] li[data-edit-item]', (ls) => ls.filter((l) => l.style.transform !== "").length);
  check(JSON.stringify(await rowOrder(page)) === JSON.stringify(before) && shifted === 0 && (await page.locator('button[data-edit="up"]').count()) === 0, "S2 Échap pendant un geste : rien ne bouge, aucune ligne décalée, rien de dévoilé");
  await page.click(grip("text"));
  const revealed = await page.$$eval('button[data-edit="up"]', (bs) => bs.map((b) => b.closest("[data-edit-item]").getAttribute("data-edit-item")));
  check(JSON.stringify(revealed) === '["text"]', `S2 clic de la poignée de Texte : « Monter » et « Descendre » sur sa ligne seulement (${revealed})`);
  await page.click(`${row("text")} button[data-edit="down"]`);
  await frames(page);
  const order = await rowOrder(page);
  const n = order.indexOf("text") + 1;
  const said = ((await page.textContent('[data-edit="announce"]')) ?? "").trim();
  check(said === `Texte : rang ${n} sur ${order.length}`, `S2 Descendre : annonce « ${said} »`);
  await page.focus(grip("text"));
  await page.keyboard.press("ArrowUp");
  await frames(page);
  const focus = await page.evaluate(() => {
    const a = document.activeElement;
    return a ? `${a.closest("[data-edit-item]")?.getAttribute("data-edit-item")}/${a.getAttribute("data-edit")}` : "";
  });
  check(focus === "text/grip" && (await rowOrder(page)).indexOf("text") === n - 2, `S2 Flèche haut : un cran, focus gardé sur la poignée (${focus})`);
  check((await page.locator(`${EDITOR} [draggable="true"]`).count()) === 0, "S2 : aucun élément draggable dans le panneau");
  const d0 = w.dialogs.length;
  await closeEditor(page);
  check(w.dialogs.slice(d0).some((x) => x.message === QUESTION), "S2 : Fermer le brouillon trié pose la question");
  noErrors(w, "S2");
  await ctx.close();
}

/** S3 : aperçu abandonné, avec confirmation ; entrée en annotation sans question. */
async function s3(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  w.answer = "dismiss";
  const d0 = w.dialogs.length;
  await page.click('button[data-edit="close"]');
  const q1 = await waitDialog(w, d0);
  await frames(page);
  check(q1.message === QUESTION && (await page.locator(EDITOR).count()) === 1 && (await page.locator(`${OUTILS}[data-dock="left"]`).count()) === 1, `S3 Fermer : « ${q1.message} » ; Annuler : panneau ouvert, barre toujours à gauche`);
  w.answer = "accept";
  await closeEditor(page);
  check((await page.locator(`${OUTILS}[data-dock="top"]`).count()) === 1, "S3 Fermer, Oui : barre en haut");
  await openEditor(page);
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  const d1 = w.dialogs.length;
  await page.click(item("settings"));
  const q2 = await waitDialog(w, d1);
  await waitFor(page, "#reglages");
  check(q2.message === QUESTION && (await page.locator(EDITOR).count()) === 0 && (await page.locator(`${OUTILS}[data-dock="top"]`).count()) === 1, "S3 Réglages : même question ; Oui : Réglages ouverts, barre en haut");
  await page.click(item("settings"));
  await waitFor(page, "#reglages", "detached");
  await openEditor(page);
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  const d2 = w.dialogs.length;
  await page.selectOption('select[data-edit="profile"]', "simple");
  const q3 = await waitDialog(w, d2);
  await page.waitForFunction(() => document.querySelector('input[data-edit="label"]')?.value === "Simple (grands boutons)", null, { timeout: 15000 });
  await frames(page);
  const focused = await page.evaluate(() => document.activeElement?.matches('select[data-edit="profile"]') === true);
  check(q3.message === QUESTION && focused && (await page.inputValue('select[data-edit="profile"]')) === "simple", "S3 sélecteur : même question ; Oui : éditeur sur « Simple », focus sur le sélecteur");
  const d3 = w.dialogs.length;
  await closeEditor(page);
  check(w.dialogs.length === d3, "S3 sans changement : Fermer ne demande rien");
  noErrors(w, "S3");
  await ctx.close();

  const ann = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const p2 = await ann.newPage();
  const w2 = watch(p2);
  await p2.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(p2);
  await openEditor(p2);
  await p2.click(tile("left"));
  await waitFor(p2, `${OUTILS}[data-dock="left"]`);
  const d4 = w2.dialogs.length;
  await p2.click(item("desktop-annotation"));
  await waitFor(p2, '.rb-layout[data-mode="annotation"]');
  await p2.waitForFunction(() => document.body.dataset.annotation === "1", null, { timeout: 15000 });
  await frames(p2);
  const h = await p2.locator('[data-toolbar="annotation"]').evaluate((e) => Math.ceil(e.getBoundingClientRect().height));
  const bande = await p2.evaluate(() => document.body.dataset.annotationBande ?? null);
  check(w2.dialogs.length === d4 && (await p2.locator(EDITOR).count()) === 0 && bande === `top:${h}`, `S3 annotation : panneau fermé sans question, la bande mesure la barre enregistrée (${bande}, attendu top:${h})`);
  await p2.click(item("ann-desktop-annotation"));
  await waitFor(p2, '.rb-layout[data-mode="board"]');
  check((await p2.locator(`${OUTILS}[data-dock="top"]`).count()) === 1, "S3 sortie de l'annotation : barre d'outils en haut, brouillon abandonné");
  noErrors(w2, "S3 annotation");
  await ann.close();
}

/** S4 : barre d'annotation, « Dessin / Souris », masquer ann-text, catalogue selon la barre. */
async function s4(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  await openEditor(page);
  await page.click('[data-edit="bar"] [data-choice="annotation"]');
  await waitFor(page, '[data-edit-bar="annotation"]');
  const ids = await rowOrder(page, "annotation");
  check(JSON.stringify(ids) === JSON.stringify(ANNOTATION_ORDER), `S4 : liste de la barre d'annotation dans l'ordre exact de la barre (${ids.length} lignes)`);
  const label = ((await page.textContent(`${row("annotation-pointer")} .rb-item-label`)) ?? "").trim();
  check(label === "Dessin / Souris" && (await page.locator(`${row("annotation-pointer")} > svg[data-icon="pen-line"]`).count()) === 1, `S4 : « ${label} » en une ligne, icône pen-line`);
  const note = ((await page.textContent('[data-edit="annotation-note"]')) ?? "").trim();
  check(note.startsWith("Montrée seulement en annotation du bureau"), `S4 : note « ${note} »`);
  await page.click(eye("ann-text"));
  await page.click('button[data-edit="save"]');
  await waitFor(page, EDITOR, "detached");
  await page.click(item("desktop-annotation"));
  await waitFor(page, '.rb-layout[data-mode="annotation"]');
  check((await page.locator('[data-toolbar="annotation"] [data-item="ann-text"]').count()) === 0, "S4 : Texte masqué : absent de la barre d'annotation");
  await page.click(item("ann-desktop-annotation"));
  await waitFor(page, '.rb-layout[data-mode="board"]');
  check((await page.locator(`${OUTILS} ${item("text")}`).count()) === 1, "S4 : Texte toujours dans la barre d'outils");
  await openEditor(page);
  await page.click('[data-edit-bar="outils"] button[data-edit="add"]');
  await waitFor(page, "[data-add-choice]");
  const tools = await page.$$eval("[data-add-choice]", (bs) => bs.map((b) => b.getAttribute("data-add-choice")));
  check(!tools.includes("action:annotation-pointer") && !tools.includes("action:annotation-send"), `S4 : « + Ajouter » de la barre d'outils : ni Souris ni Envoyer (${tools.length} entrées)`);
  await page.keyboard.press("Escape");
  await waitFor(page, "[data-add-choice]", "detached");
  await page.click('[data-edit="bar"] [data-choice="annotation"]');
  await page.click('[data-edit-bar="annotation"] button[data-edit="add"]');
  await waitFor(page, "[data-add-choice]");
  const anns = await page.$$eval("[data-add-choice]", (bs) => bs.map((b) => b.getAttribute("data-add-choice")));
  check(!anns.includes("action:file-open") && !anns.includes("action:export-pdf"), `S4 : « + Ajouter » de la barre d'annotation : ni Ouvrir ni Exporter en PDF (${anns.join(", ")})`);
  await page.keyboard.press("Escape");
  await closeEditor(page);
  noErrors(w, "S4");
  await ctx.close();
}

/** Calage : chaque svg.rb-icon visible du panneau a le viewBox calé, x et y × 2 entiers, 24 × 24. */
async function calage(page) {
  const icons = await page.$$eval(`${EDITOR} svg.rb-icon`, (els) =>
    els.filter((e) => e.getClientRects().length > 0).map((e) => {
      const r = e.getBoundingClientRect();
      return { icon: e.getAttribute("data-icon"), vb: e.getAttribute("viewBox"), x: r.x, y: r.y, w: r.width, h: r.height };
    }));
  const bad = icons.filter((b) => b.vb !== "-0.25 -0.25 24 24" || !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2) || b.w !== 24 || b.h !== 24);
  check(icons.length >= 20 && bad.length === 0, `S5 calage : ${icons.length} icônes du panneau calées (viewBox, grille de pixels, 24 × 24)${bad.length ? `, hors grille : ${JSON.stringify(bad.slice(0, 5))}` : ""}`);
}

/** S5 : netteté § 10, 1920 × 1080 à 2x, panneau ouvert sur « Annotation au démarrage », barre à gauche. */
async function s5(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await chooseProfile(page, "annotation");
  await openEditor(page);
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  await page.click(eye("fill"));
  await page.mouse.move(10, VIEW.height - 10);
  await page.locator(BODY).evaluate((b) => { b.scrollTop = 0; });
  await frames(page);
  await calage(page);
  const rect = await pixelsOf(page, await box(page, `${OUTILS} ${item("rect")} svg.rb-icon`));
  const bg = [rect.data[24 * rect.width * 4], rect.data[24 * rect.width * 4 + 1], rect.data[24 * rect.width * 4 + 2]];
  const r = edgeRow(rect, 24, 0, rect.width, bg, NAVY);
  console.log(`rangée du Rectangle (gris, 2x) : ${r.gray.join(" ")}`);
  check(r.intermediate === 0 && JSON.stringify(r.runs) === "[3,3]" && fringes(rect, bg, NAVY) === 0, `S5 Rectangle de la barre : 0 pixel intermédiaire, traits ${JSON.stringify(r.runs)}, 0 frange`);
  await cleanRow(page, tile("top"), WHITE, NAVY, "S5 dock-top non choisie (navy sur blanc)");
  const fr = async (sel, bgc, ink, label) => {
    const n = fringes(await textPixels(page, sel), bgc, ink);
    check(n === 0, `S5 ${label} : 0 frange (${n})`);
  };
  await fr(".rb-sheet-head h2", WHITE, NAVY, "titre « Profils »");
  await fr(`${row("pen")} .rb-item-label`, WHITE, GRAY_800, "libellé d'une ligne");
  await fr(`${seg("m")} .rb-radio-label`, WHITE, VIOLET_700, "segment choisi");
  await fr('[data-edit="start-mode"] [aria-checked="true"] .rb-radio-label', VIOLET_100, VIOLET_700, "titre de la carte choisie");
  const chk = fringes(await iconPixels(page, '[data-edit="start-mode"] .rb-radio-chk'), VIOLET_600, WHITE);
  check(chk === 0, `S5 check blanc sur la pastille violette : 0 frange (${chk})`);
  const hidden = fringes(await iconPixels(page, eye("fill")), GRAY_100, GRAY_500);
  check(hidden === 0, `S5 œil « hidden » gris sur ligne masquée : 0 frange (${hidden})`);
  await fr('button[data-edit="save"]', VIOLET_600, WHITE, "« Enregistrer » blanc sur violet");
  await page.click(tile("top"));
  await waitFor(page, `${OUTILS}[data-dock="top"]`);
  await page.mouse.move(10, VIEW.height - 10);
  await frames(page);
  await cleanRow(page, tile("top"), VIOLET_100, VIOLET_700, "S5 dock-top choisie (#4F35C4 sur #EDE8FD)");
  await counterProof(page);
  noErrors(w, "S5");
  await ctx.close();
}

/** S6 : petit écran, corps qui défile, barre flottante repliée à gauche ; fenêtre étroite. */
async function s6(browser, base) {
  const ctx = await browser.newContext({ viewport: SMALL, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  const panel = await box(page, PANEL);
  const head = await box(page, ".rb-sheet-head");
  const foot = await box(page, ".rb-sheet-foot");
  check(Math.abs(panel.width - 600) < 0.5 && head.y >= -0.5 && foot.y + foot.height <= SMALL.height + 0.5, `S6 1024 × 768 : panneau de ${panel.width} px, en-tête et pied visibles`);
  await page.locator(BODY).evaluate((b) => { b.scrollTop = b.scrollHeight; });
  await frames(page);
  const saveNew = await box(page, 'button[data-edit="save-new"]');
  const body = await box(page, BODY);
  check(saveNew.y >= body.y - 0.5 && saveNew.y + saveNew.height <= body.y + body.height + 0.5, "S6 : le corps défile jusqu'à « Enregistrer comme nouveau »");
  await page.locator(BODY).evaluate((b) => { b.scrollTop = 0; });
  await page.click(tile("floating"));
  await waitFor(page, `${OUTILS}[data-dock="floating"]`);
  const fl = await box(page, ".rb-floating");
  const stages = await box(page, ".rb-stages");
  const buttons = await buttonsOf(page, OUTILS);
  const rows = new Set(buttons.map((b) => Math.round(b.y))).size;
  const p2 = await box(page, PANEL);
  const bad = buttons.filter((b) => !inside(b, SMALL) || !apart(b, p2));
  check(Math.abs(fl.x - stages.x) <= 1 && Math.abs(fl.y - stages.y) <= 1, `S6 : barre flottante en haut à gauche de la scène (${fl.x}, ${fl.y})`);
  check(rows >= 2 && buttons.length > 0 && bad.length === 0, `S6 : ${buttons.length} boutons sur ${rows} rangées, chacun entier dans la fenêtre et hors du panneau${bad.length ? ` (fautifs : ${bad.map((b) => b.id).join(", ")})` : ""}`);
  await closeEditor(page);
  noErrors(w, "S6");
  await ctx.close();

  const narrow = await browser.newContext({ viewport: NARROW, deviceScaleFactor: 1 });
  const p3 = await narrow.newPage();
  const w3 = watch(p3);
  await p3.goto(`${base}/?fichiers=repli`);
  await ready(p3);
  await openEditor(p3);
  const pn = await box(p3, PANEL);
  const st = await box(p3, ".rb-stages");
  check(Math.abs(pn.width - st.width) <= 1 && Math.abs(pn.x - st.x) <= 1, `S6 560 px : le panneau couvre toute la scène (${pn.width} / ${st.width} px)`);
  check((await noOverlap(p3, OUTILS, PANEL)).apart && (await noOverlap(p3, '[data-toolbar="pages"]', PANEL)).apart, "S6 560 px : barres ancrées visibles, hors du panneau");
  await closeEditor(p3);
  noErrors(w3, "S6 étroit");
  await narrow.close();
}

/** Captures à 2x : panneau entier ; pour l'après, recadrages des zones comparées à la maquette 03. */
async function captureSet(browser, base, nom) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const out = (n) => join(ROOT, "docs", "essais", `design-l3-${nom}-${n}.png`);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await chooseProfile(page, "annotation");
  await openEditor(page);
  if (nom === "avant") {
    await page.locator(EDITOR).screenshot({ path: out("panneau") });
    console.log(`capture : ${out("panneau")}`);
    await ctx.close();
    return;
  }
  await page.click(tile("left"));
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  await page.mouse.move(10, VIEW.height - 10);
  await frames(page);
  await page.locator(PANEL).screenshot({ path: out("panneau") });
  console.log(`capture : ${out("panneau")}`);
  for (const [n, z] of Object.entries(ZONES)) {
    await page.locator(z.app[0]).first().evaluate((e) => e.scrollIntoView({ block: "start" }));
    await frames(page);
    const b = await unionBox(page, z.app);
    const x = Math.max(0, Math.floor(b.x) - 16);
    const y = Math.max(0, Math.floor(b.y) - 16);
    const clip = { x, y, width: Math.min(VIEW.width - x, Math.ceil(b.width) + 32), height: Math.min(VIEW.height - y, Math.ceil(b.height) + 32) };
    await page.screenshot({ path: out(n), clip });
    console.log(`capture : ${out(n)}`);
  }
  await ctx.close();
}

/** Recadrages de docs/design/maquettes/03-profils.png (3840 × 2160) : boîtes lues dans la maquette HTML à 1x, découpées à 2x. */
async function maquetteCrops(browser) {
  const html = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const p1 = await html.newPage();
  await p1.goto(pathToFileURL(`${MAQUETTE}.html`).href);
  const boxes = {};
  for (const [n, z] of Object.entries(ZONES)) boxes[n] = await unionBox(p1, z.maquette);
  await html.close();
  const png = await browser.newContext({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
  const p2 = await png.newPage();
  await p2.setContent(`<body style="margin:0"><img id="m" style="display:block" src="data:image/png;base64,${readFileSync(`${MAQUETTE}.png`).toString("base64")}"></body>`);
  await p2.locator("#m").evaluate((img) => img.decode());
  for (const [n, b] of Object.entries(boxes)) {
    const clip = { x: Math.max(0, Math.floor(b.x * 2) - 32), y: Math.max(0, Math.floor(b.y * 2) - 32), width: Math.ceil(b.width * 2) + 64, height: Math.ceil(b.height * 2) + 64 };
    const path = join(ROOT, "docs", "essais", `design-l3-maquette-${n}.png`);
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-design-l3-"));
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
    await s1(browser, base, tmp);
    await s2(browser, base);
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
    await rm(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
