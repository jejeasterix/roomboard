/**
 * Panneau de retouche d'une image (C5, I25-I27, I31) : géométrie immédiate (Rogner, Retourner, Tourner : une étape
 * chacun, par la séance du moteur) ; luminosité, contraste et couleur transparente en brouillon, aperçu en direct, écrits
 * ensemble par « Valider » (une étape). OG34 : au design des îlots (jetons `--rf-*`, icônes Lucide, cibles de 44 px). Une écriture géométrique de la séance garde le brouillon ; toute autre écriture
 * (Valider, Rétablir, annuler, rétablir, ailleurs) le reprend du document. Démonté : la séance est fermée.
 */
import { createEffect, createMemo, createSignal, on, onCleanup, onMount, Show, untrack, type Accessor, type JSX } from "solid-js";
import type { ImageData, ImageParams } from "../core/api";
import { clean, flipShown, paramsOf, turnShown } from "../core/image-params";
import type { ImageEdit } from "../engine/tools/image-edit";
import { Icon, IconButton, LabelButton } from "./IconButton";
import { panelKeyDown } from "./panel-keys";
import { syncValue } from "./ProfileEditor";

/** Défauts du panneau (I12, I13, HC5-7). */
export const DEFAULT_TOLERANCE = 10;
export const DEFAULT_SOFT = 0;

export type SeedMode = "seed" | "contiguous" | "global";

export interface PixelDraft {
  readonly brightness: number;
  readonly contrast: number;
  /** Couleur piquée ; null : aucune couleur transparente. */
  readonly color: string | null;
  readonly tolerance: number;
  readonly soft: number;
  readonly contiguous: boolean;
  /** Mode de départ affiché : « Depuis le point touché », « Depuis les bords » ou « Global » (dérivé du document). */
  readonly mode: SeedMode;
  /** Pixel source de départ (mode « Depuis le point touché ») ; null : départ par les bords ou global. */
  readonly seed: { readonly x: number; readonly y: number } | null;
}

export function draftOf(i: ImageData | null): PixelDraft {
  const t = i?.transparent;
  const seed = t?.x !== undefined && t.y !== undefined ? { x: t.x, y: t.y } : null;
  const contiguous = t?.contiguous ?? true;
  return {
    brightness: i?.brightness ?? 0,
    contrast: i?.contrast ?? 0,
    color: t?.color ?? null,
    tolerance: t?.tolerance ?? DEFAULT_TOLERANCE,
    soft: t?.soft ?? DEFAULT_SOFT,
    contiguous,
    seed,
    mode: seed !== null ? "seed" : contiguous ? "contiguous" : "global",
  };
}

export function pixelParams(d: PixelDraft): ImageParams {
  return clean({
    brightness: d.brightness,
    contrast: d.contrast,
    ...(d.color === null ? {} : { transparent: { color: d.color, tolerance: d.tolerance, soft: d.soft, contiguous: d.contiguous, ...(d.seed === null ? {} : { x: d.seed.x, y: d.seed.y }) } }),
  });
}

export interface ImagePanelProps {
  /** Image du document, relue à chaque état (réactive) ; null : image disparue. */
  readonly image: Accessor<ImageData | null>;
  /** Version du document (réactive). */
  readonly version: Accessor<number>;
  /** Impulsion de l'état du moteur : le mode de la séance est relu à chaque état publié. */
  readonly tick: Accessor<unknown>;
  readonly edit: ImageEdit;
  close(): void;
  /** Joué une fois au montage : `crop` ouvre le rognage, `background` arme la pipette en mode « Depuis le point touché ». */
  readonly start?: "crop" | "background";
}

export function ImagePanel(props: ImagePanelProps): JSX.Element {
  const [draft, setDraft] = createSignal<PixelDraft>(draftOf(props.image()));
  const mode = createMemo(() => {
    props.tick();
    return props.edit.mode();
  });
  let disposed = false;
  onCleanup(() => {
    disposed = true;
    props.edit.close();
  });
  /**
   * Pipette : en mode « point touché », couleur et départ, et elle reste armée (chaque toucher pose le nouveau départ,
   * H8) jusqu'à Valider, Annuler ou un changement de mode ; sinon couleur seule (le départ est retiré), un toucher.
   */
  const pipette = (): void =>
    void props.edit.pickPoint().then((r) => {
      if (r === null || disposed) return;
      const d = draft();
      const seeded = d.mode === "seed";
      setPixels({ ...d, color: r.color, seed: seeded ? { x: r.x, y: r.y } : null });
      if (seeded) pipette();
    });
  /** Désarme la pipette si elle l'est (pickPoint sur une pipette armée la désarme). */
  const disarm = (): void => {
    if (props.edit.mode() === "pick") void props.edit.pickPoint();
  };
  onMount(() => {
    if (props.start === "crop") props.edit.startCrop();
    else if (props.start === "background") {
      setDraft({ ...draft(), mode: "seed" });
      pipette();
    }
  });
  let seen = untrack(props.version);
  createEffect(
    on(
      props.version,
      (v) => {
        // Le moteur publie un état à chaque pipette armée ou aperçu sans que le document change : sans nouvelle version, le brouillon (mode, départ) reste.
        if (v === seen) return;
        seen = v;
        if (!props.edit.keepsDraft(v)) setDraft(draftOf(props.image()));
      },
      { defer: true },
    ),
  );
  const setPixels = (next: PixelDraft): void => {
    setDraft(next);
    props.edit.preview(pixelParams(next));
  };
  const geometry = (next: (p: ImageParams) => ImageParams): void => {
    const i = props.image();
    if (i !== null) props.edit.geometry(next(paramsOf(i)));
  };
  const num = (e: { currentTarget: HTMLInputElement }): number => Number(e.currentTarget.value);
  const apply = (): void => {
    disarm();
    props.edit.commit(pixelParams(draft()));
  };
  /** Curseur d'un réglage : icône (Réglages seulement), libellé, valeur lue ; curseur de la Transparence du panneau d'options. */
  const range = (key: "brightness" | "contrast" | "tolerance" | "soft", label: string, icon: string | null, min: number): JSX.Element => (
    <label class="rb-imgedit-range">
      <Show when={icon}>{(name) => <Icon name={name()} />}</Show>
      <span class="rb-imgedit-label">{label}</span>
      <input type="range" min={min} max="100" step="1" data-image-input={key} value={draft()[key]} onInput={(e) => setPixels({ ...draft(), [key]: num(e) })} />
      <output>{draft()[key]}</output>
    </label>
  );
  // OG34 : raccourcis du panneau (focus dedans) ; Échap reste celui du moteur (rognage, pipette).
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.altKey && !e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      if (mode() === "crop") props.edit.finishCrop(true);
      else apply();
      return;
    }
    panelKeyDown({ i: () => (mode() === "pick" ? disarm() : pipette()) })(e);
  };
  const geo = (action: string, label: string, icon: string, next: (p: ImageParams) => ImageParams): JSX.Element => (
    <IconButton icon={icon} label={label} attrs={{ "data-image-action": action, class: "rb-opt-btn" }} onPress={() => geometry(next)} />
  );
  return (
    <div id="image-retouche" class="rb-imgedit" role="group" aria-label="Retouche de l'image" onKeyDown={onKeyDown}>
      <div class="rb-imgedit-head">
        <h2>Retouche de l'image</h2>
        <IconButton icon="close" label="Fermer" attrs={{ "data-image-action": "close", class: "rb-opt-btn" }} onPress={() => props.close()} />
      </div>
      <section class="rb-imgedit-sec" aria-label="Géométrie">
        <h3 class="rb-imgedit-h">Géométrie</h3>
        <Show
          when={mode() === "crop"}
          fallback={
            <div class="rb-pick-row">
              <IconButton icon="crop" label="Rogner" attrs={{ "data-image-action": "crop", class: "rb-opt-btn" }} onPress={() => props.edit.startCrop()} />
              {geo("flip-h", "Retourner horizontalement", "flip-horizontal", (p) => flipShown(p, "h"))}
              {geo("flip-v", "Retourner verticalement", "flip-vertical", (p) => flipShown(p, "v"))}
              {geo("turn-left", "Tourner à gauche", "rotate-ccw-square", (p) => turnShown(p, -1))}
              {geo("turn-right", "Tourner à droite", "rotate-cw-square", (p) => turnShown(p, 1))}
            </div>
          }
        >
          <div class="rb-opt-stack">
            <LabelButton icon="check" label="Valider le rognage" look="primary" keys="Control+Enter" attrs={{ "data-image-action": "crop-apply" }} onPress={() => props.edit.finishCrop(true)} />
            <LabelButton icon="close" label="Annuler" keys="Escape" attrs={{ "data-image-action": "crop-cancel" }} onPress={() => props.edit.finishCrop(false)} />
          </div>
        </Show>
      </section>
      <section class="rb-imgedit-sec" aria-label="Réglages">
        <h3 class="rb-imgedit-h">Réglages</h3>
        {range("brightness", "Luminosité", "sun", -100)}
        {range("contrast", "Contraste", "contrast", -100)}
      </section>
      <section class="rb-imgedit-sec" aria-label="Couleur transparente">
        <h3 class="rb-imgedit-h">Couleur transparente</h3>
        <div class="rb-imgedit-pick">
          <LabelButton icon="pipette" label="Pipette" look="toggle" keys="I" pressed={mode() === "pick"} attrs={{ "data-image-action": "pick" }} onPress={pipette} />
          <span
            class="rb-imgedit-swatch"
            data-image-color={draft().color ?? ""}
            data-empty={draft().color === null ? "" : undefined}
            style={draft().color === null ? {} : { background: draft().color! }}
          />
        </div>
        <label class="rb-imgedit-field">
          <span class="rb-imgedit-label">Départ</span>
          <span class="rb-imgedit-select">
            <select
              data-image-input="mode"
              ref={(el) => syncValue(el, () => draft().mode)}
              onChange={(e) => {
                const v = e.currentTarget.value as SeedMode;
                disarm();
                setPixels({ ...draft(), mode: v, contiguous: v !== "global", seed: v === "seed" ? draft().seed : null });
              }}
            >
              <option value="seed">Depuis le point touché</option>
              <option value="contiguous">Depuis les bords</option>
              <option value="global">Global</option>
            </select>
            <Icon name="chevron-down" />
          </span>
        </label>
        {range("tolerance", "Tolérance", null, 0)}
        {range("soft", "Plume", null, 0)}
      </section>
      <div class="rb-imgedit-foot">
        <LabelButton
          icon="undo"
          label="Annuler les réglages"
          attrs={{ "data-image-action": "cancel" }}
          onPress={() => {
            disarm();
            setDraft(draftOf(props.image()));
            props.edit.preview(null);
          }}
        />
        <LabelButton icon="rotate-ccw" label="Rétablir l'original" attrs={{ "data-image-action": "restore" }} onPress={() => props.edit.restore()} />
        <LabelButton icon="check" label="Valider" look="primary" keys="Control+Enter" attrs={{ "data-image-action": "apply" }} onPress={apply} />
      </div>
    </div>
  );
}
