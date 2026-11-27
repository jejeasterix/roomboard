#!/usr/bin/env node
// Essai C12 PDF au navigateur (S1, S3, S4 du cadrage, PF25 à PF27) : déposer un PDF de 3 pages généré ici, voir les
// pages, annoter, exporter en PDF annoté, relire le PDF exporté en Node, enregistrer, redéposer le PDF et le .roomboard.
// Application construite servie en local avec la CSP de la coque, Chromium headless, repli (`?fichiers=repli`), heure
// figée. Oracles : #stage[data-page|data-fond|data-elements|data-camera], requêtes, pixels. Code : 0 réussi, 1 échec,
// 2 outil absent. Usage : node scripts/essais/c12-pdf-navigateur.mjs [--captures] (docs/essais/c12-pdf-annote.png).
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clickItem, coqueCsp, DIST, dropFile, Echec, frames, gitSha, inkIn, item, loadPlaywright, ROOT, serve, stageBox, stageMouse, TAB, VIEWPORT, foldOptions } from "./commun.mjs";
import { pdfPages, readLibs, readPdf } from "./fabriques/pdf.mjs";

const LABEL = "C12 PDF";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
const web = createRequire(join(ROOT, "apps", "web", "package.json"));
const { PDFDocument, StandardFonts } = web("pdf-lib");
const LAZY = /\/assets\/(?:pdfjs|pdf-lib|pdf-worker)-[^/]*\.js$/;

async function scenario(page, url, { captures, tmp, requests }) {
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
  const waitAttr = (name, v) =>
    page.waitForFunction(([n, v]) => document.querySelector("#stage")?.getAttribute(n) === v, [name, v], { timeout: 30000 }).catch(async () => {
      throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
    });
  const tabs = () => page.locator(TAB).count();
  const waitTabs = (n) => page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 30000 }).catch(async (e) => { throw new Echec(`onglets attendus ${n}, lus ${await tabs()} ; texte : ${JSON.stringify((await page.evaluate(() => document.body.innerText)).slice(-400))} ; erreurs : ${errors.join(" | ")}`); });
  const download = async (click, name) => {
    const dl = page.waitForEvent("download");
    await click();
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };

  await page.addInitScript(() => {
    window.__downloadNames = [];
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) window.__downloadNames.push(this.download);
      return click.call(this);
    };
  });
  await foldOptions(page);
  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  const box = await stageBox(page, 640);
  check(box.height >= 640, `PF27 : scène de ${box.height} px (≥ 640) avec « Exporter en PDF… » dans la barre des pages`);
  check(!requests.some((u) => LAZY.test(u)), "PF26 : aucun morceau pdf.js ni pdf-lib chargé avant le dépôt");

  // S1 : dépôt d'un PDF de 3 pages généré ici.
  const n0 = await tabs();
  await dropFile(page, "#stage", "essai-3-pages.pdf", await pdfPages({ PDFDocument, StandardFonts }), "application/pdf");
  await waitTabs(n0 + 1);
  await waitAttr("data-page", "1/3");
  await waitAttr("data-fond", "pret");
  check(requests.some((u) => /\/pdfjs-/.test(u)) && requests.some((u) => /\/pdf-worker-/.test(u)), 'S1 : nouvel onglet, data-page="1/3", data-fond="pret" ; pdf.js chargé au dépôt');
  const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
  const ink = await inkIn(page, [200 * zoom + tx, 100 * zoom + ty, 1500 * zoom + tx, 320 * zoom + ty]);
  check(ink > 50, `S1 : le texte de la page 1 est visible (${ink} pixels sombres)`);
  await page.keyboard.press("Control+z");
  await fr();
  check((await attr("data-page")) === "1/3", "S3 : Ctrl+Z ne retire aucune page");

  // Page 2 : un trait.
  await page.click(item("page-next"));
  await waitAttr("data-page", "2/3");
  await waitAttr("data-fond", "pret");
  await page.click(item("pen"));
  await mouse.move(300, 320);
  await mouse.down();
  await mouse.move(450, 330, { steps: 5 });
  await mouse.move(600, 340, { steps: 5 });
  await mouse.up();
  await waitAttr("data-elements", "1");
  check(true, "S1 : page 2 annotée d'un trait");

  // Export, relu en Node.
  const exported = await download(() => clickItem(page, "export-pdf"), "export.pdf");
  const names = await page.evaluate(() => window.__downloadNames);
  const proposed = (names.at(-1) ?? "").normalize("NFC");
  check(proposed === "essai-3-pages annoté.pdf", `S1 : « Exporter en PDF… » propose « ${proposed} »`);
  check(requests.some((u) => /\/pdf-lib-/.test(u)), "PF26 : pdf-lib chargé à l'export seulement");
  const back = await readPdf(await readFile(exported), await readLibs(web));
  check(back.pages === 3 && back.texts[1]?.includes("RoomBoard page 2"), "S1 : PDF exporté relu : 3 pages, « RoomBoard page 2 » toujours en texte");
  const [o1, o2, o3] = back.overlays;
  check(o1?.length === 0 && o3?.length === 0 && o2?.length === 1, `S1 : page 2 : une superposition (${o2?.[0] ?? "aucune"}), pages 1 et 3 : aucune`);
  // Lot c (PF22) : la superposition est vectorielle (page embarquée /Form) ; un /Image serait le repli PNG, un échec ici.
  check(o2?.[0] === "/Form" && !o2.includes("/Image"), `PF22 : superposition de la page 2 vectorielle (/Form, sans /Image) : ${o2?.join(",") ?? "aucune"}`);

  // Enregistrer le .roomboard du PDF annoté.
  const saved = await download(() => page.keyboard.press("Control+s"), "essai-3-pages.roomboard");

  // Redéposer le PDF exporté : 3 pages.
  const n1 = await tabs();
  await dropFile(page, "#stage", "essai-3-pages annoté.pdf", await readFile(exported), "application/pdf");
  await waitTabs(n1 + 1);
  await waitAttr("data-page", "1/3");
  check(true, 'S1 : PDF exporté redéposé : data-page="1/3"');
  if (captures) {
    await page.click(item("page-next"));
    await waitAttr("data-page", "2/3");
    await waitAttr("data-fond", "pret");
    check(true, 'capture : data-page="2/3", data-fond="pret"');
    await fr();
    const path = join(ROOT, "docs", "essais", "c12-pdf-annote.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // Redéposer le .roomboard : 3 pages, fond prêt, le trait en page 2 (S4 : l'asset revient du conteneur).
  const n2 = await tabs();
  await dropFile(page, "#stage", "essai-3-pages.roomboard", await readFile(saved), "application/x-roomboard");
  await waitTabs(n2 + 1);
  await waitAttr("data-page", "1/3");
  await waitAttr("data-fond", "pret");
  await page.click(item("page-next"));
  await waitAttr("data-page", "2/3");
  await waitAttr("data-elements", "1");
  check(true, "S1 : .roomboard rouvert : 3 pages, fond prêt, le trait en page 2");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c12-"));
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
    const requests = [];
    context.on("request", (r) => requests.push(r.url()));
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp, requests });
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
