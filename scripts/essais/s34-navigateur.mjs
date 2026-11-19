#!/usr/bin/env node
// Scénarios S3 et S4 au navigateur (lot 4, T57). L'application construite (apps/web/dist) est servie en local
// (serveur lancé et arrêté par ce script), Chromium headless de Playwright, souris et clavier simulés, IME simulée.
// Parcours : deux pages ajoutées ; page 1 un texte par IME ; page 2 un trait ; page 3 rectangle, ellipse, ligne,
// flèche, texte validé par un clic ailleurs ; sélection au rectangle, Maj + clic, Échap, déplacer, agrandir x2,
// Suppr ; Ctrl+Z geste par geste ; retrait de pages. Hors de scripts/verifier.sh.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/s34-navigateur.mjs [--captures]   (docs/essais/s34-lot4-{selection,forme-texte,pages}.png)
// Ne couvre pas : le rendu WebGL2 (S2 lot 3b), l'IME réelle d'un système (seulement la simulation CDP ou
// synthétique), le tactile, la rotation, l'export, le multi-fenêtre.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DIST, ROOT, Echec, frames, gitSha, inkIn, loadPlaywright, serve } from "./commun.mjs";

const LABEL = "S3/S4 lot 4";
const TOOLS = ["select", "rect", "ellipse", "line", "arrow", "text"];

async function scenario(page, url, captures) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const attr = (name) => page.getAttribute("#stage", name);
  const elements = async () => Number(await attr("data-elements"));
  const selection = async () => (await attr("data-selection")) ?? "";
  const nSel = async () => ((await selection()) === "" ? 0 : (await selection()).split(",").length);
  const bounds = async () => ((await attr("data-bounds")) ?? "").split(",").map(Number);
  const edit = (action) => page.$(`#edition button[data-action="${action}"]`);
  const click = async (action) => {
    await (await edit(action)).click();
    await frames(page);
  };
  const pageTag = () => attr("data-page");
  const drag = async (pts, opts = {}) => {
    await page.mouse.move(pts[0][0], pts[0][1]);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.up();
    await frames(page);
  };
  const undo = async () => {
    await page.keyboard.press("Control+z");
    await frames(page);
  };
  const shot = async (name) => {
    if (!captures) return;
    const path = join(ROOT, "docs", "essais", `s34-lot4-${name}.png`);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);

  // Rouge attendu avant T58 : la ligne #edition manque.
  const absent = [];
  for (const t of TOOLS) if (!(await edit(t))) absent.push(t);
  if (absent.length > 0) throw new Echec(`boutons absents : ${absent.join(", ")}`);
  const missingPages = [];
  for (const t of ["page-prev", "page-next", "page-add", "page-remove"]) if (!(await edit(t))) missingPages.push(t);
  if (missingPages.length > 0) throw new Echec(`boutons absents : ${missingPages.join(", ")}`);

  // Pages : deux ajouts.
  check((await pageTag()) === "1/1", "départ : page 1/1");
  await click("page-add");
  await click("page-add");
  check((await pageTag()) === "3/3", "deux pages ajoutées : on est sur la page 3/3");
  check(((await page.textContent("#pages")) ?? "").replace(/\s/g, "") === "3/3", "compteur #pages : 3 / 3");
  await click("page-prev");
  await click("page-prev");
  check((await pageTag()) === "1/3", "retour à la page 1/3");

  // Page 1 : texte par IME simulée.
  await click("text");
  await page.mouse.click(300, 300);
  await frames(page);
  const area = await page.waitForSelector("textarea#texte-edition", { state: "visible", timeout: 5000 });
  await area.focus();
  let imeMode = "CDP";
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Input.imeSetComposition", { text: "ni", selectionStart: 2, selectionEnd: 2 });
    await frames(page);
    check((await page.$eval("#texte-edition", (t) => t.value)) !== "bonjour", "composition en cours");
    check((await elements()) === 0, "pendant la composition : rien d'écrit dans le document");
    await cdp.send("Input.insertText", { text: "bonjour" });
  } catch {
    imeMode = "synthétique";
    await page.$eval("#texte-edition", (t) => {
      t.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      t.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: "ni" }));
    });
    check((await elements()) === 0, "pendant la composition (synthétique) : rien d'écrit");
    await page.$eval("#texte-edition", (t) => {
      t.value = "bonjour";
      t.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "bonjour" }));
      t.dispatchEvent(new InputEvent("input", { bubbles: true, data: "bonjour", inputType: "insertCompositionText" }));
    });
  }
  console.log(`IME : ${imeMode}`);
  await frames(page);
  await page.mouse.click(900, 600); // clic ailleurs : valide le texte
  await frames(page);
  check((await elements()) === 1, "page 1 : le texte est écrit (un élément)");

  // Page 2 : un trait.
  await click("page-next");
  check((await pageTag()) === "2/3", "page 2/3");
  await (await page.$('#barre button[data-action="pen"]')).click();
  await drag([[400, 350], [700, 400], [900, 350]]);
  check((await elements()) === 1, "page 2 : un trait");
  const inkP2 = await inkIn(page, [380, 330, 920, 420]);
  check(inkP2 > 0, "page 2 : encre visible");

  // Page 3 : formes et texte.
  await click("page-next");
  check((await pageTag()) === "3/3", "page 3/3");
  check((await elements()) === 0, "page 3 : vide au départ");
  await click("rect");
  await drag([[200, 200], [320, 280]]);
  await click("ellipse");
  await drag([[400, 200], [520, 280]]);
  await click("line");
  await drag([[200, 400], [320, 460]]);
  await click("arrow");
  await drag([[400, 400], [520, 460]]);
  check((await elements()) === 4, "page 3 : rectangle, ellipse, ligne, flèche (quatre éléments)");
  await click("text");
  await page.mouse.click(700, 300);
  await frames(page);
  const area2 = await page.waitForSelector("textarea#texte-edition", { state: "visible", timeout: 5000 });
  await area2.focus();
  await page.keyboard.type("note");
  await page.mouse.click(900, 600); // clic ailleurs : valide
  await frames(page);
  check((await elements()) === 5, "page 3 : second texte validé par un clic ailleurs (cinq éléments)");
  await shot("forme-texte");

  // Sélection au rectangle : deux formes (rectangle et ellipse).
  await click("select");
  await drag([[180, 180], [540, 300]]);
  check((await nSel()) === 2, "sélection au rectangle : deux formes");
  await page.keyboard.down("Shift");
  await page.mouse.click(260, 430); // la ligne
  await page.keyboard.up("Shift");
  await frames(page);
  check((await nSel()) === 3, "Maj + clic : la ligne s'ajoute (trois éléments)");
  await page.keyboard.press("Escape");
  await frames(page);
  check((await nSel()) === 0, "Échap : sélection vidée");

  // Re-sélection, déplacement, agrandissement, suppression.
  await drag([[180, 180], [540, 300]]);
  const b0 = await bounds();
  check(b0.length === 4 && b0.every(Number.isFinite), "bornes de la sélection lues");
  await drag([[260, 240], [310, 290]]);
  const b1 = await bounds();
  check(Math.abs(b1[0] - b0[0] - 50) < 2 && Math.abs(b1[1] - b0[1] - 50) < 2, "déplacer : la sélection suit (+50, +50)");
  const w1 = b1[2] - b1[0];
  await drag([[b1[2], b1[3]], [b1[2] + w1, b1[3] + (b1[3] - b1[1])]]); // poignée du coin bas droit
  const b2 = await bounds();
  check(Math.abs(b2[2] - b2[0] - 2 * w1) < 3, "agrandir x2 par la poignée de coin");
  await shot("selection");
  const before = await elements();
  await page.keyboard.press("Delete");
  await frames(page);
  check((await elements()) === before - 2, "Suppr : les deux formes partent");

  // Ctrl+Z : une étape par geste.
  await undo();
  check((await elements()) === before, "Ctrl+Z annule la suppression");
  await undo();
  check(Math.abs((await bounds())[2] - (await bounds())[0] - w1) < 3, "Ctrl+Z annule l'agrandissement");
  await undo();
  const b3 = await bounds();
  check(Math.abs(b3[0] - b0[0]) < 2, "Ctrl+Z annule le déplacement");

  // Retrait de pages.
  await click("page-prev");
  check((await pageTag()) === "2/3", "retour page 2/3");
  await click("page-remove");
  check((await pageTag()) === "1/2", "page 2 retirée : la précédente s'affiche (1/2)");
  await undo();
  check((await pageTag()) === "2/3", "Ctrl+Z rend la page 2");
  check((await inkIn(page, [380, 330, 920, 420])) > 0, "la page 2 retrouve son trait");
  await shot("pages");
  await click("page-remove");
  await click("page-remove");
  check((await pageTag()) === "1/1", "deux retraits : une seule page");
  check(await (await edit("page-remove")).isDisabled(), "la dernière page ne se retire pas");

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
    console.error(
      `${LABEL} : outil absent — Playwright introuvable (le poser : npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=<chemin de playwright/index.mjs>)`,
    );
    return 2;
  }
  const server = await serve();
  const port = server.address().port;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await scenario(page, `http://127.0.0.1:${port}/`, process.argv.includes("--captures"));
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
