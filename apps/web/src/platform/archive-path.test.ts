import { describe, expect, it } from "vitest";
import { safeArchivePath } from "./archive-path";

describe("C13 N16 : safeArchivePath", () => {
  it("C13 N16 : safeArchivePath garde un chemin relatif tel quel", () => {
    expect(safeArchivePath("a/b.png")).toBe("a/b.png");
  });

  it("C13 N16 : safeArchivePath normalise barres obliques inverses et ./ en tête", () => {
    expect(safeArchivePath(".\\x\\y.svg")).toBe("x/y.svg");
    expect(safeArchivePath("./././z.png")).toBe("z.png");
  });

  it("C13 N16 : safeArchivePath refuse absolu et lettre de lecteur", () => {
    for (const no of ["/etc/p", "\\x", "C:/x", "c:x"]) expect(safeArchivePath(no), no).toBeNull();
  });

  it("C13 N16 : safeArchivePath refuse .. dans tout segment", () => {
    for (const no of ["a/../b", "../evil.png", "a/b/.."]) expect(safeArchivePath(no), no).toBeNull();
  });

  it("C13 N16 : safeArchivePath refuse __MACOSX dans tout segment", () => {
    for (const no of ["__MACOSX/a.png", "a/__MACOSX/b.png"]) expect(safeArchivePath(no), no).toBeNull();
  });

  it("C13 N16 : safeArchivePath refuse dossier et vide", () => {
    for (const no of ["dir/", "dir\\", ""]) expect(safeArchivePath(no), no).toBeNull();
  });
});
