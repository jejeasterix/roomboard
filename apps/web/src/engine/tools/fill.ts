/**
 * Outil Pot (C6a, D2, D15) : aucun aperçu ; au relâché (`close("end")`), une commande au point d'appui, décidée par
 * `fillCommand` (couleur lue à ce moment, PC12) ; `cancel` et `abort` (paume, second doigt) n'écrivent rien (comme la
 * gomme, D39). Un clic = une commande = une étape (D2).
 */
import { screenToWorld } from "../camera";
import { fillCommand } from "../fill-target";
import type { CloseReason } from "../input/gesture";
import type { Measure } from "../text-layout";
import { NO_LIVE, type GestureTool, type ToolContext } from "./tool";

interface Press {
  readonly page: string;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export function createFillTool(ctx: ToolContext, color: () => string | null, measure: Measure): GestureTool {
  const presses = new Map<number, Press>();
  return {
    begin(pointerId, samples) {
      const s = samples.find((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (!s) return;
      const cam = ctx.camera();
      const [x, y] = screenToWorld(cam, s.x, s.y);
      presses.set(pointerId, { page: ctx.page(), x, y, zoom: cam.zoom });
    },
    extend() {},
    frame() {},
    close(pointerId: number, how: CloseReason) {
      const p = presses.get(pointerId);
      presses.delete(pointerId);
      if (!p || how !== "end") return;
      const cmd = fillCommand(ctx.doc, p.page, p.x, p.y, p.zoom, color(), measure);
      if (cmd !== null) ctx.run(cmd);
    },
    live: () => NO_LIVE,
    active: () => presses.size > 0,
  };
}
