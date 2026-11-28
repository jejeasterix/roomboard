/**
 * Commandes d'un objet 3D (C15, X24, DAM5 de C14), dans la section Objet 3D du panneau d'options (OG34). « Tourner » (bascule), « Vue initiale », état et message.
 * L'état vient des `controls`, relu à chaque tic de rafraîchissement (comme `MediaBar`).
 */
import { createSignal, onCleanup, Show, type JSX } from "solid-js";
import { LabelButton } from "./IconButton";
import { panelKeyDown } from "./panel-keys";

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
  /** « Tourner » : un échec de lecture se retente (morceau de rendu manqué une fois) ; l'absence de WebGL, non (C3). */
  const noTurn = (): boolean => status() === "sans-webgl" || status() === "chargement";
  const onKeyDown = panelKeyDown({
    t: () => (noTurn() ? false : props.controls.toggle()),
    v: () => (blocked() ? false : props.controls.reset()),
  });
  return (
    <div role="group" aria-label="Commandes de l'objet 3D" data-model3d-bar class="rb-mbar" onKeyDown={onKeyDown}>
      <span data-model3d="name" class="rb-mbar-name">{props.name}</span>
      <div class="rb-opt-stack">
        <LabelButton icon="rotate-3d" label="Tourner" look="toggle" keys="T" pressed={status() === "orbite"} disabled={noTurn()} attrs={{ "data-model3d": "orbit" }} onPress={() => props.controls.toggle()} />
        <LabelButton icon="scan" label="Vue initiale" keys="V" disabled={blocked()} attrs={{ "data-model3d": "reset" }} onPress={() => props.controls.reset()} />
      </div>
      <Show when={status() === "chargement"}>
        <span data-model3d="status" class="rb-mbar-note" role="status">
          {LOADING_LABEL}
        </span>
      </Show>
      <Show when={message()}>
        {(m) => (
          <span data-model3d="message" class="rb-mbar-note" role="status">
            {m()}
          </span>
        )}
      </Show>
    </div>
  );
}
