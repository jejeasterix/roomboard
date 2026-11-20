import { describe, expect, it, vi } from "vitest";
import { droppedFromFile, listenWebDrop, type DragEventLike, type DropTargetLike } from "./drop-web";

function fakeTarget() {
  const l = new Map<string, Set<(e: DragEventLike) => void>>();
  const target: DropTargetLike = {
    addEventListener: (t, cb) => void (l.get(t) ?? l.set(t, new Set()).get(t)!).add(cb),
    removeEventListener: (t, cb) => void l.get(t)?.delete(cb),
  };
  const fire = (t: string, e: DragEventLike): void => l.get(t)?.forEach((cb) => cb(e));
  const count = (): number => [...l.values()].reduce((n, s) => n + s.size, 0);
  return { target, fire, count };
}
const ev = (files: File[] | null, x = 10, y = 20) => {
  const e = { clientX: x, clientY: y, dataTransfer: files && { files, dropEffect: "none" }, prevented: 0, preventDefault() { this.prevented += 1; } };
  return e;
};

describe("dépôt web (T86)", () => {
  it("dragover : preventDefault et dropEffect copy", () => {
    const t = fakeTarget();
    listenWebDrop(t.target, vi.fn());
    const e = ev([]);
    t.fire("dragover", e);
    expect(e.prevented).toBe(1);
    expect(e.dataTransfer!.dropEffect).toBe("copy");
  });

  it("drop de deux fichiers : DroppedFile et point", async () => {
    const t = fakeTarget();
    const handler = vi.fn();
    listenWebDrop(t.target, handler);
    const a = new File(["ab"], "a.roomboard", { type: "text/x" });
    const b = new File(["c"], "b.png");
    const e = ev([a, b], 7, 9);
    t.fire("drop", e);
    expect(e.prevented).toBe(1);
    const [files, at] = handler.mock.calls[0]!;
    expect(files.map((f: { name: string; size: number; mime: string }) => [f.name, f.size, f.mime])).toEqual([["a.roomboard", 2, "text/x"], ["b.png", 1, ""]]);
    expect(await files[0].blob()).toBe(a);
    expect(at).toEqual({ x: 7, y: 9 });
  });

  it("drop sans fichier : handler non appelé", () => {
    const t = fakeTarget();
    const handler = vi.fn();
    listenWebDrop(t.target, handler);
    t.fire("drop", ev([]));
    t.fire("drop", ev(null));
    expect(handler).not.toHaveBeenCalled();
  });

  it("désabonnement : plus rien", () => {
    const t = fakeTarget();
    const handler = vi.fn();
    const off = listenWebDrop(t.target, handler);
    off();
    t.fire("drop", ev([new File(["a"], "a")]));
    expect(handler).not.toHaveBeenCalled();
    expect(t.count()).toBe(0);
  });

  it("cible null : no-op", () => {
    expect(() => listenWebDrop(null, vi.fn())()).not.toThrow();
  });

  it("droppedFromFile : blob rend le File", async () => {
    const f = new File(["x"], "x.roomboard");
    expect(await droppedFromFile(f).blob()).toBe(f);
  });
});
