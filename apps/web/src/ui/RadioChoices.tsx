/**
 * Choix exclusif (design-l3, L3-23, DA-L3-2) : `role="radiogroup"` de boutons `role="radio"`, un seul arrêt de
 * tabulation (le bouton choisi, sinon le premier), flèches gauche / haut et droite / bas qui déplacent focus et choix
 * (bouclent aux bouts). Cinq aspects : cartes (démarrage), vignettes (emplacement), segments (taille, barre), rail et puces
 * (sections et thèmes de la fenêtre des fonds, styles dans `backgrounds.css`).
 * `data-edit` sur le groupe et `data-choice` sur chaque bouton : les sélecteurs des tests et des essais.
 */
import { For, Show, type JSX } from "solid-js";
import { Icon, TipBubble, tipPointerHandlers } from "./IconButton";
import { createTip } from "./tooltip";

export interface RadioOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: string;
  readonly detail?: string;
  /** Infobulle du segment (survol, focus clavier, appui long), comme un `IconButton` ; absente : pas de bulle. */
  readonly tip?: string;
}

/** Focus clavier au sens du navigateur (`:focus-visible`) ; sélecteur inconnu : l'infobulle décide seule. */
function focusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

export interface RadioChoicesProps<T extends string> {
  /** Posé en `data-edit` sur le groupe. */
  readonly name: string;
  /** Nom du groupe pour les lecteurs d'écran (`aria-label`). */
  readonly label: string;
  readonly look: "card" | "tile" | "segment" | "rail" | "chips";
  readonly options: readonly RadioOption<T>[];
  /** `null` : valeur mixte ou hors liste (OG11), aucun bouton enfoncé, le premier reste tabulable. */
  readonly value: T | null;
  /** Attribut posé sur chaque bouton avec sa valeur (sélecteur d'essai) ; `data-choice` reste. */
  readonly valueAttr?: string;
  /** Groupe grisé (OG11 lot 2 : Police et Taille pendant une saisie) : boutons `disabled`, hors tabulation. */
  readonly disabled?: boolean;
  /** Un appui ne prend pas le focus (pointerdown et mousedown annulés) : la zone de saisie du texte le garde (T31). */
  readonly keepFocus?: boolean;
  choose(v: T): void;
}

/** Flèche → pas dans la liste (table : aucune autre touche n'agit). */
const STEP: Readonly<Record<string, -1 | 1>> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

export function RadioChoices<T extends string>(props: RadioChoicesProps<T>): JSX.Element {
  let group: HTMLDivElement | undefined;
  const keep = (e: Event): void => { if (props.keepFocus === true) e.preventDefault(); };
  const known = (): boolean => props.value !== null && props.options.some((o) => o.value === props.value);
  const onKey = (e: KeyboardEvent, index: number): void => {
    if (!Object.hasOwn(STEP, e.key)) return;
    e.preventDefault();
    const n = props.options.length;
    const rank = (index + STEP[e.key]! + n) % n;
    const next = props.options[rank];
    if (next === undefined) return;
    props.choose(next.value);
    // Par rang : une valeur n'entre jamais dans un sélecteur CSS.
    queueMicrotask(() => group?.querySelectorAll<HTMLElement>('[role="radio"]')[rank]?.focus());
  };
  return (
    <div ref={group} class="rb-radios" role="radiogroup" aria-label={props.label} data-edit={props.name} data-look={props.look}>
      <For each={props.options}>
        {(o, i) => {
          const on = (): boolean => o.value === props.value;
          const tip = createTip();
          let button: HTMLButtonElement | undefined;
          const hasTip = (): boolean => o.tip !== undefined;
          return (
            <>
            <button
              ref={button}
              type="button"
              class="rb-radio"
              role="radio"
              aria-checked={on()}
              disabled={props.disabled === true}
              tabIndex={on() || (i() === 0 && !known()) ? 0 : -1}
              data-choice={o.value}
              {...(props.valueAttr ? { [props.valueAttr]: o.value } : {})}
              {...(hasTip() ? tipPointerHandlers(tip) : {})}
              onPointerDown={(e) => { keep(e); if (hasTip()) tip.down(e.pointerType); }}
              onMouseDown={keep}
              onClick={() => props.choose(o.value)}
              onKeyDown={(e) => onKey(e, i())}
              onFocus={(e) => { if (hasTip() && focusVisible(e.currentTarget)) tip.focus(); }}
              onBlur={() => { if (hasTip()) tip.blur(document.hasFocus()); }}
            >
              <Show when={props.look === "card" && on()}>
                <span class="rb-radio-chk">
                  <Icon name="check" />
                </span>
              </Show>
              <Show when={o.icon}>{(name) => <Icon name={name()} />}</Show>
              <span class="rb-radio-label">{o.label}</span>
              <Show when={o.detail}>{(d) => <span class="rb-radio-detail">{d()}</span>}</Show>
            </button>
            <Show when={o.tip}>{(label) => <TipBubble tip={tip} label={label()} anchor={() => button!} />}</Show>
            </>
          );
        }}
      </For>
    </div>
  );
}
