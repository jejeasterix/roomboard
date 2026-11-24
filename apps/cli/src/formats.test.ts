import { describe, expect, it } from "vitest";
import { IMPORT_EXTENSIONS } from "../../web/src/platform/files";
import { OFFICE_EXTENSIONS } from "../../web/src/platform/office-import";
import { exportBlocked, extOf, FORMAT_LOTS, formatRows, importBlocked, lotOf, LOT_LIVRE, unsupportedMessage } from "./formats";

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
  it("lots livrés (LOT_LIVRE = 2) : lus et écrits", () => {
    expect(LOT_LIVRE).toBe(2);
    const rows = formatRows();
    expect(rows.filter((r) => r.read).map((r) => r.ext).sort()).toEqual([".flipchart", ".iwb", ".jpeg", ".jpg", ".notebook", ".olf", ".pdf", ".png", ".rbitem", ".rbpack", ".roomboard", ".ubz", ".xlsm", ".xlsx"]);
    expect(rows.find((r) => r.ext === ".rbpack")?.notes.join(" ")).toContain("library import");
    expect(rows.find((r) => r.ext === ".notebook")?.notes.join(" ")).toContain("lecture seule");
    expect(rows.filter((r) => r.write).map((r) => r.ext).sort()).toEqual([".iwb", ".rbitem", ".rbpack", ".roomboard", ".ubz"]);
    expect(rows).toContainEqual({ ext: ".roomboard", read: true, write: true, readLot: 1, writeLot: 1, notes: [] });
    expect(rows.find((r) => r.ext === ".rbitem")?.notes.join(" ")).toContain("--grid");
    expect(rows).toContainEqual(expect.objectContaining({ ext: ".rbitem", read: true, write: true, readLot: 2, writeLot: 1 }));
  });
  it("importBlocked : lot d'un format reconnu non livré, null pour un format lisible ou inconnu", () => {
    expect(importBlocked("doc.pdf")).toBeNull();
    expect(importBlocked("x.rbitem")).toBeNull();
    expect(importBlocked("r.DOCX")).toBe(4);
    expect(importBlocked("image.png")).toBeNull();
    expect(importBlocked("valeurs.xlsx")).toBeNull();
    expect(importBlocked("notes.txt")).toBeNull();
    expect(importBlocked("a.iwb")).toBeNull();
    expect(importBlocked("a.flipchart")).toBeNull();
    expect(unsupportedMessage("/tmp/lettre.docx", 4)).toBe("lettre.docx : format pris en charge par la CLI au lot 4");
  });
  it("exportBlocked : .iwb → 2, .pdf → 3 ; .rbitem et .png → null ; lotOf", () => {
    expect(exportBlocked("a.iwb")).toBeNull();
    expect(exportBlocked("a.pdf")).toBe(3);
    expect(exportBlocked("a.rbitem")).toBeNull();
    expect(exportBlocked("a.png")).toBeNull();
    expect(lotOf("a.notebook")).toBe(2);
    expect(lotOf("a.txt")).toBeNull();
  });
  it("extOf : minuscules, chemins, nom sans extension, clé d'Object", () => {
    expect(extOf("/a/b/Photo.JPG")).toBe(".jpg");
    expect(extOf("C:\\x\\t.Roomboard")).toBe(".roomboard");
    expect(extOf("README")).toBe("");
    expect(extOf(".bashrc")).toBe("");
    expect(importBlocked("a.constructor")).toBeNull();
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
