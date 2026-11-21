#!/usr/bin/env node
// Essai C4 « bibliothèque » au navigateur (S1 à S3 du cadrage usage-c4-bibliotheque, geste du brief). Application
// construite (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli
// (`?fichiers=repli`), heure figée. Oracles : `#stage[data-elements]`, cartes `.rb-resource[data-resource]`, vignette
// `img.rb-thumb` décodée, valeur du panneau de grille ; aucune requête hors de 127.0.0.1. Lancé par
// scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c4-bibliotheque-navigateur.mjs [--captures]
// (--captures : docs/essais/c4-bibliotheque.png : panneau avec la recherche « frac » et la ressource posée sur la page).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, VIEWPORT, coqueCsp, frames, gitSha, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";

const LABEL = "C4 bibliothèque";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const LIB = "#bibliotheque";
const lib = (k) => `${LIB} [data-lib="${k}"]`;
const card = (path) => `${LIB} .rb-resource[data-resource="${path}"]`;
const GRID_PANEL = "#grille";
const gridField = (k) => `${GRID_PANEL} [data-grille="${k}"]`;

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => void d.accept()); // confirmations (Vider)
  const check = (ok, what) => {
    if (!ok) throw new Echec(what);
    console.log(`ok ${what}`);
  };
  const fr = () => frames(page);
  const attr = (k) => page.getAttribute("#stage", k);
  const waitAttr = (k, v) => page.waitForFunction(([k, v]) => document.querySelector("#stage")?.getAttribute(k) === v, [k, v], { timeout: 15000 });
  const mouse = stageMouse(page);
  // `stageMouse` n'a pas `drag` : celui de c3-groupes-navigateur.mjs.
  const drag = async (x0, y0, x1, y1) => {
    await mouse.move(x0, y0);
    await mouse.down();
    await mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
    await mouse.move(x1, y1, { steps: 4 });
    await mouse.up();
    await fr();
  };
  const openLibrary = async () => {
    if (!(await page.isVisible(LIB))) await page.click(item("library"));
    await page.waitForSelector(LIB);
  };
  // App n'a qu'un signal de panneau : après le panneau de grille, la bibliothèque se rouvre à la racine.
  const openFractions = async () => {
    await openLibrary();
    await page.click(`${LIB} button[data-folder="Fractions"]`);
  };
  const addResource = async (what, name, keywords) => {
    await page.click(lib(what === "grid" ? "add-grid" : "add-selection"));
    await page.fill(lib("name"), name);
    if (keywords) await page.fill(lib("keywords"), keywords);
    await page.click(lib("submit"));
  };
  const dragCardToStage = async (path, at) => {
    const c = await page.locator(card(path)).first().boundingBox();
    const s = await page.locator("#stage").boundingBox();
    if (c === null || s === null) throw new Echec(`glisser : carte ${path} ou scène sans boîte`);
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + at[0], s.y + at[1], { steps: 12 });
    await page.mouse.up();
  };
  const thumbDecoded = (sel) => page.$eval(`${sel} img.rb-thumb`, (img) => img.complete && img.naturalWidth > 0).catch(() => false);
  const gridKind = async () => {
    await page.click(item("grid"));
    await page.waitForSelector(gridField("kind"));
    const v = await page.inputValue(gridField("kind"));
    await page.click(gridField("cancel"));
    return v;
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();

  // S1 : un rectangle, un trait et un texte (cadrage), sélectionnés, groupés (geste de c3-groupes-navigateur.mjs).
  await page.click(item("rect"));
  await drag(120, 120, 220, 200);
  await page.click(item("pen"));
  await drag(120, 260, 360, 260);
  await page.click(item("text"));
  await fr();
  await mouse.click(260, 140);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  await page.keyboard.type("1/2");
  await page.click(item("select")); // le blur valide le texte
  await waitAttr("data-elements", "3");
  await fr();
  await drag(90, 90, 760, 330);
  await waitAttr("data-selection", "3");
  await page.keyboard.press("Control+g");
  await waitAttr("data-grouped", "1");
  check(true, "S1 : trois objets groupés");

  // Dossier « Fractions », ressource « Moitié » (mot-clé « fraction »).
  await openLibrary();
  await page.click(lib("new-folder"));
  await page.fill(lib("folder-name"), "Fractions");
  await page.click(lib("create-folder"));
  await addResource("selection", "Moitié", "fraction");
  await page.waitForSelector(card("Fractions/moitie.rbitem"), { timeout: 15000 });
  check(await thumbDecoded(card("Fractions/moitie.rbitem")), "S1 : carte « Moitié » dans « Fractions », vignette décodée");
  await addResource("selection", "Carré");
  await page.waitForSelector(card("Fractions/carre.rbitem"), { timeout: 15000 });
  check(true, "S1 : seconde ressource « Carré », sans mot-clé « fraction »");

  await page.fill(lib("search"), "frac");
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 1, `${lib("results")} .rb-resource`, { timeout: 15000 });
  const found = await page.getAttribute(`${lib("results")} .rb-resource`, "data-resource");
  check(found === "Fractions/moitie.rbitem", `S1 : « frac » : une seule ressource, ${found}`);
  check(!(await page.isVisible(`${lib("results")} .rb-resource[data-resource="Fractions/carre.rbitem"]`)), "S1 : « frac » : « Carré » disparaît");
  check(await thumbDecoded(`${lib("results")} .rb-resource`), "S1 : résultat avec sa vignette");
  const box = await page.locator("#stage").boundingBox();
  check(box !== null && box.width >= 640 && box.height >= 640, `S1 : scène ≥ 640 px, panneau ouvert (${box?.width} × ${box?.height})`);

  // Autre page, glisser la carte du résultat : trois objets ; Annuler ; Rétablir.
  await page.click(item("page-add"));
  await waitAttr("data-elements", "0");
  await dragCardToStage("Fractions/moitie.rbitem", [300, 300]);
  await waitAttr("data-elements", "3");
  check(true, "S1 : glissée sur la page 2 : trois objets insérés");
  if (captures) {
    const path = join(ROOT, "docs", "essais", "c4-bibliotheque.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }
  await page.click(item("undo"));
  await waitAttr("data-elements", "0");
  check(true, "S1 : Annuler : page vide");
  await page.click(item("redo"));
  await waitAttr("data-elements", "3");
  check(true, "S1 : Rétablir : les trois objets reviennent");
  await page.fill(lib("search"), "");

  // S2 : grille Seyès sur une page, enregistrée en ressource, déposée sur une page sans grille.
  await page.click(item("page-add"));
  await page.click(item("grid"));
  await page.waitForSelector(gridField("kind"));
  await page.selectOption(gridField("kind"), "seyes");
  await page.click(gridField("apply"));
  check((await gridKind()) === "seyes", "S2 : page 3 en Seyès");
  await openFractions();
  await addResource("grid", "Seyès");
  await page.waitForSelector(card("Fractions/seyes.rbitem"), { timeout: 15000 });
  await page.click(item("page-add"));
  check((await gridKind()) === "none", "S2 : page 4 sans grille");
  await openFractions();
  await dragCardToStage("Fractions/seyes.rbitem", [300, 300]);
  let dropped = "none";
  for (const t0 = Date.now(); dropped !== "seyes" && Date.now() - t0 < 15000; ) dropped = await gridKind();
  check(dropped === "seyes", "S2 : « Seyès » déposée : la page 4 porte la grille Seyès");
  await page.click(item("undo"));
  check((await gridKind()) === "none", "S2 : Annuler : plus de grille");
  await page.click(item("redo"));
  check((await gridKind()) === "seyes", "S2 : Rétablir : la grille revient");

  // S3 : exporter « Fractions », vider, réimporter, recharger.
  await openFractions();
  const download = page.waitForEvent("download");
  await page.click(lib("export"));
  const d = await download;
  check(d.suggestedFilename() === "Fractions.rbpack", `S3 : export : ${d.suggestedFilename()}`);
  const pack = join(tmp, "Fractions.rbpack");
  await d.saveAs(pack);
  await page.click(lib("up")).catch(() => undefined);
  await page.click(lib("clear"));
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 0, `${LIB} section[data-root="mine"] .rb-resource, ${LIB} section[data-root="mine"] button[data-folder]`, { timeout: 15000 });
  check(true, "S3 : Vider : « Mes ressources » est vide");
  const chooser = page.waitForEvent("filechooser");
  await page.click(lib("import"));
  await (await chooser).setFiles(pack);
  await page.waitForSelector(card("Fractions/moitie.rbitem"), { timeout: 15000 });
  await page.waitForSelector(card("Fractions/seyes.rbitem"), { timeout: 15000 });
  check(await thumbDecoded(card("Fractions/moitie.rbitem")), "S3 : réimporté : « Moitié » (vignette) et « Seyès » dans « Fractions »");
  await page.fill(lib("search"), "frac");
  await page.waitForFunction((sel) => document.querySelectorAll(sel).length === 1, `${lib("results")} .rb-resource`, { timeout: 15000 });
  check(true, "S3 : réimporté : le mot-clé « fraction » est gardé");

  await page.reload();
  await page.waitForSelector("#stage");
  await fr();
  await openLibrary();
  await page.click(`${LIB} button[data-folder="Fractions"]`);
  await page.waitForSelector(card("Fractions/moitie.rbitem"), { timeout: 15000 });
  await page.waitForSelector(card("Fractions/seyes.rbitem"), { timeout: 15000 });
  check(true, "S3 : rechargé : la bibliothèque est la même");
  const before = Number(await attr("data-elements"));
  await dragCardToStage("Fractions/moitie.rbitem", [300, 300]);
  await waitAttr("data-elements", String(before + 3));
  check(true, "S3 : après rechargement, « Moitié » glissée : trois objets insérés");

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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c4-"));
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
