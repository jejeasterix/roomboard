import { describe, expect, it } from "vitest";
import { mp3, mp4, mp4Broken, ogg, wav, webm } from "../../../../scripts/essais/fabriques/medias.mjs";
import { readMediaHeader } from "./media-header";
import { sniffMedia, type MediaFormat } from "./media-import";

const head = (b: Uint8Array, name: string) => sniffMedia(b.subarray(0, 4096), name);

describe("readMediaHeader (cli-lot4, D61, DA18)", () => {
  it("readMediaHeader — MP4 vidéo 2,5 s 640 × 360 (S3, clip.mp4)", () =>
    expect(readMediaHeader(mp4({ duration: 2.5, width: 640, height: 360 }), "mp4")).toEqual({ duration: 2.5, width: 640, height: 360 }));
  it("readMediaHeader — MP4 moov après mdat, mvhd et tkhd en version 1", () =>
    expect(readMediaHeader(mp4({ duration: 4, timescale: 90000, width: 320, height: 240, moovLast: true, version1: true }), "mp4")).toEqual({ duration: 4, width: 320, height: 240 }));
  it("readMediaHeader — M4A et MOV : son 0 × 0, vidéo w × h", () => {
    expect(readMediaHeader(mp4({ duration: 1.25, brand: "M4A " }), "m4a")).toEqual({ duration: 1.25, width: 0, height: 0 });
    expect(readMediaHeader(mp4({ duration: 3, width: 1920, height: 1080, brand: "qt  " }), "mov")).toEqual({ duration: 3, width: 1920, height: 1080 });
  });
  it("readMediaHeader — MP4 sans moov (S3, casse.mp4) : null", () => expect(readMediaHeader(mp4Broken(), "mp4")).toBeNull());
  it("readMediaHeader — WAV 1 s à 8 kHz (S3, son.wav)", () => expect(readMediaHeader(wav(1), "wav")).toEqual({ duration: 1, width: 0, height: 0 }));
  it("readMediaHeader — WAV sans chunk data : null", () => expect(readMediaHeader(wav(1).subarray(0, 36), "wav")).toBeNull());
  it("readMediaHeader — WebM avec Duration 3,2 s, vidéo 320 × 240", () =>
    expect(readMediaHeader(webm({ duration: 3.2, width: 320, height: 240 }), "webm")).toEqual({ duration: 3.2, width: 320, height: 240 }));
  it("readMediaHeader — WebM sans Duration (MediaRecorder) : dernier Cluster + dernier bloc", () =>
    expect(readMediaHeader(webm({ duration: null, width: 320, height: 240, clusters: [0, 1000, 2000], lastBlock: 500 }), "webm")).toEqual({ duration: 2.5, width: 320, height: 240 }));
  it("readMediaHeader — WebM son seul : 0 × 0", () => expect(readMediaHeader(webm({ duration: 1.5 }), "webm")).toEqual({ duration: 1.5, width: 0, height: 0 }));
  it("readMediaHeader — Ogg Vorbis 2 s, Opus 1,5 s (pré-saut retiré)", () => {
    expect(readMediaHeader(ogg({ codec: "vorbis", granule: 88200, rate: 44100 }), "ogg")).toEqual({ duration: 2, width: 0, height: 0 });
    expect(readMediaHeader(ogg({ codec: "opus", granule: 72312, preSkip: 312 }), "ogg")).toEqual({ duration: 1.5, width: 0, height: 0 });
  });
  it("readMediaHeader — Ogg Theora 3 s à 25 i/s, 320 × 240 (granule : image clé décalée de 6 bits)", () =>
    expect(readMediaHeader(ogg({ codec: "theora", granule: (70 << 6) + 5, width: 320, height: 240, frn: 25, frd: 1, shift: 6 }), "ogg")).toEqual({ duration: 3, width: 320, height: 240 }));
  it("readMediaHeader — Ogg FLAC : null (H42)", () => expect(readMediaHeader(ogg({ codec: "flac", granule: 44100 }), "ogg")).toBeNull());
  it("readMediaHeader — MP3 Xing : cadres × 1152 / 44 100", () => expect(readMediaHeader(mp3({ frames: 100, xing: true }), "mp3")).toEqual({ duration: 2.612, width: 0, height: 0 }));
  it("readMediaHeader — MP3 sans Xing : débit constant du premier cadre (H42), aussi derrière une balise ID3", () => {
    expect(readMediaHeader(mp3({ frames: 100 }), "mp3")).toEqual({ duration: 2.606, width: 0, height: 0 });
    expect(readMediaHeader(mp3({ frames: 100, id3: true }), "mp3")).toEqual({ duration: 2.606, width: 0, height: 0 });
  });
  it("readMediaHeader — MP3 sans cadre valide : null", () => expect(readMediaHeader(new Uint8Array(64).fill(0xff), "mp3")).toBeNull());
  it("RF1 — chaque préfixe d'un média fabriqué : en-tête ou null, jamais d'exception", () => {
    const all: Array<[Uint8Array, MediaFormat]> = [
      [mp4({ duration: 1, width: 8, height: 8 }), "mp4"], [webm({ duration: null, width: 8, height: 8, clusters: [0, 40] }), "webm"], [wav(0.01), "wav"],
      [ogg({ codec: "theora", granule: 64, width: 8, height: 8 }), "ogg"], [mp3({ frames: 3, xing: true, id3: true }), "mp3"],
    ];
    for (const [bytes, format] of all) for (let n = 0; n <= bytes.length; n++) expect(() => readMediaHeader(bytes.subarray(0, n), format)).not.toThrow();
  });
  it("chaque fabrique est reconnue par sniffMedia au format attendu", () => {
    expect(head(mp4({ duration: 1, width: 8, height: 8 }), "a.mp4")).toEqual({ format: "mp4", mime: "video/mp4" });
    expect(head(mp4({ duration: 1, brand: "M4A " }), "a.m4a")).toEqual({ format: "m4a", mime: "audio/mp4" });
    expect(head(mp4({ duration: 1, width: 8, height: 8, brand: "qt  " }), "a.mov")).toEqual({ format: "mov", mime: "video/quicktime" });
    expect(head(webm({ duration: 1 }), "a.webm")).toEqual({ format: "webm", mime: "video/webm" });
    expect(head(wav(0.01), "a.wav")).toEqual({ format: "wav", mime: "audio/wav" });
    expect(head(ogg({ codec: "vorbis", granule: 1 }), "a.ogg")).toEqual({ format: "ogg", mime: "audio/ogg" });
    expect(head(mp3({ frames: 2 }), "a.mp3")).toEqual({ format: "mp3", mime: "audio/mpeg" });
    expect(head(mp3({ frames: 2, id3: true }), "a.mp3")).toEqual({ format: "mp3", mime: "audio/mpeg" });
    expect(head(mp4Broken(), "casse.mp4")).toEqual({ format: "mp4", mime: "video/mp4" });
  });
});
