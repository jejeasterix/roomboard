import { describe, expect, it } from "vitest";
import { EMPTY_OVERLAY, isEmptyOverlay, mergeOverlays, overlayKey } from "./overlay";

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

describe("OG33 lot 2b : poignée de rotation", () => {
  it("mergeOverlays garde rotate et noResize s'ils sont dans une part, les omet sinon", () => {
    const a = { ...EMPTY_OVERLAY, handles: true, rotate: true, noResize: true };
    const m = mergeOverlays([a, { ...EMPTY_OVERLAY }]);
    expect(m.rotate).toBe(true);
    expect(m.noResize).toBe(true);
    const n = mergeOverlays([{ ...EMPTY_OVERLAY, handles: true }, { ...EMPTY_OVERLAY }]);
    expect("rotate" in n).toBe(false);
    expect("noResize" in n).toBe(false);
  });
});
