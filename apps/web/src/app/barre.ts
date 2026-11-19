/**
 * Barre minimale (lot 3, étendue au lot 3b), en DOM simple ; remplacée au lot 5. Première ligne : Stylo, Gomme, Main,
 * mode de gomme, Annuler, Rétablir, état. Seconde ligne (`#reglages`) : réglages du moteur (engine/settings.ts) ;
 * les échelons 3 et 4 rechargent la page avec la nouvelle adresse.
 */
import type { EraseMode } from "../core/api";
import type { Engine, EngineState } from "../engine/engine";
import type { ToolChoice } from "../engine/input/gesture";
import {
  cycleSetting,
  needsReload,
  SETTING_KEYS,
  settingLabel,
  settingsSearch,
  type EffectiveEchelons,
  type EngineSettings,
  type SettingKey,
  type SettingsStore,
} from "../engine/settings";
import { toolbar } from "../toolbar";

export type BarAction = ToolChoice | "eraser-mode" | "undo" | "redo";

export interface BarButton {
  readonly action: BarAction;
  readonly label: string;
  /** État pressé d'un outil ou du mode objet ; null pour une action. */
  readonly pressed: boolean | null;
  readonly disabled: boolean;
}

/** Libellés absents de toolbar.ts (DA10, lot 5). */
const EXTRA_LABELS: Partial<Record<ToolChoice, string>> = { hand: "Main" };
const labelOf = (id: ToolChoice): string => toolbar.find((t) => t.id === id)?.label ?? EXTRA_LABELS[id] ?? id;
const ERASER_MODE_LABELS: Record<EraseMode, string> = { partial: "Gomme : partielle", object: "Gomme : objet" };

export function barModel(s: EngineState): BarButton[] {
  return [
    { action: "pen", label: labelOf("pen"), pressed: s.tool === "pen", disabled: false },
    { action: "eraser", label: labelOf("eraser"), pressed: s.tool === "eraser", disabled: false },
    { action: "hand", label: labelOf("hand"), pressed: s.tool === "hand", disabled: false },
    {
      action: "eraser-mode",
      label: ERASER_MODE_LABELS[s.eraserMode],
      pressed: s.eraserMode === "object",
      disabled: false,
    },
    { action: "undo", label: "Annuler", pressed: null, disabled: !s.canUndo },
    { action: "redo", label: "Rétablir", pressed: null, disabled: !s.canRedo },
  ];
}

export function mountBar(
  root: HTMLElement,
  engine: Pick<Engine, "setTool" | "setEraserMode" | "undo" | "redo" | "state" | "onState">,
): () => void {
  const buttons = new Map<BarAction, HTMLButtonElement>();
  for (const b of barModel(engine.state())) {
    const el = document.createElement("button");
    el.type = "button";
    el.dataset["action"] = b.action;
    el.textContent = b.label;
    el.addEventListener("click", () => {
      if (b.action === "undo") engine.undo();
      else if (b.action === "redo") engine.redo();
      else if (b.action === "eraser-mode") {
        engine.setEraserMode(engine.state().eraserMode === "partial" ? "object" : "partial");
      } else engine.setTool(b.action);
    });
    buttons.set(b.action, el);
    root.append(el);
  }
  const status = root.ownerDocument.getElementById("etat") ?? root.appendChild(document.createElement("span"));
  status.id = "etat";
  root.append(status); // après les boutons : un message d'erreur long ne les pousse pas (déplace #etat s'il précède)
  status.setAttribute("role", "status");
  const paint = (s: EngineState): void => {
    for (const b of barModel(s)) {
      const el = buttons.get(b.action);
      if (!el) continue;
      el.textContent = b.label;
      el.disabled = b.disabled;
      if (b.pressed === null) el.removeAttribute("aria-pressed");
      else el.setAttribute("aria-pressed", String(b.pressed));
    }
    status.textContent = s.error ?? "";
  };
  paint(engine.state());
  return engine.onState(paint);
}

export interface SettingButton {
  readonly key: SettingKey;
  readonly label: string;
  /** Vrai si le changer recharge la page (échelons 3 et 4). */
  readonly reload: boolean;
}

export function settingsModel(s: EngineSettings, e: EffectiveEchelons): SettingButton[] {
  return SETTING_KEYS.map((key) => ({ key, label: settingLabel(key, s, e), reload: needsReload(key) }));
}

export interface SettingsBarDeps {
  readonly store: SettingsStore;
  effective(): EffectiveEchelons;
  /** Notes du démarrage (adresse mal écrite, repli WebGL2), affichées après les boutons. */
  readonly notes: readonly string[];
  /** Adresse actuelle (`location.search`), gardée au rechargement (`?banc`). */
  search(): string;
  /** Recharge la page avec une nouvelle adresse (`location.search = …`). */
  navigate(search: string): void;
}

export function mountSettings(root: HTMLElement, deps: SettingsBarDeps): () => void {
  const buttons = new Map<SettingKey, HTMLButtonElement>();
  for (const b of settingsModel(deps.store.get(), deps.effective())) {
    const el = document.createElement("button");
    el.type = "button";
    el.dataset["reglage"] = b.key;
    if (b.reload) el.title = "Recharge la page : le dessin en cours est perdu";
    el.addEventListener("click", () => {
      const next = cycleSetting(deps.store.get(), b.key);
      if (b.reload) deps.navigate(settingsSearch(next, deps.search()));
      else deps.store.set(next);
    });
    buttons.set(b.key, el);
    root.append(el);
  }
  const notes = document.createElement("span");
  notes.id = "echelons-notes";
  notes.textContent = deps.notes.join(" · ");
  root.append(notes);
  const paint = (s: EngineSettings): void => {
    for (const b of settingsModel(s, deps.effective())) {
      const el = buttons.get(b.key);
      if (el) el.textContent = b.label;
    }
  };
  paint(deps.store.get());
  return deps.store.onChange(paint);
}
