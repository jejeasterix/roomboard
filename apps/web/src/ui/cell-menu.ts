/**
 * Menu de case (personnalisation-3 T7, D31, G8) : îlot posé au point de l'appui long sur une case du tableau. Entrées en
 * boutons de 44 px au moins (au doigt), icône Lucide du lot L1 quand elle existe ; Échap ou un clic ailleurs le ferme.
 * Ses événements ne passent pas par l'échantillonneur de la scène. Styles : `.rb-cell-menu` dans `ui/rb.css`
 * (habillage de l'îlot : fond, rayon, filet, ombre).
 */
import { ICONS, ICON_VIEWBOX } from "./icons";

export interface CellMenuItem {
  readonly id: "fit" | "cell-image" | "unplace";
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
}

/** Cible tactile minimale (G8). */
export const MENU_BUTTON_PX = 44;
const ICON_OF: Readonly<Record<CellMenuItem["id"], string>> = { fit: "fit", "cell-image": "image", unplace: "close" };
const SVG_NS = "http://www.w3.org/2000/svg";

export function createCellMenu(host: HTMLElement): CellMenuHost {
  const doc = host.ownerDocument;
  const root = doc.createElement("div");
  root.className = "rb-cell-menu";
  root.setAttribute("role", "menu");
  root.hidden = true;
  host.append(root);

  const close = (): void => {
    root.hidden = true;
    root.replaceChildren();
  };
  const icon = (id: CellMenuItem["id"]): SVGElement | null => {
    const nodes = ICONS[ICON_OF[id]];
    if (nodes === undefined) return null;
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", ICON_VIEWBOX);
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.5");
    svg.setAttribute("aria-hidden", "true");
    for (const [tag, attrs] of nodes) {
      const n = doc.createElementNS(SVG_NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      svg.append(n);
    }
    return svg;
  };
  // Un appui ailleurs ferme le menu ; l'appui dans le menu ne remonte pas à la scène.
  doc.addEventListener("pointerdown", (e) => {
    if (!root.hidden && !root.contains(e.target as Node | null)) close();
  });
  root.addEventListener("pointerdown", (e) => e.stopPropagation());
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key !== "Escape") return;
    e.preventDefault();
    close();
  });

  return {
    open(x, y, items) {
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
      root.style.left = `${Math.round(x)}px`;
      root.style.top = `${Math.round(y)}px`;
      root.hidden = false;
      root.querySelector<HTMLButtonElement>("button")?.focus();
    },
    close,
    element: root,
  };
}
