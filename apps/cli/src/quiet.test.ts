import { describe, expect, it, vi } from "vitest";
import { PDFJS_WARNINGS, quietError, quietWarn, THREE_ERRORS } from "./quiet";

describe("quietWarn (cli-lot3, D34)", () => {
  it("quietWarn — retire les trois avertissements de chargement de pdf.js", () => {
    const warn = vi.fn();
    const q = quietWarn(warn);
    q('Warning: Cannot load "@napi-rs/canvas" package: "Error: Cannot find module \'@napi-rs/canvas\'".');
    q("Warning: Cannot polyfill `DOMMatrix`, rendering may be broken.");
    q("Warning: Cannot polyfill `Path2D`, rendering may be broken.");
    expect(warn).not.toHaveBeenCalled();
    expect(PDFJS_WARNINGS).toEqual(['Warning: Cannot load "@napi-rs/canvas"', "Warning: Cannot polyfill `DOMMatrix`", "Warning: Cannot polyfill `Path2D`"]);
  });
  it("quietWarn — garde tout autre avertissement (même de pdf.js), préfixe lu au début du premier argument seul", () => {
    const warn = vi.fn();
    const q = quietWarn(warn);
    q("Warning: Cannot load system font: Arial, installing it could help to improve PDF rendering.");
    q("RoomBoard : autre", 1);
    q("ligne\nWarning: Cannot polyfill `Path2D`, rendering may be broken.");
    q({ objet: true });
    expect(warn.mock.calls).toEqual([
      ["Warning: Cannot load system font: Arial, installing it could help to improve PDF rendering."],
      ["RoomBoard : autre", 1],
      ["ligne\nWarning: Cannot polyfill `Path2D`, rendering may be broken."],
      [{ objet: true }],
    ]);
  });
  it("quietWarn — à l'import, console.warn est enveloppé", async () => {
    const original = console.warn;
    const calls: unknown[][] = [];
    console.warn = (...a: unknown[]) => void calls.push(a);
    try {
      vi.resetModules();
      await import("./quiet");
      console.warn("Warning: Cannot polyfill `Path2D`, rendering may be broken.");
      console.warn("garde");
    } finally {
      console.warn = original;
    }
    expect(calls).toEqual([["garde"]]);
  });
});

describe("quietError (cli-lot4, D77)", () => {
  it("quietError — retire le message de texture absente de GLTFLoader (déjà dit par missing)", () => {
    const error = vi.fn();
    quietError(error)("THREE.GLTFLoader: Couldn't load texture", "blob:nodedata:1234");
    expect(error).not.toHaveBeenCalled();
    expect(THREE_ERRORS).toEqual(["THREE.GLTFLoader: Couldn't load texture"]);
  });
  it("quietError — garde tout autre message, préfixe lu au début du premier argument seul", () => {
    const error = vi.fn();
    const q = quietError(error);
    q("THREE.GLTFLoader: autre chose");
    q("erreur\nTHREE.GLTFLoader: Couldn't load texture");
    q(new Error("x"));
    expect(error.mock.calls.map((c) => String(c[0]))).toEqual(["THREE.GLTFLoader: autre chose", "erreur\nTHREE.GLTFLoader: Couldn't load texture", "Error: x"]);
  });
  it("quietError — à l'import, console.error est enveloppé", async () => {
    const original = console.error;
    const calls: unknown[][] = [];
    console.error = (...a: unknown[]) => void calls.push(a);
    try {
      vi.resetModules();
      await import("./quiet");
      console.error("THREE.GLTFLoader: Couldn't load texture", "blob:nodedata:1");
      console.error("garde");
    } finally {
      console.error = original;
    }
    expect(calls).toEqual([["garde"]]);
  });
});
