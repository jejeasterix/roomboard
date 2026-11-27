#!/usr/bin/env node
// OG25 : gomme automatique à la surface de contact (cadrage docs/plans/gomme-surface-contact-cadrage.md, § 6, S1 à S8).
// Application construite servie en local, Chromium sans tête de Playwright, `deviceScaleFactor` 2. Les gestes sont des
// `PointerEvent` synthétiques envoyés sur `#stage` (`pointerType`, `pointerId`, `width`, `height`, `clientX/Y`,
// `buttons`) ; chaque scénario part d'une page rechargée (un stylet vu fait déplacer la vue au doigt). Les paumes sont
// posées petites (`width` 30) puis grandies, comme une vraie paume qui s'étale.
// `--captures <dossier>` : captures 2x (anneau à deux tailles, réglage). Témoin consigné, pas porte : la `width` que
// Chromium donne à un toucher CDP de `radiusX` 40.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/gomme-paume-navigateur.mjs [--dist <build>] [--captures <dossier>]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Echec, VIEWPORT, clickItem, frames, inkIn, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
};
const dist = opt("--dist");
const captures = opt("--captures");

const PALM_KEY = "roomboard.gomme.paume";
const TOAST = ".rb-toast";
const SETTING = 'button[data-reglage="gomme-paume"]';
const ON = "Gomme automatique à la paume : active";
const OFF = "Gomme automatique à la paume : coupée";
const RED = [220, 38, 38]; // préréglage « Rouge » (#dc2626)
const TOL = 2; // px CSS : diamètre de l'anneau
const HOLE_TOL = 8; // px CSS : trou de la gomme sur l'axe d'un trait (anticrénelage, bouts arrondis)

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright absent (cache npx)");
  process.exit(2);
}
if (captures) mkdirSync(captures, { recursive: true });
const server = await serve(dist ? { dist } : {});
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await pw.chromium.launch({ args: ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"] });
let failed = false;
try {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const check = (cond, msg) => {
    if (!cond) throw new Echec(`échec — ${msg}`);
    console.log(`ok — ${msg}`);
  };
  const ready = async () => {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
    await frames(page);
  };
  const fresh = async () => {
    await page.goto(url);
    await ready();
  };
  const tag = (k) => page.evaluate((key) => document.querySelector("#stage").dataset[key] ?? "", k);
  const elements = async () => Number(await tag("elements"));
  const camera = async () => {
    await frames(page);
    return tag("camera");
  };
  const zoomOf = (cam) => Number(cam.split(",")[0]);
  /** PointerEvent synthétiques sur #stage, coordonnées en px de la scène ; `wait` : ms d'attente avant l'événement. */
  const send = (list) =>
    page.evaluate(async (evs) => {
      const st = document.querySelector("#stage");
      const r = st.getBoundingClientRect();
      for (const e of evs) {
        if (e.wait) await new Promise((res) => setTimeout(res, e.wait));
        const lift = e.type === "pointerup" || e.type === "pointercancel";
        st.dispatchEvent(
          new PointerEvent(e.type, {
            bubbles: true,
            cancelable: true,
            pointerId: e.id,
            pointerType: e.pt ?? "touch",
            isPrimary: false,
            clientX: r.left + e.x,
            clientY: r.top + e.y,
            width: e.w ?? 1,
            height: e.h ?? e.w ?? 1,
            pressure: lift ? 0 : (e.p ?? 0.5),
            buttons: lift ? 0 : 1,
          }),
        );
      }
    }, list);
  const down = (id, x, y, o = {}) => ({ type: "pointerdown", id, x, y, ...o });
  const move = (id, x, y, o = {}) => ({ type: "pointermove", id, x, y, ...o });
  const up = (id, x, y, o = {}) => ({ type: "pointerup", id, x, y, ...o });
  /** Glissé de (x0, y0) à (x1, y1) par pas de 10 px ; `o` (géométrie, type) porté par chaque événement. */
  const line = (id, x0, y0, x1, y1, o = {}) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 10));
    return Array.from({ length: n }, (_, i) => move(id, x0 + ((x1 - x0) * (i + 1)) / n, y0 + ((y1 - y0) * (i + 1)) / n, o));
  };
  /** Trois doigts `base`, `base + 1`, `base + 2` qui descendent ensemble de y0 à y1 (pas de 10 px). */
  const trio = (base, xs, y0, y1, w) => {
    const out = [];
    for (let y = y0 + 10; y <= y1; y += 10) xs.forEach((x, i) => out.push(move(base + i, x, y, { w })));
    return out;
  };
  /** Anneau visible : sa boîte en px CSS de la page, sinon null (lu après deux images : il s'écrit à l'image). */
  const ring = async () => {
    await frames(page);
    return page.evaluate(() => {
      const el = document.querySelector("#stage .rb-eraser-ring");
      if (!el || el.hidden) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    });
  };
  /** Trait horizontal à la souris (vrais événements, pointerId de la souris), en px de la scène. */
  const mouseLine = async (y, x0 = 450, x1 = 1000) => {
    const m = stageMouse(page);
    await m.move(x0, y);
    await m.down();
    for (let x = x0 + 10; x <= x1; x += 10) await m.move(x, y);
    await m.up();
    await frames(page);
  };
  /** Plus longue suite sans encre sur la rangée y du canvas de scène, entre x0 et x1 (px CSS). */
  const holeOn = (y, x0, x1) =>
    page.$eval(
      "#scene",
      (c, [yy, a, b]) => {
        const g = c.getContext("2d");
        const sx = c.width / c.clientWidth;
        const row = g.getImageData(Math.round(a * sx), Math.round(yy * sx), Math.round((b - a) * sx), 1).data;
        let best = 0;
        let run = 0;
        for (let i = 0; i < row.length; i += 4) {
          const ink = row[i + 3] > 128 && row[i] + row[i + 1] + row[i + 2] < 300;
          run = ink ? 0 : run + 1;
          best = Math.max(best, run);
        }
        return best / sx;
      },
      [y, x0, x1],
    );
  const redIn = (box) => inkIn(page, box, { rgb: RED, tol: 60 });
  const pressed = (id) => page.getAttribute(item(id), "aria-pressed");
  const around = (r, m = 40) => ({ x: r.x - m, y: r.y - m, width: r.width + 2 * m, height: r.height + 2 * m });
  const shot = async (name, clip) => {
    if (!captures) return;
    const path = join(captures, name);
    await page.screenshot({ path, clip, animations: "disabled", caret: "hide", scale: "device" });
    console.log(`capture : ${path}`);
  };
  const toastSays = (text) =>
    page.waitForFunction(([sel, t]) => (document.querySelector(sel)?.textContent ?? "").includes(t), [TOAST, text], { timeout: 5000 }).then(
      () => true,
      () => false,
    );
  const stored = () => page.evaluate((k) => localStorage.getItem(k), PALM_KEY);

  // S1 — doigt fin dessine.
  await fresh();
  await send([down(1, 450, 300, { w: 20 }), ...line(1, 450, 300, 600, 300, { w: 20 })]);
  check((await ring()) === null, "S1 : doigt fin (20 × 20), aucun anneau");
  await send([...line(1, 600, 300, 750, 300, { w: 20 }), up(1, 750, 300)]);
  await frames(page);
  check((await elements()) === 1, "S1 : un trait de plus au document");
  check((await pressed("pen")) === "true", "S1 : outil Stylo toujours enfoncé");

  // S2 — paume : gomme à la bonne taille, puis l'outil d'avant (Stylo, couleur et épaisseur choisies).
  await fresh();
  await mouseLine(400);
  await page.click('button[data-preset="rouge"]');
  await send([down(11, 450, 640, { w: 20 }), ...line(11, 450, 640, 750, 640, { w: 20 }), up(11, 750, 640)]);
  await frames(page);
  const ref = await redIn([600, 625, 601, 655]);
  check(ref > 0, `S2 : trait au doigt de référence, rouge (${ref} px)`);
  await send([
    down(12, 700, 260, { w: 30 }),
    { ...move(12, 700, 265, { w: 140, h: 120 }), wait: 40 },
    ...line(12, 700, 265, 700, 390, { w: 140, h: 120 }),
  ]);
  const big = await ring();
  check(big !== null && Math.abs(big.width - 140) <= TOL && Math.abs(big.height - 140) <= TOL, `S2 : anneau visible, diamètre ${big?.width} px (140 ± ${TOL})`);
  check(Number.isInteger(big.x * 2) && Number.isInteger(big.y * 2) && Number.isInteger(big.width * 2), `S2 : anneau calé sur la grille des pixels (${big.x}, ${big.y})`);
  await shot("gomme-anneau-grand.png", around(big));
  await send([...line(12, 700, 390, 700, 520, { w: 140, h: 120 }), up(12, 700, 520)]);
  await frames(page);
  check((await ring()) === null, "S2 : anneau retiré au lever");
  check((await elements()) === 3, `S2 : trait coupé en deux, aucun trait neuf (${await elements()} éléments : 2 morceaux et le trait rouge)`);
  const hole = await holeOn(400, 480, 970);
  check(Math.abs(hole - 140) <= HOLE_TOL, `S2 : trou de ${hole} px sur l'axe du trait (140 ± ${HOLE_TOL})`);
  check((await pressed("pen")) === "true" && (await tag("tool")) === "pen", "S2 : bouton Stylo toujours enfoncé");
  await send([down(13, 450, 700, { w: 20 }), ...line(13, 450, 700, 750, 700, { w: 20 }), up(13, 750, 700)]);
  await frames(page);
  const after = await redIn([600, 685, 601, 715]);
  check(after > 0 && Math.abs(after - ref) <= 2, `S2 : trait au doigt après la paume, même couleur et même épaisseur (${after} px, avant ${ref})`);

  // S2, variante Rectangle.
  await fresh();
  await mouseLine(400);
  await clickItem(page, "rect");
  await send([
    down(14, 700, 260, { w: 30 }),
    { ...move(14, 700, 265, { w: 140, h: 120 }), wait: 40 },
    ...line(14, 700, 265, 700, 520, { w: 140, h: 120 }),
    up(14, 700, 520),
  ]);
  await frames(page);
  check((await elements()) === 2, "S2 Rectangle : trait coupé, aucun rectangle neuf");
  check((await pressed("rect")) === "true" && (await tag("tool")) === "rect", "S2 Rectangle : bouton Rectangle toujours enfoncé");

  // S2, variante Sélection (déc. 33) : la paume garde le comportement d'aujourd'hui.
  await fresh();
  await mouseLine(400);
  await clickItem(page, "select");
  await stageMouse(page).click(700, 400);
  await frames(page);
  check((await tag("selection")) === "1", "S2 Sélection : le trait est sélectionné");
  const v0 = await tag("version");
  await send([
    down(15, 700, 600, { w: 30 }),
    { ...move(15, 700, 605, { w: 140, h: 120 }), wait: 40 },
    ...line(15, 700, 605, 760, 605, { w: 140, h: 120 }),
  ]);
  check((await ring()) === null, "S2 Sélection : aucun anneau");
  await send([up(15, 760, 605)]);
  await frames(page);
  check((await elements()) === 1 && (await tag("version")) === v0, "S2 Sélection : aucun trait coupé, rien n'est écrit");
  check((await tag("selection")) === "0", "S2 Sélection : appui dans le vide, sélection vidée comme aujourd'hui");

  // S3 — trois doigts serrés gomment ; contre-épreuve à 400 px d'écart.
  await fresh();
  await mouseLine(400);
  const cam3 = await camera();
  await send([
    down(31, 670, 250, { w: 24 }),
    { ...down(32, 700, 250, { w: 24 }), wait: 40 },
    { ...down(33, 730, 250, { w: 24 }), wait: 40 },
    ...trio(31, [670, 700, 730], 250, 380, 24),
  ]);
  const small = await ring();
  check(small !== null && Math.abs(small.width - 84) <= TOL, `S3 : anneau des trois doigts, diamètre ${small?.width} px (84 ± ${TOL})`);
  await shot("gomme-anneau-petit.png", around(small));
  await send([...trio(31, [670, 700, 730], 380, 560, 24), up(31, 670, 560), up(32, 700, 560), up(33, 730, 560)]);
  await frames(page);
  check((await elements()) === 2, "S3 : trait coupé, aucun trait neuf");
  check((await camera()) === cam3, "S3 : vue inchangée");
  await fresh();
  await mouseLine(400);
  await send([
    down(31, 300, 250, { w: 24 }),
    { ...down(32, 700, 250, { w: 24 }), wait: 40 },
    { ...down(33, 1100, 250, { w: 24 }), wait: 40 },
    ...trio(31, [300, 700, 1100], 250, 380, 24),
  ]);
  check((await ring()) === null, "S3 contre-épreuve : doigts à 400 px d'écart, aucun anneau");
  await send([...trio(31, [300, 700, 1100], 380, 560, 24), up(31, 300, 560), up(32, 700, 560), up(33, 1100, 560)]);
  await frames(page);
  check((await elements()) === 1, "S3 contre-épreuve : aucun trait coupé");

  // S4 — pincement à deux doigts zoome, deux doigts ensemble défilent ; paume pendant un pincement établi : ignorée.
  await fresh();
  await mouseLine(400);
  const z0 = zoomOf(await camera());
  const spread = [];
  for (let k = 1; k <= 10; k++) spread.push(move(41, 650 - 10 * k, 300, { w: 24 }), move(42, 750 + 10 * k, 300, { w: 24 }));
  await send([down(41, 650, 300, { w: 24 }), { ...down(42, 750, 300, { w: 24 }), wait: 20 }, ...spread]);
  check((await ring()) === null, "S4 : pincement, aucun anneau");
  await send([up(41, 550, 300), up(42, 850, 300)]);
  const z1 = zoomOf(await camera());
  check(z1 > z0 * 1.5, `S4 : le zoom change (${z0} → ${z1})`);
  check((await elements()) === 1, "S4 : aucun trait coupé, aucun trait neuf");
  const c0 = await camera();
  const glide = [];
  for (let k = 1; k <= 10; k++) glide.push(move(43, 650, 600 + 10 * k, { w: 24 }), move(44, 750, 600 + 10 * k, { w: 24 }));
  await send([down(43, 650, 600, { w: 24 }), { ...down(44, 750, 600, { w: 24 }), wait: 20 }, ...glide, up(43, 650, 700), up(44, 750, 700)]);
  const c1 = await camera();
  check(c1 !== c0 && zoomOf(c1) === zoomOf(c0), `S4 : deux doigts qui glissent ensemble, la vue défile (${c0} → ${c1})`);
  check((await elements()) === 1, "S4 : défilement, aucun trait neuf");
  await fresh();
  await mouseLine(400);
  const hold = [];
  for (let k = 1; k <= 8; k++) hold.push({ ...move(46, 700 + 2 * k, 650, { w: 24 }), wait: 50 });
  await send([down(45, 600, 650, { w: 24 }), { ...down(46, 700, 650, { w: 24 }), wait: 20 }, ...hold]);
  const before = await camera();
  await send([down(47, 700, 400, { w: 140, h: 140 }), ...line(47, 700, 400, 700, 450, { w: 140, h: 140 })]);
  check((await ring()) === null, "S4 variante : paume posée pendant un pincement tenu depuis 400 ms, aucun anneau");
  await send([move(46, 740, 650, { w: 24 }), move(46, 760, 650, { w: 24 })]);
  const later = await camera();
  check(later !== before, `S4 variante : le pincement continue (${before} → ${later})`);
  await send([up(47, 700, 450), up(45, 600, 650), up(46, 760, 650)]);
  await frames(page);
  check((await elements()) === 1, "S4 variante : aucun trait coupé");

  // S5 — stylet large dessine.
  await fresh();
  const pen = { pt: "pen", w: 150, h: 150, p: 0.5 };
  await send([down(51, 450, 300, pen), ...line(51, 450, 300, 600, 300, pen)]);
  check((await ring()) === null, "S5 : stylet de 150 × 150, aucun anneau");
  await send([...line(51, 600, 300, 750, 300, pen), up(51, 750, 300, { pt: "pen" })]);
  await frames(page);
  check((await elements()) === 1, "S5 : stylet large, un trait neuf");

  // S6 — appareil sans géométrie dessine (1 × 1, puis 0 × 0) ; trois doigts serrés à 1 × 1 ne gomment pas.
  await fresh();
  await send([down(61, 450, 300, { w: 1 }), ...line(61, 450, 300, 600, 300, { w: 1 })]);
  check((await ring()) === null, "S6 : toucher à 1 × 1 (défaut W3C), aucun anneau");
  await send([...line(61, 600, 300, 750, 300, { w: 1 }), up(61, 750, 300)]);
  await send([down(62, 450, 360, { w: 0 }), ...line(62, 450, 360, 750, 360, { w: 0 }), up(62, 750, 360)]);
  await frames(page);
  check((await elements()) === 2, "S6 : 1 × 1 puis 0 × 0 (Windows), deux traits neufs");
  await send([
    down(63, 670, 250, { w: 1 }),
    { ...down(64, 700, 250, { w: 1 }), wait: 40 },
    { ...down(65, 730, 250, { w: 1 }), wait: 40 },
    ...trio(63, [670, 700, 730], 250, 330, 1),
  ]);
  check((await ring()) === null, "S6 : trois doigts serrés à 1 × 1, aucun anneau");
  await send([...trio(63, [670, 700, 730], 330, 420, 1), up(63, 670, 420), up(64, 700, 420), up(65, 730, 420)]);
  await frames(page);
  check((await elements()) === 2, "S6 : trois doigts sans géométrie, aucun trait coupé");

  // S7 — annulation en une étape.
  await fresh();
  await mouseLine(400);
  await mouseLine(470);
  check((await elements()) === 2, "S7 : deux traits de départ");
  const trace = [];
  for (let k = 1; k <= 6; k++) trace.push({ ...move(71, 700, 250 + 5 * k, { w: 30 }), wait: 10 });
  await send([
    down(71, 700, 250, { w: 30 }),
    ...trace,
    move(71, 700, 285, { w: 140, h: 140 }),
    ...line(71, 700, 285, 700, 560, { w: 140, h: 140 }),
    up(71, 700, 560),
  ]);
  await frames(page);
  check((await elements()) === 4, `S7 : les deux traits coupés, aucun trait neuf (${await elements()} éléments)`);
  await page.keyboard.press("Control+z");
  await frames(page);
  check((await elements()) === 2, "S7 : un seul Ctrl+Z rend les deux traits entiers");
  await page.keyboard.press("Control+z");
  await frames(page);
  check((await elements()) === 1, "S7 : un second Ctrl+Z défait le trait d'avant l'essai");

  // S8 — réglage coupé et gardé.
  await fresh();
  await page.keyboard.press("Control+Shift+KeyH");
  check(await toastSays(OFF), `S8 : Ctrl+Maj+H, avis « ${OFF} »`);
  check((await stored()) === "non", "S8 : réglage gardé sur l'appareil (« non »)");
  await clickItem(page, "settings");
  await page.waitForSelector(SETTING, { timeout: 15000 });
  check(((await page.textContent(SETTING)) ?? "").trim() === OFF, "S8 : bouton du panneau Réglages à « coupée »");
  const hauteur = await page.$eval(SETTING, (b) => b.getBoundingClientRect().height);
  console.log(`hauteur du bouton Réglages : ${hauteur} px`);
  check(hauteur >= 44, `S8 : bouton du panneau Réglages haut de ${hauteur} px (cible tactile, 44 au moins)`);
  const icons = await page.$$eval("#reglages svg", (l) => l.map((s) => s.getAttribute("viewBox")));
  check(icons.every((v) => v === "-0.25 -0.25 24 24"), `S8 : netteté § 10, icônes du panneau calées (${icons.length})`);
  const panel = await page.locator("#reglages").boundingBox();
  await shot("reglage-gomme-paume.png", around(panel, 8));
  await clickItem(page, "settings");
  await mouseLine(400);
  await send([down(81, 700, 260, { w: 140, h: 120 }), ...line(81, 700, 260, 700, 390, { w: 140, h: 120 })]);
  check((await ring()) === null, "S8 : réglage coupé, aucun anneau");
  await send([...line(81, 700, 390, 700, 520, { w: 140, h: 120 }), up(81, 700, 520)]);
  await frames(page);
  check((await elements()) === 2, "S8 : la paume dessine un trait comme aujourd'hui, rien n'est coupé");
  await page.reload();
  await ready();
  check((await stored()) === "non", "S8 : après rechargement, réglage toujours coupé");
  await clickItem(page, "settings");
  await page.waitForSelector(SETTING, { timeout: 15000 });
  check(((await page.textContent(SETTING)) ?? "").trim() === OFF, "S8 : après rechargement, bouton toujours à « coupée »");
  await clickItem(page, "settings");
  await page.keyboard.press("Control+Shift+KeyH");
  check(await toastSays(ON), `S8 : Ctrl+Maj+H la rallume, avis « ${ON} »`);
  check((await stored()) === null, "S8 : clé retirée de l'appareil");

  // Témoin (consigné, pas une porte) : ce que Chromium remonte comme `width` pour un toucher CDP de rayon 40.
  await fresh();
  await page.evaluate(() => {
    window.__og25 = [];
    document.querySelector("#stage").addEventListener("pointerdown", (e) => window.__og25.push([e.pointerType, e.width, e.height]), true);
  });
  const box = await page.locator("#stage").boundingBox();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 700, y: box.y + 650, radiusX: 40, radiusY: 40 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const seen = await page.evaluate(() => window.__og25);
  console.log(`témoin CDP : radiusX 40 → ${JSON.stringify(seen)} (width 40 : rayon ; 80 : diamètre)`);

  check(errors.length === 0, `aucune erreur de page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  console.log("gomme paume : OK");
} catch (e) {
  failed = true;
  console.error(e instanceof Echec ? e.message : e);
} finally {
  await browser.close();
  server.close();
}
process.exitCode = failed ? 1 : 0;
