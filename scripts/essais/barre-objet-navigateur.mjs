#!/usr/bin/env node
// OG41 L2 : barre d'objet en icônes, collée à la sélection (cadrage docs/plans/gomme-et-barre-objet-cadrage.md, § 6,
// S5 à S8). Application construite servie en local, Chromium sans tête, `deviceScaleFactor` 2. Lectures d'abord (boîtes,
// boutons, px entiers), captures ensuite. `--avant` : même parcours sur `main`, contrôles imprimés sans arrêter.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/barre-objet-navigateur.mjs [--dist <build>] [--captures <dossier>] [--avant]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Echec, clickItem, dropFile, frames, islandBoxes, loadPlaywright, serve, solidPng, stageMouse } from "./commun.mjs";
import { attr, marquee, newPage, tapStage, touchDrag, waitAttr } from "./gestes.mjs";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
};
const dist = opt("--dist");
const captures = opt("--captures");
const avant = argv.includes("--avant");
const BAR = "[data-object-bar]";
const act = (id) => `[data-selection-action="${id}"]`;
/** Bouton d'action : dans la barre d'objet ; en `--avant` (main), celui de la rangée Sélection à libellés. */
const inBar = (id) => (avant ? act(id) : `${BAR} ${act(id)}`);

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright absent (cache npx)");
  process.exit(2);
}
if (captures) mkdirSync(captures, { recursive: true });
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
const apart = (a, b) => a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;

async function scenario(name, run) {
  const s = await newPage(browser, base, { scale: 2 });
  try {
    await run(s);
    check(s.errors.length === 0, `${name} : aucune erreur dans la page${s.errors.length ? ` (${s.errors.join(" | ")})` : ""}`);
  } finally {
    await s.ctx.close();
  }
}
const helpers = (page) => ({
  /** Clic si présent ; absent : contrôle en échec (imprimé en `--avant`, qui continue). */
  press: async (sel) => {
    const here = (await page.locator(sel).count()) > 0 && (await page.locator(sel).first().isVisible());
    check(here, `présent : ${sel}`);
    if (here) await page.click(sel);
    await frames(page);
    return here;
  },
  drag: async (pts) => {
    const m = stageMouse(page);
    await m.move(...pts[0]);
    await m.down();
    for (const p of pts.slice(1)) await m.move(p[0], p[1], { steps: 8 });
    await m.up();
    await frames(page);
  },
  barBox: async () => {
    await frames(page);
    const b = (await page.locator(BAR).count()) > 0 ? await page.locator(BAR).first().boundingBox() : null; // absent (main) : null, sans attendre
    if (b) lire("barre", `${b.x},${b.y},${b.width}×${b.height}`);
    return b;
  },
  frameBox: async () => {
    const stage = await page.locator("#stage").boundingBox();
    const [x0, y0, x1, y1] = (await attr(page, "data-bounds")).split(",").map(Number);
    const [z, tx, ty] = (await attr(page, "data-camera")).split(",").map(Number);
    const f = { x: stage.x + x0 * z + tx, y: stage.y + y0 * z + ty, width: (x1 - x0) * z, height: (y1 - y0) * z };
    lire("cadre", `${f.x},${f.y},${f.width}×${f.height}`);
    return f;
  },
  buttons: async () => {
    const ids = await page.$$eval(`${BAR} [data-object-button]`, (els) => els.map((e) => e.getAttribute("data-selection-action") ?? "more"));
    lire("boutons", ids.join(","));
    return ids;
  },
  shot: async (name, sel) => {
    if (!captures) return;
    const path = join(captures, name);
    const box = sel && (await page.locator(sel).count()) > 0 ? await page.locator(sel).first().boundingBox() : null;
    const clip = box ? { x: Math.max(0, box.x - 120), y: Math.max(0, box.y - 120), width: box.width + 240, height: box.height + 320 } : undefined;
    await page.screenshot({ path, ...(clip ? { clip } : {}), animations: "disabled", caret: "hide", scale: "device" });
    console.log(`capture : ${path}`);
  },
});

try {
  // S5 — barre collée au-dessus d'une image, infobulle à l'appui long, suit le glisser et le zoom ; netteté § 10.
  await scenario("S5", async ({ page, cdp }) => {
    const h = helpers(page);
    await dropFile(page, "#stage", "photo.png", solidPng(200, 150, [29, 78, 216]), "image/png", [600, 420]);
    await frames(page);
    await clickItem(page, "select");
    await tapStage(page, 630, 445); // dans l'image qu'elle soit centrée sur le point de dépôt ou calée par son coin
    await waitAttr(page, "data-selection", "1");
    const bar = await h.barBox();
    const f = await h.frameBox();
    check(bar !== null && bar.height === 44, `S5 : barre d'objet de 44 px de haut (${bar?.height})`);
    check(bar !== null && bar.y + bar.height <= f.y - 8 + 0.5, "S5 : la barre est au-dessus du cadre, 8 px au moins au-dessus des poignées");
    check(bar !== null && Math.abs(bar.x + bar.width / 2 - (f.x + f.width / 2)) <= 1, "S5 : centrée sur le cadre");
    const ids = await h.buttons();
    check(["duplicate", "copy", "image", "delete"].every((id) => ids.includes(id)) && !ids.includes("group"), "S5 : Dupliquer, Copier, Image, Supprimer ; aucun bouton inutile");
    const ints = await page.$$eval(`${BAR} svg.rb-icon`, (els) => els.every((e) => { const r = e.getBoundingClientRect(); return Number.isInteger(r.left) && Number.isInteger(r.top); }));
    lire("px entiers", ints ? "oui" : "non");
    check(ints, "S5 : icônes posées en px entiers (netteté § 10 à 2x)");
    await h.shot("l2-barre-forme.png", BAR);
    // Appui long : infobulle « Dupliquer · Ctrl+D », sans action.
    const dupSel = `${BAR} ${act("duplicate")}`;
    const dup = (await page.locator(dupSel).count()) > 0 ? await page.locator(dupSel).first().boundingBox() : null;
    if (dup !== null) {
      const n0 = Number(await attr(page, "data-elements"));
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: dup.x + dup.width / 2, y: dup.y + dup.height / 2, id: 3 }] });
      await page.waitForSelector('[role="tooltip"]', { timeout: 5000 });
      const tip = page.locator('[role="tooltip"]').first();
      const text = `${await tip.textContent()} · ${await tip.getAttribute("data-keys")}`;
      lire("infobulle", text);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(400);
      check(text === "Dupliquer · Ctrl+D" && Number(await attr(page, "data-elements")) === n0, "S5 : appui long sur Dupliquer : infobulle « Dupliquer · Ctrl+D », aucune copie");
    } else check(false, "S5 : bouton Dupliquer de la barre d'objet présent");
    // Glisser : barre cachée pendant le geste, reposée au-dessus de la nouvelle place.
    const end = await touchDrag(page, cdp, [630, 445], [400, 300], { hold: true });
    check(!(await page.locator(BAR).isVisible()), "S5 : barre cachée pendant le glisser");
    await end();
    const bar2 = await h.barBox();
    const f2 = await h.frameBox();
    check(bar2 !== null && bar2.y + bar2.height <= f2.y - 8 + 0.5, "S5 : barre reposée au-dessus de la nouvelle place");
    await page.mouse.move(f2.x + f2.width / 2, f2.y + f2.height / 2);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -300);
    await page.keyboard.up("Control");
    const bar3 = await h.barBox();
    check(bar3 !== null && bar3.height === 44, "S5 : zoom : la barre suit, même taille");
  });

  // S6 — place manquante, barre d'outils en bas, panneau et barre latérale, objet qui remplit la vue, flèches.
  await scenario("S6", async ({ page }) => {
    const h = helpers(page);
    // Sous la rangée du haut (îlots à y 16-72) ; « + » et poignées ne laissent pas 52 px au-dessus : barre dessous.
    await clickItem(page, "rect");
    await h.drag([[150, 100], [300, 200]]);
    await clickItem(page, "select");
    await marquee(page, [330, 230], [120, 70]); // rectangle vide : on le prend par un cadre, pas par son intérieur
    await waitAttr(page, "data-selection", "1");
    const bar = await h.barBox();
    const f = await h.frameBox();
    check(bar !== null && bar.y >= f.y + f.height, "S6 : objet collé en haut : barre sous le cadre (et sous les « + »)");
    await h.shot("l2-barre-dessous.png", BAR);
    const islands = await islandBoxes(page);
    check(bar !== null && islands.every((i) => apart(bar, i)), "S6 : la barre ne couvre aucun îlot (panneau d'options, barre d'outils)");
    await page.click('[data-island="pages"] [data-island-collapse]').catch(() => undefined);
    await frames(page);
    const bar2 = await h.barBox();
    check(bar2 !== null && (await islandBoxes(page)).every((i) => apart(bar2, i)), "S6 : barre latérale ouverte : la barre se décale, ne la couvre pas");
    const before = await h.barBox();
    await page.keyboard.press("ArrowRight");
    const after = await h.barBox();
    check(before !== null && after !== null && after.x > before.x, "S6 : flèche → : l'objet bouge, la barre suit");
    // Objet qui remplit la vue : un rectangle agrandi par le zoom (Ctrl + molette) jusqu'à déborder.
    await page.keyboard.press("Escape");
    await clickItem(page, "rect");
    await h.drag([[560, 400], [720, 520]]);
    await clickItem(page, "select");
    await marquee(page, [540, 380], [740, 540]);
    const st0 = await page.locator("#stage").boundingBox();
    await page.mouse.move(st0.x + 640, st0.y + 460);
    await page.keyboard.down("Control");
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -400);
    await page.keyboard.up("Control");
    const big = await h.barBox();
    const stage = await page.locator("#stage").boundingBox();
    check(big !== null && big.y >= stage.y && big.y + big.height <= stage.y + stage.height, "S6 : objet qui remplit la vue : barre dans la vue");
  });

  // S7 — groupe, « … », clavier.
  await scenario("S7", async ({ page }) => {
    const h = helpers(page);
    await clickItem(page, "rect");
    await h.drag([[300, 300], [400, 400]]);
    await clickItem(page, "rect");
    await h.drag([[500, 300], [600, 400]]);
    await clickItem(page, "select");
    await marquee(page, [280, 280], [620, 420]);
    await waitAttr(page, "data-selection", "2");
    check((await h.buttons()).includes("group"), "S7 : deux formes : Grouper visible");
    await h.press(inBar("group"));
    await waitAttr(page, "data-grouped", "1");
    const ids = await h.buttons();
    check(ids.includes("ungroup") && !ids.includes("group"), "S7 : Dégrouper remplace Grouper");
    await h.shot("l2-barre-groupe.png", BAR);
    if (!(await h.press(`${BAR} [data-object-more]`))) return;
    const rows = await page.$$eval("[data-object-menu] button", (els) => els.map((e) => [e.querySelector("span")?.textContent, e.getBoundingClientRect().height]));
    lire("menu", rows.map((r) => `${r[0]}:${r[1]}`).join(","));
    check(JSON.stringify(rows.map((r) => r[0])) === JSON.stringify(["Premier plan", "Arrière-plan", "Exporter la sélection"]) && rows.every((r) => r[1] >= 44), "S7 : « … » : Premier plan, Arrière-plan, Exporter la sélection, 44 px");
    await h.shot("l2-menu-plus.png", "[data-object-menu]");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+Shift+g");
    await waitAttr(page, "data-grouped", "0");
    check(true, "S7 : Ctrl+Maj+G dégroupe");
    await page.keyboard.press("Shift+F10");
    const focused = await page.evaluate(() => document.activeElement?.closest("[data-object-bar]") !== null);
    check(focused, "S7 : Maj+F10 met le focus dans la barre");
    const b0 = await attr(page, "data-bounds");
    await page.keyboard.press("ArrowRight");
    check((await attr(page, "data-bounds")) === b0, "S7 : → dans la barre : l'objet ne bouge pas");
    const role = await page.getAttribute(BAR, "role");
    const label = await page.getAttribute(BAR, "aria-label");
    check(role === "toolbar" && label === "Actions de l'objet", "S7 : annoncée « Actions de l'objet, barre d'outils »");
    await page.keyboard.press("Escape");
    check(await page.evaluate(() => document.activeElement?.closest("[data-object-bar]") === null), "S7 : Échap rend le focus à la scène");
    await page.keyboard.press("?");
    await frames(page);
    check((await page.locator('[data-shortcut-id="object-bar"]').count()) === 1, "S7 : l'Aide liste « Barre de l'objet · Maj+F10 »");
  });

  // S8 — tableau supprimé par la barre ; coller depuis l'îlot contextuel.
  await scenario("S8", async ({ page }) => {
    const h = helpers(page);
    await clickItem(page, "table");
    await stageMouse(page).click(200, 200);
    await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
    await page.click('button[aria-label="3 colonnes, 3 lignes"]');
    await page.keyboard.press("Escape");
    await clickItem(page, "select");
    await marquee(page, [150, 150], [760, 420]); // le tableau 3 × 3 posé en (200, 200), seul objet de la page
    await waitAttr(page, "data-selection", "1");
    check((await h.buttons()).includes("delete"), "S8 : tableau choisi : la barre montre Supprimer");
    const n0 = Number(await attr(page, "data-elements"));
    if (!(await h.press(inBar("delete")))) return;
    await waitAttr(page, "data-elements", String(n0 - 1));
    await page.keyboard.press("Control+z");
    await waitAttr(page, "data-elements", String(n0));
    check(true, "S8 : Supprimer puis Ctrl+Z : le tableau revient");
    await clickItem(page, "rect");
    await h.drag([[900, 500], [1000, 600]]);
    await clickItem(page, "select");
    await tapStage(page, 950, 500);
    await h.press(inBar("copy"));
    await tapStage(page, 1100, 800);
    await waitAttr(page, "data-selection", "0");
    check(!(await page.locator(BAR).isVisible()) && (await page.locator(`[data-island-context] ${act("paste")}`).count()) === 1, "S8 : page vide : barre disparue, « Coller » dans l'îlot contextuel");
    const n1 = Number(await attr(page, "data-elements"));
    await page.click(`[data-island-context] ${act("paste")}`);
    await waitAttr(page, "data-elements", String(n1 + 1));
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+v");
    await waitAttr(page, "data-elements", String(n1 + 2));
    check(true, "S8 : Coller (bouton) puis Ctrl+V : même résultat");
  });
} catch (e) {
  failed = true;
  console.error(e instanceof Echec ? e.message : e);
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? "barre-objet : ÉCHEC" : "barre-objet : OK");
process.exit(failed ? 1 : 0);
