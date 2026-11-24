import { createSignal, getOwner, onCleanup, type Accessor } from "solid-js";

// Infobulle des boutons à icône (cadrage design-l1, L1-4, H1) : survol à la souris, focus clavier, appui long au doigt
// ou au stylet. L'appui long n'annule pas le clic : l'outil est choisi au relâcher, comme avant. Le focus clavier est
// celui que le navigateur marque `:focus-visible` : l'appelant ne transmet que celui-là (`IconButton.tsx`).

export const TIP_HOVER_MS = 400;
export const TIP_HOLD_MS = 500;
export const TIP_LINGER_MS = 1500;
/** Écart entre le bouton et l'infobulle (`--rf-space-sm`). */
export const TIP_GAP = 8;

export interface TipOptions { readonly hoverMs?: number; readonly holdMs?: number; readonly lingerMs?: number }
export interface Tip {
  readonly shown: Accessor<boolean>;
  enter(): void;
  leave(): void;
  down(pointerType: string): void;
  up(): void;
  /** Focus clavier (`:focus-visible`, vérifié par l'appelant) ; sans effet s'il suit un appui. */
  focus(): void;
  /** `pageKeepsFocus` faux quand la fenêtre perd le focus : le focus rendu au retour suit toujours l'appui d'avant. */
  blur(pageKeepsFocus?: boolean): void;
}

/** Infobulle montrée : une seule pour toute la page. */
const [current, setCurrent] = createSignal<symbol | null>(null);

export function createTip(opts: TipOptions = {}): Tip {
  const hoverMs = opts.hoverMs ?? TIP_HOVER_MS;
  const holdMs = opts.holdMs ?? TIP_HOLD_MS;
  const lingerMs = opts.lingerMs ?? TIP_LINGER_MS;
  const id = Symbol("tip");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let holding = false;
  /** Le focus qui suit un appui n'est pas un focus clavier, ni celui que le navigateur rend au retour dans la fenêtre. */
  let byPointer = false;
  /** Le bouton a le focus : sans lui (WebKit ne focalise pas au clic), `up()` rend la main au clavier. */
  let focused = false;
  const clear = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const show = (): void => {
    clear();
    setCurrent(id);
  };
  const hide = (): void => {
    clear();
    if (current() === id) setCurrent(null);
  };
  const after = (ms: number, then: () => void): void => {
    clear();
    timer = setTimeout(() => {
      timer = undefined;
      then();
    }, ms);
  };
  if (getOwner() !== null) onCleanup(hide);
  return {
    shown: () => current() === id,
    enter: () => {
      if (!holding) after(hoverMs, show);
    },
    leave: () => {
      if (!holding) hide();
    },
    down: (pointerType) => {
      byPointer = true;
      if (pointerType === "mouse") {
        hide();
        return;
      }
      holding = true;
      after(holdMs, show);
    },
    up: () => {
      if (!focused) byPointer = false;
      if (!holding) return;
      holding = false;
      if (current() === id) after(lingerMs, hide);
      else clear();
    },
    focus: () => {
      focused = true;
      if (!byPointer) show();
    },
    blur: (pageKeepsFocus = true) => {
      focused = false;
      if (pageKeepsFocus) byPointer = false;
      holding = false;
      hide();
    },
  };
}

export interface TipAnchor { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
export interface TipSize { readonly width: number; readonly height: number }

/** Sous le bouton, centrée ; au-dessus s'il manque la place ; bornée à la fenêtre ; px entiers (aucun transform). */
export function placeTip(anchor: TipAnchor, tip: TipSize, view: TipSize, gap = TIP_GAP): { left: number; top: number } {
  const below = anchor.bottom + gap;
  const top = below + tip.height <= view.height ? below : anchor.top - gap - tip.height;
  const centered = (anchor.left + anchor.right - tip.width) / 2;
  const left = Math.min(Math.max(0, centered), Math.max(0, view.width - tip.width));
  return { left: Math.round(left), top: Math.round(Math.max(0, top)) };
}
