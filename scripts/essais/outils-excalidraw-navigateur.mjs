#!/usr/bin/env node
// Essai OG12 (personnalisation-2-outils, lots 1 et 2a) au navigateur : cadrage § 6, S1 à S4 et S6 (S5 est la CLI, cli-essai.mjs), puis S7 à S9
// du lot 2a (losange, points d'une forme ; plan LOT2 § Scénarios du lot 2a ; la part CLI de S9 est dans cli-essai.mjs), au
// doigt d'abord (événements du protocole, pointerType « touch »), puis à la souris et au clavier (S4). L'état du document
// est lu dans le fichier enregistré (Ctrl+S) par `roomboard state` ; les attributs de `#stage` (data-bind, data-line-edit,
// data-line-points, data-selection) donnent l'état vivant. Chromium de Playwright, --disable-lcd-text, --force-color-profile=srgb.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e (sans --captures).
// Usage : node scripts/essais/outils-excalidraw-navigateur.mjs [--only s1|s2|s3|s4|s6|s7|s8|s9|cibles|nettete|cibles2a] [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/design/captures/personnalisation-2-outils/<nom>-*.png à 2x (« apres » : cinq vues ; « avant » : flèche et panneau).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DIST, Echec, frames, gitSha, item, loadPlaywright, ROOT, serve, sha256, stageBox, VIEWPORT, zipEntries } from "./commun.mjs";
import { attr, BIN, choose, doubleTouch, newPage, OPT, opt, pressed, press, readState, saved, tapAt, tapStage, touchDrag, touchDragWithLateFinger, useTool, waitAttr } from "./gestes.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "outils-excalidraw";
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

// Deux rectangles de 120 × 100 px de la scène (le panneau d'options couvre x < 400) : A à gauche, B à droite.
const A = [450, 250, 570, 350];
const B = [800, 250, 920, 350];
const MID = [(A[2] + B[0]) / 2, 300];

// ------------------------------------------------------------------------------------------------------------- aides

/** Outil par la barre : au doigt, un tap sur le bouton, après une pause (un tap qui suit un tracé du protocole est perdu). */
async function tool(page, id) {
  await page.waitForTimeout(600);
  await useTool(page, "doigt", id);
  await waitAttr(page, "data-tool", id);
}
/** Pose un rectangle au doigt, de la boîte `[x0, y0, x1, y1]` de la scène. */
async function rect(page, cdp, [x0, y0, x1, y1]) {
  await tool(page, "rect");
  await touchDrag(page, cdp, [x0, y0], [x1, y1]);
}
/** Page neuve avec les rectangles A et B posés au doigt ; rend aussi leurs identifiants (ordre de pose). */
async function poseAB(browser, base, tmp, name, opts = {}) {
  const h = await newPage(browser, base, opts);
  await rect(h.page, h.cdp, A);
  await rect(h.page, h.cdp, B);
  const s = await saved(h.page, tmp, `${name}.roomboard`);
  const rects = s.elements.filter((e) => e.shape?.shape === "rect");
  check(rects.length === 2, `${name} : deux rectangles posés au doigt`);
  return { ...h, a: rects[0].id, b: rects[1].id, rects };
}
/** Glissé à la souris, avec les modificateurs tenus. */
async function mouseDrag(page, from, to, { mods = [], steps = 8 } = {}) {
  const b = await stageBox(page);
  for (const m of mods) await page.keyboard.down(m);
  await page.mouse.move(b.x + from[0], b.y + from[1]);
  await page.mouse.down();
  await page.mouse.move(b.x + (from[0] + to[0]) / 2, b.y + (from[1] + to[1]) / 2, { steps: Math.ceil(steps / 2) });
  await page.mouse.move(b.x + to[0], b.y + to[1], { steps: Math.ceil(steps / 2) });
  await page.mouse.up();
  for (const m of mods.slice().reverse()) await page.keyboard.up(m);
  await frames(page);
}
async function mouseClick(page, [x, y], { mods = [] } = {}) {
  const b = await stageBox(page);
  for (const m of mods) await page.keyboard.down(m);
  await page.mouse.click(b.x + x, b.y + y);
  for (const m of mods.slice().reverse()) await page.keyboard.up(m);
  await frames(page);
}
async function waitNonEmpty(page, name) {
  await page.waitForFunction((n) => (document.querySelector("#stage")?.getAttribute(n) ?? "") !== "", name, { timeout: 15000 }).catch(async () => {
    throw new Echec(`#stage ${name} attendu non vide, lu « ${await attr(page, name)} »`);
  });
  await frames(page);
}
const arrows = (els) => els.filter((e) => e.shape?.shape === "arrow");
const lines = (els) => els.filter((e) => e.shape?.shape === "line");
const rects = (els) => els.filter((e) => e.shape?.shape === "rect");
/** Extrémités d'une flèche ou d'une ligne en coordonnées de la page : départ (transform), arrivée (départ + w, h). */
const ends = (e) => [[e.transform[4], e.transform[5]], [e.transform[4] + e.shape.w, e.transform[5] + e.shape.h]];
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;
const key = (els) => JSON.stringify(els.map((e) => [e.id, e.transform, e.shape, e.look ?? null]));
/** Angle en degrés du segment p → q, dans [0, 360). */
const angle = (p, q) => ((Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI + 360) % 360;
const multipleOf15 = (a) => Math.abs(a / 15 - Math.round(a / 15)) * 15 < 0.5;
/** Points d'une flèche : départ, points intérieurs, arrivée. */
const polyline = (e) => {
  const [p0, p1] = ends(e);
  const inner = e.shape.points ?? [];
  const mid = [];
  for (let i = 0; i + 1 < inner.length; i += 2) mid.push([p0[0] + inner[i], p0[1] + inner[i + 1]]);
  return [p0, ...mid, p1];
};
const undo = async (page) => {
  await page.keyboard.press("Control+z");
  await frames(page);
};
const [bx, by] = [0, 0];
void bx;
void by;

// ---------------------------------------------------------------------------------------------------------------- S1

/** S1 : relier deux objets au doigt, les déplacer, annuler. */
async function s1(browser, base, tmp) {
  const { ctx, page, cdp, errors, a, b } = await poseAB(browser, base, tmp, "s1-avant");
  await tool(page, "arrow");
  const end = await touchDrag(page, cdp, [A[2], 300], [B[0], 300], { hold: true });
  await waitAttr(page, "data-bind", b);
  lire("S1.bind", b);
  check(true, "S1 : pendant le contact, la cible B est annoncée (data-bind, surlignage et points d'accroche)");
  await end();
  let s = await saved(page, tmp, "s1-lie.roomboard");
  const fl = arrows(s.elements);
  check(fl.length === 1, "S1 : une flèche posée");
  lire("S1.startBound", fl[0].shape.start?.id);
  lire("S1.endBound", fl[0].shape.end?.id);
  check(fl[0].shape.start?.id === a && fl[0].shape.end?.id === b, "S1 : au relâché, la flèche est liée à A (départ) et à B (arrivée)");
  // Toucher la flèche : poignées de bout et de milieu, aucun cadre à 8 poignées.
  await tool(page, "select");
  await tapStage(page, 640, 300);
  await waitAttr(page, "data-selection", "1");
  check(true, "S1 : toucher la flèche la sélectionne (une seule sélection)");
  const before = key(s.elements);
  // Glisser B de 200 px vers le bas (outil Sélection) : la fin suit, à 7 de B (5 + épaisseur 4 / 2).
  await touchDrag(page, cdp, [860, 255], [860, 455]);
  s = await saved(page, tmp, "s1-apres.roomboard");
  const B1 = rects(s.elements).find((e) => e.id === b);
  const [, fin] = ends(arrows(s.elements)[0]);
  lire("S1.gap", Math.round(B1.transform[4] - fin[0]));
  check(near(fin[0], B1.transform[4] - 7) && near(fin[1], B1.transform[5] + B1.shape.h / 2), `S1 : B glissée, la fin de la flèche suit à 7 du bord gauche de B (${fin.map(Math.round)})`);
  check(B1.transform[5] > rects(s.elements).find((e) => e.id === a).transform[5] + 100, "S1 : B a bien descendu");
  await undo(page);
  s = await saved(page, tmp, "s1-annule.roomboard");
  check(key(s.elements) === before, "S1 : Ctrl+Z une fois, B et la flèche reviennent ensemble (une étape)");
  check(errors.length === 0, "S1 : aucune erreur dans la page");
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------- S2

/** Pose la flèche A → B au doigt et la sélectionne. */
async function flecheAB(page, cdp) {
  await tool(page, "arrow");
  await touchDrag(page, cdp, [A[2], 300], [B[0], 300]);
  await tool(page, "select");
  await tapStage(page, 630, 300);
  await waitAttr(page, "data-selection", "1");
  await page.waitForTimeout(600);
}

/** S2 : courber une flèche au doigt, puis l'enregistrer. */
async function s2(browser, base, tmp) {
  const { ctx, page, cdp, errors, a, b } = await poseAB(browser, base, tmp, "s2-avant");
  await flecheAB(page, cdp);
  // C3 : double toucher au milieu de la flèche sélectionnée, sur sa poignée du milieu (C2 : un relâché sans mouvement sur
  // la poignée du milieu ou d'un bout compte pour le double toucher) ; aucun point ajouté.
  await doubleTouch(page, cdp, MID);
  await waitNonEmpty(page, "data-line-edit");
  check(true, "S2 : double toucher au milieu de la flèche sélectionnée (poignée du milieu), « Modifier les points » s'ouvre");
  const s0 = await saved(page, tmp, "s2-milieu.roomboard");
  lire("S2.milieu.points", polyline(arrows(s0.elements)[0]).length);
  check(polyline(arrows(s0.elements)[0]).length === 2, "S2 : le double toucher au milieu n'ajoute aucun point (2 points)");
  await page.keyboard.press("Escape");
  await waitAttr(page, "data-line-edit", "");
  await waitAttr(page, "data-selection", "1");
  await page.waitForTimeout(600);
  await doubleTouch(page, cdp, [630, 300]);
  await waitNonEmpty(page, "data-line-edit");
  check(true, "S2 : double toucher sur la flèche, « Modifier les points » s'ouvre (data-line-edit)");
  await touchDrag(page, cdp, MID, [MID[0], MID[1] - 80]);
  let s = await saved(page, tmp, "s2-points.roomboard");
  let f = arrows(s.elements)[0];
  const n = polyline(f).length;
  lire("S2.points", n);
  check(n === 3, "S2 : tirer le point milieu de 80 px donne 3 points");
  await choose(page, "doigt", "arrowType", "round");
  s = await saved(page, tmp, "s2-courbe.roomboard");
  f = arrows(s.elements)[0];
  lire("S2.roundness", f.look?.roundness);
  check(f.look?.roundness === "round", "S2 : Type de flèche → Courbe, look.roundness = round");
  // Second doigt après 300 ms pendant qu'on tire l'arrivée : angle du dernier segment à 15°.
  await page.waitForTimeout(600);
  await touchDragWithLateFinger(page, cdp, [B[0], 300], [1050, 450], [1100, 700]);
  s = await saved(page, tmp, "s2-angle.roomboard");
  f = arrows(s.elements)[0];
  const pts = polyline(f);
  const ang = angle(pts[pts.length - 2], pts[pts.length - 1]);
  lire("S2.angle15", multipleOf15(ang) ? 1 : 0);
  check(multipleOf15(ang), `S2 : doigt tardif (Maj tactile), dernier segment à ${ang.toFixed(1)}° (multiple de 15°)`);
  await tapStage(page, 700, 760);
  check((await attr(page, "data-line-edit")) === "", "S2 : toucher hors de l'objet sort de « Modifier les points »");
  // Enregistrer, rouvrir (Ctrl+O) : mêmes points, même type, mêmes liaisons.
  const f0 = key(arrows(s.elements));
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(s.file);
  await page.waitForTimeout(1200);
  await frames(page);
  const re = await saved(page, tmp, "s2-rouvert.roomboard");
  check(key(arrows(re.elements)) === f0 && re.elements.length === s.elements.length, "S2 : fichier rouvert puis réenregistré : mêmes points, même type, mêmes liaisons");
  check(arrows(re.elements)[0].shape.start?.id === a && b !== undefined, "S2 : la liaison de départ à A survit à la réouverture");
  check(errors.length === 0, "S2 : aucune erreur dans la page");
  await ctx.close();
  await s2octets(browser, base, tmp);
}

/** S2 (fin) : un fichier fabriqué par la CLI de `main`, ouvert puis enregistré sans changement, garde les octets du document. */
async function s2octets(browser, base, tmp) {
  const f = join(tmp, "main.roomboard");
  const rectOp = (x) => ({ type: "AddShape", page: "$page:0", shape: "rect", x0: x, y0: 0, x1: x + 100, y1: 50, style: { color: "#000000", width: 4 }, fill: null });
  const flecheOp = { type: "AddShape", page: "$page:0", shape: "arrow", x0: 100, y0: 25, x1: 400, y1: 25, style: { color: "#000000", width: 4 }, fill: null, start: { id: "$1", fx: 1, fy: 0.5 }, end: { id: "$2", fx: 0, fy: 0.5 } };
  const r = spawnSync("node", [BIN, "run", "--new", "--out", f, "--ops", "-"], { encoding: "utf8", input: [rectOp(0), rectOp(400), flecheOp].map((o) => JSON.stringify(o)).join("\n") + "\n" });
  if (r.status !== 0) throw new Echec(`CLI run --new : code ${r.status} ${r.stderr}${r.stdout}`);
  const { ctx, page, errors } = await newPage(browser, base);
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(f);
  await page.waitForTimeout(1200);
  await frames(page);
  const out = await saved(page, tmp, "main-reenregistre.roomboard");
  const e0 = zipEntries(readFileSync(f));
  const e1 = zipEntries(readFileSync(out.file));
  const names = [...e0.keys()].filter((n) => !/manifest/i.test(n));
  const same = names.every((n) => e1.has(n) && sha256(e0.get(n)) === sha256(e1.get(n)));
  lire("S2.octets", names.map((n) => `${n}:${sha256(e0.get(n)).slice(0, 8)}`).join(" "));
  check(names.length >= 1 && same, `S2 : fichier de main ouvert puis enregistré sans changement, mêmes octets pour ${names.join(", ")} (le manifeste porte la date)`);
  check(errors.length === 0, "S2 octets : aucune erreur dans la page");
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------- S3

/** S3 : carte mentale au doigt. */
async function s3(browser, base, tmp) {
  const { ctx, page, cdp, errors, a } = await poseAB(browser, base, tmp, "s3-avant");
  // On repart d'un seul rectangle : A (B reste, mais loin de la carte) ; A est sélectionné, « + » à 40 px à droite du côté droit.
  await tool(page, "select");
  await tapStage(page, A[0], 300);
  await waitAttr(page, "data-selection", "1");
  await page.waitForTimeout(600);
  await tapStage(page, A[2] + 40, 300);
  await page.waitForTimeout(600);
  let s = await saved(page, tmp, "s3-1.roomboard");
  check(s.elements.length === 4, `S3 : « + » de droite, une copie et une flèche de plus (4 éléments, ${s.elements.length})`);
  const el = arrows(s.elements)[0];
  const copie = rects(s.elements).find((e) => e.id !== a && e.shape.start === undefined && e.id !== undefined && el.shape.end?.id === e.id);
  check(el.look?.elbowed === true && el.shape.start?.id === a && copie !== undefined, "S3 : flèche coudée (look.elbowed) liée à A et à la copie");
  await waitAttr(page, "data-selection", "1");
  check(true, "S3 : la copie devient la sélection");
  // « + » du bas sur la copie.
  const [cx0, cy1] = [(copie.transform[4]), copie.transform[5] + copie.shape.h];
  void cx0;
  void cy1;
  const cb = await attr(page, "data-bounds");
  const [x0, y0, x1, y1] = cb.split(",").map(Number);
  const sc = 120 / (rects(s.elements)[0].shape.w); // px de scène par unité de page
  const o = [A[0] - rects(s.elements)[0].transform[4] * sc, A[1] - rects(s.elements)[0].transform[5] * sc];
  const toStage = (px, py) => [px * sc + o[0], py * sc + o[1]];
  const [sx, sy] = toStage((x0 + x1) / 2, y1);
  await tapStage(page, sx, sy + 40);
  await page.waitForTimeout(600);
  s = await saved(page, tmp, "s3-2.roomboard");
  lire("S3.nodes", rects(s.elements).length - 1);
  check(s.elements.length === 6 && rects(s.elements).length === 4, `S3 : « + » du bas, un troisième nœud de la carte (${s.elements.length} éléments, ${rects(s.elements).length} rectangles dont B hors carte)`);
  // Revenir au premier, « + » de droite : le nouveau nœud ne coupe aucune boîte.
  await tapStage(page, A[0], 300);
  await waitAttr(page, "data-selection", "1");
  await page.waitForTimeout(600);
  await tapStage(page, A[2] + 40, 300);
  await page.waitForTimeout(600);
  s = await saved(page, tmp, "s3-3.roomboard");
  const rs = rects(s.elements);
  const box = (e) => [e.transform[4], e.transform[5], e.transform[4] + e.shape.w, e.transform[5] + e.shape.h];
  const cut = (p, q) => p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3];
  const nouveau = rs[rs.length - 1];
  const overlaps = rs.filter((r) => r.id !== nouveau.id && cut(box(r), box(nouveau)));
  lire("S3.nodes.final", rs.length - 1);
  check(rs.length === 5 && overlaps.length === 0, `S3 : « + » de droite repris sur A, le nouveau nœud ne chevauche aucune boîte (${rs.length - 1} nœuds)`);
  // Glisser le premier rectangle : les connecteurs suivent.
  const avant = key(arrows(s.elements));
  await touchDrag(page, cdp, [A[0], 300], [A[0], 330]);
  s = await saved(page, tmp, "s3-4.roomboard");
  const fl = arrows(s.elements);
  check(fl.length === 3 && fl.every((f) => f.look?.elbowed === true), "S3 : trois connecteurs coudés");
  check(key(fl) !== avant, "S3 : A glissé, les connecteurs liés à A ont suivi");
  check(fl.filter((f) => f.shape.start?.id === a).every((f) => f.shape.end?.id !== undefined), "S3 : les connecteurs restent liés aux deux bouts");
  // Une étape par création.
  const n0 = s.elements.length;
  await undo(page); // le glissé de A
  await undo(page); // la dernière création : un nœud et sa flèche
  s = await saved(page, tmp, "s3-5.roomboard");
  check(s.elements.length === n0 - 2, `S3 : deux Ctrl+Z (le glissé, puis la création du dernier nœud) retirent 2 éléments (${n0} → ${s.elements.length})`);
  check(errors.length === 0, "S3 : aucune erreur dans la page");
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------------- S4

/** S4 : souris et clavier. */
async function s4(browser, base, tmp) {
  // Ctrl tenu : flèche libre ; Maj : angle à 15°.
  {
    const { ctx, page, errors } = await poseAB(browser, base, tmp, "s4a-avant");
    await tool(page, "arrow");
    await mouseDrag(page, [A[2], 300], [B[0], 300], { mods: ["Control"] });
    let s = await saved(page, tmp, "s4a-ctrl.roomboard");
    const f = arrows(s.elements)[0];
    lire("S4.ctrl.free", f.shape.start === undefined && f.shape.end === undefined ? 1 : 0);
    check(f.shape.start === undefined && f.shape.end === undefined, "S4 : flèche tirée de A vers B en tenant Ctrl : libre aux deux bouts");
    await mouseDrag(page, [500, 520], [700, 560], { mods: ["Shift"] });
    s = await saved(page, tmp, "s4a-maj.roomboard");
    const g = arrows(s.elements)[1];
    const [p0, p1] = ends(g);
    check(multipleOf15(angle(p0, p1)), `S4 : Maj tenue, angle de la flèche à ${angle(p0, p1).toFixed(1)}° (multiple de 15°)`);
    // Sans modificateur, la même flèche se lie.
    await mouseDrag(page, [A[2], 380], [B[0], 380]);
    check(errors.length === 0, "S4 : aucune erreur dans la page (Ctrl, Maj)");
    await ctx.close();
  }
  // Ctrl+Entrée, Suppr, Échap, Alt+Maj+→.
  {
    const { ctx, page, errors } = await poseAB(browser, base, tmp, "s4b-avant");
    await tool(page, "arrow");
    await mouseDrag(page, [A[2], 300], [B[0], 300]);
    await tool(page, "select");
    await mouseClick(page, [630, 300]);
    await waitAttr(page, "data-selection", "1");
    await page.keyboard.press("Control+Enter");
    await waitNonEmpty(page, "data-line-edit");
    check(true, "S4 : flèche sélectionnée, Ctrl+Entrée ouvre « Modifier les points »");
    await mouseDrag(page, MID, [MID[0], MID[1] - 70]);
    let s = await saved(page, tmp, "s4b-pt.roomboard");
    check(polyline(arrows(s.elements)[0]).length === 3, "S4 : le point milieu tiré à la souris ajoute un point");
    await page.waitForTimeout(600);
    await mouseClick(page, [MID[0], MID[1] - 70]);
    lire("S4.data-line-points", await attr(page, "data-line-points"));
    await page.keyboard.press("Delete");
    await frames(page);
    s = await saved(page, tmp, "s4b-sans.roomboard");
    check(polyline(arrows(s.elements)[0]).length === 2, "S4 : un clic sur le point, Suppr : un point de moins");
    await page.keyboard.press("Escape");
    await frames(page);
    check((await attr(page, "data-line-edit")) === "", "S4 : Échap sort de « Modifier les points »");
    // Alt+Maj+→ : objet relié à droite du rectangle sélectionné.
    await mouseClick(page, [A[0], 300]);
    await waitAttr(page, "data-selection", "1");
    const n0 = s.elements.length;
    await page.keyboard.press("Alt+Shift+ArrowRight");
    await page.waitForTimeout(500);
    s = await saved(page, tmp, "s4b-relie.roomboard");
    check(s.elements.length === n0 + 2, `S4 : rectangle sélectionné, Alt+Maj+→ crée un objet relié et sa flèche (${n0} → ${s.elements.length})`);
    check(errors.length === 0, "S4 : aucune erreur dans la page (clavier)");
    await ctx.close();
  }
  // Ctrl+D : la copie suit les copies ; flèche seule : copie libre.
  {
    const { ctx, page, errors, a, b } = await poseAB(browser, base, tmp, "s4c-avant");
    await tool(page, "arrow");
    await mouseDrag(page, [A[2], 300], [B[0], 300]);
    await tool(page, "select");
    await page.mouse.click(1200, 800); // vide : rien de sélectionné
    await mouseDrag(page, [420, 200], [1000, 420]);
    await waitAttr(page, "data-selection", "3");
    await page.keyboard.press("Control+d");
    await page.waitForTimeout(500);
    let s = await saved(page, tmp, "s4c-copie.roomboard");
    const fl = arrows(s.elements);
    const copie = fl.find((f) => f.shape.start?.id !== undefined && f.shape.start.id !== a);
    const copieRects = rects(s.elements).filter((r) => r.id !== a && r.id !== b).map((r) => r.id);
    lire("S4.copy.bound", copie !== undefined && copieRects.includes(copie.shape.start.id) && copieRects.includes(copie.shape.end?.id) ? 1 : 0);
    check(s.elements.length === 6 && copie !== undefined && copieRects.includes(copie.shape.start.id) && copieRects.includes(copie.shape.end?.id), "S4 : Ctrl+D de A, B et la flèche : la copie de la flèche est liée aux copies");
    // La flèche seule : on prend l'original, copie libre.
    await mouseClick(page, [1200, 800]);
    await mouseClick(page, [630, 300]);
    await waitAttr(page, "data-selection", "1");
    await page.keyboard.press("Control+d");
    await page.waitForTimeout(500);
    s = await saved(page, tmp, "s4c-seule.roomboard");
    const libres = arrows(s.elements).filter((f) => f.shape.start === undefined && f.shape.end === undefined);
    check(s.elements.length === 7 && libres.length === 1, `S4 : Ctrl+D de la flèche seule : copie libre (${libres.length} flèche libre sur ${arrows(s.elements).length})`);
    check(errors.length === 0, "S4 : aucune erreur dans la page (Ctrl+D)");
    await ctx.close();
  }
  // Interrupteur « Liaison des flèches » ; menu des raccourcis et Aide.
  {
    const { ctx, page, errors } = await poseAB(browser, base, tmp, "s4d-avant");
    await tool(page, "arrow");
    const sw = `${OPT} [data-option-value="arrow-binding"]`;
    await page.locator(sw).first().waitFor({ state: "visible", timeout: 15000 });
    check((await page.locator(sw).first().getAttribute("aria-checked")) === "true", "S4 : « Liaison des flèches » est active par défaut");
    await press(page, "clavier", sw);
    check((await page.locator(sw).first().getAttribute("aria-checked")) === "false", "S4 : au clavier, l'interrupteur « Liaison des flèches » est coupé");
    await mouseDrag(page, [A[2], 300], [B[0], 300]);
    const s = await saved(page, tmp, "s4d-libre.roomboard");
    const f = arrows(s.elements)[0];
    check(f.shape.start === undefined && f.shape.end === undefined, "S4 : liaison coupée, la flèche tirée sur B reste libre");
    await page.keyboard.press("?");
    await page.waitForSelector('[data-panel="aide"]', { state: "visible", timeout: 15000 });
    for (const [id, titre, touche] of [["line-edit", /Modifier les points/, /Ctrl\+Entrée/], ["linked-node", /Objet relié/, /Alt\+Maj/], ["no-binding", /Flèche sans liaison/, /Ctrl/]]) {
      const t = (await page.locator(`[data-panel="aide"] [data-shortcut-id="${id}"]`).innerText()).replace(/\s+/g, " ");
      check(titre.test(t) && touche.test(t), `S4 : l'Aide liste « ${t} »`);
    }
    await page.keyboard.press("Escape");
    check(errors.length === 0, "S4 : aucune erreur dans la page (interrupteur, Aide)");
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------------------------------------------- S6

/** S6 : la ligne au doigt. */
async function s6(browser, base, tmp) {
  const { ctx, page, cdp, errors, a, b } = await poseAB(browser, base, tmp, "s6-avant");
  await tool(page, "line");
  await touchDrag(page, cdp, [A[2], 300], [B[0], 300]);
  let s = await saved(page, tmp, "s6-lie.roomboard");
  const l = lines(s.elements)[0];
  lire("S6.start", l?.shape.start?.id);
  check(l !== undefined && l.shape.start?.id === a && l.shape.end?.id === b, "S6 : ligne glissée de A à B, liée aux deux bouts");
  check(l.look?.endArrowhead === undefined || l.look.endArrowhead === "none", "S6 : aucune pointe sur la ligne");
  await tool(page, "select");
  await tapStage(page, 630, 300);
  await waitAttr(page, "data-selection", "1");
  await choose(page, "doigt", "roundness", "round");
  await page.waitForTimeout(600);
  await doubleTouch(page, cdp, [630, 300]);
  await waitNonEmpty(page, "data-line-edit");
  check(true, "S6 : double toucher sur la ligne, « Modifier les points »");
  await touchDrag(page, cdp, MID, [MID[0], MID[1] - 60]);
  s = await saved(page, tmp, "s6-points.roomboard");
  check(polyline(lines(s.elements)[0]).length === 3, "S6 : milieu tiré de 60 px, la ligne a 3 points");
  check(lines(s.elements)[0].look?.roundness === "round", "S6 : Angles → Arrondis, la ligne est une courbe (look.roundness = round)");
  await tapStage(page, 700, 760);
  check((await attr(page, "data-line-edit")) === "", "S6 : toucher hors de l'objet sort de l'édition");
  const avant = key(s.elements);
  await page.waitForTimeout(600);
  await touchDrag(page, cdp, [A[0], 300], [A[0], 200]);
  s = await saved(page, tmp, "s6-suit.roomboard");
  const A1 = rects(s.elements).find((e) => e.id === a);
  const [dep] = ends(lines(s.elements)[0]);
  check(near(dep[1], A1.transform[5] + A1.shape.h / 2) && near(dep[0], A1.transform[0 + 4] + A1.shape.w + 7), "S6 : A glissée, le départ de la ligne suit");
  await undo(page);
  s = await saved(page, tmp, "s6-annule.roomboard");
  check(key(s.elements) === avant, "S6 : Ctrl+Z, A et la ligne reviennent");
  check(lines(s.elements)[0].look?.endArrowhead === undefined || lines(s.elements)[0].look.endArrowhead === "none", "S6 : toujours aucune pointe");
  check(errors.length === 0, "S6 : aucune erreur dans la page");
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------------- lot 2a (S7 à S9)

const D = [800, 250, 920, 350]; // losange de 120 × 100 px, à la place de B
const diamonds = (els) => els.filter((e) => e.shape?.shape === "diamond");
const closedLines = (els) => lines(els).filter((e) => e.shape.polygon === true);
/** Sommets d'une ligne : départ, points intérieurs, arrivée. */
const vertices = (e) => 2 + (e.shape.points?.length ?? 0) / 2;
const sel = async (page) => attr(page, "data-selection");
/** Pose un losange au doigt de la boîte `[x0, y0, x1, y1]`. */
async function diamond(page, cdp, [x0, y0, x1, y1]) {
  await tool(page, "diamond");
  await touchDrag(page, cdp, [x0, y0], [x1, y1]);
}
/** Page neuve avec le rectangle A et le losange D posés au doigt. */
async function poseAD(browser, base, tmp, name, opts = {}) {
  const h = await newPage(browser, base, opts);
  await rect(h.page, h.cdp, A);
  await diamond(h.page, h.cdp, D);
  const s = await saved(h.page, tmp, `${name}.roomboard`);
  check(rects(s.elements).length === 1 && diamonds(s.elements).length === 1, `${name} : un rectangle et un losange posés au doigt`);
  return { ...h, a: rects(s.elements)[0].id, d: diamonds(s.elements)[0].id };
}

/** S7 : le losange au doigt, accroché par la flèche. */
async function s7(browser, base, tmp) {
  const { ctx, page, cdp, errors, a, d } = await poseAD(browser, base, tmp, "s7-avant");
  let s = await saved(page, tmp, "s7-pose.roomboard");
  lire("S7.diamond", diamonds(s.elements).length);
  check(diamonds(s.elements).length === 1, "S7 : Losange pris dans la barre, glissé au doigt : un losange (shape « diamond »)");
  // Coin de la boîte, hors du losange : rien n'est sélectionné.
  await tool(page, "select");
  await tapStage(page, D[0] + 6, D[1] + 6);
  lire("S7.corner", (await sel(page)) === "1" ? "selected" : "none");
  check((await sel(page)) !== "1", "S7 : toucher dans un coin de la boîte, hors du losange : rien n'est sélectionné");
  await tapStage(page, 860, 300);
  await waitAttr(page, "data-selection", "1");
  check(true, "S7 : toucher au centre du losange : sélectionné");
  // Flèche de A vers le losange : accrochée, pointe à l'écart.
  await tool(page, "arrow");
  await touchDrag(page, cdp, [A[2], 300], [D[0] + 8, 300]);
  s = await saved(page, tmp, "s7-lie.roomboard");
  const f = arrows(s.elements)[0];
  const dm = diamonds(s.elements)[0];
  lire("S7.end", f?.shape.end?.id);
  check(f !== undefined && f.shape.end?.id === d && f.shape.start?.id === a, "S7 : flèche glissée de A vers le losange : début lié à A, fin liée au losange");
  const [, p1] = ends(f);
  const gap = dm.transform[4] - p1[0];
  lire("S7.gap", gap.toFixed(0));
  check(near(gap, 7, 0.8), `S7 : la pointe est à 5 + épaisseur / 2 du contour (${gap.toFixed(2)})`);
  // Glisser le losange de 150 px : la fin suit ; annuler : une étape.
  await tool(page, "select");
  const avant = key(s.elements);
  await touchDrag(page, cdp, [860, 300], [860, 450]);
  s = await saved(page, tmp, "s7-suit.roomboard");
  const f2 = arrows(s.elements)[0];
  check(Math.abs((diamonds(s.elements)[0].transform[5] - dm.transform[5]) * (120 / dm.shape.w) - 150) < 3, "S7 : losange glissé de 150 px");
  check(key([f2]) !== key([f]) && f2.shape.end?.id === d, "S7 : la fin de la flèche suit le losange");
  await undo(page);
  s = await saved(page, tmp, "s7-annule.roomboard");
  check(key(s.elements) === avant, "S7 : Ctrl+Z, une seule étape : le losange et la flèche reviennent");
  // Second doigt tardif pendant le tracé : w = h.
  await tool(page, "diamond");
  await touchDragWithLateFinger(page, cdp, [450, 500], [590, 580], [700, 700]);
  s = await saved(page, tmp, "s7-carre.roomboard");
  const sq = diamonds(s.elements).find((e) => e.id !== d);
  lire("S7.square", sq === undefined ? "absent" : `${sq.shape.w.toFixed(0)}x${sq.shape.h.toFixed(0)}`);
  check(sq !== undefined && near(Math.abs(sq.shape.w), Math.abs(sq.shape.h), 1), "S7 : second doigt tardif pendant le tracé d'un losange : w = h");
  check(errors.length === 0, "S7 : aucune erreur dans la page");
  await ctx.close();
}

/** S8 : « Modifier les points » d'une forme, au doigt. */
async function s8(browser, base, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base).then(async (h) => {
    await tool(h.page, "rect");
    await press(h.page, "doigt", `${OPT} [data-option="background"] [data-option-value]:not([data-option-value="transparent"])`);
    await touchDrag(h.page, h.cdp, [A[0], A[1]], [A[2], A[3]]);
    await tool(h.page, "ellipse");
    await touchDrag(h.page, h.cdp, [B[0], B[1]], [B[2], B[3]]);
    return h;
  });
  let s = await saved(page, tmp, "s8-avant.roomboard");
  const r0 = rects(s.elements)[0];
  const avant = key(s.elements);
  await tool(page, "select");
  await tapStage(page, A[0] + 60, 300);
  await waitAttr(page, "data-selection", "1");
  await page.waitForTimeout(600);
  // C4b : le double toucher sur une forme ne convertit plus (réservé au texte, lot 2b) ; le bouton du panneau convertit.
  await doubleTouch(page, cdp, [A[0] + 60, 300]);
  await page.waitForTimeout(400);
  check((await attr(page, "data-line-edit")) === "" && closedLines((await saved(page, tmp, "s8-double.roomboard")).elements).length === 0, "S8 : double toucher sur un rectangle : aucune conversion");
  await press(page, "doigt", `${OPT} [data-section="points"] [data-option-value="line-edit"]`);
  await waitNonEmpty(page, "data-line-edit");
  s = await saved(page, tmp, "s8-ligne.roomboard");
  const l = closedLines(s.elements)[0];
  lire("S8.polygon", l?.shape.polygon === true ? 1 : 0);
  lire("S8.vertices", l ? vertices(l) : 0);
  check(l !== undefined && l.id === r0.id && l.shape.shape === "line", "S8 : bouton « Modifier les points » sur un rectangle : même id, shape « line », polygon true");
  check(r0.shape.fill !== null, `S8 : le rectangle de départ est rempli (${JSON.stringify(r0.shape.fill)})`);
  check(vertices(l) === 4 && JSON.stringify(l.shape.fill) === JSON.stringify(r0.shape.fill), `S8 : 4 sommets, fond gardé (${JSON.stringify(l.shape.fill)})`);
  await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await frames(page);
  const pts = polyline(l);
  const sc = 120 / Math.abs(r0.shape.w);
  const o = [A[0] - r0.transform[4] * sc, A[1] - r0.transform[5] * sc];
  const st = ([x, y]) => [x * sc + o[0], y * sc + o[1]];
  // Un coin tiré de 60 px (le dernier sommet), puis le milieu du segment de fermeture (dernier → premier).
  const coin = st(pts[2]);
  await touchDrag(page, cdp, coin, [coin[0] + 60, coin[1] + 60]);
  await page.waitForTimeout(600);
  const fermeture = [(st(pts[3])[0] + st(pts[0])[0]) / 2, (st(pts[3])[1] + st(pts[0])[1]) / 2];
  await touchDrag(page, cdp, fermeture, [fermeture[0] + 50, fermeture[1]]);
  s = await saved(page, tmp, "s8-points.roomboard");
  const l2 = closedLines(s.elements)[0];
  lire("S8.after", l2 ? vertices(l2) : 0);
  check(l2 !== undefined && vertices(l2) === 5, "S8 : un coin tiré de 60 px, puis le milieu du segment de fermeture : 5 sommets");
  for (let i = 0; i < 3; i++) await undo(page);
  s = await saved(page, tmp, "s8-annule.roomboard");
  const back = rects(s.elements)[0];
  lire("S8.undo", back?.shape.shape);
  check(key(s.elements) === avant && back?.id === r0.id, "S8 : annuler trois fois : le rectangle d'origine");
  // Ellipse : bouton « Modifier les points » du panneau.
  await page.keyboard.press("Escape");
  await frames(page);
  await tool(page, "select");
  await tapStage(page, B[0] + 60, 300);
  await waitAttr(page, "data-selection", "1");
  await press(page, "doigt", `${OPT} [data-section="points"] [data-option-value="line-edit"]`);
  await waitNonEmpty(page, "data-line-edit");
  s = await saved(page, tmp, "s8-ellipse.roomboard");
  const e = closedLines(s.elements)[0];
  lire("S8.ellipse", e ? vertices(e) : 0);
  check(e !== undefined && vertices(e) === 16, "S8 : ellipse, bouton « Modifier les points » du panneau : 16 sommets");
  check(errors.length === 0, "S8 : aucune erreur dans la page");
  await ctx.close();
}

/** S9 : souris, clavier ; objet relié sur losange. */
async function s9(browser, base, tmp) {
  {
    const { ctx, page, errors } = await newPage(browser, base).then(async (h) => {
      await diamond(h.page, h.cdp, D);
      return h;
    });
    await tool(page, "select");
    await mouseClick(page, [860, 300]);
    await waitAttr(page, "data-selection", "1");
    await page.keyboard.press("Control+Enter");
    await waitNonEmpty(page, "data-line-edit");
    let s = await saved(page, tmp, "s9-ferme.roomboard");
    check(closedLines(s.elements).length === 1 && vertices(closedLines(s.elements)[0]) === 4, "S9 : losange sélectionné à la souris, Ctrl+Entrée : ligne fermée à 4 sommets");
    await mouseClick(page, [860, 250]);
    await page.keyboard.press("Delete");
    await frames(page);
    s = await saved(page, tmp, "s9-trois.roomboard");
    lire("S9.after", vertices(closedLines(s.elements)[0]));
    check(vertices(closedLines(s.elements)[0]) === 3, "S9 : clic sur un sommet, Suppr : 3 sommets");
    await mouseClick(page, [920, 300]);
    await page.keyboard.press("Delete");
    await frames(page);
    s = await saved(page, tmp, "s9-refuse.roomboard");
    lire("S9.refuse", vertices(closedLines(s.elements)[0]));
    check(vertices(closedLines(s.elements)[0]) === 3, "S9 : un second Suppr sur 3 sommets ne retire rien");
    await page.keyboard.press("Escape");
    await frames(page);
    check((await attr(page, "data-line-edit")) === "", "S9 : Échap sort de « Modifier les points »");
    check(errors.length === 0, "S9 : aucune erreur dans la page (souris, clavier)");
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await newPage(browser, base).then(async (h) => {
      await diamond(h.page, h.cdp, A);
      return h;
    });
    await tool(page, "select");
    await mouseClick(page, [510, 300]);
    await waitAttr(page, "data-selection", "1");
    await page.keyboard.press("Alt+Shift+ArrowRight");
    await page.waitForTimeout(500);
    const s = await saved(page, tmp, "s9-relie.roomboard");
    const kinds = diamonds(s.elements).length;
    const f = arrows(s.elements)[0];
    lire("S9.linked", kinds === 2 ? "diamond" : `${kinds} losange(s)`);
    check(s.elements.length === 3 && kinds === 2 && f?.shape.end !== undefined, "S9 : Alt+Maj+→ sur un losange : objet relié (losange copié) et sa flèche");
    check(errors.length === 0, "S9 : aucune erreur dans la page (objet relié)");
    await ctx.close();
  }
}

/** Cibles de 44 px et netteté § 10 (2x) de l'icône Losange et du bouton « Modifier les points » sur une forme. */
async function cibles2a(browser, base, tmp) {
  const { ctx, page, cdp, errors } = await poseAD(browser, base, tmp, "cibles2a", { scale: 2 });
  await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await tool(page, "select");
  await tapStage(page, 860, 300);
  await waitAttr(page, "data-selection", "1");
  const mesures = [];
  for (const [nom, sel] of [["Losange", item("diamond")], ["Modifier les points", `${OPT} [data-option-value="line-edit"]`]]) {
    const bb = await page.locator(sel).first().boundingBox();
    if (bb === null) throw new Echec(`cible ${nom} : introuvable (${sel})`);
    check(bb.width >= 43.5 && bb.height >= 43.5, `cible ${nom} : ${Math.round(bb.width)} × ${Math.round(bb.height)} px (≥ 44)`);
    mesures.push(`${nom} ${Math.round(bb.width)}x${Math.round(bb.height)}`);
  }
  lire("cibles2a", mesures.join(" ; "));
  const fr = [];
  for (const [nom, sel] of [["diamond", item("diamond")], ["edit-points-forme", `${OPT} [data-option-value="line-edit"]`]]) {
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
    await frames(page);
    const box = await page.locator(`${sel} svg.rb-icon`).first().boundingBox();
    const px = await pixelsOf(page, box);
    const { ink } = await colorsOf(page, sel);
    const f = fringes(px, [px.data[0], px.data[1], px.data[2]], rgbOf(ink));
    fr.push(`${nom} ${f}`);
    console.log(`netteté — ${nom} : frange ${f}`);
  }
  check(fr.every((m) => m.endsWith(" 0")), `netteté § 10 : 0 frange colorée (${fr.join(" ; ")})`);
  void cdp;
  check(errors.length === 0, "cibles2a : aucune erreur dans la page");
  await ctx.close();
}

/** Captures du lot 2a, à 2x. */
async function captures2a(browser, base, tmp) {
  const MASK = { x: VIEWPORT.width - 10, y: VIEWPORT.height - 10 };
  const loin = (page) => page.mouse.move(MASK.x, MASK.y);
  {
    const { ctx, page, cdp } = await poseAD(browser, base, tmp, "cap-losange", { scale: 2 });
    await tool(page, "select");
    await tapStage(page, 860, 300);
    await waitAttr(page, "data-selection", "1");
    await loin(page);
    await shoot(page, "apres-losange", { x: 0, y: 0, width: 1060, height: 520 });
    // Flèche liée, pointe à l'écart du contour.
    await tool(page, "arrow");
    await touchDrag(page, cdp, [A[2], 300], [D[0] + 8, 300]);
    await tool(page, "select");
    await tapStage(page, 685, 300);
    await loin(page);
    await shoot(page, "apres-losange-lie", VUE);
    await ctx.close();
  }
  {
    const h = await newPage(browser, base, { scale: 2 });
    await rect(h.page, h.cdp, A);
    await tool(h.page, "select");
    await tapStage(h.page, A[0] + 60, 300);
    await waitAttr(h.page, "data-selection", "1");
    await h.page.waitForTimeout(600);
    await press(h.page, "doigt", `${OPT} [data-section="points"] [data-option-value="line-edit"]`);
    await waitNonEmpty(h.page, "data-line-edit");
    await loin(h.page);
    await shoot(h.page, "apres-forme-points", { x: 0, y: 0, width: 1060, height: 520 });
    await h.ctx.close();
  }
  {
    const h = await newPage(browser, base, { scale: 2 });
    await tool(h.page, "ellipse");
    await touchDrag(h.page, h.cdp, [B[0], B[1]], [B[2], B[3]]);
    await tool(h.page, "select");
    await tapStage(h.page, B[0] + 60, 300);
    await waitAttr(h.page, "data-selection", "1");
    await press(h.page, "doigt", `${OPT} [data-section="points"] [data-option-value="line-edit"]`);
    await waitNonEmpty(h.page, "data-line-edit");
    await loin(h.page);
    await shoot(h.page, "apres-forme-points-ellipse", { x: 0, y: 0, width: 1060, height: 520 });
    await h.ctx.close();
  }
}

// ------------------------------------------------------------------------------------------------ cibles et netteté

/** Cibles de 44 × 44 px au moins pour les boutons neufs. */
async function cibles(browser, base, tmp) {
  const { ctx, page, cdp, errors } = await poseAB(browser, base, tmp, "cibles");
  await tool(page, "arrow");
  const mesures = [];
  const mesure = async (sel, nom) => {
    const bb = await page.locator(sel).first().boundingBox();
    if (bb === null) throw new Echec(`cible ${nom} : introuvable (${sel})`);
    mesures.push(`${nom} ${Math.round(bb.width)}x${Math.round(bb.height)}`);
    check(bb.width >= 43.5 && bb.height >= 43.5, `cible ${nom} : ${Math.round(bb.width)} × ${Math.round(bb.height)} px (≥ 44)`);
  };
  for (const v of ["sharp", "round", "elbow"]) await mesure(opt("arrowType", v), `Type de flèche ${v}`);
  await mesure(`${OPT} [data-option-value="arrow-binding"]`, "Liaison des flèches");
  await touchDrag(page, cdp, [A[2], 300], [B[0], 300]);
  await tool(page, "select");
  await tapStage(page, 630, 300);
  await waitAttr(page, "data-selection", "1");
  await mesure(`${OPT} [data-option-value="line-edit"]`, "Modifier les points");
  await page.waitForTimeout(600);
  await doubleTouch(page, cdp, [630, 300]);
  await waitNonEmpty(page, "data-line-edit");
  await touchDrag(page, cdp, MID, [MID[0], MID[1] - 80]);
  await page.waitForTimeout(600);
  await tapStage(page, MID[0], MID[1] - 80);
  await waitAttr(page, "data-line-points", "1"); // C3 : le moteur republie l'état après chaque geste de l'éditeur
  check(await pointRemoveVisible(page), "cibles : point choisi au doigt, « Retirer le point » apparaît (data-line-points = 1)");
  await mesure(`${OPT} [data-option-value="point-remove"]`, "Retirer le point");
  lire("cibles", mesures.join(" ; "));
  check(errors.length === 0, "cibles : aucune erreur dans la page");
  await ctx.close();
}

const pointRemoveVisible = (page) =>
  page.locator(`${OPT} [data-option-value="point-remove"]`).first().waitFor({ state: "visible", timeout: 2000 }).then(() => true, () => false);
const WHITE = hex("#ffffff");
const rgbOf = (s) => (s.match(/\d+/g) ?? [0, 0, 0]).slice(0, 3).map(Number);
async function colorsOf(page, sel) {
  return page.evaluate((q) => {
    const b = document.querySelector(q);
    const svg = b.querySelector("svg") ?? b;
    return { bg: getComputedStyle(b).backgroundColor, ink: getComputedStyle(svg).color };
  }, sel);
}
async function contreEpreuve(page) {
  await page.evaluate(() => {
    const ns = "http://www.w3.org/2000/svg";
    const host = document.createElement("div");
    host.id = "temoin-nettete";
    host.style.cssText = "position:fixed;left:200px;top:400px;width:24px;height:24px;background:#ffffff;color:#182946;z-index:50";
    const svg = document.createElementNS(ns, "svg");
    for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: "24", height: "24", fill: "none", stroke: "currentColor", "stroke-width": "1.5" })) svg.setAttribute(k, v);
    svg.style.display = "block";
    const r = document.createElementNS(ns, "rect");
    for (const [k, v] of Object.entries({ width: "18", height: "18", x: "3.3", y: "3.3", rx: "2" })) r.setAttribute(k, v);
    svg.append(r);
    host.append(svg);
    document.body.append(host);
  });
  await frames(page);
  const px = await pixelsOf(page, { x: 200, y: 400, width: 24, height: 24 });
  const row = edgeRow(px, 24, 0, px.width, WHITE, hex("#182946"));
  await page.evaluate(() => document.getElementById("temoin-nettete")?.remove());
  check(row.intermediate >= 2, `contre-épreuve : le témoin flou donne ${row.intermediate} pixels intermédiaires (≥ 2), la mesure n'est pas aveugle`);
}
/** Netteté § 10 à 2x des icônes neuves : 0 frange colorée, puis contre-épreuve. */
async function nettete(browser, base, tmp) {
  const { ctx, page, cdp, errors } = await poseAB(browser, base, tmp, "nettete", { scale: 2 });
  await tool(page, "arrow");
  await touchDrag(page, cdp, [A[2], 300], [B[0], 300]);
  await tool(page, "select");
  await tapStage(page, 630, 300);
  await waitAttr(page, "data-selection", "1");
  await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await frames(page);
  const icones = [
    ["arrow-type-sharp", opt("arrowType", "sharp")],
    ["arrow-type-round", opt("arrowType", "round")],
    ["arrow-type-elbow", opt("arrowType", "elbow")],
    ["head-bar", `${OPT} [data-option-value="bar"]`],
    ["head-circle", `${OPT} [data-option-value="circle"]`],
    ["head-circle-outline", `${OPT} [data-option-value="circle_outline"]`],
    ["arrow-binding", `${OPT} [data-option-value="arrow-binding"]`],
    ["edit-points", `${OPT} [data-option-value="line-edit"]`],
  ];
  const mesures = [];
  const mesurer = async ([nom, sel]) => {
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
    await frames(page);
    const box = await page.locator(`${sel} svg.rb-icon`).first().boundingBox();
    const px = await pixelsOf(page, box);
    const { ink } = await colorsOf(page, sel);
    const bg = [px.data[0], px.data[1], px.data[2]];
    const f = fringes(px, bg, rgbOf(ink));
    mesures.push(`${nom} ${f}`);
    console.log(`netteté — ${nom} : frange ${f}`);
    return f;
  };
  for (const ic of icones) await mesurer(ic);
  // point-remove : visible en édition, un point choisi.
  await page.waitForTimeout(600);
  await doubleTouch(page, cdp, [630, 300]);
  await waitNonEmpty(page, "data-line-edit");
  await touchDrag(page, cdp, MID, [MID[0], MID[1] - 80]);
  await page.waitForTimeout(600);
  await tapStage(page, MID[0], MID[1] - 80);
  await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await frames(page);
  await waitAttr(page, "data-line-points", "1");
  check(await pointRemoveVisible(page), "netteté : « Retirer le point » visible, un point choisi");
  await mesurer(["point-remove", `${OPT} [data-option-value="point-remove"]`]);
  const bad = mesures.filter((m) => !m.endsWith(" 0"));
  check(bad.length === 0, `netteté § 10 : 0 frange colorée pour les icônes neuves (${mesures.join(" ; ")})`);
  await contreEpreuve(page);
  check(errors.length === 0, "netteté : aucune erreur dans la page");
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------------------- captures

async function shoot(page, nom, clip) {
  mkdirSync(OUT, { recursive: true });
  await frames(page);
  await page.screenshot({ path: join(OUT, `${nom}.png`), clip, animations: "disabled", caret: "hide", scale: "device" });
  console.log(`capture : ${join(OUT, `${nom}.png`)}`);
}
const VUE = { x: 400, y: 150, width: 640, height: 330 };

/** Captures à 2x : « avant » (flèche libre, panneau) ou « apres » (liée, points, coudée, carte, panneau). */
async function captures(browser, base, tmp, nom) {
  const { ctx, page, cdp, errors } = await poseAB(browser, base, tmp, `cap-${nom}`, { scale: 2 });
  await tool(page, "arrow");
  if (nom === "avant") {
    await touchDrag(page, cdp, [A[2], 300], [B[0], 300]);
    await shoot(page, "avant-fleche", VUE);
    await tool(page, "arrow");
    await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
    await shoot(page, "avant-panneau-fleche", { x: 0, y: 0, width: 420, height: 700 });
    await ctx.close();
    return errors;
  }
  const end = await touchDrag(page, cdp, [A[2], 300], [B[0] + 20, 300], { hold: true });
  await shoot(page, "apres-fleche-liee", VUE);
  await end();
  await tool(page, "select");
  await tapStage(page, 630, 300);
  await waitAttr(page, "data-selection", "1");
  await page.waitForTimeout(600);
  await doubleTouch(page, cdp, [630, 300]);
  await waitNonEmpty(page, "data-line-edit");
  await touchDrag(page, cdp, MID, [MID[0], MID[1] - 80]);
  await choose(page, "doigt", "arrowType", "round");
  await shoot(page, "apres-modifier-points", VUE);
  await page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await shoot(page, "apres-panneau-fleche", { x: 0, y: 0, width: 420, height: 700 });
  await tapStage(page, 700, 760);
  await ctx.close();
  // Coudée : B plus bas que A.
  const c = await newPage(browser, base, { scale: 2 });
  await rect(c.page, c.cdp, A);
  await rect(c.page, c.cdp, [800, 420, 920, 520]);
  await tool(c.page, "arrow");
  await touchDrag(c.page, c.cdp, [A[2], 300], [800, 470]);
  await tool(c.page, "select");
  await tapStage(c.page, 685, 385);
  await c.page.waitForTimeout(600);
  await choose(c.page, "doigt", "arrowType", "elbow");
  await c.page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await shoot(c.page, "apres-fleche-coudee", { x: 400, y: 150, width: 640, height: 420 });
  await c.ctx.close();
  // Carte mentale : « + » visibles, puis trois nœuds.
  const m = await newPage(browser, base, { scale: 2 });
  await rect(m.page, m.cdp, A);
  await tool(m.page, "select");
  await tapStage(m.page, A[0], 300);
  await waitAttr(m.page, "data-selection", "1");
  await m.page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await shoot(m.page, "apres-carte-plus", { x: 380, y: 150, width: 560, height: 330 });
  await tapStage(m.page, A[2] + 40, 300);
  await m.page.waitForTimeout(600);
  await tapStage(m.page, 693, 390);
  await m.page.waitForTimeout(600);
  await m.page.mouse.move(VIEWPORT.width - 10, VIEWPORT.height - 10);
  await shoot(m.page, "apres-carte", { x: 380, y: 150, width: 700, height: 480 });
  await m.ctx.close();
  return errors;
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
  const { existsSync } = await import("node:fs");
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
  const tmp = mkdtempSync(join(tmpdir(), "og12-essai-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    if (wantCaptures) {
      const errs = await captures(browser, base, tmp, nom);
      if (nom === "apres") await captures2a(browser, base, tmp);
      if (errs.length) console.log(`captures : erreurs de page : ${errs.join(" | ")}`);
      return 0;
    }
    const only = arg("--only");
    const on = (n) => only === undefined || only === n;
    if (on("s1")) await s1(browser, base, tmp);
    if (on("s2")) await s2(browser, base, tmp);
    if (on("s3")) await s3(browser, base, tmp);
    if (on("s4")) await s4(browser, base, tmp);
    if (on("s6")) await s6(browser, base, tmp);
    if (on("s7")) await s7(browser, base, tmp);
    if (on("s8")) await s8(browser, base, tmp);
    if (on("s9")) await s9(browser, base, tmp);
    if (on("cibles")) await cibles(browser, base, tmp);
    if (on("nettete")) await nettete(browser, base, tmp);
    if (on("cibles2a")) await cibles2a(browser, base, tmp);
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
