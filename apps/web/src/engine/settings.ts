/**
 * Réglages du moteur (lot 3b) : échelons 2 à 4 de DA9, paume (D18, D39) et doigt (D18). Seul endroit où ils se
 * lisent : l'adresse (`?echelons=`, `?paume=`, `?doigt=`) les donne au démarrage, la barre les change ensuite.
 * Échelon 1 toujours allumé ; échelon 5 (WebView2) au lot 5 ; échelon 6 interdit (le chemin de l'encre ne traverse
 * jamais la frontière page ↔ Rust natif). Défauts : un échelon que rien de mesuré ne demande est éteint (S1, OC56, OC66).
 */

export type PredictionSetting = "auto" | "on" | "off";
export type Switch = "on" | "off";
export type PalmSetting = "strict" | "lenient";
export type FingerSetting = "pan" | "draw";

export interface EngineSettings {
  /** Échelon 2 : prédiction linéaire en TS ; auto = allumée seulement si `getPredictedEvents` manque (WebKit). */
  readonly prediction: PredictionSetting;
  /** Échelon 3 : traînée déléguée `navigator.ink`. */
  readonly inkTrail: Switch;
  /** Échelon 4 : canvas d'interaction en WebGL2. */
  readonly webgl: Switch;
  /** Paume posée avant le stylet : strict = son geste est annulé quand le stylet touche (écart accepté T1). */
  readonly palm: PalmSetting;
  /** Doigt seul après un stylet vu : pan = déplace la vue (D18), draw = trace. */
  readonly finger: FingerSetting;
}

export type SettingKey = keyof EngineSettings;

export const DEFAULT_SETTINGS: EngineSettings = {
  prediction: "auto",
  inkTrail: "off",
  webgl: "off",
  palm: "strict",
  finger: "pan",
};

/** Ordre de la barre : réglages à chaud d'abord, puis les échelons. */
export const SETTING_KEYS: readonly SettingKey[] = ["finger", "palm", "prediction", "inkTrail", "webgl"];

/** Réglages pris au chargement (présentateur d'encre, contexte du canvas) : les changer recharge la page. */
export function needsReload(key: SettingKey): boolean {
  return key === "inkTrail" || key === "webgl";
}

export interface ParsedSettings {
  readonly settings: EngineSettings;
  readonly errors: readonly string[];
}

const PALM_WORDS: Record<string, PalmSetting> = { strict: "strict", souple: "lenient" };
const FINGER_WORDS: Record<string, FingerSetting> = { vue: "pan", trace: "draw" };

/**
 * Lit `?echelons=2,3:on,4:off&paume=souple&doigt=trace`. Un échelon seul vaut `on` ; `aucun` éteint 2, 3 et 4. Une
 * valeur fautive garde son défaut et ajoute un message (affiché par la barre) ; les autres paramètres sont ignorés.
 */
export function parseSettings(search: string): ParsedSettings {
  const params = new URLSearchParams(search);
  const errors: string[] = [];
  let prediction = DEFAULT_SETTINGS.prediction;
  let inkTrail = DEFAULT_SETTINGS.inkTrail;
  let webgl = DEFAULT_SETTINGS.webgl;
  let palm = DEFAULT_SETTINGS.palm;
  let finger = DEFAULT_SETTINGS.finger;
  const echelons = params.get("echelons");
  if (echelons !== null) {
    for (const raw of echelons.split(",")) {
      const token = raw.trim().toLowerCase();
      if (token === "") continue;
      if (token === "aucun") {
        prediction = "off";
        inkTrail = "off";
        webgl = "off";
        continue;
      }
      const [num, value = "on", extra] = token.split(":");
      if (extra !== undefined) {
        errors.push(`échelon mal écrit : ${token}`);
      } else if (num === "2") {
        if (value === "auto" || value === "on" || value === "off") prediction = value;
        else errors.push(`valeur inconnue : ${token} (auto, on ou off)`);
      } else if (num === "3" || num === "4") {
        if (value === "on" || value === "off") {
          if (num === "3") inkTrail = value;
          else webgl = value;
        } else errors.push(`valeur inconnue : ${token} (on ou off)`);
      } else if (num === "1") {
        errors.push("échelon 1 : toujours allumé, rien à régler");
      } else if (num === "5") {
        errors.push("échelon 5 : réglages de WebView2 dans la coque, lot 5");
      } else if (num === "6") {
        errors.push("échelon 6 : interdit (l'encre ne traverse jamais la frontière page ↔ Rust natif)");
      } else {
        errors.push(`échelon inconnu : ${token}`);
      }
    }
  }
  const p = params.get("paume");
  if (p !== null) {
    const v = PALM_WORDS[p.trim().toLowerCase()];
    if (v) palm = v;
    else errors.push(`paume inconnue : ${p} (strict ou souple)`);
  }
  const d = params.get("doigt");
  if (d !== null) {
    const v = FINGER_WORDS[d.trim().toLowerCase()];
    if (v) finger = v;
    else errors.push(`doigt inconnu : ${d} (vue ou trace)`);
  }
  return { settings: { prediction, inkTrail, webgl, palm, finger }, errors };
}

/**
 * Adresse qui redonne ces réglages au chargement : seuls les écarts au défaut y figurent ; les autres paramètres de
 * `keep` (par exemple `?banc`) sont gardés, devant. Défauts et rien à garder : chaîne vide.
 */
export function settingsSearch(s: EngineSettings, keep = ""): string {
  const params = new URLSearchParams(keep);
  params.delete("echelons");
  params.delete("paume");
  params.delete("doigt");
  const parts: string[] = [];
  const rest = params.toString();
  if (rest !== "") parts.push(rest);
  const tokens: string[] = [];
  if (s.prediction !== DEFAULT_SETTINGS.prediction) tokens.push(`2:${s.prediction}`);
  if (s.inkTrail !== DEFAULT_SETTINGS.inkTrail) tokens.push(`3:${s.inkTrail}`);
  if (s.webgl !== DEFAULT_SETTINGS.webgl) tokens.push(`4:${s.webgl}`);
  if (tokens.length > 0) parts.push(`echelons=${tokens.join(",")}`);
  if (s.palm !== DEFAULT_SETTINGS.palm) parts.push("paume=souple");
  if (s.finger !== DEFAULT_SETTINGS.finger) parts.push("doigt=trace");
  return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

/** Échelon 2 effectif : `auto` l'allume seulement là où le navigateur ne donne aucun point prédit. */
export function resolvePrediction(setting: PredictionSetting, nativePredicted: boolean): boolean {
  if (setting === "on") return true;
  if (setting === "off") return false;
  return !nativePredicted;
}

/** Valeur suivante d'un réglage (bouton de la barre). */
export function cycleSetting(s: EngineSettings, key: SettingKey): EngineSettings {
  switch (key) {
    case "prediction":
      return { ...s, prediction: s.prediction === "auto" ? "on" : s.prediction === "on" ? "off" : "auto" };
    case "inkTrail":
      return { ...s, inkTrail: s.inkTrail === "on" ? "off" : "on" };
    case "webgl":
      return { ...s, webgl: s.webgl === "on" ? "off" : "on" };
    case "palm":
      return { ...s, palm: s.palm === "strict" ? "lenient" : "strict" };
    case "finger":
      return { ...s, finger: s.finger === "pan" ? "draw" : "pan" };
  }
}

export type InkTrailState = "on" | "off" | "absent" | "refused";
export type WebglState = "on" | "off" | "repli";

/** État effectif des échelons après le démarrage (ce que le navigateur a accordé). */
export interface EffectiveEchelons {
  readonly prediction: boolean;
  readonly inkTrail: InkTrailState;
  readonly webgl: WebglState;
}

/** Forme lue par le script S2 dans `#stage[data-echelons]`. */
export function echelonsTag(e: EffectiveEchelons): string {
  return `2:${e.prediction ? "on" : "off"},3:${e.inkTrail},4:${e.webgl}`;
}

const INK_LABELS: Record<InkTrailState, string> = {
  on: "allumée",
  off: "éteinte",
  absent: "sans effet (navigator.ink absent)",
  refused: "refusée par le navigateur",
};

const WEBGL_LABELS: Record<WebglState, string> = { on: "allumé", off: "éteint", repli: "repli Canvas 2D" };

/** Libellé d'un bouton de réglage (barre, T40). */
export function settingLabel(key: SettingKey, s: EngineSettings, e: EffectiveEchelons): string {
  switch (key) {
    case "finger":
      return s.finger === "pan" ? "Doigt : vue" : "Doigt : trace";
    case "palm":
      return s.palm === "strict" ? "Paume : stricte" : "Paume : souple";
    case "prediction": {
      const state = e.prediction ? "allumée" : "éteinte";
      return s.prediction === "auto" ? `É2 prédiction : auto (${state})` : `É2 prédiction : ${state}`;
    }
    case "inkTrail":
      return `É3 traînée : ${INK_LABELS[e.inkTrail]}`;
    case "webgl":
      return `É4 WebGL2 : ${WEBGL_LABELS[e.webgl]}`;
  }
}

export interface SettingsStore {
  get(): EngineSettings;
  /** Remplace les réglages ; notifie seulement si une valeur change. */
  set(next: EngineSettings): void;
  onChange(cb: (s: EngineSettings) => void): () => void;
}

export function createSettingsStore(initial: EngineSettings): SettingsStore {
  let current = initial;
  const listeners = new Set<(s: EngineSettings) => void>();
  return {
    get: () => current,
    set(next) {
      if (SETTING_KEYS.every((k) => next[k] === current[k])) return;
      current = next;
      for (const cb of listeners) cb(current);
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
