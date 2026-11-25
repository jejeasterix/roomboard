import type { Dock } from "../toolbar";

export interface GridLayout { readonly areas: string; readonly columns: string; readonly rows: string }

const STAGE = "minmax(0, 1fr)";

/** Grille CSS (design-l2, L2-14) : seules les bandes ; barres top/bottom en lignes, left/right en colonnes, scène au
 *  centre. Onglets, `#etat` et barres `floating` vont dans le calque des îlots (`IslandLayer`), sur la case `stage`. */
export function layoutFor(bars: readonly { readonly id: string; readonly dock: Dock }[]): GridLayout {
  const at = (dock: Dock): string[] => bars.filter((b) => b.dock === dock).map((b) => b.id);
  const lefts = at("left");
  const rights = at("right");
  const cols = [...lefts, "stage", ...rights];
  const row = (cells: readonly string[]): string => `"${cells.join(" ")}"`;
  const full = (name: string): string => row(cols.map(() => name));
  const tops = at("top");
  const bottoms = at("bottom");
  const lines = [...tops.map(full), row(cols), ...bottoms.map(full)];
  return {
    areas: lines.join(" "),
    columns: [...lefts.map(() => "auto"), STAGE, ...rights.map(() => "auto")].join(" "),
    rows: [...tops.map(() => "auto"), STAGE, ...bottoms.map(() => "auto")].join(" "),
  };
}
