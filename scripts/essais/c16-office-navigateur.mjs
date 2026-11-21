#!/usr/bin/env node
// Essai C16 Office au navigateur (S3, S4 du cadrage). Web (repli `?fichiers=repli`, CSP de la coque, Chromium) :
// cours.docx puis diapos.pptx (fabriqués par les tests de roomboard-shell) → « <nom> : exportez en PDF depuis Office »,
// rien d'ajouté ; valeurs.xlsx (C10b) → un tableau en valeurs ; enregistrer puis rouvrir ; scène ≥ 640 px ; bouton
// « Modifier dans l'application d'origine » absent. `--captures` : S4, diapos.pptx converti par LibreOffice (exemple
// convertir_office de roomboard-shell, même code que la coque), le PDF déposé (2 pages), capture
// docs/essais/c16-pptx-libreoffice.png. Code : 0 réussi, 1 échec, 2 outil absent.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, item, loadPlaywright, serve, stageBox } from "./commun.mjs";

const LABEL = "C16 Office";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const FIX = join(ROOT, "crates", "roomboard-shell", "tests", "fixtures");
const XLSX = join(ROOT, "crates", "roomboard-formats", "tests", "fixtures", "valeurs.xlsx");
const EXPORT = "exportez en PDF depuis Office";

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", async (d) => {
    dialogs.push(d.message());
    await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const attr = (name) => page.getAttribute("#stage", name);
  const waitAttr = (name, v) =>
    page.waitForFunction(([n, v]) => document.querySelector("#stage")?.getAttribute(n) === v, [name, v], { timeout: 30000 }).catch(async () => {
      throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
    });
  const waitDialog = async (text) => {
    for (let i = 0; i < 300; i++) {
      if (dialogs.some((d) => d.includes(text))) return;
      await page.waitForTimeout(100);
    }
    throw new Echec(`boîte attendue « ${text} » ; reçues : ${dialogs.join(" | ")}`);
  };
  const tabs = () => page.locator(TAB).count();
  const waitTabs = (n) =>
    page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 30000 }).catch(async () => {
      throw new Echec(`onglets attendus ${n}, lus ${await tabs()} ; erreurs : ${errors.join(" | ")}`);
    });
  const download = async (press, name) => {
    const dl = page.waitForEvent("download");
    await press();
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await frames(page);
  const box = await stageBox(page, 640);
  check(box.height >= 640, `S3 : scène de ${box.height} px (≥ 640)`);
  check((await page.locator(item("edit-original")).count()) === 0, "S3 : « Modifier dans l'application d'origine » absent de la barre (web)");

  // S3 : documents Office refusés avec le message, rien d'ajouté.
  const n0 = await tabs();
  const e0 = (await attr("data-elements")) ?? "0";
  await dropFile(page, "#stage", "cours.docx", readFileSync(join(FIX, "cours.docx")));
  await waitDialog(`cours.docx : ${EXPORT}`);
  await dropFile(page, "#stage", "diapos.pptx", readFileSync(join(FIX, "diapos.pptx")));
  await waitDialog(`diapos.pptx : ${EXPORT}`);
  await frames(page);
  check((await tabs()) === n0 && ((await attr("data-elements")) ?? "0") === e0, `S3 : deux avis « <nom> : ${EXPORT} », aucun onglet ni élément ajouté`);

  // S3 : .xlsx en valeurs (C10b inchangé), au centre de la scène.
  const mid = [box.width / 2, box.height / 2];
  await dropFile(page, "#stage", "valeurs.xlsx", readFileSync(XLSX), "", mid);
  await waitAttr("data-elements", String(Number(e0) + 1));
  check(true, "S3 : valeurs.xlsx : un tableau en valeurs");

  // S3 : enregistrer puis rouvrir.
  const saved = await download(() => page.keyboard.press("Control+s"), "c16-valeurs.roomboard");
  const n1 = await tabs();
  await dropFile(page, "#stage", "c16-valeurs.roomboard", await readFile(saved), "application/x-roomboard");
  await waitTabs(n1 + 1);
  await waitAttr("data-elements", String(Number(e0) + 1));
  check(true, "S3 : enregistré puis rouvert : le tableau est là");
  const box2 = await stageBox(page, 640);
  check(box2.height >= 640, `S3 : scène de ${box2.height} px (≥ 640) après réouverture`);

  if (captures) {
    // S4 : conversion réelle par le code de la coque (exemple convertir_office), puis dépôt du PDF.
    const pdfPath = join(tmp, "diapos.pdf");
    const run = spawnSync("cargo", ["run", "-q", "-p", "roomboard-shell", "--example", "convertir_office", "--", join(FIX, "diapos.pptx"), pdfPath], { cwd: ROOT, encoding: "utf8" });
    if (run.status !== 0) throw new Echec(`convertir_office : code ${run.status} ; ${run.stderr}`);
    const converter = (run.stdout.match(/convertisseur : (.+)/) ?? [])[1] ?? "?";
    const pdf = await readFile(pdfPath);
    check(pdf.subarray(0, 5).toString("latin1") === "%PDF-", `S4 : diapos.pptx converti par ${converter} : %PDF-`);
    const n2 = await tabs();
    await dropFile(page, "#stage", "diapos.pdf", pdf, "application/pdf");
    await waitTabs(n2 + 1);
    await waitAttr("data-page", "1/2");
    await waitAttr("data-fond", "pret");
    check(true, 'S4 : nouvel onglet, data-page="1/2", data-fond="pret"');
    await frames(page);
    const path = join(ROOT, "docs", "essais", "c16-pptx-libreoffice.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  for (const f of [join(FIX, "cours.docx"), join(FIX, "diapos.pptx"), XLSX]) {
    if (!existsSync(f)) {
      console.error(`${LABEL} : ÉCHEC — fixture absente : ${f}`);
      return 1;
    }
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c16-"));
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
