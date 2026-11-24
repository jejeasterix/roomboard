// Jeu d'essai du lot 4 (cadrage cli-lot4, D70) : réexporte les fabriques d'images, de médias et de modèles 3D ; lancé
// seul (`node scripts/essais/fabriques/objets.mjs <dossier>`), écrit dans <dossier> les fichiers des scénarios S3 à S5.
// Aucun fichier téléchargé. Lu par cli-essai.mjs.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "../commun.mjs";
import { bmp, gif, heif, ico, svg, webp } from "./images.mjs";
import { mp3, mp4, mp4Broken, ogg, wav, webm } from "./medias.mjs";
import { cubeMtl, cubeObj, glbTextured, gltfPair, plyTriangle, texturePng, stlTriangle } from "./modeles.mjs";
import { IWB_HEAD } from "./tableaux.mjs";

export * from "./images.mjs";
export * from "./medias.mjs";
export * from "./modeles.mjs";

const enc = (s) => new TextEncoder().encode(s);

/** Tailles attendues des images de S5 (`<w>x<h>`) ; `vb.svg` (viewBox 400 × 100 seul) : 300 × 75 (D64). */
export const TAILLES = Object.freeze({ "i.gif": "320x200", "i.webp": "64x48", "i.bmp": "33x21", "i.ico": "48x48", "i.svg": "40x30", "vb.svg": "300x75", "i.avif": "120x80", "i.heic": "90x60" });

/** Fichiers des scénarios S3 à S5 ; `zip` (fflate `zipSync`) ajoute `gif.iwb`, tableau dont l'image est un GIF. */
export function jeu(zip) {
  const { gltf, bin } = gltfPair();
  const files = {
    "son.wav": wav(1),
    "clip.mp4": mp4({ duration: 2.5, width: 640, height: 360 }),
    "clip.webm": webm({ duration: 3.2, width: 320, height: 240 }),
    "casse.mp4": mp4Broken(),
    "a.mp3": mp3({ frames: 100, xing: true }),
    "b.ogg": ogg({ codec: "vorbis", granule: 88200 }),
    "i.gif": gif(320, 200),
    "i.webp": webp("VP8 ", 64, 48),
    "i.bmp": bmp(33, 21),
    "i.ico": ico([[16, 16], [48, 48]]),
    "i.svg": svg('width="40" height="30"'),
    "vb.svg": svg('viewBox="0 0 400 100"'),
    "i.avif": heif("avif", 120, 80),
    "i.heic": heif("heic", 90, 60),
    "casse.gif": enc("GIF89a"),
    "cube.obj": cubeObj(),
    "cube.mtl": cubeMtl(),
    "tex.png": texturePng(),
    "tri.stl": stlTriangle(),
    "tri.ply": plyTriangle(),
    "tri.gltf": gltf,
    "tri.bin": bin,
    "tex.glb": glbTextured(),
    "seul.gltf": gltf,
    "seul.mtl": cubeMtl(null),
  };
  if (zip) {
    const xml = `${IWB_HEAD}<svg:svg viewbox="0 0 960 540"><svg:pageset><svg:page id="p1"><svg:image id="i1" xlink:href="images/i.gif" x="10" y="10" width="64" height="64"/></svg:page></svg:pageset></svg:svg></iwb>`;
    files["gif.iwb"] = zip({ "content.xml": enc(xml), "images/i.gif": gif(64, 64) });
  }
  return files;
}

/** Écrit `jeu(zip)` dans `dir` (créé au besoin) ; rend les noms écrits. */
export function ecrireJeu(dir, zip) {
  mkdirSync(dir, { recursive: true });
  const files = jeu(zip);
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(dir, name), bytes);
  return Object.keys(files);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (dir === undefined) {
    console.error("usage : node scripts/essais/fabriques/objets.mjs <dossier>");
    process.exit(2);
  }
  const { zipSync } = createRequire(join(ROOT, "apps", "web", "package.json"))("fflate");
  console.log(ecrireJeu(dir, zipSync).join("\n"));
}
