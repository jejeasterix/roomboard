import { describe, expect, it } from "vitest";
import { isDoubleTap } from "./double-tap";

describe("isDoubleTap (OG12, 300 ms, 35 px)", () => {
  const a = { t: 1000, x: 100, y: 100 };
  it("sans toucher précédent : faux", () => expect(isDoubleTap(null, a)).toBe(false));
  it("250 ms et 20 px : vrai", () => expect(isDoubleTap(a, { t: 1250, x: 120, y: 100 })).toBe(true));
  it("350 ms : faux", () => expect(isDoubleTap(a, { t: 1350, x: 100, y: 100 })).toBe(false));
  it("40 px : faux", () => expect(isDoubleTap(a, { t: 1100, x: 140, y: 100 })).toBe(false));
  it("temps à rebours : faux", () => expect(isDoubleTap(a, { t: 900, x: 100, y: 100 })).toBe(false));
});
