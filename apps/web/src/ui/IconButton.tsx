import { For, Show, children, createEffect, createSignal, type JSX } from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { ICONS, ICON_VIEWBOX } from "./icons";
import { createTip, placeTip, type Tip } from "./tooltip";

/** Attributs d'accessibilité du svg (L1-4) : jamais annoncé, jamais focusable. */
const SVG_A11Y = { "aria-hidden": "true", focusable: "false" } as const;

/** Focus clavier au sens du navigateur (L1-4, `:focus-visible`) ; sélecteur inconnu : le drapeau d'appui de
 *  `createTip` décide seul. */
function focusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

/** Icône de la table `ICONS` (L1-1) : tracés rendus par `Dynamic` dans un `<svg>`, jamais par une chaîne HTML. */
export function Icon(props: { name: string }): JSX.Element {
  const node = () => (Object.hasOwn(ICONS, props.name) ? ICONS[props.name]! : []);
  return (
    <svg
      class="rb-icon"
      data-icon={props.name}
      viewBox={ICON_VIEWBOX}
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      {...SVG_A11Y}
    >
      <For each={node()}>{([tag, attrs]) => <Dynamic component={tag as string} {...attrs} />}</For>
    </svg>
  );
}

/** Infobulle posée en px entiers sous son bouton (L1-4) ; recalculée quand le libellé change ; exportée pour la zone de
 *  dépôt (design-l4, L4-11). */
export function Bubble(props: { label: string; anchor: HTMLElement }): JSX.Element {
  let el: HTMLDivElement | undefined;
  const [at, setAt] = createSignal<{ left: number; top: number } | null>(null);
  createEffect(() => {
    void props.label;
    if (el === undefined) return;
    const size = el.getBoundingClientRect();
    setAt(placeTip(props.anchor.getBoundingClientRect(), { width: size.width, height: size.height }, { width: window.innerWidth, height: window.innerHeight }));
  });
  return (
    <div
      ref={el}
      class="rb-tip"
      role="tooltip"
      style={at() === null ? { visibility: "hidden" } : { left: `${at()!.left}px`, top: `${at()!.top}px` }}
    >
      {props.label}
    </div>
  );
}

/** Gestionnaires de pointeur de l'infobulle (survol à la souris, appui long au toucher), communs à tout élément à infobulle. */
export function tipPointerHandlers(tip: Tip) {
  return {
    onPointerEnter: (e: PointerEvent): void => {
      if (e.pointerType === "mouse") tip.enter();
    },
    onPointerLeave: (e: PointerEvent): void => {
      if (e.pointerType === "mouse") tip.leave();
    },
    onPointerDown: (e: PointerEvent): void => tip.down(e.pointerType),
    onPointerUp: (): void => tip.up(),
    onPointerCancel: (): void => tip.up(),
  };
}

/** Bulle montrée dans `body` tant que l'infobulle est affichée ; `anchor` est lu à l'affichage (l'élément existe alors). */
export function TipBubble(props: { tip: Tip; label: string; anchor: () => HTMLElement }): JSX.Element {
  return (
    <Show when={props.tip.shown()}>
      <Portal>
        <Bubble label={props.label} anchor={props.anchor()} />
      </Portal>
    </Show>
  );
}

export interface IconButtonProps {
  readonly icon: string | null;
  readonly label: string;
  readonly pressed?: boolean | null;
  readonly disabled?: boolean;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly children?: JSX.Element;
  readonly onPress: () => void;
}

/** Bouton de barre (L1-4, L1-5) : icône ou pastille, `aria-label`, libellé en `rb-sr` (le `textContent` reste le libellé),
 *  infobulle maison dans `body`. Sans icône ni pastille : le libellé en texte, jamais un bouton vide. */
export function IconButton(props: IconButtonProps): JSX.Element {
  const tip = createTip();
  const kids = children(() => props.children);
  const graphic = (): boolean => (props.icon !== null && Object.hasOwn(ICONS, props.icon)) || kids.toArray().length > 0;
  const cls = (): string | undefined =>
    [props.attrs?.class, graphic() ? "rb-ib" : undefined].filter((c) => c !== undefined).join(" ") || undefined;
  let button: HTMLButtonElement | undefined;
  return (
    <>
      <button
        {...(props.attrs ?? {})}
        ref={button}
        type="button"
        class={cls()}
        aria-label={props.label}
        aria-pressed={props.pressed ?? undefined}
        disabled={props.disabled === true}
        onClick={() => props.onPress()}
        // Espace appartient au bouton (il le presse) : il n'atteint pas le moteur, qui en ferait la main du canevas.
        onKeyDown={(e) => {
          if (e.key === " ") e.stopPropagation();
        }}
        {...tipPointerHandlers(tip)}
        onFocus={(e) => {
          if (focusVisible(e.currentTarget)) tip.focus();
        }}
        onBlur={() => tip.blur(document.hasFocus())}
      >
        <Show when={graphic()} fallback={props.label}>
          <Show when={props.icon !== null && Object.hasOwn(ICONS, props.icon) ? props.icon : null} fallback={kids()}>
            {(name) => <Icon name={name()} />}
          </Show>
          <span class="rb-sr">{props.label}</span>
        </Show>
      </button>
      <TipBubble tip={tip} label={props.label} anchor={() => button!} />
    </>
  );
}
