#!/usr/bin/env node
// Producteur des photos du pack de fonds (personnalisation-1b, Q11, Q13, Q14, Q34). Joué à la main, réseau, jamais par
// scripts/verifier.sh. Lit apps/web/backgrounds/SOURCES.json, télécharge chaque image CC0 (URL `fichier`, seule permise)
// dans un dossier neuf ~/.cache/tmp/og5-photos-XXXXXX/ (donnée non fiable : aucun script n'y est lancé, ffmpeg ne fait que
// lire), recadre en 16:9 centré, encode en WebP 2560 × 1440 (≤ 400 Ko, qualité réglée par image) et 480 × 270 (≤ 25 Ko),
// métadonnées retirées, mesure la couleur moyenne de la dernière rangée, écrit apps/web/public/backgrounds/{photos,thumbs}/
// <id>.webp, réécrit apps/web/src/backgrounds/photos.ts (aucune provenance) et le champ `retouche` de SOURCES.json.
// Usage : node scripts/fonds/produire-photos.mjs [--depuis <dossier déjà téléchargé>]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SOURCES = join(ROOT, "apps", "web", "backgrounds", "SOURCES.json");
const OUT = join(ROOT, "apps", "web", "public", "backgrounds");
const CATALOG = join(ROOT, "apps", "web", "src", "backgrounds", "photos.ts");
const [W, H, TW, TH] = [2560, 1440, 480, 270];
const [W2, H2] = [1920, 1080];
const [MAX, TMAX] = [400 * 1024, 25 * 1024];
const EXCLUDED = /unsplash|pixabay|pexels/i;

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const ffmpeg = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

/** Encode `src` en WebP w × h (recadrage centré), qualités essayées dans l'ordre jusqu'à tenir sous `max` octets. */
function encode(src, dst, w, h, max, qualities) {
  for (const q of qualities) {
    ffmpeg(["-i", src, "-map_metadata", "-1", "-vf", `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}`, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(q), "-compression_level", "6", dst]);
    if (statSync(dst).size <= max) return q;
  }
  throw new Error(`${dst} : plus de ${max} octets même à la qualité ${qualities.at(-1)}`);
}

/** Couleur moyenne de la dernière rangée (H2-4), en #rrggbb. */
function edgeColor(file, w, h) {
  const rgb = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-vf", `format=rgb24,crop=${w}:1:0:${h - 1},scale=1:1:flags=area`, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  return `#${[...rgb.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

async function download(url, dst) {
  if (EXCLUDED.test(url)) throw new Error(`source exclue : ${url}`);
  let r;
  for (let essai = 0; essai < 8; essai++) {
    r = await fetch(url, { headers: { "user-agent": "roomboard-fonds/1" } });
    if (r.status !== 429 && r.status < 500) break;
    await new Promise((ok) => setTimeout(ok, Math.max(Number(r.headers.get("retry-after")) * 1000 || 0, 15000 * (essai + 1))));
  }
  if (!r.ok) throw new Error(`${url} : HTTP ${r.status}`);
  writeFileSync(dst, new Uint8Array(await r.arrayBuffer()));
}

const sources = JSON.parse(readFileSync(SOURCES, "utf8"));
mkdirSync(join(homedir(), ".cache", "tmp"), { recursive: true });
const work = arg("--depuis") ?? mkdtempSync(join(homedir(), ".cache", "tmp", "og5-photos-"));
console.log(`dossier de téléchargement : ${work}`);
mkdirSync(join(OUT, "photos"), { recursive: true });
mkdirSync(join(OUT, "thumbs"), { recursive: true });
const entries = [];
const kept = [];
for (const p of sources.photos) {
  const raw = join(work, `${p.id}.src`);
  if (!existsSync(raw)) {
    await download(p.fichier, raw);
    await new Promise((ok) => setTimeout(ok, 3000));
  }
  const photo = join(OUT, "photos", `${p.id}.webp`);
  const thumb = join(OUT, "thumbs", `${p.id}.webp`);
  let q;
  let size;
  // 2560 × 1440 d'abord ; si l'image ne tient pas sous le plafond à q40, 1920 × 1080 ; écartée en dernier recours.
  for (const [w, h] of [[W, H], [W2, H2]]) {
    try {
      q = encode(raw, photo, w, h, MAX, [82, 76, 70, 64, 58, 52, 46, 40]);
      size = [w, h];
      break;
    } catch {}
  }
  if (!size) {
    for (const f of [photo, thumb]) rmSync(f, { force: true });
    console.log(`écartée — ${p.id} (plus de ${MAX} octets en ${W2} × ${H2} à q40)`);
    continue;
  }
  try {
    encode(raw, thumb, TW, TH, TMAX, [75, 68, 60, 52, 44, 36, 28, 20, 12, 6]);
  } catch {
    for (const f of [photo, thumb]) rmSync(f, { force: true });
    console.log(`écartée — ${p.id} (miniature : plus de ${TMAX} octets même à q6)`);
    continue;
  }
  kept.push(p);
  p.retouche = `recadrage 16:9 centré, ${size[0]} × ${size[1]}, WebP q${q}, métadonnées retirées ; miniature ${TW} × ${TH}`;
  entries.push({ id: p.id, section: "images", theme: p.theme, label: p.label, keywords: p.keywords, kind: "photo", color: edgeColor(photo, size[0], size[1]), grid: null, photo: { file: `photos/${p.id}.webp`, thumb: `thumbs/${p.id}.webp`, w: size[0], h: size[1] } });
  console.log(`ok — ${p.id} (qualité ${q}, ${statSync(photo).size} o)`);
}
writeFileSync(
  CATALOG,
  `// Généré par scripts/fonds/produire-photos.mjs depuis apps/web/backgrounds/SOURCES.json : ne pas modifier à la main.\n` +
    `// Aucune provenance ici (Q13, Q33) : elle reste dans SOURCES.json.\n` +
    `import type { PackBackground } from "./catalog";\n\n` +
    `export const PHOTOS: readonly PackBackground[] = Object.freeze(${JSON.stringify(entries, null, 2)} satisfies PackBackground[]);\n`,
);
sources.photos = kept;
writeFileSync(SOURCES, `${JSON.stringify(sources, null, 2)}\n`);
console.log(`photos.ts : ${entries.length} photos ; dossier à supprimer : ${work}`);
