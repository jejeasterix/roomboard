import { placeWithin } from "../app/table-picker";
import type { ButtonSize } from "../toolbar";

/**
 * Placement des îlots (design-l2, DA-L2-2) : pur, sans DOM, en px CSS entiers (L2-12 : jamais `translate(-50%)` ni
 * colonnes `1fr`). Les coins se posent en CSS (marges de 16 px) ; ce module décide la voie et la largeur maximale des
 * îlots centrés (L2-30), les bornes d'un îlot déplacé (L2-9, L2-11), le pas clavier (L2-10), la voie imposée par le
 * panneau des profils (L2-16) et la largeur des onglets (L2-30 c). `Island.tsx` mesure et appelle.
 */
export type Anchor = "top-start" | "top-center" | "top-end" | "bottom-start" | "bottom-center";
export interface Point { readonly x: number; readonly y: number }
export interface Box { readonly w: number; readonly h: number }
/** Rangée de l'ancre : largeur occupée à gauche (`start`) et à droite (`end`) par les groupes de coins, hauteur de la
 *  rangée des coins (`band`, 0 sans coin). En haut, `start` compte l'îlot des onglets à sa largeur minimale, puis
 *  `#etat` non vide et son écart (T11). */
export interface Corners { readonly start: number; readonly end: number; readonly band: number }
export interface Lane { readonly x: number; readonly y: number; readonly maxWidth: number }

/** Marge des coins et du bord (L2-12). */
export const EDGE = 16;
/** Écart entre deux îlots, et entre deux rangées. */
export const GAP = 8;
/** Largeur minimale de l'îlot des onglets (H8). */
export const TABS_MIN = 144;
/** Largeur du panneau des profils (`--rb-sheet-w` de rb.css, repli quand la variable est illisible). */
export const SHEET_W = 600;
/** Côté d'un bouton par taille (jetons --rb-btn-s|m|l de rb.css, D-DS3). */
export const BUTTON_PX: Readonly<Record<ButtonSize, number>> = Object.freeze({ s: 44, m: 48, l: 64 });

/** L2-5 : ancre d'une barre `floating` par rôle ; rôle inconnu : haut-droite après `panels` (H11). */
export const ISLAND_ANCHORS: Readonly<Record<string, Anchor>> = Object.freeze({
  menu: "top-start",
  tools: "top-center",
  panels: "top-end",
  history: "bottom-start",
  pages: "bottom-center",
});
const CENTERED: ReadonlySet<Anchor> = new Set<Anchor>(["top-center", "bottom-center"]);
const KEY_STEP: Readonly<Record<string, readonly [number, number]>> = Object.freeze({
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
});
const STEP = 16;
const BIG_STEP = 64;

export function anchorOf(role: string): Anchor {
  return Object.hasOwn(ISLAND_ANCHORS, role) ? ISLAND_ANCHORS[role]! : "top-end";
}

export function isCentered(anchor: Anchor): boolean {
  return CENTERED.has(anchor);
}

const isTop = (anchor: Anchor): boolean => anchor.startsWith("top");

/**
 * Voie d'un îlot (L2-30). Centré : sur la rangée de ses coins si la place centrée et symétrique entre les groupes de
 * coins le contient entier (largeur maximale = cette place) ; sinon dans la voie suivante, sous la rangée du haut ou
 * au-dessus de la rangée du bas, toute la largeur moins 2 × 16. Coin : sa position de coin, largeur moins 2 × 16.
 */
export function laneOf(anchor: Anchor, size: Box, area: Box, corners: Corners): Lane {
  const full = Math.max(0, area.w - 2 * EDGE);
  const top = isTop(anchor);
  if (isCentered(anchor)) {
    const sym = area.w - 2 * (EDGE + Math.max(corners.start, corners.end) + GAP);
    if (size.w <= sym) {
      return { x: Math.round((area.w - size.w) / 2), y: Math.max(0, top ? EDGE : area.h - EDGE - size.h), maxWidth: sym };
    }
    const w = Math.min(size.w, full);
    const y = top ? EDGE + corners.band + GAP : area.h - EDGE - corners.band - GAP - size.h;
    return { x: Math.round((area.w - w) / 2), y: Math.max(0, Math.round(y)), maxWidth: full };
  }
  const w = Math.min(size.w, full);
  const x = anchor === "top-end" ? area.w - EDGE - w : EDGE;
  return { x: Math.round(x), y: Math.max(0, Math.round(top ? EDGE : area.h - EDGE - size.h)), maxWidth: full };
}

/** Position affichée (L2-9, L2-11) : sans position enregistrée, celle de la voie ; sinon la position, l'îlot entier
 *  dans la case (`placeWithin`), arrondie ; jamais réécrite ici. */
export function placeIsland(anchor: Anchor, size: Box, area: Box, at: Point | null, corners: Corners): Point {
  if (at === null) {
    const l = laneOf(anchor, size, area, corners);
    return { x: l.x, y: l.y };
  }
  const w = Math.min(size.w, Math.max(0, area.w - 2 * EDGE));
  const p = placeWithin(at, { w, h: size.h }, area);
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

/** Bruit flottant toléré sous le pixel entier (le navigateur pose les largeurs au 1/64 px). */
const PIXEL_EPS = 1e-3;

/** Netteté (T9) : marge de fin qui porte un texte de largeur `w` au pixel entier supérieur, pour que les icônes qui le
 *  suivent (Fermer après un titre d'onglet, Suivante après `#pages`) restent sur la grille de pixels à 1x et 2x.
 *  Toujours vers le haut : jamais de marge négative, le texte n'est pas rogné ; 0 si `w` est entier ou invalide. */
export function pixelPad(w: number): number {
  if (!Number.isFinite(w) || w <= 0) return 0;
  return Math.max(0, Math.ceil(w - PIXEL_EPS) - w);
}

/** L2-10 : flèches de 16 px, 64 avec Maj ; toute autre touche (Début compris, que l'appelant traite) : null. */
export function nudge(at: Point, key: string, big: boolean): Point | null {
  if (!Object.hasOwn(KEY_STEP, key)) return null;
  const [dx, dy] = KEY_STEP[key]!;
  const step = big ? BIG_STEP : STEP;
  return { x: at.x + dx * step, y: at.y + dy * step };
}

/** T22 : largeur du panneau d'options pour des boutons de `btn` px : 5 cibles, 4 écarts de 4, 2 marges de 12, et un
 *  intérieur de segments (2 marges de 4 en moins) multiple de 12, pour que 2 et 3 segments aient une largeur paire
 *  entière : chaque icône de 24 px tombe sur la grille de pixels à 1x et 2x. */
export function optionsWidth(btn: number): number {
  const inner = Math.ceil((5 * btn + 4 * 4 - 2 * 4) / 12) * 12;
  return inner + 2 * 4 + 2 * 12;
}

/** OG11 : bas de la rangée du haut (îlots posés à `EDGE`, hauts de `btn` + 8) pour la taille de bouton `btn` du profil. */
export function topRowBottom(btn: number): number {
  return EDGE + btn + 8;
}

/** OG11 : coin haut-gauche du panneau d'options, sous la rangée du haut (`tops` = son bas, `topRowBottom`), à droite de la barre
 *  latérale quand elle existe (`sideStart`, relative au bord gauche de la zone) ; y borné pour rester dans la zone. */
export function placeOptions(area: Box, sideStart: Box | null, tops: number): Point {
  return { x: sideStart ? sideStart.w + GAP : EDGE, y: Math.min(tops + GAP, Math.max(EDGE, area.h - EDGE)) };
}

/** L2-16 : panneau des profils ouvert, voie de l'îlot d'outils dans la place à sa gauche, sous la rangée du haut ;
 *  null si cette place est plus étroite que 2 × 16 + 3 boutons (H13 : les îlots restent sous le panneau). */
export function sheetLane(area: Box, sheet: number, band: number, btn: number): Lane | null {
  const free = area.w - Math.min(sheet, area.w);
  if (free < 2 * EDGE + 3 * btn) return null;
  return { x: EDGE, y: EDGE + band + GAP, maxWidth: free - 2 * EDGE };
}

/** L2-30 (c) : largeur de l'îlot des onglets posé à `startX` : jusqu'à l'îlot d'outils s'il est sur la rangée du haut
 *  (non déplacé : `tools` non nul), sinon jusqu'au groupe haut-droite (`end`), moins `#etat` non vide (`status`, sa
 *  largeur) et son écart, qui suivent les onglets (T11) ; au moins 144 px. */
export function tabsWidth(area: Box, startX: number, end: number, tools: Point | null, status = 0): number {
  const right = tools !== null && tools.y === EDGE && tools.x > startX ? tools.x - GAP : area.w - EDGE - end - (end > 0 ? GAP : 0);
  return Math.max(TABS_MIN, Math.floor(right - startX - (status > 0 ? status + GAP : 0)));
}
