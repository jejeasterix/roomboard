/** Contrats entre le routeur d'entrées (D18) et le moteur. Coordonnées en px CSS relatifs à la zone de dessin. */
import type { ShapeKind } from "../../core/api";
import type { InputSample } from "./sampler";

/** Outil d'un geste de tracé ; le bouton gomme du stylet impose "eraser" (D12). */
export type DrawTool = "pen" | "eraser" | "select" | ShapeKind | "text" | "table" | "fill";

/**
 * Fin d'un geste. "end" : relâché. "cancel" : fin anormale (pointercancel, capture perdue) ; l'encre reçue est gardée,
 * la gomme n'écrit rien (D39). "abort" : décidé par le routeur (second doigt, paume) ; rien n'est écrit.
 */
export type CloseReason = "end" | "cancel" | "abort";

export interface GestureSink {
  /** `pointerType` : celui du PointerEvent (`mouse`, `pen`, `touch`), donné par le routeur ; lu par la prédiction (OF73). */
  begin(pointerId: number, tool: DrawTool, samples: readonly InputSample[], pointerType?: string): void;
  extend(pointerId: number, samples: readonly InputSample[], predicted: readonly InputSample[]): void;
  close(pointerId: number, how: CloseReason): void;
  /** OG25 (A2) : rayon de la gomme du geste, px d'écran, le plus grand vu ; absent : sans effet. */
  resize?(pointerId: number, radiusPx: number): void;
}

export interface ViewSink {
  panBy(dx: number, dy: number): void;
  zoomAt(x: number, y: number, factor: number): void;
}

/** Outil choisi dans la barre : un outil de dessin, ou la main (D17) qui fait de tout geste un déplacement de vue. */
export type ToolChoice = DrawTool | "hand";
