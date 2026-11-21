/**
 * Outil Pot (C6a, D2, D15) : aucun aperçu ; au relâché (`close("end")`), une commande au point d'appui, décidée par
 * `fillCommand` (couleur lue à ce moment, PC12) ; `cancel` et `abort` (paume, second doigt) n'écrivent rien (comme la
 * gomme, D39). Un clic = une commande = une étape (D2).
 */
import { screenToWorld } from "../camera";
import type { Change, Command } from "../../core/api";
import { fillCommand, type FillRequest } from "../fill-target";
import type { CloseReason } from "../input/gesture";
import type { Measure } from "../text-layout";
import { NO_LIVE, type GestureTool, type ToolContext } from "./tool";

interface Press {
  readonly page: string;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** File du pot (C6b, B13, DAB2), tenue par l'application : toutes les actions du pot y passent dans l'ordre des clics. */
export interface FillToolQueue {
  /** Tolérance courante (0 à 100), lue au relâché comme la couleur (PC12). */
  tolerance(): number;
  submit(r: FillRequest, run: (c: Command) => Change | null): void;
}

export function createFillTool(ctx: ToolContext, color: () => string | null, measure: Measure, queue?: FillToolQueue): GestureTool {
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
      const out = fillCommand(ctx.doc, p.page, p.x, p.y, p.zoom, color(), measure);
      if (out === null) return;
      if (queue === undefined) {
        // Sans file (tests du moteur, amorce partielle) : commandes vectorielles seules ; une image ne change pas.
        if (out.type !== "ImageFill") ctx.run(out);
        return;
      }
      queue.submit(out.type === "ImageFill" ? { ...out, tolerance: queue.tolerance() } : { command: out }, (c) => ctx.run(c));
    },
    live: () => NO_LIVE,
    active: () => presses.size > 0,
  };
}
