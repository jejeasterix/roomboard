#!/usr/bin/env node
// Essai OG30 au navigateur : reste d'OG27, à 1920 × 1080 et à 1280 × 800.
//   R1 : le contenu de la barre d'outils grandit (rangée ouverte) : la page encore ajustée descend du même écart et
//        l'ascenseur se recale ; le contenu se referme : retour (déjà vu par OG27, la mesure de l'îlot pose `data-compact`).
//   R2 : l'îlot des pages déplacé par la main (il ne suit plus la rangée du haut), le contenu de l'îlot des onglets
//        grandit (onglets sur deux lignes) sans qu'aucun attribut d'îlot ne change : même recalage (rouge avant OG30).
//   R3 : une section du panneau d'options s'ouvre : la page ne bouge pas (le panneau ne réserve pas le haut, T22).
// Un seul observateur de taille, côté `IslandLayer` (`ISLANDS_RESIZED`). Rien de téléchargé.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e, jamais avec --captures.
// Usage : node scripts/essais/restes-og27-navigateur.mjs [--captures [--dist <dossier>] [--nom avant|apres]]
//   --captures : docs/design/captures/restes-og27/<nom>-{portrait,ilot-agrandi}.png (1920 × 1080 à 2x) ;
//   --nom avant (avec --dist, un build de main d'avant OG30) : captures seules, mesures sautées.
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DIST, Echec, ROOT, foldOptions, frames, gitSha, item, loadPlaywright, serve } from "./commun.mjs";

const LABEL = "restes OG27";
const VIEWS = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 800 },
];
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const SIDE = '[data-island="pages"]';
const BAR = '#stage [data-scrollbar="page"]';
const TOOLS_BAR = '.rb-island[data-island="outils"] > .rb-bar';
const TABS_BAR = '.rb-island[data-island="onglets"] > *';
const SIDE_GRIP = `${SIDE} [data-island-grip]`;
const GROW = 40;
const CAPTURES = join(ROOT, "docs", "design", "captures", "restes-og27");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
let current = "";
let oks = 0;
const check = (cond, msg) => {
  if (!cond) throw new Echec(`${current} : ${msg}`);
  oks++;
  console.log(`ok — ${current} ${msg}`);
};

async function settle(page, ms = 0) {
  if (ms > 0) await page.waitForTimeout(ms);
  await frames(page);
  await frames(page);
}
const camera = async (page) => {
  const [zoom, tx, ty] = (await page.getAttribute("#stage", "data-camera")).split(",").map(Number);
  return { zoom, tx, ty };
};
const railTop = (page) => page.evaluate((sel) => document.querySelector(sel)?.getBoundingClientRect().top ?? null, BAR);
const stageTop = (page) => page.evaluate(() => document.querySelector("#stage").getBoundingClientRect().top);

/** Hauteur du contenu `sel` d'un îlot portée à sa hauteur + `dy` (0 : rendue), par son style : aucun attribut d'îlot ne
 *  change (le cas que `watchIslands` seul ne voyait pas). */
async function growContent(page, sel, dy) {
  await page.evaluate(
    ([s, d]) => {
      const inner = document.querySelector(s);
      if (d === 0) inner.style.removeProperty("min-block-size");
      else inner.style.setProperty("min-block-size", `${inner.getBoundingClientRect().height + d}px`);
    },
    [sel, dy],
  );
  await settle(page, 100);
}

async function start(browser, base, viewport, dsf = 1) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await foldOptions(page);
  await page.goto(`${base}/?fichiers=repli`);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
  return { ctx, page, errors };
}
/** Segment Portrait (panneau des pages), « Ajuster la page ». */
async function toPortrait(page) {
  if ((await page.getAttribute(SIDE, "data-collapsed")) === "1") {
    await page.click(`${SIDE} [data-side-tab="pages"]`);
    await page.waitForFunction((s) => document.querySelector(s)?.getAttribute("data-collapsed") !== "1", SIDE, { timeout: 15000 });
    await settle(page, 300);
  }
  await page.click('[data-side-mode] [data-choice="portrait"]');
  await page.waitForFunction(() => document.querySelector("#stage")?.getAttribute("data-page-mode") === "portrait", null, { timeout: 15000 });
  await page.click(item("fit-page"));
  await settle(page);
}

/** Îlot des pages déplacé de 32 px à droite au clavier (L2-10 : flèche droite sur sa poignée, 16 px par pas). */
async function moveSide(page) {
  await page.focus(SIDE_GRIP);
  for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowRight");
  await page.evaluate(() => document.activeElement?.blur());
  await settle(page, 100);
}

/** R1, R2 : contenu de l'îlot `sel` agrandi puis rendu ; page et ascenseur suivent l'écart du haut. */
async function grows(page, sel, name) {
  const c0 = await camera(page);
  const st = await stageTop(page);
  check(Math.abs((await railTop(page)) - (st + c0.ty)) < 1.5, `${name} : ascenseur au haut de la page ajustée (${c0.ty})`);
  await growContent(page, sel, GROW);
  const c1 = await camera(page);
  check(Math.abs(c1.ty - c0.ty - GROW) < 1.5, `${name} agrandi de ${GROW} px sans attribut : page descendue d'autant (${c0.ty} → ${c1.ty})`);
  check(Math.abs(c1.zoom - c0.zoom) < 1e-9, `${name} : zoom gardé`);
  check(Math.abs((await railTop(page)) - (st + c1.ty)) < 1.5, `${name} : ascenseur recalé au haut de la page`);
  await growContent(page, sel, 0);
  const c2 = await camera(page);
  check(Math.abs(c2.ty - c0.ty) < 1.5 && Math.abs((await railTop(page)) - (st + c0.ty)) < 1.5, `${name} rendu : page et ascenseur revenus (${c2.ty})`);
}

/** R3 : panneau d'options déplié, une section ouverte puis fermée : il ne réserve pas le haut, la page ne bouge pas. */
async function optionsStill(page) {
  const c0 = await camera(page);
  await page.click("[data-options-toggle]");
  await settle(page, 200);
  const head = page.locator(".rb-options-sec [aria-expanded]").first();
  await head.click();
  await settle(page, 200);
  await head.click();
  await settle(page, 200);
  const c1 = await camera(page);
  check(c1.ty === c0.ty && c1.zoom === c0.zoom, "R3 section du panneau d'options ouverte puis fermée : page immobile");
}

async function scenario(browser, base, viewport) {
  current = `${viewport.width}×${viewport.height}`;
  const { ctx, page, errors } = await start(browser, base, viewport);
  await toPortrait(page);
  check(await page.isVisible(BAR), "page portrait ajustée : ascenseur visible");
  await grows(page, TOOLS_BAR, "R1 barre d'outils");
  await optionsStill(page);
  await moveSide(page);
  await grows(page, TABS_BAR, "R2 onglets, îlot des pages déplacé");
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` (${errors.join(" | ")})` : ""}`);
  await ctx.close();
}

/** Captures 1920 × 1080 à 2x : page portrait ajustée, îlot des pages déplacé ; même page après l'agrandissement des onglets. */
async function captureSet(browser, base, nom) {
  await mkdir(CAPTURES, { recursive: true });
  const { ctx, page } = await start(browser, base, VIEWS[0], 2);
  const shot = async (v) => {
    await page.mouse.move(5, 600);
    await settle(page, 300);
    const out = join(CAPTURES, `${nom}-${v}.png`);
    await page.screenshot({ path: out });
    console.log(`capture : ${out}`);
  };
  await toPortrait(page);
  await moveSide(page);
  await shot("portrait");
  await growContent(page, TABS_BAR, GROW);
  await shot("ilot-agrandi");
  await ctx.close();
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const captures = process.argv.includes("--captures");
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist}/index.html absent : construire d'abord l'application (scripts/verifier.sh)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ dist });
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (captures) await captureSet(browser, base, nom);
    if (nom === "avant") {
      console.log(`${LABEL} : captures « avant » seules, mesures sautées`);
      return 0;
    }
    for (const v of VIEWS) await scenario(browser, base, v);
    console.log(`${oks} ok`);
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
