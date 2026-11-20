/**
 * Panneau de la grille (C9 éditeur, E8, E9) : règle le premier niveau de la grille de la page montrée sur un brouillon
 * (`grid-edit.ts`) ; chaque saisie appelle `preview` (aperçu direct, rien n'est écrit). « Appliquer » rend la grille finale
 * (un seul `SetGrid` chez l'appelant) ; un refus revient en message, montré dans le panneau resté ouvert (CR6).
 * « Fermer sans appliquer » abandonne (CR9). `endPreview` est appelé au démontage, quel que soit le chemin (Appliquer,
 * Fermer sans appliquer, second clic sur « Grille », autre panneau, page, onglet ou version changés).
 */
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show, type JSX } from "solid-js";
import type { GridView } from "../core/api";
import {
  colorInputValue,
  draftOf,
  GRID_CHOICES,
  GRID_KIND_LABELS,
  lineWidthOptions,
  MAX_GRID_SPACING,
  MIN_GRID_SPACING,
  OTHER_KIND_LABEL,
  spacingOf,
  toGrid,
  withColor,
  withKind,
  withLineWidth,
  withSnap,
  withSpacing,
  type GridDraft,
} from "../grid-edit";
import { pick, syncValue } from "./ProfileEditor";

export interface GridPanelProps {
  /** Grille du document à l'ouverture ; le brouillon en est une copie. */
  readonly initial: GridView | null;
  preview(grid: GridView | null): void;
  endPreview(): void;
  /** Écrit la grille ; rend le message du refus du cœur, ou null si elle est écrite. */
  apply(grid: GridView | null): string | null;
  cancel(): void;
}


export function GridPanel(props: GridPanelProps): JSX.Element {
  const [draft, setDraft] = createSignal<GridDraft>(draftOf(props.initial));
  /** Épaisseur du document à l'ouverture : les choix ne suivent pas le brouillon (PC8). */
  const docWidth = draftOf(props.initial).lineWidth;
  const kind = createMemo(() => draft().kind);
  onCleanup(() => props.endPreview());
  /** Saisie acceptée : brouillon et aperçu ; refusée (même brouillon) : rien. */
  const edit = (next: GridDraft): void => {
    if (next === draft()) return;
    setDraft(next);
    props.preview(toGrid(next));
  };
  const off = (): boolean => draft().kind === "none" || draft().kind === "other";
  /** Dernier refus du cœur à « Appliquer » (CR6) ; effacé par l'essai suivant. */
  const [error, setError] = createSignal<string | null>(null);
  return (
    <div id="grille" class="rb-editor" role="group" aria-label="Grille de la page">
      <label>
        Type{" "}
        <select
          data-grille="kind"
          ref={(el) => syncValue(el, () => draft().kind)}
          onChange={(e) => {
            const k = pick(GRID_CHOICES, e.currentTarget.value);
            if (k !== undefined) edit(withKind(draft(), k));
          }}
        >
          <For each={GRID_CHOICES}>{(k) => <option value={k}>{GRID_KIND_LABELS[k]}</option>}</For>
          <Show when={draft().kind === "other"}>
            <option value="other" disabled>
              {OTHER_KIND_LABEL}
            </option>
          </Show>
        </select>
      </label>
      <label>
        Pas{" "}
        <input
          type="number"
          data-grille="spacing"
          step="any"
          min={MIN_GRID_SPACING}
          max={MAX_GRID_SPACING}
          disabled={off()}
          ref={(el) => {
            // Réécrit seulement au changement de type (CR5) : la frappe en cours n'est pas ramenée à la borne.
            createEffect(on(kind, () => (el.value = String(draft().spacing))));
          }}
          onInput={(e) => edit(withSpacing(draft(), spacingOf(e.currentTarget.value)))}
          onChange={(e) => (e.currentTarget.value = String(draft().spacing))}
        />
      </label>
      <label>
        Couleur{" "}
        <input
          type="color"
          data-grille="color"
          value={colorInputValue(draft().color)}
          disabled={off()}
          onInput={(e) => edit(withColor(draft(), e.currentTarget.value))}
        />
      </label>
      <label>
        Épaisseur{" "}
        <select
          data-grille="lineWidth"
          disabled={off()}
          ref={(el) => syncValue(el, () => String(draft().lineWidth))}
          onChange={(e) => edit(withLineWidth(draft(), Number(e.currentTarget.value)))}
        >
          <For each={lineWidthOptions(docWidth)}>{(w) => <option value={String(w)}>{`${w} px`}</option>}</For>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          data-grille="snap"
          checked={draft().snap}
          disabled={draft().kind === "none"}
          onChange={(e) => edit(withSnap(draft(), e.currentTarget.checked))}
        />{" "}
        Magnétisme
      </label>
      <div class="rb-editor-actions">
        <button type="button" data-grille="apply" onClick={() => setError(props.apply(toGrid(draft())))}>
          Appliquer
        </button>
        <button type="button" data-grille="cancel" onClick={() => props.cancel()}>
          Fermer sans appliquer
        </button>
      </div>
      <Show when={error()}>
        {(m) => (
          <p data-grille="error" role="alert">
            {m()}
          </p>
        )}
      </Show>
    </div>
  );
}
