//! Texte riche par plages (C7 ; U27 et DAU9 de `docs/plans/usage-cadrage.md`) : attributs Yrs du `Y.Text` `content`
//! d'un élément texte. Positions : points de code pour `SetText` (T4), unités UTF-16 pour `FormatText` (T6), converties
//! en décalages Yrs (octets UTF-8 des chaînes, 1 par embed : le `Doc` est en `OffsetKind::Bytes`, T16).
#![cfg_attr(not(test), allow(dead_code))] // retiré par T3, qui branche les commandes

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Arc;

    use yrs::types::text::YChange;
    use yrs::{Any, Doc, GetString, Number, Out, Text, TextRef, Transact};

    use super::*;

    const HEX64: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    fn doc_with(s: &str) -> (Doc, TextRef) {
        let doc = Doc::new();
        let text = doc.get_or_insert_text("t");
        text.insert(&mut doc.transact_mut(), 0, s);
        (doc, text)
    }

    fn spans(doc: &Doc, text: &TextRef) -> Vec<TextSpanView> {
        read_spans(&doc.transact(), text)
    }

    fn plain(t: &str) -> TextSpanView {
        TextSpanView {
            text: t.into(),
            attrs: SpanAttrs::default(),
        }
    }

    fn with(t: &str, attrs: SpanAttrs) -> TextSpanView {
        TextSpanView {
            text: t.into(),
            attrs,
        }
    }

    fn red() -> SpanAttrs {
        SpanAttrs {
            color: Some("#ff0000".into()),
            ..SpanAttrs::default()
        }
    }

    fn bold() -> SpanAttrs {
        SpanAttrs {
            bold: true,
            ..SpanAttrs::default()
        }
    }

    fn embed() -> Any {
        Any::Map(Arc::new(HashMap::from([("k".to_string(), Any::from(1.0))])))
    }

    /// Nombre de morceaux non textuels (embeds) du `Y.Text`.
    fn embeds(doc: &Doc, text: &TextRef) -> usize {
        text.diff(&doc.transact(), YChange::identity)
            .iter()
            .filter(|c| !matches!(c.insert, Out::Any(Any::String(_))))
            .count()
    }

    /// Garde de T6 et T16 : le `Doc` du cœur compte en octets UTF-8 (`Doc::new()`, `document.rs`).
    #[test]
    fn doc_offsets_are_utf8_bytes() {
        let (doc, text) = doc_with("é🐱");
        assert_eq!(text.len(&doc.transact()), 6);
    }

    #[test]
    fn utf16_range_counts_surrogate_pairs() {
        let (doc, text) = doc_with("Le 🐱 noir");
        let txn = doc.transact();
        assert_eq!(utf16_range(&txn, &text, 3, 2), Some((3, 4)));
        assert_eq!(utf16_range(&txn, &text, 0, 10), Some((0, 12)));
        assert_eq!(utf16_range(&txn, &text, 5, 5), Some((7, 5)));
        assert_eq!(utf16_range(&txn, &text, 10, 0), Some((0, 0)));
        assert_eq!(
            utf16_range(&txn, &text, 4, 1),
            None,
            "début au milieu de la paire"
        );
        assert_eq!(
            utf16_range(&txn, &text, 3, 1),
            None,
            "fin au milieu de la paire"
        );
        assert_eq!(
            utf16_range(&txn, &text, 8, 3),
            None,
            "au-delà de la longueur"
        );
        assert_eq!(utf16_range(&txn, &text, u32::MAX, 1), None);
    }

    #[test]
    fn utf16_range_counts_embeds() {
        let (doc, text) = doc_with("abcd");
        text.insert_embed(&mut doc.transact_mut(), 2, embed());
        let txn = doc.transact();
        assert_eq!(text.get_string(&txn), "abcd");
        assert_eq!(
            utf16_range(&txn, &text, 2, 2),
            Some((3, 2)),
            "après l'embed"
        );
        assert_eq!(
            utf16_range(&txn, &text, 1, 2),
            Some((1, 3)),
            "à travers l'embed"
        );
    }

    /// S4 côté cœur : différence en points de code, préfixe d'abord, héritage du caractère précédent.
    #[test]
    fn apply_text_diff_prefix_then_suffix_in_code_points() {
        let (doc, text) = doc_with("Le 🐱 noir");
        {
            let mut txn = doc.transact_mut();
            apply_format(
                &mut txn,
                &text,
                (3, 4),
                &[TextAttr::Color(Some("#ff0000".into()))],
            );
            apply_text_diff(&mut txn, &text, "Le gros 🐱 noir");
        }
        assert_eq!(
            spans(&doc, &text),
            vec![plain("Le gros "), with("🐱", red()), plain(" noir")]
        );
        apply_text_diff(&mut doc.transact_mut(), &text, "Le gros 🐱🐱 noir");
        assert_eq!(
            spans(&doc, &text),
            vec![plain("Le gros "), with("🐱🐱", red()), plain(" noir")]
        );
    }

    /// Patron écarté (`commands.rs`, remplacement total) : un embed hors du milieu comme dans le milieu ancien est
    /// gardé (T16) ; seuls les morceaux de chaîne du milieu sont supprimés.
    #[test]
    fn apply_text_diff_keeps_embeds() {
        let (doc, text) = doc_with("abcd");
        text.insert_embed(&mut doc.transact_mut(), 2, embed());
        apply_text_diff(&mut doc.transact_mut(), &text, "abXcd");
        assert_eq!(text.get_string(&doc.transact()), "abXcd");
        assert_eq!(embeds(&doc, &text), 1, "embed hors du milieu");
        apply_text_diff(&mut doc.transact_mut(), &text, "ad");
        assert_eq!(text.get_string(&doc.transact()), "ad");
        assert_eq!(embeds(&doc, &text), 1, "embed du milieu ancien");
    }

    /// Review Focus 2 (cadrage T4) : « ab » → « abb », b gras : le préfixe passe d'abord, le « b » neuf suit le gras.
    #[test]
    fn apply_text_diff_prefers_prefix() {
        let (doc, text) = doc_with("ab");
        {
            let mut txn = doc.transact_mut();
            apply_format(&mut txn, &text, (1, 1), &[TextAttr::Bold(true)]);
            apply_text_diff(&mut txn, &text, "abb");
        }
        assert_eq!(spans(&doc, &text), vec![plain("a"), with("bb", bold())]);
    }

    /// Cadrage T5 : inséré en tête, aucun attribut.
    #[test]
    fn apply_text_diff_head_insert_has_no_attrs() {
        let (doc, text) = doc_with("chat");
        {
            let mut txn = doc.transact_mut();
            apply_format(&mut txn, &text, (0, 4), &[TextAttr::Bold(true)]);
            apply_text_diff(&mut txn, &text, "Le chat");
        }
        assert_eq!(
            spans(&doc, &text),
            vec![plain("Le "), with("chat", bold())]
        );
    }

    /// Cadrage T5 : les attributs inconnus du caractère précédent passent aussi au texte inséré.
    #[test]
    fn apply_text_diff_inherits_unknown_attrs() {
        let (doc, text) = doc_with("");
        {
            let mut txn = doc.transact_mut();
            let attrs = HashMap::from([(Arc::from("href"), Any::from("https://exemple.org"))]);
            text.insert_with_attributes(&mut txn, 0, "lien", attrs);
            apply_text_diff(&mut txn, &text, "liens");
        }
        let txn = doc.transact();
        let chunks: Vec<(String, bool)> = text
            .diff(&txn, YChange::identity)
            .iter()
            .map(|c| {
                let s = match &c.insert {
                    Out::Any(Any::String(s)) => s.to_string(),
                    _ => String::new(),
                };
                let href = c
                    .attributes
                    .as_deref()
                    .and_then(|a| a.get("href"))
                    .is_some();
                (s, href)
            })
            .collect();
        assert!(chunks.iter().all(|(_, href)| *href), "{chunks:?}");
        assert_eq!(
            chunks.iter().map(|(s, _)| s.as_str()).collect::<String>(),
            "liens"
        );
    }

    #[test]
    fn format_changes_sees_only_real_changes() {
        let (doc, text) = doc_with("Le chat noir");
        apply_format(
            &mut doc.transact_mut(),
            &text,
            (3, 4),
            &[TextAttr::Size(Some(48.0)), TextAttr::Bold(true)],
        );
        let txn = doc.transact();
        let changes = |r: (u32, u32), a: &[TextAttr]| format_changes(&txn, &text, r, a);
        assert!(!changes(
            (3, 4),
            &[TextAttr::Size(Some(48.0)), TextAttr::Bold(true)]
        ));
        assert!(!changes(
            (0, 3),
            &[TextAttr::Bold(false), TextAttr::Color(None)]
        ));
        assert!(!changes((3, 0), &[TextAttr::Italic(true)]));
        assert!(!changes((0, 12), &[]));
        assert!(changes((3, 4), &[TextAttr::Size(Some(36.0))]));
        assert!(
            changes((2, 2), &[TextAttr::Bold(true)]),
            "l'espace avant « chat » n'est pas gras"
        );
        assert!(changes((3, 4), &[TextAttr::Bold(false)]));
    }

    /// Cadrage T2, T15 : formes permises de `color`, `font`, `size`.
    #[test]
    fn valid_attrs_follows_t15_domains() {
        let color = |c: &str| valid_attrs(&[TextAttr::Color(Some(c.into()))]);
        let font = |f: &str| valid_attrs(&[TextAttr::Font(Some(f.into()))]);
        let size = |s: f32| valid_attrs(&[TextAttr::Size(Some(s))]);
        for ok in ["#f00", "#ff0000", "#ff000080", "red", "rebeccapurple", "ABC"] {
            assert!(color(ok), "{ok}");
        }
        for bad in [
            "rgb(0,0,0)",
            "#ff00",
            "#gggggg",
            "re",
            "abcdefghijklmnopqrstu",
            "",
            HEX64,
        ] {
            assert!(!color(bad), "{bad}");
        }
        for ok in ["Georgia", "Comic Sans MS", "é"] {
            assert!(font(ok), "{ok}");
        }
        let long = "a".repeat(49);
        for bad in [
            "",
            long.as_str(),
            HEX64,
            "a;b",
            "a\"b",
            "a\\b",
            "a{b",
            "a}b",
            "a\nb",
        ] {
            assert!(!font(bad), "{bad:?}");
        }
        assert!(
            size(72.0) && !size(0.0) && !size(-1.0) && !size(f32::NAN) && !size(f32::INFINITY)
        );
        assert!(valid_attrs(&[
            TextAttr::Color(None),
            TextAttr::Font(None),
            TextAttr::Size(None),
            TextAttr::Bold(false)
        ]));
    }

    /// Cadrage T8 : un attribut connu hors domaine est retiré de la vue, jamais réécrit ; puis fusion des voisins.
    #[test]
    fn read_spans_normalizes_then_merges() {
        let (doc, text) = doc_with("ab");
        {
            let mut txn = doc.transact_mut();
            let junk = HashMap::from([
                (Arc::from("bold"), Any::from("oui")),
                (Arc::from("italic"), Any::Bool(false)),
                (Arc::from("size"), Any::from(-1.0)),
                (Arc::from("color"), Any::from("rgb(0,0,0)")),
                (Arc::from("font"), Any::from(HEX64)),
                (Arc::from("href"), Any::from("x")),
            ]);
            text.insert_with_attributes(&mut txn, 2, "cd", junk);
        }
        assert_eq!(spans(&doc, &text), vec![plain("abcd")]);
        let txn = doc.transact();
        assert!(
            text.diff(&txn, YChange::identity)
                .iter()
                .any(|c| c.attributes.is_some()),
            "le document n'est pas réécrit"
        );
    }

    /// Review Focus 5 (cadrage T8, K8) : une taille écrite en entier par une autre version est lue.
    #[test]
    fn read_spans_reads_integer_size() {
        let (doc, text) = doc_with("");
        let attrs = HashMap::from([(Arc::from("size"), Any::Number(Number::Int(48)))]);
        text.insert_with_attributes(&mut doc.transact_mut(), 0, "grand", attrs);
        let big = SpanAttrs {
            size: Some(48.0),
            ..SpanAttrs::default()
        };
        assert_eq!(spans(&doc, &text), vec![with("grand", big)]);
    }

    /// Cadrage T8, T12 : un texte sans attribut est un seul segment, même vide.
    #[test]
    fn read_spans_plain_text_is_one_span() {
        let (doc, text) = doc_with("Bonjour");
        assert_eq!(spans(&doc, &text), vec![plain("Bonjour")]);
        let (doc, text) = doc_with("");
        assert_eq!(spans(&doc, &text), vec![plain("")]);
    }
}
