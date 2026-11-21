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
});
