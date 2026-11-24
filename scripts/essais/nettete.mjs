// Mesure de netteté du cadrage design § 10 (design-l1, L1-7) : pixels RVBA d'une capture Playwright, décodée dans un
// canvas de la page, et fonctions pures sur ces pixels. Réutilisable par les lots L2 à L5 (§ 10 : à refaire à chaque lot).
// Jamais `inkIn` (commun.mjs) : il lit le canvas de scène `#scene`, où les boutons (svg du DOM) ne sont pas dessinés.

/** Pixels RVBA d'une zone de page en px CSS ; la capture suit le deviceScaleFactor du contexte (2x : 2 pixels par px). */
export async function pixelsOf(page, clip) {
  const png = await page.screenshot({ clip, animations: "disabled", caret: "hide", scale: "device" });
  const { width, height, data } = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    return { width: d.width, height: d.height, data: Array.from(d.data) };
  }, png.toString("base64"));
  return { width, height, data: Uint8ClampedArray.from(data) };
}

/** `#rrggbb` → [r, g, b]. */
export const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
/** Gris Rec. 601 arrondi, comme les rangées du § 10 : `#182946` → 39. */
export const gray = ([r, g, b]) => Math.round(0.299 * r + 0.587 * g + 0.114 * b);
const at = (px, x, y) => {
  const i = (y * px.width + x) * 4;
  return [px.data[i], px.data[i + 1], px.data[i + 2]];
};
const near = (p, q, tol) => p.every((v, k) => Math.abs(v - q[k]) <= tol);

/** Rangée `y`, de `x0` (inclus) à `x1` (exclu) : gris imprimés, pixels ni fond ni encre (à `tol` près par composante),
 *  longueurs des suites d'encre. Bord net du § 10 : `intermediate === 0`, `runs` = [3, 3] pour le Rectangle à 2x. */
export function edgeRow(px, y, x0, x1, bg, ink, tol = 1) {
  const out = { gray: [], intermediate: 0, runs: [] };
  let run = 0;
  for (let x = x0; x < x1; x++) {
    const p = at(px, x, y);
    out.gray.push(gray(p));
    const isInk = near(p, ink, tol);
    if (!isInk && !near(p, bg, tol)) out.intermediate++;
    if (isInk) run++;
    else if (run > 0) {
      out.runs.push(run);
      run = 0;
    }
  }
  if (run > 0) out.runs.push(run);
  return out;
}

/** Écart (plus grande composante) entre `p` et le point le plus proche du segment RVB `bg` → `ink`. */
export function offSegment(p, bg, ink) {
  const d = ink.map((v, k) => v - bg[k]);
  const len = d.reduce((s, v) => s + v * v, 0);
  const dot = p.reduce((s, v, k) => s + (v - bg[k]) * d[k], 0);
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, dot / len));
  return Math.max(...p.map((v, k) => Math.abs(v - (bg[k] + t * d[k]))));
}

/** Pixels à plus de `tol` du segment fond → encre : franges colorées (0 attendu, § 10). */
export function fringes(px, bg, ink, tol = 2) {
  let n = 0;
  for (let y = 0; y < px.height; y++) {
    for (let x = 0; x < px.width; x++) if (offSegment(at(px, x, y), bg, ink) > tol) n++;
  }
  return n;
}
