import { describe, expect, it } from "vitest";
import { gif, svg } from "../../../scripts/essais/fabriques/images.mjs";
import { mp4, mp4Broken, wav, webm } from "../../../scripts/essais/fabriques/medias.mjs";
import { headerBlocked, nodeMedia } from "./media-node";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const DURATION = (n: string) => `${n} : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias)`;
const SIZE = (n: string, k: string) => `${n} : taille de l'image ${k} illisible dans l'en-tête (la CLI ne décode pas les images)`;

describe("nodeMedia (cli-lot4, D60)", () => {
  it("nodeMedia — probe d'une URL de mediaUrls : MP4 2,5 s 640 × 360, poster nul (S3)", async () => {
    const m = nodeMedia();
    const url = m.mediaUrls.create(new Blob([mp4({ duration: 2.5, width: 640, height: 360 }) as BlobPart], { type: "video/mp4" }));
    try {
      expect(await m.probe(url)).toEqual({ duration: 2.5, width: 640, height: 360, poster: null });
    } finally {
      m.mediaUrls.revoke(url);
    }
  });
  it("nodeMedia — WAV 1 s : son 0 × 0 ; WebM 3,2 s 320 × 240", async () => {
    const m = nodeMedia();
    const a = m.mediaUrls.create(new Blob([wav(1) as BlobPart], { type: "audio/wav" }));
    const v = m.mediaUrls.create(new Blob([webm({ duration: 3.2, width: 320, height: 240 }) as BlobPart], { type: "video/webm" }));
    expect(await m.probe(a)).toEqual({ duration: 1, width: 0, height: 0, poster: null });
    expect(await m.probe(v)).toEqual({ duration: 3.2, width: 320, height: 240, poster: null });
    m.mediaUrls.revoke(a);
    m.mediaUrls.revoke(v);
  });
  it("nodeMedia — URL révoquée, type inconnu ou en-tête illisible : rejet (mediaHandler dit « codec non lu »)", async () => {
    const m = nodeMedia();
    const url = m.mediaUrls.create(new Blob([wav(1) as BlobPart], { type: "audio/wav" }));
    m.mediaUrls.revoke(url);
    await expect(m.probe(url)).rejects.toThrow();
    const untyped = m.mediaUrls.create(new Blob([wav(1) as BlobPart]));
    await expect(m.probe(untyped)).rejects.toThrow();
    const broken = m.mediaUrls.create(new Blob([mp4Broken() as BlobPart], { type: "video/mp4" }));
    await expect(m.probe(broken)).rejects.toThrow();
  });
});

describe("headerBlocked (cli-lot4, D62, D65, DA17, H47)", () => {
  it("headerBlocked — S3 : casse.mp4 (ftyp sans moov) → message de durée", async () =>
    expect(await headerBlocked("/tmp/x/casse.mp4", mp4Broken())).toBe(DURATION("casse.mp4")));
  it("headerBlocked — S5 : casse.gif (en-tête tronqué) → message de taille « gif »", async () =>
    expect(await headerBlocked("casse.gif", enc("GIF89a"))).toBe(SIZE("casse.gif", "gif")));
  it("headerBlocked — fichiers lisibles : null", async () => {
    for (const [name, bytes] of [["i.gif", gif(3, 4)], ["son.wav", wav(1)], ["clip.mp4", mp4({ duration: 1, width: 8, height: 8 })], ["vb.svg", svg('viewBox="0 0 400 100"')]] as const) {
      expect(await headerBlocked(name, bytes), name).toBeNull();
    }
  });
  it("headerBlocked — extensions hors image et média : null même illisible (tableau, PDF, fichier lié 3D, Office)", async () => {
    expect(await headerBlocked("a.iwb", enc("GIF89a"))).toBeNull();
    expect(await headerBlocked("tri.bin", Uint8Array.of(0xff, 0xe2, 0, 0))).toBeNull();
    expect(await headerBlocked("x.pdf", enc("GIF89a"))).toBeNull();
    expect(await headerBlocked("x.docx", mp4Broken())).toBeNull();
  });
  it("headerBlocked — extension absente de la table (.dat) : contrôlée par ses octets", async () => {
    expect(await headerBlocked("x.dat", mp4Broken())).toBe(DURATION("x.dat"));
    expect(await headerBlocked("notes.txt", enc("bonjour"))).toBeNull();
  });
  it("RF4 — x.png qui contient un GIF : taille du GIF lue, aucun code 3 ; GIF tronqué nommé .png : message « gif »", async () => {
    expect(await headerBlocked("x.png", gif(5, 6))).toBeNull();
    expect(await headerBlocked("x.png", enc("GIF89a"))).toBe(SIZE("x.png", "gif"));
  });
});
