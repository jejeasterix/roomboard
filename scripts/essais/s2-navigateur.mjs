#!/usr/bin/env node
// Scénario S2 au navigateur (cadrage § 6). Lot 3 (T25) : l'application web construite (apps/web/dist) servie en local,
// Chromium headless de Playwright, souris simulée ; trois traits, gomme au milieu du deuxième, Ctrl+Z, Ctrl+Y,
// Ctrl+Maj+Z, boutons de la barre ; lit le nombre d'éléments (#stage[data-elements]) et les pixels d'encre du canvas
// de scène. Lot 3b (T39) : `--lot3b` rejoue ce parcours quatre fois (réglages par défaut, puis ?echelons=2, 3, 4),
// lit les réglages effectifs (#stage[data-echelons]), vérifie l'encre vive pendant un geste et, au passage par défaut,
// l'outil main, le bouton du milieu, l'espace + glisser et la gomme d'objet. Hors de scripts/verifier.sh : exige
// Playwright (cache npx) et son Chromium. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/s2-navigateur.mjs [--capture docs/essais/s2-lot3-vm.png]
//         node scripts/essais/s2-navigateur.mjs --lot3b [--captures]   (docs/essais/s2-lot3b-<réglage>.png)
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { DIST, Echec, ROOT, VIEWPORT, frames as framesOf, gitSha, inkIn, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

/** Passages du lot 3b : `attendu` lit #stage[data-echelons] (forme `2:off,3:off,4:off`, engine/settings.ts). */
const PASSES = [
  { nom: "defaut", query: "", attendu: (tag) => tag === "2:off,3:off,4:off", extras: true },
  { nom: "2", query: "?echelons=2", attendu: (tag) => tag.startsWith("2:on,"), extras: false },
  { nom: "3", query: "?echelons=3", attendu: (tag) => /,3:(on|absent|refused),/.test(tag), extras: false },
  { nom: "4", query: "?echelons=4", attendu: (tag) => /,4:(on|repli)$/.test(tag), extras: false },
];
/** WebGL2 sous Chromium headless : SwiftShader s'il est permis ; sinon le passage 4 prouve le repli Canvas 2D. */
const LOT3B_ARGS = ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"];

function captureTarget(argv) {
  const i = argv.indexOf("--capture");
  if (i < 0) return null;
  return resolve(ROOT, argv[i + 1] ?? "docs/essais/s2-lot3-vm.png");
}

/** `pass` absent : parcours du lot 3, sortie inchangée. `pass` donné : réglages lus, encre vive, contrôles du lot 3b. */
async function scenario(page, url, { capture = null, pass = null } = {}) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const frames = () => framesOf(page);
  const mouse = stageMouse(page); // gestes en px de la scène (origine = coin de #stage)
  const elements = async () => Number(await page.getAttribute("#stage", "data-elements"));
  const disabled = (action) => page.$eval(item(action), (b) => b.disabled);
  const pressed = (action) => page.getAttribute(item(action), "aria-pressed");
  // Pixels d'encre (somme RVB < 300) dans une boîte en px CSS du canvas de scène.
  const ink = (box) => inkIn(page, box);
  // Pixels d'encre à l'écran (capture composée : scène et canvas d'interaction, Canvas 2D ou WebGL2), décodés dans la page.
  const shotInk = async ([x0, y0, x1, y1]) => {
    const box = await stageBox(page);
    const png = await page.screenshot({ clip: { x: box.x + x0, y: box.y + y0, width: x1 - x0, height: y1 - y0 } });
    return page.evaluate(async (b64) => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = c.getContext("2d");
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 300) n++;
      return n;
    }, png.toString("base64"));
  };
  const drag = async (points) => {
    const [first, ...rest] = points;
    await mouse.move(first[0], first[1]);
    await mouse.down();
    for (const [x, y] of rest) await mouse.move(x, y, { steps: 8 });
    await mouse.up();
    await frames();
  };
  const press = async (keys) => {
    await page.keyboard.press(keys);
    await frames();
  };
  const click = async (action) => {
    await page.click(item(action));
    await frames();
  };

  await page.goto(url);
  try {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  } catch {
    throw new Echec(`l'application ne démarre pas (#stage[data-ready="1"] absent) ${errors.join(" | ")}`);
  }
  await frames();

  if (pass) {
    const tag = await page.getAttribute("#stage", "data-echelons");
    if (tag === null) throw new Echec("#stage[data-echelons] absent : l'application ne dit pas ses réglages");
    check(pass.attendu(tag), `réglages effectifs ${tag}`);
  }

  const MID = [645, 340, 655, 360]; // milieu du deuxième trait (y = 350), sous la gomme
  const REST = [450, 340, 500, 360]; // partie gauche du deuxième trait, loin de la gomme

  check((await elements()) === 0, "page vide au démarrage");
  check(await disabled("undo"), "Annuler désactivé sur un document neuf");
  await press("Control+z");
  check((await elements()) === 0 && (await page.textContent("#etat")) === "", "Ctrl+Z sur un document neuf : rien, aucune erreur");

  for (const y of [250, 350, 450]) await drag([[400, y], [650, y], [900, y]]);
  check((await elements()) === 3, "trois traits tracés à la souris");
  check((await ink(MID)) > 0, "encre visible au milieu du deuxième trait");

  await click("eraser");
  check((await pressed("eraser")) === "true", "gomme choisie dans la barre");
  await drag([[650, 310], [650, 350], [650, 390]]);
  check((await elements()) === 4, "gomme en travers du deuxième trait : il reste quatre traits");
  check((await ink(MID)) === 0, "l'encre a disparu sous la gomme");
  check((await ink(REST)) > 0, "le reste du deuxième trait est toujours là");

  await press("Control+z");
  check((await elements()) === 3, "Ctrl+Z : trois traits");
  check((await ink(MID)) > 0, "Ctrl+Z : l'encre revient");
  await press("Control+y");
  check((await elements()) === 4 && (await ink(MID)) === 0, "Ctrl+Y : quatre traits, encre de nouveau effacée");
  await press("Control+z");
  await press("Control+Shift+z");
  check((await elements()) === 4, "Ctrl+Maj+Z : rétablit aussi");
  await click("undo");
  check((await elements()) === 3, "bouton Annuler");
  await click("redo");
  check((await elements()) === 4, "bouton Rétablir");

  if (!pass) {
    check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
    if (capture) {
      await page.screenshot({ path: capture });
      console.log(`capture : ${capture}`);
    }
    return;
  }

  // Lot 3b : encre vive pendant le geste (canvas d'interaction), rien d'écrit avant le relâché (D38).
  await click("pen");
  await mouse.move(400, 550);
  await mouse.down();
  await mouse.move(900, 550, { steps: 12 });
  await frames();
  check((await elements()) === 4, "pendant le geste : rien d'écrit dans le document (D38)");
  check((await shotInk([640, 540, 660, 560])) > 0, "encre vive visible pendant le geste (canvas d'interaction)");
  await mouse.up();
  await frames();
  check((await elements()) === 5, "relâché : le trait est écrit (cinq traits)");

  if (pass.extras) {
    const LEFT = [300, 440, 390, 460]; // à gauche du troisième trait (x de 400 à 900, y = 450)
    check((await ink(LEFT)) === 0, "vue de départ : rien à gauche du troisième trait");
    await click("hand");
    check((await pressed("hand")) === "true", "outil main choisi dans la barre");
    await drag([[700, 620], [550, 620]]);
    check((await elements()) === 5 && (await ink(LEFT)) > 0, "outil main : la vue suit le glisser, aucun trait");
    await click("pen"); // outil Stylo : sans lui, l'outil Main masquerait une régression T27 (le milieu tracerait)
    await mouse.move(550, 620);
    await mouse.down({ button: "middle" });
    await mouse.move(700, 620, { steps: 8 });
    await mouse.up({ button: "middle" });
    await frames();
    check((await elements()) === 5 && (await ink(LEFT)) === 0, "bouton du milieu : la vue revient, aucun trait");
    await click("pen");
    await page.keyboard.down("Space");
    await drag([[700, 620], [550, 620]]);
    await page.keyboard.up("Space");
    await frames();
    check((await elements()) === 5 && (await ink(LEFT)) > 0, "espace + glisser : la vue suit, aucun trait");
    await click("eraser-mode");
    check((await pressed("eraser-mode")) === "true", "gomme d'objet choisie dans la barre");
    await click("eraser");
    await drag([[500, 210], [500, 250], [500, 290]]); // premier trait (y = 250), vue décalée de 150 px : x de 250 à 750
    check((await elements()) === 4, "gomme d'objet : le premier trait part en entier (5 → 4)");
  }

  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
  if (capture) {
    await page.screenshot({ path: capture });
    console.log(`capture : ${capture}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const sha = gitSha();
  console.log(`sha ${sha}`);
  const lot3b = argv.includes("--lot3b");
  const label = lot3b ? "S2 lot 3b" : "S2 lot 3";
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${label} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(
      `${label} : outil absent — Playwright introuvable (le poser : npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=<chemin de playwright/index.mjs>)`,
    );
    return 2;
  }
  const server = await serve();
  const port = server.address().port;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: lot3b ? LOT3B_ARGS : ["--no-sandbox"] });
    } catch (e) {
      console.error(`${label} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (!lot3b) {
      const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
      await scenario(page, `http://127.0.0.1:${port}/`, { capture: captureTarget(argv) });
      console.log("S2 lot 3 : OK");
      return 0;
    }
    const captures = argv.includes("--captures");
    for (const pass of PASSES) {
      const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        console.log(`— passage ${pass.nom} (${pass.query || "réglages par défaut"})`);
        const capture = captures ? join(ROOT, "docs", "essais", `s2-lot3b-${pass.nom}.png`) : null;
        try {
          await scenario(page, `http://127.0.0.1:${port}/${pass.query}`, { capture, pass });
        } catch (e) {
          if (e instanceof Echec) throw new Echec(`[${pass.nom}] ${e.message}`);
          throw e;
        }
        console.log(`S2 lot 3b [${pass.nom}] : OK`);
      } finally {
        await context.close();
      }
    }
    console.log(`S2 lot 3b : OK (${PASSES.length} passages)`);
    return 0;
  } catch (e) {
    console.error(`${label} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exitCode = await main();
