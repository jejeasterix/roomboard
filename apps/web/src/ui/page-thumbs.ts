/**
 * Miniatures de page à la demande (DA7) : une URL d'objet par page, gardée pour sa version (montée par `invalidate`) et
 * sa largeur ; un seul rendu à la fois (file), la même demande en cours partagée. `invalidate` reçoit les pages d'un
 * `Change` (`Change.pages` et les pages de `Change.ids`) ; `dispose` révoque tout.
 */
export interface PageThumbs {
  /** `form` : ce qui change le cadre de la page (son mode) ; une valeur autre que la précédente refait la miniature. */
  get(pageId: string, width: number, form?: string): Promise<string | null>;
  invalidate(pages: readonly string[]): void;
  dispose(): void;
}

/** Délai avant de révoquer une URL remplacée ou invalidée. */
export const REVOKE_GRACE_MS = 2000;

interface Kept {
  readonly version: number;
  readonly width: number;
  readonly url: string;
}

/** ImageBitmap → Blob PNG (navigateur) ; null sans `OffscreenCanvas`. */
async function blobOf(img: ImageBitmap | Blob): Promise<Blob | null> {
  if (img instanceof Blob) return img;
  if (typeof OffscreenCanvas === "undefined") return null;
  const c = new OffscreenCanvas(img.width, img.height);
  const ctx = c.getContext("bitmaprenderer");
  if (!ctx) return null;
  ctx.transferFromImageBitmap(img);
  return c.convertToBlob({ type: "image/png" });
}

export function createPageThumbs(render: (pageId: string, width: number) => Promise<ImageBitmap | Blob | null>): PageThumbs {
  const versions = new Map<string, number>();
  const kept = new Map<string, Kept>();
  const forms = new Map<string, string>();
  const pending = new Map<string, Promise<string | null>>();
  let queue: Promise<unknown> = Promise.resolve();
  let disposed = false;
  const versionOf = (page: string): number => versions.get(page) ?? 0;
  /** URL remplacées, révoquées après `REVOKE_GRACE_MS` : une image encore en chargement ne doit pas perdre sa source (ERR_FILE_NOT_FOUND). */
  const dying = new Map<string, ReturnType<typeof setTimeout>>();
  const forget = (page: string): void => {
    const k = kept.get(page);
    kept.delete(page);
    if (!k) return;
    dying.set(k.url, setTimeout(() => {
      dying.delete(k.url);
      URL.revokeObjectURL(k.url);
    }, REVOKE_GRACE_MS));
  };

  /** Tâche de la file : rend la version courante ; invalidée pendant le rendu, elle recommence (l'ancienne jamais servie). */
  const run = async (page: string, width: number): Promise<string | null> => {
    for (;;) {
      if (disposed) return null;
      const version = versionOf(page);
      const k = kept.get(page);
      if (k && k.version === version && k.width === width) return k.url;
      let blob: Blob | null = null;
      try {
        const img = await render(page, width);
        blob = img === null ? null : await blobOf(img);
      } catch {
        return null;
      }
      if (disposed) return null;
      if (versionOf(page) !== version) continue;
      if (blob === null) return null;
      forget(page);
      const url = URL.createObjectURL(blob);
      kept.set(page, { version, width, url });
      return url;
    }
  };

  const get = (page: string, width: number, form?: string): Promise<string | null> => {
    if (disposed) return Promise.resolve(null);
    if (form !== undefined) {
      const before = forms.get(page);
      forms.set(page, form);
      if (before !== undefined && before !== form) invalidate([page]);
    }
    const version = versionOf(page);
    const k = kept.get(page);
    if (k && k.version === version && k.width === width) return Promise.resolve(k.url);
    const key = `${page}\u0000${version}\u0000${width}`;
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    const p = queue.then(() => run(page, width)).finally(() => pending.delete(key));
    queue = p.catch(() => null);
    pending.set(key, p);
    return p;
  };

  function invalidate(pages: readonly string[]): void {
    for (const page of pages) {
      versions.set(page, versionOf(page) + 1);
      forget(page);
    }
  }

  return {
    get,
    invalidate,
    dispose() {
      disposed = true;
      for (const page of [...kept.keys()]) forget(page);
      for (const [url, t] of dying) {
        clearTimeout(t);
        URL.revokeObjectURL(url);
      }
      dying.clear();
      pending.clear();
    },
  };
}
