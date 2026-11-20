import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasPixels } from "./container";
import { applyPixels, createPixelRunner, pixelErrorMessage, pixelNotice, PIXELS_FAILED_MESSAGE, rgbOf, type PixelJob } from "./pixel-runner";
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
    expect(hasPixels({ ...base, image_transparent: vi.fn(), image_adjust: vi.fn() } as never)).toBe(true);
  });
});
