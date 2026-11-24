// Tests des mesures de netteté (design-l1, L1-7 ; § 10 du cadrage design) sur des rangées fabriquées, et de
// serve({ dist }) (L1-8). Joué par scripts/verifier.sh hors du bloc --e2e (aucun navigateur).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { edgeRow, fringes, gray, hex, offSegment } from "../essais/nettete.mjs";
import { serve } from "../essais/commun.mjs";

const W = [255, 255, 255];
const N = hex("#182946");
const MID = [139, 148, 162];
const rowPx = (cols) => ({ width: cols.length, height: 1, data: Uint8ClampedArray.from(cols.flatMap((c) => [...c, 255])) });

test("hex et gris : #182946 → [24, 41, 70], gris 39 ; blanc 255", () => {
  assert.deepEqual(N, [24, 41, 70]);
  assert.equal(gray(N), 39);
  assert.equal(gray(W), 255);
});
test("edgeRow : bord net, 0 pixel intermédiaire, deux traits de 3 pixels", () => {
  const cols = [W, W, N, N, N, W, W, W, N, N, N, W];
  const r = edgeRow(rowPx(cols), 0, 0, cols.length, W, N);
  assert.equal(r.intermediate, 0);
  assert.deepEqual(r.runs, [3, 3]);
  assert.deepEqual(r.gray, [255, 255, 39, 39, 39, 255, 255, 255, 39, 39, 39, 255]);
});
test("edgeRow : trait à cheval sur deux pixels (contre-épreuve) → intermédiaires comptés", () => {
  const r = edgeRow(rowPx([W, MID, N, N, MID, W]), 0, 0, 6, W, N);
  assert.equal(r.intermediate, 2);
  assert.deepEqual(r.runs, [2]);
});
test("edgeRow : tolérance 1 par composante pour « plein »", () => {
  assert.equal(edgeRow(rowPx([[254, 255, 255], [25, 42, 71]]), 0, 0, 2, W, N).intermediate, 0);
  assert.equal(edgeRow(rowPx([[253, 255, 255]]), 0, 0, 1, W, N).intermediate, 1);
});
test("edgeRow : un bord sombre mais pas plein est intermédiaire, pas de l'encre (inkIn, tolérance 40, le compterait)", () => {
  // [60, 75, 100] : à 36 au plus de #182946 par composante, somme 235 < 300 : de l'encre pour inkIn (commun.mjs:74).
  const r = edgeRow(rowPx([W, [60, 75, 100], N, N, N, W]), 0, 0, 6, W, N);
  assert.equal(r.intermediate, 1);
  assert.deepEqual(r.runs, [3]);
});
test("offSegment : fond, encre et milieu sur le segment ; rouge loin", () => {
  assert.equal(offSegment(W, W, N), 0);
  assert.equal(offSegment(N, W, N), 0);
  assert.ok(offSegment(MID, W, N) <= 1);
  assert.ok(offSegment([200, 40, 40], W, N) > 2);
});
test("fringes : mélanges fond/encre → 0 ; un pixel coloré → 1", () => {
  const ok = { width: 3, height: 2, data: Uint8ClampedArray.from([W, MID, N, N, MID, W].flatMap((c) => [...c, 255])) };
  assert.equal(fringes(ok, W, N), 0);
  assert.equal(fringes(rowPx([W, [200, 40, 40], N]), W, N), 1);
  assert.equal(fringes(rowPx([N, MID, W]), N, W), 0);
});
test("serve({ dist }) sert un autre dossier que apps/web/dist", async () => {
  const dir = await mkdtemp(join(tmpdir(), "of43-serve-"));
  await writeFile(join(dir, "index.html"), "avant");
  const server = await serve({ dist: dir });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(await res.text(), "avant");
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
