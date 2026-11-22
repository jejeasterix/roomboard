// Fabrique de `.flipchart` synthétiques (N19), seul générateur, employé par vitest et par l'essai navigateur.
// Porté d'ActCraft (même auteur), `tests/support/flipchartwriter.h` : même conteneur Bamboo, même index « culm »,
// même flux d'objets, mêmes numéros de genres et de propriétés (`formats/src/flipchartids.h`). Écrit d'après la
// documentation du format, jamais à partir d'un fichier réel. Entiers petit-boutistes et chaînes mesurées en
// octets, sauf l'en-tête de qCompress, gros-boutiste. La compression est injectée (`deflate`) : aucun module zlib
// n'est chargé ici.

const DATE = "lun. 1. janv. 00:00:00 2024";
const RESERVED = Uint8Array.of(0, 0, 0, 0, 0, 0, 1, 0);
const BLACK = 0x000000;
// Objets par page : leurs nœuds (base + 10 + 2k) restent sous les ressources de la page (base + 500 + k).
const MAX_OBJECTS = 245;

// Octets petit-boutistes, à la suite.
class Bytes {
  #parts = [];
  #length = 0;

  raw(bytes) {
    this.#parts.push(bytes);
    this.#length += bytes.length;
    return this;
  }
  #fixed(size, write) {
    const bytes = new Uint8Array(size);
    write(new DataView(bytes.buffer));
    return this.raw(bytes);
  }
  u8(v) {
    return this.raw(Uint8Array.of(v & 0xff));
  }
  u16(v) {
    return this.#fixed(2, (d) => d.setUint16(0, v, true));
  }
  u32(v) {
    return this.#fixed(4, (d) => d.setUint32(0, v >>> 0, true));
  }
  i32(v) {
    return this.#fixed(4, (d) => d.setInt32(0, v, true));
  }
  u64(v) {
    return this.#fixed(8, (d) => d.setBigUint64(0, BigInt(v), true));
  }
  f64(v) {
    return this.#fixed(8, (d) => d.setFloat64(0, v, true));
  }
  tag(c) {
    return this.u8(c.charCodeAt(0));
  }
  ascii(text) {
    return this.raw(Uint8Array.from(text, (c) => c.charCodeAt(0)));
  }
  // QString : u32 = longueur en octets, puis UTF-16LE.
  qstr(text) {
    const utf16 = utf16le(text);
    return this.u32(utf16.length).raw(utf16);
  }
  // Chaîne d'une variante : u16 = 1 puis QString.
  str16(text) {
    return this.u16(1).qstr(text);
  }
  data() {
    const out = new Uint8Array(this.#length);
    let at = 0;
    for (const part of this.#parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }
}

function utf16le(text) {
  const out = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    out[2 * i] = unit & 0xff;
    out[2 * i + 1] = unit >> 8;
  }
  return out;
}

export function qCompress(data, deflate, announced = data.length) {
  if (!Number.isInteger(announced) || announced < 0 || announced > 0xffffffff) {
    throw new RangeError(`qCompress : taille annoncée hors u32 : ${announced}`);
  }
  const stream = deflate(data);
  const out = new Uint8Array(4 + stream.length);
  new DataView(out.buffer).setUint32(0, announced, false);
  out.set(stream, 4);
  return out;
}

// Entrée interne : `header` = en-tête qCompress, `oddName` = nom tronqué d'un octet, `bare` = dates vides.
function container(entries, deflate) {
  const b = new Bytes();
  b.ascii(" Bamboo ").u16(7).qstr("1.0").raw(RESERVED);
  for (const e of entries) {
    if (e.oddName) {
      const name = utf16le(e.name);
      b.u32(name.length - 1).raw(name.subarray(0, name.length - 1));
    } else {
      b.qstr(e.name);
    }
    for (let i = 0; i < 3; i += 1) b.qstr(e.bare ? "" : DATE);
    const stored = e.compressed ? qCompress(e.data, deflate, e.header ?? e.data.length) : e.data;
    b.u64(e.announced ?? e.data.length)
      .u8(e.compressed ? 1 : 0)
      .u64(stored.length)
      .raw(stored);
  }
  return b.data();
}

export function bambooContainer(entries, deflate) {
  return container(
    entries.map(({ name, data, compressed, announced }) => ({ name, data, compressed, announced })),
    deflate,
  );
}

function writeNode(b, node) {
  b.tag("N").u32(node.id).u16(node.type).u32(node.storage);
  for (const ref of node.refs ?? []) b.tag("S").u32(ref).tag("s");
  for (const child of node.children ?? []) writeNode(b, child);
  b.tag("n");
}

// Index « culm » : signature, u16 1, u16 7, puis l'arbre des nœuds.
function index(root) {
  const b = new Bytes();
  b.ascii("# culm #").u16(1).u16(7);
  writeNode(b, root);
  return b.data();
}

// Objet du flux : 'O' genre stockage 'M' n tailles enregistrements 'p' ['R' nœud 'r'] 'o'.
class Obj {
  #props = [];
  #owner;

  constructor(type, storage) {
    this.type = type;
    this.storage = storage;
  }
  #add(id, variant) {
    this.#props.push([id, variant.data()]);
    return this;
  }
  boolean(id, v) {
    return this.#add(id, new Bytes().u16(1).u8(v ? 1 : 0));
  }
  integer(id, v) {
    return this.#add(id, new Bytes().u16(2).i32(v));
  }
  real(id, v) {
    return this.#add(id, new Bytes().u16(6).f64(v));
  }
  string(id, v) {
    return this.#add(id, new Bytes().u16(10).str16(v));
  }
  floatRect(id, x, y, w, h) {
    return this.#add(id, new Bytes().u16(20).f64(x).f64(y).f64(w).f64(h));
  }
  size(id, w, h) {
    return this.#add(id, new Bytes().u16(21).i32(w).i32(h));
  }
  sizeF(id, w, h) {
    return this.#add(id, new Bytes().u16(22).f64(w).f64(h));
  }
  pointF(id, x, y) {
    return this.#add(id, new Bytes().u16(26).f64(x).f64(y));
  }
  // Couleur `0xRRGGBB`, opaque.
  color(id, rgb) {
    return this.#add(id, new Bytes().u16(67).u8(rgb >> 16).u8(rgb >> 8).u8(rgb).u8(255));
  }
  points(id, points) {
    const doubles = new Bytes();
    for (const [x, y] of points) doubles.f64(x).f64(y);
    const bytes = doubles.data();
    return this.#add(id, new Bytes().u16(127).u16(1).i32(points.length).u32(bytes.length).raw(bytes));
  }
  resources(id, list) {
    const b = new Bytes().u16(127).u16(3).i32(list.length);
    for (const r of list) b.u32(r.id).str16(r.entry).str16(r.dataFile).str16("unknown").u32(1);
    return this.#add(id, b);
  }
  object(id, subtype, inner) {
    return this.#add(id, new Bytes().u16(127).u16(subtype).raw(inner.body()));
  }
  userRect(id, x, y, w, h) {
    return this.#add(id, new Bytes().u16(127).u16(5).f64(x).f64(y).f64(w).f64(h));
  }
  pointer(id, node, storage, type) {
    return this.#add(id, new Bytes().u16(127).u16(9).u32(node).u32(storage).u16(type));
  }
  runs(id, list) {
    const b = new Bytes().u16(127).u16(10).i32(list.length);
    for (const o of list) b.raw(o.body());
    return this.#add(id, b);
  }
  owner(node) {
    this.#owner = node;
    return this;
  }
  // L'objet sans en-tête de flux (objet embarqué).
  body() {
    const records = this.#props.map(([id, variant], i) =>
      new Bytes()
        .tag(i === 0 ? "m" : "p")
        .tag("P")
        .u16(id)
        .raw(variant)
        .data(),
    );
    const b = new Bytes().tag("O").u16(this.type).u32(this.storage).tag("M").u32(records.length);
    for (const r of records) b.u32(r.length);
    for (const r of records) b.raw(r);
    b.tag("p");
    if (this.#owner !== undefined) b.tag("R").u32(this.#owner).tag("r");
    return b.tag("o").data();
  }
  // Fichier .io / .ir : en-tête de flux " Bamboo " u16 1 u16 7, puis l'objet.
  stream() {
    return new Bytes().ascii(" Bamboo ").u16(1).u16(7).raw(this.body()).data();
  }
}

// Transformation embarquée : translation, rotation nulle, échelle 1, sans miroir.
const place = (x, y) => new Obj(15, 0).pointF(2, x, y).real(3, 0).pointF(4, 1, 1).boolean(5, false).boolean(6, false);

// Encre : largeur, motif (Qt::PenStyle), bouts, jointures, couleur ; remplissage plein si `fill`.
function ink(width, color, fill) {
  const pen = new Obj(20, 0).real(3, width).integer(4, 1).integer(5, 32).integer(6, 128).color(7, color);
  if (fill !== undefined) {
    pen.integer(8, 1).color(9, fill).color(13, BLACK).integer(14, 0).integer(10, 0).color(11, BLACK);
  }
  return pen;
}

// Propriétés communes : nom, couche intermédiaire, profondeur, transformation.
const item = (kind, storage, name, z, placement) =>
  new Obj(kind, storage).string(4, name).integer(8, 1).real(9, z).object(2, 7, placement);

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Une page : ses nœuds, ses flux (`<stockage>.io`), ses ressources et images (conteneur racine).
function buildPage(page, i, root) {
  const base = (i + 1) * 1000;
  const node = base + 3;
  const children = [];
  const streams = [];
  let rid = base + 500;
  const add = (type, obj) => {
    const k = children.length;
    if (k >= MAX_OBJECTS) throw new RangeError(`makeFlipchart : plus de ${MAX_OBJECTS} objets sur la page ${i + 1}`);
    const child = { id: base + 10 + 2 * k, type, storage: base + 11 + 2 * k };
    children.push(child);
    streams.push({ name: `${child.storage}.io`, data: obj(child.storage, k + 1).stream(), compressed: true });
    return child;
  };
  const resource = (list, obj, dataFile = "") => {
    const id = rid;
    rid += 1;
    root.resources.push({ name: `${id}.ir`, data: obj(id).stream(), compressed: true });
    list.push({ id, entry: `${id}.ir`, dataFile });
    return id;
  };

  for (const s of page.strokes ?? []) {
    const id = resource(root.registry.strokes, (r) => new Obj(4, r).points(4, s.points));
    add(3, (storage, z) => {
      const pen = new Obj(20, 0).integer(2, 0).real(3, s.width ?? 2).integer(5, 32).color(7, s.color ?? BLACK);
      return item(3, storage, "trait", z, place(0, 0)).object(10, 6, pen).integer(38, 0).integer(39, id);
    });
  }
  for (const l of page.lines ?? []) {
    const id = resource(root.registry.lines, (r) => new Obj(6, r).points(4, l.points));
    add(5, (storage, z) =>
      item(5, storage, "ligne", z, place(0, 0))
        .object(10, 6, ink(l.width ?? 2, l.color ?? BLACK))
        .integer(38, id),
    );
  }
  for (const r of page.rects ?? []) {
    const box = [
      [0, 0],
      [r.w, 0],
      [r.w, r.h],
      [0, r.h],
    ];
    add(7, (storage, z) =>
      item(7, storage, "rectangle", z, place(r.x, r.y))
        .userRect(7, 0, 0, r.w, r.h)
        .object(10, 6, ink(1, BLACK, r.fill))
        .points(49, box),
    );
  }
  for (const t of page.texts ?? []) {
    let x = 0;
    let height = 0;
    const runs = t.runs.map((run) => {
      const size = run.size ?? 24;
      const w = run.text.length * size * 0.6;
      const o = new Obj(31, 0)
        .floatRect(2, x, 0, w, size * 1.5)
        .pointF(3, x, size * 1.2)
        .color(5, run.color ?? BLACK)
        .string(6, run.text)
        .string(7, "Arial")
        .real(8, size)
        .integer(9, run.bold ? 75 : 50);
      x += w;
      height = Math.max(height, size * 1.5);
      return o;
    });
    const html = `<p>${t.runs.map((run) => (run.bold ? `<b>${escapeHtml(run.text)}</b>` : escapeHtml(run.text))).join("")}</p>`;
    const id = resource(root.registry.texts, (r) => new Obj(12, r).runs(4, runs).string(5, html).integer(6, 2));
    add(11, (storage, z) =>
      item(11, storage, "texte", z, place(t.x, t.y))
        .userRect(7, 0, 0, x, height)
        .integer(38, id),
    );
  }
  for (const img of page.images ?? []) {
    if (root.images.some((e) => e.name === img.name)) throw new Error(`makeFlipchart : image en double : ${img.name}`);
    const id = resource(root.registry.images, (r) => new Obj(10, r).string(3, img.name).size(5, img.w, img.h), img.name);
    root.images.push({ name: img.name, data: img.bytes, compressed: false });
    add(9, (storage, z) =>
      item(9, storage, img.name, z, place(img.x, img.y))
        .userRect(7, 0, 0, img.w, img.h)
        .integer(38, id),
    );
  }
  // Actions sur objet (genre 28, commande 184 « masquer ») : visent le premier objet, suivent le dernier.
  const target = children[0];
  for (let a = 0; a < (page.actions ?? 0); a += 1) {
    add(28, (storage) =>
      new Obj(28, storage)
        .pointer(2, target?.id ?? 0, target?.storage ?? 0, target?.type ?? 0)
        .integer(5, 184),
    );
  }

  const inner = [
    { name: `${node}.in`, data: index({ id: node, type: 2, storage: node - 1, children }), compressed: true },
    { name: `${node - 1}.io`, data: new Obj(2, node - 1).sizeF(6, 1024, 768).owner(node).stream(), compressed: true },
    ...streams,
  ];
  return { node, inner };
}

// Page minimale (nœud et objet de page), pour le `.fpg` imbriqué.
const bareSheet = (node) => [
  { name: `${node}.in`, data: index({ id: node, type: 2, storage: node - 1 }), compressed: true },
  { name: `${node - 1}.io`, data: new Obj(2, node - 1).sizeF(6, 1024, 768).stream(), compressed: true },
];

export function makeFlipchart(pages, deflate, opts = {}) {
  const lie = opts.lie;
  let lied = false;
  // Taille mensongère : taille annoncée et en-tête qCompress (si compressée) posés ensemble.
  const mark = (entries) =>
    entries.map((e) => {
      if (lie === undefined || e.name !== lie.entry) return e;
      lied = true;
      return { ...e, announced: lie.announced, header: e.compressed ? lie.announced : undefined };
    });

  const root = { resources: [], images: [], registry: { strokes: [], lines: [], texts: [], images: [] } };
  const sheets = pages.map((page, i) => buildPage(page, i, root));
  const fpg = sheets.map(({ node, inner }, i) => {
    const entries = [...inner];
    if (opts.nestFpg && i === 0) {
      const nested = (pages.length + 1) * 1000 + 3;
      entries.push({ name: `${nested}.fpg`, data: container(mark(bareSheet(nested)), deflate), compressed: true });
    }
    return { name: `${node}.fpg`, data: container(mark(entries), deflate), compressed: true };
  });

  const registry = new Obj(16, 0);
  const lists = [
    [5, root.registry.strokes],
    [6, root.registry.images],
    [7, root.registry.lines],
    [9, root.registry.texts],
  ];
  for (const [id, list] of lists) if (list.length > 0) registry.resources(id, list);
  const doc = new Obj(1, 100).string(12, "Essai synthétique").sizeF(18, 1024, 768);
  if (lists.some(([, list]) => list.length > 0)) doc.object(7, 4, registry);
  doc.owner(101);

  const pageNodes = sheets.map(({ node }) => ({ id: node, type: 2, storage: node - 1 }));
  const entries = [
    { name: "101.in", data: index({ id: 101, type: 1, storage: 100, children: pageNodes }), compressed: true },
    { name: "100.io", data: doc.stream(), compressed: true },
    ...fpg,
    ...root.resources,
    ...root.images,
  ];
  for (let k = 0; k < (opts.extraEntries ?? 0); k += 1) {
    entries.push({ name: `extra-${k}.bin`, data: new Uint8Array(0), compressed: false, bare: true });
  }
  const marked = mark(entries);
  if (opts.oddUtf16 && marked[0] !== undefined) marked[0] = { ...marked[0], oddName: true };
  if (lie !== undefined && !lied) throw new Error(`makeFlipchart : entrée à mentir absente : ${lie.entry}`);
  return container(marked, deflate);
}
