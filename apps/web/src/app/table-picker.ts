/**
 * Grille de choix du tableau (C10a, T6) : 8 × 8 cases posées au point cliqué ; survol, focus ou flèches : surbrillance
 * et libellé « 4 × 3 » (4 colonnes × 3 lignes, HC10-1) ; clic ou Entrée : crée ; Échap : ferme. Sous elle, la boîte
 * colonnes, lignes (1 à 64, T4) et « Créer ». Hors de la scène : ses événements ne passent pas par l'échantillonneur.
 * Styles : `.rb-table-picker` dans `ui/rb.css`.
 */
export const PICKER_SIZE = 8;
export const PICKER_MAX = 64;
export const PICKER_CLASS = "rb-table-picker";

export interface TablePickerHost {
  readonly element: HTMLElement;
  /** `at` en px CSS relatifs au parent (la case des scènes : même origine que #stage). */
  open(at: { readonly x: number; readonly y: number }, pick: (cols: number, rows: number) => void): void;
  close(): void;
  isOpen(): boolean;
}

export const pickerLabel = (cols: number, rows: number): string => `${cols} × ${rows}`;
export const pickerAria = (cols: number, rows: number): string =>
  `${cols} colonne${cols > 1 ? "s" : ""}, ${rows} ligne${rows > 1 ? "s" : ""}`;
/** Champ de la boîte : entier de 1 à 64 (illisible : 1). */
export const clampLines = (v: number): number => (Number.isFinite(v) ? Math.min(PICKER_MAX, Math.max(1, Math.round(v))) : 1);

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
  grid.setAttribute("role", "grid");
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
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    close();
  });

  const form = doc.createElement("form");
  const field = (name: string, value: string): HTMLInputElement => {
    const input = doc.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(PICKER_MAX);
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
      root.style.left = `${at.x}px`;
      root.style.top = `${at.y}px`;
      root.hidden = false;
      show(1, 1);
      cells[0]?.focus();
    },
    close,
    isOpen: () => !root.hidden,
  };
}
