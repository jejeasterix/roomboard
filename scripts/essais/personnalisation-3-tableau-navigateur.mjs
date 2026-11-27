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
import { DIST, Echec, ROOT, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, serve, solidPng, stageBox, stageMouse } from "./commun.mjs";

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
  await selectAt(tableEdge);
  const [sx0, sy0, sx1, sy1] = await boundsOf();
  check(near(sx1 - sx0, 720) && near(sy1 - sy0, 192), `S4 : la colonne revient à 240 et la ligne à 64 (tableau 720 × 192 ; lu ${sx1 - sx0} × ${sy1 - sy0})`);
  await page.keyboard.press("Escape");
  await fr();

  // S1 au clavier : l'image (libre, au point `outside`) est glissée Alt tenue au-dessus de la case (1, 1) sans s'y loger,
  // Alt+Entrée la loge, Alt+Maj+Entrée la sort.
  await selectAt(outside);
  await page.keyboard.down("Alt");
  await touchDrag(outside, cellPt(1, 1));
  await page.keyboard.up("Alt");
  await fr();
  await page.keyboard.press("Alt+Enter");
  await fr();
  await page.keyboard.press("Escape");
  await fr();
  await selectAt(tableEdge);
  const [kx0, ky0, kx1, ky1] = await boundsOf();
  check(near(kx1 - kx0, 896) && near(ky1 - ky0, 444), `S1 : Alt+Entrée loge l'image (tableau 896 × 444 ; lu ${kx1 - kx0} × ${ky1 - ky0})`);
  await page.keyboard.press("Escape");
  await fr();
  await selectAt(screen(c, origin[0] + COL + 8 + 200, origin[1] + ROW + 8 + 150));
  await page.keyboard.press("Alt+Shift+Enter");
  await fr();
  await page.keyboard.press("Escape");
  await fr();
  await selectAt(tableEdge);
  const [lx0, ly0, lx1, ly1] = await boundsOf();
  check(near(lx1 - lx0, 720) && near(ly1 - ly0, 192), `S1 : Alt+Maj+Entrée sort l'image (tableau 720 × 192 ; lu ${lx1 - lx0} × ${ly1 - ly0})`);
  await page.keyboard.press("Escape");
  await fr();

  // S2 : second tableau 3 × 3 sous le premier ; appui long (doigt) sur sa case (1, 1), menu « Rétrécir » ; une image 400 × 300
  // glissée sur cette case y est réduite à 64 × 48, posée en haut à gauche de la boîte intérieure.
  const DY = 420;
  const cellPt2 = (row, col) => screen(c, origin[0] + COL * col + COL / 2, origin[1] + DY + ROW * row + ROW / 2);
  const longPress = async (p) => {
    const box = await stageBox(page);
    const pt = { x: box.x + p[0], y: box.y + p[1], id: 1, radiusX: 4, radiusY: 4, force: 0.5 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
    // Le doigt reste posé jusqu'à l'ouverture du menu (HOLD_MS), jamais un délai fixe.
    await page.waitForSelector(".rb-cell-menu:not([hidden])", { timeout: 5000 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await fr();
  };
  await page.click(item("table"));
  await fr();
  const t2 = screen(c, origin[0], origin[1] + DY);
  await mouse.click(t2[0], t2[1]);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="3 colonnes, 3 lignes"]');
  await page.keyboard.press("Escape");
  await fr();
  await longPress(cellPt2(1, 1));
  await page.waitForSelector('.rb-cell-menu:not([hidden]) button:has-text("Rétrécir")', { timeout: 5000 });
  const menuBox = await page.locator(".rb-cell-menu button").first().boundingBox();
  check(menuBox !== null && menuBox.height >= 44, `S2 : appui long au doigt : le menu de case propose « Rétrécir » (bouton de ${menuBox?.height} px de haut)`);
  await capture("menu-case");
  await page.click('.rb-cell-menu button:has-text("Rétrécir")');
  await fr();
  await page.click(item("select"));
  await fr();
  await dropFile(page, "#stage", "photo2.png", solidPng(400, 300, [90, 60, 30]), "image/png", imageAt);
  await fr();
  await touchDrag(imageAt, cellPt2(1, 1));
  await selectAt(screen(c, origin[0] + COL + 8 + 32, origin[1] + DY + ROW + 8 + 24));
  const [rx0, ry0, rx1, ry1] = await boundsOf();
  check(near(rx0, origin[0] + 248) && near(ry0, origin[1] + DY + 72) && near(rx1, origin[0] + 312) && near(ry1, origin[1] + DY + 120), `S2 : image réduite à 64 × 48, en haut à gauche de la case (data-bounds ${rx0},${ry0},${rx1},${ry1})`);
  await page.keyboard.press("Escape");
  await fr();
  const tb2 = screen(c, origin[0], origin[1] + DY + ROW / 2);
  await selectAt(tb2);
  const [qx0, qy0, qx1, qy1] = await boundsOf();
  check(near(qx1 - qx0, 720) && near(qy1 - qy0, 192), `S2 : le second tableau reste 720 × 192 (lu ${qx1 - qx0} × ${qy1 - qy0})`);
  await capture("objet-ajuste");
  await page.keyboard.press("Escape");
  await fr();
  // Au clavier : Alt+F en outil Tableau bascule le mode ; le menu le dit (« Agrandir » devient « Rétrécir »).
  await page.click(item("table"));
  await fr();
  await mouse.click(...cellPt2(2, 2));
  await page.keyboard.press("Escape");
  await fr();
  await longPress(cellPt2(2, 2));
  await page.waitForSelector('.rb-cell-menu:not([hidden]) button:has-text("Agrandir")', { timeout: 5000 });
  check((await page.locator(".rb-cell-menu button").first().innerText()).includes("Agrandir"), "S2 : table en mode rétrécir : le menu propose « Agrandir »");
  await page.keyboard.press("Escape");
  await mouse.click(...cellPt2(2, 2));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+f");
  await fr();
  await longPress(cellPt2(2, 2));
  await page.waitForSelector('.rb-cell-menu:not([hidden]) button:has-text("Rétrécir")', { timeout: 5000 });
  check((await page.locator(".rb-cell-menu button").first().innerText()).includes("Rétrécir"), "S2 : Alt+F bascule le mode : le menu propose de nouveau « Rétrécir »");
  await page.keyboard.press("Escape");
  await fr();

  // S3 : un trait au stylo écrit dans la case (1, 0) du premier tableau lui appartient : « + Ligne » le fait descendre de 64,
  // et déplacer le tableau le déplace du même pas.
  await page.click(item("pen"));
  await fr();
  // L'îlot d'options du stylo (80..364 px) recouvre la case (1, 0) : on le replie, comme le ferait la main (sinon le doigt trace sur le panneau).
  await page.click("[data-options-toggle]");
  await fr();
  const s3_strokeA = screen(c, origin[0] + 60, origin[1] + ROW + 26);
  const s3_strokeB = screen(c, origin[0] + 200, origin[1] + ROW + 36);
  await touchDrag(s3_strokeA, s3_strokeB);
  await fr();
  await page.click(item("select"));
  await fr();
  const s3_strokeMid = (dy) => screen(c, origin[0] + 130, origin[1] + ROW + 31 + dy);
  await selectAt(s3_strokeMid(0));
  const s3_sel0 = await attr("data-selection");
  const [, s3_sy0] = await boundsOf();
  check(s3_sel0 === "1", `S3 : le trait est sélectionné (data-selection=${s3_sel0}, y0 ${s3_sy0})`);
  await page.keyboard.press("Escape");
  await page.click(item("table"));
  await fr();
  await mouse.click(...cellPt(0, 0));
  await page.$eval('button[data-table-action="table-row-insert"]', (b) => b.click());
  await fr();
  await page.click(item("select"));
  await fr();
  await selectAt(s3_strokeMid(ROW));
  const [, s3_sy1] = await boundsOf();
  check(near(s3_sy1, s3_sy0 + ROW), `S3 : le mot descend de 64 (y0 ${s3_sy0} puis ${s3_sy1})`);
  await page.keyboard.press("Escape");
  await fr();
  await selectAt(tableEdge);
  const [, s3_ty0] = await boundsOf();
  const s3_moved = [tableEdge[0], tableEdge[1] + 80];
  await touchDrag(tableEdge, s3_moved);
  const [, s3_ty1] = await boundsOf();
  await page.keyboard.press("Escape");
  await fr();
  await selectAt([s3_strokeMid(ROW)[0], s3_strokeMid(ROW)[1] + 80]);
  const [, s3_sy2] = await boundsOf();
  check(near(s3_sy2 - s3_sy1, s3_ty1 - s3_ty0) && s3_ty1 - s3_ty0 > 1, `S3 : le tableau déplacé emporte le trait (tableau ${s3_ty1 - s3_ty0}, trait ${s3_sy2 - s3_sy1})`);
  await capture("trace-dans-case");
  await page.keyboard.press("Escape");
  await fr();

  // S5 : l'image logée de la case (1, 1) du second tableau (photo2, 64 × 48) devient le fond de la case : appui long au doigt,
  // « Mettre en fond » ; Ctrl+Z la rend libre exactement comme avant ; puis Alt+I au clavier.
  const fondBox = [...screen(c, origin[0] + COL + 100, origin[1] + DY + ROW + 10), ...screen(c, origin[0] + 2 * COL - 10, origin[1] + DY + 2 * ROW - 10)];
  const brown = { rgb: [90, 60, 30], tol: 12 };
  const activeCell2 = async () => {
    await page.click(item("table"));
    await fr();
    await mouse.click(...cellPt2(1, 1));
    await page.keyboard.press("Escape");
    await fr();
  };
  const imageBounds = async () => {
    await page.click(item("select"));
    await fr();
    await selectAt(screen(c, origin[0] + COL + 8 + 32, origin[1] + DY + ROW + 8 + 24));
    const b = await boundsOf();
    await page.keyboard.press("Escape");
    await fr();
    return b.join(",");
  };
  const s5_bounds0 = await imageBounds();
  await activeCell2();
  check((await attr("data-table-linked")) === "1" && (await inkIn(page, fondBox, brown)) === 0, 'S5 : avant : une image logée (data-table-linked="1"), aucun pixel de fond dans la case');
  await longPress(cellPt2(1, 1));
  await page.waitForSelector('.rb-cell-menu:not([hidden]) button:has-text("Mettre en fond")', { timeout: 5000 });
  await capture("menu-case-image");
  await page.click('.rb-cell-menu button:has-text("Mettre en fond")');
  await fr();
  const s5_ink = await inkIn(page, fondBox, brown);
  check((await attr("data-table-linked")) === "0" && s5_ink > 1000, `S5 : l'image devient le fond de la case (plus d'objet logé ; ${s5_ink} pixels de sa couleur dans la case)`);
  await capture("image-fond");
  await page.keyboard.press("Control+z");
  await fr();
  await activeCell2();
  check((await attr("data-table-linked")) === "1" && (await inkIn(page, fondBox, brown)) === 0 && (await imageBounds()) === s5_bounds0, `S5 : Ctrl+Z : l'image revient libre de fond, liée, à sa place (${s5_bounds0})`);
  await activeCell2();
  await page.keyboard.press("Alt+i");
  await fr();
  check((await attr("data-table-linked")) === "0" && (await inkIn(page, fondBox, brown)) > 1000, "S5 : Alt+I sur la case active met aussi l'image en fond");
  await page.keyboard.press("Control+z");
  await fr();
  await page.keyboard.press("Escape");
  await fr();

  // D11 : « Sortir » du menu, au doigt, réduit la case comme Alt+Maj+Entrée : une photo 400 × 300 agrandit la colonne de la
  // case (2, 2) du second tableau à 416 ; après « Sortir », la colonne revient à 240 (tableau 720 de large).
  await page.click(item("select"));
  await fr();
  await dropFile(page, "#stage", "photo3.png", solidPng(400, 300, [30, 90, 60]), "image/png", imageAt);
  await fr();
  await touchDrag(imageAt, cellPt2(2, 2));
  await selectAt(tb2);
  const [gx0, , gx1] = await boundsOf();
  check(near(gx1 - gx0, 896), `D11 : la photo agrandit la colonne de la case (2, 2) : tableau de 896 de large (lu ${gx1 - gx0})`);
  await page.keyboard.press("Escape");
  await page.click(item("table"));
  await fr();
  await mouse.click(...cellPt2(2, 2));
  await page.keyboard.press("Escape");
  await fr();
  await longPress(cellPt2(2, 2));
  await page.waitForSelector('.rb-cell-menu:not([hidden]) button:has-text("Sortir")', { timeout: 5000 });
  await page.click('.rb-cell-menu button:has-text("Sortir")');
  await fr();
  await page.click(item("select"));
  await fr();
  await selectAt(tb2);
  const [hx0, , hx1] = await boundsOf();
  check(near(hx1 - hx0, 720), `D11 : « Sortir » du menu : la colonne revient à 240, tableau de 720 de large (lu ${hx1 - hx0})`);
  await page.keyboard.press("Escape");
  await fr();

  // S6 (D13) : tableau 3 × 3 neuf sous les autres ; case (1, 1) active ; poignée droite tirée au doigt de 100 px.
  const DY6 = 660;
  const cell6 = (row, col) => screen(c, origin[0] + COL * col + COL / 2, origin[1] + DY6 + ROW * row + ROW / 2);
  await page.click(item("table"));
  await fr();
  await mouse.click(...screen(c, origin[0], origin[1] + DY6));
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="3 colonnes, 3 lignes"]');
  await page.keyboard.press("Escape");
  await fr();
  await mouse.click(...cell6(1, 1));
  await page.keyboard.press("Escape");
  await fr();
  const grip = screen(c, origin[0] + 2 * COL, origin[1] + DY6 + ROW * 1.5);
  await touchDrag(grip, [grip[0] + 100 * c.zoom, grip[1]]);
  await capture("bordure-tiree");
  await page.click(item("select"));
  await fr();
  await selectAt(screen(c, origin[0], origin[1] + DY6 + ROW / 2));
  const [ax0, , ax1] = await boundsOf();
  check(near(ax1 - ax0, 820), `S6 : la colonne s'élargit de 100 (tableau ${ax1 - ax0} de large, attendu 820)`);
  await page.keyboard.press("Control+z");
  await fr();
  await selectAt(screen(c, origin[0], origin[1] + DY6 + ROW / 2));
  const [bx0, , bx1] = await boundsOf();
  check(near(bx1 - bx0, 720), `S6 : Ctrl+Z rend 720 en une étape (lu ${bx1 - bx0})`);
  await page.keyboard.press("Escape");
  await page.click(item("table"));
  await fr();
  await mouse.click(...cell6(1, 1));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+Shift+ArrowRight");
  await fr();
  await page.click(item("select"));
  await fr();
  await selectAt(screen(c, origin[0], origin[1] + DY6 + ROW / 2));
  const [k6x0, , k6x1] = await boundsOf();
  check(near(k6x1 - k6x0, 728), `S6 : Alt+Maj+→ élargit de 8 (lu ${k6x1 - k6x0})`);
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
