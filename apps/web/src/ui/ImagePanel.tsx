/**
 * Panneau de retouche d'une image (C5, I25-I27, I31) : géométrie immédiate (Rogner, Retourner, Tourner : une étape
 * chacun, par la séance du moteur) ; luminosité, contraste et couleur transparente en brouillon, aperçu en direct, écrits
 * ensemble par « Valider » (une étape). Une écriture géométrique de la séance garde le brouillon ; toute autre écriture
 * (Valider, Rétablir, annuler, rétablir, ailleurs) le reprend du document. Démonté : la séance est fermée.
 */
import { createEffect, createMemo, createSignal, on, onCleanup, Show, type Accessor, type JSX } from "solid-js";
import type { ImageData, ImageParams } from "../core/api";
import { clean, flipShown, paramsOf, turnShown } from "../core/image-params";
import type { ImageEdit } from "../engine/tools/image-edit";
import { syncValue } from "./ProfileEditor";

/** Défauts du panneau (I12, I13, HC5-7). */
export const DEFAULT_TOLERANCE = 10;
export const DEFAULT_SOFT = 0;

export interface PixelDraft {
  readonly brightness: number;
  readonly contrast: number;
  /** Couleur piquée ; null : aucune couleur transparente. */
  readonly color: string | null;
  readonly tolerance: number;
  readonly soft: number;
  readonly contiguous: boolean;
}

export function draftOf(i: ImageData | null): PixelDraft {
  const t = i?.transparent;
  return {
    brightness: i?.brightness ?? 0,
    contrast: i?.contrast ?? 0,
    color: t?.color ?? null,
    tolerance: t?.tolerance ?? DEFAULT_TOLERANCE,
    soft: t?.soft ?? DEFAULT_SOFT,
    contiguous: t?.contiguous ?? true,
  };
}

export function pixelParams(d: PixelDraft): ImageParams {
  return clean({
    brightness: d.brightness,
    contrast: d.contrast,
    ...(d.color === null ? {} : { transparent: { color: d.color, tolerance: d.tolerance, soft: d.soft, contiguous: d.contiguous } }),
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
}

export function ImagePanel(props: ImagePanelProps): JSX.Element {
  const [draft, setDraft] = createSignal<PixelDraft>(draftOf(props.image()));
  const mode = createMemo(() => {
    props.tick();
    return props.edit.mode();
  });
  onCleanup(() => props.edit.close());
  createEffect(
    on(
      props.version,
      (v) => {
        if (!props.edit.keepsDraft(v)) setDraft(draftOf(props.image()));
      },
      { defer: true },
    ),
  );
  const edit = (next: PixelDraft): void => {
    setDraft(next);
    props.edit.preview(pixelParams(next));
  };
  const geometry = (next: (p: ImageParams) => ImageParams): void => {
    const i = props.image();
    if (i !== null) props.edit.geometry(next(paramsOf(i)));
  };
  const num = (e: { currentTarget: HTMLInputElement }): number => Number(e.currentTarget.value);
  return (
    <div id="image-retouche" class="rb-editor" role="group" aria-label="Retouche de l'image">
      <Show
        when={mode() === "crop"}
        fallback={
          <div class="rb-editor-actions">
            <button type="button" data-image-action="crop" onClick={() => props.edit.startCrop()}>Rogner</button>
            <button type="button" data-image-action="flip-h" onClick={() => geometry((p) => flipShown(p, "h"))}>Retourner ↔</button>
            <button type="button" data-image-action="flip-v" onClick={() => geometry((p) => flipShown(p, "v"))}>Retourner ↕</button>
            <button type="button" data-image-action="turn-left" onClick={() => geometry((p) => turnShown(p, -1))}>Tourner ⟲</button>
            <button type="button" data-image-action="turn-right" onClick={() => geometry((p) => turnShown(p, 1))}>Tourner ⟳</button>
          </div>
        }
      >
        <div class="rb-editor-actions">
          <button type="button" data-image-action="crop-apply" onClick={() => props.edit.finishCrop(true)}>Valider le rognage</button>
          <button type="button" data-image-action="crop-cancel" onClick={() => props.edit.finishCrop(false)}>Annuler</button>
        </div>
      </Show>
      <label>
        Luminosité{" "}
        <input type="range" min="-100" max="100" step="1" data-image-input="brightness" value={draft().brightness} onInput={(e) => edit({ ...draft(), brightness: num(e) })} />
      </label>
      <label>
        Contraste{" "}
        <input type="range" min="-100" max="100" step="1" data-image-input="contrast" value={draft().contrast} onInput={(e) => edit({ ...draft(), contrast: num(e) })} />
      </label>
      <fieldset>
        <legend>Couleur transparente</legend>
        <div class="rb-editor-actions">
          <button
            type="button"
            data-image-action="pick"
            aria-pressed={mode() === "pick"}
            onClick={() => void props.edit.pick().then((c) => c !== null && edit({ ...draft(), color: c }))}
          >
            Pipette
          </button>
          <span class="rb-swatch" data-image-color={draft().color ?? ""} style={{ background: draft().color ?? "transparent" }} />
        </div>
        <label>
          Tolérance{" "}
          <input type="range" min="0" max="100" step="1" data-image-input="tolerance" value={draft().tolerance} onInput={(e) => edit({ ...draft(), tolerance: num(e) })} />
        </label>
        <label>
          Plume{" "}
          <input type="range" min="0" max="100" step="1" data-image-input="soft" value={draft().soft} onInput={(e) => edit({ ...draft(), soft: num(e) })} />
        </label>
        <label>
          Mode{" "}
          <select
            data-image-input="mode"
            ref={(el) => syncValue(el, () => (draft().contiguous ? "contiguous" : "global"))}
            onChange={(e) => edit({ ...draft(), contiguous: e.currentTarget.value === "contiguous" })}
          >
            <option value="contiguous">Contigu</option>
            <option value="global">Global</option>
          </select>
        </label>
      </fieldset>
      <div class="rb-editor-actions">
        <button type="button" data-image-action="apply" onClick={() => props.edit.commit(pixelParams(draft()))}>Valider</button>
        <button
          type="button"
          data-image-action="cancel"
          onClick={() => {
            setDraft(draftOf(props.image()));
            props.edit.preview(null);
          }}
        >
          Annuler les réglages
        </button>
        <button type="button" data-image-action="restore" onClick={() => props.edit.restore()}>Rétablir l'original</button>
        <button type="button" data-image-action="close" onClick={() => props.close()}>Fermer</button>
      </div>
    </div>
  );
}
