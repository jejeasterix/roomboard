//! Écrivain PDF vectoriel (C12, PF22, DAPF4) : une liste d'affichage enregistrée par la page (`RecordingContext2D`,
//! même `paintContent` que l'écran, D7) devient un PDF par `krilla`. Flux de nombres et tableau de textes (PC12) ; table
//! des codes : `docs/plans/usage-c12-pdf-PLAN.md`, tâche T11. Tout est validé par `parse` avant d'ouvrir une page :
//! `Surface` de krilla exige une pile vide à sa destruction. Rust pur, testé en natif ; servi par le module `formats`.
use std::fmt;

use krilla::color::rgb;
use krilla::geom::{Path, PathBuilder, Point, Size, Transform};
use krilla::image::Image;
use krilla::num::NormalizedF32;
use krilla::page::PageSettings;
use krilla::paint::{Fill, FillRule, LineCap, LineJoin, Stroke, StrokeDash};
use krilla::surface::Surface;
use krilla::text::{Font, TextDirection};
use krilla::{Data, Document, SerializeSettings};

/// Hauteur au-dessus de la ligne de base de Liberation Sans (hhea ascender 1854 / 2048) : `textBaseline = "top"`.
pub const ASCENT: f32 = 0.905;
const MAX_SEGMENTS: usize = 1_000_000;
const MAX_DASH: usize = 64;

pub struct DisplayList {
    pub ops: Vec<f32>,
    pub texts: Vec<String>,
}

pub struct ImageInput<'a> {
    pub bytes: &'a [u8],
}

#[derive(Debug, Clone, PartialEq)]
pub enum PdfWriteError {
    BadList(String),
    BadFont(usize),
    BadImage(usize),
    Write(String),
}

impl fmt::Display for PdfWriteError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PdfWriteError::BadList(m) => write!(f, "liste d'opérations invalide : {m}"),
            PdfWriteError::BadFont(i) => write!(f, "police {i} illisible ou absente"),
            PdfWriteError::BadImage(i) => write!(f, "image {i} illisible ou absente (PNG ou JPEG attendu)"),
            PdfWriteError::Write(m) => write!(f, "écriture du PDF impossible : {m}"),
        }
    }
}

impl std::error::Error for PdfWriteError {}

#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Rgba {
    r: u8,
    g: u8,
    b: u8,
    a: f32,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum Seg {
    Move(f32, f32),
    Line(f32, f32),
    Cubic([f32; 6]),
    Close,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum Op {
    Save,
    Restore,
    Fill { m: [f32; 6], color: Rgba, even_odd: bool, path: Vec<Seg> },
    Stroke { m: [f32; 6], color: Rgba, width: f32, cap: usize, join: usize, dash: Vec<f32>, dash_offset: f32, path: Vec<Seg> },
    Clip { m: [f32; 6], even_odd: bool, path: Vec<Seg> },
    Text { m: [f32; 6], color: Rgba, size: f32, x: f32, y: f32, top: bool, text: usize, face: usize },
    Image { m: [f32; 6], image: usize, x: f32, y: f32, w: f32, h: f32, alpha: f32 },
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct PageOps {
    pub w: f32,
    pub h: f32,
    pub ops: Vec<Op>,
}

fn bad(m: String) -> PdfWriteError {
    PdfWriteError::BadList(m)
}

struct Reader<'a> {
    v: &'a [f32],
    i: usize,
}

impl Reader<'_> {
    fn num(&mut self) -> Result<f32, PdfWriteError> {
        let x = *self.v.get(self.i).ok_or_else(|| bad(format!("flux coupé à {}", self.i)))?;
        self.i += 1;
        if x.is_finite() {
            Ok(x)
        } else {
            Err(bad(format!("nombre non fini à {}", self.i - 1)))
        }
    }
    fn count(&mut self, max: usize) -> Result<usize, PdfWriteError> {
        let x = self.num()?;
        if x < 0.0 || x.fract() != 0.0 || f64::from(x) > max as f64 {
            return Err(bad(format!("entier de 0 à {max} attendu à {}, lu {x}", self.i - 1)));
        }
        Ok(x as usize)
    }
    fn m(&mut self) -> Result<[f32; 6], PdfWriteError> {
        let mut m = [0.0; 6];
        for s in &mut m {
            *s = self.num()?;
        }
        Ok(m)
    }
    fn color(&mut self) -> Result<Rgba, PdfWriteError> {
        let c = |x: f32| x.round().clamp(0.0, 255.0) as u8;
        Ok(Rgba { r: c(self.num()?), g: c(self.num()?), b: c(self.num()?), a: self.num()?.clamp(0.0, 1.0) })
    }
    fn path(&mut self) -> Result<Vec<Seg>, PdfWriteError> {
        let n = self.count(MAX_SEGMENTS)?;
        let mut out = Vec::with_capacity(n.min(4096));
        for _ in 0..n {
            out.push(match self.count(3)? {
                0 => Seg::Move(self.num()?, self.num()?),
                1 => Seg::Line(self.num()?, self.num()?),
                2 => {
                    let mut c = [0.0; 6];
                    for s in &mut c {
                        *s = self.num()?;
                    }
                    Seg::Cubic(c)
                }
                _ => Seg::Close,
            });
        }
        Ok(out)
    }
}

/// Flux lu et validé (codes, tailles, indices de texte, de police et d'image) avant toute écriture.
pub(crate) fn parse(list: &DisplayList, fonts: usize, images: usize) -> Result<Vec<PageOps>, PdfWriteError> {
    let mut r = Reader { v: &list.ops, i: 0 };
    let mut pages: Vec<PageOps> = Vec::new();
    while r.i < list.ops.len() {
        let at = r.i;
        let code = r.count(8)?;
        if code == 1 {
            let (w, h) = (r.num()?, r.num()?);
            // Nombres finis (`num`) : `<= 0` couvre tout refus.
            if w <= 0.0 || h <= 0.0 {
                return Err(bad(format!("taille de page {w} × {h}")));
            }
            pages.push(PageOps { w, h, ops: Vec::new() });
            continue;
        }
        let op = match code {
            2 => Op::Save,
            3 => Op::Restore,
            4 => Op::Fill { m: r.m()?, color: r.color()?, even_odd: r.count(1)? == 1, path: r.path()? },
            5 => {
                let (m, color, width) = (r.m()?, r.color()?, r.num()?.max(0.0));
                let (cap, join) = (r.count(2)?, r.count(2)?);
                let n = r.count(MAX_DASH)?;
                let mut dash = Vec::with_capacity(n);
                for _ in 0..n {
                    dash.push(r.num()?.max(0.0));
                }
                let dash_offset = r.num()?;
                Op::Stroke { m, color, width, cap, join, dash, dash_offset, path: r.path()? }
            }
            6 => Op::Clip { m: r.m()?, even_odd: r.count(1)? == 1, path: r.path()? },
            7 => {
                let (m, color, size, x, y) = (r.m()?, r.color()?, r.num()?, r.num()?, r.num()?);
                let top = r.count(1)? == 0;
                let (text, face) = (r.count(usize::MAX)?, r.count(3)?);
                if size <= 0.0 || text >= list.texts.len() {
                    return Err(bad(format!("texte {text} absent ou taille {size} à {at}")));
                }
                if face >= fonts {
                    return Err(PdfWriteError::BadFont(face));
                }
                Op::Text { m, color, size, x, y, top, text, face }
            }
            8 => {
                let (m, image) = (r.m()?, r.count(usize::MAX)?);
                let (x, y, w, h, alpha) = (r.num()?, r.num()?, r.num()?, r.num()?, r.num()?.clamp(0.0, 1.0));
                if image >= images {
                    return Err(PdfWriteError::BadImage(image));
                }
                Op::Image { m, image, x, y, w, h, alpha }
            }
            _ => return Err(bad(format!("code {code} inconnu à {at}"))),
        };
        pages
            .last_mut()
            .ok_or_else(|| bad(format!("opération {code} avant la première page")))?
            .ops
            .push(op);
    }
    Ok(pages)
}

fn tf(m: &[f32; 6]) -> Transform {
    Transform::from_row(m[0], m[1], m[2], m[3], m[4], m[5])
}

fn apply(m: &[f32; 6], x: f32, y: f32) -> (f32, f32) {
    (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])
}

/// Chemin local ; `pre` : points transformés à l'avance (découpe). `None` : chemin vide.
fn build(segs: &[Seg], pre: Option<&[f32; 6]>) -> Option<Path> {
    let at = |x: f32, y: f32| pre.map_or((x, y), |m| apply(m, x, y));
    let mut pb = PathBuilder::new();
    for s in segs {
        match *s {
            Seg::Move(x, y) => {
                let (x, y) = at(x, y);
                pb.move_to(x, y);
            }
            Seg::Line(x, y) => {
                let (x, y) = at(x, y);
                pb.line_to(x, y);
            }
            Seg::Cubic([x1, y1, x2, y2, x, y]) => {
                let ((x1, y1), (x2, y2), (x, y)) = (at(x1, y1), at(x2, y2), at(x, y));
                pb.cubic_to(x1, y1, x2, y2, x, y);
            }
            Seg::Close => pb.close(),
        }
    }
    pb.finish()
}

fn rule(even_odd: bool) -> FillRule {
    if even_odd {
        FillRule::EvenOdd
    } else {
        FillRule::NonZero
    }
}

fn opacity(a: f32) -> NormalizedF32 {
    NormalizedF32::new(a).unwrap_or(NormalizedF32::ONE)
}

fn fill(c: Rgba, even_odd: bool) -> Fill {
    Fill { paint: rgb::Color::new(c.r, c.g, c.b).into(), opacity: opacity(c.a), rule: rule(even_odd) }
}

/// Une opération ; `levels` : découpes poussées par niveau de `save` (un `restore` les retire).
fn draw(s: &mut Surface<'_>, op: &Op, levels: &mut Vec<usize>, fonts: &[Font], images: &[Image], texts: &[String]) {
    match op {
        Op::Save => levels.push(0),
        Op::Restore => {
            if levels.len() > 1 {
                for _ in 0..levels.pop().unwrap_or(0) {
                    s.pop();
                }
            }
        }
        Op::Fill { m, color, even_odd, path } => {
            if let Some(path) = build(path, None) {
                s.push_transform(&tf(m));
                s.set_stroke(None);
                s.set_fill(Some(fill(*color, *even_odd)));
                s.draw_path(&path);
                s.pop();
            }
        }
        Op::Stroke { m, color, width, cap, join, dash, dash_offset, path } => {
            if let Some(path) = build(path, Some(m)) {
                s.set_fill(None);
                s.set_stroke(Some(Stroke {
                    paint: rgb::Color::new(color.r, color.g, color.b).into(),
                    width: *width,
                    miter_limit: 10.0,
                    line_cap: match cap {
                        1 => LineCap::Round,
                        2 => LineCap::Square,
                        _ => LineCap::Butt,
                    },
                    line_join: match join {
                        1 => LineJoin::Round,
                        2 => LineJoin::Bevel,
                        _ => LineJoin::Miter,
                    },
                    opacity: opacity(color.a),
                    dash: (!dash.is_empty()).then(|| StrokeDash { array: dash.clone(), offset: *dash_offset }),
                }));
                s.draw_path(&path);
            }
        }
        // Découpe vide : ignorée (le canvas découperait tout) ; cas sans effet visible à l'export.
        Op::Clip { m, even_odd, path } => {
            if let Some(path) = build(path, Some(m)) {
                s.push_clip_path(&path, &rule(*even_odd));
                if let Some(n) = levels.last_mut() {
                    *n += 1;
                }
            }
        }
        Op::Text { m, color, size, x, y, top, text, face } => {
            if let (Some(font), Some(t)) = (fonts.get(*face), texts.get(*text)) {
                s.push_transform(&tf(m));
                s.set_stroke(None);
                s.set_fill(Some(fill(*color, false)));
                let base = if *top { *y + size * ASCENT } else { *y };
                s.draw_text(Point::from_xy(*x, base), font.clone(), *size, t, false, TextDirection::Auto);
                s.pop();
            }
        }
        Op::Image { m, image, x, y, w, h, alpha } => {
            if let (Some(img), Some(size)) = (images.get(*image), Size::from_wh(*w, *h)) {
                let (e, f) = apply(m, *x, *y);
                s.push_transform(&Transform::from_row(m[0], m[1], m[2], m[3], e, f));
                let fade = *alpha < 1.0;
                if fade {
                    s.push_opacity(opacity(*alpha));
                }
                s.draw_image(img.clone(), size);
                if fade {
                    s.pop();
                }
                s.pop();
            }
        }
    }
}

pub fn write_pages(list: &DisplayList, fonts: &[&[u8]], images: &[ImageInput<'_>]) -> Result<Vec<u8>, PdfWriteError> {
    write_pages_with(list, fonts, images, SerializeSettings::default())
}

/// `write_pages` sous des réglages de sérialisation donnés (les tests lisent le flux de contenu non compressé).
fn write_pages_with(
    list: &DisplayList,
    fonts: &[&[u8]],
    images: &[ImageInput<'_>],
    settings: SerializeSettings,
) -> Result<Vec<u8>, PdfWriteError> {
    let pages = parse(list, fonts.len(), images.len())?;
    if pages.is_empty() {
        return Err(bad("aucune page".into()));
    }
    let fonts = fonts
        .iter()
        .enumerate()
        .map(|(i, f)| Font::new(Data::from(f.to_vec()), 0).ok_or(PdfWriteError::BadFont(i)))
        .collect::<Result<Vec<_>, _>>()?;
    let images = images
        .iter()
        .enumerate()
        .map(|(i, im)| {
            Image::from_png(Data::from(im.bytes.to_vec()), true)
                .or_else(|_| Image::from_jpeg(Data::from(im.bytes.to_vec()), true))
                .map_err(|_| PdfWriteError::BadImage(i))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let mut doc = Document::new_with(settings);
    for p in &pages {
        let settings = PageSettings::from_wh(p.w, p.h).ok_or_else(|| bad(format!("taille de page {} × {}", p.w, p.h)))?;
        let mut page = doc.start_page_with(settings);
        let mut s = page.surface();
        let mut levels: Vec<usize> = vec![0];
        for op in &p.ops {
            draw(&mut s, op, &mut levels, &fonts, &images, &list.texts);
        }
        for n in levels.drain(..) {
            for _ in 0..n {
                s.pop();
            }
        }
        s.finish();
        page.finish();
    }
    doc.finish().map_err(|e| PdfWriteError::Write(format!("{e:?}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    const FONT: &[u8] = include_bytes!("../tests/fixtures/LiberationSans-Regular.ttf");
    const PNG_1PX: [u8; 70] = [
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21,
        196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218, 99, 100, 248, 207, 80, 15, 0, 3, 134, 1, 128, 90, 52, 125,
        107, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ];
    const G1: [f32; 29] = [
        1.0, 200.0, 100.0, 4.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 255.0, 0.0, 0.0, 1.0, 0.0, 5.0, 0.0, 10.0, 20.0, 1.0,
        40.0, 20.0, 1.0, 40.0, 60.0, 1.0, 10.0, 60.0, 3.0,
    ];
    const ID: [f32; 6] = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

    fn list(ops: &[f32], texts: &[&str]) -> DisplayList {
        DisplayList { ops: ops.to_vec(), texts: texts.iter().map(|t| t.to_string()).collect() }
    }
    fn is_pdf(b: &[u8]) -> bool {
        b.starts_with(b"%PDF-") && b.windows(5).any(|w| w == b"%%EOF")
    }
    fn has(b: &[u8], s: &str) -> bool {
        b.windows(s.len()).any(|w| w == s.as_bytes())
    }

    /// Flux témoin G1, joué aussi par `record-ctx.test.ts` (T12) : parité du codage.
    #[test]
    fn golden_stream_g1_parses_to_one_red_rect() {
        let pages = parse(&list(&G1, &[]), 0, 0).expect("G1");
        let red = Rgba { r: 255, g: 0, b: 0, a: 1.0 };
        let path = vec![Seg::Move(10.0, 20.0), Seg::Line(40.0, 20.0), Seg::Line(40.0, 60.0), Seg::Line(10.0, 60.0), Seg::Close];
        assert_eq!(pages, vec![PageOps { w: 200.0, h: 100.0, ops: vec![Op::Fill { m: ID, color: red, even_odd: false, path }] }]);
        assert!(is_pdf(&write_pages(&list(&G1, &[]), &[], &[]).expect("PDF")));
    }

    #[test]
    fn bad_streams_are_bad_list() {
        for ops in [&[9.0][..], &[1.0, 200.0][..], &[4.0, 1.0][..], &[1.0, 0.0, 100.0][..], &[1.0, 10.0, 10.0, 2.5][..], &[1.0, 10.0, f32::NAN][..]] {
            assert!(matches!(write_pages(&list(ops, &[]), &[], &[]), Err(PdfWriteError::BadList(_))), "{ops:?}");
        }
        assert!(matches!(write_pages(&list(&[], &[]), &[], &[]), Err(PdfWriteError::BadList(_))));
    }

    #[test]
    fn text_needs_its_font_and_image_its_index() {
        let mut text = vec![1.0, 100.0, 100.0, 7.0];
        text.extend(ID);
        text.extend([0.0, 0.0, 0.0, 1.0, 12.0, 10.0, 10.0, 0.0, 0.0, 1.0]);
        assert_eq!(parse(&list(&text, &["a"]), 1, 0).err(), Some(PdfWriteError::BadFont(1)));
        let mut image = vec![1.0, 100.0, 100.0, 8.0];
        image.extend(ID);
        image.extend([0.0, 0.0, 0.0, 10.0, 10.0, 1.0]);
        assert_eq!(parse(&list(&image, &[]), 0, 0).err(), Some(PdfWriteError::BadImage(0)));
    }

    #[test]
    fn fill_stroke_and_clip_write_a_pdf() {
        let mut ops = G1.to_vec();
        ops.extend([2.0, 6.0]);
        ops.extend(ID);
        ops.extend([0.0, 4.0, 0.0, 0.0, 0.0, 1.0, 100.0, 0.0, 1.0, 100.0, 50.0, 3.0]);
        ops.push(5.0);
        ops.extend([2.0, 0.0, 0.0, 2.0, 5.0, 5.0]);
        ops.extend([0.0, 0.0, 255.0, 0.5, 4.0, 1.0, 1.0, 2.0, 6.0, 4.0, 0.0, 3.0, 0.0, 0.0, 0.0, 2.0, 10.0, 0.0, 20.0, 10.0, 30.0, 30.0, 3.0]);
        ops.extend([3.0, 1.0, 50.0, 50.0]);
        let pdf = write_pages(&list(&ops, &[]), &[], &[]).expect("PDF");
        assert!(is_pdf(&pdf));
    }

    /// Patron écarté (T11) : transformer les points d'un trait à l'avance changerait son épaisseur sous une échelle non
    /// uniforme (et fausserait la jointure). Le trait garde son chemin local sous sa matrice (`cm`) ; seule la découpe,
    /// qui doit survivre au `pop` de la matrice jusqu'au `restore`, est transformée à l'avance.
    #[test]
    fn stroke_path_stays_local_under_its_matrix_and_clip_is_pretransformed() {
        let mut ops = vec![1.0, 100.0, 100.0, 2.0, 6.0, 2.0, 0.0, 0.0, 2.0, 0.0, 0.0];
        ops.extend([0.0, 4.0, 0.0, 1.0, 1.0, 1.0, 13.0, 1.0, 1.0, 13.0, 17.0, 3.0]);
        ops.extend([5.0, 3.0, 0.0, 0.0, 1.0, 0.0, 0.0]);
        ops.extend([0.0, 0.0, 0.0, 1.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0, 10.0, 10.0, 1.0, 20.0, 10.0, 3.0]);
        let plain = SerializeSettings { compress_content_streams: false, ..SerializeSettings::default() };
        let pdf = write_pages_with(&list(&ops, &[]), &[], &[], plain).expect("PDF");
        assert!(is_pdf(&pdf));
        // Trait : matrice poussée, chemin local, largeur d'origine.
        assert!(has(&pdf, "3 0 0 1 0 0 cm"), "matrice du trait absente");
        assert!(has(&pdf, "10 10 m") && has(&pdf, "20 10 l"), "chemin du trait non local");
        assert!(!has(&pdf, "30 10 m") && !has(&pdf, "60 10 l"), "chemin du trait transformé à l'avance");
        assert!(has(&pdf, "2 w"), "largeur du trait");
        // Découpe : points transformés à l'avance (échelle 2), aucun `cm` à l'échelle 2.
        assert!(has(&pdf, "2 2 m") && has(&pdf, "26 2 l") && has(&pdf, "26 34 l"), "découpe non transformée");
        assert!(!has(&pdf, "13 17 l") && !has(&pdf, "2 0 0 2 0 0 cm"), "découpe laissée locale");
    }

    /// Une erreur tardive dans le flux (police absente sur la seconde page, après une découpe ouverte sur la première)
    /// est rendue avant toute page : jamais de retour après `start_page_with` (la `Surface` de krilla vérifie sa pile).
    #[test]
    fn late_bad_op_is_refused_before_any_page_opens() {
        let mut ops = vec![1.0, 100.0, 100.0, 2.0, 6.0];
        ops.extend(ID);
        ops.extend([0.0, 2.0, 0.0, 0.0, 0.0, 1.0, 50.0, 50.0]);
        ops.extend(&G1[3..]);
        ops.extend([1.0, 100.0, 100.0, 7.0]);
        ops.extend(ID);
        ops.extend([0.0, 0.0, 0.0, 1.0, 12.0, 10.0, 10.0, 0.0, 0.0, 0.0]);
        assert_eq!(write_pages(&list(&ops, &["a"]), &[], &[]).err(), Some(PdfWriteError::BadFont(0)));
    }

    #[test]
    fn text_and_image_write_a_pdf() {
        let mut ops = vec![1.0, 300.0, 200.0, 7.0];
        ops.extend(ID);
        ops.extend([0.0, 0.0, 0.0, 1.0, 24.0, 10.0, 10.0, 0.0, 0.0, 0.0, 8.0]);
        ops.extend(ID);
        ops.extend([0.0, 20.0, 60.0, 50.0, 50.0, 0.5]);
        let pdf = write_pages(&list(&ops, &["RoomBoard vectoriel"]), &[FONT], &[ImageInput { bytes: &PNG_1PX }]).expect("PDF");
        assert!(is_pdf(&pdf));
    }

    #[test]
    fn unbalanced_restore_and_dangling_save_do_not_panic() {
        let mut ops = vec![1.0, 100.0, 100.0, 3.0, 3.0, 2.0, 2.0, 6.0];
        ops.extend(ID);
        ops.extend([0.0, 2.0, 0.0, 0.0, 0.0, 1.0, 50.0, 50.0]);
        ops.extend(&G1[3..]);
        assert!(is_pdf(&write_pages(&list(&ops, &[]), &[], &[]).expect("PDF")));
    }

    #[test]
    fn unreadable_font_or_image_is_named() {
        assert_eq!(write_pages(&list(&G1, &[]), &[b"pas une police"], &[]).err(), Some(PdfWriteError::BadFont(0)));
        assert_eq!(write_pages(&list(&G1, &[]), &[], &[ImageInput { bytes: b"pas une image" }]).err(), Some(PdfWriteError::BadImage(0)));
        assert_eq!(PdfWriteError::BadFont(2).to_string(), "police 2 illisible ou absente");
    }
}
