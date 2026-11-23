import { describe, expect, it } from "vitest";
import { createFakeAnnotationWindows, jsonChannel } from "./annotation-fake";
import { fromBase64, toBase64 } from "./clipboard";
import { BUILTIN_PROFILES } from "../toolbar-profiles";

const place = { screen: null, dock: "top" as const, thickness: 48 };

describe("faux hôte des fenêtres (C11a, P28, P29)", () => {
  it("canal JSON : un Uint8Array brut devient {\"0\": …}, jamais un Uint8Array", () => {
    const out = jsonChannel({ doc: new Uint8Array([7, 8]) }) as unknown as { doc: unknown };
    expect(out.doc).not.toBeInstanceOf(Uint8Array);
    expect(out.doc).toEqual({ "0": 7, "1": 8 });
  });
  it("en base64, le document revient à l'octet près", () => {
    const bytes = new Uint8Array([0, 255, 80, 75, 3, 4]);
    expect(fromBase64(jsonChannel({ base64: toBase64(bytes) }).base64)).toEqual(bytes);
  });
  it("document reçu et rendu : des Uint8Array après le canal JSON (base64, jamais l'octet brut dans la charge)", async () => {
    const f = createFakeAnnotationWindows({ draw: async (b) => new Uint8Array([...b, 0]) });
    await f.enter({ ...place, document: new Uint8Array([0, 255, 128]), profile: BUILTIN_PROFILES[0]! });
    expect(f.received()).toBeInstanceOf(Uint8Array);
    expect(Array.from(f.received()!)).toEqual([0, 255, 128]);
    const back = await f.collect();
    expect(back?.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(back!.bytes)).toEqual([0, 255, 128, 0]);
  });
  it("entrée puis sortie : document reçu et rendu identiques, changed faux sans draw", async () => {
    const f = createFakeAnnotationWindows();
    const bytes = new Uint8Array([1, 2, 3]);
    expect(await f.enter({ ...place, document: bytes, profile: BUILTIN_PROFILES[0]! })).toBe(0);
    expect(f.received()).toEqual(bytes);
    expect(f.profiles()).toBe(1);
    expect(await f.collect()).toEqual({ bytes, changed: false });
  });
  it("draw : octets transformés, changed vrai", async () => {
    const f = createFakeAnnotationWindows({ draw: async (b) => new Uint8Array([...b, 9]) });
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]! });
    expect(await f.collect()).toEqual({ bytes: new Uint8Array([1, 9]), changed: true });
  });
  it("dataset publié : annotation, pointeur, annotationRecu, annotationRendu, annotationEntrees", async () => {
    const ds: Record<string, string | undefined> = {};
    const f = createFakeAnnotationWindows({ dataset: ds });
    await f.enter({ ...place, document: new Uint8Array([1, 2]), profile: BUILTIN_PROFILES[0]! });
    expect(ds).toMatchObject({ annotation: "1", pointeur: "draw", annotationRecu: "2", annotationEntrees: "1" });
    await f.pointer("mouse");
    expect(ds["pointeur"]).toBe("mouse");
    await f.collect();
    await f.leave();
    expect(ds).toMatchObject({ annotation: "0", annotationRendu: "2" });
  });
  it("setTool : vue publiée avec l'outil du moteur, après le canal JSON", () => {
    const f = createFakeAnnotationWindows();
    const views: string[] = [];
    f.onView((v) => views.push(v.tool));
    f.send({ kind: "setTool", tool: "select" });
    expect(f.sent).toEqual([{ kind: "setTool", tool: "select" }]);
    expect(views).toEqual(["select"]);
  });
});
