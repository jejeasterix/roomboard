import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { mp3, mp4, mp4Broken, ogg, wav, webm } from "../../../scripts/essais/fabriques/medias.mjs";
import { main } from "./main";
import { describeWasm, memoryIO, stampOf, tmpDir, type Json } from "./testing";

async function board(): Promise<{ dir: string; a: string }> {
  const dir = tmpDir();
  const a = join(dir, "a.roomboard");
  expect(await main(["new", a], memoryIO())).toBe(0);
  return { dir, a };
}
async function mediaByName(a: string): Promise<Record<string, Json>> {
  const st = memoryIO();
  expect(await main(["state", a], st)).toBe(0);
  const s = st.json()[0];
  const name = (id: string): string => s.assets.find((x: Json) => x.id === id)?.name;
  return Object.fromEntries(s.pages[0].elements.filter((e: Json) => e.kind === "media").map((e: Json) => [name(e.media.asset), e.media]));
}

describeWasm("S3 — médias (cli-lot4)", () => {
  it("S3 — import son.wav clip.mp4 clip.webm : trois médias, durée et taille de l'en-tête, poster nul", async () => {
    const { dir, a } = await board();
    const files: Record<string, Uint8Array> = { "son.wav": wav(1), "clip.mp4": mp4({ duration: 2.5, width: 640, height: 360 }), "clip.webm": webm({ duration: 3.2, width: 320, height: 240 }) };
    for (const [n, b] of Object.entries(files)) writeFileSync(join(dir, n), b);
    const io = memoryIO();
    expect(await main(["import", a, ...Object.keys(files).map((n) => join(dir, n))], io)).toBe(0);
    expect(io.json()[0]).toMatchObject({ inserted: ["son.wav", "clip.mp4", "clip.webm"], refused: [], failed: [] });
    expect(io.stderr).toEqual([]);
    const m = await mediaByName(a);
    expect(m["son.wav"]).toMatchObject({ mediaType: "audio", w: 480, h: 120, duration: 1, poster: null });
    expect(m["clip.mp4"]).toMatchObject({ mediaType: "video", w: 640, h: 360, duration: 2.5, poster: null });
    expect(m["clip.webm"]).toMatchObject({ mediaType: "video", w: 320, h: 240, duration: 3.2, poster: null });
  });
  it("S3 — MP3 (Xing) et Ogg Vorbis : sons, durées lues", async () => {
    const { dir, a } = await board();
    writeFileSync(join(dir, "a.mp3"), mp3({ frames: 100, xing: true }));
    writeFileSync(join(dir, "b.ogg"), ogg({ codec: "vorbis", granule: 88200 }));
    expect(await main(["import", a, join(dir, "a.mp3"), join(dir, "b.ogg")], memoryIO())).toBe(0);
    const m = await mediaByName(a);
    expect([m["a.mp3"]?.duration, m["b.ogg"]?.duration, m["a.mp3"]?.mediaType]).toEqual([2.612, 2, "audio"]);
  });
  it("S3 — import casse.mp4 (ftyp sans moov) : code 3 « durée du média illisible dans l'en-tête », rien écrit", async () => {
    const { dir, a } = await board();
    const casse = join(dir, "casse.mp4");
    writeFileSync(casse, mp4Broken());
    const before = stampOf(a);
    const io = memoryIO();
    expect(await main(["import", a, casse], io)).toBe(3);
    expect(io.errors()[0].error).toEqual({ code: "unsupported", message: "casse.mp4 : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias)" });
    expect(stampOf(a)).toEqual(before);
  });
});
