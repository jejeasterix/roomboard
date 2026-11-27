/**
 * Contrat d'un gestionnaire d'import et aides sans registre (OF13, cadrage platform-feuilles D5) : feuille que le registre
 * (`import.ts`) et ses gestionnaires (`office-import`, `model3d-handlers`, `media-import`, `image-import`) importent sans
 * cycle ; elle n'importe que des types. `import.ts` réexporte ces dix noms, `image-import.ts` réexporte `ImageTarget` et
 * `StageRect`.
 */
import type { Change, Command } from "../core/api";
import type { PageRect } from "../engine/page";
import type { AssetStore } from "../core/asset-store";
import type { Camera } from "../engine/camera";
import type { Measure } from "../engine/text-layout";
import type { DroppedFile, Notify, Point } from "./files";

/** Rectangle du stage actif en px CSS de la fenêtre (`getBoundingClientRect`). */
export interface StageRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Onglet qui reçoit les objets (R3) : branché par l'espace de travail sur la session active. */
export interface ImageTarget {
  readonly assets: Pick<AssetStore, "put">;
  page(): string;
  camera(): Camera;
  stageRect(): StageRect;
  /** DA4 : cadre de la page cible (`pageFrame`), null en Infini ; absent : la page par défaut, 1920 × 1080. */
  frame?(): PageRect | null;
  /** Mesure du texte de la session (C10b, F21) : hauteurs exigées d'un tableau importé ou collé. */
  measure(): Measure;
  /** Style de texte du moteur (couleur du stylo, taille par défaut) d'un tableau importé ou collé (F21). */
  textStyle(): { readonly color: string; readonly size: number };
  /** Faux une fois l'onglet fermé (décodage en cours) : plus aucun appel au moteur libéré. */
  alive?(): boolean;
  /** `engine.run` : null si le cœur refuse (message dans l'état du moteur). */
  run(cmd: Command): Change | null;
  /**
   * Z10 : insère un objet `.rbitem` (fragment, pas une `Command`) dans cet onglet ; `index` = rang dans l'appel
   * (cascade, R4). Absent : `.rbitem` refusé. Faux : refus, le message est déjà dit.
   */
  insertFragment?(rbitem: Uint8Array, at: Point | null, index: number, name: string): Promise<boolean>;
}

export interface ImportContext {
  /** Contenu du fichier, lu une fois (la coque le lit par morceaux, `grantedFile`). */
  readonly blob: Blob;
  /** `HEAD_BYTES` premiers octets ; vide pour un `.roomboard` (reconnu par son nom). */
  readonly head: Uint8Array;
  /** Point de dépôt en px CSS de la fenêtre ; null : collage, « Importer », lancement. */
  readonly at: Point | null;
  /** Images déjà insérées par cet appel (cascade, R4). */
  readonly inserted: number;
  readonly target: ImageTarget | null;
  notify: Notify;
  /** C15 (DAX2) : fichiers du même appel réclamés par `companions` ; [] sinon (appel d'un seul fichier, lien). */
  readonly companions: readonly DroppedFile[];
  /** Mineur C15 : noms des fichiers réclamés écartés car au-delà du plafond, déjà dits trop gros ; [] ou absent sinon. */
  readonly tooBig?: readonly string[];
}

export type ImportOutcome = "opened" | "inserted" | "failed";

export interface ImportHandler {
  readonly id: string;
  /** `document` ouvre un onglet (compte les onglets pleins) ; `objet` va dans l'onglet actif ; `paquet` dans la bibliothèque. */
  readonly nature: "document" | "objet" | "paquet";
  detect(head: Uint8Array, name: string): boolean;
  /** Plafond propre au gestionnaire (F22), contrôlé par `importFiles` sur `f.size` **avant** `f.blob()` (la coque lit
   *  le fichier en entier) : dépassé, « <nom> : <message> », compté en échec. */
  readonly limit?: { readonly maxBytes: number; readonly message: string };
  /** C14 (PC4, M14) : fichier qui a un chemin (coque) et dépasse `aboveBytes` : `run` lie le fichier sans le lire ;
   *  appelé par `importFiles` avant `limit` et sans `f.blob()`. Dit lui-même ses messages. */
  readonly link?: {
    readonly aboveBytes: number;
    run(file: DroppedFile, path: string, ctx: Omit<ImportContext, "blob">): Promise<ImportOutcome>;
  };
  /** C15 (DAX2) : fichiers de `siblings` que ce fichier cite ; ils sortent de la boucle et arrivent dans `ctx.companions`.
   *  Appelé seulement pour un appel de plusieurs fichiers, après les plafonds, avec l'en-tête et le contenu déjà lus. */
  readonly companions?: (file: DroppedFile, blob: Blob, head: Uint8Array, siblings: readonly DroppedFile[]) => Promise<readonly DroppedFile[]>;
  /** Dit lui-même ses messages d'échec. */
  run(file: DroppedFile, ctx: ImportContext): Promise<ImportOutcome>;
}

/** Nom qui se termine par `ext` (minuscules, point compris) et ne s'y réduit pas. */
export function hasExtension(name: string, ext: string): boolean {
  return name.toLowerCase().endsWith(ext) && name.length > ext.length;
}

/** En-tête d'un ZIP (`PK\x03\x04`) : un `.rbitem` (Z10) comme un `.xlsx` (F28) est un ZIP ; chacun est reconnu par son
 *  nom ET cet en-tête, le nom seul les départage. */
export const ZIP_MAGIC: readonly number[] = Object.freeze([0x50, 0x4b, 0x03, 0x04]);

export const hasZipMagic = (head: Uint8Array): boolean => head.length >= ZIP_MAGIC.length && ZIP_MAGIC.every((b, i) => head[i] === b);

/** Plafond d'un classeur (F22), aussi dans la coque où `maxBytes` est nul. */
export const SHEET_MAX_BYTES = 100 * 1024 * 1024;

export function isSheetName(name: string): boolean {
  return hasExtension(name, ".xlsx") || hasExtension(name, ".xlsm");
}
