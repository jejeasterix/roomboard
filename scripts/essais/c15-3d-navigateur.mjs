#!/usr/bin/env node
// Essai C15 3D au navigateur (S1 à S5 du cadrage) : déposer un GLB fabriqué ici, le sélectionner, « Tourner », l'orbiter
// de 100 px, désélectionner et voir l'instantané, annuler ; déposer OBJ + MTL ensemble, un .obj seul (avertissement),
// un STL, un PLY et un ZIP (glTF + .bin + PNG) ; enregistrer, relire les assets du .roomboard ; second passage sans
// WebGL : rouvrir le fichier (instantanés dessinés, three non chargé), « Tourner » grisé et message, déposer un GLB
// (carte « Objet 3D »). Application servie en local avec la CSP de la coque, Chromium headless + SwiftShader.
// Modèles fabriqués ici (jamais téléchargés). Code : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/c15-3d-navigateur.mjs [--captures] (docs/essais/c15-3d-orbite.png).
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, dropFiles, frames, gitSha, islandBoxes, item, loadPlaywright, rgbPng, serve, stageBox, stageMouse, zipEntries } from "./commun.mjs";

const LABEL = "C15 3D";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const PRE_C15 = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "image-c2.roomboard");
const LAZY = /\/assets\/three-[^/]*\.js/;
const SWIFTSHADER = ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"]; // s2-navigateur.mjs:24
const { zipSync } = createRequire(join(ROOT, "apps", "web", "package.json"))("fflate");
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const enc = (s) => Buffer.from(s, "utf8");

/** GLB 2.0 (blocs JSON puis BIN alignés sur 4), comme `model3d-fixtures.ts`. */
function glb(json, bin) {
  const j = enc(JSON.stringify(json));
  const jl = Math.ceil(j.length / 4) * 4;
  const bl = Math.ceil(bin.length / 4) * 4;
  const out = Buffer.alloc(20 + jl + 8 + bl);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jl, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  j.copy(out, 20);
  out.fill(0x20, 20 + j.length, 20 + jl);
  out.writeUInt32LE(bl, 20 + jl);
  out.writeUInt32LE(0x004e4942, 24 + jl);
  bin.copy(out, 28 + jl);
  return out;
}
/** Cube à faces de couleurs franches (24 sommets, une couleur par face) : l'orbite change les couleurs vues. */
function cubeGlb() {
  const faces = [
    { n: [0, 0, 1], c: [1, 0, 0], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], c: [0, 1, 0], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { n: [1, 0, 0], c: [0, 0, 1], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { n: [-1, 0, 0], c: [1, 1, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
    { n: [0, 1, 0], c: [1, 0, 1], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
    { n: [0, -1, 0], c: [0, 1, 1], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  ];
  const pos = new Float32Array(faces.flatMap((f) => f.v.flat()));
  const nor = new Float32Array(faces.flatMap((f) => f.v.flatMap(() => f.n)));
  const col = new Float32Array(faces.flatMap((f) => f.v.flatMap(() => f.c)));
  const ind = new Uint16Array(faces.flatMap((_, i) => [0, 1, 2, 0, 2, 3].map((k) => 4 * i + k)));
  const bin = Buffer.concat([pos, nor, col, ind].map((a) => Buffer.from(a.buffer)));
  const views = [[0, 288], [288, 288], [576, 288], [864, 72]];
  return glb({
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3 }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: views.map(([o, l]) => ({ buffer: 0, byteOffset: o, byteLength: l })),
    accessors: [
      { bufferView: 0, componentType: 5126, count: 24, type: "VEC3", min: [-1, -1, -1], max: [1, 1, 1] },
      { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 24, type: "VEC3" },
      { bufferView: 3, componentType: 5123, count: 36, type: "SCALAR" },
    ],
  }, bin);
}
const cubeObj = (mtl) => enc(`${mtl ? `mtllib ${mtl}\nusemtl bleu\n` : ""}v -1 -1 -1\nv 1 -1 -1\nv 1 1 -1\nv -1 1 -1\nv -1 -1 1\nv 1 -1 1\nv 1 1 1\nv -1 1 1\nf 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 3 4 8 7\nf 2 3 7 6\nf 1 5 8 4\n`);
const cubeMtl = () => enc("newmtl bleu\nKd 0 0 1\nKa 0 0 1\n");
function stlBinary() {
  const v = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const tris = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
  const out = Buffer.alloc(84 + tris.length * 50);
  out.writeUInt32LE(tris.length, 80);
  tris.forEach((t, i) => t.forEach((k, j) => v[k].forEach((c, n) => out.writeFloatLE(c, 84 + i * 50 + 12 + j * 12 + n * 4))));
  return out;
}
const plyAscii = () => enc(["ply", "format ascii 1.0", "element vertex 4", "property float x", "property float y", "property float z", "property uchar red", "property uchar green", "property uchar blue", "element face 4", "property list uchar int vertex_indices", "end_header", "0 0 0 255 0 0", "1 0 0 0 255 0", "0 1 0 0 0 255", "0 0 1 255 255 0", "3 0 2 1", "3 0 1 3", "3 0 3 2", "3 1 2 3", ""].join("\n"));
/** glTF + .bin + texture PNG (8 × 8, orange) dans un sous-dossier d'un ZIP écrit par fflate (X37). */
function modelZip() {
  const pos = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
  const uv = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);
  const ind = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const bin = Buffer.concat([pos, uv, ind].map((a) => Buffer.from(a.buffer)));
  const png = rgbPng(8, 8, () => [255, 128, 0]);
  const gltf = enc(JSON.stringify({
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0 }, doubleSided: true }],
    textures: [{ source: 0 }], images: [{ uri: "tex/orange.png" }],
    buffers: [{ uri: "carre.bin", byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 48 }, { buffer: 0, byteOffset: 48, byteLength: 32 }, { buffer: 0, byteOffset: 80, byteLength: 12 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: "VEC3", min: [-1, -1, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 4, type: "VEC2" },
      { bufferView: 2, componentType: 5123, count: 6, type: "SCALAR" },
    ],
  }));
  const zip = Buffer.from(zipSync({ "modele/carre.gltf": gltf, "modele/carre.bin": bin, "modele/tex/orange.png": png }));
  return { zip, gltf, bin, png };
}

async function scenario(page, url, { captures, tmp, noWebgl, file }) {
  const errors = [];
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const dialogs = [];
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
  const tag = async () => ((await attr("data-model3d")) ?? "");
  const tabs = () => page.locator(TAB).count();
  const until = async (probe, msg, ms = 20000) => {
    const end = Date.now() + ms;
    for (;;) {
      if (await probe()) return console.log(`ok — ${msg}`);
      if (Date.now() > end) throw new Echec(`${msg} (délai ; data-model3d « ${await attr("data-model3d")} », data-elements « ${await attr("data-elements")} », erreurs : ${errors.join(" | ")})`);
      await fr();
    }
  };
  const elements = (n, msg) => until(async () => (await attr("data-elements")) === String(n), msg);
  const download = async (click, name) => {
    const dl = page.waitForEvent("download");
    await click();
    const f = join(tmp, name);
    await (await dl).saveAs(f);
    return f;
  };
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  /** Centre de la sélection en px de la scène. */
  const center = async () => {
    const [x0, y0, x1, y1] = ((await attr("data-bounds")) ?? "").split(",").map(Number);
    const { zoom, tx, ty } = await camera();
    return [((x0 + x1) / 2) * zoom + tx, ((y0 + y1) / 2) * zoom + ty];
  };
  const centerPixel = async () => {
    const [cx, cy] = await center();
    return page.$eval("#scene", (c, [cx, cy]) => {
      const sx = c.width / c.clientWidth;
      const sy = c.height / c.clientHeight;
      const d = c.getContext("2d").getImageData(Math.round(cx * sx), Math.round(cy * sy), 1, 1).data;
      return [d[0], d[1], d[2]];
    }, [cx, cy]);
  };
  const blur = () => page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const press = async (k) => {
    await blur();
    await page.keyboard.press(k);
    await fr();
  };
  const messageSeen = (needle) => until(async () => dialogs.some((m) => m.includes(needle)) || (await page.evaluate(() => document.body.innerText)).includes(needle), `message « ${needle} »`);
  const noMessage = async (needle, msg) => {
    await fr();
    await fr();
    const text = await page.evaluate(() => document.body.innerText);
    check(!dialogs.some((m) => m.includes(needle)) && !text.includes(needle), msg);
  };
  const flat = ([r, g, b]) => (r === 255 && g === 255 && b === 255) || (Math.abs(r - 0xe5) <= 8 && Math.abs(g - 0xe7) <= 8 && Math.abs(b - 0xeb) <= 8);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  /** Pixel central une fois l'image de l'objet dessinée. Le PNG de l'instantané se décode à part (`image-cache.ts`,
   *  `bitmap`) : jusque-là la scène dessine la carte « Objet 3D » (#e5e7eb), même avec `data-model3d` déjà à jour (OE80). */
  const drawnPixel = async (msg) => {
    let px = null;
    try {
      await until(async () => !flat((px = await centerPixel())), `${msg} : image dessinée`);
    } catch (e) {
      throw e instanceof Echec ? new Echec(`${e.message} ; pixel central (${px?.join(",")})`) : e;
    }
    return px;
  };
  const version = async () => Number(await attr("data-version"));
  const cube = cubeGlb();
  const mz = modelZip();

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  const box = await stageBox(page, 640);
  console.log(`hauteur de scène : ${Math.round(box.height)} px`);
  check(box.height >= 640, `scène de ${Math.round(box.height)} px (>= 640)`);
  check(!requests.some((u) => LAZY.test(u)), "S1 : aucun morceau three- avant le premier dépôt 3D");

  if (noWebgl) {
    // S5 : rouvrir le fichier sans WebGL.
    const n0 = await tabs();
    await dropFile(page, "#stage", "c15.roomboard", await readFile(file), "application/x-roomboard");
    await until(async () => (await tabs()) === n0 + 1, "S5 : nouvel onglet");
    await elements(6, "S5 : fichier rouvert, 6 éléments");
    check(!requests.some((u) => LAZY.test(u)), "S4 : rouvert et dessiné sans charger three");
    await page.click(item("select"));
    // Les six objets se recouvrent : on cherche, sur une grille, un point où le clic prend le GLB (format « glb »).
    // Les îlots flottent sur la scène : les points de la grille qu'ils couvrent sont sautés.
    const isl = await islandBoxes(page);
    const bs = await stageBox(page);
    const free = (x, y) => !isl.some((b) => bs.x + x >= b.x && bs.x + x <= b.x + b.width && bs.y + y >= b.y && bs.y + y <= b.y + b.height);
    let found = false;
    for (let y = 40; y < box.height - 40 && !found; y += 40) {
      for (let x = 40; x < box.width - 40 && !found; x += 40) {
        if (!free(x, y)) continue;
        await mouse.click(x, y);
        await fr();
        found = (await tag()).startsWith("glb;");
      }
    }
    check(found, "S5 : objet du GLB sélectionné");
    check((await tag()) === "glb;instantane;87;20", `S5 : vue gardée « ${await tag()} »`);
    const shown = await drawnPixel("S5 : instantané sans WebGL");
    check(!flat(shown), `S5 : instantané dessiné sans WebGL (${shown.join(",")})`);
    await page.click('[data-model3d="orbit"]');
    await until(async () => (await tag()).split(";")[1] === "sans-webgl", "S5 : état sans-webgl après « Tourner »");
    await until(async () => page.$eval('[data-model3d="orbit"]', (b) => b.disabled || b.getAttribute("aria-disabled") === "true").catch(() => false), "S5 : « Tourner » désactivé", 5000);
    await until(async () => (await page.locator('[data-model3d="message"]').count()) > 0, "S5 : message de la barre affiché", 5000).catch(async (e) => {
      console.log(`diagnostic : barre = ${await page.locator("[data-model3d-bar]").innerText()}`);
      throw e;
    });
    const msg = await page.$eval('[data-model3d="message"]', (e) => e.textContent ?? "");
    check(msg.includes("3D indisponible sur ce poste : l'objet garde son image"), `S5 : message « ${msg} »`);
    await dropFile(page, "#stage", "cube.glb", cube, "model/gltf-binary", [700, 500]);
    await elements(7, "S5 : GLB déposé sans WebGL, 7 éléments");
    await messageSeen("3D indisponible sur ce poste");
    await mouse.click(700, 500);
    await fr();
    const card = await centerPixel();
    check(Math.abs(card[0] - 0xe5) <= 8 && Math.abs(card[1] - 0xe7) <= 8 && Math.abs(card[2] - 0xeb) <= 8, `S5 : carte « Objet 3D » (${card.join(",")})`);
    // Fichier d'avant C15.
    const n1 = await tabs();
    await dropFile(page, "#stage", "image-c2.roomboard", await readFile(PRE_C15), "application/x-roomboard");
    await until(async () => (await tabs()) === n1 + 1, "fichier d'avant C15 : nouvel onglet");
    await until(async () => Number(await attr("data-elements")) >= 1, "fichier d'avant C15 ouvert, éléments présents");
    check(((await attr("data-model3d")) ?? "") === "", "fichier d'avant C15 : data-model3d vide");
    // Sans WebGL, three écrit lui-même « Error creating WebGL context » dans la console avant que RoomBoard le rattrape.
    const unexpected = errors.filter((e) => !e.includes("Error creating WebGL context"));
    check(unexpected.length === 0, `aucune erreur dans la page (passage sans WebGL)${unexpected.length > 0 ? ` : ${unexpected.join(" | ")}` : ""}`);
    return;
  }

  // S1 : dépôt d'un GLB.
  await dropFile(page, "#stage", "cube.glb", cube, "model/gltf-binary", [400, 300]);
  await elements(1, "S1 : GLB déposé : data-elements=1");
  check(requests.some((u) => LAZY.test(u)), "S1 : three chargé au dépôt");

  // S2 : sélection, orbite, instantané, annulation.
  await page.click(item("select"));
  await mouse.click(400, 300);
  await until(async () => (await tag()) === "glb;instantane;30;20", `S2 : sélectionné : data-model3d « ${await tag()} »`);
  await page.waitForSelector("[data-model3d-bar]");
  check((await stageBox(page, 640)).height >= 640, "S2 : scène >= 640 px avec la barre 3D ouverte");
  const before = await drawnPixel("S2 : instantané");
  check(!flat(before), `S2 : instantané coloré (${before.join(",")})`);
  const v0 = await version();
  await page.click('[data-model3d="orbit"]');
  await until(async () => (await tag()).split(";")[1] === "orbite", "S2 : état orbite");
  const [cx, cy] = await center();
  await mouse.move(cx, cy);
  await mouse.down();
  await mouse.move(cx + 100, cy, { steps: 10 });
  await fr();
  await until(async () => (await tag()) === "glb;orbite;87;20", `S2 : avant relâché, yaw + 57° : « ${await tag()} »`);
  if (captures) {
    await page.screenshot({ path: join(ROOT, "docs", "essais", "c15-3d-orbite.png") });
    console.log("capture : docs/essais/c15-3d-orbite.png");
  }
  await mouse.up();
  // L'orbite est modale ; relâcher, cliquer à côté (zone vide) : orbite fermée, le clic va à l'outil (désélection) et
  // l'instantané montre la nouvelle vue (S2, C1).
  await mouse.click(60, 650);
  await until(async () => (await version()) === v0 + 1, "S2 : relâché puis clic à côté : data-version + 1");
  await fr();
  await until(async () => (await tag()) === "", `S2 : clic à côté : orbite fermée, désélectionné : « ${await tag()} »`);
  await mouse.click(400, 300);
  await until(async () => (await tag()) === "glb;instantane;87;20", `S2 : resélectionné, instantané de la vue tournée : « ${await tag()} »`);
  const turned = await drawnPixel("S2 : instantané de la vue tournée");
  console.log(`versions : départ ${v0}, après orbite ${await version()}`);
  check(dist(turned, before) > 20, `S2 : pixel central change après l'orbite (${before.join(",")} -> ${turned.join(",")})`);
  // Échap ferme aussi l'orbite, l'objet restant sélectionné.
  await page.click('[data-model3d="orbit"]');
  await until(async () => (await tag()).split(";")[1] === "orbite", "S2 : orbite rouverte");
  await press("Escape");
  await until(async () => (await tag()) === "glb;instantane;87;20", `S2 : Échap : orbite fermée, objet sélectionné : « ${await tag()} »`);
  await mouse.click(60, 650);
  await fr();
  await until(async () => (await tag()) === "", "S2 : désélectionné");
  await press("Control+z");
  // data-version est un compteur de changements (l'annulation en compte un de plus) : l'oracle est la vue relue.
  check((await version()) !== v0 + 1, "S2 : Ctrl+Z a modifié le document (data-version change)");
  await mouse.click(400, 300);
  await until(async () => (await tag()) === "glb;instantane;30;20", "S2 : vue d'origine rétablie par Ctrl+Z");
  await press("Control+y");
  await mouse.click(400, 300);
  await until(async () => (await tag()) === "glb;instantane;87;20", "S2 : Ctrl+Y : vue tournée");

  // S3 : OBJ + MTL ensemble, .obj seul, STL, PLY, ZIP.
  await dropFiles(page, "#stage", [{ name: "cube.obj", bytes: cubeObj("cube.mtl") }, { name: "cube.mtl", bytes: cubeMtl() }], [200, 520]);
  await elements(2, "S3 : OBJ + MTL : 2 éléments");
  await noMessage("déposé sans son .mtl", "S3 : aucun avertissement « sans son .mtl »");
  await noMessage("fichier lié d'un modèle 3D", "S3 : aucun message « fichier lié d'un modèle 3D »");
  const blue = await drawnPixel("S3 : OBJ");
  check(blue[2] > blue[0] + 40 && blue[2] > blue[1] + 40, `S3 : OBJ bleu (${blue.join(",")})`);
  await dropFile(page, "#stage", "seul.obj", cubeObj(null), "", [600, 520]);
  await messageSeen("déposé sans son .mtl");
  await elements(3, "S3 : .obj seul : 3 éléments");
  await dropFile(page, "#stage", "piece.stl", stlBinary(), "", [900, 300]);
  await elements(4, "S3 : STL : 4 éléments");
  await dropFile(page, "#stage", "nuage.ply", plyAscii(), "", [900, 500]);
  await elements(5, "S3 : PLY : 5 éléments");
  await dropFile(page, "#stage", "modele.zip", mz.zip, "application/zip", [300, 150]);
  await elements(6, "S3 : ZIP : 6 éléments");
  await noMessage("aucun modèle 3D dans ce ZIP", "S3 : aucun message « aucun modèle 3D dans ce ZIP »");

  // S4 : enregistrer, relire les assets.
  await blur();
  const saved = await download(() => page.keyboard.press("Control+s"), "c15.roomboard");
  const buf = await readFile(saved);
  const entries = zipEntries(buf);
  const want = [
    [`assets/${sha256(cube)}.bin`, cube],
    [`assets/${sha256(cubeObj("cube.mtl"))}.bin`, cubeObj("cube.mtl")],
    [`assets/${sha256(cubeMtl())}.bin`, cubeMtl()],
    [`assets/${sha256(mz.gltf)}.bin`, mz.gltf],
    [`assets/${sha256(mz.bin)}.bin`, mz.bin],
    [`assets/${sha256(mz.png)}.png`, mz.png],
  ];
  for (const [name, bytes] of want) check(entries.has(name) && entries.get(name).equals(bytes), `S4 : ${name} présent, octets exacts`);
  const pngs = [...entries.keys()].filter((k) => /^assets\/.*\.png$/.test(k)).length;
  check(pngs === 7, `S4 : ${pngs} entrées assets/*.png (=== 7 : texture + 6 instantanés)`);
  await copyFile(saved, file);

  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c15-"));
  const file = join(tmp, "c15-gardé.roomboard");
  const url = `http://127.0.0.1:${port}/?fichiers=repli`;
  const captures = process.argv.includes("--captures");
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: SWIFTSHADER });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const external = [];
    const route = (context) => context.route("**/*", (r) => {
      const u = new URL(r.request().url());
      if (u.hostname === "127.0.0.1" || u.protocol === "about:" || u.protocol === "blob:" || u.protocol === "data:") return r.continue();
      external.push(u.href);
      return r.abort();
    });
    const ctx1 = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    await route(ctx1);
    const p1 = await ctx1.newPage();
    await p1.clock.setFixedTime(FIXED);
    await scenario(p1, url, { captures, tmp, noWebgl: false, file });
    const ctx2 = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    await ctx2.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
        return orig.call(this, type, ...rest);
      };
    });
    await route(ctx2);
    const p2 = await ctx2.newPage();
    await p2.clock.setFixedTime(FIXED);
    await scenario(p2, url, { captures: false, tmp, noWebgl: true, file });
    if (external.length > 0) throw new Echec(`requêtes hors de 127.0.0.1 : ${external.join(", ")}`);
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
