/**
 * Rangée « Format » (C7b, R13-R15, DAR4) : outil Texte ou Tableau ; G, I, S, quatre tailles, « Défaut » puis quatre
 * pastilles ; grisée hors séance de saisie (`textFormat` nul), sans changer de hauteur. Chaque bouton empêche
 * `pointerdown` et `mousedown` : la zone de saisie garde focus et sélection, et la perte du focus ne valide pas.
 * Boutons seulement (aucun champ qui prendrait le focus). Hors du catalogue de l'éditeur de profils.
 */
import { For, Show, type Accessor, type JSX } from "solid-js";
import type { FormatAction, FormatState } from "../engine/rich-edit";
import { TEXT_SIZES } from "../engine/text-layout";
import type { ToolbarView } from "./item-state";

export interface TextColor {
  readonly id: string;
  readonly label: string;
  /** null : « Défaut », l'attribut est retiré (couleur de l'élément). */
  readonly color: string | null;
}

/** Couleurs de la barre (R14) : les trois du stylo, plus un vert contrasté sur fond blanc. */
export const TEXT_COLORS: readonly TextColor[] = [
  { id: "defaut", label: "Défaut", color: null },
  { id: "noir", label: "Noir", color: "#000000" },
  { id: "rouge", label: "Rouge", color: "#dc2626" },
  { id: "bleu", label: "Bleu", color: "#1d4ed8" },
  { id: "vert", label: "Vert", color: "#15803d" },
];

/** Outils (choix du moteur) dont la rangée est montrée. */
export const FORMAT_TOOLS: readonly string[] = ["text", "table"];

interface Toggle {
  readonly id: "bold" | "italic" | "underline";
  readonly label: string;
  readonly name: string;
}
const TOGGLES: readonly Toggle[] = [
  { id: "bold", label: "G", name: "Gras" },
  { id: "italic", label: "I", name: "Italique" },
  { id: "underline", label: "S", name: "Souligné" },
];

/** Le bouton ne prend jamais le focus (R13). */
const keep = (e: Event): void => e.preventDefault();

export function FormatRow(props: { view: Accessor<ToolbarView>; act: (a: FormatAction) => void }): JSX.Element {
  const st = (): FormatState | null => props.view().textFormat ?? null;
  const off = (): boolean => st() === null;
  return (
    <Show when={FORMAT_TOOLS.includes(props.view().tool)}>
      <span class="rb-sep" role="separator" data-format-sep />
      <For each={TOGGLES}>
        {(t) => (
          <button
            type="button"
            class="rb-format"
            data-format={t.id}
            aria-label={t.name}
            title={t.name}
            aria-pressed={st()?.[t.id] === true}
            disabled={off()}
            onPointerDown={keep}
            onMouseDown={keep}
            onClick={() => props.act({ type: t.id })}
          >
            {t.label}
          </button>
        )}
      </For>
      <For each={TEXT_SIZES}>
        {(size) => (
          <button
            type="button"
            class="rb-format"
            data-format-size={String(size)}
            aria-label={`Taille ${size}`}
            title={`Taille ${size}`}
            aria-pressed={st()?.size === size}
            disabled={off()}
            onPointerDown={keep}
            onMouseDown={keep}
            onClick={() => props.act({ type: "size", size })}
          >
            {size}
          </button>
        )}
      </For>
      <For each={TEXT_COLORS}>
        {(c) => (
          <button
            type="button"
            class="rb-preset rb-format"
            data-format-color={c.id}
            aria-label={c.label}
            title={c.label}
            aria-pressed={st()?.color === (c.color ?? "default")}
            disabled={off()}
            onPointerDown={keep}
            onMouseDown={keep}
            onClick={() => props.act({ type: "color", color: c.color })}
          >
            <span class="rb-swatch" aria-hidden="true" style={{ "background-color": c.color ?? "transparent" }} />
            {c.label}
          </button>
        )}
      </For>
    </Show>
  );
}
