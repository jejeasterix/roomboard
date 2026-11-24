// Essai de bout en bout de la CLI (cadrage cli, S5, D14) : créer un tableau, y ajouter des éléments, enregistrer,
// exporter en .rbitem, relire, comparer l'état de session au fichier rouvert (ids compris) et le .rbitem relu (ids par rang).
// Aucun navigateur. Écrit sous un dossier temporaire retiré en fin d'essai. `CLI : OK` ou `CLI : ÉCHEC — <écart>`.
// Lot 2 (cadrage cli-lot2, S5) : réimport d'un `.rbitem`, grille, `convert` des cinq tableaux fabriqués, export `.iwb`/`.ubz` relus,
// aller-retour `.rbpack` par `library`, règle D23.
// Lot 3 (cadrage cli-lot3, S5) : PDF fabriqué (fabriques/pdf.mjs), page comptée, texte retrouvé, fond présent (avant et
// après aller-retour), stderr vide des commandes PDF, D23 pour .pdf ; code 3 sur import … x.docx.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deepStrictEqual } from "node:assert";
import { createRequire } from "node:module";
import { deflateSync } from "node:zlib";
import { ROOT, solidPng } from "./commun.mjs";
import { flipPages, iwbRaw3, iwbZip, notebookZip, olfZip, ubzZip } from "./fabriques/tableaux.mjs";
import { makeFlipchart } from "./fabriques/flipchart.mjs";
import { pdfPages, readLibs, readPdf } from "./fabriques/pdf.mjs";

const web = createRequire(join(ROOT, "apps", "web", "package.json"));
const { zipSync } = web("fflate");

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

/** Lance le binaire ; rend code, lignes JSON de stdout, objet de stderr, stderr brut (contrôle « stderr vide », D34). */
function cli(args, input) {
  const r = spawnSync("node", [BIN, ...args], { encoding: "utf8", input, env: { ...process.env, ROOMBOARD_NOW: "1700000000000" } });
  const lignes = (r.stdout ?? "").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l));
  const stderr = r.stderr ?? "";
  const err = stderr.trim();
  let objet = null;
  if (err !== "") {
    try {
      objet = JSON.parse(err);
    } catch {
      objet = { brut: err };
    }
  }
  return { code: r.status, lignes, err: objet, stderr, brut: `${r.stdout}${r.stderr}` };
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
  verifie("formats : .pdf lu et écrit (lot 3)", f.find((x) => x.ext === ".pdf")?.read === true && f.find((x) => x.ext === ".pdf")?.write === true);

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

  const avant = empreinte(a);
  const refuse = cli(["run", a, "--ops", "-", "--save"], `${JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 0, y0: 0, x1: 5, y1: 5, style: { color: "#000000", width: -1 }, fill: null })}\n`);
  verifie("opération refusée : code 1 et erreur sur stderr", refuse.code === 1 && refuse.err?.error?.code === "command", refuse.brut);
  verifie("fichier inchangé après un refus (mtimeMs, ino)", empreinte(a) === avant);

  const docx = join(dir, "x.docx");
  writeFileSync(docx, "PK\u0003\u0004");
  const avantDocx = empreinte(a);
  const rd = cli(["import", a, docx]);
  verifie("import d'un .docx : code 3, erreur unsupported, « lot 4 »", rd.code === 3 && rd.err?.error?.code === "unsupported" && String(rd.err.error.message).includes("lot 4"), rd.brut);
  verifie("import d'un .docx : fichier non écrit (mtimeMs, ino)", empreinte(a) === avantDocx);
  verifie("option inconnue : code 2", cli(["state", a, "--nope"]).code === 2);
  // ---- Lot 2 (cadrage cli-lot2, S5) ----
  const lot2 = f.filter((x) => x.readLot === 2 || x.writeLot === 2);
  verifie("formats : les 7 formats du lot 2 lus et écrits", lot2.length === 7 && lot2.every((x) => (x.readLot !== 2 || x.read) && (x.writeLot !== 2 || x.write)), JSON.stringify(lot2.map((x) => [x.ext, x.read, x.write])));

  const grille = { visible: true, snap: false, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#000000", line: "solid", lineWidth: 1, snap: false, visible: true }] };
  const b = join(dir, "b.roomboard");
  const tb = cli(["run", "--new", "--out", b, "--ops", "-"], `${[
    { type: "AddShape", page: "$page:0", shape: "rect", x0: 100, y0: 100, x1: 300, y1: 200, style, fill: "#fde68a" },
    { type: "SetGrid", page: "$page:0", grid: grille },
  ].map((o) => JSON.stringify(o)).join("\n")}\n`);
  verifie("tableau b : un rectangle et une grille", tb.code === 0, tb.brut);
  const etatB = etat(b);

  const carre = join(dir, "carre.rbitem");
  const ec = cli(["export", b, carre, "--all"]);
  verifie("export --all de b : un objet", ec.code === 0 && ec.lignes[0].elements === 1, ec.brut);
  const c = join(dir, "c.roomboard");
  const ri = cli(["run", "--new", "--out", c, "--ops", "-"], `${JSON.stringify({ op: "import", files: [carre], at: [200, 150] })}\n`);
  verifie("réimport du .rbitem dans un tableau neuf : inséré", ri.code === 0 && ri.lignes[0].inserted?.length === 1, ri.brut);
  egal("réimport : même élément que l'original (ids par rang, centre gardé)", normalise(etat(c).pages[0].elements), normalise(etatB.pages[0].elements));

  const g = join(dir, "grille.rbitem");
  const eg = cli(["export", b, g, "--grid"]);
  verifie("export --grid : .rbitem de grille", eg.code === 0 && eg.lignes[0].kind === "grid", eg.brut);
  const ig = cli(["import", c, g]);
  verifie("import du .rbitem de grille : appliqué", ig.code === 0 && ig.lignes[0].inserted?.length === 1, ig.brut);
  egal("grille de c = grille de b", etat(c).pages[0].page.grid, etatB.pages[0].page.grid);

  const tableaux = [
    ["lecon.iwb", iwbZip(zipSync), 1, 8, "vidéo"],
    ["brut.iwb", Buffer.from(iwbRaw3(), "utf8"), 3, null, null],
    ["openboard.ubz", ubzZip(zipSync), 1, 4, null],
    ["lecon.notebook", notebookZip(zipSync), 2, 4, null],
    ["cours.olf", olfZip(zipSync), 1, 3, null],
    ["cours.flipchart", Buffer.from(makeFlipchart(flipPages(), deflateSync)), 2, 5, "TIFF"],
  ];
  for (const [nom, octets, pages, objets, avis] of tableaux) {
    const src = join(dir, nom);
    writeFileSync(src, octets);
    const out = join(dir, `${nom}.roomboard`);
    const cv = cli(["convert", src, out]);
    verifie(`convert ${nom} : ${pages} page(s)`, cv.code === 0 && cv.lignes[0].pages === pages, cv.brut);
    if (objets !== null) {
      const nb = etat(out).pages[0].elements.length;
      verifie(`convert ${nom} : ${objets} objets en page 1`, nb === objets, String(nb));
    }
    if (avis !== null) verifie(`convert ${nom} : avis « ${avis} »`, cv.lignes[0].notices.join(" ").includes(avis), JSON.stringify(cv.lignes[0].notices));
  }
  verifie(".olf : fond #ffeecc", etat(join(dir, "cours.olf.roomboard")).pages[0].page.background.toLowerCase() === "#ffeecc");

  for (const ext of ["iwb", "ubz"]) {
    const outB = join(dir, `b.${ext}`);
    const e = cli(["export", b, outB]);
    verifie(`export b.${ext}`, e.code === 0 && e.lignes[0].kind === ext, e.brut);
    const back = join(dir, `b-${ext}.roomboard`);
    const cv = cli(["convert", outB, back]);
    verifie(`relecture de b.${ext} : une page`, cv.code === 0 && cv.lignes[0].pages === 1, cv.brut);
    egal(`relecture de b.${ext} : mêmes sortes`, etat(back).pages[0].elements.map((x) => x.kind), etatB.pages[0].elements.map((x) => x.kind));
  }

  const lib = join(dir, "lib");
  mkdirSync(join(lib, "Formes"), { recursive: true });
  const e1 = cli(["export", b, join(lib, "Formes", "carre.rbitem"), "--all"]);
  const e3 = cli(["export", a, join(lib, "Formes", "page.rbitem"), "--page", page0, "--all"]);
  verifie("deux .rbitem dans lib/Formes", e1.code === 0 && e3.code === 0, `${e1.brut}${e3.brut}`);
  const pack = join(dir, "p.rbpack");
  const le = cli(["library", "export", lib, pack, "--folder", "Formes"]);
  verifie("library export : paquet écrit, rien laissé de côté", le.code === 0 && le.lignes[0].skipped.length === 0 && existsSync(pack), le.brut);
  const lib2 = join(dir, "lib2");
  const li = cli(["library", "import", lib2, pack]);
  verifie("library import : dossier Formes, 2 ressources", li.code === 0 && li.lignes[0].folder === "Formes" && li.lignes[0].count === 2, li.brut);
  const ll = cli(["library", "list", lib2, "--folder", "Formes"]);
  verifie("library list : 2 ressources", ll.code === 0 && ll.lignes[0].items.length === 2, ll.brut);
  egal("ressource relue = original (ids par rang)", normalise(etat(join(lib2, "Formes", "carre.rbitem"))), normalise(etat(join(lib, "Formes", "carre.rbitem"))));
  const ip = cli(["import", a, pack]);
  verifie("import d'un .rbpack dans un tableau : code 2, renvoi à library", ip.code === 2 && String(ip.err?.error?.message).includes("library"), ip.brut);

  const iwbSrc = join(dir, "lecon.iwb");
  const avantIwb = empreinte(iwbSrc);
  const sv = cli(["run", iwbSrc, "--save", "--ops", "-"], "");
  verifie("D23 : run lecon.iwb --save : code 2, fichier intact", sv.code === 2 && empreinte(iwbSrc) === avantIwb, sv.brut);
  const z = join(dir, "z.iwb");
  const nz = cli(["new", z]);
  verifie("D23 : new z.iwb : code 2, rien d'écrit", nz.code === 2 && !existsSync(z), nz.brut);
  const cs = cli(["convert", iwbSrc, iwbSrc]);
  verifie("convert vers la source : code 2, source intacte", cs.code === 2 && empreinte(iwbSrc) === avantIwb, cs.brut);
  verifie("convert vers .docx : code 2 (règle T11)", cli(["convert", a, join(dir, "a.docx")]).code === 2 && !existsSync(join(dir, "a.docx")));
  verifie("convert depuis .docx : code 2", cli(["convert", docx, join(dir, "docx.roomboard")]).code === 2 && !existsSync(join(dir, "docx.roomboard")));

  // ---- Lot 3 (cadrage cli-lot3, S5) : fichier construit, PDF fabriqué par pdfPages, relu par readPdf ----
  const pdfLib = web("pdf-lib");
  const lecture = await readLibs(web, { worker: true }); // worker de pdf.js importé d'abord : pose globalThis.pdfjsWorker
  const fondsPdf = (st) => st.pages.length > 0 && st.pages.every((pg, i) => pg.page.backdrop?.kind === "pdf-page" && pg.page.backdrop.page === i && st.assets.some((x) => x.id === pg.page.backdrop.asset && x.mime === "application/pdf"));
  const fondsDe = (st) => JSON.stringify(st.pages.map((x) => x.page.backdrop));

  const trois = join(dir, "three.pdf");
  writeFileSync(trois, await pdfPages(pdfLib, 3));
  const t = join(dir, "t.roomboard");
  const ct = cli(["convert", trois, t]);
  verifie("page comptée : convert three.pdf t.roomboard, 3 pages", ct.code === 0 && ct.lignes[0]?.pages === 3, ct.brut);
  verifie("stderr vide : convert three.pdf", ct.stderr === "", ct.stderr);
  const etatT = etat(t);
  verifie("page comptée : state t.roomboard, 3 pages", etatT.pages.length === 3, String(etatT.pages.length));
  verifie("fond présent : pdf-page 0, 1, 2 et asset application/pdf cité", fondsPdf(etatT), fondsDe(etatT));
  const st = cli(["state", trois]);
  verifie("fond présent : state three.pdf, mêmes fonds", st.code === 0 && fondsDe(st.lignes[0]) === fondsDe(etatT), st.brut);
  verifie("stderr vide : state three.pdf", st.stderr === "", st.stderr);
  const note = { type: "SetText", page: "$page:1", id: null, x: 200, y: 400, content: "Note CLI", color: "#000000", size: 48, boxWidth: 800, boxHeight: 60 };
  const rt = cli(["run", t, "--save", "--ops", "-"], `${JSON.stringify(note)}\n`);
  verifie("run t.roomboard --save : texte en page 2", rt.code === 0 && rt.lignes[0]?.ok === true, rt.brut);
  verifie("stderr vide : run t.roomboard --save", rt.stderr === "", rt.stderr);
  const outPdf = join(dir, "out.pdf");
  const ep = cli(["export", t, outPdf]);
  verifie("export t.roomboard out.pdf : kind pdf, 3 pages, annoté", ep.code === 0 && ep.lignes[0]?.kind === "pdf" && ep.lignes[0].pages === 3 && ep.lignes[0].annotated === true, ep.brut);
  verifie("stderr vide : export out.pdf", ep.stderr === "", ep.stderr);
  const relu3 = await readPdf(readFileSync(outPdf), lecture);
  verifie("page comptée : out.pdf relu, 3 pages", relu3.pages === 3, String(relu3.pages));
  verifie("texte retrouvé : « RoomBoard page 2 » et « Note CLI » en page 2", relu3.texts[1]?.includes("RoomBoard page 2") === true && relu3.texts[1]?.includes("Note CLI") === true, JSON.stringify(relu3.texts));
  egal("superposition vectorielle (/Form) en page 2 seule", relu3.overlays, [[], ["/Form"], []]);
  const retour = join(dir, "retour.roomboard");
  const cr = cli(["convert", outPdf, retour]);
  verifie("page comptée : aller-retour convert out.pdf, 3 pages", cr.code === 0 && cr.lignes[0]?.pages === 3, cr.brut);
  verifie("stderr vide : convert out.pdf", cr.stderr === "", cr.stderr);
  const etatRetour = etat(retour);
  verifie("fond présent après l'aller-retour", fondsPdf(etatRetour), fondsDe(etatRetour));
  const cPdf = join(dir, "c.pdf");
  const cc = cli(["convert", trois, cPdf]);
  verifie("D46 : convert three.pdf c.pdf : code 0", cc.code === 0 && existsSync(cPdf), cc.brut);
  verifie("stderr vide : convert three.pdf c.pdf", cc.stderr === "", cc.stderr);
  const reluC = await readPdf(readFileSync(cPdf), lecture);
  verifie("page comptée : c.pdf relu, 3 pages", reluC.pages === 3, String(reluC.pages));
  const ci = cli(["convert", trois, join(dir, "t.iwb")]);
  verifie("convert three.pdf t.iwb : avis « fonds PDF non exportés »", ci.code === 0 && ci.lignes[0]?.notices.join(" ").includes("fonds PDF non exportés"), ci.brut);
  verifie("stderr vide : convert three.pdf t.iwb", ci.stderr === "", ci.stderr);
  const eb = cli(["export", b, join(dir, "b.pdf")]);
  verifie("export b.pdf (sans fond PDF) : 1 page, annotated faux", eb.code === 0 && eb.lignes[0]?.pages === 1 && eb.lignes[0].annotated === false, eb.brut);
  verifie("stderr vide : export b.pdf", eb.stderr === "", eb.stderr);
  verifie("export vers .pdf avec --ids : code 2", cli(["export", t, join(dir, "x.pdf"), "--ids", "a"]).code === 2 && !existsSync(join(dir, "x.pdf")));
  const avantTrois = empreinte(trois);
  const rs = cli(["run", trois, "--save", "--ops", "-"], "");
  verifie("D23 : run three.pdf --save : code 2, fichier intact", rs.code === 2 && empreinte(trois) === avantTrois, rs.brut);
  const zp = join(dir, "z.pdf");
  verifie("D23 : new z.pdf : code 2, rien d'écrit", cli(["new", zp]).code === 2 && !existsSync(zp));
  const avantOut = empreinte(outPdf);
  verifie("convert out.pdf vers out.PDF (la source) : code 2, source intacte", cli(["convert", outPdf, join(dir, "out.PDF")]).code === 2 && empreinte(outPdf) === avantOut);
  console.log("CLI : OK");
} catch (e) {
  console.log(`CLI : ÉCHEC — ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
