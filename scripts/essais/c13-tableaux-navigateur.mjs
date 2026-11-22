#!/usr/bin/env node
// Essai C13 lot 1 au navigateur (S1 à S5 du cadrage usage-c13-lot1-svg-iwb-ubz) : déposer un .iwb ZIP et un .iwb SVG
// brut générés ici, voir les pages et les avertissements ; déposer un .ubz généré et l'éditer ; « Enregistrer une copie
// au format » .iwb puis .ubz, rouvrir chaque copie, retrouver les objets et réécrire la même copie ; enregistrer en
// .roomboard puis rouvrir ; socle-v1.roomboard (d'avant C13) s'ouvre ; fichier hostile : rien n'est exécuté ni chargé.
// Application construite servie avec la CSP de la coque, Chromium headless, repli (`?fichiers=repli`), heure figée ;
// toute requête hors de 127.0.0.1 est comptée et coupée. Code : 0 réussi, 1 échec, 2 outil absent.
// Lot 2 (S1 à S3 de usage-c13-lots2-3) : un .notebook et un .olf fabriqués ici sont déposés, pages et avertissements lus,
// enregistrés en .roomboard puis rouverts ; .flipchart signé Bamboo refusé ; fichiers hostiles ; socle-v1.roomboard.
// Usage : node scripts/essais/c13-tableaux-navigateur.mjs [--captures <leçon.iwb>] [--captures-notebook]
// (docs/essais/c13-iwb-lecon.png : la leçon, hors dépôt, n'est jamais copiée ; docs/essais/c13-notebook-lecon.png :
// .notebook fabriqué). Sans option, aucune capture n'est réécrite.
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, serve, solidPng, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C13 tableaux";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const SOCLE = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "socle-v1.roomboard");
const { zipSync, unzipSync } = createRequire(join(ROOT, "apps", "web", "package.json"))("fflate");
const enc = (s) => Buffer.from(s, "utf8");
const IWB_HEAD = '<?xml version="1.0" encoding="UTF-8"?><iwb xmlns:iwb="http://www.becta.org.uk/iwb" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0">';

/** S1 : .iwb ZIP (viewbox 960 × 540, échelle 2) : 8 objets lus, une vidéo non lue. */
function iwbZip() {
  const xml = `${IWB_HEAD}
 <svg:svg viewbox="0 0 960 540"><svg:pageset><svg:page id="p1">
  <svg:rect id="r1" x="20" y="20" width="100" height="60" fill="red" stroke="black" stroke-width="2"/>
  <svg:ellipse id="e1" cx="200" cy="50" rx="40" ry="25" fill="none" stroke="blue" stroke-width="3"/>
  <svg:line id="l1" x1="20" y1="120" x2="220" y2="120" stroke="black" stroke-width="2"/>
  <svg:polyline id="pl1" points="20,160 60,180 100,150 140,175" stroke="green" stroke-width="4" fill="none"/>
  <svg:textarea id="t1" x="300" y="20" width="300" height="80" font-size="24" fill="black" font-weight="bold">Bonjour<svg:tbreak/>le monde</svg:textarea>
  <svg:image id="i1" xlink:href="images/carre.png" x="300" y="150" width="64" height="64"/>
  <svg:rect id="g1" x="40" y="250" width="40" height="40" fill="blue"/>
  <svg:rect id="g2" x="100" y="250" width="40" height="40" fill="blue"/>
  <svg:video id="v1" xlink:href="videos/film.mpg" x="450" y="250" width="160" height="120"/>
 </svg:page></svg:pageset></svg:svg>
 <iwb:element ref="l1" stroke-lineshape-end="arrow"/>
 <iwb:group><iwb:element ref="g1"/><iwb:element ref="g2"/></iwb:group>
</iwb>`;
  return Buffer.from(zipSync({ "content.xml": enc(xml), "images/carre.png": solidPng(8, 8, [255, 128, 0]), "videos/film.mpg": enc("mpg") }));
}

/** S2 : .iwb SVG brut de 3 pages, 2 objets par page. */
const iwbRaw3 = () =>
  `${IWB_HEAD}<svg:svg viewbox="0 0 800 600"><svg:pageset>${[1, 2, 3]
    .map((n) => `<svg:page id="page${n}"><svg:text x="10" y="40" font-size="30">Page ${n}</svg:text><svg:rect x="10" y="100" width="${50 * n}" height="40" fill="green"/></svg:page>`)
    .join("")}</svg:pageset></svg:svg></iwb>`;

/** S3 : .ubz (fond noir, trait à pression, polyligne, texte OpenBoard, image, règle) : 4 objets. */
function ubzZip() {
  const html = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd"><html><body style="font-size:32pt; color:#ffffff;"><p>Texte OpenBoard</p></body></html>';
  const esc = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const page = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ub="http://uniboard.mnemis.com/document" ub:version="4.8.0" viewBox="0 0 1280 720" width="1280" height="720">
 <rect x="0" y="0" width="1280" height="720" fill="#000000"/>
 <g fill="#ffffff"><polygon points="100,100 200,100 200,110 100,110"/><polygon points="200,98 300,98 300,112 200,112"/></g>
 <polyline points="100,200 200,250 300,200" stroke="#ffff00" stroke-width="5" fill="none"/>
 <foreignObject ub:type="text" x="400" y="100" width="400" height="80"><itemTextContent>${esc}</itemTextContent></foreignObject>
 <image xlink:href="images/photo.png" x="400" y="300" width="128" height="128"/>
 <ub:ruler x="10" y="600" width="400" height="60"/>
</svg>`;
  return Buffer.from(zipSync({ "page001.svg": enc(page), "images/photo.png": solidPng(16, 16, [0, 128, 255]), "metadata.rdf": enc("<rdf/>") }));
}

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
const NB_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="SMARTNotebook" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <organizations/>
  <resources>
    <resource identifier="pages" href="page1.svg" type="webcontent" adlcp:scormType="asset">
      <file href="page1.svg"/>
      <file href="page0.svg"/>
    </resource>
    <resource identifier="images" type="webcontent" adlcp:scormType="asset">
      <file href="images/a b[1].png"/>
    </resource>
  </resources>
</manifest>`;
const nbSvg = (body, head = "") =>
  `<?xml version="1.0" encoding="UTF-8"?>${head}<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="600" viewBox="0 0 800 600">${body}</svg>`;

/** S1 : .notebook de 2 pages ; le manifeste met page1.svg (4 objets lus, 1 Flash) avant page0.svg (1 objet). */
function notebookZip() {
  const page0 = nbSvg('<rect x="10" y="10" width="100" height="50" fill="#00ff00"/>');
  const page1 = nbSvg(
    '<path d="M50 50 L250 50 L250 130 L50 130 z" fill="#ff0000"/>' +
      '<ellipse cx="400" cy="90" rx="60" ry="40" fill="#00aa00"/>' +
      '<text x="50" y="250" font-size="30" fill="#000000"><tspan font-weight="bold">Leçon<tspan> SMART</tspan></tspan></text>' +
      '<image xlink:href="images/a%20b[1].png" x="500" y="200" width="80" height="80"/>' +
      '<flash x="50" y="400" width="100" height="80"/>',
  );
  return Buffer.from(
    zipSync({ "imsmanifest.xml": enc(NB_MANIFEST), "page0.svg": enc(page0), "page1.svg": enc(page1), "images/a b[1].png": solidPng(8, 8, [255, 128, 0]) }),
  );
}

/** S2 : .olf 3840 × 2160 (échelle 0,5), fond #FFEECC, trait et image à matrice, zone de texte à deux paragraphes, un widget. */
function olfZip() {
  const M = "1,0,200,0,1,200,0,0,1";
  const seg = (text) => ({ text: { text, "font-size": 60, fill: "#FF000000" } });
  const content = {
    olf: {
      width: 3840,
      height: 2160,
      pageset: [
        {
          page: {
            viewbox: "0 0 3840 2160",
            matrix: "1,0,0,0,1,0,0,0,1",
            backgrounds: [{ background: { type: "color", fill: "#FFEECC", opacity: 1 } }],
            elements: [
              { stroke: { points: "0,0 400,100 800,0", stroke: "#0000FF", "pen-width": 12, "is-highlighter": false, matrix: M } },
              { image: { source: "images/p.png", x: 0, y: 0, width: 400, height: 300, matrix: "1,0,1000,0,1,200,0,0,1" } },
              {
                textarea: {
                  x: 0,
                  y: 0,
                  width: 900,
                  height: 300,
                  matrix: "1,0,200,0,1,800,0,0,1",
                  "text-blocks-container": [{ paragraph: { "text-list-container": [seg("Bonjour")] } }, { paragraph: { "text-list-container": [seg("le monde")] } }],
                },
              },
              { "widget-player": { x: 0, y: 0 } },
            ],
          },
        },
      ],
    },
  };
  return Buffer.from(zipSync({ "content.json": enc(JSON.stringify(content)), "images/p.png": solidPng(8, 8, [0, 128, 255]) }));
}

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
  await drop("lecon.iwb", iwbZip(), 8);
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
  await drop("openboard.ubz", ubzZip(), 4);
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
  await drop("lecon.notebook", notebookZip(), 4, "1/2");
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
  await drop("cours.olf", olfZip(), 3);
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
  await drop("renomme.notebook", olfZip(), 3);
  await waitDialog("widget non lu", k429);
  check((await lastTab()).includes("renomme.roomboard"), "S3 (lot 2) : .olf renommé .notebook : mêmes lectures que S2");
  const refuse = async (name, bytes, part) => {
    const n = await tabs();
    const k434 = dialogs.length;
    await dropFile(page, "#stage", name, bytes, "");
    await waitDialog(part, k434);
    await page.waitForTimeout(300);
    check((await tabs()) === n, `S3 (lot 2) : ${name} refusé (« ${part} »), aucun onglet`);
  };
  await refuse("vide.notebook", emptyNotebook(), "contenu de tableau introuvable");
  await refuse("casse.olf", badOlf(), "content.json illisible");
  await refuse("gros.olf", bigOlf(), "trop gros");
  // JSON.parse lit 200 000 niveaux sans pile dépassée (V8) : le refus vient du pageset vide, pas de content.json.
  await refuse("profond.olf", deepOlf(), "tableau sans page");
  await refuse("cours.flipchart", flipchart(), "exporter en .iwb ou PDF depuis ActivInspire");
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
  console.log('ok — S3 : .olf renommé, .notebook sans page, .olf cassé/trop gros/trop profond, .flipchart refusé, hostile, fichier ancien, scène ≥ 640');

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
