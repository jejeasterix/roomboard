/**
 * File du pot d'un onglet (C6b, DAB2, B13, B14, B20, B21). Reçoit toutes les actions de l'outil Pot dans l'ordre des
 * clics : file vide, une commande vectorielle s'écrit tout de suite (C6a) ; dès qu'un remplissage d'image est en route,
 * tout clic passe derrière lui. Un calcul à la fois, lancé après l'écriture du précédent (il lit l'asset écrit par lui).
 * Jeton de révision : `doc.version()` au premier clic mis en file, puis la version rendue par chaque écriture de la file ;
 * vérifié avant chaque calcul, à l'arrivée du résultat et avant chaque écriture : s'il diffère (Annuler, autre outil,
 * autre écrivain), le résultat est jeté, la file vidée, aucune étape. Ordre des effets : jeton → PNG au magasin →
 * `Fill` écrit → bitmap adopté par le cache si l'écriture réussit, fermé sinon.
 */
import type { Change, Command, CoreDocument } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { FillRequest, ImageFillRequest } from "../engine/fill-target";
import type { ImageCache } from "../engine/render/image-cache";
import { kindOfMime } from "../platform/image-import";
import { FILL_UNREADABLE_MESSAGE, type PixelFillJob, type PixelFillResult, type PixelFillRunner } from "../platform/pixel-runner";

export { FILL_UNREADABLE_MESSAGE };
/** `#stage[data-pot]` (B21) : "" rien fait, "attente" calcul en route, "pret", "refus", "abandon", "echec". */
export type PotState = "" | "attente" | "pret" | "refus" | "abandon" | "echec";
export const FILL_ABANDONED_MESSAGE = "remplissage abandonné : le document a changé";
export const FILL_MISSING_MESSAGE = "pot : image absente du document";
export const FILL_NOT_READY_MESSAGE = "pot : image pas encore prête";
export const FILL_NO_RUNNER = "calcul des pixels indisponible";
/** Message de `#etat` d'un échec du Worker ou du module (patron `pixelNotice`). */
export const fillFailure = (cause: string): string => `pot sur image impossible : ${cause}`;
/** Nom du nouvel asset (HB10) : celui de l'image, extension remplacée par `.png` (ajoutée s'il n'y en a pas). */
export const pngName = (name: string): string => `${name.replace(/\.[^./\\]*$/, "")}.png`;

export interface FillQueueDeps {
  readonly doc: Pick<CoreDocument, "element" | "asset" | "version">;
  readonly assets: Pick<AssetStore, "put" | "get">;
  readonly images: Pick<ImageCache, "copyOf" | "adopt">;
  /** Absent (aucun Worker de pixels) : chaque remplissage d'image échoue avec un message. */
  readonly runner?: PixelFillRunner;
  report(message: string): void;
  onState(s: PotState): void;
}

export interface FillQueue {
  submit(r: FillRequest, run: (c: Command) => Change | null): void;
  /** État courant (B21), lu par le marquage de la session (E4). */
  state(): PotState;
  /** Onglet fermé : la file se vide, un résultat en route est fermé sans rien écrire (RF4). */
  dispose(): void;
}

type Run = (c: Command) => Change | null;
interface Item {
  readonly r: FillRequest;
  readonly run: Run;
}
const isImage = (r: FillRequest): r is ImageFillRequest => !("command" in r);
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export function createFillQueue(deps: FillQueueDeps): FillQueue {
  const items: Item[] = [];
  let busy = false;
  /** Version du document attendue tant que la file travaille ; null quand elle est au repos. */
  let token: number | null = null;
  let disposed = false;
  let current: PotState = "";

  const set = (s: PotState): void => {
    if (s === current) return;
    current = s;
    deps.onState(s);
  };
  const stale = (): boolean => token !== null && deps.doc.version() !== token;
  const closeResult = (res: PixelFillResult): void => {
    if ("png" in res) res.bitmap.close();
  };
  /** B13 : le document a changé ; le résultat en route est déjà fermé par l'appelant. */
  function abandon(): void {
    items.length = 0;
    token = null;
    busy = false;
    set("abandon");
    deps.report(FILL_ABANDONED_MESSAGE);
  }
  /** Fin d'un remplissage sans écriture (B20) : état, message ; la file continue. */
  function stop(s: "refus" | "echec", message: string): void {
    busy = false;
    set(s);
    deps.report(message);
    pump();
  }

  function pump(): void {
    while (!disposed && !busy && items.length > 0) {
      // Jeton vérifié avant chaque étape de la file (calcul ou commande vectorielle).
      if (stale()) {
        abandon();
        return;
      }
      const it = items.shift();
      if (it === undefined) break;
      if (isImage(it.r)) {
        busy = true;
        void compute(it.r, it.run);
      } else {
        it.run(it.r.command);
        token = deps.doc.version();
      }
    }
    if (!busy && items.length === 0) token = null;
  }

  async function compute(r: ImageFillRequest, run: Run): Promise<void> {
    set("attente");
    // Élément lu au moment du calcul (E1) : après l'écriture du remplissage précédent, son asset est le nouveau (S5 a).
    const el = deps.doc.element(r.id);
    if (el === null || el.kind !== "image") return stop("refus", FILL_MISSING_MESSAGE);
    const i = el.image;
    const blob = deps.assets.get(i.asset);
    if (blob === undefined) return stop("refus", FILL_MISSING_MESSAGE);
    const runner = deps.runner;
    if (runner === undefined) return stop("echec", fillFailure(FILL_NO_RUNNER));
    const kind = kindOfMime(blob.type) ?? kindOfMime(deps.doc.asset(i.asset)?.mime ?? "") ?? "png";
    let source: PixelFillJob["source"];
    if (kind === "svg") {
      // Le Worker ne rastérise pas un SVG (pas de DOM) : copie du bitmap décodé par le cache (B7, HB12).
      const copy = deps.images.copyOf(i.asset);
      if (copy === null) return stop("refus", FILL_NOT_READY_MESSAGE);
      source = () => copy.then((bitmap) => ({ bitmap }));
    } else {
      // Original pleine résolution du magasin, jamais la copie d'affichage (S5 h).
      source = async () => ({ blob, kind });
    }
    const job: PixelFillJob = {
      source,
      seed: r.seed,
      size: [i.w, i.h],
      tolerance: r.tolerance,
      color: r.color,
      ...(i.transparent !== undefined ? { transparent: i.transparent } : {}),
      ...(i.brightness ? { brightness: i.brightness } : {}),
      ...(i.contrast ? { contrast: i.contrast } : {}),
    };
    let res: PixelFillResult | null;
    try {
      res = await runner.fill(job);
    } catch (e) {
      if (disposed) return;
      if (stale()) return abandon();
      const m = messageOf(e);
      return m === FILL_UNREADABLE_MESSAGE ? stop("refus", m) : stop("echec", fillFailure(m));
    }
    if (disposed) {
      if (res !== null) closeResult(res);
      return;
    }
    // Lanceur arrêté sous la file (calcul jamais lancé) : échec, la file ne reste pas bloquée en attente.
    if (res === null) return stop("echec", fillFailure(FILL_NO_RUNNER));
    if (stale()) {
      closeResult(res);
      return abandon();
    }
    if (!("png" in res)) {
      // HB13 : aucun pixel changé, aucune étape, rien au magasin.
      busy = false;
      set("pret");
      return pump();
    }
    const { png, bitmap } = res;
    let id: string;
    try {
      id = await deps.assets.put(png);
    } catch (e) {
      bitmap.close();
      if (disposed) return;
      if (stale()) return abandon();
      return stop("echec", fillFailure(messageOf(e)));
    }
    if (disposed) {
      bitmap.close();
      return;
    }
    if (stale()) {
      bitmap.close();
      return abandon();
    }
    const name = pngName(deps.doc.asset(i.asset)?.name ?? "image");
    const change = run({ type: "Fill", page: r.page, target: { kind: "image", id: r.id, asset: { id, name, mime: "image/png", size: png.size } }, color: r.color });
    busy = false;
    if (change === null || change.ids.length === 0) {
      // Refus du cœur (message déjà dans l'état par le moteur) ou même asset : rien adopté (B14, S5 f).
      bitmap.close();
      set(change === null ? "refus" : "pret");
      token = deps.doc.version();
      return pump();
    }
    // Adopté seulement après une écriture réussie : l'asset est cité par le document.
    deps.images.adopt(id, bitmap);
    token = change.version;
    set("pret");
    pump();
  }

  return {
    submit(r, run) {
      if (disposed) return;
      if (!isImage(r) && !busy && items.length === 0) {
        run(r.command);
        return;
      }
      if (token === null) token = deps.doc.version();
      items.push({ r, run });
      pump();
    },
    state: () => current,
    dispose() {
      disposed = true;
      items.length = 0;
    },
  };
}
