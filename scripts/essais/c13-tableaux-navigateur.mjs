#!/usr/bin/env node
// Essai C13 lot 1 au navigateur (S1 à S5 du cadrage usage-c13-lot1-svg-iwb-ubz) : déposer un .iwb ZIP et un .iwb SVG
// brut générés ici, voir les pages et les avertissements ; déposer un .ubz généré et l'éditer ; « Enregistrer une copie
// au format » .iwb puis .ubz, rouvrir chaque copie, retrouver les objets et réécrire la même copie ; enregistrer en
// .roomboard puis rouvrir ; socle-v1.roomboard (d'avant C13) s'ouvre ; fichier hostile : rien n'est exécuté ni chargé.
// Application construite servie avec la CSP de la coque, Chromium headless, repli (`?fichiers=repli`), heure figée ;
// toute requête hors de 127.0.0.1 est comptée et coupée. Code : 0 réussi, 1 échec, 2 outil absent.
// Lot 2 (S1 à S3 de usage-c13-lots2-3) : un .notebook et un .olf fabriqués ici sont déposés, pages et avertissements lus,
// enregistrés en .roomboard puis rouverts ; .flipchart signé Bamboo refusé ; fichiers hostiles ; socle-v1.roomboard.
// Lot 3 (S4 et S5 de usage-c13-lots2-3) : des .flipchart générés par la fabrique de T12 sont déposés (pages, avis, aller-retour
// .roomboard) ; des .flipchart hostiles (bombe, taille mensongère, .fpg imbriqué, trop d'entrées…) sont refusés sans plantage.
// Usage : node scripts/essais/c13-tableaux-navigateur.mjs [--captures <leçon.iwb>] [--captures-notebook]
// (docs/essais/c13-iwb-lecon.png : la leçon, hors dépôt, n'est jamais copiée ; docs/essais/c13-notebook-lecon.png :
// .notebook fabriqué). Sans option, aucune capture n'est réécrite.
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { deflateSync, inflateSync } from "node:zlib";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, serve, solidPng, stageBox, stageMouse } from "./commun.mjs";
import { bambooContainer, makeFlipchart } from "./fabriques/flipchart.mjs";
import { flipPages, iwbRaw3, iwbZip, nbSvg, notebookZip, olfZip, ubzZip } from "./fabriques/tableaux.mjs";

const LABEL = "C13 tableaux";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const SOCLE = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "socle-v1.roomboard");
const { zipSync, unzipSync } = createRequire(join(ROOT, "apps", "web", "package.json"))("fflate");
const enc = (s) => Buffer.from(s, "utf8");
/** S5 : DOCTYPE à entité externe, script, onload, image distante : 2 objets lus, rien d'exécuté ni chargé. */
const hostileIwb = () => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE iwb [<!ENTITY e SYSTEM "file:///etc/passwd">]>
<iwb xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0"><svg:svg viewbox="0 0 800 600"><svg:pageset><svg:page id="p1">
<svg:text x="10" y="40">avant &e; après</svg:text>
<svg:script>window.__pwned = 1</svg:script>
<svg:rect x="10" y="100" width="50" height="50" fill="red" onload="window.__pwned = 2"/>
<svg:image xlink:href="http://exemple.invalid/x.png" x="100" y="100" width="50" height="50"/>
</svg:page></svg:pageset></svg:svg></iwb>`;

// ---- Lot 2 (C13) : .notebook SMART et .olf myViewBoard, fabriqués ici (jamais un fichier d'exemple). ----

/** S3 : DOCTYPE à entité externe, script, entrée ZIP `../evil.png`. */
function hostileNotebook() {
  const head = '<!DOCTYPE svg [<!ENTITY e SYSTEM "file:///etc/passwd">]>';
  const page = nbSvg('<text x="10" y="40">avant &e; après</text><script>window.__pwned = 1</script><rect x="10" y="100" width="50" height="50" fill="red" onload="window.__pwned = 2"/>', head);
  return Buffer.from(zipSync({ "page0.svg": enc(page), "../evil.png": solidPng(4, 4, [1, 2, 3]) }));
}

/** S3 : `content.json` illisible. */
const badOlf = () => Buffer.from(zipSync({ "content.json": enc("{") }));
/** S3 : `content.json` de 64 Mio + 1 (espaces, compressés par le ZIP). */
const bigOlf = () => Buffer.from(zipSync({ "content.json": Buffer.concat([enc('{"olf":{"pageset":[]}}'), Buffer.alloc(64 * 1024 * 1024, 0x20)]) }));
/** S3 : `content.json` de 200 000 niveaux. */
const deepOlf = () => Buffer.from(zipSync({ "content.json": enc(`{"olf":{"pageset":[]},"x":${"[".repeat(200000)}${"]".repeat(200000)}}`) }));
/** S3 : ZIP sans page ni contenu de tableau. */
const emptyNotebook = () => Buffer.from(zipSync({ "lisez-moi.txt": enc("rien") }));
/** S3 : paperboard ActivInspire fabriqué (signature `Bamboo` + 32 octets). */
const flipchart = () => Buffer.concat([enc(" Bamboo "), Buffer.alloc(32)]);

// ---- Lot 3 (C13) : .flipchart fabriqués par la fabrique de T12 (jamais un fichier d'exemple). ----
const flip = (pages, opts) => Buffer.from(makeFlipchart(pages, deflateSync, opts));
/** Entrées d'un conteneur Bamboo (lecture de l'essai seul : fabrique de tests, tailles et noms connus). */
function bambooEntriesOf(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let at = 8 + 2;
  const qstr = () => {
    const n = dv.getUint32(at, true);
    at += 4 + n;
    return Buffer.from(buf.subarray(at - n, at)).toString("utf16le");
  };
  qstr();
  at += 8;
  const out = [];
  while (at < buf.length) {
    const name = qstr();
    qstr();
    qstr();
    qstr();
    at += 8;
    const compressed = buf[at++] === 1;
    const len = Number(dv.getBigUint64(at, true));
    at += 8;
    const stored = buf.subarray(at, at + len);
    at += len;
    out.push({ name, compressed, data: compressed ? inflateSync(stored.subarray(4)) : stored });
  }
  return out;
}
const enter = (entries, name, fn) => entries.map((e) => (e.name === name ? { ...e, data: fn(e.data) } : e));
/** S5 : flux d'objets de `levels` niveaux d'objets embarqués (au-delà de 32, le lecteur écarte et compte). */
function deepStream(levels, type) {
  const parts = [Buffer.from(" Bamboo "), Buffer.from([1, 0, 7, 0])];
  for (let k = 0; k < levels - 1; k++) {
    const head = Buffer.alloc(16);
    head.write("O", 0);
    head.writeUInt16LE(type, 1);
    head.write("M", 7);
    head.writeUInt32LE(1, 8);
    head.writeUInt32LE(8 + 14 + 26 * (levels - 2 - k), 12);
    parts.push(head, Buffer.from([0x6d, 0x50, 2, 0, 127, 0, 4, 0]));
  }
  const tail = Buffer.alloc(14);
  tail.write("O", 0);
  tail.writeUInt16LE(type, 1);
  tail.write("M", 7);
  tail.write("po", 12);
  parts.push(tail, Buffer.from("po".repeat(levels - 1)));
  return Buffer.concat(parts);
}
/** S5 : une page à deux rectangles dont le flux du second (1013.io) est une chaîne de 40 objets embarqués. */
function deepFlipchart() {
  const root = bambooEntriesOf(makeFlipchart([{ rects: [{ x: 5, y: 5, w: 40, h: 30, fill: 0x00ff00 }, { x: 60, y: 5, w: 40, h: 30, fill: 0xff0000 }] }], deflateSync));
  const page = bambooEntriesOf(root.find((e) => e.name === "1003.fpg").data);
  const patched = enter(page, "1013.io", () => deepStream(40, 7));
  const fpg = bambooContainer(patched.map(({ name, data, compressed }) => ({ name, data, compressed })), deflateSync);
  return Buffer.from(bambooContainer(enter(root, "1003.fpg", () => fpg).map(({ name, data, compressed }) => ({ name, data, compressed })), deflateSync));
}

const NUMERIC = ["x", "y", "width", "height", "cx", "cy", "rx", "ry", "x1", "y1", "x2", "y2", "stroke-width", "font-size"];
function tagsOf(xml) {
  const out = [];
  for (const m of xml.matchAll(/<((?:svg:)?(?:rect|ellipse|line|polyline|textarea|tspan|image|g|foreignObject))\b([^>]*?)\/?>/g)) {
    const attrs = {};
    for (const a of m[2].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    out.push({ tag: m[1], attrs });
  }
  return out;
}
const textsOf = (xml) => [...xml.matchAll(/<(?:svg:)?tspan\b[^>]*>([\s\S]*?)<\/(?:svg:)?tspan>/g), ...xml.matchAll(/<itemTextContent>([\s\S]*?)<\/itemTextContent>/g)].map((m) => m[1]);
/** S4 : la copie réécrite après réouverture est la même : balises, formes à 1 px, traits à 2 px, textes et segments. */
function sameDrawing(a, b, label) {
  const ta = tagsOf(a);
  const tb = tagsOf(b);
  if (ta.length !== tb.length) throw new Echec(`${label} : ${ta.length} balises avant, ${tb.length} après`);
  ta.forEach((x, i) => {
    const y = tb[i];
    if (x.tag !== y.tag) throw new Echec(`${label} : balise ${i} ${x.tag} devenue ${y.tag}`);
    for (const k of NUMERIC) {
      if (k in x.attrs && Math.abs(Number(x.attrs[k]) - Number(y.attrs[k])) > 1) throw new Echec(`${label} : ${x.tag} ${k} ${x.attrs[k]} → ${y.attrs[k]} (plus de 1 px)`);
    }
    if ("points" in x.attrs) {
      const p = x.attrs.points.split(/[\s,]+/).map(Number);
      const q = (y.attrs.points ?? "").split(/[\s,]+/).map(Number);
      if (p.length !== q.length || p.some((v, k) => Math.abs(v - q[k]) > 2)) throw new Echec(`${label} : trait ${i} déplacé de plus de 2 px`);
    }
    for (const k of ["fill", "stroke", "xlink:href", "transform", "font-weight"]) {
      if (x.attrs[k] !== y.attrs[k]) throw new Echec(`${label} : ${x.tag} ${k} « ${x.attrs[k]} » → « ${y.attrs[k]} »`);
    }
  });
  if (JSON.stringify(textsOf(a)) !== JSON.stringify(textsOf(b))) throw new Echec(`${label} : textes ou segments changés`);
  console.log(`ok — S4 : ${label} rouvert puis réécrit : ${ta.length} balises, formes à 1 px, traits à 2 px, textes et segments identiques`);
}

async function scenario(page, url, { tmp, lesson, captureNotebook }) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    return d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const waitAttr = (name, v) =>
    page.waitForFunction(([n, v]) => document.querySelector("#stage")?.getAttribute(n) === v, [name, v], { timeout: 30000 }).catch(async () => {
      throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} » ; avis : ${JSON.stringify(dialogs)} ; erreurs : ${errors.join(" | ")}`);
    });
  const tabs = () => page.locator(TAB).count();
  const waitTabs = (n) =>
    page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 30000 }).catch(async () => {
      throw new Echec(`onglets attendus ${n}, lus ${await tabs()} ; avis : ${JSON.stringify(dialogs)} ; erreurs : ${errors.join(" | ")}`);
    });
  // Cherche l'avis parmi ceux reçus depuis `k` (dialogs.length relevé avant le geste), jamais parmi les précédents.
  const waitDialog = async (part, k) => {
    for (let i = 0; i < 100; i++) {
      if (dialogs.slice(k).some((d) => d.includes(part))) return;
      await page.waitForTimeout(100);
    }
    throw new Echec(`avis attendu « ${part} », reçus : ${JSON.stringify(dialogs.slice(k))}`);
  };
  const download = async (click, name) => {
    const dl = page.waitForEvent("download");
    await click();
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const toStage = async (x, y) => {
    const c = await camera();
    return [x * c.zoom + c.tx, y * c.zoom + c.ty];
  };
  const clickWorld = async (x, y) => mouse.click(...(await toStage(x, y)));
  const drop = async (name, bytes, elements, pages = "1/1") => {
    const n = await tabs();
    await dropFile(page, "#stage", name, bytes, "");
    await waitTabs(n + 1);
    await waitAttr("data-page", pages);
    await waitAttr("data-elements", String(elements));
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  check((await page.isVisible(item("export-iwb"))) && (await page.isVisible(item("export-ubz"))), "D17 : « Enregistrer une copie au format .iwb… » et « … .ubz… » dans la barre des pages");
  const box0 = await stageBox(page, 640);
  check(box0.height >= 640, `S4 : scène de ${Math.round(box0.width)} × ${Math.round(box0.height)} px (hauteur ≥ 640) avec les deux actions`);
  const list = await page.evaluate(() => {
    const l = document.querySelector(".rb-pages-list");
    const b = l?.querySelector("button");
    return { visible: l?.clientWidth ?? 0, button: b?.getBoundingClientRect().width ?? 0, first: b ? l.getBoundingClientRect().left <= b.getBoundingClientRect().left + 0.5 && b.getBoundingClientRect().right <= l.getBoundingClientRect().right + 0.5 : false };
  });
  check(list.button > 0 && list.visible >= 3 * list.button && list.first, `S4 : liste des pages de ${Math.round(list.visible)} px visibles (≥ 3 boutons de ${Math.round(list.button)} px), le bouton « 1 » entier`);

  // S1 : .iwb ZIP.
  const k273 = dialogs.length;
  await drop("lecon.iwb", iwbZip(zipSync), 8);
  await waitDialog("page 1 : 1 vidéo non lue", k273);
  check(true, 'S1 : .iwb ZIP : nouvel onglet, data-elements="8", avis « page 1 : 1 vidéo non lue »');
  const box1 = await stageBox(page, 640);
  check(box1.height >= 640, `S4 : après l'import et l'avis, scène de ${Math.round(box1.width)} × ${Math.round(box1.height)} px (hauteur ≥ 640)`);
  await page.click(item("select"));
  await clickWorld(120, 540);
  await waitAttr("data-selection", "2");
  check((await attr("data-units")) === "1" && (await attr("data-grouped")) === "1", "S1 : un clic sur le groupe prend ses deux rectangles (data-units=1, data-grouped=1)");
  const x0 = Number(((await attr("data-bounds")) ?? "").split(",")[0]);
  const [gx, gy] = await toStage(120, 540);
  await mouse.move(gx, gy);
  await mouse.down();
  await mouse.move(gx + 60, gy, { steps: 6 });
  await mouse.up();
  await fr();
  const { zoom } = await camera();
  const x1 = Number(((await attr("data-bounds")) ?? "").split(",")[0]);
  check(Math.abs(x1 - x0 - 60 / zoom) < 2 && (await attr("data-selection")) === "2", `S1 : le groupe se déplace d'un bloc (${x0} → ${x1})`);
  await page.keyboard.press("Control+z");
  await fr();
  await page.click(item("text"));
  await clickWorld(620, 60);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  const content = await page.$eval("#texte-edition", (a) => ("value" in a ? a.value : a.textContent) ?? "");
  check(content.includes("Bonjour") && content.includes("le monde"), "S1 : le texte importé s'ouvre dans la zone de saisie (éditable)");
  await page.keyboard.press("Escape");
  await page.click(item("select"));
  await fr();

  // S4 : copies .iwb puis .ubz de cet onglet ; chaque copie rouverte puis réécrite à l'identique.
  const k304 = dialogs.length;
  const iwbCopy = await download(() => page.click(item("export-iwb")), "copie.iwb");
  await waitDialog("Copie enregistrée au format .iwb", k304);
  const k306 = dialogs.length;
  const ubzCopy = await download(() => page.click(item("export-ubz")), "copie.ubz");
  await waitDialog("Copie enregistrée au format .ubz", k306);
  const a = unzipSync(await readFile(iwbCopy));
  check(Object.keys(a)[0] === "content.xml" && Object.keys(a).some((k) => /^images\/[0-9a-f]{64}\.png$/.test(k)), "S4 : copie .iwb : content.xml d'abord, puis images/<empreinte>.png");
  const xmlA = Buffer.from(a["content.xml"]).toString("utf8");
  check(xmlA.includes('xmlns="http://www.imsglobal.org/xsd/iwb_v1p0"') && xmlA.includes('version="1.0"'), "D19 : racine <iwb version=\"1.0\"> dans l'espace de la norme finale");
  const b = unzipSync(await readFile(ubzCopy));
  check("page001.svg" in b && "metadata.rdf" in b, "S4 : copie .ubz : page001.svg et metadata.rdf");
  for (const [file, name, fmt] of [[iwbCopy, "copie.iwb", "iwb"], [ubzCopy, "copie.ubz", "ubz"]]) {
    await drop(name, await readFile(file), 8);
    await page.click(item("select"));
    await clickWorld(120, 540);
    await waitAttr("data-selection", "2");
    check((await attr("data-units")) === "1", `S4 : ${name} rouvert : 8 objets, le groupe tient`);
    const again = await download(() => page.click(item(`export-${fmt}`)), `again.${fmt}`);
    const key = fmt === "iwb" ? "content.xml" : "page001.svg";
    sameDrawing(Buffer.from(unzipSync(await readFile(file))[key]).toString("utf8"), Buffer.from(unzipSync(await readFile(again))[key]).toString("utf8"), name);
  }
  const saved = await download(() => page.keyboard.press("Control+s"), "copie.roomboard");
  await drop("copie.roomboard", await readFile(saved), 8);
  check(true, "S4 : enregistré en .roomboard puis rouvert : 8 objets");

  // S3 : .ubz déposé et édité.
  const k329 = dialogs.length;
  await drop("openboard.ubz", ubzZip(zipSync), 4);
  await waitDialog("page 1 : 1 règle non lue", k329);
  const c = await camera();
  const black = await inkIn(page, [100 * c.zoom + c.tx, 600 * c.zoom + c.ty, 120 * c.zoom + c.tx, 620 * c.zoom + c.ty], { rgb: [0, 0, 0], tol: 30 });
  check(black > 50, `S3 : .ubz : 4 objets, fond noir (${black} pixels noirs), avis « règle non lue »`);
  await page.click(item("pen"));
  await mouse.move(200, 500);
  await mouse.down();
  await mouse.move(250, 510, { steps: 5 });
  await mouse.move(300, 520, { steps: 5 });
  await mouse.up();
  await waitAttr("data-elements", "5");
  check(true, "S3 : un trait ajouté sur la page 1 (data-elements=5)");
  await page.click(item("select"));

  // S2 : .iwb SVG brut de 3 pages.
  await drop("brut.iwb", enc(iwbRaw3()), 2, "1/3");
  check(true, 'S2 : .iwb SVG brut de 3 pages : data-page="1/3", 2 objets');
  for (const p of [2, 3]) {
    await page.click(`.rb-pages-list [data-page="${p}"]`);
    await waitAttr("data-page", `${p}/3`);
    await waitAttr("data-elements", "2");
    check(true, `S2 : page ${p}/3 du .iwb SVG brut : 2 objets`);
  }
  await page.click('.rb-pages-list [data-page="1"]');
  await waitAttr("data-page", "1/3");

  // S5 : fichier hostile.
  const before = dialogs.length;
  const k358 = dialogs.length;
  await drop("hostile.iwb", enc(hostileIwb()), 2);
  await waitDialog("image distante", k358);
  const said = dialogs.slice(before).join("\n");
  check(said.includes("1 script ignoré") && said.includes("1 entité inconnue ignorée") && said.includes("1 déclaration DOCTYPE ignorée"), "S5 : script, entité externe et DOCTYPE dits, jamais lus");
  check((await page.evaluate(() => window.__pwned)) === undefined, "S5 : ni le script ni onload n'ont tourné (window.__pwned absent)");

  // S4 : fichier d'avant C13.
  const n = await tabs();
  await dropFile(page, "#stage", "socle-v1.roomboard", await readFile(SOCLE), "application/x-roomboard");
  await waitTabs(n + 1);
  check(!dialogs.some((d) => d.startsWith("Ouverture impossible")), "S4 : socle-v1.roomboard (d'avant C13) s'ouvre comme avant");

  // ---- Lot 2 : .notebook et .olf générés ici (page rechargée : la barre garde 12 onglets au plus). ----
  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  const lastTab = async () => (await page.locator(TAB).last().textContent()) ?? "";
  const settle = async (n, dlg) => {
    for (let i = 0; i < 150; i++) {
      if ((await tabs()) > n || dialogs.length > dlg) {
        await page.waitForTimeout(300);
        return;
      }
      await page.waitForTimeout(100);
    }
    throw new Echec(`ni onglet ni avis après le dépôt ; erreurs : ${errors.join(" | ")}`);
  };
  // S1 : .notebook.
  const k386 = dialogs.length;
  await drop("lecon.notebook", notebookZip(zipSync), 4, "1/2");
  await waitDialog("Flash non lu", k386);
  check((await lastTab()).includes("lecon.roomboard"), "S1 (lot 2) : onglet lecon.roomboard");
  if (captureNotebook) {
    await fr();
    const path = join(ROOT, "docs", "essais", "c13-notebook-lecon.png");
    await page.screenshot({ path });
    console.log(`capture : ${path} (lecon.notebook fabriqué, data-page="${await attr("data-page")}", data-elements=${await attr("data-elements")})`);
  }
  const redPx = await (async () => {
    const c0 = await camera();
    return inkIn(page, [200 * c0.zoom + c0.tx, 200 * c0.zoom + c0.ty, 220 * c0.zoom + c0.tx, 220 * c0.zoom + c0.ty], { rgb: [255, 0, 0], tol: 30 });
  })();
  check(redPx > 50, `S1 (lot 2) : rectangle \`path\` rempli de rouge dessiné (${redPx} pixels rouges)`);
  await page.click(item("text"));
  await clickWorld(160, 560);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  const nbText = await page.$eval("#texte-edition", (a) => ("value" in a ? a.value : a.textContent) ?? "");
  check(nbText.includes("Leçon SMART"), `S1 (lot 2) : le texte « ${nbText} » s'ouvre dans la zone de saisie (éditable)`);
  await page.keyboard.press("Escape");
  await page.click(item("select"));
  await page.click('.rb-pages-list [data-page="2"]');
  await waitAttr("data-page", "2/2");
  await waitAttr("data-elements", "1");
  check(true, 'S1 (lot 2) : page 2 = page0.svg (ordre du manifeste inverse des noms) : data-elements="1"');
  await page.click('.rb-pages-list [data-page="1"]');
  await waitAttr("data-page", "1/2");
  await waitAttr("data-elements", "4");
  const nbSaved = await download(() => page.keyboard.press("Control+s"), "lecon.roomboard");
  await drop("lecon.roomboard", await readFile(nbSaved), 4, "1/2");
  check(true, 'S1 (lot 2) : enregistré en .roomboard puis rouvert : data-page="1/2", data-elements="4"');
  console.log('ok — S1 : .notebook déposé : 2 pages dans l\'ordre du manifeste, 4 objets + Flash dit non lu, texte éditable, aller-retour .roomboard');

  // S2 : .olf.
  const k420 = dialogs.length;
  await drop("cours.olf", olfZip(zipSync), 3);
  await waitDialog("widget non lu", k420);
  check((await lastTab()).includes("cours.roomboard"), "S2 (lot 2) : onglet cours.roomboard, data-elements=\"3\"");
  await fr(); // la scène se redessine après l'ouverture (deux images) avant que les pixels soient lus
  const oc = await camera();
  await fr();
  const cream = await inkIn(page, [1700 * oc.zoom + oc.tx, 950 * oc.zoom + oc.ty, 1720 * oc.zoom + oc.tx, 970 * oc.zoom + oc.ty], { rgb: [255, 238, 204], tol: 10 });
  check(cream > 50, `S2 (lot 2) : fond #FFEECC lu (${cream} pixels)`);
  console.log('ok — S2 : .olf déposé : 3 objets (trait, image, texte), widget dit non lu, fond #FFEECC');

  // S3 : .olf renommé, vide, hostiles, flipchart, ancien fichier, scène.
  const k429 = dialogs.length;
  await drop("renomme.notebook", olfZip(zipSync), 3);
  await waitDialog("widget non lu", k429);
  check((await lastTab()).includes("renomme.roomboard"), "S3 (lot 2) : .olf renommé .notebook : mêmes lectures que S2");
  const refuse = async (name, bytes, part, step = "S3 (lot 2)") => {
    const n = await tabs();
    const k434 = dialogs.length;
    await dropFile(page, "#stage", name, bytes, "");
    await waitDialog(part, k434);
    await page.waitForTimeout(300);
    check((await tabs()) === n, `${step} : ${name} refusé (« ${part} »), aucun onglet`);
  };
  await refuse("vide.notebook", emptyNotebook(), "contenu de tableau introuvable");
  await refuse("casse.olf", badOlf(), "content.json illisible");
  await refuse("gros.olf", bigOlf(), "trop gros");
  // JSON.parse lit 200 000 niveaux sans pile dépassée (V8) : le refus vient du pageset vide, pas de content.json.
  await refuse("profond.olf", deepOlf(), "tableau sans page");
  await refuse("cours.flipchart", flipchart(), "fichier endommagé");
  const hn = await tabs();
  const hd = dialogs.length;
  await dropFile(page, "#stage", "hostile.notebook", hostileNotebook(), "");
  await settle(hn, hd);
  const hostileSaid = dialogs.slice(hd).join("\n");
  check(!hostileSaid.includes("root:") && (await page.evaluate(() => window.__pwned)) === undefined, `S3 (lot 2) : .notebook hostile ${(await tabs()) > hn ? "ouvert" : "refusé"} (« ${hostileSaid.slice(0, 90).replace(/\n/g, " ")} »), ni script ni entité lus`);
  const sn = await tabs();
  await dropFile(page, "#stage", "socle-v1.roomboard", await readFile(SOCLE), "application/x-roomboard");
  await waitTabs(sn + 1);
  check(true, "S3 (lot 2) : socle-v1.roomboard (d'avant ce chantier) s'ouvre toujours");
  const nbBox = await stageBox(page, 640);
  check(nbBox.width >= 640 && nbBox.height >= 640, `S3 (lot 2) : scène de ${Math.round(nbBox.width)} × ${Math.round(nbBox.height)} px (≥ 640 × 640), avis rendus`);
  console.log('ok — S3 : .olf renommé, .notebook sans page, .olf cassé/trop gros/trop profond, .flipchart tronqué refusé, hostile, fichier ancien, scène ≥ 640');

  // ---- Lot 3 : .flipchart générés par la fabrique de T12 (page rechargée : la barre garde 12 onglets au plus). ----
  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  // S4 : deux pages, avis TIFF et action, aller-retour .roomboard, scène ≥ 640.
  const k4 = dialogs.length;
  await drop("cours.flipchart", flip(flipPages()), 5, "1/2");
  await waitDialog("image TIFF non lue", k4);
  await waitDialog("action non lue", k4);
  check((await lastTab()).includes("cours.roomboard"), 'S4 (lot 3) : .flipchart généré : onglet cours.roomboard, data-page="1/2", data-elements="5", avis « image TIFF non lue » et « action non lue »');
  await fr();
  const fc = await camera();
  await fr();
  const blue = await inkIn(page, [30 * fc.zoom + fc.tx, 25 * fc.zoom + fc.ty, 50 * fc.zoom + fc.tx, 35 * fc.zoom + fc.ty], { rgb: [0x33, 0x66, 0xcc], tol: 10 });
  check(blue > 50, `S4 (lot 3) : rectangle plein #3366CC dessiné (${blue} pixels)`);
  // PNG 8 × 8 orange posée en (400, 200), 64 × 64 sur la page de 1024 de large de la fabrique, mise à 1920 de large
  // par le lecteur (× 1920 / 1024) : lue au pixel, pas seulement comptée. Centre du carré de l'image, ± 20.
  const orangeOf = async () => {
    const c = await camera();
    const k = 1920 / 1024;
    const [cx, cy] = [(400 + 32) * k, (200 + 32) * k];
    return inkIn(page, [(cx - 20) * c.zoom + c.tx, (cy - 20) * c.zoom + c.ty, (cx + 20) * c.zoom + c.tx, (cy + 20) * c.zoom + c.ty], { rgb: [255, 128, 0], tol: 10 });
  };
  const orange = await orangeOf();
  check(orange > 50, `S4 (lot 3) : image PNG #FF8000 dessinée (${orange} pixels)`);
  const secondPage = async (when) => {
    await page.click('.rb-pages-list [data-page="2"]');
    await waitAttr("data-page", "2/2");
    await waitAttr("data-elements", "1");
    await page.click('.rb-pages-list [data-page="1"]');
    await waitAttr("data-page", "1/2");
    check(true, `S4 (lot 3) : page 2 ${when} : data-elements="1"`);
  };
  await secondPage("lue");
  const fcSaved = await download(() => page.keyboard.press("Control+s"), "cours.roomboard");
  const kSave = dialogs.length;
  await drop("cours.roomboard", await readFile(fcSaved), 5, "1/2");
  await page.waitForTimeout(300);
  check(dialogs.length === kSave, `S4 (lot 3) : enregistré en .roomboard puis rouvert sans avis : data-page="1/2", data-elements="5"${dialogs.length > kSave ? ` (avis : ${dialogs.slice(kSave).join(" | ")})` : ""}`);
  await fr();
  await fr();
  const orange2 = await orangeOf();
  check(orange2 > 50, `S4 (lot 3) : image PNG redessinée après la réouverture (${orange2} pixels)`);
  await secondPage("relue après la réouverture");
  const fcBox = await stageBox(page, 640);
  check(fcBox.width >= 640 && fcBox.height >= 640, `S4 (lot 3) : scène de ${Math.round(fcBox.width)} × ${Math.round(fcBox.height)} px (≥ 640 × 640), avis rendus`);
  console.log("ok — S4 : .flipchart généré déposé : 2 pages, 5 objets, TIFF et action dits non lus, aller-retour .roomboard, scène ≥ 640");

  // S5 : .flipchart hostiles refusés sans onglet ni plantage ; flux à 40 niveaux ouvert avec avis. La bombe qCompress
  // de 300 Mio (≈ 2 Mo compressés) n'est jouée qu'en vitest (`bamboo.test.ts`, « bombe ») : ici, tailles annoncées fausses.
  const bad = [
    ["annonce-courte.flipchart", flip([{}], { lie: { entry: "100.io", announced: 16 } }), "taille mensongère"],
    ["mensonge.flipchart", flip([{}], { lie: { entry: "100.io", announced: 5_000_000 } }), "taille mensongère"],
    ["budget.flipchart", flip([{}], { lie: { entry: "100.io", announced: 300 * 1024 * 1024 } }), "trop gros une fois décompressé"],
    ["imbrique.flipchart", flip([{}, {}], { nestFpg: true }), "imbriqué trop profond"],
    ["entrees.flipchart", flip([{}], { extraEntries: 20_001 }), "trop d'entrées"],
    ["utf16.flipchart", flip([{}], { oddUtf16: true }), "nom d'entrée illisible"],
    ["sans-signature.flipchart", Buffer.alloc(64, 7), "ce n'est pas un paperboard"],
  ];
  for (const [name, bytes, part] of bad) await refuse(name, bytes, part, "S5 (lot 3)");
  const k5 = dialogs.length;
  await drop("profond.flipchart", deepFlipchart(), 1, "1/1");
  await waitDialog("objets trop imbriqués ignorés", k5);
  check(true, 'S5 (lot 3) : flux à 40 niveaux : onglet ouvert, data-elements="1", avis « 8 objets trop imbriqués ignorés »');
  await refuse("renomme.flipchart", enc("bonjour, ce n'est pas un tableau"), "ce n'est pas un paperboard", "S5 (lot 3) : .txt renommé");
  await drop("encore.flipchart", flip([{ rects: [{ x: 5, y: 5, w: 40, h: 30, fill: 0x00ff00 }] }]), 1, "1/1");
  check(true, "S5 (lot 3) : après les refus, l'onglet suivant s'ouvre encore (Worker non gelé)");
  console.log("ok — S5 : .flipchart hostiles (tailles annoncées trop courte, mensongère et hors budget, .fpg imbriqué, 20 001 entrées, UTF-16 impair, sans signature) refusés sans onglet, flux à 40 niveaux ouvert avec avis, .txt renommé .flipchart refusé, Worker non gelé");

  if (lesson !== null) {
    const before = await tabs();
    await dropFile(page, "#stage", basename(lesson), await readFile(lesson), "");
    await waitTabs(before + 1);
    await waitAttr("data-page", "1/3");
    await fr();
    const path = join(ROOT, "docs", "essais", "c13-iwb-lecon.png");
    await page.screenshot({ path });
    console.log(`capture : ${path} (${basename(lesson)}, data-page="${await attr("data-page")}", data-elements=${await attr("data-elements")})`);
  }
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const k = process.argv.indexOf("--captures");
  const lesson = k >= 0 ? (process.argv[k + 1] ?? null) : null;
  const captureNotebook = process.argv.includes("--captures-notebook");
  if (k >= 0 && (lesson === null || !existsSync(lesson))) {
    console.error(`${LABEL} : ÉCHEC — --captures attend le chemin d'une leçon .iwb existante`);
    return 1;
  }
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c13-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { tmp, lesson, captureNotebook });
    if (external.length > 0) throw new Echec(`requêtes hors de 127.0.0.1 : ${external.join(", ")}`);
    console.log("ok — S5 : zéro requête hors de 127.0.0.1 pendant tout l'essai");
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
