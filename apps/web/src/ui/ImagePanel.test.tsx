// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageData, ImageParams } from "../core/api";
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
    pickPoint: vi.fn(async () => (pick === null ? null : { color: pick, x: 3, y: 4 })),
    startCrop: vi.fn(() => (mode = "crop")),
    finishCrop: vi.fn(() => ((mode = "idle"), true)),
    geometry: vi.fn((_p: ImageParams) => true),
    commit: vi.fn(() => true),
    restore: vi.fn(() => true),
    mode: () => mode,
    keepsDraft: vi.fn((_v: number) => false),
    close: vi.fn(),
  } satisfies ImageEdit;
  return edit;
}
function setup(initial: ImageData = { asset: A, w: 200, h: 150 }, edit = fakeEdit(), start?: "crop" | "background") {
  const [image, setImage] = createSignal<ImageData | null>(initial);
  const [version, setVersion] = createSignal(0);
  const [tick, setTick] = createSignal(0);
  const close = vi.fn();
  const r = render(() => <ImagePanel image={image} version={() => (tick(), version())} tick={tick} edit={edit} close={close} start={start} />);
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
    expect(d).toEqual({ brightness: 0, contrast: -5, color: "#000000", tolerance: 3, soft: 4, contiguous: false, seed: null, mode: "global" });
    expect(pixelParams({ ...d, color: null })).toEqual({ contrast: -5 });
  });
  it("mode Depuis le point touché : la pipette pose couleur et départ, Valider écrit x et y", async () => {
    const { act, edit, q } = setup();
    fireEvent.change(q('[data-image-input="mode"]'), { target: { value: "seed" } });
    act("pick");
    await vi.waitFor(() => expect(edit.pickPoint).toHaveBeenCalled());
    await vi.waitFor(() => expect(edit.preview).toHaveBeenLastCalledWith({ transparent: { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true, x: 3, y: 4 } }));
    act("apply");
    expect(edit.commit).toHaveBeenCalledWith({ transparent: { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true, x: 3, y: 4 } });
    expect(Array.from(q('[data-image-input="mode"]').querySelectorAll("option")).map((o) => (o as HTMLOptionElement).value)).toEqual(["seed", "contiguous", "global"]);
  });
  it("start crop ouvre le rognage", () => {
    const { edit } = setup(undefined, fakeEdit(), "crop");
    expect(edit.startCrop).toHaveBeenCalledTimes(1);
  });
  it("start background arme la pipette", async () => {
    const { edit, q } = setup(undefined, fakeEdit(), "background");
    expect((q('[data-image-input="mode"]') as HTMLSelectElement).value).toBe("seed");
    await vi.waitFor(() => expect(edit.pickPoint).toHaveBeenCalledTimes(1));
    expect(edit.startCrop).not.toHaveBeenCalled();
  });
});

/** Faux moteur à pipette armable : `tap` résout le toucher en cours ; pickPoint sur une pipette armée la désarme (null). */
function armable() {
  let resolve: ((r: { color: string; x: number; y: number } | null) => void) | null = null;
  const edit = {
    ...fakeEdit(),
    pickPoint: vi.fn(() => {
      if (resolve !== null) {
        const r = resolve;
        resolve = null;
        r(null);
        return Promise.resolve(null);
      }
      return new Promise<{ color: string; x: number; y: number } | null>((res) => (resolve = res));
    }),
    mode: () => (resolve !== null ? ("pick" as const) : ("idle" as const)),
  };
  const tap = async (color: string, x: number, y: number): Promise<void> => {
    const r = resolve;
    resolve = null;
    r?.({ color, x, y });
    await Promise.resolve();
    await Promise.resolve();
  };
  return { edit, tap, armed: () => resolve !== null };
}

describe("panneau de retouche : pipette du mode point touché (OG23, T18)", () => {
  it("point touché : la pipette reste armée, chaque toucher pose le nouveau départ", async () => {
    const a = armable();
    const { act, edit, q } = setup(undefined, a.edit as unknown as ReturnType<typeof fakeEdit>);
    fireEvent.change(q('[data-image-input="mode"]'), { target: { value: "seed" } });
    act("pick");
    await a.tap("#111111", 1, 2);
    expect(a.armed()).toBe(true);
    await a.tap("#222222", 7, 8);
    expect(a.armed()).toBe(true);
    expect(edit.preview).toHaveBeenLastCalledWith({ transparent: { color: "#222222", tolerance: 10, soft: 0, contiguous: true, x: 7, y: 8 } });
  });
  it("T21 : toucher, aperçu, nouvel état du moteur à version inchangée, second toucher : mode et pipette tiennent", async () => {
    const a = armable();
    const { act, edit, q, setTick } = setup(undefined, a.edit as unknown as ReturnType<typeof fakeEdit>);
    fireEvent.change(q('[data-image-input="mode"]'), { target: { value: "seed" } });
    act("pick");
    await a.tap("#111111", 1, 2);
    setTick(1); // le moteur publie un état (pickPoint, aperçu) : la version du document n'a pas bougé
    await Promise.resolve();
    expect((q('[data-image-input="mode"]') as HTMLSelectElement).value).toBe("seed");
    expect(a.armed()).toBe(true);
    await a.tap("#222222", 7, 8);
    expect(a.armed()).toBe(true);
    expect(edit.preview).toHaveBeenLastCalledWith({ transparent: { color: "#222222", tolerance: 10, soft: 0, contiguous: true, x: 7, y: 8 } });
  });
  it("hors point touché : un toucher désarme la pipette", async () => {
    const a = armable();
    const { act, q } = setup(undefined, a.edit as unknown as ReturnType<typeof fakeEdit>);
    fireEvent.change(q('[data-image-input="mode"]'), { target: { value: "contiguous" } });
    act("pick");
    await a.tap("#111111", 1, 2);
    expect(a.armed()).toBe(false);
  });
  it("Valider, Annuler les réglages et changement de mode désarment la pipette", async () => {
    for (const end of ["apply", "cancel", "mode"]) {
      const a = armable();
      const { act, q, unmount } = setup(undefined, a.edit as unknown as ReturnType<typeof fakeEdit>);
      fireEvent.change(q('[data-image-input="mode"]'), { target: { value: "seed" } });
      act("pick");
      await a.tap("#111111", 1, 2);
      expect(a.armed(), end).toBe(true);
      if (end === "mode") fireEvent.change(q('[data-image-input="mode"]'), { target: { value: "global" } });
      else act(end);
      await Promise.resolve();
      expect(a.armed(), end).toBe(false);
      unmount();
    }
  });
  it("le mode vit dans le brouillon : annuler/rétablir le resynchronise", () => {
    const { q, setVersion, setImage } = setup({ asset: A, w: 200, h: 150, transparent: { color: "#000000", tolerance: 10, soft: 0, contiguous: true, x: 3, y: 4 } });
    const mode = () => (q('[data-image-input="mode"]') as HTMLSelectElement).value;
    expect(mode()).toBe("seed");
    setImage({ asset: A, w: 200, h: 150, transparent: { color: "#000000", tolerance: 10, soft: 0, contiguous: true } });
    setVersion(1);
    expect(mode()).toBe("contiguous");
    setImage({ asset: A, w: 200, h: 150, transparent: { color: "#000000", tolerance: 10, soft: 0, contiguous: false } });
    setVersion(2);
    expect(mode()).toBe("global");
    setImage({ asset: A, w: 200, h: 150, transparent: { color: "#000000", tolerance: 10, soft: 0, contiguous: true, x: 5, y: 6 } });
    setVersion(3);
    expect(mode()).toBe("seed");
  });
  it("après annulation vers un état sans départ, Valider n'écrit plus x et y", async () => {
    const { q, setVersion, setImage, act, edit } = setup({ asset: A, w: 200, h: 150, transparent: { color: "#000000", tolerance: 10, soft: 0, contiguous: true, x: 3, y: 4 } });
    setImage({ asset: A, w: 200, h: 150, transparent: { color: "#000000", tolerance: 10, soft: 0, contiguous: true } });
    setVersion(1);
    expect((q('[data-image-input="mode"]') as HTMLSelectElement).value).toBe("contiguous");
    act("apply");
    expect(edit.commit).toHaveBeenLastCalledWith({ transparent: { color: "#000000", tolerance: 10, soft: 0, contiguous: true } });
  });
});

describe("panneau de retouche (OG34) : design des îlots", () => {
  const icon = (el: Element | null): string | null => el?.querySelector("svg[data-icon]")?.getAttribute("data-icon") ?? null;
  it("îlot à en-tête : titre et Fermer (icône close) ; plus de classe rb-editor", () => {
    const { q } = setup();
    const root = q("#image-retouche");
    expect(root.classList.contains("rb-imgedit")).toBe(true);
    expect(root.classList.contains("rb-editor")).toBe(false);
    expect(q(".rb-imgedit-head h2").textContent).toBe("Retouche de l'image");
    expect(icon(q('[data-image-action="close"]'))).toBe("close");
  });
  it("géométrie : cinq boutons à icône Lucide, libellé lisible par les lecteurs d'écran", () => {
    const { q } = setup();
    const ids = ["crop", "flip-h", "flip-v", "turn-left", "turn-right"];
    expect(ids.map((id) => icon(q(`[data-image-action="${id}"]`)))).toEqual(["crop", "flip-horizontal", "flip-vertical", "rotate-ccw-square", "rotate-cw-square"]);
    expect(ids.map((id) => q(`[data-image-action="${id}"]`).getAttribute("aria-label"))).toEqual(["Rogner", "Retourner horizontalement", "Retourner verticalement", "Tourner à gauche", "Tourner à droite"]);
  });
  it("rognage : Valider le rognage (check) et Annuler (close), libellés visibles", () => {
    const { q, act, setTick } = setup();
    act("crop");
    setTick(1);
    expect([icon(q('[data-image-action="crop-apply"]')), q('[data-image-action="crop-apply"]').textContent]).toEqual(["check", "Valider le rognage"]);
    expect([icon(q('[data-image-action="crop-cancel"]')), q('[data-image-action="crop-cancel"]').textContent]).toEqual(["close", "Annuler"]);
  });
  it("curseurs : icône, libellé et valeur lue ; la valeur suit le brouillon", () => {
    const { q, input } = setup({ asset: A, w: 200, h: 150, brightness: 20 });
    const row = (k: string) => q(`[data-image-input="${k}"]`).closest(".rb-imgedit-range")!;
    expect(icon(row("brightness"))).toBe("sun");
    expect(icon(row("contrast"))).toBe("contrast");
    expect(row("brightness").querySelector("output")!.textContent).toBe("20");
    input("brightness", "-35");
    expect(row("brightness").querySelector("output")!.textContent).toBe("-35");
    expect(row("tolerance").querySelector("output")!.textContent).toBe("10");
  });
  it("pipette : bouton large à icône pipette ; pastille en damier sans couleur", () => {
    const { q } = setup();
    expect([icon(q('[data-image-action="pick"]')), q('[data-image-action="pick"]').textContent]).toEqual(["pipette", "Pipette"]);
    expect(q("[data-image-color]").hasAttribute("data-empty")).toBe(true);
  });
  it("pied : Valider (check), Annuler les réglages (undo), Rétablir l'original (rotate-ccw)", () => {
    const { q } = setup();
    expect(["apply", "cancel", "restore"].map((id) => icon(q(`[data-image-action="${id}"]`)))).toEqual(["check", "undo", "rotate-ccw"]);
  });
  it("raccourcis : I arme la pipette, Ctrl+Entrée valide ; en rognage Ctrl+Entrée valide le rognage", async () => {
    const { q, edit, setTick } = setup();
    const root = q("#image-retouche");
    fireEvent.keyDown(root, { key: "i" });
    expect(edit.pickPoint).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    fireEvent.keyDown(root, { key: "Enter", ctrlKey: true });
    expect(edit.commit).toHaveBeenCalledTimes(1);
    fireEvent.click(q('[data-image-action="crop"]'));
    setTick(1);
    fireEvent.keyDown(root, { key: "Enter", ctrlKey: true });
    expect(edit.finishCrop).toHaveBeenCalledWith(true);
  });
  it("raccourcis : une lettre tapée dans la liste Départ n'arme rien", () => {
    const { q, edit } = setup();
    fireEvent.keyDown(q('[data-image-input="mode"]'), { key: "i" });
    expect(edit.pickPoint).not.toHaveBeenCalled();
  });
});
