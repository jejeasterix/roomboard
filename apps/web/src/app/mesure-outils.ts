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

export interface DprWindow {
  readonly devicePixelRatio: number;
  matchMedia(q: string): { addEventListener(t: "change", cb: () => void, o: { once: true }): void };
}

/** Appelle `onChange` à chaque changement du devicePixelRatio (écran, zoom) ; rend l'arrêt. */
export function watchDpr(w: DprWindow, onChange: () => void): () => void {
  let stopped = false;
  const arm = (): void => {
    w.matchMedia(`(resolution: ${w.devicePixelRatio || 1}dppx)`).addEventListener(
      "change",
      () => {
        if (stopped) return;
        onChange();
        arm();
      },
      { once: true },
    );
  };
  arm();
  return () => {
    stopped = true;
  };
}
