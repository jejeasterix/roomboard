import { describe, expect, it } from "vitest";
import {
  CODEC_UNREADABLE,
  MEDIA_MIME,
  posterSize,
  probeMedia,
  sniffMedia,
  unsupportedMediaHandler,
  unsupportedMediaMessage,
  type MediaPorts,
  type ProbeVideo,
} from "./media-import";

const bytes = (...parts: (string | number[])[]): Uint8Array =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const ftyp = (brand: string): Uint8Array => bytes([0, 0, 0, 24], "ftyp", brand, [0, 0, 0, 0], "isomiso2");
const atom = (name: string): Uint8Array => bytes([0, 0, 0, 40], name, new Array<number>(32).fill(0));
const ebml = (doctype: string): Uint8Array =>
  bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0x82, 0x80 | doctype.length], doctype, [0x42, 0x87, 0x81, 0x04]);
const riff = (kind: string): Uint8Array => bytes("RIFF", [0x24, 0, 0, 0], kind, new Array<number>(16).fill(0));

describe("sniffMedia (C14, M10)", () => {
  const cases: readonly (readonly [string, Uint8Array, string, string | null])[] = [
    ["mp4 isom", ftyp("isom"), "a.mp4", "mp4"],
    ["mov qt", ftyp("qt  "), "a.mov", "mov"],
    ["m4a", ftyp("M4A "), "a.m4a", "m4a"],
    ["HEIC", ftyp("heic"), "a.heic", null],
    ["AVIF", ftyp("avif"), "a.avif", null],
    ["atome moov + .mov", atom("moov"), "a.mov", "mov"],
    ["moov sans .mov", atom("moov"), "a.bin", null],
    ["webm", ebml("webm"), "a.webm", "webm"],
    ["mkv", ebml("matroska"), "a.mkv", "unsupported:mkv"],
    ["wav", riff("WAVE"), "a.wav", "wav"],
    ["avi", riff("AVI "), "a.avi", "unsupported:avi"],
    ["WEBP", riff("WEBP"), "a.webp", null],
    ["OggS", bytes("OggS", new Array<number>(20).fill(0)), "a.ogg", "ogg"],
    ["ID3", bytes("ID3", [3, 0, 0], new Array<number>(20).fill(0)), "a.mp3", "mp3"],
    ["synchro FF FB", bytes([0xff, 0xfb, 0x90, 0x44], new Array<number>(20).fill(0)), "a.mp3", "mp3"],
    ["JPEG", bytes([0xff, 0xd8, 0xff, 0xe0], new Array<number>(20).fill(0)), "a.jpg", null],
    ["PNG", bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], new Array<number>(20).fill(0)), "a.png", null],
    ["vide", new Uint8Array(0), "a.mp4", null],
  ];
  it("table de 18 cas", () => {
    expect(cases.length).toBe(18 - 0); // 18 cas
    for (const [label, head, name, want] of cases) {
      const got = sniffMedia(head, name);
      const shown = got === null ? null : "unsupported" in got ? `unsupported:${got.unsupported}` : got.format;
      expect(shown, label).toBe(want);
    }
  });
  it("le type MIME suit le format", () => {
    expect(sniffMedia(ftyp("M4A "), "a.m4a")).toEqual({ format: "m4a", mime: MEDIA_MIME.m4a });
    expect(MEDIA_MIME.m4a).toBe("audio/mp4");
  });
});

type Ev = "loadedmetadata" | "durationchange" | "seeked" | "error";
interface Fake extends ProbeVideo {
  removed: boolean;
  loaded: number;
  seeks: number[];
}
function fakeVideo(o: { duration?: number; infinite?: boolean; w?: number; h?: number; error?: boolean; silent?: boolean }): Fake {
  const l = new Map<Ev, Set<() => void>>();
  const fire = (t: Ev): void => queueMicrotask(() => [...(l.get(t) ?? [])].forEach((cb) => cb()));
  let src = "";
  let time = 0;
  let duration = o.infinite === true ? Infinity : (o.duration ?? 0);
  const v: Fake = {
    preload: "",
    muted: false,
    playsInline: false,
    crossOrigin: null,
    removed: false,
    loaded: 0,
    seeks: [],
    get src() {
      return src;
    },
    set src(s: string) {
      src = s;
      if (o.silent === true) return;
      fire(o.error === true ? "error" : "loadedmetadata");
    },
    get currentTime() {
      return time;
    },
    set currentTime(t: number) {
      time = t;
      v.seeks.push(t);
      if (duration === Infinity) {
        duration = o.duration ?? 0;
        fire("durationchange");
      } else fire("seeked");
    },
    get duration() {
      return duration;
    },
    videoWidth: o.w ?? 0,
    videoHeight: o.h ?? 0,
    addEventListener: (t, cb) => void (l.get(t) ?? l.set(t, new Set()).get(t))?.add(cb),
    removeEventListener: (t, cb) => void l.get(t)?.delete(cb),
    removeAttribute: () => void (v.removed = true),
    load: () => void v.loaded++,
  };
  return v;
}
function ports(v: Fake, snaps: { w: number; h: number; at: number }[] = []): MediaPorts {
  return {
    createVideo: () => v,
    snapshot: async (video, w, h) => {
      snaps.push({ w, h, at: video.currentTime });
      return new Blob(["x"], { type: "image/jpeg" });
    },
    setTimer: (cb, ms) => {
      const id = setTimeout(cb, ms);
      return () => clearTimeout(id);
    },
  };
}

describe("probeMedia (C14, M15)", () => {
  it("vidéo 2,5 s en 640 x 360 : poster à 0,25 s", async () => {
    const v = fakeVideo({ duration: 2.5, w: 640, h: 360 });
    const snaps: { w: number; h: number; at: number }[] = [];
    const r = await probeMedia("blob:x", ports(v, snaps));
    expect(r.duration).toBe(2.5);
    expect([r.width, r.height]).toEqual([640, 360]);
    expect(r.poster).not.toBeNull();
    expect(snaps).toEqual([{ w: 640, h: 360, at: 0.25 }]);
    expect([v.preload, v.muted, v.playsInline, v.crossOrigin]).toEqual(["metadata", true, true, "anonymous"]);
  });
  it("durée Infinity : saut à la fin, durée lue par durationchange", async () => {
    const v = fakeVideo({ duration: 12, infinite: true, w: 320, h: 180 });
    const r = await probeMedia("blob:x", ports(v));
    expect(v.seeks[0]).toBe(1e101);
    expect(r.duration).toBe(12);
  });
  it("son : poster null, snapshot jamais appelé", async () => {
    const v = fakeVideo({ duration: 3 });
    const snaps: { w: number; h: number; at: number }[] = [];
    const r = await probeMedia("blob:x", ports(v, snaps));
    expect(r.poster).toBeNull();
    expect(snaps).toEqual([]);
  });
  it("error : rejet codec non lu", async () => {
    const v = fakeVideo({ error: true });
    await expect(probeMedia("blob:x", ports(v))).rejects.toThrow(CODEC_UNREADABLE);
    expect(v.removed && v.loaded > 0).toBe(true);
  });
  it("délai : même rejet", async () => {
    const v = fakeVideo({ silent: true });
    await expect(probeMedia("blob:x", ports(v), 20)).rejects.toThrow(CODEC_UNREADABLE);
    expect(v.removed && v.loaded > 0).toBe(true);
  });
  it("src retiré et load appelé en cas de succès", async () => {
    const v = fakeVideo({ duration: 1, w: 10, h: 10 });
    await probeMedia("blob:x", ports(v));
    expect(v.removed).toBe(true);
    expect(v.loaded).toBeGreaterThan(0);
  });
  it("posterSize borne à 1920, sans agrandir", () => {
    expect(posterSize(3840, 2160)).toEqual({ w: 1920, h: 1080 });
    expect(posterSize(320, 180)).toEqual({ w: 320, h: 180 });
  });
});

describe("MKV et AVI : gestionnaires de refus", () => {
  it.each(["mkv", "avi"] as const)("%s", (kind) => {
    const h = unsupportedMediaHandler(kind);
    const head = kind === "mkv" ? ebml("matroska") : riff("AVI ");
    expect(h.id).toBe(`media-${kind}`);
    expect(h.nature).toBe("objet");
    expect(h.detect(head, "x")).toBe(true);
    expect(h.detect(kind === "mkv" ? ebml("webm") : riff("WAVE"), "x")).toBe(false);
    expect(h.limit).toEqual({ maxBytes: -1, message: unsupportedMediaMessage(kind) });
    expect(unsupportedMediaMessage(kind)).toBe(`format ${kind.toUpperCase()} non lu par RoomBoard ; convertissez-le en MP4 ou WebM`);
  });
});
