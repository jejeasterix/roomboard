import { describe, expect, it } from "vitest";
import {
  boardExportName, boardObjectCount, boardSavedMessage, mergeBoardWarnings, boardSources, boardTabName, boardWarningsMessage, IWB_NO_CONTENT_MESSAGE, UBZ_NO_PAGE_MESSAGE,
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
