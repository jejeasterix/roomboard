//! Tableaux interactifs (C13, DA2) : flux plat « BoardList » entre la page et le module `formats`, dans les deux sens
//! (lecture d'un `.iwb` ou d'un `.ubz`, écriture d'une copie). Même patron que `pdf::DisplayList` (C12) : un flux de
//! nombres et un tableau de textes ; le flux témoin `W1` est joué ici et par `apps/web/src/app/board-io.test.ts`
//! (parité du codage, D6). Aucun `Doc` ici (DAU1) : la page traduit la liste en commandes du cœur. Table des codes :
//! `docs/plans/usage-c13-lot1-svg-iwb-ubz-PLAN.md`, « Table des codes du flux BoardList ».
use std::fmt;

pub mod qt_html;
mod read;
mod write;

pub use read::read_svg;
pub use write::{ubz_metadata, write_iwb, write_ubz_pages};

pub const OP_PAGE: f32 = 1.0;
pub const OP_BACKGROUND: f32 = 2.0;
pub const OP_SHAPE: f32 = 3.0;
pub const OP_STROKE: f32 = 4.0;
pub const OP_TEXT: f32 = 5.0;
pub const OP_IMAGE: f32 = 6.0;
pub const OP_GROUP_BEGIN: f32 = 7.0;
pub const OP_GROUP_END: f32 = 8.0;
/// Drapeaux d'un segment de texte.
pub const FLAG_BOLD: u32 = 1;
pub const FLAG_ITALIC: u32 = 2;
pub const FLAG_UNDERLINE: u32 = 4;
/// Page RoomBoard : 1 920 de large (`PAGE_WIDTH` de `core/api.ts`), hauteur infinie, 1 080 par défaut (D8).
pub const PAGE_WIDTH: f32 = 1920.0;
pub const PAGE_HEIGHT: f32 = 1080.0;
/// Bornes (D16, U26) : pages ouvertes au plus (comme le PDF), objets par fichier au plus (au-delà : refus).
pub const MAX_PAGES: usize = 500;
pub const MAX_OBJECTS: usize = 100_000;

pub type Rgb = [u8; 3];
/// Matrice SVG `[a, b, c, d, e, f]` : x' = a·x + c·y + e, y' = b·x + d·y + f (ordre de `Matrix` de `core/api.ts`).
pub type Mat = [f32; 6];
pub const IDENTITY: Mat = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

/// Flux échangé avec la page ; `warnings` : avertissements en français de la lecture (vide à l'écriture).
#[derive(Debug, Clone, PartialEq, Default)]
pub struct BoardList {
    pub ops: Vec<f32>,
    pub texts: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dialect {
    /// `content.xml` d'un `.iwb` ZIP, ou `.iwb` en SVG brut (IWB/CFF).
    Iwb,
    /// Une page `pageNNN.svg` d'un `.ubz` (OpenBoard).
    Ubz,
}

impl Dialect {
    pub fn parse(s: &str) -> Option<Dialect> {
        match s {
            "iwb" => Some(Dialect::Iwb),
            "ubz" => Some(Dialect::Ubz),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum BoardError {
    /// XML mal formé, cadre invalide, racine inattendue (refus du fichier).
    Broken(String),
    /// Plus de `MAX_OBJECTS` objets dans un fichier.
    TooBig,
    /// Flux reçu de la page invalide (écriture).
    BadList(String),
}

impl fmt::Display for BoardError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BoardError::Broken(m) => write!(f, "fichier endommagé : {m}"),
            BoardError::TooBig => write!(f, "fichier de tableau trop gros (plus de 100 000 objets)"),
            BoardError::BadList(m) => write!(f, "liste de tableau invalide : {m}"),
        }
    }
}

impl std::error::Error for BoardError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShapeKind {
    Rect,
    Ellipse,
    Line,
    Arrow,
}

/// Segment de texte ; `None` : la valeur de l'élément (taille, couleur) ou la police du socle.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct Span {
    pub text: String,
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
    pub size: Option<f32>,
    pub color: Option<Rgb>,
    pub font: Option<String>,
}

/// Objet d'une page, en coordonnées locales placées par `m`.
#[derive(Debug, Clone, PartialEq)]
pub enum Item {
    Shape { kind: ShapeKind, m: Mat, x0: f32, y0: f32, x1: f32, y1: f32, color: Rgb, width: f32, fill: Option<Rgb> },
    Stroke { m: Mat, color: Rgb, width: f32, points: Vec<[f32; 3]> },
    Text { m: Mat, x: f32, y: f32, w: f32, h: f32, size: f32, color: Rgb, spans: Vec<Span> },
    Image { m: Mat, x: f32, y: f32, w: f32, h: f32, href: String },
    Group(Vec<Item>),
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct Page {
    pub background: Option<Rgb>,
    pub items: Vec<Item>,
}

/// `a ∘ b` : applique `b` puis `a` (`composeMatrix` de `core/shapes.ts`).
pub fn compose(a: &Mat, b: &Mat) -> Mat {
    [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5],
    ]
}

pub fn apply(m: &Mat, x: f32, y: f32) -> (f32, f32) {
    (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])
}

/// Flux d'un tableau (lecture d'un fichier) ; `warnings` vide, rempli par le lecteur.
pub fn encode(_pages: &[Page]) -> BoardList {
    BoardList::default()
}

/// Flux contrôlé en entier avant tout usage (écriture d'une copie) ; tout défaut : `BadList`.
pub fn parse(_list: &BoardList) -> Result<Vec<Page>, BoardError> {
    Err(BoardError::BadList("non écrit".to_string()))
}

/// Flux témoin W1, partagé par les tests de ce module, de `read.rs`, de `write.rs` (et recopié dans `board-io.test.ts`).
#[cfg(test)]
pub(crate) mod fixtures {
    use super::*;

    pub const W1_OPS: &[f32] = &[
        1.0, 2.0, 0.0, 0.0, 0.0, //
        3.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 10.0, 20.0, 110.0, 70.0, 255.0, 0.0, 0.0, 4.0, 1.0, 0.0, 0.0, 255.0, //
        4.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 128.0, 0.0, 3.0, 2.0, 0.0, 0.0, 1.0, 10.0, 10.0, 0.5, //
        5.0, 1.0, 0.0, 0.0, 1.0, 100.0, 200.0, 0.0, 0.0, 300.0, 50.0, 24.0, 0.0, 0.0, 0.0, 2.0, 0.0, 1.0, 0.0, -1.0, -1.0,
        -1.0, -1.0, 1.0, 0.0, 32.0, 255.0, 0.0, 0.0, 2.0, //
        6.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 5.0, 5.0, 64.0, 32.0, 3.0, //
        7.0, //
        3.0, 2.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 50.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, //
        3.0, 3.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 10.0, 50.0, 10.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, //
        8.0, //
        1.0,
    ];

    pub fn w1_texts() -> Vec<String> {
        ["Bonjour ", "monde", "Liberation Sans", "images/a.png"].iter().map(|s| s.to_string()).collect()
    }

    pub fn w1_list() -> BoardList {
        BoardList { ops: W1_OPS.to_vec(), texts: w1_texts(), warnings: Vec::new() }
    }

    pub fn w1_pages() -> Vec<Page> {
        let black = [0, 0, 0];
        vec![
            Page {
                background: Some(black),
                items: vec![
                    Item::Shape { kind: ShapeKind::Rect, m: IDENTITY, x0: 10.0, y0: 20.0, x1: 110.0, y1: 70.0, color: [255, 0, 0], width: 4.0, fill: Some([0, 0, 255]) },
                    Item::Stroke { m: IDENTITY, color: [0, 128, 0], width: 3.0, points: vec![[0.0, 0.0, 1.0], [10.0, 10.0, 0.5]] },
                    Item::Text {
                        m: [1.0, 0.0, 0.0, 1.0, 100.0, 200.0],
                        x: 0.0,
                        y: 0.0,
                        w: 300.0,
                        h: 50.0,
                        size: 24.0,
                        color: black,
                        spans: vec![
                            Span { text: "Bonjour ".to_string(), bold: true, ..Span::default() },
                            Span { text: "monde".to_string(), size: Some(32.0), color: Some([255, 0, 0]), font: Some("Liberation Sans".to_string()), ..Span::default() },
                        ],
                    },
                    Item::Image { m: IDENTITY, x: 5.0, y: 5.0, w: 64.0, h: 32.0, href: "images/a.png".to_string() },
                    Item::Group(vec![
                        Item::Shape { kind: ShapeKind::Line, m: IDENTITY, x0: 0.0, y0: 0.0, x1: 50.0, y1: 0.0, color: black, width: 2.0, fill: None },
                        Item::Shape { kind: ShapeKind::Arrow, m: IDENTITY, x0: 0.0, y0: 10.0, x1: 50.0, y1: 10.0, color: black, width: 2.0, fill: None },
                    ]),
                ],
            },
            Page::default(),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::fixtures::*;
    use super::*;

    /// Flux témoin W1, joué aussi par `board-io.test.ts` (T5) : parité du codage (D6).
    #[test]
    fn golden_w1_parses_to_the_expected_pages() {
        assert_eq!(parse(&w1_list()).expect("W1"), w1_pages());
    }

    #[test]
    fn encode_of_w1_pages_gives_w1_back() {
        let l = encode(&w1_pages());
        assert_eq!(l.ops, W1_OPS.to_vec());
        assert_eq!(l.texts, w1_texts());
        assert!(l.warnings.is_empty());
    }

    /// Curseur de `pdf.rs` : chaque nombre contrôlé avant usage. Les deux derniers flux ne sont refusés que par un
    /// curseur qui contrôle aussi les marques d'absence (−1, −1, −1 pour une couleur, −1 pour une police).
    #[test]
    fn bad_streams_are_bad_list() {
        let texts = w1_texts();
        let text_head = [1.0, 5.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 10.0, 10.0, 12.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0];
        let mixed_color = [&text_head[..], &[-1.0, 5.0, 5.0, -1.0]].concat();
        let odd_font = [&text_head[..], &[-1.0, -1.0, -1.0, -0.5]].concat();
        for ops in [
            &[9.0][..],
            &[3.0, 0.0][..],
            &[1.0, 7.0][..],
            &[1.0, 8.0][..],
            &[1.0, 2.0, 256.0, 0.0, 0.0][..],
            &[1.0, 6.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 9.0][..],
            &[1.0, 4.0, 1.0, 0.0, 0.0, 1.0, 0.0, f32::NAN][..],
            &[1.0, 3.0, 7.0][..],
            &[1.0, 4.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1_000_000.0][..],
            &mixed_color[..],
            &odd_font[..],
        ] {
            let l = BoardList { ops: ops.to_vec(), texts: texts.clone(), warnings: Vec::new() };
            assert!(matches!(parse(&l), Err(BoardError::BadList(_))), "{ops:?}");
        }
    }

    #[test]
    fn dialect_parse_knows_iwb_and_ubz_only() {
        assert_eq!(Dialect::parse("iwb"), Some(Dialect::Iwb));
        assert_eq!(Dialect::parse("ubz"), Some(Dialect::Ubz));
        assert_eq!(Dialect::parse("pdf"), None);
    }

    #[test]
    fn errors_display_in_french() {
        assert_eq!(BoardError::Broken("cadre de page invalide".into()).to_string(), "fichier endommagé : cadre de page invalide");
        assert_eq!(BoardError::TooBig.to_string(), "fichier de tableau trop gros (plus de 100 000 objets)");
        assert_eq!(BoardError::BadList("x".into()).to_string(), "liste de tableau invalide : x");
    }

    #[test]
    fn compose_applies_right_then_left() {
        let scale = [2.0, 0.0, 0.0, 2.0, 0.0, 0.0];
        let shift = [1.0, 0.0, 0.0, 1.0, 10.0, 5.0];
        assert_eq!(compose(&scale, &shift), [2.0, 0.0, 0.0, 2.0, 20.0, 10.0]);
        assert_eq!(apply(&compose(&scale, &shift), 1.0, 1.0), (22.0, 12.0));
    }

    /// Patron écarté (DAU1, D6) : un `Doc` ou une commande du cœur dans `formats`, ou une sérialisation JSON. Le module
    /// `board` (lecteur, écrivain, texte de Qt compris) n'échange que le flux plat ; la page traduit.
    #[test]
    fn board_module_speaks_only_the_flat_stream() {
        let forbidden = [concat!("roomboard", "_core"), concat!("ser", "de")];
        for (file, src) in [
            ("board.rs", include_str!("board.rs")),
            ("board/read.rs", include_str!("board/read.rs")),
            ("board/write.rs", include_str!("board/write.rs")),
            ("board/qt_html.rs", include_str!("board/qt_html.rs")),
        ] {
            for f in forbidden {
                assert!(!src.contains(f), "{file} contient « {f} » : la page traduit le flux (DAU1, D6)");
            }
        }
    }
}
