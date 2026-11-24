// Fabriques des médias d'essai (cadrage cli-lot4, D70) : WAV, MP4/MOV/M4A, WebM, Ogg et MP3 écrits par le code, sur le
// modèle de c14-media-navigateur.mjs:24-55 ; aucun fichier téléchargé. Seuls les en-têtes comptent (la CLI ne décode pas).
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
const le32 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
const be16 = (v) => Uint8Array.of((v >>> 8) & 0xff, v & 0xff);
const be24 = (v) => Uint8Array.of((v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
const be32 = (v) => Uint8Array.of((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);

/** WAV PCM 16 bits mono à `rate` Hz (8 kHz), `seconds` secondes de silence. */
export function wav(seconds, rate = 8000) {
  const data = Math.round(rate * seconds) * 2;
  return cat(enc("RIFF"), le32(36 + data), enc("WAVE"), enc("fmt "), le32(16), le16(1), le16(1), le32(rate), le32(rate * 2), le16(2), le16(16), enc("data"), le32(data), new Uint8Array(data));
}

const box = (type, ...parts) => {
  const body = cat(...parts);
  return cat(be32(8 + body.length), enc(type), body);
};
const full = (type, version, flags, ...parts) => box(type, Uint8Array.of(version, (flags >>> 16) & 0xff, (flags >>> 8) & 0xff, flags & 0xff), ...parts);
const MATRIX = cat(...[0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000].map(be32));
/** Rotation de 90° (téléphone en portrait) : a = d = 0, b = 1, c = -1. */
const MATRIX_PORTRAIT = cat(...[0, 0x10000, 0, 0xffff0000, 0, 0, 0, 0, 0x40000000].map(be32));

/**
 * MP4 (MOV avec `brand: "qt  "`, M4A avec `brand: "M4A "`) : `ftyp`, `moov` (`mvhd`, une piste : `tkhd` w × h en 16.16,
 * `mdia/hdlr` `vide` si w > 0, sinon `soun`) et `mdat` ; `moovLast` : `moov` après `mdat` ; `version1` : `mvhd` et `tkhd`
 * en version 1 (dates et durée sur 64 bits) ; `rotate` : matrice de `tkhd` tournée de 90° (a = d = 0).
 */
export function mp4({ duration, timescale = 1000, width = 0, height = 0, brand = "isom", moovLast = false, version1 = false, rotate = false }) {
  const units = Math.round(duration * timescale);
  const t = (v) => (version1 ? cat(be32(0), be32(v)) : be32(v));
  const mvhd = full("mvhd", version1 ? 1 : 0, 0, t(0), t(0), be32(timescale), t(units), be32(0x10000), be16(0x100), new Uint8Array(10), MATRIX, new Uint8Array(24), be32(2));
  const tkhd = full("tkhd", version1 ? 1 : 0, 3, t(0), t(0), be32(1), be32(0), t(units), new Uint8Array(8), be16(0), be16(0), be16(width > 0 ? 0 : 0x100), be16(0), rotate ? MATRIX_PORTRAIT : MATRIX, be32(width * 65536), be32(height * 65536));
  const hdlr = full("hdlr", 0, 0, be32(0), enc(width > 0 ? "vide" : "soun"), new Uint8Array(12), Uint8Array.of(0));
  const moov = box("moov", mvhd, box("trak", tkhd, box("mdia", hdlr)));
  const ftyp = box("ftyp", enc(brand), be32(0), enc("isom"), enc("mp41"));
  const mdat = box("mdat", new Uint8Array(16));
  return moovLast ? cat(ftyp, mdat, moov) : cat(ftyp, moov, mdat);
}

/** MP4 cassé (S3, casse.mp4) : `ftyp` et `mdat`, aucun `moov`. */
export const mp4Broken = () => cat(box("ftyp", enc("isom"), be32(0), enc("isom")), box("mdat", new Uint8Array(16)));

/** Élément EBML : identifiant (marqueur compris), taille sur 8 octets (1 si `short`), contenu. */
const el = (id, body, short = false) => cat(Uint8Array.of(...id), short ? Uint8Array.of(0x80 | body.length) : cat(Uint8Array.of(0x01, 0, 0, 0), be32(body.length)), body);
const UNKNOWN = Uint8Array.of(0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff);
const f64 = (v) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, v);
  return b;
};
const block = (rel) => el([0xa3], cat(Uint8Array.of(0x81), be16(rel & 0xffff), Uint8Array.of(0x80, 0, 0, 0)));

/**
 * WebM : en-tête EBML (DocType `webm`, taille sur un octet comme l'attend `sniffMedia`), `Segment` de taille inconnue
 * (comme MediaRecorder) avec `Info` (`TimecodeScale` 1 ms, `Duration` absent si `duration: null`), `Tracks` (vidéo w × h,
 * ou son si w = 0), puis un `Cluster` de taille inconnue par temps de `clusters` (ms), blocs à +0 et +`lastBlock` ms.
 */
export function webm({ duration, width = 0, height = 0, clusters = [0], lastBlock = 0 }) {
  const scale = 1_000_000;
  const header = el([0x1a, 0x45, 0xdf, 0xa3], cat(el([0x42, 0x86], Uint8Array.of(1), true), el([0x42, 0x82], enc("webm"), true), el([0x42, 0x87], Uint8Array.of(2), true)));
  const info = el([0x15, 0x49, 0xa9, 0x66], cat(el([0x2a, 0xd7, 0xb1], be32(scale)), ...(duration === null ? [] : [el([0x44, 0x89], f64((duration * 1e9) / scale))])));
  const video = width > 0 ? [el([0xe0], cat(el([0xb0], be16(width)), el([0xba], be16(height))))] : [];
  const track = el([0xae], cat(el([0xd7], Uint8Array.of(1)), el([0x83], Uint8Array.of(width > 0 ? 1 : 2)), el([0x86], enc(width > 0 ? "V_VP8" : "A_OPUS")), ...video));
  const tracks = el([0x16, 0x54, 0xae, 0x6b], track);
  const cl = clusters.map((t) => cat(Uint8Array.of(0x1f, 0x43, 0xb6, 0x75), UNKNOWN, el([0xe7], be32(t)), block(0), block(lastBlock)));
  return cat(header, Uint8Array.of(0x18, 0x53, 0x80, 0x67), UNKNOWN, info, tracks, ...cl);
}

/** Page Ogg (CRC non calculé : aucun lecteur de la CLI ne le lit) ; `type` 2 : début de flux, 4 : fin. */
function oggPage(serial, seq, granule, type, packet) {
  const lacing = [];
  let n = packet.length;
  while (n >= 255) {
    lacing.push(255);
    n -= 255;
  }
  lacing.push(n);
  const g = cat(le32(granule % 2 ** 32), le32(Math.floor(granule / 2 ** 32)));
  return cat(enc("OggS"), Uint8Array.of(0, type), g, le32(serial), le32(seq), le32(0), Uint8Array.of(lacing.length), Uint8Array.of(...lacing), packet);
}

/**
 * Ogg d'un flux : page d'identification (`vorbis` à `rate` Hz ; `opus` 48 kHz, `preSkip` ; `theora` w × h, `frn`/`frd`
 * images par seconde, décalage `shift` des images clés ; `flac` : codec non lu, H42), puis une page de données à la
 * granule `granule`.
 */
export function ogg({ codec, granule, rate = 44100, preSkip = 312, width = 0, height = 0, frn = 25, frd = 1, shift = 6 }) {
  let id;
  if (codec === "vorbis") id = cat(Uint8Array.of(1), enc("vorbis"), le32(0), Uint8Array.of(1), le32(rate), le32(0), le32(128000), le32(0), Uint8Array.of(0xb8, 1));
  else if (codec === "opus") id = cat(enc("OpusHead"), Uint8Array.of(1, 1), le16(preSkip), le32(48000), le16(0), Uint8Array.of(0));
  else if (codec === "theora")
    id = cat(Uint8Array.of(0x80), enc("theora"), Uint8Array.of(3, 2, 1), be16(Math.ceil(width / 16)), be16(Math.ceil(height / 16)), be24(width), be24(height), Uint8Array.of(0, 0), be32(frn), be32(frd), be24(1), be24(1), Uint8Array.of(0), be24(0), be16((shift & 0x1f) << 5));
  else id = cat(Uint8Array.of(0x7f), enc("FLAC"), new Uint8Array(30));
  return cat(oggPage(7, 0, 0, 2, id), oggPage(7, 1, granule, 4, new Uint8Array(8)));
}

const MP3_KBPS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];

/**
 * MP3 MPEG-1 couche III, 44,1 kHz stéréo, `kbps` constant (128) : `frames` cadres de ⌊144 × débit / 44 100⌋ octets
 * (417 à 128 kbit/s) ; `xing` : un premier cadre porteur d'un en-tête `Xing` (drapeau 1, `frames`) ; `id3` : balise
 * ID3v2 de 100 octets devant.
 */
export function mp3({ frames, kbps = 128, xing = false, id3 = false }) {
  const size = Math.floor((144 * kbps * 1000) / 44100);
  const frame = () => {
    const f = new Uint8Array(size);
    f.set([0xff, 0xfb, MP3_KBPS.indexOf(kbps) << 4, 0x00]);
    return f;
  };
  const out = [];
  if (id3) out.push(cat(enc("ID3"), Uint8Array.of(3, 0, 0, 0, 0, 0, 100), new Uint8Array(100)));
  if (xing) {
    const f = frame();
    f.set(enc("Xing"), 36);
    f.set(be32(1), 40);
    f.set(be32(frames), 44);
    out.push(f);
  }
  for (let i = 0; i < frames; i++) out.push(frame());
  return cat(...out);
}
