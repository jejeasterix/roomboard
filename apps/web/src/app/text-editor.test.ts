import { describe, expect, it } from "vitest";
import { fakeCore } from "../core/fake-core";
import { IDENTITY } from "../engine/camera";
import type { InputSample } from "../engine/input/sampler";
import { createTextTool, type TextEditSession, type TextTool } from "../engine/tools/text";
import type { ToolContext } from "../engine/tools/tool";
import { createTextEditor, cssMatrix, TEXT_EDITOR_ID, type TextEditorEvents } from "./text-editor";

/** Faux `<textarea>` (pas de DOM dans la suite). */
class FakeArea {
  id = "";
  hidden = false;
  value = "";
  spellcheck = true;
  scrollHeight = 0;
  focused = 0;
  caret: [number, number] | null = null;
  style: Record<string, string> = {};
  attrs: Record<string, string> = {};
  listeners = new Map<string, (e: unknown) => void>();
  addEventListener(type: string, cb: (e: unknown) => void): void {
    this.listeners.set(type, cb);
  }
  setAttribute(k: string, v: string): void {
    this.attrs[k] = v;
  }
  focus(): void {
    this.focused++;
  }
  setSelectionRange(a: number, b: number): void {
    this.caret = [a, b];
  }
  fire(type: string, e: unknown = {}): void {
    this.listeners.get(type)?.(e);
  }
}

interface FakeKey { key: string; isComposing: boolean; prevented: boolean; preventDefault(): void }
const keydown = (key: string, isComposing: boolean): FakeKey => {
  const e: FakeKey = { key, isComposing, prevented: false, preventDefault() { e.prevented = true; } };
  return e;
};

function mount(events: () => TextEditorEvents | null) {
  const area = new FakeArea();
  const children: unknown[] = [];
  const parent = { ownerDocument: { createElement: () => area }, append: (n: unknown) => children.push(n) };
  const editor = createTextEditor(parent as unknown as HTMLElement, events);
  return { area, children, editor };
}

function recorder() {
  const calls: string[] = [];
  const events: TextEditorEvents = {
    compositionStart: () => calls.push("start"),
    compositionEnd: () => calls.push("end"),
    requestCommit: () => calls.push("commit"),
  };
  return { calls, events };
}

const session: TextEditSession = {
  page: "p", id: null, matrix: [1, 0, 0, 1, 100, 50], boxWidth: 600, color: "#1e40af", size: 48, initial: "Bonjour",
};
const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });

describe("zone de saisie du texte (CL4-2, CL4-3)", () => {
  it("cssMatrix : caméra × matrice de l'élément", () => {
    expect(cssMatrix({ zoom: 2, tx: 10, ty: 20 }, [1, 0, 0, 1, 100, 50])).toBe("matrix(2, 0, 0, 2, 210, 120)");
    expect(cssMatrix(IDENTITY, [2, 0, 0, 3, 5, 6])).toBe("matrix(2, 0, 0, 3, 5, 6)");
  });

  it("montée cachée hors de la scène ; open : visible, placée, police du rendu, valeur initiale, focus", () => {
    const { area, children, editor } = mount(() => null);
    expect(children).toEqual([area]);
    expect(area.id).toBe(TEXT_EDITOR_ID);
    expect(area.hidden).toBe(true);
    editor.open(session, { zoom: 2, tx: 10, ty: 20 });
    expect(area.hidden).toBe(false);
    expect(area.value).toBe("Bonjour");
    expect(area.style).toMatchObject({
      transform: "matrix(2, 0, 0, 2, 210, 120)",
      transformOrigin: "0 0",
      width: "600px",
      font: '48px "Atkinson Hyperlegible", system-ui, sans-serif',
      lineHeight: "1.25",
      color: "#1e40af",
    });
    expect(area.focused).toBe(1);
    expect(area.caret).toEqual([7, 7]);
  });

  it("close : zone cachée et vidée ; value lit la saisie", () => {
    const { area, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    area.value = "Bonjour à tous";
    expect(editor.value()).toBe("Bonjour à tous");
    editor.close();
    expect(area.hidden).toBe(true);
    expect(editor.value()).toBe("");
  });

  it("composition : début et fin transmis à l'outil", () => {
    const { calls, events } = recorder();
    const { area, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    area.fire("compositionstart");
    area.fire("compositionend");
    expect(calls).toEqual(["start", "end"]);
  });

  it("Échap hors composition : validation demandée, touche gardée", () => {
    const { calls, events } = recorder();
    const { area, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    const e = keydown("Escape", false);
    area.fire("keydown", e);
    expect(calls).toEqual(["commit"]);
    expect(e.prevented).toBe(true);
    const enter = keydown("Enter", false);
    area.fire("keydown", enter);
    expect(enter.prevented).toBe(false);
    expect(calls).toEqual(["commit"]);
  });

  it("Échap pendant la composition reste à l'IME : rien d'écrit avant compositionend (outil réel)", () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const ctx: ToolContext = { doc, page: () => page, camera: () => IDENTITY, run: (cmd) => doc.apply(cmd) };
    let tool: TextTool | null = null;
    const { area, editor } = mount(() => tool);
    tool = createTextTool(ctx, editor, () => ({ color: "#000000", size: 36 }), (s) => s.length * 10);
    tool.begin(1, [at(100, 200)]);
    tool.close(1, "end");
    expect(area.hidden).toBe(false);
    area.fire("compositionstart");
    area.value = "こん";
    const esc = keydown("Escape", true);
    area.fire("keydown", esc);
    area.fire("blur");
    expect(esc.prevented).toBe(false);
    expect(doc.elementIds(page)).toEqual([]);
    expect(area.hidden).toBe(false);
    area.value = "こんにちは";
    area.fire("compositionend");
    const ids = doc.elementIds(page);
    expect(ids).toHaveLength(1);
    expect(doc.element(ids[0] ?? "")).toMatchObject({ kind: "text", text: { content: "こんにちは" } });
    expect(area.hidden).toBe(true);
  });

  it("perte du focus : validation demandée ; zone fermée, la perte du focus ne redemande rien", () => {
    const { calls, events } = recorder();
    const { area, editor } = mount(() => events);
    editor.open(session, IDENTITY);
    area.fire("blur");
    expect(calls).toEqual(["commit"]);
    editor.close();
    area.fire("blur");
    expect(calls).toEqual(["commit"]);
  });

  it("aucun outil branché : événements sans effet, sans erreur", () => {
    const { area, editor } = mount(() => null);
    editor.open(session, IDENTITY);
    expect(() => {
      area.fire("compositionstart");
      area.fire("compositionend");
      area.fire("keydown", keydown("Escape", false));
      area.fire("blur");
      area.fire("input");
    }).not.toThrow();
  });
});
