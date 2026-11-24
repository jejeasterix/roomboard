// Fabriques des tableaux blancs (cadrage cli-lot2, D28), déplacées de c13-tableaux-navigateur.mjs : ZIP injecté (zipSync de fflate, ou zipStored du produit), PNG par solidPng.
import { solidPng } from "../commun.mjs";
const enc = (s) => Buffer.from(s, "utf8");

export const IWB_HEAD = '<?xml version="1.0" encoding="UTF-8"?><iwb xmlns:iwb="http://www.becta.org.uk/iwb" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0">';

/** S1 : .iwb ZIP (viewbox 960 × 540, échelle 2) : 8 objets lus, une vidéo non lue. */
export function iwbZip(zip) {
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
  return Buffer.from(zip({ "content.xml": enc(xml), "images/carre.png": solidPng(8, 8, [255, 128, 0]), "videos/film.mpg": enc("mpg") }));
}

/** S2 : .iwb SVG brut de 3 pages, 2 objets par page. */
export const iwbRaw3 = () =>
  `${IWB_HEAD}<svg:svg viewbox="0 0 800 600"><svg:pageset>${[1, 2, 3]
    .map((n) => `<svg:page id="page${n}"><svg:text x="10" y="40" font-size="30">Page ${n}</svg:text><svg:rect x="10" y="100" width="${50 * n}" height="40" fill="green"/></svg:page>`)
    .join("")}</svg:pageset></svg:svg></iwb>`;

/** S3 : .ubz (fond noir, trait à pression, polyligne, texte OpenBoard, image, règle) : 4 objets. */
export function ubzZip(zip) {
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
  return Buffer.from(zip({ "page001.svg": enc(page), "images/photo.png": solidPng(16, 16, [0, 128, 255]), "metadata.rdf": enc("<rdf/>") }));
}

export const NB_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
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
export const nbSvg = (body, head = "") =>
  `<?xml version="1.0" encoding="UTF-8"?>${head}<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="600" viewBox="0 0 800 600">${body}</svg>`;

/** S1 : .notebook de 2 pages ; le manifeste met page1.svg (4 objets lus, 1 Flash) avant page0.svg (1 objet). */
export function notebookZip(zip) {
  const page0 = nbSvg('<rect x="10" y="10" width="100" height="50" fill="#00ff00"/>');
  const page1 = nbSvg(
    '<path d="M50 50 L250 50 L250 130 L50 130 z" fill="#ff0000"/>' +
      '<ellipse cx="400" cy="90" rx="60" ry="40" fill="#00aa00"/>' +
      '<text x="50" y="250" font-size="30" fill="#000000"><tspan font-weight="bold">Leçon<tspan> SMART</tspan></tspan></text>' +
      '<image xlink:href="images/a%20b[1].png" x="500" y="200" width="80" height="80"/>' +
      '<flash x="50" y="400" width="100" height="80"/>',
  );
  return Buffer.from(
    zip({ "imsmanifest.xml": enc(NB_MANIFEST), "page0.svg": enc(page0), "page1.svg": enc(page1), "images/a b[1].png": solidPng(8, 8, [255, 128, 0]) }),
  );
}

/** S2 : .olf 3840 × 2160 (échelle 0,5), fond #FFEECC, trait et image à matrice, zone de texte à deux paragraphes, un widget. */
export function olfZip(zip) {
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
  return Buffer.from(zip({ "content.json": enc(JSON.stringify(content)), "images/p.png": solidPng(8, 8, [0, 128, 255]) }));
}

export const TIFF = Uint8Array.of(0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0);
/** S4 : page 1 = trait, ligne, rectangle plein, texte à deux runs, PNG, TIFF, action ; page 2 = un rectangle. */
export const flipPages = () => [
  {
    strokes: [{ points: [[10, 300], [60, 330], [110, 300]], color: 0xff0000, width: 4 }],
    lines: [{ points: [[10, 400], [300, 400]], color: 0x0000ff, width: 3 }],
    rects: [{ x: 10, y: 10, w: 80, h: 40, fill: 0x3366cc }],
    texts: [{ x: 200, y: 20, runs: [{ text: "Bonjour ", size: 30 }, { text: "monde", size: 30, bold: true }] }],
    images: [
      { name: "photo.png", bytes: solidPng(8, 8, [255, 128, 0]), x: 400, y: 200, w: 64, h: 64 },
      { name: "scan.tif", bytes: TIFF, x: 500, y: 300, w: 32, h: 32 },
    ],
    actions: 1,
  },
  { rects: [{ x: 5, y: 5, w: 40, h: 30, fill: 0x00ff00 }] },
];
