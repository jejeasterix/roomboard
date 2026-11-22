//! Flux d'objets Qt d'un `.flipchart` (entrées `.io` et `.ir`) : en-tête « Bamboo », puis un objet dont les
//! propriétés sont des variantes Qt numérotées. Porté d'ActCraft (même auteur, U39, 0246), `objectstream.cpp`.
//!
//! Bornes (N13) : toute longueur lue est comparée aux octets restants avant d'allouer ; l'imbrication est bornée
//! à [`MAX_NESTING`] ; au-delà, l'objet devient [`Value::Skipped`] et son contenu est parcouru sans récursion pour
//! compter les objets sautés.

/// Objets et listes gardés jusqu'à cette profondeur (ActCraft `kMaxNesting`) ; plus profond : [`Value::Skipped`].
pub(crate) const MAX_NESTING: usize = 32;

/// Objet d'un flux : sorte (`flipchart::ids`), stockage, propriétés par numéro dans l'ordre du flux.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct StreamObject {
    pub class: u16,
    pub id: u32,
    pub fields: Vec<(u16, Value)>,
}

/// Valeur d'une propriété. Registre de ressources : `List` de `List [Int numéro, Str entrée, Str fichier,
/// Str empreinte, Int références]` ; liste de traits : `List` de `Polyline` ; pointeur : numéro du nœud visé.
#[derive(Clone, Debug, PartialEq)]
pub(crate) enum Value {
    Int(i64),
    Num(f64),
    Bool(bool),
    Str(String),
    Bytes(Vec<u8>),
    Point(f64, f64),
    Size(f64, f64),
    Rect(f64, f64, f64, f64),
    Color(u8, u8, u8, u8),
    Pointer(u32),
    Object(Box<StreamObject>),
    List(Vec<Value>),
    Polyline(Vec<[f32; 2]>),
    Skipped,
}

/// Ce que la lecture a laissé de côté.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct Stats {
    /// Objets plus profonds que [`MAX_NESTING`], non gardés.
    pub skipped_deep: u32,
}

impl StreamObject {
    /// Propriété `id` ; de deux numéros égaux, le dernier l'emporte (comme la table d'ActCraft).
    pub(crate) fn find(&self, id: u16) -> Option<&Value> {
        self.fields.iter().rev().find(|(k, _)| *k == id).map(|(_, v)| v)
    }
}

impl Value {
    /// Booléen, entier ou réel.
    pub(crate) fn as_number(&self) -> Option<f64> {
        match *self {
            Value::Bool(b) => Some(if b { 1.0 } else { 0.0 }),
            Value::Int(i) => Some(i as f64),
            Value::Num(n) => Some(n),
            _ => None,
        }
    }
    /// Booléen, ou nombre non nul.
    pub(crate) fn as_bool(&self) -> Option<bool> {
        match *self {
            Value::Bool(b) => Some(b),
            _ => self.as_number().map(|n| n != 0.0),
        }
    }
    pub(crate) fn as_str(&self) -> Option<&str> {
        match self {
            Value::Str(s) => Some(s),
            _ => None,
        }
    }
    pub(crate) fn as_point(&self) -> Option<(f64, f64)> {
        match *self {
            Value::Point(x, y) => Some((x, y)),
            _ => None,
        }
    }
    pub(crate) fn as_size(&self) -> Option<(f64, f64)> {
        match *self {
            Value::Size(w, h) => Some((w, h)),
            _ => None,
        }
    }
    pub(crate) fn as_rect(&self) -> Option<(f64, f64, f64, f64)> {
        match *self {
            Value::Rect(x, y, w, h) => Some((x, y, w, h)),
            _ => None,
        }
    }
    pub(crate) fn as_color(&self) -> Option<(u8, u8, u8, u8)> {
        match *self {
            Value::Color(r, g, b, a) => Some((r, g, b, a)),
            _ => None,
        }
    }
    pub(crate) fn as_pointer(&self) -> Option<u32> {
        match *self {
            Value::Pointer(node) => Some(node),
            _ => None,
        }
    }
    /// Objet embarqué (un seul) ou objets d'une liste.
    pub(crate) fn as_objects(&self) -> Vec<&StreamObject> {
        match self {
            Value::Object(o) => vec![o],
            Value::List(items) => items
                .iter()
                .filter_map(|v| match v {
                    Value::Object(o) => Some(&**o),
                    _ => None,
                })
                .collect(),
            _ => Vec::new(),
        }
    }
    /// Un trait (sous-type 1) ou les traits d'une liste (sous-type 2).
    pub(crate) fn as_polylines(&self) -> Vec<&[[f32; 2]]> {
        match self {
            Value::Polyline(p) => vec![p],
            Value::List(items) => items
                .iter()
                .filter_map(|v| match v {
                    Value::Polyline(p) => Some(p.as_slice()),
                    _ => None,
                })
                .collect(),
            _ => Vec::new(),
        }
    }
}

/// Curseur borné sur `[pos, end)` d'une donnée ; chaque lecture impossible est une erreur.
#[derive(Clone)]
pub(super) struct Reader<'a> {
    data: &'a [u8],
    pos: usize,
    end: usize,
}

impl<'a> Reader<'a> {
    pub(super) fn new(data: &'a [u8], pos: usize, end: usize) -> Self {
        let end = end.min(data.len());
        Reader { data, pos: pos.min(end), end }
    }
}

/// Lit un fichier `.io` ou `.ir`.
pub(crate) fn parse_object_stream(data: &[u8]) -> Result<StreamObject, String> {
    parse_object_stream_with_stats(data).map(|(object, _)| object)
}

/// Lit un fichier `.io` ou `.ir` et dit ce qui a été laissé de côté.
pub(crate) fn parse_object_stream_with_stats(data: &[u8]) -> Result<(StreamObject, Stats), String> {
    let _ = Reader::new(data, 0, data.len());
    Err(String::from("flux d'objets : lecteur à écrire"))
}

/// Sonde d'allocation des tests : plus grande allocation demandée par le fil courant.
#[cfg(test)]
mod probe {
    use std::alloc::{GlobalAlloc, Layout, System};
    use std::cell::Cell;

    thread_local! {
        static LARGEST: Cell<usize> = const { Cell::new(0) };
    }

    fn note(size: usize) {
        let _ = LARGEST.try_with(|l| {
            if size > l.get() {
                l.set(size);
            }
        });
    }

    struct Probe;

    // SAFETY : tout est délégué à `System` ; la sonde ne fait que noter la taille dans une cellule du fil, sans
    // allouer (`thread_local` constant, sans destructeur).
    unsafe impl GlobalAlloc for Probe {
        unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
            note(layout.size());
            unsafe { System.alloc(layout) }
        }
        unsafe fn alloc_zeroed(&self, layout: Layout) -> *mut u8 {
            note(layout.size());
            unsafe { System.alloc_zeroed(layout) }
        }
        unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
            unsafe { System.dealloc(ptr, layout) }
        }
        unsafe fn realloc(&self, ptr: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
            note(new_size);
            unsafe { System.realloc(ptr, layout, new_size) }
        }
    }

    #[global_allocator]
    static PROBE: Probe = Probe;

    /// Résultat de `f` et plus grande allocation demandée par ce fil pendant son appel.
    pub(super) fn largest_allocation<T>(f: impl FnOnce() -> T) -> (T, usize) {
        LARGEST.with(|l| l.set(0));
        let out = f();
        (out, LARGEST.with(Cell::get))
    }
}

#[cfg(test)]
mod tests {
    use super::super::ids;
    use super::super::writer::{Bytes, Obj};
    use super::*;

    fn parse(o: &Obj) -> StreamObject {
        parse_object_stream(&o.stream()).expect("flux valide")
    }

    fn int(k: u32) -> i32 {
        i32::try_from(k).unwrap_or(i32::MAX)
    }

    /// `inner` enveloppé dans `levels` objets, chacun le portant en propriété 2 ; le niveau k porte k en propriété 1.
    fn wrap(inner: Obj, levels: u32) -> Obj {
        (1..=levels).rev().fold(inner, |o, k| Obj::new(ids::GROUP, k).integer(1, int(k)).object(2, 4, &o))
    }

    /// Chaîne de `levels` objets imbriqués (la racine est le niveau 1).
    fn chain(levels: u32) -> Obj {
        wrap(Obj::new(ids::GROUP, levels).integer(1, int(levels)), levels - 1)
    }

    /// `levels` objets imbriqués écrits en une passe, sans recopier l'intérieur à chaque niveau : l'objet vide fait
    /// 14 octets, chaque enveloppe en ajoute 26 (en-tête 16, enregistrement 8, fin 2).
    fn deep_chain_stream(levels: usize) -> Vec<u8> {
        let mut b = Bytes::default().raw(b" Bamboo ").u16(1).u16(7);
        for k in 0..levels - 1 {
            let inner = 14 + 26 * (levels - 2 - k);
            let record = u32::try_from(8 + inner).unwrap_or(u32::MAX);
            b = b.tag(b'O').u16(ids::GROUP).u32(0).tag(b'M').u32(1).u32(record);
            b = b.tag(b'm').tag(b'P').u16(2).u16(127).u16(4);
        }
        b = b.tag(b'O').u16(ids::GROUP).u32(0).tag(b'M').u32(0).tag(b'p').tag(b'o');
        for _ in 0..levels - 1 {
            b = b.tag(b'p').tag(b'o');
        }
        b.0
    }

    #[test]
    fn stream_reads_header_and_one_object() {
        let o = Obj::new(ids::STROKE, 1009)
            .integer(1, -5)
            .uinteger(2, 4_000_000_000)
            .real(3, 1.5)
            .boolean(4, true)
            .owner(1010);
        let s = parse(&o);
        assert_eq!((s.class, s.id), (ids::STROKE, 1009));
        assert_eq!(s.fields.iter().map(|(k, _)| *k).collect::<Vec<_>>(), vec![1, 2, 3, 4]);
        assert_eq!(s.find(1), Some(&Value::Int(-5)));
        assert_eq!(s.find(2).and_then(Value::as_number), Some(4_000_000_000.0));
        assert_eq!(s.find(3).and_then(Value::as_number), Some(1.5));
        assert_eq!(s.find(4).and_then(Value::as_bool), Some(true));
        assert_eq!(s.find(4).and_then(Value::as_number), Some(1.0));
        assert_eq!(s.find(1).and_then(Value::as_bool), Some(true));
        assert_eq!(s.find(9), None);

        // Objet sans propriété ; sa fin d'objet absente est tolérée (ActCraft).
        let bare = Obj::new(ids::PAGE, 7).stream();
        let s = parse_object_stream(&bare).expect("objet vide");
        assert_eq!((s.class, s.id, s.fields.len()), (ids::PAGE, 7, 0));
        assert!(parse_object_stream(&bare[..bare.len() - 2]).is_ok());

        // De deux numéros égaux, le dernier l'emporte.
        let dup = parse(&Obj::new(ids::STROKE, 1).integer(1, 1).integer(1, 2));
        assert_eq!(dup.find(1), Some(&Value::Int(2)));

        let mut bad = o.stream();
        bad[1] = b'X';
        assert!(parse_object_stream(&bad).unwrap_err().contains("signature"));
        assert!(parse_object_stream(b" Bamboo ").is_err());
        assert!(parse_object_stream(b"").is_err());
    }

    #[test]
    fn stream_reads_points_colors_rects_and_strings() {
        let run = Obj::new(40, 0).string(1, "a");
        let o = Obj::new(ids::TEXT, 5)
            .points(1, &[(1.0, 2.0), (3.5, -4.0)])
            .polygons(2, &[&[(0.0, 0.0), (10.0, 0.0)], &[(5.0, 5.0)]])
            .color(3, 10, 20, 30, 128)
            .float_rect(4, 1.0, 2.0, 30.0, 40.0)
            .rect(5, -1, 2, 3, 4)
            .user_rect(6, 0.5, 0.25, 8.0, 9.0)
            .string(7, "Été 𝄞 ✓")
            .string_list(8, &["un", "deux"])
            .bytes(9, &[1, 2, 3])
            .size(10, 1024, 768)
            .size_f(11, 2.5, 3.5)
            .point(12, -1.5, 7.0)
            .pointer(13, 1011, 1012, ids::GROUP)
            .objects(14, &[run.clone(), run])
            .object(15, 4, &Obj::new(15, 0).real(1, 2.0))
            .resources(16, &[(165, "165.ir", "115.png", "abc", 2)])
            .raw(17, Bytes::default().u16(10).u16(1).u32(0xFFFF_FFFF))
            .raw(18, Bytes::default().u16(15).u8(9).u8(5).u8(7))
            .raw(19, Bytes::default().u16(16).u16(2024).u8(3).u8(4).u8(5).u8(6).u8(7))
            .raw(20, Bytes::default().u16(9).i32(2).u16(2).i32(4).u16(10).str16("x"));
        let s = parse(&o);

        let one: &[[f32; 2]] = &[[1.0, 2.0], [3.5, -4.0]];
        assert_eq!(s.find(1).map(Value::as_polylines), Some(vec![one]));
        let (a, b): (&[[f32; 2]], &[[f32; 2]]) = (&[[0.0, 0.0], [10.0, 0.0]], &[[5.0, 5.0]]);
        assert_eq!(s.find(2).map(Value::as_polylines), Some(vec![a, b]));
        assert_eq!(s.find(3).and_then(Value::as_color), Some((10, 20, 30, 128)));
        assert_eq!(s.find(4).and_then(Value::as_rect), Some((1.0, 2.0, 30.0, 40.0)));
        assert_eq!(s.find(5).and_then(Value::as_rect), Some((-1.0, 2.0, 3.0, 4.0)));
        assert_eq!(s.find(6).and_then(Value::as_rect), Some((0.5, 0.25, 8.0, 9.0)));
        assert_eq!(s.find(7).and_then(Value::as_str), Some("Été 𝄞 ✓"));
        let words = vec![Value::Str("un".into()), Value::Str("deux".into())];
        assert_eq!(s.find(8), Some(&Value::List(words)));
        assert_eq!(s.find(9), Some(&Value::Bytes(vec![1, 2, 3])));
        assert_eq!(s.find(10).and_then(Value::as_size), Some((1024.0, 768.0)));
        assert_eq!(s.find(11).and_then(Value::as_size), Some((2.5, 3.5)));
        assert_eq!(s.find(12).and_then(Value::as_point), Some((-1.5, 7.0)));
        assert_eq!(s.find(13).and_then(Value::as_pointer), Some(1011));
        let runs = s.find(14).map(Value::as_objects).unwrap_or_default();
        assert_eq!(runs.len(), 2);
        assert_eq!(runs[1].find(1).and_then(Value::as_str), Some("a"));
        let placed = s.find(15).map(Value::as_objects).unwrap_or_default();
        assert_eq!(placed.len(), 1);
        assert_eq!((placed[0].class, placed[0].find(1).and_then(Value::as_number)), (15, Some(2.0)));
        let item = Value::List(vec![
            Value::Int(165),
            Value::Str("165.ir".into()),
            Value::Str("115.png".into()),
            Value::Str("abc".into()),
            Value::Int(2),
        ]);
        assert_eq!(s.find(16), Some(&Value::List(vec![item])));
        assert_eq!(s.find(17).and_then(Value::as_str), Some(""));
        assert_eq!(s.find(18).and_then(Value::as_str), Some("09:05:07"));
        assert_eq!(s.find(19).and_then(Value::as_str), Some("2024-03-04T05:06:07"));
        assert_eq!(s.find(20), Some(&Value::List(vec![Value::Int(4), Value::Str("x".into())])));

        // Accesseurs tolérants : une valeur d'un autre type ne rend rien.
        assert_eq!(s.find(7).and_then(Value::as_number), None);
        assert_eq!(s.find(3).and_then(Value::as_rect), None);
        assert!(s.find(3).map(Value::as_objects).unwrap_or_default().is_empty());
        assert!(s.find(7).map(Value::as_polylines).unwrap_or_default().is_empty());
    }

    /// S5 : une longueur annoncée de 0xFFFFFFF0 (ou un compte de 0x7FFFFFF0) dans un flux de quelques dizaines
    /// d'octets est refusée avant toute allocation à sa mesure.
    #[test]
    fn stream_lying_length_is_an_error_without_allocation() {
        const LIE: u32 = 0xFFFF_FFF0;
        const COUNT: i32 = 0x7FFF_FFF0;
        let pad = [0u8; 16];
        let prop = |variant: Bytes| Obj::new(ids::STROKE, 1).raw(1, variant.raw(&pad)).stream();
        let head = || Bytes::default().raw(b" Bamboo ").u16(1).u16(7).tag(b'O').u16(3).u32(1).tag(b'M');
        let lies: Vec<(&str, Vec<u8>)> = vec![
            ("octets", prop(Bytes::default().u16(12).u32(LIE))),
            ("chaîne", prop(Bytes::default().u16(10).u16(1).u32(LIE))),
            ("points", prop(Bytes::default().u16(127).u16(1).i32(4).u32(LIE))),
            ("liste négative", prop(Bytes::default().u16(9).u32(LIE))),
            ("liste", prop(Bytes::default().u16(9).i32(COUNT))),
            ("chaînes", prop(Bytes::default().u16(11).u16(1).i32(COUNT))),
            ("traits", prop(Bytes::default().u16(127).u16(2).i32(COUNT))),
            ("ressources", prop(Bytes::default().u16(127).u16(3).i32(COUNT))),
            ("objets", prop(Bytes::default().u16(127).u16(10).i32(COUNT))),
            ("propriétés", head().u32(LIE).raw(&pad).0),
            ("enregistrement", head().u32(1).u32(LIE).raw(&pad).0),
        ];
        // La sonde voit bien une allocation faite d'après une longueur lue (le patron refusé).
        let (_, seen) = probe::largest_allocation(|| Vec::<u8>::with_capacity(LIE as usize >> 12));
        assert!(seen >= LIE as usize >> 12, "sonde aveugle : {seen}");
        for (what, data) in lies {
            let (result, largest) = probe::largest_allocation(|| parse_object_stream(&data));
            assert!(result.is_err(), "{what} : longueur mensongère acceptée");
            assert!(largest < 64 * 1024, "{what} : {largest} octets alloués avant le contrôle");
        }
    }

    /// S5 : 40 objets imbriqués ; les 32 premiers sont gardés, les objets 33 à 40 sautés et comptés.
    #[test]
    fn stream_nesting_beyond_32_is_skipped() {
        let (root, stats) = parse_object_stream_with_stats(&chain(40).stream()).expect("flux valide");
        let mut level = &root;
        for k in 1..32u32 {
            assert_eq!(level.find(1).and_then(Value::as_number), Some(f64::from(k)));
            let next = level.find(2).map(Value::as_objects).unwrap_or_default();
            assert_eq!(next.len(), 1, "niveau {k}");
            level = next[0];
        }
        assert_eq!(level.find(1).and_then(Value::as_number), Some(32.0));
        assert_eq!(level.find(2), Some(&Value::Skipped));
        assert_eq!(stats.skipped_deep, 8);

        let (_, stats) = parse_object_stream_with_stats(&chain(32).stream()).expect("flux valide");
        assert_eq!(stats.skipped_deep, 0);
        assert_eq!(parse_object_stream_with_stats(&deep_chain_stream(40)).map(|(_, s)| s.skipped_deep), Ok(8));

        // Une liste d'objets trop profonde est sautée en entier, ses objets comptés.
        let runs = Obj::new(ids::TEXT, 0).objects(1, &[Obj::new(40, 0), Obj::new(40, 0), Obj::new(40, 0)]);
        let (_, stats) = parse_object_stream_with_stats(&wrap(runs, 31).stream()).expect("flux valide");
        assert_eq!(stats.skipped_deep, 3);
    }

    /// S5 : une imbrication hostile (200 000 objets, 200 000 listes) ne fait ni récursion profonde ni débordement de
    /// pile : le contenu sauté est parcouru sans récursion.
    #[test]
    fn stream_hostile_nesting_neither_recurses_nor_overflows() {
        let levels = 200_000;
        let (_, stats) = parse_object_stream_with_stats(&deep_chain_stream(levels)).expect("flux valide");
        assert_eq!(stats.skipped_deep, u32::try_from(levels - MAX_NESTING).unwrap_or(0));

        let mut list = Bytes::default();
        for _ in 0..levels {
            list = list.u16(9).i32(1);
        }
        list = list.u16(127).u16(4).raw(&Obj::new(ids::STROKE, 0).integer(1, 1).body());
        let (o, stats) = parse_object_stream_with_stats(&Obj::new(ids::STROKE, 1).raw(1, list).stream())
            .expect("flux valide");
        assert_eq!(stats.skipped_deep, 1);
        let (mut v, mut depth) = (o.find(1), 0);
        while let Some(Value::List(items)) = v {
            depth += 1;
            v = items.first();
        }
        assert_eq!((v, depth), (Some(&Value::Skipped), MAX_NESTING - 1));
    }

    /// S5 : une chaîne UTF-16 de longueur impaire est refusée ; une demi-paire isolée est remplacée.
    #[test]
    fn stream_odd_utf16_is_an_error() {
        let odd = |variant: Bytes| parse_object_stream(&Obj::new(ids::TEXT, 1).raw(1, variant).stream());
        assert!(odd(Bytes::default().u16(10).u16(1).u32(3).raw(b"a\0b")).unwrap_err().contains("impaire"));
        assert!(odd(Bytes::default().u16(11).u16(1).i32(1).u32(5).raw(&[0; 5])).is_err());
        let resource = Bytes::default().u16(127).u16(3).i32(1).u32(1).u16(1).u32(1).raw(&[0; 30]);
        assert!(odd(resource).is_err());
        let lone = odd(Bytes::default().u16(10).u16(1).u32(2).u16(0xD800)).expect("demi-paire");
        assert_eq!(lone.find(1).and_then(Value::as_str), Some("\u{FFFD}"));
    }

    #[test]
    fn stream_truncated_is_an_error() {
        let full = Obj::new(ids::TEXT, 5)
            .string(1, "texte")
            .points(2, &[(1.0, 2.0)])
            .objects(3, &[Obj::new(40, 0).integer(1, 1)])
            .owner(9)
            .stream();
        assert!(parse_object_stream(&full).is_ok());
        // Fin d'objet : 'p' 'R' u32 'r' 'o' (8 octets).
        let records_end = full.len() - 8;
        for cut in 0..records_end {
            assert!(parse_object_stream(&full[..cut]).is_err(), "coupure à {cut}");
        }
        assert!(parse_object_stream(&full[..records_end + 3]).is_err());
        assert!(parse_object_stream(&full[..records_end]).is_ok());
    }

    #[test]
    fn stream_unknown_value_tag_is_an_error() {
        let unknown = [
            Bytes::default().u16(0x77).u32(0),
            Bytes::default().u16(127).u16(99).u32(0),
            Bytes::default().u16(9).i32(1).u16(0x77).u32(0),
        ];
        for variant in unknown {
            let data = Obj::new(ids::STROKE, 1).integer(1, 1).raw(2, variant).stream();
            assert!(parse_object_stream(&data).unwrap_err().contains("inconnu"));
        }
        // Aussi dans un objet sauté : son contenu est parcouru, pas ignoré à l'aveugle.
        let deep = wrap(Obj::new(ids::STROKE, 0).raw(1, Bytes::default().u16(0x77)), 33);
        assert!(parse_object_stream(&deep.stream()).unwrap_err().contains("inconnu"));
    }

    /// Aucune panique sur une entrée hostile : chaque octet d'un flux riche, remplacé par des valeurs extrêmes.
    #[test]
    fn stream_never_panics_on_mutated_bytes() {
        let rich = wrap(
            Obj::new(ids::TEXT, 5)
                .string(1, "texte")
                .points(2, &[(1.0, 2.0)])
                .polygons(3, &[&[(0.0, 1.0)]])
                .resources(4, &[(1, "1.ir", "1.png", "d", 1)])
                .objects(5, &[Obj::new(40, 0).color(1, 1, 2, 3, 4)])
                .string_list(6, &["a"])
                .raw(7, Bytes::default().u16(9).i32(1).u16(6).f64(1.0))
                .owner(3),
            31,
        )
        .stream();
        assert!(parse_object_stream(&rich).is_ok());
        for i in 0..rich.len() {
            for v in [0x00, 0x01, 0x7F, 0x80, 0xFE, 0xFF] {
                let mut data = rich.clone();
                data[i] = v;
                let _ = parse_object_stream_with_stats(&data);
            }
        }
    }
}
