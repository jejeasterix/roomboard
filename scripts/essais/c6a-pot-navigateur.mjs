#!/usr/bin/env node
// Essai C6a « pot de peinture » au navigateur (S1 à S5 du cadrage usage-c6a-pot). Application construite (apps/web/dist)
// servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée.
// Oracles : couleurs lues dans `#scene` (`inkIn` avec `rgb`, D27), segments de `#texte-edition` rouvert, attributs de
// `#stage` ; aucune requête hors de 127.0.0.1. Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c6a-pot-navigateur.mjs [--captures]
// (--captures : docs/essais/c6a-pot.png : forme remplie, contour, trait, mot, cellule et fond colorés).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, serve, solidPng, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C6a pot";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
const FONT = '36px "Atkinson Hyperlegible", system-ui, sans-serif';
const SOCLE = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "socle-v1.roomboard");
/** Points de la scène, px de la scène (caméra du premier onglet, largeur ajustée). */
const RECT = [[200, 150], [420, 300]];
const CENTRE = [310, 225];
const NEAR_EDGE = [203, 225];
const STROKE = [[200, 380], [420, 380]];
// À 1280 px, l'îlot d'outils (941 px avec la navigation de page) descend à y = 80 (règle L2-30) ; sa rangée contextuelle du texte
// couvre y = 144 à 200 : le texte est posé sous elle.
const TEXT_AT = [600, 230];
const TABLE_AT = [200, 430];
const VOID = [1100, 560];
const DROP_AT = [1000, 300];
const YELLOW = [250, 204, 21];
const RED = [220, 38, 38];
const BLUE = [29, 78, 216];
const GREEN = [22, 163, 74];
const WHITE = [255, 255, 255];
const RED_CSS = "rgb(220, 38, 38)";
const BLUE_CSS = "rgb(29, 78, 216)";


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
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const c0 = await (async () => {
    await page.goto(url);
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
    await fr();
    return camera();
  })();
  /** Monde d'un point de scène (caméra du premier onglet) ; puis scène d'un point monde par la caméra courante. */
  const world = ([x, y]) => [(x - c0.tx) / c0.zoom, (y - c0.ty) / c0.zoom];
  const screen = async ([wx, wy]) => {
    const c = await camera();
    return [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  };
  const clickWorld = async (w) => {
    const [x, y] = await screen(w);
    await mouse.click(x, y);
    await fr();
  };
  const sq = async (w, r = 8) => {
    const [x, y] = await screen(w);
    return [x - r, y - r, x + r, y + r];
  };
  const near = async (w, rgb, tol = 40, r = 8) => inkIn(page, await sq(w, r), { rgb, tol });
  const pot = async () => {
    await page.click(item("fill"));
    await fr();
  };
  const pick = async (id) => {
    await page.click(`button[data-preset="${id}"]`);
    await fr();
  };
  const none = async () => {
    await page.click("button[data-fill-none]");
    await fr();
  };
  const drag = async (a, b) => {
    await mouse.move(a[0], a[1]);
    await mouse.down();
    await mouse.move(b[0], b[1], { steps: 6 });
    await mouse.up();
    await fr();
  };
  const width = (s) =>
    page.evaluate(([s, font]) => {
      const c = document.createElement("canvas").getContext("2d");
      c.font = font;
      return c.measureText(s).width;
    }, [s, FONT]);
  /** Segments de la zone de saisie : [texte, "rouge" | "bleu" | ""] (couleur du segment lue en `style.color`), voisins
   *  de même couleur fusionnés ; un segment sans couleur du pot vaut "" quelle que soit la couleur héritée. */
  const segs = async () => {
    const raw = await page.$eval("#texte-edition", (z) =>
      [...z.children].filter((e) => e.tagName === "SPAN").map((e) => ({ t: e.textContent ?? "", c: e.style.color })),
    );
    const out = [];
    for (const s of raw) {
      const c = s.c === RED_CSS ? "rouge" : s.c === BLUE_CSS ? "bleu" : "";
      const l = out[out.length - 1];
      if (l && l[1] === c) l[0] += s.t;
      else out.push([s.t, c]);
    }
    return out;
  };
  const openText = async (w) => {
    await page.click(item("text"));
    await fr();
    await clickWorld(w);
    await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
    await fr();
  };
  const openCell = async (w, tag) => {
    await page.click(item("table"));
    await fr();
    await clickWorld(w);
    await waitAttr("data-table", tag);
    await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
    await fr();
  };
  const show = (v) => JSON.stringify(v);
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

  const centre = world(CENTRE);
  const nearEdge = world(NEAR_EDGE);
  const strokeMid = world([310, 380]);
  const voidW = world(VOID);
  const dropW = world(DROP_AT);
  const textW = world(TEXT_AT);
  const tableW = world(TABLE_AT);

  // S1 : rectangle vide, Pot puis Jaune, clic au centre ; Annuler, Rétablir.
  await page.click(item("rect"));
  await fr();
  await drag(RECT[0], RECT[1]);
  await waitAttr("data-elements", "1");
  await pot();
  const box = await stageBox(page);
  check(box.height >= 640, `S5 : Pot actif, la scène garde ${Math.round(box.height)} px de haut (D19)`);
  check(
    (await page.locator("button[data-preset]").count()) === 5 && (await page.locator("button[data-fill-none]").count()) === 1,
    "S1 : Pot actif : cinq couleurs et « Aucune » dans la rangée (D16, D17)",
  );
  await pick("jaune");
  check((await near(centre, YELLOW)) === 0, "S1 : avant le clic, le rectangle est vide");
  await clickWorld(centre);
  check((await near(centre, YELLOW)) > 150, "S1 : clic au centre : le rectangle se remplit de jaune");
  await key("Control+z");
  check((await near(centre, YELLOW)) === 0, "S1 : Annuler : il redevient vide (une étape)");
  await key("Control+y");
  check((await near(centre, YELLOW)) > 150, "S1 : Rétablir : jaune");

  // S2 : contour à 3 px du bord, trait du stylo, « Aucune » au centre.
  await pick("rouge");
  check((await near(nearEdge, RED, 40, 6)) === 0, "S2 : avant le clic, le contour n'est pas rouge");
  await clickWorld(nearEdge);
  check((await near(nearEdge, RED, 40, 6)) > 10, "S2 : clic à 3 px du bord : le contour devient rouge");
  check((await near(centre, YELLOW)) > 150, "S2 : l'intérieur reste jaune");
  await page.click(item("pen"));
  await fr();
  await drag(STROKE[0], STROKE[1]);
  await waitAttr("data-elements", "2");
  await pot();
  check((await near(strokeMid, RED, 40, 6)) === 0, "S2 : le trait est noir avant le clic");
  await clickWorld(strokeMid);
  check((await near(strokeMid, RED, 40, 6)) > 10, "S2 : clic sur le trait : il devient rouge");
  await none();
  await clickWorld(centre);
  check((await near(centre, YELLOW)) === 0, "S2 : « Aucune » au centre : remplissage retiré");
  await key("Control+z");
  check((await near(centre, YELLOW)) > 150, "S2 : Annuler : le jaune revient (une étape)");

  // S4 (début) : fond de la page.
  await pick("bleu");
  await clickWorld(voidW);
  check((await near(voidW, BLUE)) > 150, "S4 : Pot Bleu, clic dans le vide : le fond de la page devient bleu");

  // S3 : mot d'un texte, gardé à l'édition.
  await page.click(item("text"));
  await fr();
  await clickWorld(textW);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  await page.keyboard.type("Le chat noir");
  await key("Escape");
  await waitAttr("data-elements", "3");
  await pot();
  await pick("rouge");
  const chatX = (await width("Le ")) + (await width("chat")) / 2;
  await clickWorld([textW[0] + chatX, textW[1] + 22]);
  await openText([textW[0] + 10, textW[1] + 10]);
  const s3a = await segs();
  console.log(`segments : ${show(s3a)}`);
  check(show(s3a) === show([["Le ", ""], ["chat", "rouge"], [" noir", ""]]), "S3 : clic sur « chat » : seul ce mot devient rouge");
  await key("Home");
  for (let i = 0; i < 3; i++) await key("ArrowRight");
  await page.keyboard.type("gros ");
  await key("Escape");
  await openText([textW[0] + 10, textW[1] + 10]);
  const s3b = await segs();
  check(show(s3b) === show([["Le gros ", ""], ["chat", "rouge"], [" noir", ""]]), `S3 : « Le gros chat noir » : « chat » reste rouge (${show(s3b)})`);
  await key("Escape");

  // S3 : mot d'une cellule (une étape), cellule vide.
  await page.click(item("table"));
  await fr();
  await clickWorld(tableW);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="2 colonnes, 2 lignes"]');
  await waitAttr("data-table", "2x2@0,0");
  await page.keyboard.type("Lundi matin");
  await key("Escape");
  await waitAttr("data-elements", "4");
  await pot();
  await pick("rouge");
  const oneLine = (await width("Lundi matin")) <= 240 - 16;
  const matin = oneLine
    ? [tableW[0] + 8 + (await width("Lundi ")) + (await width("matin")) / 2, tableW[1] + 8 + 22]
    : [tableW[0] + 8 + (await width("matin")) / 2, tableW[1] + 8 + 45 + 22];
  await clickWorld(matin);
  await openCell([tableW[0] + 30, tableW[1] + 20], "2x2@0,0");
  const cell = await segs();
  check(show(cell) === show([["Lundi ", ""], ["matin", "rouge"]]), `S3 : clic sur « matin » : seul ce mot devient rouge (${show(cell)})`);
  await key("Escape");
  await key("Control+z");
  await openCell([tableW[0] + 30, tableW[1] + 20], "2x2@0,0");
  const undone = await segs();
  check(show(undone) === show([["Lundi matin", ""]]), `S3 : Annuler : « matin » n'est plus rouge, texte intact (une étape) (${show(undone)})`);
  await key("Escape");
  await key("Control+y");
  await pot();
  const emptyCell = [tableW[0] + 240 + 120, tableW[1] + 32];
  await clickWorld(emptyCell);
  check((await near(emptyCell, RED)) > 150, "S3 : clic dans le blanc d'une cellule vide : la cellule se remplit");

  if (captures) {
    await fr();
    const path = join(ROOT, "docs", "essais", "c6a-pot.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // S3 : clic sur l'espace entre « Le » et « gros » : tout le texte en bleu, « chat » compris.
  await pick("bleu");
  await clickWorld([textW[0] + (await width("Le")) + (await width(" ")) / 2, textW[1] + 22]);
  await openText([textW[0] + 10, textW[1] + 10]);
  const s3c = await segs();
  check(s3c.length === 1 && s3c[0][1] === "bleu", `S3 : clic sur l'espace : tout le texte devient bleu, « chat » compris (${show(s3c)})`);
  await key("Escape");

  // S4 : image → zone de pixels (C6b) : l'image prend le vert, le fond reste bleu ; clic sur la page vide : fond vert ;
  // « Aucune » dans le vide : blanc ; Annuler : le vert revient.
  await dropFile(page, "#stage", "sombre.png", solidPng(200, 150, [20, 20, 20]), "image/png", DROP_AT);
  await waitAttr("data-elements", "5");
  await pot();
  await pick("vert");
  await clickWorld(dropW);
  await waitAttr("data-pot", "pret");
  // Le bitmap adopté arrive au dessin suivant : quelques images d'animation au plus (15 s).
  for (let i = 0; i < 900 && (await near(dropW, GREEN)) <= 150; i++) await fr();
  check((await near(dropW, GREEN)) > 150, "S4 : clic sur l'image sombre : l'image prend le vert (C6b)");
  check((await near(voidW, BLUE)) > 150, "S4 : le fond de la page ne change pas (bleu)");
  await clickWorld(voidW);
  check((await near(voidW, GREEN)) > 150, "S4 : clic sur la page vide : le fond devient vert");
  await none();
  await clickWorld(voidW);
  check((await near(voidW, WHITE, 6)) > 150, "S4 : « Aucune » dans le vide : fond blanc");
  await key("Control+z");
  check((await near(voidW, GREEN)) > 150, "S4 : Annuler : le vert revient");

  // S5 : enregistrer, rouvrir ; fichier d'avant C6a.
  const file = await saveTo("c6a.roomboard");
  await openFile(file);
  check((await attr("data-elements")) === "5", "S5 : rouvert dans un nouvel onglet, cinq éléments");
  check((await near(centre, YELLOW)) > 150 && (await near(nearEdge, RED, 40, 6)) > 10, "S5 : rouvert : rectangle jaune au contour rouge");
  check((await near(voidW, GREEN)) > 150 && (await near(emptyCell, RED)) > 150, "S5 : rouvert : fond vert, cellule rouge");
  await openText([textW[0] + 10, textW[1] + 10]);
  const reText = await segs();
  check(reText.length === 1 && reText[0][1] === "bleu", `S5 : rouvert : texte bleu (${show(reText)})`);
  await key("Escape");
  await openCell([tableW[0] + 30, tableW[1] + 20], "2x2@0,0");
  const reCell = await segs();
  check(show(reCell) === show([["Lundi ", ""], ["matin", "rouge"]]), `S5 : rouvert : « matin » reste rouge dans la cellule (${show(reCell)})`);
  await key("Escape");
  await openFile(SOCLE);
  check((await near(voidW, WHITE, 6)) > 150, "S5 : socle-v1.roomboard (d'avant C6a) s'ouvre, fond blanc");
  await pot();
  await pick("bleu");
  await clickWorld(voidW);
  check((await near(voidW, BLUE)) > 150, "S5 : le pot colore le fond du fichier d'avant C6a");
  const hFinal = (await stageBox(page)).height;
  check(hFinal >= 640, `S5 : Pot actif, rangée de couleurs ouverte : scène mesurée ${Math.round(hFinal)} px (>= 640)`);
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c6a-"));
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
