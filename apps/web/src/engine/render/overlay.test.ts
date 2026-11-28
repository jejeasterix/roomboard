import { describe, expect, it } from "vitest";
import { IDENTITY } from "../camera";
import { copyBadgeBox, linkBadgeBox } from "./link-badge";
import { EMPTY_OVERLAY, isEmptyOverlay, mergeOverlays, overlayKey, overlayKeepOut } from "./overlay";

describe("calque d'édition", () => {
  it("mergeOverlays : rien → EMPTY_OVERLAY ; un seul → lui-même", () => {
    expect(mergeOverlays([undefined, undefined])).toBe(EMPTY_OVERLAY);
    const one = { ...EMPTY_OVERLAY, handles: true, frame: { x0: 0, y0: 0, x1: 1, y1: 1 } };
    expect(mergeOverlays([undefined, one])).toBe(one);
  });

  it("mergeOverlays : fantômes et formes concaténés, premier cadre et premier rectangle gardés", () => {
    const style = { color: "#000000", width: 4 };
    const a = { ...EMPTY_OVERLAY, ghosts: [{ id: "a", matrix: [1, 0, 0, 1, 5, 0] as const }] };
    const b = {
      ...EMPTY_OVERLAY,
      shapes: [{ shape: "rect" as const, x0: 0, y0: 0, x1: 10, y1: 10, style, fill: null }],
      band: { x0: 1, y0: 1, x1: 2, y1: 2 },
    };
    const m = mergeOverlays([a, b]);
    expect(m.ghosts.map((g) => g.id)).toEqual(["a"]);
    expect(m.shapes).toHaveLength(1);
    expect(m.band).toEqual({ x0: 1, y0: 1, x1: 2, y1: 2 });
    expect(m.frame).toBeNull();
  });

  it("overlayKey change quand le calque change ; isEmptyOverlay", () => {
    expect(overlayKey(EMPTY_OVERLAY)).toBe(overlayKey({ ...EMPTY_OVERLAY }));
    expect(overlayKey({ ...EMPTY_OVERLAY, handles: true })).not.toBe(overlayKey(EMPTY_OVERLAY));
    expect(isEmptyOverlay(EMPTY_OVERLAY)).toBe(true);
    expect(isEmptyOverlay({ ...EMPTY_OVERLAY, band: { x0: 0, y0: 0, x1: 1, y1: 1 } })).toBe(false);
  });
  it("OG12 : mergeOverlays concatène points et links, garde le premier bind ; clé du vide inchangée", () => {
    expect(overlayKey(EMPTY_OVERLAY)).toBe('{"ghosts":[],"shapes":[],"frame":null,"handles":false,"band":null}');
    const a = { ...EMPTY_OVERLAY, points: [{ x: 1, y: 1, kind: "point" as const, selected: false }], bind: { id: "a", anchors: [] }, links: [{ dir: "up" as const, x: 0, y: 0 }] };
    const b = { ...EMPTY_OVERLAY, points: [{ x: 2, y: 2, kind: "mid" as const, selected: true }], bind: { id: "b", anchors: [] }, links: [{ dir: "down" as const, x: 1, y: 1 }] };
    const m = mergeOverlays([a, b]);
    expect(m.points).toHaveLength(2);
    expect(m.links).toHaveLength(2);
    expect(m.bind?.id).toBe("a");
    expect(isEmptyOverlay(a)).toBe(false);
    expect(isEmptyOverlay(EMPTY_OVERLAY)).toBe(true);
  });
});

describe("overlayKeepOut (OG41, DA2)", () => {
  const frame = { x0: 100, y0: 200, x1: 300, y1: 300 };
  const sq = (x: number, y: number, half: number) => ({ x: x - half, y: y - half, w: 2 * half, h: 2 * half });
  it("overlayKeepOut : sans cadre, rien", () => {
    expect(overlayKeepOut(EMPTY_OVERLAY, IDENTITY, true)).toEqual([]);
  });
  it("overlayKeepOut : huit poignées, carrés de 24 px (prise de 12 px) centrés sur les coins et les milieux", () => {
    const r = overlayKeepOut({ ...EMPTY_OVERLAY, frame, handles: true }, IDENTITY, false);
    expect(r).toHaveLength(8);
    expect(r).toContainEqual(sq(100, 200, 12));
    expect(r).toContainEqual(sq(200, 300, 12));
  });
  it("overlayKeepOut : pendant un glisser (handles faux), ni poignées ni « Déplacer »", () => {
    expect(overlayKeepOut({ ...EMPTY_OVERLAY, frame, handles: false, move: true }, IDENTITY, true)).toEqual([]);
  });
  it("overlayKeepOut : « Déplacer » 28 px au-dessus du milieu haut, 22 px au doigt, 12 px à la souris", () => {
    const o = { ...EMPTY_OVERLAY, frame, handles: true, move: true };
    expect(overlayKeepOut(o, IDENTITY, true)).toContainEqual(sq(200, 172, 22));
    expect(overlayKeepOut(o, IDENTITY, false)).toContainEqual(sq(200, 172, 12));
  });
  it("overlayKeepOut : ligne seule (sans cadre) : ses points d'extrémité, 22 px au doigt, 12 à la souris", () => {
    const o = { ...EMPTY_OVERLAY, points: [{ x: 100, y: 100, kind: "point" as const, selected: false }, { x: 300, y: 100, kind: "point" as const, selected: false }] };
    expect(overlayKeepOut(o, IDENTITY, true)).toEqual([sq(100, 100, 22), sq(300, 100, 22)]);
    expect(overlayKeepOut(o, IDENTITY, false)).toEqual([sq(100, 100, 12), sq(300, 100, 12)]);
  });
  it("overlayKeepOut : poignées « + », prise de 22 px", () => {
    const r = overlayKeepOut({ ...EMPTY_OVERLAY, frame, handles: true, links: [{ dir: "up", x: 200, y: 160 }] }, IDENTITY, true);
    expect(r).toContainEqual(sq(200, 160, 22));
  });
  it("overlayKeepOut : badges de lien et de copie, cible de 44 px au doigt, 24 à la souris", () => {
    const o = { ...EMPTY_OVERLAY, frame, handles: true };
    const lb = linkBadgeBox(frame, IDENTITY);
    const cb = copyBadgeBox(frame, IDENTITY);
    const touch = overlayKeepOut(o, IDENTITY, true, [{ bounds: frame, link: true, copy: true }]);
    expect(touch).toContainEqual(sq(lb.x + lb.size / 2, lb.y + lb.size / 2, 22));
    expect(touch).toContainEqual(sq(cb.x + cb.size / 2, cb.y + cb.size / 2, 22));
    const mouse = overlayKeepOut(o, IDENTITY, false, [{ bounds: frame, link: true, copy: false }]);
    expect(mouse).toContainEqual(sq(lb.x + lb.size / 2, lb.y + lb.size / 2, 12));
    expect(mouse).toHaveLength(9);
  });
});
