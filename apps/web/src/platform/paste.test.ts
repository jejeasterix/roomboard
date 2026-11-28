// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { toEnvelope } from "./clipboard";
import { tsvGrid } from "./html-table";
import type { DroppedFile } from "./files";
import { handlePaste, isEditable, pastedFiles, pastedItems, pastedTableHtml, pastedTabText } from "./paste";

vi.mock("./html-table", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./html-table")>();
  return { ...mod, tsvGrid: vi.fn(mod.tsvGrid) };
});

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
  pasteTable: vi.fn(async (_html: string) => true),
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

describe("collage : objets RoomBoard avant tableau HTML (fusion C3 + C10b)", () => {
  it("enveloppe en text/plain + <table> en text/html + image : les objets seuls", async () => {
    const sink = sinkOf();
    const both = {
      files: [png],
      getData: (t: string) =>
        t === "text/plain" ? toEnvelope(new Uint8Array([7])) : t === "text/html" ? "<table><tr><td>a</td></tr></table>" : "",
    };
    await handlePaste({ target: document.body, clipboardData: both }, sink);
    expect(sink.pasteItems).toHaveBeenCalledWith(new Uint8Array([7]));
    expect(sink.pasteTable).not.toHaveBeenCalled();
    expect(sink.importFiles).not.toHaveBeenCalled();
  });
  it("texte ordinaire (cellules d'Excel) + <table> : le tableau, pas d'objet", async () => {
    const sink = sinkOf();
    const excel = {
      files: [],
      getData: (t: string) => (t === "text/plain" ? "a\tb" : t === "text/html" ? "<table><tr><td>a</td><td>b</td></tr></table>" : ""),
    };
    await handlePaste({ target: document.body, clipboardData: excel }, sink);
    expect(sink.pasteItems).not.toHaveBeenCalled();
    expect(sink.pasteTable).toHaveBeenCalledTimes(1);
  });
});

describe("collage d'un tableau HTML (F19)", () => {
  const data = (html: string, f: File[] = []) => ({ files: f, getData: (t: string) => (t === "text/html" ? html : "") });
  it("HTML avec <table> : rendu tel quel ; sans tableau, sans HTML ou sans presse-papiers : null", () => {
    const html = "<TABLE><tr><td>a</td></tr></TABLE>";
    expect(pastedTableHtml({ target: document.body, clipboardData: data(html) })).toBe(html);
    expect(pastedTableHtml({ target: document.body, clipboardData: data("<p>a</p><tablex>") })).toBeNull();
    expect(pastedTableHtml({ target: document.body, clipboardData: { files: [] } })).toBeNull();
    expect(pastedTableHtml({ target: document.body, clipboardData: null })).toBeNull();
  });
  it("cible éditable : null (collage normal dans la zone de texte)", () => {
    const area = document.createElement("textarea");
    expect(pastedTableHtml({ target: area, clipboardData: data("<table><tr><td>a</td></tr></table>") })).toBeNull();
  });
  it("effet de bord : le tableau passe avant l'image jointe ; une image seule se colle comme avant", () => {
    const png = new File([new Uint8Array([1])], "x.png", { type: "image/png" });
    const both = { target: document.body, clipboardData: data("<table><tr><td>a</td></tr></table>", [png]) };
    expect(pastedTableHtml(both)).not.toBeNull();
    expect(pastedFiles(both)).toHaveLength(1);
    const only = { target: document.body, clipboardData: data("", [png]) };
    expect(pastedTableHtml(only)).toBeNull();
    expect(pastedFiles(only)).toHaveLength(1);
  });
});

describe("écouteur de collage : tableau avant images (F19, PC9, constat T13)", () => {
  const TABLE = "<table><tr><td>a</td></tr></table>";
  const event = (html: string | null, ...f: File[]) => ({
    target: document.body,
    clipboardData: { files: f, getData: (t: string) => (t === "text/html" && html !== null ? html : "") },
  });
  const sink = (tableDone: boolean) => {
    const calls: string[] = [];
    return {
      calls,
      pasteItems: async () => {
        calls.push("objets");
        return true;
      },
      pasteTable: async (html: string) => {
        calls.push(`tableau:${html}`);
        return tableDone;
      },
      importFiles: async (files: readonly DroppedFile[]) => {
        calls.push(`images:${files.map((x) => x.name).join(",")}`);
      },
    };
  };

  it("tableau + image : le tableau seul (F19, HB-9)", async () => {
    const s = sink(true);
    await handlePaste(event(TABLE, png), s);
    expect(s.calls).toEqual([`tableau:${TABLE}`]);
  });

  it("HTML illisible (pasteTable rend false) + image : repli vers l'image (PC9)", async () => {
    const s = sink(false);
    await handlePaste(event(TABLE, png), s);
    expect(s.calls).toEqual([`tableau:${TABLE}`, "images:a.png"]);
  });

  it("image seule : l'image ; ni tableau ni image : collage non pris (null)", async () => {
    const s = sink(true);
    await handlePaste(event(null, png), s);
    expect(s.calls).toEqual(["images:a.png"]);
    expect(handlePaste(event(null, txt), s)).toBeNull();
    expect(handlePaste(event("<p>x</p>"), s)).toBeNull();
    expect(s.calls).toHaveLength(1);
  });
});

describe("collage d'un texte tabulé (point 15)", () => {
  const tsv = "a\tb\nc\td";
  const mk = (text: string, html = "", f: File[] = []) => ({
    target: document.body,
    clipboardData: { files: f, getData: (t: string) => (t === "text/plain" ? text : t === "text/html" ? html : "") },
  });
  const sink = () => ({ ...sinkOf(), pasteText: vi.fn(async (_t: string) => true) });
  it("texte à tabulations sans HTML : pasteText", async () => {
    const s = sink();
    await handlePaste(mk(tsv), s);
    expect(s.pasteText).toHaveBeenCalledWith(tsv);
    expect(s.pasteTable).not.toHaveBeenCalled();
  });
  it("HTML prioritaire : pasteTable, pas pasteText", async () => {
    const s = sink();
    await handlePaste(mk(tsv, "<table><tr><td>a</td></tr></table>"), s);
    expect(s.pasteTable).toHaveBeenCalledTimes(1);
    expect(s.pasteText).not.toHaveBeenCalled();
  });
  it("texte sans tabulation : null, comportement inchangé", () => {
    const s = sink();
    expect(handlePaste(mk("bonjour\nmonde"), s)).toBeNull();
    expect(s.pasteText).not.toHaveBeenCalled();
  });
  it("pastedTabText ne fait qu'un test bon marché : tsvGrid n'est jamais appelé au collage", () => {
    const spy = vi.mocked(tsvGrid);
    spy.mockClear();
    expect(pastedTabText(mk(tsv))).toBe(tsv);
    expect(spy).not.toHaveBeenCalled();
  });
  it("cible éditable : null", () => {
    const area = document.createElement("textarea");
    expect(handlePaste({ ...mk(tsv), target: area }, sink())).toBeNull();
  });
});
