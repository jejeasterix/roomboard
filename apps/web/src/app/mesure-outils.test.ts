import { describe, expect, it, vi } from "vitest";
import { downloadJson, fmt, watchDpr, type DprWindow } from "./mesure-outils";

describe("fmt", () => {
  it("rend un tiret pour une valeur absente", () => {
    expect(fmt(null)).toBe("—");
    expect(fmt(undefined)).toBe("—");
  });
  it("arrondit à une décimale par défaut", () => {
    expect(fmt(1.26)).toBe("1.3");
  });
  it("respecte le nombre de décimales demandé", () => {
    expect(fmt(0.123, 2)).toBe("0.12");
    expect(fmt(5.4, 0)).toBe("5");
  });
});

describe("downloadJson", () => {
  it("crée le lien, clique, le retire, puis rend l'URL après 1 s", () => {
    const a = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    const body = { append: vi.fn() };
    const revokeObjectURL = vi.fn();
    let delayed: (() => void) | undefined;
    let delay = 0;
    downloadJson("{}", "banc", new Date("2026-11-20T00:00:00.000Z"), {
      document: { createElement: () => a, body } as never,
      url: { createObjectURL: () => "blob:x", revokeObjectURL },
      setTimeout: (cb, ms) => {
        delayed = cb;
        delay = ms;
        return 1;
      },
    });
    expect(a.download).toBe("banc-2026-11-20T00-00-00-000Z.json");
    expect(a.href).toBe("blob:x");
    expect(body.append).toHaveBeenCalledWith(a);
    expect(a.click).toHaveBeenCalledOnce();
    expect(a.remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(delay).toBe(1000);
    delayed?.();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:x");
  });
});

describe("watchDpr", () => {
  function fake(): { w: DprWindow; queries: string[]; fire(): void; ratio: { v: number } } {
    const queries: string[] = [];
    const ratio = { v: 1 };
    let listener: (() => void) | undefined;
    const w: DprWindow = {
      get devicePixelRatio() {
        return ratio.v;
      },
      matchMedia: (q) => {
        queries.push(q);
        return {
          addEventListener: (_t, cb) => {
            listener = cb;
          },
        };
      },
    };
    return { w, queries, ratio, fire: () => listener?.() };
  }

  it("signale un changement et se réabonne avec la nouvelle requête", () => {
    const f = fake();
    const onChange = vi.fn();
    watchDpr(f.w, onChange);
    expect(f.queries).toEqual(["(resolution: 1dppx)"]);
    f.ratio.v = 2;
    f.fire();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(f.queries).toEqual(["(resolution: 1dppx)", "(resolution: 2dppx)"]);
  });

  it("ne rappelle plus rien après l'arrêt", () => {
    const f = fake();
    const onChange = vi.fn();
    const stop = watchDpr(f.w, onChange);
    stop();
    f.fire();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("retire l'écouteur à l'arrêt et n'en garde qu'un vivant à la fois", () => {
    const live = new Set<() => void>();
    let max = 0;
    const ratio = { v: 1 };
    const w = {
      get devicePixelRatio() {
        return ratio.v;
      },
      matchMedia: () => ({
        addEventListener: (_t: "change", cb: () => void) => {
          live.add(cb);
          max = Math.max(max, live.size);
        },
        removeEventListener: (_t: "change", cb: () => void) => {
          live.delete(cb);
        },
      }),
    } as DprWindow;
    const stop = watchDpr(w, () => undefined);
    expect(live.size).toBe(1);
    ratio.v = 2;
    [...live][0]?.();
    expect(live.size).toBeLessThanOrEqual(1);
    stop();
    expect(live.size).toBe(0);
    expect(max).toBeLessThanOrEqual(1);
  });
});
