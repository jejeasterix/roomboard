#!/usr/bin/env node
// Essai personnalisation 1a au navigateur (docs/plans/personnalisation-1a-cadrage.md § 6, S1 à S5) : mode de page au doigt,
// barre latérale Pages (miniatures, profil), navigation dans la barre principale, onglet Calques, clavier ; netteté du
// § 10 du cadrage design sur les icônes neuves à deviceScaleFactor 2. Doigt par CDP `Input.dispatchTouchEvent` (jamais
// le glisser HTML5). Fichiers d'essai fabriqués par la CLI construite (`roomboard new`, `roomboard run`), rien de téléchargé.
// Chromium de Playwright, --disable-lcd-text, --force-color-profile=srgb.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/personnalisation-1a-navigateur.mjs [--captures] [--dist <dossier> [--nom avant]] [--seulement S3]
//   --captures : docs/design/captures/personnalisation-1a/<nom>-<vue>.png (1920 × 1080 à 2x) ; avant : tableau seul ;
//   --dist : sert un autre build ; --nom avant : captures seules ; --seulement : ne joue que le scénario donné.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DIST, Echec, ROOT, TAB, clickItem, frames, gitSha, inkIn, item, loadPlaywright, serve } from "./commun.mjs";
import { edgeRow, fringes, pixelsOf } from "./nettete.mjs";

const LABEL = "personnalisation-1a";
const MID = { width: 1280, height: 900 };
const BIG = { width: 1920, height: 1080 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const BIN = join(ROOT, "apps", "cli", "dist", "roomboard.mjs");
const SIDE = '[data-island="pages"]';
const COLLAPSE = `${SIDE} [data-island-collapse]`;
const LIST = ".rb-pages-list";
const THUMBS = `${LIST} [data-page-id]`;
const MODE = "[data-side-mode]";
const mode = (v) => `${MODE} [data-choice="${v}"]`;
const LAYERS = ".rb-layers-list";
const ROWS = `${LAYERS} button.rb-layer[data-layer]`;
const CAPTURES = join(ROOT, "docs", "design", "captures", "personnalisation-1a");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const counts = new Map();
let current = "";
const check = (cond, msg) => {
  if (!cond) throw new Echec(`${current} : ${msg}`);
  counts.set(current, (counts.get(current) ?? 0) + 1);
  console.log(`ok — ${current} ${msg}`);
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
const noErrors = (w) => check(w.errors.length === 0, `aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
}
async function settle(page, ms = 0) {
  if (ms > 0) await page.waitForTimeout(ms);
  await frames(page);
  await frames(page);
}
const attr = (page, name) => page.getAttribute("#stage", name);
async function waitAttr(page, name, value) {
  await page.waitForFunction(([n, v]) => document.querySelector("#stage")?.getAttribute(n) === v, [name, value], { timeout: 15000 });
  await frames(page);
}
async function box(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Echec(`boîte absente : ${sel}`);
  return b;
}
const centerOf = (b) => [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)];
const ids = (page) => page.$$eval(THUMBS, (els) => els.map((e) => e.getAttribute("data-page-id")));
const count = async (page) => (await ids(page)).length;
const shown = (page) => page.$eval(`${LIST} [aria-current="page"]`, (e) => e.getAttribute("data-page-id"));
const camera = async (page) => {
  const [zoom, tx, ty] = (await attr(page, "data-camera")).split(",").map(Number);
  return { zoom, tx, ty };
};
const counter = (page) => page.$eval("#pages", (e) => e.textContent.trim());
const side = (page, state) => page.waitForFunction((s) => (document.querySelector('[data-island="pages"]')?.getAttribute("data-collapsed") === "1") === (s === "folded"), state, { timeout: 15000 });
async function openSide(page) {
  if ((await page.getAttribute(SIDE, "data-collapsed")) === "1") {
    await page.click(COLLAPSE);
    await side(page, "open");
    await frames(page);
  }
}
async function foldSide(page) {
  if ((await page.getAttribute(SIDE, "data-collapsed")) !== "1") {
    await page.click(COLLAPSE);
    await side(page, "folded");
    await frames(page);
  }
}

// Doigt : événements tactiles de CDP, un ou deux points.
const pts = (list) => list.map(([x, y], i) => ({ x: Math.round(x), y: Math.round(y), id: i }));
const touch = (cdp, type, list) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : pts(list) });
async function tapAt(page, cdp, x, y) {
  await touch(cdp, "touchStart", [[x, y]]);
  await touch(cdp, "touchEnd", []);
  await settle(page);
}
async function tap(page, cdp, sel) {
  await tapAt(page, cdp, ...centerOf(await box(page, sel)));
}
async function dragAt(page, cdp, from, to, { steps = 14, hold = 0 } = {}) {
  await touch(cdp, "touchStart", [from]);
  if (hold > 0) await page.waitForTimeout(hold);
  for (let i = 1; i <= steps; i++) await touch(cdp, "touchMove", [[from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps]]);
  await touch(cdp, "touchEnd", []);
  await settle(page);
}
async function holdAt(page, cdp, x, y, ms = 800) {
  await touch(cdp, "touchStart", [[x, y]]);
  await page.waitForTimeout(ms);
  await touch(cdp, "touchEnd", []);
  await settle(page);
}
async function twoFingers(page, cdp, a, b, dx, dy, steps = 16) {
  await touch(cdp, "touchStart", [a, b]);
  for (let i = 1; i <= steps; i++) {
    await touch(cdp, "touchMove", [
      [a[0] + (dx * i) / steps, a[1] + (dy * i) / steps],
      [b[0] + (dx * i) / steps, b[1] + (dy * i) / steps],
    ]);
  }
  await touch(cdp, "touchEnd", []);
  await settle(page);
}

// Fichiers d'essai : fabriqués par la CLI construite.
function cli(args, input) {
  const r = spawnSync("node", [BIN, ...args], { encoding: "utf8", input, env: { ...process.env, ROOMBOARD_NOW: "1700000000000" } });
  if (r.status !== 0) throw new Echec(`CLI ${args.join(" ")} : code ${r.status} ${r.stdout}${r.stderr}`);
  return r.stdout;
}
const STYLE = { color: "#1e40af", width: 4 };
/** Rectangle rouge dessous, ellipse verte qui le chevauche dessus, texte tout en haut. */
function makeObjects(file) {
  cli(["new", file]);
  const ops = [
    { type: "AddShape", page: "$page:0", shape: "rect", x0: 400, y0: 300, x1: 900, y1: 700, style: STYLE, fill: "#dc2626" },
    { type: "AddShape", page: "$page:0", shape: "ellipse", x0: 700, y0: 400, x1: 1200, y1: 800, style: STYLE, fill: "#16a34a" },
    { type: "SetText", page: "$page:0", id: null, x: 1300, y: 120, content: "Bonjour", color: "#000000", size: 48, boxWidth: 600, boxHeight: 60 },
  ];
  cli(["run", file, "--ops", "-", "--save"], `${ops.map((o) => JSON.stringify(o)).join("\n")}\n`);
}
async function openFile(page, file) {
  const tabs = await page.locator(TAB).count();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, tabs + 1, { timeout: 30000 });
  await settle(page);
}
async function saveTo(page, file) {
  const dl = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  await (await dl).saveAs(file);
}
async function newContext(browser, { viewport = MID, dsf = 1 } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const w = watch(page);
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, w, cdp };
}
async function start(browser, base, o) {
  const c = await newContext(browser, o);
  await c.page.goto(`${base}/?fichiers=repli`);
  await ready(c.page);
  return c;
}
/** Page du tableau en pixels de scène : { x, y, w, h } du plus grand rectangle de la couleur du centre de la scène. */
const frameBox = (page) =>
  page.$eval("#scene", (c) => {
    const ctx = c.getContext("2d");
    const { width: w, height: h } = c;
    const d = ctx.getImageData(0, 0, w, h).data;
    const mid = ((h >> 1) * w + (w >> 1)) * 4;
    const [r, g, b] = [d[mid], d[mid + 1], d[mid + 2]];
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i] === r && d[i + 1] === g && d[i + 2] === b) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, canvasW: w, canvasH: h };
  });
const mouseDraw = async (page, x0, y0, x1, y1) => {
  const st = await box(page, "#stage");
  await page.mouse.move(st.x + x0, st.y + y0);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(st.x + x0 + ((x1 - x0) * i) / 8, st.y + y0 + ((y1 - y0) * i) / 8);
  await page.mouse.up();
  await settle(page);
};

/** S1 : mode de page au doigt. */
async function s1(browser, base, tmp) {
  current = "S1";
  const old = join(tmp, "ancien.roomboard");
  cli(["new", old]);
  const { ctx, page, w, cdp } = await start(browser, base);
  await openFile(page, old);
  check((await attr(page, "data-page-mode")) === "landscape", "fichier sans `mode` : #stage[data-page-mode=landscape]");
  const fr = await frameBox(page);
  check(fr.w < fr.canvasW - 8 && fr.h < fr.canvasH - 8, `cadre visible dans la scène (${fr.w} × ${fr.h} sur ${fr.canvasW} × ${fr.canvasH}), pourtour autour`);
  // Grille à carreaux par le panneau.
  await clickItem(page, "grid");
  await page.waitForSelector("#grille", { state: "visible", timeout: 15000 });
  await page.selectOption('#grille [data-grille="kind"]', "squares");
  await page.click('#grille [data-grille="apply"]');
  await settle(page);
  // Onglet replié Pages au doigt, puis segment Infini.
  check((await page.getAttribute(SIDE, "data-collapsed")) === "1", "barre latérale repliée à l'ouverture");
  await tap(page, cdp, COLLAPSE);
  await side(page, "open");
  await tap(page, cdp, mode("infinite"));
  await waitAttr(page, "data-page-mode", "infinite");
  check(true, "segment Infini touché : #stage[data-page-mode=infinite]");
  const st = await box(page, "#stage");
  const all = [0, 0, st.width, st.height];
  const grid0 = await inkIn(page, [st.width * 0.45, st.height * 0.2, st.width * 0.7, st.height * 0.5], { max: 750 });
  check(grid0 > 0, `plus de bord : la grille couvre la scène (${grid0} pixels de grille en pleine zone)`);
  // Deux doigts, 600 px vers le bas et la droite.
  const cam0 = await camera(page);
  await twoFingers(page, cdp, [st.x + 500, st.y + 200], [st.x + 600, st.y + 200], 520, 600);
  const cam1 = await camera(page);
  check(Math.abs(cam1.ty - cam0.ty - 600) < 6 && Math.abs(cam1.tx - cam0.tx - 520) < 6 && Math.abs(cam1.zoom - cam0.zoom) < 0.01, `deux doigts : vue déplacée de (${(cam1.tx - cam0.tx).toFixed(0)}, ${(cam1.ty - cam0.ty).toFixed(0)}) sans zoom`);
  // Trait à gauche et au-dessus de l'origine.
  await page.click(item("pen"));
  const [sx0, sy0, sx1, sy1] = [420, 300, 520, 340];
  await mouseDraw(page, sx0, sy0, sx1, sy1);
  const px = (sx0 - cam1.tx) / cam1.zoom;
  const py = (sy0 - cam1.ty) / cam1.zoom;
  check(px < 0 && py < 0, `le trait part de (${px.toFixed(0)}, ${py.toFixed(0)}) : à gauche et au-dessus de l'origine`);
  const ink = await inkIn(page, [sx0 - 6, sy0 - 6, sx1 + 6, sy1 + 6]);
  check(ink > 0, `trait dessiné aux coordonnées négatives (${ink} pixels d'encre)`);
  const gridNeg = await inkIn(page, [sx0 - 10, sy1 + 20, sx1 + 60, sy1 + 120], { max: 750 });
  check(gridNeg > 0, `grille peinte aux coordonnées négatives (${gridNeg} pixels de grille sous le trait)`);
  // « Ajuster la page » : le trait est dans la vue.
  await page.click(item("select"));
  await page.click(item("fit-page"));
  await settle(page);
  const cam2 = await camera(page);
  const inkFit = await inkIn(page, all);
  check(inkFit > 0 && (cam2.tx !== cam1.tx || cam2.ty !== cam1.ty || cam2.zoom !== cam1.zoom), `« Ajuster la page » : la vue change et le trait est dans la vue (${inkFit} pixels d'encre)`);
  // Page ajoutée, Portrait.
  await clickItem(page, "page-add");
  await waitAttr(page, "data-page", "2/2");
  await page.click(item("fit-page"));
  await settle(page);
  await openSide(page);
  await settle(page, 400);
  await tap(page, cdp, mode("portrait"));
  await waitAttr(page, "data-page-mode", "portrait");
  await page.click(item("fit-page"));
  await settle(page);
  const p = await frameBox(page);
  const ratio = p.h / p.w;
  check(Math.abs(ratio - 1.78) < 0.05 && p.y > 0 && p.y + p.h < p.canvasH, `Portrait : cadre entier visible, hauteur ≈ 1,78 × largeur (${ratio.toFixed(3)})`);
  // Ctrl+Z : retour paysage en une étape.
  await page.keyboard.press("Control+z");
  await waitAttr(page, "data-page-mode", "landscape");
  check(true, "Ctrl+Z : retour à paysage en une étape");
  // Enregistrer, rouvrir.
  const saved = join(tmp, "s1.roomboard");
  await saveTo(page, saved);
  await openFile(page, saved);
  await waitAttr(page, "data-page", "1/2");
  check((await attr(page, "data-page-mode")) === "infinite", "rouvert : page 1 infinie");
  const inkAgain = await inkIn(page, all);
  check(inkAgain > 0, `rouvert : le trait est là (${inkAgain} pixels d'encre)`);
  await openSide(page);
  await tap(page, cdp, `${LIST} [data-page="2"]`);
  await waitAttr(page, "data-page", "2/2");
  check((await attr(page, "data-page-mode")) === "landscape", "rouvert : page 2 paysage");
  noErrors(w);
  await ctx.close();
}

/** Boîte d'une miniature par son rang (1 à N). */
const thumb = (page, n) => box(page, `${LIST} [data-page="${n}"]`);
const imgWidth = async (page) => (await box(page, `${LIST} [data-page="1"] .rb-page-img`)).width;
const menuRow = (page, key) => page.waitForSelector(`[data-side-menu] [data-menu="${key}"]`, { state: "visible", timeout: 15000 });
const orderIs = async (page, want) => JSON.stringify(await ids(page)) === JSON.stringify(want);
/** Profil exporté : les barres, l'export du sélecteur de profils. */
async function exportProfile(page, tmp, name) {
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  const dl = page.waitForEvent("download");
  await page.click('[data-profile-cmd="export"]');
  const file = join(tmp, name);
  await (await dl).saveAs(file);
  return JSON.parse(await readFile(file, "utf8"));
}

/** S2 : barre latérale Pages au doigt, profil. */
async function s2(browser, base, tmp) {
  current = "S2";
  const { ctx, page, w, cdp } = await start(browser, base);
  await clickItem(page, "page-add");
  await clickItem(page, "page-add");
  await waitAttr(page, "data-page", "3/3");
  const [a, b, c] = await ids(page);
  check((await count(page)) === 3, "trois pages (« Ajouter » de la barre latérale, deux fois)");
  // Toucher une miniature la montre.
  await tap(page, cdp, `${LIST} [data-page="1"]`);
  await waitAttr(page, "data-page", "1/3");
  check((await shown(page)) === a, "toucher la miniature 1 la montre (aria-current)");
  // Glisser la miniature 3 au-dessus de la 1.
  const t3 = await thumb(page, 3);
  const t1 = await thumb(page, 1);
  await dragAt(page, cdp, centerOf(t3), [centerOf(t1)[0], t1.y + 6], { steps: 16 });
  check(await orderIs(page, [c, a, b]), `glisser la miniature 3 au-dessus de la 1 : ordre 3, 1, 2 (${(await ids(page)).join(", ")})`);
  await page.keyboard.press("Control+z");
  await settle(page);
  check(await orderIs(page, [a, b, c]), "Ctrl+Z : ordre 1, 2, 3");
  // Appui long sur la miniature 2, Dupliquer.
  const t2 = await thumb(page, 2);
  await holdAt(page, cdp, ...centerOf(t2), 800);
  await menuRow(page, "duplicate");
  await tap(page, cdp, '[data-side-menu] [data-menu="duplicate"]');
  await waitAttr(page, "data-page", "3/4");
  const after = await ids(page);
  check(after.length === 4 && after[0] === a && after[1] === b && after[3] === c && after[2] !== b, `appui long, Dupliquer : 4 pages, copie montrée en 3 (${await attr(page, "data-page")})`);
  // Retirer.
  await holdAt(page, cdp, ...centerOf(await thumb(page, 3)), 800);
  await menuRow(page, "remove");
  await tap(page, cdp, '[data-side-menu] [data-menu="remove"]');
  await page.waitForFunction(() => document.querySelectorAll(".rb-pages-list [data-page-id]").length === 3, null, { timeout: 15000 });
  check((await count(page)) === 3, "appui long, Retirer : 3 pages");
  // Taille Grandes : miniatures plus larges ; recharger : même taille.
  const wm = await imgWidth(page);
  await tap(page, cdp, `[data-edit="page-thumb"] [data-choice="l"]`);
  const wl = await imgWidth(page);
  check(wl > wm && (await page.getAttribute(LIST, "data-thumb")) === "l", `taille Grandes : miniatures plus larges (${wm} → ${wl} px)`);
  await page.reload();
  await ready(page);
  await openSide(page);
  check((await page.getAttribute(LIST, "data-thumb")) === "l" && (await imgWidth(page)) === wl, "recharger : même taille");
  // Replier, recharger : repliée.
  await tap(page, cdp, COLLAPSE);
  await side(page, "folded");
  await page.reload();
  await ready(page);
  check((await page.getAttribute(SIDE, "data-collapsed")) === "1", "replier puis recharger : barre repliée");
  // Éditeur de profils, sur un appareil neuf (l'état replié gardé plus haut prime sur le profil) : À droite, Repliée
  // décochée, Page neuve Infini.
  await ctx.close();
  const fresh = await start(browser, base);
  const page2 = fresh.page;
  await page2.click(item("profiles"));
  await page2.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page2.click('[data-profile-cmd="edit"]');
  await page2.waitForSelector("[data-profile-editor]", { timeout: 15000 });
  await page2.click('[data-edit="bar"] [data-choice="pages"]');
  const bar = '[data-edit-bar="pages"]';
  await page2.waitForSelector(bar, { timeout: 15000 });
  await page2.click(`${bar} [data-edit="anchor"] [data-choice="side-end"]`);
  await frames(page2);
  if (await page2.isChecked(`${bar} [data-edit="collapsed"]`)) await page2.uncheck(`${bar} [data-edit="collapsed"]`);
  await page2.click('[data-edit-section="general"] [data-edit="page-mode"] [data-choice="infinite"]');
  await frames(page2);
  if (await page2.isEnabled('button[data-edit="save"]')) await page2.click('button[data-edit="save"]');
  await settle(page2);
  if ((await page2.locator("[data-profile-editor]").count()) > 0) await page2.click('button[data-edit="close"]');
  await page2.waitForSelector("[data-profile-editor]", { state: "detached", timeout: 15000 });
  await settle(page2);
  check((await page2.getAttribute(SIDE, "data-anchor")) === "side-end" && (await page2.getAttribute(SIDE, "data-collapsed")) === null, "éditeur : À droite, non repliée : l'îlot passe à droite, ouvert");
  await clickItem(page2, "page-add");
  await waitAttr(page2, "data-page-mode", "infinite");
  check(true, "page ajoutée : infinie (Page neuve : Infini)");
  const prof = await exportProfile(page2, tmp, "pages.rbprofile");
  const bars = (prof.toolbars ?? []).filter((x) => x.id === "pages");
  check(bars.length === 1 && bars[0].anchor === "side-end" && bars[0].collapsed === false && prof.behavior?.pageMode === "infinite", `export .rbprofile : anchor ${bars[0]?.anchor}, collapsed ${bars[0]?.collapsed}, behavior.pageMode ${prof.behavior?.pageMode}`);
  noErrors(w);
  noErrors(fresh.w);
  await fresh.ctx.close();
}

/** Haut de page (y de la caméra) sous les îlots du haut : même valeur barre latérale ouverte ou repliée. */
const pageTop = async (page) => (await camera(page)).ty;
async function s3(browser, base) {
  current = "S3";
  const { ctx, page, w, cdp } = await start(browser, base);
  const bar = '[data-toolbar="pages"], [data-toolbar="outils"]';
  const nav = await page.$$eval('[data-item="page-prev"], #pages, [data-item="page-next"]', (els) => els.map((e) => e.getAttribute("data-item") ?? e.id));
  check(JSON.stringify(nav) === JSON.stringify(["page-prev", "page-number", "page-next"]) || JSON.stringify(nav.map((n) => (n === "pages" ? "page-number" : n))) === JSON.stringify(["page-prev", "page-number", "page-next"]), `barre d'outils : page-prev, #pages, page-next (${nav.join(", ")})`);
  const same = await page.evaluate(() => {
    const p = document.querySelector('[data-item="page-prev"]');
    const n = document.querySelector('[data-item="page-next"]');
    const c = document.getElementById("pages");
    const tb = (e) => e?.closest("[data-toolbar]")?.getAttribute("data-toolbar");
    return [tb(p), tb(c), tb(n)];
  });
  check(same[0] !== null && same[0] === same[1] && same[1] === same[2] && same[0] !== "pages", `les trois sont dans la même barre d'outils (${same[0]})`);
  check((await counter(page)) === "1 / 1", `#pages : « ${await counter(page)} »`);
  const bottom = await page.locator('.rb-island[data-anchor="bottom-center"]').count();
  check(bottom === 0, "aucun îlot à l'ancre bas-centre");
  void bar;
  await tap(page, cdp, item("page-next"));
  await waitAttr(page, "data-page", "2/2");
  check((await counter(page)) === "2 / 2", "Suivante sur la dernière page : « 2 / 2 », page ajoutée");
  await page.keyboard.press("Control+z");
  await waitAttr(page, "data-page", "1/1");
  check((await counter(page)) === "1 / 1", "Ctrl+Z : « 1 / 1 »");
  await tap(page, cdp, item("page-next"));
  await tap(page, cdp, item("page-prev"));
  await waitAttr(page, "data-page", "1/2");
  check((await counter(page)) === "1 / 2", "Précédente : « 1 / 2 »");
  // #pages : la barre latérale s'ouvre sur Pages.
  check((await page.getAttribute(SIDE, "data-collapsed")) === "1", "barre latérale repliée avant le toucher");
  await tap(page, cdp, "#pages");
  await side(page, "open");
  check((await page.getAttribute('[data-side-tab="pages"]', "aria-selected")) === "true", "toucher #pages : barre ouverte sur l'onglet Pages");
  // Haut de page ajusté sous les îlots du haut, barre ouverte et repliée.
  const tops = async () => {
    const boxes = await page.$$eval('.rb-island, [data-toolbar="outils"] [data-island-context]', (els) => els.map((e) => ({ id: e.getAttribute("data-island") ?? "contexte", ...e.getBoundingClientRect().toJSON() })));
    const vp = MID;
    return Math.max(...boxes.filter((b) => b.id !== "pages" && b.width > 0 && b.y < vp.height / 4 && b.height < vp.height / 3).map((b) => b.y + b.height));
  };
  await page.click(item("fit-page"));
  await settle(page);
  const low = await tops();
  const open = await pageTop(page);
  await foldSide(page);
  await page.click(item("fit-page"));
  await settle(page);
  const folded = await pageTop(page);
  check(open === low + 12 && folded === open, `haut de page à y ${open} barre ouverte, ${folded} repliée, 12 px sous les îlots du haut (bas à y ${low})`);
  noErrors(w);
  await ctx.close();
}

/** Touches de rang : focus et retours. */
const focusIn = (page, sel) => page.evaluate((s) => document.activeElement?.matches(s) === true, sel);
const labels = (page) => page.$$eval(`${LAYERS} .rb-layer`, (els) => els.map((e) => e.querySelector(".rb-layer-name")?.textContent?.trim() ?? ""));
const rowBox = async (page, i) => (await page.locator(ROWS).nth(i).boundingBox());
/** Pixels d'une couleur dans un rectangle de page (coordonnées de page, passées en pixels de scène par la caméra). */
async function paintIn(page, rect, rgb) {
  const { zoom, tx, ty } = await camera(page);
  return inkIn(page, [tx + rect[0] * zoom, ty + rect[1] * zoom, tx + rect[2] * zoom, ty + rect[3] * zoom], { rgb, tol: 40 });
}
const RED = [220, 38, 38];
const GREEN = [22, 163, 74];

/** S4 : onglet Calques au doigt. */
async function s4(browser, base, tmp) {
  current = "S4";
  const file = join(tmp, "objets.roomboard");
  makeObjects(file);
  const { ctx, page, w, cdp } = await start(browser, base);
  await openFile(page, file);
  await waitAttr(page, "data-elements", "3");
  await openSide(page);
  await tap(page, cdp, '[data-side-tab="calques"]');
  await page.waitForSelector(`${LAYERS} .rb-layer`, { timeout: 15000 });
  const l0 = await labels(page);
  const kinds = await page.$$eval(`${LAYERS} .rb-layer`, (els) => els.map((e) => e.getAttribute("data-kind")));
  check(JSON.stringify(kinds) === JSON.stringify(["text", "shape", "shape", "backdrop"]), `onglet Calques : texte en haut, rectangle en bas, puis le fond (${l0.join(" | ")})`);
  check((await page.locator(`${LAYERS} .rb-layer[data-fixed]`).count()) === 1, "la ligne du fond est fixe (aucun geste)");
  check((await page.getAttribute('[data-side-tab="calques"]', "aria-selected")) === "true", "onglet Calques sélectionné");
  // Toucher la ligne du rectangle : sélectionné sur la scène.
  check((await attr(page, "data-selection")) === "0", "rien de sélectionné au départ");
  await tap(page, cdp, `${ROWS} >> nth=2`);
  await waitAttr(page, "data-selection", "1");
  check(true, "toucher la ligne du rectangle : #stage[data-selection=1]");
  const rectRowKey = await page.locator(ROWS).nth(2).getAttribute("data-layer");
  // Avant : l'ellipse est dessus au chevauchement.
  const over = [760, 500, 840, 600];
  check((await paintIn(page, over, GREEN)) > 0 && (await paintIn(page, over, RED)) === 0, "avant : au chevauchement, les pixels sont ceux de l'ellipse");
  // Glisser sa ligne tout en haut.
  const r0 = await rowBox(page, 0);
  const r2 = await rowBox(page, 2);
  await dragAt(page, cdp, centerOf(r2), [centerOf(r0)[0], r0.y + 4], { steps: 16 });
  const l1 = await labels(page);
  check((await page.locator(ROWS).first().getAttribute("data-layer")) === rectRowKey, `glisser sa ligne tout en haut : le rectangle est la première ligne (${l1.join(" | ")})`);
  check((await paintIn(page, over, RED)) > 0 && (await paintIn(page, over, GREEN)) === 0, "au chevauchement, les pixels sont ceux du rectangle");
  await page.keyboard.press("Control+z");
  await settle(page);
  check((await paintIn(page, over, GREEN)) > 0 && (await paintIn(page, over, RED)) === 0, "Ctrl+Z : les pixels de l'ellipse reviennent, en une étape");
  check((await page.locator(ROWS).nth(2).getAttribute("data-layer")) === rectRowKey, "Ctrl+Z : la ligne du rectangle est redescendue");
  // Groupe de deux objets : une ligne « Groupe (2) ».
  await tap(page, cdp, `${ROWS} >> nth=0`);
  await page.keyboard.down("Shift");
  await page.locator(ROWS).nth(1).click();
  await page.keyboard.up("Shift");
  await waitAttr(page, "data-selection", "2");
  await page.keyboard.press("Control+g");
  await page.waitForFunction(() => [...document.querySelectorAll(".rb-layers-list .rb-layer-name")].some((e) => e.textContent.trim() === "Groupe (2)"), null, { timeout: 15000 });
  const l2 = await labels(page);
  check(l2[0] === "Groupe (2)" && l2.length === 3, `deux objets groupés : une ligne « Groupe (2) » (${l2.join(" | ")})`);
  // Déplacée en bloc : sous le rectangle.
  const g0 = await rowBox(page, 0);
  const g1 = await rowBox(page, 1);
  await dragAt(page, cdp, centerOf(g0), [centerOf(g1)[0], g1.y + g1.height - 4], { steps: 16 });
  const l3 = await labels(page);
  check(l3[1] === "Groupe (2)" && l3.length === 3, `la ligne du groupe est déplacée en bloc (${l3.join(" | ")})`);
  // Rangée Sélection : Arrière-plan.
  await tap(page, cdp, `${ROWS} >> nth=1`);
  await waitAttr(page, "data-selection", "2");
  await page.click('[data-selection-action="layer-front"]');
  await settle(page);
  const l4 = await labels(page);
  check(l4[0] === "Groupe (2)", `« Premier plan » remonte le groupe en haut (${l4.join(" | ")})`);
  await page.click('[data-selection-action="layer-back"]');
  await settle(page);
  const l5 = await labels(page);
  check(l5[1] === "Groupe (2)" && l5[2] === "Fond de la page", `« Arrière-plan » le renvoie en bas, au-dessus du fond (${l5.join(" | ")})`);
  noErrors(w);
  await ctx.close();
}

/** S5 : clavier. */
async function s5(browser, base, tmp) {
  current = "S5";
  const { ctx, page, w } = await start(browser, base);
  const key = (k) => page.keyboard.press(k);
  const at = (n) => waitAttr(page, "data-page", n);
  // Un rectangle sur la page 1, pour prouver qu'aucun objet n'est supprimé.
  await page.click(item("rect"));
  await mouseDraw(page, 400, 250, 600, 400);
  await page.click(item("select"));
  await key("PageDown");
  await at("2/2");
  await key("PageDown");
  await at("3/3");
  check((await counter(page)) === "3 / 3", "PageDown sur la dernière page : une page ajoutée à chaque fois (« 3 / 3 »)");
  await key("PageUp");
  await key("PageUp");
  await at("1/3");
  await key("PageDown");
  await key("PageDown");
  await at("3/3");
  check((await count(page)) === 3 || (await attr(page, "data-page")) === "3/3", "PageDown jusqu'à la dernière page : aucune page ajoutée en chemin");
  await page.keyboard.down("PageDown");
  await page.keyboard.down("PageDown");
  await page.keyboard.down("PageDown");
  await page.keyboard.up("PageDown");
  await at("4/4");
  await settle(page);
  check((await attr(page, "data-page")) === "4/4", "touche tenue (répétée) sur la dernière page : une seule page ajoutée (« 4/4 »)");
  await key("PageUp");
  await at("3/4");
  check(true, "PageUp revient à la page précédente");
  await key("Control+m");
  await at("4/5");
  check(true, "Ctrl+M ajoute une page après la page montrée (« 4/5 »)");
  await key("Control+Shift+D");
  await at("5/6");
  check(true, "Ctrl+Maj+D duplique la page montrée (« 5/6 »)");
  // Retour à la page 1, objet sélectionné, barre latérale au clavier.
  await key("Home");
  for (let i = 0; i < 6; i++) await key("PageUp");
  await at("1/6");
  const st = await box(page, "#stage");
  await page.mouse.click(st.x + 500, st.y + 325);
  await waitAttr(page, "data-selection", "1");
  const elements = await attr(page, "data-elements");
  await key("Control+Shift+P");
  await side(page, "open");
  await settle(page);
  check(await focusIn(page, `${LIST} [aria-current="page"]`), "Ctrl+Maj+P ouvre la barre latérale, focus sur la miniature montrée");
  await key("Control+ArrowDown");
  await settle(page);
  const order = await ids(page);
  check((await shown(page)) === order[1], "Ctrl+↓ descend la miniature montrée d'un rang");
  await page.focus(`${LIST} [aria-current="page"]`);
  await key("ArrowDown");
  const before = await count(page);
  const victim = await page.evaluate(() => document.activeElement?.getAttribute("data-page-id"));
  await key("Delete");
  await page.waitForFunction((n) => document.querySelectorAll(".rb-pages-list [data-page-id]").length === n, before - 1, { timeout: 15000 });
  check(!(await ids(page)).includes(victim) && (await attr(page, "data-elements")) === elements, `Suppr retire la miniature (${before} → ${before - 1}) ; l'objet sélectionné n'est pas supprimé (${elements} éléments)`);
  await page.focus(`${LIST} [aria-current="page"]`);
  await key("Escape");
  check(!(await focusIn(page, ".rb-side *")), "Échap rend le focus à la scène");
  // Tab jusqu'au mode, flèche droite : portrait.
  await page.focus('[data-side-tab="pages"]');
  let inMode = false;
  for (let i = 0; i < 30 && !inMode; i++) {
    await key("Tab");
    inMode = await focusIn(page, `${MODE} [role="radio"]`);
  }
  check(inMode, "Tab depuis les onglets atteint le mode de la page");
  await key("ArrowRight");
  await waitAttr(page, "data-page-mode", "portrait");
  check(true, "flèche droite : portrait");
  // Dans un texte ouvert, PageDown et Ctrl+M sans effet de page.
  await page.click(item("text"));
  await page.mouse.click(st.x + 900, st.y + 500);
  await settle(page, 300);
  const n0 = await count(page);
  const p0 = await attr(page, "data-page");
  await key("PageDown");
  await key("Control+m");
  await settle(page);
  check((await count(page)) === n0 && (await attr(page, "data-page")) === p0, `dans un texte ouvert, PageDown et Ctrl+M n'agissent pas sur les pages (${n0} pages, ${p0})`);
  await key("Escape");
  await page.click(item("select"));
  // Lot 2 : ordre des objets.
  const file = join(tmp, "objets5.roomboard");
  makeObjects(file);
  await openFile(page, file);
  await waitAttr(page, "data-elements", "3");
  await key("Control+Shift+L");
  await page.waitForFunction(() => document.querySelector('[data-side-tab="calques"]')?.getAttribute("aria-selected") === "true", null, { timeout: 15000 });
  check(true, "Ctrl+Maj+L ouvre l'onglet Calques");
  await page.waitForSelector(`${LAYERS} .rb-layer`, { timeout: 15000 });
  const keyOf = (n) => page.locator(ROWS).nth(n).getAttribute("data-layer");
  const bottomKey = await keyOf(2);
  await page.locator(ROWS).nth(2).click({ position: { x: 20, y: 10 } });
  await waitAttr(page, "data-selection", "1");
  await page.focus("#stage").catch(() => undefined);
  await key("Control+Shift+ArrowUp");
  await settle(page);
  check((await keyOf(0)) === bottomKey, "sélection, Ctrl+Maj+↑ : premier plan");
  await key("Control+ArrowDown");
  await settle(page);
  check((await keyOf(1)) === bottomKey, "Ctrl+↓ : un rang plus bas");
  await key("Control+Shift+ArrowDown");
  await settle(page);
  check((await keyOf(2)) === bottomKey, "Ctrl+Maj+↓ : arrière-plan");
  noErrors(w);
  await ctx.close();
}

/** Netteté § 10 à 2x : icônes neuves de la barre latérale et de la navigation. */
async function colorsOf(page, sel) {
  return page.$eval(sel, (svg) => {
    const parse = (s) => (s.match(/[\d.]+/g) ?? []).map(Number);
    const ink = parse(getComputedStyle(svg).color).slice(0, 3);
    let el = svg;
    let bg = [255, 255, 255];
    while (el !== null) {
      const c = parse(getComputedStyle(el).backgroundColor);
      if (c.length >= 3 && (c.length === 3 || c[3] === 1)) {
        bg = c.slice(0, 3);
        break;
      }
      el = el.parentElement;
    }
    return { ink, bg };
  });
}
async function crisp(page, sel, label, { edge = false } = {}) {
  const b = await box(page, sel);
  const { ink, bg } = await colorsOf(page, sel);
  const px = await pixelsOf(page, { x: Math.floor(b.x), y: Math.floor(b.y), width: Math.ceil(b.width), height: Math.ceil(b.height) });
  const fr = fringes(px, bg, ink);
  check(fr === 0, `${label} : 0 frange colorée (${px.width} × ${px.height} pixels)`);
  if (edge) {
    const row = px.height >> 1;
    const r = edgeRow(px, row, 0, px.width, bg, ink);
    console.log(`rangée de ${label} (gris, 2x) : ${r.gray.join(" ")}`);
    check(r.intermediate === 0, `${label} : 0 pixel intermédiaire sur la rangée du milieu (traits ${JSON.stringify(r.runs)})`);
  }
}
async function netteté(browser, base) {
  current = "Netteté";
  const { ctx, page, w } = await start(browser, base, { viewport: BIG, dsf: 2 });
  await openSide(page);
  await page.mouse.move(BIG.width / 2, BIG.height - 300);
  await frames(page);
  // Icônes à droites pures : 0 pixel intermédiaire sur la rangée du milieu.
  await crisp(page, `${mode("landscape")} svg.rb-icon`, "icône rectangle-horizontal du mode Paysage", { edge: true });
  await crisp(page, `${mode("portrait")} svg.rb-icon`, "icône rectangle-vertical du mode Portrait", { edge: true });
  for (const [sel, label] of [
    [`${mode("infinite")} svg.rb-icon`, "icône du mode Infini"],
    [`${item("page-prev")} svg.rb-icon`, "icône Page précédente"],
    [`${item("page-next")} svg.rb-icon`, "icône Page suivante"],
    ["#pages svg.rb-icon", "icône du numéro de page"],
    ['[data-side-tab="pages"] svg.rb-icon', "icône de l'onglet Pages"],
    [`${SIDE} ${item("page-add")} svg.rb-icon`, "icône Ajouter une page"],
    [`${SIDE} ${item("page-duplicate")} svg.rb-icon`, "icône Dupliquer la page"],
    [`${SIDE} ${item("page-remove")} svg.rb-icon`, "icône Retirer la page"],
    [`[data-edit="page-thumb"] [data-choice="m"] svg.rb-icon`, "icône de la taille Moyennes"],
  ]) {
    await crisp(page, sel, label);
  }
  noErrors(w);
  await ctx.close();
}

/** Captures 1920 × 1080 à 2x : `avant` (tableau) ou `apres` (cinq vues). */
async function captureSet(browser, base, nom, tmp) {
  await mkdir(CAPTURES, { recursive: true });
  const out = (v) => join(CAPTURES, `${nom}-${v}.png`);
  const shot = async (page, v) => {
    await page.mouse.move(BIG.width / 2, BIG.height - 120);
    await settle(page, 300);
    await page.screenshot({ path: out(v) });
    console.log(`capture : ${out(v)}`);
  };
  const { ctx, page, cdp } = await start(browser, base, { viewport: BIG, dsf: 2 });
  await shot(page, "tableau");
  if (nom === "avant") {
    await ctx.close();
    return;
  }
  await openSide(page);
  await clickItem(page, "page-add");
  await clickItem(page, "page-add");
  await tap(page, cdp, `${LIST} [data-page="1"]`);
  await shot(page, "pages");
  await tap(page, cdp, mode("infinite"));
  await waitAttr(page, "data-page-mode", "infinite");
  await shot(page, "infini");
  await tap(page, cdp, mode("portrait"));
  await waitAttr(page, "data-page-mode", "portrait");
  await page.click(item("fit-page"));
  await shot(page, "portrait");
  const file = join(tmp, "captures.roomboard");
  makeObjects(file);
  await openFile(page, file);
  await waitAttr(page, "data-elements", "3");
  await openSide(page);
  await tap(page, cdp, '[data-side-tab="calques"]');
  await page.waitForSelector(`${LAYERS} .rb-layer`, { timeout: 15000 });
  await page.locator(ROWS).nth(1).click({ position: { x: 20, y: 10 } });
  await settle(page);
  await shot(page, "calques");
  await ctx.close();
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const only = arg("--seulement");
  const captures = process.argv.includes("--captures");
  if (nom === "avant" && !captures) {
    console.error(`${LABEL} : usage — --nom avant n'a de sens qu'avec --captures (captures « avant » seules)`);
    return 2;
  }
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist}/index.html absent : construire d'abord l'application (scripts/verifier.sh)`);
    return 1;
  }
  if (!existsSync(BIN)) {
    console.error(`${LABEL} : ÉCHEC — ${BIN} absent : construire d'abord la CLI (scripts/verifier.sh)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ dist });
  const base = `http://127.0.0.1:${server.address().port}`;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-personnalisation-1a-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (captures) await captureSet(browser, base, nom, tmp);
    if (nom === "avant") {
      console.log(`${LABEL} : captures « avant » seules, mesures sautées`);
      return 0;
    }
    const all = { S1: s1, S2: s2, S3: s3, S4: s4, S5: s5, Netteté: netteté };
    for (const [id, run] of Object.entries(all)) if (only === undefined || only === id) await run(browser, base, tmp);
    console.log(`${[...counts].map(([k, v]) => `${k} : ${v} ok`).join(" ; ")}`);
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
