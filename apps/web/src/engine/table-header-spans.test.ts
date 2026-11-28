import { describe, expect, it } from "vitest";
import type { ElementView, TableData, TextSpan } from "../core/api";
import { fillCommand, type FillDoc } from "./fill-target";
import { cellTextBoxes } from "./render/table-paint";
import { cellHeight, cellOf, naturalWidth, rowHeightsFor, shownSpans, TABLE_PADDING } from "./table-geom";
import type { Measure } from "./text-layout";

/** 10 unités par caractère, 14 en gras : la seule mesure qui voit le gras d'en-tête (`s.length * 10` y est aveugle). */
const bm: Measure = (s, _size, face) => s.length * (face?.bold === true ? 14 : 10);
const plain = (text: string): TextSpan[] => [{ text, attrs: {} }];
const bold = (text: string): TextSpan[] => [{ text, attrs: { bold: true } }];
const t = (texts: Record<string, string>, opts: Partial<TableData> = {}): TableData => ({
  color: "#000",
  size: 36,
  merges: [],
  cols: [{ id: "a", width: 240 }, { id: "b", width: 240 }],
  rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }],
  cells: Object.entries(texts).map(([k, text]) => {
    const [row, col] = k.split(":");
    return { row: row ?? "", col: col ?? "", text, fill: null, shade: null, spans: plain(text) };
  }),
  ...opts,
});

describe("C2 : spans affichés d'une case (gras d'en-tête compris), une seule source", () => {
  it("shownSpans : ligne 0 d'un tableau à en-tête en gras ; ligne 1, ou sans en-tête : spans enregistrés", () => {
    const h = t({ "r0:a": "Photo", "r1:a": "Lundi" }, { header: true });
    expect(shownSpans(h, { row: 0, col: 0 })).toEqual(bold("Photo"));
    expect(shownSpans(h, { row: 1, col: 0 })).toEqual(plain("Lundi"));
    expect(shownSpans(t({ "r0:a": "Photo" }), { row: 0, col: 0 })).toEqual(plain("Photo"));
  });

  it("cellTextBoxes (le peintre) lit les mêmes spans que shownSpans", () => {
    const h = t({ "r0:a": "Photo", "r0:b": "Lundi", "r1:a": "Mardi" }, { header: true });
    for (const box of cellTextBoxes(h)) {
      const at = cellOf(h, box);
      expect(at).not.toBeNull();
      if (at !== null) expect(box.spans).toEqual(shownSpans(h, at));
    }
  });

  it("naturalWidth : en-tête « Photosynthèse » mesuré en gras (13 × 14 + 16), comme le peintre le pose", () => {
    expect(naturalWidth(t({ "r0:a": "Photosynthèse" }, { header: true }), 0, bm)).toBe(13 * 14 + 2 * TABLE_PADDING);
    expect(naturalWidth(t({ "r0:a": "Photosynthèse" }), 0, bm)).toBe(13 * 10 + 2 * TABLE_PADDING);
    expect(naturalWidth(t({ "r1:a": "Photosynthèse" }, { header: true }), 0, bm)).toBe(13 * 10 + 2 * TABLE_PADDING);
  });

  it("rowHeightsFor : en-tête « aaaa bbbb » dans 120 de large : deux lignes en gras, pas une", () => {
    const h = t({ "r0:a": "aaaa bbbb" }, { header: true, cols: [{ id: "a", width: 120 }, { id: "b", width: 240 }] });
    // La mesure distingue bien : une ligne en graisse normale (90 ≤ 104), deux en gras (126 > 104).
    expect(cellHeight(bold("aaaa bbbb"), 36, 120, bm)).toBeGreaterThan(cellHeight(plain("aaaa bbbb"), 36, 120, bm));
    expect(rowHeightsFor(h, [120, 240], bm)[0]).toBe(cellHeight(bold("aaaa bbbb"), 36, 120, bm));
  });

  it("pot : en-tête centré, le mot se trouve à sa place en gras ; la commande garde les spans enregistrés (sans gras)", () => {
    const table: TableData = {
      ...t({}),
      header: true,
      cells: [{ row: "r0", col: "a", text: "Photosynthèse", fill: null, shade: null, spans: plain("Photosynthèse"), ha: "center" }],
    };
    const view: ElementView = { id: "T", kind: "table", transform: [1, 0, 0, 1, 0, 0], table };
    const doc: FillDoc = { hitTest: () => "T", element: (id) => (id === "T" ? view : null), edgeHit: () => false };
    // Boîte intérieure 224 : en gras (182) la ligne commence à 21, en graisse normale (130) à 47. Point à 5 dans le « P » gras.
    const cmd = fillCommand(doc, "p", TABLE_PADDING + 21 + 5, TABLE_PADDING + 10, 1, "#ff0000", bm);
    expect(cmd).toMatchObject({ type: "SetTableCell", content: "Photosynthèse" });
    const spans = cmd !== null && "spans" in cmd ? (cmd.spans as readonly TextSpan[]) : [];
    expect(spans.length).toBeGreaterThan(0);
    expect(spans.every((s) => s.attrs.bold !== true)).toBe(true);
  });
});
