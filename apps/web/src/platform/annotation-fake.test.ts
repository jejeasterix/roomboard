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

describe("faux hôte (C11b, P28, P30)", () => {
  it("support : transparent vrai par défaut, faux sur demande", async () => {
    expect((await createFakeAnnotationWindows().support()).transparent).toBe(true);
    expect((await createFakeAnnotationWindows({ transparent: false }).support()).transparent).toBe(false);
  });
  it("capture : PNG 320 × 180 par défaut ; résultat injecté ou fonction ; compte publié sur dataset", async () => {
    const ds: Record<string, string | undefined> = {};
    const f = createFakeAnnotationWindows({ dataset: ds });
    const a = await f.capture(place);
    expect(a.ok && a.image.width === 320 && a.image.height === 180 && a.image.blob.type === "image/png").toBe(true);
    expect(ds["annotationCaptures"]).toBe("1");
    expect(f.captures()).toBe(1);
    expect(f.log).toContain("capture");
    const refus = createFakeAnnotationWindows({ capture: { ok: false, reason: "denied" } });
    expect(await refus.capture(place)).toEqual({ ok: false, reason: "denied" });
    const fn = createFakeAnnotationWindows({ capture: async () => ({ ok: false, reason: "wayland" }) });
    expect(await fn.capture(place)).toEqual({ ok: false, reason: "wayland" });
  });
  it("enter et load : opaque publié (annotationOpaque), document reçu par le canal JSON ; load ne compte pas d'entrée", async () => {
    const ds: Record<string, string | undefined> = {};
    const f = createFakeAnnotationWindows({ dataset: ds });
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]! });
    expect(ds["annotationOpaque"]).toBe("0");
    expect(f.opaque()).toBe(false);
    await f.load({ document: new Uint8Array([1, 2]), opaque: true });
    expect(ds).toMatchObject({ annotationOpaque: "1", annotationEntrees: "1", annotationRecu: "2" });
    expect(f.opaque()).toBe(true);
    expect(Array.from(f.received()!)).toEqual([1, 2]);
    expect(f.log).toContain("load opaque");
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]!, opaque: true });
    expect(ds["annotationOpaque"]).toBe("1");
  });
  it("collect : la vue passe le canal JSON ; une vue illisible est ignorée (RF5)", async () => {
    const f = createFakeAnnotationWindows({ view: { page: 1, matrix: [2, 0, 0, 2, 3, 4] } });
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]! });
    expect((await f.collect())?.view).toEqual({ page: 1, matrix: [2, 0, 0, 2, 3, 4] });
    const g = createFakeAnnotationWindows({ view: { page: -1, matrix: [Number.NaN, 0, 0, 1, 0, 0] } });
    await g.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]! });
    const back = await g.collect();
    expect(back).not.toBeNull();
    expect(back!.view).toBeUndefined();
  });
});
