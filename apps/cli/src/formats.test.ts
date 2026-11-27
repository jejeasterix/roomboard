import { describe, expect, it } from "vitest";
import { IMPORT_EXTENSIONS } from "../../web/src/platform/files";
import { OFFICE_EXTENSIONS } from "../../web/src/platform/office-import";
import { asideReasonOf, extOf, FORMAT_LOTS, formatRows, LEFT_ASIDE, leftAsideReason, lotOf, LOT_LIVRE, type FormatEntry } from "./formats";

/** Ids des lecteurs du registre d'import (`import.ts`, `image-import.ts`, `media-import.ts`, `model3d-handlers.ts`, `office-import.ts`). */
const HANDLER_IDS = new Set(["roomboard", "rbitem", "rbpack", "pdf", "iwb", "ubz", "notebook", "olf", "flipchart", "image", "media", "model3d", "model3d-companion", "zip3d", "sheet", "office"]);

describe("FORMAT_LOTS (D9)", () => {
  it("chaque extension d'IMPORT_EXTENSIONS et d'OFFICE_EXTENSIONS est une clé de FORMAT_LOTS", () => {
    const wanted = new Set([...IMPORT_EXTENSIONS.map((e) => `.${e}`), ...OFFICE_EXTENSIONS]);
    expect(new Set(Object.keys(FORMAT_LOTS))).toEqual(wanted);
  });
  it("chaque lecteur nommé est un id du registre d'import", () => {
    for (const [ext, e] of Object.entries(FORMAT_LOTS)) expect(HANDLER_IDS.has(e.handler), ext).toBe(true);
  });
  it("lots livrés (LOT_LIVRE = 4, cli-lot4 D68) : tout format est lu ; écrits inchangés", () => {
    expect(LOT_LIVRE).toBe(4);
    const rows = formatRows();
    expect(rows.filter((r) => !r.read && !r.notes.some((n) => n.startsWith(LEFT_ASIDE))).map((r) => r.ext)).toEqual([]);
    expect(rows.find((r) => r.ext === ".rbpack")?.notes.join(" ")).toContain("library import");
    expect(rows.find((r) => r.ext === ".notebook")?.notes.join(" ")).toContain("lecture seule");
    expect(rows.filter((r) => r.write).map((r) => r.ext).sort()).toEqual([".iwb", ".pdf", ".rbitem", ".rbpack", ".roomboard", ".ubz"]);
    expect(rows.find((r) => r.ext === ".pdf")?.notes.join(" ")).toContain("pdf-page");
    expect(rows.find((r) => r.ext === ".pdf")?.notes.join(" ")).toContain("aucun décodeur");
    expect(rows).toContainEqual({ ext: ".roomboard", read: true, write: true, readLot: 1, writeLot: 1, notes: ["mode de page `mode` facultatif (`infinite`), hauteur portrait 3413,33 ; ordre des objets = ordre d'`elements` (`Restack`)", "options d'aspect (strokeStyle, roughness, roundness, opacity)"] });
    expect(rows.find((r) => r.ext === ".rbitem")?.notes.join(" ")).toContain("--grid");
    expect(rows).toContainEqual(expect.objectContaining({ ext: ".rbitem", read: true, write: true, readLot: 2, writeLot: 1 }));
    expect(rows.find((r) => r.ext === ".svg")?.notes.join(" ")).toContain("300 × 150");
    expect(rows.find((r) => r.ext === ".docx")?.notes.join(" ")).toContain("roomboard-office");
    expect(rows.find((r) => r.ext === ".xlsx")?.notes.join(" ")).toContain("H37");
  });
  it("D68 — aucune entrée « au lot N » : aucune note ne cite un lot", () => {
    for (const r of formatRows()) for (const n of r.notes) expect(n, r.ext).not.toMatch(/\blots?\b/i);
  });
  it("H48 — leftAsideReason : null pour tout format livré ; la note de coupe a son préfixe", () => {
    for (const ext of Object.keys(FORMAT_LOTS)) expect(leftAsideReason(`x${ext}`), ext).toBeNull();
    expect(LEFT_ASIDE).toBe("laissé de côté : ");
  });
  it("H48 — asideReasonOf : une entrée non lue donne sa raison (code 3), couverte ou non branchée sans note", () => {
    const entry = (read: 4 | null, covered: boolean, notes: string[]): FormatEntry => ({ read, write: null, handler: "image", covered: { read: covered, write: false }, notes });
    expect(asideReasonOf(entry(null, false, [`${LEFT_ASIDE}format propriétaire sans spécification`]))).toBe("format propriétaire sans spécification");
    expect(asideReasonOf(entry(4, false, [`${LEFT_ASIDE}lecteur absent`]))).toBe("lecteur absent");
    expect(asideReasonOf(entry(4, false, []))).toBe("lecture non branchée");
    expect(asideReasonOf(entry(4, true, [`${LEFT_ASIDE}ignoré`]))).toBeNull();
  });
  it("lotOf : .pdf → 3, .notebook → 2, inconnu → null (cli-lot3 : plus aucun code 3 à l'export)", () => {
    expect(lotOf("a.pdf")).toBe(3);
    expect(lotOf("a.notebook")).toBe(2);
    expect(lotOf("a.txt")).toBeNull();
  });
  it("extOf : minuscules, chemins, nom sans extension, clé d'Object", () => {
    expect(extOf("/a/b/Photo.JPG")).toBe(".jpg");
    expect(extOf("C:\\x\\t.Roomboard")).toBe(".roomboard");
    expect(extOf("README")).toBe("");
    expect(extOf(".bashrc")).toBe("");
    expect(leftAsideReason("a.constructor")).toBeNull();
    expect(lotOf("a.__proto__")).toBeNull();
  });

  it("D27 : covered — toute entrée d'un lot ≤ LOT_LIVRE est couverte ; un sens couvert a un lot", () => {
    for (const [ext, e] of Object.entries(FORMAT_LOTS)) {
      if (e.read !== null && e.read <= LOT_LIVRE) expect(e.covered.read, ext).toBe(true);
      if (e.write !== null && e.write <= LOT_LIVRE) expect(e.covered.write, ext).toBe(true);
      if (e.covered.read) expect(e.read, ext).not.toBeNull();
      if (e.covered.write) expect(e.write, ext).not.toBeNull();
    }
  });
});
