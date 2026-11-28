#!/usr/bin/env node
// Essai OG34 (restes d'OG23) au navigateur : panneau de retouche d'image (C5) au design des îlots, sections Média (C14) et
// Objet 3D (C15) du panneau d'options en accordéon. Chaque scénario est joué au doigt (taps tactiles, pointerType
// « touch ») puis au clavier (raccourcis du panneau, focus dedans). Mesures : cibles d'au moins 44 px, une icône Lucide par
// bouton, netteté du § 10 de docs/plans/design-cadrage.md à 2x (0 pixel hors du segment fond → encre).
// Chromium de Playwright, --disable-lcd-text, --force-color-profile=srgb, SwiftShader pour la 3D.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/restes-og23-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/design/captures/restes-og23/<nom>-{image,media,3d}.png (2x) ; --nom avant : captures seules (le build
//   d'avant a les barres flottantes), mesures sautées.
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DIST, Echec, ROOT, VIEWPORT, coqueCsp, dropFile, frames, item, loadPlaywright, rgbPng, serve, stageBox } from "./commun.mjs";
import { fringes, pixelsOf } from "./nettete.mjs";

const LABEL = "restes-og23";
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--autoplay-policy=no-user-gesture-required"];
const OUT = join(ROOT, "docs", "design", "captures", "restes-og23");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const NOM = arg("--nom") ?? "apres";
const AVANT = NOM === "avant";
const CAPTURES = process.argv.includes("--captures");
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};

/** GLB 2.0 d'un cube à faces de couleurs franches, comme c15-3d-navigateur.mjs (`glb`, `cubeGlb`). */
function cubeGlb() {
  const faces = [
    { n: [0, 0, 1], c: [1, 0, 0], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], c: [0, 1, 0], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { n: [1, 0, 0], c: [0, 0, 1], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { n: [-1, 0, 0], c: [1, 1, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
    { n: [0, 1, 0], c: [1, 0, 1], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
    { n: [0, -1, 0], c: [0, 1, 1], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  ];
  const f32 = (a) => Buffer.from(new Float32Array(a).buffer);
  const bin = Buffer.concat([
    f32(faces.flatMap((f) => f.v.flat())),
    f32(faces.flatMap((f) => f.v.flatMap(() => f.n))),
    f32(faces.flatMap((f) => f.v.flatMap(() => f.c))),
    Buffer.from(new Uint16Array(faces.flatMap((_, i) => [0, 1, 2, 0, 2, 3].map((k) => 4 * i + k))).buffer),
  ]);
  const json = Buffer.from(JSON.stringify({
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3 }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [[0, 288], [288, 288], [576, 288], [864, 72]].map(([o, l]) => ({ buffer: 0, byteOffset: o, byteLength: l })),
    accessors: [
      { bufferView: 0, componentType: 5126, count: 24, type: "VEC3", min: [-1, -1, -1], max: [1, 1, 1] },
      { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 24, type: "VEC3" },
      { bufferView: 3, componentType: 5123, count: 36, type: "SCALAR" },
    ],
  }));
  const jl = Math.ceil(json.length / 4) * 4;
  const bl = Math.ceil(bin.length / 4) * 4;
  const out = Buffer.alloc(28 + jl + bl);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jl, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  json.copy(out, 20);
  out.fill(0x20, 20 + json.length, 20 + jl);
  out.writeUInt32LE(bl, 20 + jl);
  out.writeUInt32LE(0x004e4942, 24 + jl);
  bin.copy(out, 28 + jl);
  return out;
}

/** Vidéo WebM de `seconds` s, enregistrée dans la page (MediaRecorder), comme c14-media-navigateur.mjs. */
async function makeWebm(ctx, seconds) {
  const p = await ctx.newPage();
  try {
    await p.goto("about:blank");
    const data = await p.evaluate((s) => new Promise((ok, ko) => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 180;
      const g = c.getContext("2d");
      g.fillStyle = "#3b82f6";
      g.fillRect(0, 0, 320, 180);
      const rec = new MediaRecorder(c.captureStream(30), { mimeType: "video/webm;codecs=vp8" });
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onerror = () => ko(new Error("MediaRecorder en erreur"));
      rec.onstop = async () => ok(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));
      const t = setInterval(() => g.fillRect(0, 0, 320, 180), 100);
      rec.start(100);
      setTimeout(() => {
        clearInterval(t);
        rec.stop();
      }, s * 1000);
    }), seconds);
    return Buffer.from(data);
  } finally {
    await p.close();
  }
}

async function newPage(browser, base) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("WebGL")) errors.push(m.text());
  });
  page.on("dialog", (d) => void d.accept());
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}/?fichiers=repli`);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  return { ctx, page, cdp, errors };
}
const attr = (page, name) => page.getAttribute("#stage", name);
async function until(fn, msg, ms = 15000) {
  const end = Date.now() + ms;
  for (;;) {
    if (await fn().catch(() => false)) return;
    if (Date.now() > end) throw new Echec(`${msg} (délai)`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
/** Doigt : tap au centre d'un élément de la page. */
async function tap(page, sel) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  if (b === null) throw new Echec(`${sel} : absent ou caché`);
  await page.touchscreen.tap(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
  await frames(page);
}
/** Doigt : tap sur la scène (px de la scène), par le protocole (pointerType « touch »). */
async function tapStage(page, cdp, [x, y]) {
  const box = await stageBox(page);
  const p = { x: Math.round(box.x + x), y: Math.round(box.y + y) };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [p] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400); // un tap qui suit tout de suite un contact du protocole est perdu
  await frames(page);
}
/** Cibles d'au moins 44 px et une icône par bouton, dans `root`. */
async function targets(page, root, what) {
  const r = await page.$$eval(`${root} button, ${root} select, ${root} input[type="range"]`, (els) => els.map((e) => {
    const b = e.getBoundingClientRect();
    return { id: e.getAttribute("data-image-action") ?? e.getAttribute("data-image-input") ?? e.getAttribute("data-media") ?? e.getAttribute("data-model3d") ?? e.getAttribute("data-option-head") ?? e.tagName, w: b.width, h: b.height, tag: e.tagName, icon: e.querySelector("svg[data-icon]") !== null };
  }));
  const small = r.filter((t) => t.h < 44 || (t.tag === "BUTTON" && t.w < 44));
  check(r.length > 0 && small.length === 0, `${what} : ${r.length} cibles, toutes d'au moins 44 px${small.length ? ` (trop petites : ${small.map((t) => `${t.id} ${t.w}x${t.h}`).join(", ")})` : ""}`);
  const bare = r.filter((t) => t.tag === "BUTTON" && !t.icon);
  check(bare.length === 0, `${what} : chaque bouton porte une icône${bare.length ? ` (sans : ${bare.map((t) => t.id).join(", ")})` : ""}`);
}
/** Netteté du § 10 : l'icône (svg) du bouton `sel` à 2x n'a aucun pixel hors du segment fond → encre. */
async function sharp(page, sel, what) {
  const icon = page.locator(`${sel} svg`).first();
  await icon.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await frames(page);
  const geo = await icon.evaluate((el) => ({ viewBox: el.getAttribute("viewBox"), sw: getComputedStyle(el).strokeWidth }));
  check(geo.viewBox === "-0.25 -0.25 24 24" && Math.abs(parseFloat(geo.sw) - 1.5) < 0.01, `nettete : ${what} sur la grille de 24 calée, trait de 1,5 (${geo.viewBox}, ${geo.sw})`);
  const b = await icon.boundingBox();
  const px = await pixelsOf(page, { x: b.x, y: b.y, width: b.width, height: b.height });
  const bg = [px.data[0], px.data[1], px.data[2]];
  let ink = bg;
  for (let i = 0; i < px.data.length; i += 4) {
    const v = [px.data[i], px.data[i + 1], px.data[i + 2]];
    if (v[0] + v[1] + v[2] < ink[0] + ink[1] + ink[2]) ink = v;
  }
  const n = fringes(px, bg, ink);
  check(ink !== bg && n === 0, `nettete : ${what} à 2x (${px.width} x ${px.height} px) : 0 pixel hors du segment fond → encre (lu ${n})`);
}
async function capture(page, sel, name) {
  if (!CAPTURES) return;
  mkdirSync(OUT, { recursive: true });
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await frames(page);
  await el.screenshot({ path: join(OUT, `${NOM}-${name}.png`), animations: "disabled", caret: "hide", scale: "device" });
  console.log(`capture : docs/design/captures/restes-og23/${NOM}-${name}.png`);
}
async function select(page, cdp, at, attrName) {
  await tap(page, item("select"));
  await tapStage(page, cdp, at);
  await until(async () => ((await attr(page, attrName)) ?? "") !== "", `${attrName} : objet sélectionné au doigt`);
}

// ------------------------------------------------------------------------------------------------------ S1 : image
async function s1image(browser, base) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  const png = rgbPng(200, 150, (x, y) => (Math.hypot(x - 100, y - 75) < 50 ? [220, 38, 38] : [255, 255, 255]));
  // À droite du panneau d'options : un tap à sa place toucherait le panneau qui apparaît sous le doigt (clic fantôme).
  await dropFile(page, "#stage", "anneau.png", png, "image/png", [700, 300]);
  await until(async () => (await attr(page, "data-elements")) === "1", "S1 : image déposée");
  await select(page, cdp, [700, 300], "data-image");
  check((await page.locator("#image-retouche").count()) === 0, "S1 : image sélectionnée au doigt, panneau de retouche encore fermé");
  await tap(page, '[data-image-action="panel-retouch"]');
  await page.locator("#image-retouche").waitFor({ state: "visible", timeout: 15000 });
  await capture(page, '.rb-popover[data-panel="image"]', "image");
  if (!AVANT) {
    const P = "#image-retouche";
    check((await page.textContent(`${P} h2`)) === "Retouche de l'image", "S1 : en-tête « Retouche de l'image »");
    await targets(page, P, "S1 panneau d'image");
    const dims = await attr(page, "data-image");
    const v0 = Number(await attr(page, "data-version"));
    await tap(page, '[data-image-action="turn-right"]');
    await until(async () => Number(await attr(page, "data-version")) === v0 + 1, "S1 doigt : « Tourner à droite » : une étape");
    check((await attr(page, "data-image")) !== dims || dims === null, `S1 doigt : l'image tournée (${dims} → ${await attr(page, "data-image")})`);
    // Clavier : focus dans le panneau, I arme la pipette, I la désarme, Ctrl+Entrée valide les réglages.
    await page.focus('[data-image-input="brightness"]');
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("i");
    await until(async () => (await page.getAttribute('[data-image-action="pick"]', "aria-pressed")) === "true", "S1 clavier : I arme la pipette");
    await page.focus('[data-image-input="brightness"]');
    await page.keyboard.press("i");
    await until(async () => (await page.getAttribute('[data-image-action="pick"]', "aria-pressed")) === "false", "S1 clavier : I désarme la pipette");
    const v1 = Number(await attr(page, "data-version"));
    await page.keyboard.press("Control+Enter");
    await until(async () => Number(await attr(page, "data-version")) === v1 + 1, "S1 clavier : Ctrl+Entrée valide la luminosité (une étape)");
    // Clavier : rognage armé au doigt, Ctrl+Entrée le valide.
    await tap(page, '[data-image-action="crop"]');
    await page.locator('[data-image-action="crop-apply"]').waitFor({ state: "visible", timeout: 15000 });
    await targets(page, P, "S1 rognage");
    await page.focus('[data-image-action="crop-apply"]');
    await page.keyboard.press("Control+Enter");
    await page.locator('[data-image-action="crop"]').waitFor({ state: "visible", timeout: 15000 });
    check(true, "S1 clavier : Ctrl+Entrée valide le rognage");
    await sharp(page, '[data-image-action="crop"]', "« Rogner »");
    await sharp(page, '[data-image-action="flip-h"]', "« Retourner horizontalement »");
    await sharp(page, '[data-image-action="close"]', "« Fermer »");
  }
  check(errors.length === 0, `S1 : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log("S1 image OK");
}

// ------------------------------------------------------------------------------------------------------ S2 : média
async function s2media(browser, base) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  const webm = await makeWebm(ctx, 2.4);
  await dropFile(page, "#stage", "essai.webm", webm, "video/webm", [600, 250]);
  await until(async () => (await attr(page, "data-elements")) === "1", "S2 : vidéo déposée");
  await select(page, cdp, [660, 290], "data-media");
  await page.locator("[data-media-bar]").waitFor({ state: "visible", timeout: 15000 });
  if (AVANT) await capture(page, ".rb-media-bar", "media");
  else {
    const S = '[data-options] [data-option="media"]';
    check((await page.locator(`${S} [data-media-bar]`).count()) === 1 && (await page.locator(".rb-media-bar").count()) === 0, "S2 : commandes du média dans la section Média du panneau d'options, plus de barre flottante");
    check((await page.getAttribute(`${S} [data-option-head="media"]`, "aria-expanded")) === "true", "S2 : section Média ouverte par défaut");
    check((await stageBox(page, 640)).height >= 640, "S2 : la scène garde 640 px");
    await capture(page, "[data-options]", "media");
    await targets(page, S, "S2 section Média");
    const state = async () => ((await attr(page, "data-media")) ?? "").split(";")[1];
    await tap(page, '[data-media="toggle"]');
    await until(async () => (await state()) === "lecture", "S2 doigt : Lecture : data-media « lecture »");
    await page.focus('[data-media="position"]');
    await page.keyboard.press("k");
    await until(async () => (await state()) === "pause", "S2 clavier : K met en pause");
    await page.keyboard.press("b");
    await until(async () => (await page.getAttribute('[data-media="loop"]', "aria-pressed")) === "true", "S2 clavier : B active la boucle");
    await tap(page, '[data-media="loop"]');
    await until(async () => (await page.getAttribute('[data-media="loop"]', "aria-pressed")) === "false", "S2 doigt : Boucle désactivée");
    await tap(page, '[data-option-head="media"]');
    check((await page.getAttribute(`${S} [data-option-head="media"]`, "aria-expanded")) === "false", "S2 doigt : l'en-tête replie la section Média");
    await tap(page, '[data-option-head="media"]');
    await sharp(page, '[data-media="loop"]', "« Boucle »");
    await sharp(page, '[data-media="keep"]', "« Tout garder »");
  }
  check(errors.length === 0, `S2 : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log("S2 média OK");
}

// ------------------------------------------------------------------------------------------------------ S3 : objet 3D
async function s3model(browser, base) {
  const { ctx, page, cdp, errors } = await newPage(browser, base);
  await dropFile(page, "#stage", "cube.glb", cubeGlb(), "model/gltf-binary", [700, 300]);
  await until(async () => (await attr(page, "data-elements")) === "1", "S3 : GLB déposé", 30000);
  await select(page, cdp, [700, 300], "data-model3d");
  await page.locator("[data-model3d-bar]").waitFor({ state: "visible", timeout: 15000 });
  if (AVANT) await capture(page, ".rb-media-bar", "3d");
  else {
    const S = '[data-options] [data-option="model3d"]';
    check((await page.locator(`${S} [data-model3d-bar]`).count()) === 1, "S3 : commandes de l'objet 3D dans la section Objet 3D du panneau d'options");
    check((await page.getAttribute(`${S} [data-option-head="model3d"]`, "aria-expanded")) === "true", "S3 : section Objet 3D ouverte par défaut");
    await capture(page, "[data-options]", "3d");
    await targets(page, S, "S3 section Objet 3D");
    const orbit = async () => page.getAttribute('[data-model3d="orbit"]', "aria-pressed");
    await until(async () => !(await page.locator('[data-model3d="orbit"]').isDisabled()), "S3 : « Tourner » actif", 30000);
    await tap(page, '[data-model3d="orbit"]');
    await until(async () => (await orbit()) === "true", "S3 doigt : « Tourner » : orbite", 30000);
    await page.focus('[data-model3d="orbit"]');
    await page.keyboard.press("t");
    await until(async () => (await orbit()) === "false", "S3 clavier : T arrête l'orbite", 30000);
    await sharp(page, '[data-model3d="reset"]', "« Vue initiale »");
  }
  check(errors.length === 0, `S3 : aucune erreur dans la page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  await ctx.close();
  console.log("S3 objet 3D OK");
}

async function main() {
  const dist = resolve(arg("--dist") ?? DIST);
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist} sans index.html : lancer d'abord scripts/verifier.sh`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() }, dist });
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    // Un délai dépassé est rejoué une fois avant d'être jugé.
    const once = async (name, fn) => {
      try {
        await fn();
      } catch (e) {
        if (!(e instanceof Echec) || !e.message.includes("(délai")) throw e;
        console.log(`${name} : délai dépassé, rejoué une fois (${e.message})`);
        await fn();
      }
    };
    await once("S1", () => s1image(browser, base));
    await once("S2", () => s2media(browser, base));
    await once("S3", () => s3model(browser, base));
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exitCode = await main();
