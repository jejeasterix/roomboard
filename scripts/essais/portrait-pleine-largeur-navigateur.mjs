#!/usr/bin/env node
// Essai OG24 au navigateur (docs/plans/personnalisation-1a-cadrage.md, H4 renversée par Jérôme) : une page portrait
// remplit la largeur ; l'ascenseur vertical, à droite, la fait défiler au doigt, au stylet, à la souris, à la molette et
// au clavier, borné à la page. À 1920 × 1080 et à 1280 × 800. Doigt par CDP `Input.dispatchTouchEvent`, stylet par
// `Input.dispatchMouseEvent` (`pointerType: "pen"`) : jamais le glisser HTML5. Rien de téléchargé.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/portrait-pleine-largeur-navigateur.mjs [--captures [--dist <dossier>] [--nom avant|apres]]
//   --captures : docs/design/captures/portrait-pleine-largeur/<nom>-{haut,milieu}.png (1920 × 1080 à 2x) ;
//   --nom avant (avec --dist, un build de main d'avant OG24) : captures seules, mesures sautées.
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DIST, Echec, ROOT, clickItem, foldOptions, frames, gitSha, item, loadPlaywright, serve } from "./commun.mjs";

const LABEL = "portrait-pleine-largeur";
const VIEWS = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 800 },
];
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const SIDE = '[data-island="pages"]';
const mode = (v) => `[data-side-mode] [data-choice="${v}"]`;
const BAR = '#stage [data-scrollbar="page"]';
const THUMB = `${BAR} .rb-scrollbar-thumb`;
const PORTRAIT_H = (1920 * 16) / 9;
const BOTTOM = 16;
const CAPTURES = join(ROOT, "docs", "design", "captures", "portrait-pleine-largeur");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
let current = "";
let oks = 0;
const check = (cond, msg) => {
  if (!cond) throw new Echec(`${current} : ${msg}`);
  oks++;
  console.log(`ok — ${current} ${msg}`);
};

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
const camera = async (page) => {
  const [zoom, tx, ty] = (await attr(page, "data-camera")).split(",").map(Number);
  return { zoom, tx, ty };
};
/** Haut et bas de la page portrait, px de fenêtre. */
const pageEdges = async (page) => {
  const st = await box(page, "#stage");
  const c = await camera(page);
  return { top: st.y + c.ty, bottom: st.y + c.ty + PORTRAIT_H * c.zoom, st, c };
};

const pts = (list) => list.map(([x, y], i) => ({ x: Math.round(x), y: Math.round(y), id: i }));
const touch = (cdp, type, list) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : pts(list) });
async function tap(page, cdp, sel) {
  const [x, y] = centerOf(await box(page, sel));
  await touch(cdp, "touchStart", [[x, y]]);
  await touch(cdp, "touchEnd", []);
  await settle(page);
}
async function fingerDrag(page, cdp, from, to, steps = 12) {
  await touch(cdp, "touchStart", [from]);
  for (let i = 1; i <= steps; i++) await touch(cdp, "touchMove", [[from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps]]);
  await touch(cdp, "touchEnd", []);
  await settle(page);
}
async function penDrag(page, cdp, from, to, steps = 12) {
  const ev = (type, [x, y], buttons) =>
    cdp.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons, clickCount: 1, pointerType: "pen", force: 0.5 });
  await ev("mousePressed", from, 1);
  for (let i = 1; i <= steps; i++) await ev("mouseMoved", [from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps], 1);
  await ev("mouseReleased", to, 0);
  await settle(page);
}

async function start(browser, base, viewport, dsf = 1) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const cdp = await ctx.newCDPSession(page);
  await foldOptions(page);
  await page.goto(`${base}/?fichiers=repli`);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  return { ctx, page, cdp, errors };
}

/** Grille à carreaux (le défilement se voit), barre latérale ouverte, segment Portrait au doigt, « Ajuster la page ». */
async function toPortrait(page, cdp) {
  await clickItem(page, "grid");
  await page.waitForSelector("#grille", { state: "visible", timeout: 15000 });
  await page.selectOption('#grille [data-grille="kind"]', "squares");
  await page.click('#grille [data-grille="apply"]');
  await settle(page);
  if ((await page.getAttribute(SIDE, "data-collapsed")) === "1") {
    await tap(page, cdp, `${SIDE} [data-side-tab="pages"]`);
    await page.waitForFunction(() => document.querySelector('[data-island="pages"]')?.getAttribute("data-collapsed") !== "1", null, { timeout: 15000 });
    await settle(page, 300);
  }
  await tap(page, cdp, mode("portrait"));
  await waitAttr(page, "data-page-mode", "portrait");
  await page.click(item("fit-page"));
  await settle(page);
}

async function scenario(browser, base, viewport) {
  current = `${viewport.width} × ${viewport.height}`;
  const { ctx, page, cdp, errors } = await start(browser, base, viewport);
  await toPortrait(page, cdp);
  // Pleine largeur, haut de page sous les îlots.
  const e0 = await pageEdges(page);
  const pw = 1920 * e0.c.zoom;
  check(Math.abs(pw - e0.st.width * 0.95) < 1.5, `la page remplit la largeur (${pw.toFixed(0)} px sur ${e0.st.width.toFixed(0)}, marge 5 %)`);
  check(e0.bottom > e0.st.y + e0.st.height, `son bas sort de la vue (bas ${e0.bottom.toFixed(0)} > ${(e0.st.y + e0.st.height).toFixed(0)})`);
  // Ascenseur : à droite, cible de 44 px, du haut de la page au bas de la vue moins 16 px.
  check(await page.isVisible(BAR), "ascenseur visible");
  const b = await box(page, BAR);
  const t0 = await box(page, THUMB);
  check(b.width >= 44 && Math.abs(b.x + b.width - (e0.st.x + e0.st.width)) < 1, `ascenseur à droite, ${b.width} px de large (≥ 44)`);
  check(Math.abs(b.y - e0.top) < 1.5 && Math.abs(b.y + b.height - (e0.st.y + e0.st.height - BOTTOM)) < 1.5, `rail de la hauteur de la page visible (${b.y.toFixed(0)} → ${(b.y + b.height).toFixed(0)})`);
  check(t0.height >= 44 && t0.height < b.height && Math.abs(t0.y - b.y) < 1, `curseur en haut, ${t0.height.toFixed(0)} px de haut (≥ 44)`);
  check((await page.getAttribute(BAR, "aria-valuenow")) === "0", "aria-valuenow = 0 en haut de page");
  // Doigt, outil Stylo actif : la page descend, aucun trait n'est posé.
  await page.click(item("pen"));
  const free = b.height - t0.height;
  const [tx, ty] = centerOf(t0);
  await fingerDrag(page, cdp, [tx, ty], [tx, ty + free / 2]);
  const v1 = Number(await page.getAttribute(BAR, "aria-valuenow"));
  check(Math.abs(v1 - 50) <= 2, `doigt sur le curseur, moitié du rail : page à ${v1} %`);
  check((await attr(page, "data-elements")) === "0", "glisser l'ascenseur, outil Stylo actif : aucun trait posé");
  await fingerDrag(page, cdp, centerOf(await box(page, THUMB)), [tx, b.y + b.height + 300]);
  const e1 = await pageEdges(page);
  check(Math.abs(e1.bottom - (e1.st.y + e1.st.height - BOTTOM)) < 1.5, `doigt au-delà du rail : bas de page à ${BOTTOM} px du bas, pas plus loin`);
  check((await page.getAttribute(BAR, "aria-valuenow")) === "100", "aria-valuenow = 100 en bas de page");
  // Le rail hors du curseur laisse passer les pointeurs : on dessine jusqu'au bord de la page.
  const t1 = await box(page, THUMB);
  const railHit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("[data-scrollbar]") !== null, [tx, t1.y - 40]);
  check(!railHit, "rail hors du curseur : le pointeur passe à la scène");
  // Stylet : un quart du rail vers le haut.
  await penDrag(page, cdp, centerOf(t1), [tx, centerOf(t1)[1] - free / 4]);
  const v2 = Number(await page.getAttribute(BAR, "aria-valuenow"));
  check(Math.abs(v2 - 75) <= 2 && (await attr(page, "data-elements")) === "0", `stylet sur le curseur, quart du rail : page à ${v2} %, aucun trait`);
  // Souris : tout en haut.
  await page.click(item("select"));
  const t2 = await box(page, THUMB);
  await page.mouse.move(...centerOf(t2));
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(tx, centerOf(t2)[1] - b.height * (i / 8));
  await page.mouse.up();
  await settle(page);
  check(Math.abs((await pageEdges(page)).top - e0.top) < 1.5, "souris : curseur remonté au-delà du rail, haut de page, pas plus loin");
  // Molette : bornée en haut, descend sinon.
  await page.mouse.move(e0.st.x + e0.st.width / 2, e0.st.y + e0.st.height / 2);
  await page.mouse.wheel(0, -400);
  await settle(page, 100);
  check(Math.abs((await pageEdges(page)).top - e0.top) < 1.5, "molette vers le haut en haut de page : la page ne bouge pas");
  await page.mouse.wheel(0, 300);
  await settle(page, 100);
  const e2 = await pageEdges(page);
  check(Math.abs(e0.top - e2.top - 300) < 2, `molette : 300 px plus bas (${(e0.top - e2.top).toFixed(0)})`);
  await page.mouse.wheel(0, 1e5);
  await settle(page, 100);
  const e3 = await pageEdges(page);
  check(Math.abs(e3.bottom - (e3.st.y + e3.st.height - BOTTOM)) < 1.5, "molette bornée au bas de la page");
  // Clavier : clic dans la scène (outil Sélection), puis Début, ↓, Maj+↓, Fin, ↑.
  await page.mouse.click(e0.st.x + e0.st.width / 2, e0.st.y + e0.st.height / 2);
  await page.keyboard.press("Home");
  await settle(page);
  check(Math.abs((await pageEdges(page)).top - e0.top) < 1.5, "Début : haut de page");
  await page.keyboard.press("ArrowDown");
  await settle(page);
  const line = e0.top - (await pageEdges(page)).top;
  check(line > 40, `↓ : un cran (${line.toFixed(0)} px)`);
  await page.keyboard.press("Shift+ArrowDown");
  await settle(page);
  const screen = e0.top - (await pageEdges(page)).top - line;
  check(screen > line * 5, `Maj+↓ : un écran (${screen.toFixed(0)} px)`);
  await page.keyboard.press("End");
  await settle(page);
  check((await page.getAttribute(BAR, "aria-valuenow")) === "100", "Fin : bas de page");
  await page.keyboard.press("ArrowUp");
  await settle(page);
  check(Number(await page.getAttribute(BAR, "aria-valuenow")) < 100, "↑ : remonte d'un cran");
  check((await attr(page, "data-page")) === "1/1", "aucune touche n'a changé de page");
  // Paysage et Infini : pas d'ascenseur.
  await tap(page, cdp, mode("landscape"));
  await waitAttr(page, "data-page-mode", "landscape");
  check(!(await page.isVisible(BAR)), "Paysage : aucun ascenseur");
  await tap(page, cdp, mode("infinite"));
  await waitAttr(page, "data-page-mode", "infinite");
  check(!(await page.isVisible(BAR)), "Infini : aucun ascenseur");
  check(errors.length === 0, `aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
}

/** Captures 1920 × 1080 à 2x : haut de page ajustée, puis milieu après défilement à la molette. */
async function captureSet(browser, base, nom) {
  await mkdir(CAPTURES, { recursive: true });
  const out = (v) => join(CAPTURES, `${nom}-${v}.png`);
  const { ctx, page, cdp } = await start(browser, base, VIEWS[0], 2);
  await toPortrait(page, cdp);
  const shot = async (v) => {
    await settle(page, 300);
    await page.screenshot({ path: out(v) });
    console.log(`capture : ${out(v)}`);
  };
  const st = await box(page, "#stage");
  await page.mouse.move(st.x + st.width / 2, st.y + st.height / 2);
  await shot("haut");
  const c = await camera(page);
  const span = st.height - c.ty - BOTTOM;
  await page.mouse.wheel(0, Math.max(st.height / 3, (PORTRAIT_H * c.zoom - span) / 2));
  await shot("milieu");
  await ctx.close();
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
    for (const v of VIEWS) await scenario(browser, base, v);
    console.log(`${oks} ok`);
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
