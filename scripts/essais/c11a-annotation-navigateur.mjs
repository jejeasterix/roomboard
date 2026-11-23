#!/usr/bin/env node
// Essai C11a au navigateur (annotation de bureau) : S1 (web : ni « Annotation du bureau » ni « Déposer ici » ;
// « Annotation au démarrage » rechargé : tableau, #etat vide, aucune boîte, scène ≥ 640 px ; puis avec le faux hôte,
// démarrage direct en annotation), S2 (`?annotation=faux` : entrée, barre seule, bascule dessin / souris, sortie,
// onglet « Annotation », document en base64 à l'entrée et à la sortie, réentrée), S3 (dépôt d'une image puis d'un
// .roomboard d'avant C11a sur « Déposer ici »). Chromium headless de Playwright, `?fichiers=repli` (alert et confirm
// du navigateur). Code de sortie : 0 réussi, 1 échec, 2 outil absent. Hors de verifier.sh sans --e2e.
// Usage : node scripts/essais/c11a-annotation-navigateur.mjs [--captures]   (/tmp/c11a-annotation.png, non commitée)
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, dropFile, frames, gitSha, item, loadPlaywright, serve, solidPng, stageBox } from "./commun.mjs";

const LABEL = "C11a";
const LAYOUT = ".rb-layout";
const ZONE = '[data-item="depot-annotation"]';
const OLD_DOC = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "socle-v1.roomboard");

const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};

function watch(page) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.accept();
  });
  return { errors, dialogs };
}

async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  await frames(page);
}
const body = (page, key) => page.evaluate((k) => document.body.dataset[k] ?? null, key);
async function waitBody(page, key, value) {
  await page.waitForFunction(([k, v]) => document.body.dataset[k] === v, [key, value], { timeout: 15000 });
  await frames(page);
}
async function waitMode(page, mode) {
  await page.waitForSelector(`${LAYOUT}[data-mode="${mode}"]`, { timeout: 15000 });
  await frames(page);
}
async function waitDialog(dialogs, from) {
  const t0 = Date.now();
  while (dialogs.length <= from) {
    if (Date.now() - t0 > 15000) throw new Echec("aucune boîte reçue");
    await new Promise((r) => setTimeout(r, 50));
  }
  return dialogs[from];
}
const text = async (page, sel) => ((await page.textContent(sel)) ?? "").trim();

async function s1(page, base) {
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  check((await page.locator(item("desktop-annotation")).count()) === 0, "S1 web : pas d'« Annotation du bureau »");
  check((await page.locator(ZONE).count()) === 0, "S1 web : pas de « Déposer ici »");
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click('[data-profile="annotation"]');
  await frames(page);
  const d0 = w.dialogs.length;
  await page.reload();
  await ready(page);
  check((await text(page, "#etat")) === "", "S1 annotation au démarrage, web : #etat vide");
  check((await page.locator(`${LAYOUT}[data-mode="board"]`).count()) === 1, "S1 : tableau ordinaire (data-mode=board)");
  check(w.dialogs.length === d0, "S1 : aucune boîte");
  const box = await stageBox(page);
  check(box.height >= 640, `S1 : scène ${box.height} px ≥ 640`);
  // P22 : même profil, faux hôte : démarrage direct en annotation.
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await page.waitForSelector(`${LAYOUT}[data-mode="annotation"]`, { timeout: 15000 });
  check((await body(page, "annotation")) === "1", "S1 : « Annotation au démarrage » + faux hôte : démarre en annotation");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "board");
  check(w.errors.length === 0, `S1 : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
}

async function s2s3(page, base, captures) {
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  // S2
  check((await page.locator(item("desktop-annotation")).count()) === 1, "S2 : « Annotation du bureau » dans la barre (faux hôte)");
  check((await page.locator(ZONE).count()) === 0, "S2 tableau : « Déposer ici » caché");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "annotation");
  await waitBody(page, "annotation", "1");
  check((await body(page, "pointeur")) === "draw", "S2 : annotate ouverte en mode dessin (data-pointeur=draw)");
  check(
    (await page.getAttribute(item("desktop-annotation"), "aria-pressed")) === "true" && (await text(page, item("desktop-annotation"))) === "Quitter l'annotation",
    "S2 : bouton enfoncé « Quitter l'annotation »",
  );
  check(Number(await body(page, "annotationRecu")) > 0, `S2 : .roomboard reçu en base64 à l'entrée (${await body(page, "annotationRecu")} o)`);
  check(!(await page.locator(".rb-head").isVisible()) && !(await page.locator("#stage").isVisible()), "S2 : barre seule (onglets et scène masqués)");
  if (captures) {
    await page.screenshot({ path: "/tmp/c11a-annotation.png" });
    console.log("capture : /tmp/c11a-annotation.png");
  }
  await page.click(item("select"));
  await waitBody(page, "pointeur", "mouse");
  check(true, "S2 : Sélection → data-pointeur=mouse");
  await page.click(item("pen"));
  await waitBody(page, "pointeur", "draw");
  check(true, "S2 : Stylo → data-pointeur=draw");
  await page.click(item("annotation-pointer"));
  await waitBody(page, "pointeur", "mouse");
  check((await text(page, item("annotation-pointer"))) === "Dessin", "S2 : bouton « Souris » → souris, libellé « Dessin »");
  await page.click(item("annotation-pointer"));
  await waitBody(page, "pointeur", "draw");
  check(true, "S2 : bouton « Dessin » → dessin (aller-retour)");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "board");
  await waitBody(page, "annotation", "0");
  check(Number(await body(page, "annotationRendu")) > 0, `S2 : .roomboard rendu en base64 à la sortie (${await body(page, "annotationRendu")} o)`);
  const ann = page.locator(`${TAB}[data-kind="annotation"]`);
  check((await ann.count()) === 1 && (await ann.textContent()).includes("Annotation"), "S2 : onglet « Annotation » gardé dans les onglets");
  check((await page.getAttribute(`${TAB}[aria-selected="true"]`, "data-kind")) === "board", "S2 : onglet d'origine montré");
  const box = await stageBox(page);
  check(box.height >= 640, `S2 : scène ${box.height} px ≥ 640 après le retour`);
  await page.click(item("desktop-annotation"));
  await waitBody(page, "annotationEntrees", "2");
  check(Number(await body(page, "annotationRecu")) > 0, "S2 : réentrée : document de l'onglet d'annotation reçu");
  // S3 (en annotation)
  check((await page.locator(ZONE).count()) === 1, "S3 : « Déposer ici » visible en annotation");
  const d0 = w.dialogs.length;
  await dropFile(page, ZONE, "carre.png", solidPng(40, 40, [220, 30, 30]), "image/png");
  await waitMode(page, "board");
  const avis = await waitDialog(w.dialogs, d0);
  check(avis.message === "ajouté à la page 1", `S3 : avis « ${avis.message} »`);
  check((await page.locator(`${TAB}[data-kind="annotation"]`).count()) === 1, "S3 : onglet d'annotation gardé");
  check((await page.getAttribute(`${TAB}[aria-selected="true"]`, "data-kind")) === "board", "S3 : image sur l'onglet d'origine, montré");
  check((await page.getAttribute("#stage", "data-modifie")) === "1", "S3 : onglet d'origine modifié (image insérée)");
  const before = await page.locator(TAB).count();
  const origin = await page.getAttribute(`${TAB}[aria-selected="true"]`, "data-tab");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "annotation");
  await dropFile(page, ZONE, "socle-v1.roomboard", await readFile(OLD_DOC), "");
  await waitMode(page, "board");
  await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel).length === n, [TAB, before + 1], { timeout: 15000 });
  const shown = page.locator(`${TAB}[aria-selected="true"]`);
  check((await shown.getAttribute("data-tab")) !== origin && (await shown.textContent()).includes("socle-v1"), "S3 : .roomboard d'avant C11a ouvert dans un nouvel onglet montré");
  check((await page.locator(`${TAB}[data-tab="${origin}"]`).count()) === 1, "S3 : onglet d'origine inchangé (toujours là)");
  check(w.errors.length === 0, `S2-S3 : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
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
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const a = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await s1(await a.newPage(), base);
    await a.close();
    const b = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await s2s3(await b.newPage(), base, process.argv.includes("--captures"));
    await b.close();
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
