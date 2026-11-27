#!/usr/bin/env node
// Essai personnalisation-2 (OG11, lot 1) au navigateur (docs/plans/personnalisation-2-cadrage.md § 6, S1 à S5) : panneau
// d'options de l'outil à gauche et menu ☰. Chaque scénario est joué au doigt (événements tactiles du protocole,
// pointerType « touch », taps de page.touchscreen) puis au clavier (Tab, flèches, Entrée, Espace, Échap ; le tracé reste
// tactile, il n'a pas d'équivalent clavier). L'état du document est lu dans le fichier enregistré (Ctrl+S) par
// `roomboard state` (CLI de T5), les attributs de `#stage` et les empreintes de pixels. Écart au cadrage (S3.5) : la gomme
// partielle ne coupe que les traits (crates/roomboard-core/src/commands.rs) ; elle est jouée sur un trait du stylo en
// transparence 40, pas sur un rectangle en tirets. Netteté du § 10 de docs/plans/design-cadrage.md à 2x, contre-épreuve.
// Chromium de Playwright, --disable-lcd-text, --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/personnalisation-2-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/design/captures/personnalisation-2/<nom>-{rect,menu,panneau,mixte}.png (2x ; « apres » ajoute replie) ;
//   --dist : sert un autre build ; --nom avant : captures seules (le build d'avant n'a ni panneau ni menu neuf), mesures sautées.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { clickItem, DIST, Echec, foldOptions, frames, gitSha, item, loadPlaywright, openMenuOf, ROOT, serve, stageBox, VIEWPORT } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "personnalisation-2";
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const URL_QS = "/?fichiers=repli";
const BIN = join(ROOT, "apps", "cli", "dist", "roomboard.mjs");
const OUT = join(ROOT, "docs", "design", "captures", "personnalisation-2");
const OPT = "[data-options]";
const BLUE = "#1d4ed8";
const RED = "#dc2626";
const YELLOW = "#fef08a";
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};
/** Ligne de lecture imprimée (preuve visuelle) : `Lire : <clé>=<valeur>`. */
const lire = (key, value) => console.log(`Lire : ${key}=${value}`);

// ---------------------------------------------------------------------------------------------------- page et gestes

async function newPage(browser, base, { scale = 1, query = URL_QS, fold = false, size = VIEWPORT } = {}) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: scale, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  if (fold) await foldOptions(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}${query}`);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  return { ctx, page, cdp, errors };
}
const attr = (page, name) => page.getAttribute("#stage", name);
async function waitAttr(page, name, v) {
  await page
    .waitForFunction(([n, x]) => document.querySelector("#stage")?.getAttribute(n) === x, [name, v], { timeout: 15000 })
    .catch(async () => {
      throw new Echec(`#stage ${name} attendu « ${v} », lu « ${await attr(page, name)} »`);
    });
  await frames(page);
}
/** Doigt : un contact de bout en bout (touchStart, touchMove interpolés, touchEnd) en px de la scène. `hold` : rend la main
 *  avant le relâché ; l'appelant appelle alors `end()`. */
async function touchDrag(page, cdp, from, to, { hold = false, steps = 10 } = {}) {
  const box = await stageBox(page);
  const at = ([x, y]) => ({ x: Math.round(box.x + x), y: Math.round(box.y + y) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(from)] });
  for (let i = 1; i <= steps; i++) {
    const p = at([from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps]);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p] });
  }
  const end = async () => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await frames(page);
  };
  if (hold) {
    await frames(page);
    return end;
  }
  await end();
  return end;
}
/** Cadre de sélection : à la souris (un doigt posé sur le vide fait glisser la page, comme dans les essais existants). */
async function marquee(page, from, to) {
  const b = await stageBox(page);
  await page.mouse.move(b.x + from[0], b.y + from[1]);
  await page.mouse.down();
  await page.mouse.move(b.x + (from[0] + to[0]) / 2, b.y + (from[1] + to[1]) / 2, { steps: 4 });
  await page.mouse.move(b.x + to[0], b.y + to[1], { steps: 4 });
  await page.mouse.up();
  await frames(page);
}
async function tapAt(page, x, y) {
  await page.touchscreen.tap(x, y);
  await frames(page);
}
async function tapStage(page, x, y) {
  const b = await stageBox(page);
  await tapAt(page, b.x + x, b.y + y);
}
/** Active un bouton : au doigt, un tap sur son centre ; au clavier, le focus puis Espace. */
async function press(page, mode, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 15000 });
  if (mode === "doigt") {
    const b = await loc.boundingBox();
    await tapAt(page, b.x + b.width / 2, b.y + b.height / 2);
  } else {
    await loc.focus();
    await page.keyboard.press("Space");
    await frames(page);
  }
}
const opt = (key, value) => `${OPT} [data-option="${key}"] [data-option-value="${value}"]`;
/** Choix d'une section du panneau : doigt ou clavier. */
const choose = (page, mode, key, value) => press(page, mode, opt(key, value));
/** Pastille enfoncée ? */
const pressed = async (page, key, value) => {
  const el = page.locator(opt(key, value)).first();
  return ((await el.getAttribute("aria-pressed")) ?? (await el.getAttribute("aria-checked"))) === "true";
};
/** Transparence : au doigt, un tap à la bonne place de la glissière ; au clavier, des flèches depuis la valeur lue. */
async function setOpacity(page, mode, target) {
  const input = page.locator(`${OPT} [data-option="opacity"] input[type="range"]`);
  if (mode === "doigt") {
    const b = await input.boundingBox();
    const thumb = 16; // largeur approchée du curseur : le tap vise la valeur, la flèche corrige le reste
    await tapAt(page, b.x + thumb / 2 + ((b.width - thumb) * target) / 100, b.y + b.height / 2);
  } else {
    await input.focus();
  }
  for (let i = 0; i < 30 && Number(await input.inputValue()) !== target; i++) {
    await page.keyboard.press(Number(await input.inputValue()) < target ? "ArrowRight" : "ArrowLeft");
    await frames(page);
  }
  check(Number(await input.inputValue()) === target, `transparence réglée à ${target} (${mode})`);
}
async function useTool(page, mode, id) {
  await press(page, mode, item(id));
}
/** Empreinte (SHA-256) des pixels d'un rectangle de la scène, en px de la scène : captures de page, tout composé. */
async function fingerprint(page, [x0, y0, x1, y1]) {
  const b = await stageBox(page);
  const png = await page.screenshot({ clip: { x: b.x + x0, y: b.y + y0, width: x1 - x0, height: y1 - y0 }, animations: "disabled", caret: "hide" });
  return createHash("sha256").update(png).digest("hex").slice(0, 12);
}
/** Enregistre (Ctrl+S, repli : un téléchargement) et lit l'état par `roomboard state` : éléments à plat. */
async function saved(page, tmp, name) {
  const dl = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const file = join(tmp, name);
  await (await dl).saveAs(file);
  return { file, elements: readState(file) };
}
function readState(file) {
  const r = spawnSync("node", [BIN, "run", file, "--ops", "-"], { encoding: "utf8", input: `${JSON.stringify({ op: "state" })}\n` });
  if (r.status !== 0) throw new Echec(`roomboard state : code ${r.status} ${r.stderr}`);
  const line = r.stdout.split("\n").filter((l) => l !== "").map((l) => JSON.parse(l)).find((l) => l.state);
  if (!line) throw new Echec(`roomboard state : aucune ligne state (${r.stdout.slice(0, 200)})`);
  return line.state.pages.flatMap((p) => p.elements);
}
const looks = (els) => els.map((e) => e.look ?? {});

// ---------------------------------------------------------------------------------------------------------- scénarios

/** S1 : rectangle réglé. */
async function s1(browser, base, mode, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  const rect = [[300, 300], [520, 430]];
  const box = [296, 296, 524, 434];
  await useTool(page, mode, "rect");
  check((await page.locator(OPT).count()) === 1 && (await page.locator(OPT).isVisible()), `S1.1 (${mode}) : [data-options] visible avec l'outil Rectangle`);
  const keys = await page.$$eval(`${OPT} [data-option]`, (els) => els.map((e) => e.getAttribute("data-option")));
  lire("[data-option] (rect)", keys.join(","));
  check(keys.join(",") === "strokeColor,background,strokeWidth,strokeStyle,roughness,roundness,opacity", "S1.1 : sections Trait, Arrière-plan, Largeur, Style du trait, Style de tracé, Angles, Transparence");
  await choose(page, mode, "strokeColor", BLUE);
  await choose(page, mode, "background", YELLOW);
  await choose(page, mode, "strokeWidth", "8");
  await choose(page, mode, "strokeStyle", "dashed");
  await choose(page, mode, "roughness", "1");
  await choose(page, mode, "roundness", "round");
  await setOpacity(page, mode, 50);
  check(await pressed(page, "strokeColor", BLUE), "S1.2 : Bleu enfoncé");
  const end = await touchDrag(page, cdp, rect[0], rect[1], { hold: true });
  const preview = await fingerprint(page, box);
  await end();
  await waitAttr(page, "data-elements", "1");
  const posed = await fingerprint(page, box);
  lire("empreinte aperçu=empreinte posé", `${preview}=${posed}`);
  check(preview === posed, "S1.3 : l'aperçu avant le relâché a la même empreinte que l'objet posé (graine stable)");
  let s = await saved(page, tmp, `s1-${mode}.roomboard`);
  const l = s.elements[0]?.look ?? {};
  lire("élément posé", `strokeStyle=${l.strokeStyle} roughness=${l.roughness} roundness=${l.roundness} opacity=${l.opacity} width=${s.elements[0]?.style?.width}`);
  check(l.strokeStyle === "dashed" && l.roughness === 1 && l.roundness === "round" && l.opacity === 50 && s.elements[0].style.width === 8, "S1.3 : strokeStyle dashed, roughness 1, roundness round, opacity 50, width 8");
  check(Number.isInteger(l.seed) && s.elements[0].shape.fill !== null, "S1.3 : seed entier et fill présents");
  // Même rectangle en Architecte : empreinte différente.
  await page.keyboard.press("Control+z");
  await waitAttr(page, "data-elements", "0");
  check(true, "S1.4 : Ctrl+Z, le rectangle disparaît");
  await choose(page, mode, "roughness", "0");
  await touchDrag(page, cdp, rect[0], rect[1]);
  await waitAttr(page, "data-elements", "1");
  const architect = await fingerprint(page, box);
  check(architect !== posed, `S1.3 : l'empreinte d'Artiste (${posed}) diffère de celle d'Architecte (${architect})`);
  await page.keyboard.press("Control+z");
  await waitAttr(page, "data-elements", "0");
  await choose(page, mode, "roughness", "1");
  await touchDrag(page, cdp, rect[0], rect[1]);
  await waitAttr(page, "data-elements", "1");
  s = await saved(page, tmp, `s1b-${mode}.roomboard`);
  check(s.elements.length === 1 && s.elements[0].look?.strokeStyle === "dashed" && s.elements[0].look?.opacity === 50, "S1.5 : rectangle reposé et enregistré");
  // Rouvrir : le fichier enregistré passe par le sélecteur de fichier du repli.
  const tabs0 = await page.locator('[role="tab"][data-tab]').count();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(s.file);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, tabs0 + 1, { timeout: 15000 });
  await waitAttr(page, "data-elements", "1");
  const again = await saved(page, tmp, `s1c-${mode}.roomboard`);
  check(JSON.stringify(looks(again.elements)[0]) === JSON.stringify(looks(s.elements)[0]), `S1.5 : rouvert, les champs sont là (${JSON.stringify(looks(again.elements)[0])})`);
  check(errors.length === 0, `S1 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S1 OK" : "S1 OK (clavier)");
}

/** S2 : sélection mixte et style courant. */
async function s2(browser, base, mode, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  await useTool(page, mode, "rect");
  await touchDrag(page, cdp, [380, 250], [500, 350]);
  await choose(page, mode, "strokeColor", RED);
  await touchDrag(page, cdp, [600, 250], [720, 350]);
  await waitAttr(page, "data-elements", "2");
  await useTool(page, mode, "select");
  await marquee(page, [340, 200], [780, 400]);
  await waitAttr(page, "data-selection", "2");
  const sec = `${OPT} [data-option="strokeColor"]`;
  check((await page.locator(`${sec}[data-mixed]`).count()) === 1, "S2.2 : la section Trait porte data-mixed");
  check((await page.locator(`${sec} [aria-pressed="true"]`).count()) === 0, "S2.2 : aucune pastille enfoncée");
  await choose(page, mode, "strokeColor", BLUE);
  let s = await saved(page, tmp, `s2a-${mode}.roomboard`);
  check(s.elements.length === 2 && s.elements.every((e) => e.style.color === BLUE), "S2.3 : Bleu : les deux rectangles sont bleus");
  await page.keyboard.press("Control+z");
  await frames(page);
  s = await saved(page, tmp, `s2b-${mode}.roomboard`);
  check(s.elements.map((e) => e.style.color).sort().join() === ["#000000", RED].sort().join(), `S2.3 : Ctrl+Z, une étape : noir et rouge reviennent (${s.elements.map((e) => e.style.color)})`);
  await useTool(page, mode, "pen");
  check(await pressed(page, "strokeColor", BLUE), "S2.4 : Stylo : la pastille bleue est enfoncée (style courant)");
  await setOpacity(page, mode, 60);
  const rouge = page.locator('button[data-preset]', { hasText: "Rouge" }).first();
  await rouge.waitFor({ state: "visible", timeout: 15000 });
  const rb = await rouge.boundingBox();
  if (mode === "doigt") await tapAt(page, rb.x + rb.width / 2, rb.y + rb.height / 2);
  else {
    await rouge.focus();
    await page.keyboard.press("Space");
    await frames(page);
  }
  check(await pressed(page, "strokeColor", RED), "S2.4 : préréglage « Rouge » : la pastille rouge s'enfonce");
  check(Number(await page.locator(`${OPT} [data-option="opacity"] input`).inputValue()) === 60, "S2.4 : la transparence choisie avant reste (60)");
  await touchDrag(page, cdp, [400, 500], [700, 520]);
  s = await saved(page, tmp, `s2c-${mode}.roomboard`);
  const trait = s.elements.find((e) => e.kind === "stroke") ?? s.elements[s.elements.length - 1];
  check(trait.style.color === RED && trait.look?.opacity === 60, `S2.4 : le trait est rouge, transparence 60 (${trait.style.color}, ${trait.look?.opacity})`);
  await page.reload();
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  check((await attr(page, "data-tool")) === "pen" && (await pressed(page, "strokeColor", RED)), "S2.4 : rechargé : Stylo actif, pastille rouge enfoncée (style gardé sur l'appareil)");
  check(errors.length === 0, `S2 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S2 OK" : "S2 OK (clavier)");
}

/** S3 : dupliquer, supprimer, panneau masqué, gomme partielle sur un trait en transparence. */
async function s3(browser, base, mode, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  await useTool(page, mode, "rect");
  await touchDrag(page, cdp, [400, 300], [540, 400]);
  await waitAttr(page, "data-elements", "1");
  await useTool(page, mode, "select");
  await marquee(page, [360, 260], [580, 440]);
  await waitAttr(page, "data-selection", "1");
  const dup = `${OPT} [data-option="actions"] [data-option-value="duplicate"]`;
  const del = `${OPT} [data-option="actions"] [data-option-value="delete"]`;
  check((await page.locator(dup).count()) === 1 && (await page.locator(del).count()) === 1, "S3.1 : Actions montre Dupliquer et Supprimer");
  check((await page.locator("button[data-selection-action]").count()) > 0, "S3.1 : la barre garde sa rangée Sélection (data-selection-action)");
  const bounds0 = (await attr(page, "data-bounds")).split(",").map(Number);
  const paste0 = await page.locator(item("paste")).count() ? await page.locator(item("paste")).isDisabled() : null;
  await press(page, mode, dup);
  await waitAttr(page, "data-elements", "2");
  const bounds1 = (await attr(page, "data-bounds")).split(",").map(Number);
  const cam = (await attr(page, "data-camera")).split(",").map(Number);
  check((await attr(page, "data-selection")) === "1", "S3.2 : Dupliquer : 2 objets, la copie est sélectionnée");
  check(Math.abs(bounds1[0] - bounds0[0] - 10) < 0.5 && Math.abs(bounds1[1] - bounds0[1] - 10) < 0.5, `S3.2 : la copie est décalée de +10/+10 (${bounds1[0] - bounds0[0]}, ${bounds1[1] - bounds0[1]}, zoom ${cam[0]})`);
  const paste1 = await page.locator(item("paste")).count() ? await page.locator(item("paste")).isDisabled() : null;
  check(paste0 === paste1, `S3.2 : le presse-papiers n'a pas changé (paste désactivé : ${paste0} puis ${paste1})`);
  await page.keyboard.press("Control+z");
  await waitAttr(page, "data-elements", "1");
  check(true, "S3.2 : Ctrl+Z : 1 objet");
  await page.keyboard.press("Control+d");
  await waitAttr(page, "data-elements", "2");
  check(true, "S3.2 : Ctrl+D : 2 objets");
  await press(page, mode, del);
  await waitAttr(page, "data-elements", "1");
  check(true, "S3.3 : Supprimer : 1 objet");
  await useTool(page, mode, "select");
  await tapStage(page, 900, 700);
  await waitAttr(page, "data-selection", "0");
  check((await page.locator(OPT).count()) === 0, "S3.4 : Sélection, toucher le vide : le panneau est masqué");
  // S3.5 : gomme partielle sur un trait du stylo en transparence 40.
  await useTool(page, mode, "pen");
  await setOpacity(page, mode, 40);
  await touchDrag(page, cdp, [400, 600], [800, 600], { steps: 20 });
  await waitAttr(page, "data-elements", "2");
  await useTool(page, mode, "eraser");
  if ((await page.locator(item("eraser-mode")).count()) > 0 && (await page.locator(item("eraser-mode")).getAttribute("aria-pressed")) === "true") await press(page, mode, item("eraser-mode"));
  await touchDrag(page, cdp, [600, 570], [600, 630], { steps: 8 });
  await frames(page);
  const s = await saved(page, tmp, `s3-${mode}.roomboard`);
  const pieces = s.elements.filter((e) => e.kind === "stroke");
  lire("gomme partielle : morceaux", `${pieces.length} opacités=${pieces.map((e) => e.look?.opacity)}`);
  check(pieces.length >= 2 && pieces.every((e) => e.look?.opacity === 40), "S3.5 : le trait coupé en morceaux garde sa transparence 40");
  check(errors.length === 0, `S3 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S3 OK" : "S3 OK (clavier)");
}

const ORDER = ["file-new", "file-open", "file-import", "file-save", "file-save-as"];
/** S4 : menu ☰. */
async function s4(browser, base, mode) {
  const { ctx, page, errors } = await newPage(browser, base);
  const toggle = "[data-toolbar] [data-menu-toggle]";
  const list = "[data-menu-list]";
  if (mode === "doigt") await press(page, mode, toggle);
  else {
    await page.locator(toggle).first().focus();
    await page.keyboard.press("Enter");
    await frames(page);
  }
  await page.locator(list).first().waitFor({ state: "visible", timeout: 15000 });
  const rows = await page.$$eval(`${list} [data-item]`, (els) => els.map((e) => ({ id: e.getAttribute("data-item"), text: (e.textContent ?? "").trim(), key: e.querySelector("[data-shortcut]")?.textContent ?? null })));
  lire("lignes du menu", rows.map((r) => r.text).join(" | "));
  const ids = rows.map((r) => r.id);
  check(ORDER.every((id, i) => ids.indexOf(id) === (i === 0 ? ids.indexOf(id) : ids.indexOf(ORDER[i - 1]) + 1) && ids.indexOf(id) >= 0), `S4.1 : Nouveau, Ouvrir, Importer, Enregistrer, Enregistrer sous dans l'ordre (${ids.slice(0, 6)})`);
  const open = rows.find((r) => r.id === "file-open");
  lire("[data-shortcut] de file-open", open?.key);
  check(open?.key === "Ctrl+O", "S4.1 : Ouvrir porte « Ctrl+O »");
  const tail = ids.slice(-3).join();
  check(/grid/.test(tail) && /settings/.test(tail) && /profiles/.test(tail), `S4.1 : le menu finit par Grille, Réglages, Profil (${tail})`);
  check(!rows.some((r) => /github|discord|thème|langue|recherche/i.test(r.text)), "S4.1 : aucune ligne GitHub, Discord, thème, langue ou recherche");
  if (mode === "doigt") {
    await tapStage(page, 700, 500);
    await page.locator(list).first().waitFor({ state: "hidden", timeout: 15000 });
    check(true, "S4.2 : toucher hors du menu le ferme");
  } else {
    const first = await page.evaluate(() => document.activeElement?.getAttribute("data-item") ?? null);
    check(first === rows[0].id, `S4.2 : Entrée sur ☰ : le focus va à la première ligne (${first})`);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await page.locator(list).first().waitFor({ state: "hidden", timeout: 15000 });
    check(await page.evaluate(() => document.activeElement?.hasAttribute("data-menu-toggle") ?? false), "S4.2 : Échap ferme le menu et rend le focus au bouton ☰");
    await page.keyboard.press("Enter");
    await page.locator(list).first().waitFor({ state: "visible", timeout: 15000 });
    await page.keyboard.press("Tab");
    await page.locator(list).first().waitFor({ state: "hidden", timeout: 15000 });
    check(true, "S4.2 : rouvert, Tab ferme le menu");
  }
  check(errors.length === 0, `S4 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S4 OK" : "S4 OK (clavier)");
}

/** S5 : clavier dans le panneau, repli gardé au rechargement. */
async function s5(browser, base, mode) {
  const { ctx, page, errors } = await newPage(browser, base);
  await useTool(page, mode, "ellipse");
  lire("[data-options] présent", await page.locator(OPT).count());
  await page.locator(item("ellipse")).focus();
  let inside = "";
  for (let i = 0; i < 80 && inside !== "strokeStyle"; i++) {
    await page.keyboard.press("Tab");
    inside = await page.evaluate(() => document.activeElement?.closest("[data-option]")?.getAttribute("data-option") ?? "");
  }
  check(inside === "strokeStyle", "S5.1 : Tab atteint le groupe « Style du trait »");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await frames(page);
  check(await pressed(page, "strokeStyle", "dotted"), "S5.1 : flèches dans « Style du trait » : Pointillés est choisi");
  await press(page, mode, `${OPT} [data-options-toggle]`);
  check((await page.locator(`${OPT}[data-collapsed]`).count()) === 1 && (await page.locator(`${OPT} [data-option]`).count()) === 0, "S5.2 : le panneau est replié");
  await page.reload();
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  check((await page.locator(`${OPT}[data-collapsed]`).count()) === 1, "S5.2 : rechargé, il reste replié");
  await press(page, mode, `${OPT} [data-options-toggle]`);
  check((await page.locator(`${OPT} [data-option]`).count()) > 0, "S5.2 : déplié de nouveau");
  check(errors.length === 0, `S5 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S5 OK" : "S5 OK (clavier)");
}

/** Lectures du plan : largeur en S, hauteur des boutons, attributs. */
async function lectures(browser, base) {
  const { ctx, page, errors } = await newPage(browser, base);
  await page.click(item("rect"));
  await frames(page);
  lire("[data-options] présent", await page.locator(OPT).count());
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click('[data-profile-cmd="edit"]');
  await page.waitForSelector("[data-profile-editor]", { timeout: 15000 });
  await page.click('[data-edit="button-size"] [data-choice="s"]');
  await frames(page);
  const w = Math.round((await page.locator(OPT).boundingBox()).width);
  lire("largeur [data-options] en S", w);
  check(w === 260, `largeur du panneau en S : ${w} (260)`);
  await ctx.close();
  const m = await newPage(browser, base);
  await m.page.click(item("rect"));
  await frames(m.page);
  const min = await m.page.$$eval(`${OPT} button, ${OPT} input[type="range"]`, (els) => Math.min(...els.map((e) => e.getBoundingClientRect().height)));
  lire("hauteur min des boutons du panneau≥44", Math.round(min));
  check(min >= 44, `hauteur minimale des boutons du panneau : ${min} px (≥ 44)`);
  check(m.errors.length === 0 && errors.length === 0, "lectures : aucune erreur dans la page");
  await m.ctx.close();
}

// ------------------------------------------------------------------------------------------------ netteté et captures

const WHITE = hex("#ffffff");
const transpose = (px) => {
  const data = new Uint8ClampedArray(px.data.length);
  for (let y = 0; y < px.height; y++) {
    for (let x = 0; x < px.width; x++) data.set(px.data.subarray((y * px.width + x) * 4, (y * px.width + x) * 4 + 4), (x * px.height + y) * 4);
  }
  return { width: px.height, height: px.width, data };
};
const rgbOf = (s) => (/\d+/g.exec(s) ? s.match(/\d+/g).slice(0, 3).map(Number) : [0, 0, 0]);
async function colorsOf(page, sel) {
  return page.evaluate((q) => {
    const b = document.querySelector(q);
    const svg = b.querySelector("svg") ?? b;
    return { bg: getComputedStyle(b).backgroundColor, ink: getComputedStyle(svg).color };
  }, sel);
}
async function iconBox(page, sel) {
  return page.locator(`${sel} svg.rb-icon`).first().boundingBox();
}
async function calage(page, scope, label, min) {
  const boxes = await page.$$eval(`${scope} svg.rb-icon`, (els) =>
    els.filter((e) => e.getClientRects().length > 0).map((e) => {
      const r = e.getBoundingClientRect();
      return { icon: e.getAttribute("data-icon"), x: r.x, y: r.y, w: r.width, h: r.height };
    }));
  const bad = boxes.filter((b) => !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2));
  check(boxes.length >= min && bad.length === 0, `calage (${label}) : ${boxes.length} icônes sur la grille de pixels${bad.length ? `, hors grille : ${JSON.stringify(bad)}` : ""}`);
}
async function counterProof(page) {
  await page.evaluate(() => {
    const ns = "http://www.w3.org/2000/svg";
    const host = document.createElement("div");
    host.id = "temoin-nettete";
    host.style.cssText = "position:fixed;left:200px;top:400px;width:24px;height:24px;background:#ffffff;color:#182946;z-index:50";
    const svg = document.createElementNS(ns, "svg");
    for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: "24", height: "24", fill: "none", stroke: "currentColor", "stroke-width": "1.5" })) svg.setAttribute(k, v);
    svg.style.display = "block";
    const rect = document.createElementNS(ns, "rect");
    for (const [k, v] of Object.entries({ width: "18", height: "18", x: "3.3", y: "3.3", rx: "2" })) rect.setAttribute(k, v);
    svg.append(rect);
    host.append(svg);
    document.body.append(host);
  });
  await frames(page);
  const px = await pixelsOf(page, { x: 200, y: 400, width: 24, height: 24 });
  const row = edgeRow(px, 24, 0, px.width, WHITE, hex("#182946"));
  await page.evaluate(() => document.getElementById("temoin-nettete")?.remove());
  check(row.intermediate >= 2, `contre-épreuve : le témoin flou donne ${row.intermediate} pixels intermédiaires (≥ 2), la mesure n'est pas aveugle`);
}
/** Netteté § 10 à 2x du panneau et du menu. */
async function nettete(browser, base) {
  const { ctx, page, errors } = await newPage(browser, base, { scale: 2 });
  await page.click(item("rect"));
  await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await frames(page);
  await calage(page, OPT, "panneau d'options", 6);
  const results = [];
  const measure = async (name, sel, mode) => {
    const px = await pixelsOf(page, await iconBox(page, sel));
    const { bg, ink } = await colorsOf(page, sel);
    const b = rgbOf(bg);
    const i = rgbOf(ink);
    const bgc = /rgba\(.*, 0\)|transparent/.test(bg) ? WHITE : b;
    const f = fringes(px, bgc, i);
    let line = `${name} : frange ${f}`;
    if (mode === "row-vertical") {
      const row = edgeRow(px, 32, 0, px.width, bgc, i);
      line += `, rangée y=32 : ${row.intermediate} pixels intermédiaires, traits ${JSON.stringify(row.runs)}`;
      results.push({ name, f, inter: row.intermediate });
    } else if (mode === "column-dashed") {
      const row = edgeRow(transpose(px), 11, 0, px.height, bgc, i);
      line += `, colonne x=11 : ${row.intermediate} pixels intermédiaires, traits ${JSON.stringify(row.runs)}`;
      results.push({ name, f, inter: row.intermediate });
    } else results.push({ name, f, inter: 0 });
    console.log(`netteté — ${line}`);
  };
  // Segment enfoncé : « Style du trait » (Continu est choisi par défaut), icône Continu sur fond de segment enfoncé.
  await measure("segment enfoncé « Continu »", `${OPT} [data-option="strokeStyle"] [data-option-value="solid"]`, "plain");
  await measure("icône stroke-dashed", `${OPT} [data-option="strokeStyle"] [data-option-value="dashed"]`, "column-dashed");
  await measure("icône corner-round", `${OPT} [data-option="roundness"] [data-option-value="round"]`, "row-vertical");
  await measure("icône corner-sharp", `${OPT} [data-option="roundness"] [data-option-value="sharp"]`, "row-vertical");
  const bad = results.filter((r) => r.f !== 0);
  check(bad.length === 0, `netteté § 10 du panneau : 0 frange colorée (${results.map((r) => `${r.name} ${r.f}`).join(" ; ")})`);
  // Menu.
  await page.click("[data-toolbar] [data-menu-toggle]");
  await page.locator("[data-menu-list]").first().waitFor({ state: "visible", timeout: 15000 });
  await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await frames(page);
  await calage(page, "[data-menu-list]", "menu ☰", 5);
  const rowSel = `[data-menu-list] [data-item="file-open"]`;
  const rowBox = await page.locator(rowSel).boundingBox();
  const rowPx = await pixelsOf(page, { x: Math.floor(rowBox.x), y: Math.floor(rowBox.y), width: Math.ceil(rowBox.width), height: Math.ceil(rowBox.height) });
  const rowColors = await page.evaluate((q) => {
    const b = document.querySelector(q);
    return { bg: getComputedStyle(b.closest("[data-menu-list]")).backgroundColor, ink: getComputedStyle(b).color };
  }, rowSel);
  const menuFringes = fringes(rowPx, rgbOf(rowColors.bg), rgbOf(rowColors.ink));
  console.log(`netteté — ligne « Ouvrir » du menu (${rowColors.ink} sur ${rowColors.bg}) : frange ${menuFringes}`);
  check(menuFringes === 0, "netteté § 10 du menu : ligne Ouvrir, 0 frange colorée");
  const menuIcon = page.locator("[data-menu-list] svg.rb-icon");
  if ((await menuIcon.count()) > 0) {
    const ibox = await menuIcon.first().boundingBox();
    const ipx = await pixelsOf(page, ibox);
    const ic = await page.evaluate(() => getComputedStyle(document.querySelector("[data-menu-list] svg.rb-icon")).color);
    const iFr = fringes(ipx, rgbOf(rowColors.bg), rgbOf(ic));
    console.log(`netteté — première icône du menu : frange ${iFr}`);
    check(iFr === 0, "netteté § 10 du menu : icône, 0 frange colorée");
  }
  await counterProof(page);
  console.log("netteté § 10 OK");
  check(errors.length === 0, "netteté : aucune erreur dans la page");
  await ctx.close();
}

/** Captures à 2x : même vue avant et après. */
async function captures(browser, base, nom) {
  mkdirSync(OUT, { recursive: true });
  const out = (n) => join(OUT, `${nom}-${n}.png`);
  const region = { x: 0, y: 0, width: 480, height: VIEWPORT.height };
  const shoot = async (page, n, clip) => {
    await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
    await frames(page);
    await page.screenshot({ path: out(n), ...(clip ? { clip } : {}) });
  };
  const { ctx, page, cdp, errors } = await newPage(browser, base, { scale: 2 });
  await page.click(item("rect"));
  await touchDrag(page, cdp, [400, 250], [620, 380]);
  await page.click(item("select"));
  await marquee(page, [360, 210], [660, 420]);
  await waitAttr(page, "data-selection", "1");
  await shoot(page, "rect");
  await shoot(page, "panneau", region);
  await openMenuOf(page, "file-open");
  await shoot(page, "menu");
  await page.keyboard.press("Escape");
  await page.mouse.click(1100, 700);
  await frames(page);
  // Sélection mixte : un second rectangle d'une autre couleur (au repos : rectangle seul, trait du style courant).
  await page.click(item("rect"));
  await touchDrag(page, cdp, [760, 250], [940, 380]);
  await page.click(item("select"));
  await marquee(page, [340, 190], [980, 440]);
  await waitAttr(page, "data-selection", "2");
  await shoot(page, "mixte", region);
  if (nom !== "avant") {
    await page.click(`${OPT} [data-options-toggle]`);
    await frames(page);
    await shoot(page, "replie", region);
  }
  console.log(`captures : ${OUT}/${nom}-{rect,panneau,menu,mixte${nom === "avant" ? "" : ",replie"}}.png`);
  if (errors.length) console.log(`captures : erreurs de page : ${errors.join(" | ")}`);
  await ctx.close();
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const wantCaptures = process.argv.includes("--captures");
  if (nom === "avant" && !wantCaptures) {
    console.error(`${LABEL} : usage — --nom avant n'a de sens qu'avec --captures`);
    return 2;
  }
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist}/index.html absent : construire d'abord l'application (scripts/verifier.sh)`);
    return 1;
  }
  if (!existsSync(BIN)) {
    console.error(`${LABEL} : ÉCHEC — ${BIN} absent : construire la CLI (pnpm --filter @roomboard/cli build)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ dist });
  const base = `http://127.0.0.1:${server.address().port}`;
  const tmp = mkdtempSync(join(tmpdir(), "p2-essai-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (wantCaptures) await captures(browser, base, nom);
    if (nom === "avant") {
      console.log(`${LABEL} : captures « avant » seules, mesures sautées`);
      return 0;
    }
    if (wantCaptures) return 0;
    await lectures(browser, base);
    for (const mode of ["doigt", "clavier"]) {
      await s1(browser, base, mode, tmp);
      await s2(browser, base, mode, tmp);
      await s3(browser, base, mode, tmp);
      await s4(browser, base, mode);
      await s5(browser, base, mode);
    }
    await nettete(browser, base);
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
