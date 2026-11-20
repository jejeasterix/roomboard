// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { toEnvelope } from "./clipboard";
import { handlePaste, isEditable, pastedFiles, pastedItems } from "./paste";

const files = (...f: File[]) => ({ files: f });
const png = new File([new Uint8Array([1])], "a.png", { type: "image/png" });
const txt = new File(["x"], "a.txt", { type: "text/plain" });

describe("collage (R19)", () => {
  it("fichiers image/* du presse-papiers, les autres ignorés", () => {
    const r = pastedFiles({ target: document.body, clipboardData: files(png, txt) });
    expect(r.map((f) => [f.name, f.mime, f.size])).toEqual([["a.png", "image/png", 1]]);
  });

  it("cible éditable (zone de texte, champ, contenteditable) : rien", () => {
    const area = document.createElement("textarea");
    const input = document.createElement("input");
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    for (const t of [area, input, div]) expect(pastedFiles({ target: t, clipboardData: files(png) }), t.tagName).toEqual([]);
  });

  it("bouton et case à cocher ne sont pas éditables ; aucun presse-papiers : rien", () => {
    const b = document.createElement("input");
    b.type = "checkbox";
    expect(isEditable(b)).toBe(false);
    expect(isEditable(document.createElement("button"))).toBe(false);
    expect(pastedFiles({ target: document.body, clipboardData: null })).toEqual([]);
  });
});

const withText = (text: string, ...f: File[]) => ({ files: f, getData: (t: string) => (t === "text/plain" ? text : "") });
const sinkOf = () => ({
  pasteItems: vi.fn(async (_i: Uint8Array | "newer" | "too-big") => true),
  importFiles: vi.fn(async () => undefined),
});

describe("collage des objets (Z9)", () => {
  it("une enveloppe passe avant les images jointes", async () => {
    const sink = sinkOf();
    await handlePaste({ target: document.body, clipboardData: withText(toEnvelope(new Uint8Array([1, 2])), png) }, sink);
    expect(sink.pasteItems).toHaveBeenCalledWith(new Uint8Array([1, 2]));
    expect(sink.importFiles).not.toHaveBeenCalled();
  });
  it("enveloppe plus récente : pasteItems(\"newer\")", async () => {
    const sink = sinkOf();
    await handlePaste({ target: document.body, clipboardData: withText('{"format":"roomboard-items/9"}') }, sink);
    expect(sink.pasteItems).toHaveBeenCalledWith("newer");
  });
  it("texte ordinaire collé : ni objet ni image ; collage normal (null)", () => {
    const sink = sinkOf();
    expect(handlePaste({ target: document.body, clipboardData: withText("bonjour") }, sink)).toBeNull();
    expect(sink.pasteItems).not.toHaveBeenCalled();
  });
  it("cible éditable : null, rien de pris ; pastedItems null", () => {
    const area = document.createElement("textarea");
    const sink = sinkOf();
    const e = { target: area, clipboardData: withText(toEnvelope(new Uint8Array([1])), png) };
    expect(pastedItems(e)).toBeNull();
    expect(handlePaste(e, sink)).toBeNull();
  });
  it("images seules : importFiles(files, null)", async () => {
    const sink = sinkOf();
    await handlePaste({ target: document.body, clipboardData: files(png) }, sink);
    expect(sink.importFiles).toHaveBeenCalledTimes(1);
  });
});
