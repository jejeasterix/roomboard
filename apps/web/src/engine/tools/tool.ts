/** Contrat des outils de geste (stylo, gomme ; sélection, formes, texte au lot 4) : aperçu sans écriture, une écriture au relâché (D38). */
import type { Change, Command, CoreDocument } from "../../core/api";
import type { Camera } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { CellRef, NavMove, TableAction, TableCellState } from "../table-geom";
import type { EditOverlay } from "../render/overlay";
import type { LiveLayer } from "../render/renderer";

/** Ce qu'un outil voit du moteur. `run` ne lève jamais : null si le cœur refuse (message dans l'état du moteur). */
export interface ToolContext {
  readonly doc: CoreDocument;
  page(): string;
  camera(): Camera;
  run(cmd: Command): Change | null;
  /** Maj tenue (CL4-12) ; absent = jamais tenue. */
  shift?(): boolean;
  /** Alt tenue (C9, G8) : aucun magnétisme ; absent = jamais tenue. */
  alt?(): boolean;
  /** Demande une image (outil à l'arrêt dont l'aperçu a changé : ensemble masqué vidé) ; absent = sans effet. */
  requestFrame?(): void;
  /** L'outil a changé ce que publie l'état (cellule active du tableau) sans écrire ; absent = sans effet. */
  stateChanged?(): void;
}

/** Aperçu d'un outil : couche vive, éléments masqués de la scène, calque d'édition (CL4-1). */
export interface LivePart extends LiveLayer {
  readonly hidden: ReadonlySet<string>;
  readonly overlay?: EditOverlay;
}

/** Pourquoi le moteur fait quitter un outil. */
export type LeaveReason = "tool" | "page";

export interface GestureTool {
  begin(pointerId: number, samples: readonly InputSample[]): void;
  extend(pointerId: number, samples: readonly InputSample[], predicted: readonly InputSample[]): void;
  /** Une fois par image : pousse les points en attente, met l'aperçu à jour. */
  frame(): void;
  close(pointerId: number, how: CloseReason): void;
  live(): LivePart;
  active(): boolean;
  /** Outil quitté ou page changée : valide ou abandonne ce qui reste ouvert (texte : valide ; sélection : vide). */
  leave?(reason: LeaveReason): void;
}

/** Outil Sélection (D15) : la sélection survit aux gestes ; le moteur la lit (Suppr, état) et la vide. */
export interface SelectionTool extends GestureTool {
  selection(): readonly string[];
  setSelection(ids: readonly string[]): void;
  /** Retire les ids absents de la page montrée (après annuler, rétablir, suppression). */
  prune(): void;
}

/** Outil Tableau (C10a) : cellule active tenue par ids, retirée par prune quand elle disparaît (I1). */
export interface TableTool extends GestureTool {
  cell(): CellRef | null;
  cellState(): TableCellState | null;
  act(a: TableAction): void;
  fill(color: string | null): void;
  /** Suppr, saisie fermée : vide la cellule active ; false sans cellule active ou saisie ouverte. */
  clearCell(): boolean;
  prune(): void;
  /** Tab, Maj+Tab, flèches au bord (DAC3) ; vrai si la touche est prise. */
  navigate(move: NavMove): boolean;
  compositionStart(): void;
  compositionEnd(): void;
  requestCommit(): void;
}

export const NO_LIVE: LivePart = { strokes: [], erasers: [], hidden: new Set<string>() };
