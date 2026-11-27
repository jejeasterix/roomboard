/**
 * Fonds dessinés du pack (personnalisation-1b, Q8 à Q10, DA3) : 34 couleurs unies, 18 dégradés et 12 modèles de cours en
 * SVG (`svg.ts`), 54 lignages et grilles vectoriels du cœur (six types × trois pas × trois papiers), nets à tout zoom.
 */
import type { GridInput, GridKind } from "../core/api";
import type { PackBackground } from "./catalog";
import { GRADIENTS, LESSONS } from "./svg";

/** Unités de page par millimètre (`grid-edit.ts` : Seyès 8 mm = 30,24). */
const MM = 3.78;
const mm = (v: number): number => Math.round(v * MM * 100) / 100;

const gridOf = (kind: GridKind, spacing: number, line: string): GridInput => ({
  visible: true,
  snap: false,
  above: false,
  levels: [{ kind, spacingX: spacing, spacingY: spacing, originX: 0, originY: 0, color: line, line: "solid", lineWidth: 1, snap: true, visible: true }],
});

type Swatch = readonly [id: string, label: string, color: string, keywords: readonly string[]];
const LIGHT: readonly Swatch[] = [
  ["blanc", "Blanc (aucun fond)", "#ffffff", ["blanc", "aucun", "vide", "neutre", "effacer"]],
  ["creme", "Crème", "#fbf7ec", ["crème", "ivoire", "papier", "doux"]],
  ["ivoire", "Ivoire", "#fffdf5", ["ivoire", "blanc cassé", "papier"]],
  ["sable", "Sable", "#f4ecd8", ["sable", "beige", "plage"]],
  ["peche", "Pêche", "#fde8dc", ["pêche", "orange", "doux"]],
  ["rose-poudre", "Rose poudré", "#fbe4ec", ["rose", "doux", "pastel"]],
  ["lavande", "Lavande", "#ece9fb", ["lavande", "violet", "pastel"]],
  ["lilas", "Lilas", "#e9e0f7", ["lilas", "violet", "pastel"]],
  ["bleu-ciel", "Bleu ciel", "#e3f1fb", ["bleu", "ciel", "pastel"]],
  ["bleu-glacier", "Bleu glacier", "#e8f3f7", ["bleu", "froid", "glace"]],
  ["menthe", "Menthe", "#e3f5ec", ["menthe", "vert", "frais"]],
  ["vert-eau", "Vert d'eau", "#dff3ef", ["vert", "eau", "pastel"]],
  ["tilleul", "Tilleul", "#eef6dc", ["vert", "tilleul", "printemps"]],
  ["jaune-pale", "Jaune pâle", "#fdf6d6", ["jaune", "soleil", "pastel"]],
  ["citron", "Citron", "#fbf3c4", ["jaune", "citron", "vif"]],
  ["gris-perle", "Gris perle", "#f2f3f5", ["gris", "perle", "neutre"]],
  ["gris-clair", "Gris clair", "#e6e8eb", ["gris", "clair", "neutre"]],
  ["lin", "Lin", "#f1ece2", ["lin", "beige", "naturel"]],
  ["abricot", "Abricot", "#fde9d2", ["abricot", "orange", "chaud"]],
  ["corail", "Corail clair", "#fde2dd", ["corail", "rose", "chaud"]],
];
const DARK: readonly Swatch[] = [
  ["ardoise", "Ardoise", "#2f3e46", ["ardoise", "tableau noir", "craie", "sombre", "gris"]],
  ["tableau-vert", "Tableau vert", "#234d3c", ["tableau vert", "craie", "vert", "sombre", "école"]],
  ["bleu-nuit", "Bleu nuit", "#14213d", ["bleu", "nuit", "sombre"]],
  ["marine", "Marine", "#1b2a4a", ["marine", "bleu", "sombre"]],
  ["anthracite", "Anthracite", "#2b2d31", ["anthracite", "gris", "sombre"]],
  ["noir", "Noir", "#111111", ["noir", "sombre", "contraste"]],
  ["prune", "Prune", "#3b1f3a", ["prune", "violet", "sombre"]],
  ["bordeaux", "Bordeaux", "#4a1c24", ["bordeaux", "rouge", "sombre"]],
  ["foret", "Forêt", "#1f3b2c", ["forêt", "vert", "sombre"]],
  ["petrole", "Pétrole", "#12394a", ["pétrole", "bleu", "vert", "sombre"]],
  ["chocolat", "Chocolat", "#3a2a20", ["chocolat", "brun", "sombre"]],
  ["indigo", "Indigo", "#272654", ["indigo", "bleu", "violet", "sombre"]],
  ["graphite", "Graphite", "#3a3f44", ["graphite", "gris", "sombre"]],
  ["aubergine", "Aubergine", "#2e1f3d", ["aubergine", "violet", "sombre"]],
];

const swatch = (theme: string) => ([id, label, color, keywords]: Swatch): PackBackground => ({
  id, section: "colors", theme, label, keywords, kind: "color", color, grid: null, photo: null,
});

interface Paper {
  readonly suffix: string;
  readonly label: string;
  readonly color: string;
  readonly line: string;
  readonly words: readonly string[];
}
const WHITE: Paper = { suffix: "", label: "", color: "#ffffff", line: "#94a3b8", words: ["blanc"] };
const CREAM: Paper = { suffix: "-creme", label: " crème", color: "#fbf7ec", line: "#a8a29e", words: ["crème", "papier"] };
const SLATE: Paper = { suffix: "-ardoise", label: " sur ardoise", color: "#2f3e46", line: "#6b7f88", words: ["sombre", "ardoise", "tableau noir"] };
/** Seyès : papier crème par défaut, lignes lavande (S1 : « Seyès 8 mm » sur fond crème). */
const SEYES_PAPERS: readonly Paper[] = [
  { ...CREAM, suffix: "", label: "", line: "#8f9ad6" },
  { ...WHITE, suffix: "-blanc", label: " blanc", line: "#8f9ad6" },
  SLATE,
];

interface LineTheme {
  readonly theme: string;
  readonly kind: GridKind;
  readonly slug: string;
  readonly name: string;
  readonly words: readonly string[];
  readonly sizes: readonly (readonly [tag: string, label: string, spacing: number])[];
  readonly papers: readonly Paper[];
}
const mmSizes = (...v: number[]) => v.map((x) => [`${x}mm`, `${x} mm`, mm(x)] as const);
const LINE_THEMES: readonly LineTheme[] = [
  { theme: "lignages", kind: "lines", slug: "lignage", name: "Lignage", words: ["lignes", "lignage", "cahier", "écriture"], sizes: mmSizes(7, 8, 10), papers: [WHITE, CREAM, SLATE] },
  { theme: "quadrillages", kind: "squares", slug: "quadrillage", name: "Quadrillage", words: ["quadrillage", "carreaux", "petits carreaux", "grille", "maths"], sizes: mmSizes(5, 10, 20), papers: [WHITE, CREAM, SLATE] },
  { theme: "seyes", kind: "seyes", slug: "seyes", name: "Seyès", words: ["seyès", "grands carreaux", "cahier", "écriture", "français"], sizes: mmSizes(8, 9, 10), papers: SEYES_PAPERS },
  { theme: "points", kind: "dots", slug: "points", name: "Points", words: ["points", "pointillé", "trame", "grille"], sizes: mmSizes(5, 10, 15), papers: [WHITE, CREAM, SLATE] },
  { theme: "isometrique", kind: "isometric", slug: "isometrique", name: "Isométrique", words: ["isométrique", "triangles", "perspective", "géométrie"], sizes: mmSizes(10, 15, 20), papers: [WHITE, CREAM, SLATE] },
  {
    theme: "portees", kind: "music", slug: "portees", name: "Portées", words: ["portée", "portées", "musique", "solfège", "partition"],
    sizes: [["serrees", "serrées", 16], ["moyennes", "moyennes", 20], ["larges", "larges", 24]], papers: [WHITE, CREAM, SLATE],
  },
];

const lines: PackBackground[] = LINE_THEMES.flatMap((th) =>
  th.sizes.flatMap(([tag, size, spacing]) =>
    th.papers.map((p): PackBackground => ({
      id: `${th.slug}-${tag}${p.suffix}`,
      section: "lines",
      theme: th.theme,
      label: `${th.name} ${size}${p.label}`,
      keywords: [...th.words, ...p.words],
      kind: "grid",
      color: p.color,
      grid: gridOf(th.kind, spacing, p.line),
      photo: null,
    })),
  ),
);

const gradients: PackBackground[] = GRADIENTS.map((g) => ({
  id: `degrade-${g.slug}`, section: "colors", theme: "degrades", label: g.label, keywords: ["dégradé", ...g.keywords], kind: "svg", color: g.to, grid: null, photo: null,
}));

const lessons: PackBackground[] = LESSONS.map((l) => ({
  id: l.id, section: "lessons", theme: l.theme, label: l.label, keywords: l.keywords, kind: "svg", color: l.color, grid: null, photo: null,
}));

export const DRAWN: readonly PackBackground[] = Object.freeze([...LIGHT.map(swatch("claires")), ...DARK.map(swatch("sombres")), ...gradients, ...lines, ...lessons]);
