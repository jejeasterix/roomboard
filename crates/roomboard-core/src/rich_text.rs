//! Texte riche par plages (C7 ; U27 et DAU9 de `docs/plans/usage-cadrage.md`) : attributs Yrs du `Y.Text` `content`
//! d'un élément texte. Positions : points de code pour `SetText` (T4), unités UTF-16 pour `FormatText` (T6), converties
//! en décalages Yrs (octets UTF-8 des chaînes, 1 par embed : le `Doc` est en `OffsetKind::Bytes`, T16).

use std::cmp::Ordering;
use std::sync::Arc;

use yrs::types::text::{Diff, YChange};
use yrs::types::Attrs;
use yrs::{Any, GetString, Out, ReadTxn, Text, TextRef, TransactionMut};

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

/// `font` (T15) : un nom de famille seul, 1 à 48 caractères, sans `"`, `\`, `;`, `{`, `}` ni caractère de contrôle
/// (catégorie Cc : U+0000–U+001F, U+007F–U+009F ; retours à la ligne et `\f` compris, T11 ; même règle que `validFont`).
pub(crate) fn valid_font(f: &str) -> bool {
    (1..=48).contains(&f.chars().count())
        && !f
            .chars()
            .any(|c| c.is_control() || matches!(c, '"' | '\\' | ';' | '{' | '}'))
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
fn entry(a: &TextAttr) -> (&'static str, Any) {
    let flag = |b: bool| if b { Any::Bool(true) } else { Any::Null };
    match a {
        TextAttr::Bold(b) => ("bold", flag(*b)),
        TextAttr::Italic(b) => ("italic", flag(*b)),
        TextAttr::Underline(b) => ("underline", flag(*b)),
        TextAttr::Color(c) => ("color", c.as_deref().map_or(Any::Null, Any::from)),
        TextAttr::Size(s) => ("size", s.map_or(Any::Null, |v| Any::from(f64::from(v)))),
        TextAttr::Font(f) => ("font", f.as_deref().map_or(Any::Null, Any::from)),
    }
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
/// chaîne compte ses octets UTF-8, tout autre morceau (embed) compte 1 (T16). `None` quand la table ne rend pas le
/// texte, caractères (`get_string`) ou longueur Yrs (T13) : un embed chaîne (binaire fabriqué à la main) sort de
/// `diff` comme un morceau de texte, mais compte 1 et `get_string` le saute ; yrs ne permet pas de l'en distinguer.
fn char_table<T: ReadTxn>(txn: &T, text: &TextRef) -> Option<(Vec<CharAt>, Vec<Attrs>)> {
    let diff = text.diff(txn, YChange::identity);
    table_of(diff, &text.get_string(txn), text.len(txn))
}

/// Corps de `char_table`, hors du générique : une seule copie pour ses deux transactions (T10).
fn table_of(
    diff: Vec<Diff<YChange>>,
    content: &str,
    len: u32,
) -> Option<(Vec<CharAt>, Vec<Attrs>)> {
    let mut chars = Vec::new();
    let mut attrs = Vec::new();
    let mut at = 0u32;
    for d in diff {
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
    let readable = at == len && chars.iter().map(|c| c.ch).eq(content.chars());
    readable.then_some((chars, attrs))
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
/// intérieur est compris, T16) ; `len = 0` : `Some((0, 0))` ; borne au milieu d'une paire ou au-delà, ou table
/// illisible (T13) : `None`.
pub(crate) fn utf16_range<T: ReadTxn>(
    txn: &T,
    text: &TextRef,
    start: u32,
    len: u32,
) -> Option<(u32, u32)> {
    let (chars, _) = char_table(txn, text)?;
    let first = index_at_utf16(&chars, start)?;
    let last = index_at_utf16(&chars, start.checked_add(len)?)?;
    if first == last {
        return Some((0, 0));
    }
    let a = chars[first].yrs;
    Some((a, end(&chars[last - 1]) - a))
}

/// Attributs connus normalisés (T8) : booléen seulement `true`, `size` fini > 0 après conversion en `f32`, comme `valid_attrs` (entier ou flottant), `color` et
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
            .filter(|v| finite_positive(*v) && finite_positive(f64::from(*v as f32))),
        font: string("font", valid_font),
    }
}

/// Segments de la vue (T8) : morceaux de chaîne normalisés puis fusionnés ; embeds sautés ; texte vide ou sans
/// chaîne : un seul segment vide sans attribut. Leur concaténation vaut toujours `get_string` (T13) : sinon (embed
/// chaîne, rendu par `diff` comme du texte), un seul segment sans attribut portant le contenu.
pub(crate) fn read_spans<T: ReadTxn>(txn: &T, text: &TextRef) -> Vec<TextSpanView> {
    let content = text.get_string(txn);
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
    if out.is_empty() || out.iter().flat_map(|s| s.text.chars()).ne(content.chars()) {
        return vec![TextSpanView {
            text: content,
            attrs: SpanAttrs::default(),
        }];
    }
    out
}

/// Plus long préfixe commun, puis plus long suffixe commun des deux restes (sans chevaucher le préfixe), en points de
/// code (T4) ; comparés sur place, sans copie en `Vec<char>` (T10).
fn common_ends(old: &[CharAt], new: &str) -> (usize, usize) {
    let p = old
        .iter()
        .zip(new.chars())
        .take_while(|(a, b)| a.ch == *b)
        .count();
    let room = old.len().min(new.chars().count()) - p;
    let s = old
        .iter()
        .rev()
        .zip(new.chars().rev())
        .take(room)
        .take_while(|(a, b)| a.ch == *b)
        .count();
    (p, s)
}

/// Décalage en octets du `i`-ième point de code de `s` (sa longueur quand `i` vaut le nombre de points de code).
fn byte_at(s: &str, i: usize) -> usize {
    s.char_indices().nth(i).map_or(s.len(), |(b, _)| b)
}

/// `SetText` sur un texte existant (T4, T5, T16) : supprime les morceaux de chaîne du milieu ancien (de droite à
/// gauche ; un embed du milieu est gardé), insère le milieu neuf juste après le dernier caractère du préfixe avec les
/// attributs bruts de ce caractère (connus et inconnus) ; en tête, aucun attribut. Contenu égal : rien. Table
/// illisible (T13) : remplacement total sans attribut, embeds compris, plutôt qu'une plage Yrs fausse (panique).
pub(crate) fn apply_text_diff(txn: &mut TransactionMut, text: &TextRef, new: &str) {
    let Some((chars, attrs)) = char_table(&*txn, text) else {
        let len = text.len(&*txn);
        text.remove_range(txn, 0, len);
        text.insert_with_attributes(txn, 0, new, Attrs::new());
        return;
    };
    let (p, s) = common_ends(&chars, new);
    let mut runs: Vec<(u32, u32)> = Vec::new();
    for c in &chars[p..chars.len() - s] {
        let n = c.ch.len_utf8() as u32;
        match runs.last_mut() {
            Some((start, len)) if *start + *len == c.yrs => *len += n,
            _ => runs.push((c.yrs, n)),
        }
    }
    for (start, len) in runs.into_iter().rev() {
        text.remove_range(txn, start, len);
    }
    let middle = &new[byte_at(new, p)..byte_at(new, new.chars().count() - s)];
    if middle.is_empty() {
        return;
    }
    let (at, inherited) = match p.checked_sub(1).map(|i| chars[i]) {
        Some(c) => (end(&c), attrs[c.chunk].clone()),
        None => (0, Attrs::new()),
    };
    text.insert_with_attributes(txn, at, middle, inherited);
}

/// Table du patch (T7), construite une fois par `FormatText` puis lue par `format_changes` comme par `apply_format` :
/// une clé répétée garde sa dernière valeur (T11). Boucle plutôt que `collect` : sans adaptateurs d'itérateur (T10).
pub(crate) fn patch_attrs(attrs: &[TextAttr]) -> Attrs {
    let mut map = Attrs::new();
    for a in attrs {
        let (k, v) = entry(a);
        map.insert(Arc::from(k), v);
    }
    map
}

/// Valeur brute égale à celle que le patch écrit : absente vaut `Null` ; un nombre (`size`, seul attribut numérique,
/// écrit en `f64::from(f32)`) se compare après arrondi en `f32`, le domaine de la valeur écrite (T11).
fn same_value(current: Option<&Any>, wanted: &Any) -> bool {
    match (current, wanted) {
        (None | Some(Any::Null), Any::Null) => true,
        (Some(c), w) => {
            c == w || matches!((any_f64(c), any_f64(w)), (Some(a), Some(b)) if a as f32 == b as f32)
        }
        (None, _) => false,
    }
}

/// Vrai si un morceau de la plage Yrs (embed compris) a une valeur brute différente de celle que la table du patch
/// écrit ; plage vide ou patch vide : faux (aucune étape, D38).
pub(crate) fn format_changes<T: ReadTxn>(
    txn: &T,
    text: &TextRef,
    range: (u32, u32),
    patch: &Attrs,
) -> bool {
    if range.1 == 0 || patch.is_empty() {
        return false;
    }
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
        if patch
            .iter()
            .any(|(k, v)| !same_value(current.and_then(|c| c.get(k)), v))
        {
            return true;
        }
    }
    false
}

/// Écrit la table du patch sur la plage Yrs (`Text::format`) ; l'appelant a vérifié `format_changes` sur la même.
pub(crate) fn apply_format(
    txn: &mut TransactionMut,
    text: &TextRef,
    range: (u32, u32),
    patch: Attrs,
) {
    text.format(txn, range.0, range.1, patch);
}

/// Segment voulu d'un `SetText` ou d'un `SetTableCell` (C7b, R7) : un état, pas un patch ; champ au défaut = absent.
#[derive(Debug, Clone, PartialEq)]
pub struct SpanInput {
    pub text: String,
    pub attrs: SpanAttrs,
}

/// Entrées de `attrs` dans l'ordre de `TextAttr` : chaque clé connue, au défaut comprise (`false`, `None` = retrait).
fn entries(attrs: &SpanAttrs) -> [TextAttr; 6] {
    let SpanAttrs {
        bold,
        italic,
        underline,
        color,
        size,
        font,
    } = attrs;
    [
        TextAttr::Bold(*bold),
        TextAttr::Italic(*italic),
        TextAttr::Underline(*underline),
        TextAttr::Color(color.clone()),
        TextAttr::Size(size.map(|v| v as f32)),
        TextAttr::Font(font.clone()),
    ]
}

impl SpanAttrs {
    /// Attributs d'un état voulu depuis ses entrées (R7) : `false` et `None` valent « absent ».
    pub fn from_entries(entries: Vec<TextAttr>) -> Self {
        let mut a = Self::default();
        for e in entries {
            match e {
                TextAttr::Bold(b) => a.bold = b,
                TextAttr::Italic(b) => a.italic = b,
                TextAttr::Underline(b) => a.underline = b,
                TextAttr::Color(c) => a.color = c,
                TextAttr::Size(s) => a.size = s.map(f64::from),
                TextAttr::Font(f) => a.font = f,
            }
        }
        a
    }
}

/// Contrôle d'un état voulu (R7) : concaténation des `text` égale au contenu, valeurs dans les domaines de T15
/// (`valid_attrs`, `size` contrôlé après conversion en `f32`).
pub(crate) fn valid_spans(content: &str, spans: &[SpanInput]) -> bool {
    spans
        .iter()
        .flat_map(|s| s.text.chars())
        .eq(content.chars())
        && spans.iter().all(|s| valid_attrs(&entries(&s.attrs)))
}

/// Clés connues dont la vue normalisée `current` diffère de `target`, avec la valeur à écrire (`Any::Null` retire) ;
/// `size` comparé après arrondi en `f32` (T11, `same_value`) ; vide si rien ne change. La valeur brute n'entre pas
/// dans la comparaison : une valeur hors domaine que la cible laisse au défaut n'est jamais réécrite.
fn differing(current: &SpanAttrs, target: &SpanAttrs) -> Attrs {
    let mut out = Attrs::new();
    for (now, want) in entries(current).iter().zip(entries(target).iter()) {
        let (key, have) = entry(now);
        let (_, value) = entry(want);
        if !same_value(Some(&have), &value) {
            out.insert(Arc::from(key), value);
        }
    }
    out
}

/// Plan d'alignement (R7) : chaque caractère comparé, vue normalisée contre cible ; plages Yrs contiguës de même patch
/// (un embed, compté 1 par `char_table`, coupe la plage : jamais formaté). `None` si la table est illisible (T13) ou
/// si sa longueur diffère de la cible (PC3).
fn align_plan<T: ReadTxn>(
    txn: &T,
    text: &TextRef,
    spans: &[SpanInput],
) -> Option<Vec<(u32, u32, Attrs)>> {
    let (chars, raw) = char_table(txn, text)?;
    let want: Vec<&SpanAttrs> = spans
        .iter()
        .flat_map(|s| s.text.chars().map(move |_| &s.attrs))
        .collect();
    if want.len() != chars.len() {
        return None;
    }
    let norm: Vec<SpanAttrs> = raw.iter().map(|a| normalize(Some(a))).collect();
    let mut runs: Vec<(u32, u32, Attrs)> = Vec::new();
    for (c, t) in chars.iter().zip(want) {
        let patch = differing(&norm[c.chunk], t);
        if patch.is_empty() {
            continue;
        }
        let len = c.ch.len_utf8() as u32;
        match runs.last_mut() {
            Some((start, n, p)) if *start + *n == c.yrs && *p == patch => *n += len,
            _ => runs.push((c.yrs, len, patch)),
        }
    }
    Some(runs)
}

/// Sortie « inchangé » (R7) : vrai si un caractère porte une valeur connue normalisée différente de la cible ; table
/// illisible : faux (rien n'est aligné, PC3).
pub(crate) fn spans_differ<T: ReadTxn>(txn: &T, text: &TextRef, spans: &[SpanInput]) -> bool {
    align_plan(txn, text, spans).is_some_and(|runs| !runs.is_empty())
}

/// Aligne les attributs connus du `Y.Text` sur la cible (R7, DAR1), dans la transaction de l'appelant, après
/// `apply_text_diff` : n'écrit, par `Text::format`, que les clés qui diffèrent ; clés inconnues, embeds et valeurs
/// brutes hors domaine que la cible laisse sans l'attribut ne sont jamais touchés.
pub(crate) fn apply_spans(txn: &mut TransactionMut, text: &TextRef, spans: &[SpanInput]) {
    let Some(runs) = align_plan(&*txn, text, spans) else {
        return;
    };
    for (start, len, patch) in runs {
        text.format(txn, start, len, patch);
    }
}

/// Segments d'une cellule (C7b, R16) : ceux de son `Y.Text` ; sans `Y.Text` (remplissage seul), un segment vide.
pub(crate) fn cell_spans<T: ReadTxn>(txn: &T, text: Option<&TextRef>) -> Vec<TextSpanView> {
    text.map_or_else(
        || {
            vec![TextSpanView {
                text: String::new(),
                attrs: SpanAttrs::default(),
            }]
        },
        |t| read_spans(txn, t),
    )
}

/// Sortie « inchangé » d'une cellule (R7) : sans état voulu, ou sans `Y.Text` (contenu vide : rien à aligner), vrai ;
/// sinon, vrai si aucune clé connue ne diffère.
pub(crate) fn spans_unchanged<T: ReadTxn>(
    txn: &T,
    text: Option<&TextRef>,
    spans: Option<&[SpanInput]>,
) -> bool {
    match (text, spans) {
        (Some(t), Some(s)) => !spans_differ(txn, t, s),
        _ => true,
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Arc;

    use yrs::types::text::YChange;
    use yrs::{Any, Doc, Number, Out, Text, TextRef, Transact};

    use super::*;
    use crate::commands::{read_text, Command};
    use crate::document::Document;

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

    /// Défaut de yrs (`Doc::new()`) en octets UTF-8 ; la garde du `Doc` du cœur est `core_doc_offsets_are_utf8_bytes`.
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
                patch_attrs(&[TextAttr::Color(Some("#ff0000".into()))]),
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
            apply_format(
                &mut txn,
                &text,
                (1, 1),
                patch_attrs(&[TextAttr::Bold(true)]),
            );
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
            apply_format(
                &mut txn,
                &text,
                (0, 4),
                patch_attrs(&[TextAttr::Bold(true)]),
            );
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
            patch_attrs(&[TextAttr::Size(Some(48.0)), TextAttr::Bold(true)]),
        );
        let txn = doc.transact();
        let changes =
            |r: (u32, u32), a: &[TextAttr]| format_changes(&txn, &text, r, &patch_attrs(a));
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
        // T11 : une clé répétée garde sa dernière valeur, comme à l'écriture.
        assert!(!changes(
            (0, 3),
            &[TextAttr::Bold(true), TextAttr::Bold(false)]
        ));
        assert!(changes(
            (0, 3),
            &[TextAttr::Bold(false), TextAttr::Bold(true)]
        ));
        assert!(!changes(
            (3, 4),
            &[TextAttr::Bold(false), TextAttr::Bold(true)]
        ));
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

    /// T16 : un embed (écrit par une autre version) survit à `SetText` et `FormatText` autour et à travers ; il reste
    /// cité par `cited_assets`, ni la couleur ni la police ne le sont (T15). Sous le patron écarté (`remove_range(0,
    /// len)` puis `insert`), l'embed disparaît au premier `SetText` : `embeds(&d)` vaudrait 0.
    #[test]
    fn set_text_and_format_keep_embeds() {
        use crate::commands::{read_text, Command};
        use crate::document::Document;
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let set = |content: &str, id: Option<String>| Command::SetText {
            page: p.clone(),
            id,
            x: 0.0,
            y: 0.0,
            content: content.into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
            spans: None,
        };
        let fmt = |id: &str, start: u32, len: u32, attrs: Vec<TextAttr>| Command::FormatText {
            id: id.into(),
            start,
            len,
            attrs,
            box_height: None,
        };
        let id = d.apply(set("Le chat noir", None)).expect("texte").ids[0].clone();
        let text = {
            let txn = d.read();
            let f = d.find_element(&txn, &id).expect("élément");
            read_text(&txn, &f.element).expect("texte").text
        };
        {
            let mut txn = d.transact_local();
            let embed = Any::Map(Arc::new(HashMap::from([(
                "src".to_string(),
                Any::from(HEX64),
            )])));
            text.insert_embed(&mut txn, 3, embed);
        }
        let embeds = |d: &Document| {
            let txn = d.read();
            text.diff(&txn, YChange::identity)
                .iter()
                .filter(|c| !matches!(c.insert, Out::Any(Any::String(_))))
                .count()
        };
        // autour : FormatText sur « chat » (après l'embed), puis SetText qui insère juste avant lui
        let red_georgia = vec![
            TextAttr::Color(Some("#ff0000".into())),
            TextAttr::Font(Some("Georgia".into())),
        ];
        d.apply(fmt(&id, 3, 4, red_georgia)).expect("format");
        d.apply(set("Le gros chat noir", Some(id.clone())))
            .expect("insère");
        // à travers : suppression de part et d'autre de l'embed, puis format de tout le texte
        d.apply(set("Le noir", Some(id.clone()))).expect("supprime");
        d.apply(fmt(&id, 0, 7, vec![TextAttr::Bold(true)]))
            .expect("format total");
        assert_eq!(embeds(&d), 1, "l'embed est gardé");
        let view = d.element(&id).and_then(|e| e.text).expect("vue");
        assert_eq!(view.content, "Le noir");
        assert_eq!(view.spans, vec![with("Le noir", bold())]);
        let cited: Vec<String> = d.cited_assets().into_iter().map(|a| a.id).collect();
        assert_eq!(cited, vec![HEX64.to_string()]);
    }

    /// Document du cœur avec un seul texte `content` : (document, id de l'élément, son `Y.Text`).
    fn core_text(content: &str) -> (Document, String, TextRef) {
        let mut d = Document::blank();
        let page = d.page_ids()[0].clone();
        let set = Command::SetText {
            page,
            id: None,
            x: 0.0,
            y: 0.0,
            content: content.into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
            spans: None,
        };
        let id = d.apply(set).expect("texte").ids[0].clone();
        let text = {
            let txn = d.read();
            let f = d.find_element(&txn, &id).expect("élément");
            read_text(&txn, &f.element).expect("texte").text
        };
        (d, id, text)
    }

    fn format_cmd(id: &str, start: u32, len: u32, attrs: Vec<TextAttr>) -> Command {
        Command::FormatText {
            id: id.into(),
            start,
            len,
            attrs,
            box_height: None,
        }
    }

    fn view_spans(d: &Document, id: &str) -> Vec<TextSpanView> {
        d.element(id).and_then(|e| e.text).expect("vue").spans
    }

    /// Constat 1 de relecture (T11) : une clé répétée garde sa dernière valeur dans le contrôle « sans effet » comme
    /// dans l'écriture. Sous le patron écarté (contrôle entrée par entrée), `[Bold(true), Bold(false)]` sur un texte
    /// sans gras rend un `Change` fait (version montée, id cité) sans étape d'annulation : `undo` défait alors l'étape
    /// d'avant.
    #[test]
    fn format_text_repeated_key_keeps_last_value() {
        let (mut d, id, _) = core_text("Le chat noir");
        d.apply(format_cmd(&id, 0, 2, vec![TextAttr::Bold(true)]))
            .expect("gras");
        let before = d.version();
        for (start, len, attrs) in [
            (3, 4, vec![TextAttr::Bold(true), TextAttr::Bold(false)]),
            (0, 2, vec![TextAttr::Bold(false), TextAttr::Bold(true)]),
        ] {
            let change = d.apply(format_cmd(&id, start, len, attrs)).expect("format");
            assert_eq!(
                (change.version, change.ids.len()),
                (before, 0),
                "plage {start}+{len} : aucune étape"
            );
        }
        assert!(d.undo());
        assert_eq!(view_spans(&d, &id), vec![plain("Le chat noir")]);
    }

    /// Constat 2 de relecture (T11) : `size` arrive en `f32` et s'écrit `f64::from` ; une taille brute déjà égale après
    /// arrondi `f32` (14.3 écrit par un autre client) n'est pas un changement. Sous le patron écarté (comparaison en
    /// `f64`), `Size(14.3)` crée une étape sans effet visible. La valeur écrite reste celle d'avant (`Math.fround`).
    #[test]
    fn format_text_size_equal_after_f32_rounding_is_no_step() {
        let (mut d, id, text) = core_text("Le chat");
        let raw = HashMap::from([(Arc::from("size"), Any::from(14.3))]);
        text.format(&mut d.transact_local(), 0, 7, raw);
        let before = d.version();
        let change = d
            .apply(format_cmd(&id, 0, 7, vec![TextAttr::Size(Some(14.3))]))
            .expect("même taille");
        assert_eq!((change.version, change.ids.len()), (before, 0));
        let sized = |v: f64| SpanAttrs {
            size: Some(v),
            ..SpanAttrs::default()
        };
        assert_eq!(view_spans(&d, &id), vec![with("Le chat", sized(14.3))]);
        let change = d
            .apply(format_cmd(&id, 0, 7, vec![TextAttr::Size(Some(14.4))]))
            .expect("autre taille");
        assert_eq!(change.version, before + 1);
        assert_eq!(
            view_spans(&d, &id),
            vec![with("Le chat", sized(f64::from(14.4f32)))]
        );
    }

    /// Constat 3 de relecture (T11) : la garde de T6 et T16 sur le `Doc` du cœur lui-même (`Document::blank`), pas sur
    /// un `Doc::new()` de yrs : « é🐱 » y compte 6 octets UTF-8 (3 unités sous `OffsetKind::Utf16`).
    #[test]
    fn core_doc_offsets_are_utf8_bytes() {
        let (d, _, text) = core_text("é🐱");
        assert_eq!(text.len(&d.read()), 6);
    }

    /// Constat 4 de relecture (T11), règle commune avec `validFont` (T12) : tout caractère de contrôle (catégorie Cc,
    /// U+0000–U+001F et U+007F–U+009F) est refusé, `\f` compris (CSS le lit comme un retour à la ligne) ; U+00A0 ne
    /// l'est pas.
    #[test]
    fn valid_font_refuses_control_chars() {
        for bad in [
            "a\u{c}b", "a\tb", "a\u{b}b", "\u{0}", "a\u{1f}b", "a\u{7f}b", "a\u{85}b", "a\u{9f}b",
        ] {
            assert!(!valid_font(bad), "{bad:?}");
        }
        for ok in ["a b", "a~b", "a\u{a0}b", "a\u{a1}b"] {
            assert!(valid_font(ok), "{ok:?}");
        }
    }

    /// Constat 1 de relecture (T13) : un embed dont la valeur est une chaîne (`ItemContent::Embed(Any::String)`,
    /// binaire fabriqué à la main) sort de `diff` comme un morceau de texte, mais `get_string` le saute. Sous le patron
    /// écarté (tout `Out::Any(Any::String)` lu comme du texte), les segments valent « Le XYchat noir » pour un
    /// `content` « Le chat noir » (vue rejetée par `toElementView`), et `SetText` panique (`remove_range` au-delà de la
    /// fin). Ici : un seul segment sans attribut, `FormatText` refusé, `SetText` en remplacement total.
    #[test]
    fn string_embed_keeps_view_invariant() {
        let (mut d, id, text) = core_text("Le chat noir");
        text.insert_embed(&mut d.transact_local(), 3, Any::from("XY"));
        let view = |d: &Document| {
            let v = d.element(&id).and_then(|e| e.text).expect("vue");
            let joined: String = v.spans.iter().map(|s| s.text.as_str()).collect();
            assert_eq!(joined, v.content, "concaténation des segments = content");
            v
        };
        let v = view(&d);
        assert_eq!(v.content, "Le chat noir");
        assert_eq!(v.spans, vec![plain("Le chat noir")]);
        let bold = d.apply(format_cmd(&id, 3, 4, vec![TextAttr::Bold(true)]));
        assert!(
            matches!(bold, Err(crate::commands::CommandError::BadFormat)),
            "{bold:?}"
        );
        let set = Command::SetText {
            page: d.page_ids()[0].clone(),
            id: Some(id.clone()),
            x: 0.0,
            y: 0.0,
            content: "Le chat noir !".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
            spans: None,
        };
        d.apply(set).expect("SetText");
        let v = view(&d);
        assert_eq!(v.content, "Le chat noir !");
        assert_eq!(v.spans, vec![plain("Le chat noir !")]);
        assert_eq!(
            text.len(&d.read()),
            14,
            "remplacement total : l'embed chaîne est retiré"
        );
    }

    // C7b (R7) : état voulu des segments, alignement des seules clés connues qui diffèrent de la vue normalisée.

    fn sp(t: &str, attrs: SpanAttrs) -> SpanInput {
        SpanInput {
            text: t.into(),
            attrs,
        }
    }

    #[test]
    fn valid_spans_checks_concat_then_domains() {
        let ok = vec![sp("Le ", SpanAttrs::default()), sp("chat", red())];
        assert!(valid_spans("Le chat", &ok));
        assert!(valid_spans("", &[]));
        assert!(!valid_spans("Le cha", &ok));
        for bad in [
            SpanAttrs {
                color: Some("rouge!".into()),
                ..SpanAttrs::default()
            },
            SpanAttrs {
                size: Some(0.0),
                ..SpanAttrs::default()
            },
            SpanAttrs {
                size: Some(1e39),
                ..SpanAttrs::default()
            },
            SpanAttrs {
                font: Some("a;b".into()),
                ..SpanAttrs::default()
            },
        ] {
            assert!(!valid_spans("x", &[sp("x", bad.clone())]), "{bad:?}");
        }
    }

    /// Deux `Doc` bruts au même client, tirés de `state` ; `f` et `g` jouées chacune dans une transaction sur le
    /// `Y.Text` du `n`-ième élément de la première page ; rend les deux états encodés.
    fn twin_updates(
        state: &[u8],
        n: u32,
        f: impl Fn(&mut TransactionMut, &TextRef),
        g: impl Fn(&mut TransactionMut, &TextRef),
    ) -> (Vec<u8>, Vec<u8>) {
        use yrs::updates::decoder::Decode;
        use yrs::{Array, Map, StateVector, Update};
        let run = |edit: &dyn Fn(&mut TransactionMut, &TextRef)| {
            let doc = Doc::with_client_id(1);
            let pages = doc.get_or_insert_array("pages");
            doc.transact_mut()
                .apply_update(Update::decode_v1(state).expect("décodage"))
                .expect("mise à jour");
            let text = {
                let txn = doc.transact();
                let Some(Out::YMap(page)) = pages.get(&txn, 0) else {
                    panic!("page")
                };
                let Some(Out::YArray(els)) = page.get(&txn, "elements") else {
                    panic!("éléments")
                };
                let Some(Out::YMap(el)) = els.get(&txn, n) else {
                    panic!("élément")
                };
                let Some(Out::YText(t)) = el.get(&txn, "content") else {
                    panic!("texte")
                };
                t
            };
            edit(&mut doc.transact_mut(), &text);
            let bytes = doc
                .transact()
                .encode_state_as_update_v1(&StateVector::default());
            bytes
        };
        (run(&f), run(&g))
    }

    /// S5 (R7), document neuf : segments sans attribut sur un texte sans attribut = mêmes octets qu'une différence
    /// seule. Garde des octets, pas du choix des clés : mesuré, `Text::format` à `Any::Null` sur une plage déjà sans
    /// la clé n'écrit rien ; le choix des clés est gardé par `apply_spans_keeps_raw_out_of_domain_and_unknown_keys`.
    #[test]
    fn plain_spans_write_the_same_update_as_no_spans() {
        let (d, _, _) = core_text("Le chat noir");
        let new = "Le gros chat noir";
        let target = vec![sp(new, SpanAttrs::default())];
        let (a, b) = twin_updates(
            &d.encode_v1(),
            0,
            |txn, t| apply_text_diff(txn, t, new),
            |txn, t| {
                apply_text_diff(txn, t, new);
                apply_spans(txn, t, &target);
            },
        );
        assert_eq!(a, b);
    }

    /// S5 (C7 T12, R7) : fichier du socle, troisième élément de la première page (« Bonjour RoomBoard »).
    #[test]
    fn socle_fixture_plain_spans_write_the_same_update_as_no_spans() {
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/tests/fixtures/socle-v1.roomboard"
        );
        let d = crate::format::load(&std::fs::read(path).expect("fixture")).expect("load");
        let new = "Bonjour à RoomBoard";
        let target = vec![sp(new, SpanAttrs::default())];
        let (a, b) = twin_updates(
            &d.encode_v1(),
            2,
            |txn, t| apply_text_diff(txn, t, new),
            |txn, t| {
                apply_text_diff(txn, t, new);
                apply_spans(txn, t, &target);
            },
        );
        assert_eq!(a, b);
    }

    /// R7 : valeur brute hors domaine (`bold: "oui"`) sur une plage que la cible laisse sans gras, et clé inconnue
    /// (`href`) : gardées ; seul le gras voulu de « chat » est écrit. Patron écarté : comparer les valeurs brutes
    /// (`format_changes`) réécrirait « Le » en retirant `bold: "oui"`.
    #[test]
    fn apply_spans_keeps_raw_out_of_domain_and_unknown_keys() {
        let (doc, text) = doc_with("Le chat noir");
        {
            let mut txn = doc.transact_mut();
            text.format(
                &mut txn,
                0,
                2,
                Attrs::from([(Arc::from("bold"), Any::from("oui"))]),
            );
            text.format(
                &mut txn,
                3,
                4,
                Attrs::from([(Arc::from("href"), Any::from("x"))]),
            );
        }
        let target = vec![
            sp("Le ", SpanAttrs::default()),
            sp("chat", bold()),
            sp(" noir", SpanAttrs::default()),
        ];
        assert!(spans_differ(&doc.transact(), &text, &target));
        apply_spans(&mut doc.transact_mut(), &text, &target);
        let txn = doc.transact();
        let chunks: Vec<(String, Attrs)> = text
            .diff(&txn, YChange::identity)
            .into_iter()
            .map(|c| {
                let s = match &c.insert {
                    Out::Any(Any::String(s)) => s.to_string(),
                    _ => String::new(),
                };
                (s, c.attributes.map(|a| *a).unwrap_or_default())
            })
            .collect();
        let get = |s: &str, k: &str| {
            chunks
                .iter()
                .find(|(t, _)| t == s)
                .and_then(|(_, a)| a.get(k).cloned())
        };
        assert_eq!(get("Le", "bold"), Some(Any::from("oui")));
        assert_eq!(get("chat", "href"), Some(Any::from("x")));
        assert_eq!(get("chat", "bold"), Some(Any::Bool(true)));
        assert!(!spans_differ(&txn, &text, &target));
    }

    /// R7, GC9 : un embed au milieu coupe la plage formatée ; il ne reçoit aucun attribut.
    #[test]
    fn apply_spans_never_formats_an_embed() {
        let (doc, text) = doc_with("abcd");
        text.insert_embed(&mut doc.transact_mut(), 2, embed());
        apply_spans(&mut doc.transact_mut(), &text, &[sp("abcd", bold())]);
        assert_eq!(spans(&doc, &text), vec![with("abcd", bold())]);
        assert_eq!(embeds(&doc, &text), 1);
        let embed_attrs = text
            .diff(&doc.transact(), YChange::identity)
            .into_iter()
            .find(|c| !matches!(c.insert, Out::Any(Any::String(_))))
            .and_then(|c| c.attributes);
        assert!(
            embed_attrs.is_none_or(|a| !a.contains_key("bold")),
            "embed formaté"
        );
    }

    /// R7 au niveau de la commande : `SetText` avec segments garde la valeur brute hors domaine (`bold: "oui"`) que la
    /// cible laisse sans gras, écrit le gras voulu, en une seule étape ; rejouée, la même cible est « inchangée ».
    /// Patron écarté : comparaison brute (`format_changes`) ou `SetText` puis `FormatText` (deux étapes).
    #[test]
    fn set_text_spans_keep_raw_out_of_domain_value_in_one_step() {
        let (mut d, id, text) = core_text("Le chat noir");
        text.format(
            &mut d.transact_local(),
            0,
            2,
            Attrs::from([(Arc::from("bold"), Any::from("oui"))]),
        );
        let raw_bold = |d: &Document, s: &str| {
            text.diff(&d.read(), YChange::identity)
                .into_iter()
                .find(|c| matches!(&c.insert, Out::Any(Any::String(t)) if t.as_ref() == s))
                .and_then(|c| c.attributes)
                .and_then(|a| a.get("bold").cloned())
        };
        let target = vec![
            sp("Le ", SpanAttrs::default()),
            sp("chat", bold()),
            sp(" noir", SpanAttrs::default()),
        ];
        let set = |spans: Vec<SpanInput>| Command::SetText {
            page: d.page_ids()[0].clone(),
            id: Some(id.clone()),
            x: 0.0,
            y: 0.0,
            content: "Le chat noir".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
            spans: Some(spans),
        };
        let first = set(target.clone());
        let again = set(target);
        d.apply(first).expect("gras");
        assert_eq!(raw_bold(&d, "Le"), Some(Any::from("oui")));
        assert_eq!(raw_bold(&d, "chat"), Some(Any::Bool(true)));
        let v = d.version();
        d.apply(again).expect("même cible");
        assert_eq!(d.version(), v, "même cible : aucune transaction");
        assert!(d.undo());
        assert_eq!(raw_bold(&d, "Le"), Some(Any::from("oui")));
        assert_eq!(view_spans(&d, &id), vec![plain("Le chat noir")]);
    }
}
