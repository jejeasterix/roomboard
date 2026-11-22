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
 * C6b (B14-B16) : `adopt` sert le bitmap rendu par le Worker pour un nouvel asset ; `copyOf` copie un bitmap décodé (SVG
 * à remplir) ; budget de `DECODED_BUDGET_PX` pixels décodés, appliqué à `endScene` aux bitmaps hors de la scène, du moins
 * récemment dessiné au plus récent ; l'emplacement d'un élément redevenu sans retouche est gardé (jamais dessiné), repris
 * si sa clé revient.
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
/** Budget des bitmaps décodés et retouchés gardés (C6b, B15) : ≈ 192 Mo RGBA. */
export const DECODED_BUDGET_PX = 48_000_000;

export interface ImageCache extends ImageSource {
  bitmapOf(el: ImageElement, preview?: boolean): CanvasImageSource | null;
  colorAt(asset: string, x: number, y: number): string | null;
  /** C6b (B14) : bitmap rendu par le Worker pour `asset`, servi par `bitmap(asset)` ; déjà présent ou cache fermé : fermé. */
  adopt(asset: string, bitmap: BitmapLike): void;
  /** C6b : copie du bitmap décodé de `asset` (source d'un SVG à remplir) ; null s'il n'est pas décodé ou si le cache est fermé. */
  copyOf(asset: string): Promise<ImageBitmap> | null;
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
  /** C6b (B15) : pixels décodés gardés au plus ; défaut DECODED_BUDGET_PX. */
  readonly budgetPx?: number;
}

interface Slot {
  /** Clé du bitmap tenu. */
  key: string | null;
  bitmap: BitmapLike | null;
  /** Clé en calcul pour cet emplacement ; un résultat d'une autre clé est périmé. */
  wanted: string | null;
  /** Emplacement de l'élément qui attend ce calcul (Valider pendant le calcul de l'aperçu) : le résultat lui est transféré. */
  adopter?: string;
  /** C6b (B16) : élément redevenu sans retouche ; bitmap gardé, jamais dessiné ; repris si la clé revient. */
  dormant?: boolean;
  /** C5 (I33) : le calcul de sa clé a échoué, l'image brute est dessinée ; `data-pixels` dit `echec` s'il est visible. */
  failed?: boolean;
  /** Dernier usage (horloge du cache), pour le budget (B15). */
  used: number;
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
  let warned = false;
  let disposed = false;
  let state: PixelState = "";
  /** Éléments dessinés par la dernière scène finie ; null tant qu'aucune n'est signalée : tous comptent. */
  let shown: ReadonlySet<string> | null = null;
  /** Éléments dessinés par la scène en cours (entre `beginScene` et `endScene`). */
  let marking: Set<string> | null = null;
  const budget = opts.budgetPx ?? DECODED_BUDGET_PX;
  /** Dernier dessin de chaque bitmap décodé (horloge `clock`). */
  const usedAsset = new Map<string, number>();
  let clock = 0;
  /** Assets lus par la scène en cours, puis par la dernière scène finie. */
  let markingAssets: Set<string> | null = null;
  let shownAssets: ReadonlySet<string> = new Set();
  /** Calculs en route par asset : leur copie du bitmap brut n'est prise qu'au départ du calcul, le budget ne le ferme pas. */
  const computing = new Map<string, number>();
  const area = (b: BitmapLike | null): number => {
    const s = b === null ? null : sizeOf(b);
    return s === null ? 0 : s[0] * s[1];
  };

  const publish = (): void => {
    const live = [...slots].filter(([, s]) => s.dormant !== true);
    // « Aucune image retouchée visible » (I33) : seuls comptent les emplacements dessinables des éléments de la dernière scène ;
    // un échec n'est dit que s'il touche l'une d'elles.
    // Pendant un aperçu vivant, seul `<id>#apercu` est dessiné : l'emplacement `<id>` ne compte pas.
    const covered = (n: string): boolean => {
      const twin = n.endsWith(PREVIEW) ? undefined : slots.get(`${n}${PREVIEW}`);
      return twin !== undefined && twin.dormant !== true;
    };
    const visible = live.filter(([n]) => (shown === null || shown.has(ownerOf(n))) && !covered(n)).map(([, s]) => s);
    const hasBitmap = visible.some((s) => s.bitmap !== null);
    const failed = visible.some((s) => s.failed === true);
    const next: PixelState = running > 0 ? "attente" : visible.length === 0 ? "" : failed ? "echec" : hasBitmap ? "pret" : "";
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
    markingAssets?.add(asset);
    const hit = done.get(asset);
    if (hit !== undefined) {
      usedAsset.set(asset, ++clock);
      return hit;
    }
    if (disposed || pending.has(asset) || failed.has(asset)) return null;
    const blob = assets.get(asset);
    if (blob === undefined) return null;
    pending.add(asset);
    decode(blob).then(
      (b) => {
        pending.delete(asset);
        // Adopté entre-temps (B14) : le décodé est fermé.
        if (disposed || done.has(asset)) {
          b.close?.();
          return;
        }
        done.set(asset, b);
        usedAsset.set(asset, ++clock);
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
    computing.set(i.asset, (computing.get(i.asset) ?? 0) + 1);
    const settled = (): void => {
      running--;
      const n = (computing.get(i.asset) ?? 1) - 1;
      if (n > 0) computing.set(i.asset, n);
      else computing.delete(i.asset);
    };
    const job = {
      key,
      bitmap: () => copy(raw),
      ...(i.transparent !== undefined ? { transparent: i.transparent } : {}),
      ...(i.brightness ? { brightness: i.brightness } : {}),
      ...(i.contrast ? { contrast: i.contrast } : {}),
    };
    runner.run(name, job).then(
      (out) => {
        settled();
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
        target.failed = false;
        publish();
        ready();
      },
      (e: unknown) => {
        settled();
        badKeys.add(key);
        const cur = slots.get(name);
        if (cur?.wanted === key) {
          // L'élément qui attendait ce calcul (Valider) dessine lui aussi l'image brute.
          const heir = cur.adopter === undefined ? undefined : slots.get(cur.adopter);
          if (heir?.wanted === key) heir.failed = true;
          release(cur);
          cur.wanted = null;
          cur.failed = true;
        }
        publish();
        if (!warned && !disposed) {
          warned = true;
          opts.onFailure?.(e instanceof Error ? e.message : String(e));
        }
        if (!disposed) ready();
      },
    );
  }

  /** B15 : au-delà du budget, ferme d'abord les bitmaps le moins récemment dessinés hors de la dernière scène ; jamais le
   *  brut d'un asset dont un calcul est en route (sa copie part au départ du calcul, `bitmap: () => copy(raw)`). */
  function evict(): void {
    let total = 0;
    for (const b of done.values()) total += area(b);
    for (const s of slots.values()) total += area(s.bitmap);
    if (total <= budget) return;
    const candidates: { readonly used: number; readonly px: number; readonly close: () => void }[] = [];
    for (const [asset, b] of done) {
      if (shownAssets.has(asset) || computing.has(asset)) continue;
      candidates.push({
        used: usedAsset.get(asset) ?? 0,
        px: area(b),
        close: () => {
          done.delete(asset);
          usedAsset.delete(asset);
          b.close?.();
        },
      });
    }
    for (const [name, s] of slots) {
      if (s.bitmap === null || (s.dormant !== true && (shown === null || shown.has(ownerOf(name))))) continue;
      candidates.push({
        used: s.used,
        px: area(s.bitmap),
        close: () => {
          s.bitmap?.close?.();
          s.bitmap = null;
          s.key = null;
        },
      });
    }
    candidates.sort((a, b) => a.used - b.used);
    for (const c of candidates) {
      if (total <= budget) break;
      c.close();
      total -= c.px;
    }
  }

  return {
    bitmap,
    bitmapOf(el, preview = false) {
      marking?.add(el.id);
      const i = el.image;
      sizes.set(i.asset, [i.w, i.h]);
      const raw = bitmap(i.asset);
      const name = preview ? `${el.id}${PREVIEW}` : el.id;
      const twinName = preview ? el.id : `${el.id}${PREVIEW}`;
      if (!needsPixels(i) || pixels === undefined || disposed) {
        // Sans retouche de pixels : aucun Worker ; l'emplacement d'un aperçu resté est jeté.
        if (preview) drop(name);
        else {
          drop(twinName);
          // B16 : l'emplacement retouché reste (Annuler le remplissage le retrouve) ; son calcul en route est abandonné.
          const kept = slots.get(name);
          if (kept !== undefined) {
            release(kept);
            kept.wanted = null;
            kept.dormant = true;
          }
        }
        publish();
        return raw;
      }
      const key = pixelKey(i);
      let s = slots.get(name);
      if (s === undefined) {
        s = { key: null, bitmap: null, wanted: null, used: ++clock };
        slots.set(name, s);
      }
      if (s.dormant === true) {
        // Reprise (B16) : même clé, le bitmap gardé est servi sans calcul ; autre clé, il ne vaut plus rien.
        s.dormant = false;
        if (s.key !== key) {
          s.bitmap?.close?.();
          s.bitmap = null;
          s.key = null;
          s.failed = false;
        }
        publish();
      }
      s.used = ++clock;
      const twin = slots.get(twinName);
      /** Le bitmap de `key` est dessiné : un échec passé d'une autre clé ne se dit plus (I33). */
      const sound = (): void => {
        if (s.failed !== true) return;
        s.failed = false;
        publish();
      };
      if (s.key === key && s.bitmap !== null) {
        if (!preview && twin !== undefined) drop(twinName);
        sound();
        return s.bitmap;
      }
      if (twin !== undefined && twin.key === key && twin.bitmap !== null) {
        if (preview) {
          sound();
          return twin.bitmap;
        }
        // Valider (I22) : l'élément reprend le bitmap de l'aperçu de même clé, sans recalcul.
        s.bitmap?.close?.();
        s.bitmap = twin.bitmap;
        s.key = key;
        s.wanted = null;
        s.failed = false;
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
      if (badKeys.has(key)) {
        // Clé déjà en échec (aperçu validé, page revue) : l'image brute est dessinée, l'échec reste dit (I33).
        if (s.failed !== true) {
          s.failed = true;
          publish();
        }
        return raw;
      }
      if (raw !== null && s.wanted !== key) compute(pixels, name, s, key, el, raw);
      return s.bitmap ?? (preview && twin?.dormant !== true ? (twin?.bitmap ?? null) : null) ?? raw;
    },
    adopt(asset, b) {
      if (disposed || done.has(asset)) {
        b.close?.();
        return;
      }
      failed.delete(asset);
      done.set(asset, b);
      usedAsset.set(asset, ++clock);
      ready();
    },
    copyOf(asset) {
      const b = done.get(asset);
      if (b === undefined || disposed) return null;
      usedAsset.set(asset, ++clock);
      return copy(b);
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
        drop(`${id}${PREVIEW}`);
      }
      publish();
    },
    dropPreview(id) {
      drop(`${id}${PREVIEW}`);
      publish();
    },
    beginScene() {
      marking = new Set();
      markingAssets = new Set();
    },
    endScene() {
      if (marking === null) return;
      shown = marking;
      shownAssets = markingAssets ?? new Set();
      marking = null;
      markingAssets = null;
      evict();
      publish();
    },
    pixelState: () => state,
    dispose() {
      disposed = true;
      for (const b of done.values()) b.close?.();
      done.clear();
      usedAsset.clear();
      for (const name of [...slots.keys()]) drop(name);
    },
  };
}
