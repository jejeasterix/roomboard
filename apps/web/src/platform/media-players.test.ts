/**
 * Lecteurs d'un onglet (C14, DAM3, M19-M24) : faux `PlayerElement` dont `onFrame` garde le rappel, appelé à la main
 * (`tick`). Les lecteurs sont rangés par élément, jamais par empreinte (à l'inverse du cache d'images R16) : deux
 * éléments d'une même vidéo ont chacun le leur ; le rendu (`frame`) ne crée aucun lecteur, seul un geste le fait.
 */
import { describe, expect, it } from "vitest";
import {
  createMediaPlayers,
  mediaTag,
  type MediaPlaySpec,
  type PlayerElement,
  type PlayerPorts,
  type PlayerVideo,
} from "./media-players";

class FakeVideo implements PlayerVideo {
  src = "";
  currentTime = 0;
  preload = "";
  playsInline = false;
  crossOrigin: string | null = null;
  paused = true;
  ended = false;
  plays = 0;
  loads = 0;
  readonly removedAttributes: string[] = [];
  private vol = 1;
  private readonly listeners = new Map<string, (() => void)[]>();

  constructor(
    public readyState: number,
    public duration: number,
    private readonly playRejects: boolean,
    private readonly volumeThrows: boolean,
  ) {}

  get volume(): number {
    return this.vol;
  }

  set volume(v: number) {
    if (this.volumeThrows) throw new Error("volume en lecture seule");
    this.vol = v;
  }

  play(): Promise<void> {
    this.plays += 1;
    if (this.playRejects) return Promise.reject(new Error("NotAllowedError"));
    this.paused = false;
    this.ended = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  removeAttribute(name: string): void {
    this.removedAttributes.push(name);
    if (name === "src") this.src = "";
  }

  load(): void {
    this.loads += 1;
  }

  addEventListener(type: "error" | "ended", cb: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), cb]);
  }

  fire(type: "error" | "ended"): void {
    if (type === "ended") {
      this.paused = true;
      this.ended = true;
    }
    for (const cb of this.listeners.get(type) ?? []) cb();
  }
}

interface FakeElement extends PlayerElement {
  readonly video: FakeVideo;
  readonly removed: boolean;
  readonly watching: boolean;
  tick(): void;
}

interface RigOptions {
  readonly readyState?: number;
  readonly duration?: number;
  readonly playRejects?: boolean;
  readonly volumeThrows?: boolean;
  /** Source de l'empreinte « lent » : promesse tenue à la main. */
  readonly slow?: Promise<string | null>;
}

interface Rig {
  readonly ports: PlayerPorts;
  readonly created: FakeElement[];
  readonly released: string[];
}

function fakeElement(o: RigOptions): FakeElement {
  const video = new FakeVideo(o.readyState ?? 4, o.duration ?? 2.5, o.playRejects ?? false, o.volumeThrows ?? false);
  const image = { fake: "image" } as unknown as CanvasImageSource;
  let cb: (() => void) | null = null;
  let removed = false;
  return {
    video,
    image,
    onFrame(f) {
      cb = f;
      return () => {
        if (cb === f) cb = null;
      };
    },
    remove() {
      removed = true;
    },
    tick() {
      cb?.();
    },
    get removed() {
      return removed;
    },
    get watching() {
      return cb !== null;
    },
  };
}

function rig(o: RigOptions = {}): Rig {
  const created: FakeElement[] = [];
  const released: string[] = [];
  let n = 0;
  const ports: PlayerPorts = {
    createVideo() {
      const el = fakeElement(o);
      created.push(el);
      return el;
    },
    source(asset) {
      if (asset === "lent" && o.slow) return o.slow;
      if (asset === "absent") return Promise.resolve(null);
      if (asset === "casse") return Promise.reject(new Error("magasin illisible"));
      n += 1;
      return Promise.resolve(`blob:${asset}#${n}`);
    },
    release(url) {
      released.push(url);
    },
  };
  return { ports, created, released };
}

function at(r: Rig, i: number): FakeElement {
  const el = r.created[i];
  if (el === undefined) throw new Error(`lecteur ${i} absent`);
  return el;
}

function deferred<T>(): { promise: Promise<T>; resolve(v: T): void } {
  let resolve: (v: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const BASE: MediaPlaySpec = {
  asset: "h1",
  mediaType: "video",
  duration: 2.5,
  trimStart: 0,
  trimEnd: null,
  loop: false,
  volume: 1,
};

const spec = (o: Partial<MediaPlaySpec> = {}): MediaPlaySpec => ({ ...BASE, ...o });

describe("lecteurs (C14, DAM3)", () => {
  it("Lecture : lecteur créé au premier geste, part du début du rognage, état lecture", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    const m = spec({ trimStart: 0.5, trimEnd: 1.5 });
    expect(r.created).toHaveLength(0);
    await p.toggle("a", m);
    expect(r.created).toHaveLength(1);
    const e = at(r, 0);
    expect(e.video.src).toBe("blob:h1#1");
    expect(e.video.preload).toBe("auto");
    expect(e.video.playsInline).toBe(true);
    expect(e.video.crossOrigin).toBe("anonymous");
    expect(e.video.currentTime).toBe(0.5);
    expect(e.video.paused).toBe(false);
    expect(e.watching).toBe(true);
    expect(p.state("a")).toEqual({ status: "lecture", time: 0.5 });
    expect(p.progress("a")).toEqual({ time: 0.5, playing: true });

    // Dans le rognage : la position est gardée ; à la fin du rognage : retour au début.
    await p.toggle("a", m);
    e.video.currentTime = 1;
    await p.toggle("a", m);
    expect(e.video.currentTime).toBe(1);
    await p.toggle("a", m);
    e.video.currentTime = 1.5;
    await p.toggle("a", m);
    expect(e.video.currentTime).toBe(0.5);
    expect(r.created).toHaveLength(1);
  });

  it("poster tant que non lancé : frame null", async () => {
    const r = rig({ readyState: 0 });
    const p = createMediaPlayers(r.ports);
    expect(p.frame("a")).toBeNull();
    expect(p.frame("a")).toBeNull();
    expect(p.state("a")).toBeNull();
    expect(p.progress("a")).toBeNull();
    // Le rendu ne crée aucun lecteur (contrairement au cache d'images, qui décode au premier `bitmap`).
    expect(r.created).toHaveLength(0);

    await p.toggle("a", spec());
    expect(p.frame("a")).toBeNull();
    at(r, 0).video.readyState = 2;
    expect(p.frame("a")).toBe(at(r, 0).image);
    // Un autre élément de la même empreinte n'a pas de lecteur : poster.
    expect(p.frame("b")).toBeNull();
    expect(p.state("b")).toBeNull();
  });

  it("pause : l'image courante reste", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec());
    const e = at(r, 0);
    e.video.currentTime = 1.2;
    await p.toggle("a", spec());
    expect(e.video.paused).toBe(true);
    expect(e.watching).toBe(false);
    expect(p.state("a")).toEqual({ status: "pause", time: 1.2 });
    expect(p.progress("a")).toEqual({ time: 1.2, playing: false });
    expect(p.frame("a")).toBe(e.image);
  });

  it("lecture refusée (play rejeté) : pause", async () => {
    const r = rig({ playRejects: true });
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec());
    const e = at(r, 0);
    expect(p.state("a")?.status).toBe("pause");
    expect(e.video.paused).toBe(true);
    expect(e.watching).toBe(false);
  });

  it("fin du rognage sans boucle : pause (M24)", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec({ trimStart: 0.5, trimEnd: 1.5 }));
    const e = at(r, 0);
    e.video.currentTime = 1.4;
    e.tick();
    expect(p.state("a")).toEqual({ status: "lecture", time: 1.4 });
    e.video.currentTime = 1.52;
    e.tick();
    expect(e.video.paused).toBe(true);
    expect(e.watching).toBe(false);
    expect(p.state("a")).toEqual({ status: "pause", time: 1.52 });
    expect(p.frame("a")).toBe(e.image);
  });

  it("boucle : retour au début à la fin du rognage", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec({ trimStart: 0.5, trimEnd: 1.5, loop: true }));
    const e = at(r, 0);
    // `trimEnd` est avant la fin du fichier : aucun `ended` n'arrive, seule l'image du lecteur voit la fin.
    e.video.currentTime = 1.5;
    e.tick();
    expect(e.video.currentTime).toBe(0.5);
    expect(e.video.paused).toBe(false);
    expect(e.watching).toBe(true);
    expect(p.state("a")).toEqual({ status: "lecture", time: 0.5 });
    e.video.currentTime = 1.6;
    e.tick();
    expect(e.video.currentTime).toBe(0.5);
    expect(p.state("a")?.status).toBe("lecture");
  });

  it("ended sans trimEnd : boucle ou pause", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec({ trimStart: 0.4, loop: true }));
    await p.toggle("b", spec());
    const a = at(r, 0);
    const b = at(r, 1);
    a.video.currentTime = 2.5;
    a.video.fire("ended");
    expect(a.video.currentTime).toBe(0.4);
    expect(a.video.paused).toBe(false);
    expect(p.state("a")?.status).toBe("lecture");
    b.video.currentTime = 2.5;
    b.video.fire("ended");
    expect(b.video.paused).toBe(true);
    expect(p.state("b")).toEqual({ status: "pause", time: 2.5 });
    expect(p.frame("b")).toBe(b.image);

    // Sans `trimEnd`, la fin est la durée du lecteur, sinon celle du document.
    a.video.duration = 2;
    a.video.currentTime = 2;
    a.tick();
    expect(a.video.currentTime).toBe(0.4);
    await p.toggle("c", spec());
    const c = at(r, 2);
    c.video.duration = Number.NaN;
    c.video.currentTime = 2.4;
    c.tick();
    expect(p.state("c")?.status).toBe("lecture");
    c.video.currentTime = 2.5;
    c.tick();
    expect(p.state("c")).toEqual({ status: "pause", time: 2.5 });
  });

  it("volume appliqué ; apply relit les réglages (M23)", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec({ volume: 0.4 }));
    const e = at(r, 0);
    expect(e.video.volume).toBe(0.4);
    e.video.currentTime = 0.5;
    p.apply("a", spec({ volume: 0.8, trimStart: 1, trimEnd: 2 }));
    expect(e.video.volume).toBe(0.8);
    expect(e.video.currentTime).toBe(1);
    e.video.currentTime = 2;
    e.tick();
    expect(p.state("a")).toEqual({ status: "pause", time: 2 });
    p.apply("z", spec());
    expect(r.created).toHaveLength(1);
    expect(p.state("z")).toBeNull();

    // H1-8 : volume en lecture seule (iPad), la lecture part quand même.
    const r2 = rig({ volumeThrows: true });
    const p2 = createMediaPlayers(r2.ports);
    await expect(p2.toggle("a", spec({ volume: 0.3 }))).resolves.toBeUndefined();
    expect(p2.state("a")?.status).toBe("lecture");
  });

  it("seek : lecteur créé, position posée, image montrée", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    await Promise.all([p.seek("a", 1.2, spec()), p.seek("a", 1.2, spec())]);
    expect(r.created).toHaveLength(1);
    const e = at(r, 0);
    expect(e.video.currentTime).toBe(1.2);
    expect(e.video.paused).toBe(true);
    expect(p.state("a")).toEqual({ status: "pause", time: 1.2 });
    expect(p.frame("a")).toBe(e.image);
    await p.seek("a", 9, spec());
    expect(e.video.currentTime).toBe(2.5);
    await p.seek("a", -1, spec());
    expect(e.video.currentTime).toBe(0);
    await p.toggle("a", spec());
    await p.seek("a", 1, spec());
    expect(p.state("a")).toEqual({ status: "lecture", time: 1 });
  });

  it("sync : lecteur jeté quand son élément disparaît (Review Focus 3)", async () => {
    const gate = deferred<string | null>();
    const r = rig({ slow: gate.promise });
    const p = createMediaPlayers(r.ports);
    // Deux éléments, une seule empreinte : deux lecteurs.
    await p.toggle("a", spec());
    await p.toggle("b", spec());
    expect(r.created).toHaveLength(2);
    const a = at(r, 0);
    const b = at(r, 1);
    const late = p.toggle("c", spec({ asset: "lent" }));
    let calls = 0;
    p.onChange(() => {
      calls += 1;
    });
    p.sync((id) => (id === "b" ? spec({ volume: 0.3 }) : null));
    expect(calls).toBe(1);
    expect(a.video.paused).toBe(true);
    expect(a.video.removedAttributes).toContain("src");
    expect(a.video.loads).toBe(1);
    expect(a.removed).toBe(true);
    expect(a.watching).toBe(false);
    expect(r.released).toEqual(["blob:h1#1"]);
    expect(p.state("a")).toBeNull();
    expect(p.frame("a")).toBeNull();
    expect(b.removed).toBe(false);
    expect(p.state("b")?.status).toBe("lecture");
    expect(b.video.volume).toBe(0.3);

    // La création en attente d'un élément disparu est jetée à son arrivée.
    gate.resolve("blob:lent");
    await late;
    expect(p.state("c")).toBeNull();
    expect(r.released).toEqual(["blob:h1#1", "blob:lent"]);
    expect(r.created.slice(2).every((el) => el.removed)).toBe(true);
  });

  it("pauseAll puis clear : poster revenu", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec());
    await p.seek("b", 1, spec());
    const a = at(r, 0);
    const b = at(r, 1);
    p.pauseAll();
    expect(a.video.paused).toBe(true);
    expect(a.watching).toBe(false);
    expect(p.state("a")?.status).toBe("pause");
    expect(p.frame("a")).toBe(a.image);
    p.clear();
    expect(p.state("a")).toBeNull();
    expect(p.frame("a")).toBeNull();
    expect(p.frame("b")).toBeNull();
    expect(a.removed).toBe(true);
    expect(b.removed).toBe(true);
    expect(r.released).toHaveLength(2);
    expect(mediaTag(spec(), p.state("a"))).toBe("video;poster;0.0;0.0-2.5;0;100");
    await p.toggle("a", spec());
    expect(r.created).toHaveLength(3);
  });

  it("source introuvable ou erreur : echec", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec({ asset: "absent" }));
    expect(p.state("a")?.status).toBe("echec");
    expect(p.frame("a")).toBeNull();
    expect(mediaTag(spec({ asset: "absent" }), p.state("a"))).toBe("video;echec;0.0;0.0-2.5;0;100");
    await p.toggle("k", spec({ asset: "casse" }));
    expect(p.state("k")?.status).toBe("echec");

    await p.toggle("b", spec());
    const e = r.created[r.created.length - 1];
    if (e === undefined) throw new Error("lecteur absent");
    e.video.fire("error");
    expect(p.state("b")?.status).toBe("echec");
    expect(p.frame("b")).toBeNull();
    expect(e.watching).toBe(false);
    await p.toggle("b", spec());
    expect(p.state("b")?.status).toBe("echec");
  });

  it("onChange à chaque image, désabonnement", async () => {
    const r = rig();
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec());
    const e = at(r, 0);
    let calls = 0;
    const off = p.onChange(() => {
      calls += 1;
    });
    for (const t of [0.1, 0.2, 0.3]) {
      e.video.currentTime = t;
      e.tick();
    }
    expect(calls).toBe(3);
    off();
    e.video.currentTime = 0.4;
    e.tick();
    expect(calls).toBe(3);
  });

  it("dispose : lecteurs jetés, création en attente libérée", async () => {
    const gate = deferred<string | null>();
    const r = rig({ slow: gate.promise });
    const p = createMediaPlayers(r.ports);
    await p.toggle("a", spec());
    const a = at(r, 0);
    let calls = 0;
    p.onChange(() => {
      calls += 1;
    });
    const late = p.toggle("b", spec({ asset: "lent" }));
    p.dispose();
    expect(a.removed).toBe(true);
    expect(r.released).toEqual(["blob:h1#1"]);
    expect(p.state("a")).toBeNull();
    gate.resolve("blob:lent");
    await late;
    expect(r.released).toEqual(["blob:h1#1", "blob:lent"]);
    expect(r.created.every((el) => el.removed)).toBe(true);
    expect(p.state("b")).toBeNull();
    expect(p.frame("b")).toBeNull();
    await p.toggle("c", spec());
    expect(p.state("c")).toBeNull();
    expect(calls).toBe(0);
  });

  it("mediaTag", () => {
    expect(mediaTag(null, null)).toBe("");
    expect(mediaTag(spec(), null)).toBe("video;poster;0.0;0.0-2.5;0;100");
    expect(
      mediaTag(spec({ mediaType: "audio", trimStart: 0.5, trimEnd: 1.5, loop: true, volume: 0.4 }), {
        status: "lecture",
        time: 0.66,
      }),
    ).toBe("audio;lecture;0.7;0.5-1.5;1;40");
  });
});
