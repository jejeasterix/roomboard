#!/usr/bin/env node
// Essai du lot 5b au navigateur (T96) : l'interface SolidJS jouée par la souris et le clavier. Barres (profil par défaut,
// profil simple), la barre ne recouvre pas la scène, onglets, page infinie, dépôt de fichiers, fermeture d'un onglet
// modifié, S3 (enregistrer puis rouvrir trois pages), S4 (zoom 200 % puis trait aux coordonnées monde, profil à trois
// outils). L'application construite (apps/web/dist) est servie en local ; Chromium headless de Playwright.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Hors de verifier.sh sans --e2e.
// Usage : node scripts/essais/s5b-navigateur.mjs [--captures]   (docs/essais/s5b-{defaut,simple,onglets,page-infinie}.png)
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, clashes, dropFile, frames, gitSha, clickItem, inkIn, islandBoxes, item, loadPlaywright, noOverlap, overlapping, serve, stageBox, stageMouse, foldOptions } from "./commun.mjs";

const LABEL = "S5b";
const LATER = "format pris en charge dans une prochaine version";
const TOOLS = ["pen", "eraser", "hand", "select", "rect", "ellipse", "line", "arrow", "text"];

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const dialogs = [];
  let answer = "accept";
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    if (answer === "dismiss") await d.dismiss();
    else await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const elements = async () => Number(await attr("data-elements"));
  const tabs = () => page.locator(TAB).count();
  const tabTitles = () => page.locator(`${TAB} > span:first-child`).allTextContents();
  const activeTitle = () => page.locator(`${TAB}[aria-selected="true"] > span:first-child`).first().textContent();
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const press = async (keys) => {
    await page.keyboard.press(keys);
    await fr();
  };
  const click = async (id) => {
    await page.click(item(id));
    await fr();
  };
  const drag = async (pts) => {
    await mouse.move(pts[0][0], pts[0][1]);
    await mouse.down();
    for (const [x, y] of pts.slice(1)) await mouse.move(x, y, { steps: 8 });
    await mouse.up();
    await fr();
  };
  const ready = async () => {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
    await fr();
  };
  const waitTabs = async (n) => {
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 15000 });
    await fr();
  };
  const shot = async (name) => {
    if (!captures) return;
    const path = join(ROOT, "docs", "essais", `s5b-${name}.png`);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };
  const chooseProfile = async (id) => {
    await click("profiles");
    await page.click(`[data-profile="${id}"]`);
    await fr();
  };
  const visibleTools = async () => {
    const ids = await page.$$eval('[data-toolbar="outils"] button[data-item]', (bs) => bs.map((b) => b.getAttribute("data-item")));
    return TOOLS.filter((t) => ids.includes(t));
  };
  /** Enregistre le document courant (repli : téléchargement intercepté) ; rend le chemin du fichier. */
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };

  // 1. Page prête, profil par défaut (design-l2, L2-25, contrôle inversé par L2) : la scène occupe toute la fenêtre ; les
  //    îlots flottent au-dessus d'elle, entiers dans la fenêtre et sans chevauchement.
  await foldOptions(page);
  await page.goto(url);
  await ready();
  check((await attr("data-tool")) === "pen", '#stage[data-tool="pen"] : outil Stylo au départ');
  check((await attr("data-page")) === "1/1", '#stage[data-page="1/1"]');
  check((await page.locator('[data-toolbar="outils"][data-dock="floating"]').count()) === 1, 'profil par défaut : [data-toolbar="outils"][data-dock="floating"]');
  check((await page.locator('[data-toolbar="pages"][data-dock="floating"]').count()) === 1, 'profil par défaut : [data-toolbar="pages"][data-dock="floating"]');
  const box = await stageBox(page);
  check(box.x === 0 && box.y === 0 && box.width === VIEWPORT.width && box.height === VIEWPORT.height, `la scène occupe toute la fenêtre (x ${box.x}, y ${box.y}, ${box.width} × ${box.height})`);
  const isl = await islandBoxes(page);
  const outside = isl.filter((b) => b.x < -0.5 || b.y < -0.5 || b.x + b.width > VIEWPORT.width + 0.5 || b.y + b.height > VIEWPORT.height + 0.5).map((b) => b.id);
  check(isl.length >= 6 && outside.length === 0, `îlots entiers dans la fenêtre (${isl.map((b) => b.id).join(", ")}${outside.length ? ` ; dehors : ${outside.join(", ")}` : ""})`);
  const clash = clashes(isl);
  check(clash.length === 0, `aucun îlot n'en recouvre un autre${clash.length ? ` (${clash.join(", ")})` : ""}`);
  check(box.height >= 640, `la scène garde au moins 640 px de haut (${box.height} px)`);
  const css = await page.evaluate(() => {
    const g = (sel) => getComputedStyle(document.querySelector(sel));
    return { touch: g("#stage").touchAction, select: g("#stage").userSelect, scene: [g("#scene").position, g("#scene").pointerEvents], inter: [g("#interaction").position, g("#interaction").pointerEvents] };
  });
  check(css.touch === "none", `getComputedStyle(#stage).touchAction === "none" (${css.touch})`);
  check(css.select === "none", `getComputedStyle(#stage).userSelect === "none" (${css.select})`);
  check(css.scene.join() === "absolute,none" && css.inter.join() === "absolute,none", "#scene et #interaction : position absolute, pointer-events none");
  await shot("defaut");

  // 2. Profil simple : barre à gauche, gros boutons, mémorisé au rechargement.
  await chooseProfile("simple");
  check((await page.locator('[data-toolbar="outils"][data-dock="left"]').count()) === 1, 'profil simple : [data-toolbar="outils"][data-dock="left"]');
  check((await page.getAttribute('[data-toolbar="outils"]', "data-size")) === "l", 'profil simple : data-size="l"');
  check((await page.locator(item("rect")).count()) === 0, "profil simple : pas de bouton Rectangle");
  const simple = await noOverlap(page, '[data-toolbar="outils"]');
  check(simple.apart && simple.stage.x >= simple.bar.x + simple.bar.width - 0.5, `profil simple : la barre à gauche ne recouvre pas la scène (barre x=${simple.bar.x}..${simple.bar.x + simple.bar.width}, scène x=${simple.stage.x})`);
  check((await overlapping(page, '[data-toolbar="outils"] button[data-item]')).length === 0, "profil simple : aucun bouton de la bande ne recouvre la scène (îlot des pages au-dessus d'elle, L2-2)");
  await shot("simple");
  await page.reload();
  await ready();
  check((await page.locator('[data-toolbar="outils"][data-dock="left"]').count()) === 1, "rechargé : le profil simple est toujours actif");
  check(JSON.stringify(await visibleTools()) === JSON.stringify(["pen", "eraser", "hand"]), "profil simple : exactement trois outils (pen, eraser, hand)");
  const three = await visibleTools();
  await chooseProfile("defaut");
  check((await page.locator('[data-toolbar="outils"][data-dock="floating"]').count()) === 1, "retour au profil par défaut : barre en îlot");
  check(JSON.stringify(await visibleTools()) === JSON.stringify(TOOLS), `profil par défaut : les neuf outils sont présents (${three.length} sous le profil simple)`);

  // 3. Onglets : historiques séparés.
  await drag([[400, 250], [650, 250], [900, 250]]);
  check((await attr("data-elements")) === "1", '#stage[data-elements="1"] : un trait tracé');
  await press("Control+n");
  await waitTabs(2);
  check((await tabs()) === 2, "Ctrl+N : deux onglets");
  check((await page.locator(`${TAB}[aria-selected="true"]`).evaluate((t) => t === t.parentElement.querySelectorAll('[role="tab"]')[1])), "le nouvel onglet est l'actif");
  check((await attr("data-elements")) === "0", '#stage[data-elements="0"] dans le nouvel onglet');
  await press("Control+z");
  check((await elements()) === 0 && (await tabs()) === 2, "Ctrl+Z dans l'onglet 2 : rien");
  await shot("onglets");
  await page.locator(TAB).nth(0).click();
  await fr();
  check((await elements()) === 1, "onglet 1 activé : son trait est là (data-elements=1)");
  await press("Control+z");
  check((await elements()) === 0, "Ctrl+Z dans l'onglet 1 : le trait part (historiques séparés)");
  await press("Control+y");
  check((await elements()) === 1, "Ctrl+Y dans l'onglet 1 : le trait revient");

  // 4. Fond de page : le fond sous le trait est blanc, pas le gris du pourtour.
  // Depuis la décision 7, une page neuve est en mode Page 1920 × 1080 (cadre fini) : le
  // trait est tracé DANS le cadre de la page (ajusté à la fenêtre), plus « loin sous la page ».
  await click("fit-page");
  await fr();
  await drag([[400, 350], [650, 350], [900, 350]]);
  check((await elements()) === 2, "un trait tracé dans le cadre de la page (data-elements 1 → 2)");
  const px = await page.$eval("#scene", (c) => {
    const ctx = c.getContext("2d");
    const at = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    return { under: at(650, 330), side: at(650, 380), ink: at(650, 350) };
  });
  const hex = (v) => `#${v.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  check(hex(px.under) === "#ffffff" && hex(px.side) === "#ffffff", `fond blanc sous le trait (${hex(px.under)}, ${hex(px.side)}), pas le gris du pourtour`);
  check((await inkIn(page, [640, 340, 660, 360])) > 0, "le trait est visible sur la scène (encre)");
  await shot("page-infinie");

  // 5. Dépôt : un .roomboard → nouvel onglet ; un autre fichier → message.
  const saved = await saveTo("cours.roomboard");
  const bytes = await readFile(saved);
  check(bytes[0] === 0x50 && bytes[1] === 0x4b, `document enregistré (${bytes.length} octets, « PK »)`);
  const tabsBefore = await tabs();
  await dropFile(page, "#stage", "Cours.roomboard", bytes);
  await waitTabs(tabsBefore + 1);
  check((await tabs()) === tabsBefore + 1, "dépôt d'un .roomboard : un onglet de plus");
  check((await activeTitle()) === "Cours.roomboard", `le nouvel onglet porte le titre « ${await activeTitle()} »`);
  check((await elements()) === 2, "l'onglet déposé contient les 2 éléments");
  await page.locator(TAB).nth(0).click();
  await fr();
  check((await elements()) === 2, "l'onglet d'origine garde ses éléments");
  const version = await attr("data-version");
  const nTabs = await tabs();
  const dlg0 = dialogs.length;
  await dropFile(page, "#stage", "photo.tif", [0x49, 0x49, 0x2a, 0x00]);
  await page.waitForTimeout(500);
  const later = dialogs.slice(dlg0).find((d) => d.type === "alert");
  check((await tabs()) === nTabs && (await attr("data-version")) === version, "dépôt d'un .tif : nombre d'onglets et data-version inchangés");
  check(later !== undefined && later.message.includes(LATER), `dépôt d'un .tif : message « ${later?.message} »`);

  // 6. Fermer l'onglet modifié.
  await drag([[400, 500], [900, 500]]);
  check((await attr("data-modifie")) === "1", "un trait de plus : l'onglet est modifié");
  const before6 = await tabs();
  const closeActive = () => page.locator(`${TAB}[aria-selected="true"] [data-tab-close]`).click();
  const dlg1 = dialogs.length;
  answer = "dismiss";
  await closeActive();
  await fr();
  const q = dialogs.slice(dlg1).find((d) => d.type === "confirm");
  check(q !== undefined && q.message.includes("modifications non enregistrées"), `fermeture d'un onglet modifié : question « ${q?.message} »`);
  check((await tabs()) === before6, "refus : l'onglet est gardé");
  answer = "accept";
  await closeActive();
  await waitTabs(before6 - 1);
  check((await tabs()) === before6 - 1, "acceptation : l'onglet est retiré");
  check((await page.locator("#stage").count()) === 1 && (await page.locator(`${TAB}[aria-selected="true"]`).count()) === 1, "un onglet reste actif et montré");

  // 7. S3 : enregistrer puis rouvrir trois pages.
  await press("Control+n");
  await waitTabs(before6);
  const TRAIT = [[400, 250], [650, 250], [900, 250]];
  const RECT = [[300, 300], [500, 400]];
  const BOXES = [[640, 240, 660, 260], [296, 346, 304, 354], [596, 296, 720, 340]];
  await click("pen");
  await drag(TRAIT);
  await clickItem(page, "page-add");
  await click("rect");
  await drag(RECT);
  await clickItem(page, "page-add");
  await click("text");
  await mouse.click(600, 300);
  await fr();
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  await page.keyboard.type("trois");
  await mouse.click(900, 600);
  await fr();
  check((await attr("data-page")) === "3/3" && (await elements()) === 1, "trois pages : un élément sur la page 3/3 (texte « trois »)");
  const file3 = await saveTo("trois.roomboard");
  const before7 = await tabs();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file3);
  await waitTabs(before7 + 1);
  check((await tabs()) === before7 + 1 && (await activeTitle()) === "trois.roomboard", "Ctrl+O avec ce fichier : un onglet de plus (trois.roomboard)");
  check(((await page.textContent("#pages")) ?? "").trim() === "1 / 3", `#pages = « ${((await page.textContent("#pages")) ?? "").trim()} » après la réouverture`);
  for (let i = 0; i < 3; i++) {
    if (i > 0) await click("page-next");
    check((await attr("data-page")) === `${i + 1}/3`, `page ${i + 1}/3 montrée`);
    check((await elements()) === 1, `page ${i + 1}/3 : data-elements="1"`);
    check((await inkIn(page, BOXES[i])) > 0, `page ${i + 1}/3 : l'encre de l'élément est à ses coordonnées`);
  }

  // 8. S4 : zoom 200 % par Ctrl+molette, puis trait aux coordonnées monde.
  await press("Control+n");
  await waitTabs(before7 + 2);
  await click("fit-page");
  const cam0 = await camera();
  await mouse.move(640, 350);
  await page.keyboard.down("Control");
  let cam = cam0;
  let crans = 0;
  while (cam.zoom < 2 && crans < 40) {
    await page.mouse.wheel(0, -100);
    await fr();
    cam = await camera();
    crans++;
  }
  await page.keyboard.up("Control");
  if (cam.zoom < 2) throw new Echec("zoom 200 % jamais atteint");
  console.log(`caméra : ${(await attr("data-camera"))} après ${crans} crans (départ ${cam0.zoom})`);
  check(cam.zoom >= 2, `zoom >= 2 par Ctrl+molette (${cam.zoom.toFixed(3)})`);
  const SX0 = 400;
  const SX1 = 800;
  const SY = 350;
  await click("pen");
  await drag([[SX0, SY], [(SX0 + SX1) / 2, SY], [SX1, SY]]);
  await click("select");
  await mouse.click((SX0 + SX1) / 2, SY);
  await fr();
  const b = ((await attr("data-bounds")) ?? "").split(",").map(Number);
  check(b.length === 4 && b.every(Number.isFinite), `trait sélectionné : #stage[data-bounds]="${await attr("data-bounds")}"`);
  const { zoom, tx, ty } = await camera();
  const want = { x0: (SX0 - tx) / zoom, x1: (SX1 - tx) / zoom, y: (SY - ty) / zoom };
  console.log(`monde attendu x0=${want.x0.toFixed(1)} x1=${want.x1.toFixed(1)} y=${want.y.toFixed(1)} ; lu ${b.map((v) => v.toFixed(1))}`);
  check(Math.abs(b[0] - want.x0) < 6, `x0 aux coordonnées monde (${b[0].toFixed(1)} ≈ ${want.x0.toFixed(1)})`);
  check(Math.abs(b[2] - want.x1) < 6, `x1 aux coordonnées monde (${b[2].toFixed(1)} ≈ ${want.x1.toFixed(1)})`);
  check(Math.abs((b[1] + b[3]) / 2 - want.y) < 6, `y aux coordonnées monde (${((b[1] + b[3]) / 2).toFixed(1)} ≈ ${want.y.toFixed(1)})`);

  // 9. S4 : profil à trois outils.
  await chooseProfile("simple");
  const t3 = await visibleTools();
  check(JSON.stringify(t3) === JSON.stringify(["pen", "eraser", "hand"]), `profil simple : trois outils parmi les neuf (${t3.join(", ")})`);
  await chooseProfile("defaut");
  check((await visibleTools()).length === 9, "profil par défaut : les neuf outils");

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
  const server = await serve();
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-s5b-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const page = await context.newPage();
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp });
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
