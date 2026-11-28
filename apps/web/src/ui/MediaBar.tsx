/**
 * Commandes du média (C14, M22, DAM5), dans la section Média du panneau d'options (OG34 : au design des îlots, icônes Lucide).
 * Lecture/Pause, position, rognage (« Début ici », « Fin ici », « Tout garder »), boucle, volume. Chaque réglage est un
 * seul appel `set` avec l'état complet ; le volume n'est écrit qu'au relâché (`change`, M23). Un refus du cœur est
 * affiché tel quel (`error`). L'état de lecture vient des `controls` ; il est relu à chaque tic de rafraîchissement.
 */
import { createEffect, createSignal, on, onCleanup, Show, type JSX } from "solid-js";
import { Icon, IconButton, LabelButton } from "./IconButton";
import { panelKeyDown } from "./panel-keys";

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
  createEffect(on(() => props.media, (m) => {
    setSettings(settingsOf(m));
    setError(null);
  }, { defer: true }));
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
  const playing = (): boolean => status() === "lecture";
  // Volume montré pendant le glisser (l'écriture n'a lieu qu'au relâché, M23).
  const [volume, setVolume] = createSignal<number | null>(null);
  const shownVolume = (): number => volume() ?? Math.round(settings().volume * VOLUME_MAX);
  const start = (): void => apply({ ...settings(), trimStart: here() });
  const end = (): void => apply({ ...settings(), trimEnd: here() });
  const keep = (): void => apply({ ...settings(), trimStart: 0, trimEnd: null });
  const loop = (): void => apply({ ...settings(), loop: !settings().loop });
  // OG34 : raccourcis de la barre (focus dans la barre) ; Entrée reste celle du bouton qui a le focus.
  const onKeyDown = panelKeyDown({
    k: () => (status() === "echec" ? false : props.controls.toggle()),
    d: start,
    f: end,
    g: keep,
    b: loop,
  });
  return (
    <div role="group" aria-label="Commandes du média" data-media-bar class="rb-mbar" onKeyDown={onKeyDown}>
      <div class="rb-mbar-row">
        <IconButton
          icon={playing() ? "pause" : "play"}
          label={playing() ? "Pause" : "Lecture"}
          shortcut={{ text: "K", aria: "K" }}
          disabled={status() === "echec"}
          attrs={{ "data-media": "toggle", class: "rb-opt-btn" }}
          onPress={() => props.controls.toggle()}
        />
        <span data-media="time" class="rb-mbar-time">{`${clock(time())} / ${clock(props.media.duration)}`}</span>
      </div>
      <input
        type="range"
        data-media="position"
        class="rb-mbar-pos"
        aria-label="Position"
        aria-valuetext={`${clock(time())} sur ${clock(props.media.duration)}`}
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
      <div class="rb-mbar-trim">
        <LabelButton icon="arrow-right-to-line" label="Début ici" keys="D" attrs={{ "data-media": "start" }} onPress={start} />
        <LabelButton icon="arrow-left-to-line" label="Fin ici" keys="F" attrs={{ "data-media": "end" }} onPress={end} />
        <LabelButton icon="move-horizontal" label="Tout garder" keys="G" attrs={{ "data-media": "keep" }} onPress={keep} />
      </div>
      <LabelButton icon="repeat" label="Boucle" look="toggle" keys="B" pressed={settings().loop} attrs={{ "data-media": "loop" }} onPress={loop} />
      <label class="rb-opacity" data-media-volume>
        <Icon name="volume-2" />
        <input
          type="range"
          data-media="volume"
          aria-label="Volume"
          min={0}
          max={VOLUME_MAX}
          step={1}
          value={Math.round(settings().volume * VOLUME_MAX)}
          onInput={(e) => setVolume(Number(e.currentTarget.value))}
          onChange={(e) => {
            setVolume(null);
            apply({ ...settings(), volume: Number(e.currentTarget.value) / VOLUME_MAX });
          }}
        />
        <output>{`${shownVolume()} %`}</output>
      </label>
      <Show when={status() === "echec"}>
        <span data-media="failed" class="rb-mbar-note" data-tone="error">{MEDIA_FAILED_LABEL}</span>
      </Show>
      <Show when={error()}>
        {(m) => (
          <span data-media="error" class="rb-mbar-note" data-tone="error" role="status">
            {m()}
          </span>
        )}
      </Show>
    </div>
  );
}
