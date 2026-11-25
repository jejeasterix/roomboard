#!/usr/bin/env node
// Essai C1 au navigateur (profils et barre configurable) : S1 (modifier le profil par défaut, enregistrer comme nouveau,
// recharger, exporter, tout remettre à zéro, réimporter), S2 (profil 1.2 à outil inconnu, profil 2.0 refusé, import d'un
// id pris annulé), S5 côté navigateur (« Annotation au démarrage » : tableau, aucun message). L'application construite
// (apps/web/dist) est servie en local ; Chromium headless de Playwright ; `?fichiers=repli` (téléchargement,
// <input type=file>, confirm et alert du navigateur). Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Hors de verifier.sh sans --e2e.
// Usage : node scripts/essais/c1-profils-navigateur.mjs [--captures]   (docs/essais/c1-editeur.png, c1-barre-gauche-l.png)
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, VIEWPORT, frames, gitSha, item, loadPlaywright, noOverlap, serve } from "./commun.mjs";

const LABEL = "C1";
const FIXTURES = join(ROOT, "apps", "web", "src", "fixtures", "profils");
const OUTILS = '[data-toolbar="outils"]';

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const dialogs = [];
  let answer = "accept";
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    if (answer === "dismiss") await d.dismiss();
    else await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const count = (sel) => page.locator(sel).count();
  const ready = async () => {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
    await fr();
  };
  const waitFor = async (sel) => {
    await page.waitForSelector(sel, { timeout: 15000 });
    await fr();
  };
  const gone = async (sel) => {
    await page.waitForSelector(sel, { state: "detached", timeout: 15000 });
    await fr();
  };
  const shot = async (name) => {
    if (!captures) return;
    const path = join(ROOT, "docs", "essais", `c1-${name}.png`);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };
  const menu = async () => {
    await page.click(item("profiles"));
    await waitFor("[data-profiles]");
  };
  const closeMenu = async () => {
    await page.click(item("profiles"));
    await gone("[data-profiles]");
  };
  const command = async (name) => {
    await menu();
    await page.click(`[data-profile-cmd="${name}"]`);
    await fr();
  };
  const chooseProfile = async (id) => {
    await menu();
    await page.click(`[data-profile="${id}"]`);
    await fr();
  };
  const activeProfile = async () => {
    await menu();
    const id = await page.getAttribute('[data-profile][aria-checked="true"]', "data-profile");
    await closeMenu();
    return id;
  };
  const waitDialog = async (type, from) => {
    for (let i = 0; i < 200; i++) {
      const d = dialogs.slice(from).find((x) => x.type === type);
      if (d) return d;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Echec(`boîte « ${type} » attendue, aucune reçue`);
  };
  const exportTo = async (name) => {
    const dl = page.waitForEvent("download");
    await command("export");
    const download = await dl;
    const file = join(tmp, name);
    await download.saveAs(file);
    return { file, suggested: download.suggestedFilename() };
  };
  const importFrom = async (file) => {
    const chooser = page.waitForEvent("filechooser");
    await command("import");
    await (await chooser).setFiles(file);
    await fr();
  };
  // Chaque bouton de la barre : boîte entière dans la fenêtre, hors de la scène.
  const allVisible = async (bar) => {
    const stage = await page.locator("#stage").boundingBox();
    const boxes = await page.locator(`${bar} button`).evaluateAll((bs) =>
      bs.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, id: b.dataset.item ?? b.dataset.preset ?? b.textContent };
      }),
    );
    const bad = boxes.filter(
      (r) =>
        r.x < 0 || r.y < 0 || r.x + r.w > VIEWPORT.width || r.y + r.h > VIEWPORT.height ||
        (r.x < stage.x + stage.width && r.x + r.w > stage.x && r.y < stage.y + stage.height && r.y + r.h > stage.y),
    );
    return { n: boxes.length, bad: bad.map((r) => r.id) };
  };
  const presets = () => count(`${OUTILS} button[data-preset]`);
  const BAR = '[data-edit-bar="outils"]';

  // 1. S1 : simple, puis retour à defaut.
  await page.goto(url);
  await ready();
  await chooseProfile("simple");
  check((await count(`${OUTILS}[data-dock="left"]`)) === 1, "profil simple choisi : barre d'outils à gauche");
  await chooseProfile("defaut");
  check((await count(`${OUTILS}[data-dock="floating"]`)) === 1, "retour au profil par défaut : barre en îlot");
  check((await presets()) === 3, "stylo actif : trois préréglages dans la barre (button[data-preset])");

  // 2. S1 : l'éditeur, sur un brouillon.
  await command("edit");
  await waitFor("[data-profile-editor]");
  await page.click(`${BAR} [data-edit="dock"] [data-choice="left"]`);
  await page.click('[data-edit="button-size"] [data-choice="l"]');
  await page.click('[data-edit-item="eraser"] button[data-edit="shown"]');
  check(await page.isDisabled('[data-edit-item="profiles"] button[data-edit="shown"]'), "éditeur : l'œil de Profil est grisé");
  await page.click('button[data-edit="preset-add"]');
  await page.click('button[data-edit="preset-add"]');
  check((await count("[data-edit-preset]")) === 5, "éditeur : cinq préréglages du stylo dans le brouillon");
  await waitFor(`${OUTILS}[data-dock="left"][data-size="l"]`);
  check(
    (await count(`${OUTILS}[data-dock="left"][data-size="l"]`)) === 1 && (await count(item("eraser"))) === 0,
    "aperçu : la barre est à gauche, en l, sans gomme, avant tout enregistrement",
  );
  await page.locator("[data-profile-editor]").evaluate((e) => {
    e.scrollTop = 0;
    for (let p = e.parentElement; p; p = p.parentElement) p.scrollTop = 0;
  });
  await shot("editeur");
  const proposed = await page.inputValue('input[data-edit="new-name"]');
  check(proposed === "Par défaut (copie)", `nom proposé « ${proposed} »`);
  await page.fill('input[data-edit="new-name"]', "CM1");
  await page.click('button[data-edit="save-new"]');
  await gone("[data-profile-editor]");
  check((await count(`${OUTILS}[data-dock="left"][data-size="l"]`)) === 1, "enregistré : barre d'outils à gauche, grands boutons");
  check((await count(item("eraser"))) === 0, "enregistré : la gomme est masquée");
  check((await noOverlap(page, OUTILS)).apart, "la barre à gauche ne recouvre pas la scène");
  const vis = await allVisible(OUTILS);
  check(vis.n > 0 && vis.bad.length === 0, `barre à gauche en l : ${vis.n} boutons tous dans la fenêtre, hors scène${vis.bad.length ? ` (hors : ${vis.bad.join(", ")})` : ""}`);

  // 3. S1 : rechargé.
  await page.reload();
  await ready();
  check((await count(`${OUTILS}[data-dock="left"]`)) === 1, "rechargé : barre outils à gauche");
  check((await page.getAttribute(OUTILS, "data-size")) === "l", 'rechargé : data-size="l"');
  check((await count(item("eraser"))) === 0, "rechargé : sans eraser");
  check((await page.getAttribute("#stage", "data-tool")) === "pen", "rechargé : stylo actif");
  check((await presets()) === 5, "rechargé : cinq boutons data-preset");
  check((await activeProfile()) === "cm1", "rechargé : cm1 actif");
  const vis2 = await allVisible(OUTILS);
  check(vis2.n > 0 && vis2.bad.length === 0, `rechargé : ${vis2.n} boutons tous dans la fenêtre, hors scène`);
  await shot("barre-gauche-l");

  // 4. S1 : exporter.
  const cm1 = await exportTo("cm1.rbprofile");
  check(cm1.suggested === "cm1.rbprofile", `export : « ${cm1.suggested} » téléchargé`);
  const exported = JSON.parse(await readFile(cm1.file, "utf8"));
  check(
    exported.format === "roomboard-profile" && exported.id === "cm1" && exported.basedOn === "defaut" && exported.minor === 1,
    "export : format roomboard-profile, id cm1, basedOn defaut, minor 1",
  );

  // 5. S1 : tout remettre à zéro (confirmé).
  const d5 = dialogs.length;
  await command("reset-all");
  await waitDialog("confirm", d5);
  await waitFor(`${OUTILS}[data-dock="floating"]`);
  check((await activeProfile()) === "defaut", "tout remis à zéro : defaut actif, barre en haut");
  await menu();
  check((await count('[data-profile="cm1"]')) === 0, "tout remis à zéro : cm1 absent du menu");
  await closeMenu();

  // 6. S1 : réimporter cm1.
  await importFrom(cm1.file);
  await waitFor(`${OUTILS}[data-dock="left"][data-size="l"]`);
  check((await count(item("eraser"))) === 0, "réimporté : barre à gauche en grand, sans gomme");
  check((await activeProfile()) === "cm1", "réimporté : cm1 actif");

  // 7. S2 : profil 1.2 à outil inconnu.
  await importFrom(join(FIXTURES, "1.2-outil-inconnu.rbprofile"));
  await waitFor(`${OUTILS}[data-dock="top"]`);
  check((await activeProfile()) === "futur", "1.2 importé : profil futur actif");
  check(
    (await count(item("laser"))) === 0 && (await count(item("minuteur"))) === 0 && (await count(item("pen"))) === 1,
    "1.2 : l'outil et l'action inconnus ne sont pas dans la barre",
  );
  await command("edit");
  await waitFor("[data-profile-editor]");
  check((await count('[data-edit-item="laser"][data-unknown]')) === 1, "1.2 : l'élément inconnu est grisé dans l'éditeur");
  await page.click('button[data-edit="close"]');
  await gone("[data-profile-editor]");
  const futur = await exportTo("futur.rbprofile");
  const back = JSON.parse(await readFile(futur.file, "utf8"));
  const items = back.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items));
  check(
    items.some((i) => i.id === "laser" && i.tool === "laser") && back.theme === "sombre" && back.minor === 2 && back.toolbars[0].couleur === "bleu",
    "1.2 réexporté : élément et clés inconnus toujours là, minor 2",
  );

  // 8. S2 : profil 2.0 refusé.
  const d8 = dialogs.length;
  await importFrom(join(FIXTURES, "2.0-majeure.rbprofile"));
  const refus = await waitDialog("alert", d8);
  check(refus.message.includes("mettez RoomBoard à jour"), `2.0 refusé : « ${refus.message} »`);
  check((await activeProfile()) === "futur", "2.0 refusé : profil actif inchangé");

  // 9. S2 : réimporter cm1 alors qu'il existe, Annuler.
  answer = "dismiss";
  const d9 = dialogs.length;
  await importFrom(cm1.file);
  const ask = await waitDialog("confirm", d9);
  answer = "accept";
  check(ask.message === "Remplacer le profil « CM1 » ?", `id pris : « ${ask.message} »`);
  check((await activeProfile()) === "futur", "Annuler : rien n'est importé, profil actif inchangé");

  // 10. S5 (navigateur) : « Annotation au démarrage », rechargé : tableau ordinaire, aucun message.
  await chooseProfile("annotation");
  const d10 = dialogs.length;
  await page.reload();
  await ready();
  check((await activeProfile()) === "annotation", "annotation active après rechargement");
  check(
    (await count(`${OUTILS}[data-dock="floating"]`)) === 1 && ((await page.textContent("#etat")) ?? "") === "",
    "annotation au navigateur : tableau ordinaire, #etat vide",
  );
  check(dialogs.length === d10, "annotation au navigateur : aucune boîte");

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
  const server = await serve();
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c1-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const page = await context.newPage();
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp });
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
