#!/usr/bin/env node
// OG41 L1 : une seule gomme (cadrage docs/plans/gomme-et-barre-objet-cadrage.md, § 6, S1 à S4). Application construite
// servie en local, Chromium sans tête, `deviceScaleFactor` 2. Objets posés à la souris (outils de la barre, dépôt d'image) ;
// la gomme au doigt (protocole CDP), au stylet retourné et à la paume (PointerEvent synthétiques, comme gomme-paume).
// Genres lus par `roomboard state` (gestes.mjs, `saved`). `--captures <dossier>` : captures 2x. `--avant` : même parcours
// sur `main`, contrôles imprimés sans arrêter l'essai (captures « avant »).
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/gomme-objets-navigateur.mjs [--dist <build>] [--captures <dossier>] [--avant]
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Echec, clickItem, dropFile, frames, item, loadPlaywright, serve, solidPng, stageBox, stageMouse } from "./commun.mjs";
import { newPage, pixelAt, saved, touchDrag } from "./gestes.mjs";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
};
const dist = opt("--dist");
const captures = opt("--captures");
const avant = argv.includes("--avant");
const COL = 240; // TABLE_COL_WIDTH (apps/web/src/engine/table-geom.ts:15)
const ROW = 64; // TABLE_ROW_HEIGHT

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright absent (cache npx)");
  process.exit(2);
}
if (captures) mkdirSync(captures, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "og41-l1-"));
const server = await serve(dist ? { dist } : {});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ args: ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"] });
let failed = false;
const check = (cond, msg) => {
  if (avant) return void console.log(`avant — ${msg} : ${cond ? "oui" : "non"}`);
  if (!cond) throw new Echec(`échec — ${msg}`);
  console.log(`ok — ${msg}`);
};
const lire = (label, v) => console.log(`lu — ${label}=${v}`);

async function scenario(name, run) {
  const s = await newPage(browser, base, { scale: 2, fold: true });
  try {
    await run(s);
    check(s.errors.length === 0, `${name} : aucune erreur dans la page${s.errors.length ? ` (${s.errors.join(" | ")})` : ""}`);
  } finally {
    await s.ctx.close();
  }
}
const tools = (page) => ({
  elements: async () => {
    await frames(page);
    return Number(await page.getAttribute("#stage", "data-elements"));
  },
  drag: async (pts) => {
    const m = stageMouse(page);
    await m.move(...pts[0]);
    await m.down();
    for (const p of pts.slice(1)) await m.move(p[0], p[1], { steps: 8 });
    await m.up();
    await frames(page);
  },
  kinds: async (name) => {
    const { elements } = await saved(page, tmp, `${name}.roomboard`);
    const k = elements.map((e) => e.kind).sort().join(",");
    lire(`${name} genres`, k);
    return elements;
  },
  shot: async (name, sel) => {
    if (!captures) return;
    const path = join(captures, name);
    const clip = sel && (await page.locator(sel).count()) > 0 ? await page.locator(sel).first().boundingBox() : null;
    await page.screenshot({ path, ...(clip ? { clip } : {}), animations: "disabled", caret: "hide", scale: "device" });
    console.log(`capture : ${path}`);
  },
});

try {
  // S1 — une seule gomme ; trait coupé ; Ctrl+Z, Ctrl+Y.
  await scenario("S1", async ({ page, cdp }) => {
    const t = tools(page);
    const erasers = await page.locator(item("eraser")).count();
    const modes = await page.locator(item("eraser-mode")).count();
    lire("boutons eraser / eraser-mode", `${erasers} / ${modes}`);
    check(erasers === 1 && modes === 0, "S1 : la barre ne montre qu'une gomme");
    await t.shot("l1-barre-une-gomme.png", '[data-island="outils"]');
    await clickItem(page, "pen");
    await t.drag([[300, 400], [800, 400]]);
    lire("data-elements avant la gomme", await t.elements());
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [550, 330], [550, 470], { steps: 14 });
    lire("data-elements après la gomme", await t.elements());
    check((await t.elements()) === 2, "S1 : un trait coupé en deux morceaux (1 → 2)");
    await t.shot("l1-trait-coupe.png");
    await page.keyboard.press("Control+z");
    check((await t.elements()) === 1, "S1 : Ctrl+Z une fois : un seul trait");
    await page.keyboard.press("Control+y");
    check((await t.elements()) === 2, "S1 : Ctrl+Y : deux morceaux");
  });

  // S2 — objets entiers en un passage, une étape ; contre-épreuves.
  await scenario("S2", async ({ page, cdp }) => {
    const t = tools(page);
    await clickItem(page, "rect");
    await t.drag([[200, 220], [320, 320]]);
    await dropFile(page, "#stage", "bleu.png", solidPng(120, 90, [29, 78, 216]), "image/png", [480, 270]);
    await frames(page);
    await clickItem(page, "text");
    await stageMouse(page).click(620, 250);
    await page.keyboard.type("Bonjour");
    await page.keyboard.press("Escape");
    await clickItem(page, "arrow");
    await t.drag([[760, 270], [880, 270]]);
    await clickItem(page, "pen");
    await t.drag([[960, 180], [960, 360]]);
    const n0 = await t.elements();
    lire("data-elements avant la gomme", n0);
    // Témoins hors du chemin de la gomme (y 258-282, que la traînée repeint) : bord gauche du rectangle, un pixel bleu de l'image.
    const dark = (px) => px[0] + px[1] + px[2] < 300;
    const blue = (px) => px[2] > 150 && px[0] < 80;
    const edge = [200, 235];
    let pic = null;
    for (const c of [[470, 250], [500, 248], [470, 290], [520, 295], [470, 300], [470, 310], [470, 240]]) if (blue(await pixelAt(page, ...c))) { pic = c; break; }
    lire("témoins", `bord ${dark(await pixelAt(page, ...edge))}, image ${pic}`);
    await clickItem(page, "eraser");
    const end = await touchDrag(page, cdp, [150, 270], [1000, 270], { steps: 40, hold: true });
    const edgeGone = !dark(await pixelAt(page, ...edge));
    const picGone = pic !== null && !blue(await pixelAt(page, ...pic));
    lire("pendant le geste", `bord effacé ${edgeGone}, image effacée ${picGone}`);
    check(edgeGone && picGone, "S2 : pendant le geste, la forme et l'image disparaissent de l'écran (D6)");
    await t.shot("l1-forme-effacee-avant-relache.png");
    await end();
    const n1 = await t.elements();
    lire("data-elements après la gomme", n1);
    check(n0 === 5 && n1 === 2, `S2 : forme, image, texte, flèche effacés, le trait coupé (5 → 2 ; lu ${n0} → ${n1})`);
    await t.shot("l1-forme-effacee.png");
    await page.keyboard.press("Control+z");
    check((await t.elements()) === 5, "S2 : un seul Ctrl+Z rend les quatre objets et le trait entier");
  });

  await scenario("S2 contre-épreuves", async ({ page, cdp }) => {
    const t = tools(page);
    // Trait posé sur une image, gommé le long du trait : l'image reste.
    await dropFile(page, "#stage", "vert.png", solidPng(200, 120, [22, 163, 74]), "image/png", [600, 400]);
    await frames(page);
    await clickItem(page, "pen");
    await t.drag([[500, 400], [700, 400]]);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [570, 400], [630, 400], { steps: 8 });
    const a = await t.kinds("s2-trait-sur-image");
    check(a.filter((e) => e.kind === "image").length === 1 && a.filter((e) => e.kind === "stroke").length === 2, "S2 : trait sur une image, gommé sur le trait : l'image reste, le trait est coupé");
    // Image sur image : un plan par passage.
    await dropFile(page, "#stage", "rouge.png", solidPng(200, 120, [220, 38, 38]), "image/png", [600, 400]);
    await frames(page);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [470, 430], [730, 430], { steps: 20 });
    const b = await t.kinds("s2-image-sur-image");
    check(b.filter((e) => e.kind === "image").length === 1, "S2 : deux images superposées : seule celle du dessus part");
    await touchDrag(page, cdp, [470, 430], [730, 430], { steps: 20 });
    const c = await t.kinds("s2-second-passage");
    check(c.filter((e) => e.kind === "image").length === 0, "S2 : un second passage efface l'autre");
  });

  await scenario("S2 pot et forme vide", async ({ page, cdp }) => {
    const t = tools(page);
    // Trois traits fermés (triangle, sommets qui se chevauchent), remplis au pot ; un passage croise deux côtés et l'intérieur.
    await clickItem(page, "pen");
    await t.drag([[290, 450], [510, 450]]);
    await t.drag([[495, 460], [395, 270]]);
    await t.drag([[405, 270], [305, 460]]);
    await clickItem(page, "fill");
    await stageMouse(page).click(400, 400);
    await frames(page);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [300, 400], [500, 400], { steps: 24 });
    const p = await t.kinds("s2-pot");
    check(p.some((e) => e.kind === "fill"), "S2 : le remplissage du pot reste (D30)");
    check(p.filter((e) => e.kind === "stroke").length >= 5, "S2 : les deux côtés traversés sont coupés (3 traits → 5 morceaux au moins)");
    await clickItem(page, "rect");
    await t.drag([[700, 300], [1000, 450]]);
    await clickItem(page, "pen");
    await t.drag([[770, 375], [930, 375]]);
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, [810, 375], [890, 375], { steps: 8 });
    const f = await t.kinds("s2-forme-vide");
    check(f.some((e) => e.kind === "shape"), "S2 : un rectangle sans fond autour du trait gommé reste (D31)");
    await touchDrag(page, cdp, [750, 330], [950, 330], { steps: 16 }); // intérieur, à 30 px du bord haut et du trait
    const g = await t.kinds("s2-interieur");
    check(g.some((e) => e.kind === "shape"), "S2 : un passage dans l'intérieur vide, loin du bord : le rectangle reste (D31)");
  });

  // S3 — tableau épargné, contenu traité ; « Supprimer le tableau » ; Suppr.
  await scenario("S3", async ({ page, cdp }) => {
    const t = tools(page);
    const box = await stageBox(page);
    const cam = (await page.getAttribute("#stage", "data-camera")).split(",").map(Number);
    const sc = (wx, wy) => [wx * cam[0] + cam[1], wy * cam[0] + cam[2]];
    const ORIGIN = [200, 200];
    const o = [(ORIGIN[0] - cam[1]) / cam[0], (ORIGIN[1] - cam[2]) / cam[0]];
    const cell = (r, c) => sc(o[0] + COL * c + COL / 2, o[1] + ROW * r + ROW / 2);
    await clickItem(page, "table");
    await stageMouse(page).click(...ORIGIN);
    await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
    await page.click('button[aria-label="3 colonnes, 3 lignes"]');
    await page.keyboard.press("Escape");
    await frames(page);
    await stageMouse(page).click(...cell(0, 0)); // patron personnalisation-3-tableau-navigateur.mjs:390
    await page.keyboard.type("Lundi");
    await page.keyboard.press("Escape");
    await frames(page);
    await clickItem(page, "select");
    await dropFile(page, "#stage", "photo.png", solidPng(60, 40, [90, 60, 30]), "image/png", [900, 600]);
    await frames(page);
    await touchDrag(page, cdp, [900, 600], cell(1, 1));
    await page.keyboard.press("Escape");
    await clickItem(page, "pen");
    await t.drag([cell(2, 2).map((v, i) => v - (i === 0 ? 40 : 0)), cell(2, 2).map((v, i) => v + (i === 0 ? 40 : 0))]);
    await t.kinds("s3-avant-gomme");
    await clickItem(page, "eraser");
    await touchDrag(page, cdp, cell(0, 0), cell(1, 1), { steps: 20 }); // l'image logée en (1, 1)
    const [ex, ey] = cell(2, 2);
    await touchDrag(page, cdp, [ex, ey - 30], [ex, ey + 30], { steps: 10 }); // en travers du trait, à son milieu
    const s = await t.kinds("s3-apres-gomme");
    await t.shot("l1-tableau-contenu-efface.png");
    const table = s.find((e) => e.kind === "table");
    check(table !== undefined, "S3 : le tableau reste");
    check(JSON.stringify(table ?? {}).includes("Lundi"), "S3 : le texte de la case (0, 0) reste");
    check(!s.some((e) => e.kind === "image"), "S3 : l'image logée en (1, 1) est effacée");
    check(s.filter((e) => e.kind === "stroke").length >= 2, "S3 : le trait de la case (2, 2) est coupé");
    // Les morceaux du trait gardent leur case : ils suivent le tableau déplacé (Maj+→, 5 px).
    await clickItem(page, "select");
    await stageMouse(page).click(...cell(0, 2));
    const strokes = (els) => JSON.stringify(els.filter((e) => e.kind === "stroke"));
    const before = strokes(s);
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Escape");
    const moved = await t.kinds("s3-deplace");
    check(strokes(moved) !== before, "S3 : les morceaux du trait suivent le tableau quand on le déplace");
    // Appui long sur une case, outil Tableau : « Supprimer le tableau ».
    await clickItem(page, "table");
    const [lx, ly] = cell(0, 2);
    const pt = { x: box.x + lx, y: box.y + ly, id: 1, radiusX: 4, radiusY: 4, force: 0.5 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
    await page.waitForSelector(".rb-cell-menu:not([hidden])", { timeout: 5000 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await frames(page);
    const del = page.locator('.rb-cell-menu button[data-menu-item="delete-table"]');
    const h = (await del.count()) === 1 ? ((await del.boundingBox())?.height ?? 0) : 0;
    check((await del.count()) === 1 && h >= 44, `S3 : le menu de case propose « Supprimer le tableau » (${h} px de haut)`);
    if ((await del.count()) === 1) await del.click();
    else await page.keyboard.press("Escape");
    const d = await t.kinds("s3-supprime");
    check(!d.some((e) => e.kind === "table") && d.some((e) => e.kind === "stroke"), "S3 : tableau supprimé, les traits libres restent");
    await page.keyboard.press("Control+z");
    check((await t.kinds("s3-rendu")).some((e) => e.kind === "table"), "S3 : Ctrl+Z rend le tableau");
    await clickItem(page, "select");
    const [tx, ty] = cell(0, 2);
    await stageMouse(page).click(tx, ty);
    await page.keyboard.press("Delete");
    check(!(await t.kinds("s3-suppr")).some((e) => e.kind === "table"), "S3 : outil Sélection, toucher le tableau, Suppr : même effet");
  });

  // S4 — stylet retourné (bouton gomme) et paume : mêmes règles, une étape.
  await scenario("S4", async ({ page }) => {
    const t = tools(page);
    const send = (list) =>
      page.evaluate(async (evs) => {
        const st = document.querySelector("#stage");
        const r = st.getBoundingClientRect();
        for (const e of evs) {
          if (e.wait) await new Promise((res) => setTimeout(res, e.wait));
          const lift = e.type === "pointerup";
          st.dispatchEvent(new PointerEvent(e.type, {
            bubbles: true, cancelable: true, pointerId: e.id, pointerType: e.pt, isPrimary: false,
            clientX: r.left + e.x, clientY: r.top + e.y, width: e.w ?? 1, height: e.h ?? e.w ?? 1,
            pressure: lift ? 0 : 0.5, buttons: lift ? 0 : (e.b ?? 1),
          }));
        }
      }, list);
    const line = (id, x0, x1, y, o) => {
      const out = [];
      for (let x = x0 + 10; x <= x1; x += 10) out.push({ type: "pointermove", id, x, y, ...o });
      return out;
    };
    await clickItem(page, "rect");
    await t.drag([[300, 250], [420, 350]]);
    await clickItem(page, "pen");
    await t.drag([[500, 200], [500, 400]]);
    const pen = { pt: "pen", b: 32 };
    await send([{ type: "pointerdown", id: 21, x: 250, y: 300, ...pen }, ...line(21, 250, 560, 300, pen), { type: "pointerup", id: 21, x: 560, y: 300, ...pen }]);
    const a = await t.kinds("s4-stylet");
    check(!a.some((e) => e.kind === "shape") && a.filter((e) => e.kind === "stroke").length === 2, "S4 : stylet retourné : forme effacée, trait coupé");
    await page.keyboard.press("Control+z");
    check((await t.elements()) === 2, "S4 : une étape (un Ctrl+Z rend la forme et le trait entier)");
    await send([
      { type: "pointerdown", id: 22, x: 250, y: 300, pt: "touch", w: 30 },
      { type: "pointermove", id: 22, x: 255, y: 300, pt: "touch", w: 140, h: 120, wait: 40 },
      ...line(22, 255, 560, 300, { pt: "touch", w: 140, h: 120 }),
      { type: "pointerup", id: 22, x: 560, y: 300, pt: "touch" },
    ]);
    const b = await t.kinds("s4-paume");
    check(!b.some((e) => e.kind === "shape") && b.filter((e) => e.kind === "stroke").length === 2, "S4 : paume : forme effacée, trait coupé");
  });
} catch (e) {
  failed = true;
  console.error(e instanceof Echec ? e.message : e);
} finally {
  await browser.close();
  server.close();
  rmSync(tmp, { recursive: true, force: true });
}
console.log(failed ? "gomme-objets : ÉCHEC" : "gomme-objets : OK");
process.exit(failed ? 1 : 0);
