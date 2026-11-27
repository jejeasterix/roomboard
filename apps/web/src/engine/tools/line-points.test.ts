import { describe, expect, it } from "vitest";
import type { BindHit, CoreDocument } from "../../core/api";
import { bindEnd, linkHandles, pickHandle, pickLink, pointHandles, worldPoints } from "./line-points";

const doc = (hit: BindHit | null): CoreDocument => ({ bindTarget: () => hit }) as unknown as CoreDocument;
const HIT: BindHit = { id: "b", fixed: [0, 0.3], onOutline: true, anchors: [[450, 0], [500, 25], [450, 50], [400, 25]] };

describe("line-points (OG12)", () => {
  it("worldPoints : départ, points intérieurs, fin, matrice appliquée", () => {
    const v = { id: "l", kind: "shape", transform: [1, 0, 0, 1, 10, 0], style: { color: "#000", width: 4 }, shape: { shape: "line", w: 100, h: 0, fill: null, points: [50, 20] } } as const;
    expect(worldPoints(v as never)).toEqual([[10, 0], [60, 20], [110, 0]]);
  });
  it("bindEnd : désactivé = libre ; ancre calée à moins de 16 px (24 au doigt)", () => {
    expect(bindEnd(doc(HIT), "p", 401, 30, 1, false, false).bind).toBeNull();
    expect(bindEnd(doc(HIT), "p", 401, 30, 1, false, true).bind).toEqual({ id: "b", fx: 0, fy: 0.5 });
    expect(bindEnd(doc(HIT), "p", 401, 60, 1, false, true).bind).toEqual({ id: "b", fx: 0, fy: 0.3 });
    expect(bindEnd(doc(HIT), "p", 401, 48, 1, true, true).bind).toEqual({ id: "b", fx: 0, fy: 0.5 });
    expect(bindEnd(doc(HIT), "p", 401, 30, 1, false, true, "b").bind).toBeNull();
    expect(bindEnd(doc(HIT), "p", 401, 30, 1, false, true).hint).toEqual({ id: "b", anchors: HIT.anchors });
  });
  it("pickHandle : points d'abord, milieux sous 40 px écran masqués, portée 22 px au doigt", () => {
    const pts: [number, number][] = [[0, 0], [100, 0], [130, 0]];
    expect(pickHandle(pts, 99, 1, 1, false, true)).toEqual({ kind: "point", index: 1 });
    expect(pickHandle(pts, 50, 0, 1, false, true)).toEqual({ kind: "mid", index: 0 });
    expect(pickHandle(pts, 115, 0, 1, false, true)).toBeNull();
    expect(pickHandle(pts, 18, 0, 1, true, false)).toEqual({ kind: "point", index: 0 });
    expect(pointHandles(pts, [1], 1, true).filter((h) => h.kind === "mid")).toHaveLength(1);
  });
  it("linkHandles : quatre « + » à 40 px écran des milieux du cadre ; pickLink à 22 px", () => {
    const h = linkHandles({ x0: 0, y0: 0, x1: 100, y1: 50 }, 2);
    expect(h).toEqual([
      { dir: "up", x: 50, y: -20 }, { dir: "right", x: 120, y: 25 }, { dir: "down", x: 50, y: 70 }, { dir: "left", x: -20, y: 25 },
    ]);
    expect(pickLink(h, 125, 25, 2)).toBe("right");
    expect(pickLink(h, 140, 25, 2)).toBeNull();
  });
});
