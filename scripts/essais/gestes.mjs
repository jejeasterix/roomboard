// Gestes et lectures d'état partagés par l'essai OG12 (outils-excalidraw-navigateur.mjs). Recopiés de
// personnalisation-2-navigateur.mjs (OG11) : ce fichier-là lance son main à l'import, il ne se partage pas ; il n'est pas modifié.
// Doigt = événements du protocole (Input.dispatchTouchEvent, pointerType « touch ») ; l'état se lit par `roomboard state`.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { Echec, foldOptions, frames, item, ROOT, stageBox } from "./commun.mjs";

export const URL_QS = "/?fichiers=repli";
export const BIN = join(ROOT, "apps", "cli", "dist", "roomboard.mjs");
export const OPT = "[data-options]";
export const VIEWPORT = { width: 1280, height: 900 };

export async function newPage(browser, base, { scale = 1, query = URL_QS, fold = false, size = VIEWPORT } = {}) {
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
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}${query}`);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  return { ctx, page, cdp, errors, dialogs };
}
export const attr = (page, name) => page.getAttribute("#stage", name);
export async function waitAttr(page, name, v) {
  await page
    .waitForFunction(([n, x]) => document.querySelector("#stage")?.getAttribute(n) === x, [name, v], { timeout: 15000 })
    .catch(async () => {
      throw new Echec(`#stage ${name} attendu « ${v} », lu « ${await attr(page, name)} »`);
    });
  await frames(page);
}
/** Doigt : un contact de bout en bout (touchStart, touchMove interpolés, touchEnd) en px de la scène. `hold` : rend la main
 *  avant le relâché ; l'appelant appelle alors `end()`. */
export async function touchDrag(page, cdp, from, to, { hold = false, steps = 10 } = {}) {
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
export async function marquee(page, from, to) {
  const b = await stageBox(page);
  await page.mouse.move(b.x + from[0], b.y + from[1]);
  await page.mouse.down();
  await page.mouse.move(b.x + (from[0] + to[0]) / 2, b.y + (from[1] + to[1]) / 2, { steps: 4 });
  await page.mouse.move(b.x + to[0], b.y + to[1], { steps: 4 });
  await page.mouse.up();
  await frames(page);
}
export async function tapAt(page, x, y) {
  await page.touchscreen.tap(x, y);
  await frames(page);
}
export async function tapStage(page, x, y) {
  const b = await stageBox(page);
  await tapAt(page, b.x + x, b.y + y);
}
/** Active un bouton : au doigt, un tap sur son centre ; au clavier, le focus puis Entrée (Espace n'active pas les boutons d'IconButton, consigné au rapport). */
export async function press(page, mode, selector) {
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
export const opt = (key, value) => `${OPT} [data-option="${key}"] [data-option-value="${value}"]`;
/** Choix d'une section du panneau : doigt ou clavier. */
export const choose = (page, mode, key, value) => press(page, mode, opt(key, value));
/** Pastille enfoncée ? */
export const pressed = async (page, key, value) => {
  const el = page.locator(opt(key, value)).first();
  return ((await el.getAttribute("aria-pressed")) ?? (await el.getAttribute("aria-checked"))) === "true";
};
export async function useTool(page, mode, id) {
  await press(page, mode, item(id));
}
/** Pixel RGBA (px CSS de la scène) : capture de 1 × 1, décodée dans la page. */
export async function pixelAt(page, x, y) {
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
export async function saved(page, tmp, name) {
  const dl = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const file = join(tmp, name);
  await (await dl).saveAs(file);
  return { file, elements: readState(file) };
}
export function readState(file) {
  const r = spawnSync("node", [BIN, "run", file, "--ops", "-"], { encoding: "utf8", input: `${JSON.stringify({ op: "state" })}\n` });
  if (r.status !== 0) throw new Echec(`roomboard state : code ${r.status} ${r.stderr}`);
  const line = r.stdout.split("\n").filter((l) => l !== "").map((l) => JSON.parse(l)).find((l) => l.state);
  if (!line) throw new Echec(`roomboard state : aucune ligne state (${r.stdout.slice(0, 200)})`);
  return line.state.pages.flatMap((p) => p.elements);
}
export const looks = (els) => els.map((e) => e.look ?? {});

/** Doigt tenu puis second doigt posé après `afterMs` (> 150 ms) pendant le glisser : Maj tactile (n° 29). */
export async function touchDragWithLateFinger(page, cdp, from, to, second, { afterMs = 300, steps = 10 } = {}) {
  const box = await stageBox(page);
  const at = ([x, y], id) => ({ x: Math.round(box.x + x), y: Math.round(box.y + y), id });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(from, 1)] });
  await page.waitForTimeout(afterMs);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [at(from, 1), at(second, 2)] });
  for (let i = 1; i <= steps; i++) {
    const p = [from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [at(p, 1), at(second, 2)] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400);
  await frames(page);
}
/** Double toucher par le protocole (deux contacts à 120 ms), en px de la scène. */
export async function doubleTouch(page, cdp, [x, y]) {
  const box = await stageBox(page);
  const p = { x: Math.round(box.x + x), y: Math.round(box.y + y) };
  for (let k = 0; k < 2; k++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [p] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    if (k === 0) await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);
  await frames(page);
}
