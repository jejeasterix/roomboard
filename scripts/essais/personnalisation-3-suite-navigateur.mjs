#!/usr/bin/env node
// Essai personnalisation-3 suite (OG32) au navigateur : lot B (S7 ajuster, S8 alignement, S9 bordures, S10 bouton
// En-tête enfoncé, S11 déplacer une ligne) ; le lot C (T14) ajoute S12, S13, S14. Application construite (apps/web/dist),
// CSP de la coque, Chromium headless de Playwright, vrai toucher (CDP), heure figée. Oracles : #stage[data-…], lus avant
// toute capture. Tableaux posés à droite de l'îlot d'options. Lancé par scripts/verifier.sh --e2e. Sortie : 0 réussi,
// 1 échec, 2 outil absent. Usage : node scripts/essais/personnalisation-3-suite-navigateur.mjs [--captures]
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DIST, Echec, ROOT, VIEWPORT, coqueCsp, frames, gitSha, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "personnalisation-3 suite";
const FIXED = new Date("2026-11-28T08:00:00.000Z");
// À droite de l'îlot d'options (x ≥ 440 px), sous la rangée contextuelle de l'îlot d'outils.
const CLICK = [440, 230];
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
  const cdp = await page.context().newCDPSession(page);
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
  /** Un appui du doigt (touchStart puis touchEnd) en `p` (px de la scène). */
  const touchTap = async (p) => {
    const box = await stageBox(page);
    const pt = { x: box.x + p[0], y: box.y + p[1], id: 1, radiusX: 4, radiusY: 4, force: 0.5 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  /** Appui du doigt sur un contrôle de la page, après avoir mesuré sa cible : au moins 44 px dans les deux sens (G8). */
  const tapBig = async (sel, what) => {
    const loc = typeof sel === "string" ? page.locator(sel) : sel;
    const b = await loc.boundingBox();
    if (!b || b.width < 44 - 0.5 || b.height < 44 - 0.5) throw new Echec(`${what} : cible de ${b ? `${b.width} × ${b.height}` : "introuvable"}, moins de 44 px`);
    await loc.tap();
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
  /** Tableau cols × rows posé à (origin.x + dx, origin.y + dy) monde ; outil Tableau actif, aucune saisie ouverte. */
  const newTable = async (dx, dy, cols, rows) => {
    await page.click(item("table"));
    await fr();
    await mouse.click(...screen(c, origin[0] + dx, origin[1] + dy));
    await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
    await page.click(`button[aria-label="${cols} colonnes, ${rows} lignes"]`);
    await page.keyboard.press("Escape");
    await fr();
    return (row, col) => screen(c, origin[0] + dx + COL * col + COL / 2, origin[1] + dy + ROW * row + ROW / 2);
  };
  /** Écrit `text` dans la case (clic, frappe, Échap) ; la case reste active. */
  const typeIn = async (pt, text) => {
    await mouse.click(...pt);
    await page.keyboard.type(text);
    await page.keyboard.press("Escape");
    await fr();
  };
  /** Largeur du tableau posé en (dx, dy) : Sélection sur son bord gauche, data-bounds, puis retour à l'outil Tableau. */
  const widthOf = async (dx, dy) => {
    await page.click(item("select"));
    await fr();
    await mouse.click(...screen(c, origin[0] + dx, origin[1] + dy + ROW / 2));
    await fr();
    const [x0, , x1] = await boundsOf();
    await page.keyboard.press("Escape");
    await page.click(item("table"));
    await fr();
    return x1 - x0;
  };

  // S7 (D14, DS7) : 3 × 3, « Eau » en (0, 0) ; double appui sur la poignée droite de la case.
  const c7 = await newTable(0, 0, 3, 3);
  await typeIn(c7(0, 0), "Eau");
  await capture("ajuste-avant");
  const g7 = screen(c, origin[0] + COL, origin[1] + ROW / 2);
  await touchTap(g7);
  await touchTap(g7);
  await fr();
  await capture("ajuste-apres");
  const w7 = await widthOf(0, 0);
  // DS7 : colonne = largeur naturelle (le mot + 2 marges de 8) ; mot mesuré dans la page à la police du rendu (`textFont`).
  const mot7 = await page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = '36px "Atkinson Hyperlegible", system-ui, sans-serif';
    return ctx.measureText("Eau").width;
  });
  const attendu7 = 720 - COL + mot7 + 16;
  check(Math.abs(w7 - attendu7) <= 1, `S7 : double appui : la colonne prend la largeur du mot (tableau ${w7}, attendu ${attendu7.toFixed(1)} = 720 − 240 + ${mot7.toFixed(1)} + 16)`);
  await page.keyboard.press("Control+z");
  await fr();
  const w7u = await widthOf(0, 0);
  check(Math.abs(w7u - 720) <= 0.5, `S7 : Ctrl+Z rend 720 en une étape (lu ${w7u})`);
  await mouse.click(...c7(0, 0));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+KeyA");
  await fr();
  const w7a = await widthOf(0, 0);
  check(Math.abs(w7a - w7) <= 0.5, `S7 : Alt+A donne la même largeur (${w7a})`);

  // S8 (D15, DS6) : plage (0, 0)-(0, 1), « Lundi », « Mardi » ; panneau « Centré », « Au milieu » ; clavier ensuite.
  const c8 = await newTable(0, 260, 3, 3);
  await typeIn(c8(0, 0), "Lundi");
  await typeIn(c8(0, 1), "Mardi");
  await mouse.click(...c8(0, 0));
  await page.keyboard.press("Escape");
  await page.keyboard.down("Shift");
  await mouse.click(...c8(0, 1));
  await page.keyboard.up("Shift");
  await fr();
  check((await attr("data-table")) === "3x3@0,0-0,1", `S8 : plage de deux cases (data-table=${await attr("data-table")})`);
  await capture("alignement-avant");
  await tapBig('[data-option="tableAlign"] [data-option-value="center"]', "S8 bouton Centré");
  await tapBig('[data-option="tableAlign"] [data-option-value="middle"]', "S8 bouton Au milieu");
  await fr();
  check((await attr("data-table-align")) === "center,middle", `S8 : panneau : texte centré au milieu (data-table-align=${await attr("data-table-align")})`);
  await capture("alignement-apres");
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await fr();
  check((await attr("data-table-align")) === "left,top", "S8 : deux Ctrl+Z, deux étapes : left,top");
  await page.keyboard.press("Alt+Shift+KeyC");
  await page.keyboard.press("Alt+Shift+KeyM");
  await fr();
  check((await attr("data-table-align")) === "center,middle", "S8 : Alt+Maj+C puis Alt+Maj+M : center,middle");

  // S9 (D16, DS4) : plage 2 × 2 ; 2e pastille, « Épais », « Tirets » ; Alt+Maj+B sur (1, 1).
  const c9 = await newTable(0, 520, 3, 3);
  await mouse.click(...c9(0, 0));
  await page.keyboard.press("Escape");
  await page.keyboard.down("Shift");
  await mouse.click(...c9(1, 1));
  await page.keyboard.up("Shift");
  await fr();
  await capture("bordures-avant");
  const sw = page.locator('[data-option="tableBorder"] [data-table-border-color]').nth(1);
  const colour = await sw.getAttribute("data-table-border-color");
  await tapBig(sw, "S9 pastille de couleur");
  await tapBig('[data-option="tableBorder"] [data-option-value="8"]', "S9 bouton Épais");
  await tapBig('[data-option="tableBorder"] [data-option-value="dashed"]', "S9 bouton Tirets");
  await fr();
  check((await attr("data-table-border")) === `${colour},8,dashed`, `S9 : bordure ${colour}, 8, tirets sur la plage (data-table-border=${await attr("data-table-border")})`);
  await capture("bordures-apres");
  await mouse.click(...c9(1, 1));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+Shift+KeyB");
  await fr();
  check(((await attr("data-table-border")) ?? "").endsWith(",none"), "S9 : Alt+Maj+B : aucune bordure sur (1, 1)");

  // S10 (mineurs PR 74) : bouton « En-tête » enfoncé, relâché par Ctrl+Z.
  const head = page.locator('[data-table-action="table-header"]');
  check((await head.getAttribute("aria-pressed")) === "false", "S10 : bouton En-tête relâché au départ");
  await tapBig(head, "S10 bouton En-tête");
  check((await head.getAttribute("aria-pressed")) === "true", "S10 : bouton En-tête enfoncé après l'appui");
  await page.keyboard.press("Control+z");
  await fr();
  check((await head.getAttribute("aria-pressed")) === "false", "S10 : Ctrl+Z le relâche");

  // S11 (D18, DS8) : 3 × 3 à droite, « a », « b », « c » ; poignée de la ligne 2 tirée au doigt sur la ligne 0.
  // Sous les trois tableaux précédents (zoom 0,63 : 780 px à droite sortiraient de la page à 1280 px).
  const RX = 0;
  await page.click(item("select"));
  await page.keyboard.press("Escape");
  await fr();
  const c11 = await newTable(RX, 740, 3, 3);
  await typeIn(c11(0, 0), "a");
  await typeIn(c11(1, 0), "b");
  await typeIn(c11(2, 0), "c");
  await capture("ligne-avant");
  const grip11 = (row) => { const p = screen(c, origin[0] + RX, origin[1] + 740 + ROW * row + ROW / 2); return [p[0] - 22, p[1]]; };
  await touchDrag(grip11(2), grip11(0));
  check((await attr("data-table-column")) === "c|a|b", `S11 : ligne 2 tirée au-dessus de la ligne 0 (data-table-column=${await attr("data-table-column")})`);
  await capture("ligne-apres");
  await page.keyboard.press("Control+z");
  await fr();
  check((await attr("data-table-column")) === "a|b|c", "S11 : Ctrl+Z, une étape : a|b|c");
  await page.keyboard.press("Control+Shift+ArrowUp");
  await fr();
  check((await attr("data-table-column")) === "a|c|b", "S11 : Ctrl+Maj+↑ : a|c|b");
  await mouse.click(...c11(0, 1));
  await page.keyboard.press("Escape");
  await page.keyboard.down("Shift");
  await mouse.click(...c11(1, 1));
  await page.keyboard.up("Shift");
  await page.click('[data-table-action="table-merge"]');
  await mouse.click(...c11(2, 0));
  await page.keyboard.press("Escape");
  await fr();
  await touchDrag(grip11(2), grip11(1));
  await page.waitForSelector('.rb-toast:has-text("Une cellule fusionnée empêche ce déplacement.")', { timeout: 5000 });
  check((await attr("data-table-column")) === "a|c|b", `S11 : zone coupée : refus, message, ordre inchangé a|c|b (lu ${await attr("data-table-column")})`);

  // Lot C (T14) : S12, S13, S14 ici.

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
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: captures ? 2 : 1, hasTouch: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures });
    if (external.length > 0) throw new Echec(`requêtes hors de 127.0.0.1 : ${external.join(", ")}`);
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
