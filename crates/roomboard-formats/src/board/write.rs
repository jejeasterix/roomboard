//! Écrivain (rouge, T9).
#![allow(unused_imports)]
use super::{apply, parse, BoardError, BoardList, Item, Mat, Page, Rgb, ShapeKind, Span, PAGE_HEIGHT, PAGE_WIDTH};

pub fn write_iwb(_list: &BoardList) -> Result<String, BoardError> {
    Err(BoardError::BadList("écrivain non branché".to_string()))
}

pub fn write_ubz_pages(_list: &BoardList) -> Result<Vec<String>, BoardError> {
    Err(BoardError::BadList("écrivain non branché".to_string()))
}

pub fn ubz_metadata(_pages: usize) -> String {
    String::new()
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
        encode(&[Page { background: None, items }])
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
        let list = one_page(vec![Item::Shape { kind: ShapeKind::Rect, m: IDENTITY, x0: 0.0, y0: 2900.0, x1: 10.0, y1: 2999.5, color: [0, 0, 0], width: 1.0, fill: None }]);
        assert!(write_iwb(&list).expect("iwb").contains(r#"viewBox="0 0 1920 3000""#));
        assert!(write_ubz_pages(&list).expect("ubz")[0].contains(r#"viewBox="0 0 1920 3000""#));
    }

    #[test]
    fn pure_translation_is_folded_other_matrices_kept() {
        let list = one_page(vec![
            Item::Image { m: [1.0, 0.0, 0.0, 1.0, 30.0, 40.0], x: 0.0, y: 0.0, w: 8.0, h: 8.0, href: "images/a.png".into() },
            Item::Image { m: [0.0, 1.0, -1.0, 0.0, 30.0, 40.0], x: 0.0, y: 0.0, w: 8.0, h: 8.0, href: "images/a.png".into() },
        ]);
        let xml = write_iwb(&list).expect("iwb");
        assert!(xml.contains(r#"<svg:image id="o1" x="30" y="40" width="8" height="8""#), "{xml}");
        assert!(xml.contains(r#"transform="matrix(0 1 -1 0 30 40)""#), "{xml}");
    }

    #[test]
    fn ubz_pages_have_ub_namespace_background_first_and_qt_text() {
        let pages = write_ubz_pages(&w1_list()).expect("ubz");
        assert_eq!(pages.len(), 2);
        for p in &pages {
            well_formed(p);
            assert!(p.contains(r#"xmlns:ub="http://uniboard.mnemis.com/document""#) && p.contains(r#"ub:version="4.8.0""#));
        }
        let first = &pages[0];
        let rect = first.find("<rect").expect("fond");
        assert!(first[rect..].starts_with(r##"<rect id="o1" x="0" y="0" width="1920" height="1080" fill="#000000""##), "{first}");
        assert!(first.contains(r#"<foreignObject id="o4" ub:type="text" x="100" y="200" width="300" height="50"><itemTextContent>&lt;!DOCTYPE HTML"#), "{first}");
        assert!(first.contains("font-weight:600;&quot;&gt;Bonjour &lt;/span&gt;"), "{first}");
        assert!(!first.contains("iwb:element"));
    }

    #[test]
    fn text_and_attributes_are_escaped() {
        let list = one_page(vec![
            Item::Text { m: IDENTITY, x: 0.0, y: 0.0, w: 10.0, h: 10.0, size: 12.0, color: [0, 0, 0], spans: vec![Span { text: "a<b&c\"d'\u{1}e\nf".into(), font: Some("X\"Y".into()), ..Span::default() }] },
            Item::Image { m: IDENTITY, x: 0.0, y: 0.0, w: 1.0, h: 1.0, href: "images/a&b.png".into() },
        ]);
        let xml = write_iwb(&list).expect("iwb");
        well_formed(&xml);
        assert!(xml.contains("a&lt;b&amp;c&quot;d&apos;e<svg:tbreak/>f"), "{xml}");
        assert!(xml.contains(r#"font-family="X&quot;Y""#) && xml.contains(r#"xlink:href="images/a&amp;b.png""#));
        for p in write_ubz_pages(&list).expect("ubz") {
            well_formed(&p);
        }
    }

    #[test]
    fn bad_list_is_refused_before_writing() {
        let bad = BoardList { ops: vec![9.0], texts: Vec::new(), warnings: Vec::new() };
        assert!(matches!(write_iwb(&bad), Err(BoardError::BadList(_))));
        assert!(matches!(write_ubz_pages(&bad), Err(BoardError::BadList(_))));
    }

    #[test]
    fn ubz_metadata_names_version_and_page_count() {
        let m = ubz_metadata(2);
        well_formed(&m);
        assert!(m.contains("<ub:version>4.8.0</ub:version>") && m.contains("<ub:pageCount>2</ub:pageCount>"));
    }

    #[test]
    fn more_than_max_pages_is_refused_cleanly() {
        let pages: Vec<Page> = (0..=crate::board::MAX_PAGES).map(|_| Page::default()).collect();
        let list = encode(&pages);
        assert!(matches!(write_iwb(&list), Err(BoardError::TooBig)));
        assert!(matches!(write_ubz_pages(&list), Err(BoardError::TooBig)));
        let ok = encode(&pages[..crate::board::MAX_PAGES]);
        assert!(write_ubz_pages(&ok).is_ok());
    }

    #[test]
    fn more_than_max_objects_is_refused_cleanly() {
        let dot = || Item::Shape { kind: ShapeKind::Line, m: IDENTITY, x0: 0.0, y0: 0.0, x1: 1.0, y1: 1.0, color: [0, 0, 0], width: 1.0, fill: None };
        let n = crate::board::MAX_OBJECTS;
        let list = one_page((0..=n).map(|_| dot()).collect());
        assert!(matches!(write_iwb(&list), Err(BoardError::TooBig)));
        assert!(matches!(write_ubz_pages(&list), Err(BoardError::TooBig)));
        // les objets d'un groupe comptent aussi (le groupe lui-même en est un).
        let nested = one_page(vec![Item::Group((0..n).map(|_| dot()).collect())]);
        assert!(matches!(write_iwb(&nested), Err(BoardError::TooBig)));
    }
}
