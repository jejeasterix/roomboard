/**
 * Grille de choix du tableau (C10a, T6) : 8 × 8 cases posées au point cliqué ; survol, focus ou flèches : surbrillance
 * et libellé « 4 × 3 » (4 colonnes × 3 lignes, HC10-1) ; clic ou Entrée : crée ; Échap : ferme. Sous elle, la boîte
 * colonnes, lignes (1 à 64, T4) et « Créer ». Hors de la scène : ses événements ne passent pas par l'échantillonneur, et
 * ses touches ne remontent pas à `window` (écoute du moteur, `main.ts`). Bornée à son conteneur (T14).
 * Styles : `.rb-table-picker` dans `ui/rb.css`.
 */
import { TABLE_MAX_LINES } from "../core/api";
import type { TablePicker } from "../engine/tools/table";

export const PICKER_SIZE = 8;
export const PICKER_CLASS = "rb-table-picker";

/** `open(at)` : `at` en px CSS relatifs au parent (la case des scènes : même origine que #stage). */
export interface TablePickerHost extends TablePicker {
  readonly element: HTMLElement;
}

interface Point {
  readonly x: number;
  readonly y: number;
}
interface Size {
  readonly w: number;
  readonly h: number;
}
/** Coin de la grille au point, décalé vers le haut ou la gauche s'il déborde du conteneur ; conteneur plus petit : en
 *  haut à gauche. Conteneur sans mise en page (0 × 0) : rien à borner, le point reste. */
export const placeWithin = (at: Point, size: Size, box: Size): Point =>
  box.w === 0 && box.h === 0
    ? at
    : { x: Math.max(0, Math.min(at.x, box.w - size.w)), y: Math.max(0, Math.min(at.y, box.h - size.h)) };

export const pickerLabel = (cols: number, rows: number): string => `${cols} × ${rows}`;
export const pickerAria = (cols: number, rows: number): string =>
  `${cols} colonne${cols > 1 ? "s" : ""}, ${rows} ligne${rows > 1 ? "s" : ""}`;
/** Champ de la boîte : entier de 1 à 64 (illisible : 1). */
export const clampLines = (v: number): number => (Number.isFinite(v) ? Math.min(TABLE_MAX_LINES, Math.max(1, Math.round(v))) : 1);

/** Touches que le moteur prend sans Ctrl ni Méta (`editAction`, `isPanKey`, engine/input/keys.ts) : gardées par la grille. */
const ENGINE_KEYS: ReadonlySet<string> = new Set(["Backspace", "Delete", "Escape", " "]);
const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};
const within = (v: number): number => Math.min(PICKER_SIZE, Math.max(1, v));

export function createTablePicker(parent: HTMLElement): TablePickerHost {
  const doc = parent.ownerDocument;
  const root = doc.createElement("div");
  root.className = PICKER_CLASS;
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Nouveau tableau");
  const grid = doc.createElement("div");
  grid.className = "rb-table-picker-grid";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "Taille du tableau");
  const label = doc.createElement("span");
  label.dataset["pickerLabel"] = "";
  const cells: HTMLButtonElement[] = [];
  let onPick: ((cols: number, rows: number) => void) | null = null;
  let hot = { cols: 1, rows: 1 };

  const show = (cols: number, rows: number): void => {
    hot = { cols, rows };
    for (const b of cells) b.toggleAttribute("data-on", Number(b.dataset["cols"]) <= cols && Number(b.dataset["rows"]) <= rows);
    label.textContent = pickerLabel(cols, rows);
  };
  const close = (): void => {
    root.hidden = true;
    onPick = null;
  };
  const choose = (cols: number, rows: number): void => {
    const f = onPick;
    close();
    f?.(cols, rows);
  };

  for (let r = 1; r <= PICKER_SIZE; r++) {
    for (let c = 1; c <= PICKER_SIZE; c++) {
      const b = doc.createElement("button");
      b.type = "button";
      b.dataset["cols"] = String(c);
      b.dataset["rows"] = String(r);
      b.setAttribute("aria-label", pickerAria(c, r));
      b.addEventListener("pointerenter", () => show(c, r));
      b.addEventListener("focus", () => show(c, r));
      b.addEventListener("click", () => choose(c, r));
      cells.push(b);
      grid.append(b);
    }
  }
  grid.addEventListener("keydown", (e: KeyboardEvent) => {
    const d = Object.hasOwn(ARROWS, e.key) ? ARROWS[e.key] : undefined;
    if (d !== undefined) {
      e.preventDefault();
      const cols = within(hot.cols + d[0]);
      const rows = within(hot.rows + d[1]);
      show(cols, rows);
      cells[(rows - 1) * PICKER_SIZE + (cols - 1)]?.focus();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      choose(hot.cols, hot.rows);
    }
  });
  // Les touches dont le moteur se sert sans Ctrl ni Méta (Retour arrière, Suppr, Échap : `editAction` ; Espace :
  // `isPanKey`) restent à la grille : sans cela, Retour arrière viderait la cellule active, Échap la sélection derrière
  // elle et Espace passerait en déplacement de la vue (`inEditable` ne compte pas un <button>). Toute combinaison
  // Ctrl/Méta remonte à window (Ctrl+S, Ctrl+O : `workspace.key`, main.ts) (T15).
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || !ENGINE_KEYS.has(e.key)) return;
    e.stopPropagation();
    if (e.key !== "Escape") return;
    e.preventDefault();
    close();
  });

  const form = doc.createElement("form");
  const field = (name: string, value: string): HTMLInputElement => {
    const input = doc.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(TABLE_MAX_LINES);
    input.value = value;
    input.setAttribute("aria-label", name);
    return input;
  };
  const colsInput = field("Colonnes", "3");
  const rowsInput = field("Lignes", "3");
  const create = doc.createElement("button");
  create.type = "submit";
  create.textContent = "Créer";
  form.append(colsInput, rowsInput, create);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    choose(clampLines(Number(colsInput.value)), clampLines(Number(rowsInput.value)));
  });

  root.append(grid, label, form);
  parent.append(root);

  return {
    element: root,
    open(at, pick) {
      onPick = pick;
      root.hidden = false;
      const p = placeWithin(at, { w: root.offsetWidth, h: root.offsetHeight }, { w: parent.clientWidth, h: parent.clientHeight });
      root.style.left = `${p.x}px`;
      root.style.top = `${p.y}px`;
      show(1, 1);
      cells[0]?.focus();
    },
    close,
    isOpen: () => !root.hidden,
  };
}
