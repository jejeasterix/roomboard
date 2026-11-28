// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSettingsStore, DEFAULT_SETTINGS, SETTING_KEYS, type EffectiveEchelons } from "../engine/settings";
import type { RendererDiagnostics } from "../engine/render/select";
import { createDeviceSettings, type DeviceSettings } from "../device-settings";
import { ICON_VIEWBOX, ICONS } from "./icons";
import { FRAME_LABELS, PALM_ERASER_LABELS, RELOAD_DIRTY_MESSAGE, SettingsPanel } from "./SettingsPanel";

afterEach(cleanup);

const flush = () => new Promise<void>((r) => setTimeout(r, 0));
const EFF: EffectiveEchelons = { prediction: false, inkTrail: "off", webgl: "off" };
const DIAG: RendererDiagnostics = { webgl: "on", lost: false, badColors: [] };

function setup(over: { dirty?: boolean; answer?: boolean; diag?: RendererDiagnostics; notes?: string[]; device?: DeviceSettings; palmEraser?: DeviceSettings } = {}) {
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
      {...(over.device ? { device: over.device } : {})}
      {...(over.palmEraser ? { palmEraser: over.palmEraser } : {})}
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
    expect(navigate).toHaveBeenCalledWith("?banc=&echelons=4:on");
  });

  it("échelon 4 : question si un onglet est modifié", async () => {
    const { btn, navigate, confirm } = setup({ dirty: true, answer: true });
    fireEvent.click(btn("webgl"));
    await flush();
    expect(confirm).toHaveBeenCalledWith(RELOAD_DIRTY_MESSAGE);
    expect(navigate).toHaveBeenCalledWith("?banc=&echelons=4:on");
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

describe("SettingsPanel : cadre de l'annotation (design-l4, L4-14, H10)", () => {
  it("cadre de l'annotation : sans device, aucun bouton data-reglage=cadre", () => {
    const { r } = setup();
    expect(r.container.querySelector('button[data-reglage="cadre"]')).toBeNull();
  });
  it("cadre de l'annotation : « affiché » ; un clic → « masqué » et setFrame(false) ; un autre → « affiché »", () => {
    const device = createDeviceSettings(null);
    const { btn } = setup({ device });
    expect(btn("cadre").textContent).toBe(FRAME_LABELS.on);
    expect(FRAME_LABELS).toEqual({ on: "Cadre de l'annotation : affiché", off: "Cadre de l'annotation : masqué" });
    fireEvent.click(btn("cadre"));
    expect(device.frame()).toBe(false);
    expect(btn("cadre").textContent).toBe(FRAME_LABELS.off);
    fireEvent.click(btn("cadre"));
    expect(device.frame()).toBe(true);
    expect(btn("cadre").textContent).toBe(FRAME_LABELS.on);
  });
  it("cadre de l'annotation : un changement venu d'ailleurs (onChange) est suivi", () => {
    const device = createDeviceSettings(null);
    const { btn } = setup({ device });
    device.setFrame(false);
    expect(btn("cadre").textContent).toBe(FRAME_LABELS.off);
  });
});

describe("SettingsPanel : gomme automatique à la paume (OG25, déc. 26)", () => {
  it("OG25 gomme-paume : sans palmEraser, aucun bouton", () => {
    const { r } = setup();
    expect(r.container.querySelector('button[data-reglage="gomme-paume"]')).toBeNull();
  });
  it("OG25 gomme-paume : « active » ; un clic → « coupée », réglage coupé ; un autre → « active » ; sans le bouton du cadre", () => {
    const palmEraser = createDeviceSettings(null);
    const { r, btn } = setup({ palmEraser });
    expect(PALM_ERASER_LABELS).toEqual({ on: "Gomme automatique à la paume : active", off: "Gomme automatique à la paume : coupée" });
    expect(btn("gomme-paume").textContent).toBe(PALM_ERASER_LABELS.on);
    expect(r.container.querySelector('button[data-reglage="cadre"]')).toBeNull();
    fireEvent.click(btn("gomme-paume"));
    expect(palmEraser.palmEraser()).toBe(false);
    expect(btn("gomme-paume").textContent).toBe(PALM_ERASER_LABELS.off);
    fireEvent.click(btn("gomme-paume"));
    expect(palmEraser.palmEraser()).toBe(true);
    expect(btn("gomme-paume").textContent).toBe(PALM_ERASER_LABELS.on);
  });
  it("OG25 gomme-paume : un changement venu d'ailleurs (Ctrl+Maj+H) est suivi", () => {
    const palmEraser = createDeviceSettings(null);
    const { btn } = setup({ palmEraser });
    palmEraser.setPalmEraser(false);
    expect(btn("gomme-paume").textContent).toBe(PALM_ERASER_LABELS.off);
  });
});

describe("SettingsPanel : design des îlots (OG39)", () => {
  const both = () => setup({ device: createDeviceSettings(null), palmEraser: createDeviceSettings(null) });

  it("OG39 sections : « Stylet et doigt », « Rendu de l'encre », « Annotation », chacune titrée avec une icône Lucide connue", () => {
    const { r } = both();
    const heads = [...r.container.querySelectorAll<HTMLElement>("#reglages .rb-set-h")];
    expect(heads.map((h) => h.textContent)).toEqual(["Stylet et doigt", "Rendu de l'encre", "Annotation"]);
    for (const h of heads) {
      const icon = h.querySelector("svg.rb-icon")?.getAttribute("data-icon") ?? "";
      expect(Object.hasOwn(ICONS, icon), icon).toBe(true);
    }
    for (const svg of r.container.querySelectorAll("#reglages svg")) expect(svg.getAttribute("viewBox")).toBe(ICON_VIEWBOX);
  });

  it("OG39 sections : chaque réglage dans sa section, dans l'ordre", () => {
    const { r } = both();
    const keys = (sec: string) => [...r.container.querySelectorAll(`#reglages [data-section="${sec}"] [data-reglage]`)].map((b) => b.getAttribute("data-reglage"));
    expect(keys("saisie")).toEqual(["finger", "palm", "gomme-paume"]);
    expect(keys("rendu")).toEqual(["prediction", "inkTrail", "webgl"]);
    expect(keys("annotation")).toEqual(["cadre"]);
  });

  it("OG39 sections : sans device, aucune section Annotation ; sans palmEraser, la section saisie garde Doigt et Paume", () => {
    const { r } = setup();
    expect(r.container.querySelector('#reglages [data-section="annotation"]')).toBeNull();
    expect([...r.container.querySelectorAll('#reglages [data-section="saisie"] [data-reglage]')].map((b) => b.getAttribute("data-reglage"))).toEqual(["finger", "palm"]);
  });

  it("OG39 rangée : nom et valeur séparés, texte complet inchangé", () => {
    const { btn } = setup();
    expect(btn("finger").querySelector(".rb-set-name")?.textContent).toBe("Doigt");
    expect(btn("finger").querySelector(".rb-set-val")?.textContent).toBe("vue");
    expect(btn("finger").textContent).toBe("Doigt : vue");
    expect(btn("webgl").querySelector(".rb-set-name")?.textContent).toBe("É4 WebGL2");
    expect(btn("webgl").querySelector(".rb-set-val")?.textContent).toBe("éteint");
  });

  it("OG39 interrupteurs : gomme-paume et cadre en role=switch, aria-checked suit le réglage", () => {
    const palmEraser = createDeviceSettings(null);
    const device = createDeviceSettings(null);
    const { btn } = setup({ device, palmEraser });
    for (const k of ["gomme-paume", "cadre"]) {
      expect(btn(k).getAttribute("role")).toBe("switch");
      expect(btn(k).getAttribute("aria-checked")).toBe("true");
      expect(btn(k).querySelector(".rb-set-knob")).not.toBeNull();
    }
    fireEvent.click(btn("gomme-paume"));
    expect(btn("gomme-paume").getAttribute("aria-checked")).toBe("false");
    device.setFrame(false);
    expect(btn("cadre").getAttribute("aria-checked")).toBe("false");
    expect(btn("palm").getAttribute("role")).toBeNull();
    expect(btn("gomme-paume").querySelector(".rb-set-val")?.getAttribute("aria-hidden")).toBe("true");
    expect(btn("palm").querySelector(".rb-set-val")?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("OG39 rechargement : É3 et É4 portent l'icône « reset » et la note visible du rechargement", () => {
    const { r, btn } = setup();
    const hint = r.container.querySelector<HTMLElement>("#reglages-recharge");
    expect(hint?.textContent).toBe("Recharge la page : le dessin en cours est perdu");
    for (const k of ["inkTrail", "webgl"]) {
      expect(btn(k).querySelector('svg[data-icon="reset"]')).not.toBeNull();
      expect(btn(k).getAttribute("aria-describedby")).toBe("reglages-recharge");
    }
    for (const k of ["finger", "palm", "prediction"]) expect(btn(k).querySelector("svg")).toBeNull();
  });

  it("OG39 notes : vides, aucun paragraphe d'avertissement montré ; données, montrées", () => {
    expect(setup().r.container.querySelector("#echelons-notes")?.hasAttribute("hidden")).toBe(true);
    expect(setup({ notes: ["a"] }).r.container.querySelector("#echelons-notes")?.hasAttribute("hidden")).toBe(false);
  });
});

describe("settings.css (OG39)", () => {
  const css = readFileSync(join(__dirname, "settings.css"), "utf8").replace(/\s+/g, " ");
  it("piste coupée de l'interrupteur en gris lisible (3:1 au moins), jamais en gris 300", () => {
    expect(css).toMatch(/\.rb-set-knob \{[^}]*background: var\(--rf-text-muted-aa\)/);
  });
  it("rangées à 44 px au moins (cible tactile), jetons de la charte seulement", () => {
    expect(css).toMatch(/\.rb-set-row \{[^}]*min-block-size: 44px/);
    const colors = css.replace(/\/\*.*?\*\//g, "").match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(colors).toEqual([]);
  });
});
