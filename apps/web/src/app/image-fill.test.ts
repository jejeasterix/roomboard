import { describe, expect, it, vi } from "vitest";
import type { AssetRef, Change, Command, ElementView, ImageData } from "../core/api";
import type { FillRequest } from "../engine/fill-target";
import { FILL_UNREADABLE_MESSAGE, type PixelFillJob, type PixelFillResult } from "../platform/pixel-runner";
import { createFillQueue, FILL_ABANDONED_MESSAGE, FILL_MISSING_MESSAGE, FILL_NO_RUNNER, FILL_NOT_READY_MESSAGE, fillFailure, pngName, type FillQueueDeps, type PotState } from "./image-fill";

const A = "ab".repeat(32);
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const bmp = (tag: string) => ({ tag, width: 4, height: 2, close: vi.fn() }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };
const filled = (bitmap: ImageBitmap): PixelFillResult => ({ changed: 3, png: new Blob([new Uint8Array([7])], { type: "image/png" }), bitmap });

/** Document minimal : une image « img » (JPEG) ; `run` écrit comme le cœur (version + 1), `foreign` imite une écriture
 *  étrangère (Ctrl+Z, trait d'un autre outil) ; `put` rend une empreinte « 1111… », « 2222… ». */
function world(image: Partial<ImageData> = {}) {
  let version = 1;
  let img: ImageData = { asset: A, w: 4, h: 2, ...image };
  const metas = new Map<string, AssetRef>([[A, { id: A, name: "photo.jpg", mime: "image/jpeg", size: 3 }]]);
  const blobs = new Map<string, Blob>([[A, new Blob([new Uint8Array([1])], { type: "image/jpeg" })]]);
  const writes: Command[] = [];
  let refuse = false;
  const doc: FillQueueDeps["doc"] = {
    element: (id) => (id === "img" ? ({ id, kind: "image", transform: [1, 0, 0, 1, 0, 0], image: img } as ElementView) : null),
    asset: (id) => metas.get(id) ?? null,
    version: () => version,
  };
  const run = (c: Command): Change | null => {
    if (refuse) return null;
    writes.push(c);
    if (c.type === "Fill" && c.target.kind === "image") {
      img = { asset: c.target.asset.id, w: img.w, h: img.h, sourceAsset: img.sourceAsset ?? img.asset };
      metas.set(c.target.asset.id, c.target.asset);
    }
    version++;
    return { pages: ["p"], ids: ["img"], removed: [], full: false, version };
  };
  let n = 0;
  const put = vi.fn(async (b: Blob): Promise<string> => {
    const id = String(++n).repeat(64);
    blobs.set(id, b);
    return id;
  });
  const assets: FillQueueDeps["assets"] = { put, get: (id: string) => blobs.get(id) };
  const images = { copyOf: vi.fn((_a: string): Promise<ImageBitmap> | null => null), adopt: vi.fn() };
  const jobs: { job: PixelFillJob; resolve: (r: PixelFillResult | null) => void; reject: (e: Error) => void }[] = [];
  const runner = { fill: vi.fn((job: PixelFillJob) => new Promise<PixelFillResult | null>((resolve, reject) => jobs.push({ job, resolve, reject }))) };
  const states: PotState[] = [];
  const report = vi.fn();
  const deps: FillQueueDeps = { doc, assets, images, runner, report, onState: (s) => void states.push(s) };
  return {
    deps, run, writes, jobs, images, put, states, report, blobs,
    foreign: (): void => void version++,
    refuse: (v: boolean): void => void (refuse = v),
    image: (): ImageData => img,
  };
}
const at = (color: string | null = "#facc15", seed: readonly [number, number] = [1, 1]): FillRequest => ({ type: "ImageFill", page: "p", id: "img", seed, color, tolerance: 5 });
const shape: FillRequest = { command: { type: "Fill", page: "p", target: { kind: "inside", id: "rect" }, color: "#facc15" } };
const lastReport = (w: ReturnType<typeof world>): unknown => w.report.mock.calls.at(-1)?.[0];

describe("file du pot (C6b, DAB2, B13, B14)", () => {
  it("file vide : un clic vectoriel s'écrit tout de suite (C6a inchangé)", () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(shape, w.run);
    expect(w.writes).toEqual([(shape as { command: Command }).command]);
    expect(q.state()).toBe("");
  });

  it("S5 h : travail envoyé : original du magasin (pas la copie d'affichage), graine, taille source, tolérance, couleur, pixels de C5", async () => {
    const w = world({ w: 6000, h: 4000, brightness: 20, crop: [0, 0, 100, 100] });
    const q = createFillQueue(w.deps);
    q.submit(at("#facc15", [3, 1]), w.run);
    await flush();
    const job = w.jobs[0]?.job;
    expect(job).toMatchObject({ seed: [3, 1], size: [6000, 4000], tolerance: 5, color: "#facc15", brightness: 20 });
    const src = await job!.source();
    expect("blob" in src ? [src.blob, src.kind] : null).toEqual([w.blobs.get(A), "jpeg"]);
    expect([w.states, q.state()]).toEqual([["attente"], "attente"]);
  });

  it("S5 a : deux clics rapides : deux étapes dans l'ordre ; le second calculé après l'écriture du premier, sur l'asset écrit", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at("#facc15"), w.run);
    q.submit(at(null), w.run);
    await flush();
    expect(w.jobs).toHaveLength(1);
    const b1 = bmp("1");
    w.jobs[0]?.resolve(filled(b1));
    await flush();
    expect(w.writes).toHaveLength(1);
    expect(w.jobs).toHaveLength(2);
    const src = await w.jobs[1]!.job.source();
    expect("blob" in src ? src.blob : null).toBe(w.blobs.get(w.image().asset));
    w.jobs[1]?.resolve(filled(bmp("2")));
    await flush();
    expect(w.writes.map((c) => (c.type === "Fill" && c.target.kind === "image" ? [c.target.asset.name, c.target.asset.mime, c.color] : null))).toEqual([
      ["photo.png", "image/png", "#facc15"],
      ["photo.png", "image/png", null],
    ]);
    expect(w.image().sourceAsset).toBe(A);
    expect(w.images.adopt).toHaveBeenCalledTimes(2);
    expect(w.images.adopt.mock.calls[0]).toEqual(["1".repeat(64), b1]);
    expect(w.states.at(-1)).toBe("pret");
  });

  it("S5 b : clic sur l'image puis clic dans une forme : deux étapes dans l'ordre des clics", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    q.submit(shape, w.run);
    expect(w.writes).toEqual([]);
    await flush();
    w.jobs[0]?.resolve(filled(bmp("1")));
    await flush();
    expect(w.writes.map((c) => (c.type === "Fill" ? c.target.kind : ""))).toEqual(["image", "inside"]);
  });

  it("S5 c : écriture étrangère pendant le calcul : rien ne s'écrit, file vidée, bitmap fermé, abandon et message", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    q.submit(shape, w.run);
    await flush();
    w.foreign();
    const b = bmp("1");
    w.jobs[0]?.resolve(filled(b));
    await flush();
    expect(w.writes).toEqual([]);
    expect(b.close).toHaveBeenCalledTimes(1);
    expect([w.states.at(-1), lastReport(w)]).toEqual(["abandon", FILL_ABANDONED_MESSAGE]);
    expect(w.images.adopt).not.toHaveBeenCalled();
    expect(w.put).not.toHaveBeenCalled();
    q.submit(shape, w.run);
    expect(w.writes).toHaveLength(1);
  });

  it("écriture étrangère pendant l'enregistrement du PNG au magasin : abandon aussi (jeton vérifié avant l'écriture)", async () => {
    const w = world();
    let release!: () => void;
    w.put.mockImplementationOnce(() => new Promise<string>((r) => (release = () => r("9".repeat(64)))));
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    await flush();
    const b = bmp("1");
    w.jobs[0]?.resolve(filled(b));
    await flush();
    w.foreign();
    release();
    await flush();
    expect([w.writes.length, b.close.mock.calls.length, w.states.at(-1)]).toEqual([0, 1, "abandon"]);
  });

  it("S5 d : asset absent du magasin, puis décodage échoué : messages distincts, refus, aucune étape", async () => {
    const w = world();
    w.blobs.delete(A);
    createFillQueue(w.deps).submit(at(), w.run);
    await flush();
    expect([lastReport(w), w.states.at(-1), w.jobs.length, w.writes.length]).toEqual([FILL_MISSING_MESSAGE, "refus", 0, 0]);
    const v = world();
    createFillQueue(v.deps).submit(at(), v.run);
    await flush();
    v.jobs[0]?.reject(new Error(FILL_UNREADABLE_MESSAGE));
    await flush();
    expect([lastReport(v), v.states.at(-1), v.writes.length]).toEqual([FILL_UNREADABLE_MESSAGE, "refus", 0]);
  });

  it("SVG : copie du bitmap du cache ; pas encore décodé : « image pas encore prête »", async () => {
    const w = world();
    w.blobs.set(A, new Blob([new Uint8Array([1])], { type: "image/svg+xml" }));
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    await flush();
    expect([lastReport(w), w.states.at(-1), w.jobs.length]).toEqual([FILL_NOT_READY_MESSAGE, "refus", 0]);
    const copy = bmp("copie");
    w.images.copyOf.mockReturnValue(Promise.resolve(copy));
    q.submit(at(), w.run);
    await flush();
    const src = await w.jobs[0]!.job.source();
    expect("bitmap" in src ? src.bitmap : null).toBe(copy);
  });

  it("SVG, lanceur fermé avant le calcul (fill rend null sans lire la source) : la copie du bitmap est fermée ; lue, elle ne l'est pas", async () => {
    const w = world();
    w.blobs.set(A, new Blob([new Uint8Array([1])], { type: "image/svg+xml" }));
    const copy = bmp("copie");
    w.images.copyOf.mockReturnValue(Promise.resolve(copy));
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    await flush();
    w.jobs[0]?.resolve(null);
    await flush();
    expect(copy.close).toHaveBeenCalledTimes(1);
    // Source lue par le lanceur : la copie lui appartient, la file ne la ferme pas.
    const read = bmp("lue");
    w.images.copyOf.mockReturnValue(Promise.resolve(read));
    q.submit(at(), w.run);
    await flush();
    await w.jobs[1]!.job.source();
    w.jobs[1]?.resolve(filled(bmp("2")));
    await flush();
    expect(read.close).not.toHaveBeenCalled();
  });

  it("S5 e : module formats absent (erreur du Worker) ou lanceur absent : echec, aucune étape", async () => {
    const w = world();
    createFillQueue(w.deps).submit(at(), w.run);
    await flush();
    w.jobs[0]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect([lastReport(w), w.states.at(-1), w.writes.length]).toEqual([fillFailure("module des pixels indisponible"), "echec", 0]);
    const v = world();
    const { runner: _unused, ...noRunner } = v.deps;
    createFillQueue(noRunner).submit(at(), v.run);
    await flush();
    expect([lastReport(v), v.states.at(-1), v.writes.length]).toEqual([fillFailure(FILL_NO_RUNNER), "echec", 0]);
  });

  it("S5 f : refus du cœur après le calcul : bitmap fermé, rien adopté, état refus", async () => {
    const w = world();
    w.refuse(true);
    createFillQueue(w.deps).submit(at(), w.run);
    await flush();
    const b = bmp("1");
    w.jobs[0]?.resolve(filled(b));
    await flush();
    expect([b.close.mock.calls.length, w.images.adopt.mock.calls.length, w.states.at(-1)]).toEqual([1, 0, "refus"]);
  });

  it("HB13 : aucun pixel changé : aucune étape, rien au magasin, état pret ; la file continue", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    q.submit(shape, w.run);
    await flush();
    w.jobs[0]?.resolve({ changed: 0 });
    await flush();
    expect([w.put.mock.calls.length, w.states.at(-1)]).toEqual([0, "pret"]);
    expect(w.writes.map((c) => (c.type === "Fill" ? c.target.kind : ""))).toEqual(["inside"]);
  });

  it("RF4 : dispose (onglet fermé) pendant le calcul : rien n'est écrit, bitmap fermé ; submit ensuite sans effet", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    await flush();
    q.dispose();
    const b = bmp("1");
    w.jobs[0]?.resolve(filled(b));
    await flush();
    expect([w.writes.length, b.close.mock.calls.length, w.images.adopt.mock.calls.length]).toEqual([0, 1, 0]);
    q.submit(shape, w.run);
    expect(w.writes).toEqual([]);
  });

  it("lanceur arrêté pendant le calcul (fill rend null) : echec, la file ne reste pas bloquée", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    q.submit(shape, w.run);
    await flush();
    w.jobs[0]?.resolve(null);
    await flush();
    expect([lastReport(w), w.states.at(-1), w.put.mock.calls.length]).toEqual([fillFailure(FILL_NO_RUNNER), "echec", 0]);
    expect(w.writes.map((c) => (c.type === "Fill" ? c.target.kind : ""))).toEqual(["inside"]);
  });

  it("pngName : extension remplacée par .png ; sans extension : ajoutée (HB10)", () => {
    expect([pngName("photo.jpg"), pngName("scan"), pngName("a.b.webp"), pngName("x.png")]).toEqual(["photo.png", "scan.png", "a.b.png", "x.png"]);
  });
});
