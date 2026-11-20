import { describe, expect, it } from "vitest";
import { isAbsoluteLink, relativeLink, resolveLink } from "./media-link";

describe("liens relatifs (C14, M30)", () => {
  it("POSIX, même dossier", () => {
    expect(relativeLink("/home/j/cours.roomboard", "/home/j/clip.webm")).toBe("clip.webm");
  });
  it("POSIX, sous-dossier", () => {
    expect(relativeLink("/home/j/cours.roomboard", "/home/j/videos/clip.webm")).toBe("videos/clip.webm");
  });
  it("POSIX, parent", () => {
    expect(relativeLink("/home/j/cours/a.roomboard", "/home/j/films/clip.webm")).toBe("../films/clip.webm");
  });
  it("Windows, sous-dossier, lecteur en minuscule", () => {
    expect(relativeLink("C:\\Cours\\a.roomboard", "C:\\Cours\\videos\\clip.mp4")).toBe("videos/clip.mp4");
    expect(relativeLink("C:\\Cours\\a.roomboard", "c:\\cours\\Videos\\clip.mp4")).toBe("Videos/clip.mp4");
  });
  it("autre lecteur : chemin absolu tel quel", () => {
    expect(relativeLink("C:\\Cours\\a.roomboard", "D:\\v\\clip.mp4")).toBe("D:\\v\\clip.mp4");
  });
  it("UNC, autre partage : absolu", () => {
    expect(relativeLink("\\\\srv\\a\\x\\d.roomboard", "\\\\srv\\b\\clip.mp4")).toBe("\\\\srv\\b\\clip.mp4");
    expect(relativeLink("\\\\srv\\a\\x\\d.roomboard", "\\\\srv\\a\\x\\v\\clip.mp4")).toBe("v/clip.mp4");
  });
  it("préfixe \\\\?\\ ignoré", () => {
    expect(relativeLink("C:\\Cours\\a.roomboard", "\\\\?\\C:\\Cours\\videos\\clip.mp4")).toBe("videos/clip.mp4");
  });
  it("aller-retour POSIX et Windows", () => {
    const px = ["/home/j/cours/a.roomboard", "/home/j/films/clip.webm"] as const;
    expect(resolveLink(px[0], relativeLink(...px))).toBe(px[1]);
    const w = ["C:\\Cours\\a.roomboard", "C:\\Films\\x\\clip.mp4"] as const;
    expect(relativeLink(...w)).toBe("../Films/x/clip.mp4");
    expect(resolveLink(w[0], relativeLink(...w))).toBe(w[1]);
  });
  it("chemin absolu : résolu tel quel ; non absolu : copié tel quel", () => {
    expect(resolveLink("/a/b.roomboard", "/z/c.mp4")).toBe("/z/c.mp4");
    expect(resolveLink("C:\\a\\b.roomboard", "D:\\c.mp4")).toBe("D:\\c.mp4");
    expect(relativeLink("/a/b.roomboard", "clip.mp4")).toBe("clip.mp4");
  });
  it("`.` sauté, `..` au-delà de la racine ne la passe pas", () => {
    expect(resolveLink("/a/b.roomboard", "./x/../../../../c.mp4")).toBe("/c.mp4");
    expect(resolveLink("C:\\a\\b.roomboard", "../../../c.mp4")).toBe("C:\\c.mp4");
  });
  it("isAbsoluteLink", () => {
    expect(["/a", "C:\\a", "c:/a", "\\\\s\\a"].map(isAbsoluteLink)).toEqual([true, true, true, true]);
    expect(["a/b", "../a", "a\\b"].map(isAbsoluteLink)).toEqual([false, false, false]);
  });
});
