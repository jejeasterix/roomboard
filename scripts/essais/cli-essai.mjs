// Essai de bout en bout de la CLI (cadrage cli, S5, D14) : créer un tableau, y ajouter des éléments, enregistrer,
// exporter en .rbitem, relire, comparer `pages` et `assets` (ids normalisés par rang, aucun champ retiré).
// Aucun navigateur. Écrit sous un dossier temporaire retiré en fin d'essai. `CLI : OK` ou `CLI : ÉCHEC — <écart>`.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deepStrictEqual } from "node:assert";
import { ROOT, solidPng } from "./commun.mjs";

const BIN = join(ROOT, "apps", "cli", "dist", "roomboard.mjs");
const XLSX = join(ROOT, "crates", "roomboard-formats", "tests", "fixtures", "valeurs.xlsx");
const dir = mkdtempSync(join(tmpdir(), "roomboard-cli-essai-"));
let n = 0;

class Ecart extends Error {}
const ok = (nom) => console.log(`ok — ${++n} ${nom}`);
const verifie = (nom, cond, detail = "") => {
  if (!cond) throw new Ecart(`${nom}${detail ? ` (${detail})` : ""}`);
  ok(nom);
};

/** Lance le binaire ; rend code, lignes JSON de stdout, objet de stderr. */
function cli(args, input) {
  const r = spawnSync("node", [BIN, ...args], { encoding: "utf8", input, env: { ...process.env, ROOMBOARD_NOW: "1700000000000" } });
  const lignes = (r.stdout ?? "").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l));
  const err = (r.stderr ?? "").trim();
  return { code: r.status, lignes, err: err === "" ? null : JSON.parse(err), brut: `${r.stdout}${r.stderr}` };
}

/** Ids remplacés par leur rang d'apparition (stable entre deux fichiers) ; le champ `file` garde sa place, valeur neutre. */
function normalise(valeur) {
  const rang = new Map();
  const id = (s) => {
    if (!rang.has(s)) rang.set(s, `#${rang.size}`);
    return rang.get(s);
  };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const marche = (v, cle) => {
    if (Array.isArray(v)) return v.map((x) => marche(x, cle));
    if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, marche(x, k)]));
    if (cle === "file") return "<fichier>";
    return typeof v === "string" && UUID.test(v) ? id(v) : v;
  };
  return marche(valeur, "");
}
const etat = (f) => {
  const r = cli(["state", f]);
  if (r.code !== 0 || r.lignes.length !== 1) throw new Ecart(`state ${f} : code ${r.code} ${r.brut}`);
  return r.lignes[0];
};
const partie = (e) => normalise({ pages: e.pages, assets: e.assets });
const egal = (nom, a, b) => {
  try {
    deepStrictEqual(a, b);
  } catch (e) {
    throw new Ecart(`${nom} : ${String(e.message).split("\n").slice(0, 6).join(" ")}`);
  }
  ok(nom);
};

try {
  verifie("CLI construite", existsSync(BIN), BIN);
  verifie("wasm du cœur livré avec la CLI", existsSync(join(ROOT, "apps", "cli", "dist", "wasm")));

  const v = cli(["version"]);
  verifie("version : schéma roomboard-cli/1", v.code === 0 && v.lignes[0].schema === "roomboard-cli/1", v.brut);

  const f = cli(["formats"]).lignes[0].formats;
  const rb = f.find((x) => x.ext === ".roomboard");
  verifie("formats : .roomboard lu et écrit", rb?.read === true && rb?.write === true);
  verifie("formats : .pdf pas encore pris en charge", f.find((x) => x.ext === ".pdf")?.read === false);

  const a = join(dir, "a.roomboard");
  const nouveau = cli(["new", a]);
  verifie("new : un tableau d'une page", nouveau.code === 0 && nouveau.lignes[0].pages.length === 1, nouveau.brut);

  const forme = (x0, y0, x1, y1, couleur) =>
    JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0, y0, x1, y1, style: { color: couleur, width: 4 }, fill: null });
  const ajoute = cli(["run", a, "--ops", "-", "--save"], `${forme(10, 20, 110, 220, "#1e40af")}\n${forme(300, 40, 360, 90, "#b91c1c")}\n`);
  verifie("run --save : deux formes ajoutées", ajoute.code === 0 && ajoute.lignes.length === 2 && ajoute.lignes.every((l) => l.ok === true), ajoute.brut);

  const png = join(dir, "rouge.png");
  writeFileSync(png, solidPng(8, 8, [200, 10, 10]));
  const imp = cli(["import", a, png, XLSX, "--at", "5,6"]);
  verifie("import : image et classeur insérés", imp.code === 0 && imp.lignes[0].inserted.length === 2, imp.brut);

  const e1 = etat(a);
  const genres = e1.pages[0].elements.map((x) => x.kind).sort();
  verifie("state : formes, image et tableau présents", JSON.stringify(genres) === JSON.stringify(["image", "shape", "shape", "table"]), genres.join(","));
  verifie("state : un asset pour l'image", e1.assets.length === 1);

  const b = join(dir, "b.roomboard");
  const copie = cli(["run", a, "--ops", "-", "--out", b], "");
  verifie("run --out : copie enregistrée", copie.code === 0, copie.brut);
  egal("rouvrir : pages et assets identiques après enregistrement", partie(e1), partie(etat(b)));

  const item = join(dir, "sortie.rbitem");
  const exp = cli(["export", a, item, "--all"]);
  verifie("export --all : fragment de 4 éléments", exp.code === 0 && exp.lignes[0].elements === 4, exp.brut);
  const e2 = etat(item);
  egal("relire le .rbitem : pages et assets identiques à la source", partie(e1), partie(e2));

  const refuse = cli(["run", a, "--ops", "-", "--save"], `${forme(0, 0, 5, 5, "#000000").replace('"width":4', '"width":-1')}\n`);
  verifie("opération refusée : code 1 et erreur sur stderr", refuse.code === 1 && refuse.err?.error?.code === "command", refuse.brut);
  egal("fichier inchangé après un refus", partie(e1), partie(etat(a)));

  const pdf = cli(["import", a, join(dir, "x.pdf")]);
  verifie("import d'un .pdf : code 3, erreur unsupported", pdf.code === 3 && pdf.err?.error?.code === "unsupported", pdf.brut);
  verifie("option inconnue : code 2", cli(["state", a, "--nope"]).code === 2);
  console.log("CLI : OK");
} catch (e) {
  console.log(`CLI : ÉCHEC — ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
