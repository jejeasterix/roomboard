#!/usr/bin/env node
// Essai C3 groupes au navigateur (S1, S2, S3, S5 du cadrage) : grouper, déplacer, copier (Ctrl+C réel), coller
// (ClipboardEvent puis bouton), exporter la sélection, la redéposer, enregistrer puis rouvrir.
// Application construite (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless de Playwright, mode
// repli (`?fichiers=repli`), heure figée. Oracles : #stage[data-selection|data-units|data-grouped|data-bounds|data-elements|
// data-tool|data-camera] ; aucune requête hors de 127.0.0.1.
// Lancé par scripts/verifier.sh --e2e, sans option de capture. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/c3-groupes-navigateur.mjs [--captures] (--captures : docs/essais/c3-groupe-selectionne.png, c3-collage.png).
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";

const LABEL = "C3 groupes";
const FIXED = new Date("2026-11-20T08:00:00.000Z");

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
  const waitAttr = (name, v) =>
    page
      .waitForFunction(([n, v]) => document.querySelector("#stage")?.getAttribute(n) === v, [name, v], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
      });
  const bounds = async () => ((await attr("data-bounds")) ?? "").split(",").map(Number);
  const elements = async () => Number(await attr("data-elements"));
  const drag = async (x0, y0, x1, y1) => {
    await mouse.move(x0, y0);
    await mouse.down();
    await mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
    await mouse.move(x1, y1, { steps: 4 });
    await mouse.up();
    await fr();
  };
  const shot = async (name) => {
    if (!captures) return;
    await fr();
    const path = join(ROOT, "docs", "essais", name);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };

  // Nom réellement proposé par la page : a.download de l'ancre cliquée (Chromium sans écran rend « download » à Playwright).
  await page.addInitScript(() => {
    window.__downloadNames = [];
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) window.__downloadNames.push(this.download);
      return click.call(this);
    };
  });
  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();

  // Les points de dessin sont décalés de +120 px en y : à 1280 px, l'îlot d'outils (941 px avec la navigation de page) ne tient plus
  // dans la place centrée du haut (816 px) et descend à y = 80 (règle L2-30) ; il recouvrait le départ du 2e rectangle.
  // S1 : deux rectangles et un trait, puis rectangle de sélection autour des trois.
  await page.click(item("rect"));
  await drag(120, 240, 220, 320);
  await drag(260, 240, 360, 320);
  await page.click(item("pen"));
  await drag(120, 380, 360, 380);
  await waitAttr("data-elements", "3");
  await page.click(item("select"));
  await fr();
  await drag(90, 210, 400, 420);
  await waitAttr("data-selection", "3");
  check((await attr("data-units")) === "3" && (await attr("data-grouped")) === "0", "S1 : trois objets sélectionnés, trois unités, aucun groupe");
  await page.keyboard.press("Control+g");
  await waitAttr("data-grouped", "1");
  check((await attr("data-units")) === "1", 'S1 : Ctrl+G : data-units="1", data-grouped="1"');
  await page.keyboard.press("Escape");
  await waitAttr("data-selection", "0");
  await mouse.click(170, 280);
  await waitAttr("data-selection", "3");
  check(true, "S1 : un clic sur un rectangle prend les trois objets du groupe");
  await shot("c3-groupe-selectionne.png");
  const before = await bounds();
  await drag(170, 280, 270, 330);
  const cam = ((await attr("data-camera")) ?? "").split(",").map(Number);
  const moved = await bounds();
  const dx = (moved[0] - before[0]) * cam[0];
  const dy = (moved[1] - before[1]) * cam[0];
  check(Math.abs(dx - 100) < 2 && Math.abs(dy - 50) < 2 && (await attr("data-selection")) === "3", `S1 : glisser : les trois bougent ensemble (Δx écran ${dx.toFixed(1)} px, Δy ${dy.toFixed(1)} px)`);
  await page.keyboard.press("Control+z");
  await page.waitForFunction((b) => document.querySelector("#stage")?.getAttribute("data-bounds") === b, before.join(","), { timeout: 15000 }).catch(() => undefined);
  check((await bounds()).join(",") === before.join(","), "S1 : Annuler une fois : les trois reviennent");
  await page.click('button[data-selection-action="ungroup"]');
  await waitAttr("data-grouped", "0");
  await page.keyboard.press("Escape");
  await waitAttr("data-selection", "0");
  await mouse.click(170, 280);
  await waitAttr("data-selection", "1");
  check((await attr("data-units")) === "1" && (await attr("data-grouped")) === "0", "S1 : Dégrouper : un clic ne prend plus qu'un objet");
  await page.keyboard.press("Escape");
  await waitAttr("data-selection", "0");
  await page.keyboard.press("Control+z");
  await mouse.click(170, 280);
  await waitAttr("data-selection", "3");
  check((await attr("data-grouped")) === "1", "S1 : Annuler rend le groupe : un clic reprend les trois objets");

  // S2 : Ctrl+C réel, enveloppe relue dans le presse-papiers système.
  await mouse.click(170, 280);
  await waitAttr("data-selection", "3");
  await page.keyboard.press("Control+c");
  // Sondage côté Node : un readText refusé ou en attente ne bloque pas l'attente, la limite reste 15 s.
  let envelope = null;
  for (const t0 = Date.now(); envelope === null && Date.now() - t0 < 15000; ) {
    const t = await page.evaluate(() => navigator.clipboard.readText().catch(() => "")).catch(() => "");
    if (t.startsWith('{"format":"roomboard-items/1","rbitem":"')) envelope = t;
    else await page.waitForTimeout(250);
  }
  check(typeof envelope === "string", "S2 : Ctrl+C : le presse-papiers système porte {\"format\":\"roomboard-items/1\",\"rbitem\":…}");

  // S2 : coller (ClipboardEvent porteur de l'enveloppe), deux fois, puis Annuler, puis le bouton « Coller ».
  const n0 = await elements();
  const paste = () =>
    page.evaluate((text) => {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    }, envelope);
  await paste();
  await waitAttr("data-elements", String(n0 + 3));
  check((await attr("data-tool")) === "select" && (await attr("data-selection")) === "3" && (await attr("data-units")) === "1", "S2 : collé : trois objets neufs, sélectionnés, toujours groupés");
  const b1 = await bounds();
  await paste();
  await waitAttr("data-elements", String(n0 + 6));
  const b2 = await bounds();
  check(Math.abs(b2[0] - b1[0] - 24) < 0.2 && Math.abs(b2[1] - b1[1] - 24) < 0.2, "S2 : second collage décalé de 24 px");
  await shot("c3-collage.png");
  await page.keyboard.press("Control+z");
  await waitAttr("data-elements", String(n0 + 3));
  check(true, "S2 : Annuler retire un collage");
  await page.click('button[data-selection-action="paste"]');
  await waitAttr("data-elements", String(n0 + 6));
  check(true, "S2 : le bouton « Coller » colle depuis le presse-papiers interne");

  // S3 : exporter la sélection, puis la redéposer.
  const dl = page.waitForEvent("download");
  await page.click('button[data-selection-action="export"]');
  const download = await dl;
  const names = await page.evaluate(() => window.__downloadNames);
  const proposed = (names.at(-1) ?? "").normalize("NFC");
  check(proposed === "Sélection.rbitem", `S3 : « Exporter » propose le nom « ${proposed} »`);
  const file = join(tmp, "Sélection.rbitem");
  await download.saveAs(file);
  const bytes = await readFile(file);
  check(bytes[0] === 0x50 && bytes[1] === 0x4b, "S3 : le fichier exporté est un ZIP (PK)");
  const n1 = await elements();
  await dropFile(page, "#stage", "Sélection.rbitem", bytes, "application/x-roomboard-item");
  await waitAttr("data-elements", String(n1 + 3));
  check((await attr("data-units")) === "1", "S3 : déposé : un groupe neuf de trois objets");

  // S5 : enregistrer, rouvrir, le groupe est là.
  const save = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const saved = join(tmp, "c3.roomboard");
  await (await save).saveAs(saved);
  const tabs = await page.locator(TAB).count();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(saved);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, tabs + 1, { timeout: 15000 });
  await fr();
  await page.click(item("select"));
  await fr();
  await mouse.click(170, 280);
  await waitAttr("data-selection", "3");
  check((await attr("data-grouped")) === "1", "S5 : enregistré puis rouvert : un clic prend les trois objets groupés");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c3-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: `http://127.0.0.1:${port}` });
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
