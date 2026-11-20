/**
 * Porte de validation IME (CL4-3, C10a T8), extraite de l'outil Texte : pendant une composition, toute demande de
 * validation attend `compositionend` ; même règle que `engine/input/keys.ts:27` (la touche appartient à l'IME, D14).
 * Partagée par l'outil Texte et l'outil Tableau.
 */
export interface CommitGate {
  /** Valide tout de suite, ou à la fin de la composition ; rien si aucune saisie n'est ouverte. */
  request(): void;
  compositionStart(): void;
  compositionEnd(): void;
  composing(): boolean;
  /** Saisie ouverte ou fermée : composition et demande en attente oubliées. */
  reset(): void;
}

export function createCommitGate(commit: () => void, open: () => boolean): CommitGate {
  let composing = false;
  /** Validation demandée pendant la composition : jouée à `compositionend`. */
  let pending = false;
  return {
    request() {
      if (!open()) return;
      if (composing) {
        pending = true;
        return;
      }
      commit();
    },
    compositionStart() {
      if (open()) composing = true;
    },
    compositionEnd() {
      composing = false;
      if (pending) {
        pending = false;
        commit();
      }
    },
    composing: () => composing,
    reset() {
      composing = false;
      pending = false;
    },
  };
}
