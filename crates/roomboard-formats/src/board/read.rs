//! Lecteur SVG commun (C13, D1, D8 à D16) : corps écrit par la tâche T7 du plan. Ce fichier ne porte que la signature,
//! pour que la liaison (T6) et l'écrivain (T9) compilent pendant que T7 travaille.
use super::{BoardError, BoardList, Dialect};

#[cfg(test)]
use super::{Item, Mat, Page, Rgb, ShapeKind, Span, IDENTITY};
#[cfg(test)]
use crate::pdf::ASCENT;

/// Lit un `content.xml` IWB, un `.iwb` en SVG brut ou une page `.ubz` ; `first_page` numérote les avertissements.
pub fn read_svg(_xml: &[u8], _dialect: Dialect, _first_page: u32) -> Result<BoardList, BoardError> {
    Err(BoardError::Broken("lecteur non branché".to_string()))
}

#[cfg(test)]
fn color_of(_s: &str) -> Option<Rgb> {
    None
}

#[cfg(test)]
fn parse_transform(_s: &str) -> Option<Mat> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::board::parse;

    const S2: Mat = [2.0, 0.0, 0.0, 2.0, 0.0, 0.0];

    fn iwb(body: &str, extra: &str) -> String {
        format!(
            r#"<?xml version="1.0" encoding="UTF-8"?><iwb xmlns:iwb="http://www.becta.org.uk/iwb" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0"><svg:svg viewbox="0 0 960 540"><svg:pageset><svg:page id="p1">{body}</svg:page></svg:pageset></svg:svg>{extra}</iwb>"#
        )
    }

    fn read(xml: &str, dialect: Dialect, first_page: u32) -> (Vec<Page>, Vec<String>) {
        let l = read_svg(xml.as_bytes(), dialect, first_page).expect("lecture");
        (parse(&l).expect("liste"), l.warnings)
    }

    fn items(xml: &str) -> Vec<Item> {
        read(xml, Dialect::Iwb, 1).0.remove(0).items
    }

    #[test]
    fn shapes_are_read_in_page_units_with_viewbox_lowercase() {
        let body = r#"<svg:rect id="r" x="10" y="20" width="100" height="50" fill="red" stroke="black" stroke-width="2"/><svg:circle cx="50" cy="60" r="10" fill="none" stroke="blue"/><svg:line id="l" x1="0" y1="0" x2="30" y2="40" stroke="green" stroke-width="3"/><svg:polyline points="1,2 3,4 5,6" stroke="black" stroke-width="4" fill="none"/>"#;
        let got = items(&iwb(body, r#"<iwb:element ref="l" stroke-lineshape-end="arrow"/>"#));
        assert_eq!(
            got,
            vec![
                Item::Shape { kind: ShapeKind::Rect, m: S2, x0: 10.0, y0: 20.0, x1: 110.0, y1: 70.0, color: [0, 0, 0], width: 2.0, fill: Some([255, 0, 0]) },
                Item::Shape { kind: ShapeKind::Ellipse, m: S2, x0: 40.0, y0: 50.0, x1: 60.0, y1: 70.0, color: [0, 0, 255], width: 1.0, fill: None },
                Item::Shape { kind: ShapeKind::Arrow, m: S2, x0: 0.0, y0: 0.0, x1: 30.0, y1: 40.0, color: [0, 128, 0], width: 3.0, fill: None },
                Item::Stroke { m: S2, color: [0, 0, 0], width: 4.0, points: vec![[1.0, 2.0, 1.0], [3.0, 4.0, 1.0], [5.0, 6.0, 1.0]] },
            ]
        );
    }

    #[test]
    fn frame_rules_and_bad_frames() {
        let m_of = |attrs: &str| -> Result<Mat, String> {
            let xml = format!(r#"<svg xmlns="http://www.w3.org/2000/svg" {attrs}><rect width="1" height="1"/></svg>"#);
            let l = read_svg(xml.as_bytes(), Dialect::Ubz, 1).map_err(|e| e.to_string())?;
            match &parse(&l).expect("liste")[0].items[0] {
                Item::Shape { m, .. } => Ok(*m),
                other => panic!("{other:?}"),
            }
        };
        assert_eq!(m_of(r#"width="800" height="600""#).expect("taille")[0], 2.4);
        assert_eq!(m_of("").expect("défaut"), IDENTITY);
        assert_eq!(m_of(r#"viewBox="10 20 960 540""#).expect("décalé"), [2.0, 0.0, 0.0, 2.0, -20.0, -40.0]);
        assert_eq!(m_of(r#"viewBox="0 0 0 600""#).err().expect("refus"), "fichier endommagé : cadre de page invalide");
        assert_eq!(m_of(r#"viewBox="0 0 abc 1""#).err().expect("refus"), "fichier endommagé : cadre de page invalide");
    }

    /// Review Focus 2 : forme de `7-11 Maths 3.iwb` (CDATA, espaces, `tbreak`, retour).
    #[test]
    fn text_whitespace_cdata_tbreak_and_baseline() {
        let body = "<svg:textarea x=\"10\" y=\"20\" width=\"300\" height=\"80\" font-size=\"30\" fill=\"rgb(128,0,128)\" font-weight=\"bold\"><![CDATA[Magic  Square]]>   <svg:tbreak/>\n    suite </svg:textarea><svg:text x=\"5\" y=\"100\" font-size=\"20\">Ligne</svg:text>";
        let got = items(&iwb(body, ""));
        assert_eq!(
            got[0],
            Item::Text { m: S2, x: 10.0, y: 20.0, w: 300.0, h: 80.0, size: 30.0, color: [128, 0, 128], spans: vec![Span { text: "Magic Square\nsuite".into(), bold: true, ..Span::default() }] }
        );
        match &got[1] {
            Item::Text { y, w, h, spans, .. } => {
                assert!((y - (100.0 - 20.0 * ASCENT)).abs() < 1e-4, "{y}");
                assert!((w - 60.0).abs() < 1e-3 && (h - 24.0).abs() < 1e-3, "{w} {h}");
                assert_eq!(spans, &vec![Span { text: "Ligne".into(), ..Span::default() }]);
            }
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn tspan_spans_keep_only_their_own_attributes() {
        let body = r##"<svg:textarea x="0" y="0" font-size="24" fill="black" xml:space="preserve"><svg:tspan font-weight="bold">Bonjour </svg:tspan><svg:tspan font-size="32" fill="#ff0000" font-family="'Liberation Sans', sans-serif">monde</svg:tspan></svg:textarea>"##;
        match &items(&iwb(body, ""))[0] {
            Item::Text { size, color, spans, .. } => {
                assert_eq!((*size, *color), (24.0, [0, 0, 0]));
                assert_eq!(
                    spans,
                    &vec![
                        Span { text: "Bonjour ".into(), bold: true, ..Span::default() },
                        Span { text: "monde".into(), size: Some(32.0), color: Some([255, 0, 0]), font: Some("Liberation Sans".into()), ..Span::default() },
                    ]
                );
            }
            other => panic!("{other:?}"),
        }
    }

    /// Review Focus 1 : `iwb:group` et `iwb:element` après les pages.
    #[test]
    fn iwb_refs_after_pages_group_and_flags() {
        let body = r#"<svg:rect id="a" width="1" height="1"/><svg:rect id="b" width="1" height="1"/><svg:rect id="c" width="1" height="1"/>"#;
        let extra = r#"<iwb:group><iwb:element ref="a"/><iwb:element ref="b"/></iwb:group><iwb:element ref="c" locked="true"/>"#;
        let (pages, warnings) = read(&iwb(body, extra), Dialect::Iwb, 1);
        let it = &pages[0].items;
        assert_eq!(it.len(), 2);
        assert!(matches!(&it[0], Item::Group(g) if g.len() == 2));
        assert!(matches!(&it[1], Item::Shape { kind: ShapeKind::Rect, .. }));
        assert_eq!(warnings, vec!["page 1 : 1 verrou non lu".to_string()]);
    }

    #[test]
    fn svg_g_nested_groups_and_single_member_flattened() {
        let body = r#"<svg:g><svg:rect width="1" height="1"/><svg:g><svg:rect width="1" height="1"/><svg:rect width="1" height="1"/></svg:g></svg:g><svg:g transform="translate(10,0)"><svg:rect width="1" height="1"/></svg:g>"#;
        let got = items(&iwb(body, ""));
        assert_eq!(got.len(), 2);
        match &got[0] {
            Item::Group(g) => {
                assert!(matches!(&g[0], Item::Shape { .. }));
                assert!(matches!(&g[1], Item::Group(inner) if inner.len() == 2));
            }
            other => panic!("{other:?}"),
        }
        assert!(matches!(&got[1], Item::Shape { m, .. } if *m == [2.0, 0.0, 0.0, 2.0, 20.0, 0.0]));
    }

    #[test]
    fn background_iwb_flag_and_ubz_first_rect() {
        let body = r#"<svg:rect id="bg" x="0" y="0" width="960" height="540" fill="blue"/><svg:rect id="half" x="0" y="0" width="100" height="100" fill="red"/>"#;
        let extra = r#"<iwb:element ref="bg" background="true"/><iwb:element ref="half" background="true"/>"#;
        let (pages, warnings) = read(&iwb(body, extra), Dialect::Iwb, 1);
        assert_eq!(pages[0].background, Some([0, 0, 255]));
        assert_eq!(pages[0].items.len(), 1);
        assert_eq!(warnings, vec!["page 1 : 1 objet de fond gardé comme objet".to_string()]);
        let ubz = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect x="0" y="0" width="1280" height="720" fill="#000000"/><rect x="0" y="0" width="1280" height="720" fill="#ffffff"/></svg>"##;
        let (pages, warnings) = read(ubz, Dialect::Ubz, 1);
        assert_eq!(pages[0].background, Some([0, 0, 0]));
        assert_eq!(pages[0].items.len(), 1);
        assert!(warnings.is_empty());
    }

    #[test]
    fn not_read_kinds_become_warnings_per_page() {
        let body = r##"<svg:video xlink:href="videos/a.mpg" x="0" y="0" width="10" height="10"/><svg:video xlink:href="flash/a.swf" x="0" y="0" width="10" height="10"/><svg:a xlink:href="audio/son.wav"><svg:rect width="5" height="5"/></svg:a><svg:a xlink:href="#cible"><svg:text x="0" y="20">lien</svg:text></svg:a><svg:script>alert(1)</svg:script><svg:rect width="5" height="5" rx="2" onload="alert(2)"/><svg:polygon points="0,0 10,0 5,5"/><svg:image xlink:href="http://exemple.invalid/x.png" x="0" y="0" width="5" height="5"/><svg:image xlink:href="data:image/png;base64,AAAA" x="0" y="0" width="5" height="5"/><svg:image xlink:href="images/x.emf" x="0" y="0" width="5" height="5"/><svg:foreignObject><div/></svg:foreignObject><svg:path d="M0 0 L10 10"/>"##;
        let l = read_svg(iwb(body, "").as_bytes(), Dialect::Iwb, 1).expect("lecture");
        assert_eq!(
            l.warnings,
            [
                "page 1 : 1 script ignoré",
                "page 1 : 1 vidéo non lue",
                "page 1 : 1 son non lu",
                "page 1 : 1 animation Flash non lue",
                "page 1 : 1 lien perdu (contenu lu)",
                "page 1 : 1 rectangle dont les coins arrondis ne sont pas lus",
                "page 1 : 1 remplissage de polygone non lu",
                "page 1 : 2 images distantes ou hors de l'archive non chargées",
                "page 1 : 1 image d'un format non lu (EMF, WMF…)",
                "page 1 : 1 objet HTML non lu",
                "page 1 : 1 objet d'un type non lu",
            ]
            .map(String::from)
        );
        assert_eq!(parse(&l).expect("liste")[0].items.len(), 4);
        assert!(!l.texts.iter().any(|t| t.contains("alert")));
    }

    /// S5 : DOCTYPE avec entité externe ; rien n'est lu du système de fichiers.
    #[test]
    fn doctype_and_external_entity_are_never_resolved() {
        let xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE iwb [<!ENTITY e SYSTEM \"file:///etc/passwd\">]>\n<iwb xmlns:svg=\"http://www.w3.org/2000/svg\" version=\"1.0\"><svg:svg viewbox=\"0 0 1920 1080\"><svg:pageset><svg:page><svg:text x=\"0\" y=\"40\">avant &e; après &#233;&amp;</svg:text></svg:page></svg:pageset></svg:svg></iwb>";
        let l = read_svg(xml.as_bytes(), Dialect::Iwb, 1).expect("lecture");
        assert_eq!(l.warnings, vec!["1 déclaration DOCTYPE ignorée".to_string(), "1 entité inconnue ignorée".to_string()]);
        match &parse(&l).expect("liste")[0].items[0] {
            Item::Text { spans, .. } => assert_eq!(spans[0].text, "avant après é&"),
            other => panic!("{other:?}"),
        }
        assert!(!l.texts.iter().any(|t| t.contains("root")));
    }

    #[test]
    fn unreadable_attribute_skips_its_object_only() {
        let (pages, warnings) = read(&iwb(r#"<svg:rect fill="&e;" width="1" height="1"/><svg:rect width="2" height="2"/>"#, ""), Dialect::Iwb, 1);
        assert_eq!(pages[0].items.len(), 1);
        assert_eq!(warnings, vec!["page 1 : 1 objet illisible ignoré".to_string()]);
    }

    /// Forme de `rectangle2.iwb` : `<svg:page>` fermé par `</svg:pageset>`.
    #[test]
    fn malformed_xml_is_refused() {
        let xml = r#"<iwb xmlns:svg="http://www.w3.org/2000/svg"><svg:svg viewbox="0 0 10 10"><svg:pageset><svg:page><svg:rect/></svg:pageset></svg:svg></iwb>"#;
        let e = read_svg(xml.as_bytes(), Dialect::Iwb, 1).err().expect("refus").to_string();
        assert!(e.starts_with("fichier endommagé : XML mal formé"), "{e}");
    }

    #[test]
    fn first_500_pages_are_read_and_said() {
        let xml = format!(r#"<iwb xmlns:svg="http://www.w3.org/2000/svg"><svg:svg viewbox="0 0 10 10"><svg:pageset>{}</svg:pageset></svg:svg></iwb>"#, "<svg:page/>".repeat(501));
        let (pages, warnings) = read(&xml, Dialect::Iwb, 1);
        assert_eq!(pages.len(), 500);
        assert_eq!(warnings[0], "500 premières pages importées sur 501");
    }

    #[test]
    fn more_than_100000_objects_is_refused() {
        let xml = iwb(&r#"<svg:rect width="1" height="1"/>"#.repeat(100_001), "");
        assert!(matches!(read_svg(xml.as_bytes(), Dialect::Iwb, 1), Err(BoardError::TooBig)));
    }

    /// HU1-1 : trait à pression d'OpenBoard, outil, numéro de page reçu.
    #[test]
    fn ubz_pressure_stroke_and_tools_on_page_3() {
        let xml = r##"<svg xmlns="http://www.w3.org/2000/svg" xmlns:ub="http://uniboard.mnemis.com/document" viewBox="0 0 1920 1080"><g fill="#ffffff"><polygon points="100,100 200,100 200,110 100,110"/><polygon points="200,98 300,98 300,112 200,112"/></g><ub:ruler x="10" y="10" width="100" height="20"/></svg>"##;
        let (pages, warnings) = read(xml, Dialect::Ubz, 3);
        let k = 10.0f32 / 14.0;
        assert_eq!(pages[0].items, vec![Item::Stroke { m: IDENTITY, color: [255, 255, 255], width: 14.0, points: vec![[100.0, 105.0, k], [200.0, 105.0, k], [300.0, 105.0, 1.0]] }]);
        assert_eq!(warnings, vec!["page 3 : 1 règle non lue".to_string()]);
    }

    /// Review Focus 3.
    #[test]
    fn colors_of_the_suite() {
        assert_eq!(color_of("red"), Some([255, 0, 0]));
        assert_eq!(color_of("Grey"), Some([128, 128, 128]));
        assert_eq!(color_of("pink"), Some([255, 192, 203]));
        assert_eq!(color_of("rgb(0,255,0)"), Some([0, 255, 0]));
        assert_eq!(color_of("rgb(100%,0%,0%)"), Some([255, 0, 0]));
        assert_eq!(color_of("#f00"), Some([255, 0, 0]));
        assert_eq!(color_of("#ff0000"), Some([255, 0, 0]));
        assert_eq!(color_of("nonsense"), None);
        assert_eq!(color_of("#é00"), None);
    }

    /// Review Focus 4 : forme de `repeat_attributes.iwb`.
    #[test]
    fn repeated_attribute_first_wins() {
        assert!(matches!(&items(&iwb(r#"<svg:rect x="1" x="5" width="2" height="2"/>"#, ""))[0], Item::Shape { x0, .. } if *x0 == 1.0));
    }

    #[test]
    fn transforms_compose_left_to_right() {
        let r = parse_transform("rotate(180,-85,-85)").expect("rotation");
        for (a, b) in r.iter().zip([-1.0, 0.0, 0.0, -1.0, -170.0, -170.0]) {
            assert!((a - b).abs() < 1e-3, "{r:?}");
        }
        let t = parse_transform("rotate(90) translate(105,25)").expect("composée");
        for (a, b) in t.iter().zip([0.0, 1.0, -1.0, 0.0, -25.0, 105.0]) {
            assert!((a - b).abs() < 1e-3, "{t:?}");
        }
        assert_eq!(parse_transform("bogus(1)"), None);
        assert_eq!(parse_transform("translate(1,2"), None);
    }

    #[test]
    fn text_align_other_than_start_is_said() {
        let (_, warnings) = read(&iwb(r#"<svg:textarea x="0" y="0" text-align="center">a</svg:textarea>"#, ""), Dialect::Iwb, 1);
        assert_eq!(warnings, vec!["page 1 : 1 alignement de texte non lu".to_string()]);
    }
}
