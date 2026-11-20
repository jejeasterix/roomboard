// Faux contexte 2D des tests (sorti de `canvas2d.test.ts`, comme `fake-gl.ts`) : journal des appels, `measureText` à
// 10 unités par caractère ; `texts` note chaque fillText avec la police, la couleur et la ligne de base du moment.
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
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 1;
  lineCap = "butt";
  lineJoin = "miter";
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
  moveTo(): void { this.log.push("moveTo"); }
  lineTo(): void { this.log.push("lineTo"); }
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
}

export const asCtx = (f: FakeCtx): CanvasRenderingContext2D => f as unknown as CanvasRenderingContext2D;
