import { describe, expect, it } from "vitest";
import { MAX_PIXELS } from "../platform/image-import";
import { imageSource } from "./image-source";

describe("imageSource : source blanche d'un fichier image sondé", () => {
  const blob = new Blob([new Uint8Array([1, 2, 3])]);
  it("page blanche, sans grille, image avec type et taille sondés", () => {
    expect(imageSource(blob, "a.png", { mime: "image/png", w: 40, h: 30 })).toEqual({
      color: "#ffffff",
      grid: null,
      image: { blob, name: "a.png", mime: "image/png", w: 40, h: 30 },
    });
  });
  it("au-delà de MAX_PIXELS : null ; à MAX_PIXELS exactement : une source", () => {
    expect(imageSource(blob, "a.png", { mime: "image/png", w: MAX_PIXELS, h: 2 })).toBeNull();
    expect(imageSource(blob, "a.png", { mime: "image/png", w: MAX_PIXELS, h: 1 })).not.toBeNull();
  });
});
