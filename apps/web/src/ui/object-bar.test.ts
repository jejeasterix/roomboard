import { describe, expect, it, vi } from "vitest";
import type { ToolbarHost } from "../app/toolbar-host";
import type { ToolbarView } from "./item-state";
import { OBJECT_ACTIONS, objectActionShown, playObjectAction } from "./object-bar";

const base: ToolbarView = { tool: "select", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1, selection: ["a"], selectionUnits: 1 };
const shown = (v: ToolbarView): string[] => OBJECT_ACTIONS.filter((a) => objectActionShown(a.id, v)).map((a) => a.id);

describe("actions de la barre d'objet (OG41, D19)", () => {
  it("ordre : principales puis « … » (Premier plan, Arrière-plan, Exporter la sélection)", () => {
    expect(OBJECT_ACTIONS.filter((a) => !a.more).map((a) => a.id)).toEqual(["duplicate", "copy", "paste", "group", "ungroup", "image", "delete"]);
    expect(OBJECT_ACTIONS.filter((a) => a.more).map((a) => a.label)).toEqual(["Premier plan", "Arrière-plan", "Exporter la sélection"]);
  });
  it("seuls les boutons utiles : Coller avec presse-papiers, Grouper dès deux unités, Dégrouper avec un groupe, Image seule", () => {
    expect(shown(base)).toEqual(["duplicate", "copy", "delete", "layer-front", "layer-back", "export"]);
    expect(shown({ ...base, canPaste: true })).toContain("paste");
    expect(shown({ ...base, selection: ["a", "b"], selectionUnits: 2 })).toContain("group");
    expect(shown({ ...base, selectionGrouped: true })).toContain("ungroup");
    expect(shown({ ...base, selectionImage: "a" })).toContain("image");
    expect(shown({ ...base, selection: [] })).toEqual([]);
  });
  it("routes : sélection, runAction des calques, panneau d'image", () => {
    const host = { selection: vi.fn(), runAction: vi.fn(), imagePanel: vi.fn() } as unknown as ToolbarHost;
    for (const a of OBJECT_ACTIONS) playObjectAction(a.id, host);
    expect((host.selection as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual(["duplicate", "copy", "paste", "group", "ungroup", "delete", "export"]);
    expect((host.runAction as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).toEqual(["layer-front", "layer-back"]);
    expect(host.imagePanel).toHaveBeenCalledTimes(1);
  });
});
