//! Texte d'OpenBoard (C13, D11) : HTML de Qt réduit en segments ; corps écrit par la tâche T8 du plan.
use super::{Rgb, Span};

/// Texte lu : segments, taille et couleur du `body` (celles de l'élément), `reduced` si une mise en forme a été perdue.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct QtText {
    pub spans: Vec<Span>,
    pub size: Option<f32>,
    pub color: Option<Rgb>,
    pub reduced: bool,
}

pub fn read_qt_html(_html: &str) -> QtText {
    QtText::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    const DOCTYPE: &str = r#"<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd">"#;

    /// Forme écrite par `write.rs` (T9) : le texte d'une copie `.ubz` se relit à l'identique.
    #[test]
    fn reads_the_shape_our_writer_emits() {
        let html = format!(
            r#"{DOCTYPE}<html><head><meta name="qrichtext" content="1" /></head><body style="font-size:24px; color:#000000;"><p><span style="font-weight:600;">Bonjour<br />à </span><span style="font-size:32px; color:#ff0000; font-family:'Liberation Sans';">monde</span></p></body></html>"#
        );
        let t = read_qt_html(&html);
        assert_eq!((t.size, t.color, t.reduced), (Some(24.0), Some([0, 0, 0]), false));
        assert_eq!(
            t.spans,
            vec![
                Span { text: "Bonjour\nà ".into(), bold: true, ..Span::default() },
                Span { text: "monde".into(), size: Some(32.0), color: Some([255, 0, 0]), font: Some("Liberation Sans".into()), ..Span::default() },
            ]
        );
    }

    #[test]
    fn qt_layout_paragraphs_entities_and_points() {
        let html = format!("{DOCTYPE}\n<html><head><style type=\"text/css\">\np, li {{ white-space: pre-wrap; }}\n</style></head><body style=\" font-family:'Arial'; font-size:48pt; color:#ffffff;\">\n<p style=\" margin-top:0px;\">Ligne&nbsp;1 &amp; &#233;t&#xE9; &foo;</p>\n<p>Ligne 2</p></body></html>");
        let t = read_qt_html(&html);
        assert_eq!(t.size, Some(64.0));
        assert_eq!(t.color, Some([255, 255, 255]));
        let text: String = t.spans.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(text, "Ligne 1 & été &foo;\nLigne 2");
        assert!(t.spans.iter().all(|s| s.font.as_deref() == Some("Arial")));
    }

    #[test]
    fn stray_and_missing_end_tags_are_tolerated() {
        let t = read_qt_html(r#"<body><span style="font-weight:600">a</b>b<i>c"#);
        let text: Vec<(&str, bool, bool)> = t.spans.iter().map(|s| (s.text.as_str(), s.bold, s.italic)).collect();
        assert_eq!(text, vec![("ab", true, false), ("c", true, true)]);
    }

    #[test]
    fn head_style_and_script_are_silent() {
        let t = read_qt_html("<html><head><title>T</title><script>alert(1)</script></head><body><p>vu</p><script>alert(2)</script></body></html>");
        let text: String = t.spans.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(text, "vu");
    }

    #[test]
    fn lists_tables_and_alignment_mark_reduced() {
        assert!(read_qt_html("<body><ul><li>a</li></ul></body>").reduced);
        assert!(read_qt_html(r#"<body><p style="text-align:center;">a</p></body>"#).reduced);
        assert!(!read_qt_html("<body><p>a</p></body>").reduced);
    }

    #[test]
    fn plain_text_and_empty_html() {
        let t = read_qt_html("simple");
        assert_eq!(t.spans, vec![Span { text: "simple".into(), ..Span::default() }]);
        assert_eq!(read_qt_html(""), QtText::default());
    }
}
