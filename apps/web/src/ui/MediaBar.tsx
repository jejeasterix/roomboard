/**
 * Barre flottante du média (C14, M22, DAM5) : posée sur la scène (l'enveloppe d'App porte `.rb-media-bar`), jamais une rangée permanente.
 * Lecture/Pause, position, rognage (« Début ici », « Fin ici », « Tout garder »), boucle, volume. Chaque réglage est un
 * seul appel `set` avec l'état complet ; le volume n'est écrit qu'au relâché (`change`, M23). Un refus du cœur est
 * affiché tel quel (`error`). L'état de lecture vient des `controls` ; il est relu à chaque tic de rafraîchissement.
 */
import { createEffect, createSignal, on, onCleanup, Show, type JSX } from "solid-js";

export type MediaBarStatus = "poster" | "lecture" | "pause" | "echec";

export interface MediaBarMedia {
  readonly mediaType: "video" | "audio";
  readonly duration: number;
  readonly trimStart: number;
  readonly trimEnd: number | null;
  readonly loop: boolean;
  readonly volume: number;
}

export interface MediaSettings {
  readonly trimStart: number;
  readonly trimEnd: number | null;
  readonly loop: boolean;
  readonly volume: number;
}

export interface MediaControls {
  status(): MediaBarStatus;
  time(): number;
  toggle(): void;
  seek(t: number): void;
  /** Écrit les réglages ; rend le message du refus du cœur, ou null s'ils sont écrits. */
  set(settings: MediaSettings): string | null;
}

export interface MediaBarProps {
  readonly media: MediaBarMedia;
  readonly controls: MediaControls;
}

export const MEDIA_FAILED_LABEL = "lecture impossible sur ce poste";

/** Période de relecture de l'état du lecteur, en ms. */
const REFRESH_MS = 250;
const POSITION_STEP = 0.1;
const VOLUME_MAX = 100;

/** « m:ss » ; non fini ou négatif : « 0:00 ». */
export function clock(t: number): string {
  const s = Number.isFinite(t) && t > 0 ? Math.floor(t) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const percent = (t: number, duration: number): string => `${duration > 0 ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0}%`;

export function MediaBar(props: MediaBarProps): JSX.Element {
  const settingsOf = (m: MediaBarMedia): MediaSettings => ({ trimStart: m.trimStart, trimEnd: m.trimEnd, loop: m.loop, volume: m.volume });
  const [settings, setSettings] = createSignal<MediaSettings>(settingsOf(props.media));
  createEffect(on(() => props.media, (m) => setSettings(settingsOf(m)), { defer: true }));
  const [error, setError] = createSignal<string | null>(null);
  const [tick, setTick] = createSignal(0);
  const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
  onCleanup(() => clearInterval(timer));
  const status = (): MediaBarStatus => (tick(), props.controls.status());
  const time = (): number => (tick(), props.controls.time());
  /** Un réglage = un `set` avec l'état complet ; l'état local ne suit que si le cœur accepte. */
  const apply = (next: MediaSettings): void => {
    const refused = props.controls.set(next);
    setError(refused);
    if (refused === null) setSettings(next);
  };
  const here = (): number => Math.round(time() * 1000) / 1000;
  return (
    <div role="group" aria-label="Commandes du média" data-media-bar>
      <div class="rb-media-bar-inner">
        <button type="button" data-media="toggle" disabled={status() === "echec"} onClick={() => props.controls.toggle()}>
          {status() === "lecture" ? "Pause" : "Lecture"}
        </button>
        <input
          type="range"
          data-media="position"
          aria-label="Position"
          min={0}
          max={props.media.duration}
          step={POSITION_STEP}
          value={time()}
          style={{
            "--rb-trim-start": percent(settings().trimStart, props.media.duration),
            "--rb-trim-end": percent(settings().trimEnd ?? props.media.duration, props.media.duration),
          }}
          onInput={(e) => props.controls.seek(Number(e.currentTarget.value))}
        />
        <span data-media="time">{`${clock(time())} / ${clock(props.media.duration)}`}</span>
        <button type="button" data-media="start" onClick={() => apply({ ...settings(), trimStart: here() })}>
          Début ici
        </button>
        <button type="button" data-media="end" onClick={() => apply({ ...settings(), trimEnd: here() })}>
          Fin ici
        </button>
        <button type="button" data-media="keep" onClick={() => apply({ ...settings(), trimStart: 0, trimEnd: null })}>
          Tout garder
        </button>
        <button type="button" data-media="loop" aria-pressed={settings().loop} onClick={() => apply({ ...settings(), loop: !settings().loop })}>
          Boucle
        </button>
        <input
          type="range"
          data-media="volume"
          aria-label="Volume"
          min={0}
          max={VOLUME_MAX}
          step={1}
          value={Math.round(settings().volume * VOLUME_MAX)}
          onChange={(e) => apply({ ...settings(), volume: Number(e.currentTarget.value) / VOLUME_MAX })}
        />
        <Show when={status() === "echec"}>
          <span data-media="failed">{MEDIA_FAILED_LABEL}</span>
        </Show>
        <Show when={error()}>
          {(m) => (
            <span data-media="error" role="status">
              {m()}
            </span>
          )}
        </Show>
      </div>
    </div>
  );
}
