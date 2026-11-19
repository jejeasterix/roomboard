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
});
