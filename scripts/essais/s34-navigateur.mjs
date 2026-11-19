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
const NON_COUVERT = [
  "enregistrer puis rouvrir (S3) : couvert par le cœur, s3_text_stroke_shape_survive_save_load (T49) ; fichier au lot 5",
  "zoom à 200 % par Ctrl+molette puis trait aux coordonnées monde (S4) : tests du moteur (lot 3b), pas rejoué ici",
  "profil de barre essai-simple (S4) : lot 5",
  "WebKit (S4) : Playwright WebKit non posé sur la VM ; essai sur le Mac",
  "IME réelle (Windows, macOS, Android), fenêtre de candidats (HL4-3) : essai ENI",
  "stylet réel, poignées au doigt : essai ENI (docs/essais/eni-stylet.md, « Lot 4 : à essayer »)",
];
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
  const nSel = async () => Number((await selection()) || 0); // data-selection porte le nombre d'éléments (stageTags)
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
  const redo = async () => {
    await page.keyboard.press("Control+y");
    await frames(page);
  };
  const editorOpen = () => page.isVisible("#texte-edition");
  // Relit le contenu d'un texte écrit : l'outil Texte, au clic sur lui, rouvre la zone avec son contenu ; Échap referme sans écrire.
  const readText = async (x, y, expected, msg) => {
    await click("text");
    await page.mouse.click(x, y);
    await frames(page);
    check(await editorOpen(), "clic sur un texte écrit : la zone se rouvre");
    check((await page.inputValue("#texte-edition")) === expected, msg);
    await page.keyboard.press("Escape");
    await frames(page);
    check(!(await editorOpen()), "Échap : la zone se referme");
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

  // Pages : deux ajouts, Ctrl+Z puis Ctrl+Y.
  check((await pageTag()) === "1/1", "départ : page 1/1");
  await click("page-add");
  await click("page-add");
  check((await pageTag()) === "3/3", "deux pages ajoutées : on est sur la page 3/3");
  check(((await page.textContent("#pages")) ?? "").replace(/\s/g, "") === "3/3", "compteur #pages : 3 / 3");
  await undo();
  check((await pageTag()) === "2/2", "Ctrl+Z : l'ajout est annulé, la page précédente est montrée (2/2)");
  await redo();
  check((await pageTag()) === "3/3", "Ctrl+Y : la page ajoutée revient et est montrée (3/3)");
  await click("page-prev");
  await click("page-prev");
  check((await pageTag()) === "1/3", "retour à la page 1/3");

  // Page 1 : texte par IME simulée (composition « ni »).
  await click("text");
  await page.mouse.click(300, 300);
  await frames(page);
  const area = await page.waitForSelector("textarea#texte-edition", { state: "visible", timeout: 5000 });
  check(await editorOpen(), "outil Texte : la zone de saisie s'ouvre au clic");
  check((await page.evaluate(() => document.activeElement?.id)) === "texte-edition", "la zone de saisie a le focus");
  await area.focus();
  await page.evaluate(() => {
    window.__ime = [];
    window.__elementsAtEnd = null;
    // Phase de capture sur window : passe avant les écouteurs de la zone de saisie (donc avant toute écriture).
    window.addEventListener("compositionstart", () => window.__ime.push("compositionstart"), true);
    window.addEventListener(
      "compositionend",
      () => {
        window.__ime.push("compositionend");
        window.__elementsAtEnd = document.getElementById("stage").dataset.elements;
      },
      true,
    );
  });
  const ime = () => page.evaluate(() => window.__ime);
  const cdp = await page.context().newCDPSession(page);
  let imeMode = "CDP Input.imeSetComposition";
  try {
    await cdp.send("Input.imeSetComposition", { text: "ni", selectionStart: 2, selectionEnd: 2 });
  } catch {
    imeMode = "synthétique";
  }
  await frames(page);
  if (imeMode.startsWith("CDP") && !(await ime()).includes("compositionstart")) imeMode = "synthétique";
  if (imeMode === "synthétique") {
    await page.$eval("#texte-edition", (t) => {
      t.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
      t.value = "ni";
      t.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: "ni" }));
    });
    await frames(page);
  }
  console.log(`IME : ${imeMode}`);
  check((await ime()).includes("compositionstart"), "compositionstart vu : la composition a eu lieu");
  check((await page.inputValue("#texte-edition")) === "ni", "pendant la composition : la zone porte « ni »");
  check((await elements()) === 0, "pendant la composition : rien d'écrit dans le document");
  await page.$eval("#texte-edition", (t) =>
    t.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", isComposing: true, bubbles: true, cancelable: true })),
  );
  await frames(page);
  check((await elements()) === 0 && (await editorOpen()), "Échap pendant la composition : laissé à l'IME (rien d'écrit, zone ouverte)");
  await page.mouse.click(900, 600); // validation demandée pendant la composition
  await frames(page);
  check((await elements()) === 0 && (await editorOpen()), "clic ailleurs pendant la composition : rien n'est écrit avant compositionend");
  if (imeMode === "synthétique") {
    await page.$eval("#texte-edition", (t) => t.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "ni" })));
  } else {
    await cdp.send("Input.insertText", { text: "ni" }); // la composition se valide : compositionend
  }
  await frames(page);
  check((await ime()).includes("compositionend"), "compositionend vu");
  check((await page.evaluate(() => window.__elementsAtEnd)) === "0", "rien n'était écrit au moment de compositionend");
  check((await elements()) === 1 && !(await editorOpen()), "après compositionend : le texte est écrit, la zone fermée");
  check((await inkIn(page, [296, 296, 340, 330])) > 0, "le texte est peint sur la scène");
  await readText(310, 310, "ni", "contenu du texte écrit : « ni »");
  await undo();
  check((await elements()) === 0, "Ctrl+Z : le texte part (une étape)");
  await redo();
  check((await elements()) === 1, "Ctrl+Y : le texte revient");

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
  check((await elements()) === 1, "rectangle posé au relâché");
  await undo();
  check((await elements()) === 0, "Ctrl+Z : le rectangle part (une étape)");
  await redo();
  check((await elements()) === 1, "Ctrl+Y : le rectangle revient");
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
  check(!(await editorOpen()), "la zone de texte est fermée après le clic ailleurs");
  await shot("forme-texte"); // avant la relecture : la zone rouverte masque le texte jusqu'à sa fermeture
  await readText(710, 310, "note", "contenu du second texte : « note »");

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

  // Re-sélection, déplacement de 100 px écran par l'INTÉRIEUR du rectangle (vide), agrandissement, suppression.
  await drag([[180, 180], [540, 300]]);
  const b0 = await bounds();
  check(b0.length === 4 && b0.every(Number.isFinite), "bornes de la sélection lues");
  // Bornes en unités de page, gestes en px écran : k (unités par px) se lit d'abord sur la largeur de la sélection
  // (320 px écran, épaisseur du trait en plus), puis sert à demander un déplacement de 100 unités.
  const kEstimate = (b0[2] - b0[0]) / 320;
  const px = 100 / kEstimate;
  await drag([[260, 240], [260 + px / 2, 240], [260 + px, 240]]);
  const b1 = await bounds();
  const dx = b1[0] - b0[0];
  const k = dx / px; // zoom déduit du geste lui-même
  console.log(`zoom déduit : ${k.toFixed(4)} unité par px (${px.toFixed(1)} px écran = ${dx.toFixed(1)} unités)`);
  check(Math.abs(dx - 100) < 2, `déplacer : la sélection suit de 100 unités (${dx.toFixed(1)}, tolérance 2)`);
  check(Math.abs(b1[1] - b0[1]) < 2 && (await nSel()) === 2, "déplacer : pas de dérive verticale, sélection gardée");
  check(Math.abs(kEstimate - k) / k < 0.03, "zoom déduit cohérent avec la largeur de la sélection (320 px écran)");
  const w1 = b1[2] - b1[0];
  const h1 = b1[3] - b1[1];
  const cx = 520 + px;
  await drag([[cx, 280], [cx + 160, 320], [cx + 320, 360]]); // coin bas droit de l'union déplacée ; largeur et hauteur ×2
  const b2 = await bounds();
  const w2 = b2[2] - b2[0];
  const h2 = b2[3] - b2[1];
  // Les bornes sont élargies par l'épaisseur du trait (fixe) : géométrie 320 px × 80 px écran, doublée.
  const wantW = 1 + (320 * k) / w1;
  const wantH = 1 + (80 * k) / h1;
  check(Math.abs(w2 / w1 - wantW) < 1e-3, `agrandir : largeur ×${(w2 / w1).toFixed(4)} (attendu ×${wantW.toFixed(4)})`);
  check(Math.abs(h2 / h1 - wantH) < 1e-3, `agrandir : hauteur ×${(h2 / h1).toFixed(4)} (attendu ×${wantH.toFixed(4)})`);
  check(Math.abs(b2[0] - b1[0]) < 0.2 && Math.abs(b2[1] - b1[1]) < 0.2, "agrandir : le coin opposé reste fixe");
  await shot("selection");
  const before = await elements();
  await page.keyboard.press("Delete");
  await frames(page);
  check((await elements()) === before - 2, "Suppr : les deux formes partent");

  // Ctrl+Z : une étape par geste.
  await undo();
  check((await elements()) === before, "Ctrl+Z annule la suppression");
  // La sélection se vide avec la suppression (elle ne revient pas avec Ctrl+Z) : on resélectionne pour mesurer.
  await undo();
  await drag([[180 + px, 180], [540 + px + 100, 300]]);
  const b21 = await bounds();
  check(Math.abs(b21[2] - b21[0] - w1) < 0.3 && Math.abs(b21[3] - b21[1] - h1) < 0.3, "Ctrl+Z annule l'agrandissement");
  await undo();
  await drag([[180, 180], [540, 300]]);
  const b3 = await bounds();
  check(Math.abs(b3[0] - b0[0]) < 0.2 && Math.abs(b3[1] - b0[1]) < 0.2, "Ctrl+Z annule le déplacement");

  // Retrait de pages.
  await click("page-prev");
  check((await pageTag()) === "2/3", "retour page 2/3");
  await click("page-remove");
  check((await pageTag()) === "1/2", "page 2 retirée : la précédente s'affiche (1/2)");
  await undo();
  check((await pageTag()) === "2/3", "Ctrl+Z rend la page 2");
  check((await inkIn(page, [380, 330, 920, 420])) > 0, "la page 2 retrouve son trait");
  await click("page-remove");
  await click("page-remove");
  check((await pageTag()) === "1/1", "deux retraits : une seule page");
  check(await (await edit("page-remove")).isDisabled(), "la dernière page ne se retire pas");
  await shot("pages"); // une page, « 1 / 1 », « Retirer la page » grisé

  // Le dernier bouton cliqué ne garde pas le focus : Entrée ne le redéclenche pas (outil autre que Texte).
  await click("page-add");
  check((await pageTag()) === "2/2", "Ajouter une page : page 2/2");
  await (await page.$('#barre button[data-action="pen"]')).click();
  await click("page-add");
  check((await pageTag()) === "3/3", "Ajouter une page : page 3/3");
  await drag([[400, 350], [700, 400]]);
  await page.keyboard.press("Enter");
  await frames(page);
  check((await pageTag()) === "3/3", "Entrée après un trait : le compteur ne bouge pas (3/3)");

  for (const n of NON_COUVERT) console.log(`non couvert — ${n}`);
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
