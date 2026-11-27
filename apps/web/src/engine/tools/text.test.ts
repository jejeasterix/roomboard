import { describe, expect, it } from "vitest";
import type { Command, TextSpan } from "../../core/api";
import { editSpans, plainSpans } from "../../core/rich-text";
import type { FormatAction, FormatState } from "../rich-edit";
import { fakeCore } from "../../core/fake-core";
import type { Measure } from "../text-layout";
import type { InputSample } from "../input/sampler";
import { createTextTool, type TextEditorHost, type TextEditSession } from "./text";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
/** 10 unités par caractère à toute taille. */
const narrow: Measure = (s) => s.length * 10;

class FakeHost implements TextEditorHost {
  opened: TextEditSession[] = [];
  closed = 0;
  text = "";
  /** Segments imposés par le test ; null : ceux d'une zone qui hérite (`editSpans` sur le texte saisi). */
  rich: TextSpan[] | null = null;
  formats: FormatAction[] = [];
  state: FormatState | null = null;
  open(s: TextEditSession): void {
    this.opened.push(s);
    this.text = s.initial;
    this.rich = null;
  }
  close(): void {
    this.closed++;
  }
  value(): string {
    return this.text;
  }
  spans(): readonly TextSpan[] {
    const s = this.opened[this.opened.length - 1];
    return this.rich ?? editSpans(s?.spans ?? plainSpans(""), this.text);
  }
  format(a: FormatAction): void {
    this.formats.push(a);
  }
  formatState(): FormatState | null {
    return this.state;
  }
}

function setup(measure: Measure = narrow, zoom = 1, opacity?: number) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  let shown = page;
  const runs: Command[] = [];
  let frames = 0;
  let changes = 0;
  const ctx: ToolContext = {
    requestFrame: () => {
      frames++;
    },
    stateChanged: () => {
      changes++;
    },
    doc,
    page: () => shown,
    camera: () => ({ zoom, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      return doc.apply(cmd);
    },
  };
  const host = new FakeHost();
  const tool = createTextTool(ctx, host, () => ({ color: "#000000", size: 36, ...(opacity === undefined ? {} : { opacity }) }), measure);
  const click = (x: number, y: number): void => {
    tool.begin(1, [at(x, y)]);
    tool.close(1, "end");
  };
  /** Le moteur montre une autre page (ctx.page() suit). */
  const show = (p: string): void => {
    shown = p;
  };
  return { doc, page, runs, host, tool, click, show, frames: () => frames, changes: () => changes };
}

describe("outil Texte (D14, CL4-3 à CL4-6)", () => {
  it("clic dans le vide : boîte neuve à la pointe, hôte ouvert, rien d'écrit", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    expect(tool.editing()).toMatchObject({ id: null, matrix: [1, 0, 0, 1, 100, 200], boxWidth: 600, size: 36, initial: "" });
    expect(host.opened).toHaveLength(1);
    expect(runs).toEqual([]);
    expect(tool.active()).toBe(false);
  });

  it("validation : une SetText avec la hauteur mesurée, hôte fermé", () => {
    const { page, host, tool, runs, click } = setup();
    click(100, 200);
    host.text = "Bonjour";
    tool.requestCommit();
    expect(runs).toEqual([
      { type: "SetText", page, id: null, x: 100, y: 200, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45, spans: [{ text: "Bonjour", attrs: {} }] },
    ]);
    expect(host.closed).toBe(1);
    expect(tool.editing()).toBeNull();
  });

  it("hauteur sur plusieurs lignes : même coupure que le rendu", () => {
    const { host, tool, runs, click } = setup((s) => s.length * 100);
    click(0, 0);
    host.text = "aaaa bbbb";
    tool.requestCommit();
    expect(runs[0]).toMatchObject({ boxHeight: 90 });
  });

  it("une boîte neuve validée vide n'écrit rien", () => {
    const { tool, runs, click, host } = setup();
    click(100, 200);
    tool.requestCommit();
    expect(runs).toEqual([]);
    expect(host.closed).toBe(1);
  });

  it("clic sur un texte : rouvert avec son contenu, masqué de la scène ; vidé : retiré", () => {
    const { doc, page, host, tool, click } = setup();
    const id = doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Bonjour", color: "#1e40af", size: 48, boxWidth: 600, boxHeight: 60 }).ids[0] ?? "";
    click(150, 210);
    expect(tool.editing()).toMatchObject({ id, initial: "Bonjour", size: 48, color: "#1e40af", matrix: [1, 0, 0, 1, 100, 200] });
    expect([...tool.live().hidden]).toEqual([id]);
    host.text = "";
    tool.requestCommit();
    expect(doc.elementIds(page)).toEqual([]);
    expect(tool.live().hidden.size).toBe(0);
  });

  it("contenu inchangé : aucune SetText, même si la mesure a changé", () => {
    const { doc, page, host, tool, runs, click } = setup((s) => s.length * 1000);
    doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Bonjour", color: "#000000", size: 48, boxWidth: 600, boxHeight: 60 });
    click(150, 210);
    host.text = "Bonjour";
    tool.requestCommit();
    expect(runs).toHaveLength(0);
    expect(host.closed).toBe(1);
    expect(tool.editing()).toBeNull();
  });

  it("contenu inchangé sur un texte existant : une image est demandée (l'id masqué reparaît)", () => {
    const { doc, page, host, tool, runs, click, frames } = setup();
    doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Bonjour", color: "#000000", size: 48, boxWidth: 600, boxHeight: 60 });
    click(150, 210);
    expect(tool.live().hidden.size).toBe(1);
    host.text = "Bonjour";
    tool.requestCommit();
    expect(runs).toHaveLength(0);
    expect(tool.live().hidden.size).toBe(0);
    expect(frames()).toBe(1);
  });

  it("zoom 2 : position monde de la boîte neuve et tolérance de prise en unités monde", () => {
    const { doc, page, host, tool, click } = setup(narrow, 2);
    click(200, 400);
    expect(tool.editing()).toMatchObject({ id: null, matrix: [1, 0, 0, 1, 100, 200] });
    tool.requestCommit();
    const id = doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Bonjour", color: "#000000", size: 48, boxWidth: 600, boxHeight: 60 }).ids[0] ?? "";
    click(300, 420); // monde (150, 210) : dedans
    expect(tool.editing()).toMatchObject({ id });
    host.text = "Bonjour";
    tool.requestCommit();
    click(300, 528); // monde (150, 264) : 4 unités sous la boîte, tolérance 3 unités (6 px / 2)
    expect(tool.editing()).toMatchObject({ id: null });
  });

  it("une validation pendant la composition attend compositionend", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    tool.compositionStart();
    host.text = "こん";
    tool.requestCommit();
    tool.leave?.("tool");
    expect(runs).toEqual([]);
    expect(tool.editing()).not.toBeNull();
    expect(tool.composing()).toBe(true);
    host.text = "こんにちは";
    tool.compositionEnd();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ type: "SetText", content: "こんにちは" });
    expect(tool.editing()).toBeNull();
  });

  it("clic ailleurs pendant la composition : attend compositionend, n'ouvre rien", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    tool.compositionStart();
    host.text = "にほ";
    click(800, 800);
    expect(runs).toEqual([]);
    expect(host.opened).toHaveLength(1);
    expect(tool.editing()).toMatchObject({ matrix: [1, 0, 0, 1, 100, 200] });
    host.text = "日本";
    tool.compositionEnd();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ type: "SetText", content: "日本", x: 100, y: 200 });
    expect(host.opened).toHaveLength(1);
    expect(tool.editing()).toBeNull();
  });

  it("page quittée pendant la composition : écrite à compositionend sur la page d'origine", () => {
    const { doc, page, host, tool, runs, click, show } = setup();
    doc.apply({ type: "AddPage", after: page });
    const other = doc.pageIds().find((p) => p !== page) ?? "";
    click(100, 200);
    tool.compositionStart();
    host.text = "こん";
    show(other);
    tool.leave?.("page");
    expect(runs).toEqual([]);
    host.text = "こんにちは";
    tool.compositionEnd();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ type: "SetText", page, content: "こんにちは" });
    expect(doc.elementIds(page)).toHaveLength(1);
    expect(doc.elementIds(other)).toEqual([]);
  });

  it("composition finie sans demande : la boîte reste ouverte", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    tool.compositionStart();
    host.text = "日本";
    tool.compositionEnd();
    expect(runs).toEqual([]);
    expect(tool.editing()).not.toBeNull();
  });

  it("clic ailleurs pendant l'édition : valide seulement, n'ouvre rien", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    host.text = "Bonjour";
    click(800, 800);
    expect(runs).toHaveLength(1);
    expect(host.opened).toHaveLength(1);
    expect(tool.editing()).toBeNull();
  });

  it("leave : valide la boîte ouverte", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    host.text = "Salut";
    tool.leave?.("page");
    expect(runs[0]).toMatchObject({ content: "Salut" });
  });

  it("texte riche rouvert : la hauteur suit les segments prévus après l'édition (S5)", () => {
    const { doc, page, host, tool, runs, click } = setup();
    const id = doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Le chat noir", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    doc.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } });
    click(150, 210);
    expect(tool.editing()?.spans).toEqual([
      { text: "Le ", attrs: {} },
      { text: "chat", attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } },
      { text: " noir", attrs: {} },
    ]);
    host.text = "Le gros chat noir";
    tool.requestCommit();
    expect(runs.at(-1)).toMatchObject({ type: "SetText", id, content: "Le gros chat noir", boxHeight: 60 });
  });

  // Discrimine (T12) : une hauteur calculée sur les segments d'avant l'édition (`s.spans` sans `editSpans`) garderait
  // la ligne à 48 de « chat » (60) ; « chat » retiré, il ne reste qu'une ligne à 36 (45).
  it("texte riche rouvert : le segment agrandi retiré, la hauteur revient à la taille de l'élément (S5)", () => {
    const { doc, page, host, tool, runs, click } = setup();
    const id = doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Le chat noir", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    doc.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } });
    click(150, 210);
    host.text = "Le noir";
    tool.requestCommit();
    expect(runs.at(-1)).toMatchObject({ type: "SetText", id, content: "Le noir", boxHeight: 45 });
  });
});

describe("outil Texte — C7b (segments, barre)", () => {
  const ITALIC = { italic: true } as const;
  const PLAIN_STATE: FormatState = { bold: false, italic: false, underline: false, size: 36, color: "default" };

  it("SetText porte les segments de la zone ; hauteur mesurée sur eux (R6, R18)", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    host.text = "Le chat";
    host.rich = [{ text: "Le ", attrs: {} }, { text: "chat", attrs: { size: 48 } }];
    tool.requestCommit();
    expect(runs[0]).toMatchObject({ type: "SetText", content: "Le chat", spans: host.rich, boxHeight: 60 });
  });

  it("S6 : même texte, segments changés : une SetText ; le texte est en italique, annuler le rend sans attribut", () => {
    const { doc, page, host, tool, runs, click } = setup();
    const id = doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Le chat noir", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    click(150, 210);
    host.rich = [{ text: "Le chat ", attrs: {} }, { text: "noir", attrs: ITALIC }];
    tool.requestCommit();
    expect(runs.at(-1)).toMatchObject({ type: "SetText", id, content: "Le chat noir", spans: host.rich });
    const view = (): unknown => {
      const e = doc.element(id);
      return e?.kind === "text" ? e.text.spans : null;
    };
    expect(view()).toEqual(host.rich);
    doc.undo();
    expect(view()).toEqual([{ text: "Le chat noir", attrs: {} }]);
  });

  it("texte et segments inchangés : aucune commande (R6)", () => {
    const { doc, page, tool, runs, click } = setup();
    doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Le chat", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    click(150, 210);
    tool.requestCommit();
    expect(runs).toEqual([]);
  });

  it("format : relayé à la zone pendant la saisie ; fermée ou pendant une composition : rien (R5, DAR4)", () => {
    const { host, tool, click } = setup();
    tool.format({ type: "bold" });
    expect(host.formats).toEqual([]);
    click(100, 200);
    tool.format({ type: "bold" });
    tool.compositionStart();
    tool.format({ type: "italic" });
    tool.compositionEnd();
    tool.format({ type: "size", size: 72 });
    expect(host.formats).toEqual([{ type: "bold" }, { type: "size", size: 72 }]);
  });

  it("formatState : null hors saisie, celui de la zone sinon ; ouverture, validation et formatChanged republient l'état (PC12)", () => {
    const { host, tool, click, changes } = setup();
    host.state = PLAIN_STATE;
    expect(tool.formatState()).toBeNull();
    const c0 = changes();
    click(100, 200);
    expect(tool.formatState()).toEqual(PLAIN_STATE);
    expect(changes()).toBe(c0 + 1);
    tool.formatChanged();
    expect(changes()).toBe(c0 + 2);
    tool.requestCommit();
    expect(changes()).toBeGreaterThanOrEqual(c0 + 3);
    expect(tool.formatState()).toBeNull();
  });
});

describe("outil Texte : transparence (OG11 T9b)", () => {
  it("boîte neuve : SetText porte look.opacity du style courant", () => {
    const { host, tool, runs, click } = setup(narrow, 1, 40);
    click(100, 200);
    host.text = "Bonjour";
    tool.requestCommit();
    expect(runs[0]).toMatchObject({ type: "SetText", look: { opacity: 40 } });
  });
});

describe("outil Texte : alignement (T28)", () => {
  const build = (st: { textAlign?: "center" | "right" | "left" }) => {
    const { ctx, runs } = ((): { ctx: ToolContext; runs: Command[] } => {
      const doc = fakeCore.blank();
      const page = doc.pageIds()[0] ?? "";
      const runs: Command[] = [];
      return { runs, ctx: { doc, page: () => page, camera: () => ({ zoom: 1, tx: 0, ty: 0 }), run: (c) => { runs.push(c); return doc.apply(c); } } };
    })();
    const host = new FakeHost();
    const tool = createTextTool(ctx, host, () => ({ color: "#000000", size: 36, ...st }), narrow);
    return { host, tool, runs };
  };
  it("texte neuf : alignement", () => {
    const b = build({ textAlign: "center" });
    b.tool.begin(1, [at(100, 200)]);
    b.tool.close(1, "end");
    b.host.text = "Bonjour";
    b.tool.requestCommit();
    expect(b.runs[0]).toMatchObject({ type: "SetText", look: { textAlign: "center" } });
  });
  it("texte neuf : le gauche n'écrit rien", () => {
    const b = build({ textAlign: "left" });
    b.tool.begin(1, [at(100, 200)]);
    b.tool.close(1, "end");
    b.host.text = "Bonjour";
    b.tool.requestCommit();
    expect(b.runs[0]).not.toHaveProperty("look");
  });
  it("saisie en cours : l'alignement choisi dans le panneau s'applique", () => {
    let align: "left" | "right" = "left";
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const runs: Command[] = [];
    const ctx: ToolContext = { doc, page: () => page, camera: () => ({ zoom: 1, tx: 0, ty: 0 }), run: (c) => { runs.push(c); return doc.apply(c); } };
    const host = new FakeHost();
    const tool = createTextTool(ctx, host, () => ({ color: "#000000", size: 36, textAlign: align }), narrow);
    tool.begin(1, [at(100, 200)]);
    tool.close(1, "end");
    host.text = "Bonjour";
    align = "right";
    tool.requestCommit();
    expect(runs[0]).toMatchObject({ look: { textAlign: "right" } });
  });
});

describe("outil Texte : police et taille du style courant (T31)", () => {
  it("texte neuf : la taille du style est celle de la boîte et la police est portée par chaque segment", () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const runs: Command[] = [];
    const ctx: ToolContext = { doc, page: () => page, camera: () => ({ zoom: 1, tx: 0, ty: 0 }), run: (c) => { runs.push(c); return doc.apply(c); } };
    const host = new FakeHost();
    const tool = createTextTool(ctx, host, () => ({ color: "#000000", size: 48, font: "Georgia" }), narrow);
    tool.begin(1, [at(100, 200)]);
    tool.close(1, "end");
    expect(tool.editing()).toMatchObject({ size: 48 });
    host.text = "Bonjour";
    tool.requestCommit();
    expect(runs[0]).toMatchObject({ type: "SetText", size: 48, spans: [{ text: "Bonjour", attrs: { font: "Georgia" } }] });
  });
  it("police du style absente : segments inchangés ; segment qui a déjà sa police : gardée", () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const runs: Command[] = [];
    const ctx: ToolContext = { doc, page: () => page, camera: () => ({ zoom: 1, tx: 0, ty: 0 }), run: (c) => { runs.push(c); return doc.apply(c); } };
    const host = new FakeHost();
    const tool = createTextTool(ctx, host, () => ({ color: "#000000", size: 36, font: "Georgia" }), narrow);
    tool.begin(1, [at(0, 0)]);
    tool.close(1, "end");
    host.text = "ab";
    host.rich = [{ text: "ab", attrs: { font: "Courier New" } }];
    tool.requestCommit();
    expect(runs[0]).toMatchObject({ spans: [{ text: "ab", attrs: { font: "Courier New" } }] });
  });
});
