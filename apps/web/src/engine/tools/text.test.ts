import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
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
  open(s: TextEditSession): void {
    this.opened.push(s);
    this.text = s.initial;
  }
  close(): void {
    this.closed++;
  }
  value(): string {
    return this.text;
  }
}

function setup(measure: Measure = narrow, zoom = 1) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  let shown = page;
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => shown,
    camera: () => ({ zoom, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      return doc.apply(cmd);
    },
  };
  const host = new FakeHost();
  const tool = createTextTool(ctx, host, () => ({ color: "#000000", size: 36 }), measure);
  const click = (x: number, y: number): void => {
    tool.begin(1, [at(x, y)]);
    tool.close(1, "end");
  };
  /** Le moteur montre une autre page (ctx.page() suit). */
  const show = (p: string): void => {
    shown = p;
  };
  return { doc, page, runs, host, tool, click, show };
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
      { type: "SetText", page, id: null, x: 100, y: 200, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 },
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
});
