/**
 * Séance de saisie riche (C7b, DAR2, DAR3) : modèle pur des segments, de la sélection (unités UTF-16 du texte), du
 * format en attente au curseur (R9), de l'historique local (R10) et de l'état de la barre (R15). Aucun DOM :
 * `app/text-editor.ts` relit le DOM et appelle ce modèle, qui se teste en `node`. Types posés par T2 ; la fabrique
 * `createRichEdit` est écrite par T7.
 */
import type { TextAttrsPatch, TextSpan } from "../core/api";

/** Action de la barre ou d'un raccourci (R8) : bascule G, I, S ; une des tailles ; couleur, `null` = « Défaut ». */
export type FormatAction =
  | { readonly type: "bold" }
  | { readonly type: "italic" }
  | { readonly type: "underline" }
  | { readonly type: "size"; readonly size: number }
  | { readonly type: "color"; readonly color: string | null };

/** État de la barre (R15) : bascules vraies si toute la sélection porte l'attribut ; taille effective (attribut,
 *  sinon celle de l'élément) ; couleur `"default"` sans attribut ; `"mixed"` si la sélection mêle plusieurs valeurs. */
export interface FormatState {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly size: number | "mixed";
  readonly color: string | "default" | "mixed";
}

/** Taille et couleur de l'élément (texte) ou du tableau (cellule) : les défauts des segments. */
export interface RichBase {
  readonly size: number;
  readonly color: string;
}

export interface RichEditState {
  readonly spans: readonly TextSpan[];
  /** Sélection en unités UTF-16 du texte, start ≤ end. */
  readonly start: number;
  readonly end: number;
  /** Format en attente au curseur (R9, PC10) ; null sans attente. */
  readonly pending: TextAttrsPatch | null;
}

export interface RichEdit {
  state(): RichEditState;
  text(): string;
  /** Frappe ou composition relues (R3) : texte du DOM et sélection d'après la frappe ; -1, -1 : curseur illisible
   *  (PC9). Vrai si les segments ont changé. */
  input(text: string, start: number, end: number): boolean;
  /** Sélection relue à `selectionchange` (R9) : différente de celle du modèle, elle oublie le format en attente. */
  select(start: number, end: number): void;
  /** Collage, Entrée (R12, R3) : `text` à la place de la sélection, attributs du caractère précédent plus l'attente ;
   *  une étape. */
  insert(text: string): void;
  /** Action sur la sélection (R8) ; curseur seul : format en attente, aucune étape (R9). Vrai si les segments ont
   *  changé. */
  format(a: FormatAction): boolean;
  formatState(): FormatState;
  /** Historique local de la séance (R10) ; faux s'il n'y a rien à annuler ou à rétablir. */
  undo(): boolean;
  redo(): boolean;
}
