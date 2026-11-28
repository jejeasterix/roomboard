/**
 * OG27 (reste d'OG24) : un îlot bouge (style `left` / `top` posé par `island-place.ts`, repli, compaction), apparaît ou
 * disparaît → `onChange` à la prochaine image, une seule fois par image. Le haut de la page ajustée (`fitTop`) en dépend :
 * l'ajustement et l'ascenseur se recalent sans attendre le prochain défilement. Seuls comptent les attributs d'un îlot
 * ou d'un groupe de coin, et l'arrivée ou le départ d'un îlot ; l'intérieur d'un îlot (boutons) ne réveille rien.
 * OG30 : une taille d'îlot changée sans attribut arrive par `ISLANDS_RESIZED`, même image.
 */
/** OG30 : émis (bulle) par `IslandLayer` quand un îlot de barre ou l'îlot des onglets change de taille sans changer
 *  d'attribut (contenu ouvert, taille des boutons, onglets sur deux lignes) ; un seul `ResizeObserver`, côté calque. */
export const ISLANDS_RESIZED = "rb-islands-resized";
/** Îlots de barre, seuls à réserver le haut de la page (`fitTop`) ; ni le panneau d'options ni un popover (lien). */
export const BAR_ISLAND = ".rb-island[data-island]";
const ISLAND = `${BAR_ISLAND}, .rb-corner`;
/** Attributs par lesquels un îlot bouge ou change de taille (`Island.tsx`) ; la scène et ses `data-*` ne réveillent rien. */
const MOVES = ["style", "class", "hidden", "data-anchor", "data-wrap", "data-compact", "data-collapsed"];

const isIsland = (n: Node): boolean => n instanceof Element && (n.matches(ISLAND) || n.querySelector(ISLAND) !== null);

const touches = (r: MutationRecord): boolean =>
  r.type === "attributes" ? r.target instanceof Element && r.target.matches(ISLAND) : [...r.addedNodes, ...r.removedNodes].some(isIsland);

export function watchIslands(
  root: Node,
  onChange: () => void,
  frame: (cb: () => void) => number = (cb) => requestAnimationFrame(cb),
  cancel: (id: number) => void = (id) => cancelAnimationFrame(id),
): () => void {
  let pending: number | null = null;
  const later = (): void => {
    if (pending !== null) return;
    pending = frame(() => {
      pending = null;
      onChange();
    });
  };
  const observer = new MutationObserver((records) => {
    if (records.some(touches)) later();
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: MOVES });
  root.addEventListener(ISLANDS_RESIZED, later);
  return () => {
    observer.disconnect();
    root.removeEventListener(ISLANDS_RESIZED, later);
    if (pending !== null) cancel(pending);
    pending = null;
  };
}
