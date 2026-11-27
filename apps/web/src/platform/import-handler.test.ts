import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import type * as Image from "./image-import";
import * as registry from "./import";
import { hasExtension, hasZipMagic, isSheetName, SHEET_MAX_BYTES, ZIP_MAGIC, type ImageTarget, type ImportContext, type ImportHandler, type ImportOutcome, type StageRect } from "./import-handler";
import { OFFICE_MAX_BYTES } from "./office-import";

/** Vrai seulement si A et B sont le même type (contrôlé par `tsc --noEmit`). */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe("import-handler (OF13, D5)", () => {
  it("hasExtension : fin de nom sans casse, jamais le nom seul", () => {
    expect(hasExtension("Cours.XLSX", ".xlsx")).toBe(true);
    expect(hasExtension(".xlsx", ".xlsx")).toBe(false);
    expect(hasExtension("a.xls", ".xlsx")).toBe(false);
  });

  it("ZIP_MAGIC figé, hasZipMagic sur les 4 premiers octets", () => {
    expect([...ZIP_MAGIC]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(Object.isFrozen(ZIP_MAGIC)).toBe(true);
    expect(hasZipMagic(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]))).toBe(true);
    expect(hasZipMagic(new Uint8Array([0x50, 0x4b]))).toBe(false);
  });

  it("SHEET_MAX_BYTES vaut 100 Mio, OFFICE_MAX_BYTES vaut SHEET_MAX_BYTES ; isSheetName : .xlsx et .xlsm", () => {
    expect(SHEET_MAX_BYTES).toBe(100 * 1024 * 1024);
    expect(OFFICE_MAX_BYTES).toBe(SHEET_MAX_BYTES);
    expect([isSheetName("a.xlsx"), isSheetName("B.XLSM"), isSheetName("c.xls"), isSheetName(".xlsx")]).toEqual([true, true, false, false]);
  });

  it("mêmes valeurs réexportées par import.ts (H3)", () => {
    expect(registry.hasExtension).toBe(hasExtension);
    expect(registry.hasZipMagic).toBe(hasZipMagic);
    expect(registry.isSheetName).toBe(isSheetName);
    expect(registry.ZIP_MAGIC).toBe(ZIP_MAGIC);
    expect(registry.SHEET_MAX_BYTES).toBe(SHEET_MAX_BYTES);
  });

  it("mêmes types réexportés par import.ts et image-import.ts (H3, contrôlé par tsc)", () => {
    const same: [
      Same<Image.ImageTarget, ImageTarget>,
      Same<Image.StageRect, StageRect>,
      Same<registry.ImageTarget, ImageTarget>,
      Same<registry.StageRect, StageRect>,
      Same<registry.ImportContext, ImportContext>,
      Same<registry.ImportHandler, ImportHandler>,
      Same<registry.ImportOutcome, ImportOutcome>,
    ] = [true, true, true, true, true, true, true];
    expect(same.every(Boolean)).toBe(true);
  });

  it("feuille : n'importe que des types, jamais le registre", () => {
    const source = readFileSync(join(__dirname, "import-handler.ts"), "utf8");
    expect(ts.preProcessFile(source, true, true).importedFiles.map((f) => f.fileName)).toEqual(["../core/api", "../engine/page", "../core/asset-store", "../engine/camera", "../engine/text-layout", "./files"]);
    // Les imports de type sont effacés à la compilation : il ne reste aucun import à l'exécution.
    expect(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).not.toMatch(/\bimport\b|\brequire\b/);
  });
});
