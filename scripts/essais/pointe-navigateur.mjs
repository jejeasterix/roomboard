#!/usr/bin/env node
// OF73 : la pointe du trait vif, image par image, à la souris (Chromium sans tête, événements CDP de Playwright).
// Un tracé à petits changements de direction, un mouvement par image ; après chaque image, on lit les pixels d'encre
// près de la pointe et on mesure ce qui dépasse le tracé réel (polyligne des points envoyés) : longueur et direction.
// `--sans-predits` : `getPredictedEvents` rend [] (référence sans points prédits natifs). `--type pen` : même tracé au
// stylet (CDP `pointerType: "pen"`). `--query <?…>` : réglages de l'adresse (ex. `?echelons=2:off`).
// Hors de scripts/verifier.sh : une mesure, pas un test. Code de sortie : 0 (mesure faite), 1 échec, 2 outil absent.
// Usage : node scripts/essais/pointe-navigateur.mjs [--sans-predits] [--type pen] [--query ?…] [--dist <build>] [--json f]
import { writeFileSync } from "node:fs";

import { Echec, VIEWPORT, frames, loadPlaywright, serve, stageBox } from "./commun.mjs";

const argv = process.argv.slice(2);
const sansPredits = argv.includes("--sans-predits");
const query = (() => {
  const i = argv.indexOf("--query");
  return i < 0 ? "" : argv[i + 1];
})();
const pointerType = (() => {
  const i = argv.indexOf("--type");
  return i < 0 ? "mouse" : argv[i + 1];
})();
const dist = (() => {
  const i = argv.indexOf("--dist");
  return i < 0 ? undefined : argv[i + 1];
})();
const jsonOut = (() => {
  const i = argv.indexOf("--json");
  return i < 0 ? null : argv[i + 1];
})();

/** Tracé reproductible : avance vers la droite, la direction tourne de ±25° à ±60° toutes les 2 à 4 images. */
function path() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pts = [[150, 380]];
  let a = 0;
  let k = 0;
  for (let i = 0; i < 60; i++) {
    if (k-- <= 0) {
      a = Math.max(-1.3, Math.min(1.3, a + (rnd() < 0.5 ? -1 : 1) * (0.45 + rnd() * 0.6)));
      k = 2 + Math.floor(rnd() * 3);
    }
    const [x, y] = pts[pts.length - 1];
    const step = 7 + rnd() * 5;
    pts.push([x + step * Math.cos(a), y + step * Math.sin(a)]);
  }
  return pts;
}

/** Distance d'un point à un segment. */
function distSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright absent (cache npx)");
  process.exit(2);
}
const server = await serve(dist ? { dist } : {});
const url = `http://127.0.0.1:${server.address().port}/${query}`;
const browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  await page.addInitScript((off) => {
    window.__pred = [];
    const orig = PointerEvent.prototype.getPredictedEvents;
    PointerEvent.prototype.getPredictedEvents = function () {
      const p = off ? [] : orig.call(this);
      if (this.type === "pointermove" && this.buttons) window.__pred.push(p.map((e) => [e.clientX, e.clientY]));
      return p;
    };
    // Lecteur armé avant chaque mouvement : son rappel d'image, posé pendant le pointermove, passe après celui du
    // moteur (posé à l'image précédente) dans la même image. À l'image suivante sans point nouveau, le contour vif
    // est recalculé sans les prédits : une capture plus tardive ne les verrait plus.
    window.__arm = (c) => {
      window.__shot = new Promise((done) => {
        const onMove = () => {
          removeEventListener("pointermove", onMove, true);
          requestAnimationFrame(async () => {
            const cv = document.querySelector("#interaction");
            const st = document.querySelector("#stage").getBoundingClientRect();
            const rc = cv.getBoundingClientRect();
            const sx = cv.width / rc.width;
            const ox = Math.round((c.x + st.left - rc.left) * sx);
            const oy = Math.round((c.y + st.top - rc.top) * sx);
            const w = Math.round(c.width * sx);
            const img = cv.getContext("2d").getImageData(ox, oy, w, w);
            const d = img.data;
            const out = [];
            for (let j = 0; j < d.length; j += 4) {
              if (d[j + 3] > 128 && d[j] + d[j + 1] + d[j + 2] < 300) out.push(((j / 4) % w) / sx, Math.floor(j / 4 / w) / sx);
            }
            const oc = new OffscreenCanvas(w, w);
            const octx = oc.getContext("2d");
            octx.fillStyle = "#fff";
            octx.fillRect(0, 0, w, w);
            const tmp = new OffscreenCanvas(w, w);
            tmp.getContext("2d").putImageData(img, 0, 0);
            octx.drawImage(tmp, 0, 0);
            const b = new Uint8Array(await (await oc.convertToBlob()).arrayBuffer());
            let bin = "";
            for (const v of b) bin += String.fromCharCode(v);
            done({ dark: out, png: btoa(bin) });
          });
        };
        addEventListener("pointermove", onMove, true);
      });
    };
  }, sansPredits);
  await page.goto(url);
  await page.waitForSelector("#stage[data-elements]");
  await frames(page);
  const box = await stageBox(page);
  const pts = path();
  const real = [];
  const tips = [];
  const R = 40; // demi-côté de la fenêtre lue autour du dernier point réel
  // CDP avec horodatages explicites (8 ms) : sans eux, Chromium ne calcule aucun point prédit.
  const cdp = await page.context().newCDPSession(page);
  let t = Date.now() / 1000;
  const send = (type, [x, y], extra = {}) =>
    cdp.send("Input.dispatchMouseEvent", { type, x: box.x + x, y: box.y + y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, timestamp: t, pointerType, ...(pointerType === "pen" ? { force: 0.5 } : {}), ...extra });
  await send("mouseMoved", pts[0], { buttons: 0, button: "none" });
  t += 0.008;
  await send("mousePressed", pts[0], { clickCount: 1 });
  real.push(pts[0]);
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    const clip = { x: Math.round(x - R), y: Math.round(y - R), width: 2 * R, height: 2 * R };
    await page.evaluate((c) => window.__arm(c), clip);
    t += 0.008;
    await send("mouseMoved", pts[i]);
    real.push(pts[i]);
    const { dark, png } = await page.evaluate(() => window.__shot);
    // Pixels d'encre à plus de 4 px du tracé réel : ce qui dépasse. Longueur = plus loin du dernier point réel.
    let over = 0;
    let far = 0;
    let fx = 0;
    let fy = 0;
    for (let j = 0; j < dark.length; j += 2) {
      const px = clip.x + dark[j];
      const py = clip.y + dark[j + 1];
      let d = Infinity;
      for (let s = Math.max(1, real.length - 12); s < real.length; s++) d = Math.min(d, distSeg(px, py, real[s - 1], real[s]));
      if (real.length === 1) d = Math.hypot(px - x, py - y);
      if (d > 4) {
        over++;
        const r = Math.hypot(px - x, py - y);
        if (r > far) {
          far = r;
          fx = px - x;
          fy = py - y;
        }
      }
    }
    const dir = over > 0 ? Math.round((Math.atan2(fy, fx) * 180) / Math.PI) : null;
    tips.push({ i, over, far: Math.round(far * 10) / 10, dir, png });
  }
  t += 0.008;
  await send("mouseReleased", pts[pts.length - 1], { clickCount: 1 });
  const pred = await page.evaluate(() => window.__pred);
  const withPred = pred.filter((p) => p.length > 0).length;
  const overs = tips.filter((t) => t.over > 0);
  // Sauts de direction de la pointe entre deux images consécutives qui dépassent.
  let flips = 0;
  for (let j = 1; j < tips.length; j++) {
    const a = tips[j - 1].dir;
    const b = tips[j].dir;
    if (a !== null && b !== null) {
      const d = Math.abs(((b - a + 540) % 360) - 180);
      if (d > 45) flips++;
    }
  }
  const sum = {
    mode: sansPredits ? "sans prédits natifs" : "prédits natifs",
    pointerType,
    query,
    moves: pred.length,
    movesAvecPredits: withPred,
    imagesQuiDepassent: `${overs.length}/${tips.length}`,
    pixelsDepassantsTotal: tips.reduce((s, t) => s + t.over, 0),
    depassementMaxPx: Math.max(0, ...tips.map((t) => t.far)),
    sautsDeDirectionSup45: flips,
  };
  console.log(JSON.stringify(sum));
  console.log(tips.map((t) => `${t.i}:${t.over}px/${t.far}/${t.dir ?? "-"}`).join(" "));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ sum, tips }));
} catch (e) {
  console.error(e instanceof Echec ? e.message : e);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
