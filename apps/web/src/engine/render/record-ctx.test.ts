import { describe, expect, it } from "vitest";
import { fakeCore } from "../../core/fake-core";
import { Canvas2DRenderer } from "./canvas2d";
import { asCtx, FakeCtx } from "./fake-ctx";
import { OP, RecordingContext2D, RecordingPath } from "./record-ctx";

/** Contexte « réel » des tests : normalise #rrggbb, rgba(), quelques noms ; ignore le reste (comme le canvas). */
class Real {
  private v = "#000000";
  font = "";
  get fillStyle(): string {
    return this.v;
  }
  set fillStyle(c: string) {
    const named: Record<string, string> = { red: "#ff0000", black: "#000000" };
    if (/^#[0-9a-f]{6}$/i.test(c)) this.v = c.toLowerCase();
    else if (/^rgba?\(/.test(c)) this.v = c;
    else if (named[c] !== undefined) this.v = named[c];
  }
  measureText(t: string): TextMetrics {
    return { width: t.length * 10 } as TextMetrics;
  }
}
const rec = () => new RecordingContext2D(new Real() as unknown as CanvasRenderingContext2D);
const ctx = (r: RecordingContext2D) => r as unknown as CanvasRenderingContext2D;
const G1 = [1, 200, 100, 4, 1, 0, 0, 1, 0, 0, 255, 0, 0, 1, 0, 5, 0, 10, 20, 1, 40, 20, 1, 40, 60, 1, 10, 60, 3];
const ID = [1, 0, 0, 1, 0, 0];

describe("contexte enregistreur (C12, DAPF4)", () => {
  it("flux témoin G1 : page 200 × 100, fillRect rouge à l'identité (parité avec pdf.rs, T11)", () => {
    const r = rec();
    r.page(200, 100);
    r.fillStyle = "#ff0000";
    r.fillRect(10, 20, 30, 40);
    expect(Array.from(r.encode().ops)).toEqual(G1);
    expect(r.encode().drawn).toEqual([1]);
  });

  it("fill du chemin courant à la matrice composée (setTransform puis transform), règle evenodd", () => {
    const r = rec();
    r.page(10, 10);
    r.setTransform(2, 0, 0, 2, 0, 0);
    r.transform(1, 0, 0, 1, 5, 6);
    r.beginPath();
    r.moveTo(0, 0);
    r.lineTo(1, 0);
    r.closePath();
    r.fill("evenodd");
    expect(Array.from(r.encode().ops).slice(3)).toEqual([OP.fill, 2, 0, 0, 2, 10, 12, 0, 0, 0, 1, 1, 3, 0, 0, 0, 1, 1, 0, 3]);
  });

  it("stroke : largeur, bouts, jointures, tirets et décalage, alpha global multiplié", () => {
    const r = rec();
    r.page(10, 10);
    r.strokeStyle = "rgba(0, 0, 255, 0.5)";
    r.globalAlpha = 0.5;
    r.lineWidth = 4;
    r.lineCap = "round";
    r.lineJoin = "bevel";
    r.setLineDash([6, 4]);
    r.lineDashOffset = 2;
    r.beginPath();
    r.moveTo(0, 0);
    r.lineTo(5, 5);
    r.stroke();
    expect(Array.from(r.encode().ops).slice(3)).toEqual([OP.stroke, ...ID, 0, 0, 255, 0.25, 4, 1, 2, 2, 6, 4, 2, 2, 0, 0, 0, 1, 5, 5]);
  });

  it("save, clip, restore : SAVE, CLIP au chemin courant, RESTORE ; restore sans save : rien", () => {
    const r = rec();
    r.page(10, 10);
    r.save();
    r.beginPath();
    r.rect(0, 0, 4, 4);
    r.clip();
    r.restore();
    r.restore();
    const ops = Array.from(r.encode().ops).slice(3);
    expect(ops[0]).toBe(OP.save);
    expect(ops.slice(1, 9)).toEqual([OP.clip, ...ID, 0]);
    expect(ops.at(-1)).toBe(OP.restore);
    expect(ops).toHaveLength(1 + 8 + 14 + 1); // SAVE, CLIP + règle, chemin du rectangle (14 nombres), un seul RESTORE
  });

  it("fillText : taille et face relues de la police (italique gras 36 px), haut de ligne, texte indexé ; texte vide : rien", () => {
    const r = rec();
    r.page(10, 10);
    r.font = 'italic bold 36px "Atkinson Hyperlegible", system-ui, sans-serif';
    r.textBaseline = "top";
    r.fillText("", 0, 0);
    r.fillText("Bonjour", 5, 7);
    const l = r.encode();
    expect(Array.from(l.ops).slice(3)).toEqual([OP.text, ...ID, 0, 0, 0, 1, 36, 5, 7, 0, 0, 3]);
    expect(l.texts).toEqual(["Bonjour"]);
    expect(r.measureText("abc").width).toBe(30);
  });

  it("drawImage : images indexées par identité, réutilisées ; alpha global", () => {
    const r = rec();
    r.page(10, 10);
    const a = { asset: "a" };
    r.drawImage(a as unknown as CanvasImageSource, 0, 0, 20, 10);
    r.globalAlpha = 0.5;
    r.drawImage(a as unknown as CanvasImageSource, 1, 2, 3, 4);
    const l = r.encode();
    expect(l.images).toEqual([a]);
    expect(Array.from(l.ops).slice(3)).toEqual([OP.image, ...ID, 0, 0, 0, 20, 10, 1, OP.image, ...ID, 0, 1, 2, 3, 4, 0.5]);
  });

  it("couleur illisible : la précédente reste (comme le canvas) ; rgb() et noms lus", () => {
    const r = rec();
    r.page(10, 10);
    r.fillStyle = "red";
    r.fillStyle = "pas-une-couleur";
    r.fillRect(0, 0, 1, 1);
    r.fillStyle = "rgb(1, 2, 3)";
    r.fillRect(0, 0, 1, 1);
    const ops = Array.from(r.encode().ops);
    expect([ops.slice(10, 14), ops.slice(36, 40)]).toEqual([[255, 0, 0, 1], [1, 2, 3, 1]]); // 2e FILL à l'indice 29
  });

  it("ellipse : quatre cubiques, départ et arrivée sur l'ellipse (RecordingPath sert de Path2D)", () => {
    const p = new RecordingPath();
    p.ellipse(50, 25, 50, 25, 0, 0, Math.PI * 2);
    const e = p.encode();
    expect(e[0]).toBe(5);
    expect(e.slice(1, 4)).toEqual([0, 100, 25]);
    expect(e.filter((v, i) => i > 0 && v === 2 && (i - 4) % 7 === 0)).toHaveLength(4);
    expect(e.slice(-2).map((v) => Math.round(v * 1e6) / 1e6)).toEqual([100, 25]);
  });

  it("paintContent d'un document (trait, forme remplie, rectangle) : enregistré sans méthode manquante (S5)", () => {
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0] ?? "";
    doc.apply({ type: "CommitStroke", page: p, points: new Float32Array([0, 10, 0.5, 50, 10, 0.5, 90, 40, 0.5]), style: { color: "#000000", width: 4 } });
    doc.apply({ type: "AddShape", page: p, shape: "ellipse", x0: 100, y0: 100, x1: 200, y1: 160, style: { color: "#1d4ed8", width: 4 }, fill: "#fef08a" });
    doc.apply({ type: "AddShape", page: p, shape: "rect", x0: 300, y0: 100, x1: 400, y1: 160, style: { color: "#000000", width: 2 }, fill: null });
    const r = rec();
    r.page(842, 473.625);
    new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { makePath: () => new RecordingPath() as unknown as Path2D })
      .paintContent(ctx(r), { id: p, elementIds: doc.elementIds(p) }, { x0: 0, y0: 0, x1: 1920, y1: 1080 }, 842 / 1920);
    const l = r.encode();
    expect(l.drawn).toHaveLength(1);
    expect(l.drawn[0]).toBeGreaterThanOrEqual(3); // ellipse remplie puis tracée, rectangle tracé (et le trait si la fausse liaison rend son contour)
  });

  it("image rognée (C5) : rognage par clip puis drawImage à 5 arguments, jamais 9 (export vectoriel, C12)", () => {
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0] ?? "";
    const asset = { id: "ab".repeat(32), name: "a.png", mime: "image/png", size: 3 };
    const id = doc.apply({ type: "AddImage", page: p, asset, w: 200, h: 150, matrix: [1, 0, 0, 1, 0, 0] }).ids[0] ?? "";
    doc.apply({ type: "SetImageParams", id, params: { crop: [40, 30, 120, 90] }, matrix: [1, 0, 0, 1, 40, 30] });
    const bmp = { width: 200, height: 150 } as unknown as CanvasImageSource;
    const r = rec();
    r.page(842, 473.625);
    new Canvas2DRenderer(asCtx(new FakeCtx()), null, doc, { images: { bitmap: () => bmp } })
      .paintContent(ctx(r), { id: p, elementIds: doc.elementIds(p) }, { x0: 0, y0: 0, x1: 1920, y1: 1080 }, 1);
    const l = r.encode();
    const ops = Array.from(l.ops);
    // ... OP.image, matrice (6), index, x, y, w, h, alpha, puis les restore (image, page)
    expect(ops.slice(-8, -3)).toEqual([-40, -30, 200, 150, 1]);
    expect(ops.slice(-16, -15)).toEqual([OP.image]);
    expect(ops.join(",")).toContain(`,${OP.clip},`);
    expect(ops.join(",")).toContain("1,120,0,1,120,90"); // le clip est le rectangle rogné 120 × 90
  });

  it("méthode Canvas 2D non enregistrée : lève, jamais en silence", () => {
    const r = rec() as unknown as { arc(): void };
    expect(() => r.arc()).toThrow(TypeError);
  });
});
