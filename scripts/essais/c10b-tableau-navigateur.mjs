#!/usr/bin/env node
// Essai C10b « tableau : fusion, ombrage, collage, classeur » au navigateur (S1 à S4 du cadrage, partie C10b de S11).
// Application construite (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless de Playwright, mode
// repli (`?fichiers=repli`), heure figée. Oracles : #stage[data-table|data-table-merges|data-table-shades|data-selection|
// data-elements|data-bounds], texte de #texte-edition, boîtes d'alerte ; aucune requête hors de 127.0.0.1.
// Lancé par scripts/verifier.sh --e2e, sans option de capture. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/c10b-tableau-navigateur.mjs [--captures] (--captures : docs/essais/c10b-tableau-fusion-ombrage.png).
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C10b tableau";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
/** Point cliqué sur la scène (px de la scène) : coin haut gauche du premier tableau. */
const CLICK = [200, 150];
const COL = 240;
const ROW = 64;
const PASTE =
  '<table><tr><td colspan="2">Titre</td></tr><tr><td>a</td><td>b</td></tr></table>' +
  '<img src="http://exemple.invalid/x.png" onerror="window.__rb=1"><script>window.__rb=1</script>';
const XLSX = join(ROOT, "crates", "roomboard-formats", "tests", "fixtures", "valeurs.xlsx");
const TRUNCATED = "valeurs.xlsx : tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)";
const LATER = "format pris en charge dans une prochaine version";

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
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const waitAttr = (name, v) =>
    page
      .waitForFunction(([n, w]) => document.querySelector("#stage")?.getAttribute(n) === w, [name, v], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
      });
  const waitDialog = async (text) => {
    for (let i = 0; i < 150; i++) {
      if (dialogs.some((d) => d.includes(text))) return;
      await page.waitForTimeout(100);
    }
    throw new Echec(`boîte attendue « ${text} » ; reçues : ${dialogs.join(" | ")}`);
  };
  const editorValue = () => page.$eval("#texte-edition", (a) => a.textContent);
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const screen = (c, wx, wy) => [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  const drag = async (a, b) => {
    await mouse.move(a[0], a[1]);
    await mouse.down();
    await mouse.move(b[0], b[1], { steps: 6 });
    await mouse.up();
    await fr();
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  /** Clic (saisie ouverte au relâché), lecture de la saisie, Échap. */
  const readCell = async (pt, tag, want, label) => {
    await mouse.click(pt[0], pt[1]);
    await waitAttr("data-table", tag);
    const v = await editorValue();
    check(v === want, `${label} : « ${v} » (data-table="${tag}")`);
    await page.keyboard.press("Escape");
    await fr();
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  await page.click(item("table"));
  await fr();
  const box = await stageBox(page);
  check(box.height >= 640, `S1 : la scène garde ${Math.round(box.height)} px de haut avec la rangée de neuf boutons`);
  const c1 = await camera();
  const world = [(CLICK[0] - c1.tx) / c1.zoom, (CLICK[1] - c1.ty) / c1.zoom];
  const cell1 = (c, row, col) => screen(c, world[0] + COL * col + COL / 2, world[1] + ROW * row + ROW / 2);

  // S1 : 4 × 3, « Lundi », Échap ; glisser ; Fusionner ; ombrer la troisième colonne ; révéler, annuler, révéler.
  await mouse.click(CLICK[0], CLICK[1]);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="4 colonnes, 3 lignes"]');
  await waitAttr("data-table", "4x3@0,0");
  await page.keyboard.type("Lundi");
  await page.keyboard.press("Escape");
  await fr();
  check(await page.$eval("#texte-edition", (a) => a.hidden), "S1 : « Lundi », Échap : saisie fermée (F14)");
  await drag(cell1(c1, 0, 0), cell1(c1, 0, 1));
  await waitAttr("data-table", "4x3@0,0-0,1");
  check(true, 'S1 : glisser de la première à la deuxième cellule : data-table="4x3@0,0-0,1"');
  await page.click('button[data-table-action="table-merge"]');
  await waitAttr("data-table-merges", "1");
  check((await attr("data-table")) === "4x3@0,0", 'S1 : « Fusionner » : data-table-merges="1", l\'ancre active');
  await readCell(cell1(c1, 0, 1), "4x3@0,0", "Lundi", "S1 : la cellule fusionnée montre « Lundi » sur deux colonnes");
  await drag(cell1(c1, 0, 2), cell1(c1, 2, 2));
  await waitAttr("data-table", "4x3@0,2-2,2");
  await page.click('button[data-table-action="table-shade"]');
  await waitAttr("data-table-shades", "3");
  check(true, 'S1 : « Ombrer » la troisième colonne : data-table-shades="3" (S11 « ombrer une colonne »)');
  if (captures) {
    await page.keyboard.press("Escape");
    await fr();
    const path = join(ROOT, "docs", "essais", "c10b-tableau-fusion-ombrage.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }
  await page.click(item("select"));
  await fr();
  await mouse.click(...cell1(c1, 0, 2));
  await waitAttr("data-table-shades", "2");
  check((await attr("data-selection")) === "0", 'S1 : outil Sélection, toucher la cellule ombrée : data-table-shades="2", aucun élément sélectionné');
  await page.keyboard.press("Control+z");
  await waitAttr("data-table-shades", "3");
  check(true, "S1 : Ctrl+Z : l'ombrage revient (3)");
  await mouse.click(...cell1(c1, 0, 2));
  await waitAttr("data-table-shades", "2");
  check(true, "S1 : toucher encore : 2");

  // S2 : collage d'un <table> HTML porté par un ClipboardEvent, script et image piégés.
  const elements = Number(await attr("data-elements"));
  const nodes = await page.evaluate(() => document.querySelectorAll("table, img").length);
  const cP = await camera();
  await page.evaluate((html) => {
    const dt = new DataTransfer();
    dt.setData("text/html", html);
    document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, PASTE);
  await waitAttr("data-elements", String(elements + 1));
  await waitAttr("data-table-merges", "2");
  check(await page.evaluate(() => window.__rb === undefined), "S2 : collage : aucun script exécuté (window.__rb indéfini)");
  check((await page.evaluate(() => document.querySelectorAll("table, img").length)) === nodes, "S2 : aucun nœud <table> ni <img> ajouté à la page");
  // Tableau collé centré dans la vue (F21), 480 × 128 à l'échelle 1 : son coin est lu par l'outil Sélection (data-bounds),
  // la hauteur de la scène ne servant pas de repère (la zone de dessin est plus basse que #stage).
  await page.click(item("select"));
  await fr();
  await mouse.click(box.width / 2, box.height / 2);
  await waitAttr("data-selection", "1");
  const [px, py] = ((await attr("data-bounds")) ?? "").split(",").map(Number);
  const pasted = [px, py];
  await page.keyboard.press("Escape");
  await fr();
  const cell2 = (c, row, col) => screen(c, pasted[0] + COL * col + COL / 2, pasted[1] + ROW * row + ROW / 2);
  await page.click(item("table"));
  await fr();
  await readCell(cell2(cP, 0, 1), "2x2@0,0", "Titre", "S2 : tableau collé 2 × 2, fusion sur la première ligne (« Titre »)");
  await readCell(cell2(cP, 1, 0), "2x2@1,0", "a", "S2 : « a » dessous");
  await readCell(cell2(cP, 1, 1), "2x2@1,1", "b", "S2 : « b » dessous");

  // S3 : Ctrl+S, Ctrl+O : nouvel onglet ; zone, ombrages et tableau collé relus.
  const before = await page.locator(TAB).count();
  const file = await saveTo("c10b.roomboard");
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
  await fr();
  await page.click(item("table"));
  await fr();
  const c2 = await camera();
  await readCell(cell1(c2, 0, 1), "4x3@0,0", "Lundi", "S3 : rouvert, la cellule fusionnée montre « Lundi »");
  check(
    (await attr("data-table-merges")) === "2" && (await attr("data-table-shades")) === "2",
    'S3 : data-table-merges="2" (fusion du tableau collé comprise, PC6), data-table-shades="2"',
  );
  await readCell(cell2(c2, 0, 1), "2x2@0,0", "Titre", "S3 : le tableau collé garde « Titre » et sa fusion");
  await readCell(cell2(c2, 1, 1), "2x2@1,1", "b", "S3 : et « b »");

  // S4 : classeur déposé au centre ; valeurs ; deux casse.xlsx ; enregistrer ; Ctrl+Z.
  const els4 = Number(await attr("data-elements"));
  const b4 = await stageBox(page);
  // Le tableau (64 lignes) déborde de la scène : on le descend pour que sa première ligne reste sous les îlots du haut (outils + options de l'outil Tableau).
  const mid = [b4.width / 2, b4.height / 2 + 100];
  await dropFile(page, "#stage", "valeurs.xlsx", readFileSync(XLSX), "", mid);
  await waitAttr("data-elements", String(els4 + 1));
  await waitDialog(TRUNCATED);
  await waitAttr("data-table-merges", "3");
  check(true, `S4 : valeurs.xlsx déposé : un tableau de plus, sa fusion, « ${TRUNCATED} »`);
  await page.click(item("select"));
  await fr();
  await mouse.click(mid[0], mid[1]);
  await waitAttr("data-selection", "1");
  const [x0, y0, x1, y1] = ((await attr("data-bounds")) ?? "").split(",").map(Number);
  await page.keyboard.press("Escape");
  await fr();
  await page.click(item("table"));
  await fr();
  const c4 = await camera();
  const cw = (x1 - x0) / 6;
  const rh = (y1 - y0) / 64;
  for (const [col, want] of [[2, "3,5"], [3, "20/11/2026"], [4, "VRAI"], [5, "#DIV/0!"]]) {
    await readCell(screen(c4, x0 + cw * (col + 0.5), y0 + rh * 0.5), `6x64@0,${col}`, want, `S4 : 64 lignes, colonne ${col + 1}`);
  }
  await dropFile(page, "#stage", "casse.xlsx", new Uint8Array([1, 2, 3, 4, 5]), "", mid);
  await waitDialog(`casse.xlsx : ${LATER}`);
  check(true, "S4 : casse.xlsx sans en-tête PK : refusé (« format pris en charge dans une prochaine version »)");
  const corrupt = new Uint8Array(200).map((_, i) => (i * 37) % 251);
  corrupt.set([0x50, 0x4b, 3, 4]);
  await dropFile(page, "#stage", "casse.xlsx", corrupt, "", mid);
  await waitDialog("Import impossible (casse.xlsx) : ");
  check(Number(await attr("data-elements")) === els4 + 1, "S4 : casse.xlsx corrompu : « Import impossible (casse.xlsx) : … », rien d'inséré");
  const again = await saveTo("apres-casse.roomboard");
  check(existsSync(again), "S4 : l'enregistrement du document marche toujours après (DAB4)");
  await page.keyboard.press("Control+z");
  await waitAttr("data-elements", String(els4));
  await waitAttr("data-table-merges", "2");
  check(true, "S4 : Ctrl+Z retire le tableau importé d'un coup");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c10b-"));
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
