/**
 * Contrat entre la fenêtre principale et `annotate` (C11a, DA2, P4, P21). Liste fermée d'événements `emitTo`, charges
 * JSON : les octets voyagent en base64, jamais en `Uint8Array` (un événement Tauri est sérialisé en JSON, un
 * `Uint8Array` y devient `{"0": …}`). Aucun point d'encre n'y passe : seulement des commandes de barre, la vue de barre
 * et le document entier, une fois à l'entrée et une fois à la sortie. Deux noms distincts pour l'aller et le retour du
 * document : `listen` de Tauri 2 écoute toutes les cibles, une fenêtre entendrait sinon son propre envoi.
 */
import type { FormatAction } from "../engine/rich-edit";
import type { Dock, Profile } from "../toolbar";
import type { ToolbarView } from "../ui/item-state";
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
}
export interface CollectPayload {
  readonly id: number;
}
/** `changed` : version du moteur différente de celle du chargement. */
export interface ReturnedPayload {
  readonly id: number;
  readonly base64: string;
  readonly changed: boolean;
}

export interface AnnotationSupport {
  readonly supported: boolean;
  readonly reason: "wayland" | null;
  readonly screens: number;
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
}

/** Hôte des fenêtres : coque (`annotation-tauri.ts`) ou faux (`annotation-fake.ts`). */
export interface AnnotationWindows {
  support(): Promise<AnnotationSupport>;
  /** Crée ou montre `annotate`, place les deux fenêtres, attend `ready`, envoie le profil puis le document ; rend l'écran retenu. */
  enter(o: AnnotationPlace & { readonly document: Uint8Array; readonly profile: Profile }): Promise<number>;
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
  nextScreen(): Promise<void>;
  onTool(tool: string): void;
  /** Commande de barre envoyée à `annotate` (suit l'outil pour la bascule). */
  command(m: AnnotationCommand): void;
  sendProfile(p: Profile): void;
  dropOnZone(files: readonly DroppedFile[], at: Point | null): Promise<void>;
  onChange(cb: () => void): () => void;
}
