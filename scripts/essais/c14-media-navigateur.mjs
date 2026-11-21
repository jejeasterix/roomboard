#!/usr/bin/env node
// Essai C14 média au navigateur (S1 à S4 du cadrage, lot C14) : déposer une vidéo WebM et un son WAV générés ici,
// lire par la barre RoomBoard, rogner, boucle, volume, annuler/rétablir, enregistrer, rouvrir, refuser MKV, AVI et
// plus de 100 Mo, ouvrir un fichier d'avant C14. Application construite servie en local avec la CSP de la coque,
// Chromium headless de Playwright, repli (`?fichiers=repli`), heure figée. Oracles : #stage[data-media|data-elements|
// data-bounds|data-camera], pixels du canvas, entrées du .roomboard. Code : 0 réussi, 1 échec, 2 outil absent.
//
// Choix de média : le Chromium de Playwright (Linux) n'a pas de décodeur H.264. Aucun MP4/H.264 n'est donc utilisé :
// la vidéo est un WebM VP8 enregistré dans une page vierge (canvas animé + MediaRecorder, 2,4 s), le son un WAV écrit
// à la main (PCM 16 bits, en-tête RIFF). Ni ffmpeg, ni `recordVideo` de Playwright, ni fichier commité.
// Usage : node scripts/essais/c14-media-navigateur.mjs [--captures] (docs/essais/c14-media-lecture.png).
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, item, loadPlaywright, serve, sha256, stageBox, stageMouse, zipEntries } from "./commun.mjs";

const LABEL = "C14 média";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
const DURATION = 2.4;
const COLORS = { rouge: [255, 0, 0], vert: [0, 200, 0], bleu: [0, 0, 255], jaune: [255, 255, 0] };
const PRE_C14 = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "image-c2.roomboard");

/** WAV mono 8 kHz, PCM 16 bits, 440 Hz, en-tête RIFF écrit à la main. */
function makeWav(seconds) {
  const rate = 8000;
  const n = Math.round(rate * seconds);
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(12000 * Math.sin((2 * Math.PI * 440 * i) / rate)), 44 + i * 2);
  return b;
}

/** En-tête EBML (1A 45 DF A3) avec DocType donné : « webm » ou « matroska ». */
function ebml(doctype) {
  const body = Buffer.concat([Buffer.from([0x42, 0x82, 0x80 | doctype.length]), Buffer.from(doctype, "latin1")]);
  return Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x80 | body.length]), body, Buffer.alloc(64)]);
}
/** AVI : RIFF, taille, « AVI », puis du remplissage. */
function avi() {
  const b = Buffer.alloc(256);
  b.write("RIFF", 0);
  b.writeUInt32LE(248, 4);
  b.write("AVI LIST", 8);
  return b;
}

/** Vidéo WebM VP8 générée dans une page vierge : toile 320 × 180, couleur unie changée toutes les 0,5 s. */
async function makeWebm(context, seconds) {
  const p = await context.newPage();
  try {
    await p.goto("about:blank");
    const data = await p.evaluate(
      ([seconds, colors]) =>
        new Promise((resolve, reject) => {
          const c = document.createElement("canvas");
          c.width = 320;
          c.height = 180;
          const g = c.getContext("2d");
          let i = 0;
          const paint = () => {
            g.fillStyle = `rgb(${colors[i % colors.length].join(",")})`;
            g.fillRect(0, 0, 320, 180);
          };
          paint();
          const rec = new MediaRecorder(c.captureStream(30), { mimeType: "video/webm;codecs=vp8" });
          const chunks = [];
          rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
          rec.onerror = () => reject(new Error("MediaRecorder en erreur"));
          rec.onstop = async () => resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));
          const timer = setInterval(() => {
            i++;
            paint();
          }, 500);
          rec.start(100);
          setTimeout(() => {
            clearInterval(timer);
            rec.stop();
          }, seconds * 1000);
        }),
      [seconds, Object.values(COLORS)],
    );
    return Buffer.from(data);
  } finally {
    await p.close();
  }
}

const nearest = ([r, g, b]) => {
  let best = null;
  let bestD = Infinity;
  for (const [name, c] of Object.entries(COLORS)) {
    const d = Math.hypot(r - c[0], g - c[1], b - c[2]);
    if (d < bestD) [best, bestD] = [name, d];
  }
  return { name: best, dist: bestD };
};

async function scenario(page, url, { captures, tmp, webm, wav }) {
  const errors = [];
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
  const tag = async () => ((await attr("data-media")) ?? "").split(";");
  const tabs = () => page.locator(TAB).count();
  const until = async (probe, msg, ms = 20000) => {
    const end = Date.now() + ms;
    for (;;) {
      if (await probe()) return console.log(`ok — ${msg}`);
      if (Date.now() > end) throw new Echec(`${msg} (délai ; data-media « ${await attr("data-media")} », data-elements « ${await attr("data-elements")} », erreurs : ${errors.join(" | ")})`);
      await fr();
    }
  };
  const waitTabs = (n) => until(async () => (await tabs()) === n, `${n} onglet(s)`);
  const download = async (click, name) => {
    const dl = page.waitForEvent("download");
    await click();
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  /** Couleur du pixel du canvas de scène au centre de la sélection (px de la scène). */
  const centerPixel = async () => {
    const [x0, y0, x1, y1] = ((await attr("data-bounds")) ?? "").split(",").map(Number);
    const { zoom, tx, ty } = await camera();
    const cx = ((x0 + x1) / 2) * zoom + tx;
    const cy = ((y0 + y1) / 2) * zoom + ty;
    return page.$eval(
      "#scene",
      (c, [cx, cy]) => {
        const sx = c.width / c.clientWidth;
        const sy = c.height / c.clientHeight;
        const d = c.getContext("2d").getImageData(Math.round(cx * sx), Math.round(cy * sy), 1, 1).data;
        return [d[0], d[1], d[2]];
      },
      [cx, cy],
    );
  };
  const blur = () => page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const press = async (k) => {
    await blur();
    await page.keyboard.press(k);
    await fr();
  };
  const toggle = async () => {
    await page.click('[data-media="toggle"]');
    await fr();
  };
  const seek = (t) =>
    page.$eval('[data-media="position"]', (el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, t);
  const messageSeen = (needle) => until(async () => dialogs.some((m) => m.includes(needle)) || (await page.evaluate(() => document.body.innerText)).includes(needle), `message « ${needle} »`);

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  const box = await stageBox(page, 640);
  check(box.height >= 640, `scène mesurée ${Math.round(box.height)} px (>= 640)`);

  // S1 : dépôt d'une vidéo WebM de 2,4 s, puis sélection : la barre du média s'ouvre.
  await dropFile(page, "#stage", "essai.webm", webm, "video/webm", [300, 250]);
  await until(async () => (await attr("data-elements")) === "1", 'S1 : WebM déposé : data-elements="1"');
  await page.click(item("select"));
  await mouse.click(360, 290);
  await until(async () => (await tag())[0] === "video", "S1 : élément média sélectionné : data-media commence par « video »");
  check((await tag())[1] === "poster", `S1 : avant lecture, l'état est « poster » (« ${(await attr("data-media")) ?? ""} »)`);
  await page.waitForSelector("[data-media-bar]");
  const withBar = await stageBox(page, 640);
  check(withBar.height >= 640, `S1 : scène mesurée ${Math.round(withBar.height)} px (>= 640) avec la barre du média ouverte`);

  // S1 : lecture, l'image dessinée change.
  await toggle();
  await until(async () => (await tag())[1] === "lecture", "S1 : Lecture : data-media passe à « lecture »");
  await fr();
  const a = await centerPixel();
  const seen = [nearest(a)];
  let changed = false;
  for (let i = 0; i < 12 && !changed; i++) {
    await page.waitForTimeout(250);
    await fr();
    const p = await centerPixel();
    seen.push(nearest(p));
    changed = Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]) > 80;
  }
  check(changed, `S1 : l'image change pendant la lecture (couleurs vues : ${seen.map((s) => s.name).join(", ")})`);
  check(seen.every((s) => s.dist < 150), "S1 : le pixel central est toujours proche d'une des quatre couleurs de la vidéo");
  if (captures) {
    await page.screenshot({ path: join(ROOT, "docs", "essais", "c14-media-lecture.png") });
    console.log("capture : docs/essais/c14-media-lecture.png");
  }
  await toggle();
  await until(async () => (await tag())[1] === "pause", "S1 : Pause : data-media passe à « pause »");
  await fr();
  const p1 = await centerPixel();
  await page.waitForTimeout(700);
  await fr();
  const p2 = await centerPixel();
  check(Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]) < 40, "S1 : en pause, l'image reste stable");

  // S2 : rognage, boucle, volume ; un Ctrl+Z défait un réglage.
  await seek(0.5);
  await page.click('[data-media="start"]');
  await seek(1.5);
  await page.click('[data-media="end"]');
  await page.click('[data-media="loop"]');
  await page.$eval('[data-media="volume"]', (el) => {
    el.value = "40";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await fr();
  const rest = () => tag().then((t) => t.slice(3).join(";"));
  await until(async () => (await rest()) === "0.5-1.5;1;40", `S2 : réglages écrits : rognage 0.5-1.5, boucle, volume 40 (« ${(await attr("data-media")) ?? ""} »)`);
  await toggle();
  await until(async () => (await tag())[1] === "lecture", "S2 : lecture après rognage");
  const times = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(200);
    times.push(Number((await tag())[2]));
  }
  check(times.every((t) => t >= 0.4 && t <= 1.6), `S2 : en boucle, la position reste dans [0,4 ; 1,6] sur 1,6 s (${times.join(", ")})`);
  await toggle();
  await until(async () => (await tag())[1] === "pause", "S2 : pause avant d'annuler");
  const undone = [];
  for (const [i, expected] of [[0, "0.5-1.5;1;100"], [1, "0.5-1.5;0;100"]]) {
    await press("Control+z");
    undone.push(await rest());
    check(undone[i] === expected, `S2 : Ctrl+Z n° ${i + 1} défait un seul réglage : « ${undone[i]} »`);
  }
  await press("Control+z");
  check((await rest()).startsWith("0.5-") && !(await rest()).startsWith("0.5-1.5"), `S2 : Ctrl+Z n° 3 défait la fin : « ${await rest()} »`);
  await press("Control+z");
  check((await rest()).startsWith("0.0-"), `S2 : Ctrl+Z n° 4 défait le début : « ${await rest()} »`);
  for (let i = 0; i < 4; i++) await press("Control+y");
  check((await rest()) === "0.5-1.5;1;40", `S2 : quatre Ctrl+Y rétablissent les réglages : « ${await rest()} »`);

  // S3 : un son WAV déposé, lu.
  await dropFile(page, "#stage", "son.wav", wav, "audio/wav", [700, 250]);
  await until(async () => (await attr("data-elements")) === "2", 'S3 : WAV déposé : data-elements="2"');
  await mouse.click(760, 280);
  await until(async () => (await tag())[0] === "audio", "S3 : carte du son sélectionnée : data-media commence par « audio »");
  await toggle();
  await until(async () => (await tag())[1] === "lecture", "S3 : le son passe à « lecture »");
  await toggle();

  // S4 : MKV et AVI refusés avec un message, rien d'inséré ; plus de 100 Mo refusé (R10 : construit dans la page).
  await dropFile(page, "#stage", "film.mkv", ebml("matroska"), "video/x-matroska", [300, 600]);
  await messageSeen("format MKV non lu");
  await dropFile(page, "#stage", "film.avi", avi(), "video/x-msvideo", [300, 600]);
  await messageSeen("format AVI non lu");
  check((await attr("data-elements")) === "2", 'S4 : MKV et AVI refusés, rien d\'inséré : data-elements="2"');
  await page.evaluate(async (head) => {
    const zeros = new ArrayBuffer(1024 * 1024);
    const parts = [new Uint8Array(head)];
    for (let i = 0; i < 101; i++) parts.push(zeros);
    const dt = new DataTransfer();
    dt.items.add(new File(parts, "enorme.webm", { type: "video/webm" }));
    const target = document.querySelector("#stage");
    const r = target.getBoundingClientRect();
    for (const t of ["dragover", "drop"]) target.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.x + 300, clientY: r.y + 600 }));
  }, Array.from(ebml("webm")));
  await messageSeen("plus de 100 Mo");
  check((await attr("data-elements")) === "2", 'S4 : fichier de plus de 100 Mo refusé : data-elements="2"');

  // S3 : enregistrer, relire le zip, rouvrir dans un nouvel onglet.
  await blur();
  const saved = await download(() => page.keyboard.press("Control+s"), "media.roomboard");
  const bytes = await readFile(saved);
  const entries = zipEntries(bytes);
  const names = [...entries.keys()];
  const webmEntry = `assets/${sha256(webm)}.webm`;
  const wavEntry = `assets/${sha256(wav)}.bin`;
  check(entries.has(webmEntry) && Buffer.compare(entries.get(webmEntry), webm) === 0, `S3 : le .roomboard contient ${webmEntry} avec les octets de la vidéo`);
  check(entries.has(wavEntry) && Buffer.compare(entries.get(wavEntry), wav) === 0, `S3 : le .roomboard contient ${wavEntry} avec les octets du son`);
  check(names.some((n) => n.startsWith("assets/") && n.endsWith(".jpg")), "S3 : le .roomboard contient l'affiche (.jpg) de la vidéo");
  const n0 = await tabs();
  await dropFile(page, "#stage", "media.roomboard", bytes, "application/x-roomboard");
  await waitTabs(n0 + 1);
  await until(async () => (await attr("data-elements")) === "2", 'S3 : rouvert dans un nouvel onglet : data-elements="2"');
  await page.click(item("select"));
  await mouse.click(360, 290);
  await until(async () => (await tag())[0] === "video", "S3 : vidéo rouverte sélectionnée");
  check((await rest()) === "0.5-1.5;1;40", `S3 : réglages conservés à la réouverture : « ${await rest()} »`);
  await toggle();
  await until(async () => (await tag())[1] === "lecture", "S3 : la vidéo rouverte se lit : data-media « lecture »");
  await toggle();

  // Fichier d'avant C14 : ouverture inchangée.
  const n1 = await tabs();
  await dropFile(page, "#stage", "image-c2.roomboard", await readFile(PRE_C14), "application/x-roomboard");
  await waitTabs(n1 + 1);
  await until(async () => Number(await attr("data-elements")) >= 1, "fichier d'avant C14 ouvert dans un nouvel onglet, éléments présents");
  check(((await attr("data-media")) ?? "") === "", "fichier d'avant C14 : aucun média, data-media vide");

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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c14-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1" || u.protocol === "about:" || u.protocol === "blob:" || u.protocol === "data:") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const webm = await makeWebm(context, DURATION);
    console.log(`ok — vidéo WebM générée (${webm.length} o), son WAV généré`);
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp, webm, wav: makeWav(1) });
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
