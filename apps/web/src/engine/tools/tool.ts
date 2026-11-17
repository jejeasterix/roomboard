/** Contrat des outils de geste (stylo, gomme) : aperçu sans écriture, une écriture au relâché (D38). */
import type { Change, Command, CoreDocument } from "../../core/api";
import type { Camera } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { LiveLayer } from "../render/renderer";

/** Ce qu'un outil voit du moteur. `run` ne lève jamais : null si le cœur refuse (message dans l'état du moteur). */
export interface ToolContext {
  readonly doc: CoreDocument;
  page(): string;
  camera(): Camera;
  run(cmd: Command): Change | null;
}

/** Aperçu d'un outil : couche vive et éléments masqués de la scène. */
export interface LivePart extends LiveLayer {
  readonly hidden: ReadonlySet<string>;
}

export interface GestureTool {
  begin(pointerId: number, samples: readonly InputSample[]): void;
  extend(pointerId: number, samples: readonly InputSample[], predicted: readonly InputSample[]): void;
  /** Une fois par image : pousse les points en attente, met l'aperçu à jour. */
  frame(): void;
  close(pointerId: number, how: CloseReason): void;
  live(): LivePart;
  active(): boolean;
}

export const NO_LIVE: LivePart = { strokes: [], erasers: [], hidden: new Set<string>() };
