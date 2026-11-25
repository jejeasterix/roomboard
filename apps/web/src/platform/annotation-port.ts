/**
 * Contrat entre la fenêtre principale et `annotate` (C11a, DA2, P4, P21). Liste fermée d'événements `emitTo`, charges
 * JSON : les octets voyagent en base64, jamais en `Uint8Array` (un événement Tauri est sérialisé en JSON, un
 * `Uint8Array` y devient `{"0": …}`). Aucun point d'encre n'y passe : seulement des commandes de barre, la vue de barre
 * et le document entier, une fois à l'entrée et une fois à la sortie. Deux noms distincts pour l'aller et le retour du
 * document : `listen` de Tauri 2 écoute toutes les cibles, une fenêtre entendrait sinon son propre envoi.
 */
import type { Matrix } from "../core/api";
import type { FormatAction } from "../engine/rich-edit";
import type { Dock, Profile, StartMode } from "../toolbar";
import type { ToolbarView } from "../ui/item-state";
import type { ToastMessage } from "../ui/toast";
import type { DroppedFile, Point } from "./files";

export const ANNOTATE_LABEL = "annotate";
export const MAIN_LABEL = "main";
export const ANNOTATION_EVENTS = Object.freeze({
  /** principale → annotate : appel `ToolbarHost` (`AnnotationCommand`). */
  command: "roomboard://annotation-command",
  /** principale → annotate : profil actif (`Profile`), à l'entrée et à chaque changement. */
  profile: "roomboard://annotation-profile",
  /** principale → annotate : document de l'onglet d'annotation (`DocumentPayload`). */
  document: "roomboard://annotation-document",
  /** principale → annotate : demande du document (`CollectPayload`). */
  collect: "roomboard://annotation-collect",
  /** annotate → principale : écoute posée (charge vide). */
  ready: "roomboard://annotation-ready",
  /** annotate → principale : vue de barre (`ToolbarView`). */
  view: "roomboard://annotation-view",
  /** annotate → principale : document rendu (`ReturnedPayload`). */
  returned: "roomboard://annotation-returned",
  /** annotate (Échap) ou coque (`CloseRequested` de `annotate`) → principale : quitter l'annotation. */
  exitRequest: "roomboard://annotation-exit-request",
});

/** P4 : sans réponse de `annotate`, la sortie se fait quand même. */
export const EXIT_TIMEOUT_MS = 5000;
/** `annotate` créée : délai de son `ready`. */
export const READY_TIMEOUT_MS = 10000;
/** P9 : sondage du curseur en mode souris. */
export const CURSOR_POLL_MS = 30;
export const INK_LOST_MESSAGE = "encre de l'annotation non récupérée";
/** P17 : objet déposé sur la zone, inséré sur la page montrée de l'onglet d'origine. */
export const addedToPageMessage = (n: number): string => `ajouté à la page ${n}`;

/** C11b (P11) : ni capture ni élément. */
export const NOTHING_TO_SEND_MESSAGE = "rien à envoyer";
/** C11b (P12), design-l4 (L4-16) : une seule source du texte de l'avis d'envoi, en boîte et en bandeau. */
export const SENT_TO_BOARD = "envoyé au tableau";
/** C11b (P12) : rang de la page insérée dans l'onglet cible. */
export const sentToBoardMessage = (n: number): string => `${SENT_TO_BOARD} : page ${n}`;
/** design-l4 (L4-16) : même texte dans le bandeau, majuscule en tête, « page N » en gras. */
export const sentToBoardToast = (n: number): ToastMessage => ({
  text: `${SENT_TO_BOARD.charAt(0).toUpperCase()}${SENT_TO_BOARD.slice(1)} :`,
  strong: `page ${n}`,
});
/** C11b (P10, P27) : rejets de `annotation_capture`. */
export type CaptureFailure = "denied" | "wayland" | "failed";
export const CAPTURE_REASONS: Readonly<Record<CaptureFailure, string>> = Object.freeze({
  denied:
    "autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard",
  wayland: "Wayland",
  failed: "échec de la capture",
});
export const captureFailedMessage = (r: CaptureFailure): string => `capture du bureau impossible (${CAPTURE_REASONS[r]}) : page à fond blanc`;
/** Rejet de la coque (chaîne) en raison connue ; toute autre valeur : `failed`. */
export const captureFailureOf = (e: unknown): CaptureFailure => (e === "denied" || e === "wayland" ? e : "failed");

/** C11b (P24, P25) : PNG lu du fichier accordé (coque) ou fourni par le faux hôte ; dimensions en pixels. */
export interface CapturedImage {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
}
export type CaptureOutcome = { readonly ok: true; readonly image: CapturedImage } | { readonly ok: false; readonly reason: CaptureFailure };
/** C11b (P13) : rang de la page montrée dans `annotate` et matrice de son monde vers la page envoyée. */
export interface AnnotationViewport {
  readonly page: number;
  readonly matrix: Matrix;
}
export type SendTarget = "origin" | "new";
/** C11b (P3, P7) : demande d'envoi à l'espace de travail ; `view` null : page 0, identité. */
export interface SendRequest {
  readonly to: SendTarget;
  readonly origin: string | null;
  readonly image: CapturedImage | null;
  readonly view: AnnotationViewport | null;
  /** C11b (P14) : vrai : bureau figé, le fond de la page de la vue part avec la page ; faux ou absent : `image` seule
   *  (vivant sans capture : fond blanc, jamais le fond d'une page). */
  readonly frozen?: boolean;
}
/** Onglet effectivement servi et rang (1 = première) de la page insérée. */
export interface SendResult {
  readonly to: SendTarget;
  readonly page: number;
}

/** C11b (P6) : nouvel onglet si demandé, si le profil rend « Annotation au démarrage » (Q2), ou si l'origine est absente
 *  ou est l'onglet d'annotation lui-même ; sinon l'onglet d'origine. */
export function sendTarget(wanted: SendTarget, startMode: StartMode, originKind: "board" | "annotation" | null): SendTarget {
  return wanted === "new" || startMode === "desktop-annotation" || originKind !== "board" ? "new" : "origin";
}

/** C11b (P13) : vue lue d'une charge JSON ; page entière ≥ 0, matrice de 6 nombres finis ; sinon rejetée. */
export function isViewport(v: unknown): v is AnnotationViewport {
  if (typeof v !== "object" || v === null) return false;
  const { page, matrix } = v as { readonly page?: unknown; readonly matrix?: unknown };
  return (
    typeof page === "number" &&
    Number.isInteger(page) &&
    page >= 0 &&
    Array.isArray(matrix) &&
    matrix.length === 6 &&
    matrix.every((x) => typeof x === "number" && Number.isFinite(x))
  );
}

export type PointerMode = "draw" | "mouse";

/** Appels `ToolbarHost` rejoués dans `annotate` (P20). */
export type AnnotationCommand =
  | { readonly kind: "setTool"; readonly tool: string; readonly preset?: string }
  | { readonly kind: "runAction"; readonly id: string }
  | { readonly kind: "fillColor"; readonly color: string | null }
  | { readonly kind: "fillTolerance"; readonly value: number }
  | { readonly kind: "textFormat"; readonly action: FormatAction };

export interface DocumentPayload {
  readonly base64: string;
  /** C11b (P15) : fenêtre opaque (bureau figé) ; absent : faux (charge C11a). */
  readonly opaque?: boolean;
  /** design-l4 (L4-13) : cadre violet de l'annotation ; absent : vrai (charge d'avant L4). */
  readonly frame?: boolean;
}
/** design-l4 (L4-13) : champ `frame` d'une charge, écrit seulement s'il est donné (patron `opaque`) ; même code pour la
 *  coque et le faux hôte. */
export const frameField = (o: { readonly frame?: boolean }): { readonly frame?: boolean } => (o.frame === undefined ? {} : { frame: o.frame });
export interface CollectPayload {
  readonly id: number;
}
/** `changed` : version du moteur différente de celle du chargement. C11b (P13) : `view` absent : page 0, identité. */
export interface ReturnedPayload {
  readonly id: number;
  readonly base64: string;
  readonly changed: boolean;
  readonly view?: AnnotationViewport;
}

export interface AnnotationSupport {
  readonly supported: boolean;
  readonly reason: "wayland" | null;
  readonly screens: number;
  /** C11b (P18) : transparence peinte ; absent (coque d'avant C11b) : vrai. */
  readonly transparent?: boolean;
}
/** `screen` null : écran de la fenêtre principale (P15) ; `thickness` en px CSS (convertie par la coque). */
export interface AnnotationPlace {
  readonly screen: number | null;
  readonly dock: Dock;
  readonly thickness: number;
}
export interface Returned {
  readonly bytes: Uint8Array;
  readonly changed: boolean;
  /** C11b (P13) : vue d'`annotate` lue et contrôlée (`isViewport`). */
  readonly view?: AnnotationViewport;
}

/** Hôte des fenêtres : coque (`annotation-tauri.ts`) ou faux (`annotation-fake.ts`). */
export interface AnnotationWindows {
  support(): Promise<AnnotationSupport>;
  /** Crée ou montre `annotate`, place les deux fenêtres, attend `ready`, envoie le profil puis le document ; rend l'écran retenu.
   *  C11b (P15) : `opaque` vrai : bureau figé (absent : transparent). design-l4 (L4-13) : `frame` faux : cadre masqué ;
   *  absent : affiché. */
  enter(o: AnnotationPlace & { readonly document: Uint8Array; readonly profile: Profile; readonly opaque?: boolean; readonly frame?: boolean }): Promise<number>;
  /** C11b (P14, P28) : renvoie le document seul (bascule figé / vivant), sans replacer les fenêtres. */
  load(o: { readonly document: Uint8Array; readonly opaque: boolean; readonly frame?: boolean }): Promise<void>;
  /** C11b (P22, P27) : capture de l'écran de l'annotation sans nos fenêtres ; refus en raison connue, jamais de rejet. */
  capture(o: AnnotationPlace): Promise<CaptureOutcome>;
  /** Replace les deux fenêtres (écran suivant) sans renvoyer le document ; rend l'écran retenu. */
  place(o: AnnotationPlace): Promise<number>;
  /** Demande le document à `annotate` ; null si sa réponse est illisible. Peut ne jamais se résoudre (délai : contrôleur). */
  collect(): Promise<Returned | null>;
  /** Cache `annotate`, rend la géométrie de la principale. */
  leave(): Promise<void>;
  /** Détruit `annotate` (onglet d'annotation fermé). */
  close(): Promise<void>;
  pointer(mode: PointerMode): Promise<void>;
  sendProfile(p: Profile): void;
  send(m: AnnotationCommand): void;
  onView(cb: (v: ToolbarView) => void): () => void;
  onExitRequest(cb: () => void): () => void;
  relaunchCompat(): Promise<void>;
}

export interface AnnotationState {
  readonly active: boolean;
  readonly pointer: PointerMode;
  /** Écran retenu (null avant la première entrée). */
  readonly screen: number | null;
  readonly screens: number;
  /** C11b (P14 à P17) : fenêtre opaque, fond capturé ; absent : faux. */
  readonly frozen?: boolean;
  /** C11b (P18) : bureau vivant offert (transparence peinte) ; faux : repli, « Recapturer le bureau » ; absent : vrai. */
  readonly live?: boolean;
  /** C11b (P6) : cible de « Envoyer au tableau » ; "new" grise « Envoyer dans un nouvel onglet » ; absent : "origin". */
  readonly sendTarget?: SendTarget;
}

/** Contrôleur de la fenêtre principale (`app/annotation.ts`). */
export interface AnnotationControl {
  state(): AnnotationState;
  enter(): Promise<void>;
  exit(): Promise<void>;
  /** Onglet d'annotation fermé : sortie si active, puis `annotate` détruite. */
  close(): Promise<boolean>;
  /** Bascule dessin / souris (P8). */
  toggle(): Promise<void>;
  /** design-l4 (L4-9) : segment de la commande Dessin / Souris : en file, sans effet si `mode` est déjà le mode présent. */
  pointer(mode: PointerMode): Promise<void>;
  nextScreen(): Promise<void>;
  /** C11b (P16, P18) : « Figer le bureau » / « Bureau vivant » / « Recapturer le bureau ». */
  freeze(): Promise<void>;
  /** C11b (P5, P7) : « Envoyer au tableau » (`origin`) ou « … dans un nouvel onglet » (`new`) : capture, sortie, page. */
  send(to: SendTarget): Promise<void>;
  onTool(tool: string): void;
  /** Commande de barre envoyée à `annotate` (suit l'outil pour la bascule). */
  command(m: AnnotationCommand): void;
  sendProfile(p: Profile): void;
  dropOnZone(files: readonly DroppedFile[], at: Point | null): Promise<void>;
  onChange(cb: () => void): () => void;
}
