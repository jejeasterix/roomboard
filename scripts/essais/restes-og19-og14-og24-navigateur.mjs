#!/usr/bin/env node
// Essai OG27 au navigateur : restes d'OG19, d'OG14 et d'OG24, à 1920 × 1080 et à 1280 × 800.
//   S1 : une page Paysage au fond PDF A4 (plus haute que large) est affichée portrait : ajustée en largeur, avec l'ascenseur.
//   S2 : un îlot du haut bouge (poignée de la barre d'outils, au doigt puis au clavier) : l'ajustement et l'ascenseur se
//        recalent tout de suite ; une vue défilée garde sa caméra, seul l'ascenseur relit ses bornes.
//   S3 : la ligne du menu ☰ annonce son raccourci par la même aide que la barre (aria-keyshortcuts).
//   S4 : la miniature d'une page portrait a la forme de la page (plus haute que large), sur sa boîte grise.
// Doigt par CDP `Input.dispatchTouchEvent` ; jamais le glisser HTML5. PDF fabriqué ici par pdf-lib : rien de téléchargé.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/restes-og19-og14-og24-navigateur.mjs [--captures [--dist <dossier>] [--nom avant|apres]]
//   --captures : docs/design/captures/restes-og19-og14-og24/<nom>-{pdf-a4,ilot-deplace}.png (1920 × 1080 à 2x) ;
//   --nom avant (avec --dist, un build de main d'avant OG27) : captures seules, mesures sautées.
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { DIST, Echec, ROOT, clickItem, dropFile, foldOptions, frames, gitSha, item, loadPlaywright, serve } from "./commun.mjs";

const LABEL = "restes OG19 OG14 OG24";
const VIEWS = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 800 },
];
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const SIDE = '[data-island="pages"]';
const mode = (v) => `[data-side-mode] [data-choice="${v}"]`;
const BAR = '#stage [data-scrollbar="page"]';
const GRIP = '.rb-island[data-island="outils"] [data-island-grip]';
const THUMB_IMG = (n) => `${SIDE} [data-page="${n}"] .rb-page-img img`;
const BOTTOM = 16;
const A4 = [595, 842];
const CAPTURES = join(ROOT, "docs", "design", "captures", "restes-og19-og14-og24");
const { PDFDocument, rgb } = createRequire(join(ROOT, "apps", "web", "package.json"))("pdf-lib");
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
const touch = (cdp, type, list) =>
  cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : list.map(([x, y], i) => ({ x: Math.round(x), y: Math.round(y), id: i })) });
async function tap(page, cdp, sel) {
  const [x, y] = centerOf(await box(page, sel));
  await touch(cdp, "touchStart", [[x, y]]);
  await touch(cdp, "touchEnd", []);
  await settle(page);
}
async function fingerDrag(page, cdp, from, to, steps = 10) {
  await touch(cdp, "touchStart", [from]);
  for (let i = 1; i <= steps; i++) await touch(cdp, "touchMove", [[from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps]]);
  await touch(cdp, "touchEnd", []);
  await settle(page, 100);
}

/** PDF d'une page A4 (595 × 842 pt), fabriqué ici. */
async function a4Pdf() {
  const d = await PDFDocument.create();
  d.addPage(A4).drawRectangle({ x: 40, y: 40, width: A4[0] - 80, height: A4[1] - 80, borderWidth: 2, borderColor: rgb(0.15, 0.25, 0.55) });
  return d.save();
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
async function openSide(page, cdp) {
  if ((await page.getAttribute(SIDE, "data-collapsed")) === "1") {
    await tap(page, cdp, `${SIDE} [data-side-tab="pages"]`);
    await page.waitForFunction(() => document.querySelector('[data-island="pages"]')?.getAttribute("data-collapsed") !== "1", null, { timeout: 15000 });
    await settle(page, 300);
  }
}
/** Page au fond PDF A4 montrée, ajustée. */
async function toPdfPage(page) {
  await dropFile(page, "#stage", "a4.pdf", await a4Pdf(), "application/pdf");
  await page.waitForFunction(() => /pdf-page:/.test(document.querySelector("#stage")?.dataset.look ?? ""), null, { timeout: 30000 });
  await page.click(item("fit-page"));
  await settle(page, 200);
}
/** Grille à carreaux (le défilement se voit), segment Portrait au doigt, « Ajuster la page ». */
async function toPortrait(page, cdp) {
  await clickItem(page, "grid");
  await page.waitForSelector("#grille", { state: "visible", timeout: 15000 });
  await page.click('#grille [data-grille="kind"] [data-choice="squares"]');
  await page.click('#grille [data-grille="apply"]');
  await settle(page);
  await openSide(page, cdp);
  await tap(page, cdp, mode("portrait"));
  await page.waitForFunction(() => document.querySelector("#stage")?.getAttribute("data-page-mode") === "portrait", null, { timeout: 15000 });
  await page.click(item("fit-page"));
  await settle(page);
}

/** S1 : page Paysage au fond PDF A4. */
async function pdfScenario(page, cdp) {
  await toPdfPage(page);
  const st = await box(page, "#stage");
  const c = await camera(page);
  check(Math.abs(1920 * c.zoom - st.width * 0.95) < 1.5, `S1 fond PDF A4 : la page remplit la largeur (${(1920 * c.zoom).toFixed(0)} px sur ${st.width.toFixed(0)})`);
  await openSide(page, cdp);
  const shown = await page.getAttribute(`${mode("portrait")}`, "aria-checked");
  check(shown === "true", "S1 : le segment montre Portrait (cadre plus haut que large)");
  check(await page.isVisible(BAR), "S1 : ascenseur visible sur la page au fond PDF A4");
  const b = await box(page, BAR);
  check(Math.abs(b.y - (st.y + c.ty)) < 1.5, `S1 : rail du haut de la page (${b.y.toFixed(0)})`);
  await page.mouse.click(st.x + st.width / 2, st.y + st.height / 2);
  await page.keyboard.press("End");
  await settle(page);
  const e = await camera(page);
  const bottom = st.y + e.ty + ((1920 * A4[1]) / A4[0]) * e.zoom;
  check((await page.getAttribute(BAR, "aria-valuenow")) === "100", "S1 : Fin : bas de la page");
  check(Math.abs(bottom - (st.y + st.height - BOTTOM)) < 2, `S1 : bas du fond PDF à ${BOTTOM} px du bas (${(st.y + st.height - bottom).toFixed(1)})`);
  await page.keyboard.press("Home");
  await settle(page);
  check((await page.getAttribute(BAR, "aria-valuenow")) === "0", "S1 : Début : haut de la page");
}

/** S2 : la barre d'outils descend au doigt, puis revient au clavier (Début de la poignée). */
async function islandScenario(page, cdp) {
  await toPortrait(page, cdp);
  const st = await box(page, "#stage");
  const c0 = await camera(page);
  const b0 = await box(page, BAR);
  const [gx, gy] = centerOf(await box(page, GRIP));
  await fingerDrag(page, cdp, [gx, gy], [gx, gy + 100]);
  const c1 = await camera(page);
  const b1 = await box(page, BAR);
  check(c1.ty - c0.ty > 80, `S2 îlot descendu au doigt : page réajustée plus bas (haut ${c0.ty.toFixed(0)} → ${c1.ty.toFixed(0)})`);
  check(Math.abs(c1.zoom - c0.zoom) < 1e-9, "S2 : zoom gardé (largeur)");
  check(Math.abs(b1.y - (st.y + c1.ty)) < 1.5 && b1.y > b0.y + 80, `S2 : ascenseur recalé au haut de la page (${b0.y.toFixed(0)} → ${b1.y.toFixed(0)})`);
  check((await page.getAttribute(BAR, "aria-valuenow")) === "0", "S2 : ascenseur en haut");
  // Vue défilée : la caméra reste, l'ascenseur relit ses bornes.
  await page.mouse.move(st.x + st.width / 2, st.y + st.height / 2);
  await page.mouse.wheel(0, 200);
  await settle(page, 100);
  const c2 = await camera(page);
  const v2 = Number(await page.getAttribute(BAR, "aria-valuenow"));
  await page.focus(GRIP);
  await page.keyboard.press("Home");
  await settle(page, 100);
  const c3 = await camera(page);
  const b3 = await box(page, BAR);
  const v3 = Number(await page.getAttribute(BAR, "aria-valuenow"));
  check(c3.ty === c2.ty && c3.zoom === c2.zoom, "S2 îlot recentré au clavier, vue défilée : caméra gardée");
  check(Math.abs(b3.y - b0.y) < 1.5, `S2 : rail remonté sous le nouveau haut (${b3.y.toFixed(0)})`);
  check(v3 < v2, `S2 : position relue sur les bornes neuves (${v2} → ${v3} %)`);
}

/** S3 : menu ☰, même annonce que la barre. */
async function menuScenario(page) {
  await page.click('[data-toolbar="menu"] [data-menu-toggle]');
  await page.waitForSelector('[data-toolbar="menu"] [data-menu-list]', { state: "visible", timeout: 15000 });
  const row = await page.getAttribute('[role="menuitem"][data-item="export-pdf"]', "aria-keyshortcuts");
  const shown = await page.textContent('[role="menuitem"][data-item="export-pdf"] [data-shortcut]');
  check(row === "Control+Shift+E" && shown === "Ctrl+Maj+E", `S3 menu : « ${shown} » affiché, « ${row} » annoncé`);
  await page.keyboard.press("Escape");
  await settle(page);
}

/** S4 : miniature portrait plus haute que large ; une page paysage : plus large que haute. */
async function thumbScenario(page, cdp) {
  await openSide(page, cdp);
  await page.waitForSelector(THUMB_IMG(1), { timeout: 15000 });
  await settle(page, 300);
  const t = await box(page, THUMB_IMG(1));
  const frame = await box(page, `${SIDE} [data-page="1"] .rb-page-img`);
  check(t.height > t.width * 1.5, `S4 miniature portrait : ${t.width.toFixed(0)} × ${t.height.toFixed(0)} px, plus haute que large`);
  check(t.width < frame.width / 2 && Math.abs(t.x + t.width / 2 - (frame.x + frame.width / 2)) < 1.5, "S4 : centrée dans sa boîte 16:9, qui garde sa hauteur");
  const grey = await page.$eval(`${SIDE} [data-page="1"] .rb-page-img`, (e) => getComputedStyle(e).backgroundColor);
  check(grey === "rgb(245, 245, 248)", `S4 : boîte grise (${grey}), la page porte son blanc`);
  await tap(page, cdp, mode("landscape"));
  await settle(page, 300);
  const l = await box(page, THUMB_IMG(1));
  check(l.width > l.height * 1.5, `S4 miniature paysage : ${l.width.toFixed(0)} × ${l.height.toFixed(0)} px`);
}

async function scenario(browser, base, viewport) {
  current = `${viewport.width} × ${viewport.height}`;
  {
    const { ctx, page, cdp, errors } = await start(browser, base, viewport);
    await pdfScenario(page, cdp);
    check(errors.length === 0, `S1 : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
    await ctx.close();
  }
  const { ctx, page, cdp, errors } = await start(browser, base, viewport);
  await islandScenario(page, cdp);
  await thumbScenario(page, cdp);
  await menuScenario(page);
  check(errors.length === 0, `aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
}

/** Captures 1920 × 1080 à 2x : page au fond PDF A4 ajustée ; page portrait après la descente de la barre d'outils. */
async function captureSet(browser, base, nom) {
  await mkdir(CAPTURES, { recursive: true });
  const shot = async (page, v) => {
    await settle(page, 300);
    const out = join(CAPTURES, `${nom}-${v}.png`);
    await page.screenshot({ path: out });
    console.log(`capture : ${out}`);
  };
  {
    const { ctx, page, cdp } = await start(browser, base, VIEWS[0], 2);
    await toPdfPage(page);
    await openSide(page, cdp);
    await page.mouse.move(5, 600);
    await shot(page, "pdf-a4");
    await ctx.close();
  }
  const { ctx, page, cdp } = await start(browser, base, VIEWS[0], 2);
  await toPortrait(page, cdp);
  const [gx, gy] = centerOf(await box(page, GRIP));
  await fingerDrag(page, cdp, [gx, gy], [gx, gy + 100]);
  await page.mouse.move(5, 600);
  await page.waitForFunction(() => [...document.querySelectorAll('[role="tooltip"]')].every((t) => t.hidden || t.getClientRects().length === 0), null, { timeout: 15000 }).catch(() => undefined);
  await shot(page, "ilot-deplace");
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
