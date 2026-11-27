#!/usr/bin/env node
// Essai C11b au navigateur (capture du bureau et envoi au tableau, faux hôte `?annotation=faux`) : S1 (bureau vivant,
// `&encre=1` : « Envoyer au tableau » insère la page 2 de 3 après la page montrée, fond capturé #3366cc, trait
// sélectionnable, Ctrl+Z / Ctrl+Y, enregistrer puis rouvrir), S2 (`&capture=refus`, `&capture=wayland` : fond blanc et
// avis ; sans encre : « rien à envoyer »), S3 (« Figer le bureau » : fenêtre opaque, pas de clic à travers, « Envoyer
// dans un nouvel onglet », réentrée figée, « Bureau vivant » ; `&transparence=non` : repli figé, « Recapturer le
// bureau » ; profil « Annotation au démarrage » : nouvel onglet, « Envoyer dans un nouvel onglet » grisé). Scène ≥ 640 px
// après chaque retour. Chromium headless de Playwright, `?fichiers=repli`. Code de sortie : 0 réussi, 1 échec, 2 outil
// absent. Hors de verifier.sh sans --e2e.
// Usage : node scripts/essais/c11b-capture-navigateur.mjs [--captures]   (/tmp/c11b-capture.png, non commitée)
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, TAB, VIEWPORT, clickItem, frames, gitSha, inkIn, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C11b";
const LAYOUT = ".rb-layout";
const BLUE = [0x33, 0x66, 0xcc];
const WHITE = [255, 255, 255];
const DENIED =
  "capture du bureau impossible (autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard) : page à fond blanc";
const WAYLAND = "capture du bureau impossible (Wayland) : page à fond blanc";
/** Milieu du trait du faux hôte (P30) : de (200, 200) à (600, 200) ; le faux hôte ne rend pas de vue : identité. */
const INK_MID = [400, 200];

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

/** design-l4 (L4-16) : l'avis d'envoi est lu dans le bandeau, plus dans une boîte. */
async function waitToast(page) {
  const t = page.locator(".rb-toast");
  await t.waitFor({ state: "visible", timeout: 15000 });
  return ((await t.textContent()) ?? "").trim();
}
const text = async (page, sel) => ((await page.textContent(sel)) ?? "").trim();
const stageAttr = (page, name) => page.getAttribute("#stage", name);
/** Attend que l'attribut `name` de #stage vérifie l'expression régulière `source`. */
async function waitStage(page, name, source) {
  await page.waitForFunction(
    ([n, src]) => new RegExp(src).test(document.querySelector("#stage")?.getAttribute(n) ?? ""),
    [name, source],
    { timeout: 15000 },
  );
  await frames(page);
}
async function camera(page) {
  const [zoom, tx, ty] = ((await stageAttr(page, "data-camera")) ?? "").split(",").map(Number);
  return { zoom, tx, ty };
}
/** Fond au centre de la scène : un carré de 9 × 9 px de la couleur `rgb` (± 8), une fois le bitmap décodé. */
async function centerIs(page, rgb) {
  for (let i = 0; i < 40; i++) {
    const b = await stageBox(page);
    const [cx, cy] = [Math.round(b.width / 2), Math.round(b.height / 2)];
    if ((await inkIn(page, [cx - 4, cy - 4, cx + 5, cy + 5], { rgb, tol: 8 })) >= 72) return true;
    await page.waitForTimeout(100);
    await frames(page);
  }
  return false;
}
/** Sélection, puis clic au milieu du trait : un objet sélectionné. */
async function selectInk(page) {
  await page.click(item("select"));
  const cam = await camera(page);
  await stageMouse(page).click(INK_MID[0] * cam.zoom + cam.tx, INK_MID[1] * cam.zoom + cam.ty);
  await waitStage(page, "data-selection", "^1$");
}
async function enterAnnotation(page) {
  await page.click(item("desktop-annotation"));
  await waitMode(page, "annotation");
  await waitBody(page, "annotation", "1");
}
const shownTab = (page) => page.locator(`${TAB}[aria-selected="true"]`);
async function waitTabs(page, n) {
  await page.waitForFunction(([sel, k]) => document.querySelectorAll(sel).length === k, [TAB, n], { timeout: 15000 });
  await frames(page);
}
const noErrors = (w, label) => check(w.errors.length === 0, `${label} : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);

async function s1(page, base, tmp, captures) {
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  await clickItem(page, "page-add");
  await waitStage(page, "data-page", "^2/2$");
  await page.click(item("page-prev"));
  await waitStage(page, "data-page", "^1/2$");
  const origin = await shownTab(page).getAttribute("data-tab");
  check((await page.locator(item("annotation-send")).count()) === 0, "S1 tableau : « Envoyer au tableau » masqué (barre du tableau inchangée)");
  await enterAnnotation(page);
  check((await body(page, "annotationOpaque")) === "0", "S1 : entrée en bureau vivant (annotationOpaque=0)");
  check((await text(page, item("annotation-freeze"))) === "Figer le bureau", "S1 : bouton « Figer le bureau »");
  const d0 = w.dialogs.length;
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  const avis = await waitToast(page);
  check(avis === "Envoyé au tableau : page 2" && w.dialogs.length === d0, `S1 : bandeau « ${avis} », aucune boîte`);
  check((await body(page, "annotationCaptures")) === "1", "S1 : une capture demandée au faux hôte");
  check((await shownTab(page).getAttribute("data-tab")) === origin, "S1 : onglet d'origine montré");
  await waitStage(page, "data-page", "^2/3$");
  check((await stageAttr(page, "data-page")) === "2/3", "S1 : page 2 de 3 (insérée après la page montrée, montrée)");
  check(await centerIs(page, BLUE), "S1 : fond capturé #3366cc au centre de la scène");
  const box = await stageBox(page);
  check(box.height >= 640, `S1 : scène ${box.height} px ≥ 640 après le retour`);
  if (captures) {
    await page.screenshot({ path: "/tmp/c11b-capture.png" });
    console.log("capture : /tmp/c11b-capture.png");
  }
  await selectInk(page);
  check((await stageAttr(page, "data-selection")) === "1", "S1 : le trait est sélectionnable comme objet (data-selection=1)");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+z");
  await waitStage(page, "data-page", "/2$");
  check(/\/2$/.test(await stageAttr(page, "data-page")), "S1 : Ctrl+Z retire la page envoyée en une étape (2 pages)");
  await page.keyboard.press("Control+y");
  await waitStage(page, "data-page", "/3$");
  check(/\/3$/.test(await stageAttr(page, "data-page")), "S1 : Ctrl+Y la remet (3 pages)");
  const dl = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const file = join(tmp, "c11b-envoi.roomboard");
  await (await dl).saveAs(file);
  const before = await page.locator(TAB).count();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await waitTabs(page, before + 1);
  await waitStage(page, "data-page", "^1/3$");
  await page.click(item("page-next"));
  await waitStage(page, "data-page", "^2/3$");
  check(Number(await stageAttr(page, "data-elements")) >= 1, "S1 rouvert : le trait est sur la page 2");
  check(await centerIs(page, BLUE), "S1 rouvert : le fond capturé est sur la page 2");
  noErrors(w, "S1");
}

async function s2(browser, base) {
  for (const [param, message, label] of [
    ["refus", DENIED, "refus"],
    ["wayland", WAYLAND, "Wayland"],
  ]) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1&capture=${param}`);
    await ready(page);
    await enterAnnotation(page);
    const d0 = w.dialogs.length;
    await page.click(item("annotation-send"));
    await waitMode(page, "board");
    const a = await waitDialog(w.dialogs, d0);
    check(a.message === message, `S2 ${label} : avis « ${a.message} »`);
    const b = await waitToast(page);
    check(b === "Envoyé au tableau : page 2" && w.dialogs.length === d0 + 1, `S2 ${label} : puis le bandeau « ${b} »`);
    await waitStage(page, "data-page", "^2/2$");
    check(await centerIs(page, WHITE), `S2 ${label} : page à fond blanc`);
    check(Number(await stageAttr(page, "data-elements")) === 1, `S2 ${label} : le trait est inséré`);
    await selectInk(page);
    check((await stageAttr(page, "data-selection")) === "1", `S2 ${label} : trait sélectionnable`);
    const box = await stageBox(page);
    check(box.height >= 640, `S2 ${label} : scène ${box.height} px ≥ 640`);
    noErrors(w, `S2 ${label}`);
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&capture=refus`);
  await ready(page);
  await enterAnnotation(page);
  const d0 = w.dialogs.length;
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  const a = await waitDialog(w.dialogs, d0);
  check(a.message === "rien à envoyer", `S2 sans encre ni capture : avis « ${a.message} »`);
  await page.waitForTimeout(300);
  check(w.dialogs.length === d0 + 1, "S2 sans encre ni capture : un seul avis");
  check((await stageAttr(page, "data-page")) === "1/1", "S2 sans encre ni capture : nombre de pages inchangé");
  const rien = await stageBox(page);
  check(rien.height >= 640, `S2 sans encre ni capture : scène ${rien.height} px ≥ 640 après le retour`);
  noErrors(w, "S2 rien à envoyer");
  await ctx.close();
}

async function s3(browser, base) {
  let ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  let page = await ctx.newPage();
  let w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  const origin = await shownTab(page).getAttribute("data-tab");
  const tabs0 = await page.locator(TAB).count();
  await enterAnnotation(page);
  await page.click(item("annotation-freeze"));
  await waitBody(page, "annotationOpaque", "1");
  check(
    (await page.getAttribute(item("annotation-freeze"), "aria-pressed")) === "true" && (await text(page, item("annotation-freeze"))) === "Bureau vivant",
    "S3 : « Figer le bureau » → fenêtre opaque (annotationOpaque=1), bouton enfoncé « Bureau vivant »",
  );
  await page.click('button[data-segment="mouse"]');
  await page.waitForTimeout(300);
  check((await body(page, "pointeur")) === "draw", "S3 : Souris en figé : data-pointeur reste draw (pas de clic à travers)");
  let d0 = w.dialogs.length;
  await page.click(item("annotation-send-new"));
  await waitMode(page, "board");
  let avis = await waitToast(page);
  check(avis === "Envoyé au tableau : page 1" && w.dialogs.length === d0, `S3 : bandeau « ${avis} », aucune boîte`);
  await waitTabs(page, tabs0 + 2);
  check(((await shownTab(page).textContent()) ?? "").includes("Capture du bureau"), "S3 : nouvel onglet « Capture du bureau » montré");
  await waitStage(page, "data-page", "^1/1$");
  check(await centerIs(page, BLUE), "S3 : fond figé (#3366cc) sur la page du nouvel onglet");
  check(Number(await stageAttr(page, "data-elements")) >= 1, "S3 : le trait est sur la page");
  await page.click(`${TAB}[data-tab="${origin}"]`);
  await waitStage(page, "data-page", "^1/1$");
  check(Number(await stageAttr(page, "data-elements")) === 0, "S3 : onglet d'origine inchangé (une page, aucun objet)");
  check((await stageBox(page)).height >= 640, "S3 : scène ≥ 640 px après le retour");
  await enterAnnotation(page);
  await waitBody(page, "annotationEntrees", "2");
  check((await body(page, "annotationOpaque")) === "1", "S3 : réentrée figée (la page d'annotation a un fond)");
  await page.click(item("annotation-freeze"));
  await waitBody(page, "annotationOpaque", "0");
  check((await text(page, item("annotation-freeze"))) === "Figer le bureau", "S3 : « Bureau vivant » → transparent (annotationOpaque=0), bouton « Figer le bureau »");
  await page.click(item("ann-desktop-annotation"));
  await waitMode(page, "board");
  const fige = await stageBox(page);
  check(fige.height >= 640, `S3 figé : scène ${fige.height} px ≥ 640 après la sortie`);
  noErrors(w, "S3 figé");
  await ctx.close();

  ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  page = await ctx.newPage();
  w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&transparence=non`);
  await ready(page);
  await enterAnnotation(page);
  check((await body(page, "annotationOpaque")) === "1", "S3 sans transparence : entrée figée d'emblée");
  check((await body(page, "annotationCaptures")) === "1", "S3 sans transparence : capture faite à l'entrée");
  check((await text(page, item("annotation-freeze"))) === "Recapturer le bureau", "S3 sans transparence : bouton « Recapturer le bureau »");
  await page.click(item("annotation-freeze"));
  await waitBody(page, "annotationCaptures", "2");
  check((await body(page, "annotationOpaque")) === "1", "S3 « Recapturer le bureau » : nouvelle capture, toujours figé");
  await page.click(item("ann-desktop-annotation"));
  await waitMode(page, "board");
  const opaque = await stageBox(page);
  check(opaque.height >= 640, `S3 sans transparence : scène ${opaque.height} px ≥ 640 après la sortie`);
  noErrors(w, "S3 sans transparence");
  await ctx.close();

  ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  page = await ctx.newPage();
  w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click('[data-profile="annotation"]');
  await frames(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await waitMode(page, "annotation");
  await waitBody(page, "annotation", "1");
  check(await page.locator(item("annotation-send-new")).isDisabled(), "S3 « Annotation au démarrage » : « Envoyer dans un nouvel onglet » grisé");
  const tabs1 = await page.locator(TAB).count();
  d0 = w.dialogs.length;
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  avis = await waitToast(page);
  check(avis === "Envoyé au tableau : page 1" && w.dialogs.length === d0, `S3 « Annotation au démarrage » : bandeau « ${avis} »`);
  await waitTabs(page, tabs1 + 1);
  check(((await shownTab(page).textContent()) ?? "").includes("Capture du bureau"), "S3 « Annotation au démarrage » : « Envoyer au tableau » ouvre un nouvel onglet");
  check((await stageBox(page)).height >= 640, "S3 « Annotation au démarrage » : scène ≥ 640 px");
  noErrors(w, "S3 « Annotation au démarrage »");
  await ctx.close();
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c11b-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const a = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    await s1(await a.newPage(), base, tmp, process.argv.includes("--captures"));
    await a.close();
    await s2(browser, base);
    await s3(browser, base);
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
