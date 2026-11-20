// Faux contexte 2D des tests (sorti de `canvas2d.test.ts`, comme `fake-gl.ts`) : journal des appels, `measureText` à
// 10 unités par caractère ; `texts` note chaque fillText avec la police, la couleur et la ligne de base du moment.
// Par défaut `fillStyle` garde toute chaîne ; `browserColors` imite le navigateur, qui ignore une couleur qu'il ne sait
// pas lire (la valeur d'avant reste). Reconnues : `#rgb`, `#rrggbb`, `#rrggbbaa` et `NAMED` (pas `rgba()`).
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NAMED = new Set(["black", "white", "red", "green", "blue", "yellow", "orange", "purple", "gray", "grey", "transparent"]);
const readable = (c: string): boolean => HEX.test(c) || NAMED.has(c.toLowerCase());

export interface FakeCtxOptions {
  readonly browserColors?: boolean;
}
export interface DrawnText {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly font: string;
  readonly fill: string;
  readonly baseline: string;
}

export class FakeCtx {
  readonly canvas = { width: 0, height: 0 };
  readonly log: string[] = [];
  private readonly browserColors: boolean;
  private fillValue = "";
  constructor(opts: FakeCtxOptions = {}) {
    this.browserColors = opts.browserColors === true;
  }
  get fillStyle(): string {
    return this.fillValue;
  }
  set fillStyle(c: string) {
    if (!this.browserColors || readable(c)) this.fillValue = c;
  }
  strokeStyle = "";
  lineWidth = 1;
  lineCap = "butt";
  lineJoin = "miter";
  globalAlpha = 1;
  lineDashOffset = 0;
  readonly path: [string, number, number][] = [];
  save(): void { this.log.push("save"); }
  restore(): void { this.log.push("restore"); }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.log.push(`setTransform ${[a, b, c, d, e, f].map((v) => +v.toFixed(4)).join(",")}`);
  }
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.log.push(`transform ${[a, b, c, d, e, f].join(",")}`);
  }
  clearRect(): void { this.log.push("clearRect"); }
  readonly rects: number[][] = [];
  fillRect(x = 0, y = 0, w = 0, h = 0): void { this.rects.push([x, y, w, h]); this.log.push(`fillRect ${this.fillStyle}`); }
  beginPath(): void { this.log.push("beginPath"); }
  moveTo(x = 0, y = 0): void { this.log.push("moveTo"); this.path.push(["M", x, y]); }
  lineTo(x = 0, y = 0): void { this.log.push("lineTo"); this.path.push(["L", x, y]); }
  closePath(): void { this.log.push("closePath"); }
  rect(): void { this.log.push("rect"); }
  clip(): void { this.log.push("clip"); }
  fill(): void { this.log.push(`fill ${this.fillStyle}`); }
  stroke(): void { this.log.push(`stroke ${this.strokeStyle} ${this.lineWidth}`); }
  font = "";
  textBaseline = "alphabetic";
  ellipse(): void { this.log.push("ellipse"); }
  readonly texts: DrawnText[] = [];
  fillText(text: string, x: number, y: number): void {
    this.log.push(`fillText ${text} ${x},${y}`);
    this.texts.push({ text, x, y, font: this.font, fill: this.fillStyle, baseline: this.textBaseline });
  }
  measures = 0;
  measureText(text: string): { width: number } { this.measures++; return { width: text.length * 10 }; }
  setLineDash(d: number[]): void { this.log.push(`setLineDash ${d.join(",")}`); }
  readonly images: { img: unknown; x: number; y: number; w: number; h: number }[] = [];
  drawImage(img: unknown, x = 0, y = 0, w = 0, h = 0): void {
    this.log.push(`drawImage ${x},${y},${w},${h}`);
    this.images.push({ img, x, y, w, h });
  }
}

export const asCtx = (f: FakeCtx): CanvasRenderingContext2D => f as unknown as CanvasRenderingContext2D;
