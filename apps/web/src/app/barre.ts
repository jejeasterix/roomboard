/** Barre minimale de l'essai du 19 novembre (Stylo, Gomme, Annuler, Rétablir), en DOM simple ; remplacée au lot 5. */
import type { Engine, EngineState } from "../engine/engine";
import type { DrawTool } from "../engine/input/gesture";
import { toolbar } from "../toolbar";

export type BarAction = DrawTool | "undo" | "redo";

export interface BarButton {
  readonly action: BarAction;
  readonly label: string;
  /** État pressé d'un outil ; null pour une action. */
  readonly pressed: boolean | null;
  readonly disabled: boolean;
}

const labelOf = (id: DrawTool): string => toolbar.find((t) => t.id === id)?.label ?? id;

export function barModel(s: EngineState): BarButton[] {
  return [
    { action: "pen", label: labelOf("pen"), pressed: s.tool === "pen", disabled: false },
    { action: "eraser", label: labelOf("eraser"), pressed: s.tool === "eraser", disabled: false },
    { action: "undo", label: "Annuler", pressed: null, disabled: !s.canUndo },
    { action: "redo", label: "Rétablir", pressed: null, disabled: !s.canRedo },
  ];
}

export function mountBar(
  root: HTMLElement,
  engine: Pick<Engine, "setTool" | "undo" | "redo" | "state" | "onState">,
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
      else engine.setTool(b.action);
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
      el.disabled = b.disabled;
      if (b.pressed === null) el.removeAttribute("aria-pressed");
      else el.setAttribute("aria-pressed", String(b.pressed));
    }
    status.textContent = s.error ?? "";
  };
  paint(engine.state());
  return engine.onState(paint);
}
