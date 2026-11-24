import { describe, expect, it, vi } from "vitest";
import { PDFJS_WARNINGS, quietWarn } from "./quiet";

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
