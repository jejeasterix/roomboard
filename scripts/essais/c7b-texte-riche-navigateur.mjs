#!/usr/bin/env node
// Essai C7b « texte riche » au navigateur (S1 à S4 du cadrage). L'application construite (apps/web/dist) servie en local
// avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée.
// Geste : outil Texte, « Le chat noir », « chat » sélectionné, G puis la pastille rouge (zone et sélection gardées),
// Échap (capture avec --captures) ; S2 : Ctrl+I, Ctrl+Z dans la zone, puis hors de la zone, Ctrl+Y ; outil Tableau
// 2 × 2, « aa », curseur au milieu, Ctrl+B, « a », Fin, Ctrl+B, « Total » ; S3 : Ctrl+B puis composition « に » (CDP
// `Input.imeSetComposition`, repli synthétique), déplacement qui oublie l'attente ; S4 : collage text/html + text/plain
// au milieu d'un mot gras, Ctrl+Z ; Tab (capture) ; Ctrl+S, Ctrl+O : tout relu dans le nouvel onglet. La boîte de #stage
// ne bouge ni à l'ouverture ni à la validation. Aucune requête hors de 127.0.0.1.
// Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c7b-texte-riche-navigateur.mjs [--captures]
// (--captures : docs/essais/c7b-texte-riche.png, docs/essais/c7b-cellule-riche.png).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, frames, gitSha, item, loadPlaywright, noOverlap, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C7b texte riche";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
// À 1280 px, l'îlot d'outils (941 px avec la navigation de page) descend à y = 80 (règle L2-30) et sa rangée contextuelle
// couvre y = 144 à 200 : le texte est placé sous elle.
const TEXT_AT = [300, 230];
const TABLE_AT = [300, 450];
const COL = 240;
const ROW = 64;
const RED = "rgb(220, 38, 38)";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const show = (v) => JSON.stringify(v);

async function scenario(page, url, { captures, tmp, cdp }) {
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
  const key = async (k) => {
    await page.keyboard.press(k);
    await fr();
  };
  const attr = (name) => page.getAttribute("#stage", name);
  const waitTable = (v) =>
    page
      .waitForFunction((v) => document.querySelector("#stage")?.getAttribute("data-table") === v, v, { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`data-table attendu « ${v} », lu « ${await attr("data-table")} »`);
      });
  const editorOpen = () => page.$eval("#texte-edition", (a) => !a.hidden && document.activeElement === a);
  const pressed = async (sel) => (await page.getAttribute(sel, "aria-pressed")) === "true";
  /** Segments de la zone (un `<span>` par segment), fusionnés quand deux voisins ont les mêmes attributs. */
  const segs = async () => {
    const raw = await page.$eval("#texte-edition", (z, red) =>
      [...z.children]
        .filter((e) => e.tagName === "SPAN")
        .map((e) => ({
          t: e.textContent,
          b: e.style.fontWeight === "bold" || e.style.fontWeight === "700",
          i: e.style.fontStyle === "italic",
          r: e.style.color === red,
        })),
      RED);
    const out = [];
    for (const s of raw) {
      const l = out[out.length - 1];
      if (l && l.b === s.b && l.i === s.i && l.r === s.r) l.t += s.t;
      else out.push({ ...s });
    }
    return out;
  };
  const tr = async () => (await segs()).map((s) => [s.t, s.b, s.r]); // texte, gras, rouge
  const tb = async () => (await segs()).map((s) => [s.t, s.b]); // texte, gras
  const ti = async () => (await segs()).map((s) => [s.t, s.i]); // texte, italique
  const selected = () => page.evaluate(() => String(getSelection()));
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  const shot = async (name) => {
    if (!captures) return;
    await fr();
    const path = join(ROOT, "docs", "essais", name);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };
  const sameBox = (a, b) => ["x", "y", "width", "height"].every((k) => Math.abs(a[k] - b[k]) < 0.5);

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await fr();
  const box0 = await stageBox(page);
  check(box0.height >= 640, `la scène garde ${Math.round(box0.height)} px de haut`);

  // S1 : outil Texte, « Le chat noir ».
  await page.click(item("text"));
  await fr();
  check((await attr("data-tool")) === "text", 'S1 : outil Texte actif (data-tool="text")');
  check(await page.isVisible('button[data-format="bold"]'), "S1 : la rangée Format est visible avec l'outil Texte");
  check(!(await page.isEnabled('button[data-format="bold"]')), "S1 : la rangée Format est grisée, zone fermée");
  const boxTool = await stageBox(page);
  const c1 = await (async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  })();
  const world = (p) => [(p[0] - c1.tx) / c1.zoom, (p[1] - c1.ty) / c1.zoom];
  const textWorld = world(TEXT_AT);
  const tableWorld = world(TABLE_AT);
  await mouse.click(...TEXT_AT);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  await fr();
  check(await editorOpen(), "S1 : la zone s'ouvre au clic, avec le focus");
  const boxOpen = await stageBox(page);
  console.log(`boîtes : départ ${show(box0)}, outil Texte ${show(boxTool)}, séance ${show(boxOpen)}`);
  check(sameBox(boxTool, boxOpen), "la boîte de #stage est immobile à l'ouverture de la séance");
  await page.keyboard.type("Le chat noir");
  await key("Home");
  for (let i = 0; i < 3; i++) await key("ArrowRight");
  for (let i = 0; i < 4; i++) await key("Shift+ArrowRight");
  check((await selected()) === "chat", "S1 : « chat » sélectionné");
  check(await pressed('button[data-format="bold"]') === false, "S1 : G n'est pas enfoncé avant le clic");
  await page.click('button[data-format="bold"]');
  await fr();
  check(await pressed('button[data-format="bold"]'), 'S1 : G : aria-pressed="true" sur « chat »');
  await page.click('button[data-format-color="rouge"]');
  await fr();
  check((await editorOpen()) && (await selected()) === "chat", "S1 : G puis rouge : la zone reste ouverte, « chat » toujours sélectionné");
  check(await pressed('button[data-format-color="rouge"]'), 'S1 : la pastille rouge : aria-pressed="true"');
  const s1 = await tr();
  console.log(`segments : ${show(s1)}`);
  check(same(s1, [["Le ", false, false], ["chat", true, true], [" noir", false, false]]), "S1 : segments [Le | chat gras rouge | noir]");
  await key("Escape");
  check(!(await page.$eval("#texte-edition", (a) => !a.hidden)), "S1 : Échap ferme la zone");
  check((await attr("data-elements")) === "1", "S1 : un texte écrit (data-elements=1)");
  check(sameBox(boxTool, await stageBox(page)), "la boîte de #stage est immobile après la validation");
  await shot("c7b-texte-riche.png");

  // Relecture d'un texte écrit : un clic de l'outil Texte rouvre la zone ; Échap referme.
  const readText = async (at, fn) => {
    await mouse.click(at[0] + 10, at[1] + 10);
    await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
    await fr();
    const v = await fn();
    await key("Escape");
    return v;
  };

  // S2 : Ctrl+I dans la zone, Ctrl+Z dans la zone ; Ctrl+I, Échap, Ctrl+Z hors de la zone, Ctrl+Y.
  await mouse.click(TEXT_AT[0] + 10, TEXT_AT[1] + 10);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  await fr();
  await key("End");
  for (let i = 0; i < 4; i++) await key("Shift+ArrowLeft");
  check((await selected()) === "noir", "S2 : « noir » sélectionné dans le texte rouvert");
  await key("Control+i");
  check(same((await ti()).filter((s) => s[1]), [["noir", true]]), "S2 : Ctrl+I : « noir » en italique");
  await key("Control+z");
  check((await ti()).every((s) => !s[1]) && same(await tr(), s1), "S2 : Ctrl+Z dans la zone : l'italique part en une étape, gras et rouge gardés");
  await key("Control+i");
  await key("Escape");
  check((await attr("data-elements")) === "1", "S2 : Échap : validé, toujours un seul texte");
  await key("Control+z");
  const afterUndo = await readText(TEXT_AT, async () => ({ i: await ti(), r: await tr() }));
  check(afterUndo.i.every((s) => !s[1]) && same(afterUndo.r, s1), "S2 : Ctrl+Z hors de la zone : l'italique part en une étape, « chat » reste gras rouge");
  await key("Control+y");
  const afterRedo = await readText(TEXT_AT, ti);
  check(same(afterRedo.filter((s) => s[1]), [["noir", true]]), "S2 : Ctrl+Y : l'italique de « noir » revient");
  await key("Control+z");
  const back = await readText(TEXT_AT, async () => ({ i: await ti(), r: await tr() }));
  check(back.i.every((s) => !s[1]) && same(back.r, s1), "S2 : Ctrl+Z : texte remis à « chat » gras rouge, sans italique");
  check(sameBox(boxTool, await stageBox(page)), "la boîte de #stage est immobile après S2");

  // S3 : composition « にほん » au milieu de « chat » gras rouge (CDP Input.imeSetComposition, trois étapes) : elle
  // prend le gras et le rouge du mot ; Ctrl+Z dans la zone la retire.
  await mouse.click(TEXT_AT[0] + 10, TEXT_AT[1] + 10);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  await fr();
  await key("Home");
  for (let i = 0; i < 5; i++) await key("ArrowRight"); // « Le ch|at »
  await page.evaluate(() => {
    window.__ime3 = [];
    for (const t of ["compositionstart", "compositionend"]) window.addEventListener(t, () => window.__ime3.push(t), true);
  });
  for (const step of ["に", "にほ", "にほん"]) await cdp.send("Input.imeSetComposition", { text: step, selectionStart: step.length, selectionEnd: step.length });
  await fr();
  check((await page.textContent("#texte-edition")).includes("にほん"), "S3 : pendant la composition, la zone porte « にほん »");
  await cdp.send("Input.insertText", { text: "にほん" });
  await fr();
  check(same(await page.evaluate(() => window.__ime3), ["compositionstart", "compositionend"]), "S3 : une composition (compositionstart puis compositionend)");
  const ime3 = await tr();
  console.log(`texte : ${show(ime3)}`);
  check(same(ime3, [["Le ", false, false], ["chにほんat", true, true], [" noir", false, false]]), "S3 : « にほん » composé dans « chat » : gras et rouge du mot");
  await key("Control+z");
  check(same(await tr(), s1), "S3 : Ctrl+Z dans la zone : la composition part en une étape");
  await key("Escape");
  check((await attr("data-elements")) === "1", "S3 : Échap : toujours un seul texte");

  // S1 : outil Tableau 2 × 2, « aa », curseur au milieu, Ctrl+B, « a », Fin, Ctrl+B, « Total ».
  await page.click(item("table"));
  await fr();
  const boxTable = await stageBox(page);
  await mouse.click(...TABLE_AT);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="2 colonnes, 2 lignes"]');
  await waitTable("2x2@0,0");
  check(await editorOpen(), 'S1 : tableau 2 × 2, saisie ouverte sur la première cellule (data-table="2x2@0,0")');
  check(await page.isEnabled('button[data-format="bold"]'), "S1 : la rangée Format est active dans la cellule");
  const boxCell = await stageBox(page);
  check(sameBox(boxTable, boxCell) && boxCell.height >= 640, `la boîte de #stage est immobile à l'ouverture de la cellule (${Math.round(boxCell.width)} × ${Math.round(boxCell.height)} px, ≥ 640)`);
  const bars = await page.$$eval("[data-toolbar]", (els) => els.filter((e) => e.getBoundingClientRect().height > 0 && e.getAttribute("data-dock") !== "floating").map((e) => e.getAttribute("data-toolbar")));
  for (const id of bars) {
    const { apart } = await noOverlap(page, `[data-toolbar="${id}"]`);
    check(apart, `la barre en bande « ${id} » ne recouvre pas #stage, cellule ouverte`);
  }
  check(bars.length > 0 || (await page.locator(".rb-island").count()) > 0, `barres en bande mesurées : ${bars.join(", ") || "aucune, profil en îlots (design-l2)"}`);
  await page.keyboard.type("aa");
  await key("ArrowLeft");
  await key("Control+b");
  check(await pressed('button[data-format="bold"]'), 'S1 : Ctrl+B au milieu de « aa » : G aria-pressed="true"');
  await page.keyboard.type("a");
  await key("End");
  await key("Control+b");
  await page.keyboard.type("Total");
  await fr();
  const cell0 = await tb();
  console.log(`cellule : ${show(cell0)}`);
  check(same(cell0, [["a", false], ["a", true], ["a", false], ["Total", true]]), "S1 : « aa », curseur au milieu, Ctrl+B, « a » : la deuxième lettre est grasse, puis « Total » gras");

  // S3 : déplacement qui oublie l'attente.
  await key("Home");
  await key("ArrowRight"); // position 1 : à droite d'un « a » maigre
  await key("Control+b");
  check(await pressed('button[data-format="bold"]'), "S3 : Ctrl+B : gras en attente");
  await key("ArrowRight");
  await key("ArrowRight"); // position 3 : à droite d'un « a » maigre
  check(!(await pressed('button[data-format="bold"]')), "S3 : un déplacement oublie l'attente (G n'est plus enfoncé)");

  // S3 : Ctrl+B puis composition « に » (CDP Input.imeSetComposition, repli synthétique).
  await key("Home");
  await key("ArrowRight");
  await key("Control+b");
  await page.evaluate(() => {
    window.__ime = [];
    window.addEventListener("compositionstart", () => window.__ime.push("compositionstart"), true);
    window.addEventListener("compositionend", () => window.__ime.push("compositionend"), true);
  });
  let imeMode = "CDP Input.imeSetComposition";
  try {
    await cdp.send("Input.imeSetComposition", { text: "に", selectionStart: 1, selectionEnd: 1 });
  } catch {
    imeMode = "synthétique";
  }
  await fr();
  if (imeMode.startsWith("CDP") && !(await page.evaluate(() => window.__ime)).includes("compositionstart")) imeMode = "synthétique";
  if (imeMode === "synthétique") {
    await page.$eval("#texte-edition", (z) => {
      z.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
      document.execCommand("insertText", false, "に");
      z.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: "に" }));
    });
    await fr();
  }
  console.log(`IME : ${imeMode}`);
  check((await page.evaluate(() => window.__ime)).includes("compositionstart"), "S3 : compositionstart vu : la composition a eu lieu");
  check((await page.textContent("#texte-edition")).includes("に"), "S3 : pendant la composition, la zone porte « に »");
  if (imeMode === "synthétique") {
    await page.$eval("#texte-edition", (z) => z.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "に" })));
  } else {
    await cdp.send("Input.insertText", { text: "に" });
  }
  await fr();
  check((await page.evaluate(() => window.__ime)).includes("compositionend"), "S3 : compositionend vu");
  const cellIme = await tb();
  console.log(`cellule : ${show(cellIme)}`);
  check(same(cellIme, [["a", false], ["にa", true], ["a", false], ["Total", true]]), "S3 : Ctrl+B puis composition « に » : « に » gras");

  // S4 : collage text/html + text/plain au milieu d'un mot gras, Ctrl+Z.
  await key("End");
  for (let i = 0; i < 3; i++) await key("ArrowLeft"); // « To|tal »
  await page.$eval("#texte-edition", (z) => {
    const dt = new DataTransfer();
    dt.setData("text/html", '<b style="color:#dc2626;font-size:40px">XX</b>');
    dt.setData("text/plain", "xy");
    z.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt }));
  });
  await fr();
  const pasted = await tr();
  console.log(`cellule : ${show(pasted)}`);
  check(
    same(pasted, [["a", false, false], ["にa", true, false], ["a", false, false], ["Toxytal", true, false]]),
    "S4 : collage : le texte simple « xy » prend le gras du mot, ni couleur ni taille du HTML",
  );
  await key("Control+z");
  check(same(await tb(), cellIme), "S4 : Ctrl+Z : le collage part en une étape");

  // Tab : deuxième cellule, capture.
  await key("Tab");
  await waitTable("2x2@0,1");
  check(await editorOpen(), 'S1 : Tab : deuxième cellule active, saisie ouverte (data-table="2x2@0,1")');
  await shot("c7b-cellule-riche.png");
  await key("Escape");
  check(sameBox(boxTable, await stageBox(page)), "la boîte de #stage est immobile après la validation du tableau");

  // Ctrl+S, Ctrl+O : nouvel onglet, tout relu.
  const before = await page.locator(TAB).count();
  const file = await saveTo("c7b.roomboard");
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
  await fr();
  check((await page.locator(TAB).count()) === before + 1, "S1 : Ctrl+S puis Ctrl+O : rouvert dans un nouvel onglet");
  check((await attr("data-elements")) === "2", "rouvert : deux éléments (texte et tableau)");

  await page.click(item("text"));
  await fr();
  const c2 = await (async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  })();
  const screen = (wx, wy) => [wx * c2.zoom + c2.tx, wy * c2.zoom + c2.ty];
  const [tx, ty] = screen(textWorld[0] + 10, textWorld[1] + 10);
  await mouse.click(tx, ty);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  await fr();
  const reText = await tr();
  console.log(`texte rouvert : ${show(reText)}`);
  check(same(reText, s1), "rouvert : « Le chat noir » avec « chat » en gras rouge");
  await key("Escape");

  await page.click(item("table"));
  await fr();
  const [cx, cy] = screen(tableWorld[0] + COL / 2, tableWorld[1] + ROW / 2);
  await mouse.click(cx, cy);
  await waitTable("2x2@0,0");
  await fr();
  const reCell = await tb();
  console.log(`cellule rouverte : ${show(reCell)}`);
  check(same(reCell, cellIme), "rouvert : la première cellule garde « に » gras, « a » maigres et « Total » gras");
  check(await editorOpen(), 'rouvert : saisie ouverte sur la cellule (data-table="2x2@0,0")');
  await key("Escape");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c7b-"));
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
    const cdp = await context.newCDPSession(page);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp, cdp });
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
