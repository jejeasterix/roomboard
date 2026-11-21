#!/usr/bin/env node
// Essai C8 « pot, zones fermées » au navigateur (S1 à S6 du cadrage usage-c8-pot-zones). Application construite
// (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli
// (`?fichiers=repli`), heure figée. Oracles : `#stage[data-zones]`, `data-zone-ms`, `data-zone-cells`, couleurs lues dans
// `#scene` (`inkIn`) ; aucune requête hors de 127.0.0.1. La fixture S6 est fabriquée par l'essai avec le vrai module
// (Node, `initSync`). Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c8-pot-zones-navigateur.mjs [--captures]
// (--captures : docs/essais/c8-pot-zones.png : triangle de trois traits rempli au pot, fond bleu).
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, frames, gitSha, inkIn, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C8 pot zones";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const SOCLE = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "socle-v1.roomboard");
const WASM_DIR = join(ROOT, "apps", "web", "src", "wasm");
/** Triangle au stylo, px de la scène : le dernier trait s'arrête à 1 px de son départ (écart < 2 px). */
const A = [300, 200];
const B = [640, 200];
const C = [470, 470];
const A_END = [301, 200];
const CENTROID = [470, 330];
const ON_AB = [[440, 196], [500, 204]];
const VOID = [1100, 560];
/** S5 : petit cercle (vrai trait) dans le triangle, et S4 : rectangle non rempli seul, hors du triangle. */
const CIRCLE = { c: [470, 270], r: 30 };
const RECT = [[850, 250], [1050, 400]];
const RECT_CENTRE = [950, 325];
const YELLOW = [250, 204, 21];
const BLUE = [29, 78, 216];
/** S6 (Q18) : porte de 50 ms, pire cas d'au moins 4 000 000 cellules à zoom 1. */
const GATE_MS = 50;
const MIN_CELLS = 4_000_000;
const WHEEL_ZOOM_SPEED = 0.002; // apps/web/src/engine/engine.ts:185
/** S6 : points monde dans et hors du triangle (côtés x = −700, y = −700, x + y = 600). */
const INSIDE = [100, 100];
const OUTSIDE = [900, 400];

/** S6 : triangle de traits à main levée de 2000 × 2000 en monde et 300 traits courts à l'intérieur, par le vrai module. */
async function buildFixture(tmp) {
  const glue = await import(pathToFileURL(join(WASM_DIR, "roomboard_wasm.js")).href);
  glue.initSync({ module: readFileSync(join(WASM_DIR, "roomboard_wasm_bg.wasm")) });
  const d = glue.Document.blank();
  const p = d.page_ids()[0];
  const side = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(len / 10);
    const [nx, ny] = [-(y1 - y0) / len, (x1 - x0) / len];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const wob = 3 * Math.sin(t * Math.PI * 7) * Math.sin(t * Math.PI); // main levée, nulle aux sommets
      pts.push(x0 + (x1 - x0) * t + nx * wob, y0 + (y1 - y0) * t + ny * wob, 0.5);
    }
    d.commit_stroke(p, new Float32Array(pts), "#000000", 4);
  };
  side(-700, -700, 1300, -700);
  side(1300, -700, -700, 1300);
  side(-700, 1300, -700, -700);
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 15; j++) {
      const [x, y] = [-600 + 40 * i, -600 + 40 * j];
      d.commit_stroke(p, new Float32Array([x, y, 0.5, x + 15, y, 0.5]), "#000000", 4);
    }
  }
  const file = join(tmp, "c8-s6.roomboard");
  await writeFile(file, d.save(FIXED.toISOString(), "essai-c8"));
  d.free();
  return file;
}

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const key = async (k) => {
    await page.keyboard.press(k);
    await fr();
  };
  const waitAttr = (name, v) =>
    page
      .waitForFunction(([n, w]) => document.querySelector("#stage")?.getAttribute(n) === w, [name, v], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
      });
  /** Attend que l'attribut quitte `old` (valeur du clic précédent) : on ne relit jamais l'ancienne mesure. */
  const waitChange = (name, old) =>
    page
      .waitForFunction(([n, w]) => document.querySelector("#stage")?.getAttribute(n) !== w, [name, old], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} inchangé (« ${old} ») après le clic`);
      });
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const screen = async ([wx, wy]) => {
    const c = await camera();
    return [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  };
  const sq = ([x, y], r = 8) => [x - r, y - r, x + r, y + r];
  const near = (p, rgb, tol = 40, r = 8) => inkIn(page, sq(p, r), { rgb, tol });
  const drag = async (a, b) => {
    await mouse.move(a[0], a[1]);
    await mouse.down();
    await mouse.move(b[0], b[1], { steps: 8 });
    await mouse.up();
    await fr();
  };
  const pot = async () => {
    await page.click(item("fill"));
    await fr();
  };
  const pick = async (id) => {
    await page.click(`button[data-preset="${id}"]`);
    await fr();
  };
  const click = async ([x, y]) => {
    await mouse.click(x, y);
    await fr();
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  const openFile = async (file) => {
    const before = await page.locator(TAB).count();
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Control+o");
    await (await chooser).setFiles(file);
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
    await fr();
  };
  const strokeInk = () => inkIn(page, [ON_AB[0][0], ON_AB[0][1], ON_AB[1][0], ON_AB[1][1]]);

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await fr();

  // S1 : trois traits qui ferment un triangle (écart de 1 px) ; S5 : un petit cercle de trait dedans.
  await page.click(item("pen"));
  await fr();
  await drag(A, B);
  await drag(B, C);
  await drag(C, A_END);
  await waitAttr("data-elements", "3");
  {
    const [cx, cy] = CIRCLE.c;
    const at = (k) => [cx + CIRCLE.r * Math.cos((k / 24) * 2 * Math.PI), cy + CIRCLE.r * Math.sin((k / 24) * 2 * Math.PI)];
    await mouse.move(...at(0));
    await mouse.down();
    for (let k = 1; k <= 24; k++) await mouse.move(...at(k));
    await mouse.up();
    await fr();
  }
  await waitAttr("data-elements", "4");
  const inkBefore = await strokeInk();
  const ringPt = [CIRCLE.c[0], CIRCLE.c[1] - CIRCLE.r];
  const ringBefore = await inkIn(page, sq(ringPt, 4));
  await pot();
  check((await stageBox(page)).height >= 640, "S5 : Pot actif, la scène garde au moins 640 px de haut");
  await pick("jaune");
  check((await near(CENTROID, YELLOW)) === 0, "S1 : avant le clic, l'intérieur du triangle est vide");
  await click(CENTROID);
  await waitAttr("data-zones", "1");
  check((await attr("data-elements")) === "5", "S1 : un élément fill s'ajoute aux quatre traits");
  check((await near(CENTROID, YELLOW)) > 150, "S1 : l'intérieur du triangle prend le jaune");
  const inkAfter = await strokeInk();
  check(inkAfter >= 0.9 * inkBefore && inkBefore > 0, `S1 : le trait du haut garde son encre (${inkBefore} → ${inkAfter} px)`);
  const ringAfter = await inkIn(page, sq(ringPt, 4));
  check(ringBefore > 0 && ringAfter >= 0.9 * ringBefore, `S5 : le cercle de trait reste visible (${ringBefore} → ${ringAfter} px)`);
  check((await near(CIRCLE.c, YELLOW, 40, 6)) <= 10, "S5 : l'intérieur du cercle est un trou du fill (pas jaune)");
  await key("Control+z");
  await waitAttr("data-zones", "0");
  check((await near(CENTROID, YELLOW)) <= 10, "S1 : Annuler retire le remplissage (une étape)");
  await key("Control+y");
  await waitAttr("data-zones", "1");
  check((await near(CENTROID, YELLOW)) > 150, "S1 : Refaire le rétablit");

  // S2 : hors de toute zone, le fond de la page change ; aucun fill de plus.
  await pick("bleu");
  await click(VOID);
  check((await near(VOID, BLUE)) > 150, "S2 : clic hors de toute zone : le fond de la page devient bleu");
  check((await attr("data-zones")) === "1" && (await attr("data-elements")) === "5", "S2 : aucun fill de plus");
  if (captures) {
    const path = join(ROOT, "docs", "essais", "c8-pot-zones.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // S4 : rectangle non rempli, seul : comportement C6a (la forme se remplit, aucun fill).
  await page.click(item("rect"));
  await fr();
  await drag(RECT[0], RECT[1]);
  await waitAttr("data-elements", "6");
  await pot();
  await pick("jaune");
  await click(RECT_CENTRE);
  check((await near(RECT_CENTRE, YELLOW)) > 150, "S4 : rectangle seul : la forme se remplit de jaune (comme C6a)");
  check((await attr("data-zones")) === "1" && (await attr("data-elements")) === "6", "S4 : aucun fill de plus (data-zones reste à 1)");
  // (Zone fermée en partie par une image : couvert en natif par T1, `image_box_closes_zone`.)

  // S3 : enregistrer, rouvrir ; fichier d'avant C8.
  const file = await saveTo("c8.roomboard");
  await openFile(file);
  await waitAttr("data-zones", "1");
  check((await near(CENTROID, YELLOW)) > 150, "S3 : rouvert : le fill est là, jaune, au-dessus des traits");
  await openFile(SOCLE);
  check((await attr("data-zones")) === "0", "S3 : socle-v1.roomboard (d'avant C8) s'ouvre, aucun fill");

  // S6 : porte de temps sur le pire cas, à zoom 1.
  await openFile(await buildFixture(tmp));
  for (let k = 0; k < 6; k++) {
    const c = await camera();
    if (Math.abs(c.zoom - 1) <= 0.002) break;
    await mouse.move(Math.max(5, c.tx), Math.max(5, c.ty));
    await page.keyboard.down("Control");
    await mouse.wheel(0, Math.log(c.zoom) / WHEEL_ZOOM_SPEED);
    await page.keyboard.up("Control");
    await fr();
  }
  const z = await camera();
  check(Math.abs(z.zoom - 1) <= 0.002, `S6 : zoom 1 atteint (${z.zoom})`);
  const box = await stageBox(page);
  const [ix, iy] = await screen(INSIDE);
  const [ox, oy] = await screen(OUTSIDE);
  check(ix > 0 && iy > 0 && ox < box.width && oy < box.height, "S6 : points dans et hors du triangle visibles");
  await pot();
  await pick("jaune");
  const ms = [];
  let cells = 0;
  let last = (await attr("data-zone-ms")) ?? "";
  for (let k = 0; k < 3; k++) {
    await click([ix, iy]);
    await waitAttr("data-zones", "1");
    await waitChange("data-zone-ms", last);
    last = (await attr("data-zone-ms")) ?? "";
    ms.push(Number(last));
    cells = Number(await attr("data-zone-cells"));
    await key("Control+z");
    await waitAttr("data-zones", "0");
  }
  ms.sort((a, b) => a - b);
  check(cells >= MIN_CELLS, `S6 : masque de ${cells} cellules (>= ${MIN_CELLS})`);
  check(ms[1] <= GATE_MS, `S6 : médiane ${ms[1]} ms du clic à l'écriture (<= ${GATE_MS} ms ; ${ms.join(", ")})`);
  await pick("bleu");
  await click([ox, oy]);
  await waitChange("data-zone-ms", last);
  check((await near([ox, oy], BLUE)) > 150, "S6 : hors du triangle, le fond change");
  const out = Number(await attr("data-zone-ms"));
  check(out <= GATE_MS && (await attr("data-zones")) === "0", `S6 : fond en ${out} ms (<= ${GATE_MS}), aucun fill`);
  const hFinal = (await stageBox(page)).height;
  check(hFinal >= 640, `S5 : Pot actif : scène mesurée ${Math.round(hFinal)} px (>= 640)`);
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  if (!existsSync(join(DIST, "index.html")) || !existsSync(join(WASM_DIR, "roomboard_wasm_bg.wasm"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist ou apps/web/src/wasm absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c8-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp });
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
