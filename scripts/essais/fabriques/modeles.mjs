// Fabriques des modèles 3D d'essai (cadrage cli-lot4, D70) : OBJ + MTL + texture PNG, STL binaire, PLY ASCII, glTF + .bin,
// GLB sans texture et GLB à texture incorporée, écrits par le code ; aucun fichier téléchargé. Lues par les tests de
// apps/cli, par cli-essai.mjs et par objets.mjs.
import { solidPng } from "../commun.mjs";

const enc = (s) => new TextEncoder().encode(s);
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};
const le32 = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
const f32s = (values) => {
  const b = new Uint8Array(values.length * 4);
  const v = new DataView(b.buffer);
  values.forEach((x, i) => v.setFloat32(i * 4, x, true));
  return b;
};
const pad4 = (b, fill) => {
  const n = (4 - (b.length % 4)) % 4;
  return n === 0 ? b : cat(b, new Uint8Array(n).fill(fill));
};
const TRI = [0, 0, 0, 1, 0, 0, 0, 1, 0];
const UV = [0, 0, 1, 0, 0, 1];
const ACCESSORS = [
  { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
  { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" },
];
const GEOMETRY_VIEWS = [
  { buffer: 0, byteOffset: 0, byteLength: 36 },
  { buffer: 0, byteOffset: 36, byteLength: 24 },
];
const TEXTURED = { materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }], textures: [{ source: 0 }] };
const scene = (material) => ({
  asset: { version: "2.0" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, ...(material ? { material: 0 } : {}) }] }],
});
/** Conteneur GLB 2.0 : morceau JSON (complété d'espaces), morceau BIN (longueur multiple de 4). */
const glb = (json, bin) => {
  const j = pad4(enc(JSON.stringify(json)), 0x20);
  return cat(enc("glTF"), le32(2), le32(12 + 8 + j.length + 8 + bin.length), le32(j.length), enc("JSON"), j, le32(bin.length), Uint8Array.of(0x42, 0x49, 0x4e, 0x00), bin);
};

/** PNG 2 × 2 (texture). */
export const png1 = () => new Uint8Array(solidPng(2, 2, [200, 60, 40]));

/** OBJ : carré de deux faces, coordonnées de texture, matériau `rouge` de `cube.mtl`. */
export const cubeObj = () => enc("mtllib cube.mtl\nusemtl rouge\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 1 1\nvt 0 1\nf 1/1 2/2 3/3\nf 1/1 3/3 4/4\n");

/** MTL : `rouge`, couleur diffuse, texture `texture` (« tex.png » ; null : aucune). */
export const cubeMtl = (texture = "tex.png") => enc(`newmtl rouge\nKd 0.8 0.2 0.2\n${texture ? `map_Kd ${texture}\n` : ""}`);

/** STL binaire : en-tête de 80 octets nuls (pas « solid »), un triangle. */
export const stlTriangle = () => cat(new Uint8Array(80), le32(1), f32s([0, 0, 1, ...TRI]), new Uint8Array(2));

/** PLY ASCII : un triangle. */
export const plyTriangle = () =>
  enc("ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n");

/** glTF `tri.gltf` qui cite `tri.bin` (positions et UV, 60 octets) ; `image` : texture externe citée par son chemin. */
export function gltfPair({ image = null } = {}) {
  const bin = cat(f32s(TRI), f32s(UV));
  const json = {
    ...scene(image !== null),
    ...(image !== null ? { ...TEXTURED, images: [{ uri: image }] } : {}),
    buffers: [{ uri: "tri.bin", byteLength: bin.length }],
    bufferViews: GEOMETRY_VIEWS,
    accessors: ACCESSORS,
  };
  return { gltf: enc(JSON.stringify(json)), bin };
}

/** GLB : triangle sans matériau ni texture, tampon binaire incorporé. */
export function glbPlain() {
  const bin = cat(f32s(TRI), f32s(UV));
  return glb({ ...scene(false), buffers: [{ byteLength: bin.length }], bufferViews: GEOMETRY_VIEWS, accessors: ACCESSORS }, bin);
}

/** GLB : triangle texturé, PNG incorporé dans le tampon binaire (`images[0].bufferView`). */
export function glbTextured() {
  const png = png1();
  const bin = cat(f32s(TRI), f32s(UV), pad4(png, 0));
  const json = {
    ...scene(true),
    ...TEXTURED,
    images: [{ bufferView: 2, mimeType: "image/png" }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [...GEOMETRY_VIEWS, { buffer: 0, byteOffset: 60, byteLength: png.length }],
    accessors: ACCESSORS,
  };
  return glb(json, bin);
}
