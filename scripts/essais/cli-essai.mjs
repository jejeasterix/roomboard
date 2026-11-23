// Essai de bout en bout de la CLI (cadrage cli, S5, D14) : créer un tableau, y ajouter des éléments, enregistrer,
// exporter en .rbitem, relire, comparer l'état de session au fichier rouvert (ids compris) et le .rbitem relu (ids par rang).
// Aucun navigateur. Écrit sous un dossier temporaire retiré en fin d'essai. `CLI : OK` ou `CLI : ÉCHEC — <écart>`.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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
const empreinte = (f) => {
  const st = statSync(f);
  return `${st.mtimeMs}:${st.ino}`;
};
const etat = (f, points = false) => {
  const r = cli(points ? ["state", f, "--points"] : ["state", f]);
  if (r.code !== 0 || r.lignes.length !== 1) throw new Ecart(`state ${f} : code ${r.code} ${r.brut}`);
  return r.lignes[0];
};
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
  const empreinteNew = empreinte(a);
  const reNew = cli(["new", a]);
  verifie("new sur un fichier existant : code 1, fichier intact", reNew.code === 1 && empreinte(a) === empreinteNew, reNew.brut);
  const aide = spawnSync("node", [BIN, "--help"], { encoding: "utf8" });
  verifie("--help : code 0", aide.status === 0 && aide.stdout.length > 0, `${aide.status} ${aide.stderr}`);

  const png = join(dir, "rouge.png");
  writeFileSync(png, solidPng(8, 8, [200, 10, 10]));
  const style = { color: "#1e40af", width: 4 };
  const ops = [
    { type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style, fill: null },
    { type: "SetText", page: "$page:0", id: null, x: 400, y: 100, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 },
    { type: "CommitStroke", page: "$page:0", points: [100, 600, 0.5, 200, 650, 0.5, 300, 600, 0.5], style },
    { type: "AddPage", after: "$page:0" },
    { type: "CommitStroke", page: "$page:1", points: [10, 10, 0.5, 90, 90, 0.5], style },
    { op: "undo" },
    { op: "redo" },
    { op: "import", files: [png, XLSX], page: "$page:0", at: [400, 300] },
    { op: "state" },
  ];
  const session = cli(["run", a, "--ops", "-", "--save"], `${ops.map((o) => JSON.stringify(o)).join("\n")}\n`);
  verifie("run --save : session jouée, dernière ligne written", session.code === 0 && session.lignes.length === ops.length + 1 && session.lignes.slice(0, -1).every((l) => l.ok === true) && Array.isArray(session.lignes.at(-1).written), session.brut);
  verifie("annuler puis rétablir : un changement chacun", session.lignes[5].change !== null && session.lignes[6].change !== null);
  verifie("import en session : image et classeur", session.lignes[7].inserted.length === 2, JSON.stringify(session.lignes[7]));
  const fin = session.lignes[8].state;

  // Attente construite à partir des opérations jouées.
  const sortes = fin.pages.map((p) => p.elements.map((x) => x.kind));
  verifie("état de session : sortes attendues", JSON.stringify(sortes) === JSON.stringify([["shape", "text", "stroke", "image", "table"], ["stroke"]]), JSON.stringify(sortes));
  verifie("état de session : le texte joué est présent", JSON.stringify(fin.pages[0].elements[1]).includes("Bonjour"));
  verifie("état de session : un asset, l'image PNG", fin.assets.length === 1 && fin.assets[0].mime === "image/png");
  const pts = etat(a, true).pages[0].elements[2].points;
  verifie("trait : 3 points (9 nombres) relus avec --points", Array.isArray(pts) && pts.length === 9, JSON.stringify(pts)?.slice(0, 80));

  const relu = etat(a);
  egal("rouvrir : pages identiques à l'état de fin de session, ids compris", fin.pages, relu.pages);
  egal("rouvrir : assets identiques à l'état de fin de session", fin.assets, relu.assets);

  const item = join(dir, "sortie.rbitem");
  const page0 = fin.pages[0].page.id;
  const exp = cli(["export", a, item, "--page", page0, "--all"]);
  verifie("export --all : fragment de 5 éléments", exp.code === 0 && exp.lignes[0].elements === 5, exp.brut);
  const e2 = etat(item);
  verifie(".rbitem relu : une page", e2.pages.length === 1);
  egal(".rbitem : mêmes éléments que la page exportée (ids par rang)", normalise(e2.pages[0].elements), normalise(fin.pages[0].elements));
  egal(".rbitem : mêmes assets", normalise(e2.assets), normalise(fin.assets));

  const avant = readFileSync(a);
  const refuse = cli(["run", a, "--ops", "-", "--save"], `${JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 0, y0: 0, x1: 5, y1: 5, style: { color: "#000000", width: -1 }, fill: null })}\n`);
  verifie("opération refusée : code 1 et erreur sur stderr", refuse.code === 1 && refuse.err?.error?.code === "command", refuse.brut);
  verifie("fichier inchangé après un refus", readFileSync(a).equals(avant));

  const pdfFichier = join(dir, "x.pdf");
  writeFileSync(pdfFichier, "%PDF-1.4\n%%EOF\n");
  const avantPdf = empreinte(a);
  const pdf = cli(["import", a, pdfFichier]);
  verifie("import d'un .pdf : code 3, erreur unsupported, « lot 3 »", pdf.code === 3 && pdf.err?.error?.code === "unsupported" && String(pdf.err.error.message).includes("lot 3"), pdf.brut);
  verifie("import d'un .pdf : fichier non écrit (mtimeMs, ino)", empreinte(a) === avantPdf);
  verifie("option inconnue : code 2", cli(["state", a, "--nope"]).code === 2);
  console.log("CLI : OK");
} catch (e) {
  console.log(`CLI : ÉCHEC — ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
