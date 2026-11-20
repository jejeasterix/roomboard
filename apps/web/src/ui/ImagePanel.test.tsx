// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageData } from "../core/api";
import type { ImageEdit } from "../engine/tools/image-edit";
import { draftOf, ImagePanel, pixelParams } from "./ImagePanel";

afterEach(cleanup);
const A = "ab".repeat(32);
function fakeEdit(pick: string | null = "#ffffff") {
  let mode: "idle" | "crop" | "pick" = "idle";
  const edit = {
    id: "i",
    preview: vi.fn(),
    pick: vi.fn(async () => pick),
    startCrop: vi.fn(() => (mode = "crop")),
    finishCrop: vi.fn(() => ((mode = "idle"), true)),
    geometry: vi.fn(() => true),
    commit: vi.fn(() => true),
    restore: vi.fn(() => true),
    mode: () => mode,
    keepsDraft: vi.fn((_v: number) => false),
    close: vi.fn(),
  } satisfies ImageEdit;
  return edit;
}
function setup(initial: ImageData = { asset: A, w: 200, h: 150 }, edit = fakeEdit()) {
  const [image, setImage] = createSignal<ImageData | null>(initial);
  const [version, setVersion] = createSignal(0);
  const [tick, setTick] = createSignal(0);
  const close = vi.fn();
  const r = render(() => <ImagePanel image={image} version={version} tick={tick} edit={edit} close={close} />);
  const q = (sel: string) => r.container.querySelector<HTMLElement>(sel)!;
  const act = (id: string) => fireEvent.click(q(`[data-image-action="${id}"]`));
  const input = (id: string, v: string) => {
    const el = q(`[data-image-input="${id}"]`) as HTMLInputElement;
    el.value = v;
    fireEvent.input(el);
  };
  return { ...r, edit, close, setImage, setVersion, setTick, q, act, input };
}

describe("panneau de retouche (I25-I27, I31)", () => {
  it("Retourner ↔ et ↕ : geometry(flipShown(document, …)) ; une image tournée bascule l'autre axe", () => {
    const { act, edit } = setup({ asset: A, w: 200, h: 150, quarterTurns: 1 });
    act("flip-h");
    act("flip-v");
    expect(edit.geometry.mock.calls.map((c) => c[0])).toEqual([{ flipY: true, quarterTurns: 1 }, { flipX: true, quarterTurns: 1 }]);
  });
  it("Tourner ⟲ et ⟳ : geometry(turnShown(document, ∓1))", () => {
    const { act, edit } = setup();
    act("turn-left");
    act("turn-right");
    expect(edit.geometry.mock.calls.map((c) => c[0])).toEqual([{ quarterTurns: 3 }, { quarterTurns: 1 }]);
  });
  it("Luminosité : aperçu du brouillon, rien d'écrit ; Valider : commit des pixels", () => {
    const { input, act, edit } = setup();
    input("brightness", "50");
    expect(edit.preview).toHaveBeenLastCalledWith({ brightness: 50 });
    expect(edit.commit).not.toHaveBeenCalled();
    act("apply");
    expect(edit.commit).toHaveBeenCalledWith({ brightness: 50 });
  });
  it("Pipette : la couleur piquée entre au brouillon (tolérance 10, plume 0, contigu) et à l'aperçu", async () => {
    const { act, edit, q } = setup();
    act("pick");
    await vi.waitFor(() => expect(edit.preview).toHaveBeenLastCalledWith({ transparent: { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true } }));
    expect(q("[data-image-color]").getAttribute("data-image-color")).toBe("#ffffff");
    fireEvent.change(q('[data-image-input="mode"]'), { target: { value: "global" } });
    expect(edit.preview).toHaveBeenLastCalledWith({ transparent: { color: "#ffffff", tolerance: 10, soft: 0, contiguous: false } });
  });
  it("écriture géométrique de la séance : brouillon gardé ; autre écriture : brouillon repris du document", () => {
    const { input, edit, setVersion, setImage, q } = setup();
    input("brightness", "50");
    edit.keepsDraft.mockReturnValueOnce(true);
    setVersion(1);
    expect((q('[data-image-input="brightness"]') as HTMLInputElement).value).toBe("50");
    setImage({ asset: A, w: 200, h: 150, brightness: 20 });
    setVersion(2);
    expect((q('[data-image-input="brightness"]') as HTMLInputElement).value).toBe("20");
  });
  it("Annuler les réglages : brouillon du document, aperçu retiré, aucune écriture", () => {
    const { input, act, edit, q } = setup();
    input("contrast", "30");
    act("cancel");
    expect(edit.preview).toHaveBeenLastCalledWith(null);
    expect((q('[data-image-input="contrast"]') as HTMLInputElement).value).toBe("0");
    expect(edit.commit).not.toHaveBeenCalled();
  });
  it("Rogner : startCrop ; en mode rognage, Valider le rognage et Annuler", () => {
    const { act, edit, setTick, q } = setup();
    act("crop");
    expect(edit.startCrop).toHaveBeenCalled();
    setTick(1);
    expect(q('[data-image-action="flip-h"]')).toBeNull();
    act("crop-apply");
    expect(edit.finishCrop).toHaveBeenCalledWith(true);
    setTick(2);
    expect(q('[data-image-action="flip-h"]')).not.toBeNull();
  });
  it("Rétablir l'original : restore() ; Fermer : close()", () => {
    const { act, edit, close } = setup();
    act("restore");
    act("close");
    expect([edit.restore.mock.calls.length, close.mock.calls.length]).toEqual([1, 1]);
  });
  it("démontage : edit.close() ; draftOf et pixelParams", () => {
    const { unmount, edit } = setup();
    unmount();
    expect(edit.close).toHaveBeenCalledTimes(1);
    const d = draftOf({ asset: A, w: 1, h: 1, contrast: -5, transparent: { color: "#000000", tolerance: 3, soft: 4, contiguous: false } });
    expect(d).toEqual({ brightness: 0, contrast: -5, color: "#000000", tolerance: 3, soft: 4, contiguous: false });
    expect(pixelParams({ ...d, color: null })).toEqual({ contrast: -5 });
  });
});
