/**
 * Barre minimale (lot 3, étendue au lot 3b), en DOM simple ; remplacée au lot 5. Première ligne : Stylo, Gomme, Main,
 * mode de gomme, Annuler, Rétablir, état. Seconde ligne (`#reglages`) : réglages du moteur (engine/settings.ts) ;
 * les échelons 3 et 4 rechargent la page avec la nouvelle adresse. Troisième ligne (`#edition`, lot 4) : outils
 * d'édition et pages.
 */
import type { Bounds, EraseMode, ShapeKind } from "../core/api";
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

export interface BarButton<A = BarAction> {
  readonly action: A;
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

/** Troisième ligne (lot 4, CL4-13) : outils d'édition et pages ; remplacée au lot 5. */
export type EditionAction = "select" | ShapeKind | "text" | "page-prev" | "page-next" | "page-add" | "page-remove";
type EditionTool = "select" | ShapeKind | "text";

const EDITION_TOOLS: readonly EditionTool[] = ["select", "rect", "ellipse", "line", "arrow", "text"];
const EDITION_LABELS: Record<Exclude<EditionAction, "select">, string> = {
  rect: "Rectangle",
  ellipse: "Ellipse",
  line: "Ligne",
  arrow: "Flèche",
  text: "Texte",
  "page-prev": "Page précédente",
  "page-next": "Page suivante",
  "page-add": "Ajouter une page",
  "page-remove": "Retirer la page",
};
const editionLabel = (a: EditionAction): string => (a === "select" ? labelOf("select") : EDITION_LABELS[a]);

export function editionModel(s: EngineState): BarButton<EditionAction>[] {
  const last = s.pageIndex >= s.pageCount - 1;
  return [
    ...EDITION_TOOLS.map((t) => ({ action: t, label: editionLabel(t), pressed: s.tool === t, disabled: false })),
    { action: "page-prev", label: editionLabel("page-prev"), pressed: null, disabled: s.pageIndex <= 0 },
    { action: "page-next", label: editionLabel("page-next"), pressed: null, disabled: last },
    { action: "page-add", label: editionLabel("page-add"), pressed: null, disabled: false },
    // D37 : la dernière page ne se retire pas.
    { action: "page-remove", label: editionLabel("page-remove"), pressed: null, disabled: s.pageCount <= 1 },
  ];
}

export const pagesLabel = (s: EngineState): string => `${s.pageIndex + 1} / ${s.pageCount}`;

const tenth = (v: number): string => String(Math.round(v * 10) / 10);
const boundsTag = (b: Bounds | null): string => (b === null ? "" : [b.x0, b.y0, b.x1, b.y1].map(tenth).join(","));

/** Attributs de `#stage` lus par le scénario S3/S4 (contrat du lot). */
export function stageTags(s: EngineState): Record<"page" | "selection" | "bounds" | "tool", string> {
  return {
    page: `${s.pageIndex + 1}/${s.pageCount}`,
    selection: String(s.selection.length),
    bounds: boundsTag(s.selectionBounds),
    tool: s.tool,
  };
}

export function mountEdition(
  root: HTMLElement,
  engine: Pick<Engine, "setTool" | "addPage" | "removePage" | "nextPage" | "prevPage" | "state" | "onState">,
): () => void {
  const buttons = new Map<EditionAction, HTMLButtonElement>();
  const run = (a: EditionAction): void => {
    if (a === "page-prev") engine.prevPage();
    else if (a === "page-next") engine.nextPage();
    else if (a === "page-add") engine.addPage();
    else if (a === "page-remove") engine.removePage();
    else engine.setTool(a);
  };
  for (const b of editionModel(engine.state())) {
    const el = document.createElement("button");
    el.type = "button";
    el.dataset["action"] = b.action;
    el.textContent = b.label;
    el.addEventListener("click", () => run(b.action));
    buttons.set(b.action, el);
    root.append(el);
  }
  const counter = document.createElement("span");
  counter.id = "pages";
  root.append(counter);
  const paint = (s: EngineState): void => {
    for (const b of editionModel(s)) {
      const el = buttons.get(b.action);
      if (!el) continue;
      el.disabled = b.disabled;
      if (b.pressed === null) el.removeAttribute("aria-pressed");
      else el.setAttribute("aria-pressed", String(b.pressed));
    }
    counter.textContent = pagesLabel(s);
  };
  paint(engine.state());
  return engine.onState(paint);
}
