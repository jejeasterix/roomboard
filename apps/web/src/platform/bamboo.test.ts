import { describe, expect, it } from "vitest";
import { FLIPCHART_LATER_MESSAGE, hasBambooMagic } from "./bamboo";

describe("bamboo (C13 lot 2)", () => {
  it("C13 N4 : hasBambooMagic", () => {
    expect(hasBambooMagic(new Uint8Array([0x20, 0x42, 0x61, 0x6d, 0x62, 0x6f, 0x6f, 0x20, 1, 2]))).toBe(true);
    expect(hasBambooMagic(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0, 0, 0]))).toBe(false);
    expect(hasBambooMagic(new Uint8Array([0x20, 0x42, 0x61, 0x6d, 0x62, 0x6f, 0x6f]))).toBe(false);
  });
  it("C13 : message du palier bas", () => {
    expect(FLIPCHART_LATER_MESSAGE).toContain(".iwb ou PDF");
  });
});
