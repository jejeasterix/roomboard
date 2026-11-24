// Fabriques des images d'essai (cadrage cli-lot4, D70) : en-têtes GIF, WebP, BMP, ICO, AVIF, HEIC et SVG écrits par le code,
// aucun fichier téléchargé. Seul l'en-tête compte (la CLI ne décode pas) ; le reste est un remplissage court. Lues par les
// tests de apps/web et apps/cli, par cli-essai.mjs et par objets.mjs.
const enc = (s) => new TextEncoder().encode(s);
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};
const le16 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff);
const le24 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff);
const le32 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
const be16 = (v) => Uint8Array.of((v >>> 8) & 0xff, v & 0xff);
const be32 = (v) => Uint8Array.of((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);

/** GIF89a w × h : écran logique, une image 1 × 1, fin. */
export const gif = (w, h) =>
  cat(enc("GIF89a"), le16(w), le16(h), Uint8Array.of(0, 0, 0), enc(","), le16(0), le16(0), le16(1), le16(1), Uint8Array.of(0, 2, 2, 0x4c, 0x01, 0), enc(";"));

/** WebP w × h, chunk `VP8 ` (avec perte), `VP8L` (sans perte) ou `VP8X` (étendu). */
export function webp(chunk, w, h) {
  let body;
  if (chunk === "VP8 ") body = cat(Uint8Array.of(0x10, 0x02, 0x00, 0x9d, 0x01, 0x2a), le16(w), le16(h));
  else if (chunk === "VP8L") body = cat(Uint8Array.of(0x2f), le32(((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14)), Uint8Array.of(0));
  else body = cat(Uint8Array.of(0, 0, 0, 0), le24(w - 1), le24(h - 1));
  const size = chunk === "VP8L" ? 5 : body.length; // VP8L : 5 octets utiles, un octet de bourrage (taille impaire)
  const c = cat(enc(chunk), le32(size), body);
  return cat(enc("RIFF"), le32(4 + c.length), enc("WEBP"), c);
}

/** BMP w × h : en-tête info (40 octets, hauteur négative si `topDown`) ou core (12 octets). */
export function bmp(w, h, { core = false, topDown = false } = {}) {
  const dib = core
    ? cat(le32(12), le16(w), le16(h), le16(1), le16(24))
    : cat(le32(40), le32(w), le32(topDown ? -h : h), le16(1), le16(24), le32(0), le32(0), le32(2835), le32(2835), le32(0), le32(0));
  const pixels = new Uint8Array(4);
  return cat(enc("BM"), le32(14 + dib.length + pixels.length), le16(0), le16(0), le32(14 + dib.length), dib, pixels);
}

/** ICO aux entrées `[w, h]` (256 écrit 0) ; contenu factice de 4 octets par entrée. */
export function ico(sizes) {
  const data = Uint8Array.of(0x89, 0x50, 0x4e, 0x47);
  const entries = sizes.map(([w, h], i) =>
    cat(Uint8Array.of(w >= 256 ? 0 : w, h >= 256 ? 0 : h, 0, 0), le16(1), le16(32), le32(data.length), le32(6 + 16 * sizes.length + i * data.length)),
  );
  return cat(le16(0), le16(1), le16(sizes.length), ...entries, ...sizes.map(() => data));
}

const box = (type, ...parts) => {
  const body = cat(...parts);
  return cat(be32(8 + body.length), enc(type), body);
};
const full = (type, version, flags, ...parts) => box(type, Uint8Array.of(version, (flags >>> 16) & 0xff, (flags >>> 8) & 0xff, flags & 0xff), ...parts);

/**
 * AVIF (`avif`) ou HEIC (`heic`) : `ftyp`, puis `meta` avec `pitm` (élément 1, sauf `pitm: false`), `ipco` (`ispe` 64 × 64
 * de la vignette, puis `ispe` w × h) et `ipma` (élément 2 → propriété 1, élément 1 → propriété 2) : la taille lue est
 * celle de l'élément principal, ni la première ni (si w × h < 64 × 64) la plus grande ; `wide` : `ipma` en version 1,
 * drapeau large (éléments sur 32 bits, indices sur 16).
 */
export function heif(brand, w, h, { pitm = true, wide = false } = {}) {
  const ispe = (a, b) => full("ispe", 0, 0, be32(a), be32(b));
  const meta = full(
    "meta",
    0,
    0,
    full("hdlr", 0, 0, be32(0), enc("pict"), new Uint8Array(12), Uint8Array.of(0)),
    ...(pitm ? [full("pitm", 0, 0, be16(1))] : []),
    box(
      "iprp",
      box("ipco", ispe(64, 64), ispe(w, h)),
      wide
        ? full("ipma", 1, 1, be32(2), be32(2), Uint8Array.of(1), be16(0x8001), be32(1), Uint8Array.of(1), be16(0x0002))
        : full("ipma", 0, 0, be32(2), be16(2), Uint8Array.of(1, 0x81), be16(1), Uint8Array.of(1, 0x82)),
    ),
  );
  return cat(box("ftyp", enc(brand), be32(0), enc("mif1"), enc(brand)), meta, box("mdat", new Uint8Array(4)));
}

/** SVG dont la balise racine porte `attrs` (ex. `width="40" height="30"`, `viewBox="0 0 400 100"`). */
export const svg = (attrs) => enc(`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect width="10" height="10" fill="red"/></svg>\n`);
