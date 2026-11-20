/**
 * Bitmaps des images (DAR2, R16, HR12 ; C5, I19, I22). Le rendu de la scène est synchrone, le décodage et les calculs
 * de pixels ne le sont pas. `bitmap(asset)` rend le bitmap décodé de l'asset (copie d'affichage, au plus 4096 px de côté)
 * ou null et lance le décodage au premier appel. `bitmapOf(el, preview)` rend le bitmap à dessiner pour un élément
 * image : retouché (couleur transparente, luminosité, contraste) dans l'emplacement de l'élément (`<id>`) ou de son
 * aperçu (`<id>#apercu`), calculé par le lanceur de pixels ; tant que le bitmap de la clé voulue manque, le dernier de
 * l'emplacement reste dessiné (l'aperçu retombe sur celui de l'élément, l'élément sur l'image brute) : aucun clignotement.
 * Un résultat dont la clé n'est plus celle voulue par son emplacement est fermé à l'arrivée. `ready` (branché sur
 * `engine.redraw()`) est appelé quand un bitmap arrive. `data-pixels` (I33) ne compte que les images dessinées par la
 * dernière scène (`beginScene`, `endScene`) ; les emplacements des autres restent, rien n'est fermé (I22). Une instance par
 * onglet : `dispose` ferme les bitmaps, et ferme aussitôt ceux qui arrivent après.
 */
import type { ImageElement } from "../../core/api";
import type { AssetStore } from "../../core/asset-store";
import { needsPixels, pixelKey } from "../../core/image-params";
// Type seul (effacé à la compilation) : le moteur ne dépend pas de la couche `platform` à l'exécution.
import type { PixelRunner } from "../../platform/pixel-runner";

export interface ImageSource {
  bitmap(asset: string): CanvasImageSource | null;
  /** C5 (I22) : bitmap à dessiner pour l'élément ; `preview` : emplacement de l'aperçu. Absent : `bitmap(asset)`. */
  bitmapOf?(el: ImageElement, preview?: boolean): CanvasImageSource | null;
  /** C5 (I22, I29) : couleur `#rrggbb` d'origine du pixel source (x, y) ; null tant que le bitmap n'est pas prêt. */
  colorAt?(asset: string, x: number, y: number): string | null;
  /** C5 (I19) : éléments retirés (`Change.removed`) : leurs emplacements et résultats en route sont jetés. */
  forget?(ids: readonly string[]): void;
  /** C5 : séance fermée, l'aperçu de l'élément est fini : son emplacement `<id>#apercu` est jeté. */
  dropPreview?(id: string): void;
  /** C5 (I33) : une scène commence ; les éléments passés à `bitmapOf` jusqu'à `endScene` sont ceux qu'elle dessine. */
  beginScene?(): void;
  /** C5 (I33) : la scène est finie ; `pixelState` ne compte plus que ses images. */
  endScene?(): void;
}

export type BitmapLike = CanvasImageSource & { close?(): void };
export type BitmapDecoder = (blob: Blob) => Promise<BitmapLike>;
/** `#stage[data-pixels]` (I33) : "" aucune image retouchée, "attente" un calcul en cours, "pret", "echec". */
export type PixelState = "" | "attente" | "pret" | "echec";

export interface ImageCache extends ImageSource {
  bitmapOf(el: ImageElement, preview?: boolean): CanvasImageSource | null;
  colorAt(asset: string, x: number, y: number): string | null;
  forget(ids: readonly string[]): void;
  dropPreview(id: string): void;
  beginScene(): void;
  endScene(): void;
  pixelState(): PixelState;
  dispose(): void;
}

export interface ImageCacheOptions {
  /** Copie transférable du bitmap décodé ; défaut : `createImageBitmap`. */
  readonly copy?: (b: BitmapLike) => Promise<ImageBitmap>;
  /** Pixel RVB (x, y) du bitmap décodé ; défaut : `OffscreenCanvas` 1 × 1. */
  readonly readPixel?: (b: BitmapLike, x: number, y: number) => readonly [number, number, number] | null;
  /** Premier échec d'un calcul de pixels de l'onglet (message de `#etat`, I24) : appelé une fois. */
  readonly onFailure?: (message: string) => void;
  /** Chaque changement de `pixelState()`. */
  readonly onState?: (s: PixelState) => void;
}

interface Slot {
  /** Clé du bitmap tenu. */
  key: string | null;
  bitmap: BitmapLike | null;
  /** Clé en calcul pour cet emplacement ; un résultat d'une autre clé est périmé. */
  wanted: string | null;
  /** Emplacement de l'élément qui attend ce calcul (Valider pendant le calcul de l'aperçu) : le résultat lui est transféré. */
  adopter?: string;
}

const PREVIEW = "#apercu";
/** Élément d'un emplacement (`<id>` ou `<id>#apercu`). */
const ownerOf = (name: string): string => (name.endsWith(PREVIEW) ? name.slice(0, -PREVIEW.length) : name);
const hex2 = (v: number): string => v.toString(16).padStart(2, "0");
const sizeOf = (b: BitmapLike): readonly [number, number] | null => {
  const s = b as { readonly width?: unknown; readonly height?: unknown };
  return typeof s.width === "number" && typeof s.height === "number" && s.width > 0 && s.height > 0 ? [s.width, s.height] : null;
};
const defaultCopy = (b: BitmapLike): Promise<ImageBitmap> => createImageBitmap(b as ImageBitmapSource);
function defaultReadPixel(b: BitmapLike, x: number, y: number): readonly [number, number, number] | null {
  if (typeof OffscreenCanvas === "undefined") return null;
  const ctx = new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
  if (ctx === null) return null;
  ctx.drawImage(b, x, y, 1, 1, 0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0];
}

export function createImageCache(
  assets: Pick<AssetStore, "get">,
  decode: BitmapDecoder,
  ready: () => void,
  pixels?: PixelRunner,
  opts: ImageCacheOptions = {},
): ImageCache {
  const done = new Map<string, BitmapLike>();
  const pending = new Set<string>();
  const failed = new Set<string>();
  /** Taille source de chaque asset, apprise au dessin : la pipette met (x, y) à l'échelle de la copie d'affichage. */
  const sizes = new Map<string, readonly [number, number]>();
  const slots = new Map<string, Slot>();
  /** Clés dont le calcul a échoué : image brute, aucune relance (I24). */
  const badKeys = new Set<string>();
  const copy = opts.copy ?? defaultCopy;
  const readPixel = opts.readPixel ?? defaultReadPixel;
  let running = 0;
  let lastFailed = false;
  let warned = false;
  let disposed = false;
  let state: PixelState = "";
  /** Éléments dessinés par la dernière scène finie ; null tant qu'aucune n'est signalée : tous comptent. */
  let shown: ReadonlySet<string> | null = null;
  /** Éléments dessinés par la scène en cours (entre `beginScene` et `endScene`). */
  let marking: Set<string> | null = null;

  const publish = (): void => {
    if (slots.size === 0) lastFailed = false; // plus d'image retouchée : un échec passé ne s'affiche plus (I33)
    // « Aucune image retouchée visible » (I33) : seuls comptent les emplacements des éléments de la dernière scène.
    const visible = [...slots].filter(([n]) => shown === null || shown.has(ownerOf(n))).map(([, s]) => s);
    const hasBitmap = visible.some((s) => s.bitmap !== null);
    const next: PixelState = running > 0 ? "attente" : visible.length === 0 ? "" : lastFailed ? "echec" : hasBitmap ? "pret" : "";
    if (next === state) return;
    state = next;
    opts.onState?.(next);
  };
  const drop = (name: string): void => {
    const s = slots.get(name);
    if (s === undefined) return;
    slots.delete(name);
    s.bitmap?.close?.();
    release(s);
  };
  /** Un emplacement qui travaillait pour un autre (Valider) disparaît : l'attente de l'autre est levée. */
  function release(s: Slot): void {
    if (s.adopter === undefined) return;
    const t = slots.get(s.adopter);
    if (t !== undefined && t.wanted === s.wanted) t.wanted = null;
    delete s.adopter;
  }

  function bitmap(asset: string): BitmapLike | null {
    const hit = done.get(asset);
    if (hit !== undefined) return hit;
    if (disposed || pending.has(asset) || failed.has(asset)) return null;
    const blob = assets.get(asset);
    if (blob === undefined) return null;
    pending.add(asset);
    decode(blob).then(
      (b) => {
        pending.delete(asset);
        if (disposed) {
          b.close?.();
          return;
        }
        done.set(asset, b);
        ready();
      },
      (e: unknown) => {
        pending.delete(asset);
        failed.add(asset);
        console.warn(`RoomBoard : image ${asset} illisible (${e instanceof Error ? e.message : String(e)})`);
      },
    );
    return null;
  }

  /** Lance le calcul de `key` pour l'emplacement `name` (une copie du bitmap brut part quand le calcul part). */
  function compute(runner: PixelRunner, name: string, s: Slot, key: string, el: ImageElement, raw: BitmapLike): void {
    // L'aperçu change de clé : l'élément qui attendait l'ancienne (Valider) n'attend plus, il calculera la sienne.
    release(s);
    s.wanted = key;
    running++;
    publish();
    const i = el.image;
    const job = {
      key,
      bitmap: () => copy(raw),
      ...(i.transparent !== undefined ? { transparent: i.transparent } : {}),
      ...(i.brightness ? { brightness: i.brightness } : {}),
      ...(i.contrast ? { contrast: i.contrast } : {}),
    };
    runner.run(name, job).then(
      (out) => {
        running--;
        const cur = slots.get(name);
        if (out === null) {
          if (cur !== undefined) release(cur);
          publish();
          if (!disposed) ready();
          return;
        }
        if (disposed || cur === undefined || cur.wanted !== key) {
          out.close();
          publish();
          return;
        }
        // Valider pendant le calcul : le résultat de l'aperçu va à l'élément, sans recalcul (I22).
        const heir = cur.adopter === undefined ? undefined : slots.get(cur.adopter);
        if (cur.adopter !== undefined) {
          // Pas `drop` : sa levée de l'adoption remettrait `heir.wanted` à null et jetterait ce résultat. L'emplacement de
          // l'aperçu disparaît ; son ancien bitmap, que plus rien ne dessine, est fermé.
          slots.delete(name);
          delete cur.adopter;
          if (cur.bitmap !== heir?.bitmap) cur.bitmap?.close?.();
          if (heir === undefined || heir.wanted !== key) {
            out.close();
            publish();
            if (!disposed) ready(); // l'élément est redessiné : il relance son calcul s'il en faut un
            return;
          }
        }
        const target = heir ?? cur;
        target.bitmap?.close?.();
        target.bitmap = out;
        target.key = key;
        target.wanted = null;
        lastFailed = false;
        publish();
        ready();
      },
      (e: unknown) => {
        running--;
        badKeys.add(key);
        const cur = slots.get(name);
        if (cur?.wanted === key) {
          release(cur);
          cur.wanted = null;
        }
        lastFailed = true;
        publish();
        if (!warned && !disposed) {
          warned = true;
          opts.onFailure?.(e instanceof Error ? e.message : String(e));
        }
        if (!disposed) ready();
      },
    );
  }

  return {
    bitmap,
    bitmapOf(el, preview = false) {
      marking?.add(el.id);
      const i = el.image;
      sizes.set(i.asset, [i.w, i.h]);
      const raw = bitmap(i.asset);
      const name = preview ? `${el.id}#apercu` : el.id;
      const twinName = preview ? el.id : `${el.id}#apercu`;
      if (!needsPixels(i) || pixels === undefined || disposed) {
        // Sans retouche de pixels : aucun Worker ; un emplacement resté (Annuler, Rétablir) est jeté.
        drop(name);
        if (!preview) drop(twinName);
        publish();
        return raw;
      }
      const key = pixelKey(i);
      let s = slots.get(name);
      if (s === undefined) {
        s = { key: null, bitmap: null, wanted: null };
        slots.set(name, s);
      }
      const twin = slots.get(twinName);
      if (s.key === key && s.bitmap !== null) {
        if (!preview && twin !== undefined) drop(twinName);
        return s.bitmap;
      }
      if (twin !== undefined && twin.key === key && twin.bitmap !== null) {
        if (preview) return twin.bitmap;
        // Valider (I22) : l'élément reprend le bitmap de l'aperçu de même clé, sans recalcul.
        s.bitmap?.close?.();
        s.bitmap = twin.bitmap;
        s.key = key;
        s.wanted = null;
        slots.delete(twinName);
        publish();
        return s.bitmap;
      }
      if (!preview && twin !== undefined && twin.wanted === key && (twin.adopter === undefined || twin.adopter === name)) {
        // Valider avant l'arrivée de l'aperçu de même clé : l'élément attend ce calcul au lieu d'en lancer un second.
        twin.adopter = name;
        s.wanted = key;
        // Ce que montrait l'aperçu (son bitmap, sinon celui de l'élément) reste dessiné jusqu'à l'arrivée (I22).
        return twin.bitmap ?? s.bitmap ?? raw;
      }
      // Élément dessiné sans aperçu : l'aperçu est fini ; son emplacement et son calcul en route sont jetés.
      if (!preview && twin !== undefined) drop(twinName);
      if (badKeys.has(key)) return raw;
      if (raw !== null && s.wanted !== key) compute(pixels, name, s, key, el, raw);
      return s.bitmap ?? (preview ? (twin?.bitmap ?? null) : null) ?? raw;
    },
    colorAt(asset, x, y) {
      const b = done.get(asset);
      const size = sizes.get(asset);
      if (b === undefined || size === undefined) return null;
      const [bw, bh] = sizeOf(b) ?? size;
      const px = Math.min(bw - 1, Math.max(0, Math.floor((x * bw) / size[0])));
      const py = Math.min(bh - 1, Math.max(0, Math.floor((y * bh) / size[1])));
      const rgb = readPixel(b, px, py);
      return rgb === null ? null : `#${hex2(rgb[0])}${hex2(rgb[1])}${hex2(rgb[2])}`;
    },
    forget(ids) {
      for (const id of ids) {
        drop(id);
        drop(`${id}#apercu`);
      }
      publish();
    },
    dropPreview(id) {
      drop(`${id}#apercu`);
      publish();
    },
    beginScene() {
      marking = new Set();
    },
    endScene() {
      if (marking === null) return;
      shown = marking;
      marking = null;
      publish();
    },
    pixelState: () => state,
    dispose() {
      disposed = true;
      for (const b of done.values()) b.close?.();
      done.clear();
      for (const name of [...slots.keys()]) drop(name);
    },
  };
}
