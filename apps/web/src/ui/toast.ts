import { createSignal, type Accessor } from "solid-js";

// Avis non modal (cadrage design-l4, L4-16) : un seul à la fois pour toute la page, comme l'infobulle (`tooltip.ts`) ;
// montré `TOAST_MS`, remplacé par le suivant, effacé à l'entrée en annotation (`App.tsx`). Aucune boîte : il n'arrête rien.

export interface ToastMessage {
  readonly text: string;
  /** Partie en gras après le texte (« page N »). */
  readonly strong?: string;
}

export const TOAST_MS = 4000;

const [current, setCurrent] = createSignal<ToastMessage | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

/** Avis montré ; null : aucun. */
export const currentToast: Accessor<ToastMessage | null> = current;

const stop = (): void => {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
};

/** Montre `m` pendant `ms` (copie : un avis identique remonte le bandeau). */
export function showToast(m: ToastMessage, ms: number = TOAST_MS): void {
  stop();
  setCurrent({ ...m });
  timer = setTimeout(() => {
    timer = undefined;
    setCurrent(null);
  }, ms);
}

export function clearToast(): void {
  stop();
  setCurrent(null);
}
