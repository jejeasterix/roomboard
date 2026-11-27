/** Contrat des outils de geste (stylo, gomme ; sélection, formes, texte au lot 4) : aperçu sans écriture, une écriture au relâché (D38). */
import type { Change, Command, CoreDocument } from "../../core/api";
import type { Camera } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { FormatAction, FormatState } from "../rich-edit";
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
  /** OG12 : Ctrl/Cmd tenu (inverse la liaison, n° 19) ; absent = jamais tenu. */
  ctrl?(): boolean;
  /** OG12 : réglage Liaison des flèches, vrai par défaut. */
  bindingEnabled?(): boolean;
  /** OG12 : type du pointeur du geste en cours (`touch`, `mouse`, `pen`). */
  pointerType?(): string;
  /** OG12 : entre dans Modifier les points pour la ligne ou la flèche `id` (n° 21). */
  editPoints?(id: string): void;
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
  /** OG25 (A2) : agrandit le rayon du geste `pointerId` (px d'écran) ; jamais ne le réduit ; absent : sans effet. */
  resize?(pointerId: number, radiusPx: number): void;
  /** Outil quitté ou page changée : valide ou abandonne ce qui reste ouvert (texte : valide ; sélection : vide). */
  leave?(reason: LeaveReason): void;
  /** OG12 : survol souris ou stylet sans bouton, px de la scène ; absent : sans effet. */
  hover?(x: number, y: number): void;
}

/** Outil Sélection (D15) : la sélection survit aux gestes ; le moteur la lit (Suppr, état) et la vide. */
export interface SelectionTool extends GestureTool {
  selection(): readonly string[];
  setSelection(ids: readonly string[]): void;
  /** Retire les ids absents de la page montrée (après annuler, rétablir, suppression). */
  prune(): void;
  /** personnalisation-3 : loge la sélection dans la case sous son centre (out : la sort) ; false si rien à faire. */
  placeInCell?(out: boolean): boolean;
}

/** Outil Tableau (C10a) : cellule active tenue par ids, retirée par prune quand elle disparaît (I1). */
export interface TableTool extends GestureTool {
  cell(): CellRef | null;
  cellState(): TableCellState | null;
  act(a: TableAction): void;
  fill(color: string | null): void;
  /** Suppr, saisie fermée : vide la cellule active ; false sans cellule active ou saisie ouverte. */
  clearCell(): boolean;
  /** Échap, saisie fermée (C10b, PC18) : retire la plage ; false sans plage ou saisie ouverte. */
  clearRange(): boolean;
  prune(): void;
  /** Tab, Maj+Tab, flèches au bord (DAC3) ; vrai si la touche est prise. */
  navigate(move: NavMove): boolean;
  compositionStart(): void;
  compositionEnd(): void;
  requestCommit(): void;
  /** Barre de format (C7b, DAR4) : relayée à la zone si une cellule est ouverte, hors composition (R5). */
  format(a: FormatAction): void;
  formatState(): FormatState | null;
  /** La zone a changé sélection ou format : l'état du moteur est republié (R15). */
  formatChanged(): void;
}

export const NO_LIVE: LivePart = { strokes: [], erasers: [], hidden: new Set<string>() };
