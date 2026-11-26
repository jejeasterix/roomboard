// Pose de l'icône RoomBoard dans apps/desktop/src-tauri/icons (OF85, design L5).
// Usage : PLAYWRIGHT=<chemin de playwright/index.mjs> node poser.mjs <dossier des SVG> <dossier icons> [dossier des rendus]
// Chaque PNG est rendu par Chromium sans tête à sa taille, depuis le SVG calé pour cette taille (gen.mjs),
// jamais réduit depuis un grand PNG. Le .ico et le .icns sont assemblés ici, sans dépendance :
// ce sont des conteneurs de PNG.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { TAILLES } from "./gen.mjs";

const [svgDir, iconsDir, rendusDir] = process.argv.slice(2).map((p) => p && resolve(p));
if (!svgDir || !iconsDir) {
  console.error("usage : PLAYWRIGHT=<playwright/index.mjs> node poser.mjs <dossier des SVG> <dossier icons> [dossier des rendus]");
  process.exit(2);
}
const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");

// Fichiers de Tauri : nom → taille en pixels.
const PNG = {
  "32x32.png": 32, "64x64.png": 64, "128x128.png": 128, "128x128@2x.png": 256, "icon.png": 512,
  "Square30x30Logo.png": 30, "Square44x44Logo.png": 44, "Square71x71Logo.png": 71, "Square89x89Logo.png": 89,
  "Square107x107Logo.png": 107, "Square142x142Logo.png": 142, "Square150x150Logo.png": 150,
  "Square284x284Logo.png": 284, "Square310x310Logo.png": 310, "StoreLogo.png": 50,
};
const ICO = [16, 24, 32, 48, 64, 256];
// Types du .icns : ceux de l'icône posée par `tauri icon` (ic07 à ic14), avec icp4 et icp5 (PNG) pour 16 et 32 px.
const ICNS = [["icp4", 16], ["icp5", 32], ["ic11", 32], ["ic12", 64], ["ic07", 128], ["ic13", 256], ["ic08", 256],
  ["ic09", 512], ["ic14", 512], ["ic10", 1024]];

const rendus = new Map();
const navigateur = await chromium.launch({ args: ["--disable-lcd-text", "--force-color-profile=srgb"] });
try {
  for (const S of TAILLES) {
    const page = await navigateur.newPage({ viewport: { width: S, height: S }, deviceScaleFactor: 1 });
    await page.goto(`file://${svgDir}/roomboard-icon-${S}.svg`);
    rendus.set(S, await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: S, height: S } }));
    await page.close();
  }
} finally {
  await navigateur.close();
}
const png = (S) => {
  const b = rendus.get(S);
  if (!b || b.readUInt32BE(16) !== S || b.readUInt32BE(20) !== S) throw new Error(`rendu ${S} px absent ou faux`);
  return b;
};

for (const [nom, S] of Object.entries(PNG)) writeFileSync(`${iconsDir}/${nom}`, png(S));
// Rendus de contrôle, une image par taille, si un troisième dossier est donné.
if (rendusDir) for (const S of TAILLES) writeFileSync(`${rendusDir}/roomboard-icon-${S}.png`, png(S));

// .ico : en-tête, une entrée de 16 octets par image (largeur 0 = 256), puis les PNG.
const ico = [];
const tete = Buffer.alloc(6 + 16 * ICO.length);
tete.writeUInt16LE(0, 0); tete.writeUInt16LE(1, 2); tete.writeUInt16LE(ICO.length, 4);
let pos = tete.length;
ICO.forEach((S, i) => {
  const d = png(S), o = 6 + 16 * i;
  tete[o] = S === 256 ? 0 : S; tete[o + 1] = S === 256 ? 0 : S;
  tete.writeUInt16LE(1, o + 4); tete.writeUInt16LE(32, o + 6);
  tete.writeUInt32LE(d.length, o + 8); tete.writeUInt32LE(pos, o + 12);
  pos += d.length; ico.push(d);
});
writeFileSync(`${iconsDir}/icon.ico`, Buffer.concat([tete, ...ico]));

// .icns : « icns », longueur totale, puis pour chaque entrée son type, sa longueur (8 + données) et le PNG.
const blocs = ICNS.map(([type, S]) => {
  const d = png(S), h = Buffer.alloc(8);
  h.write(type, 0, "latin1"); h.writeUInt32BE(8 + d.length, 4);
  return Buffer.concat([h, d]);
});
const total = 8 + blocs.reduce((n, b) => n + b.length, 0);
const ht = Buffer.alloc(8); ht.write("icns", 0, "latin1"); ht.writeUInt32BE(total, 4);
writeFileSync(`${iconsDir}/icon.icns`, Buffer.concat([ht, ...blocs]));
console.log(`poser : ${Object.keys(PNG).length} PNG, icon.ico (${ICO.join(", ")} px), icon.icns (${ICNS.map(([t, S]) => `${t} ${S}`).join(", ")})`);
