// Comparaison de deux CLI construites (cadrage cli-partage, S1, D13) : B (base 7092fdd) et N (branche). Mêmes entrées
// fabriquées (fabriques du dépôt, rien de téléchargé), mêmes commandes, chacune dans son dossier neuf. Exige : codes
// égaux, stdout et stderr égaux après `normalise` (UUID par rang, valeur de `file` neutre) ; fichiers exportés égaux en
// SHA-256, sauf un format que B n'écrit pas deux fois à l'identique (contrôle préalable) : comparé alors par relecture
// (PDF : pages, texte, XObject ; .iwb/.ubz : state normalisé après convert par B) et l'écart de B noté ; enfin
// created === modified dans le manifeste d'un document neuf exporté puis enregistré (D7), pour B comme pour N.
// Usage : node scripts/essais/cli-comparer.mjs <B/roomboard.mjs> <N/roomboard.mjs>
// Sortie : `COMPARAISON : OK` (code 0) ou `COMPARAISON : ÉCART — <détail>` (code 1) ; usage : code 2.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { deepStrictEqual } from "node:assert";
import { ROOT, sha256, zipEntries } from "./commun.mjs";
import { normalise } from "./cli-normalise.mjs";
import { iwbZip } from "./fabriques/tableaux.mjs";
import { pdfPages, readLibs, readPdf } from "./fabriques/pdf.mjs";

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("usage : node scripts/essais/cli-comparer.mjs <B/roomboard.mjs> <N/roomboard.mjs>");
  process.exit(2);
}
const [B, N] = args.map((p) => resolve(p));
if (B === N) {
  console.error("usage : B et N doivent désigner deux CLI différentes");
  process.exit(2);
}
const web = createRequire(join(ROOT, "apps", "web", "package.json"));
const { zipSync } = web("fflate");
const NOW = "1795392000000"; // ROOMBOARD_NOW du cadrage (S1, préalable)
const racine = mkdtempSync(join(tmpdir(), "roomboard-cli-comparer-"));
let n = 0;

class Ecart extends Error {}
const ok = (nom) => console.log(`ok — ${++n} ${nom}`);
const note = (texte) => console.log(`note — ${texte}`);
const verifie = (nom, cond, detail = "") => {
  if (!cond) throw new Ecart(`${nom}${detail ? ` (${detail})` : ""}`);
  ok(nom);
};
const egal = (nom, a, b) => {
  try {
    deepStrictEqual(a, b);
  } catch (e) {
    throw new Ecart(`${nom} : ${String(e.message).split("\n").slice(0, 8).join(" ")}`);
  }
  ok(nom);
};

/** Lance `bin` dans `cwd` (chemins relatifs : aucun dossier dans les messages) ; `now` null : ROOMBOARD_NOW retiré. */
function cli(bin, cwd, argv, input = "", now = NOW) {
  const env = { ...process.env };
  delete env.ROOMBOARD_NOW;
  if (now !== null) env.ROOMBOARD_NOW = now;
  const r = spawnSync("node", [bin, ...argv], { cwd, encoding: "utf8", input, env });
  const lire = (t) =>
    (t ?? "")
      .split("\n")
      .filter((l) => l !== "")
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return l;
        }
      });
  return { code: r.status, out: lire(r.stdout), err: lire(r.stderr), brut: `${r.stdout ?? ""}${r.stderr ?? ""}`.slice(0, 600) };
}
/** Code, stdout et stderr comparables (UUID par rang sur toute la sortie, `file` neutre) ; JSON.stringify garde l'ordre des clés. */
const sortie = (r) => ({ code: r.code, out: JSON.stringify(normalise(r.out)), err: JSON.stringify(normalise(r.err)) });

const ENTREES = ["lecon.iwb", "three.pdf", "abime.iwb", "bad.pdf", "l.roomboard", "t.roomboard"];
const prep = join(racine, "prep");
/** Dossier neuf garni des six entrées (mêmes octets pour B et pour N). */
const dossier = (nom) => {
  const d = join(racine, nom);
  mkdirSync(d);
  for (const f of ENTREES) copyFileSync(join(prep, f), join(d, f));
  return d;
};
let libs = null;
/** Relecture d'un fichier exporté : PDF par readPdf ; .iwb/.ubz par B (même lecteur des deux côtés), state normalisé. */
async function relu(path) {
  if (path.endsWith(".pdf")) {
    libs ??= await readLibs(web, { worker: true });
    return readPdf(readFileSync(path), libs);
  }
  const d = mkdtempSync(join(racine, "relu-"));
  const c = cli(B, d, ["convert", path, "r.roomboard"]);
  if (c.code !== 0) throw new Ecart(`relecture de ${path} : code ${c.code} ${c.brut}`);
  return normalise(cli(B, d, ["state", "r.roomboard"]).out);
}

try {
  // Entrées : fabriquées une fois ; l.roomboard et t.roomboard produits une seule fois, par B (ids aléatoires du cœur).
  mkdirSync(prep);
  writeFileSync(join(prep, "lecon.iwb"), iwbZip(zipSync));
  writeFileSync(join(prep, "three.pdf"), await pdfPages(web("pdf-lib"), 3));
  writeFileSync(join(prep, "abime.iwb"), Buffer.from("<iwb")); // XML mal formé (workspace.test.ts:1602)
  writeFileSync(join(prep, "bad.pdf"), Buffer.from("%PDF-1.4\n%%EOF\n"));
  for (const [src, out] of [["lecon.iwb", "l.roomboard"], ["three.pdf", "t.roomboard"]]) {
    const r = cli(B, prep, ["convert", src, out]);
    verifie(`préparation : B convert ${src} ${out}`, r.code === 0, r.brut);
  }

  // S1.1 — sorties JSON et codes
  const douze = `${[...Array.from({ length: 11 }, () => JSON.stringify({ op: "tab.new" })), JSON.stringify({ op: "import", files: ["lecon.iwb"] })].join("\n")}\n`;
  const COMMANDES = [
    [["state", "lecon.iwb"]],
    [["state", "three.pdf"]],
    [["state", "l.roomboard"]],
    [["state", "abime.iwb"]],
    [["state", "bad.pdf"]],
    [["new", "a.roomboard"]],
    [["import", "a.roomboard", "lecon.iwb", "three.pdf", "abime.iwb"]],
    [["run", "--new", "--ops", "-"], douze],
  ];
  const dB = dossier("B");
  const dN = dossier("N");
  for (const [argv, input] of COMMANDES) egal(`S1.1 ${argv.join(" ")}`, sortie(cli(N, dN, argv, input)), sortie(cli(B, dB, argv, input)));

  // S1.2 — fichiers exportés ; contrôle préalable : chaque binaire exporte deux fois, dans deux dossiers neufs
  const EXPORTS = [
    ["export", "l.roomboard", "l.iwb"],
    ["export", "l.roomboard", "l.ubz"],
    ["export", "t.roomboard", "t.pdf"],
    ["convert", "t.roomboard", "t.iwb"],
  ];
  const dirs = { B: [dossier("B1"), dossier("B2")], N: [dossier("N1"), dossier("N2")] };
  for (const argv of EXPORTS) {
    const rB = dirs.B.map((d) => cli(B, d, argv));
    const rN = dirs.N.map((d) => cli(N, d, argv));
    egal(`S1.2 ${argv.join(" ")} : sortie`, sortie(rN[0]), sortie(rB[0]));
    verifie(`S1.2 ${argv.join(" ")} : code 0`, rB[0].code === 0 && rB[1].code === 0 && rN[1].code === 0, rB[0].brut);
    const f = argv[2];
    const h = (d) => sha256(readFileSync(join(d, f)));
    const [b1, b2] = dirs.B.map(h);
    const [n1, n2] = dirs.N.map(h);
    if (b1 === b2) {
      verifie(`S1.2 ${f} : N stable comme B`, n1 === n2, `${n1} ≠ ${n2}`);
      verifie(`S1.2 ${f} : SHA-256 égaux (B = N)`, n1 === b1, `B ${b1} ; N ${n1}`);
    } else {
      note(`${f} : B diffère de lui-même (${b1} ≠ ${b2}) ; comparé par relecture`);
      egal(`S1.2 ${f} : relecture égale (B = N)`, await relu(join(dirs.N[0], f)), await relu(join(dirs.B[0], f)));
    }
  }

  // S1.3 — created === modified d'un document neuf exporté puis enregistré, sans ROOMBOARD_NOW (D7)
  const forme = { type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style: { color: "#1e40af", width: 4 }, fill: null };
  const opsC = `${JSON.stringify(forme)}\n${JSON.stringify({ op: "export", to: "c.iwb" })}\n`;
  for (const [nom, bin] of [["B", B], ["N", N]]) {
    const d = dossier(`C${nom}`);
    const r = cli(bin, d, ["run", "--new", "--out", "c.roomboard", "--ops", "-"], opsC, null);
    verifie(`S1.3 ${nom} : run --new --out c.roomboard (forme, export c.iwb, enregistrement)`, r.code === 0, r.brut);
    const m = JSON.parse(zipEntries(readFileSync(join(d, "c.roomboard"))).get("manifest.json").toString("utf8"));
    verifie(`S1.3 ${nom} : created === modified (D7)`, m.created === m.modified, JSON.stringify({ created: m.created, modified: m.modified }));
  }
  console.log("COMPARAISON : OK");
} catch (e) {
  console.log(`COMPARAISON : ÉCART — ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  rmSync(racine, { recursive: true, force: true });
}
