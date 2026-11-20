import { afterEach, describe, expect, it, vi } from "vitest";
import { runOnce, type WorkerLike } from "./one-shot-worker";

function fake(reply?: (w: WorkerLike, m: unknown) => void) {
  const terminate = vi.fn();
  const posted: unknown[] = [];
  const w: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage: (m) => {
      posted.push(m);
      reply?.(w, m);
    },
    terminate,
  };
  return { w, terminate, posted };
}
const ok = (d: unknown): number => {
  if (typeof d !== "object" || d === null || typeof (d as { n?: unknown }).n !== "number") throw new Error("réponse mal formée");
  return (d as { n: number }).n;
};
afterEach(() => void vi.useRealTimers());

describe("Worker jetable (C12)", () => {
  it("réponse contrôlée par check : résolue, Worker arrêté une fois", async () => {
    const f = fake((w) => queueMicrotask(() => w.onmessage?.({ data: { n: 7 } })));
    expect(await runOnce(() => f.w, { a: 1 }, [], 1000, ok, "interrompu")).toBe(7);
    expect([f.posted, f.terminate.mock.calls.length]).toEqual([[{ a: 1 }], 1]);
  });
  it("check qui lève : rejet avec son message, Worker arrêté", async () => {
    const f = fake((w) => queueMicrotask(() => w.onmessage?.({ data: "x" })));
    await expect(runOnce(() => f.w, {}, [], 1000, ok, "interrompu")).rejects.toThrow("réponse mal formée");
    expect(f.terminate).toHaveBeenCalledTimes(1);
  });
  it("onerror (panique Wasm, module absent) : rejet `failure`, Worker arrêté", async () => {
    const f = fake((w) => queueMicrotask(() => w.onerror?.(new Error("unreachable"))));
    await expect(runOnce(() => f.w, {}, [], 1000, ok, "interrompu")).rejects.toThrow("interrompu");
    expect(f.terminate).toHaveBeenCalledTimes(1);
  });
  it("Worker muet : rejet `failure` au bout du délai, Worker arrêté", async () => {
    vi.useFakeTimers();
    const f = fake();
    const p = runOnce(() => f.w, {}, [], 500, ok, "interrompu");
    const seen = p.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(499);
    expect(f.terminate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(((await seen) as Error).message).toBe("interrompu");
    expect(f.terminate).toHaveBeenCalledTimes(1);
  });
  it("chaque appel crée son Worker : deux appels, deux Workers, chacun arrêté une fois", async () => {
    const made: ReturnType<typeof fake>[] = [];
    const spawn = (): WorkerLike => {
      const f = fake((w) => queueMicrotask(() => w.onmessage?.({ data: { n: made.length } })));
      made.push(f);
      return f.w;
    };
    expect([await runOnce(spawn, {}, [], 1000, ok, "interrompu"), await runOnce(spawn, {}, [], 1000, ok, "interrompu")]).toEqual([1, 2]);
    expect(made.map((f) => f.terminate.mock.calls.length)).toEqual([1, 1]);
  });
});
