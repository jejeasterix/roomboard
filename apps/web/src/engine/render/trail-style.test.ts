import { describe, expect, it } from "vitest";
import { trailStyleFor, type TrailRole } from "./trail-style";

const ev = (pointerId: number) => ({ pointerId, pointerType: "pen", buttons: 1 });

describe("trailStyleFor (câblage styleFor vers roleOf)", () => {
  it("interroge le routeur avec le pointerId de l'événement ; seul « ink » donne un style, au zoom courant", () => {
    const roles = new Map<number, TrailRole>([[7, "ink"], [8, "erase"], [9, "view"]]);
    const asked: number[] = [];
    let zoom = 2;
    const f = trailStyleFor((id) => (asked.push(id), roles.get(id) ?? null), { color: "#000000", width: 4 }, () => zoom);
    expect(f(ev(7))).toEqual({ color: "#000000", diameter: 8 });
    zoom = 0.5;
    expect(f(ev(7))).toEqual({ color: "#000000", diameter: 2 });
    expect(f(ev(8))).toBeNull();
    expect(f(ev(9))).toBeNull();
    expect(f(ev(99))).toBeNull();
    expect(asked).toEqual([7, 7, 8, 9, 99]);
  });
});
