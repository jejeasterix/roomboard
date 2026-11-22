//! Lecteur `.flipchart` (C13 lot 3, N12, N13, DA5) : flux d'objets Qt des entrées `.io` et `.ir`, index « culm »
//! de l'entrée `.in`, numéros des sortes d'objets. Porté d'ActCraft (même auteur, U39, 0246). Ni ZIP, ni Bamboo, ni
//! zlib ici : ces lecteurs reçoivent les octets déjà extraits.

pub(crate) mod ids;
pub(crate) mod index;
mod read;
pub(crate) mod stream;

pub use read::read;

/// Écrivain minimal du flux d'objets et de l'index, sur la forme de `flipchartwriter.h` d'ActCraft (tests seuls).
#[cfg(test)]
pub(crate) mod writer {
    /// Octets petit-boutistes, à la chaîne.
    #[derive(Clone, Default)]
    pub(crate) struct Bytes(pub(crate) Vec<u8>);

    impl Bytes {
        pub(crate) fn raw(mut self, bytes: &[u8]) -> Self {
            self.0.extend_from_slice(bytes);
            self
        }
        pub(crate) fn tag(self, c: u8) -> Self {
            self.raw(&[c])
        }
        pub(crate) fn u8(self, v: u8) -> Self {
            self.raw(&[v])
        }
        pub(crate) fn u16(self, v: u16) -> Self {
            self.raw(&v.to_le_bytes())
        }
        pub(crate) fn u32(self, v: u32) -> Self {
            self.raw(&v.to_le_bytes())
        }
        pub(crate) fn i32(self, v: i32) -> Self {
            self.raw(&v.to_le_bytes())
        }
        pub(crate) fn f64(self, v: f64) -> Self {
            self.raw(&v.to_le_bytes())
        }
        /// QString : u32 = longueur en octets, puis UTF-16LE.
        pub(crate) fn qstr(self, s: &str) -> Self {
            let units: Vec<u16> = s.encode_utf16().collect();
            let mut b = self.u32(u32::try_from(units.len() * 2).unwrap_or(u32::MAX));
            for u in units {
                b = b.u16(u);
            }
            b
        }
        /// Chaîne d'une variante : u16 = 1 puis QString.
        pub(crate) fn str16(self, s: &str) -> Self {
            self.u16(1).qstr(s)
        }
        fn points(self, pts: &[(f64, f64)]) -> Self {
            let mut doubles = Bytes::default();
            for &(x, y) in pts {
                doubles = doubles.f64(x).f64(y);
            }
            self.u32(len32(&doubles.0)).raw(&doubles.0)
        }
    }

    fn len32(v: &[u8]) -> u32 {
        u32::try_from(v.len()).unwrap_or(u32::MAX)
    }

    /// Objet d'un flux : sorte, stockage, propriétés (numéro, variante brute), nœud propriétaire.
    #[derive(Clone)]
    pub(crate) struct Obj {
        class: u16,
        storage: u32,
        props: Vec<(u16, Vec<u8>)>,
        owner: Option<u32>,
    }

    impl Obj {
        pub(crate) fn new(class: u16, storage: u32) -> Self {
            Obj {
                class,
                storage,
                props: Vec::new(),
                owner: None,
            }
        }
        /// Variante quelconque (type et octets donnés) : types inconnus, valeurs mensongères.
        pub(crate) fn raw(mut self, id: u16, variant: Bytes) -> Self {
            self.props.push((id, variant.0));
            self
        }
        pub(crate) fn boolean(self, id: u16, v: bool) -> Self {
            self.raw(id, Bytes::default().u16(1).u8(u8::from(v)))
        }
        pub(crate) fn integer(self, id: u16, v: i32) -> Self {
            self.raw(id, Bytes::default().u16(2).i32(v))
        }
        pub(crate) fn uinteger(self, id: u16, v: u32) -> Self {
            self.raw(id, Bytes::default().u16(3).u32(v))
        }
        pub(crate) fn real(self, id: u16, v: f64) -> Self {
            self.raw(id, Bytes::default().u16(6).f64(v))
        }
        pub(crate) fn string(self, id: u16, v: &str) -> Self {
            self.raw(id, Bytes::default().u16(10).str16(v))
        }
        pub(crate) fn string_list(self, id: u16, v: &[&str]) -> Self {
            let mut b = Bytes::default()
                .u16(11)
                .u16(1)
                .i32(i32::try_from(v.len()).unwrap_or(i32::MAX));
            for s in v {
                b = b.qstr(s);
            }
            self.raw(id, b)
        }
        pub(crate) fn bytes(self, id: u16, v: &[u8]) -> Self {
            self.raw(id, Bytes::default().u16(12).u32(len32(v)).raw(v))
        }
        pub(crate) fn rect(self, id: u16, x: i32, y: i32, w: i32, h: i32) -> Self {
            self.raw(id, Bytes::default().u16(19).i32(x).i32(y).i32(w).i32(h))
        }
        pub(crate) fn float_rect(self, id: u16, x: f64, y: f64, w: f64, h: f64) -> Self {
            self.raw(id, Bytes::default().u16(20).f64(x).f64(y).f64(w).f64(h))
        }
        pub(crate) fn size(self, id: u16, w: i32, h: i32) -> Self {
            self.raw(id, Bytes::default().u16(21).i32(w).i32(h))
        }
        pub(crate) fn size_f(self, id: u16, w: f64, h: f64) -> Self {
            self.raw(id, Bytes::default().u16(22).f64(w).f64(h))
        }
        pub(crate) fn point(self, id: u16, x: f64, y: f64) -> Self {
            self.raw(id, Bytes::default().u16(26).f64(x).f64(y))
        }
        pub(crate) fn color(self, id: u16, r: u8, g: u8, b: u8, a: u8) -> Self {
            self.raw(id, Bytes::default().u16(67).u8(r).u8(g).u8(b).u8(a))
        }
        pub(crate) fn points(self, id: u16, pts: &[(f64, f64)]) -> Self {
            let n = i32::try_from(pts.len()).unwrap_or(i32::MAX);
            self.raw(id, Bytes::default().u16(127).u16(1).i32(n).points(pts))
        }
        pub(crate) fn polygons(self, id: u16, polys: &[&[(f64, f64)]]) -> Self {
            let mut b = Bytes::default()
                .u16(127)
                .u16(2)
                .i32(i32::try_from(polys.len()).unwrap_or(i32::MAX));
            for poly in polys {
                b = b
                    .i32(i32::try_from(poly.len()).unwrap_or(i32::MAX))
                    .points(poly);
            }
            self.raw(id, b)
        }
        /// Registre de ressources (sous-type 3) : (numéro, entrée, fichier, empreinte, références).
        pub(crate) fn resources(self, id: u16, items: &[(u32, &str, &str, &str, u32)]) -> Self {
            let mut b = Bytes::default()
                .u16(127)
                .u16(3)
                .i32(i32::try_from(items.len()).unwrap_or(i32::MAX));
            for &(rid, entry, file, digest, refs) in items {
                b = b.u32(rid).str16(entry).str16(file).str16(digest).u32(refs);
            }
            self.raw(id, b)
        }
        /// Objet embarqué (sous-types 4, 6, 7, 8, 12, 14, 18).
        pub(crate) fn object(self, id: u16, subtype: u16, inner: &Obj) -> Self {
            self.raw(
                id,
                Bytes::default().u16(127).u16(subtype).raw(&inner.body()),
            )
        }
        pub(crate) fn user_rect(self, id: u16, x: f64, y: f64, w: f64, h: f64) -> Self {
            self.raw(
                id,
                Bytes::default().u16(127).u16(5).f64(x).f64(y).f64(w).f64(h),
            )
        }
        pub(crate) fn pointer(self, id: u16, node: u32, storage: u32, kind: u16) -> Self {
            self.raw(
                id,
                Bytes::default()
                    .u16(127)
                    .u16(9)
                    .u32(node)
                    .u32(storage)
                    .u16(kind),
            )
        }
        /// Liste d'objets (sous-type 10, segments d'un texte).
        pub(crate) fn objects(self, id: u16, list: &[Obj]) -> Self {
            let mut b = Bytes::default()
                .u16(127)
                .u16(10)
                .i32(i32::try_from(list.len()).unwrap_or(i32::MAX));
            for o in list {
                b = b.raw(&o.body());
            }
            self.raw(id, b)
        }
        pub(crate) fn owner(mut self, node: u32) -> Self {
            self.owner = Some(node);
            self
        }

        /// L'objet sans en-tête de flux (objet embarqué).
        pub(crate) fn body(&self) -> Vec<u8> {
            let records: Vec<Vec<u8>> = self
                .props
                .iter()
                .enumerate()
                .map(|(i, (id, variant))| {
                    Bytes::default()
                        .tag(if i == 0 { b'm' } else { b'p' })
                        .tag(b'P')
                        .u16(*id)
                        .raw(variant)
                        .0
                })
                .collect();
            let count = u32::try_from(records.len()).unwrap_or(u32::MAX);
            let mut b = Bytes::default()
                .tag(b'O')
                .u16(self.class)
                .u32(self.storage)
                .tag(b'M')
                .u32(count);
            for r in &records {
                b = b.u32(len32(r));
            }
            for r in &records {
                b = b.raw(r);
            }
            b = b.tag(b'p');
            if let Some(node) = self.owner {
                b = b.tag(b'R').u32(node).tag(b'r');
            }
            b.tag(b'o').0
        }
        /// Fichier `.io` ou `.ir` : en-tête de flux " Bamboo " u16 1 u16 7, puis l'objet.
        pub(crate) fn stream(&self) -> Vec<u8> {
            Bytes::default()
                .raw(b" Bamboo ")
                .u16(1)
                .u16(7)
                .raw(&self.body())
                .0
        }
    }

    /// Nœud de l'index « culm ».
    pub(crate) struct Node {
        pub(crate) id: u32,
        pub(crate) kind: u16,
        pub(crate) storage: u32,
        pub(crate) refs: Vec<u32>,
        pub(crate) children: Vec<Node>,
    }

    impl Node {
        pub(crate) fn new(
            id: u32,
            kind: u16,
            storage: u32,
            children: Vec<Node>,
            refs: Vec<u32>,
        ) -> Self {
            Node {
                id,
                kind,
                storage,
                refs,
                children,
            }
        }
        fn write(&self, mut b: Bytes) -> Bytes {
            b = b.tag(b'N').u32(self.id).u16(self.kind).u32(self.storage);
            for r in &self.refs {
                b = b.tag(b'S').u32(*r).tag(b's');
            }
            for c in &self.children {
                b = c.write(b);
            }
            b.tag(b'n')
        }
    }

    /// Entrée `.in` : en-tête « # culm # » u16 1 u16 7, puis l'arbre.
    pub(crate) fn index(root: &Node) -> Vec<u8> {
        root.write(Bytes::default().raw(b"# culm #").u16(1).u16(7))
            .0
    }
}
