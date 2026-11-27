import { describe, expect, it } from "vitest";
import { createBackgroundSearch, distance, faultBound, stem, type SearchDoc } from "./search";
import { SYNONYMS } from "./synonyms";

const DOCS: readonly SearchDoc[] = [
  { id: "mer-1", label: "Vagues sur la plage", keywords: ["mer", "bleu", "été"] },
  { id: "ardoise", label: "Ardoise", keywords: ["ardoise", "tableau noir", "craie", "sombre"] },
  { id: "seyes-8mm", label: "Seyès 8 mm", keywords: ["seyès", "grands carreaux", "cahier"] },
  { id: "portees-moyennes", label: "Portées moyennes", keywords: ["portée", "musique"] },
  { id: "quadrillage-5mm", label: "Quadrillage 5 mm", keywords: ["quadrillage", "carreaux"] },
  { id: "foret-1", label: "Sous-bois", keywords: ["forêt", "vert", "arbres"] },
  { id: "mine:page-1", label: "Page 1 — 27/11 10:00", keywords: [] },
];
const s = createBackgroundSearch(DOCS);

describe("personnalisation-1b : recherche des fonds (Q15, Q16, DA5)", () => {
  it("mot exact : « ardoise » rend l'ardoise en tête", () => {
    expect(s.search("ardoise")[0]).toBe("ardoise");
  });
  it("synonyme : « océan » trouve la mer", () => {
    expect(s.search("océan")).toContain("mer-1");
  });
  it("faute : « oséan » trouve aussi la mer ; « ardiose » (transposition) trouve l'ardoise", () => {
    expect(s.search("oséan")).toContain("mer-1");
    expect(s.search("ardiose")).toContain("ardoise");
  });
  it("sans accent : « portee » et « seyes » trouvent la portée et le Seyès", () => {
    expect(s.search("portee")[0]).toBe("portees-moyennes");
    expect(s.search("seyes")[0]).toBe("seyes-8mm");
  });
  it("pluriel : « carreau » trouve le quadrillage et le Seyès", () => {
    expect(s.search("carreau")).toEqual(expect.arrayContaining(["quadrillage-5mm", "seyes-8mm"]));
    expect(stem("carreaux")).toBe("carreau");
    expect(stem("animaux")).toBe("animal");
    expect(stem("arbres")).toBe("arbre");
    expect(stem("mer")).toBe("mer");
  });
  it("expression : « tableau noir » sort l'ardoise ; « grands carreaux » le Seyès", () => {
    expect(s.search("tableau noir")[0]).toBe("ardoise");
    expect(s.search("grands carreaux")[0]).toBe("seyes-8mm");
  });
  it("préfixe : « qua » trouve le quadrillage, « ard » l'ardoise", () => {
    expect(s.search("qua")).toContain("quadrillage-5mm");
    expect(s.search("ard")[0]).toBe("ardoise");
  });
  it("rang : exact > préfixe > synonyme > faute", () => {
    const r = createBackgroundSearch([
      { id: "faute", label: "x", keywords: ["plaga"] },
      { id: "synonyme", label: "x", keywords: ["littoral"] },
      { id: "prefixe", label: "x", keywords: ["plagette"] },
      { id: "exact", label: "x", keywords: ["plage"] },
    ]);
    expect(r.search("plage")).toEqual(["exact", "prefixe", "synonyme", "faute"]);
  });
  it("ET : tous les mots doivent trouver un écho ; « ardoise musique » ne rend rien", () => {
    expect(s.search("ardoise musique")).toEqual([]);
    expect(s.search("sous bois vert")).toEqual(["foret-1"]);
  });
  it("Mes fonds : cherchés sur leur nom", () => {
    expect(s.search("page")).toContain("mine:page-1");
  });
  it("requête vide, blanche ou ponctuation seule : aucun résultat, aucune erreur", () => {
    for (const q of ["", "   ", "— ? !", "de la"]) expect(s.search(q), JSON.stringify(q)).toEqual([]);
  });
  it("suggest : terme proche du dictionnaire, tel qu'écrit ; rien de proche : null", () => {
    expect(s.suggest("solfeje")).toBe("solfège");
    expect(s.suggest("zzzzzzzz")).toBeNull();
    expect(s.suggest("")).toBeNull();
  });
  it("distance de Damerau-Levenshtein bornée, bornes de faute 0, 1, 2", () => {
    expect(distance("ocean", "osean", 1)).toBe(1);
    expect(distance("ardoise", "ardiose", 1)).toBe(1);
    expect(distance("mer", "montagne", 2)).toBe(3);
    expect([faultBound(3), faultBound(4), faultBound(7), faultBound(8)]).toEqual([0, 1, 1, 2]);
  });
  it("dictionnaire : au moins 70 groupes, chacun d'au moins deux termes, aucun nom de site", () => {
    expect(SYNONYMS.length).toBeGreaterThanOrEqual(70);
    for (const g of SYNONYMS) expect(g.length, g.join(",")).toBeGreaterThanOrEqual(2);
    const all = SYNONYMS.flat().join(" ").toLowerCase();
    for (const t of ["http", "www.", "wikimedia", "unsplash", "pixabay", "pexels", "polyhaven", "openverse"]) expect(all).not.toContain(t);
  });
  it("200 fonds : une recherche prend moins de 10 ms en moyenne", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ id: `f${i}`, label: `Fond ${i}`, keywords: ["bleu", "mer", "grille", "papier", "nature"] }));
    const big = createBackgroundSearch(many);
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) big.search(i % 2 === 0 ? "oséan" : "papie");
    expect((performance.now() - t0) / 20).toBeLessThan(10);
  });
});
