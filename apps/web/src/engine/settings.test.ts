import { describe, expect, it } from "vitest";
import {
  createSettingsStore,
  cycleSetting,
  DEFAULT_SETTINGS,
  echelonsTag,
  needsReload,
  parseSettings,
  resolvePrediction,
  SETTING_KEYS,
  settingLabel,
  settingsSearch,
  type EffectiveEchelons,
  type EngineSettings,
} from "./settings";

const OFF: EffectiveEchelons = { prediction: false, inkTrail: "off", webgl: "off" };

describe("réglages du moteur (lot 3b)", () => {
  it("défauts : prédiction auto, traînée et WebGL2 éteints, paume stricte, doigt qui déplace la vue", () => {
    expect(DEFAULT_SETTINGS).toEqual({ prediction: "auto", inkTrail: "off", webgl: "off", palm: "strict", finger: "pan" });
    expect(parseSettings("")).toEqual({ settings: DEFAULT_SETTINGS, errors: [] });
    expect(parseSettings("?banc")).toEqual({ settings: DEFAULT_SETTINGS, errors: [] });
  });

  it("échelon 2 : 2 et 2:on allument, 2:off éteint, 2:auto revient à auto", () => {
    expect(parseSettings("?echelons=2").settings.prediction).toBe("on");
    expect(parseSettings("?echelons=2:on").settings.prediction).toBe("on");
    expect(parseSettings("?echelons=2:off").settings.prediction).toBe("off");
    expect(parseSettings("?echelons=2:auto").settings.prediction).toBe("auto");
  });

  it("échelon 3 : 3 allume, 3:off éteint", () => {
    expect(parseSettings("?echelons=3").settings.inkTrail).toBe("on");
    expect(parseSettings("?echelons=3:off").settings.inkTrail).toBe("off");
  });

  it("échelon 4 : 4 allume, 4:off éteint", () => {
    expect(parseSettings("?echelons=4").settings.webgl).toBe("on");
    expect(parseSettings("?echelons=4:off").settings.webgl).toBe("off");
  });

  it("plusieurs échelons à la fois, majuscules et espaces admis ; aucun les éteint tous", () => {
    expect(parseSettings("?echelons=2, 4:ON").settings).toMatchObject({ prediction: "on", inkTrail: "off", webgl: "on" });
    expect(parseSettings("?echelons=2,3,4,aucun").settings).toMatchObject({ prediction: "off", inkTrail: "off", webgl: "off" });
  });

  it("paume : souple et strict", () => {
    expect(parseSettings("?paume=souple").settings.palm).toBe("lenient");
    expect(parseSettings("?paume=strict").settings.palm).toBe("strict");
  });

  it("paume et doigt : un nom hérité d'Object (constructor) est refusé, défaut gardé, message ajouté", () => {
    const a = parseSettings("?paume=constructor");
    expect(a.settings.palm).toBe(DEFAULT_SETTINGS.palm);
    expect(a.errors).toEqual(["paume inconnue : constructor (strict ou souple)"]);
    const b = parseSettings("?doigt=constructor");
    expect(b.settings.finger).toBe(DEFAULT_SETTINGS.finger);
    expect(b.errors).toEqual(["doigt inconnu : constructor (vue ou trace)"]);
  });

  it("settingsSearch et parseSettings : aller-retour pour paume et doigt (mots tirés d'une seule table)", () => {
    const s = { ...DEFAULT_SETTINGS, palm: "lenient", finger: "draw" } as const;
    const back = parseSettings(settingsSearch(s));
    expect(back.errors).toEqual([]);
    expect(back.settings).toEqual(s);
  });

  it("doigt : trace et vue", () => {
    expect(parseSettings("?doigt=trace").settings.finger).toBe("draw");
    expect(parseSettings("?doigt=vue").settings.finger).toBe("pan");
  });

  it("échelons 1, 5 et 6 refusés avec leur raison ; valeurs inconnues ignorées, message rendu", () => {
    const r = parseSettings("?echelons=1,5,6,7,3:auto,2:vite,4:on:off&paume=molle&doigt=pied");
    expect(r.settings).toEqual(DEFAULT_SETTINGS);
    expect(r.errors).toEqual([
      "échelon 1 : toujours allumé, rien à régler",
      "échelon 5 : réglages de WebView2 dans la coque, lot 5",
      "échelon 6 : interdit (l'encre ne traverse jamais la frontière page ↔ Rust natif)",
      "échelon inconnu : 7",
      "valeur inconnue : 3:auto (on ou off)",
      "valeur inconnue : 2:vite (auto, on ou off)",
      "échelon mal écrit : 4:on:off",
      "paume inconnue : molle (strict ou souple)",
      "doigt inconnu : pied (vue ou trace)",
    ]);
  });

  it("settingsSearch : défauts → chaîne vide ; aller-retour exact pour toutes les combinaisons ; autres paramètres gardés", () => {
    expect(settingsSearch(DEFAULT_SETTINGS)).toBe("");
    expect(settingsSearch({ ...DEFAULT_SETTINGS, webgl: "on", finger: "draw" })).toBe("?echelons=4:on&doigt=trace");
    expect(settingsSearch({ ...DEFAULT_SETTINGS, webgl: "on" }, "?banc&echelons=2&paume=souple")).toBe("?banc=&echelons=4:on");
    for (const prediction of ["auto", "on", "off"] as const)
      for (const inkTrail of ["on", "off"] as const)
        for (const webgl of ["on", "off"] as const)
          for (const palm of ["strict", "lenient"] as const)
            for (const finger of ["pan", "draw"] as const) {
              const s: EngineSettings = { prediction, inkTrail, webgl, palm, finger };
              expect(parseSettings(settingsSearch(s))).toEqual({ settings: s, errors: [] });
            }
  });

  it("resolvePrediction : auto allumée seulement sans prédits natifs ; on et off forcent", () => {
    expect(resolvePrediction("auto", true)).toBe(false);
    expect(resolvePrediction("auto", false)).toBe(true);
    expect(resolvePrediction("on", true)).toBe(true);
    expect(resolvePrediction("off", false)).toBe(false);
  });

  it("cycleSetting : auto → on → off → auto ; les autres basculent", () => {
    const a = cycleSetting(DEFAULT_SETTINGS, "prediction");
    const b = cycleSetting(a, "prediction");
    expect([a.prediction, b.prediction, cycleSetting(b, "prediction").prediction]).toEqual(["on", "off", "auto"]);
    expect(cycleSetting(DEFAULT_SETTINGS, "inkTrail").inkTrail).toBe("on");
    expect(cycleSetting(DEFAULT_SETTINGS, "webgl").webgl).toBe("on");
    expect(cycleSetting(DEFAULT_SETTINGS, "palm").palm).toBe("lenient");
    expect(cycleSetting(DEFAULT_SETTINGS, "finger").finger).toBe("draw");
    expect(cycleSetting(cycleSetting(DEFAULT_SETTINGS, "finger"), "finger")).toEqual(DEFAULT_SETTINGS);
  });

  it("needsReload : seuls les échelons 3 et 4 rechargent la page", () => {
    expect(SETTING_KEYS).toEqual(["finger", "palm", "prediction", "inkTrail", "webgl"]);
    expect(SETTING_KEYS.filter((k) => needsReload(k))).toEqual(["inkTrail", "webgl"]);
  });

  it("echelonsTag et settingLabel disent l'état effectif", () => {
    expect(echelonsTag(OFF)).toBe("2:off,3:off,4:off");
    expect(echelonsTag({ prediction: true, inkTrail: "absent", webgl: "repli" })).toBe("2:on,3:absent,4:repli");
    const s = DEFAULT_SETTINGS;
    expect(settingLabel("prediction", s, OFF)).toBe("É2 prédiction : auto (éteinte)");
    expect(settingLabel("prediction", { ...s, prediction: "on" }, { ...OFF, prediction: true })).toBe("É2 prédiction : allumée");
    expect(settingLabel("inkTrail", s, OFF)).toBe("É3 traînée : éteinte");
    expect(settingLabel("inkTrail", s, { ...OFF, inkTrail: "absent" })).toBe("É3 traînée : sans effet (navigator.ink absent)");
    expect(settingLabel("webgl", s, OFF)).toBe("É4 WebGL2 : éteint");
    expect(settingLabel("webgl", s, { ...OFF, webgl: "repli" })).toBe("É4 WebGL2 : repli Canvas 2D");
    expect(settingLabel("palm", s, OFF)).toBe("Paume : stricte");
    expect(settingLabel("palm", { ...s, palm: "lenient" }, OFF)).toBe("Paume : souple");
    expect(settingLabel("finger", s, OFF)).toBe("Doigt : vue");
    expect(settingLabel("finger", { ...s, finger: "draw" }, OFF)).toBe("Doigt : trace");
  });

  it("store : set notifie une fois, rien si inchangé ; désabonnement", () => {
    const store = createSettingsStore(DEFAULT_SETTINGS);
    const seen: EngineSettings[] = [];
    const off = store.onChange((s) => seen.push(s));
    store.set({ ...DEFAULT_SETTINGS });
    expect(seen).toHaveLength(0);
    store.set({ ...DEFAULT_SETTINGS, finger: "draw" });
    expect(seen).toEqual([{ ...DEFAULT_SETTINGS, finger: "draw" }]);
    expect(store.get().finger).toBe("draw");
    off();
    store.set(DEFAULT_SETTINGS);
    expect(seen).toHaveLength(1);
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });
});
