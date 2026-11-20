// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createClipboard, fromBase64, fromEnvelope, handleCopy, ITEMS_FORMAT, MAX_ITEMS_BYTES, toBase64, toEnvelope, browserSystemClipboard, type ClipboardItemCtor } from "./clipboard";

const bytes = (...b: number[]): Uint8Array => new Uint8Array(b);

describe("enveloppe (U9, Z8)", () => {
  it("toEnvelope : JSON exact, format puis rbitem", () => {
    expect(toEnvelope(bytes(1, 2, 3))).toBe('{"format":"roomboard-items/1","rbitem":"AQID"}');
    expect(ITEMS_FORMAT).toBe("roomboard-items/1");
  });
  it("aller-retour, y compris plus de 32 768 octets (base64 par morceaux)", () => {
    const big = new Uint8Array(100_000).map((_, i) => i % 251);
    expect(fromEnvelope(toEnvelope(big))).toEqual(big);
    expect(fromBase64(toBase64(bytes()))).toEqual(bytes());
  });
  it("texte ordinaire, JSON d'un autre format, base64 invalide : null", () => {
    for (const t of ["bonjour", "", "{}", '{"format":"autre/1","rbitem":"AQID"}', '{"format":"roomboard-items/1","rbitem":"@@@"}', '{"format":"roomboard-items/1"}', "[1,2]"]) {
      expect(fromEnvelope(t), t).toBeNull();
    }
  });
  it("format plus récent : newer, avant de lire rbitem", () => {
    expect(fromEnvelope('{"format":"roomboard-items/2","nouveau":true}')).toBe("newer");
  });
  it("format illisible (roomboard-items/x, /0) : null", () => {
    expect(fromEnvelope('{"format":"roomboard-items/x","rbitem":"AQID"}')).toBeNull();
    expect(fromEnvelope('{"format":"roomboard-items/0","rbitem":"AQID"}')).toBeNull();
  });
  it("plus de 100 Mo décodés : too-big, sans décoder (borne passée en paramètre pour le test)", () => {
    expect(MAX_ITEMS_BYTES).toBe(100 * 1024 * 1024);
    expect(fromEnvelope('{"format":"roomboard-items/1","rbitem":"AAAAAAAA"}', 5)).toBe("too-big");
    expect(fromEnvelope('{"format":"roomboard-items/1","rbitem":"AAAAAAAA"}', 6)).toEqual(new Uint8Array(6));
  });
  it("espaces en tête tolérés", () => {
    expect(fromEnvelope(`  ${toEnvelope(bytes(9))}`)).toEqual(bytes(9));
  });
});

describe("presse-papiers (Z8)", () => {
  it("put : système écrit avec l'enveloppe, interne retenu, onChange appelé", async () => {
    const written: string[] = [];
    const cb = createClipboard({ write: async (t) => void written.push(await t) });
    const seen = vi.fn();
    cb.onChange(seen);
    expect(await cb.put(Promise.resolve(bytes(1)))).toBe("system");
    expect(written).toEqual([toEnvelope(bytes(1))]);
    expect(cb.last()).toEqual(bytes(1));
    expect(seen).toHaveBeenCalledTimes(1);
  });
  it("put : l'écriture système part avant que les octets soient prêts (geste)", () => {
    const write = vi.fn(async (_t: Promise<string>) => undefined);
    const cb = createClipboard({ write });
    void cb.put(new Promise<Uint8Array>(() => undefined));
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("échec du système ou aucun système : interne seul", async () => {
    const failing = createClipboard({ write: async () => { throw new Error("refus"); } });
    expect(await failing.put(Promise.resolve(bytes(2)))).toBe("internal");
    expect(failing.last()).toEqual(bytes(2));
    expect(await createClipboard(null).put(Promise.resolve(bytes(3)))).toBe("internal");
  });
  it("octets en échec : put rejette, interne inchangé", async () => {
    const cb = createClipboard(null);
    await expect(cb.put(Promise.reject(new Error("vide")))).rejects.toThrow("vide");
    expect(cb.last()).toBeNull();
  });
  it("browserSystemClipboard : ClipboardItem text/plain, repli writeText, null sans presse-papiers", async () => {
    const items: unknown[] = [];
    class Item { constructor(readonly parts: Record<string, Promise<Blob>>) { items.push(parts); } }
    const write = vi.fn(async () => undefined);
    const sys = browserSystemClipboard({ clipboard: { write } }, Item as unknown as ClipboardItemCtor)!;
    await sys.write(Promise.resolve("x"));
    expect(write).toHaveBeenCalledTimes(1);
    expect(Object.keys(items[0] as object)).toEqual(["text/plain"]);
    const writeText = vi.fn(async (_t: string) => undefined);
    await browserSystemClipboard({ clipboard: { writeText } }, undefined)!.write(Promise.resolve("y"));
    expect(writeText).toHaveBeenCalledWith("y");
    expect(browserSystemClipboard({}, undefined)).toBeNull();
  });
});

describe("copie et coupe (Z8)", () => {
  it("copie dans une zone éditable : non prise", () => {
    const area = document.createElement("textarea");
    const sink = { hasSelection: () => true, copySelection: vi.fn(async () => undefined) };
    expect(handleCopy({ target: area }, sink, false)).toBeNull();
    expect(sink.copySelection).not.toHaveBeenCalled();
  });
  it("sans sélection : non prise ; avec : copySelection(cut)", async () => {
    const empty = { hasSelection: () => false, copySelection: vi.fn(async () => undefined) };
    expect(handleCopy({ target: document.body }, empty, false)).toBeNull();
    const sink = { hasSelection: () => true, copySelection: vi.fn(async (_c: boolean) => undefined) };
    await handleCopy({ target: document.body }, sink, true);
    expect(sink.copySelection).toHaveBeenCalledWith(true);
  });
});
