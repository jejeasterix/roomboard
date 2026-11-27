import { describe, expect, it } from "vitest";
import type { Toolbar as Bar } from "../toolbar";
import {
  BUTTON_PX, EDGE, GAP, MOVABLE_ROLES, SHEET_W, TABS_MIN, anchorOf, isCentered, laneOf, nudge, placeIsland, placeOptions, beyondObstacles, sheetLane, sideCorners, tabsWidth, withContextRow,
  optionsWidth, placeLinkAvoiding, topRowBottom, type Anchor, type Corners,
} from "./island-place";

const MID = { w: 1280, h: 900 };
/** Rangée du haut de `defaut` en taille M : menu 56, écart 8, onglets 144 au moins ; panneaux 108 ; hauteur 56. */
const TOP: Corners = { start: 56 + 8 + 144, end: 108, band: 56 };
/** Rangée du bas : historique 160 ; rien à droite. */
const BOTTOM: Corners = { start: 160, end: 0, band: 56 };
const TOOLS = { w: 770, h: 56 };
const barOf = (role: string, anchor?: Anchor): Bar => ({ id: role, role, dock: "floating", collapsed: false, groups: [], rest: {}, ...(anchor !== undefined ? { anchor } : {}) });

describe("island-place : ancres (design-l2 L2-5, H11)", () => {
  it("design-l2 L2-5 : menu haut-gauche, outils haut-centre, panneaux haut-droite, historique bas-gauche, pages côté gauche (personnalisation-1a)", () => {
    expect(["menu", "tools", "panels", "history", "pages"].map((r) => anchorOf(barOf(r)))).toEqual(["top-start", "top-center", "top-end", "bottom-start", "side-start"]);
  });
  it("design-l2 H11 : rôle inconnu ou clé héritée : haut-droite", () => {
    for (const r of ["zoom", "", "__proto__", "toString"]) expect(anchorOf(barOf(r)), r).toBe("top-end");
  });
  it("personnalisation-1a : pages → side-start par défaut ; bar.anchor side-end prime sur le rôle", () => {
    expect(anchorOf(barOf("pages"))).toBe("side-start");
    expect(anchorOf(barOf("pages", "side-end"))).toBe("side-end");
    expect(anchorOf(barOf("history", "bottom-start"))).toBe("bottom-start");
    expect(anchorOf(barOf("tools", "bottom-start"))).toBe("bottom-center"); // T19 : barre mobile, coin replié
  });
  it("isCentered : seulement top-center et bottom-center", () => {
    expect((["top-start", "top-center", "top-end", "bottom-start", "bottom-center", "side-start", "side-end"] as const).map(isCentered)).toEqual([false, true, false, false, true, false, false]);
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
  it("design-l2 L2-30 (b) : un îlot centré du bas se pose sur la rangée du bas, à droite de l'historique", () => {
    expect(laneOf("bottom-center", { w: 400, h: 56 }, MID, BOTTOM)).toEqual({ x: 440, y: 900 - 16 - 56, maxWidth: 912 });
  });
  it("personnalisation-1a : laneOf side-start : sous la rangée du haut, au-dessus de celle du bas, maxHeight borné", () => {
    const c: Corners = { ...TOP, foot: 56 };
    // y = 16 + 56 + 8 = 80 ; maxHeight = 900 - 80 - (16 + 56 + 8) = 740
    expect(laneOf("side-start", { w: 56, h: 300 }, MID, c)).toEqual({ x: 16, y: 80, maxWidth: 1248, maxHeight: 740 });
  });
  it("personnalisation-1a : laneOf side-end : collé à 16 du bord droit ; sans rangée du bas, maxHeight jusqu'à 16 du bord", () => {
    expect(laneOf("side-end", { w: 56, h: 300 }, MID, TOP)).toEqual({ x: 1280 - 16 - 56, y: 80, maxWidth: 1248, maxHeight: 900 - 80 - 16 });
  });
  it("personnalisation-1a : laneOf side-* sur une case vide : aucune valeur négative", () => {
    const l = laneOf("side-start", { w: 56, h: 300 }, { w: 0, h: 0 }, { ...TOP, foot: 56 });
    expect(l.maxHeight).toBe(0);
    expect(l.y).toBeGreaterThanOrEqual(0);
  });
  it("T16 (discrimine) : laneOf side-* passe sous l'îlot d'outils descendu qui la surplombe ; étroite, sans le croiser, reste sous la rangée des coins", () => {
    // 1280 × 900 : outils descendu sur la voie suivante (y 80), 940 px centrés : x 170–1110 (constat de T11).
    const tools = { x: 170, y: 80, w: 940, h: 56 };
    const c: Corners = { ...TOP, foot: 56, above: [tools] };
    // dépliée (260 px, x 16–276) : croise l'outil, sous lui : y = 80 + 56 + 8 ; bas inchangé (au-dessus de la rangée du bas)
    const open = laneOf("side-start", { w: 260, h: 600 }, MID, c);
    expect(open).toEqual({ x: 16, y: 144, maxWidth: 1248, maxHeight: 900 - 144 - (16 + 56 + 8) });
    // repliée (bande de 52 px, x 16–68) : l'outil ne la surplombe pas : sous la rangée des coins
    expect(laneOf("side-start", { w: 52, h: 300 }, MID, c).y).toBe(80);
    // side-end dépliée : x 1004–1264 croise 170–1110 : sous l'outil
    expect(laneOf("side-end", { w: 260, h: 600 }, MID, c).y).toBe(144);
    // invariant : aucune case de la voie ne recouvre l'outil
    for (const w of [52, 260]) {
      const l = laneOf("side-start", { w, h: 600 }, MID, c);
      const h = Math.min(600, l.maxHeight!);
      const cross = l.x < tools.x + tools.w && l.x + w > tools.x && l.y < tools.y + tools.h && l.y + h > tools.y;
      expect(cross).toBe(false);
    }
  });
  it("T16 : laneOf side-* : îlots surplombants empilés (outils sur deux rangées), positions entières ; îlot posé plus bas que la voie : ne la repousse pas", () => {
    const c: Corners = { ...TOP, above: [{ x: 16, y: 80, w: 400, h: 56 }, { x: 16, y: 144, w: 400, h: 52.4 }] };
    const l = laneOf("side-start", { w: 260, h: 600 }, MID, c);
    expect(l.y).toBe(Math.ceil(144 + 52.4 + 8));
    expect(Number.isInteger(l.y) && Number.isInteger(l.maxHeight)).toBe(true);
    expect(laneOf("side-start", { w: 260, h: 600 }, MID, { ...TOP, above: [{ x: 16, y: 400, w: 300, h: 56 }] }).y).toBe(80);
  });
  it("personnalisation-1a : MOVABLE_ROLES = tools et pages", () => {
    expect([...MOVABLE_ROLES].sort()).toEqual(["pages", "tools"]);
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
  it("barre latérale d'OG4 à gauche, dépliée : panneau à sa droite, même haut, aucun recouvrement ; repliée : à droite de la colonne ; absente : contre le bord", () => {
    const tops = topRowBottom(BUTTON_PX.m);
    const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    // Voie latérale de début (`laneOf`), barre dépliée de 325 px puis repliée à une colonne d'onglets.
    for (const w of [325, BUTTON_PX.m + 8]) {
      const lane = laneOf("side-start", { w, h: 600 }, MID, { ...TOP, foot: 56 });
      const side = { x: lane.x, y: lane.y, w, h: 600 };
      const p = placeOptions(MID, side, tops);
      expect(p.y).toBe(tops + GAP);
      expect(p.x).toBe(side.x + side.w + GAP);
      expect(overlaps({ ...p, w: optionsWidth(BUTTON_PX.m), h: 500 }, side), `largeur ${w}`).toBe(false);
    }
    expect(placeOptions(MID, null, tops).x).toBe(EDGE);
  });
  it("îlot d'outils descendu qui surplombe le panneau (barre latérale dépliée) : panneau sous lui, aucun recouvrement ; hors de ses abscisses : inchangé", () => {
    const tops = topRowBottom(BUTTON_PX.m);
    const side = { x: 16, y: 80, w: 280, h: 600 };
    const tools = { x: 170, y: 80, w: 940, h: 56 };
    const w = optionsWidth(BUTTON_PX.m);
    const p = placeOptions(MID, side, tops, [tools], w);
    expect(p).toEqual({ x: 304, y: 80 + 56 + GAP });
    const hit = p.x < tools.x + tools.w && tools.x < p.x + w && p.y < tools.y + tools.h;
    expect(hit).toBe(false);
    expect(placeOptions(MID, null, tops, [{ x: 400, y: 16, w: 300, h: 56 }], w)).toEqual({ x: 16, y: tops + GAP });
  });
  it("rangée de contexte descendue sous l'îlot d'outils : haut du panneau >= bas de la rangée + GAP, même si seule la rangée croise ses abscisses", () => {
    const tops = topRowBottom(BUTTON_PX.m);
    const w = optionsWidth(BUTTON_PX.m);
    const tools = { x: 500, y: 16, w: 600, h: 56 }; // à droite du panneau (x 16 à 16 + w)
    const ctx = { x: 100, y: 80, w: 560, h: 56 }; // la rangée, décalée à gauche, croise le panneau
    const p = placeOptions(MID, null, tops, withContextRow(tools, ctx), w);
    expect(p.y).toBeGreaterThanOrEqual(ctx.y + ctx.h + GAP);
    expect(placeOptions(MID, null, tops, withContextRow(tools, null), w).y).toBe(tops + GAP);
    // rangée hors des abscisses du panneau : inchangé
    expect(placeOptions(MID, null, tops, withContextRow(tools, { x: 600, y: 80, w: 300, h: 56 }), w).y).toBe(tops + GAP);
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

describe("optionsWidth (T22)", () => {
  it("segments à largeur entière et icône (24) à x entier : 2 et 3 segments, trois tailles", async () => {
    const { optionsWidth } = await import("./island-place");
    for (const btn of [44, 48, 64]) {
      const inner = optionsWidth(btn) - 2 * 12 - 2 * 4;
      expect(inner).toBeGreaterThanOrEqual(5 * btn + 4 * 4 - 2 * 4);
      for (const n of [2, 3]) {
        expect(inner % n).toBe(0);
        expect(((inner / n) - 24) % 2).toBe(0);
      }
    }
    expect(optionsWidth(44)).toBe(260);
  });
});

describe("island-place : correctifs de relecture (T19)", () => {
  it("une ancre de coin lue sur une barre mobile se replie vers l'ancre centrée de sa rangée ; les autres rôles la gardent", () => {
    expect((["top-start", "top-end", "top-center", "bottom-start", "bottom-center", "side-start", "side-end"] as Anchor[]).map((a) => anchorOf(barOf("tools", a)))).toEqual([
      "top-center", "top-center", "top-center", "bottom-center", "bottom-center", "side-start", "side-end",
    ]);
    expect(anchorOf(barOf("pages", "top-end"))).toBe("top-center");
    expect(anchorOf(barOf("menu", "top-end"))).toBe("top-end");
    expect(anchorOf(barOf("history", "bottom-start"))).toBe("bottom-start");
  });

  it("sideCorners : l'îlot d'outils n'est jamais son propre surplomb ; deux passes de placement : position stable", () => {
    const base: Corners = { ...TOP, foot: 56 };
    const size = { w: 56, h: 300 };
    let at = laneOf("side-start", size, MID, sideCorners(base, "tools", null));
    for (let pass = 0; pass < 3; pass++) {
      const placed = { x: at.x, y: at.y, w: size.w, h: size.h };
      const next = laneOf("side-start", size, MID, sideCorners(base, "tools", placed));
      expect(next.y, `passe ${pass}`).toBe(at.y);
      at = next;
    }
    // un autre rôle (pages) passe encore sous l'îlot d'outils qui le surplombe
    const tools = { x: 170, y: 80, w: 940, h: 56 };
    expect(laneOf("side-start", { w: 260, h: 600 }, MID, sideCorners(base, "pages", tools)).y).toBe(144);
    expect(sideCorners(base, "pages", null).above).toEqual([]);
  });
});

describe("beyondObstacles (T22 : la rangée contextuelle ne passe pas sous une barre latérale)", () => {
  const side = { x: 16, y: 80, w: 325, h: 600 };
  it("rangée posée sous la barre latérale : décalée à son bord droit + écart", () => {
    expect(beyondObstacles(0, { top: 144, height: 56 }, [side], GAP)).toBe(16 + 325 + GAP);
  });
  it("sans recouvrement vertical, ou déjà à droite de la barre : inchangée", () => {
    expect(beyondObstacles(0, { top: 700, height: 56 }, [side], GAP)).toBe(0);
    expect(beyondObstacles(400, { top: 144, height: 56 }, [side], GAP)).toBe(400);
    expect(beyondObstacles(12, { top: 144, height: 56 }, [], GAP)).toBe(12);
  });
  it("plusieurs obstacles : le plus à droite gagne, seulement ceux qui recouvrent", () => {
    const other = { x: 400, y: 100, w: 50, h: 300 };
    expect(beyondObstacles(0, { top: 144, height: 56 }, [side, other], GAP)).toBe(450 + GAP);
  });
});

describe("placeLinkAvoiding (T33)", () => {
  const box = { x: 100, y: 200, w: 360, h: 112 };
  it("sans obstacle : inchangé", () => {
    expect(placeLinkAvoiding(box, [{ x: 600, y: 0, w: 100, h: 100 }], 1000)).toBe(100);
  });
  it("recouvre le panneau : décalé à 8 px à sa droite", () => {
    expect(placeLinkAvoiding(box, [{ x: 16, y: 112, w: 232, h: 600 }], 1000)).toBe(256);
  });
  it("décalé puis borné à la zone", () => {
    expect(placeLinkAvoiding(box, [{ x: 16, y: 112, w: 800, h: 600 }], 700)).toBe(700);
  });
  it("deux obstacles côte à côte : à droite du dernier", () => {
    expect(placeLinkAvoiding(box, [{ x: 16, y: 112, w: 232, h: 600 }, { x: 264, y: 150, w: 100, h: 300 }], 1000)).toBe(372);
  });
});
