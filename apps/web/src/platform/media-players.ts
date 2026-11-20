/**
 * Lecteurs de média d'un onglet (C14, DAM3, M19-M24, DA8) : un lecteur vidéo par élément **lu**, créé au premier geste
 * (`toggle`, `seek`), jamais par le rendu (`frame` ne fait que lire). Rangés par id d'élément, jamais par empreinte,
 * à l'inverse du cache d'images (R16) : deux éléments d'une même vidéo se lisent chacun de leur côté, et jeter l'un ne
 * touche pas l'autre. La fin du rognage est vue à chaque image du lecteur (`onFrame`) ; `ended` ne couvre que la fin du
 * fichier. Lecture, pause et position sont l'état du lecteur, jamais écrits dans le document (M23). Le DOM ne vit que
 * dans `browserPlayerPorts`.
 */
import type { MediaFrames } from "../engine/render/media-frames";

export type MediaStatus = "poster" | "lecture" | "pause" | "echec";

export interface MediaPlayState {
  readonly status: MediaStatus;
  readonly time: number;
}

export interface MediaPlaySpec {
  readonly asset: string;
  readonly mediaType: "video" | "audio";
  readonly duration: number;
  readonly trimStart: number;
  readonly trimEnd: number | null;
  readonly loop: boolean;
  readonly volume: number;
}

export interface PlayerVideo {
  src: string;
  currentTime: number;
  volume: number;
  preload: string;
  playsInline: boolean;
  crossOrigin: string | null;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly readyState: number;
  readonly duration: number;
  play(): Promise<void>;
  pause(): void;
  removeAttribute(name: string): void;
  load(): void;
  addEventListener(type: "error" | "ended", cb: () => void): void;
}

export interface PlayerElement {
  readonly video: PlayerVideo;
  readonly image: CanvasImageSource;
  onFrame(cb: () => void): () => void;
  remove(): void;
}

export interface PlayerPorts {
  createVideo(): PlayerElement;
  source(asset: string): Promise<string | null>;
  release(url: string): void;
}

export interface MediaPlayers extends MediaFrames {
  state(id: string): MediaPlayState | null;
  toggle(id: string, media: MediaPlaySpec): Promise<void>;
  seek(id: string, t: number, media: MediaPlaySpec): Promise<void>;
  apply(id: string, media: MediaPlaySpec): void;
  sync(read: (id: string) => MediaPlaySpec | null): void;
  pauseAll(): void;
  clear(): void;
  onChange(cb: () => void): () => void;
  dispose(): void;
}

interface Player {
  readonly id: string;
  /** null : source introuvable, aucun lecteur posé (état `echec`). */
  readonly el: PlayerElement | null;
  readonly url: string | null;
  media: MediaPlaySpec;
  status: MediaStatus;
  /** Lancé ou positionné dans la session : l'image du lecteur remplace le poster (M21). */
  shown: boolean;
  stopFrames: (() => void) | null;
}

interface Pending {
  job: Promise<Player | null>;
  cancelled: boolean;
}

/** Durée du lecteur, sinon celle du document. */
function lengthOf(p: Player): number {
  const d = p.el?.video.duration ?? Number.NaN;
  return Number.isFinite(d) && d > 0 ? d : p.media.duration;
}

/** Fin de lecture : `trimEnd`, sinon la durée (M24). */
function endOf(p: Player): number {
  return p.media.trimEnd ?? lengthOf(p);
}

/** H1-8 : sur l'iPad, `volume` est en lecture seule ; le réglage reste enregistré, sans effet. */
function setVolume(v: PlayerVideo, volume: number): void {
  try {
    v.volume = Math.min(1, Math.max(0, volume));
  } catch {
    // volume refusé par le navigateur : la lecture continue
  }
}

export function createMediaPlayers(ports: PlayerPorts): MediaPlayers {
  const players = new Map<string, Player>();
  const pending = new Map<string, Pending>();
  const listeners = new Set<() => void>();
  let disposed = false;

  const emit = (): void => {
    for (const cb of [...listeners]) cb();
  };

  const current = (p: Player): boolean => players.get(p.id) === p;

  const unwatch = (p: Player): void => {
    p.stopFrames?.();
    p.stopFrames = null;
  };

  /** Pause sur place : l'image courante reste. */
  const halt = (p: Player): void => {
    p.el?.video.pause();
    if (p.status === "lecture") p.status = "pause";
    unwatch(p);
  };

  const replay = (p: Player): void => {
    const v = p.el?.video;
    if (v === undefined) return;
    v.play().catch(() => {
      if (current(p) && p.status === "lecture") {
        halt(p);
        emit();
      }
    });
  };

  /** Fin du rognage ou du fichier : boucle → retour à `trimStart`, sinon pause sur place (M24). */
  const reachEnd = (p: Player): void => {
    const v = p.el?.video;
    if (v === undefined) return;
    if (p.media.loop) {
      v.currentTime = p.media.trimStart;
      if (v.paused) replay(p);
    } else {
      halt(p);
    }
  };

  const onTick = (p: Player): void => {
    if (!current(p) || p.status !== "lecture" || p.el === null) return;
    if (p.el.video.currentTime >= endOf(p)) reachEnd(p);
    emit();
  };

  const watch = (p: Player): void => {
    if (p.stopFrames !== null || p.el === null) return;
    p.stopFrames = p.el.onFrame(() => onTick(p));
  };

  const discard = (p: Player): void => {
    unwatch(p);
    if (p.el !== null) {
      const v = p.el.video;
      v.pause();
      v.removeAttribute("src");
      v.load();
      p.el.remove();
    }
    if (p.url !== null) ports.release(p.url);
    if (current(p)) players.delete(p.id);
  };

  const build = (id: string, media: MediaPlaySpec, url: string | null): Player => {
    if (url === null) return { id, el: null, url: null, media, status: "echec", shown: false, stopFrames: null };
    const el = ports.createVideo();
    const p: Player = { id, el, url, media, status: "poster", shown: false, stopFrames: null };
    const v = el.video;
    v.preload = "auto";
    v.playsInline = true;
    // H1-7 : posé avant `src`, sans quoi la toile de la scène peut être « salie » par l'image du lecteur.
    v.crossOrigin = "anonymous";
    v.addEventListener("error", () => {
      if (!current(p)) return;
      unwatch(p);
      p.status = "echec";
      emit();
    });
    v.addEventListener("ended", () => {
      if (!current(p) || p.status !== "lecture") return;
      reachEnd(p);
      emit();
    });
    v.src = url;
    return p;
  };

  const create = async (id: string, media: MediaPlaySpec, entry: Pending): Promise<Player | null> => {
    let url: string | null = null;
    try {
      url = await ports.source(media.asset);
    } catch {
      url = null;
    }
    if (pending.get(id) === entry) pending.delete(id);
    if (entry.cancelled || disposed) {
      if (url !== null) ports.release(url);
      return null;
    }
    const p = build(id, media, url);
    players.set(id, p);
    return p;
  };

  /** Lecteur de l'élément, créé au premier geste ; une création en attente est partagée. */
  const ensure = (id: string, media: MediaPlaySpec): Promise<Player | null> => {
    const hit = players.get(id);
    if (hit !== undefined) return Promise.resolve(hit);
    if (disposed) return Promise.resolve(null);
    const wait = pending.get(id);
    if (wait !== undefined && !wait.cancelled) return wait.job;
    const entry: Pending = { job: Promise.resolve(null), cancelled: false };
    pending.set(id, entry);
    entry.job = create(id, media, entry);
    return entry.job;
  };

  const reapply = (p: Player, media: MediaPlaySpec): void => {
    p.media = media;
    const v = p.el?.video;
    if (v === undefined) return;
    setVolume(v, media.volume);
    if (p.status === "lecture" && (v.currentTime < media.trimStart || v.currentTime >= endOf(p))) {
      v.currentTime = media.trimStart;
    }
  };

  const clear = (): void => {
    for (const entry of pending.values()) entry.cancelled = true;
    if (players.size === 0) return;
    const all = [...players.values()];
    players.clear();
    for (const p of all) discard(p);
    emit();
  };

  return {
    frame(id) {
      const p = players.get(id);
      if (p === undefined || p.el === null || !p.shown || p.status === "echec") return null;
      return p.el.video.readyState >= 2 ? p.el.image : null;
    },
    progress(id) {
      const p = players.get(id);
      if (p === undefined) return null;
      return { time: p.el?.video.currentTime ?? 0, playing: p.status === "lecture" };
    },
    state(id) {
      const p = players.get(id);
      if (p === undefined) return null;
      return { status: p.status, time: p.el?.video.currentTime ?? 0 };
    },
    async toggle(id, media) {
      const p = await ensure(id, media);
      if (p === null || !current(p) || p.el === null || p.status === "echec") return;
      if (p.status === "lecture") {
        p.media = media;
        halt(p);
        emit();
        return;
      }
      p.media = media;
      const v = p.el.video;
      if (v.currentTime < media.trimStart || v.currentTime >= endOf(p)) v.currentTime = media.trimStart;
      setVolume(v, media.volume);
      p.shown = true;
      p.status = "lecture";
      watch(p);
      emit();
      try {
        await v.play();
      } catch {
        if (current(p) && p.status === "lecture") {
          halt(p);
          emit();
        }
      }
    },
    async seek(id, t, media) {
      const p = await ensure(id, media);
      if (p === null || !current(p) || p.el === null || p.status === "echec") return;
      p.media = media;
      p.el.video.currentTime = Math.min(lengthOf(p), Math.max(0, Number.isFinite(t) ? t : 0));
      p.shown = true;
      if (p.status === "poster") p.status = "pause";
      emit();
    },
    apply(id, media) {
      const p = players.get(id);
      if (p === undefined) return;
      reapply(p, media);
      emit();
    },
    sync(read) {
      if (players.size === 0 && pending.size === 0) return;
      for (const [id, entry] of pending) if (read(id) === null) entry.cancelled = true;
      for (const p of [...players.values()]) {
        const media = read(p.id);
        if (media === null) discard(p);
        else reapply(p, media);
      }
      emit();
    },
    pauseAll() {
      let changed = false;
      for (const p of players.values()) {
        if (p.status !== "lecture") continue;
        halt(p);
        changed = true;
      }
      if (changed) emit();
    },
    clear,
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose() {
      listeners.clear();
      disposed = true;
      clear();
    },
  };
}

/**
 * Lecteurs du navigateur : un `<video>` posé dans `host` (conteneur caché de la session, M19). `onFrame` tourne par
 * `requestAnimationFrame` et rappelle quand `currentTime` change (PC2).
 */
export function browserPlayerPorts(
  host: HTMLElement,
  source: PlayerPorts["source"],
  release: PlayerPorts["release"],
): PlayerPorts {
  return {
    createVideo() {
      const video = host.ownerDocument.createElement("video");
      host.appendChild(video);
      return {
        video,
        image: video,
        onFrame(cb) {
          let last = Number.NaN;
          let live = true;
          let handle = 0;
          const step = (): void => {
            if (!live) return;
            if (video.currentTime !== last) {
              last = video.currentTime;
              cb();
            }
            handle = requestAnimationFrame(step);
          };
          handle = requestAnimationFrame(step);
          return () => {
            live = false;
            cancelAnimationFrame(handle);
          };
        },
        remove() {
          video.remove();
        },
      };
    },
    source,
    release,
  };
}

const tenth = (s: number): string => (Number.isFinite(s) ? s : 0).toFixed(1);

/** Oracle `data-media` : `<type>;<état>;<t>;<début>-<fin>;<boucle 0/1>;<volume %>` ; `""` sans média. */
export function mediaTag(media: MediaPlaySpec | null, state: MediaPlayState | null): string {
  if (media === null) return "";
  const status = state?.status ?? "poster";
  const time = state?.time ?? 0;
  const end = media.trimEnd ?? media.duration;
  return [
    media.mediaType,
    status,
    tenth(time),
    `${tenth(media.trimStart)}-${tenth(end)}`,
    media.loop ? "1" : "0",
    String(Math.round(media.volume * 100)),
  ].join(";");
}
