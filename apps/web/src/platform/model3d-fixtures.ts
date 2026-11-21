/** Modèles 3D fabriqués pour les tests (C15, X37) : jamais téléchargés. Importé par les seuls `*.test.ts`. */
const enc = new TextEncoder();

/** GLB 2.0 : bloc JSON (complété d'espaces) puis bloc BIN (complété de zéros). */
export function glb(json: object, bin: Uint8Array = new Uint8Array(0)): Uint8Array {
  const j = enc.encode(JSON.stringify(json));
  const jl = Math.ceil(j.length / 4) * 4;
  const bl = Math.ceil(bin.length / 4) * 4;
  const total = 20 + jl + (bl > 0 ? 8 + bl : 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, total, true);
  v.setUint32(12, jl, true);
  v.setUint32(16, 0x4e4f534a, true);
  out.set(j, 20);
  out.fill(0x20, 20 + j.length, 20 + jl);
  if (bl > 0) {
    v.setUint32(20 + jl, bl, true);
    v.setUint32(24 + jl, 0x004e4942, true);
    out.set(bin, 28 + jl);
  }
  return out;
}

/** Cube de côté 2 centré sur l'origine, couleurs de sommets (rouge, vert, bleu…), 12 triangles. */
export function cubeGlb(extra: Record<string, unknown> = {}): Uint8Array {
  const pos = new Float32Array([-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1]);
  const col = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0.2, 0.2, 0.2]);
  const ind = new Uint16Array([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 1, 2, 6, 1, 6, 5, 0, 4, 7, 0, 7, 3]);
  const bin = new Uint8Array(264);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(col.buffer), 96);
  bin.set(new Uint8Array(ind.buffer), 192);
  return glb(
    {
      asset: { version: "2.0" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0, COLOR_0: 1 }, indices: 2 }] }],
      buffers: [{ byteLength: 264 }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 96 },
        { buffer: 0, byteOffset: 96, byteLength: 96 },
        { buffer: 0, byteOffset: 192, byteLength: 72 },
      ],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 8, type: "VEC3", min: [-1, -1, -1], max: [1, 1, 1] },
        { bufferView: 1, componentType: 5126, count: 8, type: "VEC3" },
        { bufferView: 2, componentType: 5123, count: 36, type: "SCALAR" },
      ],
      ...extra,
    },
    bin,
  );
}

/** Cube OBJ (8 sommets, 6 faces carrées) ; `mtllib` et `usemtl bleu` si `mtl` est donné. */
export function cubeObj(mtl: string | null = "cube.mtl"): string {
  const head = mtl === null ? "" : `mtllib ${mtl}\nusemtl bleu\n`;
  return `${head}v -1 -1 -1\nv 1 -1 -1\nv 1 1 -1\nv -1 1 -1\nv -1 -1 1\nv 1 -1 1\nv 1 1 1\nv -1 1 1\n` +
    "f 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 3 4 8 7\nf 2 3 7 6\nf 1 5 8 4\n";
}

/** Matière bleue ; `map_Kd` si une texture est donnée (options `-s` comprises, dernier mot = fichier). */
export function cubeMtl(texture: string | null = null): string {
  return `newmtl bleu\nKd 0 0 1\n${texture === null ? "" : `map_Kd -s 1 1 1 ${texture}\n`}`;
}

/** STL binaire : tétraèdre (4 triangles), normales nulles (recalculées par le chargeur). */
export function stlBinary(): Uint8Array {
  const v = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const tris = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
  const out = new Uint8Array(84 + tris.length * 50);
  const d = new DataView(out.buffer);
  d.setUint32(80, tris.length, true);
  tris.forEach((t, i) => {
    const o = 84 + i * 50 + 12;
    t.forEach((k, j) => v[k]!.forEach((c, n) => d.setFloat32(o + j * 12 + n * 4, c, true)));
  });
  return out;
}

/** PLY ASCII : tétraèdre à couleurs de sommets. */
export function plyAscii(): string {
  return [
    "ply", "format ascii 1.0", "element vertex 4", "property float x", "property float y", "property float z",
    "property uchar red", "property uchar green", "property uchar blue", "element face 4", "property list uchar int vertex_indices",
    "end_header", "0 0 0 255 0 0", "1 0 0 0 255 0", "0 1 0 0 0 255", "0 0 1 255 255 0", "3 0 2 1", "3 0 1 3", "3 0 3 2", "3 1 2 3", "",
  ].join("\n");
}

/** glTF texte qui cite `cube.bin` et `tex/a.png` (UV comprises), et son tampon. */
export function gltfWithBin(image = "tex/a.png"): { readonly gltf: string; readonly bin: Uint8Array } {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const uv = new Float32Array([0, 0, 1, 0, 0, 1]);
  const bin = new Uint8Array(60);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(uv.buffer), 36);
  const gltf = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    textures: [{ source: 0 }],
    images: [{ uri: image }],
    buffers: [{ uri: "cube.bin", byteLength: 60 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 24 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" },
    ],
  });
  return { gltf, bin };
}
