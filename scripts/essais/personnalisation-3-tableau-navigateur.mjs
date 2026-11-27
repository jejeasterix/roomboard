#!/usr/bin/env node
// Essai personnalisation-3 « objets dans les cases du tableau » au navigateur (lot A : S1, S4 ; T6 à T9 ajoutent S2, S3, S5).
// Application construite (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless de Playwright, vrai
// toucher (CDP Input.dispatchTouchEvent), mode repli, heure figée. Oracles : #stage[data-bounds|data-selection|data-table].
// Lancé par scripts/verifier.sh --e2e, sans option de capture. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/personnalisation-3-tableau-navigateur.mjs [--captures]
//   (--captures : échelle 2, docs/design/captures/personnalisation-3-tableau/*.png).
import { existsSync, mkdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, VIEWPORT, coqueCsp, dropFile, frames, gitSha, item, loadPlaywright, serve, solidPng, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "personnalisation-3 tableau";
const FIXED = new Date("2026-11-27T08:00:00.000Z");
// Même point que C10b : sous la rangée contextuelle de l'îlot d'outils à 1280 px.
const CLICK = [200, 230];
const COL = 240;
const ROW = 64;
const CAPTURES = join(ROOT, "docs", "design", "captures", "personnalisation-3-tableau");

async function scenario(page, url, { captures }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const screen = (c, wx, wy) => [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  const boundsOf = async () => ((await attr("data-bounds")) ?? "").split(",").map(Number);
  const near = (a, b) => Math.abs(a - b) <= 0.5;
  const cdp = await page.context().newCDPSession(page);
  /** Vrai toucher (G8) : un doigt posé en `a`, glissé en `steps` pas, levé en `b` (px de la scène). */
  const touchDrag = async (a, b, steps = 8) => {
    const box = await stageBox(page);
    const pt = (p) => ({ x: box.x + p[0], y: box.y + p[1], id: 1, radiusX: 4, radiusY: 4, force: 0.5 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(a)] });
    for (let i = 1; i <= steps; i++) {
      const p = [a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(p)] });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await fr();
  };
  const selectAt = async (p) => {
    await mouse.click(p[0], p[1]);
    await fr();
  };
  const capture = async (nom) => {
    if (!captures) return;
    mkdirSync(CAPTURES, { recursive: true });
    const path = join(CAPTURES, `${nom}.png`);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  const c = await camera();
  const origin = [(CLICK[0] - c.tx) / c.zoom, (CLICK[1] - c.ty) / c.zoom];
  // Le contour du tableau est ce que touche la Sélection (hitTest) : un point sur son bord gauche, au milieu de la ligne 0.
  const tableEdge = screen(c, origin[0], origin[1] + ROW / 2);
  const cellPt = (row, col, w = COL, h = ROW) => screen(c, origin[0] + w * col + w / 2, origin[1] + h * row + h / 2);

  // Tableau 3 × 3 au point CLICK (gabarit C10b), puis image 400 × 300 hors du tableau.
  await page.click(item("table"));
  await fr();
  await mouse.click(CLICK[0], CLICK[1]);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="3 colonnes, 3 lignes"]');
  await page.keyboard.press("Escape");
  await fr();
  const imageAt = screen(c, origin[0] + 3 * COL + 400, origin[1] + 3 * ROW + 300);
  await dropFile(page, "#stage", "photo.png", solidPng(400, 300, [30, 60, 90]), "image/png", imageAt);
  await fr();
  await page.click(item("select"));
  await fr();
  await capture("photo-case-avant");

  // S1 : glisser l'image au doigt sur la case (1, 1) : colonne 416, ligne 316, image dans la boîte intérieure.
  await touchDrag(imageAt, cellPt(1, 1));
  await selectAt(screen(c, origin[0] + COL + 8 + 200, origin[1] + ROW + 8 + 150));
  const [ix0, iy0, ix1, iy1] = await boundsOf();
  check(near(ix0, origin[0] + 248) && near(iy0, origin[1] + 72) && near(ix1, origin[0] + 648) && near(iy1, origin[1] + 372), `S1 : l'image remplit la boîte intérieure de la case (1, 1) (data-bounds ${ix0},${iy0},${ix1},${iy1})`);
  await page.keyboard.press("Escape");
  await fr();
  await selectAt(tableEdge);
  const [tx0, ty0, tx1, ty1] = await boundsOf();
  check(near(tx1 - tx0, 896) && near(ty1 - ty0, 444), `S1 : le tableau fait 896 × 444 (colonne 1 à 416, ligne 1 à 316 ; lu ${tx1 - tx0} × ${ty1 - ty0})`);
  check((await attr("data-selection")) === "2", 'S1 : sélectionner le tableau prend son image logée (data-selection="2")');
  await page.click(item("table"));
  await mouse.click(...cellPt(0, 0));
  await page.keyboard.press("Escape");
  await fr();
  check((await attr("data-table-linked")) === "1", 'S1 : outil Tableau : data-table-linked="1"');
  await page.click(item("select"));
  await fr();
  await selectAt(tableEdge);
  await capture("photo-case-agrandie");
  await page.keyboard.press("Control+z");
  await fr();
  await page.keyboard.press("Escape");
  await fr();
  await selectAt(tableEdge);
  const [ux0, uy0, ux1, uy1] = await boundsOf();
  check(near(ux1 - ux0, 720) && near(uy1 - uy0, 192) && (await attr("data-selection")) === "1", `S1 : Ctrl+Z : tout revient en une fois (720 × 192, image libre ; lu ${ux1 - ux0} × ${uy1 - uy0}, sélection ${await attr("data-selection")})`);
  await page.keyboard.press("Control+y");
  await fr();
  await page.keyboard.press("Escape");
  await fr();

  // S4 : glisser l'image hors du tableau au doigt : elle est libre.
  const inCell = screen(c, origin[0] + COL + 8 + 200, origin[1] + ROW + 8 + 150);
  const outside = screen(c, origin[0] + 3 * COL + 700, origin[1] + 600);
  await touchDrag(inCell, outside);
  await selectAt(tableEdge);
  check((await attr("data-selection")) === "1", 'S4 : l\'image sortie est libre : sélectionner le tableau ne la prend plus (data-selection="1")');
  await page.keyboard.press("Escape");
  await fr();

  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const captures = process.argv.includes("--captures");
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-p3-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: captures ? 2 : 1, hasTouch: true, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures, tmp });
    if (external.length > 0) throw new Echec(`requêtes hors de 127.0.0.1 : ${external.join(", ")}`);
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
