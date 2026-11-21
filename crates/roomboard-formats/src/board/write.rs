//! Écrivain des copies (C13, D17 à D19, niveau E) : flux BoardList → `content.xml` IWB (racine `<iwb version="1.0">`,
//! espace de la norme finale ; lu par nom local, Becta et 1EdTech acceptés) ou pages `pageNNN.svg` et `metadata.rdf`
//! d'OpenBoard (`ub:version` 4.8.0). Groupes en `g` et fond en premier `rect` de la page (relus par `read_svg`, D13,
//! D14) ; cadre de 1 920 de large et `max(1080, bas du contenu)` de haut (D18). Les chaînes d'hôte ne vivent qu'ici,
//! dans le `.wasm` (D19).
use super::{
    apply, parse, BoardError, BoardList, Item, Mat, Page, Rgb, ShapeKind, Span, MAX_OBJECTS,
    MAX_PAGES, PAGE_HEIGHT, PAGE_WIDTH,
};

pub const IWB_NS: &str = "http://www.imsglobal.org/xsd/iwb_v1p0";
const SVG_NS: &str = "http://www.w3.org/2000/svg";
const XLINK_NS: &str = "http://www.w3.org/1999/xlink";
pub const UB_NS: &str = "http://uniboard.mnemis.com/document";
pub const UB_VERSION: &str = "4.8.0";
const QT_DOCTYPE: &str = r#"<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd">"#;

#[derive(Clone, Copy, PartialEq, Eq)]
enum Kind {
    Iwb,
    Ubz,
}

/// Nombre écrit au millième, sans zéro inutile ; −0 écrit 0.
fn num(v: f32) -> String {
    let r = (v * 1000.0).round() / 1000.0;
    if r == 0.0 {
        "0".to_string()
    } else {
        format!("{r}")
    }
}

fn hex(c: Rgb) -> String {
    format!("#{:02x}{:02x}{:02x}", c[0], c[1], c[2])
}

/// XML : texte et attributs ; caractères de contrôle (hors tabulation et retours) retirés.
fn esc(s: &str) -> String {
    let mut o = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '&' => o.push_str("&amp;"),
            '<' => o.push_str("&lt;"),
            '>' => o.push_str("&gt;"),
            '"' => o.push_str("&quot;"),
            '\'' => o.push_str("&apos;"),
            c if (c as u32) < 0x20 && !matches!(c, '\t' | '\n' | '\r') => {}
            c => o.push(c),
        }
    }
    o
}

/// HTML de Qt : texte d'un segment.
fn esc_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Translation seule : repliée dans les coordonnées ; toute autre matrice : attribut `transform`.
fn place(m: &Mat) -> (String, f32, f32) {
    if m[0] == 1.0 && m[1] == 0.0 && m[2] == 0.0 && m[3] == 1.0 {
        (String::new(), m[4], m[5])
    } else {
        (
            format!(
                r#" transform="matrix({} {} {} {} {} {})""#,
                m[0],
                m[1],
                m[2],
                m[3],
                num(m[4]),
                num(m[5])
            ),
            0.0,
            0.0,
        )
    }
}

fn bottom(it: &Item) -> f32 {
    let lowest = |m: &Mat, pts: &[(f32, f32)]| {
        pts.iter()
            .map(|&(x, y)| apply(m, x, y).1)
            .fold(f32::MIN, f32::max)
    };
    match it {
        Item::Shape {
            m, x0, y0, x1, y1, ..
        } => lowest(m, &[(*x0, *y0), (*x1, *y0), (*x0, *y1), (*x1, *y1)]),
        Item::Stroke { m, points, .. } => points
            .iter()
            .map(|q| apply(m, q[0], q[1]).1)
            .fold(f32::MIN, f32::max),
        Item::Text { m, x, y, w, h, .. } | Item::Image { m, x, y, w, h, .. } => {
            lowest(m, &[(*x, *y), (x + w, *y), (*x, y + h), (x + w, y + h)])
        }
        Item::Group(items) => items.iter().map(bottom).fold(f32::MIN, f32::max),
    }
}

/// D18 : hauteur du cadre, au moins 1 080.
fn frame_height(pages: &[Page]) -> f32 {
    pages
        .iter()
        .flat_map(|p| p.items.iter())
        .map(bottom)
        .fold(PAGE_HEIGHT, f32::max)
        .ceil()
}

fn span_attrs(sp: &Span) -> String {
    let mut a = String::new();
    if sp.bold {
        a.push_str(r#" font-weight="bold""#);
    }
    if sp.italic {
        a.push_str(r#" font-style="italic""#);
    }
    if sp.underline {
        a.push_str(r#" text-decoration="underline""#);
    }
    if let Some(z) = sp.size {
        a.push_str(&format!(r#" font-size="{}""#, num(z)));
    }
    if let Some(c) = sp.color {
        a.push_str(&format!(r#" fill="{}""#, hex(c)));
    }
    if let Some(f) = &sp.font {
        a.push_str(&format!(r#" font-family="{}""#, esc(f)));
    }
    a
}

/// Texte d'une page `.ubz` : HTML de Qt que `read_qt_html` relit (taille et couleur au `body`, un `span` par segment,
/// `<br />` pour un saut de ligne).
fn qt_html_of(size: f32, color: Rgb, spans: &[Span]) -> String {
    let mut h = format!(
        r#"{QT_DOCTYPE}<html><head><meta name="qrichtext" content="1" /></head><body style="font-size:{}px; color:{};"><p>"#,
        num(size),
        hex(color)
    );
    for sp in spans {
        let mut st = String::new();
        if sp.bold {
            st.push_str("font-weight:600; ");
        }
        if sp.italic {
            st.push_str("font-style:italic; ");
        }
        if sp.underline {
            st.push_str("text-decoration: underline; ");
        }
        if let Some(z) = sp.size {
            st.push_str(&format!("font-size:{}px; ", num(z)));
        }
        if let Some(c) = sp.color {
            st.push_str(&format!("color:{}; ", hex(c)));
        }
        if let Some(f) = &sp.font {
            st.push_str(&format!("font-family:'{}'; ", f.replace(['\'', '"'], "")));
        }
        let text = sp
            .text
            .split('\n')
            .map(esc_html)
            .collect::<Vec<_>>()
            .join("<br />");
        h.push_str(&format!(r#"<span style="{}">{text}</span>"#, st.trim_end()));
    }
    h.push_str("</p></body></html>");
    h
}

struct Out {
    s: String,
    kind: Kind,
    next: u32,
    /// `iwb:element` écrits après le `svg` (fond, flèches).
    refs: Vec<String>,
}

impl Out {
    fn new(kind: Kind) -> Out {
        Out {
            s: String::new(),
            kind,
            next: 0,
            refs: Vec::new(),
        }
    }
    fn p(&self) -> &'static str {
        if self.kind == Kind::Iwb {
            "svg:"
        } else {
            ""
        }
    }
    fn id(&mut self) -> String {
        self.next += 1;
        format!("o{}", self.next)
    }
    fn background(&mut self, bg: Rgb, h: f32) {
        let id = self.id();
        let p = self.p();
        self.s.push_str(&format!(
            r#"<{p}rect id="{id}" x="0" y="0" width="{}" height="{}" fill="{}" stroke="none"/>"#,
            num(PAGE_WIDTH),
            num(h),
            hex(bg)
        ));
        self.s.push('\n');
        if self.kind == Kind::Iwb {
            self.refs
                .push(format!(r#"<iwb:element ref="{id}" background="true"/>"#));
        }
    }
    fn item(&mut self, it: &Item) {
        let p = self.p();
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
                let id = self.id();
                let (t, dx, dy) = place(m);
                let paint = format!(
                    r#" stroke="{}" stroke-width="{}" fill="{}""#,
                    hex(*color),
                    num(*width),
                    fill.map_or_else(|| "none".to_string(), hex)
                );
                let body = match kind {
                    ShapeKind::Rect => format!(
                        r#"<{p}rect id="{id}" x="{}" y="{}" width="{}" height="{}"{paint}{t}/>"#,
                        num(x0.min(*x1) + dx),
                        num(y0.min(*y1) + dy),
                        num((x1 - x0).abs()),
                        num((y1 - y0).abs())
                    ),
                    ShapeKind::Ellipse => format!(
                        r#"<{p}ellipse id="{id}" cx="{}" cy="{}" rx="{}" ry="{}"{paint}{t}/>"#,
                        num((x0 + x1) / 2.0 + dx),
                        num((y0 + y1) / 2.0 + dy),
                        num((x1 - x0).abs() / 2.0),
                        num((y1 - y0).abs() / 2.0)
                    ),
                    ShapeKind::Line | ShapeKind::Arrow => {
                        format!(
                            r#"<{p}line id="{id}" x1="{}" y1="{}" x2="{}" y2="{}"{paint}{t}/>"#,
                            num(x0 + dx),
                            num(y0 + dy),
                            num(x1 + dx),
                            num(y1 + dy)
                        )
                    }
                };
                self.s.push_str(&body);
                if *kind == ShapeKind::Arrow && self.kind == Kind::Iwb {
                    self.refs.push(format!(
                        r#"<iwb:element ref="{id}" stroke-lineshape-end="arrow"/>"#
                    ));
                }
            }
            Item::Stroke {
                m,
                color,
                width,
                points,
            } => {
                let id = self.id();
                let (t, dx, dy) = place(m);
                let pts: Vec<String> = points
                    .iter()
                    .map(|q| format!("{},{}", num(q[0] + dx), num(q[1] + dy)))
                    .collect();
                self.s.push_str(&format!(
                    r#"<{p}polyline id="{id}" points="{}" stroke="{}" stroke-width="{}" fill="none" stroke-linecap="round" stroke-linejoin="round"{t}/>"#,
                    pts.join(" "),
                    hex(*color),
                    num(*width)
                ));
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
                let id = self.id();
                let (t, dx, dy) = place(m);
                let (x, y) = (num(x + dx), num(y + dy));
                if self.kind == Kind::Iwb {
                    let mut s = format!(
                        r#"<svg:textarea id="{id}" x="{x}" y="{y}" width="{}" height="{}" font-size="{}" fill="{}" xml:space="preserve"{t}>"#,
                        num(*w),
                        num(*h),
                        num(*size),
                        hex(*color)
                    );
                    for sp in spans {
                        s.push_str(&format!("<svg:tspan{}>", span_attrs(sp)));
                        for (k, part) in sp.text.split('\n').enumerate() {
                            if k > 0 {
                                s.push_str("<svg:tbreak/>");
                            }
                            s.push_str(&esc(part));
                        }
                        s.push_str("</svg:tspan>");
                    }
                    s.push_str("</svg:textarea>");
                    self.s.push_str(&s);
                } else {
                    self.s.push_str(&format!(
                        r#"<foreignObject id="{id}" ub:type="text" x="{x}" y="{y}" width="{}" height="{}"{t}><itemTextContent>{}</itemTextContent></foreignObject>"#,
                        num(*w),
                        num(*h),
                        esc(&qt_html_of(*size, *color, spans))
                    ));
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
                let id = self.id();
                let (t, dx, dy) = place(m);
                self.s.push_str(&format!(
                    r#"<{p}image id="{id}" x="{}" y="{}" width="{}" height="{}" preserveAspectRatio="none" xlink:href="{}"{t}/>"#,
                    num(x + dx),
                    num(y + dy),
                    num(*w),
                    num(*h),
                    esc(href)
                ));
            }
            Item::Group(items) => {
                let id = self.id();
                self.s.push_str(&format!(r#"<{p}g id="{id}">"#));
                for i in items {
                    self.item(i);
                }
                self.s.push_str(&format!("</{p}g>"));
            }
        }
    }
}

/// Objets d'un arbre, groupes compris.
fn count(items: &[Item]) -> usize {
    items
        .iter()
        .map(|i| 1 + if let Item::Group(g) = i { count(g) } else { 0 })
        .sum()
}

/// `parse` n'applique pas les bornes du fichier au flux de la page : refus propre ici (`TooBig`).
fn parse_bounded(list: &BoardList) -> Result<Vec<Page>, BoardError> {
    let pages = parse(list)?;
    if pages.len() > MAX_PAGES || pages.iter().map(|p| count(&p.items)).sum::<usize>() > MAX_OBJECTS
    {
        return Err(BoardError::TooBig);
    }
    Ok(pages)
}

/// `content.xml` d'une copie `.iwb` (un seul cadre pour toutes les pages : le plus haut).
pub fn write_iwb(list: &BoardList) -> Result<String, BoardError> {
    let pages = parse_bounded(list)?;
    let h = num(frame_height(&pages));
    let hf = frame_height(&pages);
    let w = num(PAGE_WIDTH);
    let mut o = Out::new(Kind::Iwb);
    o.s.push_str(&format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<iwb xmlns=\"{IWB_NS}\" xmlns:iwb=\"{IWB_NS}\" xmlns:svg=\"{SVG_NS}\" xmlns:xlink=\"{XLINK_NS}\" version=\"1.0\">\n<svg:svg width=\"{w}\" height=\"{h}\" viewBox=\"0 0 {w} {h}\">\n<svg:pageset>\n"
    ));
    for (i, p) in pages.iter().enumerate() {
        o.s.push_str(&format!("<svg:page id=\"page{}\">\n", i + 1));
        if let Some(bg) = p.background {
            o.background(bg, hf);
        }
        for it in &p.items {
            o.item(it);
            o.s.push('\n');
        }
        o.s.push_str("</svg:page>\n");
    }
    o.s.push_str("</svg:pageset>\n</svg:svg>\n");
    for r in std::mem::take(&mut o.refs) {
        o.s.push_str(&r);
        o.s.push('\n');
    }
    o.s.push_str("</iwb>\n");
    Ok(o.s)
}

/// Pages `pageNNN.svg` d'une copie `.ubz`, une chaîne par page, dans l'ordre (cadre propre à chaque page).
pub fn write_ubz_pages(list: &BoardList) -> Result<Vec<String>, BoardError> {
    let pages = parse_bounded(list)?;
    Ok(pages
        .iter()
        .map(|p| {
            let hf = frame_height(std::slice::from_ref(p));
            let (w, h) = (num(PAGE_WIDTH), num(hf));
            let mut o = Out::new(Kind::Ubz);
            o.s.push_str(&format!(
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"{SVG_NS}\" xmlns:xlink=\"{XLINK_NS}\" xmlns:ub=\"{UB_NS}\" ub:version=\"{UB_VERSION}\" width=\"{w}\" height=\"{h}\" viewBox=\"0 0 {w} {h}\">\n"
            ));
            if let Some(bg) = p.background {
                o.background(bg, hf);
            }
            for it in &p.items {
                o.item(it);
                o.s.push('\n');
            }
            o.s.push_str("</svg>\n");
            o.s
        })
        .collect())
}

/// `metadata.rdf` d'une copie `.ubz`.
pub fn ubz_metadata(pages: usize) -> String {
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:ub=\"{UB_NS}\">\n <rdf:Description>\n  <dc:title>RoomBoard</dc:title>\n  <ub:version>{UB_VERSION}</ub:version>\n  <ub:pageCount>{pages}</ub:pageCount>\n </rdf:Description>\n</rdf:RDF>\n"
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::board::fixtures::{w1_list, w1_pages};
    use crate::board::{encode, IDENTITY};

    fn well_formed(xml: &str) {
        let mut r = quick_xml::Reader::from_str(xml);
        loop {
            match r.read_event() {
                Ok(quick_xml::events::Event::Eof) => break,
                Ok(_) => {}
                Err(e) => panic!("XML mal formé : {e}\n{xml}"),
            }
        }
    }

    fn one_page(items: Vec<Item>) -> BoardList {
        encode(&[Page {
            background: None,
            items,
        }])
    }

    #[test]
    fn iwb_of_w1_has_namespaces_pages_background_arrow_and_spans() {
        let xml = write_iwb(&w1_list()).expect("iwb");
        well_formed(&xml);
        for part in [
            r#"<iwb xmlns="http://www.imsglobal.org/xsd/iwb_v1p0""#,
            r#"version="1.0">"#,
            r#"viewBox="0 0 1920 1080""#,
            "<svg:pageset>",
            r#"<svg:page id="page1">"#,
            r#"<svg:page id="page2">"#,
            r#"<iwb:element ref="o1" background="true"/>"#,
            r#"<iwb:element ref="o8" stroke-lineshape-end="arrow"/>"#,
            r##"<svg:rect id="o2" x="10" y="20" width="100" height="50" stroke="#ff0000" stroke-width="4" fill="#0000ff"/>"##,
            r##"<svg:textarea id="o4" x="100" y="200" width="300" height="50" font-size="24" fill="#000000" xml:space="preserve">"##,
            r#"<svg:tspan font-weight="bold">Bonjour </svg:tspan>"#,
            r##"<svg:tspan font-size="32" fill="#ff0000" font-family="Liberation Sans">monde</svg:tspan>"##,
            r#"xlink:href="images/a.png""#,
            r#"<svg:g id="o6">"#,
        ] {
            assert!(xml.contains(part), "{part}\n{xml}");
        }
        assert_eq!(xml.matches("<svg:page ").count(), 2);
        assert_eq!(w1_pages().len(), 2);
    }

    #[test]
    fn frame_height_follows_the_lowest_object() {
        let list = one_page(vec![Item::Shape {
            kind: ShapeKind::Rect,
            m: IDENTITY,
            x0: 0.0,
            y0: 2900.0,
            x1: 10.0,
            y1: 2999.5,
            color: [0, 0, 0],
            width: 1.0,
            fill: None,
        }]);
        assert!(write_iwb(&list)
            .expect("iwb")
            .contains(r#"viewBox="0 0 1920 3000""#));
        assert!(write_ubz_pages(&list).expect("ubz")[0].contains(r#"viewBox="0 0 1920 3000""#));
    }

    #[test]
    fn pure_translation_is_folded_other_matrices_kept() {
        let list = one_page(vec![
            Item::Image {
                m: [1.0, 0.0, 0.0, 1.0, 30.0, 40.0],
                x: 0.0,
                y: 0.0,
                w: 8.0,
                h: 8.0,
                href: "images/a.png".into(),
            },
            Item::Image {
                m: [0.0, 1.0, -1.0, 0.0, 30.0, 40.0],
                x: 0.0,
                y: 0.0,
                w: 8.0,
                h: 8.0,
                href: "images/a.png".into(),
            },
        ]);
        let xml = write_iwb(&list).expect("iwb");
        assert!(
            xml.contains(r#"<svg:image id="o1" x="30" y="40" width="8" height="8""#),
            "{xml}"
        );
        assert!(
            xml.contains(r#"transform="matrix(0 1 -1 0 30 40)""#),
            "{xml}"
        );
    }

    #[test]
    fn ubz_pages_have_ub_namespace_background_first_and_qt_text() {
        let pages = write_ubz_pages(&w1_list()).expect("ubz");
        assert_eq!(pages.len(), 2);
        for p in &pages {
            well_formed(p);
            assert!(
                p.contains(r#"xmlns:ub="http://uniboard.mnemis.com/document""#)
                    && p.contains(r#"ub:version="4.8.0""#)
            );
        }
        let first = &pages[0];
        let rect = first.find("<rect").expect("fond");
        assert!(
            first[rect..].starts_with(
                r##"<rect id="o1" x="0" y="0" width="1920" height="1080" fill="#000000""##
            ),
            "{first}"
        );
        assert!(first.contains(r#"<foreignObject id="o4" ub:type="text" x="100" y="200" width="300" height="50"><itemTextContent>&lt;!DOCTYPE HTML"#), "{first}");
        assert!(
            first.contains("font-weight:600;&quot;&gt;Bonjour &lt;/span&gt;"),
            "{first}"
        );
        assert!(!first.contains("iwb:element"));
    }

    #[test]
    fn text_and_attributes_are_escaped() {
        let list = one_page(vec![
            Item::Text {
                m: IDENTITY,
                x: 0.0,
                y: 0.0,
                w: 10.0,
                h: 10.0,
                size: 12.0,
                color: [0, 0, 0],
                spans: vec![Span {
                    text: "a<b&c\"d'\u{1}e\nf".into(),
                    font: Some("X\"Y".into()),
                    ..Span::default()
                }],
            },
            Item::Image {
                m: IDENTITY,
                x: 0.0,
                y: 0.0,
                w: 1.0,
                h: 1.0,
                href: "images/a&b.png".into(),
            },
        ]);
        let xml = write_iwb(&list).expect("iwb");
        well_formed(&xml);
        assert!(
            xml.contains("a&lt;b&amp;c&quot;d&apos;e<svg:tbreak/>f"),
            "{xml}"
        );
        assert!(
            xml.contains(r#"font-family="X&quot;Y""#)
                && xml.contains(r#"xlink:href="images/a&amp;b.png""#)
        );
        for p in write_ubz_pages(&list).expect("ubz") {
            well_formed(&p);
        }
    }

    #[test]
    fn bad_list_is_refused_before_writing() {
        let bad = BoardList {
            ops: vec![9.0],
            texts: Vec::new(),
            warnings: Vec::new(),
        };
        assert!(matches!(write_iwb(&bad), Err(BoardError::BadList(_))));
        assert!(matches!(write_ubz_pages(&bad), Err(BoardError::BadList(_))));
    }

    #[test]
    fn ubz_metadata_names_version_and_page_count() {
        let m = ubz_metadata(2);
        well_formed(&m);
        assert!(
            m.contains("<ub:version>4.8.0</ub:version>")
                && m.contains("<ub:pageCount>2</ub:pageCount>")
        );
    }

    #[test]
    fn more_than_max_pages_is_refused_cleanly() {
        let pages: Vec<Page> = (0..=crate::board::MAX_PAGES)
            .map(|_| Page::default())
            .collect();
        let list = encode(&pages);
        assert!(matches!(write_iwb(&list), Err(BoardError::TooBig)));
        assert!(matches!(write_ubz_pages(&list), Err(BoardError::TooBig)));
        let ok = encode(&pages[..crate::board::MAX_PAGES]);
        assert!(write_ubz_pages(&ok).is_ok());
    }

    #[test]
    fn more_than_max_objects_is_refused_cleanly() {
        let dot = || Item::Shape {
            kind: ShapeKind::Line,
            m: IDENTITY,
            x0: 0.0,
            y0: 0.0,
            x1: 1.0,
            y1: 1.0,
            color: [0, 0, 0],
            width: 1.0,
            fill: None,
        };
        let n = crate::board::MAX_OBJECTS;
        let list = one_page((0..=n).map(|_| dot()).collect());
        assert!(matches!(write_iwb(&list), Err(BoardError::TooBig)));
        assert!(matches!(write_ubz_pages(&list), Err(BoardError::TooBig)));
        // les objets d'un groupe comptent aussi (le groupe lui-même en est un).
        let nested = one_page(vec![Item::Group((0..n).map(|_| dot()).collect())]);
        assert!(matches!(write_iwb(&nested), Err(BoardError::TooBig)));
    }

    #[test]
    fn ubz_first_filled_rect_of_a_page_without_background_survives_a_round_trip() {
        let full = Item::Shape {
            kind: ShapeKind::Rect,
            m: IDENTITY,
            x0: 0.0,
            y0: 0.0,
            x1: PAGE_WIDTH,
            y1: PAGE_HEIGHT,
            color: [0, 0, 0],
            width: 1.0,
            fill: Some([255, 0, 0]),
        };
        let list = one_page(vec![full.clone(), full]);
        let pages = write_ubz_pages(&list).expect("écriture");
        let back = crate::board::read_svg(pages[0].as_bytes(), crate::board::Dialect::Ubz, 1)
            .expect("relecture");
        let parsed = parse(&back).expect("liste");
        assert_eq!(parsed[0].background, None);
        assert_eq!(parsed[0].items.len(), 2);
    }

    #[test]
    fn huge_numbers_are_written_finite() {
        for v in [f32::MAX, -f32::MAX, 3e38, f32::INFINITY, f32::NAN] {
            let s = num(v);
            assert!(s.parse::<f32>().is_ok_and(f32::is_finite), "{v} -> {s}");
        }
    }
}
