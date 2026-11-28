import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasPixels } from "./container";
import { applyFill, applyPixels, createPixelRunner, FILL_MODULE_OLD_MESSAGE, FILL_UNREADABLE_MESSAGE, pixelErrorMessage, pixelNotice, PIXELS_FAILED_MESSAGE, rgbOf, type PixelFillJob, type PixelJob } from "./pixel-runner";
import type { WorkerLike } from "./sheet-reader";

class FakeWorker implements WorkerLike {
  onmessage: ((e: { readonly data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  readonly posted: { id: number; bitmap: unknown; brightness?: number }[] = [];
  readonly transfers: Transferable[][] = [];
  terminated = false;
  postMessage(m: unknown, transfer: Transferable[]): void {
    this.posted.push(m as { id: number; bitmap: unknown; brightness?: number });
    this.transfers.push(transfer);
  }
  terminate(): void {
    this.terminated = true;
  }
  reply(i: number, data: Record<string, unknown>): void {
    this.onmessage?.({ data: { id: this.posted[i]?.id, ...data } });
  }
}
const bmp = (tag: string): ImageBitmap => ({ tag, close: vi.fn() }) as unknown as ImageBitmap;
const job = (key: string, extra: Partial<PixelJob> = {}): PixelJob & { bitmap: ReturnType<typeof vi.fn> } =>
  ({ key, brightness: 10, bitmap: vi.fn(async () => bmp(`copie ${key}`)), ...extra }) as PixelJob & { bitmap: ReturnType<typeof vi.fn> };
const tick = (ms = 0): Promise<void> => vi.advanceTimersByTimeAsync(ms).then(() => undefined);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const workers: FakeWorker[] = [];
  const spawn = vi.fn((): WorkerLike => {
    const w = new FakeWorker();
    workers.push(w);
    return w;
  });
  return { spawn, workers, runner: createPixelRunner(spawn) };
}

describe("lanceur de pixels (DAI3, I18, I19)", () => {
  it("chargé au premier besoin : aucun Worker avant le premier calcul, un seul pour deux calculs", async () => {
    const { spawn, workers, runner } = setup();
    expect(spawn).not.toHaveBeenCalled();
    const a = runner.run("e1", job("a"));
    await tick();
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(workers[0]?.posted[0]).toMatchObject({ brightness: 10 });
    const out = bmp("a");
    workers[0]?.reply(0, { bitmap: out });
    await expect(a).resolves.toBe(out);
    const b = runner.run("e2", job("b"));
    await tick();
    workers[0]?.reply(1, { bitmap: bmp("b") });
    await b;
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("le bitmap copié part en transfert", async () => {
    const { workers, runner } = setup();
    void runner.run("e", job("a"));
    await tick();
    const posted = workers[0]?.posted[0];
    expect(workers[0]?.transfers[0]).toEqual([posted?.bitmap]);
  });

  it("file avec remplacement : le calcul remplacé se résout à null sans copie de bitmap", async () => {
    const { workers, runner } = setup();
    const first = runner.run("e", job("k1"));
    await tick();
    const replaced = job("k2");
    const second = runner.run("e#apercu", replaced);
    const third = runner.run("e#apercu", job("k3"));
    await expect(second).resolves.toBeNull();
    expect(replaced.bitmap).not.toHaveBeenCalled();
    workers[0]?.reply(0, { bitmap: bmp("k1") });
    await first;
    await tick();
    expect(workers[0]?.posted).toHaveLength(2);
    workers[0]?.reply(1, { bitmap: bmp("k3") });
    await expect(third).resolves.not.toBeNull();
  });

  it("un seul calcul à la fois dans le Worker", async () => {
    const { workers, runner } = setup();
    void runner.run("a", job("a"));
    void runner.run("b", job("b"));
    await tick();
    expect(workers[0]?.posted).toHaveLength(1);
  });

  it("arrêt 10 s après la dernière réponse ; le calcul suivant relance un Worker", async () => {
    const { spawn, workers, runner } = setup();
    const a = runner.run("e", job("a"));
    await tick();
    workers[0]?.reply(0, { bitmap: bmp("a") });
    await a;
    await tick(9_999);
    expect(workers[0]?.terminated).toBe(false);
    await tick(1);
    expect(workers[0]?.terminated).toBe(true);
    void runner.run("e", job("b"));
    await tick();
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it("60 s sans réponse : rejet PIXELS_FAILED_MESSAGE, Worker arrêté", async () => {
    const { workers, runner } = setup();
    const a = runner.run("e", job("a"));
    const seen = a.catch((e: unknown) => (e instanceof Error ? e.message : String(e)));
    await tick(60_000);
    await expect(seen).resolves.toBe(PIXELS_FAILED_MESSAGE);
    expect(workers[0]?.terminated).toBe(true);
  });

  it("erreur du Worker : rejet avec son message ; onerror : PIXELS_FAILED_MESSAGE ; Worker arrêté chaque fois", async () => {
    const { spawn, workers, runner } = setup();
    const a = runner.run("e", job("a")).catch((e: unknown) => (e as Error).message);
    await tick();
    workers[0]?.reply(0, { error: "module des pixels indisponible" });
    await expect(a).resolves.toBe("module des pixels indisponible");
    expect(workers[0]?.terminated).toBe(true);
    const b = runner.run("e", job("b")).catch((e: unknown) => (e as Error).message);
    await tick();
    workers[1]?.onerror?.(new Event("error"));
    await expect(b).resolves.toBe(PIXELS_FAILED_MESSAGE);
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it("dispose : en attente → null, Worker arrêté, résultat tardif ignoré", async () => {
    const { workers, runner } = setup();
    const a = runner.run("e", job("a"));
    const b = runner.run("f", job("b"));
    await tick();
    runner.dispose();
    await expect(a).resolves.toBeNull();
    await expect(b).resolves.toBeNull();
    expect(workers[0]?.terminated).toBe(true);
    const late = bmp("tardif");
    expect(() => workers[0]?.reply(0, { bitmap: late })).not.toThrow(); // réponse tardive réellement envoyée après dispose
    expect(workers[0]?.posted).toHaveLength(1);
    await expect(runner.run("g", job("c"))).resolves.toBeNull();
    expect(workers[0]?.posted).toHaveLength(1);
  });

  it("Worker impossible à lancer ou postMessage qui lève : rejet PIXELS_FAILED_MESSAGE, bitmap fermé, file reprise", async () => {
    const closed = vi.fn();
    const spawn = vi.fn((): WorkerLike => {
      throw new Error("pas de Worker");
    });
    const runner = createPixelRunner(spawn);
    const a = runner.run("e", job("a", { bitmap: vi.fn(async () => ({ close: closed }) as unknown as ImageBitmap) } as Partial<PixelJob>));
    const seen = a.catch((e: unknown) => (e as Error).message);
    await tick();
    await expect(seen).resolves.toBe(PIXELS_FAILED_MESSAGE);
    expect(closed).toHaveBeenCalledTimes(1);
    const b = runner.run("f", job("b", { bitmap: vi.fn(() => { throw new Error("copie"); }) } as Partial<PixelJob>)).catch((e: unknown) => (e as Error).message);
    await tick();
    await expect(b).resolves.toBe(PIXELS_FAILED_MESSAGE);
  });
});

describe("calcul dans le Worker (I10, I17)", () => {
  it("applyPixels : couleur transparente sur les couleurs d'origine, puis luminosité et contraste ; rien sans réglage de pixels", () => {
    const calls: string[] = [];
    const mod = {
      image_transparent: (_px: Uint8Array, w: number, h: number, r: number, g: number, b: number, t: number, s: number, c: boolean) => calls.push(`transparent ${w}x${h} ${r},${g},${b} ${t} ${s} ${c}`),
      image_adjust: (_px: Uint8Array, b: number, c: number) => calls.push(`adjust ${b} ${c}`),
    };
    const px = new Uint8Array(8);
    applyPixels(mod, px, 2, 1, { transparent: { color: "#ff0010", tolerance: 10, soft: 0, contiguous: true }, brightness: 50 });
    expect(calls).toEqual(["transparent 2x1 255,0,16 10 0 true", "adjust 50 0"]);
    calls.length = 0;
    applyPixels(mod, px, 2, 1, {});
    expect(calls).toEqual([]);
    expect(() => rgbOf("white")).toThrow("couleur illisible");
  });

  it("messages : panique Wasm → PIXELS_FAILED_MESSAGE ; erreur connue gardée ; avis de #etat ; garde hasPixels", () => {
    expect(pixelErrorMessage(new WebAssembly.RuntimeError("unreachable"))).toBe(PIXELS_FAILED_MESSAGE);
    expect(pixelErrorMessage(new Error("module des pixels indisponible"))).toBe("module des pixels indisponible");
    expect(pixelErrorMessage(42)).toBe(PIXELS_FAILED_MESSAGE);
    expect(pixelNotice("x")).toBe("retouches de l'image non affichées : x");
    const base = { ContainerReader: { open: vi.fn() }, write_container: vi.fn() };
    expect(hasPixels(base as never)).toBe(false);
    expect(hasPixels({ ...base, image_transparent: vi.fn(), image_adjust: vi.fn() } as never)).toBe(false); // image_flood_fill manque (m3)
    expect(hasPixels({ ...base, image_transparent: vi.fn(), image_adjust: vi.fn(), image_flood_fill: vi.fn() } as never)).toBe(true);
  });
});

describe("remplissage d'image dans le lanceur (C6b, B14)", () => {
  const original = new Blob([new Uint8Array([1, 2])], { type: "image/png" });
  const fillJob = (extra: Partial<PixelFillJob> = {}): PixelFillJob => ({
    seed: [3, 4],
    size: [10, 8],
    tolerance: 5,
    color: "#facc15",
    brightness: 20,
    source: async () => ({ blob: original, kind: "png" }),
    ...extra,
  });
  const result = () => ({ changed: 12, png: new Blob([new Uint8Array([9])], { type: "image/png" }), bitmap: bmp("rempli") });

  it("message : type fill, graine, taille, tolérance, couleur, pixels de C5, Blob de l'original sans transfert", async () => {
    const { workers, runner } = setup();
    void runner.fill(fillJob());
    await tick();
    expect(workers[0]?.posted[0]).toMatchObject({ type: "fill", seed: [3, 4], size: [10, 8], tolerance: 5, color: "#facc15", brightness: 20, blob: original, kind: "png" });
    expect(workers[0]?.transfers[0]).toEqual([]);
  });

  it("source bitmap (SVG) : transférée", async () => {
    const { workers, runner } = setup();
    const copy = bmp("svg");
    void runner.fill(fillJob({ source: async () => ({ bitmap: copy }) }));
    await tick();
    expect(workers[0]?.posted[0]).toMatchObject({ type: "fill", bitmap: copy });
    expect(workers[0]?.transfers[0]).toEqual([copy]);
  });

  it("un remplissage n'est jamais remplacé : deux remplissages, deux résultats dans l'ordre", async () => {
    const { workers, runner } = setup();
    const a = runner.fill(fillJob());
    const b = runner.fill(fillJob({ color: null }));
    await tick();
    const r = result();
    workers[0]?.reply(0, r);
    await expect(a).resolves.toEqual(r);
    await tick();
    expect(workers[0]?.posted[1]).toMatchObject({ type: "fill", color: null });
    workers[0]?.reply(1, { changed: 0 });
    await expect(b).resolves.toEqual({ changed: 0 });
  });

  it("réponse mal formée : PIXELS_FAILED_MESSAGE ; erreur du Worker (image illisible) : son message", async () => {
    const { workers, runner } = setup();
    const a = runner.fill(fillJob());
    await tick();
    workers[0]?.reply(0, { changed: 3 });
    await expect(a).rejects.toThrow(PIXELS_FAILED_MESSAGE);
    const b = runner.fill(fillJob());
    await tick();
    workers[1]?.reply(0, { error: FILL_UNREADABLE_MESSAGE });
    await expect(b).rejects.toThrow(FILL_UNREADABLE_MESSAGE);
  });

  it("S5 e : module des pixels absent : rejet avec le message du Worker", async () => {
    const { workers, runner } = setup();
    const a = runner.fill(fillJob());
    await tick();
    workers[0]?.reply(0, { error: "module des pixels indisponible" });
    await expect(a).rejects.toThrow("module des pixels indisponible");
  });

  it("dispose : remplissage en attente → null", async () => {
    const { runner } = setup();
    const a = runner.fill(fillJob());
    runner.dispose();
    await expect(a).resolves.toBeNull();
    await expect(runner.fill(fillJob())).resolves.toBeNull();
  });
});

describe("applyFill (C6b, B8)", () => {
  const mod = () => ({ image_flood_fill: vi.fn((..._a: unknown[]) => 7) });
  it("graine en pixels source mise à l'échelle du bitmap décodé ; couleur en majuscules acceptée (RF2) ; effacer", () => {
    const m = mod();
    expect(applyFill(m, new Uint8Array(4 * 5 * 4), 5, 4, { seed: [9, 7], size: [10, 8], tolerance: 5, color: "#FACC15" })).toBe(7);
    expect(m.image_flood_fill.mock.calls[0]?.slice(1)).toEqual([5, 4, 4, 3, 5, 250, 204, 21, false]);
    applyFill(m, new Uint8Array(4 * 10 * 8), 10, 8, { seed: [9, 7], size: [10, 8], tolerance: 0, color: null });
    expect(m.image_flood_fill.mock.calls[1]?.slice(1)).toEqual([10, 8, 9, 7, 0, 0, 0, 0, true]);
  });
  it("module d'avant C6b (ne rend pas de nombre) : erreur lisible", () => {
    const old = { image_flood_fill: vi.fn((..._a: unknown[]) => undefined as unknown as number) };
    expect(() => applyFill(old, new Uint8Array(4), 1, 1, { seed: [0, 0], size: [1, 1], tolerance: 5, color: null })).toThrow(FILL_MODULE_OLD_MESSAGE);
  });
});

describe("départ de la baguette (OG23, T10)", () => {
  const white = { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true };
  it("départ mis à l'échelle du bitmap : image_transparent_seed reçoit (5, 5) pour 10, 10 sur 200 × 200 en 100 × 100", () => {
    const calls: unknown[][] = [];
    const mod = {
      image_transparent: (...a: unknown[]): void => void calls.push(["global", ...a.slice(1)]),
      image_adjust: (): void => undefined,
      image_transparent_seed: (...a: unknown[]): void => void calls.push(["seed", ...a.slice(1)]),
    };
    const px = new Uint8Array(4 * 100 * 100);
    applyPixels(mod, px, 100, 100, { transparent: { ...white, x: 10, y: 10 }, size: [200, 200] });
    expect(calls).toEqual([["seed", 100, 100, 255, 255, 255, 10, 0, 5, 5]]);
    calls.length = 0;
    applyPixels(mod, px, 100, 100, { transparent: { ...white, x: 199, y: 199 }, size: [200, 200] });
    expect(calls).toEqual([["seed", 100, 100, 255, 255, 255, 10, 0, 99, 99]]);
    calls.length = 0;
    applyPixels(mod, px, 100, 100, { transparent: white, size: [200, 200] });
    expect(calls).toEqual([["global", 100, 100, 255, 255, 255, 10, 0, true]]);
    calls.length = 0;
    const { image_transparent_seed: _seed, ...old } = mod;
    applyPixels(old, px, 100, 100, { transparent: { ...white, x: 10, y: 10 }, size: [200, 200] });
    expect(calls).toEqual([["global", 100, 100, 255, 255, 255, 10, 0, true]]);
  });

  it("transparent x y : le travail envoie la taille source au Worker", async () => {
    vi.useFakeTimers();
    try {
      const { workers, runner } = setup();
      void runner.run("e1", job("a", { transparent: { ...white, x: 3, y: 4 }, size: [640, 480] }));
      await tick();
      expect(workers[0]?.posted[0]).toMatchObject({ transparent: { ...white, x: 3, y: 4 }, size: [640, 480] });
      runner.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
