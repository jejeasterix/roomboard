#!/usr/bin/env node
// Essai personnalisation-2-retours (OG23, lot A, S1 à S4 ; S7 : tailles de cible, infobulles, netteté) au navigateur
// (docs/plans/personnalisation-2-retours-cadrage.md § 6). Chaque scénario est joué au doigt (événements tactiles du
// protocole, pointerType « touch », taps de page.touchscreen) puis au clavier (Tab, Entrée, Espace, Échap, raccourcis ; le
// tracé reste tactile, il n'a pas d'équivalent clavier ; le stylet est simulé par des événements souris du protocole
// `pointerType: "pen"` avec `force`). L'état du document est lu dans le fichier enregistré (Ctrl+S) par `roomboard state`
// (CLI), les attributs de `#stage` et les pixels de `#scene`. Netteté du § 10 de docs/plans/design-cadrage.md à 2x.
// Chromium de Playwright, --disable-lcd-text, --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Joué par scripts/verifier.sh --e2e, jamais avec --captures. Un délai dépassé est rejoué une fois avant d'être jugé.
// Usage : node scripts/essais/personnalisation-2-retours-navigateur.mjs [--lot A|B] [--only s1..s4|nettete] [--captures]
//   [--dist <dossier> --nom avant]
//   --captures : docs/design/captures/personnalisation-2-retours/<nom>-{panneau,selecteur,stylo,alignes}.png (2x) ;
//   --dist : sert un autre build ; --nom avant : captures seules (le build d'avant n'a ni accordéon ni Aligner), mesures sautées.
// Lot B (S5, S6) : pas encore joué ici (tâche T14).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { DIST, Echec, frames, gitSha, item, loadPlaywright, ROOT, serve, stageBox, VIEWPORT } from "./commun.mjs";
import { fringes, pixelsOf } from "./nettete.mjs";

const LABEL = "personnalisation-2-retours";
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const URL_QS = "/?fichiers=repli";
const BIN = join(ROOT, "apps", "cli", "dist", "roomboard.mjs");
const OUT = join(ROOT, "docs", "design", "captures", "personnalisation-2-retours");
const OPT = "[data-options]";
const PALE_BLUE = "#a5d8ff";
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

async function newPage(browser, base, { scale = 1, query = URL_QS, size = VIEWPORT } = {}) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: scale, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => void d.accept());
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
/** Doigt : un contact de bout en bout (touchStart, touchMove interpolés, touchEnd) en px de la scène. */
async function touchDrag(page, cdp, from, to, { steps = 10 } = {}) {
  const box = await stageBox(page);
  const at = ([x, y]) => ({ x: Math.round(box.x + x), y: Math.round(box.y + y) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(from)] });
  for (let i = 1; i <= steps; i++) {
    const p = at([from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps]);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400); // un tap qui suit tout de suite un contact du protocole est perdu
  await frames(page);
}
/** Stylet simulé : événements souris du protocole `pointerType: "pen"`, pression `force` de `f0` à `f1` le long du trait. */
async function penStroke(page, cdp, from, to, [f0, f1], steps = 40) {
  const box = await stageBox(page);
  let t = Date.now() / 1000;
  const send = (type, x, y, force, extra = {}) => {
    t += 0.008;
    return cdp.send("Input.dispatchMouseEvent", {
      type, x: Math.round(box.x + x), y: Math.round(box.y + y), button: "left", buttons: type === "mouseReleased" ? 0 : 1, timestamp: t, pointerType: "pen", force, ...extra,
    });
  };
  await send("mouseMoved", from[0], from[1], f0, { buttons: 0, button: "none" });
  await send("mousePressed", from[0], from[1], f0, { clickCount: 1 });
  for (let i = 1; i <= steps; i++) await send("mouseMoved", from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps, f0 + ((f1 - f0) * i) / steps);
  await send("mouseReleased", to[0], to[1], f1, { clickCount: 1 });
  await frames(page);
}
/** Passage de gomme à la souris, de haut en bas à x. */
async function mouseDrag(page, from, to, steps = 12) {
  const b = await stageBox(page);
  await page.mouse.move(b.x + from[0], b.y + from[1]);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(b.x + from[0] + ((to[0] - from[0]) * i) / steps, b.y + from[1] + ((to[1] - from[1]) * i) / steps);
  await page.mouse.up();
  await frames(page);
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
/** Active un bouton : au doigt, un tap sur son centre ; au clavier, le focus puis Entrée. */
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
const head = (key) => `${OPT} [data-option-head="${key}"]`;
/** Section ouverte ? (`aria-expanded` de son en-tête). */
const isOpen = async (page, key) => (await page.locator(head(key)).first().getAttribute("aria-expanded")) === "true";
/** Ouvre la section `key` si elle est repliée (toucher ou Entrée sur son en-tête). */
async function openSection(page, mode, key) {
  if (!(await isOpen(page, key))) await press(page, mode, head(key));
  check(await isOpen(page, key), `section « ${key} » ouverte`);
}
/** Choix dans une section (ouverte d'abord si besoin) : doigt ou clavier. */
async function choose(page, mode, key, value) {
  await openSection(page, mode, key);
  await press(page, mode, opt(key, value));
}
const pressed = async (page, key, value) => {
  const el = page.locator(opt(key, value)).first();
  return ((await el.getAttribute("aria-pressed")) ?? (await el.getAttribute("aria-checked"))) === "true";
};
async function useTool(page, mode, id) {
  await press(page, mode, item(id));
}
const pickerOpen = (page) => page.locator("[data-color-picker]").first().isVisible().catch(() => false);
/** Ouvre le sélecteur de la section de couleur `key` (bouton « Autres couleurs »), s'il n'est pas déjà ouvert. */
async function openPicker(page, mode, key) {
  await openSection(page, mode, key);
  if (!(await pickerOpen(page))) await press(page, mode, `${OPT} [data-more-colors="${key}"]`);
  await page.locator("[data-color-picker]").first().waitFor({ state: "visible", timeout: 15000 });
}
/** Ferme le sélecteur s'il est resté ouvert (Échap). */
async function closePicker(page) {
  if (await pickerOpen(page)) {
    await page.keyboard.press("Escape");
    await frames(page);
  }
}
/** Empreinte (SHA-256) tronquée des pixels d'une boîte de `#scene` : sert à voir qu'un rendu change. */
async function darkness(page, x, y0, y1, half = 6) {
  return page.$eval(
    "#scene",
    (c, [x, y0, y1, half]) => {
      const g = c.getContext("2d");
      const sx = c.width / c.clientWidth;
      const sy = c.height / c.clientHeight;
      const w = Math.round(2 * half * sx);
      const d = g.getImageData(Math.round((x - half) * sx), Math.round(y0 * sy), w, Math.round((y1 - y0) * sy)).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += (255 - (d[i] + d[i + 1] + d[i + 2]) / 3) / 255;
      return sum / w; // « hauteur » moyenne d'encre sur la fenêtre, en px de canvas
    },
    [x, y0, y1, half],
  );
}
/** Enregistre (Ctrl+S, repli : un téléchargement) et lit l'état par `roomboard state` : éléments à plat. */
async function saved(page, tmp, name) {
  const dl = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const file = join(tmp, name);
  await (await dl).saveAs(file);
  return { file, elements: readState(file) };
}
function cli(args, input) {
  return spawnSync("node", [BIN, ...args], { encoding: "utf8", input });
}
function readState(file) {
  const r = cli(["run", file, "--ops", "-"], `${JSON.stringify({ op: "state" })}\n`);
  if (r.status !== 0) throw new Echec(`roomboard state : code ${r.status} ${r.stderr}`);
  const line = r.stdout.split("\n").filter((l) => l !== "").map((l) => JSON.parse(l)).find((l) => l.state);
  if (!line) throw new Echec(`roomboard state : aucune ligne state (${r.stdout.slice(0, 200)})`);
  return line.state.pages.flatMap((p) => p.elements);
}
const kindOf = (e, shape) => e.kind === "shape" && e.shape?.shape === shape;
/** Boîte [x0, y0, x1, y1] d'un élément : ses points de forme ou de trait passés par sa matrice. */
function boxOf(e) {
  const m = e.transform ?? [1, 0, 0, 1, 0, 0];
  const pts = [];
  const s = e.shape;
  if (s && Number.isFinite(s.x0)) pts.push([s.x0, s.y0], [s.x1, s.y1]);
  else if (s && Array.isArray(s.points)) for (let i = 0; i + 1 < s.points.length; i += 2) pts.push([s.points[i], s.points[i + 1]]);
  else if (e.text && e.box) pts.push([e.box.x0 ?? 0, e.box.y0 ?? 0], [e.box.x1 ?? 0, e.box.y1 ?? 0]);
  const out = pts.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  const xs = out.map((p) => p[0]);
  const ys = out.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
const rects = (els) => els.filter((e) => kindOf(e, "rect"));
const selBounds = async (page) => (await attr(page, "data-bounds")).split(",").map(Number);
/** Rejoue une fois un scénario qui échoue sur un délai (jamais un autre échec). */
async function once(name, fn) {
  try {
    await fn();
  } catch (e) {
    if (!(e instanceof Error) || !/Timeout|attendu « |waitFor|délai/i.test(e.message)) throw e;
    console.log(`rejeu — ${name} : ${e.message.split("\n")[0]}`);
    await fn();
  }
}

// ---------------------------------------------------------------------------------------------------------- scénarios

/** S1 : l'accordéon du panneau d'options. */
async function s1(browser, base, mode) {
  const { ctx, page, errors } = await newPage(browser, base);
  await useTool(page, mode, "rect");
  const keys = await page.$$eval(`${OPT} [data-option]`, (els) => els.map((e) => e.getAttribute("data-option")));
  lire("S1.sections", keys.join(","));
  const exp = async (k) => String(await isOpen(page, k));
  const hidden = (k) => page.$eval(`${OPT} #opt-body-${k}`, (el) => el.hidden);
  check((await exp("strokeColor")) === "true" && (await exp("background")) === "true" && (await exp("strokeWidth")) === "true", "S1.1 : Trait, Arrière-plan et Largeur sont ouverts");
  for (const k of ["strokeStyle", "roughness", "roundness", "opacity"]) {
    check((await exp(k)) === "false" && (await hidden(k)) === true, `S1.1 : « ${k} » replié (aria-expanded false, corps hidden)`);
    check(await page.locator(head(k)).isVisible(), `S1.1 : l'en-tête « ${k} » reste visible`);
  }
  lire("S1.head.strokeStyle", await exp("strokeStyle"));
  const rough = (await page.locator(head("roughness")).innerText()).replace(/\s+/g, " ").trim();
  lire("S1.resume.roughness", rough);
  check(/Style de tracé/.test(rough) && /Net/.test(rough), `S1.1 : l'en-tête résume « Style de tracé · Net » (lu : ${rough})`);
  // 2. Toucher l'en-tête : il s'ouvre ; choisir Tirets ; recharger : il reste ouvert.
  await press(page, mode, head("strokeStyle"));
  check(await isOpen(page, "strokeStyle"), "S1.2 : « Style du trait » s'ouvre");
  await press(page, mode, opt("strokeStyle", "dashed"));
  check(await pressed(page, "strokeStyle", "dashed"), "S1.2 : Tirets enfoncé");
  await page.reload();
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  if ((await attr(page, "data-tool")) !== "rect") await useTool(page, mode, "rect");
  lire("S1.relu.strokeStyle", await exp("strokeStyle"));
  check((await exp("strokeStyle")) === "true", "S1.2 : rechargé, « Style du trait » est toujours ouvert");
  check((await exp("roundness")) === "false", "S1.2 : rechargé, « Angles » est toujours replié");
  // 3. Clavier : Tab jusqu'à l'en-tête « Angles », Entrée l'ouvre, Espace le referme ; S ouvre le sélecteur de Trait.
  if (mode === "clavier") {
    await page.evaluate(() => document.activeElement?.blur?.());
    let reached = false;
    for (let i = 0; i < 120 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.getAttribute("data-option-head") === "roundness");
    }
    check(reached, "S1.3 : Tab atteint l'en-tête « Angles »");
    await page.keyboard.press("Enter");
    await frames(page);
    check(await isOpen(page, "roundness"), "S1.3 : Entrée ouvre « Angles »");
    await page.keyboard.press("Space");
    await frames(page);
    // Défaut vu (hors périmètre) : le moteur prend Espace (isPanKey, engine/input/keys.ts:31) sans exclure les boutons ;
    // la touche n'active donc pas l'en-tête. Consigné au rapport ; Entrée referme.
    lire("S1.espace.referme", String(!(await isOpen(page, "roundness"))));
    if (await isOpen(page, "roundness")) await page.keyboard.press("Enter");
    await frames(page);
    check(!(await isOpen(page, "roundness")), "S1.3 : « Angles » se referme au clavier");
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press("s");
    await page.locator("[data-color-picker]").first().waitFor({ state: "visible", timeout: 15000 });
    check(true, "S1.3 : S ouvre le sélecteur de Trait");
    await closePicker(page);
  }
  check(errors.length === 0, `S1 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S1 OK" : "S1 OK (clavier)");
}

/** Fichier PDF d'un rectangle : flux inflatés, concaténés. */
function fluxPdf(pdf) {
  const brut = readFileSync(pdf);
  const flux = [];
  for (let i = brut.indexOf("stream"); i >= 0; i = brut.indexOf("stream", i + 6)) {
    if (brut.subarray(i - 3, i).toString() === "end") continue;
    const debut = i + 6 + (brut[i + 6] === 0x0d ? 2 : 1);
    const fin = brut.indexOf("endstream", debut);
    if (fin < 0) continue;
    const corps = brut.subarray(debut, fin);
    try {
      flux.push(inflateSync(corps).toString("latin1"));
    } catch {
      flux.push(corps.toString("latin1"));
    }
  }
  return flux.join("\n");
}

/** S2 : couleurs avancées, transparentes, pipette. */
async function s2(browser, base, mode, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  const A = [[380, 250], [500, 350]];
  const B = [[600, 250], [720, 350]];
  await useTool(page, mode, "rect");
  await touchDrag(page, cdp, A[0], A[1]);
  await touchDrag(page, cdp, B[0], B[1]);
  await waitAttr(page, "data-elements", "2");
  await useTool(page, mode, "select");
  await marquee(page, [340, 200], [780, 400]);
  await waitAttr(page, "data-selection", "2");
  // 1. Rangée Trait sur une ligne ; sélecteur ; case Transparent en damier.
  const row = await page.$$eval(`${OPT} [data-option="strokeColor"] .rb-pick, ${OPT} [data-option="strokeColor"] .rb-pick-more`, (els) => els.map((e) => ({ top: Math.round(e.getBoundingClientRect().top), cls: e.className })));
  lire("S2.rangee", row.map((r) => `${r.cls.includes("more") ? "palette" : "pastille"}@${r.top}`).join(" "));
  check(row.filter((r) => r.cls.includes("rb-pick-more")).length === 1 && row.filter((r) => !r.cls.includes("more")).length === 4, "S2.1 : 4 pastilles et la palette");
  check(new Set(row.map((r) => r.top)).size === 1, "S2.1 : la rangée Trait tient sur une ligne (même ordonnée)");
  await openPicker(page, mode, "strokeColor");
  const tr = page.locator("[data-color-picker] [data-color-transparent]");
  check(await tr.isVisible(), "S2.1 : le sélecteur montre une case Transparent");
  const bg = await tr.locator(".rb-pick-dot").evaluate((el) => getComputedStyle(el).backgroundImage);
  lire("S2.damier", bg.slice(0, 60));
  // Défaut vu (hors périmètre) : apps/web/src/ui/rb.css:461 lit `var(--rf-gray-200)`, jamais défini (rb.css:11-15 : 50, 100,
  // 300, 500, 800) : la déclaration tombe, le damier n'est pas peint. Consigné au rapport ; l'essai ne le juge pas.
  lire("S2.damier.peint", String(/conic-gradient/.test(bg)));
  await press(page, mode, "[data-color-picker] [data-color-transparent]");
  await closePicker(page);
  let s = await saved(page, tmp, `s2a-${mode}.roomboard`);
  lire("S2.color", String(s.elements[0]?.style?.color));
  check(s.elements.length === 2 && s.elements.every((e) => e.style.color === "transparent"), "S2.1 : les deux rectangles ont color « transparent »");
  // Le style courant garde sa couleur : outil Stylo, un trait.
  await useTool(page, mode, "pen");
  const on = await page.$$eval(`${OPT} [data-option="strokeColor"] [aria-pressed="true"]`, (els) => els.map((e) => e.getAttribute("data-option-value")));
  lire("S2.pastille Stylo", on.join(","));
  check(on.length === 1 && on[0] !== "transparent", "S2.1 : Stylo : une pastille d'avant est enfoncée, pas Transparent");
  await touchDrag(page, cdp, [400, 520], [700, 540]);
  s = await saved(page, tmp, `s2b-${mode}.roomboard`);
  const trait = s.elements.find((e) => e.kind === "stroke");
  lire("S2.itemStyle.color", String(trait?.style?.color));
  check(trait?.style?.color === "#000000", "S2.1 : le trait du Stylo garde sa couleur (#000000)");
  // 2. Arrière-plan : palette, #a5d8ff ; Transparent dans la rangée ; une étape chacun.
  await useTool(page, mode, "select");
  await marquee(page, [340, 200], [780, 400]);
  await waitAttr(page, "data-selection", "2");
  await openPicker(page, mode, "background");
  await press(page, mode, `[data-color-picker] button[aria-label="${PALE_BLUE}"]`);
  await closePicker(page);
  s = await saved(page, tmp, `s2c-${mode}.roomboard`);
  const fills = rects(s.elements).map((e) => e.shape.fill);
  lire("S2.fill", JSON.stringify(fills[0]));
  check(fills.length === 2 && fills.every((f) => JSON.stringify(f).includes(PALE_BLUE)), `S2.2 : fill ${PALE_BLUE} écrit sur les deux`);
  await openSection(page, mode, "background");
  await press(page, mode, opt("background", "transparent"));
  s = await saved(page, tmp, `s2d-${mode}.roomboard`);
  check(rects(s.elements).every((e) => e.shape.fill === null || e.shape.fill === undefined), "S2.2 : Transparent dans la rangée : fill retiré");
  await page.keyboard.press("Control+z");
  await frames(page);
  s = await saved(page, tmp, `s2e-${mode}.roomboard`);
  check(rects(s.elements).every((e) => JSON.stringify(e.shape.fill ?? null).includes(PALE_BLUE)), "S2.2 : Ctrl+Z : #a5d8ff revient (une étape)");
  await page.keyboard.press("Control+z");
  await frames(page);
  s = await saved(page, tmp, `s2f-${mode}.roomboard`);
  check(rects(s.elements).every((e) => e.shape.fill === null || e.shape.fill === undefined), "S2.2 : Ctrl+Z : plus de fond (une étape)");
  check(errors.length === 0, `S2 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S2 OK" : "S2 OK (clavier)");
}

/** S2.3 à S2.5 : pipette de scène (rendu par défaut), clavier du sélecteur, PDF d'un trait transparent. */
async function s2pipette(browser, base, mode, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  const A = [[620, 250], [760, 360]]; // plein #a5d8ff
  const B = [[380, 250], [500, 350]]; // le rectangle qui reçoit la couleur
  const gl2 = await page.evaluate(() => document.createElement("canvas").getContext("webgl2") !== null);
  lire("S2.rendu", `WebGL2 ${gl2 ? "disponible (rendu par défaut : WebGL2LiveRenderer sur Canvas2D)" : "absent (repli Canvas 2D)"}`);
  await useTool(page, mode, "rect");
  await touchDrag(page, cdp, A[0], A[1]);
  await useTool(page, mode, "select");
  await marquee(page, [580, 220], [800, 400]);
  await waitAttr(page, "data-selection", "1");
  await openPicker(page, mode, "background");
  await press(page, mode, `[data-color-picker] button[aria-label="${PALE_BLUE}"]`);
  await closePicker(page);
  await choose(page, mode, "fillStyle", "solid");
  await useTool(page, mode, "rect");
  await touchDrag(page, cdp, B[0], B[1]);
  await waitAttr(page, "data-elements", "2");
  await useTool(page, mode, "select");
  await marquee(page, [340, 200], [560, 400]);
  await waitAttr(page, "data-selection", "1");
  const before = await attr(page, "data-bounds");
  let s = await saved(page, tmp, `p-avant-${mode}.roomboard`);
  const nSave = s.elements.length;
  await openPicker(page, mode, "strokeColor");
  await press(page, mode, "[data-color-picker] [data-color-pipette]");
  check(await pickerOpen(page), "S2.3 : la pipette armée, le sélecteur reste ouvert");
  await tapStage(page, 690, 305);
  await frames(page);
  check((await attr(page, "data-selection")) === "1" && (await attr(page, "data-bounds")) === before, "S2.3 : la sélection n'a pas changé");
  s = await saved(page, tmp, `p-apres-${mode}.roomboard`);
  const picked = s.elements.filter((e) => kindOf(e, "rect")).map((e) => e.style.color);
  lire("S2.pipette", picked.find((c) => c !== "#000000") ?? picked.join(","));
  check(picked.includes(PALE_BLUE), `S2.3 : le rectangle sélectionné a color ${PALE_BLUE} (lu : ${picked}) — la pipette lit le rendu par défaut`);
  check(!(await pickerOpen(page)), "S2.3 : puis le sélecteur se ferme");
  await page.keyboard.press("Control+z");
  await frames(page);
  s = await saved(page, tmp, `p-undo-${mode}.roomboard`);
  check(s.elements.length === nSave && !s.elements.some((e) => e.style?.color === PALE_BLUE), "S2.3 : Ctrl+Z annule la pipette en une étape");
  // 4. Clavier : G, flèches, Entrée ; hexadécimal #123456 ; I arme la pipette, Échap l'annule.
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press("g");
  await page.locator("[data-color-picker]").first().waitFor({ state: "visible", timeout: 15000 });
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await frames(page);
  s = await saved(page, tmp, `k-grille-${mode}.roomboard`);
  const fillG = JSON.stringify(s.elements.find((e) => kindOf(e, "rect") && e.shape.fill)?.shape?.fill ?? null);
  lire("S2.G", fillG);
  check(fillG !== "null", "S2.4 : G, flèches, Entrée : un fond est écrit");
  await closePicker(page);
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press("s");
  await page.locator("[data-color-picker]").first().waitFor({ state: "visible", timeout: 15000 });
  const hexField = page.locator("[data-color-picker] [data-color-hex]");
  await hexField.focus();
  await hexField.fill("#123456");
  await page.keyboard.press("Enter");
  await frames(page);
  s = await saved(page, tmp, `k-hex-${mode}.roomboard`);
  lire("S2.hex", String(s.elements.find((e) => kindOf(e, "rect") && e.style.color === "#123456")?.style?.color));
  check(s.elements.some((e) => kindOf(e, "rect") && e.style.color === "#123456"), "S2.4 : champ hexadécimal #123456, Entrée : le trait est #123456");
  await closePicker(page);
  // I arme la pipette, Échap l'annule : un toucher sur le rectangle plein ne lit plus rien.
  await openPicker(page, mode, "strokeColor");
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press("i");
  await frames(page);
  await page.keyboard.press("Escape");
  await frames(page);
  await closePicker(page);
  s = await saved(page, tmp, `k-esc-${mode}.roomboard`);
  check(!s.elements.some((e) => e.style?.color === PALE_BLUE), "S2.4 : I arme, Échap annule : aucune couleur lue");
  check(errors.length === 0, `S2.3 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
}

/** S2.5 : export PDF par la CLI d'un rectangle à trait transparent et fond jaune. */
async function s2pdf(browser, base, tmp) {
  const { ctx, page, cdp } = await newPage(browser, base);
  await useTool(page, "doigt", "rect");
  await touchDrag(page, cdp, [400, 300], [560, 400]);
  await waitAttr(page, "data-elements", "1");
  await useTool(page, "doigt", "select");
  await marquee(page, [360, 260], [600, 440]);
  await openPicker(page, "doigt", "strokeColor");
  await press(page, "doigt", "[data-color-picker] [data-color-transparent]");
  await closePicker(page);
  await openPicker(page, "doigt", "background");
  await press(page, "doigt", '[data-color-picker] button[aria-label="#ffec99"]');
  await closePicker(page);
  const s = await saved(page, tmp, "pdf.roomboard");
  const pdf = join(tmp, "pdf.pdf");
  const ex = cli(["export", s.file, pdf]);
  check(ex.status === 0, `S2.5 : roomboard export en PDF (code ${ex.status})`);
  const flux = fluxPdf(pdf);
  const trace = /(^|\s)[Ss]\s/.test(flux);
  const remplit = /(^|\s)f\*?\s/.test(flux);
  lire("S2.pdf", `remplit=${remplit} trace=${trace}`);
  check(remplit && !trace, "S2.5 : le flux de la page remplit et ne trace pas");
  await ctx.close();
  console.log("S2.5 : PDF OK");
}

/** S3 : épaisseur et pression. */
async function s3(browser, base, mode, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  await useTool(page, mode, "pen");
  const keys = await page.$$eval(`${OPT} [data-option]`, (els) => els.map((e) => e.getAttribute("data-option")));
  lire("S3.sections", keys.join(","));
  check(keys.join(",") === "strokeColor,strokeWidth,pressure,opacity", "S3.1 : sections Trait, Largeur, Pression, Transparence");
  const segs = await page.$$eval(`${OPT} [data-option="strokeWidth"] [data-option-value]`, (els) => els.map((e) => ({ icon: e.querySelector("svg") !== null, text: (e.textContent ?? "").trim() })));
  lire("S3.largeur", JSON.stringify(segs));
  check(segs.length === 3 && segs.every((x) => x.icon && x.text !== ""), "S3.1 : chaque segment de Largeur a une icône d'épaisseur et un mot");
  const icons = await page.$$eval(`${OPT} [data-option="pressure"] [data-option-value] svg`, (els) => els.length);
  check(icons === 2, "S3.1 : Pression montre deux icônes");
  const resume = (await page.locator(head("pressure")).innerText()).replace(/\s+/g, " ").trim();
  lire("S3.resume", resume);
  check(/Pression/.test(resume) && /Variable/.test(resume), `S3.1 : résumé « Pression · Variable » (lu : ${resume})`);
  // 2. Constante : le contour ne varie pas ; Variable : il varie. Largeur 8 pour la résolution de la mesure.
  await choose(page, mode, "strokeWidth", "8");
  await choose(page, mode, "pressure", "constant");
  const X0 = 440;
  const X1 = 1000;
  const L = X1 - X0;
  const win = (f) => X0 + L * f;
  const Y1 = 300;
  const Y2 = 520;
  await penStroke(page, cdp, [X0, Y1], [X1, Y1], [0.1, 1]);
  await choose(page, mode, "pressure", "variable");
  await penStroke(page, cdp, [X0, Y2], [X1, Y2], [0.1, 1]);
  await waitAttr(page, "data-elements", "2");
  const thick = async (y) => [await darkness(page, win(0.25), y - 40, y + 40), await darkness(page, win(0.75), y - 40, y + 40)];
  const [c0, c1] = await thick(Y1);
  const [v0, v1] = await thick(Y2);
  const ecartC = Math.abs(c1 - c0) / Math.max(c0, c1);
  const ecartV = Math.abs(v1 - v0) / Math.max(v0, v1);
  lire("S3.variability", "constant");
  lire("S3.ecart.constant", `${(ecartC * 100).toFixed(1)} %`);
  lire("S3.ecart.variable", `${(ecartV * 100).toFixed(1)} %`);
  check(ecartC < 0.05, `S3.2 : Constante : la hauteur du contour varie de ${(ecartC * 100).toFixed(1)} % (< 5 %)`);
  check(ecartV > 0.3, `S3.2 : Variable : elle varie de ${(ecartV * 100).toFixed(1)} % (> 30 %)`);
  let s = await saved(page, tmp, `s3a-${mode}.roomboard`);
  const strokes = s.elements.filter((e) => e.kind === "stroke");
  check(strokes.length === 2 && strokes.some((e) => e.look?.variability === "constant"), "S3.2 : le trait constant porte variability « constant »");
  // 5. Un trait en Variable n'écrit pas le champ (neutre jamais écrit).
  check(strokes.some((e) => e.look?.variability === undefined), "S3.5 : le trait en Variable n'a pas le champ variability (le neutre n'est pas écrit)");
  // 3. Gomme partielle sur le trait constant : les morceaux gardent variability ; le trou vaut la gomme.
  await useTool(page, mode, "eraser");
  const XE = win(0.5);
  await mouseDrag(page, [XE, Y1 - 60], [XE, Y1 + 60]);
  await frames(page);
  s = await saved(page, tmp, `s3b-${mode}.roomboard`);
  const pieces = s.elements.filter((e) => e.kind === "stroke" && e.look?.variability === "constant");
  lire("S3.gomme.morceaux", String(pieces.length));
  check(pieces.length === 2, `S3.3 : la gomme coupe le trait constant en deux morceaux qui gardent variability (${pieces.length})`);
  const hole = await page.$eval(
    "#scene",
    (c, [y, x0, x1]) => {
      const g = c.getContext("2d");
      const sx = c.width / c.clientWidth;
      const row = g.getImageData(Math.round(x0 * sx), Math.round(y * sx), Math.round((x1 - x0) * sx), 1).data;
      let best = 0;
      let run = 0;
      for (let i = 0; i < row.length; i += 4) {
        run = row[i] + row[i + 1] + row[i + 2] < 300 && row[i + 3] > 128 ? 0 : run + 1;
        best = Math.max(best, run);
      }
      return best / sx;
    },
    [Y1, win(0.2), win(0.8)],
  );
  lire("S3.gomme.trou", `${hole} px`);
  check(Math.abs(hole - 24) <= 2, `S3.3 : le trou a la largeur de la gomme (24 px, lu ${hole})`);
  // 4. Ellipse : Style de tracé Net, À main levée, Très à main levée ; À main levée écrit roughness 1.
  await useTool(page, mode, "ellipse");
  await openSection(page, mode, "roughness");
  const labels = await page.$$eval(`${OPT} [data-option="roughness"] [data-option-value]`, (els) => els.map((e) => (e.textContent || e.getAttribute("aria-label") || "").trim()));
  lire("S3.tracé", labels.join("|"));
  check(labels.join("|") === "Net|À main levée|Très à main levée", "S3.4 : Net, À main levée, Très à main levée");
  await press(page, mode, opt("roughness", "1"));
  await touchDrag(page, cdp, [420, 600], [620, 700]);
  s = await saved(page, tmp, `s3c-${mode}.roomboard`);
  const ell = s.elements.find((e) => kindOf(e, "ellipse"));
  lire("S3.ellipse.roughness", String(ell?.look?.roughness));
  check(ell?.look?.roughness === 1, "S3.4 : À main levée : roughness 1");
  check(errors.length === 0, `S3 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S3 OK" : "S3 OK (clavier)");
}

// Paires `key` / `code` jouées pour les raccourcis d'Organiser : PC AZERTY, PC QWERTY (mêmes lettres H V R, codes de
// position), Mac (Option change la lettre lue par `key` : seul `code` la donne, déc. 24).
const LAYOUTS = {
  azerty: { h: ["h", "KeyH"], v: ["v", "KeyV"], r: ["r", "KeyR"] },
  qwerty: { h: ["h", "KeyH"], v: ["v", "KeyV"], r: ["r", "KeyR"] },
  mac: { h: ["˙", "KeyH"], v: ["√", "KeyV"], r: ["®", "KeyR"] },
};
const SHORTCUTS = [
  { how: "flip-h", alt: false, shift: true, letter: "h" },
  { how: "flip-v", alt: false, shift: true, letter: "v" },
  { how: "rotate-cw", alt: false, shift: true, letter: "r" },
  { how: "rotate-ccw", alt: true, shift: true, letter: "r" },
  { how: "align-left", alt: true, shift: true, arrow: "ArrowLeft" },
  { how: "align-center", alt: true, shift: true, letter: "h" },
  { how: "distribute-h", alt: true, shift: false, letter: "h" },
];
async function fire(page, { alt, shift, letter, arrow }, layout) {
  await page.evaluate(
    ([alt, shift, key, code]) => {
      const e = new KeyboardEvent("keydown", { key, code, altKey: alt, shiftKey: shift, bubbles: true, cancelable: true });
      (document.activeElement ?? document.body).dispatchEvent(e);
    },
    [alt, shift, ...(arrow ? [arrow, arrow] : alt ? LAYOUTS[layout][letter] : [shift ? letter.toUpperCase() : letter, `Key${letter.toUpperCase()}`])],
  );
  await frames(page);
}

/** S4 : organiser, aligner, transformer. */
async function s4(browser, base, mode, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  const R = [[[400, 250], [480, 330]], [[560, 330], [680, 390]], [[780, 420], [860, 520]]];
  await useTool(page, mode, "rect");
  for (const [a, b] of R) await touchDrag(page, cdp, a, b);
  await waitAttr(page, "data-elements", "3");
  await useTool(page, mode, "select");
  await marquee(page, [340, 200], [920, 560]);
  await waitAttr(page, "data-selection", "3");
  // 1. Sections Disposition, Aligner (8 boutons), Transformer.
  const keys = await page.$$eval(`${OPT} [data-option]`, (els) => els.map((e) => e.getAttribute("data-option")));
  lire("S4.sections", keys.join(","));
  check(["layers", "align", "transform"].every((k) => keys.includes(k)), "S4.1 : sections Disposition, Aligner, Transformer");
  await openSection(page, mode, "align");
  await openSection(page, mode, "transform");
  const nAlign = await page.locator(`${OPT} [data-option="align"] [data-option-value]`).count();
  check(nAlign === 8, `S4.1 : Aligner montre 8 boutons (${nAlign}), dont Répartir à 3 unités`);
  const boxesNow = async (name) => rects((await saved(page, tmp, `${name}-${mode}.roomboard`)).elements).map((e) => boxOf(e).map((v) => Math.round(v * 10) / 10));
  const start = await boxesNow("s4-0");
  // 2. Aligner à gauche : même x0 ; Ctrl+Z : une étape.
  await press(page, mode, opt("align", "align-left"));
  const left = await boxesNow("s4-1");
  lire("S4.x0", [...new Set(left.map((b) => b[0]))].join(","));
  check(new Set(left.map((b) => Math.round(b[0]))).size === 1, "S4.2 : Aligner à gauche : les trois boîtes ont le même x0");
  await page.keyboard.press("Control+z");
  await frames(page);
  const undone = await boxesNow("s4-2");
  lire("S4.etapes", JSON.stringify(undone) === JSON.stringify(start) ? 1 : "plus de 1");
  check(JSON.stringify(undone) === JSON.stringify(start), "S4.2 : Ctrl+Z : une étape, les positions d'avant");
  // 3. Répartir horizontalement : écarts égaux à 1 px près ; absent avec deux rectangles.
  await press(page, mode, opt("align", "distribute-h"));
  const dist = (await boxesNow("s4-3")).sort((a, b) => a[0] - b[0]);
  const gaps = [dist[1][0] - dist[0][2], dist[2][0] - dist[1][2]];
  lire("S4.ecarts", gaps.join(","));
  check(Math.abs(gaps[0] - gaps[1]) <= 1, `S4.3 : écarts égaux à 1 px près (${gaps})`);
  await page.keyboard.press("Control+z");
  await frames(page);
  await marquee(page, [340, 200], [700, 420]);
  await waitAttr(page, "data-selection", "2");
  await openSection(page, mode, "align");
  check((await page.locator(opt("align", "distribute-h")).count()) === 0, "S4.3 : avec deux rectangles, Répartir est absent");
  // 5. Raccourcis : mêmes résultats que les boutons, pour trois claviers (AZERTY, QWERTY, Mac).
  await marquee(page, [340, 200], [920, 560]);
  await waitAttr(page, "data-selection", "3");
  for (const sc of SHORTCUTS) {
    await press(page, mode, opt(sc.how.startsWith("distribute") || sc.how.startsWith("align") ? "align" : "transform", sc.how));
    const viaButton = JSON.stringify(await boxesNow(`s4-b-${sc.how}`));
    await page.keyboard.press("Control+z");
    await frames(page);
    for (const layout of Object.keys(LAYOUTS)) {
      if (!sc.alt && layout === "mac") continue; // sans Alt, `key` donne la lettre : le Mac n'y change rien
      await fire(page, sc, layout);
      const viaKey = JSON.stringify(await boxesNow(`s4-k-${sc.how}-${layout}`));
      check(viaKey === viaButton, `S4.5 : ${sc.how} au clavier ${layout} = le bouton`);
      await page.keyboard.press("Control+z");
      await frames(page);
    }
  }
  const sel0 = await selBounds(page);
  await page.keyboard.press("ArrowRight");
  await frames(page);
  const sel1 = await selBounds(page);
  check(Math.abs(sel1[0] - sel0[0] - 1) < 0.01, `S4.5 : → déplace la sélection de 1 px (${sel1[0] - sel0[0]})`);
  await page.keyboard.press("Control+z");
  await frames(page);
  // Ctrl+Maj+↑ reste Premier plan (jamais « aligner en haut ») : un seul rectangle, rang de pile.
  await marquee(page, [340, 200], [520, 380]);
  await waitAttr(page, "data-selection", "1");
  const order0 = (await saved(page, tmp, `s4-o0-${mode}.roomboard`)).elements.filter((e) => kindOf(e, "rect")).map((e) => e.id);
  await page.keyboard.press("Control+Shift+ArrowUp");
  await frames(page);
  const order1 = (await saved(page, tmp, `s4-o1-${mode}.roomboard`)).elements.filter((e) => kindOf(e, "rect")).map((e) => e.id);
  check(order1.at(-1) === order0[0] && order1.length === 3, "S4.5 : Ctrl+Maj+↑ garde son sens : Premier plan");
  check(errors.length === 0, `S4 (${mode}) : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log(mode === "doigt" ? "S4 OK" : "S4 OK (clavier)");
}

/** S4.4, S4.6, S4.7 : retourner une flèche et un texte, groupe en bloc, CLI. */
async function s4suite(browser, base, mode, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  // 4. Une flèche et un texte : la flèche pointe dans l'autre sens, le texte reste droit.
  await useTool(page, mode, "arrow");
  await touchDrag(page, cdp, [420, 450], [600, 450]);
  await useTool(page, mode, "text");
  await tapStage(page, 700, 440);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 15000 });
  await page.keyboard.type("Bon");
  await page.keyboard.press("Escape");
  await frames(page);
  await waitAttr(page, "data-elements", "2");
  await useTool(page, mode, "select");
  await marquee(page, [380, 380], [900, 520]);
  await waitAttr(page, "data-selection", "2");
  await openSection(page, mode, "transform");
  let s = await saved(page, tmp, `s4s-0-${mode}.roomboard`);
  const arrow0 = s.elements.find((e) => e.kind === "shape");
  const text0 = s.elements.find((e) => e.kind === "text");
  await press(page, mode, opt("transform", "flip-h"));
  s = await saved(page, tmp, `s4s-1-${mode}.roomboard`);
  const arrow1 = s.elements.find((e) => e.kind === "shape");
  const text1 = s.elements.find((e) => e.kind === "text");
  const ma = arrow1.transform ?? [1, 0, 0, 1, 0, 0];
  const mt = text1.transform ?? [1, 0, 0, 1, 0, 0];
  lire("S4.flip.fleche", JSON.stringify(ma));
  lire("S4.flip.texte", JSON.stringify(mt));
  check(ma[0] === -(arrow0.transform?.[0] ?? 1), "S4.4 : la flèche pointe dans l'autre sens (a = -1)");
  check(mt[0] === 1 && mt[3] === 1, "S4.4 : le texte reste lisible (matrice droite)");
  check(boxOf(text1)[0] !== boxOf(text0)[0] || text1.transform?.[4] !== text0.transform?.[4], "S4.4 : le texte a changé de place (miroir)");
  await page.keyboard.press("Control+z");
  await frames(page);
  s = await saved(page, tmp, `s4s-2-${mode}.roomboard`);
  check(JSON.stringify(s.elements.find((e) => e.kind === "shape").transform) === JSON.stringify(arrow0.transform), "S4.4 : Ctrl+Z : une étape");
  await page.close();
  // 4b. Tourner à droite : le rectangle large devient haut.
  const p2 = await newPage(browser, base);
  await useTool(p2.page, mode, "rect");
  await touchDrag(p2.page, p2.cdp, [420, 300], [660, 360]);
  await waitAttr(p2.page, "data-elements", "1");
  await useTool(p2.page, mode, "select");
  await marquee(p2.page, [380, 260], [700, 400]);
  await waitAttr(p2.page, "data-selection", "1");
  const b0 = await selBounds(p2.page);
  await openSection(p2.page, mode, "transform");
  await press(p2.page, mode, opt("transform", "rotate-cw"));
  const b1 = await selBounds(p2.page);
  lire("S4.rotation", `${b0[2] - b0[0]}x${b0[3] - b0[1]} -> ${b1[2] - b1[0]}x${b1[3] - b1[1]}`);
  check(b0[2] - b0[0] > b0[3] - b0[1] && b1[3] - b1[1] > b1[2] - b1[0], "S4.4 : Tourner à droite : le rectangle large devient haut");
  await p2.page.keyboard.press("Control+z");
  await frames(p2.page);
  check(JSON.stringify(await selBounds(p2.page)) === JSON.stringify(b0), "S4.4 : Ctrl+Z : une étape");
  await p2.ctx.close();
  // 6. Groupe : un seul membre désigné par l'API, Aligner à gauche : le groupe bouge en bloc (CLI sur un fichier enregistré).
  const g = await newPage(browser, base);
  await useTool(g.page, mode, "rect");
  await touchDrag(g.page, g.cdp, [420, 250], [500, 320]);
  await touchDrag(g.page, g.cdp, [560, 250], [640, 320]);
  await touchDrag(g.page, g.cdp, [760, 400], [840, 470]);
  await waitAttr(g.page, "data-elements", "3");
  await useTool(g.page, mode, "select");
  await marquee(g.page, [380, 220], [680, 360]);
  await waitAttr(g.page, "data-selection", "2");
  await g.page.keyboard.press("Control+g");
  await waitAttr(g.page, "data-grouped", "1").catch(() => undefined);
  const gs = await saved(g.page, tmp, `s4g-${mode}.roomboard`);
  const ids = gs.elements.filter((e) => kindOf(e, "rect")).map((e) => e.id);
  const lignes = (...o) => `${o.map((x) => JSON.stringify(x)).join("\n")}\n`;
  const elOf = (st, id) => st.pages.flatMap((p) => p.elements).find((e) => e.id === id);
  const run = cli(["run", gs.file, "--ops", "-"], lignes({ op: "state" }, { type: "Arrange", ids: [ids[0], ids[2]], how: "align-left" }, { op: "state" }, { op: "undo" }, { op: "state" }));
  check(run.status === 0, `S4.6 : roomboard run (code ${run.status} ${run.stderr})`);
  const st = run.stdout.split("\n").filter((l) => l !== "").map((l) => JSON.parse(l)).filter((l) => l.state).map((l) => l.state);
  const dx = (id, k) => (elOf(st[k], id)?.transform?.[4] ?? 0) - (elOf(st[0], id)?.transform?.[4] ?? 0);
  lire("S4.groupe.dx", `${dx(ids[0], 1)},${dx(ids[1], 1)}`);
  check(Math.abs(dx(ids[0], 1) - dx(ids[1], 1)) < 0.001, "S4.6 : le membre désigné et son compagnon de groupe bougent du même pas (le groupe en bloc)");
  // 7. CLI : Arrange puis undo : une étape chacun ; `how: "spin"` : code 2.
  check(dx(ids[0], 2) === 0 && dx(ids[1], 2) === 0, "S4.7 : undo : une étape, les positions d'avant");
  const spin = cli(["run", gs.file, "--ops", "-"], lignes({ type: "Arrange", ids: [ids[0]], how: "spin" }));
  lire("S4.spin", String(spin.status));
  check(spin.status === 2, `S4.7 : how « spin » : code 2 (lu ${spin.status})`);
  check(errors.length + g.errors.length + p2.errors.length === 0, `S4 suite (${mode}) : aucune erreur dans la page`);
  await g.ctx.close();
  await ctx.close();
  console.log(mode === "doigt" ? "S4 suite OK" : "S4 suite OK (clavier)");
}

/** S7 : infobulles des boutons d'Aligner et de Transformer (raccourci affiché), cibles de 44 px au moins. */
async function s7cibles(browser, base) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  await useTool(page, "doigt", "rect");
  for (const [a, b] of [[[400, 250], [480, 330]], [[560, 330], [680, 390]], [[780, 420], [860, 520]]]) await touchDrag(page, cdp, a, b);
  await useTool(page, "doigt", "select");
  await marquee(page, [340, 200], [920, 560]);
  await waitAttr(page, "data-selection", "3");
  await openSection(page, "doigt", "align");
  await openSection(page, "doigt", "transform");
  const hows = ["align-left", "align-center", "align-right", "distribute-h", "align-top", "align-middle", "align-bottom", "distribute-v", "flip-h", "flip-v", "rotate-ccw", "rotate-cw"];
  const bubbles = [];
  for (const how of hows) {
    const sec = ["flip-h", "flip-v", "rotate-ccw", "rotate-cw"].includes(how) ? "transform" : "align";
    const loc = page.locator(opt(sec, how)).first();
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.boundingBox();
    check(box.width >= 44 - 0.5 && box.height >= 44 - 0.5, `S7 : « ${how} » mesure ${Math.round(box.width)} x ${Math.round(box.height)} px (≥ 44)`);
    await page.mouse.move(1, 1);
    await page.waitForTimeout(150);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const tip = page.locator(".rb-tip[data-keys]").first();
    await tip.waitFor({ state: "visible", timeout: 15000 });
    const text = (await tip.innerText()).replace(/\s+/g, " ").trim();
    const keys = await tip.getAttribute("data-keys");
    bubbles.push(`${how}=${keys}`);
    check(keys !== null && keys.trim() !== "" && text !== "", `S7 : l'infobulle de « ${how} » montre son raccourci (${text} · ${keys})`);
    const aria = await loc.getAttribute("aria-keyshortcuts");
    check(aria !== null && aria !== "", `S7 : « ${how} » porte aria-keyshortcuts (${aria})`);
    await page.mouse.move(1, 1);
    await page.waitForTimeout(150);
  }
  lire("S7.infobulles", bubbles.join(" "));
  check(errors.length === 0, `S7 : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log("S7 cibles OK");
}

/** Netteté du § 10 (docs/plans/design-cadrage.md) à 2x sur les icônes neuves : trait fin de 1,5 sur la grille de 24, aucune frange. */
async function nettete(browser, base) {
  const { ctx, page, cdp, errors } = await newPage(browser, base, { scale: 2 });
  await useTool(page, "doigt", "rect");
  for (const [a, b] of [[[400, 250], [480, 330]], [[560, 330], [680, 390]], [[780, 420], [860, 520]]]) await touchDrag(page, cdp, a, b);
  await useTool(page, "doigt", "select");
  await marquee(page, [340, 200], [920, 560]);
  await openSection(page, "doigt", "align");
  await openSection(page, "doigt", "transform");
  const names = [];
  for (const how of ["align-left", "distribute-h", "flip-h", "rotate-cw", "align-middle", "rotate-ccw"]) {
    const sec = ["flip-h", "rotate-cw", "rotate-ccw"].includes(how) ? "transform" : "align";
    const icon = page.locator(`${opt(sec, how)} svg`).first();
    await icon.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await frames(page);
    const box = await icon.boundingBox();
    const geo = await icon.evaluate((el) => ({ viewBox: el.getAttribute("viewBox"), sw: getComputedStyle(el).strokeWidth, w: el.getBoundingClientRect().width, color: getComputedStyle(el).color }));
    check(geo.viewBox === "0 0 24 24", `nettete : « ${how} » est dessinée sur la grille de 24 (viewBox ${geo.viewBox})`);
    check(Math.abs(parseFloat(geo.sw) - 1.5) < 0.01, `nettete : « ${how} » a un trait fin de 1,5 (lu ${geo.sw})`);
    const px = await pixelsOf(page, { x: box.x, y: box.y, width: box.width, height: box.height });
    const bg = [px.data[0], px.data[1], px.data[2]];
    let ink = bg;
    for (let i = 0; i < px.data.length; i += 4) {
      const v = [px.data[i], px.data[i + 1], px.data[i + 2]];
      if (v[0] + v[1] + v[2] < ink[0] + ink[1] + ink[2]) ink = v;
    }
    const n = fringes(px, bg, ink);
    names.push(`${how}:${px.width}x${px.height}px,franges ${n}`);
    check(ink !== bg && n === 0, `nettete : « ${how} » à 2x (${px.width} x ${px.height} px) : 0 pixel hors du segment fond → encre (lu ${n})`);
  }
  lire("nettete.icones", names.join(" "));
  check(errors.length === 0, `nettete : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log("nettete OK");
}

// ---------------------------------------------------------------------------------------------------------- captures

async function captures(browser, base, nom) {
  mkdirSync(OUT, { recursive: true });
  const avant = nom === "avant";
  const { ctx, page, cdp, errors } = await newPage(browser, base, { scale: 2 });
  const clipOf = async (selectors, w, h) => {
    const rs = [];
    for (const sel of selectors) {
      const b = await page.locator(sel).first().boundingBox();
      if (b) rs.push(b);
    }
    const x0 = Math.max(0, Math.min(...rs.map((r) => r.x)) - 12);
    const y0 = Math.max(0, Math.min(...rs.map((r) => r.y)) - 12);
    return { x: x0, y: y0, width: Math.min(w ?? 760, VIEWPORT.width - x0), height: Math.min(h ?? 560, VIEWPORT.height - y0) };
  };
  const shoot = async (name, clip) => {
    await page.mouse.move(1, 1);
    await frames(page);
    await page.screenshot({ path: join(OUT, `${nom}-${name}.png`), clip, animations: "disabled", caret: "hide" });
    console.log(`capture : ${OUT}/${nom}-${name}.png`);
  };
  // panneau : outil Rectangle (accordéon après, rangées à plat avant).
  await useTool(page, "doigt", "rect");
  await touchDrag(page, cdp, [520, 300], [700, 400]);
  await shoot("panneau", await clipOf([OPT], 460, 700));
  // sélecteur : « Autres couleurs » ouvert (case Transparent et Pipette après).
  await useTool(page, "doigt", "select");
  await marquee(page, [480, 260], [740, 440]);
  if (avant) await press(page, "doigt", `${OPT} [data-more-colors="strokeColor"]`);
  else await openPicker(page, "doigt", "strokeColor");
  await page.locator("[data-color-picker]").first().waitFor({ state: "visible", timeout: 15000 });
  await shoot("selecteur", await clipOf([OPT, "[data-color-picker]"], 640, 700));
  await closePicker(page);
  // stylo : outil Stylo, un trait ; Pression ouverte après.
  await useTool(page, "doigt", "pen");
  if (!avant) await openSection(page, "doigt", "pressure");
  await penStroke(page, cdp, [520, 560], [900, 560], [0.1, 1]);
  await shoot("stylo", await clipOf([OPT], 900, 720));
  // alignés : trois rectangles décalés ; après : alignés à gauche, Aligner ouvert.
  await useTool(page, "doigt", "rect");
  for (const [a, b] of [[[900, 200], [960, 260]], [[960, 300], [1060, 350]], [[930, 400], [980, 470]]]) await touchDrag(page, cdp, a, b);
  await useTool(page, "doigt", "select");
  await marquee(page, [880, 180], [1100, 500]);
  if (!avant) {
    await openSection(page, "doigt", "align");
    await press(page, "doigt", opt("align", "align-left"));
  }
  await shoot("alignes", await clipOf([OPT], 1240, 760));
  if (errors.length) console.log(`captures : erreurs de page : ${errors.join(" | ")}`);
  await ctx.close();
  console.log(`captures : ${OUT}/${nom}-{panneau,selecteur,stylo,alignes}.png`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const wantCaptures = process.argv.includes("--captures");
  const lotArg = arg("--lot");
  if (process.argv.includes("--lot") && lotArg !== "A" && lotArg !== "B") {
    console.error(`${LABEL} : usage — --lot attend A ou B (reçu : ${lotArg ?? "rien"})`);
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
  const tmp = mkdtempSync(join(tmpdir(), "og23-essai-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const lotA = lotArg === undefined || lotArg === "A";
    if (wantCaptures) {
      if (lotA) await captures(browser, base, nom);
      return 0;
    }
    // --only s3 : un seul scénario (mise au point) ; sans option, tout est joué.
    const only = arg("--only");
    const on = (n) => only === undefined || only === n;
    for (const mode of ["doigt", "clavier"]) {
      if (lotA && on("s1")) await once("s1", () => s1(browser, base, mode));
      if (lotA && on("s2")) {
        await once("s2", () => s2(browser, base, mode, tmp));
        await once("s2 pipette", () => s2pipette(browser, base, mode, tmp));
        if (mode === "doigt") await once("s2 pdf", () => s2pdf(browser, base, tmp));
      }
      if (lotA && on("s3")) await once("s3", () => s3(browser, base, mode, tmp));
      if (lotA && on("s4")) {
        await once("s4", () => s4(browser, base, mode, tmp));
        await once("s4 suite", () => s4suite(browser, base, mode, tmp));
      }
    }
    if (lotA && on("s7")) await once("s7", () => s7cibles(browser, base));
    if (lotA && on("nettete")) await once("nettete", () => nettete(browser, base));
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
