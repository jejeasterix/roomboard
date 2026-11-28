/**
 * Panneau de la grille (C9 éditeur, E8, E9) : règle le premier niveau de la grille de la page montrée sur un brouillon
 * (`grid-edit.ts`) ; chaque saisie appelle `preview` (aperçu direct, rien n'est écrit). « Appliquer » rend la grille finale
 * (un seul `SetGrid` chez l'appelant) ; un refus revient en message, montré dans le panneau resté ouvert (CR6).
 * « Fermer sans appliquer » abandonne (CR9). `endPreview` est appelé au démontage, quel que soit le chemin (Appliquer,
 * Fermer sans appliquer, second clic sur « Grille », autre panneau, page, onglet ou version changés).
 *
 * OG69 (G1 à G3) : contrôles de la charte, au doigt d'abord (cibles de 48 px) : Type et Épaisseur en pastilles
 * (`RadioChoices`, flèches dans le groupe), Magnétisme en interrupteur (`role="switch"`, Espace, libellé compris dans la
 * cible). Clavier : focus sur Type à l'ouverture, Échap = Fermer sans appliquer, Entrée hors d'un champ de saisie ou d'un
 * bouton d'action = Appliquer. Un niveau trop dense au zoom courant est dit sous les réglages (`role="status"`).
 * Les choix de Type viennent de `kindOptions` : la galerie G6 n'aura qu'à changer leur aspect.
 */
import { createEffect, createMemo, createSignal, on, onCleanup, onMount, Show, type JSX } from "solid-js";
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
  spacingFieldText,
  spacingOf,
  toGrid,
  withColor,
  withKind,
  withLineWidth,
  withSnap,
  withSpacing,
  type GridDraft,
} from "../grid-edit";
import { RadioChoices, type RadioOption } from "./RadioChoices";

/** Message du pas trop fin (G3, D4). */
export const GRID_TOO_FINE_MESSAGE = "Trop fin à ce zoom : agrandissez la page ou le pas";
/** Indice de « Aucune » (D3) : pourquoi Pas, Couleur et Épaisseur sont grisés. */
export const GRID_OFF_HINT = "Choisissez un type pour régler le pas, la couleur et l'épaisseur.";

type KindChoice = (typeof GRID_CHOICES)[number];
/** Choix du Type, dans l'ordre de `GRID_CHOICES` (préparation de la galerie G6). */
export const kindOptions = (): readonly RadioOption<KindChoice>[] => GRID_CHOICES.map((k) => ({ value: k, label: GRID_KIND_LABELS[k] }));

export interface GridPanelProps {
  /** Grille du document à l'ouverture ; le brouillon en est une copie. */
  readonly initial: GridView | null;
  preview(grid: GridView | null): void;
  endPreview(): void;
  /** Écrit la grille ; rend le message du refus du cœur, ou null si elle est écrite. */
  apply(grid: GridView | null): string | null;
  cancel(): void;
  /** personnalisation-1b (Q21) : « Enregistrer comme fond » : la grille du brouillon va à « Mes fonds », rien n'est écrit
   *  dans le document. Absent : pas de bouton. */
  saveAsBackground?(grid: GridView): void;
  /** OG69 (G3) : vrai si le cœur saute un niveau de `grid`, trop dense au zoom courant ; absent : jamais. */
  tooFine?(grid: GridView | null): boolean;
  /** OG69 (G3) : appelle `cb` à chaque changement de vue (zoom) ; rend le désabonnement. Absent : vue fixe. */
  onView?(cb: () => void): () => void;
}

/** Entrée sur une cible de saisie ou un bouton d'action garde son rôle natif ; ailleurs (pastille, interrupteur, fond du
 *  panneau), elle applique (G1). */
const keepsEnter = (t: EventTarget | null): boolean => {
  if (!(t instanceof HTMLElement)) return false;
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return true;
  const role = t.getAttribute("role");
  return t instanceof HTMLButtonElement && role !== "radio" && role !== "switch";
};

export function GridPanel(props: GridPanelProps): JSX.Element {
  const initialDraft = draftOf(props.initial);
  const [draft, setDraft] = createSignal<GridDraft>(initialDraft);
  /** Épaisseur du document à l'ouverture : les choix ne suivent pas le brouillon (PC8). */
  const docWidth = initialDraft.lineWidth;
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
  const apply = (): void => {
    setError(props.apply(toGrid(draft())));
  };
  /** G3 : relu à chaque brouillon et à chaque changement de vue. */
  const [view, setView] = createSignal(0);
  onMount(() => {
    const stop = props.onView?.(() => setView((n) => n + 1));
    if (stop !== undefined) onCleanup(stop);
  });
  const tooFine = createMemo(() => {
    view();
    return props.tooFine?.(toGrid(draft())) === true;
  });
  let root: HTMLDivElement | undefined;
  const onKey = (e: KeyboardEvent): void => {
    if (e.isComposing || e.defaultPrevented) return;
    if (e.key === " " && e.target instanceof HTMLElement && e.target.getAttribute("role") === "switch") {
      // Espace bascule l'interrupteur (G2) : la fenêtre prend l'Espace pour la main (`main.ts`), il s'arrête ici.
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) e.target.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      props.cancel();
    } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey && !keepsEnter(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      apply();
    }
  };
  // G1 : focus sur Type (pastille choisie, sinon la première) à l'ouverture. Écoute native sur le panneau : Échap et
  // Entrée s'arrêtent ici, avant les écoutes du document et de la fenêtre (moteur, Aide), que la délégation de Solid
  // (posée sur le document) ne devancerait pas.
  onMount(() => {
    root?.querySelector<HTMLElement>('[data-grille="kind"] [role="radio"][tabindex="0"]')?.focus();
    root?.addEventListener("keydown", onKey);
    onCleanup(() => root?.removeEventListener("keydown", onKey));
  });
  const widths = createMemo(() => lineWidthOptions(docWidth).map((w) => ({ value: String(w), label: `${w} px` })));
  return (
    <div ref={root} id="grille" class="rb-editor rb-grid" role="group" aria-label="Grille de la page">
      <fieldset class="rb-grid-field" data-grille="kind">
        <legend>Type</legend>
        <RadioChoices
          name="grid-kind"
          label="Type"
          look="chips"
          options={kindOptions()}
          value={draft().kind === "other" ? null : (draft().kind as KindChoice)}
          choose={(k) => edit(withKind(draft(), k))}
        />
        <Show when={draft().kind === "other"}>
          <p class="rb-grid-note" data-grille="other">
            {OTHER_KIND_LABEL}
          </p>
        </Show>
      </fieldset>
      <Show when={draft().kind === "none"}>
        <p class="rb-grid-note" data-grille="hint">
          {GRID_OFF_HINT}
        </p>
      </Show>
      <div class="rb-grid-row">
        <label class="rb-grid-input">
          <span>Pas</span>
          <input
            type="number"
            data-grille="spacing"
            step="any"
            min={MIN_GRID_SPACING}
            max={MAX_GRID_SPACING}
            disabled={off()}
            ref={(el) => {
              // Réécrit seulement au changement de type (CR5) : la frappe en cours n'est ramenée qu'à la borne (G3).
              createEffect(on(kind, () => (el.value = String(draft().spacing))));
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              const bound = spacingFieldText(el.value);
              if (bound !== null) el.value = bound;
              edit(withSpacing(draft(), spacingOf(el.value)));
            }}
            onChange={(e) => (e.currentTarget.value = String(draft().spacing))}
          />
        </label>
        <label class="rb-grid-input">
          <span>Couleur</span>
          <input
            type="color"
            data-grille="color"
            value={colorInputValue(draft().color)}
            disabled={off()}
            onInput={(e) => edit(withColor(draft(), e.currentTarget.value))}
          />
        </label>
      </div>
      <fieldset class="rb-grid-field" data-grille="lineWidth" disabled={off()}>
        <legend>Épaisseur</legend>
        <RadioChoices
          name="grid-line-width"
          label="Épaisseur"
          look="segment"
          options={widths()}
          value={String(draft().lineWidth)}
          disabled={off()}
          choose={(w) => edit(withLineWidth(draft(), Number(w)))}
        />
      </fieldset>
      <button
        type="button"
        class="rb-grid-switch"
        role="switch"
        data-grille="snap"
        aria-checked={draft().snap}
        disabled={draft().kind === "none"}
        onClick={() => edit(withSnap(draft(), !draft().snap))}
      >
        <span>Magnétisme</span>
        <span class="rb-grid-knob" aria-hidden="true" />
      </button>
      <p class="rb-grid-status" data-grille="too-fine" role="status">
        {tooFine() ? GRID_TOO_FINE_MESSAGE : ""}
      </p>
      <div class="rb-editor-actions rb-grid-actions">
        <button type="button" class="rb-grid-primary" data-grille="apply" onClick={apply}>
          Appliquer
        </button>
        <Show when={props.saveAsBackground}>
          {(save) => (
            <button
              type="button"
              data-grille="save-background"
              disabled={off()}
              onClick={() => {
                const g = toGrid(draft());
                if (g !== null) save()(g);
              }}
            >
              Enregistrer comme fond
            </button>
          )}
        </Show>
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
