#!/usr/bin/env node
// Essai C10a « tableau » au navigateur (S1 du cadrage, partie C10a de S11). L'application construite (apps/web/dist)
// servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée.
// Geste : outil Tableau, grille de choix 4 × 3, « Lundi », Tab, « Mardi », Tab, « Mercredi » (S1), puis les neuf autres
// cellules par Tab (passage de ligne compris), Échap, capture (avec --captures seulement), « + Colonne », « + Ligne »,
// Ctrl+S, Ctrl+O, relecture des trois premières cellules dans le nouvel onglet. Oracle : #stage[data-table] =
// "<colonnes>x<lignes>@<rang>,<colonne>" et le texte de #texte-edition. Aucune requête hors de 127.0.0.1.
// Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c10a-tableau-navigateur.mjs [--captures]
// (--captures : docs/essais/c10a-tableau-4x3.png).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, frames, gitSha, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C10a tableau";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
/** Point cliqué sur la scène (px de la scène) : coin haut gauche du tableau. */
const CLICK = [200, 150];
const COL = 240;
const ROW = 64;
const FIRST = ["Lundi", "Mardi", "Mercredi"];
const REST = ["Jeudi", "Maths", "Français", "Histoire", "Sport", "Anglais", "Musique", "Dessin", "Sciences"];

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
  const waitTable = (v) =>
    page
      .waitForFunction((v) => document.querySelector("#stage")?.getAttribute("data-table") === v, v, { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`data-table attendu « ${v} », lu « ${await attr("data-table")} »`);
      });
  const editorValue = () => page.$eval("#texte-edition", (a) => a.textContent);
  const editorOpen = () => page.$eval("#texte-edition", (a) => !a.hidden && document.activeElement === a);
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  await page.click(item("table"));
  await fr();
  check((await attr("data-tool")) === "table", 'S1 : outil Tableau actif (data-tool="table")');
  const box = await stageBox(page);
  check(box.height >= 640, `S1 : la scène garde ${Math.round(box.height)} px de haut avec la rangée du tableau (HC10-15)`);
  const c1 = await camera();
  const world = [(CLICK[0] - c1.tx) / c1.zoom, (CLICK[1] - c1.ty) / c1.zoom];

  // S1 : grille de choix au point cliqué, 4 × 3.
  await mouse.click(CLICK[0], CLICK[1]);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  const cell43 = 'button[aria-label="4 colonnes, 3 lignes"]';
  await page.hover(cell43);
  check((await page.textContent("[data-picker-label]")) === "4 × 3", "S1 : la grille montre « 4 × 3 » au survol");
  await page.click(cell43);
  await waitTable("4x3@0,0");
  check(await editorOpen(), 'S1 : tableau 4 × 3, saisie ouverte sur la première cellule (data-table="4x3@0,0")');

  // S1 : trois cellules par Tab.
  await page.keyboard.type(FIRST[0]);
  await page.keyboard.press("Tab");
  await waitTable("4x3@0,1");
  await page.keyboard.type(FIRST[1]);
  await page.keyboard.press("Tab");
  await waitTable("4x3@0,2");
  await page.keyboard.type(FIRST[2]);
  check((await editorValue()) === FIRST[2], "S1 : « Lundi », Tab, « Mardi », Tab, « Mercredi » (data-table 4x3@0,1 puis 4x3@0,2)");

  // Remplissage des neuf autres, passage de ligne compris, puis Échap.
  for (const [i, text] of REST.entries()) {
    await page.keyboard.press("Tab");
    const n = FIRST.length + i;
    await waitTable(`4x3@${Math.floor(n / 4)},${n % 4}`);
    await page.keyboard.type(text);
  }
  check((await attr("data-table")) === "4x3@2,3", "les neuf autres cellules par Tab, passage de ligne compris (4x3@1,0 … 4x3@2,3)");
  await page.keyboard.press("Escape");
  await fr();
  check(
    (await page.$eval("#texte-edition", (a) => a.hidden)) && (await attr("data-table")) === "4x3@2,3",
    "Échap : saisie fermée, la cellule reste active (4x3@2,3)",
  );
  if (captures) {
    await fr();
    const path = join(ROOT, "docs", "essais", "c10a-tableau-4x3.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // S1 : « + Colonne », « + Ligne ».
  await page.click('button[data-table-action="table-col-insert"]');
  await waitTable("5x3@2,3");
  check(true, "S1 : « + Colonne » : 5x3@2,3");
  await page.click('button[data-table-action="table-row-insert"]');
  await waitTable("5x4@2,3");
  check(true, "S1 : « + Ligne » : 5x4@2,3");

  // S1 : Ctrl+S, Ctrl+O sur le fichier : nouvel onglet.
  const before = await page.locator(TAB).count();
  const file = await saveTo("tableau.roomboard");
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
  await fr();
  check((await page.locator(TAB).count()) === before + 1, "S1 : Ctrl+S puis Ctrl+O : rouvert dans un nouvel onglet");

  // S1 : outil Tableau, clic dans les trois premières cellules du tableau rouvert.
  await page.click(item("table"));
  await fr();
  const c2 = await camera();
  const screen = (wx, wy) => [wx * c2.zoom + c2.tx, wy * c2.zoom + c2.ty];
  for (const [j, text] of FIRST.entries()) {
    const [sx, sy] = screen(world[0] + COL * j + COL / 2, world[1] + ROW / 2);
    await mouse.click(sx, sy);
    await waitTable(`5x4@0,${j}`);
    const v = await editorValue();
    check(v === text, `S1 : rouvert, cellule ${j + 1} : « ${v} » (data-table="5x4@0,${j}")`);
    await page.keyboard.press("Escape");
    await fr();
  }
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
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c10a-"));
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
