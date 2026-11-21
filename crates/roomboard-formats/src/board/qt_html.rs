//! Texte d'OpenBoard (C13, D11, HU2-6) : HTML de Qt (`itemTextContent`, déjà désenveloppé du XML) réduit en segments.
//! Petit lecteur tolérant, jamais `quick-xml` (ce HTML commence par `<!DOCTYPE HTML PUBLIC …>` et contient `&nbsp;`) :
//! DOCTYPE et commentaires muets ; `head`, `style`, `script`, `title` sautés ; `<p>` (à partir du second) et `<br>` en
//! sauts de ligne ; `span`, `b`, `strong`, `i`, `em`, `u`, `font` et leur `style` portent la mise en forme ; fins de
//! balise non contrôlées ; entités `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;` et numériques lues, toute autre
//! gardée telle quelle ; aucune ressource externe lue.
use super::{Rgb, Span};

/// Texte lu : segments, taille et couleur du `body` (celles de l'élément), `reduced` si une mise en forme a été perdue.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct QtText {
    pub spans: Vec<Span>,
    pub size: Option<f32>,
    pub color: Option<Rgb>,
    pub reduced: bool,
}

#[derive(Debug, Clone, Default, PartialEq)]
struct Look {
    bold: bool,
    italic: bool,
    underline: bool,
    size: Option<f32>,
    color: Option<Rgb>,
    font: Option<String>,
}

/// Indice du `>` qui ferme la balise ouverte en 0, hors guillemets ; longueur si absent.
fn tag_end(s: &str) -> usize {
    let mut quote: Option<char> = None;
    for (i, ch) in s.char_indices().skip(1) {
        match quote {
            Some(q) if ch == q => quote = None,
            Some(_) => {}
            None if ch == '"' || ch == '\'' => quote = Some(ch),
            None if ch == '>' => return i,
            None => {}
        }
    }
    s.len()
}

/// (fermante, nom en minuscules, reste des attributs).
fn split_tag(tag: &str) -> (bool, String, &str) {
    let t = tag.trim();
    let (closing, t) = match t.strip_prefix('/') {
        Some(r) => (true, r.trim_start()),
        None => (false, t),
    };
    let end = t
        .find(|c: char| c.is_whitespace() || c == '/')
        .unwrap_or(t.len());
    (closing, t[..end].to_ascii_lowercase(), &t[end..])
}

/// Valeur d'un attribut (`clé="…"`, `clé='…'` ou nue), clé sans casse.
fn attr_value(attrs: &str, key: &str) -> Option<String> {
    let lower = attrs.to_ascii_lowercase();
    let mut from = 0;
    while let Some(k) = lower[from..].find(key) {
        let at = from + k;
        let before_ok = at == 0 || lower.as_bytes()[at - 1].is_ascii_whitespace();
        let rest = lower[at + key.len()..].trim_start();
        if before_ok && rest.starts_with('=') {
            let off = attrs.len() - rest.len() + 1;
            let v = attrs[off..].trim_start();
            let q = v.chars().next()?;
            if q == '"' || q == '\'' {
                return v[1..].find(q).map(|e| v[1..1 + e].to_string());
            }
            return Some(v.split_whitespace().next().unwrap_or("").to_string());
        }
        from = at + key.len();
    }
    None
}

fn size_px(v: &str) -> Option<f32> {
    let v = v.trim();
    let (n, pt) = if let Some(n) = v.strip_suffix("pt") {
        (n, true)
    } else if let Some(n) = v.strip_suffix("px") {
        (n, false)
    } else {
        (v, false)
    };
    n.trim()
        .parse::<f32>()
        .ok()
        .map(|x| if pt { x * 4.0 / 3.0 } else { x })
        .filter(|x| x.is_finite() && *x > 0.0)
}

fn hex_color(v: &str) -> Option<Rgb> {
    let h = v.trim().strip_prefix('#')?;
    if !h.is_ascii() {
        return None;
    }
    match h.len() {
        6 => Some([
            u8::from_str_radix(&h[0..2], 16).ok()?,
            u8::from_str_radix(&h[2..4], 16).ok()?,
            u8::from_str_radix(&h[4..6], 16).ok()?,
        ]),
        3 => {
            let d = |i: usize| u8::from_str_radix(&h[i..i + 1], 16).ok().map(|x| x * 17);
            Some([d(0)?, d(1)?, d(2)?])
        }
        _ => None,
    }
}

/// `base` complété par le `style="…"` (et `color=` d'un `<font>`) de la balise.
fn styled(base: &Look, attrs: &str) -> Look {
    let mut l = base.clone();
    if let Some(css) = attr_value(attrs, "style") {
        for decl in css.split(';') {
            let Some((k, v)) = decl.split_once(':') else {
                continue;
            };
            let v = v.trim();
            match k.trim().to_ascii_lowercase().as_str() {
                "font-weight" => {
                    l.bold =
                        v == "bold" || v == "bolder" || v.parse::<u32>().is_ok_and(|w| w >= 600)
                }
                "font-style" => l.italic = v == "italic" || v == "oblique",
                "text-decoration" => l.underline = v.contains("underline"),
                "font-size" => {
                    if let Some(z) = size_px(v) {
                        l.size = Some(z);
                    }
                }
                "color" => {
                    if let Some(c) = hex_color(v) {
                        l.color = Some(c);
                    }
                }
                "font-family" => {
                    let f = v
                        .split(',')
                        .next()
                        .unwrap_or("")
                        .trim()
                        .trim_matches(|c| c == '\'' || c == '"');
                    if !f.is_empty() {
                        l.font = Some(f.to_string());
                    }
                }
                _ => {}
            }
        }
    }
    if let Some(c) = attr_value(attrs, "color").and_then(|v| hex_color(&v)) {
        l.color = Some(c);
    }
    l
}

fn tagged(name: &str, l: Look) -> Look {
    let mut l = l;
    match name {
        "b" | "strong" => l.bold = true,
        "i" | "em" => l.italic = true,
        "u" => l.underline = true,
        _ => {}
    }
    l
}

fn aligned(attrs: &str) -> bool {
    attr_value(attrs, "style").is_some_and(|css| {
        css.split(';')
            .filter_map(|d| d.split_once(':'))
            .any(|(k, v)| {
                k.trim().eq_ignore_ascii_case("text-align")
                    && !matches!(v.trim(), "" | "left" | "start")
            })
    })
}

fn entity(name: &str) -> Option<char> {
    match name {
        "nbsp" => Some(' '),
        "amp" => Some('&'),
        "lt" => Some('<'),
        "gt" => Some('>'),
        "quot" => Some('"'),
        "apos" => Some('\''),
        _ => {
            let n = name.strip_prefix('#')?;
            let code = match n.strip_prefix('x').or_else(|| n.strip_prefix('X')) {
                Some(h) => u32::from_str_radix(h, 16).ok()?,
                None => n.parse::<u32>().ok()?,
            };
            char::from_u32(code)
        }
    }
}

fn decode(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut rest = raw;
    while let Some(k) = rest.find('&') {
        out.push_str(&rest[..k]);
        let tail = &rest[k..];
        match tail.bytes().take(13).position(|b| b == b';') {
            Some(e) => {
                match entity(&tail[1..e]) {
                    Some(ch) => out.push(ch),
                    None => out.push_str(&tail[..=e]),
                }
                rest = &tail[e + 1..];
            }
            None => {
                out.push('&');
                rest = &tail[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

fn push(out: &mut QtText, ch: char, l: &Look) {
    if let Some(s) = out.spans.last_mut() {
        if s.bold == l.bold
            && s.italic == l.italic
            && s.underline == l.underline
            && s.size == l.size
            && s.color == l.color
            && s.font == l.font
        {
            s.text.push(ch);
            return;
        }
    }
    out.spans.push(Span {
        text: ch.to_string(),
        bold: l.bold,
        italic: l.italic,
        underline: l.underline,
        size: l.size,
        color: l.color,
        font: l.font.clone(),
    });
}

pub fn read_qt_html(html: &str) -> QtText {
    let mut out = QtText::default();
    let mut cur = Look::default();
    let mut stack: Vec<(String, Look)> = Vec::new();
    let mut paragraphs = 0usize;
    let mut skip: Option<String> = None;
    let mut rest = html;
    while !rest.is_empty() {
        if let Some(after) = rest.strip_prefix("<!--") {
            rest = after.find("-->").map_or("", |k| &after[k + 3..]);
            continue;
        }
        if rest.starts_with('<') {
            let end = tag_end(rest);
            let tag = &rest[1..end];
            rest = rest.get(end + 1..).unwrap_or("");
            let (closing, name, attrs) = split_tag(tag);
            if name.is_empty() || name.starts_with('!') || name.starts_with('?') {
                continue;
            }
            if let Some(s) = &skip {
                if closing && name == *s {
                    skip = None;
                }
                continue;
            }
            if closing {
                if let Some(k) = stack.iter().rposition(|(n, _)| *n == name) {
                    cur = stack[k].1.clone();
                    stack.truncate(k);
                }
                continue;
            }
            match name.as_str() {
                "head" | "style" | "script" | "title" => {
                    if !tag.trim_end().ends_with('/') {
                        skip = Some(name);
                    }
                }
                "body" => {
                    let l = styled(&Look::default(), attrs);
                    out.size = l.size;
                    out.color = l.color;
                    cur = Look {
                        size: None,
                        color: None,
                        ..l
                    };
                }
                "p" => {
                    if paragraphs > 0 {
                        push(&mut out, '\n', &cur);
                    }
                    paragraphs += 1;
                    if aligned(attrs) {
                        out.reduced = true;
                    }
                }
                "br" => push(&mut out, '\n', &cur),
                "span" | "b" | "strong" | "i" | "em" | "u" | "font" => {
                    let l = tagged(&name, styled(&cur, attrs));
                    stack.push((name, cur.clone()));
                    cur = l;
                }
                "table" | "ul" | "ol" | "li" | "img" | "a" | "hr" => out.reduced = true,
                _ => {}
            }
            continue;
        }
        let k = rest.find('<').unwrap_or(rest.len());
        let raw = &rest[..k];
        rest = &rest[k..];
        if skip.is_some() || (raw.trim().is_empty() && (raw.contains('\n') || paragraphs == 0)) {
            continue;
        }
        for ch in decode(raw).chars() {
            push(&mut out, ch, &cur);
        }
    }
    out
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
        assert_eq!(
            (t.size, t.color, t.reduced),
            (Some(24.0), Some([0, 0, 0]), false)
        );
        assert_eq!(
            t.spans,
            vec![
                Span {
                    text: "Bonjour\nà ".into(),
                    bold: true,
                    ..Span::default()
                },
                Span {
                    text: "monde".into(),
                    size: Some(32.0),
                    color: Some([255, 0, 0]),
                    font: Some("Liberation Sans".into()),
                    ..Span::default()
                },
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
        let text: Vec<(&str, bool, bool)> = t
            .spans
            .iter()
            .map(|s| (s.text.as_str(), s.bold, s.italic))
            .collect();
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
        assert_eq!(
            t.spans,
            vec![Span {
                text: "simple".into(),
                ..Span::default()
            }]
        );
        assert_eq!(read_qt_html(""), QtText::default());
    }
}
