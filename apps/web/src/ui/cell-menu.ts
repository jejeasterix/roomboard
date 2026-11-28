/**
 * Menu de case (personnalisation-3 T7, D31, G8) : îlot posé au point de l'appui long sur une case du tableau. Entrées en
 * boutons de 44 px au moins (au doigt), icône Lucide du lot L1 quand elle existe ; Échap, Tab ou un clic ailleurs le
 * ferme (Échap rend le focus). Flèches haut et bas, Début, Fin : comme `MenuBar`. Ctrl, Cmd et Alt passent (Ctrl+Z).
 * Ses événements ne passent pas par l'échantillonneur de la scène. Styles : `.rb-cell-menu` dans `ui/rb.css`
 * (habillage de l'îlot : fond, rayon, filet, ombre).
 */
import { ICONS, ICON_VIEWBOX } from "./icons";

export interface CellMenuItem {
  readonly id: "fit" | "cell-image" | "unplace" | "header" | "sort-asc";
  readonly label: string;
  run(): void;
}
export interface CellMenu {
  open(x: number, y: number, items: readonly CellMenuItem[]): void;
  close(): void;
}

/** Menu avec sa racine DOM, retirée à la fermeture de la scène. */
export interface CellMenuHost extends CellMenu {
  readonly element: HTMLElement;
  /** Ferme (retire l'écouteur du document) et retire la racine. */
  destroy(): void;
}

/** Rang de la ligne cible par touche (même table que `MenuBar`). */
const STEP: Readonly<Record<string, (i: number, n: number) => number>> = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_i, n) => n - 1,
};

/** Position du menu (px entiers) bornée au conteneur : sous le point, au-dessus s'il manque la place (comme `placeTip`). */
export function placeCellMenu(
  x: number,
  y: number,
  menu: { width: number; height: number },
  host: { width: number; height: number },
): { left: number; top: number } {
  const left = Math.min(Math.max(0, x), Math.max(0, host.width - menu.width));
  const top = y + menu.height <= host.height ? y : y - menu.height;
  return { left: Math.round(left), top: Math.round(Math.max(0, top)) };
}

/** Cible tactile minimale (G8). */
export const MENU_BUTTON_PX = 44;
const ICON_OF: Readonly<Record<CellMenuItem["id"], string>> = { fit: "fit", "cell-image": "wallpaper", unplace: "close", header: "rows-2", "sort-asc": "arrow-down-a-z" };
const SVG_NS = "http://www.w3.org/2000/svg";

export function createCellMenu(host: HTMLElement): CellMenuHost {
  const doc = host.ownerDocument;
  const root = doc.createElement("div");
  root.className = "rb-cell-menu";
  root.setAttribute("role", "menu");
  root.setAttribute("aria-label", "Actions de la case");
  root.hidden = true;
  host.append(root);

  // Un appui ailleurs ferme le menu ; l'écouteur du document n'existe que menu ouvert.
  const outside = (e: Event): void => {
    if (!root.contains(e.target as Node | null)) close();
  };
  let before: Element | null = null;
  function close(giveBack = false): void {
    doc.removeEventListener("pointerdown", outside);
    root.hidden = true;
    root.replaceChildren();
    if (giveBack && before instanceof HTMLElement) before.focus();
    before = null;
  }
  const icon = (id: CellMenuItem["id"]): SVGElement | null => {
    const nodes = ICONS[ICON_OF[id]];
    if (nodes === undefined) return null;
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", ICON_VIEWBOX);
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.5");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    for (const [tag, attrs] of nodes) {
      const n = doc.createElementNS(SVG_NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      svg.append(n);
    }
    return svg;
  };
  // L'appui dans le menu ne remonte pas à la scène.
  root.addEventListener("pointerdown", (e) => e.stopPropagation());
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    // Alt passe au document (Alt+F bascule le mode) : le libellé du menu serait périmé, il se ferme.
    if (e.altKey) close();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key === "Tab") {
      close();
      return;
    }
    const step = STEP[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const buttons = [...root.querySelectorAll<HTMLButtonElement>("button")];
    const at = buttons.findIndex((b) => b === doc.activeElement);
    buttons[step(at < 0 ? 0 : at, buttons.length)]?.focus();
  });

  return {
    open(x, y, items) {
      if (root.hidden) {
        before = doc.activeElement;
        doc.addEventListener("pointerdown", outside);
      }
      root.replaceChildren();
      for (const it of items) {
        const b = doc.createElement("button");
        b.type = "button";
        b.setAttribute("role", "menuitem");
        b.dataset["menuItem"] = it.id;
        b.style.minHeight = `${MENU_BUTTON_PX}px`;
        b.style.minWidth = `${MENU_BUTTON_PX}px`;
        const g = icon(it.id);
        if (g !== null) b.append(g);
        const t = doc.createElement("span");
        t.textContent = it.label;
        b.append(t);
        b.addEventListener("click", () => {
          close();
          it.run();
        });
        root.append(b);
      }
      root.hidden = false;
      const at = placeCellMenu(x, y, { width: root.offsetWidth, height: root.offsetHeight }, { width: host.clientWidth, height: host.clientHeight });
      root.style.left = `${at.left}px`;
      root.style.top = `${at.top}px`;
      root.querySelector<HTMLButtonElement>("button")?.focus();
    },
    close: () => close(),
    element: root,
    destroy() {
      close();
      root.remove();
    },
  };
}
