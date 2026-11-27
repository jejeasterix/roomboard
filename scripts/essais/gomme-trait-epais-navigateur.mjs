#!/usr/bin/env node
// OG20 : la gomme partielle laisse un trou visible du diamètre de la gomme, même sur un trait épais et appuyé.
// Application construite servie en local, Chromium sans tête de Playwright, `deviceScaleFactor` 2. Le préréglage
// « Noir » passe à l'épaisseur 60 par l'éditeur de profil ; quatre traits horizontaux (stylet à pression 1, stylet à
// pression 0,2, souris, doigt), puis un seul passage de gomme vertical, à la souris, en travers des quatre. Sur l'axe de
// chaque trait, le trou est la plus longue suite de pixels sans encre du canvas de scène ; il doit valoir le diamètre de
// la gomme (2 × ERASER_RADIUS_PX, px CSS, constant à l'écran) à l'anticrénelage près.
// `--mesure` : écrit les mesures sans juger (code 0) ; sert à relever l'état d'avant sur un ancien build (`--dist`).
// `--capture <png>` : capture 2x des quatre traits gommés.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/gomme-trait-epais-navigateur.mjs [--dist <build>] [--mesure] [--capture <png>]
import { Echec, VIEWPORT, clickItem, frames, item, loadPlaywright, serve, stageBox } from "./commun.mjs";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
};
const dist = opt("--dist");
const capture = opt("--capture");
const mesure = argv.includes("--mesure");

const WIDTH = 60; // épaisseur du préréglage (unités monde)
const ERASER_DIAMETER = 24; // 2 × ERASER_RADIUS_PX (apps/web/src/engine/tools/eraser.ts)
const TOL = 2; // px CSS : anticrénelage des deux bords
// Zone libre de la page, hors des îlots (barre d'outils, panneau d'options, préréglages) : px CSS de la scène.
const X0 = 440;
const X1 = 1100;
const XE = 770; // x du passage de gomme
// Le doigt d'abord : une fois le stylet vu, le doigt déplace la vue au lieu de tracer (rejet de la paume).
const STROKES = [
  { label: "doigt", y: 300, kind: "touch" },
  { label: "souris", y: 430, kind: "mouse" },
  { label: "stylet, pression 0,2", y: 560, kind: "pen", force: 0.2 },
  { label: "stylet, pression 1", y: 690, kind: "pen", force: 1 },
];

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright absent (cache npx)");
  process.exit(2);
}
const server = await serve(dist ? { dist } : {});
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
let failed = false;
try {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const check = (cond, msg) => {
    if (cond || mesure) {
      console.log(`${cond ? "ok" : "mesure"} — ${msg}`);
      return;
    }
    throw new Echec(msg);
  };
  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  await frames(page);

  // Préréglage épais, par l'éditeur de profil (le chemin de l'utilisateur), enregistré comme nouveau profil.
  await page.click(item("profiles"));
  await page.click('[data-profile-cmd="edit"]');
  await page.waitForSelector("[data-profile-editor]", { timeout: 15000 });
  const field = page.locator('[data-edit-preset="noir"] input[data-edit="preset-width"]');
  await field.fill(String(WIDTH));
  await field.press("Tab");
  await page.fill('input[data-edit="new-name"]', "Épais");
  await page.click('button[data-edit="save-new"]');
  await page.waitForSelector("[data-profile-editor]", { state: "detached", timeout: 15000 });
  await page.click('button[data-preset="noir"]');
  await frames(page);
  check((await page.getAttribute("#stage", "data-tool")) === "pen", "stylo actif, préréglage Noir à l'épaisseur 60");

  const box = await stageBox(page);
  const cdp = await ctx.newCDPSession(page);
  let t = Date.now() / 1000;
  const step = 4;
  const xs = [];
  for (let x = X0; x <= X1; x += step) xs.push(x);
  const mouse = async (type, x, y, extra = {}) => {
    t += 0.008;
    await cdp.send("Input.dispatchMouseEvent", {
      type, x: box.x + x, y: box.y + y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, timestamp: t, ...extra,
    });
  };
  const touch = (type, x, y) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: box.x + x, y: box.y + y }] });
  const strokeCount = () => page.evaluate(() => Number(document.querySelector("#stage").dataset.elements));
  for (const s of STROKES) {
    if (s.kind === "touch") {
      await touch("touchStart", xs[0], s.y);
      for (const x of xs.slice(1)) await touch("touchMove", x, s.y);
      await touch("touchEnd");
    } else {
      const extra = s.kind === "pen" ? { pointerType: "pen", force: s.force } : {};
      await mouse("mouseMoved", xs[0], s.y, { buttons: 0, button: "none", ...extra });
      await mouse("mousePressed", xs[0], s.y, { clickCount: 1, ...extra });
      for (const x of xs.slice(1)) await mouse("mouseMoved", x, s.y, extra);
      await mouse("mouseReleased", xs[xs.length - 1], s.y, { clickCount: 1, ...extra });
    }
    await frames(page);
  }
  check((await strokeCount()) === 4, `quatre traits tracés (${await strokeCount()})`);

  // Un seul passage de gomme, à la souris, en travers des quatre traits.
  await clickItem(page, "eraser");
  check((await page.getAttribute(item("eraser"), "aria-pressed")) === "true", "gomme choisie");
  const y0 = STROKES[0].y - 60;
  const y1 = STROKES[STROKES.length - 1].y + 60;
  await mouse("mouseMoved", XE, y0, { buttons: 0, button: "none" });
  await mouse("mousePressed", XE, y0, { clickCount: 1 });
  for (let y = y0 + step; y <= y1; y += step) await mouse("mouseMoved", XE, y);
  await mouse("mouseReleased", XE, y1, { clickCount: 1 });
  await frames(page);
  await frames(page);
  check((await strokeCount()) === 8, `chaque trait coupé en deux morceaux (${await strokeCount()} traits)`);

  // Profil d'encre sur l'axe de chaque trait (px de canvas), puis épaisseur vue à x = 400.
  const rows = await page.$eval(
    "#scene",
    (c, [strokes, x0, x1, xCol]) => {
      const g = c.getContext("2d");
      const sx = c.width / c.clientWidth;
      const ink = (d, i) => d[i + 3] > 128 && d[i] + d[i + 1] + d[i + 2] < 300;
      return strokes.map((s) => {
        const row = g.getImageData(Math.round(x0 * sx), Math.round(s.y * sx), Math.round((x1 - x0) * sx), 1).data;
        let best = 0;
        let run = 0;
        for (let i = 0; i < row.length; i += 4) {
          run = ink(row, i) ? 0 : run + 1;
          best = Math.max(best, run);
        }
        const col = g.getImageData(Math.round(xCol * sx), Math.round((s.y - 60) * sx), 1, Math.round(120 * sx)).data;
        let thick = 0;
        for (let i = 0; i < col.length; i += 4) if (ink(col, i)) thick++;
        return { hole: best / sx, thickness: thick / sx };
      });
    },
    [STROKES, X0 + 40, X1 - 40, X0 + 100],
  );
  // La pression arrive au cœur : sinon les quatre traits auraient la même épaisseur et le trou vaudrait la gomme
  // même sans le correctif.
  const thick = Object.fromEntries(STROKES.map((s, i) => [s.label, rows[i].thickness]));
  check(
    thick["stylet, pression 1"] > thick["souris"] && thick["souris"] > thick["stylet, pression 0,2"],
    `épaisseurs : stylet 1 (${thick["stylet, pression 1"]}) > souris (${thick["souris"]}) > stylet 0,2 (${thick["stylet, pression 0,2"]})`,
  );
  STROKES.forEach((s, i) => {
    const { hole, thickness } = rows[i];
    check(
      Math.abs(hole - ERASER_DIAMETER) <= TOL,
      `${s.label} : trou de ${hole} px CSS sur l'axe (gomme ${ERASER_DIAMETER} px), trait de ${thickness} px`,
    );
  });
  if (capture) {
    await page.screenshot({ path: capture, clip: { x: box.x + X0 - 60, y: box.y + y0, width: X1 - X0 + 120, height: y1 - y0 } });
    console.log(`capture : ${capture}`);
  }
  check(errors.length === 0, `aucune erreur de page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  console.log("gomme trait épais : OK");
} catch (e) {
  failed = true;
  console.error(e instanceof Echec ? e.message : e);
} finally {
  await browser.close();
  server.close();
}
process.exitCode = failed ? 1 : 0;
