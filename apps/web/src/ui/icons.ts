import type { ActionId, ToolId, ToolItem } from "../toolbar";

// Table d'icônes de RoomBoard (cadrage design-l1, L1-1 à L1-3, § 2 bis). Trait 1,5 sur une grille de 24, calage
// `ICON_VIEWBOX` (coffre 0290). Origines : maquettes `docs/design/maquettes/01-tableau.html` (Lucide
// lucide-icons/lucide@7981a0798a ; `annotate`, `eraser-part`, `line` dessinées), Lucide lu au même commit par `gh api`
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
  "ellipse": [["circle", { cx: "12", cy: "12", r: "10" }]],
  "line": [["path", { d: "M5 19 19 5" }]],
  "arrow": [["path", { d: "M7 7h10v10" }], ["path", { d: "M7 17 17 7" }]],
  "text": [["path", { d: "M12 4v16" }], ["path", { d: "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" }], ["path", { d: "M9 20h6" }]],
  "table": [["path", { d: "M12 3v18" }], ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9h18" }], ["path", { d: "M3 15h18" }]],
  "fill": [["path", { d: "M11 7 6 2" }], ["path", { d: "M18.992 12H2.041" }], ["path", { d: "M21.145 18.38A3.34 3.34 0 0 1 20 16.5a3.3 3.3 0 0 1-1.145 1.88c-.575.46-.855 1.02-.855 1.595A2 2 0 0 0 20 22a2 2 0 0 0 2-2.025c0-.58-.285-1.13-.855-1.595" }], ["path", { d: "m8.5 4.5 2.148-2.148a1.205 1.205 0 0 1 1.704 0l7.296 7.296a1.205 1.205 0 0 1 0 1.704l-7.592 7.592a3.615 3.615 0 0 1-5.112 0l-3.888-3.888a3.615 3.615 0 0 1 0-5.112L5.67 7.33" }]],
  "eraser-part": [["path", { d: "M8 21a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21H8" }], ["path", { d: "m5.082 11.09 8.828 8.828" }], ["path", { d: "M17 21h4" }]],
  "undo": [["path", { d: "M9 14 4 9l5-5" }], ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" }]],
  "redo": [["path", { d: "m15 14 5-5-5-5" }], ["path", { d: "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" }]],
  "prev": [["path", { d: "m15 18-6-6 6-6" }]],
  "next": [["path", { d: "m9 18 6-6-6-6" }]],
  "plus": [["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }]],
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
  "copy-plus": [["path", { d: "M15 12v6" }], ["path", { d: "M12 15h6" }], ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }], ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]],
  "trash-2": [["path", { d: "M10 11v6" }], ["path", { d: "M14 11v6" }], ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }], ["path", { d: "M3 6h18" }], ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]],
  "sliders-horizontal": [["path", { d: "M10 5H3" }], ["path", { d: "M12 19H3" }], ["path", { d: "M14 3v4" }], ["path", { d: "M16 17v4" }], ["path", { d: "M21 12h-9" }], ["path", { d: "M21 19h-5" }], ["path", { d: "M21 5h-7" }], ["path", { d: "M8 10v4" }], ["path", { d: "M8 12H3" }]],
  "chevron-left": [["path", { d: "m15 18-6-6 6-6" }]],
  // Dessinées pour RoomBoard (même grille, trait 1,5) : style du trait, style de tracé, angles, transparence.
  "stroke-solid": [["path", { d: "M4 12h16" }]],
  "stroke-dashed": [["path", { d: "M4 12h3" }], ["path", { d: "M10.5 12h3" }], ["path", { d: "M17 12h3" }]],
  "stroke-dotted": [["path", { d: "M4 12h.01" }], ["path", { d: "M8 12h.01" }], ["path", { d: "M12 12h.01" }], ["path", { d: "M16 12h.01" }], ["path", { d: "M20 12h.01" }]],
  "sloppiness-0": [["path", { d: "M4 16c4-8 12-8 16 0" }]],
  "sloppiness-1": [["path", { d: "M4 16c3-7 6-9 8-6s5 3 8 6" }]],
  "sloppiness-2": [["path", { d: "M4 15c2-6 4-7 5-4s2 4 4 1 3-5 4-2 2 4 3 5" }]],
  "corner-sharp": [["path", { d: "M6 18V6h12" }]],
  "corner-round": [["path", { d: "M6 18v-6a6 6 0 0 1 6-6h6" }]],
});

/** Outil → icône (§ 2 bis). */
export const TOOL_ICONS: Readonly<Record<ToolId, string>> = Object.freeze({
  pen: "pen",
  eraser: "eraser",
  hand: "hand",
  select: "select",
  rect: "rect",
  ellipse: "ellipse",
  line: "line",
  arrow: "arrow",
  text: "text",
  table: "table",
  fill: "fill",
});

/** Action → icône (§ 2 bis) ; l'icône d'état (`ItemState.icon`) passe avant (L1-3). */
export const ACTION_ICONS: Readonly<Record<ActionId, string>> = Object.freeze({
  "eraser-mode": "eraser-part",
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
