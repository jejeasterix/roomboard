#!/usr/bin/env node
// Essai des fichiers au navigateur (lot 5a : D26, DA8, D27 ; S2 partie fichiers). L'application construite
// (apps/web/dist) servie en local, Chromium headless de Playwright, souris simulée. Trois modes :
//   repli     `?fichiers=repli` : Ctrl+S → téléchargement intercepté ; recharger ; Ctrl+O → sélecteur <input type=file>
//             → le trait revient ; faux fichier → message, document inchangé ; fermeture modifiée → beforeunload.
//   fsa       sans réglage, faux showSaveFilePicker / showOpenFilePicker injectés : une seule boîte, Ctrl+S réécrit la
//             même poignée ; recharger ; Ctrl+O → les deux traits reviennent. Ne prouve ni la boîte du système, ni les
//             permissions, ni la poignée réelle gardée dans IndexedDB (fausse poignée non clonable).
//   detection sans réglage, sélecteurs retirés de window : le repli est choisi par détection ; même parcours que repli.
// Tous : aucune requête hors de 127.0.0.1 (D27). Hors de scripts/verifier.sh : exige Playwright (cache npx).
// `serve`, `loadPlaywright`, `frames`, `inkIn` viennent de scripts/essais/commun.mjs (lot 5b, T85).
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/fichiers-navigateur.mjs [--captures]
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, frames as framesOf, gitSha, inkIn, loadPlaywright, serve } from "./commun.mjs";
const MODES = ["repli", "fsa", "detection"];
const DISCARD = "Le document a des modifications non enregistrées. Les abandonner ?";
const FIRST = [[400, 300], [650, 300], [900, 300]];
const SECOND = [[400, 420], [650, 420], [900, 420]];
const FIRST_BOX = [640, 290, 660, 310];
const SECOND_BOX = [640, 410, 660, 430];

/** CSP de la coque (tauri.conf.json), envoyée telle quelle par le serveur d'essai : un défaut de CSP se voit ici. */
function coqueCsp() {
  const conf = JSON.parse(readFileSync(join(ROOT, "apps", "desktop", "src-tauri", "tauri.conf.json"), "utf8"));
  const csp = conf.app.security.csp;
  return Object.entries(csp).map(([d, v]) => `${d} ${Array.isArray(v) ? v.join(" ") : v}`).join("; ");
}

/** Faux File System Access, injecté avant le chargement ; fichiers et compteurs dans sessionStorage (survit au rechargement). */
function fakeFsa() {
  const KEY = "faux-fsa";
  const load = () => JSON.parse(sessionStorage.getItem(KEY) ?? '{"files":{},"save":0,"open":0,"writes":0,"suggested":null}');
  const store = (s) => sessionStorage.setItem(KEY, JSON.stringify(s));
  const b64 = (u8) => {
    let s = "";
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const handle = (name) => ({
    kind: "file",
    name,
    async getFile() {
      const bytes = unb64(load().files[name] ?? "");
      return { arrayBuffer: async () => bytes.buffer.slice(0) };
    },
    async createWritable() {
      const chunks = [];
      return {
        async write(d) { chunks.push(new Uint8Array(d)); },
        async close() {
          const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
          let at = 0;
          for (const c of chunks) { all.set(c, at); at += c.length; }
          const s = load();
          s.files[name] = b64(all);
          s.writes += 1;
          store(s);
        },
        async abort() {},
      };
    },
    async queryPermission() { return "granted"; },
    async requestPermission() { return "granted"; },
  });
  window.showSaveFilePicker = async (o) => {
    const s = load();
    s.save += 1;
    s.suggested = o?.suggestedName ?? null;
    store(s);
    return handle(o?.suggestedName ?? "x.roomboard");
  };
  window.showOpenFilePicker = async () => {
    const s = load();
    s.open += 1;
    store(s);
    const name = Object.keys(s.files)[0];
    if (!name) throw new DOMException("aucun fichier", "AbortError");
    return [handle(name)];
  };
}

async function run(browser, port, mode, { captures, tmp }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, acceptDownloads: true });
  const external = [];
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1") return route.continue();
    external.push(u.href);
    return route.abort();
  });
  if (mode === "fsa") await context.addInitScript(fakeFsa);
  if (mode === "detection") {
    await context.addInitScript(() => {
      for (const k of ["showSaveFilePicker", "showOpenFilePicker"]) {
        delete window[k];
        if (typeof window[k] === "function") window[k] = undefined; // propriété héritée : masquée
      }
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const dialogs = [];
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(`[${mode}] ${msg}`);
    console.log(`ok — [${mode}] ${msg}`);
  };
  const frames = () => framesOf(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const elements = async () => Number(await attr("data-elements"));
  const ready = async () => {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
    await frames();
  };
  const clean = () => page.waitForFunction(() => document.querySelector("#stage")?.dataset.modifie === "0");
  const drag = async (points) => {
    const [first, ...rest] = points;
    await page.mouse.move(first[0], first[1]);
    await page.mouse.down();
    for (const [x, y] of rest) await page.mouse.move(x, y, { steps: 8 });
    await page.mouse.up();
    await frames();
  };
  // Pixels d'encre (somme RVB < 300) dans une boîte en px CSS du canvas de scène (même mesure que S2).
  const ink = (box) => inkIn(page, box);
  // Signature de toute la scène : masque d'encre (même seuil) condensé en empreinte FNV-1a + nombre de pixels d'encre.
  // Égale avant enregistrement et après réouverture = mêmes traits aux mêmes coordonnées (S2), pas seulement « de l'encre ».
  const signature = () =>
    page.$eval("#scene", (c) => {
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let h = 2166136261;
      let n = 0;
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        if (d[i] + d[i + 1] + d[i + 2] < 300) {
          n++;
          h = Math.imul(h ^ p, 16777619) >>> 0;
        }
      }
      return `${c.width}x${c.height}:${n}:${h}`;
    });
  let before = "";
  const waitDialog = async (type) => {
    for (let i = 0; i < 50 && !dialogs.some((d) => d.type === type); i++) await new Promise((r) => setTimeout(r, 100));
    return dialogs.find((d) => d.type === type);
  };

  await page.goto(`http://127.0.0.1:${port}/${mode === "repli" ? "?fichiers=repli" : ""}`);
  await ready();
  const expected = mode === "fsa" ? "fsa" : "repli";
  check((await attr("data-fichiers")) === expected, `hôte choisi : data-fichiers="${expected}"`);
  check((await attr("data-modifie")) === "0" && (await elements()) === 0, "document neuf, non modifié");
  await drag(FIRST);
  check((await elements()) === 1 && (await attr("data-modifie")) === "1", "un trait : document modifié");
  check((await page.title()).startsWith("• "), "titre marqué « • »");

  if (mode === "fsa") {
    await page.keyboard.press("Control+s");
    await clean();
    await drag(SECOND);
    await page.keyboard.press("Control+s");
    await clean();
    const s = await page.evaluate(() => JSON.parse(sessionStorage.getItem("faux-fsa")));
    check(s.save === 1 && s.writes === 2, `Ctrl+S deux fois : une seule boîte, deux écritures sur la même poignée (save=${s.save}, writes=${s.writes})`);
    check(s.suggested === "Sans titre.roomboard", "nom proposé « Sans titre.roomboard »");
    before = await signature();
    await page.reload();
    await ready();
    check((await elements()) === 0, "rechargé : page vide");
    const nav = page.waitForEvent("load");
    await page.keyboard.press("Control+o");
    await nav;
    await ready();
    check((await elements()) === 2, "fichier rouvert : les deux traits reviennent");
    check((await ink(FIRST_BOX)) > 0 && (await ink(SECOND_BOX)) > 0, "encre aux mêmes coordonnées (y = 300 et 420)");
    const after = await signature();
    check(after === before && !before.includes(":0:"), `scène identique pixel pour pixel avant enregistrement et après réouverture (${after})`);
  } else {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const download = await dl;
    const file = join(tmp, `${mode}.roomboard`);
    await download.saveAs(file);
    const bytes = await readFile(file);
    check(download.suggestedFilename() === "Sans titre.roomboard", "téléchargement « Sans titre.roomboard » intercepté");
    check(bytes.length > 0 && bytes[0] === 0x50 && bytes[1] === 0x4b, `fichier ZIP (${bytes.length} octets, « PK »)`);
    await clean();
    before = await signature();
    check(!(await page.title()).startsWith("• "), "enregistré : titre sans « • »");
    await page.reload();
    await ready();
    check((await elements()) === 0, "rechargé : page vide");
    const chooser = page.waitForEvent("filechooser");
    const nav = page.waitForEvent("load");
    await page.keyboard.press("Control+o");
    await (await chooser).setFiles(file);
    await nav;
    await ready();
    check((await elements()) === 1 && (await ink(FIRST_BOX)) > 0, "fichier rouvert : le trait revient aux mêmes coordonnées");
    const after = await signature();
    check(after === before && !before.includes(":0:"), `scène identique pixel pour pixel avant enregistrement et après réouverture (${after})`);
  }
  // Le nom vient du fichier rouvert : le fichier du repli est enregistré sous `<mode>.roomboard` par l'essai.
  const reopened = mode === "fsa" ? "Sans titre.roomboard" : `${mode}.roomboard`;
  check((await attr("data-fichier")) === reopened && (await attr("data-modifie")) === "0", `nom repris (« ${reopened} »), non modifié`);
  if (captures && mode !== "detection") {
    await page.screenshot({ path: join(ROOT, "docs", "essais", `fichiers-lot5a-${mode}.png`) });
    console.log(`capture docs/essais/fichiers-lot5a-${mode}.png`);
  }

  if (mode === "repli") {
    const bad = join(tmp, "faux.roomboard");
    await writeFile(bad, "pas un zip");
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Control+o");
    await (await chooser).setFiles(bad);
    const alert = await waitDialog("alert");
    check(alert !== undefined && alert.message.startsWith("Ouverture impossible (faux.roomboard)"), `fichier invalide : message « ${alert?.message} »`);
    check((await elements()) === 1, "fichier invalide : document inchangé");
    // Ctrl+O sur un document modifié : le sélecteur s'ouvre (activation encore valable), puis la question, puis le fichier.
    await drag(SECOND);
    check((await elements()) === 2 && (await attr("data-modifie")) === "1", "second trait : document modifié");
    const chooser2 = page.waitForEvent("filechooser");
    const nav2 = page.waitForEvent("load");
    await page.keyboard.press("Control+o");
    await (await chooser2).setFiles(join(tmp, `${mode}.roomboard`));
    const question = await waitDialog("confirm");
    check(question?.message === DISCARD, `Ctrl+O sur un document modifié : sélecteur ouvert, puis « ${question?.message} »`);
    await nav2;
    await ready();
    check((await elements()) === 1 && (await attr("data-modifie")) === "0", "réponse Oui : le fichier remplace le document modifié");
  }
  check(external.length === 0, `hors ligne : aucune requête hors de 127.0.0.1 (${external.length})`);
  check(errors.length === 0, `aucune erreur de page ${errors.join(" | ")}`);
  if (mode === "repli") {
    await drag(SECOND);
    await page.close({ runBeforeUnload: true });
    check((await waitDialog("beforeunload")) !== undefined, "fermeture d'un document modifié : le navigateur demande");
  }
  await context.close();
}

async function main() {
  const argv = process.argv.slice(2);
  const sha = gitSha();
  console.log(`sha ${sha}`);
  const label = "Fichiers lot 5a";
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${label} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${label} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-fichiers-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${label} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    for (const mode of MODES) await run(browser, port, mode, { captures: argv.includes("--captures"), tmp });
    console.log(`${label} : OK (${MODES.length} modes)`);
    return 0;
  } catch (e) {
    console.error(`${label} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
