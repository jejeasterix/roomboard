// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSettingsStore, DEFAULT_SETTINGS, SETTING_KEYS, type EffectiveEchelons } from "../engine/settings";
import type { RendererDiagnostics } from "../engine/render/select";
import { RELOAD_DIRTY_MESSAGE, SettingsPanel } from "./SettingsPanel";

afterEach(cleanup);

const flush = () => new Promise<void>((r) => setTimeout(r, 0));
const EFF: EffectiveEchelons = { prediction: false, inkTrail: "off", webgl: "off" };
const DIAG: RendererDiagnostics = { webgl: "on", lost: false, badColors: [] };

function setup(over: { dirty?: boolean; answer?: boolean; diag?: RendererDiagnostics; notes?: string[] } = {}) {
  const store = createSettingsStore(DEFAULT_SETTINGS);
  const navigate = vi.fn();
  const confirm = vi.fn(async (_m: string) => over.answer ?? true);
  const [diag, setDiag] = createSignal(over.diag ?? DIAG);
  const r = render(() => (
    <SettingsPanel
      store={store}
      effective={() => EFF}
      notes={over.notes ?? []}
      diagnostics={diag}
      search={() => "?banc"}
      navigate={navigate}
      anyDirty={() => over.dirty ?? false}
      confirm={confirm}
    />
  ));
  const btn = (k: string) => r.container.querySelector<HTMLButtonElement>(`button[data-reglage=${k}]`)!;
  return { store, navigate, confirm, setDiag, r, btn };
}

describe("SettingsPanel (T92)", () => {
  it("groupe étiqueté avec un bouton par réglage", () => {
    const { r, btn } = setup();
    const g = r.container.querySelector("#reglages");
    expect(g?.getAttribute("role")).toBe("group");
    expect(g?.getAttribute("aria-label")).toBe("Réglages du moteur");
    for (const k of SETTING_KEYS) expect(btn(k)).toBeTruthy();
    expect(btn("finger").textContent).toBe("Doigt : vue");
    expect(btn("webgl").textContent).toBe("É4 WebGL2 : éteint");
  });

  it("réglage à chaud : un clic change le magasin et le libellé", () => {
    const { store, btn, navigate } = setup();
    fireEvent.click(btn("palm"));
    expect(store.get().palm).toBe("lenient");
    expect(btn("palm").textContent).toBe("Paume : souple");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("prédiction : cycle auto, on, off", () => {
    const { store, btn } = setup();
    fireEvent.click(btn("prediction"));
    expect(store.get().prediction).toBe("on");
    fireEvent.click(btn("prediction"));
    expect(store.get().prediction).toBe("off");
  });

  it("titre de rechargement sur É3 et É4 seulement", () => {
    const { btn } = setup();
    expect(btn("webgl").title).toBe("Recharge la page : le dessin en cours est perdu");
    expect(btn("inkTrail").title).toBe("Recharge la page : le dessin en cours est perdu");
    expect(btn("palm").title).toBe("");
  });

  it("échelon 4 : recharge avec l'adresse quand rien n'est modifié", async () => {
    const { btn, navigate, confirm } = setup();
    fireEvent.click(btn("webgl"));
    await flush();
    expect(confirm).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("?banc&echelons=4:on");
  });

  it("échelon 4 : question si un onglet est modifié", async () => {
    const { btn, navigate, confirm } = setup({ dirty: true, answer: true });
    fireEvent.click(btn("webgl"));
    await flush();
    expect(confirm).toHaveBeenCalledWith(RELOAD_DIRTY_MESSAGE);
    expect(navigate).toHaveBeenCalledWith("?banc&echelons=4:on");
  });

  it("échelon 4 : refus de la question, aucun rechargement", async () => {
    const { btn, navigate, confirm } = setup({ dirty: true, answer: false });
    fireEvent.click(btn("webgl"));
    await flush();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("échelon 3 : même question quand un onglet est modifié", async () => {
    const { btn, navigate, confirm } = setup({ dirty: true, answer: false });
    fireEvent.click(btn("inkTrail"));
    await flush();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("notes du démarrage affichées", () => {
    const { r } = setup({ notes: ["a", "b"] });
    expect(r.container.querySelector("#echelons-notes")?.textContent).toBe("a · b");
  });

  it("diagnostic WebGL2 : actif, coupé, repli", () => {
    const { r, setDiag } = setup();
    const p = () => r.container.querySelector("#webgl-diagnostic")?.textContent;
    expect(p()).toBe("WebGL2 : actif");
    setDiag({ webgl: "off", lost: false, badColors: [] });
    expect(p()).toBe("WebGL2 : coupé");
    setDiag({ webgl: "repli", lost: false, badColors: [] });
    expect(p()).toBe("WebGL2 : repli Canvas 2D");
  });

  it("contexte perdu affiché", () => {
    const { r } = setup({ diag: { webgl: "on", lost: true, badColors: [] } });
    expect(r.container.querySelector("#webgl-diagnostic")?.textContent).toContain("contexte perdu");
  });

  it("badColors affichées", () => {
    const { r } = setup({ diag: { webgl: "on", lost: false, badColors: ["#zzz", "rouge"] } });
    expect(r.container.querySelector("#webgl-diagnostic")?.textContent).toContain("couleurs refusées : #zzz, rouge");
  });
});
