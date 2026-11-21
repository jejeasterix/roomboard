/**
 * Barre flottante d'un objet 3D (C15, X24, DAM5 de C14) : posée sur la scène (l'enveloppe d'App porte
 * `.rb-popover .rb-media-bar`), jamais une rangée permanente. « Tourner » (bascule), « Vue initiale », état et message.
 * L'état vient des `controls`, relu à chaque tic de rafraîchissement (comme `MediaBar`).
 */
import { createSignal, onCleanup, Show, type JSX } from "solid-js";

export type Model3dBarStatus = "instantane" | "chargement" | "orbite" | "sans-webgl" | "echec";

export interface Model3dControls {
  status(): Model3dBarStatus;
  /** Message à montrer (« 3D indisponible sur ce poste… », lecture impossible) ; null : aucun. */
  message(): string | null;
  toggle(): void;
  reset(): void;
}

export interface Model3dBarProps {
  readonly name: string;
  readonly controls: Model3dControls;
}

export const LOADING_LABEL = "Chargement…";
const REFRESH_MS = 250;

export function Model3dBar(props: Model3dBarProps): JSX.Element {
  const [tick, setTick] = createSignal(0);
  const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
  onCleanup(() => clearInterval(timer));
  const status = (): Model3dBarStatus => (tick(), props.controls.status());
  const message = (): string | null => (tick(), props.controls.message());
  const blocked = (): boolean => status() === "sans-webgl" || status() === "echec" || status() === "chargement";
  return (
    <div role="group" aria-label="Commandes de l'objet 3D" data-model3d-bar>
      <div class="rb-media-bar-inner">
        <span data-model3d="name">{props.name}</span>
        <button type="button" data-model3d="orbit" aria-pressed={status() === "orbite"} disabled={blocked()} onClick={() => props.controls.toggle()}>
          Tourner
        </button>
        <button type="button" data-model3d="reset" disabled={blocked()} onClick={() => props.controls.reset()}>
          Vue initiale
        </button>
        <Show when={status() === "chargement"}>
          <span data-model3d="status" role="status">
            {LOADING_LABEL}
          </span>
        </Show>
        <Show when={message()}>
          {(m) => (
            <span data-model3d="message" role="status">
              {m()}
            </span>
          )}
        </Show>
      </div>
    </div>
  );
}
