import { describe, expect, it } from "vitest";
import { copyBadgeBox, inLinkBadge, LINK_MOUSE_PX, LINK_TOUCH_PX } from "./link-badge";

describe("inLinkBadge (T37)", () => {
  const badge = { x: 100, y: 100, size: 16 };
  const cx = 108;
  const cy = 108;
  it("la souris vise 24 px, le doigt et le stylet 44 px", () => {
    expect(LINK_MOUSE_PX).toBe(24);
    expect(LINK_TOUCH_PX).toBe(44);
    // 18 px du centre : hors de la zone souris (12), dans celle du doigt (22).
    expect(inLinkBadge(badge, cx + 18, cy, "mouse")).toBe(false);
    expect(inLinkBadge(badge, cx + 18, cy, "touch")).toBe(true);
    expect(inLinkBadge(badge, cx + 18, cy, "pen")).toBe(true);
    expect(inLinkBadge(badge, cx + 18, cy)).toBe(true);
  });
  it("bords inclus : 12 px à la souris, 22 px au doigt", () => {
    expect(inLinkBadge(badge, cx + 12, cy + 12, "mouse")).toBe(true);
    expect(inLinkBadge(badge, cx + 12.5, cy, "mouse")).toBe(false);
    expect(inLinkBadge(badge, cx, cy - 22, "touch")).toBe(true);
    expect(inLinkBadge(badge, cx, cy - 22.5, "touch")).toBe(false);
  });
});

describe("copyBadgeBox (OG23, T11)", () => {
  it("copyBadgeBox au pixel : rond de 18 px, coin bas-droit à 6 px du coin haut gauche, multiples de 0,5 à dpr 2", () => {
    const b = copyBadgeBox({ x0: 10.3, y0: 20.1, x1: 50, y1: 60 }, { zoom: 1.37, tx: 3.3, ty: 1.1 }, 2);
    expect(b.size).toBe(18);
    expect((b.x * 2) % 1).toBe(0);
    expect((b.y * 2) % 1).toBe(0);
    const plain = copyBadgeBox({ x0: 100, y0: 100, x1: 150, y1: 150 }, { zoom: 1, tx: 0, ty: 0 });
    expect(plain).toEqual({ x: 100 - 6 - 18, y: 100 - 6 - 18, size: 18 });
  });
});
