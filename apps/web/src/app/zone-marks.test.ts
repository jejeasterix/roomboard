import { describe, expect, it } from "vitest";
import type { Change, Command } from "../core/api";
import { createZoneMarks, type ZoneDoc } from "./zone-marks";

const change: Change = { pages: ["p"], ids: ["f"], removed: [], full: false, version: 2 };
const zone = { type: "Fill", page: "p", target: { kind: "zone", x: 1, y: 2, tol: 2 }, color: "#facc15" } as unknown as Command;
const bg: Command = { type: "Fill", page: "p", target: { kind: "background" }, color: "#facc15" };

function doc(kinds: Record<string, string>): ZoneDoc & { reads: number; asked: [string, number][] } {
  const d = {
    reads: 0,
    asked: [] as [string, number][],
    elementIds: () => {
      d.reads++;
      return Object.keys(kinds);
    },
    element: (id: string) => (kinds[id] === undefined ? null : { kind: kinds[id] ?? "" }),
    zoneCells: (page: string, tol: number) => {
      d.asked.push([page, tol]);
      return 4_032_064;
    },
  };
  return d;
}

describe("zone-marks (C8, Q18)", () => {
  it("C8 Fill zone : durée mesurée et marquée au dixième, cellules relues au même tol", () => {
    const d = doc({ a: "stroke", f: "fill" });
    const times = [10, 22.34];
    const measured: [number, number][] = [];
    const m = createZoneMarks(d, () => times.shift() ?? 0, (s, e) => measured.push([s, e]));
    const ran: Command[] = [];
    expect(m.timed((c) => (ran.push(c), change))(zone)).toBe(change);
    expect(ran).toEqual([zone]);
    expect(measured).toEqual([[10, 22.34]]);
    expect(m.tags("p", 2)).toEqual({ zones: "1", zoneMs: "12.3", zoneCells: "4032064" });
    expect(d.asked).toEqual([["p", 2]]);
  });

  // T11 (S6) : `emit()` du moteur, dans `run` (`engine.ts` `commit`), rappelle `mark` → `tags` à la nouvelle version ; le
  // recompte lit chaque élément par le pont (`element(id)`) et ne doit pas tomber dans `pot-zone`. Sous le recompte
  // immédiat, la mesure vaudrait [100, 118] (3 éléments à 5 ms + 3 ms de commande).
  it("C8 Fill zone : le recompte des fill rappelé pendant la commande reste hors de la mesure, juste après elle", () => {
    let clock = 0;
    const kinds: Record<string, string> = { a: "stroke", b: "stroke" };
    const base = doc(kinds);
    const slow: ZoneDoc = { ...base, element: (id) => ((clock += 5), base.element(id)) };
    const measured: [number, number][] = [];
    const m = createZoneMarks(slow, () => clock, (s, e) => measured.push([s, e]));
    expect(m.tags("p", 1).zones).toBe("0");
    clock = 100;
    const run = (_: Command): Change => {
      kinds["f"] = "fill";
      clock += 3;
      m.tags("p", 2);
      return change;
    };
    m.timed(run)(zone);
    expect(measured).toEqual([[100, 103]]);
    expect(m.tags("p", 2)).toEqual({ zones: "1", zoneMs: "3.0", zoneCells: "4032064" });
  });

  it("C8 autre commande : ni mesure ni marque", () => {
    const d = doc({});
    const measured: unknown[] = [];
    const m = createZoneMarks(d, () => 0, () => measured.push(1));
    expect(m.timed(() => change)(bg)).toBe(change);
    expect(measured).toEqual([]);
    expect(m.tags("p", 1)).toEqual({ zones: "0", zoneMs: "", zoneCells: "" });
  });

  it("C8 compte des fill relu seulement quand la page ou la version change", () => {
    const d = doc({ f: "fill", g: "fill" });
    const m = createZoneMarks(d, () => 0, () => undefined);
    expect(m.tags("p", 1).zones).toBe("2");
    m.tags("p", 1);
    expect(d.reads).toBe(1);
    m.tags("p", 2);
    m.tags("q", 2);
    expect(d.reads).toBe(3);
  });

  it("C8 marques à jour au rendu du clic : onMarked rend la main une fois les marques écrites, jamais pour une autre commande", () => {
    const d = doc({ f: "fill" });
    const times = [10, 22.34];
    const seen: unknown[] = [];
    let m: ReturnType<typeof createZoneMarks>;
    m = createZoneMarks(d, () => times.shift() ?? 0, () => undefined, () => seen.push(m.tags("p", 2)));
    m.timed(() => change)(bg);
    expect(seen).toEqual([]);
    m.timed(() => change)(zone);
    expect(seen).toEqual([{ zones: "1", zoneMs: "12.3", zoneCells: "4032064" }]);
  });
});
