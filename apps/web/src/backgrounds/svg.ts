/**
 * Fonds dessinés en SVG (personnalisation-1b, Q9, Q10, DA3) : dégradés et modèles de cours écrits par des fonctions
 * pures, rendus en 3840 × 2160 (`viewBox` 1920 × 1080) au moment d'appliquer et posés en fond `image/svg+xml`. Le code
 * est le générateur : reproductible, 0 octet dans le pack. Traits fins (2 à 4 unités), aucune image ni adresse externe.
 */
export const SVG_W = 3840;
export const SVG_H = 2160;
const W = 1920;
const H = 1080;
const INK = "#475569";
const LINE = "#94a3b8";
const SOFT = "#e2e8f0";
const FONT = "Segoe UI, system-ui, sans-serif";

export interface Gradient {
  readonly slug: string;
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly angle: number;
  readonly keywords: readonly string[];
}
export interface Lesson {
  readonly id: string;
  readonly label: string;
  readonly theme: string;
  readonly color: string;
  readonly keywords: readonly string[];
  draw(): string;
}

const n = (v: number): string => String(Math.round(v));
const range = (k: number): number[] => Array.from({ length: k }, (_, i) => i);
const svg = (bg: string, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
const ln = (x1: number, y1: number, x2: number, y2: number, c = LINE, w = 2): string =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const box = (x: number, y: number, w: number, h: number, c = LINE, r = 16, sw = 2, fill = "none"): string =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${sw}"/>`;
const ring = (cx: number, cy: number, r: number, c = LINE, sw = 2, fill = "none"): string =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" stroke="${c}" stroke-width="${sw}"/>`;
const path = (d: string, c = INK, sw = 3): string =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const label = (x: number, y: number, s: string, size = 32, anchor: "start" | "middle" | "end" = "middle", c = INK): string =>
  `<text x="${n(x)}" y="${n(y)}" font-family="${FONT}" font-size="${size}" text-anchor="${anchor}" fill="${c}">${s}</text>`;

function gradientSvg(from: string, to: string, angle: number): string {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) / 2;
  const dy = Math.sin(rad) / 2;
  const f = (v: number): string => v.toFixed(3);
  return svg(
    from,
    `<defs><linearGradient id="g" x1="${f(0.5 - dx)}" y1="${f(0.5 - dy)}" x2="${f(0.5 + dx)}" y2="${f(0.5 + dy)}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`,
  );
}

function weekPlanner(): string {
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  const [x0, y0, w, h] = [80, 80, W - 160, H - 160];
  const col = w / days.length;
  return svg(
    "#ffffff",
    box(x0, y0, w, h) +
      ln(x0, y0 + 90, x0 + w, y0 + 90) +
      range(days.length - 1).map((i) => ln(x0 + col * (i + 1), y0, x0 + col * (i + 1), y0 + h)).join("") +
      days.map((d, i) => label(x0 + col * (i + 0.5), y0 + 58, d, 34)).join(""),
  );
}

function calendar(): string {
  const days = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
  const [x0, y0, w, h, head] = [80, 150, W - 160, H - 230, 70];
  const col = w / 7;
  const row = (h - head) / 6;
  return svg(
    "#ffffff",
    label(x0, 110, "Mois :", 36, "start") +
      ln(x0 + 120, 112, x0 + 620, 112) +
      box(x0, y0, w, h) +
      ln(x0, y0 + head, x0 + w, y0 + head) +
      range(6).map((i) => ln(x0 + col * (i + 1), y0, x0 + col * (i + 1), y0 + h)).join("") +
      range(5).map((i) => ln(x0, y0 + head + row * (i + 1), x0 + w, y0 + head + row * (i + 1), SOFT)).join("") +
      days.map((d, i) => label(x0 + col * (i + 0.5), y0 + 46, d, 30)).join(""),
  );
}

function timeline(): string {
  const [y, x0, x1, step] = [540, 120, 1800, 140];
  const ticks = range(Math.floor((x1 - 60 - x0) / step) + 1).map((i) => ln(x0 + i * step, y - 24, x0 + i * step, y + 24, INK));
  return svg("#ffffff", ln(x0, y, x1, y, INK, 3) + path(`M${x1 - 30} ${y - 18} L${x1} ${y} L${x1 - 30} ${y + 18}`) + ticks.join(""));
}

function venn(): string {
  return svg(
    "#ffffff",
    ring(760, 560, 360, "#7c8fd6", 3, "rgba(124,143,214,0.08)") + ring(1160, 560, 360, "#d68f7c", 3, "rgba(214,143,124,0.08)") + label(560, 150, "A", 40) + label(1360, 150, "B", 40),
  );
}

function tChart(): string {
  return svg("#ffffff", ln(160, 220, 1760, 220, INK, 3) + ln(960, 220, 960, 960, INK, 3) + label(560, 180, "Pour", 40) + label(1360, 180, "Contre", 40));
}

function kwl(): string {
  const heads = ["Je sais", "Je veux savoir", "J'ai appris"];
  const [x0, y0, gap] = [80, 80, 32];
  const w = (W - 160 - gap * 2) / 3;
  const h = H - 160;
  return svg(
    "#ffffff",
    heads
      .map((title, i) => {
        const x = x0 + i * (w + gap);
        return box(x, y0, w, h) + ln(x, y0 + 90, x + w, y0 + 90) + label(x + w / 2, y0 + 58, title, 34);
      })
      .join(""),
  );
}

function mindMap(): string {
  const [cx, cy] = [960, 540];
  const spots: readonly (readonly [number, number])[] = [[360, 220], [960, 140], [1560, 220], [360, 860], [960, 940], [1560, 860]];
  return svg(
    "#ffffff",
    spots.map(([x, y]) => ln(cx, cy, x, y, LINE, 3) + box(x - 150, y - 50, 300, 100, LINE, 50, 2, "#ffffff")).join("") +
      `<ellipse cx="${cx}" cy="${cy}" rx="230" ry="115" fill="#ffffff" stroke="${INK}" stroke-width="3"/>`,
  );
}

function axes(): string {
  const [step, cx, cy] = [60, 960, 540];
  const v = range(Math.floor(W / step) + 1).map((i) => ln(i * step, 0, i * step, H, SOFT, 2)).join("");
  const h = range(Math.floor(H / step) + 1).map((i) => ln(0, i * step, W, i * step, SOFT, 2)).join("");
  return svg(
    "#ffffff",
    v + h + ln(60, cy, 1860, cy, INK, 3) + ln(cx, 1020, cx, 60, INK, 3) +
      path(`M1832 ${cy - 16} L1860 ${cy} L1832 ${cy + 16}`) + path(`M${cx - 16} 88 L${cx} 60 L${cx + 16} 88`) +
      label(1850, cy + 50, "x", 34) + label(cx - 36, 80, "y", 34) + label(cx - 30, cy + 44, "O", 30),
  );
}

function numberLine(): string {
  const [y, x0, step] = [540, 160, 80];
  const ticks = range(21)
    .map((i) => {
      const x = x0 + i * step;
      const big = i % 5 === 0;
      return ln(x, y - (big ? 30 : 18), x, y + (big ? 30 : 18), INK, big ? 3 : 2) + label(x, y + 80, String(i), big ? 34 : 28);
    })
    .join("");
  return svg("#ffffff", ln(x0 - 40, y, x0 + 20 * step + 40, y, INK, 3) + ticks);
}

function worksheet(): string {
  const fields: readonly (readonly [string, number, number])[] = [["Nom :", 100, 110], ["Prénom :", 1000, 110], ["Date :", 100, 190], ["Classe :", 1000, 190]];
  const head = fields.map(([s, x, y]) => label(x, y, s, 32, "start") + ln(x + 160, y + 6, x + 820, y + 6)).join("");
  const rules = range(12).map((i) => ln(100, 300 + i * 60, 1820, 300 + i * 60, SOFT)).join("");
  return svg("#ffffff", head + ln(80, 240, 1840, 240, INK) + rules);
}

function football(): string {
  const [c, sw] = ["#ffffff", 4];
  const r = (x: number, y: number, w: number, h: number): string => box(x, y, w, h, c, 0, sw);
  return svg(
    "#2f7d4f",
    r(120, 90, 1680, 900) + ln(960, 90, 960, 990, c, sw) + ring(960, 540, 150, c, sw) + ring(960, 540, 6, c, sw, c) +
      r(120, 290, 270, 500) + r(1530, 290, 270, 500) + r(120, 410, 90, 260) + r(1710, 410, 90, 260) +
      ring(300, 540, 5, c, sw, c) + ring(1620, 540, 5, c, sw, c),
  );
}

function basketball(): string {
  const [c, sw] = ["#ffffff", 4];
  const r = (x: number, y: number, w: number, h: number): string => box(x, y, w, h, c, 0, sw);
  return svg(
    "#c98a4b",
    r(120, 90, 1680, 900) + ln(960, 90, 960, 990, c, sw) + ring(960, 540, 120, c, sw) +
      r(120, 380, 380, 320) + r(1420, 380, 380, 320) + ring(500, 540, 120, c, sw) + ring(1420, 540, 120, c, sw) +
      path("M120 150 L260 150 A440 440 0 0 1 260 930 L120 930", c, sw) + path("M1800 150 L1660 150 A440 440 0 0 0 1660 930 L1800 930", c, sw) +
      ring(180, 540, 14, c, sw) + ring(1740, 540, 14, c, sw),
  );
}

export const GRADIENTS: readonly Gradient[] = Object.freeze([
  { slug: "aube", label: "Aube", from: "#fde2e4", to: "#e2ece9", angle: 90, keywords: ["rose", "vert", "doux", "matin"] },
  { slug: "lagon", label: "Lagon", from: "#a1c4fd", to: "#c2e9fb", angle: 120, keywords: ["bleu", "eau", "clair"] },
  { slug: "prairie", label: "Prairie", from: "#d4fc79", to: "#96e6a1", angle: 120, keywords: ["vert", "printemps", "nature"] },
  { slug: "coucher", label: "Coucher de soleil", from: "#fbc2eb", to: "#a6c1ee", angle: 90, keywords: ["rose", "violet", "soir"] },
  { slug: "peche", label: "Pêche", from: "#ffecd2", to: "#fcb69f", angle: 90, keywords: ["orange", "chaud", "doux"] },
  { slug: "brume", label: "Brume", from: "#e0eafc", to: "#cfdef3", angle: 90, keywords: ["bleu", "gris", "calme"] },
  { slug: "ocean", label: "Océan", from: "#2193b0", to: "#6dd5ed", angle: 135, keywords: ["bleu", "mer", "eau"] },
  { slug: "nuit", label: "Nuit", from: "#141e30", to: "#243b55", angle: 90, keywords: ["sombre", "bleu", "soir"] },
  { slug: "foret", label: "Forêt", from: "#134e5e", to: "#71b280", angle: 135, keywords: ["vert", "sombre", "nature"] },
  { slug: "aurore", label: "Aurore", from: "#ee9ca7", to: "#ffdde1", angle: 90, keywords: ["rose", "matin", "doux"] },
  { slug: "agrume", label: "Agrume", from: "#f6d365", to: "#fda085", angle: 120, keywords: ["jaune", "orange", "chaud"] },
  { slug: "glacier", label: "Glacier", from: "#e6e9f0", to: "#eef1f5", angle: 90, keywords: ["gris", "blanc", "froid"] },
  { slug: "lavande", label: "Lavande", from: "#e0c3fc", to: "#8ec5fc", angle: 135, keywords: ["violet", "bleu", "doux"] },
  { slug: "sable", label: "Sable", from: "#f5efe6", to: "#e8dfca", angle: 90, keywords: ["beige", "plage", "doux"] },
  { slug: "ardoise", label: "Ardoise dégradée", from: "#3a4750", to: "#2b333b", angle: 90, keywords: ["sombre", "gris", "tableau noir"] },
  { slug: "crepuscule", label: "Crépuscule", from: "#3a1c71", to: "#d76d77", angle: 135, keywords: ["violet", "rouge", "soir"] },
  { slug: "menthe", label: "Menthe", from: "#d9f2e6", to: "#a8e6cf", angle: 90, keywords: ["vert", "frais", "doux"] },
  { slug: "ciel", label: "Ciel", from: "#89f7fe", to: "#66a6ff", angle: 90, keywords: ["bleu", "ciel", "clair"] },
]);

export const LESSONS: readonly Lesson[] = Object.freeze([
  { id: "semainier", label: "Semainier", theme: "organisation", color: "#ffffff", keywords: ["semaine", "jours", "planning", "emploi du temps", "agenda"], draw: weekPlanner },
  { id: "calendrier", label: "Calendrier du mois", theme: "organisation", color: "#ffffff", keywords: ["calendrier", "mois", "dates", "jours", "agenda"], draw: calendar },
  { id: "frise", label: "Frise chronologique", theme: "organisation", color: "#ffffff", keywords: ["frise", "chronologie", "histoire", "temps", "dates"], draw: timeline },
  { id: "venn", label: "Diagramme de Venn", theme: "reflexion", color: "#ffffff", keywords: ["venn", "ensembles", "comparer", "cercles", "logique"], draw: venn },
  { id: "tableau-en-t", label: "Tableau en T", theme: "reflexion", color: "#ffffff", keywords: ["tableau en t", "pour contre", "comparer", "débat", "arguments"], draw: tChart },
  { id: "sva", label: "Je sais, je veux savoir, j'ai appris", theme: "reflexion", color: "#ffffff", keywords: ["sva", "savoir", "apprendre", "colonnes", "bilan"], draw: kwl },
  { id: "carte-mentale", label: "Carte mentale", theme: "reflexion", color: "#ffffff", keywords: ["carte mentale", "idées", "remue-méninges", "schéma", "branches"], draw: mindMap },
  { id: "repere", label: "Repère orthonormé", theme: "mathematiques", color: "#ffffff", keywords: ["repère", "axes", "coordonnées", "graphique", "fonction"], draw: axes },
  { id: "droite-graduee", label: "Droite graduée", theme: "mathematiques", color: "#ffffff", keywords: ["droite graduée", "nombres", "graduation", "calcul", "règle"], draw: numberLine },
  { id: "entete-fiche", label: "En-tête de fiche", theme: "ecriture", color: "#ffffff", keywords: ["fiche", "nom", "date", "classe", "exercice"], draw: worksheet },
  { id: "terrain-football", label: "Terrain de football", theme: "sport", color: "#2f7d4f", keywords: ["football", "foot", "terrain", "sport", "tactique"], draw: football },
  { id: "terrain-basket", label: "Terrain de basket", theme: "sport", color: "#c98a4b", keywords: ["basket", "basketball", "terrain", "sport", "tactique"], draw: basketball },
]);

/** SVG d'un fond dessiné (`degrade-<slug>` ou modèle de cours) ; lève pour tout autre id. */
export function svgOf(id: string): string {
  const g = GRADIENTS.find((x) => `degrade-${x.slug}` === id);
  if (g !== undefined) return gradientSvg(g.from, g.to, g.angle);
  const l = LESSONS.find((x) => x.id === id);
  if (l !== undefined) return l.draw();
  throw new Error(`fond dessiné inconnu : ${id}`);
}
