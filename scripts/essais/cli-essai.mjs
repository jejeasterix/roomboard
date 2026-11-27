// Essai de bout en bout de la CLI (cadrage cli, S5, D14) : créer un tableau, y ajouter des éléments, enregistrer,
// exporter en .rbitem, relire, comparer l'état de session au fichier rouvert (ids compris) et le .rbitem relu (ids par rang).
// Aucun navigateur. Écrit sous un dossier temporaire retiré en fin d'essai. `CLI : OK` ou `CLI : ÉCHEC — <écart>`.
// Lot 2 (cadrage cli-lot2, S5) : réimport d'un `.rbitem`, grille, `convert` des cinq tableaux fabriqués, export `.iwb`/`.ubz` relus,
// aller-retour `.rbpack` par `library`, règle D23.
// Lot 3 (cadrage cli-lot3, S5) : PDF fabriqué (fabriques/pdf.mjs), page comptée, texte retrouvé, fond présent (avant et
// après aller-retour), stderr vide des commandes PDF, D23 pour .pdf.
// Lot 4 (cadrage cli-lot4, S1 à S5, D71, D79) : médias, images et 3D fabriqués par objets.mjs ; Office par le binaire
// roomboard-office et LibreOffice (sauté sous ROOMBOARD_SANS_SOFFICE=1, ligne « Office sauté ») ; conversions/ vide et aucun
// processus ne citant la racine XDG_CACHE_HOME de l'essai ; Ctrl-C d'une conversion : 130 et une ligne {"error":…}.
// cli-partage (cadrage cli-partage, S2, D12) : tableau abîmé, import d'un tableau et d'un PDF, import partiel, 12 onglets, PDF illisible (E1 à E5).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deepStrictEqual } from "node:assert";
import { createRequire } from "node:module";
import { deflateSync } from "node:zlib";
import { ROOT, solidPng } from "./commun.mjs";
import { normalise } from "./cli-normalise.mjs";
import { flipPages, iwbRaw3, iwbZip, notebookZip, olfZip, ubzZip } from "./fabriques/tableaux.mjs";
import { makeFlipchart } from "./fabriques/flipchart.mjs";
import { pdfPages, readLibs, readPdf } from "./fabriques/pdf.mjs";
import { ecrireJeu, TAILLES } from "./fabriques/objets.mjs";

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
function cli(args, input, env = {}) {
  const r = spawnSync("node", [BIN, ...args], { encoding: "utf8", input, env: { ...process.env, ROOMBOARD_NOW: "1700000000000", ...env } });
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

/** Processus vivants dont la ligne de commande cite `needle` (Linux, `/proc`). */
const processusAvec = (needle) =>
  readdirSync("/proc")
    .filter((n) => /^\d+$/.test(n))
    .flatMap((n) => {
      try {
        const c = readFileSync(join("/proc", n, "cmdline"), "latin1").replaceAll("\0", " ");
        return c.includes(needle) ? [c] : [];
      } catch {
        return [];
      }
    });

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
  const sansOffice = { ROOMBOARD_OFFICE: join(dir, "absent") };
  const cdx = cli(["convert", docx, join(dir, "docx.roomboard")], undefined, sansOffice);
  verifie("convert depuis .docx sans convertisseur : code 3, rien écrit (D56, D59)", cdx.code === 3 && cdx.err?.error?.code === "unsupported" && !existsSync(join(dir, "docx.roomboard")), cdx.brut);

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
  // ---- cli-partage (cadrage cli-partage, S2, D12) : ouverture par le module partagé, fichiers fabriqués ici ----
  const messageDe = (r) => String(r.err?.error?.message ?? "");
  const abime = join(dir, "abime.iwb");
  writeFileSync(abime, Buffer.from("<iwb")); // XML mal formé (workspace.test.ts:1602)
  const p1 = cli(["state", abime]);
  verifie("E1 : state abime.iwb : code 1, « Ouverture impossible (abime.iwb) : fichier endommagé : … »", p1.code === 1 && messageDe(p1).startsWith("Ouverture impossible (abime.iwb) : fichier endommagé : "), p1.brut);
  const partage = join(dir, "partage.roomboard");
  verifie("E2 : new partage.roomboard", cli(["new", partage]).code === 0);
  const p2 = cli(["import", partage, iwbSrc, trois]);
  const avisLecon = (p2.lignes[0]?.notices ?? []).filter((x) => x.startsWith("lecon.iwb : ouvert avec "));
  verifie("E2 : import lecon.iwb three.pdf : code 0, les deux ouverts, un avis « lecon.iwb : ouvert avec … »", p2.code === 0 && JSON.stringify(p2.lignes[0]?.opened) === JSON.stringify(["lecon.iwb", "three.pdf"]) && avisLecon.length === 1, p2.brut);
  const p3 = cli(["import", partage, abime]);
  verifie("E3 : import abime.iwb : code 1, « import partiel », avis « Ouverture impossible (abime.iwb) »", p3.code === 1 && messageDe(p3).startsWith("import partiel") && (p3.lignes[0]?.notices ?? []).some((x) => x.startsWith("Ouverture impossible (abime.iwb) : ")), p3.brut);
  const douze = `${[...Array.from({ length: 11 }, () => JSON.stringify({ op: "tab.new" })), JSON.stringify({ op: "import", files: [iwbSrc] })].join("\n")}\n`;
  const p4 = cli(["run", "--new", "--ops", "-"], douze);
  const echec12 = p4.lignes.find((l) => l.op === 12);
  verifie("E4 : 12 onglets puis import lecon.iwb : avis « Ouverture impossible (lecon.iwb) : 12 onglets au plus ; fermez-en un »", p4.code === 1 && echec12?.ok === false && (echec12.notices ?? []).includes("Ouverture impossible (lecon.iwb) : 12 onglets au plus ; fermez-en un"), p4.brut);
  const pdfAbime = join(dir, "bad.pdf");
  writeFileSync(pdfAbime, Buffer.from("%PDF-1.4\n%%EOF\n"));
  const p5 = cli(["state", pdfAbime]);
  verifie("E5 : state bad.pdf : code 1, « Ouverture impossible (bad.pdf) : … »", p5.code === 1 && messageDe(p5).startsWith("Ouverture impossible (bad.pdf) : "), p5.brut);
  // ---- Lot 4 (cadrage cli-lot4, S1 à S5) : fichiers écrits par objets.mjs, binaire roomboard-office ----
  const cache = join(dir, "cache");
  const envOffice = { XDG_CACHE_HOME: cache };
  const lot4 = join(dir, "lot4");
  ecrireJeu(lot4, zipSync);
  const de = (...noms) => noms.map((x) => join(lot4, x));
  const nomDe = (st, id) => st.assets.find((x) => x.id === id)?.name;
  const f4 = cli(["formats"]).lignes[0].formats;
  const nonLus = f4.filter((x) => x.read !== true && !x.notes.some((t) => t.startsWith("laissé de côté : ")));
  verifie("formats : chaque format lu, ou laissé de côté avec sa raison (D68, H48)", nonLus.length === 0, JSON.stringify(nonLus.map((x) => x.ext)));
  verifie("formats : aucune note ne cite un lot", f4.every((x) => x.notes.every((t) => !/\blots?\b/i.test(t))));
  const b4 = join(dir, "b4.roomboard");
  verifie("new b4.roomboard", cli(["new", b4]).code === 0);

  // S3 — médias
  const m3 = cli(["import", b4, ...de("son.wav", "clip.mp4", "clip.webm", "a.mp3", "b.ogg")]);
  verifie("S3 : import son.wav clip.mp4 clip.webm a.mp3 b.ogg : cinq insérés", m3.code === 0 && m3.lignes[0]?.inserted.length === 5, m3.brut);
  verifie("stderr vide : import des médias", m3.stderr === "", m3.stderr);
  const em3 = etat(b4);
  const medias = Object.fromEntries(em3.pages[0].elements.filter((x) => x.kind === "media").map((x) => [nomDe(em3, x.media.asset), x.media]));
  const decrit = (x) => (x === undefined ? "absent" : `${x.mediaType} ${x.w}x${x.h} ${x.duration}s ${x.poster === null ? "sans poster" : "poster"}`);
  egal("S3 : durées et tailles lues dans l'en-tête", Object.fromEntries(Object.entries(medias).map(([k, x]) => [k, decrit(x)])), {
    "son.wav": "audio 480x120 1s sans poster",
    "clip.mp4": "video 640x360 2.5s sans poster",
    "clip.webm": "video 320x240 3.2s sans poster",
    "a.mp3": "audio 480x120 2.612s sans poster",
    "b.ogg": "audio 480x120 2s sans poster",
  });
  const avantCasse = empreinte(b4);
  const cm = cli(["import", b4, ...de("casse.mp4")]);
  verifie("S3 : casse.mp4 : code 3 « durée du média illisible dans l'en-tête », fichier inchangé", cm.code === 3 && cm.err?.error?.message === "casse.mp4 : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias)" && empreinte(b4) === avantCasse, cm.brut);

  // S5 — autres images, aussi dans un tableau blanc
  const im = cli(["import", b4, ...de(...Object.keys(TAILLES))]);
  verifie("S5 : huit images insérées", im.code === 0 && im.lignes[0]?.inserted.length === 8, im.brut);
  verifie("stderr vide : import des images", im.stderr === "", im.stderr);
  const e5 = etat(b4);
  egal("S5 : tailles lues dans l'en-tête (vb.svg : 300 × 75)", Object.fromEntries(e5.pages[0].elements.filter((x) => x.kind === "image").map((x) => [nomDe(e5, x.image.asset), `${x.image.w}x${x.image.h}`])), { ...TAILLES });
  const cg = cli(["import", b4, ...de("casse.gif")]);
  verifie("S5 : casse.gif : code 3 « taille de l'image gif illisible dans l'en-tête »", cg.code === 3 && cg.err?.error?.message === "casse.gif : taille de l'image gif illisible dans l'en-tête (la CLI ne décode pas les images)", cg.brut);
  const g4 = join(dir, "g.roomboard");
  const gi = cli(["convert", ...de("gif.iwb"), g4]);
  verifie("S5 : convert gif.iwb : aucun avis d'image", gi.code === 0 && !/image/i.test(gi.lignes[0].notices.join(" ")), gi.brut);
  verifie("S5 : l'image GIF du tableau est lue", etat(g4).pages[0].elements.filter((x) => x.kind === "image").length === 1);

  // S4 — 3D sans vignette
  const t4 = cli(["import", b4, ...de("cube.obj", "cube.mtl", "tex.png", "tri.stl", "tri.gltf", "tri.bin", "tex.glb")]);
  verifie("S4 : quatre objets 3D insérés", t4.code === 0 && JSON.stringify(t4.lignes[0]?.inserted) === JSON.stringify(["cube.obj", "tri.stl", "tri.gltf", "tex.glb"]), t4.brut);
  verifie("S4 : « 3D indisponible sur ce poste » dit une fois", t4.lignes[0].notices.filter((t) => t.startsWith("3D indisponible sur ce poste")).length === 1, JSON.stringify(t4.lignes[0].notices));
  verifie("stderr vide : import 3D (S4)", t4.stderr === "", t4.stderr);
  const e4 = etat(b4);
  const modeles = e4.pages[0].elements.filter((x) => x.kind === "model3d");
  verifie("S4 : quatre model3d, instantanés nuls", modeles.length === 4 && modeles.every((x) => x.model3d.snapshot === null), String(modeles.length));
  const sg = cli(["import", b4, ...de("seul.gltf")]);
  verifie("S4 : .gltf sans .bin : code 1, aucune pile", sg.code === 1 && !/\n\s+at /.test(sg.stderr), sg.brut);
  const sm = cli(["import", b4, ...de("seul.mtl")]);
  verifie("S4 : seul.mtl : code 1, « déposez-le avec son modèle »", sm.code === 1 && sm.lignes[0]?.notices.join(" ").includes("déposez-le avec son modèle"), sm.brut);
  const r4 = cli(["run", "--new", "--ops", "-"], `${JSON.stringify({ op: "import", files: de("tri.stl") })}\n${JSON.stringify({ op: "tab.open", file: trois })}\n`);
  verifie("S4 : run import 3D puis tab.open d'un PDF : code 0 (D76)", r4.code === 0, r4.brut);

  // S1 — Office converti, puis chemin PDF
  const FIXO = join(ROOT, "crates", "roomboard-shell", "tests", "fixtures");
  if (process.env.ROOMBOARD_SANS_SOFFICE === "1") console.log("Office sauté : ROOMBOARD_SANS_SOFFICE=1");
  else {
    const dr = join(dir, "diapos.roomboard");
    const cd = cli(["convert", join(FIXO, "diapos.pptx"), dr], undefined, envOffice);
    verifie("S1 : convert diapos.pptx : 2 pages, aucun avis", cd.code === 0 && cd.lignes[0]?.pages === 2 && cd.lignes[0].notices.length === 0, cd.brut);
    verifie("stderr vide : convert diapos.pptx", cd.stderr === "", cd.stderr);
    const ed = etat(dr);
    verifie("S1 : fonds pdf-page, diapos.pdf et l'original diapos.pptx en assets", fondsPdf(ed) && ed.assets.some((x) => x.name === "diapos.pdf" && x.mime === "application/pdf") && ed.assets.some((x) => x.name === "diapos.pptx" && x.mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation"), JSON.stringify(ed.assets));
    const cp = join(dir, "cours.pdf");
    const cdo = cli(["convert", join(FIXO, "cours.docx"), cp], undefined, envOffice);
    verifie("S1 : convert cours.docx cours.pdf : %PDF-", cdo.code === 0 && readFileSync(cp).subarray(0, 5).toString("latin1") === "%PDF-", cdo.brut);
    const idx = cli(["import", b4, join(FIXO, "cours.docx")], undefined, envOffice);
    verifie("S1 : import cours.docx : ouvert", idx.code === 0 && JSON.stringify(idx.lignes[0]?.opened) === JSON.stringify(["cours.docx"]), idx.brut);
    const ixl = cli(["import", b4, XLSX], undefined, envOffice);
    verifie("S1 : import valeurs.xlsx : tableau en valeurs (D58)", ixl.code === 0 && ixl.lignes[0]?.inserted.includes("valeurs.xlsx"), ixl.brut);
    const conv = join(cache, "roomboard-office", "conversions");
    verifie("S1 : conversions/ existe (conversion réelle) et vide", existsSync(conv) && readdirSync(conv).length === 0, existsSync(conv) ? readdirSync(conv).join(" ") : "dossier absent");
    verifie("S1 : aucun processus ne cite la racine de l'essai (G4)", processusAvec(cache).length === 0, processusAvec(cache).join(" | "));
  }

  // S2 — Office impossible : code 3, rien écrit
  const avantS2 = empreinte(b4);
  const s2 = cli(["import", b4, join(FIXO, "cours.docx")], undefined, { ...envOffice, ROOMBOARD_OFFICE: join(dir, "absent") });
  verifie("S2 : ROOMBOARD_OFFICE absent : code 3, « conversion Office indisponible », fichier inchangé", s2.code === 3 && s2.err?.error?.code === "unsupported" && String(s2.err.error.message).startsWith("cours.docx : conversion Office indisponible : convertisseur roomboard-office introuvable") && empreinte(b4) === avantS2, s2.brut);

  const messageErreur = (texte) => {
    try {
      return JSON.parse(texte).error?.message;
    } catch {
      return undefined; // stderr vide ou non JSON : le contrôle « D79 » échoue sous son propre nom
    }
  };
  // personnalisation-1b (Q32, S4) : liste et recherche du pack, opération background sur des copies temporaires.
  const fonds = cli(["backgrounds", "--search", "seyes"]);
  verifie("backgrounds --search seyes : seyes-8mm listé", fonds.code === 0 && fonds.lignes[0]?.id === "seyes-8mm", fonds.brut);
  const sectionKo = cli(["backgrounds", "--section", "bidule"]);
  verifie("backgrounds --section inconnue : code 2", sectionKo.code === 2, sectionKo.brut);
  const fondsDoc = join(dir, "fonds.roomboard");
  const cree = cli(["run", "--new", "--out", fondsDoc, "--ops", "-"], '{"type":"AddPage","after":"$page:0"}\n');
  verifie("fonds : tableau de deux pages", cree.code === 0, cree.brut);
  const tous = join(dir, "fonds-tous.roomboard");
  const ap = cli(["apply", fondsDoc, '{"op":"background","id":"seyes-8mm","pages":"all"}', "--out", tous]);
  verifie("apply background seyes-8mm, toutes les pages : code 0", ap.code === 0, ap.brut);
  const et = etat(tous);
  verifie("state : grille seyes sur chaque page", et.pages.length === 2 && et.pages.every((p) => p.page.grid?.levels[0]?.kind === "seyes"));
  const une = join(dir, "fonds-une.roomboard");
  const ar = cli(["apply", tous, '{"op":"background","id":"ardoise","page":"$page:1"}', "--out", une]);
  const eu = etat(une);
  verifie("apply background ardoise sur $page:1 : seule la deuxième page change", ar.code === 0 && eu.pages[0].page.background === et.pages[0].page.background && eu.pages[0].page.grid?.levels[0]?.kind === "seyes" && eu.pages[1].page.background === "#2f3e46", ar.brut);
  const ko = join(dir, "fonds-ko.roomboard");
  const lesDeux = cli(["apply", fondsDoc, '{"op":"background","id":"ardoise","page":"$page:0","pages":"all"}', "--out", ko]);
  verifie("background page et pages ensemble : code 2, rien écrit", lesDeux.code === 2 && !existsSync(ko), lesDeux.brut);

  // D79 — Ctrl-C pendant une conversion : transmis au binaire, sortie 130, une ligne {"error":…}
  const faux = join(dir, "faux-office");
  const marque = join(dir, "faux-office.pid");
  writeFileSync(faux, `#!/bin/sh\nif [ "$1" = "--check" ]; then echo "racine : ${join(dir, "racine")}"; exit 0; fi\necho $$ > '${marque}.tmp' && mv '${marque}.tmp' '${marque}'\nexec sleep 30\n`, { mode: 0o755 });
  const lent = join(dir, "lent.docx");
  writeFileSync(lent, "PK\u0003\u0004");
  const enfant = spawn("node", [BIN, "convert", lent, join(dir, "lent.roomboard")], { env: { ...process.env, ROOMBOARD_OFFICE: faux }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let errEnfant = "";
  enfant.stderr.setEncoding("utf8").on("data", (c) => (errEnfant += c));
  const finEnfant = new Promise((r) => enfant.on("close", (code, signal) => r({ code, signal })));
  for (let i = 0; i < 300 && !existsSync(marque); i++) await new Promise((r) => setTimeout(r, 100));
  const lu = existsSync(marque) ? Number(readFileSync(marque, "utf8").trim()) : null;
  const pidFaux = Number.isInteger(lu) && lu > 0 ? lu : null;
  // Un vrai Ctrl-C frappe le groupe de premier plan : la CLI est chef de son groupe (detached), le signal part au groupe.
  if (Number.isInteger(enfant.pid) && enfant.pid > 0) process.kill(-enfant.pid, "SIGINT");
  const sortie = await finEnfant;
  if (pidFaux !== null) {
    try {
      process.kill(pidFaux, "SIGKILL"); // seulement le faux binaire de l'essai, s'il vivait encore
    } catch {
      // déjà sorti
    }
  }
  verifie("D79 : Ctrl-C pendant une conversion : code 130", pidFaux !== null && sortie.code === 130, JSON.stringify(sortie));
  verifie("D79 : une ligne {\"error\":…} « conversion Office interrompue »", errEnfant.trim().split("\n").length === 1 && messageErreur(errEnfant)?.startsWith("conversion Office interrompue (SIGINT)"), errEnfant);
  verifie("D79 : rien écrit", !existsSync(join(dir, "lent.roomboard")));
  // personnalisation-2 (OG11, déc. 29) : SetStyle puis undo, refus hors domaine, arrondi, état.
  {
    const f = join(dir, "style.roomboard");
    const neuf = cli(["run", "--new", "--out", f, "--ops", "-"], `${JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: 0, y0: 0, x1: 100, y1: 50, style: { color: "#000000", width: 4 }, fill: null })}\n`);
    verifie("personnalisation-2 : rectangle posé", neuf.code === 0, neuf.brut);
    const id = neuf.lignes[0].change.ids[0];
    const s = cli(["run", f, "--save", "--ops", "-"], `${[{ type: "SetStyle", ids: [id], patch: { strokeStyle: "dashed", opacity: 44.6 } }, { op: "state" }, { op: "undo" }, { op: "state" }].map((o) => JSON.stringify(o)).join("\n")}\n`);
    const avant = JSON.stringify(s.lignes[1].state);
    const apres = JSON.stringify(s.lignes[3].state);
    verifie("personnalisation-2 : SetStyle puis undo, une étape chacun", s.code === 0 && avant.includes('"strokeStyle":"dashed"') && avant.includes('"opacity":45') && !apres.includes('"strokeStyle"'), s.brut);
    const refus = cli(["run", f, "--ops", "-"], `${JSON.stringify({ type: "SetStyle", ids: [id], patch: { opacity: 150 } })}\n`);
    verifie("personnalisation-2 : opacity 150 refusée (code 1)", refus.code === 1, refus.brut);
    // T12 (H5) : un lien hors de http://, https://, mailto: est refusé, rien d'écrit.
    const lien = cli(["run", f, "--ops", "-"], `${JSON.stringify({ type: "SetStyle", ids: [id], patch: { link: "javascript:alert(1)" } })}\n`);
    verifie("personnalisation-2 : lien javascript: refusé (code 1)", lien.code === 1, lien.brut);
    console.log("personnalisation-2 : SetStyle puis undo");
  }
  // personnalisation-2 (OG11, DA-2) : Restack au premier plan puis undo, une étape ; rang hors bornes refusé.
  {
    const f = join(dir, "ordre.roomboard");
    const rect = (x) => JSON.stringify({ type: "AddShape", page: "$page:0", shape: "rect", x0: x, y0: 0, x1: x + 50, y1: 50, style: { color: "#000000", width: 4 }, fill: null });
    const neuf = cli(["run", "--new", "--out", f, "--ops", "-"], `${[rect(0), rect(100), rect(200)].join("\n")}\n`);
    verifie("personnalisation-2 : trois rectangles posés", neuf.code === 0, neuf.brut);
    const [a, b, c] = neuf.lignes.filter((l) => l.change).map((l) => l.change.ids[0]);
    const s = cli(["run", f, "--save", "--ops", "-"], `${[{ type: "Restack", ids: [a], to: 2 }, { op: "state" }, { op: "undo" }, { op: "state" }].map((o) => JSON.stringify(o)).join("\n")}\n`);
    const rang = (k, id) => JSON.stringify(s.lignes[k].state).indexOf(id);
    const devant = rang(1, b) < rang(1, c) && rang(1, c) < rang(1, a);
    const rendu = rang(3, a) < rang(3, b) && rang(3, b) < rang(3, c);
    verifie("personnalisation-2 : Restack puis undo, une étape", s.code === 0 && s.lignes[0].change.ids[0] === a && devant && rendu, s.brut);
    const refus = cli(["run", f, "--ops", "-"], `${JSON.stringify({ type: "Restack", ids: [a], to: 3 })}\n`);
    verifie("personnalisation-2 : Restack hors bornes refusé (code 1)", refus.code === 1 && refus.brut.includes("rang de page hors bornes"), refus.brut);
    console.log("personnalisation-2 : Restack puis undo");
  }

  // personnalisation-1a (T7, D15) : SetPageMode, AddPage mode, MovePage, DuplicatePage ; refus code 1.
  const lignesOps = (...o) => `${o.map((x) => JSON.stringify(x)).join("\n")}\n`;
  const vuePage = (st, i) => st?.pages?.[i]?.page;
  const carre1a = (page, x) => ({ type: "AddShape", page, shape: "rect", x0: x, y0: 20, x1: x + 100, y1: 120, style: { color: "#1e40af", width: 4 }, fill: null });
  const pm = join(dir, "pages-1a.roomboard");
  const nm = cli(["new", pm]);
  verifie("1a : new pages-1a.roomboard", nm.code === 0 && existsSync(pm), nm.brut);
  const mo = cli(["run", pm, "--ops", "-"], lignesOps({ type: "SetPageMode", page: "$page:0", mode: "portrait" }, { op: "state" }, { op: "undo" }, { op: "state" }));
  const portrait1a = vuePage(mo.lignes[1]?.state, 0);
  verifie("1a : SetPageMode portrait : mode « page », hauteur 3413,33", mo.code === 0 && portrait1a?.mode === "page" && Math.abs(portrait1a.height - 3413.33) < 0.01, mo.brut);
  verifie("1a : undo, une étape : hauteur 1080, plus rien à annuler", vuePage(mo.lignes[3]?.state, 0)?.height === 1080 && mo.lignes[3]?.state?.canUndo === false, mo.brut);
  const mv = cli(["run", pm, "--save", "--ops", "-"], lignesOps({ type: "AddPage", after: "$page:0", mode: "infinite" }, { type: "MovePage", page: "$page:1", to: 0 }, { op: "state" }));
  const apres1a = mv.lignes[2]?.state;
  verifie("1a : AddPage mode infinite puis MovePage en tête", mv.code === 0 && vuePage(apres1a, 0)?.mode === "infinite" && vuePage(apres1a, 1)?.mode === "page", mv.brut);
  const ordre1a = (st) => (st?.pages ?? []).map((x) => x.page.id);
  egal("1a : réouverture identique (ordre des ids)", ordre1a(etat(pm)), ordre1a(apres1a));
  const pd = join(dir, "dup-1a.roomboard");
  const nd = cli(["new", pd]);
  verifie("1a : new dup-1a.roomboard", nd.code === 0, nd.brut);
  const du = cli(["run", pd, "--ops", "-"], lignesOps(carre1a("$page:0", 10), carre1a("$page:0", 300), { type: "DuplicatePage", page: "$page:0" }, { op: "state" }, { type: "Delete", ids: ["$3.1"] }, { type: "SetPageMode", page: "$page:1", mode: "infinite" }, { op: "state" }));
  const copie1a = du.lignes[3]?.state;
  const fin1a = du.lignes[6]?.state;
  verifie("1a : DuplicatePage d'une page à deux objets : copie au rang 1, deux objets", du.code === 0 && copie1a?.pages?.length === 2 && copie1a.pages[1].elements.length === 2 && vuePage(copie1a, 1)?.id !== vuePage(copie1a, 0)?.id, du.brut);
  verifie("1a : $3.1 est un élément copié, $page:1 la copie", fin1a?.pages?.[0]?.elements.length === 2 && fin1a.pages[1].elements.length === 1 && vuePage(fin1a, 0)?.mode === "page" && vuePage(fin1a, 1)?.mode === "infinite", du.brut);
  const avant1a = empreinte(pm);
  const loin = cli(["run", pm, "--save", "--ops", "-"], lignesOps({ type: "MovePage", page: "$page:0", to: 99 }));
  verifie("1a : MovePage to 99 : code 1, fichier inchangé", loin.code === 1 && empreinte(pm) === avant1a, loin.brut);
  const a4 = cli(["run", pm, "--save", "--ops", "-"], lignesOps({ type: "SetPageMode", page: "$page:0", mode: "a4" }));
  verifie("1a : SetPageMode a4 : code 1, fichier inchangé", a4.code === 1 && empreinte(pm) === avant1a, a4.brut);

  // personnalisation-1a calques (T13, D15) : Restack, une étape, ids gardés ; refus code 1 pour deux pages mêlées.
  const pc = join(dir, "calques-1a.roomboard");
  const nc = cli(["new", pc]);
  verifie("1a calques : new calques-1a.roomboard", nc.code === 0, nc.brut);
  const idsPage = (st, i) => (st?.pages?.[i]?.elements ?? []).map((e) => e.id);
  const rsk = cli(["run", pc, "--save", "--ops", "-"], lignesOps(carre1a("$page:0", 10), carre1a("$page:0", 200), carre1a("$page:0", 400), { op: "state" }, { type: "Restack", ids: ["$1"], to: 2 }, { op: "state" }, { op: "undo" }, { op: "state" }, { op: "redo" }));
  const pile0 = idsPage(rsk.lignes[3]?.state, 0);
  const pile1 = idsPage(rsk.lignes[5]?.state, 0);
  verifie("1a calques : Restack $1 au premier plan, ids gardés", rsk.code === 0 && pile0.length === 3 && JSON.stringify(pile1) === JSON.stringify([pile0[1], pile0[2], pile0[0]]), rsk.brut);
  egal("1a calques : undo, une étape : ordre d'origine", idsPage(rsk.lignes[7]?.state, 0), pile0);
  egal("1a calques : réouverture identique (ordre des ids)", idsPage(etat(pc), 0), pile1);
  const deux = cli(["run", pc, "--save", "--ops", "-"], lignesOps({ type: "AddPage", after: "$page:0" }, carre1a("$page:1", 10), { op: "state" }));
  const autre = idsPage(deux.lignes[2]?.state, 1)[0];
  verifie("1a calques : seconde page à un objet", deux.code === 0 && typeof autre === "string", deux.brut);
  const avantC = empreinte(pc);
  const mele = cli(["run", pc, "--save", "--ops", "-"], lignesOps({ type: "Restack", ids: [pile1[0], autre], to: 0 }));
  verifie("1a calques : Restack de deux pages mêlées : code 1, fichier inchangé", mele.code === 1 && empreinte(pc) === avantC, mele.brut);
  // OG12 (S5) : deux rectangles, une flèche liée, Transform suivi puis undo en une étape, SetLinePoints refusé, AddLinked.
  {
    const f = join(dir, "fleches.roomboard");
    const rect = (x) => ({ type: "AddShape", page: "$page:0", shape: "rect", x0: x, y0: 0, x1: x + 100, y1: 50, style: { color: "#000000", width: 4 }, fill: null });
    const fleche = { type: "AddShape", page: "$page:0", shape: "arrow", x0: 100, y0: 25, x1: 400, y1: 25, style: { color: "#000000", width: 4 }, fill: null, start: { id: "$1", fx: 1, fy: 0.5 }, end: { id: "$2", fx: 0, fy: 0.5 } };
    const neuf = cli(["run", "--new", "--out", f, "--ops", "-"], lignesOps(rect(0), rect(400), fleche, { op: "state" }));
    const el = (st, k) => st?.pages?.[0]?.elements?.[k];
    const etat0 = neuf.lignes[3]?.state;
    verifie("OG12 : flèche liée aux deux rectangles", neuf.code === 0 && el(etat0, 2)?.shape?.start?.id === el(etat0, 0)?.id && el(etat0, 2)?.shape?.end?.id === el(etat0, 1)?.id, neuf.brut);
    const id2 = el(etat0, 1).id;
    const s = cli(["run", f, "--save", "--ops", "-"], lignesOps({ type: "Transform", ids: [id2], matrix: [1, 0, 0, 1, 0, 200] }, { op: "state" }, { op: "undo" }, { op: "state" }));
    const fin = (st) => { const a = el(st, 2); return [a.transform[4] + a.shape.w, a.transform[5] + a.shape.h]; };
    verifie("OG12 : Transform du second rectangle : l'extrémité suit (393, 225)", s.code === 0 && JSON.stringify(fin(s.lignes[1].state)) === "[393,225]", s.brut);
    verifie("OG12 : undo, une étape : extrémité revenue (393, 25)", JSON.stringify(fin(s.lignes[3].state)) === "[393,25]", s.brut);
    const un = cli(["run", f, "--ops", "-"], lignesOps({ type: "SetLinePoints", id: el(etat0, 2).id, points: [0, 0], start: null, end: null }));
    verifie("OG12 : SetLinePoints avec un seul point : code 1, points invalides", un.code === 1 && un.brut.includes("points invalides"), un.brut);
    const lie = cli(["run", f, "--save", "--ops", "-"], lignesOps({ type: "AddLinked", id: el(etat0, 0).id, dir: "right" }, { op: "state" }, { op: "undo" }, { op: "state" }));
    const n = (st) => st?.pages?.[0]?.elements?.length;
    verifie("OG12 : AddLinked à droite : deux éléments de plus, une étape", lie.code === 0 && lie.lignes[0].change.ids.length === 2 && n(lie.lignes[1].state) === 5 && n(lie.lignes[3].state) === 3, lie.brut);
    console.log("OG12 : flèches liées, suivi, AddLinked");
  }
  console.log("CLI : OK");
} catch (e) {
  console.log(`CLI : ÉCHEC — ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
