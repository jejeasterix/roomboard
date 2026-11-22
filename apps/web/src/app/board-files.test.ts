import { describe, expect, it } from "vitest";
import {
  boardExportName, boardNoContentMessage, boardObjectCount, resolveBoardFormat, boardSavedMessage, mergeBoardWarnings, boardSources, boardTabName, boardWarningsMessage, flipchartSources, IWB_NO_CONTENT_MESSAGE, UBZ_NO_PAGE_MESSAGE,
} from "./board-files";

const blob = (s: string): Blob => new Blob([s]);
const text = (b: Blob): Promise<string> => b.text();

describe("board-files (C13, D3, D5)", () => {
  it("C13 : boardSources accepte Content.xml et les barres inverses (Review Focus 5)", async () => {
    const s = boardSources("iwb", [{ path: "Content.XML", blob: blob("<iwb/>") }, { path: "images\\a.PNG", blob: blob("png") }, { path: "./images/b.jpg", blob: blob("jpg") }]);
    expect(await text(s.xml[0]!)).toBe("<iwb/>");
    expect([...s.media.keys()]).toEqual(["images/a.PNG", "images/b.jpg"]);
    expect(s.total).toBe(1);
  });

  it("C13 : .iwb ZIP sans content.xml : « fichier endommagé : aucun content.xml dans ce .iwb »", () => {
    expect(() => boardSources("iwb", [{ path: "images/a.png", blob: blob("x") }])).toThrow(IWB_NO_CONTENT_MESSAGE);
  });

  it("C13 : .ubz : pages triées par numéro (page2 avant page10), 500 au plus, total gardé", async () => {
    const s = boardSources("ubz", [{ path: "page10.svg", blob: blob("10") }, { path: "page2.svg", blob: blob("2") }, { path: "images/x.png", blob: blob("x") }]);
    expect(await Promise.all(s.xml.map(text))).toEqual(["2", "10"]);
    expect([...s.media.keys()]).toEqual(["images/x.png"]);
    const many = boardSources("ubz", Array.from({ length: 501 }, (_, i) => ({ path: `page${String(i + 1).padStart(3, "0")}.svg`, blob: blob(String(i + 1)) })));
    expect([many.xml.length, many.total]).toEqual([500, 501]);
  });

  it("C13 : .ubz sans page : « fichier endommagé : aucune page pageNNN.svg dans ce .ubz »", () => {
    expect(() => boardSources("ubz", [{ path: "metadata.rdf", blob: blob("x") }])).toThrow(UBZ_NO_PAGE_MESSAGE);
  });

  it("C13 : noms : onglet « Cours.roomboard », copies « Cours.iwb » et « Sans titre.ubz »", () => {
    expect(boardTabName("Cours.IWB", "iwb")).toBe("Cours.roomboard");
    expect(boardTabName("OpenBoard.ubz", "ubz")).toBe("OpenBoard.roomboard");
    expect(boardTabName("lecon.Notebook", "notebook")).toBe("lecon.roomboard");
    expect(boardTabName("cours.olf", "olf")).toBe("cours.roomboard");
    expect(boardTabName("Paper.FlipChart", "flipchart")).toBe("Paper.roomboard");
    expect(boardExportName("Cours.roomboard", "iwb")).toBe("Cours.iwb");
    expect(boardExportName("Sans titre", "ubz")).toBe("Sans titre.ubz");
  });

  it("C13 : avis : un avertissement, plusieurs, copie enregistrée avec ou sans avertissement", () => {
    expect(boardWarningsMessage("a.iwb", ["page 1 : 1 vidéo non lue"])).toBe("a.iwb : ouvert avec 1 avertissement :\n- page 1 : 1 vidéo non lue");
    expect(boardWarningsMessage("a.ubz", ["x", "y"])).toBe("a.ubz : ouvert avec 2 avertissements :\n- x\n- y");
    expect(boardSavedMessage("iwb", [])).toBe("Copie enregistrée au format .iwb");
    expect(boardSavedMessage("ubz", ["1 flèche écrite en ligne (.ubz)"])).toBe("Copie enregistrée au format .ubz, avec 1 avertissement :\n- 1 flèche écrite en ligne (.ubz)");
  });
});

describe("board-files : bornes et avis (T14)", () => {
  const line = { kind: "shape", shape: "line", m: [1, 0, 0, 1, 0, 0], x0: 0, y0: 0, x1: 1, y1: 1, color: "#000000", width: 1, fill: null } as const;
  it("T14 : boardObjectCount compte les feuilles, pas les groupes (comme le lecteur Rust)", () => {
    const groups = Array.from({ length: 50_000 }, () => ({ kind: "group", children: [line, line] }) as const);
    expect(boardObjectCount([{ background: null, objects: groups }])).toBe(100_000);
  });

  it("T14 : mergeBoardWarnings additionne par (page, sorte), singulier et pluriel, dans l'ordre des pages", () => {
    expect(mergeBoardWarnings([["page 2 : 1 objet illisible ignoré", "page 1 : 1 objet illisible ignoré", "1 vidéo non lue"], ["page 1 : 1 objet illisible ignoré", "page 2 : 1 image absente de l'archive"]])).toEqual([
      "1 vidéo non lue",
      "page 1 : 2 objets illisibles ignorés",
      "page 2 : 1 objet illisible ignoré",
      "page 2 : 1 image absente de l'archive",
    ]);
  });
});

describe("board-files : dialecte et sources (C13 lot 2)", () => {
  it("C13 N4 : contenu avant extension", () => {
    expect(resolveBoardFormat("notebook", ["content.json"])).toBe("olf");
    expect(resolveBoardFormat("iwb", ["imsmanifest.xml", "page0.svg"])).toBe("notebook");
    expect(resolveBoardFormat("ubz", ["page1.svg"])).toBe("ubz");
    expect(resolveBoardFormat("notebook", ["imsmanifest.xml", "page0.svg", "content.json"])).toBe("notebook");
    expect(resolveBoardFormat("olf", ["a.png"])).toBeNull();
  });

  it("C13 N6 : .notebook sans manifeste reste notebook", () => {
    expect(resolveBoardFormat("notebook", ["page0.svg"])).toBe("notebook");
    expect(resolveBoardFormat("iwb", ["page0.svg"])).toBe("ubz");
  });

  it("C13 N6 : boardSources notebook garde toutes les pages et leurs noms", async () => {
    const s = boardSources("notebook", [
      { path: "page10.svg", blob: blob("p10") }, { path: "page2.svg", blob: blob("p2") }, { path: "imsmanifest.xml", blob: blob("<m/>") }, { path: "images/a b[1].png", blob: blob("png") },
    ]);
    expect(s.names).toEqual(["page2.svg", "page10.svg"]);
    expect(await Promise.all(s.xml.map(text))).toEqual(["p2", "p10"]);
    expect(s.manifest).not.toBeNull();
    expect([...s.media.keys()]).toEqual(["images/a b[1].png"]);
    expect(s.total).toBe(2);
  });

  it("C13 N8 : boardSources olf rend content.json", async () => {
    const s = boardSources("olf", [{ path: "content.json", blob: blob("{}") }, { path: "media/x.png", blob: blob("png") }]);
    expect(await text(s.json!)).toBe("{}");
    expect(s.xml).toEqual([]);
    expect([...s.media.keys()]).toEqual(["media/x.png"]);
  });

  it("C13 : boardNoContentMessage", () => {
    expect(boardNoContentMessage("notebook")).toBe("fichier endommagé : contenu de tableau introuvable dans ce .notebook");
  });
});

describe("board-files : paperboards .flipchart (C13 lot 3)", () => {
  it("C13 S4 : flipchartSources sépare la structure (Rust) des images (media, clé = chemin normalisé)", async () => {
    const s = flipchartSources([
      { path: "version", blob: blob("1") },
      { path: "7.IN", blob: blob("a") },
      { path: "8.fpg/9.io", blob: blob("b") },
      { path: "8.fpg\\10.ir", blob: blob("c") },
      { path: "8.fpg/img.PNG", blob: blob("png") },
      { path: "./12.ir", blob: blob("d") },
    ]);
    expect(s.structure.map((e) => e.path)).toEqual(["version", "7.IN", "8.fpg/9.io", "8.fpg/10.ir", "12.ir"]);
    expect([...s.media.keys()]).toEqual(["8.fpg/img.PNG"]);
    expect(await text(s.media.get("8.fpg/img.PNG")!)).toBe("png");
  });
  it("C13 S4 : flipchartSources sans entrée : structure vide", () => {
    expect(flipchartSources([]).structure).toEqual([]);
  });
});
