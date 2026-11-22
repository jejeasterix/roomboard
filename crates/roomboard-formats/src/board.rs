//! Tableaux interactifs (C13, DA2) : flux plat « BoardList » entre la page et le module `formats`, dans les deux sens
//! (lecture d'un `.iwb` ou d'un `.ubz`, écriture d'une copie). Même patron que `pdf::DisplayList` (C12) : un flux de
//! nombres et un tableau de textes ; le flux témoin `W1` est joué ici et par `apps/web/src/app/board-io.test.ts`
//! (parité du codage, D6). Aucun `Doc` ici (DAU1) : la page traduit la liste en commandes du cœur. Table des codes :
//! `docs/plans/usage-c13-lot1-svg-iwb-ubz-PLAN.md`, « Table des codes du flux BoardList ».
use std::collections::HashMap;
use std::fmt;

mod notebook;
pub mod qt_html;
mod read;
mod write;

pub use notebook::notebook_order;
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
const MAX_POINTS: u32 = 1_000_000;
const MAX_SPANS: u32 = 10_000;
/// Profondeur de groupes au plus (comme l'arbre XML du lecteur) : au-delà, `BadList`.
const MAX_GROUP_DEPTH: usize = 256;
const MAX_INDEX: u32 = 16_777_216;
/// Préallocation au plus (comme `path` de `pdf.rs`) : un compte annoncé ne réserve pas plus que le flux ne porte.
const PREALLOC: usize = 4096;

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
    /// Une page `pageN.svg` d'un `.notebook` SMART (lot 2, N5) ; import seul, aucune copie (N2).
    Notebook,
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
            BoardError::TooBig => {
                write!(f, "fichier de tableau trop gros (plus de 100 000 objets)")
            }
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

impl ShapeKind {
    fn code(self) -> f32 {
        match self {
            ShapeKind::Rect => 0.0,
            ShapeKind::Ellipse => 1.0,
            ShapeKind::Line => 2.0,
            ShapeKind::Arrow => 3.0,
        }
    }
    fn of(code: u32) -> Option<ShapeKind> {
        match code {
            0 => Some(ShapeKind::Rect),
            1 => Some(ShapeKind::Ellipse),
            2 => Some(ShapeKind::Line),
            3 => Some(ShapeKind::Arrow),
            _ => None,
        }
    }
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
    Shape {
        kind: ShapeKind,
        m: Mat,
        x0: f32,
        y0: f32,
        x1: f32,
        y1: f32,
        color: Rgb,
        width: f32,
        fill: Option<Rgb>,
    },
    Stroke {
        m: Mat,
        color: Rgb,
        width: f32,
        points: Vec<[f32; 3]>,
    },
    Text {
        m: Mat,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        size: f32,
        color: Rgb,
        spans: Vec<Span>,
    },
    Image {
        m: Mat,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        href: String,
    },
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

/// Rectangle d'un polygone fermé de 4 sommets (5 si le dernier répète le premier), côtés alignés sur les axes
/// (N7, N12) ; `None` sinon. Tolérance 1e-3 ; rectangle plat (largeur ou hauteur nulle) refusé.
pub fn rect_of(points: &[[f32; 2]]) -> Option<[f32; 4]> {
    let _ = points;
    todo!("T3 : rect_of")
}

struct Encoder {
    ops: Vec<f32>,
    texts: Vec<String>,
    index: HashMap<String, usize>,
}

impl Encoder {
    /// Texte interné à sa première apparition (même règle que `encodeBoardList` de `board-io.ts`).
    fn text(&mut self, s: &str) -> f32 {
        if let Some(&k) = self.index.get(s) {
            return k as f32;
        }
        let k = self.texts.len();
        self.texts.push(s.to_string());
        self.index.insert(s.to_string(), k);
        k as f32
    }
    fn rgb(&mut self, c: Rgb) {
        self.ops.extend(c.iter().map(|&v| f32::from(v)));
    }
    fn item(&mut self, it: &Item) {
        match it {
            Item::Shape {
                kind,
                m,
                x0,
                y0,
                x1,
                y1,
                color,
                width,
                fill,
            } => {
                self.ops.push(OP_SHAPE);
                self.ops.push(kind.code());
                self.ops.extend_from_slice(m);
                self.ops.extend_from_slice(&[*x0, *y0, *x1, *y1]);
                self.rgb(*color);
                self.ops.push(*width);
                match fill {
                    Some(f) => {
                        self.ops.push(1.0);
                        self.rgb(*f);
                    }
                    None => self.ops.extend_from_slice(&[0.0, 0.0, 0.0, 0.0]),
                }
            }
            Item::Stroke {
                m,
                color,
                width,
                points,
            } => {
                self.ops.push(OP_STROKE);
                self.ops.extend_from_slice(m);
                self.rgb(*color);
                self.ops.push(*width);
                self.ops.push(points.len() as f32);
                for p in points {
                    self.ops.extend_from_slice(p);
                }
            }
            Item::Text {
                m,
                x,
                y,
                w,
                h,
                size,
                color,
                spans,
            } => {
                self.ops.push(OP_TEXT);
                self.ops.extend_from_slice(m);
                self.ops.extend_from_slice(&[*x, *y, *w, *h, *size]);
                self.rgb(*color);
                self.ops.push(spans.len() as f32);
                for s in spans {
                    // Le texte d'un segment est interné avant sa police (table des codes).
                    let t = self.text(&s.text);
                    let flags = u32::from(s.bold) * FLAG_BOLD
                        + u32::from(s.italic) * FLAG_ITALIC
                        + u32::from(s.underline) * FLAG_UNDERLINE;
                    self.ops
                        .extend_from_slice(&[t, flags as f32, s.size.unwrap_or(0.0)]);
                    match s.color {
                        Some(c) => self.rgb(c),
                        None => self.ops.extend_from_slice(&[-1.0, -1.0, -1.0]),
                    }
                    let f = match &s.font {
                        Some(f) => self.text(f),
                        None => -1.0,
                    };
                    self.ops.push(f);
                }
            }
            Item::Image {
                m,
                x,
                y,
                w,
                h,
                href,
            } => {
                self.ops.push(OP_IMAGE);
                self.ops.extend_from_slice(m);
                self.ops.extend_from_slice(&[*x, *y, *w, *h]);
                let k = self.text(href);
                self.ops.push(k);
            }
            Item::Group(items) => {
                self.ops.push(OP_GROUP_BEGIN);
                for i in items {
                    self.item(i);
                }
                self.ops.push(OP_GROUP_END);
            }
        }
    }
}

/// Flux d'un tableau (lecture d'un fichier) ; `warnings` vide, rempli par le lecteur.
pub fn encode(pages: &[Page]) -> BoardList {
    let mut e = Encoder {
        ops: Vec::new(),
        texts: Vec::new(),
        index: HashMap::new(),
    };
    for p in pages {
        e.ops.push(OP_PAGE);
        if let Some(bg) = p.background {
            e.ops.push(OP_BACKGROUND);
            e.rgb(bg);
        }
        for it in &p.items {
            e.item(it);
        }
    }
    BoardList {
        ops: e.ops,
        texts: e.texts,
        warnings: Vec::new(),
    }
}

fn bad(m: String) -> BoardError {
    BoardError::BadList(m)
}

/// Curseur de `pdf.rs` (`Reader`) : chaque nombre est contrôlé avant usage, aucune préallocation au-delà de 4 096.
struct Cursor<'a> {
    v: &'a [f32],
    i: usize,
    texts: &'a [String],
}

impl Cursor<'_> {
    fn done(&self) -> bool {
        self.i >= self.v.len()
    }
    fn num(&mut self) -> Result<f32, BoardError> {
        let x = *self
            .v
            .get(self.i)
            .ok_or_else(|| bad(format!("flux coupé à {}", self.i)))?;
        self.i += 1;
        if x.is_finite() {
            Ok(x)
        } else {
            Err(bad(format!("nombre non fini à {}", self.i - 1)))
        }
    }
    fn int(&mut self, max: u32) -> Result<u32, BoardError> {
        let x = self.num()?;
        if x < 0.0 || x.fract() != 0.0 || f64::from(x) > f64::from(max) {
            return Err(bad(format!(
                "entier de 0 à {max} attendu à {}, lu {x}",
                self.i - 1
            )));
        }
        Ok(x as u32)
    }
    fn mat(&mut self) -> Result<Mat, BoardError> {
        let mut m = [0.0; 6];
        for v in &mut m {
            *v = self.num()?;
        }
        Ok(m)
    }
    fn rgb(&mut self) -> Result<Rgb, BoardError> {
        Ok([
            self.int(255)? as u8,
            self.int(255)? as u8,
            self.int(255)? as u8,
        ])
    }
    /// Lit −1 exactement (marque d'absence).
    fn absent(&mut self) -> Result<(), BoardError> {
        let x = self.num()?;
        if x == -1.0 {
            Ok(())
        } else {
            Err(bad(format!(
                "marque d'absence −1 attendue à {}, lu {x}",
                self.i - 1
            )))
        }
    }
    fn negative_ahead(&self) -> bool {
        self.v.get(self.i).is_some_and(|&x| x < 0.0)
    }
    /// −1, −1, −1 : absente.
    fn opt_rgb(&mut self) -> Result<Option<Rgb>, BoardError> {
        if self.negative_ahead() {
            self.absent()?;
            self.absent()?;
            self.absent()?;
            return Ok(None);
        }
        Ok(Some(self.rgb()?))
    }
    fn text(&mut self) -> Result<String, BoardError> {
        let k = self.int(MAX_INDEX)? as usize;
        self.texts
            .get(k)
            .cloned()
            .ok_or_else(|| bad(format!("texte {k} absent")))
    }
    /// −1 : absent.
    fn opt_text(&mut self) -> Result<Option<String>, BoardError> {
        if self.negative_ahead() {
            self.absent()?;
            return Ok(None);
        }
        Ok(Some(self.text()?))
    }
}

fn shape(c: &mut Cursor<'_>) -> Result<Item, BoardError> {
    let code = c.int(3)?;
    let kind = ShapeKind::of(code).ok_or_else(|| bad(format!("forme inconnue {code}")))?;
    let m = c.mat()?;
    let (x0, y0, x1, y1) = (c.num()?, c.num()?, c.num()?, c.num()?);
    let color = c.rgb()?;
    let width = c.num()?;
    let fill = if c.int(1)? == 1 {
        Some(c.rgb()?)
    } else {
        c.num()?;
        c.num()?;
        c.num()?;
        None
    };
    Ok(Item::Shape {
        kind,
        m,
        x0,
        y0,
        x1,
        y1,
        color,
        width,
        fill,
    })
}

fn stroke(c: &mut Cursor<'_>) -> Result<Item, BoardError> {
    let m = c.mat()?;
    let color = c.rgb()?;
    let width = c.num()?;
    let n = c.int(MAX_POINTS)?;
    let mut points = Vec::with_capacity((n as usize).min(PREALLOC));
    for _ in 0..n {
        points.push([c.num()?, c.num()?, c.num()?]);
    }
    Ok(Item::Stroke {
        m,
        color,
        width,
        points,
    })
}

fn text(c: &mut Cursor<'_>) -> Result<Item, BoardError> {
    let m = c.mat()?;
    let (x, y, w, h, size) = (c.num()?, c.num()?, c.num()?, c.num()?, c.num()?);
    let color = c.rgb()?;
    let n = c.int(MAX_SPANS)?;
    let mut spans = Vec::with_capacity((n as usize).min(PREALLOC));
    for _ in 0..n {
        let text = c.text()?;
        let flags = c.int(FLAG_BOLD | FLAG_ITALIC | FLAG_UNDERLINE)?;
        let z = c.num()?;
        if z < 0.0 {
            return Err(bad(format!("taille de segment négative à {}", c.i - 1)));
        }
        let color = c.opt_rgb()?;
        let font = c.opt_text()?;
        spans.push(Span {
            text,
            bold: flags & FLAG_BOLD != 0,
            italic: flags & FLAG_ITALIC != 0,
            underline: flags & FLAG_UNDERLINE != 0,
            size: (z > 0.0).then_some(z),
            color,
            font,
        });
    }
    Ok(Item::Text {
        m,
        x,
        y,
        w,
        h,
        size,
        color,
        spans,
    })
}

fn image(c: &mut Cursor<'_>) -> Result<Item, BoardError> {
    let m = c.mat()?;
    let (x, y, w, h) = (c.num()?, c.num()?, c.num()?, c.num()?);
    let href = c.text()?;
    Ok(Item::Image {
        m,
        x,
        y,
        w,
        h,
        href,
    })
}

fn push(pages: &mut [Page], stack: &mut [Vec<Item>], item: Item) -> Result<(), BoardError> {
    if let Some(top) = stack.last_mut() {
        top.push(item);
        return Ok(());
    }
    pages
        .last_mut()
        .ok_or_else(|| bad("objet avant la première page".to_string()))?
        .items
        .push(item);
    Ok(())
}

/// Flux contrôlé en entier avant tout usage (écriture d'une copie) ; tout défaut : `BadList`.
pub fn parse(list: &BoardList) -> Result<Vec<Page>, BoardError> {
    let mut c = Cursor {
        v: &list.ops,
        i: 0,
        texts: &list.texts,
    };
    let mut pages: Vec<Page> = Vec::new();
    let mut stack: Vec<Vec<Item>> = Vec::new();
    while !c.done() {
        let at = c.i;
        match c.int(8)? {
            1 => {
                if !stack.is_empty() {
                    return Err(bad(format!("groupe ouvert à la page suivante ({at})")));
                }
                pages.push(Page::default());
            }
            2 => {
                let bg = c.rgb()?;
                pages
                    .last_mut()
                    .ok_or_else(|| bad("fond avant la première page".to_string()))?
                    .background = Some(bg);
            }
            3 => {
                let it = shape(&mut c)?;
                push(&mut pages, &mut stack, it)?;
            }
            4 => {
                let it = stroke(&mut c)?;
                push(&mut pages, &mut stack, it)?;
            }
            5 => {
                let it = text(&mut c)?;
                push(&mut pages, &mut stack, it)?;
            }
            6 => {
                let it = image(&mut c)?;
                push(&mut pages, &mut stack, it)?;
            }
            7 => {
                if pages.is_empty() {
                    return Err(bad("groupe avant la première page".to_string()));
                }
                if stack.len() >= MAX_GROUP_DEPTH {
                    return Err(bad(format!("groupes imbriqués trop profonds ({at})")));
                }
                stack.push(Vec::new());
            }
            8 => {
                let items = stack
                    .pop()
                    .ok_or_else(|| bad(format!("fin de groupe sans début ({at})")))?;
                push(&mut pages, &mut stack, Item::Group(items))?;
            }
            code => return Err(bad(format!("code inconnu {code} à {at}"))),
        }
    }
    if !stack.is_empty() {
        return Err(bad("groupe non fermé".to_string()));
    }
    Ok(pages)
}

/// Flux témoin W1, partagé par les tests de ce module, de `read.rs`, de `write.rs` (et recopié dans `board-io.test.ts`).
#[cfg(test)]
pub(crate) mod fixtures {
    use super::*;

    pub const W1_OPS: &[f32] = &[
        1.0, 2.0, 0.0, 0.0, 0.0, //
        3.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 10.0, 20.0, 110.0, 70.0, 255.0, 0.0, 0.0, 4.0, 1.0,
        0.0, 0.0, 255.0, //
        4.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 128.0, 0.0, 3.0, 2.0, 0.0, 0.0, 1.0, 10.0, 10.0,
        0.5, //
        5.0, 1.0, 0.0, 0.0, 1.0, 100.0, 200.0, 0.0, 0.0, 300.0, 50.0, 24.0, 0.0, 0.0, 0.0, 2.0,
        0.0, 1.0, 0.0, -1.0, -1.0, -1.0, -1.0, 1.0, 0.0, 32.0, 255.0, 0.0, 0.0, 2.0, //
        6.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 5.0, 5.0, 64.0, 32.0, 3.0, //
        7.0, //
        3.0, 2.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 50.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0,
        0.0, 0.0, //
        3.0, 3.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 10.0, 50.0, 10.0, 0.0, 0.0, 0.0, 2.0, 0.0,
        0.0, 0.0, 0.0, //
        8.0, //
        1.0,
    ];

    pub fn w1_texts() -> Vec<String> {
        ["Bonjour ", "monde", "Liberation Sans", "images/a.png"]
            .iter()
            .map(|s| s.to_string())
            .collect()
    }

    pub fn w1_list() -> BoardList {
        BoardList {
            ops: W1_OPS.to_vec(),
            texts: w1_texts(),
            warnings: Vec::new(),
        }
    }

    pub fn w1_pages() -> Vec<Page> {
        let black = [0, 0, 0];
        vec![
            Page {
                background: Some(black),
                items: vec![
                    Item::Shape {
                        kind: ShapeKind::Rect,
                        m: IDENTITY,
                        x0: 10.0,
                        y0: 20.0,
                        x1: 110.0,
                        y1: 70.0,
                        color: [255, 0, 0],
                        width: 4.0,
                        fill: Some([0, 0, 255]),
                    },
                    Item::Stroke {
                        m: IDENTITY,
                        color: [0, 128, 0],
                        width: 3.0,
                        points: vec![[0.0, 0.0, 1.0], [10.0, 10.0, 0.5]],
                    },
                    Item::Text {
                        m: [1.0, 0.0, 0.0, 1.0, 100.0, 200.0],
                        x: 0.0,
                        y: 0.0,
                        w: 300.0,
                        h: 50.0,
                        size: 24.0,
                        color: black,
                        spans: vec![
                            Span {
                                text: "Bonjour ".to_string(),
                                bold: true,
                                ..Span::default()
                            },
                            Span {
                                text: "monde".to_string(),
                                size: Some(32.0),
                                color: Some([255, 0, 0]),
                                font: Some("Liberation Sans".to_string()),
                                ..Span::default()
                            },
                        ],
                    },
                    Item::Image {
                        m: IDENTITY,
                        x: 5.0,
                        y: 5.0,
                        w: 64.0,
                        h: 32.0,
                        href: "images/a.png".to_string(),
                    },
                    Item::Group(vec![
                        Item::Shape {
                            kind: ShapeKind::Line,
                            m: IDENTITY,
                            x0: 0.0,
                            y0: 0.0,
                            x1: 50.0,
                            y1: 0.0,
                            color: black,
                            width: 2.0,
                            fill: None,
                        },
                        Item::Shape {
                            kind: ShapeKind::Arrow,
                            m: IDENTITY,
                            x0: 0.0,
                            y0: 10.0,
                            x1: 50.0,
                            y1: 10.0,
                            color: black,
                            width: 2.0,
                            fill: None,
                        },
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
        let text_head = [
            1.0, 5.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 10.0, 10.0, 12.0, 0.0, 0.0, 0.0, 1.0,
            0.0, 0.0, 0.0,
        ];
        let mixed_color = [&text_head[..], &[-1.0, 5.0, 5.0, -1.0]].concat();
        let odd_font = [&text_head[..], &[-1.0, -1.0, -1.0, -0.5]].concat();
        for ops in [
            &[9.0][..],
            &[3.0, 0.0][..],
            &[1.0, 7.0][..],
            &[1.0, 8.0][..],
            &[1.0, 2.0, 256.0, 0.0, 0.0][..],
            &[
                1.0, 6.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 9.0,
            ][..],
            &[1.0, 4.0, 1.0, 0.0, 0.0, 1.0, 0.0, f32::NAN][..],
            &[1.0, 3.0, 7.0][..],
            &[
                1.0,
                4.0,
                1.0,
                0.0,
                0.0,
                1.0,
                0.0,
                0.0,
                0.0,
                0.0,
                0.0,
                1.0,
                1_000_000.0,
            ][..],
            &mixed_color[..],
            &odd_font[..],
        ] {
            let l = BoardList {
                ops: ops.to_vec(),
                texts: texts.clone(),
                warnings: Vec::new(),
            };
            assert!(matches!(parse(&l), Err(BoardError::BadList(_))), "{ops:?}");
        }
    }

    #[test]
    fn dialect_parse_knows_board_dialects() {
        assert_eq!(Dialect::parse("iwb"), Some(Dialect::Iwb));
        assert_eq!(Dialect::parse("ubz"), Some(Dialect::Ubz));
        assert_eq!(Dialect::parse("notebook"), Some(Dialect::Notebook));
        assert_eq!(Dialect::parse("pdf"), None);
        assert_eq!(Dialect::parse("olf"), None);
        assert_eq!(Dialect::parse("flipchart"), None);
    }

    fn near(got: Option<[f32; 4]>, want: [f32; 4]) -> bool {
        got.is_some_and(|g| g.iter().zip(want).all(|(a, b)| (a - b).abs() <= 1e-3))
    }

    #[test]
    fn rect_of_reads_four_and_five_point_rectangles() {
        let r = [[0.0, 0.0], [10.0, 0.0], [10.0, 5.0], [0.0, 5.0]];
        let want = [0.0, 0.0, 10.0, 5.0];
        assert_eq!(rect_of(&r), Some(want));
        assert_eq!(rect_of(&[r[0], r[1], r[2], r[3], r[0]]), Some(want));
        assert_eq!(rect_of(&[r[3], r[2], r[1], r[0]]), Some(want));
        // Premier côté vertical.
        assert_eq!(rect_of(&[r[1], r[2], r[3], r[0]]), Some(want));
        // Tolérance 1e-3, pas `==` : sommets bruités et 5e point presque égal au premier.
        let noisy = [[0.0, 0.0], [10.0, 0.0005], [10.0005, 5.0], [0.0, 5.0004], [0.0004, -0.0003]];
        assert!(near(rect_of(&noisy), want), "{:?}", rect_of(&noisy));
        assert!(near(rect_of(&noisy[..4]), want), "{:?}", rect_of(&noisy[..4]));
    }

    #[test]
    fn rect_of_refuses_slanted_flat_and_short() {
        let diamond = [[5.0, 0.0], [10.0, 5.0], [5.0, 10.0], [0.0, 5.0]];
        assert_eq!(rect_of(&diamond), None);
        assert_eq!(rect_of(&[[0.0, 0.0], [10.0, 0.0], [10.0, 5.0]]), None);
        let r = [[0.0, 0.0], [10.0, 0.0], [10.0, 5.0], [0.0, 5.0]];
        assert_eq!(rect_of(&[r[0], r[1], r[2], r[3], [3.0, 3.0]]), None);
        assert_eq!(rect_of(&[r[0], r[1], r[2], r[3], r[0], r[1]]), None);
        // Côtés croisés (alignés deux à deux mais non consécutifs).
        assert_eq!(rect_of(&[r[0], r[1], r[3], r[2]]), None);
        let flat = [[0.0, 0.0], [10.0, 0.0], [10.0, 0.0], [0.0, 0.0]];
        assert_eq!(rect_of(&flat), None);
        let thin = [[0.0, 0.0], [10.0, 0.0], [10.0, 0.0005], [0.0, 0.0005]];
        assert_eq!(rect_of(&thin), None);
        assert_eq!(rect_of(&[[0.0, 0.0], [f32::NAN, 0.0], [10.0, 5.0], [0.0, 5.0]]), None);
        assert_eq!(rect_of(&[]), None);
    }

    #[test]
    fn errors_display_in_french() {
        assert_eq!(
            BoardError::Broken("cadre de page invalide".into()).to_string(),
            "fichier endommagé : cadre de page invalide"
        );
        assert_eq!(
            BoardError::TooBig.to_string(),
            "fichier de tableau trop gros (plus de 100 000 objets)"
        );
        assert_eq!(
            BoardError::BadList("x".into()).to_string(),
            "liste de tableau invalide : x"
        );
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
            ("board/notebook.rs", include_str!("board/notebook.rs")),
        ] {
            for f in forbidden {
                assert!(
                    !src.contains(f),
                    "{file} contient « {f} » : la page traduit le flux (DAU1, D6)"
                );
            }
        }
    }

    #[test]
    fn group_depth_is_bounded() {
        let mut ops = vec![1.0];
        ops.extend(std::iter::repeat_n(7.0, 20000));
        ops.extend(std::iter::repeat_n(8.0, 20000));
        let l = BoardList {
            ops,
            texts: Vec::new(),
            warnings: Vec::new(),
        };
        assert!(matches!(parse(&l), Err(BoardError::BadList(_))));
        let mut ops = vec![1.0];
        ops.extend(std::iter::repeat_n(7.0, 256));
        ops.extend(std::iter::repeat_n(8.0, 256));
        let l = BoardList {
            ops,
            texts: Vec::new(),
            warnings: Vec::new(),
        };
        assert!(parse(&l).is_ok());
    }
}
