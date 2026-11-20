import { describe, expect, it } from "vitest";
import { DEFAULT_GRID_COLOR, type GridLines } from "../../core/api";
import type { Camera } from "../camera";
import { alignedSegments, alignLine, dotSizePx, lineWidthPx, paintGrid } from "./grid-paint";

const ZOOMS = [0.15, 0.37, 1, 2.5, 8] as const;
const DPRS = [1, 1.25, 2] as const;
/** Caméra du montage S5 : haut de vue à y = 1 000 007. */
const far = (zoom: number): Camera => ({ zoom, tx: 13.3, ty: -1_000_007 * zoom });

/** Lignes que le cœur rend pour des carreaux de 40 à z = 1 dans la vue S5 (20 verticales, 15 horizontales). */
function squares40(): GridLines {
  const segments: number[] = [];
  for (let i = 0; i < 20; i++) segments.push(40 * i, 1_000_007, 40 * i, 1_000_607);
  for (let k = 0; k < 15; k++) segments.push(0, 1_000_040 + 40 * k, 786.7, 1_000_040 + 40 * k);
  return { above: false, levels: [{ color: "#7b68ee", line: "solid", alpha: 1, segments, dots: [] }] };
}

/** Abscisses des verticales, ordonnées des horizontales (pixels physiques). */
function split(segs: readonly number[]): { v: number[]; h: number[] } {
  const v: number[] = [];
  const h: number[] = [];
  for (let i = 0; i + 3 < segs.length; i += 4) {
    if (segs[i] === segs[i + 2]) v.push(segs[i] ?? Number.NaN);
    else if (segs[i + 1] === segs[i + 3]) h.push(segs[i + 1] ?? Number.NaN);
  }
  return { v, h };
}

describe("grille calée sur les pixels (C9, G10)", () => {
  it("attendu exact de S5 (a), carreaux de 40 à z = 1 : dpr 1, 1,25 et 2", () => {
    const cases = [
      { dpr: 1, x: 13.5, y: 33.5, step: 40, width: 1 },
      { dpr: 1.25, x: 17.5, y: 41.5, step: 50, width: 1 },
      { dpr: 2, x: 27, y: 66, step: 80, width: 2 },
    ];
    for (const c of cases) {
      const [level] = alignedSegments(squares40(), far(1), c.dpr, c.dpr, c.dpr);
      const { v, h } = split(level?.segments ?? []);
      expect(v).toEqual(Array.from({ length: 20 }, (_, i) => c.x + c.step * i));
      expect(h).toEqual(Array.from({ length: 15 }, (_, k) => c.y + c.step * k));
      expect(level?.width).toBe(c.width);
    }
  });

  it("tout zoom, tout dpr (S5) : chaque ligne droite sur k + 0,5 (épaisseur impaire) ou k (paire), épaisseur max(1, round(dpr))", () => {
    for (const z of ZOOMS) {
      const segments: number[] = [];
      for (let i = 0; i < 48; i++) segments.push(40 * i, 1_000_007, 40 * i, 1_000_007 + 600 / z);
      for (let k = 0; k < 20; k++) segments.push(0, 1_000_040 + 40 * k, 1920, 1_000_040 + 40 * k);
      const lines: GridLines = { above: false, levels: [{ color: "#000000", line: "solid", alpha: 1, segments, dots: [] }] };
      for (const dpr of DPRS) {
        const [level] = alignedSegments(lines, far(z), dpr, dpr, dpr);
        const w = Math.max(1, Math.round(dpr));
        expect(level?.width).toBe(w);
        const { v, h } = split(level?.segments ?? []);
        expect(v.length + h.length).toBe(68);
        for (const x of [...v, ...h]) expect(Number.isInteger(w % 2 === 1 ? x - 0.5 : x)).toBe(true);
      }
    }
  });

  it("obliques (isométrique) : sans calage, en pixels physiques", () => {
    const lines: GridLines = { above: false, levels: [{ color: "#000000", line: "solid", alpha: 1, segments: [0, 0, 100, 57.735], dots: [] }] };
    const [l] = alignedSegments(lines, { zoom: 2, tx: 3.3, ty: 4.4 }, 1.5, 1.5, 1.5);
    const s = l?.segments ?? [];
    expect(s[0]).toBeCloseTo(3.3 * 1.5);
    expect(s[1]).toBeCloseTo(4.4 * 1.5);
    expect(s[2]).toBeCloseTo((200 + 3.3) * 1.5);
    expect(s[3]).toBeCloseTo((115.47 + 4.4) * 1.5);
  });

  it("points : carré de max(2, round(2·dpr)) pixels physiques, coin sur un pixel entier (dpr 1,2 : aucun arrondi à mi-chemin)", () => {
    const lines: GridLines = { above: false, levels: [{ color: "#000000", line: "solid", alpha: 1, segments: [], dots: [40, 40, 80, 40] }] };
    for (const [dpr, size, corner, corner2] of [[1, 2, 39, 79], [1.2, 2, 47, 95], [2, 4, 78, 158]] as const) {
      const [l] = alignedSegments(lines, { zoom: 1, tx: 0, ty: 0 }, dpr, dpr, dpr);
      expect(l?.dot).toBe(size);
      expect(l?.dots).toEqual([corner, corner, corner2, corner]);
    }
  });

  it("motifs (G10) : dashed [6, 4] et dotted [1, 3] en px CSS × dpr ; décalage calé sur l'origine du monde ; trait inconnu plein", () => {
    const seg = (y0: number): number[] => [100, y0, 100, y0 + 50];
    const lines: GridLines = {
      above: false,
      levels: [
        { color: "#000000", line: "dashed", alpha: 1, segments: [...seg(0), ...seg(7)], dots: [] },
        { color: "#000000", line: "dotted", alpha: 1, segments: seg(0), dots: [] },
        { color: "#000000", line: "wavy", alpha: 1, segments: seg(0), dots: [] },
      ],
    };
    const [dashed, dotted, wavy] = alignedSegments(lines, { zoom: 1, tx: 0, ty: 0 }, 2, 2, 2);
    expect(dashed?.dash).toEqual([12, 8]);
    expect(dotted?.dash).toEqual([2, 6]);
    expect(wavy?.dash).toEqual([]);
    expect(dashed?.offsets).toEqual([0, 14]);
    // Défilement (Review Focus 5) : la même ligne loin sur la page garde sa phase depuis l'origine du monde.
    const farLine: GridLines = { above: false, levels: [{ color: "#000000", line: "dashed", alpha: 1, segments: [100, 1_000_003, 100, 1_000_053], dots: [] }] };
    const [l] = alignedSegments(farLine, { zoom: 1, tx: 0, ty: -1_000_003 }, 1, 1, 1);
    expect(l?.offsets).toEqual([3]);
  });

  it("motifs calés sur les pixels (relecture finale) : ty = -3,3, tx = 13,3, dpr 1,25 → longueurs et décalages entiers", () => {
    // Verticale qui part du haut de vue (y écran 0), horizontale qui part du bord gauche (x écran 0).
    const lines: GridLines = {
      above: false,
      levels: [
        { color: "#000000", line: "dashed", alpha: 1, segments: [100, 3.3, 100, 53.3, -13.3, 20, 86.7, 20], dots: [] },
        { color: "#000000", line: "dotted", alpha: 1, segments: [100, 3.3, 100, 53.3], dots: [] },
      ],
    };
    const [dashed, dotted] = alignedSegments(lines, { zoom: 1, tx: 13.3, ty: -3.3 }, 1.25, 1.25, 1.25);
    // [6, 4] × 1,25 = [7,5 ; 5] → [8, 5] ; [1, 3] × 1,25 = [1,25 ; 3,75] → [1, 4].
    expect(dashed?.dash).toEqual([8, 5]);
    expect(dotted?.dash).toEqual([1, 4]);
    // Origine du monde en pixels : round(13,3 × 1,25) = 17, round(-3,3 × 1,25) = -4. Verticale : (0 − (−4)) mod 13 = 4 ;
    // horizontale : (0 − 17) mod 13 = 9. Bords des tirets = origine + k·période : pixels entiers.
    expect(dashed?.offsets).toEqual([4, 9]);
    expect(dotted?.offsets).toEqual([4]);
    for (const l of [dashed, dotted]) for (const v of [...(l?.dash ?? []), ...(l?.offsets ?? [])]) expect(Number.isInteger(v)).toBe(true);
  });

  it("couleur de niveau invalide (relecture finale) : trait et points à la couleur par défaut, jamais celle du niveau d'avant", () => {
    const valid = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
    /** Le canvas ignore une couleur invalide et garde la précédente. */
    class Strict {
      readonly log: string[] = [];
      globalAlpha = 1;
      lineWidth = 1;
      lineDashOffset = 0;
      lineCap = "butt";
      private stroke_ = "#ffffff";
      private fill_ = "#ffffff";
      get strokeStyle(): string { return this.stroke_; }
      set strokeStyle(v: string) { if (valid.test(v)) this.stroke_ = v; }
      get fillStyle(): string { return this.fill_; }
      set fillStyle(v: string) { if (valid.test(v)) this.fill_ = v; }
      save(): void {}
      restore(): void {}
      setTransform(): void {}
      setLineDash(): void {}
      beginPath(): void {}
      moveTo(): void {}
      lineTo(): void {}
      stroke(): void { this.log.push(`stroke ${this.stroke_}`); }
      fillRect(): void { this.log.push(`dot ${this.fill_}`); }
    }
    const ctx = new Strict();
    const lines: GridLines = {
      above: false,
      levels: [
        { color: "#111111", line: "solid", alpha: 1, segments: [0, 0, 0, 10], dots: [20, 20] },
        { color: "#12345", line: "solid", alpha: 1, segments: [40, 0, 40, 10], dots: [60, 60] },
      ],
    };
    paintGrid(ctx as unknown as CanvasRenderingContext2D, lines, { zoom: 1, tx: 0, ty: 0 }, 1, 1, 1);
    expect(ctx.log).toEqual(["stroke #111111", "dot #111111", `stroke ${DEFAULT_GRID_COLOR}`, `dot ${DEFAULT_GRID_COLOR}`]);
  });

  it("aides : alignLine, lineWidthPx, dotSizePx", () => {
    expect(alignLine(13.3, 1)).toBe(13.5);
    expect(alignLine(26.6, 2)).toBe(27);
    expect([1, 1.25, 1.5, 2, 3].map(lineWidthPx)).toEqual([1, 1, 2, 2, 3]);
    expect([1, 1.2, 2].map(dotSizePx)).toEqual([2, 2, 4]);
  });

  it("paintGrid : pixels physiques (transformation identité) puis restore ; plein en un seul tracé, tireté segment par segment ; alpha du groupe", () => {
    class Rec {
      readonly log: string[] = [];
      globalAlpha = 1;
      lineWidth = 1;
      lineDashOffset = 0;
      lineCap = "round";
      strokeStyle = "";
      fillStyle = "";
      save(): void { this.log.push("save"); }
      restore(): void { this.log.push("restore"); }
      setTransform(...a: number[]): void { this.log.push(`setTransform ${a.join(",")}`); }
      setLineDash(d: number[]): void { this.log.push(`dash ${d.join(",")}`); }
      beginPath(): void { this.log.push("begin"); }
      moveTo(x: number, y: number): void { this.log.push(`M ${x},${y}`); }
      lineTo(x: number, y: number): void { this.log.push(`L ${x},${y}`); }
      stroke(): void { this.log.push(`stroke ${this.strokeStyle} w${this.lineWidth} a${this.globalAlpha} o${this.lineDashOffset} ${this.lineCap}`); }
      fillRect(x: number, y: number, w: number, h: number): void { this.log.push(`dot ${x},${y},${w},${h} ${this.fillStyle}`); }
    }
    const rec = new Rec();
    const lines: GridLines = {
      above: false,
      levels: [
        { color: "#111111", line: "solid", alpha: 1, segments: [0, 0, 0, 10, 40, 0, 40, 10], dots: [] },
        { color: "#222222", line: "solid", alpha: 0.5, segments: [0, 5, 10, 5], dots: [] },
        { color: "#333333", line: "dashed", alpha: 1, segments: [0, 0, 0, 10], dots: [20, 20] },
      ],
    };
    paintGrid(rec as unknown as CanvasRenderingContext2D, lines, { zoom: 1, tx: 0, ty: 0 }, 1, 1, 1);
    expect(rec.log).toEqual([
      "save",
      "setTransform 1,0,0,1,0,0",
      "dash ",
      "begin",
      "M 0.5,0",
      "L 0.5,10",
      "M 40.5,0",
      "L 40.5,10",
      "stroke #111111 w1 a1 o0 butt",
      "dash ",
      "begin",
      "M 0,5.5",
      "L 10,5.5",
      "stroke #222222 w1 a0.5 o0 butt",
      "dash 6,4",
      "begin",
      "M 0.5,0",
      "L 0.5,10",
      "stroke #333333 w1 a1 o0 butt",
      "dot 19,19,2,2 #333333",
      "restore",
    ]);
    const none = new Rec();
    paintGrid(none as unknown as CanvasRenderingContext2D, { above: false, levels: [] }, { zoom: 1, tx: 0, ty: 0 }, 1, 1, 1);
    expect(none.log).toEqual([]);
  });
});
