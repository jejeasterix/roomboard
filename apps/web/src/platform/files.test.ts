import { describe, expect, it } from "vitest";
import {
  chooseHostKind,
  detectHostEnvironment,
  ensureExtension,
  FILE_FILTER,
  IMPORT_FILTER,
  parseHostChoice,
  ROOMBOARD_MIME,
  UNTITLED,
} from "./files";

const fn = (): void => undefined;

describe("contrat des fichiers (D26, DA8)", () => {
  it("détection : Tauri par isTauri ou __TAURI_INTERNALS__, FSA seulement avec les deux sélecteurs", () => {
    expect(detectHostEnvironment({})).toEqual({ tauri: false, fsa: false });
    expect(detectHostEnvironment({ isTauri: true })).toEqual({ tauri: true, fsa: false });
    expect(detectHostEnvironment({ __TAURI_INTERNALS__: {} })).toEqual({ tauri: true, fsa: false });
    expect(detectHostEnvironment({ __TAURI_INTERNALS__: null })).toEqual({ tauri: false, fsa: false });
    expect(detectHostEnvironment({ showSaveFilePicker: fn })).toEqual({ tauri: false, fsa: false });
    expect(detectHostEnvironment({ showSaveFilePicker: fn, showOpenFilePicker: fn })).toEqual({ tauri: false, fsa: true });
  });

  it("choix : auto préfère Tauri puis FSA puis le repli ; repli forcé partout", () => {
    const all = { tauri: true, fsa: true };
    expect(chooseHostKind(all, "auto")).toBe("tauri");
    expect(chooseHostKind({ tauri: false, fsa: true }, "auto")).toBe("fsa");
    expect(chooseHostKind({ tauri: false, fsa: false }, "auto")).toBe("repli");
    expect(chooseHostKind(all, "repli")).toBe("repli");
    expect(chooseHostKind(all, "fsa")).toBe("fsa");
    expect(chooseHostKind({ tauri: true, fsa: false }, "fsa")).toBe("repli");
  });

  it("réglage ?fichiers= : repli, fsa, sinon auto", () => {
    expect(parseHostChoice("")).toBe("auto");
    expect(parseHostChoice("?fichiers=repli")).toBe("repli");
    expect(parseHostChoice("?echelons=2&fichiers=fsa")).toBe("fsa");
    expect(parseHostChoice("?fichiers=tauri")).toBe("auto");
    expect(parseHostChoice("?fichiers=REPLI")).toBe("auto");
  });

  it("nom : extension .roomboard ajoutée une fois, nom vide → Sans titre.roomboard", () => {
    expect(ensureExtension("cours")).toBe("cours.roomboard");
    expect(ensureExtension("cours.roomboard")).toBe("cours.roomboard");
    expect(ensureExtension("Cours.ROOMBOARD")).toBe("Cours.ROOMBOARD");
    expect(ensureExtension("  ")).toBe(UNTITLED);
    expect(UNTITLED).toBe("Sans titre.roomboard");
  });

  it("type et filtre : application/x-roomboard, extension roomboard (D24)", () => {
    expect(ROOMBOARD_MIME).toBe("application/x-roomboard");
    expect(FILE_FILTER).toEqual({ name: "Document RoomBoard", extensions: ["roomboard"] });
  });
});

describe("FileHost : onDrop (T86)", () => {
  it("le type FileHost exige onDrop", () => {
    // @ts-expect-error onDrop manque
    const h: import("./files").FileHost = { kind: "repli", open: async () => null, save: async () => null };
    expect(h.kind).toBe("repli");
  });

  it("filtre « Importer » : .roomboard, .rbitem, .pdf, images d'U33 (sans TIFF ni RAW), vidéos, sons et objets 3D (R14, R18, PF3, C14, C15 X32)", () => {
    expect(IMPORT_FILTER).toEqual({
      name: "Images, vidéos, sons, 3D, PDF et documents RoomBoard",
      extensions: [
        "roomboard", "rbitem", "rbpack", "pdf",
        "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif",
        "mp4", "m4v", "mov", "webm", "ogv",
        "m4a", "mp3", "wav", "ogg", "oga",
        "glb", "gltf", "obj", "mtl", "stl", "ply", "bin", "zip",
      ],
    });
  });
});
