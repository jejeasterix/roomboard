import { describe, expect, it } from "vitest";
import { cubeGlb, cubeMtl, cubeObj, glb, gltfWithBin, plyAscii, stlBinary } from "./model3d-fixtures";
import {
  COMPANION_ALONE_MESSAGE, COMPRESSED_MESSAGE, MTL_MISSING_MESSAGE, NO_WEBGL_MESSAGE, ZIP_EMPTY_MESSAGE, gatherFiles,
  glbJsonText, gltfCompression, isCompanionName, keepZipPath, missingFilesMessage, normalizePath, references,
  resolveReference, sniffModel3d, storedPath, type Sibling,
} from "./model3d-import";

describe("objets 3D, partie pure (C15)", () => {
  const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);
  const sib = (path: string, content: string | Uint8Array = ""): Sibling => ({
    path,
    bytes: async () => (typeof content === "string" ? bytes(content) : content),
  });

  it("sniffModel3d (C15, X11) : octets d'abord, puis extension", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const cases: Array<[Uint8Array, string, string | null]> = [
      [cubeGlb().subarray(0, 64), "x.bin", "glb"],
      [bytes("ply\nformat ascii 1.0"), "nuage.txt", "ply"],
      [bytes("ply\r\nformat"), "a.ply", "ply"],
      [bytes("plyx"), "a.ply", null],
      [bytes("  \n{\"asset\":{}}"), "a.gltf", "gltf"],
      [new Uint8Array([0xef, 0xbb, 0xbf, 0x7b]), "a.GLTF", "gltf"],
      [bytes("[1]"), "a.gltf", null],
      [bytes(cubeObj()), "cube.obj", "obj"],
      [new Uint8Array([0x76, 0x20, 0x00]), "cube.obj", null],
      [stlBinary().subarray(0, 64), "piece.stl", "stl"],
      [bytes("solid x"), "PIECE.STL", "stl"],
      [new Uint8Array(0), "vide.stl", null],
      [bytes(cubeMtl()), "cube.mtl", null],
      [png, "x.glb", null],
    ];
    for (const [head, name, want] of cases) expect([name, sniffModel3d(head, name)]).toEqual([name, want]);
  });

  it("references : OBJ mtllib (nom à espaces), MTL dernier mot des dix clés, glTF sans data: et URI décodée (X14)", () => {
    expect(references("obj", "# x\nmtllib  mon cube.mtl\nv 0 0 0\n")).toEqual(["mon cube.mtl"]);
    const mtl = ["map_Kd a.png", "MAP_KA b.png", "map_Ks -s 1 1 1 c.png", "map_Ns d.png", "map_d e.png", "map_Bump f.png",
      "bump g.png", "disp h.png", "norm i.png", "refl -type sphere j.png", "map_Kd a.png", "Kd 1 0 0"].join("\n");
    expect(references("mtl", mtl)).toEqual(["a.png", "b.png", "c.png", "d.png", "e.png", "f.png", "g.png", "h.png", "i.png", "j.png"]);
    const gltf = JSON.stringify({ buffers: [{ uri: "m%20a.bin" }, { uri: "data:application/octet-stream;base64,AA==" }], images: [{ uri: "tex/a.png" }, { bufferView: 0 }] });
    expect(references("gltf", gltf)).toEqual(["m a.bin", "tex/a.png"]);
    expect(references("gltf", "{pas du json")).toEqual([]);
  });

  it("glbJsonText et gltfCompression (X18) : requise → nom, seulement utilisée → null", () => {
    expect(JSON.parse(glbJsonText(cubeGlb())!).asset.version).toBe("2.0");
    expect(glbJsonText(new Uint8Array(10))).toBeNull();
    expect(gltfCompression(JSON.stringify({ extensionsRequired: ["KHR_draco_mesh_compression"] }))).toBe("KHR_draco_mesh_compression");
    expect(gltfCompression(JSON.stringify({ extensionsRequired: ["KHR_texture_basisu"] }))).toBe("KHR_texture_basisu");
    expect(gltfCompression(JSON.stringify({ extensionsUsed: ["EXT_meshopt_compression"] }))).toBeNull();
    expect(gltfCompression("{")).toBeNull();
  });

  it("normalizePath et storedPath (X3, PC6)", () => {
    expect(normalizePath(".\\tex//./a.png")).toBe("tex/a.png");
    expect(normalizePath("a/../b.png")).toBe("b.png");
    expect(normalizePath("../a.png")).toBe("");
    expect(storedPath("../tex/a.png")).toBe("a.png");
    expect(storedPath("./tex/a.png")).toBe("tex/a.png");
    expect(storedPath("c:/x.png")).toBeNull();
    expect(storedPath("x".repeat(1025))).toBeNull();
  });

  it("resolveReference : exact, sans casse, nom de base unique (X14)", () => {
    const names = ["modele/cube.obj", "modele/cube.mtl", "modele/tex/Texture.PNG", "autre/b.png"];
    expect(resolveReference("cube.mtl", "modele/cube.obj", names)).toBe("modele/cube.mtl");
    expect(resolveReference("tex/texture.png", "modele/cube.obj", names)).toBe("modele/tex/Texture.PNG");
    expect(resolveReference("ailleurs/B.png", "modele/cube.obj", names)).toBe("autre/b.png");
    expect(resolveReference("absent.png", "modele/cube.obj", names)).toBeNull();
    expect(resolveReference("Texture.png", "cube.obj", ["texture.png"])).toBe("texture.png"); // dépôt : noms seuls
  });

  it("resolveReference : distant jamais, absolu par nom de base, nom de base ambigu : null (X14, X27)", () => {
    const names = ["a.png", "x/b.png", "y/b.png"];
    for (const r of ["https://cdn.test/a.png", "//cdn.test/a.png", "data:image/png;base64,AA", "blob:x", "file:///a.png"]) {
      expect(resolveReference(r, "m.gltf", names)).toBeNull();
    }
    expect(resolveReference("/home/moi/a.png", "m.gltf", names)).toBe("a.png");
    expect(resolveReference("C:\\Users\\moi\\a.png", "m.gltf", names)).toBe("a.png");
    expect(resolveReference("z/b.png", "m.gltf", names)).toBeNull();
  });

  it("gatherFiles : OBJ → MTL → textures (X14)", async () => {
    const g = await gatherFiles("obj", "cube.obj", bytes(cubeObj()), [sib("cube.mtl", cubeMtl("bleu.png")), sib("bleu.png"), sib("photo.png")]);
    expect(g.files.map((f) => [f.path, f.sibling.path])).toEqual([["cube.mtl", "cube.mtl"], ["bleu.png", "bleu.png"]]);
    expect([g.missing, g.mtl]).toEqual([[], true]);
  });

  it("gatherFiles : OBJ sans mtllib ou .mtl introuvable : mtl faux, rien d'absent listé (X15)", async () => {
    expect(await gatherFiles("obj", "seul.obj", bytes(cubeObj(null)), [])).toEqual({ files: [], missing: [], mtl: false });
    expect((await gatherFiles("obj", "seul.obj", bytes(cubeObj()), [sib("autre.mtl")])).mtl).toBe(false);
  });

  it("gatherFiles : glTF + .bin + PNG ; texture absente listée ; GLB à image intégrée : aucun lié (X14)", async () => {
    const { gltf, bin } = gltfWithBin();
    const g = await gatherFiles("gltf", "m/scene.gltf", bytes(gltf), [sib("m/cube.bin", bin), sib("m/tex/a.png")]);
    expect(g.files.map((f) => f.path)).toEqual(["cube.bin", "tex/a.png"]);
    const h = await gatherFiles("gltf", "scene.gltf", bytes(gltf), [sib("cube.bin", bin)]);
    expect([h.files.map((f) => f.path), h.missing]).toEqual([["cube.bin"], ["tex/a.png"]]);
    expect(await gatherFiles("glb", "cube.glb", cubeGlb(), [sib("x.png")])).toEqual({ files: [], missing: [], mtl: null });
    expect((await gatherFiles("stl", "p.stl", stlBinary(), [sib("x.png")])).files).toEqual([]);
    expect((await gatherFiles("ply", "n.ply", bytes(plyAscii()), [])).mtl).toBeNull();
  });

  it("gatherFiles : 256 fichiers liés au plus, doublons rangés une fois", async () => {
    const many = Array.from({ length: 300 }, (_, i) => `t${i}.png`);
    const mtl = many.map((n) => `map_Kd ${n}`).join("\n") + "\nmap_Ka t0.png\n";
    const g = await gatherFiles("obj", "c.obj", bytes(cubeObj()), [sib("cube.mtl", mtl), ...many.map((n) => sib(n))]);
    expect(g.files).toHaveLength(256);
    expect(new Set(g.files.map((f) => f.path)).size).toBe(256);
  });

  it("keepZipPath (X16) : .., absolus, dossiers, __MACOSX, extensions", () => {
    const yes = ["cube.glb", "m/scene.gltf", "m/cube.bin", "tex/a.PNG", "a.mtl", "p.stl", "n.ply", "c.obj", "m\\x.jpg"];
    const no = ["../x.obj", "a/../../x.obj", "/etc/x.obj", "C:/x.obj", "dossier/", "__MACOSX/._cube.glb", "lisez-moi.txt", "x.fbx"];
    expect(yes.filter(keepZipPath)).toEqual(yes);
    expect(no.filter(keepZipPath)).toEqual([]);
  });

  it("messages exacts (X12, X15, X16, X18, X26) et fichiers liés seuls", () => {
    expect(missingFilesMessage("cube.obj", ["a.png", "b.mtl"])).toBe("cube.obj : fichiers liés absents (a.png, b.mtl)");
    expect(MTL_MISSING_MESSAGE).toBe("déposé sans son .mtl, modèle sans matières ni textures ; déposez le .obj avec son .mtl et ses textures, ou un ZIP");
    expect(COMPRESSED_MESSAGE).toBe("modèle 3D compressé (Draco, meshopt ou KTX2) non lu ; exportez-le sans compression");
    expect(COMPANION_ALONE_MESSAGE).toBe("fichier lié d'un modèle 3D : déposez-le avec son modèle");
    expect(ZIP_EMPTY_MESSAGE).toBe("aucun modèle 3D dans ce ZIP");
    expect(NO_WEBGL_MESSAGE).toBe("3D indisponible sur ce poste : l'objet garde son image");
    expect(["a.MTL", "b.bin", "c.png", "d.obj"].map(isCompanionName)).toEqual([true, true, false, false]);
  });

  it("glb : en-tête, longueur totale, blocs alignés sur 4", () => {
    const g = glb({ asset: { version: "2.0" } }, new Uint8Array([1, 2, 3]));
    const v = new DataView(g.buffer);
    expect([v.getUint32(0, true), v.getUint32(8, true), g.length % 4]).toEqual([0x46546c67, g.length, 0]);
  });
});
