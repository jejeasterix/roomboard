//! Lecture d'un `.flipchart` déjà extrait (C13 lot 3, N12, DA5) : document, pages, objets du niveau B, vers
//! `Vec<Page>` puis `board::encode`. Porté d'ActCraft (même auteur, U39, 0246), `flipchart.cpp`.

use crate::board::{BoardError, BoardList};

/// Lit les entrées `.in`, `.io`, `.ir` et `version` d'un `.flipchart` ; chemins de page `<page>.fpg/<nom>`.
pub fn read(entries: &[(&str, &[u8])], first_page: u32) -> Result<BoardList, BoardError> {
    let _ = (entries, first_page);
    Err(BoardError::Broken(String::from("lecteur à venir")))
}

#[cfg(test)]
mod tests {
    use super::super::ids;
    use super::super::writer::{index, Bytes, Node, Obj};
    use crate::board::{self, BoardError, BoardList, Item, Page, ShapeKind};
    use std::sync::mpsc;
    use std::time::Duration;

    // Numéros de propriétés de `flipchartids.h` d'ActCraft, recopiés ici sans passer par le lecteur.
    const DOC_RESOURCES: u16 = 7;
    const DOC_START_SIZE: u16 = 18;
    const PAGE_SIZE: u16 = 6;
    const PAGE_CURTAIN: u16 = 13;
    const PAGE_SPOT: u16 = 18;
    const PAGE_ORIGIN: u16 = 29;
    const ITEM_BOX: u16 = 7;
    const ITEM_LAYER: u16 = 8;
    const ITEM_DEPTH: u16 = 9;
    const ITEM_PEN: u16 = 10;
    const PEN_WIDTH: u16 = 3;
    const PEN_COLOR: u16 = 7;
    const PEN_FILL: u16 = 8;
    const PEN_TINT: u16 = 9;
    const FILL_SOURCE: u16 = 2;
    const FILL_STYLE: u16 = 3;
    const STROKE_POINTS: u16 = 39;
    const REF_38: u16 = 38;
    const RES_DATA: u16 = 4;
    const RES_MARKUP: u16 = 5;
    const RUN_BASELINE: u16 = 3;
    const RUN_COLOR: u16 = 5;
    const RUN_TEXT: u16 = 6;
    const RUN_FONT: u16 = 7;
    const RUN_SIZE: u16 = 8;
    const RUN_WEIGHT: u16 = 9;

    const DOC_NODE: u32 = 1;
    const DOC_STORAGE: u32 = 2;
    const PNG: &[u8] = b"\x89PNG\r\n\x1a\n\0\0\0\x0dIHDR";
    const TIFF: &[u8] = b"II*\0\x08\0\0\0";
    const EMF: &[u8] = &[1, 0, 0, 0, 0x6C, 0, 0, 0, 0, 0, 0, 0];

    /// Ressource : numéro, objet `.ir`, fichier de données de la racine éventuel.
    struct Res {
        id: u32,
        object: Obj,
        file: Option<(&'static str, Vec<u8>)>,
    }

    /// Points d'un trait ou d'une ligne.
    fn points(id: u32, pts: &[(f64, f64)]) -> Res {
        Res {
            id,
            object: Obj::new(0, id).points(RES_DATA, pts),
            file: None,
        }
    }

    /// Page fabriquée : nœud `node` (conteneur `<node>.fpg`), objet de page, nœuds enfants et leurs flux.
    struct Sheet {
        node: u32,
        page: Obj,
        kids: Vec<Node>,
        refs: Vec<u32>,
        streams: Vec<(u32, Vec<u8>)>,
    }

    impl Sheet {
        fn new(node: u32) -> Self {
            Sheet {
                node,
                page: Obj::new(ids::PAGE, node + 1).size_f(PAGE_SIZE, 1920.0, 1080.0),
                kids: Vec::new(),
                refs: Vec::new(),
                streams: Vec::new(),
            }
        }
        fn page(mut self, page: Obj) -> Self {
            self.page = page;
            self
        }
        /// Objet enfant de la page : nœud `id` de sorte `kind`, stockage `id + 50 000`.
        fn put(self, id: u32, kind: u16, o: Obj) -> Self {
            self.put_node(leaf(id, kind, id + 50_000), vec![(id + 50_000, o.stream())])
        }
        fn put_node(mut self, node: Node, streams: Vec<(u32, Vec<u8>)>) -> Self {
            self.refs.push(node.id);
            self.kids.push(node);
            self.streams.extend(streams);
            self
        }
    }

    fn leaf(id: u32, kind: u16, storage: u32) -> Node {
        Node::new(id, kind, storage, Vec::new(), Vec::new())
    }

    fn pen(rgb: (u8, u8, u8), width: f64) -> Obj {
        Obj::new(0, 0)
            .color(PEN_COLOR, rgb.0, rgb.1, rgb.2, 255)
            .real(PEN_WIDTH, width)
    }

    fn stroke(rid: u32, rgb: (u8, u8, u8)) -> Obj {
        Obj::new(ids::STROKE, 0)
            .object(ITEM_PEN, 4, &pen(rgb, 3.0))
            .integer(STROKE_POINTS, int(rid))
    }

    fn int(v: u32) -> i32 {
        i32::try_from(v).unwrap_or(i32::MAX)
    }

    fn document() -> Obj {
        Obj::new(ids::DOCUMENT, DOC_STORAGE)
    }

    /// Entrées d'un `.flipchart` extrait : `version`, index et document de la racine, ressources, pages.
    fn flipchart(doc: Obj, resources: &[Res], sheets: Vec<Sheet>) -> Vec<(String, Vec<u8>)> {
        let names: Vec<(u32, String, &str)> = resources
            .iter()
            .map(|r| (r.id, format!("{}.ir", r.id), r.file.as_ref().map_or("", |f| f.0)))
            .collect();
        let rows: Vec<(u32, &str, &str, &str, u32)> = names
            .iter()
            .map(|(id, entry, file)| (*id, entry.as_str(), *file, "", 1))
            .collect();
        let doc = doc.object(DOC_RESOURCES, 4, &Obj::new(0, 0).resources(2, &rows));
        let mut out = vec![
            (String::from("version"), b"1".to_vec()),
            (format!("{DOC_STORAGE}.io"), doc.stream()),
        ];
        for r in resources {
            out.push((format!("{}.ir", r.id), r.object.stream()));
            if let Some((name, data)) = &r.file {
                out.push((String::from(*name), data.clone()));
            }
        }
        let mut page_nodes = Vec::new();
        for s in sheets {
            page_nodes.push(leaf(s.node, ids::PAGE, s.node + 1));
            let tree = Node::new(s.node, ids::PAGE, s.node + 1, s.kids, s.refs);
            out.push((format!("{0}.fpg/{0}.in", s.node), index(&tree)));
            out.push((format!("{}.fpg/{}.io", s.node, s.node + 1), s.page.stream()));
            for (storage, data) in s.streams {
                out.push((format!("{}.fpg/{storage}.io", s.node), data));
            }
        }
        let root = Node::new(DOC_NODE, ids::DOCUMENT, DOC_STORAGE, page_nodes, Vec::new());
        out.push((format!("{DOC_NODE}.in"), index(&root)));
        out
    }

    fn run(entries: &[(String, Vec<u8>)], first_page: u32) -> Result<BoardList, BoardError> {
        let refs: Vec<(&str, &[u8])> = entries
            .iter()
            .map(|(n, d)| (n.as_str(), d.as_slice()))
            .collect();
        crate::flipchart::read(&refs, first_page)
    }

    /// Pages relues par `board::parse` (le flux est celui de `encode`, DA5) et avertissements.
    fn pages_of(entries: &[(String, Vec<u8>)]) -> (Vec<Page>, Vec<String>) {
        let list = run(entries, 1).expect("fichier lu");
        (board::parse(&list).expect("flux BoardList valide"), list.warnings)
    }

    fn colors(items: &[Item]) -> Vec<[u8; 3]> {
        items
            .iter()
            .filter_map(|it| match it {
                Item::Stroke { color, .. } => Some(*color),
                _ => None,
            })
            .collect()
    }

    fn xy(points: &[[f32; 3]]) -> Vec<(f32, f32)> {
        points.iter().map(|p| (p[0], p[1])).collect()
    }

    /// S4 : deux pages ; trait, ligne ouverte, rectangle plein, texte à deux segments, image PNG.
    #[test]
    fn two_pages_with_stroke_line_rect_text_image() {
        let resources = [
            points(101, &[(10.0, 20.0), (30.0, 40.0)]),
            points(102, &[(0.0, 0.0), (50.0, 0.0), (50.0, 50.0)]),
            Res {
                id: 103,
                object: Obj::new(0, 103).polygons(
                    RES_DATA,
                    &[&[(0.0, 0.0), (100.0, 0.0), (100.0, 50.0), (0.0, 50.0)]],
                ),
                file: None,
            },
            Res {
                id: 104,
                object: Obj::new(0, 104)
                    .string(RES_MARKUP, "<p>Bonjour monde</p>")
                    .objects(
                        RES_DATA,
                        &[
                            Obj::new(0, 0)
                                .string(RUN_TEXT, "Bonjour ")
                                .string(RUN_FONT, "Arial")
                                .real(RUN_SIZE, 24.0)
                                .integer(RUN_WEIGHT, 75)
                                .color(RUN_COLOR, 0, 0, 0, 255)
                                .point(RUN_BASELINE, 10.0, 40.0),
                            Obj::new(0, 0)
                                .string(RUN_TEXT, "monde")
                                .string(RUN_FONT, "Arial")
                                .real(RUN_SIZE, 24.0)
                                .integer(RUN_WEIGHT, 50)
                                .color(RUN_COLOR, 255, 0, 0, 255)
                                .point(RUN_BASELINE, 120.0, 40.0),
                        ],
                    ),
                file: None,
            },
            Res {
                id: 105,
                object: Obj::new(0, 105).string(3, "photo.png").size(5, 200, 100),
                file: Some(("115.png", PNG.to_vec())),
            },
        ];
        let background = Obj::new(ids::BACKGROUND, 0)
            .integer(FILL_SOURCE, 0)
            .object(FILL_STYLE, 4, &Obj::new(0, 0).color(PEN_TINT, 250, 240, 230, 255));
        let first = Sheet::new(10)
            .put(11, ids::BACKGROUND, background)
            .put(12, ids::STROKE, stroke(101, (255, 0, 0)))
            .put(
                13,
                ids::LINE,
                Obj::new(ids::LINE, 0)
                    .object(ITEM_PEN, 4, &pen((0, 128, 0), 2.0))
                    .integer(REF_38, 102),
            );
        let fill = pen((0, 0, 255), 2.0)
            .integer(PEN_FILL, 1)
            .color(PEN_TINT, 0, 255, 0, 255);
        let second = Sheet::new(20)
            .put(
                21,
                ids::SHAPE,
                Obj::new(ids::SHAPE, 0)
                    .object(ITEM_PEN, 4, &fill)
                    .integer(REF_38, 103),
            )
            .put(
                22,
                ids::TEXT,
                Obj::new(ids::TEXT, 0)
                    .float_rect(ITEM_BOX, 10.0, 20.0, 300.0, 40.0)
                    .integer(REF_38, 104),
            )
            .put(
                23,
                ids::IMAGE,
                Obj::new(ids::IMAGE, 0)
                    .float_rect(ITEM_BOX, 5.0, 6.0, 200.0, 100.0)
                    .integer(REF_38, 105),
            );
        let (pages, warnings) = pages_of(&flipchart(document(), &resources, vec![first, second]));
        assert!(warnings.is_empty(), "{warnings:?}");
        assert_eq!(pages.len(), 2);

        assert_eq!(pages[0].background, Some([250, 240, 230]));
        assert_eq!(pages[0].items.len(), 2, "{:?}", pages[0].items);
        let Item::Stroke {
            m,
            color,
            width,
            points,
        } = &pages[0].items[0]
        else {
            panic!("trait attendu : {:?}", pages[0].items[0]);
        };
        assert_eq!((*m, *color, *width), (board::IDENTITY, [255, 0, 0], 3.0));
        assert_eq!(xy(points), vec![(10.0, 20.0), (30.0, 40.0)]);
        let Item::Stroke { color, points, .. } = &pages[0].items[1] else {
            panic!("ligne attendue : {:?}", pages[0].items[1]);
        };
        assert_eq!(*color, [0, 128, 0]);
        assert_eq!(xy(points), vec![(0.0, 0.0), (50.0, 0.0), (50.0, 50.0)]);

        assert_eq!(pages[1].background, None);
        assert_eq!(pages[1].items.len(), 3, "{:?}", pages[1].items);
        assert_eq!(
            pages[1].items[0],
            Item::Shape {
                kind: ShapeKind::Rect,
                m: board::IDENTITY,
                x0: 0.0,
                y0: 0.0,
                x1: 100.0,
                y1: 50.0,
                color: [0, 0, 255],
                width: 2.0,
                fill: Some([0, 255, 0]),
            }
        );
        let Item::Text {
            m, x, y, w, h, spans, ..
        } = &pages[1].items[1]
        else {
            panic!("texte attendu : {:?}", pages[1].items[1]);
        };
        assert_eq!((*m, *x, *y, *w, *h), (board::IDENTITY, 10.0, 20.0, 300.0, 40.0));
        let runs: Vec<(&str, bool, Option<[u8; 3]>, Option<&str>)> = spans
            .iter()
            .map(|s| (s.text.as_str(), s.bold, s.color, s.font.as_deref()))
            .collect();
        assert_eq!(
            runs,
            vec![
                ("Bonjour ", true, Some([0, 0, 0]), Some("Arial")),
                ("monde", false, Some([255, 0, 0]), Some("Arial")),
            ]
        );
        assert_eq!(
            pages[1].items[2],
            Item::Image {
                m: board::IDENTITY,
                x: 5.0,
                y: 6.0,
                w: 200.0,
                h: 100.0,
                href: String::from("115.png"),
            }
        );
    }

    /// N7 : une forme qui n'est pas un rectangle d'axes devient un trait fermé.
    #[test]
    fn shape_not_rect_is_a_closed_stroke() {
        let triangle = Res {
            id: 101,
            object: Obj::new(0, 101).polygons(RES_DATA, &[&[(0.0, 0.0), (40.0, 0.0), (20.0, 30.0)]]),
            file: None,
        };
        let sheet = Sheet::new(10).put(
            11,
            ids::SHAPE,
            Obj::new(ids::SHAPE, 0)
                .object(ITEM_PEN, 4, &pen((9, 9, 9), 1.0))
                .integer(REF_38, 101),
        );
        let (pages, _) = pages_of(&flipchart(document(), &[triangle], vec![sheet]));
        let Item::Stroke { color, points, .. } = &pages[0].items[0] else {
            panic!("trait fermé attendu : {:?}", pages[0].items);
        };
        assert_eq!(*color, [9, 9, 9]);
        assert_eq!(
            xy(points),
            vec![(0.0, 0.0), (40.0, 0.0), (20.0, 30.0), (0.0, 0.0)]
        );
    }

    /// S4, N14 : une image TIFF (ou EMF) n'est pas lue, elle est avertie ; la PNG voisine est lue.
    #[test]
    fn tiff_image_is_warned_not_read() {
        let image = |rid: u32| {
            Obj::new(ids::IMAGE, 0)
                .float_rect(ITEM_BOX, 0.0, 0.0, 10.0, 10.0)
                .integer(REF_38, int(rid))
        };
        let file = |id: u32, name: &'static str, data: &[u8]| Res {
            id,
            object: Obj::new(0, id).string(3, name),
            file: Some((name, data.to_vec())),
        };
        let resources = [
            file(101, "7.tif", TIFF),
            file(102, "8.emf", EMF),
            file(103, "9.png", PNG),
            file(104, "10.tiff", b"not really".as_slice()),
        ];
        let sheet = Sheet::new(10)
            .put(11, ids::IMAGE, image(101))
            .put(12, ids::IMAGE, image(102))
            .put(13, ids::IMAGE, image(103))
            .put(14, ids::IMAGE, image(104));
        let (pages, mut warnings) = pages_of(&flipchart(document(), &resources, vec![sheet]));
        warnings.sort();
        assert_eq!(
            warnings,
            vec![
                "page 1 : 1 image d'un format non lu (EMF, WMF…)".to_string(),
                "page 1 : 2 images TIFF non lues".to_string(),
            ]
        );
        assert_eq!(pages[0].items.len(), 1);
        assert!(
            matches!(&pages[0].items[0], Item::Image { href, .. } if href == "9.png"),
            "{:?}",
            pages[0].items
        );
    }

    /// S4 : les actions, médias, formules et textes verticaux sont avertis par sorte ; le trait est lu.
    #[test]
    fn action_is_warned() {
        let sheet = Sheet::new(10)
            .put(11, ids::STROKE, stroke(101, (1, 2, 3)))
            .put(12, 23, Obj::new(23, 0).integer(4, 2))
            .put(13, ids::TEXT_ACTION, Obj::new(ids::TEXT_ACTION, 0))
            .put(14, ids::MEDIA, Obj::new(ids::MEDIA, 0))
            .put(15, ids::MATHML, Obj::new(ids::MATHML, 0).string(52, "<math/>"))
            .put(16, ids::VERTICAL_TEXT, Obj::new(ids::VERTICAL_TEXT, 0));
        let entries = flipchart(document(), &[points(101, &[(1.0, 1.0), (2.0, 2.0)])], vec![sheet]);
        let list = run(&entries, 3).expect("fichier lu");
        let mut warnings = list.warnings.clone();
        warnings.sort();
        assert_eq!(
            warnings,
            vec![
                "page 3 : 1 formule MathML non lue".to_string(),
                "page 3 : 1 son ou vidéo non lu".to_string(),
                "page 3 : 1 texte vertical non lu".to_string(),
                "page 3 : 2 actions non lues".to_string(),
            ]
        );
        let pages = board::parse(&list).expect("flux valide");
        assert_eq!(colors(&pages[0].items), vec![[1, 2, 3]]);
    }

    /// Patron refusé : suivre les références de groupe sans ensemble des visités (A → B → A boucle sans fin).
    #[test]
    fn group_cycle_is_ignored_with_warning() {
        let group = |id: u32, refs: Vec<u32>| {
            (
                Node::new(id, ids::GROUP, id + 50_000, Vec::new(), refs),
                vec![(id + 50_000, Obj::new(ids::GROUP, 0).stream())],
            )
        };
        let (a, a_streams) = group(11, vec![12, 13]);
        let (b, b_streams) = group(12, vec![11]);
        let sheet = Sheet::new(10)
            .put_node(a, a_streams)
            .put_node(b, b_streams)
            .put(13, ids::STROKE, stroke(101, (7, 7, 7)));
        let entries = flipchart(document(), &[points(101, &[(1.0, 1.0), (2.0, 2.0)])], vec![sheet]);
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            let _ = tx.send(pages_of(&entries));
        });
        let (pages, warnings) = rx
            .recv_timeout(Duration::from_secs(20))
            .expect("la lecture d'un groupe en cycle se termine");
        assert_eq!(warnings, vec!["page 1 : 1 groupe en cycle ignoré".to_string()]);
        fn strokes(items: &[Item]) -> usize {
            items
                .iter()
                .map(|it| match it {
                    Item::Stroke { .. } => 1,
                    Item::Group(inner) => strokes(inner),
                    _ => 0,
                })
                .sum()
        }
        assert_eq!(strokes(&pages[0].items), 1, "{:?}", pages[0].items);
        assert!(
            matches!(&pages[0].items[..], [Item::Group(_)]),
            "le trait reste dans son groupe : {:?}",
            pages[0].items
        );
    }

    /// N13 : un côté de page hors `]0, 100 000]` (ou non fini) donne 1024 × 768 et un seul avertissement.
    #[test]
    fn page_side_out_of_bounds_falls_back() {
        let sheet = |node: u32, size: Option<(f64, f64)>| {
            let page = Obj::new(ids::PAGE, 0);
            let page = match size {
                Some((w, h)) => page.size_f(PAGE_SIZE, w, h),
                None => page,
            };
            Sheet::new(node)
                .page(page)
                .put(node + 1, ids::STROKE, stroke(101, (1, 1, 1)))
        };
        let pts = [points(101, &[(1.0, 1.0), (2.0, 2.0)])];
        let scale = 1920.0 / 1024.0;
        let fallback = [scale, 0.0, 0.0, scale, 0.0, 0.0];
        let entries = flipchart(
            document(),
            &pts,
            vec![
                sheet(10, Some((0.0, 768.0))),
                sheet(20, Some((200_000.0, 1000.0))),
                sheet(30, Some((f64::NAN, 10.0))),
                sheet(40, Some((1024.0, 768.0))),
                sheet(50, None),
                sheet(60, Some((100_000.0, 100_000.0))),
            ],
        );
        let (pages, warnings) = pages_of(&entries);
        assert_eq!(
            warnings,
            vec!["côté de page hors bornes : 1024 × 768".to_string()]
        );
        let m_of = |p: &Page| match p.items.first() {
            Some(Item::Stroke { m, .. }) => Some(*m),
            _ => None,
        };
        for (k, p) in pages.iter().take(5).enumerate() {
            assert_eq!(m_of(p), Some(fallback), "page {}", k + 1);
        }
        let big = 1920.0 / 100_000.0;
        assert_eq!(m_of(&pages[5]), Some([big, 0.0, 0.0, big, 0.0, 0.0]));

        // La taille de départ du document est bornée de même.
        let doc = document().size_f(DOC_START_SIZE, 0.0, 5.0);
        let (pages, warnings) = pages_of(&flipchart(doc, &pts, vec![sheet(10, None)]));
        assert_eq!(
            warnings,
            vec!["côté de page hors bornes : 1024 × 768".to_string()]
        );
        assert_eq!(m_of(&pages[0]), Some(fallback));
    }

    /// § 7.3 : couche, puis profondeur, puis ordre de l'arbre (et non l'ordre de l'arbre seul).
    #[test]
    fn draw_order_follows_layer_then_depth() {
        let placed = |rgb: (u8, u8, u8), layer: Option<i32>, depth: Option<f64>| {
            let o = stroke(101, rgb);
            let o = match layer {
                Some(l) => o.integer(ITEM_LAYER, l),
                None => o,
            };
            match depth {
                Some(d) => o.real(ITEM_DEPTH, d),
                None => o,
            }
        };
        let sheet = Sheet::new(10)
            .put(11, ids::STROKE, placed((1, 0, 0), Some(2), Some(0.0)))
            .put(12, ids::STROKE, placed((2, 0, 0), Some(0), Some(5.0)))
            .put(13, ids::STROKE, placed((3, 0, 0), Some(0), Some(1.0)))
            .put(14, ids::STROKE, placed((4, 0, 0), None, None))
            .put(15, ids::STROKE, placed((5, 0, 0), Some(0), Some(1.0)));
        let entries = flipchart(document(), &[points(101, &[(1.0, 1.0), (2.0, 2.0)])], vec![sheet]);
        let (pages, _) = pages_of(&entries);
        assert_eq!(
            colors(&pages[0].items),
            vec![[3, 0, 0], [5, 0, 0], [2, 0, 0], [4, 0, 0], [1, 0, 0]]
        );
    }

    /// Sans index ni document, le fichier est refusé ; un objet dont le `.io` manque est averti, pas fatal.
    #[test]
    fn missing_io_is_broken() {
        let pts = [points(101, &[(1.0, 1.0), (2.0, 2.0)])];
        let good = flipchart(
            document(),
            &pts,
            vec![Sheet::new(10).put(11, ids::STROKE, stroke(101, (1, 1, 1)))],
        );
        assert!(run(&good, 1).is_ok());

        let without = |name: &str| -> Vec<(String, Vec<u8>)> {
            good.iter().filter(|(n, _)| n != name).cloned().collect()
        };
        assert!(matches!(run(&without("1.in"), 1), Err(BoardError::Broken(_))));
        assert!(matches!(run(&without("2.io"), 1), Err(BoardError::Broken(_))));
        assert!(matches!(run(&[], 1), Err(BoardError::Broken(_))));

        let (pages, warnings) = pages_of(&without("10.fpg/50011.io"));
        assert_eq!(warnings, vec!["page 1 : 1 objet illisible ignoré".to_string()]);
        assert_eq!(pages.len(), 1);
        assert!(pages[0].items.is_empty());
    }

    /// U2 : un type de valeur inconnu reste local à sa propriété ; un `.io` illisible est averti par objet.
    #[test]
    fn unknown_value_type_is_kept_local() {
        let unknown = || Bytes::default().u16(0x77).u32(0);
        let doc = document().raw(99, unknown());
        let sheet = Sheet::new(10)
            .page(
                Obj::new(ids::PAGE, 0)
                    .size_f(PAGE_SIZE, 1920.0, 1080.0)
                    .raw(98, unknown()),
            )
            .put(11, ids::STROKE, stroke(101, (4, 5, 6)).raw(4, unknown()))
            .put_node(
                leaf(12, ids::STROKE, 60_012),
                vec![(60_012, b"not a stream at all".to_vec())],
            );
        let entries = flipchart(doc, &[points(101, &[(1.0, 1.0), (2.0, 2.0)])], vec![sheet]);
        let (pages, warnings) = pages_of(&entries);
        assert_eq!(warnings, vec!["page 1 : 1 objet illisible ignoré".to_string()]);
        let Some(Item::Stroke { color, points, .. }) = pages[0].items.first() else {
            panic!("trait attendu : {:?}", pages[0].items);
        };
        assert_eq!((*color, xy(points)), ([4, 5, 6], vec![(1.0, 1.0), (2.0, 2.0)]));
    }

    /// N13 : plus de 100 000 objets en tout (comptés sur l'index, avant toute lecture d'objet) : refus.
    #[test]
    fn more_than_100000_objects_is_too_big() {
        let crowded = |node: u32, n: usize| {
            let mut s = Sheet::new(node);
            s.streams.push((77, stroke(101, (1, 1, 1)).stream()));
            for i in 0..n {
                let id = node * 1_000_000 + u32::try_from(i).unwrap_or(0);
                s.kids.push(leaf(id, ids::STROKE, 77));
            }
            s
        };
        let pts = [points(101, &[(1.0, 1.0)])];
        let one = flipchart(document(), &pts, vec![crowded(10, board::MAX_OBJECTS + 1)]);
        assert_eq!(run(&one, 1), Err(BoardError::TooBig));
        let half = board::MAX_OBJECTS / 2 + 1;
        let two = flipchart(document(), &pts, vec![crowded(10, half), crowded(20, half)]);
        assert_eq!(run(&two, 1), Err(BoardError::TooBig));
    }

    /// S5 : objets imbriqués dans l'index au-delà de 32 niveaux, ou dans un flux au-delà de 32 : ignorés, comptés.
    #[test]
    fn deep_objects_are_warned() {
        let levels = 40u32;
        let mut node = leaf(100 + levels, ids::STROKE, 77);
        for k in (1..levels).rev() {
            node = Node::new(100 + k, ids::STROKE, 77, vec![node], Vec::new());
        }
        let deep_pen = (0..34).fold(Obj::new(0, 0), |inner, _| Obj::new(0, 0).object(1, 4, &inner));
        let sheet = Sheet::new(10)
            .put_node(node, vec![(77, stroke(101, (1, 1, 1)).stream())])
            .put(11, ids::STROKE, stroke(101, (2, 2, 2)).object(60, 4, &deep_pen));
        let entries = flipchart(document(), &[points(101, &[(1.0, 1.0), (2.0, 2.0)])], vec![sheet]);
        let (pages, warnings) = pages_of(&entries);
        // 8 nœuds au-delà du 32e niveau de l'index ; 4 objets embarqués au-delà du 32e niveau du flux.
        assert_eq!(
            warnings,
            vec!["page 1 : 12 objets trop imbriqués ignorés".to_string()]
        );
        let c = colors(&pages[0].items);
        assert_eq!(c.iter().filter(|&&c| c == [1, 1, 1]).count(), 32);
        assert_eq!(c.iter().filter(|&&c| c == [2, 2, 2]).count(), 1);
    }

    /// N12 : grille (et ses niveaux), étiquettes, connecteur : avertis par sorte, une grille comptée une fois.
    #[test]
    fn grid_and_labels_are_warned() {
        let grid = Node::new(
            11,
            ids::GRID,
            50_011,
            vec![
                leaf(111, ids::GRID_LEVEL, 50_111),
                leaf(112, ids::GRID_LEVEL, 50_112),
            ],
            Vec::new(),
        );
        let sheet = Sheet::new(10)
            .put_node(
                grid,
                vec![
                    (50_011, Obj::new(ids::GRID, 0).stream()),
                    (50_111, Obj::new(ids::GRID_LEVEL, 0).stream()),
                    (50_112, Obj::new(ids::GRID_LEVEL, 0).stream()),
                ],
            )
            .put(12, ids::TAG, Obj::new(ids::TAG, 0).string(2, "légende"))
            .put(13, ids::TAG, Obj::new(ids::TAG, 0))
            .put(14, ids::CONNECTOR, Obj::new(ids::CONNECTOR, 0))
            .put(15, ids::STROKE, stroke(101, (3, 3, 3)));
        let entries = flipchart(document(), &[points(101, &[(1.0, 1.0), (2.0, 2.0)])], vec![sheet]);
        let (pages, mut warnings) = pages_of(&entries);
        warnings.sort();
        assert_eq!(
            warnings,
            vec![
                "page 1 : 1 connecteur non lu".to_string(),
                "page 1 : 1 grille non lue".to_string(),
                "page 1 : 2 étiquettes non lues".to_string(),
            ]
        );
        assert_eq!(colors(&pages[0].items), vec![[3, 3, 3]]);
    }

    /// N12 : rideau, projecteur et repère XY de la page sont avertis.
    #[test]
    fn presentation_settings_are_warned() {
        let page = Obj::new(ids::PAGE, 0)
            .size_f(PAGE_SIZE, 1920.0, 1080.0)
            .real(PAGE_CURTAIN, 40.0)
            .float_rect(PAGE_SPOT, 0.0, 0.0, 10.0, 10.0)
            .point(PAGE_ORIGIN, 5.0, 5.0);
        let (_, mut warnings) = pages_of(&flipchart(document(), &[], vec![Sheet::new(10).page(page)]));
        warnings.sort();
        assert_eq!(
            warnings,
            vec![
                "page 1 : 1 projecteur non lu".to_string(),
                "page 1 : 1 repère XY non lu".to_string(),
                "page 1 : 1 rideau non lu".to_string(),
            ]
        );
    }

    /// N13 : au-delà de 500 pages, les 500 premières sont lues, avec un avis.
    #[test]
    fn more_than_500_pages_keeps_500() {
        let sheets = (0..501u32).map(|k| Sheet::new(10 + 2 * k)).collect();
        let (pages, warnings) = pages_of(&flipchart(document(), &[], sheets));
        assert_eq!(pages.len(), 500);
        assert_eq!(warnings, vec!["500 premières pages importées sur 501".to_string()]);
    }
}
