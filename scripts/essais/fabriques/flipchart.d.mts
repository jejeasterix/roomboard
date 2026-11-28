// Types de la fabrique de `.flipchart` synthétiques (N19), `flipchart.mjs`.

/** Compression zlib injectée : `zlibSync` de fflate côté vitest, `zlib.deflateSync` côté essai. */
export type Deflate = (bytes: Uint8Array) => Uint8Array;

/** Point d'un trait ou d'une ligne, en pixels de page. */
export type FabPoint = [number, number];

/** Couleur `0xRRGGBB`, opaque. */
export type FabColor = number;

export interface FabStroke {
  points: FabPoint[];
  color?: FabColor;
  width?: number;
}

export interface FabLine {
  points: FabPoint[];
  color?: FabColor;
  width?: number;
}

export interface FabRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Remplissage plein ; absent : contour seul. */
  fill?: FabColor;
}

export interface FabRun {
  text: string;
  bold?: boolean;
  size?: number;
  color?: FabColor;
}

export interface FabText {
  x: number;
  y: number;
  runs: FabRun[];
}

export interface FabImage {
  /** Nom de l'entrée du conteneur racine (`photo.png`, `scan.tif`…). */
  name: string;
  bytes: Uint8Array;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** OG70 : niveau de grille ActivInspire ; défauts d'ActCraft (plein, normal, noir, pas 32, deux familles, aimanté). */
export interface FabGridLevel {
  /** Tracé : 1 points, 2 croix, 3 plein, 4 pointillé, 5 tirets, 6 gros points. */
  line?: number;
  /** Disposition : 1 normale, 2 à 45°, 3 angle libre. */
  layout?: number;
  color?: FabColor;
  shown?: boolean;
  start?: FabPoint;
  /** Pas X et Y, en pixels de page ; Y absent : celui de X. */
  step?: [number, number?];
  alongX?: boolean;
  alongY?: boolean;
  snap?: boolean;
}

/** OG70 : grille de page ; `shown` est la propriété « grille affichée » de la page. */
export interface FabGrid {
  shown?: boolean;
  snap?: boolean;
  above?: boolean;
  /** Échelle par défaut (pas × échelle). */
  scale?: number;
  levels?: FabGridLevel[];
}

export interface FabPage {
  grid?: FabGrid;
  strokes?: FabStroke[];
  lines?: FabLine[];
  rects?: FabRect[];
  texts?: FabText[];
  images?: FabImage[];
  /** Nombre d'actions sur objet (genre 28), chacune visant le premier objet de la page s'il existe. */
  actions?: number;
}

/** Cas hostiles de S5. */
export interface FabOptions {
  /**
   * Taille mensongère : l'entrée `entry` (nom à n'importe quel niveau, par exemple `1003.fpg` ou `1003.in`)
   * annonce `announced` octets, dans sa taille annoncée u64 ET dans l'en-tête qCompress, quelle que soit la
   * taille réelle (bombe si plus petite, taille plus grande que la réalité ou au-delà du budget sinon).
   */
  lie?: { entry: string; announced: number };
  /** Un `.fpg` dans le `.fpg` de la première page, au nœud de la page qui suivrait la dernière (`3003.fpg` pour deux pages). */
  nestFpg?: boolean;
  /** Entrées vides ajoutées au conteneur racine (`extra-<k>.bin`, non compressées). */
  extraEntries?: number;
  /** Le nom de la première entrée du conteneur racine annonce une longueur impaire (11 octets). */
  oddUtf16?: boolean;
}

export interface BambooEntry {
  name: string;
  data: Uint8Array;
  /** Vrai : octets stockés = `qCompress(data)`. */
  compressed: boolean;
  /** Taille annoncée u64 écrite à la place de `data.length` (l'en-tête qCompress garde la vraie taille). */
  announced?: number;
}

/**
 * `.flipchart` de `pages.length` pages. Page `i` (à partir de 0) : nœud `(i + 1) * 1000 + 3`, conteneur
 * `<nœud>.fpg` ; racine : `101.in`, `100.io`, les `.fpg`, puis les ressources `.ir` et les images.
 */
export function makeFlipchart(pages: FabPage[], deflate: Deflate, opts?: FabOptions): Uint8Array;

/** Conteneur « Bamboo » version 7 (signature, version, format `1.0`, 8 octets réservés, entrées). */
export function bambooContainer(entries: BambooEntry[], deflate: Deflate): Uint8Array;

/** qCompress de Qt : u32 gros-boutiste = `announced` (par défaut la taille de `data`), puis le flux zlib. */
export function qCompress(data: Uint8Array, deflate: Deflate, announced?: number): Uint8Array;
