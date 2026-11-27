#!/usr/bin/env node
// Essai design L2 au navigateur (docs/plans/design-l2-cadrage.md, L2-25 ; S1 à S6) : îlots flottants au-dessus de la
// scène, #stage de la taille de la fenêtre, menu à la souris et au clavier, barre d'outils déplacée, repliée et retrouvée
// (souris, doigt, clavier), bande par le profil et annotation, netteté du § 10 du cadrage design (Rectangle de l'îlot
// d'outils, texte de l'onglet montré, contre-épreuve), format .rbprofile inchangé, petits écrans et trente pages.
// Faux hôte `?annotation=faux`, `?fichiers=repli`. Chromium de Playwright, --disable-lcd-text, --force-color-profile=srgb.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/design-l2-navigateur.mjs [--captures] [--dist <dossier> [--nom avant]]
//   --captures : docs/essais/design-l2-<nom>-tableau.png (écran du tableau, 1920 × 1080 à 2x) ; pour l'après, les
//                recadrages design-l2-apres-<zone>.png et ceux de la maquette 01 (design-l2-maquette-<zone>.png) ;
//                --dist : sert un autre build ; --nom avant : captures seules.
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DIST, Echec, ROOT, frames, gitSha, clickItem, openSideOf, inkIn, item, loadPlaywright, serve } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "design L2";
const MID = { width: 1280, height: 900 };
const BIG = { width: 1920, height: 1080 };
const SMALL = { width: 1024, height: 768 };
const TABLET = { width: 768, height: 700 };
const NARROW = { width: 560, height: 700 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const ISLAND = (id) => `.rb-island[data-island="${id}"]`;
const TOOLS = ISLAND("outils");
const OUTILS = '[data-toolbar="outils"]';
const CONTEXT = `${OUTILS} [data-island-context]`;
const GRIP = `${TOOLS} [data-island-grip]`;
const COLLAPSE = `${TOOLS} [data-island-collapse]`;
const TOGGLE = '[data-toolbar="menu"] [data-menu-toggle]';
const LIST = '[data-toolbar="menu"] [data-menu-list]';
const PANEL = '.rb-popover[data-panel="profils"]';
const EDITOR = "[data-profile-editor]";
const tile = (d) => `[data-edit-bar="outils"] [data-edit="dock"] [data-choice="${d}"]`;
const MENU_ROWS = ["file-new", "file-open", "file-import", "file-save", "file-save-as", "page-insert-file", "export-pdf", "export-iwb", "export-ubz", "grid", "settings"];
const ISLANDS = ["menu", "onglets", "outils", "panneaux", "historique", "pages"];
const BAR_KEYS = ["id", "role", "dock", "collapsed", "groups"];
const WHITE = hex("#ffffff");
const NAVY = hex("#182946");
const VIOLET_100 = hex("#EDE8FD");
const VIOLET_700 = hex("#4F35C4");
const MAQUETTE = join(ROOT, "docs", "design", "maquettes", "01-tableau");
/** Zones comparées à la maquette 01 : sélecteur de l'application, puis de la maquette ; `open` : menu ouvert. */
const ZONES = {
  menu: { app: ISLAND("menu"), maquette: '.island:has(> .btn[aria-label="Menu"])' },
  "menu-ouvert": { app: LIST, maquette: "nav.menu", open: true },
  onglets: { app: ISLAND("onglets"), maquette: ".island.tabs" },
  outils: { app: TOOLS, maquette: "#outils" },
  prereglages: { app: CONTEXT, maquette: '.island[aria-label="Préréglages du stylo"]' },
  panneaux: { app: ISLAND("panneaux"), maquette: '.island:has(> .btn[aria-label="Bibliothèque"])' },
  historique: { app: ISLAND("historique"), maquette: '.island:has(> .btn[aria-label="Annuler"])' },
  pages: { app: ISLAND("pages"), maquette: '.island[aria-label="Pages"]' },
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
  const w = { errors: [] };
  page.on("pageerror", (e) => w.errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(m.text());
  });
  page.on("dialog", (d) => void d.accept());
  return w;
}
const noErrors = (w, label) => check(w.errors.length === 0, `${label} : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
}
async function waitFor(page, sel, state = "attached") {
  await page.waitForSelector(sel, { state, timeout: 15000 });
  await frames(page);
}
async function box(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Echec(`boîte absente : ${sel}`);
  return b;
}
const inside = (b, vp) => b.x >= -0.5 && b.y >= -0.5 && b.x + b.width <= vp.width + 0.5 && b.y + b.height <= vp.height + 0.5;
const apart = (a, b) => a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
const whole = (b) => Number.isInteger(b.x) && Number.isInteger(b.y);
const near = (a, b) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
function clashes(boxes) {
  const e = Object.entries(boxes);
  const out = [];
  for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) if (!apart(e[i][1], e[j][1])) out.push(`${e[i][0]}/${e[j][0]}`);
  return out;
}
const clipOf = (b) => {
  const x = Math.floor(b.x);
  const y = Math.floor(b.y);
  return { x, y, width: Math.ceil(b.x + b.width) - x, height: Math.ceil(b.y + b.height) - y };
};
async function openMenu(page) {
  if (await page.locator(LIST).isVisible()) return;
  await page.click(TOGGLE);
  await waitFor(page, LIST, "visible");
}
async function chooseProfile(page, id) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  await page.click(`[data-profile="${id}"]`);
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
async function gripCenter(page) {
  const g = await box(page, GRIP);
  return [Math.round(g.x + g.width / 2), Math.round(g.y + g.height / 2)];
}
async function mouseDrag(page, dx, dy, { cancel = false } = {}) {
  const [x, y] = await gripCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + (dx * i) / 10, y + (dy * i) / 10);
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
  await frames(page);
}
async function touchDrag(page, cdp, dx, dy) {
  const [x, y] = await gripCenter(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: Math.round(x + (dx * i) / 10), y: Math.round(y + (dy * i) / 10) }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await frames(page);
}
/** Îlots tracés par-dessus le panneau : le point au centre de leur recouvrement leur appartient. */
const islandsOverPanel = (page) =>
  page.evaluate((panelSel) => {
    const panel = document.querySelector(panelSel).getBoundingClientRect();
    const bad = [];
    for (const el of document.querySelectorAll(".rb-island")) {
      const r = el.getBoundingClientRect();
      const x0 = Math.max(r.left, panel.left);
      const x1 = Math.min(r.right, panel.right);
      const y0 = Math.max(r.top, panel.top);
      const y1 = Math.min(r.bottom, panel.bottom);
      if (r.width === 0 || x1 - x0 < 1 || y1 - y0 < 1) continue;
      const top = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
      if (top !== null && el.contains(top)) bad.push(el.getAttribute("data-island"));
    }
    return bad;
  }, PANEL);
/** Toutes les clés d'un JSON, à toute profondeur. */
const keysDeep = (v) => (Array.isArray(v) ? v.flatMap(keysDeep) : v !== null && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [k, ...keysDeep(x)]) : []);

async function iconPixels(page, sel) {
  return pixelsOf(page, await box(page, `${sel} svg.rb-icon`));
}
/** § 10 : rangée du milieu (y = 24 à 2x) d'une icône à droites pures : 0 pixel intermédiaire, deux traits de 3 pixels. */
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

/** S1 : tableau en îlots, scène pleine hauteur (1280 × 900 et 1920 × 1080), encre au centre ; Simple : bande à gauche. */
async function s1(browser, base) {
  for (const vp of [MID, BIG]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli`);
    await ready(page);
    const st = await box(page, "#stage");
    check(st.x === 0 && st.y === 0 && st.width === vp.width && st.height === vp.height, `S1 ${vp.width} × ${vp.height} : #stage mesure la fenêtre (x ${st.x}, y ${st.y}, ${st.width} × ${st.height})`);
    const boxes = {};
    for (const id of ISLANDS) boxes[id] = await box(page, ISLAND(id));
    boxes.prereglages = await box(page, CONTEXT);
    console.log(`îlots ${vp.width} × ${vp.height} : ${Object.entries(boxes).map(([k, b]) => `${k} ${b.x},${b.y} ${b.width}×${b.height}`).join(" ; ")}`);
    const out = Object.entries(boxes).filter(([, b]) => !inside(b, vp)).map(([k]) => k);
    check(out.length === 0, `S1 ${vp.width} : sept îlots visibles, entiers dans la fenêtre${out.length ? ` (dehors : ${out.join(", ")})` : ""}`);
    const frac = Object.entries(boxes).filter(([, b]) => !whole(b)).map(([k, b]) => `${k} (${b.x}, ${b.y})`);
    check(frac.length === 0, `S1 ${vp.width} : positions entières${frac.length ? ` (fractionnaires : ${frac.join(", ")})` : ""}`);
    const clash = clashes(boxes);
    check(clash.length === 0, `S1 ${vp.width} : aucun îlot n'en recouvre un autre${clash.length ? ` (${clash.join(", ")})` : ""}`);
    // OF83 : la page ajustée commence sous les îlots du haut (maquette 01 : y 152), à l'ouverture et après « Ajuster la page ».
    // personnalisation-1a (décision 10) : la barre latérale (îlot `pages`, ancre side-*) ne compte pas dans le haut réservé.
    const low = Math.max(...Object.entries(boxes).filter(([k, b]) => k !== "pages" && b.y < vp.height / 4 && b.height < vp.height / 3).map(([, b]) => b.y + b.height));
    const pageTop = async () => Number((await page.getAttribute("#stage", "data-camera")).split(",")[2]);
    const open = await pageTop();
    // Rangée de préréglages du stylo présente : le haut réservé tombe 12 px sous elle, ni plus ni moins.
    check(open === low + 12, `S1 ${vp.width} : à l'ouverture, haut de page à y ${open}, 12 px sous les îlots du haut (bas à y ${low})`);
    await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.mouse.wheel(0, -300);
    await frames(page);
    const moved = await pageTop();
    check(moved !== open, `S1 ${vp.width} : la molette déplace la vue (haut de page à y ${moved})`);
    await page.click(item("fit-page"));
    await frames(page);
    const fitted = await pageTop();
    check(fitted === open, `S1 ${vp.width} : après un défilement puis « Ajuster la page », haut de page revenu à y ${fitted}`);
    // T11 : un message dans #etat (région role=status) : visible, à l'écart de chaque îlot, au premier plan en son centre.
    await page.evaluate(() => {
      document.getElementById("etat").textContent = "Erreur du moteur : essai T11, message d'état assez long";
    });
    await frames(page);
    await frames(page);
    const etat = await box(page, "#etat");
    const over = [];
    for (const id of ISLANDS) if (!apart(etat, await box(page, ISLAND(id)))) over.push(id);
    const top = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("#etat") !== null, { x: etat.x + etat.width / 2, y: etat.y + etat.height / 2 });
    console.log(`#etat ${vp.width} × ${vp.height} : ${etat.x},${etat.y} ${etat.width}×${etat.height} ; outils ${JSON.stringify(await box(page, TOOLS))}`);
    check((await page.getAttribute("#etat", "role")) === "status" && (await page.locator("#etat").isVisible()), `S1 ${vp.width} : #etat role=status, visible avec un message`);
    check(over.length === 0 && top, `S1 ${vp.width} : #etat non recouvert par un îlot${over.length ? ` (${over.join(", ")})` : ""}${top ? "" : " (autre élément au premier plan)"}`);
    await page.evaluate(() => {
      document.getElementById("etat").textContent = "";
    });
    await frames(page);
    const cx = Math.round(st.width / 2);
    const cy = Math.round(st.height / 2);
    await page.mouse.move(cx - 100, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(cx - 100 + 20 * i, cy);
    await page.mouse.up();
    await frames(page);
    const ink = await inkIn(page, [cx - 90, cy - 6, cx + 90, cy + 6]);
    check(ink > 0, `S1 ${vp.width} : trait au centre de la page, encre présente (${ink} pixels)`);
    if (vp === MID) {
      await chooseProfile(page, "simple");
      await waitFor(page, `${OUTILS}[data-dock="left"]`);
      const s2 = await box(page, "#stage");
      const bar = await box(page, OUTILS);
      check(s2.y === 0 && s2.height === vp.height && s2.x >= bar.x + bar.width - 0.5, `S1 Simple : bande à gauche, #stage garde la hauteur de la fenêtre (y ${s2.y}, ${s2.height} px, x ${s2.x})`);
      check(inside(await box(page, ISLAND("pages")), vp), "S1 Simple : îlot des pages entier dans la fenêtre");
      await chooseProfile(page, "defaut");
    }
    noErrors(w, `S1 ${vp.width}`);
    await ctx.close();
  }
}

/** S2 : menu ; lignes icône + libellé ; Grille sous la rangée du haut ; Échap ; Enregistrer ; clavier jusqu'au PDF. */
async function s2(browser, base) {
  const ctx = await browser.newContext({ viewport: MID, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  check(!(await page.locator(LIST).isVisible()) && (await page.getAttribute(TOGGLE, "aria-expanded")) === "false", "S2 : menu fermé au départ (aria-expanded=false)");
  await openMenu(page);
  const rows = await page.$$eval(`${LIST} button[role="menuitem"]`, (bs) => bs.map((b) => ({ id: b.dataset.item, icon: b.querySelector("svg.rb-icon")?.getAttribute("data-icon") ?? null, label: (b.textContent ?? "").trim() })));
  check(JSON.stringify(rows.map((r) => r.id)) === JSON.stringify(MENU_ROWS), `S2 : lignes du menu dans l'ordre (${rows.map((r) => r.id).join(", ")})`);
  check(rows.every((r) => r.icon !== null && r.label !== ""), "S2 : chaque ligne a une icône et un libellé");
  const r0 = await box(page, `${LIST} button[role="menuitem"]`);
  check(Math.abs(r0.height - 48) < 0.5, `S2 : lignes de 48 px (${r0.height})`);
  await page.click(item("grid"));
  await waitFor(page, "#grille", "visible");
  const gp = await box(page, ".rb-popover:has(#grille)");
  check(!(await page.locator(LIST).isVisible()) && gp.y >= 88 - 0.5 && gp.x <= 16.5, `S2 : « Grille » ferme le menu ; panneau sous la rangée du haut, à gauche (${gp.x}, ${gp.y})`);
  await openMenu(page);
  await page.click(item("grid"));
  await waitFor(page, "#grille", "detached");
  await openMenu(page);
  await page.keyboard.press("Escape");
  await frames(page);
  const back = await page.evaluate(() => document.activeElement?.hasAttribute("data-menu-toggle") === true);
  check(!(await page.locator(LIST).isVisible()) && back, "S2 : Échap ferme le menu, focus rendu au bouton Menu");
  const saved = page.waitForEvent("download");
  await openMenu(page);
  await page.click(item("file-save"));
  const file = await saved;
  check(file.suggestedFilename().endsWith(".roomboard"), `S2 : « Enregistrer » du menu télécharge ${file.suggestedFilename()}`);
  await page.focus(TOGGLE);
  await page.keyboard.press("Enter");
  await waitFor(page, LIST, "visible");
  const first = await page.evaluate(() => document.activeElement?.getAttribute("data-item"));
  check(first === "file-new", `S2 clavier : Entrée ouvre le menu, focus sur la première ligne (${first})`);
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
  const on = await page.evaluate(() => document.activeElement?.getAttribute("data-item"));
  check(on === "export-pdf", `S2 clavier : six flèches bas mènent à « Exporter en PDF… » (${on})`);
  const pdf = page.waitForEvent("download", { timeout: 60000 });
  await page.keyboard.press("Enter");
  const exported = await pdf;
  check(exported.suggestedFilename().endsWith(".pdf"), `S2 clavier : Entrée télécharge ${exported.suggestedFilename()}`);
  noErrors(w, "S2");
  await ctx.close();
}

/** S3 : glisser (souris, doigt), rechargement, repli, clavier, fenêtre réduite, changement de profil, Échap. */
async function s3(browser, base) {
  const ctx = await browser.newContext({ viewport: MID, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const w = watch(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  const t0 = await box(page, TOOLS);
  await mouseDrag(page, 0, 300);
  const t1 = await box(page, TOOLS);
  const c1 = await box(page, CONTEXT);
  check(Math.abs(t1.x - t0.x) <= 1 && Math.abs(t1.y - (t0.y + 300)) <= 1 && whole(t1), `S3 souris : l'îlot suit la poignée de 300 px (y ${t0.y} → ${t1.y})`);
  check(c1.y >= t1.y + t1.height - 0.5, `S3 : la rangée des préréglages reste sous l'îlot (y ${c1.y})`);
  await page.reload();
  await ready(page);
  const t2 = await box(page, TOOLS);
  check(near(t2, t1), `S3 : rechargé, même position (${t2.x}, ${t2.y})`);
  await page.click(COLLAPSE);
  await waitFor(page, `${OUTILS}[data-collapsed="1"]`);
  const shown = await page.$$eval(`${TOOLS} button`, (bs) => bs.filter((b) => b.getClientRects().length > 0).map((b) => (b.hasAttribute("data-island-grip") ? "grip" : b.hasAttribute("data-island-collapse") ? "collapse" : (b.dataset.item ?? "?"))));
  check(JSON.stringify(shown) === JSON.stringify(["grip", "collapse"]) && (await page.getAttribute(COLLAPSE, "aria-expanded")) === "false", `S3 replié : poignée et Déplier seuls (${shown.join(", ")})`);
  await page.reload();
  await ready(page);
  check((await page.locator(`${OUTILS}[data-collapsed="1"]`).count()) === 1, "S3 : rechargé, toujours replié");
  await page.click(COLLAPSE);
  await waitFor(page, `${OUTILS}:not([data-collapsed])`);
  check(await page.isVisible(item("rect")), "S3 : Déplier rend les outils");
  const t3 = await box(page, TOOLS);
  await touchDrag(page, cdp, 0, -100);
  const t4 = await box(page, TOOLS);
  check(Math.abs(t4.y - (t3.y - 100)) <= 1 && Math.abs(t4.x - t3.x) <= 1, `S3 doigt : l'îlot suit de 100 px vers le haut (y ${t3.y} → ${t4.y})`);
  await page.focus(GRIP);
  await page.keyboard.press("ArrowRight");
  await frames(page);
  const t5 = await box(page, TOOLS);
  check(Math.abs(t5.x - (t4.x + 16)) < 0.5 && Math.abs(t5.y - t4.y) < 0.5, `S3 clavier : flèche droite = +16 px (x ${t4.x} → ${t5.x})`);
  await page.keyboard.press("Home");
  await frames(page);
  const t6 = await box(page, TOOLS);
  check(near(t6, t0), `S3 clavier : Début recentre (${t6.x}, ${t6.y} ; départ ${t0.x}, ${t0.y})`);
  await mouseDrag(page, 400, 600);
  const moved = await box(page, TOOLS);
  await page.setViewportSize(SMALL);
  await frames(page);
  const small = await box(page, TOOLS);
  check(inside(small, SMALL), `S3 1024 × 768 : l'îlot déplacé reste entier dans la fenêtre (${small.x}, ${small.y}, ${small.width} × ${small.height})`);
  await page.setViewportSize(MID);
  await frames(page);
  check(near(await box(page, TOOLS), moved), "S3 : retour à 1280 × 900, position enregistrée gardée (jamais réécrite au redimensionnement)");
  await chooseProfile(page, "simple");
  await waitFor(page, `${OUTILS}[data-dock="left"]`);
  await chooseProfile(page, "defaut");
  await waitFor(page, TOOLS);
  check(near(await box(page, TOOLS), moved), "S3 : Simple puis Par défaut : la position du défaut revient");
  await mouseDrag(page, -200, -200, { cancel: true });
  check(near(await box(page, TOOLS), moved), "S3 : Échap pendant un glisser : retour au départ");
  noErrors(w, "S3");
  await ctx.close();
}

/** S4 : bande par l'éditeur de profils, puis îlot ; annotation : bande seule, puis retour des îlots. */
async function s4(browser, base) {
  const ctx = await browser.newContext({ viewport: MID, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await openEditor(page);
  await page.click(tile("top"));
  await waitFor(page, `${OUTILS}[data-dock="top"]`);
  const bar = await box(page, OUTILS);
  const st = await box(page, "#stage");
  check(st.y >= bar.y + bar.height - 0.5 && st.height < MID.height, `S4 : « En haut » : bande, #stage commence sous elle (y ${st.y})`);
  await page.click(tile("floating"));
  await waitFor(page, `${OUTILS}[data-dock="floating"]`);
  const st2 = await box(page, "#stage");
  const isl = await box(page, TOOLS);
  const panel = await box(page, PANEL);
  check(st2.y === 0 && st2.height === MID.height, `S4 : « Flottante » : #stage reprend la hauteur de la fenêtre (${st2.height})`);
  check(apart(isl, panel) && inside(isl, MID), `S4 : panneau ouvert, l'îlot d'outils reste hors du panneau (${isl.x}, ${isl.y})`);
  await closeEditor(page);
  noErrors(w, "S4");
  await ctx.close();

  const ann = await browser.newContext({ viewport: MID, deviceScaleFactor: 1 });
  const p2 = await ann.newPage();
  const w2 = watch(p2);
  await p2.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(p2);
  await p2.click(item("desktop-annotation"));
  await waitFor(p2, '.rb-layout[data-mode="annotation"]');
  await p2.waitForFunction(() => document.body.dataset.annotation === "1", null, { timeout: 15000 });
  await frames(p2);
  const visible = await p2.$$eval(".rb-island", (els) => els.filter((e) => e.getClientRects().length > 0).length);
  check(visible === 0 && (await p2.isVisible('[data-toolbar="annotation"]')), `S4 annotation : seule la bande d'annotation, aucun îlot visible (${visible})`);
  await p2.click(item("ann-desktop-annotation"));
  await waitFor(p2, '.rb-layout[data-mode="board"]');
  check((await p2.isVisible(TOOLS)) && (await p2.isVisible(ISLAND("menu"))), "S4 sortie de l'annotation : les îlots reviennent");
  noErrors(w2, "S4 annotation");
  await ann.close();
}

async function exportProfile(page, tmp, name) {
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  const dl = page.waitForEvent("download");
  await page.click('[data-profile-cmd="export"]');
  const file = join(tmp, name);
  await (await dl).saveAs(file);
  return { file, json: JSON.parse(await readFile(file, "utf8")) };
}

/** S5 : netteté § 10 à 2x (Rectangle de l'îlot d'outils, texte de l'onglet montré, contre-épreuve) ; format inchangé. */
async function s5(browser, base, tmp) {
  const ctx = await browser.newContext({ viewport: BIG, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await page.mouse.move(BIG.width / 2, BIG.height - 300);
  await frames(page);
  await cleanRow(page, item("rect"), WHITE, NAVY, "S5 Rectangle de l'îlot d'outils (navy sur blanc)");
  const tab = await box(page, '.rb-tab[aria-selected="true"] .rb-tab-title');
  const fr = fringes(await pixelsOf(page, clipOf(tab)), VIOLET_100, VIOLET_700);
  check(fr === 0, `S5 texte de l'onglet montré (violet 700 sur violet 100) : 0 frange (${fr})`);
  await counterProof(page);
  await mouseDrag(page, 0, 120);
  await page.click(COLLAPSE);
  await waitFor(page, `${OUTILS}[data-collapsed="1"]`);
  const one = await exportProfile(page, tmp, "defaut-1.rbprofile");
  const extra = one.json.toolbars.flatMap((b) => Object.keys(b).filter((k) => !BAR_KEYS.includes(k)));
  const deep = keysDeep(one.json).filter((k) => ["x", "y", "position", "at"].includes(k));
  check(extra.length === 0 && deep.length === 0 && one.json.toolbars.filter((b) => b.id !== "pages").every((b) => b.collapsed === false), `S5 : le .rbprofile exporté après déplacement et repli ne porte ni position ni collapsed: true (clés en trop : ${[...extra, ...deep].join(", ") || "aucune"})`);
  await page.click(item("profiles"));
  await waitFor(page, "[data-profiles]");
  const chooser = page.waitForEvent("filechooser");
  await page.click('[data-profile-cmd="import"]');
  await (await chooser).setFiles(one.file);
  await frames(page);
  const two = await exportProfile(page, tmp, "defaut-2.rbprofile");
  // L'import relève la mineure du profil à la version courante (withCurrentMinor, comportement d'avant L2) : seule
  // différence admise entre le premier export (sans `minor`) et le second (`minor: 1`).
  const { minor, ...rest } = two.json;
  check(minor === 1 && JSON.stringify(rest) === JSON.stringify(one.json), "S5 : réimporté puis réexporté à l'identique (mineure relevée à 1 par l'import, rien d'autre ne change)");
  noErrors(w, "S5");
  await ctx.close();
}

/** S6 : 1024 × 768, 768 × 700, 560 × 700 panneau ouvert, trente pages. */
async function s6(browser, base) {
  {
    const ctx = await browser.newContext({ viewport: SMALL, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli`);
    await ready(page);
    const t = await box(page, TOOLS);
    const m = await box(page, ISLAND("menu"));
    const o = await box(page, ISLAND("onglets"));
    const rowBottom = Math.max(m.y + m.height, o.y + o.height);
    check(t.y >= rowBottom + 8 - 0.5 && inside(t, SMALL), `S6 1024 × 768 : îlot d'outils sous la rangée du haut (y ${t.y} ≥ ${rowBottom + 8}), entier`);
    check(o.width >= 144 - 0.5, `S6 1024 : îlot des onglets d'au moins 144 px (${o.width})`);
    noErrors(w, "S6 1024");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: TABLET, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    // Faux hôte : « Annotation du bureau » montrée, comme dans la coque (îlot d'outils ≈ 800 px, L2-30) ; sans elle, au
    // navigateur, l'îlot (≈ 734 px) tiendrait dans 736 et ne défilerait pas.
    await page.goto(`${base}/?fichiers=repli&annotation=faux`);
    await ready(page);
    const t = await box(page, TOOLS);
    check(Math.abs(t.width - 736) < 0.5, `S6 768 × 700 : îlot d'outils de 736 px (${t.width})`);
    const [sw, cw] = await page.$eval(OUTILS, (e) => [e.scrollWidth, e.clientWidth]);
    check(sw > cw, `S6 768 : son contenu défile (${sw} > ${cw})`);
    const g = await box(page, GRIP);
    const c = await box(page, COLLAPSE);
    check(inside(g, TABLET) && inside(c, TABLET) && g.x >= t.x - 0.5 && c.x + c.width <= t.x + t.width + 0.5, "S6 768 : poignée et Replier visibles, dans l'îlot");
    check(apart(t, await box(page, ISLAND("menu"))) && apart(t, await box(page, ISLAND("onglets"))), "S6 768 : l'îlot d'outils ne recouvre ni le menu ni les onglets");
    await page.locator(item("rect")).scrollIntoViewIfNeeded();
    await page.click(item("rect"));
    await page.waitForSelector('#stage[data-tool="rect"]', { timeout: 15000 });
    check(true, "S6 768 : Rectangle atteint après défilement et choisi (#stage data-tool=rect)");
    noErrors(w, "S6 768");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: NARROW, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli`);
    await ready(page);
    await openEditor(page);
    const over = await islandsOverPanel(page);
    check(over.length === 0, `S6 560 × 700, panneau des profils ouvert : aucun îlot ne recouvre le panneau${over.length ? ` (fautifs : ${over.join(", ")})` : ""}`);
    await closeEditor(page);
    check(await page.isVisible(TOOLS), "S6 560 : panneau fermé, les îlots reviennent");
    noErrors(w, "S6 560");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: MID, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli`);
    await ready(page);
    for (let i = 0; i < 29; i++) await clickItem(page, "page-add");
    await page.waitForFunction(() => document.querySelector("#pages")?.textContent === "30 / 30", null, { timeout: 15000 });
    await frames(page);
    const pg = await box(page, ISLAND("pages"));
    const hi = await box(page, ISLAND("historique"));
    // La barre latérale des pages défile en vertical, celle du bas en horizontal : on lit l'axe selon l'ancre de la barre.
    await openSideOf(page, ".rb-pages-list");
    const [sw, cw] = await page.$eval(".rb-pages-list", (e) => (e.scrollHeight > e.clientHeight || e.scrollWidth <= e.clientWidth ? [e.scrollHeight, e.clientHeight] : [e.scrollWidth, e.clientWidth]));
    check(inside(pg, MID) && apart(pg, hi), `S6 30 pages : îlot des pages entier, hors de l'îlot de l'historique (${pg.x}, ${pg.y}, ${pg.width} px)`);
    check(sw > cw && (await page.textContent("#pages")) === "30 / 30", `S6 30 pages : la liste des numéros défile (${sw} > ${cw}), #pages = « 30 / 30 »`);
    noErrors(w, "S6 30 pages");
    await ctx.close();
  }
}

/** Captures à 2x : écran du tableau ; pour l'après, recadrages des zones comparées à la maquette 01. */
async function captureSet(browser, base, nom) {
  const ctx = await browser.newContext({ viewport: BIG, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const out = (n) => join(ROOT, "docs", "essais", `design-l2-${nom}-${n}.png`);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await page.mouse.move(BIG.width / 2, BIG.height - 300);
  await frames(page);
  await page.screenshot({ path: out("tableau") });
  console.log(`capture : ${out("tableau")}`);
  if (nom === "avant") {
    await ctx.close();
    return;
  }
  for (const [n, z] of Object.entries(ZONES)) {
    if (z.open) await openMenu(page);
    await page.mouse.move(BIG.width / 2, BIG.height - 300);
    await frames(page);
    const b = await box(page, z.app);
    const x = Math.max(0, Math.floor(b.x) - 16);
    const y = Math.max(0, Math.floor(b.y) - 16);
    const clip = { x, y, width: Math.min(BIG.width - x, Math.ceil(b.width) + 32), height: Math.min(BIG.height - y, Math.ceil(b.height) + 32) };
    await page.screenshot({ path: out(n), clip });
    console.log(`capture : ${out(n)}`);
    if (z.open) {
      await page.keyboard.press("Escape");
      await frames(page);
    }
  }
  await ctx.close();
}

/** Recadrages de docs/design/maquettes/01-tableau.png (3840 × 2160) : boîtes lues dans la maquette HTML à 1x, découpées à 2x. */
async function maquetteCrops(browser) {
  const html = await browser.newContext({ viewport: BIG, deviceScaleFactor: 1 });
  const p1 = await html.newPage();
  await p1.goto(pathToFileURL(`${MAQUETTE}.html`).href);
  const boxes = {};
  for (const [n, z] of Object.entries(ZONES)) boxes[n] = await box(p1, z.maquette);
  await html.close();
  const png = await browser.newContext({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
  const p2 = await png.newPage();
  await p2.setContent(`<body style="margin:0"><img id="m" style="display:block" src="data:image/png;base64,${readFileSync(`${MAQUETTE}.png`).toString("base64")}"></body>`);
  await p2.locator("#m").evaluate((img) => img.decode());
  for (const [n, b] of Object.entries(boxes)) {
    const clip = { x: Math.max(0, Math.floor(b.x * 2) - 32), y: Math.max(0, Math.floor(b.y * 2) - 32), width: Math.ceil(b.width * 2) + 64, height: Math.ceil(b.height * 2) + 64 };
    const path = join(ROOT, "docs", "essais", `design-l2-maquette-${n}.png`);
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-design-l2-"));
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
    await s2(browser, base);
    await s3(browser, base);
    await s4(browser, base);
    await s5(browser, base, tmp);
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
