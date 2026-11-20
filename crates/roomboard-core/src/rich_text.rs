//! Texte riche par plages (C7 ; U27 et DAU9 de `docs/plans/usage-cadrage.md`) : attributs Yrs du `Y.Text` `content`
//! d'un élément texte. Positions : points de code pour `SetText` (T4), unités UTF-16 pour `FormatText` (T6), converties
//! en décalages Yrs (octets UTF-8 des chaînes, 1 par embed : le `Doc` est en `OffsetKind::Bytes`, T16).
#![cfg_attr(not(test), allow(dead_code))] // retiré par T3, qui branche les commandes

use std::cmp::Ordering;
use std::sync::Arc;

use yrs::types::text::YChange;
use yrs::types::Attrs;
use yrs::{Any, Out, ReadTxn, Text, TextRef, TransactionMut};

use crate::element::{any_f64, finite_positive};

/// Une entrée d'un patch `FormatText` (T7) : `false` ou `None` retirent l'attribut (retour au défaut, T3).
#[derive(Debug, Clone, PartialEq)]
pub enum TextAttr {
    Bold(bool),
    Italic(bool),
    Underline(bool),
    Color(Option<String>),
    Size(Option<f32>),
    Font(Option<String>),
}

/// Attributs connus d'un segment, normalisés à la lecture (T8) ; un champ au défaut n'est pas sérialisé.
#[derive(Debug, Clone, PartialEq, Default, serde::Serialize)]
pub struct SpanAttrs {
    #[serde(skip_serializing_if = "is_false")]
    pub bold: bool,
    #[serde(skip_serializing_if = "is_false")]
    pub italic: bool,
    #[serde(skip_serializing_if = "is_false")]
    pub underline: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font: Option<String>,
}

fn is_false(b: &bool) -> bool {
    !*b
}

/// Segment de la vue d'un texte (T8) : morceaux de chaîne voisins aux attributs normalisés égaux, embeds sautés.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TextSpanView {
    pub text: String,
    pub attrs: SpanAttrs,
}

/// `color` (T15) : `#rgb`, `#rrggbb`, `#rrggbbaa`, ou un nom CSS de 3 à 20 lettres ASCII.
pub(crate) fn valid_color(c: &str) -> bool {
    match c.strip_prefix('#') {
        Some(hex) => matches!(hex.len(), 3 | 6 | 8) && hex.bytes().all(|b| b.is_ascii_hexdigit()),
        None => (3..=20).contains(&c.len()) && c.bytes().all(|b| b.is_ascii_alphabetic()),
    }
}

/// `font` (T15) : un nom de famille seul, 1 à 48 caractères, sans `"`, `\`, `;`, `{`, `}` ni retour à la ligne.
pub(crate) fn valid_font(f: &str) -> bool {
    (1..=48).contains(&f.chars().count())
        && !f
            .chars()
            .any(|c| matches!(c, '"' | '\\' | ';' | '{' | '}' | '\n' | '\r'))
}

/// Valeurs permises d'un patch (T7, T15) ; `size` contrôlé après conversion en `f32` (1e39 devient infini).
pub(crate) fn valid_attrs(attrs: &[TextAttr]) -> bool {
    attrs.iter().all(|a| match a {
        TextAttr::Color(Some(c)) => valid_color(c),
        TextAttr::Font(Some(f)) => valid_font(f),
        TextAttr::Size(Some(s)) => finite_positive(f64::from(*s)),
        _ => true,
    })
}

/// Clé et valeur Yrs d'une entrée : `Any::Null` retire l'attribut ; un booléen ne s'écrit que `true` (T2).
fn entry(a: &TextAttr) -> (Arc<str>, Any) {
    let flag = |b: bool| if b { Any::Bool(true) } else { Any::Null };
    let (k, v) = match a {
        TextAttr::Bold(b) => ("bold", flag(*b)),
        TextAttr::Italic(b) => ("italic", flag(*b)),
        TextAttr::Underline(b) => ("underline", flag(*b)),
        TextAttr::Color(c) => ("color", c.as_deref().map_or(Any::Null, Any::from)),
        TextAttr::Size(s) => ("size", s.map_or(Any::Null, |v| Any::from(f64::from(v)))),
        TextAttr::Font(f) => ("font", f.as_deref().map_or(Any::Null, Any::from)),
    };
    (Arc::from(k), v)
}

/// Un caractère du contenu (embeds sautés) : décalage Yrs de son début et indice du morceau `diff` d'origine.
#[derive(Debug, Clone, Copy)]
struct CharAt {
    ch: char,
    yrs: u32,
    chunk: usize,
}

fn end(c: &CharAt) -> u32 {
    c.yrs + c.ch.len_utf8() as u32
}

/// Table des caractères et attributs bruts de chaque morceau, par `Text::diff` (même appel que `collect_out`) ; une
/// chaîne compte ses octets UTF-8, tout autre morceau (embed) compte 1 (T16).
fn char_table<T: ReadTxn>(txn: &T, text: &TextRef) -> (Vec<CharAt>, Vec<Attrs>) {
    let mut chars = Vec::new();
    let mut attrs = Vec::new();
    let mut at = 0u32;
    for d in text.diff(txn, YChange::identity) {
        let chunk = attrs.len();
        attrs.push(d.attributes.map(|a| *a).unwrap_or_default());
        match &d.insert {
            Out::Any(Any::String(s)) => {
                for ch in s.chars() {
                    chars.push(CharAt { ch, yrs: at, chunk });
                    at += ch.len_utf8() as u32;
                }
            }
            _ => at += 1,
        }
    }
    (chars, attrs)
}

/// Indice du caractère qui commence à l'unité UTF-16 `u` (la longueur du contenu pour sa fin) ; `None` au milieu d'une
/// paire de substitution ou au-delà.
fn index_at_utf16(chars: &[CharAt], u: u32) -> Option<usize> {
    let mut acc = 0u32;
    for (i, c) in chars.iter().enumerate() {
        match acc.cmp(&u) {
            Ordering::Equal => return Some(i),
            Ordering::Greater => return None,
            Ordering::Less => acc += c.ch.len_utf16() as u32,
        }
    }
    (acc == u).then_some(chars.len())
}

/// Plage `FormatText` (UTF-16) en `(index, len)` Yrs : du premier caractère à celui qui suit le dernier (un embed
/// intérieur est compris, T16) ; `len = 0` : `Some((0, 0))` ; borne au milieu d'une paire ou au-delà : `None` (T6).
pub(crate) fn utf16_range<T: ReadTxn>(
    txn: &T,
    text: &TextRef,
    start: u32,
    len: u32,
) -> Option<(u32, u32)> {
    let (chars, _) = char_table(txn, text);
    let first = index_at_utf16(&chars, start)?;
    let last = index_at_utf16(&chars, start.checked_add(len)?)?;
    if first == last {
        return Some((0, 0));
    }
    let a = chars[first].yrs;
    Some((a, end(&chars[last - 1]) - a))
}

/// Attributs connus normalisés (T8) : booléen seulement `true`, `size` fini > 0 (entier ou flottant), `color` et
/// `font` de la forme de T15 ; tout le reste est ignoré de la vue, jamais réécrit.
fn normalize(raw: Option<&Attrs>) -> SpanAttrs {
    let Some(a) = raw else {
        return SpanAttrs::default();
    };
    let flag = |k: &str| matches!(a.get(k), Some(Any::Bool(true)));
    let string = |k: &str, ok: fn(&str) -> bool| match a.get(k) {
        Some(Any::String(s)) if ok(s) => Some(s.to_string()),
        _ => None,
    };
    SpanAttrs {
        bold: flag("bold"),
        italic: flag("italic"),
        underline: flag("underline"),
        color: string("color", valid_color),
        size: a
            .get("size")
            .and_then(any_f64)
            .filter(|v| finite_positive(*v)),
        font: string("font", valid_font),
    }
}

/// Segments de la vue (T8) : morceaux de chaîne normalisés puis fusionnés ; embeds sautés ; texte vide ou sans
/// chaîne : un seul segment vide sans attribut.
pub(crate) fn read_spans<T: ReadTxn>(txn: &T, text: &TextRef) -> Vec<TextSpanView> {
    let mut out: Vec<TextSpanView> = Vec::new();
    for d in text.diff(txn, YChange::identity) {
        let Out::Any(Any::String(s)) = &d.insert else {
            continue;
        };
        let attrs = normalize(d.attributes.as_deref());
        if let Some(last) = out.last_mut().filter(|l| l.attrs == attrs) {
            last.text.push_str(s);
        } else {
            out.push(TextSpanView {
                text: s.to_string(),
                attrs,
            });
        }
    }
    if out.is_empty() {
        out.push(TextSpanView {
            text: String::new(),
            attrs: SpanAttrs::default(),
        });
    }
    out
}

/// Plus long préfixe commun, puis plus long suffixe commun des deux restes (sans chevaucher le préfixe), en points de
/// code (T4).
fn common_ends(old: &[char], new: &[char]) -> (usize, usize) {
    let p = old.iter().zip(new).take_while(|(a, b)| a == b).count();
    let room = old.len().min(new.len()) - p;
    let s = old
        .iter()
        .rev()
        .zip(new.iter().rev())
        .take(room)
        .take_while(|(a, b)| a == b)
        .count();
    (p, s)
}

/// `SetText` sur un texte existant (T4, T5, T16) : supprime les morceaux de chaîne du milieu ancien (de droite à
/// gauche ; un embed du milieu est gardé), insère le milieu neuf juste après le dernier caractère du préfixe avec les
/// attributs bruts de ce caractère (connus et inconnus) ; en tête, aucun attribut. Contenu égal : rien.
pub(crate) fn apply_text_diff(txn: &mut TransactionMut, text: &TextRef, new: &str) {
    let (chars, attrs) = char_table(&*txn, text);
    let old: Vec<char> = chars.iter().map(|c| c.ch).collect();
    let fresh: Vec<char> = new.chars().collect();
    let (p, s) = common_ends(&old, &fresh);
    let mut runs: Vec<(u32, u32)> = Vec::new();
    for c in &chars[p..old.len() - s] {
        let n = c.ch.len_utf8() as u32;
        match runs.last_mut() {
            Some((start, len)) if *start + *len == c.yrs => *len += n,
            _ => runs.push((c.yrs, n)),
        }
    }
    for (start, len) in runs.into_iter().rev() {
        text.remove_range(txn, start, len);
    }
    let middle: String = fresh[p..fresh.len() - s].iter().collect();
    if middle.is_empty() {
        return;
    }
    let (at, inherited) = match p.checked_sub(1).map(|i| chars[i]) {
        Some(c) => (end(&c), attrs[c.chunk].clone()),
        None => (0, Attrs::new()),
    };
    text.insert_with_attributes(txn, at, &middle, inherited);
}

fn same_value(current: Option<&Any>, wanted: &Any) -> bool {
    match (current, wanted) {
        (None | Some(Any::Null), Any::Null) => true,
        (Some(c), w) => c == w || matches!((any_f64(c), any_f64(w)), (Some(a), Some(b)) if a == b),
        (None, _) => false,
    }
}

/// Vrai si un morceau de la plage Yrs (embed compris) a une valeur brute différente de celle que le patch écrirait ;
/// plage vide ou patch vide : faux (aucune étape, D38).
pub(crate) fn format_changes<T: ReadTxn>(
    txn: &T,
    text: &TextRef,
    range: (u32, u32),
    attrs: &[TextAttr],
) -> bool {
    if range.1 == 0 || attrs.is_empty() {
        return false;
    }
    let wanted: Vec<(Arc<str>, Any)> = attrs.iter().map(entry).collect();
    let mut at = 0u32;
    for d in text.diff(txn, YChange::identity) {
        let len = match &d.insert {
            Out::Any(Any::String(s)) => s.len() as u32,
            _ => 1,
        };
        let overlaps = at < range.0 + range.1 && range.0 < at + len;
        at += len;
        if !overlaps {
            continue;
        }
        let current = d.attributes.as_deref();
        if wanted
            .iter()
            .any(|(k, v)| !same_value(current.and_then(|a| a.get(k)), v))
        {
            return true;
        }
    }
    false
}

/// Écrit le patch sur la plage Yrs (`Text::format`) ; l'appelant a vérifié `format_changes`.
pub(crate) fn apply_format(
    txn: &mut TransactionMut,
    text: &TextRef,
    range: (u32, u32),
    attrs: &[TextAttr],
) {
    let map: Attrs = attrs.iter().map(entry).collect();
    text.format(txn, range.0, range.1, map);
}

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
        assert_eq!(spans(&doc, &text), vec![plain("Le "), with("chat", bold())]);
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
        for ok in [
            "#f00",
            "#ff0000",
            "#ff000080",
            "red",
            "rebeccapurple",
            "ABC",
        ] {
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
        assert!(size(72.0) && !size(0.0) && !size(-1.0) && !size(f32::NAN) && !size(f32::INFINITY));
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
