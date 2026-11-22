#!/usr/bin/env node
// Essai C13 lots 2-3 : fidélité de lecture des .notebook et .olf (T10). Usage, depuis la racine du dépôt :
//   node scripts/essais/c13-fidelite.mjs <fichier>…
// Chaque fichier (chemin en argument, jamais copié, jamais lu depuis son dossier) est déposé dans un onglet neuf de
// l'application web servie depuis apps/web/dist (repli `?fichiers=repli`, CSP de la coque). Sortie : une ligne
// Markdown `| fichier | pages | objets | avertissements | résultat |` par fichier, lue sur #stage (data-page,
// data-elements page par page) et sur les avis (boîtes de dialogue). Aucun contenu de fichier n'est affiché.
// Code : 0 réussi, 1 échec, 2 outil absent.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { join } from "node:path";
import { DIST, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, loadPlaywright, serve } from "./commun.mjs";

const LABEL = "C13 fidélité";

const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
/** Avis résumés : « texte (×n) », sans le nom du fichier, tronqués à 160 signes. */
function summarize(msgs, name) {
  const count = new Map();
  for (const m of msgs) {
    const t = cell(m.split(name).join("«f»")).slice(0, 160);
    count.set(t, (count.get(t) ?? 0) + 1);
  }
  return [...count].map(([t, n]) => (n > 1 ? `${t} (×${n})` : t)).join(" ; ");
}

async function measure(context, port, file) {
  const name = basename(file);
  const bytes = await readFile(file);
  const page = await context.newPage();
  const dialogs = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    return d.accept();
  });
  try {
    await page.goto(`http://127.0.0.1:${port}/?fichiers=repli`);
    await page.waitForSelector("#stage");
    await frames(page);
    const n0 = await page.locator(TAB).count();
    const p0 = await page.getAttribute("#stage", "data-page");
    await dropFile(page, "#stage", name, bytes, "");
    for (let i = 0; i < 300; i++) {
      const loaded = (await page.locator(TAB).count()) !== n0 || (await page.getAttribute("#stage", "data-page")) !== p0;
      if (loaded || dialogs.length > 0) break;
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1500);
    await frames(page);
    const loaded = (await page.locator(TAB).count()) !== n0 || (await page.getAttribute("#stage", "data-page")) !== p0;
    if (!loaded) {
      const why = dialogs.length > 0 ? summarize(dialogs, name) : errors.length > 0 ? `erreur : ${cell(errors[0]).slice(0, 160)}` : "aucune réaction";
      return { row: `| ${name} | — | — | — | refusé : ${why} |`, loaded: false, pages: 0, objects: 0, warns: 0 };
    }
    const total = Number((await page.getAttribute("#stage", "data-page")).split("/")[1]);
    let objects = 0;
    const per = [];
    for (let p = 1; p <= total; p++) {
      if (total > 1) {
        await page.click(`.rb-pages-list [data-page="${p}"]`);
        await page.waitForFunction((v) => document.querySelector("#stage")?.getAttribute("data-page") === v, `${p}/${total}`, { timeout: 10000 });
        await frames(page);
      }
      const n = Number((await page.getAttribute("#stage", "data-elements")) ?? "0");
      per.push(n);
      objects += n;
    }
    const ns = dialogs.length;
    return {
      row: `| ${name} | ${total} | ${objects} | ${ns}${ns > 0 ? ` : ${summarize(dialogs, name)}` : ""} | lu |`,
      loaded: true,
      pages: total,
      objects,
      warns: ns,
      empty: per.filter((n) => n === 0).length,
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0 || files.some((f) => !existsSync(f))) {
    console.error(`${LABEL} : ÉCHEC — usage : node scripts/essais/c13-fidelite.mjs <fichier>… (chemins existants)`);
    return 1;
  }
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : construire l'application web d'abord`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await context.route("**/*", (route) => (new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort()));
    console.log(`sha ${gitSha()}`);
    console.log("| fichier | pages | objets | avertissements | résultat |");
    console.log("|---|---|---|---|---|");
    const sums = new Map();
    for (const f of files) {
      const r = await measure(context, port, f);
      console.log(r.row);
      const ext = f.split(".").pop();
      const s = sums.get(ext) ?? { files: 0, refused: 0, pages: 0, objects: 0, warns: 0 };
      s.files++;
      if (r.loaded) Object.assign(s, { pages: s.pages + r.pages, objects: s.objects + r.objects, warns: s.warns + r.warns });
      else s.refused++;
      sums.set(ext, s);
    }
    for (const [ext, s] of sums) {
      console.log(`synthèse .${ext} : ${s.files - s.refused} lus, ${s.refused} refusés sur ${s.files} ; ${s.pages} pages, ${s.objects} objets, ${s.warns} avertissements`);
    }
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exit(await main());
