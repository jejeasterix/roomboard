import { Show, onMount, type JSX } from "solid-js";
import { Icon } from "./IconButton";
import { currentToast, type ToastMessage } from "./toast";

/** Icône de la pastille (Lucide check, maquette 02 `i-check`). */
const TOAST_ICON = "check";

function Toast(props: { message: ToastMessage }): JSX.Element {
  let el: HTMLDivElement | undefined;
  // § 10 : le bandeau est calé à droite ; sa largeur, donnée par le texte, est fractionnaire et déplaçait la pastille
  // hors de la grille de pixels. Largeur arrondie au px CSS supérieur : bord gauche, pastille et icône entiers.
  // La largeur posée est la largeur de bordure (`getBoundingClientRect().width` inclut le rembourrage) : elle suppose
  // `box-sizing: border-box` sur `.rb-toast` (règle ajoutée dans `rb.css` par T7).
  onMount(() => {
    const w = el?.getBoundingClientRect().width ?? 0;
    if (el !== undefined && w > 0) el.style.inlineSize = `${Math.ceil(w)}px`;
  });
  return (
    <div class="rb-toast" ref={el}>
      <span class="rb-toast-ok" aria-hidden="true">
        <Icon name={TOAST_ICON} />
      </span>
      <span class="rb-toast-text">
        <span data-toast-text>{props.message.text}</span>
        <Show when={props.message.strong}>
          {(s) => (
            <>
              {" "}
              <b>{s()}</b>
            </>
          )}
        </Show>
      </span>
    </div>
  );
}

/** Bandeau des avis non modaux (design-l4, L4-16) : conteneur `role="status"` toujours monté, un avis à la fois. */
export function Toasts(): JSX.Element {
  return (
    <div class="rb-toasts" role="status">
      <Show when={currentToast()} keyed>
        {(m) => <Toast message={m} />}
      </Show>
    </div>
  );
}
