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
// Lot 2 (OG14, S6 à S8) : Disposition, Texte, sélecteur de couleur, pointes, Aide, Effacer la page, Lien ; --lot 1 ou --lot 2
// ne joue que ce lot (sans option : les deux).
// Usage : node scripts/essais/personnalisation-2-navigateur.mjs [--lot 1|2] [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/design/captures/personnalisation-2/<nom>-{rect,menu,panneau,mixte}.png (2x ; « apres » ajoute replie) ;
//   --dist : sert un autre build ; --nom avant : captures seules (le build d'avant n'a ni panneau ni menu neuf), mesures sautées.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { clickItem, DIST, Echec, foldOptions, frames, gitSha, item, loadPlaywright, openMenuOf, openOptionSections, ROOT, serve, stageBox, VIEWPORT } from "./commun.mjs";
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
  const dialogs = [];
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    void d.accept();
  });
  if (fold) await foldOptions(page);
  await openOptionSections(page);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}${query}`);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  return { ctx, page, cdp, errors, dialogs };
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
    await page.waitForTimeout(400); // un tap qui suit tout de suite un contact du protocole est perdu
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
/** Active un bouton : au doigt, un tap sur son centre ; au clavier, le focus puis Entrée (Espace n'active pas les boutons d'IconButton, consigné au rapport). */
async function press(page, mode, selector) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 15000 });
  if (mode === "doigt") {
    await loc.scrollIntoViewIfNeeded(); // le panneau défile : un bouton hors champ n'est pas touchable
    const b = await loc.boundingBox();
    await tapAt(page, b.x + b.width / 2, b.y + b.height / 2);
  } else {
    await loc.focus();
    await page.keyboard.press("Enter");
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
    await input.focus(); // le panneau se redessine à chaque changement : le focus est repris
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
/** Pixel RGBA (px CSS de la scène) : capture de 1 × 1, décodée dans la page. */
async function pixelAt(page, x, y) {
  const b = await stageBox(page);
  const png = await page.screenshot({ clip: { x: b.x + x, y: b.y + y, width: 1, height: 1 }, animations: "disabled", caret: "hide" });
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const g = c.getContext("2d");
    g.drawImage(bmp, 0, 0);
    return [...g.getImageData(0, 0, 1, 1).data];
  }, png.toString("base64"));
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
  // Fusion OG4 : le panneau se pose à droite de la barre latérale (repliée comprise), le geste passe à x ≥ 400.
  const rect = [[400, 300], [620, 430]];
  const box = [396, 296, 624, 434];
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
    await page.keyboard.press("Enter");
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
  const dup = '[data-object-bar] [data-selection-action="duplicate"]';
  const del = '[data-object-bar] [data-selection-action="delete"]';
  check((await page.locator(dup).count()) === 1 && (await page.locator(del).count()) === 1, "S3.1 : la barre d'objet montre Dupliquer et Supprimer");
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
  const selAfterUndo = await attr(page, "data-selection");
  lire("sélection après Ctrl+Z", selAfterUndo);
  if (selAfterUndo === "0") await marquee(page, [360, 260], [580, 440]); // le Ctrl+Z a retiré la copie sélectionnée : on reprend l'original
  await waitAttr(page, "data-selection", "1");
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
    // Cadrage décision 4 : chaque section a un en-tête tabulable ; le groupe, ce sont ses boutons radio.
    inside = await page.evaluate(() => (document.activeElement?.getAttribute("role") === "radio" ? document.activeElement.closest("[data-option]")?.getAttribute("data-option") : null) ?? "");
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
  // T34 : le panneau d'options est retiré tant que l'éditeur de profils est ouvert ; on l'enregistre puis on mesure.
  check((await rectOf(page, OPT)) === null, "T34 : le panneau d'options est retiré sous l'éditeur de profils");
  await page.click('[data-edit="save"]');
  await page.waitForSelector("[data-profile-editor]", { state: "hidden", timeout: 15000 });
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
/** `strict` faux : un écart de calage est imprimé (« ÉCART ») sans faire échouer l'essai ; --strict-calage le rend bloquant. */
async function calage(page, scope, label, min, strict = process.argv.includes("--strict-calage")) {
  const boxes = await page.$$eval(`${scope} svg.rb-icon`, (els) =>
    els.filter((e) => e.getClientRects().length > 0).map((e) => {
      const r = e.getBoundingClientRect();
      return { icon: e.getAttribute("data-icon"), x: r.x, y: r.y, w: r.width, h: r.height };
    }));
  const bad = boxes.filter((b) => !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2));
  if (!strict && bad.length > 0 && boxes.length >= min) {
    console.log(`ÉCART (app) — calage (${label}) : ${bad.length} icônes sur ${boxes.length} hors de la grille de pixels à 2x : ${bad.map((b) => `${b.icon}@x=${b.x}`).join(", ")}`);
    return;
  }
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
    const bgc = [px.data[0], px.data[1], px.data[2]]; // fond réel : pixel du coin de la capture (§ 10)
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
  const menuIcon = page.locator("[data-menu-list] svg.rb-icon");
  const ipx = await pixelsOf(page, await menuIcon.first().boundingBox());
  const ic = await page.evaluate(() => getComputedStyle(document.querySelector("[data-menu-list] svg.rb-icon")).color);
  const iFr = fringes(ipx, [ipx.data[0], ipx.data[1], ipx.data[2]], rgbOf(ic));
  console.log(`netteté — première icône du menu : frange ${iFr}`);
  check(iFr === 0, "netteté § 10 du menu : icône, 0 frange colorée");
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
  // Rouge pour le second (avant : pas de panneau, la couleur vient du préréglage du stylo ; même vue sinon).
  if ((await page.locator(opt("strokeColor", RED)).count()) > 0) await page.locator(opt("strokeColor", RED)).first().click();
  await touchDrag(page, cdp, [760, 250], [940, 380]);
  await page.click(item("select"));
  // Le cadre part sous la rangée contextuelle de l'îlot d'outils (y 144 à 200 à 1280 px) : à y = 190 il tombait sur un
  // bouton de la barre, aucun cadre ne naissait et data-selection restait à 0 (cause de l'échec de la vue mixte).
  await marquee(page, [340, 215], [980, 440]);
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

// ---------------------------------------------------------------------------------------------------- lot 2 (S6 à S8)

const rgbHex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
/** Couleur d'un pixel de la scène (px CSS, contexte à 1x). */
async function colorAt(page, x, y) {
  const b = await stageBox(page);
  const px = await pixelsOf(page, { x: b.x + x, y: b.y + y, width: 1, height: 1 });
  return [px.data[0], px.data[1], px.data[2]];
}
const closeTo = (p, q, tol = 3) => p.every((v, k) => Math.abs(v - q[k]) <= tol);
/** Sélectionne l'objet sous (x, y) par un tap de l'outil Sélection. */
async function selectAt(page, mode, x, y) {
  await useTool(page, mode, "select");
  await tapStage(page, x, y);
  await waitAttr(page, "data-selection", "1");
}
/** Couleurs de fond proposées par le panneau (hors Transparent). */
const backgrounds = (page) =>
  page.$$eval(`${OPT} [data-option="background"] .rb-pick[data-option-value]`, (els) => els.map((e) => e.getAttribute("data-option-value")).filter((v) => v !== "transparent"));
/** Pose un rectangle plein de `fill` (Architecte, remplissage plein) : l'outil et la forme sont au choix du lot. */
async function solid(page, cdp, mode, tool, fill, from, to) {
  await useTool(page, mode, tool);
  await choose(page, mode, "roughness", "0");
  await choose(page, mode, "background", fill);
  await choose(page, mode, "fillStyle", "solid");
  await touchDrag(page, cdp, from, to);
}

/** S6 : Disposition (Premier plan, Ctrl+Maj+↑, Ctrl+↓), une Restack d'OG4 chacune. */
async function s6(browser, base, mode) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  await useTool(page, mode, "rect");
  await choose(page, mode, "roughness", "0");
  const fills = await backgrounds(page);
  await solid(page, cdp, mode, "rect", fills[0], [400, 300], [620, 430]);
  await solid(page, cdp, mode, "ellipse", fills[2], [520, 340], [740, 470]);
  await waitAttr(page, "data-elements", "2");
  const rectRgb = hex(fills[0]);
  const ellRgb = hex(fills[2]);
  const at = [570, 390]; // dans le rectangle et dans l'ellipse
  const rendered = async () => (closeTo(await colorAt(page, ...at), rectRgb) ? "rectangle" : closeTo(await colorAt(page, ...at), ellRgb) ? "ellipse" : rgbHex(await colorAt(page, ...at)));
  lire("S6 pixel au chevauchement avant (ellipse posée en dernier)", await rendered());
  check((await rendered()) === "ellipse", "S6.1 : l'ellipse, posée en dernier, couvre le chevauchement");
  await selectAt(page, mode, 430, 365); // la partie du rectangle hors de l'ellipse
  check((await page.locator(`${OPT} [data-option="layers"]`).count()) === 1, "S6.1 : le panneau montre la section Disposition");
  await choose(page, mode, "layers", "front");
  await frames(page);
  lire("S6 pixel au chevauchement=couleur du rectangle", `${await rendered()} (${rgbHex(await colorAt(page, ...at))})`);
  check((await rendered()) === "rectangle", "S6.2 : Premier plan : au chevauchement, les pixels sont ceux du rectangle");
  await page.keyboard.press("Control+z");
  await frames(page);
  check((await rendered()) === "ellipse", "S6.2 : Ctrl+Z : les pixels sont ceux de l'ellipse");
  if ((await attr(page, "data-selection")) !== "1") await selectAt(page, mode, 430, 365);
  await page.keyboard.press("Control+Shift+ArrowUp");
  await frames(page);
  check((await rendered()) === "rectangle", "S6.3 : Ctrl+Maj+↑ donne le même résultat (rectangle)");
  await page.keyboard.press("Control+ArrowDown");
  await frames(page);
  check((await rendered()) === "ellipse", "S6.3 : Ctrl+↓ recule le rectangle d'un rang (ellipse)");
  check(errors.length === 0, `S6 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S6 OK" : "S6 OK (clavier)");
}

/** S7.4 (T41) : deux textes choisis, Police Georgia (un `runAll` du vrai module) : un Ctrl+Z rend les deux, un Ctrl+Y les refait. */
async function s7Multi(browser, base, mode, tmp) {
  const { ctx, page, errors } = await newPage(browser, base);
  const write = async (x, y, txt) => {
    await useTool(page, mode, "text");
    await tapStage(page, x, y);
    await page.waitForSelector("#texte-edition", { state: "visible", timeout: 15000 });
    await page.keyboard.type(txt);
    await page.keyboard.press("Escape");
    await frames(page);
  };
  await write(560, 300, "Alpha");
  await write(560, 520, "Beta");
  await waitAttr(page, "data-elements", "2");
  await useTool(page, mode, "select");
  await marquee(page, [420, 200], [1000, 650]);
  await waitAttr(page, "data-selection", "2");
  const fonts = async (nom) => (await saved(page, tmp, nom)).elements.filter((e) => e.kind === "text").map((e) => e.text.spans.map((x) => x.attrs?.font ?? null).join("+"));
  const avant = await fonts(`s7m0-${mode}.roomboard`);
  await choose(page, mode, "font", "Georgia");
  await frames(page);
  const apres = await fonts(`s7m1-${mode}.roomboard`);
  await page.keyboard.press("Control+z");
  await frames(page);
  const undo = await fonts(`s7m2-${mode}.roomboard`);
  await page.keyboard.press("Control+y");
  await frames(page);
  const redo = await fonts(`s7m3-${mode}.roomboard`);
  lire("S7.4 polices avant / Georgia / Ctrl+Z / Ctrl+Y", [avant, apres, undo, redo].map((l) => l.join("|")).join(" / "));
  const tous = (l, ok) => l.length === 2 && l.every(ok);
  check(tous(apres, (f) => f === "Georgia"), "S7.4 : Police Georgia sur deux textes choisis les change tous les deux");
  check(tous(undo, (f) => f !== "Georgia") && undo.join() === avant.join(), "S7.4 : un seul Ctrl+Z rend les deux textes à l'ancienne police");
  check(tous(redo, (f) => f === "Georgia"), "S7.4 : un seul Ctrl+Y refait les deux");
  check(errors.length === 0, `S7.4 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
}

/** S7 : outil Texte, alignement, police et taille ; saisie : sections grisées, focus gardé. */
async function s7(browser, base, mode, tmp) {
  const { ctx, page, errors } = await newPage(browser, base);
  await useTool(page, mode, "text");
  const keys = await page.$$eval(`${OPT} [data-option]`, (els) => els.map((e) => e.getAttribute("data-option")));
  lire("[data-option] (text)", keys.join(","));
  await choose(page, mode, "font", "Georgia");
  await choose(page, mode, "fontSize", "48");
  await choose(page, mode, "textAlign", "center");
  const preFont = await pressed(page, "font", "Georgia");
  const preSize = await pressed(page, "fontSize", "48");
  await tapStage(page, 560, 300);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 15000 });
  await frames(page);
  await page.keyboard.type("Bonjour");
  await page.keyboard.press("Escape");
  await frames(page);
  await waitAttr(page, "data-elements", "1");
  let s = await saved(page, tmp, `s7a-${mode}.roomboard`);
  let t = s.elements.find((e) => e.kind === "text");
  check(preFont === true && preSize === true, `S7.1 : Georgia et 48, choisis avant la saisie, sont enfoncés (${preFont}/${preSize})`);
  lire("élément texte", JSON.stringify(t).slice(0, 400));
  const spans = t.text.spans;
  lire("textAlign=center font=Georgia size=48", `textAlign=${t.look?.textAlign} font=${spans[0]?.attrs?.font} size=${spans[0]?.attrs?.size ?? t.text.size}`);
  check(t.look?.textAlign === "center", "S7.1 : l'élément porte textAlign center");
  check(spans.length > 0 && spans.every((x) => x.attrs?.font === "Georgia" && (x.attrs?.size ?? t.text.size) === 48), "S7.1 : ses segments portent font Georgia et size 48");
  // Rouvrir le texte : un tap de l'outil Texte sur lui.
  await useTool(page, mode, "text");
  await tapStage(page, 600, 320);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 15000 });
  await frames(page);
  const off = (k) => page.$eval(`${OPT} [data-option="${k}"]`, (sec) => sec.hasAttribute("data-disabled") && [...sec.querySelectorAll("button")].every((b) => b.disabled));
  const dis = [await off("font"), await off("fontSize"), await off("strokeColor")];
  lire("Police disabled en saisie", String(dis[0]));
  check(dis.every(Boolean), `S7.2 : en saisie, Police, Taille et Trait sont grisés (${dis})`);
  await page.keyboard.press("Home");
  await frames(page);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Shift+ArrowRight");
    await frames(page);
  }
  check((await page.evaluate(() => String(getSelection()))) === "Bon", "S7.2 : « Bon » est sélectionné dans la zone");
  if (mode === "doigt") await tapAt(page, ...(await centerOf(page, 'button[data-format="bold"]')));
  else await page.keyboard.press("Control+b");
  await frames(page);
  check(await pressed2(page, 'button[data-format="bold"]'), "S7.2 : FormatRow met « Bon » en gras (G enfoncé)");
  lire("S7 sélection pendant la saisie", await attr(page, "data-selection"));
  const editorFocused = () => page.evaluate(() => document.activeElement?.id === "texte-edition");
  if (mode === "doigt") {
    await tapAt(page, ...(await centerOf(page, opt("textAlign", "right"))));
    const kept = await editorFocused();
    const who = await page.evaluate(() => `${document.activeElement?.tagName}#${document.activeElement?.id}[${document.activeElement?.getAttribute("data-choice")}] éditeur visible : ${!document.querySelector("#texte-edition")?.hidden}`);
    lire("S7.3 focus dans la zone après Droite", `${kept} (${who})`);
    check(kept, "S7.3 : toucher Droite dans le panneau garde le focus dans la zone de saisie");
  } else {
    await page.locator(opt("textAlign", "right")).focus();
    await page.keyboard.press("Enter");
    await frames(page);
  }
  check(await pressed(page, "textAlign", "right"), "S7.3 : Droite est enfoncé dans le panneau");
  if (!(await editorFocused())) await page.locator("#texte-edition").focus(); // le focus perdu (écart ci-dessus) : Échap doit atteindre la zone
  await page.keyboard.press("Escape");
  await frames(page);
  await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await frames(page);
  s = await saved(page, tmp, `s7b-${mode}.roomboard`);
  const t2 = s.elements.find((e) => e.kind === "text");
  lire("texte après Droite et gras", JSON.stringify({ align: t2.look?.textAlign, spans: t2.text.spans.map((x) => [x.text, x.attrs?.bold]) }));
  check(t2.look?.textAlign === "right", `S7.3 : texte rouvert en saisie, Droite l'aligne (textAlign ${t2.look?.textAlign})`);
  check(t2.text.spans.some((x) => x.attrs?.bold === true && /^Bon/.test(x.text ?? "")), "S7.2 : « Bon » est gras dans l'état enregistré");
  // S7.3 sur un texte neuf : Droite touché pendant la saisie aligne le texte (le style courant sert au commit).
  await tapStage(page, 560, 520);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 15000 });
  await page.keyboard.type("Droite");
  if (mode === "doigt") await tapAt(page, ...(await centerOf(page, opt("textAlign", "right"))));
  else {
    await page.locator(opt("textAlign", "right")).focus();
    await page.keyboard.press("Enter");
  }
  await frames(page);
  if (!(await editorFocused())) await page.locator("#texte-edition").focus();
  await page.keyboard.press("Escape");
  await frames(page);
  s = await saved(page, tmp, `s7c-${mode}.roomboard`);
  const t3 = s.elements.filter((e) => e.kind === "text").find((e) => e.text.content === "Droite");
  lire("texte neuf, Droite touché en saisie", `textAlign=${t3?.look?.textAlign}`);
  check(t3?.look?.textAlign === "right", "S7.3 : Droite touché dans le panneau aligne le texte à droite");
  check(errors.length === 0, `S7 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  await s7Multi(browser, base, mode, tmp);
  console.log(mode === "doigt" ? "S7 OK" : "S7 OK (clavier)");
}
const centerOf = async (page, sel) => {
  const b = await page.locator(sel).first().boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
};
const pressed2 = async (page, sel) => (await page.locator(sel).first().getAttribute("aria-pressed")) === "true";

/** Rectangle d'un élément visible (px CSS de la fenêtre) ; absent ou masqué : null. */
const rectOf = (page, sel) =>
  page.evaluate((q) => {
    const e = document.querySelector(q);
    if (!e || e.getClientRects().length === 0) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);
const overlap = (a, b) => a !== null && b !== null && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Rectangles des îlots visibles hors `.rb-options` et hors l'élément `self` (sélecteur). */
const otherIslands = (page, self) =>
  page.evaluate((me) => [...document.querySelectorAll(".rb-island")].filter((e) => !e.matches("[data-options]") && !e.matches(me) && e.getClientRects().length > 0).map((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }), self);

/** S8 : sélecteur de couleur, pointes de flèche, Aide, Effacer la page, Lien. */
async function s8(browser, base, mode, tmp) {
  const { ctx, page, cdp, errors, dialogs } = await newPage(browser, base);
  const popup = (id) => page.locator(id).first();
  // 1. Sélecteur : S l'ouvre ; flèches, Entrée ; Échap rend le focus à la pastille.
  await useTool(page, mode, "rect");
  const anchor = `${OPT} [data-more-colors="strokeColor"]`;
  if (mode === "doigt") await tapAt(page, ...(await centerOf(page, anchor)));
  else await page.keyboard.press("s");
  await popup("[data-color-picker]").waitFor({ state: "visible", timeout: 15000 });
  const cells = await page.locator("[data-color-picker] [role=gridcell]").count();
  lire("cases du sélecteur", cells);
  check(cells === 75, `S8.1 : le sélecteur ouvert montre 15 teintes × 5 nuances (${cells})`);
  let chosen;
  if (mode === "doigt") {
    const cell = page.locator("[data-color-picker] [role=gridcell]").nth(7);
    chosen = await cell.getAttribute("aria-label");
    const cb = await cell.boundingBox();
    await tapAt(page, cb.x + cb.width / 2, cb.y + cb.height / 2);
    await popup("[data-color-picker]").waitFor({ state: "hidden", timeout: 15000 });
  } else {
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    chosen = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    await page.keyboard.press("Enter");
    await frames(page);
    await popup("[data-color-picker]").waitFor({ state: "hidden", timeout: 15000 });
  }
  await touchDrag(page, cdp, [400, 300], [560, 400]);
  await waitAttr(page, "data-elements", "1");
  let s = await saved(page, tmp, `s8a-${mode}.roomboard`);
  const col = s.elements[0].style.color;
  lire("couleur choisie dans le sélecteur", `${chosen} -> ${col}`);
  check(typeof col === "string" && col.toLowerCase() === chosen.toLowerCase(), `S8.1 : la couleur du sélecteur est écrite (${col})`);
  if (mode === "clavier") {
    await page.keyboard.press("s");
    await popup("[data-color-picker]").waitFor({ state: "visible", timeout: 15000 });
    await page.keyboard.press("Escape");
    await popup("[data-color-picker]").waitFor({ state: "hidden", timeout: 15000 });
    check(await page.evaluate(() => document.activeElement?.hasAttribute("data-more-colors") ?? false), "S8.1 : Échap ferme le sélecteur et rend le focus à la pastille");
  }
  // 2. Flèche : début Triangle, fin Aucune.
  await useTool(page, mode, "arrow");
  const head = (g, v) => `${OPT} [data-edit="${g}"] [data-choice="${v}"]`;
  await press(page, mode, head("startArrowhead", "triangle"));
  await press(page, mode, head("endArrowhead", "none"));
  await touchDrag(page, cdp, [400, 560], [760, 640]);
  await waitAttr(page, "data-elements", "2");
  s = await saved(page, tmp, `s8b-${mode}.roomboard`);
  const arrow = s.elements.find((e) => e.kind === "shape" && e.shape.shape === "arrow") ?? s.elements[s.elements.length - 1];
  lire("startArrowhead=triangle endArrowhead=none", `startArrowhead=${arrow.look?.startArrowhead} endArrowhead=${arrow.look?.endArrowhead}`);
  check(arrow.look?.startArrowhead === "triangle" && arrow.look?.endArrowhead === "none", "S8.2 : début Triangle, fin Aucune, ces champs sont écrits");
  // 3. Aide.
  if (mode === "doigt") await clickItem(page, "help");
  else await page.keyboard.press("?");
  await page.waitForSelector('[data-panel="aide"]', { state: "visible", timeout: 15000 });
  const helpBox = await rectOf(page, ".rb-help");
  const panelBehind = await rectOf(page, OPT);
  check(!overlap(helpBox, panelBehind), `S8.3 : le panneau d'options ne dépasse pas autour de l'Aide (${JSON.stringify(panelBehind)} / ${JSON.stringify(helpBox)})`);
  const dup = await page.locator('[data-panel="aide"] [data-shortcut-id="duplicate"]').innerText();
  const lnk = await page.locator('[data-panel="aide"] [data-shortcut-id="link"]').innerText();
  lire("[data-panel=aide] contient Ctrl+D Dupliquer", `${dup.replace(/\s+/g, " ")} | ${lnk.replace(/\s+/g, " ")}`);
  check(/Dupliquer/.test(dup) && /Ctrl\+D/.test(dup), "S8.3 : l'Aide liste Ctrl+D « Dupliquer »");
  check(/Lien/.test(lnk) && /Ctrl\+K/.test(lnk), "S8.3 : l'Aide liste Ctrl+K « Lien »");
  if (mode === "doigt") await tapAt(page, ...(await centerOf(page, "[data-help-close]")));
  else await page.keyboard.press("Escape");
  await page.waitForSelector('[data-panel="aide"]', { state: "hidden", timeout: 15000 });
  if (mode === "clavier") {
    await page.keyboard.press("?");
    await page.waitForSelector('[data-panel="aide"]', { state: "visible", timeout: 15000 });
    check(true, "S8.3 : « ? » rouvre l'Aide");
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-panel="aide"]', { state: "hidden", timeout: 15000 });
  }
  // 4. Effacer la page : confirmation (acceptée par l'essai), page vide, Ctrl+Z rend les objets.
  const n0 = Number(await attr(page, "data-elements"));
  const dialogs0 = dialogs.length;
  const clearOff = async () => ((await page.locator(item("page-clear")).count()) > 0 ? page.locator(item("page-clear")).isDisabled() : null);
  const clearOffAvant = await clearOff();
  if (mode === "doigt") await clickItem(page, "page-clear");
  else {
    await openMenuOf(page, "page-clear");
    await press(page, mode, item("page-clear"));
  }
  await waitAttr(page, "data-elements", "0");
  check(dialogs.length - dialogs0 === 1, `S8.4 : Effacer demande exactement une confirmation (${dialogs.length - dialogs0})`);
  const clearOffVide = await clearOff();
  lire("Effacer la page grisé : page pleine / page vide", `${clearOffAvant} / ${clearOffVide}`);
  check(clearOffAvant === false && clearOffVide === true, `S8.4 : Effacer la page est actif sur une page pleine, grisé sur une page vide (${clearOffAvant}/${clearOffVide})`);
  lire("page vide après Effacer=0 objet ; après Ctrl+Z=n", `0 objet ; n=${n0}`);
  await page.keyboard.press("Escape");
  await page.mouse.click(1100, 700);
  await frames(page);
  await page.keyboard.press("Control+z");
  await waitAttr(page, "data-elements", String(n0));
  check(true, `S8.4 : Effacer vide la page (0 objet), Ctrl+Z rend les ${n0} objets`);
  // 5. Lien.
  await useTool(page, mode, "rect");
  await touchDrag(page, cdp, [820, 300], [1000, 420]);
  await waitAttr(page, "data-elements", String(n0 + 1));
  await useTool(page, mode, "select");
  await marquee(page, [780, 250], [1060, 480]);
  await waitAttr(page, "data-selection", "1");
  // Badge : géométrie recalculée comme `linkBadgeBox` (hors de la boîte, 6 px au-dessus et à droite du coin haut-droit),
  // lue sur `#stage[data-bounds]` et `[data-camera]` ; on lit un pixel du trait du bord haut de la pastille (milieu).
  const badgeAt = async () => {
    const [, y0, x1] = (await attr(page, "data-bounds")).split(",").map(Number);
    const [zoom, tx, ty] = (await attr(page, "data-camera")).split(",").map(Number);
    return { x: Math.round(x1 * zoom + tx + 6), y: Math.round(y0 * zoom + ty - 6 - 16) };
  };
  const badge0 = await badgeAt();
  const px0 = await pixelAt(page, badge0.x + 8, badge0.y);
  // Doigt : le bouton Lien du panneau, touché ; clavier : Ctrl+K.
  if (mode === "doigt") {
    // La rangée Actions est au bas du panneau (défilant) : on l'amène à l'écran avant le toucher.
    const linkBtn = `${OPT} [data-option="actions"] [data-option-value="link"]`;
    await page.locator(linkBtn).scrollIntoViewIfNeeded();
    await tapAt(page, ...(await centerOf(page, linkBtn)));
  }
  else await page.keyboard.press("Control+k");
  await popup("[data-link-popover]").waitFor({ state: "visible", timeout: 15000 });
  const input = "[data-link-popover] input";
  check(await page.evaluate(() => document.activeElement?.closest("[data-link-popover]") !== null), `S8.5 : ${mode === "doigt" ? "le bouton Lien du panneau, touché," : "Ctrl+K"} ouvre l'éditeur de lien, focus dans le champ`);
  await page.keyboard.type("javascript:alert(1)");
  await page.keyboard.press("Enter");
  await frames(page);
  check((await page.locator("[data-link-popover] [role=alert]").count()) === 1 && (await popup("[data-link-popover]").isVisible()), "S8.5 : « javascript:alert(1) » est refusé (message, l'éditeur reste ouvert)");
  lire("lien javascript: refusé", await page.locator("[data-link-popover] [role=alert]").innerText());
  await page.locator(input).fill("https://example.org");
  await page.keyboard.press("Enter");
  await popup("[data-link-popover]").waitFor({ state: "hidden", timeout: 15000 });
  await frames(page);
  s = await saved(page, tmp, `s8c-${mode}.roomboard`);
  const linked = s.elements.find((e) => e.look?.link);
  lire("lien posé", linked?.look?.link);
  check(linked?.look?.link === "https://example.org", "S8.5 : https://example.org est posé (look.link)");
  const badge1 = await badgeAt();
  const px1 = await pixelAt(page, badge1.x + 8, badge1.y);
  lire("badge : pixel du bord avant/après (rgb)", `${px0.join(",")} / ${px1.join(",")} en (${badge1.x + 8}, ${badge1.y})`);
  check(px1[3] > 0 && px1[0] + px1[1] + px1[2] < 600 && px0.join(",") !== px1.join(","), "S8.5 : le bord du badge, à la position calculée au coin haut-droit de l'élément, a la couleur du trait (plus le fond)");
  // Toucher du badge (outil Sélection) : ouvre le lien par window.open(url, "_blank", "noopener"), stub dans la page.
  await page.evaluate(() => {
    window.__ouverts = [];
    // Comme le navigateur : avec noopener, window.open rend toujours null (norme HTML).
    window.open = (...a) => { window.__ouverts.push(a); return null; };
  });
  const dialogsLien0 = dialogs.length;
  await useTool(page, mode, "select");
  await tapStage(page, 1020, 285);
  await frames(page);
  const ouverts = await page.evaluate(() => window.__ouverts);
  lire("window.open après toucher du badge", JSON.stringify(ouverts));
  check(ouverts.length === 1 && ouverts[0][0] === "https://example.org" && ouverts[0][1] === "_blank" && ouverts[0][2] === "noopener", "S8.5 : toucher le badge ouvre le lien par window.open(url, \"_blank\", \"noopener\")");
  // Ouverture au clavier : Ctrl+K rouvre l'éditeur, Tab (Valider), Tab (Ouvrir le lien), Entrée.
  await page.evaluate(() => { window.__ouverts = []; });
  await page.keyboard.press("Control+k");
  await popup("[data-link-popover]").waitFor({ state: "visible", timeout: 15000 });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  check(await page.evaluate(() => document.activeElement?.hasAttribute("data-link-open") ?? false), "S8.5 : Ctrl+K puis Tab, Tab : le focus est sur « Ouvrir le lien »");
  await page.keyboard.press("Enter");
  await frames(page);
  const ouvertsClavier = await page.evaluate(() => window.__ouverts);
  lire("window.open après Ctrl+K, Tab, Tab, Entrée", JSON.stringify(ouvertsClavier));
  check(ouvertsClavier.length === 1 && ouvertsClavier[0][0] === "https://example.org" && ouvertsClavier[0][1] === "_blank" && ouvertsClavier[0][2] === "noopener", "S8.5 : Entrée sur « Ouvrir le lien » appelle window.open(url, \"_blank\", \"noopener\")");
  check(dialogs.length === dialogsLien0, `S8.5 : aucune alerte à une ouverture réussie (${dialogs.length - dialogsLien0} dialogue)`);
  await page.keyboard.press("Escape");
  const js = s.elements.filter((e) => /^javascript:/i.test(e.look?.link ?? ""));
  check(js.length === 0, "S8.5 : aucun lien javascript: n'est enregistré");
  check(errors.length === 0, `S8 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S8 OK" : "S8 OK (clavier)");
}

// ------------------------------------------------------------------------------------- netteté et captures du lot 2

/** Netteté § 10 à 2x : icônes d'alignement, de pointes, de lien et grille du sélecteur de couleur. */
async function nettete2(browser, base) {
  const { ctx, page, cdp, errors } = await newPage(browser, base, { scale: 2 });
  const away = async () => {
    await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
    await frames(page);
  };
  const results = [];
  const icon = async (name, sel) => {
    await page.locator(sel).first().scrollIntoViewIfNeeded(); // le panneau défile : un bouton hors champ n'a pas de pixels
    await away();
    const px = await pixelsOf(page, await iconBox(page, sel));
    const { ink } = await colorsOf(page, sel);
    const f = fringes(px, [px.data[0], px.data[1], px.data[2]], rgbOf(ink));
    results.push({ name, f });
    console.log(`netteté — ${name} : frange ${f}`);
  };
  // Alignement (outil Texte) : Gauche (enfoncé ou non selon la valeur), Centre, Droite.
  await page.click(item("text"));
  await away();
  await calage(page, OPT, "panneau Texte", 3);
  for (const v of ["left", "center", "right"]) await icon(`icône align-${v}`, opt("textAlign", v));
  const margins = await page.$$eval(`${OPT} [data-edit="font"] .rb-radio`, (els) => els.map((b) => {
    const rb = b.getBoundingClientRect();
    const rl = b.querySelector(".rb-radio-label").getBoundingClientRect();
    return { name: b.getAttribute("data-choice"), left: rl.left - rb.left, right: rb.right - rl.right, h: rb.height };
  }));
  lire("marges des choix de Police", JSON.stringify(margins));
  check(margins.length === 3 && margins.every((m) => m.left >= 8 - 0.01 && m.right >= 8 - 0.01 && m.h >= 44), "S7 : chaque choix de Police a 8 px de marge intérieure et une cible de 44 px au moins");
  // Pointes (outil Flèche) : début et fin.
  await page.click(item("arrow"));
  await away();
  await calage(page, OPT, "panneau Flèche", 8);
  for (const g of ["startArrowhead", "endArrowhead"]) {
    for (const v of ["none", "arrow", "triangle", "triangle_outline"]) await icon(`icône ${g} ${v}`, `${OPT} [data-edit="${g}"] [data-choice="${v}"]`);
  }
  // Lien (Actions d'une sélection).
  await page.click(item("rect"));
  await touchDrag(page, cdp, [450, 300], [650, 420]);
  await page.click(item("select"));
  await marquee(page, [400, 250], [720, 470]);
  await waitAttr(page, "data-selection", "1");
  await away();
  await icon("icône link (Actions)", `${OPT} [data-option="actions"] [data-option-value="link"]`);
  // Éditeur de lien : style des boutons d'îlot, hors du panneau et des autres îlots.
  await page.click(`${OPT} [data-option="actions"] [data-option-value="link"]`);
  await page.locator("[data-link-popover]").waitFor({ state: "visible", timeout: 15000 });
  await away();
  const linkBox = await rectOf(page, "[data-link-popover]");
  const linkPanel = await rectOf(page, OPT);
  check(!overlap(linkBox, linkPanel), `éditeur de lien : ne recouvre pas le panneau d'options (${JSON.stringify(linkBox)} / ${JSON.stringify(linkPanel)})`);
  const linkHit = (await otherIslands(page, "[data-link-popover]")).filter((r) => overlap(linkBox, r));
  check(linkHit.length === 0, `éditeur de lien : ne recouvre aucun îlot${linkHit.length ? ` (${JSON.stringify(linkHit)})` : ""}`);
  check(linkBox.x >= 0 && linkBox.y >= 0 && linkBox.x + linkBox.w <= VIEWPORT.width && linkBox.y + linkBox.h <= VIEWPORT.height, "éditeur de lien : entier dans la fenêtre");
  const okStyle = await page.$eval("[data-link-ok]", (e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { border: c.borderTopWidth, bg: c.backgroundColor, color: c.color, w: r.width, h: r.height, radius: c.borderTopLeftRadius }; });
  lire("bouton ✓ de l'éditeur de lien", JSON.stringify(okStyle));
  check(okStyle.border === "0px" && okStyle.bg === "rgba(0, 0, 0, 0)" && okStyle.w >= 44 && okStyle.h >= 44 && okStyle.radius !== "0px", "éditeur de lien : le bouton ✓ prend le style des boutons d'îlot (sans bordure ni fond gris, cible ≥ 44 px)");
  await page.keyboard.press("Escape");
  await page.locator("[data-link-popover]").waitFor({ state: "hidden", timeout: 15000 });
  await waitAttr(page, "data-selection", "1");
  // T34 : un panneau passager ouvert (Grille, Réglages) retire le panneau d'options : aucun recouvrement.
  for (const id of ["grid", "settings"]) {
    check((await rectOf(page, OPT)) !== null, `panneau d'options visible avant « ${id} »`);
    await clickItem(page, id);
    await frames(page);
    const pop = await rectOf(page, ".rb-popover");
    const under = await rectOf(page, OPT);
    check(pop !== null && !overlap(pop, under), `panneau « ${id} » : le panneau d'options ne dépasse pas autour (${JSON.stringify(under)} / ${JSON.stringify(pop)})`);
    await clickItem(page, id);
    await frames(page);
    check((await rectOf(page, OPT)) !== null, `panneau d'options revenu après la fermeture de « ${id} »`);
  }
  // Grille du sélecteur : cases sur la grille de pixels, pastilles sans frange (cases non focalisées).
  await page.click(`${OPT} [data-more-colors="strokeColor"]`);
  await page.locator("[data-color-picker]").waitFor({ state: "visible", timeout: 15000 });
  await away();
  const cellsBox = await page.$$eval("[data-color-picker] .rb-color-cell", (els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }));
  const offGrid = cellsBox.filter((b) => !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2));
  check(cellsBox.length === 75 && offGrid.length === 0, `calage (grille du sélecteur) : ${cellsBox.length} cases sur la grille de pixels à 2x${offGrid.length ? `, hors grille : ${JSON.stringify(offGrid.slice(0, 4))}` : ""}`);
  const popBox = await page.evaluate(() => {
    const r = document.querySelector(".rb-color-pop").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  check([popBox.x, popBox.y, popBox.w, popBox.h].every((v) => Number.isInteger(v * 2)), `calage (bord du sélecteur) : ${JSON.stringify(popBox)} sur la grille de pixels à 2x`);
  const pop = await page.evaluate(() => {
    const r = document.querySelector(".rb-color-pop").getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight };
  });
  check(pop.top >= 0 && pop.bottom <= pop.h, `sélecteur de couleur : entier dans la fenêtre (haut ${pop.top}, bas ${pop.bottom}, fenêtre ${pop.h} px)`);
  const panelNow = await rectOf(page, OPT);
  const popNow = await rectOf(page, ".rb-color-pop");
  check(popNow.x >= panelNow.x + panelNow.w + 8 - 0.01, `sélecteur de couleur : à droite du panneau d'options (bord gauche ${popNow.x}, bord droit du panneau ${panelNow.x + panelNow.w})`);
  const hit = (await otherIslands(page, ".rb-color-pop")).filter((r) => overlap(popNow, r));
  check(hit.length === 0, `sélecteur de couleur : ne recouvre aucun îlot${hit.length ? ` (${JSON.stringify(hit)})` : ""}`);
  const small = await page.$$eval("[data-color-picker] .rb-color-cell", (els) => els.filter((e) => e.getBoundingClientRect().height < 44 || e.getBoundingClientRect().width < 44).length);
  check(small === 0, "sélecteur de couleur : cibles de 44 px au moins");
  for (const i of [8, 22, 37]) {
    const cell = page.locator("[data-color-picker] .rb-color-cell").nth(i);
    const dot = cell.locator(".rb-pick-dot");
    await cell.scrollIntoViewIfNeeded(); // la fenêtre du sélecteur défile (15 rangées)
    await away();
    const px = await pixelsOf(page, await dot.boundingBox());
    const { ink, edge } = await dot.evaluate((e) => ({ ink: getComputedStyle(e).backgroundColor, edge: getComputedStyle(e).borderTopColor }));
    // Pastille = fond de case, liseré de 1 px (gris), remplissage : la rangée du milieu n'a que ces trois couleurs, bords nets.
    const colors = [[px.data[0], px.data[1], px.data[2]], rgbOf(edge), rgbOf(ink)];
    const mid = Math.floor(px.height / 2);
    let odd = 0;
    for (let x = 0; x < px.width; x++) {
      const i = (mid * px.width + x) * 4;
      if (!colors.some((c) => [0, 1, 2].every((k) => Math.abs(px.data[i + k] - c[k]) <= 2))) odd++;
    }
    results.push({ name: `case ${i} du sélecteur`, f: odd });
    console.log(`netteté — pastille de la case ${i} du sélecteur (rangée du milieu) : ${odd} pixels hors fond, liseré, remplissage`);
  }
  const bad = results.filter((r) => r.f !== 0);
  check(bad.length === 0, `netteté § 10 du lot 2 : 0 frange colorée sur ${results.length} mesures${bad.length ? ` (${bad.map((r) => `${r.name} ${r.f}`).join(" ; ")})` : ""}`);
  await counterProof(page);
  console.log("netteté § 10 OK");
  check(errors.length === 0, "netteté (lot 2) : aucune erreur dans la page");
  await ctx.close();
}

/** Captures à 2x du lot 2 : texte, flèche, sélecteur, aide, lien (aucun « avant » : le build d'avant n'a pas ces sections). */
async function captures2(browser, base) {
  mkdirSync(OUT, { recursive: true });
  const out = (n) => join(OUT, `apres-${n}.png`);
  const shoot = async (page, n) => {
    await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
    await frames(page);
    await page.screenshot({ path: out(n) });
  };
  const fresh = () => newPage(browser, base, { scale: 2 });
  const errs = [];
  // Texte : Georgia, 48, Centre, « Bonjour » en saisie (Police, Taille, Trait grisés).
  let h = await fresh();
  await h.page.click(item("text"));
  await h.page.click(opt("font", "Georgia"));
  await h.page.click(opt("fontSize", "48"));
  await h.page.click(opt("textAlign", "center"));
  await tapStage(h.page, 560, 300);
  await h.page.waitForSelector("#texte-edition", { state: "visible", timeout: 15000 });
  await h.page.keyboard.type("Bonjour");
  await shoot(h.page, "texte");
  errs.push(...h.errors);
  await h.ctx.close();
  // Flèche : pointes Triangle au début, Aucune à la fin.
  h = await fresh();
  await h.page.click(item("arrow"));
  await h.page.click(`${OPT} [data-edit="startArrowhead"] [data-choice="triangle"]`);
  await h.page.click(`${OPT} [data-edit="endArrowhead"] [data-choice="none"]`);
  await touchDrag(h.page, h.cdp, [480, 520], [860, 620]);
  await shoot(h.page, "fleche");
  errs.push(...h.errors);
  await h.ctx.close();
  // Sélecteur de couleur ouvert depuis « Autres couleurs ».
  h = await fresh();
  await h.page.click(item("rect"));
  await h.page.click(`${OPT} [data-more-colors="strokeColor"]`);
  await h.page.locator("[data-color-picker]").waitFor({ state: "visible", timeout: 15000 });
  await shoot(h.page, "selecteur");
  errs.push(...h.errors);
  await h.ctx.close();
  // Aide (touche « ? »).
  h = await fresh();
  await h.page.keyboard.press("?");
  await h.page.waitForSelector('[data-panel="aide"]', { state: "visible", timeout: 15000 });
  await shoot(h.page, "aide");
  errs.push(...h.errors);
  await h.ctx.close();
  // Lien : éditeur ouvert sur un rectangle déjà lié, le badge est visible.
  h = await fresh();
  await h.page.click(item("rect"));
  await touchDrag(h.page, h.cdp, [480, 330], [700, 450]);
  await h.page.click(item("select"));
  await marquee(h.page, [430, 280], [760, 500]);
  await waitAttr(h.page, "data-selection", "1");
  await h.page.keyboard.press("Control+k");
  await h.page.locator("[data-link-popover]").waitFor({ state: "visible", timeout: 15000 });
  await h.page.locator("[data-link-popover] input").fill("https://example.org");
  await h.page.keyboard.press("Enter");
  await h.page.locator("[data-link-popover]").waitFor({ state: "hidden", timeout: 15000 });
  await h.page.keyboard.press("Control+k");
  await h.page.locator("[data-link-popover]").waitFor({ state: "visible", timeout: 15000 });
  await shoot(h.page, "lien");
  errs.push(...h.errors);
  await h.ctx.close();
  console.log(`captures : ${OUT}/apres-{texte,fleche,selecteur,aide,lien}.png`);
  if (errs.length) console.log(`captures : erreurs de page : ${errs.join(" | ")}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const wantCaptures = process.argv.includes("--captures");
  const lotArg = arg("--lot");
  if (process.argv.includes("--lot") && lotArg !== "1" && lotArg !== "2") {
    console.error(`${LABEL} : usage — --lot attend 1 ou 2 (reçu : ${lotArg ?? "rien"})`);
    return 2;
  }
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
    const lot = arg("--lot");
    const lot1 = lot === undefined || lot === "1";
    const lot2 = lot === undefined || lot === "2";
    if (wantCaptures && lot1) await captures(browser, base, nom);
    if (wantCaptures && lot2 && nom !== "avant") await captures2(browser, base);
    if (nom === "avant") {
      console.log(`${LABEL} : captures « avant » seules, mesures sautées`);
      return 0;
    }
    if (wantCaptures) return 0;
    // --only s3 : un seul scénario (mise au point) ; sans option, tout est joué.
    const only = arg("--only");
    const on = (n) => only === undefined || only === n;
    if (lot1 && on("lectures")) await lectures(browser, base);
    for (const mode of ["doigt", "clavier"]) {
      if (lot1 && on("s1")) await s1(browser, base, mode, tmp);
      if (lot1 && on("s2")) await s2(browser, base, mode, tmp);
      if (lot1 && on("s3")) await s3(browser, base, mode, tmp);
      if (lot1 && on("s4")) await s4(browser, base, mode);
      if (lot1 && on("s5")) await s5(browser, base, mode);
      if (lot2 && on("s6")) await s6(browser, base, mode);
      if (lot2 && on("s7")) await s7(browser, base, mode, tmp);
      if (lot2 && on("s8")) await s8(browser, base, mode, tmp);
    }
    if (lot1 && on("nettete")) await nettete(browser, base);
    if (lot2 && on("nettete2")) await nettete2(browser, base);
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
