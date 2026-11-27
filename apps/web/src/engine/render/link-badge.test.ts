import { describe, expect, it } from "vitest";
import { inLinkBadge, LINK_MOUSE_PX, LINK_TOUCH_PX } from "./link-badge";

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
