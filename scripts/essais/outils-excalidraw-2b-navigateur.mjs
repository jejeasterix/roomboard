#!/usr/bin/env node
// Essai OG33 (personnalisation-2-outils, lot 2b) au navigateur : M1 (rangée « Formes », lettre dans l'infobulle), puis
// M2 à M4 au fil des tâches suivantes. Au doigt d'abord (événements du protocole, pointerType « touch »). L'état du
// document est lu dans le fichier enregistré (Ctrl+S) par `roomboard state`. Chromium de Playwright, --disable-lcd-text,
// --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e.
// Usage : node scripts/essais/outils-excalidraw-2b-navigateur.mjs [--only m1|m2|m3|m4] [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/design/captures/personnalisation-2-outils/<nom>-*.png à 2x (« avant » : base du morceau ; « apres »).
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DIST, Echec, frames, gitSha, item, loadPlaywright, ROOT, serve, VIEWPORT } from "./commun.mjs";
import { BIN, newPage, saved, tapAt, touchDrag, useTool, waitAttr } from "./gestes.mjs";
import { fringes, pixelsOf } from "./nettete.mjs";

const LABEL = "outils-excalidraw-2b";
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const OUT = join(ROOT, "docs", "design", "captures", "personnalisation-2-outils");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};
/** Ligne de lecture imprimée (preuve) : `Lire : <clé>=<valeur>`. */
const lire = (key, value) => console.log(`Lire : ${key}=${value}`);

// ------------------------------------------------------------------------------------------------------------- aides

/** Outil par la barre : au doigt, un tap sur le bouton, après une pause (un tap qui suit un tracé du protocole est perdu). */
async function tool(page, id) {
  await page.waitForTimeout(600);
  await useTool(page, "doigt", id);
  await waitAttr(page, "data-tool", id);
}
const rgbOf = (s) => (s.match(/\d+/g) ?? [0, 0, 0]).slice(0, 3).map(Number);
async function colorsOf(page, sel) {
  return page.evaluate((q) => {
    const b = document.querySelector(q);
    const svg = b.querySelector("svg") ?? b;
    return { bg: getComputedStyle(b).backgroundColor, ink: getComputedStyle(svg).color };
  }, sel);
}
async function shoot(page, nom, clip) {
  mkdirSync(OUT, { recursive: true });
  await frames(page);
  await page.screenshot({ path: join(OUT, `${nom}.png`), clip, animations: "disabled", caret: "hide", scale: "device" });
  console.log(`capture : ${join(OUT, `${nom}.png`)}`);
}
const loin = (page) => page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);

// ------------------------------------------------------------------------------------------------------------- M1

/** M1 (S10) : Losange par la rangée « Formes » au doigt ; lettre dans l'infobulle ; barre inchangée. */
async function m1(browser, base, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base, { scale: 2 });
  // `.rb-context` est en `position: absolute` (rb.css:143) : la hauteur de la barre ne bouge jamais ; on lit sa place
  // (y, largeur) avant et après, et le bord droit de l'îlot contextuel (dans la fenêtre de 1280 px).
  const bar = async () => {
    const b = await page.locator('[data-toolbar="outils"]').first().boundingBox();
    return `${Math.round(b.y)}:${Math.round(b.width)}`;
  };
  const h0 = await bar();
  await tool(page, "rect");
  const row = await page.$$eval("[data-shape-choice]", (bs) => bs.map((b) => b.getAttribute("data-shape-choice")).join(","));
  lire("M1.row", row);
  check(row === "rect,diamond,ellipse", "M1 : Rectangle touché : la rangée Formes montre les trois formes");
  const bb = await page.locator("[data-shape-choice='diamond']").boundingBox();
  lire("M1.cible", `${Math.round(bb.width)}x${Math.round(bb.height)}`);
  check(bb.width >= 43.5 && bb.height >= 43.5, "M1 : cible Losange ≥ 44 px");
  const h1 = await bar();
  lire("M1.barre", `${h0}/${h1}`);
  check(h0 === h1, "M1 : la barre d'outils garde sa place et sa largeur (même rangée à 1280 px)");
  const isle = await page.locator('[data-toolbar="outils"] [data-island-context]').first().boundingBox();
  lire("M1.ilot", Math.round(isle.x + isle.width));
  check(isle.x + isle.width <= VIEWPORT.width, "M1 : l'îlot de la rangée Formes tient dans la fenêtre de 1280 px");
  await tapAt(page, bb.x + bb.width / 2, bb.y + bb.height / 2);
  await waitAttr(page, "data-tool", "diamond");
  lire("M1.tool", "diamond");
  await touchDrag(page, cdp, [500, 300], [620, 400]);
  const s = await saved(page, tmp, "m1.roomboard");
  const n = s.elements.filter((e) => e.shape?.shape === "diamond").length;
  lire("M1.diamond", n);
  check(n === 1, "M1 : un losange posé au doigt depuis la rangée");
  // Netteté de l'icône de la rangée (§ 10), même mesure que `cibles2a` d'outils-excalidraw-navigateur.mjs.
  const sel = "[data-shape-choice='diamond']";
  await loin(page);
  await frames(page);
  const box = await page.locator(`${sel} svg.rb-icon`).first().boundingBox();
  const px = await pixelsOf(page, box);
  const { ink } = await colorsOf(page, sel);
  const f = fringes(px, [px.data[0], px.data[1], px.data[2]], rgbOf(ink));
  lire("M1.nettete", f);
  check(f === 0, "M1 : icône Losange nette (§ 10), 0 frange colorée");
  await page.hover(item("rect"));
  const tip = page.locator('[role="tooltip"]');
  await tip.waitFor({ state: "visible", timeout: 5000 });
  const keys = await tip.getAttribute("data-keys");
  lire("M1.tip", keys);
  check(keys === "R ou 2", "M1 : infobulle de Rectangle : « R ou 2 »");
  check(errors.length === 0, "M1 : aucune erreur dans la page");
  await ctx.close();
}

/** Captures M1 à 2x : Rectangle actif ; « apres » : rangée, Losange enfoncé, puis infobulle de Rectangle. */
async function capturesM1(browser, base, nom) {
  const CLIP = { x: 0, y: 0, width: 1280, height: 200 };
  const { ctx, page } = await newPage(browser, base, { scale: 2 });
  await tool(page, "rect");
  if (nom === "apres") {
    const bb = await page.locator("[data-shape-choice='diamond']").boundingBox();
    await tapAt(page, bb.x + bb.width / 2, bb.y + bb.height / 2);
    await waitAttr(page, "data-tool", "diamond");
  }
  await loin(page);
  await shoot(page, `${nom}-formes`, CLIP);
  if (nom === "apres") {
    await page.hover(item("rect"));
    await page.locator('[role="tooltip"]').waitFor({ state: "visible", timeout: 5000 });
    await shoot(page, "apres-formes-infobulle", CLIP);
  }
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------------------- main

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
  const tmp = mkdtempSync(join(tmpdir(), "og33-essai-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (wantCaptures) {
      await capturesM1(browser, base, nom);
      return 0;
    }
    const only = arg("--only");
    const on = (n) => only === undefined || only === n;
    if (on("m1")) await m1(browser, base, tmp);
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
