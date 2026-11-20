// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { tableFromHtml } from "./html-table";

const parse = (s: string): Document => new DOMParser().parseFromString(s, "text/html");
const grid = (html: string) => tableFromHtml(html, parse);
const rows = (n: number, cell: (i: number) => string): string => `<table>${Array.from({ length: n }, (_, i) => `<tr><td>${cell(i)}</td></tr>`).join("")}</table>`;

describe("tableau HTML collé (F19, F20)", () => {
  it("S2 : colspan 2 sur la première ligne : 2 × 2, une fusion, « Titre », « a », « b »", () => {
    expect(grid('<table><tr><td colspan="2">Titre</td></tr><tr><td>a</td><td>b</td></tr></table>')).toEqual({
      rows: 2, cols: 2, cells: ["Titre", "", "a", "b"], merges: [{ row: 0, col: 0, rows: 1, cols: 2 }], sourceRows: 2, sourceCols: 2, cutCells: false,
    });
  });

  it("rowspan : la case prise est sautée (modèle d'occupation du tableau HTML)", () => {
    const g = grid("<table><tr><td rowspan=2>A</td><td>B</td></tr><tr><td>C</td></tr></table>");
    expect([g?.rows, g?.cols, g?.cells, g?.merges]).toEqual([2, 2, ["A", "B", "", "C"], [{ row: 0, col: 0, rows: 2, cols: 1 }]]);
  });

  it("rowspan 0 : jusqu'à la fin ; colspan 5000 : rogné à 64 ; source comptée à part", () => {
    const g = grid('<table><tr><td rowspan="0">A</td><td colspan="5000">B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>');
    expect([g?.rows, g?.cols, g?.sourceRows, g?.sourceCols]).toEqual([3, 64, 3, 1001]);
    expect(g?.merges).toEqual([{ row: 0, col: 0, rows: 3, cols: 1 }, { row: 0, col: 1, rows: 1, cols: 63 }]);
    expect([g?.cells[64 + 1], g?.cells[128 + 1]]).toEqual(["C", "D"]);
  });

  it("cellules qui se recoupent (HTML mal formé) : fusion ignorée, la cellule reste à sa place", () => {
    const g = grid('<table><tr><td>A</td><td rowspan="2">B</td></tr><tr><td colspan="3">C</td></tr></table>');
    expect([g?.rows, g?.cols, g?.sourceCols, g?.cells, g?.merges]).toEqual([2, 3, 3, ["A", "B", "", "C", "", ""], [{ row: 0, col: 1, rows: 2, cols: 1 }]]);
  });

  it("texte : <br> et fin de <p>, <div>, <li> → saut de ligne ; blancs repliés ; espace insécable → espace ; bords rognés", () => {
    const g = grid("<table><tr><td>  Ligne&nbsp;1<br>Ligne   2<p>para</p><div>bloc</div><ul><li>x</li><li>y</li></ul>  </td></tr></table>");
    expect(g?.cells).toEqual(["Ligne 1\nLigne 2\npara\nbloc\nx\ny"]);
  });

  it("tableau imbriqué aplati : ses lignes en sauts de ligne, ses cellules séparées par une espace (PC16)", () => {
    const g = grid("<table><tr><td>Haut<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table></td></tr></table>");
    expect([g?.rows, g?.cols, g?.cells]).toEqual([1, 1, ["Haut\na b\nc"]]);
  });

  it("script, image, style : jamais exécutés ni chargés, texte ignoré (S2, F19)", () => {
    const html =
      '<table><tr><td>a<script>window.__rb=1</script><style>td{color:red}</style><template>t</template><noscript>n</noscript></td></tr></table>' +
      '<img src="http://exemple.invalid/x.png" onerror="window.__rb=1"><script>window.__rb=1</script>';
    expect(grid(html)?.cells).toEqual(["a"]);
    expect((globalThis as { __rb?: number }).__rb).toBeUndefined();
    expect(document.querySelectorAll("table, img, script").length).toBe(0);
  });

  it("premier tableau qui a une ligne ; aucun tableau, ou des lignes sans cellule : null", () => {
    expect(grid("<table></table><table><tr><td>x</td></tr></table>")?.cells).toEqual(["x"]);
    expect(grid("<p>rien</p>")).toBeNull();
    expect(grid("<table><tr></tr></table>")).toBeNull();
  });

  it("plafonds (F22) : 70 lignes → 64 gardées, 70 comptées ; texte de plus de 2 000 caractères coupé, suivi de « … »", () => {
    const g = grid(rows(70, (i) => `L${i}`));
    expect([g?.rows, g?.cols, g?.sourceRows, g?.cutCells, g?.cells[63]]).toEqual([64, 1, 70, false, "L63"]);
    const long = grid(rows(1, () => "é".repeat(2001)));
    expect(long?.cutCells).toBe(true);
    expect(Array.from(long?.cells[0] ?? "")).toHaveLength(2001);
    expect(long?.cells[0]?.endsWith("…")).toBe(true);
  });
});
