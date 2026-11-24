// S1, S2 (cadrage cli-lot4) par `convert` et `state` : vrai binaire roomboard-office (target/debug, construit par
// `cargo build -p roomboard-shell --bin roomboard-office`) et vrai LibreOffice ; `ROOMBOARD_SANS_SOFFICE=1` saute les
// cas réels (D54). Racine de travail sous un XDG_CACHE_HOME jetable ; après chaque cas : `conversions/` vide, aucun
// processus ne cite ce dossier (G4). T7 ajoute les cas `import`.
import { chmodSync, copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { OfficeConvertError } from "../../web/src/platform/office-import";
import { main } from "./main";
import { BINARY_MISSING, convertOfficeFile, NO_SOFFICE, officeBinary } from "./office-node";
import { describeWasm, memoryIO, stampOf, tmpDir, XLSX_FIXTURE, warmModules, type Json } from "./testing";

const REAL = process.env["ROOMBOARD_SANS_SOFFICE"] !== "1";
const itReal = REAL ? it : it.skip; // D54
const FIX = fileURLToPath(new URL("../../../crates/roomboard-shell/tests/fixtures/", import.meta.url));
const SLOW = { timeout: 180_000 };
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Processus vivants dont la ligne de commande cite `needle` (Linux). */
function processesWith(needle: string): string[] {
  let names: string[];
  try {
    names = readdirSync("/proc").filter((n) => /^\d+$/.test(n));
  } catch {
    return [];
  }
  return names.flatMap((n) => {
    try {
      const c = readFileSync(join("/proc", n, "cmdline"), "utf8").replaceAll("\0", " ");
      return c.includes(needle) ? [c] : [];
    } catch {
      return [];
    }
  });
}

function scratch(): { dir: string; cache: string; env: Record<string, string> } {
  const dir = tmpDir();
  const cache = join(dir, "cache");
  return { dir, cache, env: { XDG_CACHE_HOME: cache } };
}

function cleanAfter(cache: string): void {
  const conv = join(cache, "roomboard-office", "conversions");
  expect(existsSync(conv) ? readdirSync(conv) : []).toEqual([]);
  expect(processesWith(cache)).toEqual([]);
}

describeWasm("S1 — Office converti, puis chemin PDF (convert, state)", () => {
  itReal("S1 — convert diapos.pptx diapos.roomboard : 2 pages pdf-page, PDF et original en assets", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const out = join(dir, "diapos.roomboard");
    const io = memoryIO([], env);
    expect(await main(["convert", join(FIX, "diapos.pptx"), out], io)).toBe(0);
    expect(io.json()[0]).toEqual({ file: out, from: join(FIX, "diapos.pptx"), pages: 2, notices: [] });
    const st = memoryIO();
    expect(await main(["state", out], st)).toBe(0);
    const s = st.json()[0];
    expect(s.pages.map((p: Json) => p.page.backdrop?.kind)).toEqual(["pdf-page", "pdf-page"]);
    expect(s.assets.map((a: Json) => [a.name, a.mime]).sort()).toEqual([["diapos.pdf", "application/pdf"], ["diapos.pptx", PPTX_MIME]]);
    cleanAfter(cache);
  });
  itReal("S1 — convert cours.docx cours.pdf : PDF qui commence par %PDF-", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const out = join(dir, "cours.pdf");
    expect(await main(["convert", join(FIX, "cours.docx"), out], memoryIO([], env))).toBe(0);
    expect(readFileSync(out).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    cleanAfter(cache);
  });
  itReal("S1 — state cours.docx : pages au fond pdf-page ; run tab.open : onglet sans fichier", SLOW, async () => {
    const { cache, env } = scratch();
    const st = memoryIO([], env);
    expect(await main(["state", join(FIX, "cours.docx")], st)).toBe(0);
    const s = st.json()[0];
    expect(s.pages.length).toBeGreaterThan(0);
    expect(s.pages.every((p: Json) => p.page.backdrop?.kind === "pdf-page")).toBe(true);
    const run = memoryIO([JSON.stringify({ op: "tab.open", file: join(FIX, "cours.docx") }), JSON.stringify({ op: "tab.list" })], env);
    expect(await main(["run", "--new", "--ops", "-"], run)).toBe(0);
    const tabs = run.json().filter((l: Json) => Array.isArray(l.tabs)).at(-1).tabs as Json[];
    expect(tabs).toHaveLength(2);
    expect(tabs[1]).toMatchObject({ file: null });
    cleanAfter(cache);
  });
  itReal("RF2 — nom avec espace, accent et apostrophe : converti, original et PDF nommés d'après lui", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const src = join(dir, "Cours d'été 2.docx");
    copyFileSync(join(FIX, "cours.docx"), src);
    const out = join(dir, "c.roomboard");
    expect(await main(["convert", src, out], memoryIO([], env))).toBe(0);
    const st = memoryIO();
    expect(await main(["state", out], st)).toBe(0);
    expect(st.json()[0].assets.map((a: Json) => a.name).sort()).toEqual(["Cours d'été 2.docx", "Cours d'été 2.pdf"]);
    cleanAfter(cache);
  });
});

describe("D79 — Ctrl-C pendant une vraie conversion (cli-lot4)", () => {
  itReal("D79 — SIGINT dès que LibreOffice cite la racine : code 130, aucun processus restant, dossier mkdtemp retiré", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const src = join(dir, "diapos.pptx");
    copyFileSync(join(FIX, "diapos.pptx"), src);
    const temp = (): string[] => readdirSync(tmpdir()).filter((n) => n.startsWith("roomboard-office-"));
    const before = new Set(temp());
    const onInterrupt = vi.fn();
    const pending = convertOfficeFile(src, env, onInterrupt).then(
      () => "converti",
      (e: unknown) => (e instanceof OfficeConvertError ? e.code : String(e)),
    );
    const conversions = join(cache, "roomboard-office", "conversions");
    for (let i = 0; i < 600 && processesWith(conversions).length === 0; i++) await new Promise((r) => setTimeout(r, 100));
    expect(processesWith(conversions).length, "LibreOffice jamais vu sous la racine").toBeGreaterThan(0);
    // L'écouteur posé par runConversion, sans signal du système : le processus de Vitest ne doit pas en recevoir.
    process.emit("SIGINT");
    expect(await pending).toBe("interrupted");
    expect(onInterrupt).toHaveBeenCalledWith("SIGINT", 130);
    for (let i = 0; i < 50 && processesWith(cache).length > 0; i++) await new Promise((r) => setTimeout(r, 100));
    expect(processesWith(cache)).toEqual([]);
    expect(temp().filter((n) => !before.has(n))).toEqual([]);
  });
});

describeWasm("S2 — Office impossible : code 3, rien écrit (convert, state)", () => {
  beforeAll(warmModules); // D11 (cli-partage) : cœur et formats chargés hors du délai du premier test
  it("S2 — ROOMBOARD_OFFICE absent : convert cours.docx x.roomboard → 3, message de DA17, rien écrit", async () => {
    const { dir, env } = scratch();
    const out = join(dir, "x.roomboard");
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: join(dir, "absent") });
    expect(await main(["convert", join(FIX, "cours.docx"), out], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: `cours.docx : conversion Office indisponible : ${BINARY_MISSING}` });
    expect(existsSync(out)).toBe(false);
  });
  it("S2 — faux binaire qui rend 3 à --check : state cours.docx → 3 « LibreOffice introuvable (…) »", async () => {
    const { dir, env } = scratch();
    const bin = join(dir, "faux-office");
    writeFileSync(bin, '#!/bin/sh\necho "no-program : installez LibreOffice ou Microsoft Office" >&2\nexit 3\n');
    chmodSync(bin, 0o755);
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: bin });
    expect(await main(["state", join(FIX, "cours.docx")], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: `cours.docx : conversion Office indisponible : ${NO_SOFFICE}` });
  });
  it("D59 — échec de conversion (faux binaire) : code 1, message du produit", async () => {
    const { dir, env } = scratch();
    const bin = join(dir, "faux-office");
    writeFileSync(bin, `#!/bin/sh\nif [ "$1" = "--check" ]; then echo "racine : ${join(dir, "r")}"; exit 0; fi\necho "failed : boum" >&2\nexit 1\n`);
    chmodSync(bin, 0o755);
    const docx = join(dir, "x.docx");
    writeFileSync(docx, "PK\u0003\u0004");
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: bin });
    expect(await main(["convert", docx, join(dir, "x.roomboard")], io)).toBe(1);
    expect(io.errors()[0].error).toEqual({ code: "format", message: "Import impossible (x.docx) : la conversion en PDF a échoué" });
  });
});

describeWasm("S1, S2 — import d'un fichier Office (cli-lot4, T7)", () => {
  const fresh = async (dir: string): Promise<string> => {
    const a = join(dir, "a.roomboard");
    expect(await main(["new", a], memoryIO())).toBe(0);
    return a;
  };
  itReal("S1 — import a.roomboard cours.docx : opened [cours.docx], conversions/ vide, aucun soffice", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const a = await fresh(dir);
    const io = memoryIO([], env);
    expect(await main(["import", a, join(FIX, "cours.docx")], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ opened: ["cours.docx"], inserted: [], refused: [], failed: [] });
    cleanAfter(cache);
  });
  it("D58 — import valeurs.xlsx : tableau inséré, aucun binaire lancé (même avec un convertisseur)", async () => {
    const { dir, env } = scratch();
    const a = await fresh(dir);
    const log = join(dir, "appels.log");
    const bin = join(dir, "faux-office");
    writeFileSync(bin, `#!/bin/sh\necho "$1" >> '${log}'\nexit 1\n`);
    chmodSync(bin, 0o755);
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: bin });
    expect(await main(["import", a, XLSX_FIXTURE], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ inserted: ["valeurs.xlsx"] });
    expect(existsSync(log)).toBe(false);
  });
  it("S2 — import avec ROOMBOARD_OFFICE absent : code 3, message de DA17, a.roomboard inchangé, rien lu", async () => {
    const { dir, env } = scratch();
    const a = await fresh(dir);
    const before = stampOf(a);
    const io = memoryIO([], { ...env, ROOMBOARD_OFFICE: join(dir, "absent") });
    expect(await main(["import", a, join(FIX, "cours.docx")], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: `cours.docx : conversion Office indisponible : ${BINARY_MISSING}` });
    expect(stampOf(a)).toEqual(before);
    const absent = memoryIO([], { ...env, ROOMBOARD_OFFICE: join(dir, "absent") });
    expect(await main(["import", join(dir, "absent.roomboard"), join(dir, "absent.docx")], absent)).toBe(3); // rien lu : sinon io (1)
  });
  itReal("RF3 — deux .docx dans une session run : --check une fois, deux onglets de plus, conversions/ vide", SLOW, async () => {
    const { dir, cache, env } = scratch();
    const real = officeBinary({});
    expect(real).not.toBeNull();
    const log = join(dir, "appels.log");
    const bin = join(dir, "enveloppe");
    writeFileSync(bin, `#!/bin/sh\necho "$1" >> '${log}'\nexec '${real}' "$@"\n`);
    chmodSync(bin, 0o755);
    const two = join(dir, "deux.docx");
    copyFileSync(join(FIX, "cours.docx"), two);
    const ops = [{ op: "import", files: [join(FIX, "cours.docx")] }, { op: "import", files: [two] }, { op: "tab.list" }].map((o) => JSON.stringify(o));
    const io = memoryIO(ops, { ...env, ROOMBOARD_OFFICE: bin });
    expect(await main(["run", "--new", "--ops", "-"], io)).toBe(0);
    const calls = readFileSync(log, "utf8").trim().split("\n");
    expect(calls.filter((c) => c === "--check")).toHaveLength(1);
    expect(calls).toHaveLength(3);
    expect(io.json().filter((l: Json) => Array.isArray(l.tabs)).at(-1).tabs).toHaveLength(3);
    cleanAfter(cache);
  });
});
