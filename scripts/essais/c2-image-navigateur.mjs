#!/usr/bin/env node
// Essai C2 « dépôt, image, conteneur » au navigateur (R26, R27 ; S1 à S5). L'application construite (apps/web/dist)
// servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure figée
// (deux enregistrements du même document donnent les mêmes octets). Images fabriquées ici (PNG unis), aucun fichier de
// l'utilisateur. Aucune requête hors de 127.0.0.1. Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c2-image-navigateur.mjs [--captures]
// (--captures : docs/essais/c2-image-deposee.png).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, inflateRawSync } from "node:zlib";
import { DIST, Echec, ROOT, TAB, VIEWPORT, dropFile, frames, gitSha, inkIn, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";

const LABEL = "C2 image";
const LATER = "format pris en charge dans une prochaine version";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
const W = 200;
const H = 150;
/** Point de dépôt de `dropFile` (commun.mjs:143) : 50 px à droite et en dessous du coin de #stage. */
const DROP = [50, 50];

/** CSP de la coque (tauri.conf.json), envoyée telle quelle (même lecture que fichiers-navigateur.mjs). */
function coqueCsp() {
  const conf = JSON.parse(readFileSync(join(ROOT, "apps", "desktop", "src-tauri", "tauri.conf.json"), "utf8"));
  const csp = conf.app.security.csp;
  return Object.entries(csp).map(([d, v]) => `${d} ${Array.isArray(v) ? v.join(" ") : v}`).join("; ");
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** PNG RVB 8 bits d'une seule couleur. */
function solidPng(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.alloc(1 + 3 * w);
  for (let x = 0; x < w; x++) row.set([r, g, b], 1 + 3 * x);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Entrées d'un ZIP par son répertoire central : nom → octets (stored ou deflate). */
function zipEntries(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Echec("fichier enregistré : ZIP sans répertoire central");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Echec("fichier enregistré : répertoire central illisible");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    out.set(name, method === 0 ? Buffer.from(data) : inflateRawSync(data));
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

const sha256 = (b) => createHash("sha256").update(b).digest("hex");

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const dialogs = [];
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const elements = async () => Number(await attr("data-elements"));
  const tabs = () => page.locator(TAB).count();
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const bounds = async () => ((await attr("data-bounds")) ?? "").split(",").map(Number);
  const toScreen = (c, x, y) => [x * c.zoom + c.tx, y * c.zoom + c.ty];
  const press = async (keys) => {
    await page.keyboard.press(keys);
    await fr();
  };
  const waitElements = (n) =>
    page.waitForFunction((n) => document.querySelector("#stage")?.getAttribute("data-elements") === String(n), n, { timeout: 15000 });
  const waitTabs = async (n) => {
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 15000 });
    await fr();
  };
  /** Le bitmap arrive après le décodage : quelques images d'attente au plus. */
  const inkSoon = async (box) => {
    for (let i = 0; i < 40; i++) {
      if ((await inkIn(page, box)) > 0) return true;
      await page.waitForTimeout(100);
      await fr();
    }
    return false;
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  /** 60 % centraux d'un rectangle écran (le cadre et les poignées de la sélection restent dehors). */
  const inner = (x0, y0, x1, y1) => {
    const mx = (x1 - x0) * 0.2;
    const my = (y1 - y0) * 0.2;
    return [Math.max(2, x0 + mx), Math.max(2, y0 + my), x1 - mx, y1 - my];
  };
  const boxOfBounds = async (cam) => {
    const [a, b, c, d] = await bounds();
    const [x0, y0] = toScreen(cam, a, b);
    const [x1, y1] = toScreen(cam, c, d);
    return inner(x0, y0, x1, y1);
  };

  const png = solidPng(W, H, [20, 20, 20]);
  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  await fr();
  const cam = await camera();
  const sw = W * cam.zoom;
  const sh = H * cam.zoom;
  const dropBox = inner(DROP[0] - sw / 2, DROP[1] - sh / 2, DROP[0] + sw / 2, DROP[1] + sh / 2);
  check((await inkIn(page, dropBox)) === 0, "avant le dépôt : aucun pixel sombre au point de dépôt");

  // S1 : dépôt, Ctrl+Z, Ctrl+Y.
  await dropFile(page, "#stage", "sombre.png", png, "image/png");
  await waitElements(1);
  check(await inkSoon(dropBox), 'S1 : #stage[data-elements="1"], l\'image déposée apparaît au point de dépôt');
  check((await attr("data-tool")) === "pen", "S1 : outil inchangé après l'insertion (R17)");
  await press("Control+z");
  check((await elements()) === 0 && (await inkIn(page, dropBox)) === 0, "S1 : Ctrl+Z retire l'image");
  await press("Control+y");
  check((await elements()) === 1 && (await inkSoon(dropBox)), "S1 : Ctrl+Y la remet");

  // S2 : sélection, glisser, poignée.
  await page.click(item("select"));
  await fr();
  await mouse.click(DROP[0], DROP[1]);
  await fr();
  check((await attr("data-selection")) === "1", 'S2 : clic sur l\'image avec la sélection : data-selection="1"');
  await mouse.move(DROP[0], DROP[1]);
  await mouse.down();
  await mouse.move(DROP[0] + 400, DROP[1] + 250, { steps: 10 });
  await mouse.up();
  await fr();
  const moved = [dropBox[0] + 400, dropBox[1] + 250, dropBox[2] + 400, dropBox[3] + 250];
  check((await inkIn(page, moved)) > 0 && (await inkIn(page, dropBox)) === 0, "S2 : glissée, l'image est à sa nouvelle place");
  const [x0, , x1, y1] = await bounds();
  const [hx, hy] = toScreen(cam, x1, y1);
  await mouse.move(hx, hy);
  await mouse.down();
  await mouse.move(hx + 60, hy + 45, { steps: 8 });
  await mouse.up();
  await fr();
  const [nx0, , nx1] = await bounds();
  check(nx1 - nx0 > x1 - x0 + 40, `S2 : poignée tirée, l'image grandit (${(x1 - x0).toFixed(0)} → ${(nx1 - nx0).toFixed(0)} unités)`);
  const placed = await boxOfBounds(cam);
  check((await inkIn(page, placed)) > 0, "S2 : à sa nouvelle taille, l'image couvre sa boîte");

  // S3 : enregistrer, lire l'entrée assets/, rouvrir, enregistrer encore.
  const file1 = await saveTo("image.roomboard");
  const bytes1 = await readFile(file1);
  const entry = `assets/${sha256(png)}.png`;
  const entries = zipEntries(bytes1);
  check(entries.has(entry), `S3 : le fichier contient ${entry}`);
  check(Buffer.compare(entries.get(entry), png) === 0, "S3 : l'entrée a les octets du PNG déposé (empreinte SHA-256 vérifiée)");
  const file2 = await saveTo("image-2.roomboard");
  check(Buffer.compare(await readFile(file2), bytes1) === 0, "S3 : enregistrer encore le même onglet donne les mêmes octets");
  const before3 = await tabs();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file1);
  await waitTabs(before3 + 1);
  check((await elements()) === 1, 'S3 : rouvert dans un nouvel onglet : data-elements="1"');
  check(await inkSoon(placed), "S3 : rouvert, les pixels sombres sont à la place de l'image");
  if (captures) {
    const path = join(ROOT, "docs", "essais", "c2-image-deposee.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }


  // Le fichier d'origine garde l'historique des gestes (annuler, rétablir, glisser) ; le document rouvert n'en garde que l'état :
  // document.ybin diffère de l'origine, c'est attendu. Rouvert puis réenregistré deux fois : mêmes octets, mêmes assets.
  const fileR = await saveTo("rouvert.roomboard");
  const chooserR = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooserR).setFiles(fileR);
  await waitTabs(before3 + 2);
  const fileR2 = await saveTo("rouvert-2.roomboard");
  // Enregistré (file1) puis rouvert et réenregistré (fileR) : mêmes entrées, même manifest, mêmes octets d'asset ; seul document.ybin peut différer.
  const e1 = zipEntries(await readFile(file1));
  const eRo = zipEntries(await readFile(fileR));
  check(JSON.stringify([...e1.keys()].sort()) === JSON.stringify([...eRo.keys()].sort()), "S3 : enregistré puis rouvert et réenregistré : mêmes noms d'entrées");
  check(e1.get("manifest.json") && eRo.get("manifest.json") && Buffer.compare(e1.get("manifest.json"), eRo.get("manifest.json")) === 0, "S3 : enregistré puis rouvert et réenregistré : même manifest.json");
  check(e1.has(entry) && eRo.has(entry) && Buffer.compare(e1.get(entry), eRo.get(entry)) === 0, "S3 : enregistré puis rouvert et réenregistré : mêmes octets de l'asset");
  const [eR, eR2] = [zipEntries(await readFile(fileR)), zipEntries(await readFile(fileR2))];
  check(eR.get("document.ybin") && Buffer.compare(eR.get("document.ybin"), eR2.get("document.ybin")) === 0, "S3 : rouvert puis réenregistré : même document.ybin");
  check(eR.has(entry) && eR2.has(entry) && Buffer.compare(eR2.get(entry), png) === 0, "S3 : rouvert puis réenregistré : mêmes assets (octets du PNG déposé)");
  // S4 : .roomboard déposé → nouvel onglet avec ses images, onglet d'origine intact.
  await page.locator(TAB).nth(0).click();
  await fr();
  const originVersion = await attr("data-version");
  const before4 = await tabs();
  await dropFile(page, "#stage", "image.roomboard", bytes1);
  await waitTabs(before4 + 1);
  check((await elements()) === 1 && (await inkSoon(placed)), "S4 : le .roomboard déposé s'ouvre dans un nouvel onglet avec son image");
  await page.locator(TAB).nth(0).click();
  await fr();
  check((await elements()) === 1 && (await attr("data-version")) === originVersion, "S4 : l'onglet d'origine reste intact");

  // S5 : collage, Importer deux images, TIFF refusé.
  await press("Control+n");
  await waitTabs(before4 + 2);
  const stage = await page.locator("#stage").boundingBox();
  const c5 = await camera();
  const mid = [stage.width / 2, stage.height / 2];
  const midBox = inner(mid[0] - (W * c5.zoom) / 2, mid[1] - (H * c5.zoom) / 2, mid[0] + (W * c5.zoom) / 2, mid[1] + (H * c5.zoom) / 2);
  await page.evaluate((bytes) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], "colle.png", { type: "image/png" }));
    document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, Array.from(png));
  await waitElements(1);
  check(await inkSoon(midBox), "S5 : l'image collée (Ctrl+V) arrive au centre de la vue");
  const p1 = join(tmp, "un.png");
  const p2 = join(tmp, "deux.png");
  await writeFile(p1, solidPng(80, 60, [200, 30, 30]));
  await writeFile(p2, solidPng(80, 60, [30, 30, 200]));
  const chooser5 = page.waitForEvent("filechooser");
  await page.click(item("file-import"));
  const fc = await chooser5;
  check(fc.isMultiple(), "S5 : « Importer » ouvre une boîte à plusieurs fichiers");
  await fc.setFiles([p1, p2]);
  await waitElements(3);
  check((await elements()) === 3, 'S5 : « Importer » deux images : data-elements="3"');
  const v5 = await attr("data-version");
  const dlg = dialogs.length;
  await dropFile(page, "#stage", "photo.tif", [0x49, 0x49, 0x2a, 0x00], "image/tiff");
  await page.waitForTimeout(500);
  const told = dialogs.slice(dlg).find((d) => d.type === "alert");
  check(told !== undefined && told.message.includes(LATER), `S5 : TIFF refusé (« ${told?.message} »)`);
  check((await attr("data-version")) === v5, "S5 : TIFF refusé, data-version inchangé");
  // S5 : un fichier de plus de 100 Mo est refusé avant lecture (taille simulée, rien d'écrit sur disque).
  const dlgBig = dialogs.length;
  await page.evaluate(() => {
    const f = new File([new Uint8Array(8)], "enorme.png", { type: "image/png" });
    Object.defineProperty(f, "size", { value: 100 * 1024 * 1024 + 1 });
    const dt = new DataTransfer();
    dt.items.add(f);
    const target = document.querySelector("#stage");
    const r = target.getBoundingClientRect();
    for (const t of ["dragover", "drop"]) {
      target.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.x + 50, clientY: r.y + 50 }));
    }
  });
  await page.waitForTimeout(500);
  const big = dialogs.slice(dlgBig).find((d) => d.type === "alert");
  check(big !== undefined && big.message.includes("trop gros"), `S5 : fichier de plus de 100 Mo refusé (« ${big?.message} »)`);
  check((await elements()) === 3 && (await attr("data-version")) === v5, "S5 : fichier trop gros refusé, rien d'ajouté");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c2-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp });
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
