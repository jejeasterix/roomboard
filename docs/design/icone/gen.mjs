// Générateur de l'icône RoomBoard « B · Tableau plein » (OF81, posée en OF85, design L5).
// Tracés de la famille RoomFlow (roomflow-app-icon.svg : hexagone « hex-main » et flèche), recalés sur la grille de pixels.
// Usage : node gen.mjs <dossier>  → roomboard-icon.svg (256 px, se met à l'échelle) et roomboard-icon-<S>.svg par taille.
// Chaque taille a son SVG calé : 16 et 20 px dessinés à la main, 24 à 32 px tramés en pixels pleins, sans flèche ;
// 40 px et plus dessin complet, bords verticaux recalés au pixel entier.
import { writeFileSync } from "node:fs";
const NAVY = "#182946", VIOLET = "#6044EB", WHITE = "#FFFFFF";
// Cadre de la tuile, repris de roomflow-app-icon.svg (viewBox et rayon).
const VB = { x: -167.241, y: -204.614, w: 1209.228, rx: 266.030 };
// hex-main en coordonnées absolues (calculées depuis le chemin relatif de la famille).
const HEX = [
  [[80.497,512.998],[80.497,206.625],[427.501,13.25],[691.382,160.302],[614.79,204.523],[427.502,100.153],[158.47,250.076],[158.47,467.979]],
  [[774.506,287.636],[774.506,593.374],[427.502,786.749],[164.18,640.008],[240.772,595.787],[427.501,699.845],[696.533,549.922],[696.533,332.653]],
];
// Flèche de la famille : coins du fût, coins de la tête, pointe.
const ARROW = { s0:[31.654,652.921], s1:[5.506,607.632], n1:[767.188,111.802], tip:[869.24,139.147], n2:[841.895,241.199], j1:[791.468,153.856], j2:[817.615,199.145] };
const XV = [80.497, 158.47, 696.533, 774.506]; // bords verticaux de l'hexagone

function mk(S, prop, o = {}) {
  const s = S / VB.w;
  const px = ([x, y]) => [(x - VB.x) * s, (y - VB.y) * s];
  // Recalage : chaque bord vertical tombe sur un pixel entier ; interpolation linéaire entre eux.
  const a = XV.map((x) => (x - VB.x) * s);
  let b = a.map(Math.round);
  if (o.band) { b[1] = b[0] + o.band; b[2] = b[3] - o.band; }
  if (b[1] - b[0] < 1) b[1] = b[0] + 1;           // bande d'au moins 1 px
  if (b[3] - b[2] < 1) b[2] = b[3] - 1;
  const warpX = (x) => {
    if (x <= a[0]) return x + (b[0] - a[0]);
    if (x >= a[3]) return x + (b[3] - a[3]);
    for (let i = 0; i < 3; i++) if (x <= a[i + 1]) return b[i] + (x - a[i]) * (b[i + 1] - b[i]) / (a[i + 1] - a[i]);
  };
  const P = (p) => { const [x, y] = px(p); return [warpX(x), y]; };
  const f = (n) => +n.toFixed(3);
  const path = (pts) => "M" + pts.map((p) => P(p)).map(([x, y]) => `${f(x)},${f(y)}`).join("L") + "Z";
  const hex = HEX.map(path).join("");
  // Flèche : fût élargi au besoin pour ne jamais passer sous minShaft px.
  const A = Object.fromEntries(Object.entries(ARROW).map(([k, v]) => [k, P(v)]));
  const d = norm(sub(A.tip, mid(A.s0, A.s1)));
  const nrm = [-d[1], d[0]];
  const w0 = dist(A.s0, A.s1), minShaft = S <= 16 ? 1.4 : S <= 32 ? 1.5 : 0;
  const k = Math.max(1, minShaft / w0);
  const grow = (p, c) => add(c, mul(sub(p, c), k));
  const sc = mid(A.s0, A.s1), jc = mid(A.j1, A.j2);
  const s0 = grow(A.s0, sc), s1 = grow(A.s1, sc), j1 = grow(A.j1, jc), j2 = grow(A.j2, jc);
  const hk = S <= 16 ? 1.25 : 1; // tête un peu plus large à 16 px
  const n1 = add(jc, mul(sub(A.n1, jc), hk)), n2 = add(jc, mul(sub(A.n2, jc), hk));
  const arrowPts = [s0, s1, j1, n1, A.tip, n2, j2];
  // ordre de la famille : s0 -> s1 -> j1 -> n1 -> tip -> n2 -> j2
  const arrow = "M" + arrowPts.map(([x, y]) => `${f(x)},${f(y)}`).join("L") + "Z";
  // Tableau : rectangle centré dans l'hexagone, bords sur pixels entiers.
  const cx = (b[1] + b[2]) / 2, cy = px([0, 400])[1];
  let bw = Math.round((b[2] - b[1]) * 0.72), bh = Math.round(bw * 0.66);
  if (S <= 16) { bw = o.bw ?? 6; bh = o.bh ?? 4; }
  if ((bw % 2) !== ((b[1] + b[2]) % 2)) bw -= 1;  // bords entiers
  const bx = cx - bw / 2, by = Math.round(cy - bh / 2);
  const stroke = Math.max(1, Math.round(45 * s * 0.85)); // bande du « hex-Sec » de la famille, allégée
  const r = S >= 48 ? Math.max(1, Math.round(S * 0.012)) : 0;
  // Dégagement autour de la flèche (comme le masque de roomflow-studio-icon.svg).
  const clear = Math.max(dist(s0, s1) + (S <= 32 ? 2 : 2 * Math.max(1, Math.round(S / 64))), 0);
  const tile = prop.tile, ink = prop.ink, board = prop.board;
  const filled = o.filled ?? prop.filled;
  const boardEl = filled
    ? `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${r}" fill="${board}"/>`
    : `<path fill="${board}" fill-rule="evenodd" d="M${bx},${by}h${bw}v${bh}h${-bw}Z M${bx + stroke},${by + stroke}v${bh - 2 * stroke}h${bw - 2 * stroke}v${-(bh - 2 * stroke)}Z"/>`;
  const L0 = add(sc, mul(d, -S)), L1 = add(sc, mul(d, 2 * S));
  const id = `m${S}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<!-- RoomBoard, icône ${prop.name} (${S} px). Hexagone et flèche : roomflow-app-icon.svg, recalés sur la grille de pixels. -->
<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#fff"/><line x1="${f(L0[0])}" y1="${f(L0[1])}" x2="${f(L1[0])}" y2="${f(L1[1])}" stroke="#000" stroke-width="${f(clear)}"/></mask></defs>
<rect width="${S}" height="${S}" rx="${f(VB.rx * s)}" fill="${tile}"/>
<path fill="${ink}" d="${hex}"/>
${o.noArrow ? boardEl : `<g mask="url(#${id})">${boardEl}</g>\n<path fill="${ink}" d="${arrow}"/>`}
</svg>
`;
}
const sub=(p,q)=>[p[0]-q[0],p[1]-q[1]], add=(p,q)=>[p[0]+q[0],p[1]+q[1]], mul=(p,k)=>[p[0]*k,p[1]*k];
const mid=(p,q)=>[(p[0]+q[0])/2,(p[1]+q[1])/2], dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
const norm=(p)=>{const l=Math.hypot(...p);return [p[0]/l,p[1]/l];};
export const B = { name: "B", tile: NAVY, ink: VIOLET, board: WHITE, filled: true };
// --- Variante simplifiée à 16 px : hexagone en pixels pleins (marches 2:1), tableau, sans flèche.
export function mk16(prop) {
  const ring = [[7,3],[8,3],[5,4],[6,4],[9,4],[10,4],[3,5],[4,5],[11,5],[12,5],
    [3,6],[12,6],[3,7],[12,7],[3,8],[12,8],[3,9],[12,9],
    [3,10],[4,10],[11,10],[12,10],[5,11],[6,11],[9,11],[10,11],[7,12],[8,12]];
  const filled = prop.filled;
  const board = filled ? [[5,6,6,4]] : [[5,6,6,1],[5,9,6,1],[5,7,1,2],[10,7,1,2]];
  const rect = ([x,y,w=1,h=1], c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
<!-- RoomBoard, icône ${prop.name} (16 px, variante simplifiée) : hexagone de la famille redessiné en pixels pleins, sans flèche. -->
<rect width="16" height="16" rx="3.5" fill="${prop.tile}"/>
<g shape-rendering="crispEdges">${ring.map(p=>rect(p, prop.ink)).join("")}
${board.map(r=>rect(r, prop.board)).join("")}</g>
</svg>
`;
}
// --- Variante simplifiée à 20 px (échelle Windows 125 %) : même dessin que 16 px, hexagone de 12 × 14 px,
// sommet de 4 px, flancs en marches 2:1, bande de 1 px, tableau 6 × 4 centré, sans flèche.
export function mk20(prop) {
  const ring = [[8,3],[9,3],[10,3],[11,3],[6,4],[7,4],[12,4],[13,4],[4,5],[5,5],[14,5],[15,5]];
  for (let y = 6; y <= 13; y++) ring.push([4, y], [15, y]);
  for (const [x, y] of ring.slice(0, 12)) ring.push([x, 19 - y]);
  const rect = ([x,y,w=1,h=1], c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
<!-- RoomBoard, icône ${prop.name} (20 px, variante simplifiée) : hexagone de la famille redessiné en pixels pleins, sans flèche. -->
<rect width="20" height="20" rx="${+(VB.rx * 20 / VB.w).toFixed(3)}" fill="${prop.tile}"/>
<g shape-rendering="crispEdges">${ring.map(p=>rect(p, prop.ink)).join("")}
${rect([7,8,6,4], prop.board)}</g>
</svg>
`;
}
// --- Variantes simplifiées de 24 à 32 px, tramées en pixels pleins (test au centre de chaque pixel).
function hexPoly(cx, cy, w, h) { // hexagone à pointe en haut, flancs de pente 1/2 (marches de 2 px pour 1)
  return [[cx, cy - h], [cx + w, cy - h + w / 2], [cx + w, cy + h - w / 2], [cx, cy + h], [cx - w, cy + h - w / 2], [cx - w, cy - h + w / 2]];
}
function inside(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
  const [xi, yi] = poly[i], [xj, yj] = poly[j];
  if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
// Gabarits tramés : demi-largeur w et demi-hauteur h de l'hexagone, bande verticale band, bande des flancs vb,
// tableau bx, by, bw, bh, centré sur l'hexagone (hauteur paire). 32 px : gabarit de la maquette OF81.
export const GABARITS = {
  24: { w: 7, h: 8.5, band: 2, vb: 3.4, bx: 8, by: 10, bw: 8, bh: 4 },
  30: { w: 9, h: 10.5, band: 2, vb: 3.4, bx: 10, by: 12, bw: 10, bh: 6 },
  32: { w: 10, h: 11.5, band: 2, vb: 3.4, bx: 10, by: 12, bw: 12, bh: 8 },
};
export function mkPix(S, prop, g = GABARITS[S]) {
  const c = S / 2;
  const outer = hexPoly(c, c, g.w, g.h), inner = hexPoly(c, c, g.w - g.band, g.h - g.vb);
  const runs = [];
  for (let y = 0; y < S; y++) { let x0 = -1;
    for (let x = 0; x <= S; x++) { const on = x < S && inside(outer, x + .5, y + .5) && !inside(inner, x + .5, y + .5);
      if (on && x0 < 0) x0 = x; if (!on && x0 >= 0) { runs.push([x0, y, x - x0, 1]); x0 = -1; } } }
  const { bx, by, bw, bh } = g;
  const rect = ([x, y, w, h], col) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<!-- RoomBoard, icône ${prop.name} (${S} px, variante simplifiée) : hexagone de la famille en pixels pleins (flancs en marches 2:1), sans flèche. -->
<rect width="${S}" height="${S}" rx="${+(VB.rx * S / VB.w).toFixed(3)}" fill="${prop.tile}"/>
<g shape-rendering="crispEdges">${runs.map((r) => rect(r, prop.ink)).join("")}
${rect([bx, by, bw, bh], prop.board)}</g>
</svg>
`;
}
// SVG calé pour une taille donnée.
export function svgPour(S) {
  if (S <= 16) return mk16(B);
  if (S === 20) return mk20(B);
  if (GABARITS[S]) return mkPix(S, B);
  if (S < 40) throw new Error(`taille ${S} px : aucun gabarit tramé`);
  return mk(S, B);
}
// Toutes les tailles posées dans apps/desktop/src-tauri/icons (PNG, entrées du .ico et du .icns).
export const TAILLES = [16, 20, 24, 30, 32, 40, 44, 48, 50, 64, 71, 89, 107, 128, 142, 150, 256, 284, 310, 512, 1024];
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const OUT = process.argv[2];
  if (!OUT) { console.error("usage : node gen.mjs <dossier>"); process.exit(2); }
  writeFileSync(`${OUT}/roomboard-icon.svg`, mk(256, B));
  for (const S of TAILLES) writeFileSync(`${OUT}/roomboard-icon-${S}.svg`, svgPour(S));
}
