import { describe, expect, it } from "vitest";
import {
  BUTTON_PX, EDGE, GAP, SHEET_W, TABS_MIN, anchorOf, isCentered, laneOf, nudge, placeIsland, placeOptions, sheetLane, tabsWidth, topRowBottom,
  type Corners,
} from "./island-place";

const MID = { w: 1280, h: 900 };
/** Rangée du haut de `defaut` en taille M : menu 56, écart 8, onglets 144 au moins ; panneaux 108 ; hauteur 56. */
const TOP: Corners = { start: 56 + 8 + 144, end: 108, band: 56 };
/** Rangée du bas : historique 160 ; rien à droite. */
const BOTTOM: Corners = { start: 160, end: 0, band: 56 };
const TOOLS = { w: 770, h: 56 };

describe("island-place : ancres (design-l2 L2-5, H11)", () => {
  it("design-l2 L2-5 : menu haut-gauche, outils haut-centre, panneaux haut-droite, historique bas-gauche, pages bas-centre", () => {
    expect(["menu", "tools", "panels", "history", "pages"].map(anchorOf)).toEqual(["top-start", "top-center", "top-end", "bottom-start", "bottom-center"]);
  });
  it("design-l2 H11 : rôle inconnu ou clé héritée : haut-droite", () => {
    for (const r of ["zoom", "", "__proto__", "toString"]) expect(anchorOf(r), r).toBe("top-end");
  });
  it("isCentered : seulement top-center et bottom-center", () => {
    expect((["top-start", "top-center", "top-end", "bottom-start", "bottom-center"] as const).map(isCentered)).toEqual([false, true, false, false, true]);
  });
  it("constantes : marges 16, écart 8, onglets 144, panneau 600, boutons 44 / 48 / 64", () => {
    expect([EDGE, GAP, TABS_MIN, SHEET_W]).toEqual([16, 8, 144, 600]);
    expect(BUTTON_PX).toEqual({ s: 44, m: 48, l: 64 });
  });
});

describe("island-place : voies (design-l2 L2-30, L2-12)", () => {
  it("design-l2 L2-30 (b) : 1280, la place symétrique contient l'îlot d'outils : il reste sur la rangée du haut, centré, entier", () => {
    // place symétrique : 1280 - 2 × (16 + max(208, 108) + 8) = 816
    expect(laneOf("top-center", TOOLS, MID, TOP)).toEqual({ x: 255, y: 16, maxWidth: 816 });
  });
  it("design-l2 L2-30 (b) : 1024, la place symétrique (560) ne le contient pas : voie suivante, sous la rangée du haut", () => {
    expect(laneOf("top-center", TOOLS, { w: 1024, h: 768 }, TOP)).toEqual({ x: 127, y: 16 + 56 + 8, maxWidth: 992 });
  });
  it("design-l2 L2-30 (a) : 768, largeur maximale = voie - 2 × 16 = 736, collé à 16", () => {
    expect(laneOf("top-center", TOOLS, { w: 768, h: 700 }, TOP)).toEqual({ x: 16, y: 80, maxWidth: 736 });
  });
  it("design-l2 L2-12 : centrage arrondi à l'entier (largeur impaire)", () => {
    const l = laneOf("top-center", { w: 771, h: 56 }, MID, TOP);
    expect(Number.isInteger(l.x) && Number.isInteger(l.y)).toBe(true);
    expect(l.x).toBe(Math.round((1280 - 771) / 2));
  });
  it("design-l2 L2-30 (b) : pages centrées sur la rangée du bas, à droite de l'historique", () => {
    expect(laneOf("bottom-center", { w: 400, h: 56 }, MID, BOTTOM)).toEqual({ x: 440, y: 900 - 16 - 56, maxWidth: 912 });
  });
  it("design-l2 L2-18 : trente pages : voie au-dessus de la rangée du bas, toute la largeur, sans recouvrir l'historique", () => {
    const l = laneOf("bottom-center", { w: 1900, h: 56 }, MID, BOTTOM);
    expect(l).toEqual({ x: 16, y: 900 - 16 - 56 - 8 - 56, maxWidth: 1248 });
    expect(l.y + 56).toBeLessThanOrEqual(900 - 16 - 56);
  });
  it("coins : haut-gauche à (16, 16), haut-droite collé à 16 du bord droit, bas-gauche à 16 du bas", () => {
    expect(laneOf("top-start", { w: 56, h: 56 }, MID, TOP)).toEqual({ x: 16, y: 16, maxWidth: 1248 });
    expect(laneOf("top-end", { w: 108, h: 56 }, MID, TOP)).toEqual({ x: 1280 - 16 - 108, y: 16, maxWidth: 1248 });
    expect(laneOf("bottom-start", { w: 160, h: 56 }, MID, BOTTOM)).toEqual({ x: 16, y: 900 - 16 - 56, maxWidth: 1248 });
  });
  it("case vide (0 × 0) : aucune valeur négative ni fractionnaire", () => {
    const l = laneOf("top-center", TOOLS, { w: 0, h: 0 }, TOP);
    expect(l.maxWidth).toBe(0);
    expect(l.y).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(l.x)).toBe(true);
  });
});

describe("island-place : îlot déplacé (design-l2 L2-9, L2-11)", () => {
  it("sans position : celle de la voie", () => {
    expect(placeIsland("top-center", TOOLS, MID, null, TOP)).toEqual({ x: 255, y: 16 });
  });
  it("design-l2 L2-11 : placeIsland borne l'îlot entier dans la case (position d'un grand écran sur un petit)", () => {
    expect(placeIsland("top-center", TOOLS, { w: 1024, h: 768 }, { x: 1500, y: 1000 }, TOP)).toEqual({ x: 1024 - 770, y: 768 - 56 });
    expect(placeIsland("top-center", TOOLS, MID, { x: -40, y: -10 }, TOP)).toEqual({ x: 0, y: 0 });
  });
  it("design-l2 L2-12 : positions arrondies à l'entier", () => {
    expect(placeIsland("top-center", TOOLS, MID, { x: 10.4, y: 20.6 }, TOP)).toEqual({ x: 10, y: 21 });
  });
  it("design-l2 L2-11 : îlot plus large que la case : largeur ramenée à la case - 32, collé à gauche", () => {
    expect(placeIsland("top-center", { w: 2000, h: 56 }, { w: 768, h: 700 }, { x: 300, y: 100 }, TOP)).toEqual({ x: 768 - 736, y: 100 });
  });
});

describe("island-place : clavier (design-l2 L2-10)", () => {
  it("flèches : 16 px ; Maj : 64 px", () => {
    const p = { x: 100, y: 200 };
    expect(nudge(p, "ArrowRight", false)).toEqual({ x: 116, y: 200 });
    expect(nudge(p, "ArrowLeft", false)).toEqual({ x: 84, y: 200 });
    expect(nudge(p, "ArrowUp", true)).toEqual({ x: 100, y: 136 });
    expect(nudge(p, "ArrowDown", true)).toEqual({ x: 100, y: 264 });
  });
  it("autre touche (Début compris, traité par l'appelant) : null", () => {
    for (const k of ["Home", "a", "Enter", "constructor"]) expect(nudge({ x: 0, y: 0 }, k, false), k).toBeNull();
  });
});

describe("island-place : panneau des profils et onglets (design-l2 L2-16, L2-30 c)", () => {
  it("design-l2 L2-16 : 1024, panneau de 600 : voie sous la rangée du haut dans les 424 px libres", () => {
    expect(sheetLane({ w: 1024, h: 768 }, 600, 56, 48)).toEqual({ x: 16, y: 80, maxWidth: 392 });
  });
  it("design-l2 L2-16, H13 : place plus étroite que 2 × 16 + 3 boutons : null (les îlots restent sous le panneau)", () => {
    expect(sheetLane({ w: 560, h: 700 }, 600, 56, 48)).toBeNull();
    expect(sheetLane({ w: 775, h: 700 }, 600, 56, 48)).toBeNull();
    expect(sheetLane({ w: 776, h: 700 }, 600, 56, 48)).toEqual({ x: 16, y: 80, maxWidth: 144 });
  });
  it("design-l2 L2-30 (c) : onglets jusqu'à l'îlot d'outils de la rangée du haut", () => {
    expect(tabsWidth(MID, 80, 108, { x: 255, y: 16 })).toBe(255 - 8 - 80);
  });
  it("design-l2 L2-30 (c) : outils descendus ou absents : jusqu'au groupe haut-droite ; jamais moins de 144", () => {
    expect(tabsWidth(MID, 80, 108, { x: 127, y: 80 })).toBe(1280 - 16 - 108 - 8 - 80);
    expect(tabsWidth(MID, 80, 108, null)).toBe(1280 - 16 - 108 - 8 - 80);
    expect(tabsWidth({ w: 300, h: 700 }, 80, 108, null)).toBe(144);
  });
});

describe("design-l2 T11 : #etat dans la rangée du haut", () => {
  it("design-l2 T11 (discrimine) : tabsWidth retranche #etat non vide et son écart ; vide : inchangé", () => {
    expect(tabsWidth(MID, 80, 108, { x: 360, y: 16 }, 100)).toBe(360 - 8 - 80 - 100 - 8);
    expect(tabsWidth(MID, 80, 108, null, 100)).toBe(1280 - 16 - 108 - 8 - 80 - 100 - 8);
    expect(tabsWidth(MID, 80, 108, { x: 360, y: 16 }, 0)).toBe(360 - 8 - 80);
    expect(tabsWidth(MID, 80, 108, { x: 360, y: 16 }, 1000)).toBe(144);
  });
});

describe("island-place : panneau d'options (OG11, T10)", () => {
  it("à gauche sous la rangée du haut ; décalé par la barre latérale quand elle existe", () => {
    expect(placeOptions(MID, null, 64)).toEqual({ x: 16, y: 72 });
    expect(placeOptions(MID, { w: 80, h: 900 }, 64)).toEqual({ x: 88, y: 72 });
    expect(topRowBottom(44)).toBe(16 + 44 + 8);
  });
  it("sous la rangée du haut : haut du panneau >= bas de l'îlot ☰ + GAP, en S, M, L", () => {
    for (const size of ["s", "m", "l"] as const) {
      const btn = BUTTON_PX[size];
      const menuBottom = EDGE + btn + 8; // îlot ☰ posé à EDGE, haut de btn + 8
      const y = placeOptions({ w: 1280, h: 800 }, null, topRowBottom(btn)).y;
      expect(y, size).toBeGreaterThanOrEqual(menuBottom + GAP);
    }
  });
  it("y reste dans la zone", () => {
    expect(placeOptions({ w: 1280, h: 100 }, null, 400).y).toBe(84);
  });
});
