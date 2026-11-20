/** Outils communs du banc (application et prototype) : nombre lisible, export JSON, suivi du devicePixelRatio. */

/** Nombre lisible ; absent → « — ». */
export const fmt = (v: number | null | undefined, digits = 1): string =>
  v === null || v === undefined ? "—" : v.toFixed(digits);

export interface DownloadDeps {
  readonly document: Pick<Document, "createElement" | "body">;
  readonly url: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
  setTimeout(cb: () => void, ms: number): unknown;
}

/** Télécharge `text` en JSON sous `prefix-<date ISO sans : ni .>.json` ; l'URL est rendue après 1 s. */
export function downloadJson(text: string, prefix: string, now: Date, deps: DownloadDeps): void {
  const url = deps.url.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = deps.document.createElement("a");
  a.href = url;
  a.download = `${prefix}-${now.toISOString().replace(/[:.]/g, "-")}.json`;
  deps.document.body.append(a);
  a.click();
  a.remove();
  deps.setTimeout(() => deps.url.revokeObjectURL(url), 1000);
}

export interface DprMediaQueryList {
  addEventListener(t: "change", cb: () => void, o: { once: true }): void;
  removeEventListener(t: "change", cb: () => void): void;
}

export interface DprWindow {
  readonly devicePixelRatio: number;
  matchMedia(q: string): DprMediaQueryList;
}

/** Appelle `onChange` à chaque changement du devicePixelRatio (écran, zoom) ; rend l'arrêt, qui retire l'écouteur. */
export function watchDpr(w: DprWindow, onChange: () => void): () => void {
  let stopped = false;
  let current: { mql: DprMediaQueryList; cb: () => void } | undefined;
  const disarm = (): void => {
    if (current) current.mql.removeEventListener("change", current.cb);
    current = undefined;
  };
  const arm = (): void => {
    disarm();
    const mql = w.matchMedia(`(resolution: ${w.devicePixelRatio || 1}dppx)`);
    const cb = (): void => {
      if (stopped) return;
      onChange();
      arm();
    };
    current = { mql, cb };
    mql.addEventListener("change", cb, { once: true });
  };
  arm();
  return () => {
    stopped = true;
    disarm();
  };
}
