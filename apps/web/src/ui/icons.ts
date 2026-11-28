import type { ActionId, ToolId, ToolItem } from "../toolbar";

// Table d'icônes de RoomBoard (cadrage design-l1, L1-1 à L1-3, § 2 bis). Trait 1,5 sur une grille de 24, calage
// `ICON_VIEWBOX` (coffre 0290). Origines : maquettes `docs/design/maquettes/01-tableau.html` (Lucide
// lucide-icons/lucide@7981a0798a ; `annotate`, `line` dessinées), Lucide lu au même commit par `gh api`
// (nom Lucide en commentaire), ou dessinées pour ce lot. Licence : THIRD_PARTY_NOTICES.md (ISC, MIT de Feather).

export type IconTag = "path" | "rect" | "circle" | "line" | "polyline" | "ellipse";
export type IconNode = readonly (readonly [IconTag, Readonly<Record<string, string>>])[];

/** Décalage d'un quart de pixel : un trait de 1,5 sur coordonnée entière tombe sur 3 pixels pleins à 2x (§ 10). */
export const ICON_VIEWBOX = "-0.25 -0.25 24 24";

export const ICONS: Readonly<Record<string, IconNode>> = Object.freeze({
  // Maquettes (symboles `i-<nom>` de 01-tableau.html, recopiés tels quels).
  "pen": [["path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }], ["path", { d: "m15 5 4 4" }]],
  "eraser": [["path", { d: "M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" }], ["path", { d: "m5.082 11.09 8.828 8.828" }]],
  "hand": [["path", { d: "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" }], ["path", { d: "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" }], ["path", { d: "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" }], ["path", { d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" }]],
  "select": [["path", { d: "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" }]],
  "rect": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]],
  "diamond": [["path", { d: "M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z" }]],
  "ellipse": [["circle", { cx: "12", cy: "12", r: "10" }]],
  "line": [["path", { d: "M5 19 19 5" }]],
  "arrow": [["path", { d: "M7 7h10v10" }], ["path", { d: "M7 17 17 7" }]],
  "text": [["path", { d: "M12 4v16" }], ["path", { d: "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" }], ["path", { d: "M9 20h6" }]],
  "table": [["path", { d: "M12 3v18" }], ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9h18" }], ["path", { d: "M3 15h18" }]],
  "fill": [["path", { d: "M11 7 6 2" }], ["path", { d: "M18.992 12H2.041" }], ["path", { d: "M21.145 18.38A3.34 3.34 0 0 1 20 16.5a3.3 3.3 0 0 1-1.145 1.88c-.575.46-.855 1.02-.855 1.595A2 2 0 0 0 20 22a2 2 0 0 0 2-2.025c0-.58-.285-1.13-.855-1.595" }], ["path", { d: "m8.5 4.5 2.148-2.148a1.205 1.205 0 0 1 1.704 0l7.296 7.296a1.205 1.205 0 0 1 0 1.704l-7.592 7.592a3.615 3.615 0 0 1-5.112 0l-3.888-3.888a3.615 3.615 0 0 1 0-5.112L5.67 7.33" }]],
  "undo": [["path", { d: "M9 14 4 9l5-5" }], ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" }]],
  "redo": [["path", { d: "m15 14 5-5-5-5" }], ["path", { d: "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" }]],
  "prev": [["path", { d: "m15 18-6-6 6-6" }]],
  "next": [["path", { d: "m9 18 6-6-6-6" }]],
  "plus": [["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }]],
  // Lucide link (ISC), T18 : lien d'un élément (bouton Lien, éditeur ; le badge du canvas reprend les mêmes tracés)
  // Lucide external-link (ISC), T39 : « Ouvrir le lien » de l'éditeur de lien
  "external-link": [["path", { d: "M15 3h6v6" }], ["path", { d: "M10 14 21 3" }], ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }]],
  "link": [["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }], ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }]],
  // Lucide circle-help (ISC), lu au même commit que les autres
  "circle-help": [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M9 9.5a3 2.5 0 016 0c0 2-2 2-3 3.5" }], ["path", { d: "M12 17h.01" }]],
  "trash": [["path", { d: "M10 11v6" }], ["path", { d: "M14 11v6" }], ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }], ["path", { d: "M3 6h18" }], ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]],
  "file-import": [["path", { d: "M4 11V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1" }], ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M2 15h10" }], ["path", { d: "m9 18 3-3-3-3" }]],
  "pdf": [["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }], ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M12 18v-6" }], ["path", { d: "m9 15 3 3 3-3" }]],
  // design-l3 : maquette 03 (symboles i-<nom> de 03-profils.html ; Lucide x, grip-vertical, eye-off, panel-top,
  // panel-bottom, panel-left, panel-right, app-window, upload, chevron-down, lucide-icons/lucide@7981a0798a), panneau des profils.
  "close": [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
  "grip": [["circle", { cx: "9", cy: "12", r: "1" }], ["circle", { cx: "9", cy: "5", r: "1" }], ["circle", { cx: "9", cy: "19", r: "1" }], ["circle", { cx: "15", cy: "12", r: "1" }], ["circle", { cx: "15", cy: "5", r: "1" }], ["circle", { cx: "15", cy: "19", r: "1" }]],
  "hidden": [["path", { d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" }], ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242" }], ["path", { d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" }], ["path", { d: "m2 2 20 20" }]],
  "dock-top": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9h18" }]],
  "dock-bottom": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 15h18" }]],
  "dock-left": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M9 3v18" }]],
  "dock-right": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M15 3v18" }]],
  "dock-float": [["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }], ["path", { d: "M10 4v4" }], ["path", { d: "M2 8h20" }], ["path", { d: "M6 4v4" }]],
  "file-plus": [["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }], ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M9 15h6" }], ["path", { d: "M12 18v-6" }]],
  // personnalisation-1a (T6, GC4) : tracés Lucide (`copy`, `rectangle-horizontal`, `rectangle-vertical`,
  // `infinity`, `rows-2`, `rows-3`, `rows-4`), lus au commit 7981a0798a, recopiés tels quels ; le trait 1,5 vient du rendu.
  "copy": [["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }], ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]],
  "rectangle-horizontal": [["rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }]],
  "rectangle-vertical": [["rect", { width: "12", height: "20", x: "6", y: "2", rx: "2" }]],
  "infinity": [["path", { d: "M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8" }]],
  "rows-2": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 12h18" }]],
  "rows-3": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M21 9H3" }], ["path", { d: "M21 15H3" }]],
  "rows-4": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M21 7.5H3" }], ["path", { d: "M21 12H3" }], ["path", { d: "M21 16.5H3" }]],
  // personnalisation-1a (T14, GC4) : tracés Lucide du lot 2 (`layers`, `bring-to-front`, `send-to-back`), lus au même commit.
  "layers": [["path", { d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" }], ["path", { d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" }], ["path", { d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" }]],
  "bring-to-front": [["rect", { x: "8", y: "8", width: "8", height: "8", rx: "2" }], ["path", { d: "M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" }], ["path", { d: "M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2" }]],
  "send-to-back": [["rect", { x: "14", y: "14", width: "8", height: "8", rx: "2" }], ["rect", { x: "2", y: "2", width: "8", height: "8", rx: "2" }], ["path", { d: "M7 14v1a2 2 0 0 0 2 2h1" }], ["path", { d: "M14 7h1a2 2 0 0 1 2 2v1" }]],
  // personnalisation 1b : Lucide (ISC) au commit 7981a0798a, noms Lucide identiques.
  "wallpaper": [["path", { d: "M12 17v4" }], ["path", { d: "M8 21h8" }], ["path", { d: "m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15" }], ["circle", { cx: "8", cy: "9", r: "2" }], ["rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }]],
  // OG19 : section « Modèles de cours » (Lucide layout-template, même commit) ; « table » restait celle de l'outil Tableau.
  "layout-template": [["rect", { width: "18", height: "7", x: "3", y: "3", rx: "1" }], ["rect", { width: "9", height: "7", x: "3", y: "14", rx: "1" }], ["rect", { width: "5", height: "7", x: "16", y: "14", rx: "1" }]],
  "search": [["path", { d: "m21 21-4.34-4.34" }], ["circle", { cx: "11", cy: "11", r: "8" }]],
  "image-plus": [["path", { d: "M16 5h6" }], ["path", { d: "M19 2v6" }], ["path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" }], ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }], ["circle", { cx: "9", cy: "9", r: "2" }]],
  "import": [["path", { d: "M12 3v12" }], ["path", { d: "m17 8-5-5-5 5" }], ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }]],
  "down": [["path", { d: "m6 9 6 6 6-6" }]],
  "export": [["path", { d: "M12 15V3" }], ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }], ["path", { d: "m7 10 5 5 5-5" }]],
  "fit": [["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }], ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }], ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }], ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }]],
  "file-new": [["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }], ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M9 15h6" }], ["path", { d: "M12 18v-6" }]],
  "file-open": [["path", { d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" }]],
  "save": [["path", { d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" }], ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" }], ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7" }]],
  "settings": [["path", { d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" }], ["circle", { cx: "12", cy: "12", r: "3" }]],
  "profile": [["path", { d: "M10 15H6a4 4 0 0 0-4 4v2" }], ["path", { d: "m14.305 16.53.923-.382" }], ["path", { d: "m15.228 13.852-.923-.383" }], ["path", { d: "m16.852 12.228-.383-.923" }], ["path", { d: "m16.852 17.772-.383.924" }], ["path", { d: "m19.148 12.228.383-.923" }], ["path", { d: "m19.53 18.696-.382-.924" }], ["path", { d: "m20.772 13.852.924-.383" }], ["path", { d: "m20.772 16.148.924.383" }], ["circle", { cx: "18", cy: "15", r: "3" }], ["circle", { cx: "9", cy: "7", r: "4" }]],
  "grid": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9h18" }], ["path", { d: "M3 15h18" }], ["path", { d: "M9 3v18" }], ["path", { d: "M15 3v18" }]],
  "library": [["rect", { width: "8", height: "18", x: "3", y: "3", rx: "1" }], ["path", { d: "M7 3v18" }], ["path", { d: "M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z" }]],
  "annotate": [["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }], ["path", { d: "M8 21h8" }], ["path", { d: "M12 17v4" }], ["path", { d: "M6 12c1.5-2.5 3-2.5 4 0s2.5 2.5 4 0 2.5-2.5 4 0" }]],
  "pointer": [["path", { d: "M14 4.1 12 6" }], ["path", { d: "m5.1 8-2.9-.8" }], ["path", { d: "m6 12-1.9 2" }], ["path", { d: "M7.2 2.2 8 5.1" }], ["path", { d: "M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" }]],
  "screen": [["path", { d: "M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" }], ["path", { d: "M8 21h8" }], ["path", { d: "M12 17v4" }], ["path", { d: "m17 8 5-5" }], ["path", { d: "M17 3h5v5" }]],
  "freeze": [["path", { d: "m10 20-1.25-2.5L6 18" }], ["path", { d: "M10 4 8.75 6.5 6 6" }], ["path", { d: "m14 20 1.25-2.5L18 18" }], ["path", { d: "m14 4 1.25 2.5L18 6" }], ["path", { d: "m17 21-3-6h-4" }], ["path", { d: "m17 3-3 6 1.5 3" }], ["path", { d: "M2 12h6.5L10 9" }], ["path", { d: "m20 10-1.5 2 1.5 2" }], ["path", { d: "M22 12h-6.5L14 15" }], ["path", { d: "m4 10 1.5 2L4 14" }], ["path", { d: "m7 21 3-6-1.5-3" }], ["path", { d: "m7 3 3 6h4" }]],
  "board": [["path", { d: "M2 3h20" }], ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" }], ["path", { d: "m7 21 5-5 5 5" }]],
  "reset": [["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }], ["path", { d: "M3 3v5h5" }]],
  // Lucide @7981a0798a, lus par gh api.
  // Lucide square-arrow-up-right-exit (ex-square-arrow-out-up-right, alias obsolète)
  "square-arrow-up-right-exit": [["path", { d: "M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" }], ["path", { d: "m21 3-9 9" }], ["path", { d: "M15 3h6v6" }]],
  // Lucide pen-line (état « Dessin » de annotation-pointer)
  "pen-line": [["path", { d: "M13 21h8" }], ["path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }]],
  // Lucide between-horizontal-start
  "between-horizontal-start": [["rect", { width: "13", height: "7", x: "8", y: "3", rx: "1" }], ["path", { d: "m2 9 3 3-3 3" }], ["rect", { width: "13", height: "7", x: "8", y: "14", rx: "1" }]],
  // Lucide between-vertical-start
  "between-vertical-start": [["rect", { width: "7", height: "13", x: "3", y: "8", rx: "1" }], ["path", { d: "m15 2-3 3-3-3" }], ["rect", { width: "7", height: "13", x: "14", y: "8", rx: "1" }]],
  // Lucide columns-3
  "columns-3": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M9 3v18" }], ["path", { d: "M15 3v18" }]],
  // Lucide table-cells-merge
  "table-cells-merge": [["path", { d: "M12 21v-6" }], ["path", { d: "M12 9V3" }], ["path", { d: "M3 15h18" }], ["path", { d: "M3 9h18" }], ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]],
  // Lucide table-cells-split
  "table-cells-split": [["path", { d: "M12 15V9" }], ["path", { d: "M3 15h18" }], ["path", { d: "M3 9h18" }], ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]],
  // Lucide droplet
  droplet: [["path", { d: "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" }]],
  // Lucide droplet-off
  "droplet-off": [["path", { d: "M18.715 13.186C18.29 11.858 17.384 10.607 16 9.5c-2-1.6-3.5-4-4-6.5a10.7 10.7 0 0 1-.884 2.586" }], ["path", { d: "m2 2 20 20" }], ["path", { d: "M8.795 8.797A11 11 0 0 1 8 9.5C6 11.1 5 13 5 15a7 7 0 0 0 13.222 3.208" }]],
  // Dessinées pour RoomBoard : rectangles de between-*-start, chevron remplacé par un tiret « moins ».
  "row-remove": [["rect", { width: "13", height: "7", x: "8", y: "3", rx: "1" }], ["path", { d: "M2 12h4" }], ["rect", { width: "13", height: "7", x: "8", y: "14", rx: "1" }]],
  "col-remove": [["rect", { width: "7", height: "13", x: "3", y: "8", rx: "1" }], ["path", { d: "M10 4h4" }], ["rect", { width: "7", height: "13", x: "14", y: "8", rx: "1" }]],
  // design-l4 : maquette 02 (symboles i-check et i-drop de 02-annotation-bureau.html ; Lucide check et file-down,
  // lucide-icons/lucide@7981a0798a), pastille du bandeau et zone de dépôt.
  "check": [["path", { d: "M20 6 9 17l-5-5" }]],
  "drop": [["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }], ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M12 18v-6" }], ["path", { d: "m9 15 3 3 3-3" }]],
  // design-l2 : maquette 01 (symboles i-menu et i-collapse de 01-tableau.html ; Lucide menu et chevron-up,
  // lucide-icons/lucide@7981a0798a), bouton Menu et Replier de la barre d'outils ; Déplier reprend `down`.
  "menu": [["path", { d: "M4 5h16" }], ["path", { d: "M4 12h16" }], ["path", { d: "M4 19h16" }]],
  "collapse": [["path", { d: "m18 15-6-6-6 6" }]],
  // OG11 (panneau d'options) : Lucide @7981a0798a, ISC (copy-plus, trash-2, sliders-horizontal, chevron-left).
  // OG23 (T13) : Lucide @7981a0798a, ISC (crop).
  "crop": [["path", { d: "M6 2v14a2 2 0 0 0 2 2h14" }], ["path", { d: "M18 22V8a2 2 0 0 0-2-2H2" }]],
  // OG41 (barre d'objet) : Lucide @7981a0798a, ISC (group, ungroup, clipboard-paste, ellipsis, image).
  "group": [["path", { d: "M3 7V5c0-1.1.9-2 2-2h2" }], ["path", { d: "M17 3h2c1.1 0 2 .9 2 2v2" }], ["path", { d: "M21 17v2c0 1.1-.9 2-2 2h-2" }], ["path", { d: "M7 21H5c-1.1 0-2-.9-2-2v-2" }], ["rect", { width: "7", height: "5", x: "7", y: "7", rx: "1" }], ["rect", { width: "7", height: "5", x: "10", y: "12", rx: "1" }]],
  "ungroup": [["rect", { x: "11", y: "14", width: "10", height: "7", rx: "2" }], ["rect", { x: "3", y: "3", width: "10", height: "7", rx: "2" }]],
  "clipboard-paste": [["path", { d: "M11 14h10" }], ["path", { d: "M16 4h2a2 2 0 0 1 2 2v1.344" }], ["path", { d: "m17 18 4-4-4-4" }], ["path", { d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113" }], ["rect", { x: "8", y: "2", width: "8", height: "4", rx: "1" }]],
  "ellipsis": [["circle", { cx: "12", cy: "12", r: "1" }], ["circle", { cx: "19", cy: "12", r: "1" }], ["circle", { cx: "5", cy: "12", r: "1" }]],
  "image": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }], ["circle", { cx: "9", cy: "9", r: "2" }], ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]],
  "copy-plus": [["path", { d: "M15 12v6" }], ["path", { d: "M12 15h6" }], ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }], ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]],
  "trash-2": [["path", { d: "M10 11v6" }], ["path", { d: "M14 11v6" }], ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }], ["path", { d: "M3 6h18" }], ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]],
  "sliders-horizontal": [["path", { d: "M10 5H3" }], ["path", { d: "M12 19H3" }], ["path", { d: "M14 3v4" }], ["path", { d: "M16 17v4" }], ["path", { d: "M21 12h-9" }], ["path", { d: "M21 19h-5" }], ["path", { d: "M21 5h-7" }], ["path", { d: "M8 10v4" }], ["path", { d: "M8 12H3" }]],
  "chevron-left": [["path", { d: "m15 18-6-6 6-6" }]],
  // Dessinées pour RoomBoard (même grille, trait 1,5) : style du trait, style de tracé, angles, transparence.
  "stroke-solid": [["path", { d: "M4 12h16" }]],
  "stroke-dashed": [["path", { d: "M4 12h3" }], ["path", { d: "M10.5 12h3" }], ["path", { d: "M17 12h3" }]],
  "stroke-dotted": [["path", { d: "M4 12h.01" }], ["path", { d: "M8 12h.01" }], ["path", { d: "M12 12h.01" }], ["path", { d: "M16 12h.01" }], ["path", { d: "M20 12h.01" }]],
  // OG23 (T5) : largeur d'un trait (dessinée, grille 24) ; netteté du coin : net, doublé, triplé (dessinée).
  "width-thin": [["path", { d: "M4 12h16", "stroke-width": "1.5" }]],
  "width-medium": [["path", { d: "M4 12h16", "stroke-width": "3" }]],
  "width-thick": [["path", { d: "M4 12h16", "stroke-width": "5" }]],
  "sloppiness-0": [["path", { d: "M5 19V7a2 2 0 0 1 2-2h12" }]],
  "sloppiness-1": [["path", { d: "M5 19V7a2 2 0 0 1 2-2h12" }], ["path", { d: "M7.5 18.5V9a1.5 1.5 0 0 1 1.5-1.5h10" }]],
  "sloppiness-2": [["path", { d: "M5 19V7a2 2 0 0 1 2-2h12" }], ["path", { d: "M7.5 18.5V9a1.5 1.5 0 0 1 1.5-1.5h10" }], ["path", { d: "M10 18V11.5a1 1 0 0 1 1-1h8" }]],
  // Lucide @7981a0798a, ISC : pipette (OG23, T8).
  "pipette": [["path", { d: "m12 9-8.414 8.414A2 2 0 0 0 3 18.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 3.828 21h1.344a2 2 0 0 0 1.414-.586L15 12" }], ["path", { d: "m18 9 .4.4a1 1 0 1 1-3 3l-3.8-3.8a1 1 0 1 1 3-3l.4.4 3.4-3.4a1 1 0 1 1 3 3z" }], ["path", { d: "m2 22 .414-.414" }]],
  // Lucide @7981a0798a, ISC : palette.
  "palette": [["path", { d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" }], ["circle", { cx: "13.5", cy: "6.5", r: ".5" }], ["circle", { cx: "17.5", cy: "10.5", r: ".5" }], ["circle", { cx: "6.5", cy: "12.5", r: ".5" }], ["circle", { cx: "8.5", cy: "7.5", r: ".5" }]],
  "corner-sharp": [["path", { d: "M6 18V6h12" }]],
  "corner-round": [["path", { d: "M6 18v-6a6 6 0 0 1 6-6h6" }]],
  // OG11 lot 2 (T15) : Lucide @7981a0798a, ISC (chevron-up, chevron-down, align-left, align-center, align-right).
  "chevron-up": [["path", { d: "m18 15-6-6-6 6" }]],
  "chevron-down": [["path", { d: "m6 9 6 6 6-6" }]],
  "align-left": [["path", { d: "M21 5H3" }], ["path", { d: "M15 12H3" }], ["path", { d: "M17 19H3" }]],
  "align-center": [["path", { d: "M21 5H3" }], ["path", { d: "M17 12H7" }], ["path", { d: "M19 19H5" }]],
  "align-right": [["path", { d: "M21 5H3" }], ["path", { d: "M21 12H9" }], ["path", { d: "M21 19H7" }]],
  // Dessinées pour RoomBoard (même grille, trait 1,5) : trois remplissages et quatre pointes (la pointe de début est la
  // même icône retournée par la feuille de style).
  "fill-solid": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M8 8h8v8H8z" }], ["path", { d: "M12 12h.01" }]],
  "fill-hachure": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9 9 3" }], ["path", { d: "M3 17 17 3" }], ["path", { d: "M7 21 21 7" }], ["path", { d: "M15 21 21 15" }]],
  "fill-cross": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9 9 3" }], ["path", { d: "M3 17 17 3" }], ["path", { d: "M7 21 21 7" }], ["path", { d: "M15 21 21 15" }], ["path", { d: "M21 9 15 3" }], ["path", { d: "M21 17 7 3" }], ["path", { d: "M17 21 3 7" }], ["path", { d: "M9 21 3 15" }]],
  "head-none": [["path", { d: "M4 12h16" }]],
  "head-arrow": [["path", { d: "M4 12h16" }], ["path", { d: "m14 6 6 6-6 6" }]],
  "head-triangle": [["path", { d: "M4 12h10" }], ["path", { d: "M14 7v10l6-5z" }], ["path", { d: "M16 10.5v3l2-1.5z" }]],
  "head-triangle-outline": [["path", { d: "M4 12h10" }], ["path", { d: "M14 7v10l6-5z" }]],
  // OG23 (T7) : Lucide @7981a0798a, ISC, tracés recopiés tels quels (align-start-vertical, align-center-vertical, align-end-vertical,
  // align-start-horizontal, align-center-horizontal, align-end-horizontal, align-horizontal-space-around, align-vertical-space-around,
  // rotate-ccw-square, rotate-cw-square, square-axis-dashed-vertical -> flip-horizontal, square-axis-dashed-horizontal -> flip-vertical).
  "align-start-vertical": [["rect", { width: "9", height: "6", x: "6", y: "14", rx: "2" }], ["rect", { width: "16", height: "6", x: "6", y: "4", rx: "2" }], ["path", { d: "M2 2v20" }]],
  "align-center-vertical": [["path", { d: "M12 2v20" }], ["path", { d: "M8 10H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h4" }], ["path", { d: "M16 10h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" }], ["path", { d: "M8 20H7a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h1" }], ["path", { d: "M16 14h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1" }]],
  "align-end-vertical": [["rect", { width: "16", height: "6", x: "2", y: "4", rx: "2" }], ["rect", { width: "9", height: "6", x: "9", y: "14", rx: "2" }], ["path", { d: "M22 22V2" }]],
  "align-start-horizontal": [["rect", { width: "6", height: "16", x: "4", y: "6", rx: "2" }], ["rect", { width: "6", height: "9", x: "14", y: "6", rx: "2" }], ["path", { d: "M22 2H2" }]],
  "align-center-horizontal": [["path", { d: "M2 12h20" }], ["path", { d: "M10 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" }], ["path", { d: "M10 8V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4" }], ["path", { d: "M20 16v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1" }], ["path", { d: "M14 8V7c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v1" }]],
  "align-end-horizontal": [["rect", { width: "6", height: "16", x: "4", y: "2", rx: "2" }], ["rect", { width: "6", height: "9", x: "14", y: "9", rx: "2" }], ["path", { d: "M22 22H2" }]],
  "align-horizontal-space-around": [["rect", { width: "6", height: "10", x: "9", y: "7", rx: "2" }], ["path", { d: "M4 22V2" }], ["path", { d: "M20 22V2" }]],
  "align-vertical-space-around": [["rect", { width: "10", height: "6", x: "7", y: "9", rx: "2" }], ["path", { d: "M22 20H2" }], ["path", { d: "M22 4H2" }]],
  "rotate-ccw-square": [["path", { d: "M20 9V7a2 2 0 0 0-2-2h-6" }], ["path", { d: "m15 2-3 3 3 3" }], ["path", { d: "M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" }]],
  "rotate-cw-square": [["path", { d: "M12 5H6a2 2 0 0 0-2 2v3" }], ["path", { d: "m9 8 3-3-3-3" }], ["path", { d: "M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" }]],
  "flip-horizontal": [["path", { d: "M12 14v2" }], ["path", { d: "M12 20v2" }], ["path", { d: "M12 2v2" }], ["path", { d: "M12 8v2" }], ["path", { d: "M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" }], ["path", { d: "M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" }]],
  "flip-vertical": [["path", { d: "M10 12H8" }], ["path", { d: "M16 12h-2" }], ["path", { d: "M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" }], ["path", { d: "M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" }], ["path", { d: "M22 12h-2" }], ["path", { d: "M4 12H2" }]],
  // Dessinées pour RoomBoard (même grille) : pression constante (trait d'épaisseur fixe) et variable (trait qui s'amincit et s'épaissit).
  "pressure-constant": [["path", { d: "M4 12h16", "stroke-width": "3" }]],
  "pressure-variable": [["path", { d: "M4 12 19 9.5A2.5 2.5 0 0 1 19 14.5Z", fill: "currentColor", "stroke-width": "1" }]],
  // OG12 : types de flèche (dessinées pour OG12, d'après les icônes d'Excalidraw), pointes neuves (dessinées pour OG12),
  // Lucide spline (ISC) pour « Modifier les points », Lucide circle-minus (ISC) pour « Retirer le point », liaison (dessinée pour OG12).
  "arrow-type-sharp": [["path", { d: "M5 19 19 5" }], ["path", { d: "M10 5h9v9" }]],
  "arrow-type-round": [["path", { d: "M5 19C7 11 11 7 19 5" }], ["path", { d: "m13.5 3.5 5.5 1.5-2 5.5" }]],
  "arrow-type-elbow": [["path", { d: "M5 19v-8h14" }], ["path", { d: "m15 7 4 4-4 4" }]],
  "head-bar": [["path", { d: "M4 12h16" }], ["path", { d: "M20 6v12" }]],
  "head-circle": [["path", { d: "M4 12h11" }], ["circle", { cx: "17.5", cy: "12", r: "2.5" }], ["circle", { cx: "17.5", cy: "12", r: "1" }]],
  "head-circle-outline": [["path", { d: "M4 12h11" }], ["circle", { cx: "17.5", cy: "12", r: "2.5" }]],
  "edit-points": [["circle", { cx: "19", cy: "5", r: "2" }], ["circle", { cx: "5", cy: "19", r: "2" }], ["path", { d: "M5 17A12 12 0 0 1 17 5" }]],
  "point-remove": [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M8 12h8" }]],
  "arrow-binding": [["path", { d: "M3 12h9" }], ["rect", { x: "14", y: "6", width: "7", height: "12", rx: "1" }], ["circle", { cx: "12.5", cy: "12", r: "1.5" }]],
  // OG34 : panneau de retouche d'image, sections Média et Objet 3D. Lucide @7981a0798a, ISC, lus par `gh api`, recopiés
  // tels quels, noms RoomBoard identiques aux noms Lucide.
  "play": [["path", { d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" }]],
  "pause": [["rect", { x: "14", y: "3", width: "5", height: "18", rx: "1" }], ["rect", { x: "5", y: "3", width: "5", height: "18", rx: "1" }]],
  "repeat": [["path", { d: "m17 2 4 4-4 4" }], ["path", { d: "M3 11v-1a4 4 0 0 1 4-4h14" }], ["path", { d: "m7 22-4-4 4-4" }], ["path", { d: "M21 13v1a4 4 0 0 1-4 4H3" }]],
  "volume-2": [["path", { d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" }], ["path", { d: "M16 9a5 5 0 0 1 0 6" }], ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728" }]],
  "arrow-right-to-line": [["path", { d: "M17 12H3" }], ["path", { d: "m11 18 6-6-6-6" }], ["path", { d: "M21 5v14" }]],
  "arrow-left-to-line": [["path", { d: "M3 19V5" }], ["path", { d: "m13 6-6 6 6 6" }], ["path", { d: "M7 12h14" }]],
  "move-horizontal": [["path", { d: "m18 8 4 4-4 4" }], ["path", { d: "M2 12h20" }], ["path", { d: "m6 8-4 4 4 4" }]],
  "rotate-3d": [["path", { d: "m15.194 13.707 3.814 1.86-1.86 3.814" }], ["path", { d: "M16.47214 7.52786 A 5 10 0 1 0 13 21.79796" }], ["path", { d: "M21.79796 11 A 10 5 0 1 0 19 15.57071" }]],
  "scan": [["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }], ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }], ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }], ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }]],
  "sun": [["circle", { cx: "12", cy: "12", r: "4" }], ["path", { d: "M12 2v2" }], ["path", { d: "M12 20v2" }], ["path", { d: "m4.93 4.93 1.41 1.41" }], ["path", { d: "m17.66 17.66 1.41 1.41" }], ["path", { d: "M2 12h2" }], ["path", { d: "M20 12h2" }], ["path", { d: "m6.34 17.66-1.41 1.41" }], ["path", { d: "m19.07 4.93-1.41 1.41" }]],
  "contrast": [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M12 18a6 6 0 0 0 0-12v12z" }]],
  "rotate-ccw": [["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }], ["path", { d: "M3 3v5h5" }]],
});

/** Outil → icône (§ 2 bis). */
export const TOOL_ICONS: Readonly<Record<ToolId, string>> = Object.freeze({
  pen: "pen",
  eraser: "eraser",
  hand: "hand",
  select: "select",
  rect: "rect",
  diamond: "diamond",
  ellipse: "ellipse",
  line: "line",
  arrow: "arrow",
  text: "text",
  table: "table",
  fill: "fill",
});

/** Action → icône (§ 2 bis) ; l'icône d'état (`ItemState.icon`) passe avant (L1-3). */
export const ACTION_ICONS: Readonly<Record<ActionId, string>> = Object.freeze({
  undo: "undo",
  redo: "redo",
  "page-prev": "prev",
  "page-next": "next",
  "page-add": "plus",
  "page-remove": "trash",
  "page-insert-file": "file-plus",
  "page-duplicate": "copy",
  "page-number": "dock-left",
  "edit-original": "square-arrow-up-right-exit",
  "export-pdf": "pdf",
  "export-iwb": "export",
  "export-ubz": "export",
  "fit-page": "fit",
  "file-new": "file-new",
  "file-open": "file-open",
  "file-import": "file-import",
  "file-save": "save",
  "file-save-as": "save",
  settings: "settings",
  help: "circle-help",
  "page-clear": "eraser",
  profiles: "profile",
  grid: "grid",
  library: "library",
  backgrounds: "wallpaper",
  "desktop-annotation": "annotate",
  "annotation-pointer": "pointer",
  "annotation-screen": "screen",
  "annotation-freeze": "freeze",
  "annotation-send": "board",
  "annotation-send-new": "plus",
  "table-row-insert": "between-horizontal-start",
  "table-col-insert": "between-vertical-start",
  "table-row-remove": "row-remove",
  "table-col-remove": "col-remove",
  "table-uniform": "columns-3",
  "table-merge": "table-cells-merge",
  "table-split": "table-cells-split",
  "table-shade": "droplet",
  "table-unshade": "droplet-off",
  "table-header": "rows-2",
});

const own = (table: Readonly<Record<string, string>>, key: string | undefined): string | undefined =>
  key !== undefined && Object.hasOwn(table, key) ? table[key] : undefined;
const known = (name: string | undefined): name is string => name !== undefined && Object.hasOwn(ICONS, name);

/** Icône d'un élément de barre par sorte (table, jamais un branchement sur l'identifiant). */
const BY_KIND: Readonly<Record<ToolItem["kind"], (item: ToolItem) => string | undefined>> = {
  tool: (item) => own(TOOL_ICONS, item.tool),
  action: (item) => own(ACTION_ICONS, item.action),
  dropzone: () => undefined,
  separator: () => undefined,
};

/** L1-3 : `item.icon` s'il est une clé propre d'`ICONS`, sinon l'icône d'état, sinon la table ; rien : null (texte). */
export function iconFor(item: ToolItem, stateIcon?: string): string | null {
  if (known(item.icon)) return item.icon;
  if (known(stateIcon)) return stateIcon;
  const byTable = BY_KIND[item.kind](item);
  return known(byTable) ? byTable : null;
}
