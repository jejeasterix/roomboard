#!/usr/bin/env node
// Essai OG33 (personnalisation-2-outils, lot 2b) au navigateur : M1 (rangée « Formes », lettre dans l'infobulle), puis
// M2 à M4 au fil des tâches suivantes. Au doigt d'abord (événements du protocole, pointerType « touch »). L'état du
// document est lu dans le fichier enregistré (Ctrl+S) par `roomboard state`. Chromium de Playwright, --disable-lcd-text,
// --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e.
// Usage : node scripts/essais/outils-excalidraw-2b-navigateur.mjs [--only m1|m2|m3|m4] [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/design/captures/personnalisation-2-outils/<nom>-*.png à 2x (« avant » : base du morceau ; « apres »).
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DIST, Echec, frames, gitSha, item, loadPlaywright, ROOT, serve, stageBox, VIEWPORT } from "./commun.mjs";
import { attr, BIN, newPage, saved, tapAt, tapStage, touchDrag, touchDragWithLateFinger, useTool, waitAttr } from "./gestes.mjs";
import { fringes, pixelsOf } from "./nettete.mjs";

const LABEL = "outils-excalidraw-2b";
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const OUT = join(ROOT, "docs", "design", "captures", "personnalisation-2-outils");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};
/** Ligne de lecture imprimée (preuve) : `Lire : <clé>=<valeur>`. */
const lire = (key, value) => console.log(`Lire : ${key}=${value}`);

// ------------------------------------------------------------------------------------------------------------- aides

/** Outil par la barre : au doigt, un tap sur le bouton, après une pause (un tap qui suit un tracé du protocole est perdu). */
async function tool(page, id) {
  await page.waitForTimeout(600);
  await useTool(page, "doigt", id);
  await waitAttr(page, "data-tool", id);
}
const rgbOf = (s) => (s.match(/\d+/g) ?? [0, 0, 0]).slice(0, 3).map(Number);
async function colorsOf(page, sel) {
  return page.evaluate((q) => {
    const b = document.querySelector(q);
    const svg = b.querySelector("svg") ?? b;
    return { bg: getComputedStyle(b).backgroundColor, ink: getComputedStyle(svg).color };
  }, sel);
}
async function shoot(page, nom, clip) {
  mkdirSync(OUT, { recursive: true });
  await frames(page);
  await page.screenshot({ path: join(OUT, `${nom}.png`), clip, animations: "disabled", caret: "hide", scale: "device" });
  console.log(`capture : ${join(OUT, `${nom}.png`)}`);
}
const loin = (page) => page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);

// ------------------------------------------------------------------------------------------------------------- M1

/** M1 (S10) : Losange par la rangée « Formes » au doigt ; lettre dans l'infobulle ; barre inchangée. */
async function m1(browser, base, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base, { scale: 2 });
  // `.rb-context` est en `position: absolute` (rb.css:143) : la hauteur de la barre ne bouge jamais ; on lit sa place
  // (y, largeur) avant et après, et le bord droit de l'îlot contextuel (dans la fenêtre de 1280 px).
  const bar = async () => {
    const b = await page.locator('[data-toolbar="outils"]').first().boundingBox();
    return `${Math.round(b.y)}:${Math.round(b.width)}`;
  };
  const h0 = await bar();
  await tool(page, "rect");
  const row = await page.$$eval("[data-shape-choice]", (bs) => bs.map((b) => b.getAttribute("data-shape-choice")).join(","));
  lire("M1.row", row);
  check(row === "rect,diamond,ellipse", "M1 : Rectangle touché : la rangée Formes montre les trois formes");
  const bb = await page.locator("[data-shape-choice='diamond']").boundingBox();
  lire("M1.cible", `${Math.round(bb.width)}x${Math.round(bb.height)}`);
  check(bb.width >= 43.5 && bb.height >= 43.5, "M1 : cible Losange ≥ 44 px");
  const h1 = await bar();
  lire("M1.barre", `${h0}/${h1}`);
  check(h0 === h1, "M1 : la barre d'outils garde sa place et sa largeur (même rangée à 1280 px)");
  const isle = await page.locator('[data-toolbar="outils"] [data-island-context]').first().boundingBox();
  lire("M1.ilot", Math.round(isle.x + isle.width));
  check(isle.x + isle.width <= VIEWPORT.width, "M1 : l'îlot de la rangée Formes tient dans la fenêtre de 1280 px");
  await tapAt(page, bb.x + bb.width / 2, bb.y + bb.height / 2);
  await waitAttr(page, "data-tool", "diamond");
  lire("M1.tool", "diamond");
  await touchDrag(page, cdp, [500, 300], [620, 400]);
  const s = await saved(page, tmp, "m1.roomboard");
  const n = s.elements.filter((e) => e.shape?.shape === "diamond").length;
  lire("M1.diamond", n);
  check(n === 1, "M1 : un losange posé au doigt depuis la rangée");
  // Netteté de l'icône de la rangée (§ 10), même mesure que `cibles2a` d'outils-excalidraw-navigateur.mjs.
  const sel = "[data-shape-choice='diamond']";
  await loin(page);
  await frames(page);
  const box = await page.locator(`${sel} svg.rb-icon`).first().boundingBox();
  const px = await pixelsOf(page, box);
  const { ink } = await colorsOf(page, sel);
  const f = fringes(px, [px.data[0], px.data[1], px.data[2]], rgbOf(ink));
  lire("M1.nettete", f);
  check(f === 0, "M1 : icône Losange nette (§ 10), 0 frange colorée");
  await page.hover(item("rect"));
  const tip = page.locator('[role="tooltip"]');
  await tip.waitFor({ state: "visible", timeout: 5000 });
  const keys = await tip.getAttribute("data-keys");
  lire("M1.tip", keys);
  check(keys === "R ou 2", "M1 : infobulle de Rectangle : « R ou 2 »");
  check(errors.length === 0, "M1 : aucune erreur dans la page");
  await ctx.close();
}

/** Captures M1 à 2x : Rectangle actif ; « apres » : rangée, Losange enfoncé, puis infobulle de Rectangle. */
async function capturesM1(browser, base, nom) {
  const CLIP = { x: 0, y: 0, width: 1280, height: 200 };
  const { ctx, page } = await newPage(browser, base, { scale: 2 });
  await tool(page, "rect");
  if (nom === "apres") {
    const bb = await page.locator("[data-shape-choice='diamond']").boundingBox();
    await tapAt(page, bb.x + bb.width / 2, bb.y + bb.height / 2);
    await waitAttr(page, "data-tool", "diamond");
  }
  await loin(page);
  await shoot(page, `${nom}-formes`, CLIP);
  if (nom === "apres") {
    await page.hover(item("rect"));
    await page.locator('[role="tooltip"]').waitFor({ state: "visible", timeout: 5000 });
    await shoot(page, "apres-formes-infobulle", CLIP);
  }
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------------------- M2

// Poignée de rotation (B4, `rotateHandlePoint`) : 26 px écran en diagonale sous le coin bas droit du cadre (`doc.bounds`,
// épaisseur du trait comprise : demi-épaisseur 2 au trait par défaut) ; au zoom 1 de l'essai, px de la scène = px écran.
// Le pivot suit la boîte d'accroche (`snap_box`, sans l'épaisseur), pas `doc.bounds` : le centre du rectangle dessiné.
const HALF_STROKE = 2;
const GAP = 26;
const handleOf = ([x0, y0], [x1, y1]) => [Math.max(x0, x1) + HALF_STROKE + GAP, Math.max(y0, y1) + HALF_STROKE + GAP];
const centerOf = ([x0, y0], [x1, y1]) => [(x0 + x1) / 2, (y0 + y1) / 2];
/** Point `p` tourné de `deg` degrés (sens horaire à l'écran) autour de `c`. */
const turned = (c, p, deg) => {
  const a = (deg * Math.PI) / 180;
  const [dx, dy] = [p[0] - c[0], p[1] - c[1]];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};
/** Angle (degrés, ]-180, 180]) de la partie linéaire de la matrice d'un élément enregistré. */
const angleOf = (el) => (Math.atan2(el.transform[1], el.transform[0]) * 180) / Math.PI;
/** Glissé à la souris, modificateurs tenus (recopié de outils-excalidraw-navigateur.mjs). */
async function mouseDrag(page, from, to, { mods = [], steps = 8 } = {}) {
  const b = await stageBox(page);
  for (const m of mods) await page.keyboard.down(m);
  await page.mouse.move(b.x + from[0], b.y + from[1]);
  await page.mouse.down();
  await page.mouse.move(b.x + (from[0] + to[0]) / 2, b.y + (from[1] + to[1]) / 2, { steps: Math.ceil(steps / 2) });
  await page.mouse.move(b.x + to[0], b.y + to[1], { steps: Math.ceil(steps / 2) });
  await page.mouse.up();
  for (const m of mods.slice().reverse()) await page.keyboard.up(m);
  await frames(page);
}
/** Rectangle au doigt de a à b, puis Sélection et toucher au centre : le rectangle est choisi. */
async function pickRect(page, cdp, a, b) {
  await tool(page, "rect");
  await touchDrag(page, cdp, a, b);
  await tool(page, "select");
  const c = centerOf(a, b);
  await tapStage(page, c[0], c[1]);
  await waitAttr(page, "data-selection", "1");
}
/** Rectangles enregistrés, dans l'ordre de pose. */
const rectsOf = async (page, tmp, name) => (await saved(page, tmp, name)).elements.filter((e) => e.shape?.shape === "rect");

/** M2 (S11) : rotation par la poignée au doigt (sans Maj, second doigt tardif), à la souris + Maj, Alt+T au clavier. */
async function m2(browser, base, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base, { scale: 2 });
  // 1. Au doigt, sans Maj : 30°.
  const A = [[500, 250], [620, 350]];
  await pickRect(page, cdp, ...A);
  const hA = handleOf(...A);
  const cA = centerOf(...A);
  await touchDrag(page, cdp, hA, turned(cA, hA, 30));
  let r = await rectsOf(page, tmp, "m2a.roomboard");
  const a30 = angleOf(r[0]);
  lire("M2.angle", Math.round(a30));
  check(Math.abs(a30 - 30) <= 1, "M2 : poignée tirée de 30° au doigt : le rectangle tourne de 30° (±1)");
  // Cadre d'un objet tourné : sans poignée de taille, le coin de la boîte englobante est hors de la forme (rien de pris).
  // 2. Second doigt tardif (= Maj) : 37° demandés, 30° obtenus (multiple de 15).
  const B = [[700, 250], [820, 350]];
  await pickRect(page, cdp, ...B);
  const hB = handleOf(...B);
  await touchDragWithLateFinger(page, cdp, hB, turned(centerOf(...B), hB, 37), [1000, 700]);
  r = await rectsOf(page, tmp, "m2b.roomboard");
  const aB = angleOf(r[1]);
  const pas = ((Math.round(aB * 1000) / 1000) % 15 + 15) % 15;
  lire("M2.pas", Math.min(pas, 15 - pas) < 0.01 ? 0 : pas.toFixed(2));
  check(Math.min(pas, 15 - pas) < 0.01 && Math.abs(aB) > 1, `M2 : second doigt tardif posé : l'angle est un multiple de 15 (${aB.toFixed(2)}°)`);
  // 3. Souris + Maj : 50° demandés, 45° obtenus.
  const C = [[400, 550], [520, 650]];
  await tool(page, "rect");
  await touchDrag(page, cdp, C[0], C[1]);
  await tool(page, "select");
  const sb = await stageBox(page);
  await page.mouse.click(sb.x + 460, sb.y + 600);
  await waitAttr(page, "data-selection", "1");
  const hC = handleOf(...C);
  await mouseDrag(page, hC, turned(centerOf(...C), hC, 50), { mods: ["Shift"] });
  r = await rectsOf(page, tmp, "m2c.roomboard");
  const aC = angleOf(r[2]);
  lire("M2.souris", Math.round(aC));
  check(Math.abs(aC - 45) <= 0.5, "M2 : souris et Maj tenue : 50° demandés, 45° posés");
  // 4. Clavier : Alt+T tourne de 15° (rectangle neuf), Ctrl+Z revient.
  const D = [[900, 550], [1020, 650]];
  await pickRect(page, cdp, ...D);
  await page.keyboard.press("Alt+KeyT");
  await frames(page);
  r = await rectsOf(page, tmp, "m2d.roomboard");
  const aD = angleOf(r[3]);
  lire("M2.clavier", Math.round(aD));
  check(Math.abs(aD - 15) <= 0.5, "M2 : Alt+T tourne la sélection de 15°");
  await page.keyboard.press("Control+z");
  await frames(page);
  r = await rectsOf(page, tmp, "m2e.roomboard");
  const aU = angleOf(r[3]);
  lire("M2.undo", Math.round(aU));
  check(Math.abs(aU) <= 0.5, "M2 : Ctrl+Z défait la rotation : l'angle d'avant");
  // 5. Cible : à 20 px du centre de la poignée la rotation est prise (portée 22 px), à 26 px non.
  const E = [[950, 300], [1070, 380]];
  await pickRect(page, cdp, ...E);
  const hE = handleOf(...E);
  const cE = centerOf(...E);
  await touchDrag(page, cdp, [hE[0] + 26, hE[1]], turned(cE, [hE[0] + 26, hE[1]], 30));
  r = await rectsOf(page, tmp, "m2f.roomboard");
  const aMiss = angleOf(r[4]);
  check(Math.abs(aMiss) <= 0.5, "M2 : un appui à 26 px du centre de la poignée ne tourne rien");
  await tapStage(page, ...cE);
  await waitAttr(page, "data-selection", "1");
  await touchDrag(page, cdp, [hE[0] + 20, hE[1]], turned(cE, [hE[0] + 20, hE[1]], 30));
  r = await rectsOf(page, tmp, "m2g.roomboard");
  const aHit = angleOf(r[4]);
  check(Math.abs(aHit - 30) <= 1, "M2 : un appui à 20 px du centre de la poignée tourne de 30°");
  lire("M2.cible", 44);
  // 6. Coin de la boîte englobante du rectangle tourné de 30° : hors de la forme, rien n'est pris.
  await tool(page, "select");
  await tapStage(page, cA[0], cA[1]);
  await waitAttr(page, "data-selection", "1");
  const cx = cA[0] + 60 * Math.cos(Math.PI / 6) + 50 * Math.sin(Math.PI / 6) - 3;
  const cy = cA[1] + 60 * Math.sin(Math.PI / 6) + 50 * Math.cos(Math.PI / 6) - 3;
  await tapStage(page, cx, cy);
  const sel = await attr(page, "data-selection");
  lire("M2.coin", sel === "1" ? "pris" : "none");
  check(sel !== "1", "M2 : le coin de la boîte englobante, hors de la forme tournée, ne prend rien");
  check(errors.length === 0, "M2 : aucune erreur dans la page");
  await ctx.close();
}

/** Captures M2 à 2x : rectangle choisi ; « apres » : aussi tourné de 30° au doigt. */
async function capturesM2(browser, base, nom) {
  const { ctx, page, cdp } = await newPage(browser, base, { scale: 2 });
  const A = [[500, 250], [620, 350]];
  await pickRect(page, cdp, ...A);
  if (nom === "apres") {
    const h = handleOf(...A);
    await touchDrag(page, cdp, h, turned(centerOf(...A), h, 30));
  }
  await loin(page);
  const b = await stageBox(page);
  await shoot(page, `${nom}-rotation`, { x: b.x + 400, y: b.y + 150, width: 640, height: 330 });
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------------------- main

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const wantCaptures = process.argv.includes("--captures");
  if (nom === "avant" && !wantCaptures) {
    console.error(`${LABEL} : usage — --nom avant n'a de sens qu'avec --captures`);
    return 2;
  }
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist}/index.html absent : construire d'abord l'application (scripts/verifier.sh)`);
    return 1;
  }
  if (!existsSync(BIN)) {
    console.error(`${LABEL} : ÉCHEC — ${BIN} absent : construire la CLI (pnpm --filter @roomboard/cli build)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ dist });
  const base = `http://127.0.0.1:${server.address().port}`;
  const tmp = mkdtempSync(join(tmpdir(), "og33-essai-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (wantCaptures) {
      const only = arg("--only");
      if (only === undefined || only === "m1") await capturesM1(browser, base, nom);
      if (only === undefined || only === "m2") await capturesM2(browser, base, nom);
      return 0;
    }
    const only = arg("--only");
    const on = (n) => only === undefined || only === n;
    if (on("m1")) await m1(browser, base, tmp);
    if (on("m2")) await m2(browser, base, tmp);
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
