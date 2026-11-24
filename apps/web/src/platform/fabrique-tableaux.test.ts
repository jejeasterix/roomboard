import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { flipPages, iwbRaw3, iwbZip, nbSvg, notebookZip, olfZip, TIFF, ubzZip } from "../../../../scripts/essais/fabriques/tableaux.mjs";

const dec = (b: Uint8Array) => new TextDecoder().decode(b);
const PNG = [0x89, 0x50, 0x4e, 0x47];

describe("fabriques des tableaux (cli-lot2, D28)", () => {
  it(".iwb ZIP : content.xml, image, vidéo ; XML brut de 3 pages", () => {
    const z = unzipSync(iwbZip(zipSync));
    expect(Object.keys(z).sort()).toEqual(["content.xml", "images/carre.png", "videos/film.mpg"]);
    expect(dec(z["content.xml"]!)).toContain("<svg:video");
    expect(Array.from(z["images/carre.png"]!.subarray(0, 4))).toEqual(PNG);
    expect(iwbRaw3().match(/<svg:page /g)).toHaveLength(3);
  });
  it(".ubz, .notebook, .olf : entrées attendues", () => {
    expect(Object.keys(unzipSync(ubzZip(zipSync))).sort()).toEqual(["images/photo.png", "metadata.rdf", "page001.svg"]);
    expect(Object.keys(unzipSync(notebookZip(zipSync))).sort()).toEqual(["images/a b[1].png", "imsmanifest.xml", "page0.svg", "page1.svg"]);
    const olf = unzipSync(olfZip(zipSync));
    expect(JSON.parse(dec(olf["content.json"]!)).olf.width).toBe(3840);
  });
  it("pages .flipchart : 2 pages, PNG puis TIFF en page 1 ; nbSvg", () => {
    const pages = flipPages();
    expect(pages).toHaveLength(2);
    expect(Array.from(pages[0]!.images![0]!.bytes.subarray(0, 4))).toEqual(PNG);
    expect(pages[0]!.images![1]!.bytes).toEqual(TIFF);
    expect(nbSvg("<g/>")).toContain('viewBox="0 0 800 600"><g/></svg>');
  });
});
