// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ElementView } from "../core/api";
import { createDeviceSettings } from "../device-settings";
import type { EngineState } from "../engine/engine";
import { DEFAULT_ITEM_STYLE } from "../engine/item-style";
import { builtinProfile } from "../toolbar-profiles";
import { OptionsPanel } from "./OptionsPanel";
import { LINK_NOT_SAVED } from "./LinkPopover";

afterEach(cleanup);

const el = { id: "e1", kind: "shape", style: { color: "#000", width: 4 }, look: { link: "https://example.org" }, shape: { shape: "rect", w: 10, h: 10, fill: null } } as unknown as ElementView;

function mount(setLink: () => boolean, openLink?: (url: string) => void, linkEditing: string | null = "e1") {
  const engine = {
    editLink: vi.fn(), setLink: vi.fn(setLink), closeLink: vi.fn(), camera: () => ({ zoom: 1, tx: 0, ty: 0 }), setItemStyle: vi.fn(), run: vi.fn(() => null) };
  const state = { tool: "select", selection: ["e1"], itemStyle: DEFAULT_ITEM_STYLE, textFormat: null, linkEditing, selectionBounds: null } as unknown as EngineState;
  const r = render(() => (
    <OptionsPanel
      engine={() => engine as never}
      state={() => state}
      element={() => el}
      presets={() => builtinProfile("defaut")!.presets}
      size={() => "s"}
      profileId={() => "p"}
      settings={createDeviceSettings(null)}
      annotating={() => false}
      sideStart={() => null}
      {...(openLink === undefined ? {} : { openLink })}
    />
  ));
  return { ...r, engine };
}

describe("OptionsPanel : éditeur de lien (T39)", () => {
  it("le cœur refuse le lien : le message de l'éditeur s'affiche, l'éditeur reste ouvert", () => {
    const m = mount(() => false);
    const input = m.container.querySelector<HTMLInputElement>("[data-link-popover] input")!;
    input.value = "https://autre.example";
    fireEvent.input(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(m.engine.setLink).toHaveBeenCalledWith("https://autre.example");
    expect(m.container.querySelector("[data-link-popover] [role=alert]")?.textContent).toBe(LINK_NOT_SAVED);
  });
  it("Ouvrir le lien : la prop openLink reçoit le lien de l'élément", () => {
    const open = vi.fn();
    const m = mount(() => true, open);
    fireEvent.click(m.container.querySelector("[data-link-open]")!);
    expect(open).toHaveBeenCalledWith("https://example.org");
  });
  it("le bouton Lien du panneau ouvre l'éditeur (T41)", () => {
    const m = mount(() => true, undefined, null);
    fireEvent.click(m.container.querySelector('[data-option-value="link"]')!);
    expect(m.engine.editLink).toHaveBeenCalledTimes(1);
  });
});
