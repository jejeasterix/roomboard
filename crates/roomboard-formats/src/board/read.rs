//! Lecteur SVG commun (C13, D1, D8 à D16) : `content.xml` IWB, `.iwb` en SVG brut, pages `pageNNN.svg` d'OpenBoard,
//! lus en flux BoardList. Deux temps : un arbre par `quick-xml` (aucune DTD ni entité externe résolue, D16), puis le
//! parcours des pages (cadre D8, formes D9, traits D10, texte D11, images D12, groupes D13, fond D14), car les
//! `iwb:element` et `iwb:group` suivent les pages. Ce qui n'est pas lu devient un avertissement par sorte et par page
//! (D15, U2). Aucun script, aucun attribut `on*` n'est rendu : seule la liste sort d'ici.
use std::collections::{BTreeMap, HashMap};

use quick_xml::events::{BytesStart, Event};
use quick_xml::{Reader, XmlVersion};

use super::qt_html::read_qt_html;
use super::{
    apply, compose, encode, BoardError, BoardList, Dialect, Item, Mat, Page, Rgb, ShapeKind, Span,
    IDENTITY, MAX_OBJECTS, MAX_PAGES, MAX_POINTS, MAX_SPANS, PAGE_WIDTH,
};
use crate::pdf::ASCENT;

const BLACK: Rgb = [0, 0, 0];
const DEFAULT_SIZE: f32 = 16.0;
const MAX_DEPTH: usize = 256;
const BAD_FRAME: &str = "cadre de page invalide";
/// Saut de ligne interne (`tbreak`) : jamais repris par la réduction des blancs.
const LINE: char = '\u{2028}';
const IMAGE_EXTS: [&str; 7] = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];
const AUDIO_EXTS: [&str; 5] = ["wav", "mp3", "ogg", "oga", "m4a"];

fn broken(m: &str) -> BoardError {
    BoardError::Broken(m.to_string())
}

/// Sortes d'avertissements (D15) ; l'ordre de l'énumération est l'ordre de la liste pour une même page.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum Sort {
    Doctype,
    Entity,
    Metadata,
    Script,
    Video,
    Audio,
    Flash,
    Widget,
    Link,
    Locked,
    Revealer,
    Container,
    Replicate,
    Ruler,
    Compass,
    Curtain,
    Axes,
    Rounded,
    PolygonFill,
    TextAlign,
    TextReduced,
    RemoteImage,
    ImageFormat,
    HtmlObject,
    UnknownObject,
    BackgroundObject,
    Unreadable,
}

const LABELS: [(Sort, &str, &str); 27] = [
    (
        Sort::Doctype,
        "déclaration DOCTYPE ignorée",
        "déclarations DOCTYPE ignorées",
    ),
    (
        Sort::Entity,
        "entité inconnue ignorée",
        "entités inconnues ignorées",
    ),
    (
        Sort::Metadata,
        "bloc de métadonnées non lu",
        "blocs de métadonnées non lus",
    ),
    (Sort::Script, "script ignoré", "scripts ignorés"),
    (Sort::Video, "vidéo non lue", "vidéos non lues"),
    (Sort::Audio, "son non lu", "sons non lus"),
    (
        Sort::Flash,
        "animation Flash non lue",
        "animations Flash non lues",
    ),
    (Sort::Widget, "widget non lu", "widgets non lus"),
    (
        Sort::Link,
        "lien perdu (contenu lu)",
        "liens perdus (contenu lu)",
    ),
    (Sort::Locked, "verrou non lu", "verrous non lus"),
    (Sort::Revealer, "révélateur non lu", "révélateurs non lus"),
    (Sort::Container, "conteneur non lu", "conteneurs non lus"),
    (
        Sort::Replicate,
        "duplicateur non lu",
        "duplicateurs non lus",
    ),
    (Sort::Ruler, "règle non lue", "règles non lues"),
    (Sort::Compass, "compas non lu", "compas non lus"),
    (Sort::Curtain, "rideau non lu", "rideaux non lus"),
    (Sort::Axes, "repère d'axes non lu", "repères d'axes non lus"),
    (
        Sort::Rounded,
        "rectangle dont les coins arrondis ne sont pas lus",
        "rectangles dont les coins arrondis ne sont pas lus",
    ),
    (
        Sort::PolygonFill,
        "remplissage de polygone non lu",
        "remplissages de polygones non lus",
    ),
    (
        Sort::TextAlign,
        "alignement de texte non lu",
        "alignements de texte non lus",
    ),
    (
        Sort::TextReduced,
        "mise en forme de texte réduite",
        "mises en forme de texte réduites",
    ),
    (
        Sort::RemoteImage,
        "image distante ou hors de l'archive non chargée",
        "images distantes ou hors de l'archive non chargées",
    ),
    (
        Sort::ImageFormat,
        "image d'un format non lu (EMF, WMF…)",
        "images d'un format non lu (EMF, WMF…)",
    ),
    (Sort::HtmlObject, "objet HTML non lu", "objets HTML non lus"),
    (
        Sort::UnknownObject,
        "objet d'un type non lu",
        "objets d'un type non lu",
    ),
    (
        Sort::BackgroundObject,
        "objet de fond gardé comme objet",
        "objets de fond gardés comme objets",
    ),
    (
        Sort::Unreadable,
        "objet illisible ignoré",
        "objets illisibles ignorés",
    ),
];

fn label(sort: Sort, n: u32) -> &'static str {
    let &(_, one, many) = LABELS
        .iter()
        .find(|(s, _, _)| *s == sort)
        .expect("chaque sorte a son libellé");
    if n == 1 {
        one
    } else {
        many
    }
}

/// Avertissements comptés par (page, sorte) ; page 0 : le document entier.
#[derive(Default)]
struct Notes {
    counts: BTreeMap<(u32, Sort), u32>,
}

impl Notes {
    fn add(&mut self, page: u32, sort: Sort) {
        *self.counts.entry((page, sort)).or_insert(0) += 1;
    }
    fn lines(&self) -> Vec<String> {
        self.counts
            .iter()
            .map(|(&(page, sort), &n)| {
                if page == 0 {
                    format!("{n} {}", label(sort, n))
                } else {
                    format!("page {page} : {n} {}", label(sort, n))
                }
            })
            .collect()
    }
}

#[derive(Debug, Default)]
struct Node {
    /// Nom local (sans préfixe) : `svg:rect` et `rect` se lisent pareil (Becta, 1EdTech, OpenBoard).
    name: String,
    /// Attributs par nom local ; un attribut répété garde sa première valeur.
    attrs: Vec<(String, String)>,
    /// Un attribut illisible (entité inconnue, attribut mal formé) : l'objet est sauté et compté (D16).
    bad: bool,
    children: Vec<Child>,
}

#[derive(Debug)]
enum Child {
    Node(Node),
    Text(String),
}

impl Node {
    fn attr(&self, k: &str) -> Option<&str> {
        self.attrs
            .iter()
            .find(|(n, _)| n == k)
            .map(|(_, v)| v.as_str())
    }
    fn nodes(&self) -> impl Iterator<Item = &Node> {
        self.children.iter().filter_map(|c| match c {
            Child::Node(n) => Some(n),
            Child::Text(_) => None,
        })
    }
}

fn node_of(e: &BytesStart<'_>) -> Node {
    let local = e.local_name();
    let name: &str = local.as_ref();
    let mut n = Node {
        name: name.to_string(),
        ..Node::default()
    };
    let mut attrs = e.attributes();
    attrs.with_checks(false);
    for a in attrs {
        let Ok(a) = a else {
            n.bad = true;
            continue;
        };
        let key_local = a.key.local_name();
        let key: &str = key_local.as_ref();
        let key = key.to_string();
        match a.normalized_value(XmlVersion::Explicit1_0) {
            Ok(v) => {
                if n.attr(&key).is_none() {
                    n.attrs.push((key, v.into_owned()));
                }
            }
            Err(_) => n.bad = true,
        }
    }
    n
}

fn add_child(stack: &mut [Node], child: Child) {
    if let Some(top) = stack.last_mut() {
        top.children.push(child);
    }
}

fn add_text(stack: &mut [Node], s: &str) {
    if s.is_empty() {
        return;
    }
    if let Some(top) = stack.last_mut() {
        if let Some(Child::Text(t)) = top.children.last_mut() {
            t.push_str(s);
        } else {
            top.children.push(Child::Text(s.to_string()));
        }
    }
}

fn predefined(name: &str) -> Option<&'static str> {
    match name {
        "lt" => Some("<"),
        "gt" => Some(">"),
        "amp" => Some("&"),
        "quot" => Some("\""),
        "apos" => Some("'"),
        _ => None,
    }
}

/// Arbre du document ; XML mal formé (balise fermée par une autre, comme `rectangle2.iwb`) : refus du fichier.
fn parse_tree(text: &str, notes: &mut Notes) -> Result<Node, BoardError> {
    let mut reader = Reader::from_str(text);
    let mut stack: Vec<Node> = vec![Node::default()];
    loop {
        match reader
            .read_event()
            .map_err(|e| broken(&format!("XML mal formé ({e})")))?
        {
            Event::Start(e) => {
                if stack.len() > MAX_DEPTH {
                    return Err(broken("imbrication trop profonde"));
                }
                stack.push(node_of(&e));
            }
            Event::Empty(e) => {
                let n = node_of(&e);
                add_child(&mut stack, Child::Node(n));
            }
            Event::End(_) => {
                let n = stack
                    .pop()
                    .ok_or_else(|| broken("balise fermante en trop"))?;
                if stack.is_empty() {
                    return Err(broken("balise fermante en trop"));
                }
                add_child(&mut stack, Child::Node(n));
            }
            Event::Text(t) => add_text(&mut stack, &t.xml10_content()),
            Event::CData(t) => add_text(&mut stack, &t.xml10_content()),
            Event::GeneralRef(r) => {
                if r.is_char_ref() {
                    match r.resolve_char_ref() {
                        Ok(Some(ch)) => add_text(&mut stack, ch.encode_utf8(&mut [0; 4])),
                        _ => notes.add(0, Sort::Entity),
                    }
                } else {
                    match predefined(&r.into_inner()) {
                        Some(s) => add_text(&mut stack, s),
                        None => notes.add(0, Sort::Entity),
                    }
                }
            }
            Event::DocType(_) => notes.add(0, Sort::Doctype),
            Event::Eof => break,
            _ => {}
        }
    }
    if stack.len() != 1 {
        return Err(broken("balise non fermée"));
    }
    let root = stack.pop().unwrap_or_default();
    root.children
        .into_iter()
        .find_map(|c| match c {
            Child::Node(n) => Some(n),
            Child::Text(_) => None,
        })
        .ok_or_else(|| broken("aucun élément"))
}

/// Cadre d'une page (D8) : `viewBox` (ou `viewbox`), sinon `0 0 width height`, sinon `0 0 1920 1080`.
struct Frame {
    x: f32,
    y: f32,
    w: f32,
    h: f32,
}

impl Frame {
    /// Échelle `1920 / largeur` et décalage `-x, -y` vers la page RoomBoard.
    fn base(&self) -> Mat {
        let s = PAGE_WIDTH / self.w;
        [s, 0.0, 0.0, s, -self.x * s, -self.y * s]
    }
}

fn frame_of(svg: &Node) -> Result<Frame, BoardError> {
    let f = if let Some(vb) = svg.attr("viewBox").or_else(|| svg.attr("viewbox")) {
        let v = numbers(vb).ok_or_else(|| broken(BAD_FRAME))?;
        if v.len() != 4 {
            return Err(broken(BAD_FRAME));
        }
        Frame {
            x: v[0],
            y: v[1],
            w: v[2],
            h: v[3],
        }
    } else if let (Some(w), Some(h)) = (
        svg.attr("width").and_then(length),
        svg.attr("height").and_then(length),
    ) {
        Frame {
            x: 0.0,
            y: 0.0,
            w,
            h,
        }
    } else {
        Frame {
            x: 0.0,
            y: 0.0,
            w: PAGE_WIDTH,
            h: super::PAGE_HEIGHT,
        }
    };
    if f.w.is_finite()
        && f.h.is_finite()
        && f.x.is_finite()
        && f.y.is_finite()
        && f.w > 0.0
        && f.h > 0.0
        && f.base().iter().all(|v| v.is_finite())
        && (f.h * PAGE_WIDTH / f.w).is_finite()
    {
        Ok(f)
    } else {
        Err(broken(BAD_FRAME))
    }
}

/// Style hérité (SVG) : attributs et déclarations de `style="…"`.
#[derive(Debug, Clone, Default)]
struct Style {
    fill: Option<String>,
    fill_opacity: Option<String>,
    stroke: Option<String>,
    stroke_width: Option<String>,
    stroke_opacity: Option<String>,
    font_size: Option<String>,
    font_family: Option<String>,
    font_weight: Option<String>,
    font_style: Option<String>,
    text_decoration: Option<String>,
    text_align: Option<String>,
}

impl Style {
    fn set(&mut self, k: &str, v: &str) {
        let v = Some(v.trim().to_string());
        match k.trim() {
            "fill" => self.fill = v,
            "fill-opacity" => self.fill_opacity = v,
            "stroke" => self.stroke = v,
            "stroke-width" => self.stroke_width = v,
            "stroke-opacity" => self.stroke_opacity = v,
            "font-size" => self.font_size = v,
            "font-family" => self.font_family = v,
            "font-weight" => self.font_weight = v,
            "font-style" => self.font_style = v,
            "text-decoration" => self.text_decoration = v,
            "text-align" => self.text_align = v,
            _ => {}
        }
    }
    fn inherit(&self, n: &Node) -> Style {
        let mut s = self.clone();
        for (k, v) in &n.attrs {
            s.set(k, v);
        }
        if let Some(css) = n.attr("style") {
            for decl in css.split(';') {
                if let Some((k, v)) = decl.split_once(':') {
                    s.set(k, v);
                }
            }
        }
        s
    }
}

#[derive(Clone)]
struct Ctx {
    m: Mat,
    style: Style,
    no: u32,
    /// Enfant direct de la page (fond d'une page `.ubz`, D14).
    top: bool,
}

/// `iwb:element` (par `ref`) et `iwb:group` du document IWB, lus avant les pages.
#[derive(Default)]
struct Refs {
    attrs: HashMap<String, Vec<(String, String)>>,
    groups: Vec<Vec<String>>,
}

impl Refs {
    fn value(&self, id: &str, key: &str) -> Option<&str> {
        self.attrs
            .get(id)?
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }
    fn flag(&self, id: &str, key: &str) -> bool {
        self.value(id, key) == Some("true")
    }
}

fn add_ref(refs: &mut Refs, e: &Node) {
    if let Some(r) = e.attr("ref") {
        refs.attrs
            .entry(r.to_string())
            .or_default()
            .extend(e.attrs.iter().filter(|(k, _)| k != "ref").cloned());
    }
}

fn refs_of(root: &Node, notes: &mut Notes) -> Refs {
    let mut refs = Refs::default();
    for n in root.nodes() {
        match n.name.as_str() {
            "element" => add_ref(&mut refs, n),
            "group" => {
                let mut ids = Vec::new();
                for e in n.nodes().filter(|e| e.name == "element") {
                    add_ref(&mut refs, e);
                    if let Some(r) = e.attr("ref") {
                        ids.push(r.to_string());
                    }
                }
                refs.groups.push(ids);
            }
            "meta" | "metadata" => notes.add(0, Sort::Metadata),
            _ => {}
        }
    }
    refs
}

fn pages_of<'a>(n: &'a Node, out: &mut Vec<&'a Node>) {
    for k in n.nodes() {
        match k.name.as_str() {
            "page" => out.push(k),
            "pageset" => pages_of(k, out),
            _ => {}
        }
    }
}

/// `iwb:group` : membres de premier niveau de la page, réunis à la place du premier (ordre de la page gardé).
fn group_top(out: &mut Vec<(Option<String>, Item)>, ids: &[String]) {
    let idx: Vec<usize> = out
        .iter()
        .enumerate()
        .filter(|(_, (id, _))| id.as_ref().is_some_and(|i| ids.contains(i)))
        .map(|(k, _)| k)
        .collect();
    if idx.len() < 2 {
        return;
    }
    let first = idx[0];
    let mut members: Vec<Item> = Vec::with_capacity(idx.len());
    for &k in idx.iter().rev() {
        members.push(out.remove(k).1);
    }
    members.reverse();
    out.insert(first, (None, Item::Group(members)));
}

/// Tout nombre de l'objet est fini (produits et sommes de nombres finis compris).
fn finite(it: &Item) -> bool {
    let ok = |v: &[f32]| v.iter().all(|x| x.is_finite());
    match it {
        Item::Shape {
            m,
            x0,
            y0,
            x1,
            y1,
            width,
            ..
        } => ok(m) && ok(&[*x0, *y0, *x1, *y1, *width]),
        Item::Stroke {
            m, width, points, ..
        } => ok(m) && width.is_finite() && points.iter().all(|p| ok(p)),
        Item::Text {
            m,
            x,
            y,
            w,
            h,
            size,
            spans,
            ..
        } => {
            ok(m)
                && ok(&[*x, *y, *w, *h, *size])
                && spans.iter().all(|s| s.size.is_none_or(f32::is_finite))
        }
        Item::Image { m, x, y, w, h, .. } => ok(m) && ok(&[*x, *y, *w, *h]),
        Item::Group(items) => items.iter().all(finite),
    }
}

/// Attribut absent : `default` ; présent mais illisible : l'objet est illisible.
struct Bad;
type Got = Result<Option<Item>, Bad>;
type Out = Vec<(Option<String>, Item)>;

fn length_attr(n: &Node, k: &str, default: f32) -> Result<f32, Bad> {
    match n.attr(k) {
        None => Ok(default),
        Some(v) => length(v).ok_or(Bad),
    }
}

/// Premier nombre d'une liste (`x="10 20 30"` d'un texte), 0 si absent.
fn first(n: &Node, k: &str) -> Result<f32, Bad> {
    match n.attr(k) {
        None => Ok(0.0),
        Some(v) => numbers(v).and_then(|l| l.first().copied()).ok_or(Bad),
    }
}

fn numbers(s: &str) -> Option<Vec<f32>> {
    s.split(|c: char| c.is_whitespace() || c == ',')
        .filter(|t| !t.is_empty())
        .map(|t| t.parse::<f32>().ok().filter(|v| v.is_finite()))
        .collect()
}

/// Longueur en pixels : nombre nu ou `px` ; `pt` × 4/3 ; toute autre unité : illisible.
fn length(s: &str) -> Option<f32> {
    let s = s.trim();
    let (v, pt) = if let Some(n) = s.strip_suffix("px") {
        (n, false)
    } else if let Some(n) = s.strip_suffix("pt") {
        (n, true)
    } else {
        (s, false)
    };
    v.trim()
        .parse::<f32>()
        .ok()
        .map(|x| if pt { x * 4.0 / 3.0 } else { x })
        .filter(|x| x.is_finite())
}

fn font_px(s: &str) -> Option<f32> {
    length(s).filter(|v| *v > 0.0)
}

fn family(s: &str) -> String {
    s.split(',')
        .next()
        .unwrap_or("")
        .trim()
        .trim_matches(|c| c == '\'' || c == '"')
        .to_string()
}

fn is_bold(v: &str) -> bool {
    v == "bold" || v == "bolder" || v.parse::<u32>().is_ok_and(|w| w >= 600)
}

const NAMED: [(&str, Rgb); 22] = [
    ("black", [0, 0, 0]),
    ("white", [255, 255, 255]),
    ("red", [255, 0, 0]),
    ("green", [0, 128, 0]),
    ("blue", [0, 0, 255]),
    ("yellow", [255, 255, 0]),
    ("purple", [128, 0, 128]),
    ("pink", [255, 192, 203]),
    ("orange", [255, 165, 0]),
    ("grey", [128, 128, 128]),
    ("gray", [128, 128, 128]),
    ("brown", [165, 42, 42]),
    ("lime", [0, 255, 0]),
    ("aqua", [0, 255, 255]),
    ("cyan", [0, 255, 255]),
    ("fuchsia", [255, 0, 255]),
    ("magenta", [255, 0, 255]),
    ("maroon", [128, 0, 0]),
    ("navy", [0, 0, 128]),
    ("olive", [128, 128, 0]),
    ("silver", [192, 192, 192]),
    ("teal", [0, 128, 128]),
];

/// Couleur SVG : `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(r,g,b)` (entiers ou pourcentages), nom de base.
fn color_of(s: &str) -> Option<Rgb> {
    let s = s.trim();
    if let Some(h) = s.strip_prefix('#') {
        if !h.is_ascii() {
            return None;
        }
        return match h.len() {
            3 => {
                let d = |i: usize| u8::from_str_radix(&h[i..i + 1], 16).ok().map(|x| x * 17);
                Some([d(0)?, d(1)?, d(2)?])
            }
            6 | 8 => Some([
                u8::from_str_radix(&h[0..2], 16).ok()?,
                u8::from_str_radix(&h[2..4], 16).ok()?,
                u8::from_str_radix(&h[4..6], 16).ok()?,
            ]),
            _ => None,
        };
    }
    if let Some(inner) = s.strip_prefix("rgb(").and_then(|r| r.strip_suffix(')')) {
        let parts: Vec<&str> = inner.split(',').map(str::trim).collect();
        if parts.len() != 3 {
            return None;
        }
        let comp = |p: &str| -> Option<u8> {
            let v = match p.strip_suffix('%') {
                Some(pc) => pc.trim().parse::<f32>().ok()? * 2.55,
                None => p.parse::<f32>().ok()?,
            };
            v.is_finite().then(|| v.round().clamp(0.0, 255.0) as u8)
        };
        return Some([comp(parts[0])?, comp(parts[1])?, comp(parts[2])?]);
    }
    NAMED
        .iter()
        .find(|(n, _)| n.eq_ignore_ascii_case(s))
        .map(|(_, c)| *c)
}

/// Remplissage SVG : absent = noir ; `none`, `transparent` ou opacité 0 : aucun.
fn fill_of(s: &Style) -> Option<Rgb> {
    if s.fill_opacity
        .as_deref()
        .and_then(|o| o.parse::<f32>().ok())
        == Some(0.0)
    {
        return None;
    }
    match s.fill.as_deref() {
        None => Some(BLACK),
        Some("none") | Some("transparent") => None,
        Some(v) => Some(color_of(v).unwrap_or(BLACK)),
    }
}

/// D9 : contour absent, `none`, d'épaisseur 0 ou d'opacité 0 → couleur du remplissage, épaisseur 1.
fn outline(s: &Style, fill: Option<Rgb>) -> (Rgb, f32) {
    let width = s.stroke_width.as_deref().and_then(length).unwrap_or(1.0);
    let hidden = s
        .stroke_opacity
        .as_deref()
        .and_then(|o| o.parse::<f32>().ok())
        == Some(0.0);
    match s
        .stroke
        .as_deref()
        .filter(|v| *v != "none" && *v != "transparent")
        .and_then(color_of)
    {
        Some(c) if !hidden && width > 0.0 => (c, width),
        _ => (fill.unwrap_or(BLACK), 1.0),
    }
}

fn rot(deg: f32) -> Mat {
    let (s, c) = deg.to_radians().sin_cos();
    [c, s, -s, c, 0.0, 0.0]
}

/// Attribut `transform` : `matrix`, `translate`, `scale`, `rotate` (avec centre), `skewX`, `skewY`, de gauche à droite.
fn parse_transform(s: &str) -> Option<Mat> {
    let mut m = IDENTITY;
    let mut rest = s.trim();
    while !rest.is_empty() {
        let open = rest.find('(')?;
        let close = rest.find(')')?;
        if close < open {
            return None;
        }
        let name = rest[..open].trim();
        let args = numbers(&rest[open + 1..close])?;
        let t: Mat = match (name, args.as_slice()) {
            ("matrix", [a, b, c, d, e, g]) => [*a, *b, *c, *d, *e, *g],
            ("translate", [x]) => [1.0, 0.0, 0.0, 1.0, *x, 0.0],
            ("translate", [x, y]) => [1.0, 0.0, 0.0, 1.0, *x, *y],
            ("scale", [k]) => [*k, 0.0, 0.0, *k, 0.0, 0.0],
            ("scale", [x, y]) => [*x, 0.0, 0.0, *y, 0.0, 0.0],
            ("rotate", [a]) => rot(*a),
            ("rotate", [a, cx, cy]) => compose(
                &compose(&[1.0, 0.0, 0.0, 1.0, *cx, *cy], &rot(*a)),
                &[1.0, 0.0, 0.0, 1.0, -cx, -cy],
            ),
            ("skewX", [a]) => [1.0, 0.0, a.to_radians().tan(), 1.0, 0.0, 0.0],
            ("skewY", [a]) => [1.0, a.to_radians().tan(), 0.0, 1.0, 0.0, 0.0],
            _ => return None,
        };
        m = compose(&m, &t);
        rest = rest[close + 1..].trim_start_matches(|c: char| c == ',' || c.is_whitespace());
    }
    m.iter().all(|v| v.is_finite()).then_some(m)
}

fn transform_of(n: &Node) -> Option<Mat> {
    match n.attr("transform") {
        None => Some(IDENTITY),
        Some(t) => parse_transform(t),
    }
}

/// Image de l'archive : chemin relatif sans schéma (`http:`, `data:`, `file:`, `C:`), ni `/`, ni `..`, ni ancre.
fn is_local(href: &str) -> bool {
    let h = href.trim();
    if h.is_empty() || h.starts_with('/') || h.starts_with('\\') || h.starts_with('#') {
        return false;
    }
    if let Some(i) = h.find(':') {
        let scheme = &h[..i];
        if scheme
            .chars()
            .next()
            .is_some_and(|c| c.is_ascii_alphabetic())
            && scheme
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || "+.-".contains(c))
        {
            return false;
        }
    }
    !h.replace('\\', "/").split('/').any(|s| s == "..")
}

fn ext_of(href: &str) -> String {
    href.rsplit(['/', '\\'])
        .next()
        .and_then(|b| b.rsplit_once('.'))
        .map(|(_, e)| e.to_ascii_lowercase())
        .unwrap_or_default()
}

fn normalize_href(href: &str) -> String {
    href.trim()
        .replace('\\', "/")
        .trim_start_matches("./")
        .to_string()
}

fn is_flash(n: &Node) -> bool {
    ext_of(n.attr("href").unwrap_or("")) == "swf"
        || n.attr("type").is_some_and(|t| t.contains("flash"))
}

/// Texte du premier descendant `name` (HTML de Qt dans `itemTextContent`, déjà désenveloppé du XML).
fn inner_text(n: &Node, name: &str) -> Option<String> {
    for k in n.nodes() {
        if k.name == name {
            return Some(
                k.children
                    .iter()
                    .filter_map(|c| match c {
                        Child::Text(t) => Some(t.as_str()),
                        Child::Node(_) => None,
                    })
                    .collect(),
            );
        }
        if let Some(t) = inner_text(k, name) {
            return Some(t);
        }
    }
    None
}

/// Mise en forme d'un segment ; `size`, `color` : seulement ceux d'un `tspan` (ceux de l'élément sont l'élément).
#[derive(Debug, Clone, Default, PartialEq)]
struct Look {
    bold: bool,
    italic: bool,
    underline: bool,
    size: Option<f32>,
    color: Option<Rgb>,
    font: Option<String>,
}

fn own_look(base: &Look, n: &Node) -> Look {
    let s = Style::default().inherit(n);
    let mut l = base.clone();
    if let Some(w) = &s.font_weight {
        l.bold = is_bold(w);
    }
    if let Some(v) = &s.font_style {
        l.italic = v == "italic" || v == "oblique";
    }
    if let Some(v) = &s.text_decoration {
        l.underline = v.contains("underline");
    }
    if let Some(v) = s.font_size.as_deref().and_then(font_px) {
        l.size = Some(v);
    }
    if let Some(v) = s.fill.as_deref().and_then(color_of) {
        l.color = Some(v);
    }
    if let Some(v) = &s.font_family {
        l.font = Some(family(v));
    }
    l
}

fn collect(n: &Node, look: usize, looks: &mut Vec<Look>, out: &mut Vec<(char, usize)>) {
    for c in &n.children {
        match c {
            Child::Text(t) => out.extend(t.chars().map(|ch| (ch, look))),
            Child::Node(k) => match k.name.as_str() {
                "tspan" => {
                    let l = own_look(&looks[look], k);
                    looks.push(l);
                    let idx = looks.len() - 1;
                    collect(k, idx, looks, out);
                }
                "tbreak" => out.push((LINE, look)),
                "a" => collect(k, look, looks, out),
                _ => {}
            },
        }
    }
}

/// Blancs XML réduits à une espace ; aucune espace en tête, en fin, ni autour d'un saut de ligne (sans `xml:space`).
fn squeeze(chars: Vec<(char, usize)>) -> Vec<(char, usize)> {
    let mut out: Vec<(char, usize)> = Vec::with_capacity(chars.len());
    for (ch, k) in chars {
        if ch == LINE {
            while matches!(out.last(), Some((' ', _))) {
                out.pop();
            }
            out.push((LINE, k));
            continue;
        }
        if ch.is_whitespace() {
            if !matches!(out.last(), None | Some((' ', _)) | Some((LINE, _))) {
                out.push((' ', k));
            }
            continue;
        }
        out.push((ch, k));
    }
    while matches!(out.last(), Some((' ', _))) {
        out.pop();
    }
    out
}

fn spans_of(chars: Vec<(char, usize)>, looks: &[Look], preserve: bool) -> Vec<Span> {
    let chars = if preserve { chars } else { squeeze(chars) };
    let mut spans: Vec<Span> = Vec::new();
    let mut last: Option<usize> = None;
    for (ch, k) in chars {
        let ch = if ch == LINE { '\n' } else { ch };
        let same = last.is_some_and(|l| looks[l] == looks[k]);
        match spans.last_mut() {
            Some(s) if same => s.text.push(ch),
            _ => {
                let l = &looks[k];
                spans.push(Span {
                    text: ch.to_string(),
                    bold: l.bold,
                    italic: l.italic,
                    underline: l.underline,
                    size: l.size,
                    color: l.color,
                    font: l.font.clone(),
                });
            }
        }
        last = Some(k);
    }
    spans
}

/// Boîte d'un texte sans largeur ni hauteur : 0,6 × taille par caractère de la plus longue ligne, 1,2 × taille par ligne.
fn estimate(spans: &[Span], size: f32) -> (f32, f32) {
    let text: String = spans.iter().map(|s| s.text.as_str()).collect();
    let lines: Vec<&str> = text.split('\n').collect();
    let longest = lines.iter().map(|l| l.chars().count()).max().unwrap_or(0) as f32;
    (
        (longest * size * 0.6).max(size),
        lines.len() as f32 * size * 1.2,
    )
}

/// Trait à pression d'OpenBoard (HU1-1) : un `g` de quadrilatères ; ligne médiane, pression = largeur locale / maximale.
fn pressure_stroke(n: &Node, c: &Ctx) -> Option<Item> {
    let polys: Vec<&Node> = n.nodes().collect();
    if polys.is_empty() || polys.iter().any(|p| p.name != "polygon" || p.bad) {
        return None;
    }
    let mut quads: Vec<Vec<f32>> = Vec::with_capacity(polys.len());
    for p in &polys {
        let v = numbers(p.attr("points")?)?;
        if v.len() != 8 {
            return None;
        }
        quads.push(v);
    }
    let color = polys[0]
        .attr("fill")
        .or(c.style.fill.as_deref())
        .and_then(color_of)
        .unwrap_or(BLACK);
    let mut pts: Vec<(f32, f32, f32)> = Vec::with_capacity(quads.len() + 1);
    for (i, q) in quads.iter().enumerate() {
        if i == 0 {
            pts.push((
                (q[0] + q[6]) / 2.0,
                (q[1] + q[7]) / 2.0,
                (q[0] - q[6]).hypot(q[1] - q[7]),
            ));
        }
        pts.push((
            (q[2] + q[4]) / 2.0,
            (q[3] + q[5]) / 2.0,
            (q[2] - q[4]).hypot(q[3] - q[5]),
        ));
    }
    let max = pts.iter().fold(0.0f32, |a, p| a.max(p.2));
    if max <= 0.0 || !max.is_finite() {
        return None;
    }
    Some(Item::Stroke {
        m: c.m,
        color,
        width: max,
        points: pts.iter().map(|&(x, y, w)| [x, y, w / max]).collect(),
    })
}

fn ellipse(n: &Node, c: &Ctx) -> Got {
    let (cx, cy) = (length_attr(n, "cx", 0.0)?, length_attr(n, "cy", 0.0)?);
    let (rx, ry) = if n.name == "circle" {
        let r = length_attr(n, "r", 0.0)?;
        (r, r)
    } else {
        (length_attr(n, "rx", 0.0)?, length_attr(n, "ry", 0.0)?)
    };
    if rx < 0.0 || ry < 0.0 {
        return Err(Bad);
    }
    let fill = fill_of(&c.style);
    let (color, width) = outline(&c.style, fill);
    Ok(Some(Item::Shape {
        kind: ShapeKind::Ellipse,
        m: c.m,
        x0: cx - rx,
        y0: cy - ry,
        x1: cx + rx,
        y1: cy + ry,
        color,
        width,
        fill,
    }))
}

/// Éléments connus qui ne dessinent rien : `Some(Some(sorte))` à dire, `Some(None)` muets ; `None` : type inconnu.
fn ignored(n: &Node) -> Option<Option<Sort>> {
    Some(match n.name.as_str() {
        "video" => Some(if is_flash(n) {
            Sort::Flash
        } else {
            Sort::Video
        }),
        "audio" => Some(Sort::Audio),
        "script" => Some(Sort::Script),
        "ruler" => Some(Sort::Ruler),
        "compass" => Some(Sort::Compass),
        "curtain" => Some(Sort::Curtain),
        "axes" => Some(Sort::Axes),
        "object" | "embed" | "widget" | "w3cWidget" | "appleWidget" => Some(if is_flash(n) {
            Sort::Flash
        } else {
            Sort::Widget
        }),
        "metadata" | "meta" => Some(Sort::Metadata),
        "title" | "desc" | "defs" | "style" | "tbreak" | "tspan" | "page" | "pageset" => None,
        _ => return None,
    })
}

fn minmax(v: impl Iterator<Item = f32>) -> (f32, f32) {
    v.fold((f32::MAX, f32::MIN), |(lo, hi), x| (lo.min(x), hi.max(x)))
}

struct State<'a> {
    frame: &'a Frame,
    dialect: Dialect,
    refs: &'a Refs,
    notes: &'a mut Notes,
    objects: usize,
}

impl State<'_> {
    fn count(&mut self) -> Result<(), BoardError> {
        self.objects += 1;
        if self.objects > MAX_OBJECTS {
            Err(BoardError::TooBig)
        } else {
            Ok(())
        }
    }

    fn flags(&mut self, id: &str, no: u32) {
        for (key, sort) in [
            ("locked", Sort::Locked),
            ("revealer", Sort::Revealer),
            ("container", Sort::Container),
            ("replicate", Sort::Replicate),
        ] {
            if self.refs.flag(id, key) {
                self.notes.add(no, sort);
            }
        }
    }

    /// Rectangle qui couvre la page (tolérance 2 unités de page), dans les coordonnées RoomBoard.
    fn covers(&self, m: &Mat, x: f32, y: f32, w: f32, h: f32) -> bool {
        let pts = [
            apply(m, x, y),
            apply(m, x + w, y),
            apply(m, x, y + h),
            apply(m, x + w, y + h),
        ];
        let (x0, x1) = minmax(pts.iter().map(|p| p.0));
        let (y0, y1) = minmax(pts.iter().map(|p| p.1));
        let page_h = self.frame.h * PAGE_WIDTH / self.frame.w;
        x0 <= 2.0 && y0 <= 2.0 && x1 >= PAGE_WIDTH - 2.0 && y1 >= page_h - 2.0
    }

    fn page(&mut self, node: &Node, base: &Style, no: u32) -> Result<Page, BoardError> {
        let ctx = Ctx {
            m: self.frame.base(),
            style: base.inherit(node),
            no,
            top: true,
        };
        let mut out: Out = Vec::new();
        let mut background = None;
        self.children(node, &ctx, &mut out, &mut background)?;
        for ids in &self.refs.groups {
            group_top(&mut out, ids);
        }
        Ok(Page {
            background,
            items: out.into_iter().map(|(_, i)| i).collect(),
        })
    }

    fn children(
        &mut self,
        n: &Node,
        c: &Ctx,
        out: &mut Out,
        bg: &mut Option<Rgb>,
    ) -> Result<(), BoardError> {
        for k in n.nodes() {
            self.element(k, c, out, bg)?;
        }
        Ok(())
    }

    fn element(
        &mut self,
        n: &Node,
        c: &Ctx,
        out: &mut Out,
        bg: &mut Option<Rgb>,
    ) -> Result<(), BoardError> {
        if n.bad {
            self.notes.add(c.no, Sort::Unreadable);
            return Ok(());
        }
        let Some(local) = transform_of(n) else {
            self.notes.add(c.no, Sort::Unreadable);
            return Ok(());
        };
        let ctx = Ctx {
            m: compose(&c.m, &local),
            style: c.style.inherit(n),
            no: c.no,
            top: c.top,
        };
        let id = n.attr("id").map(str::to_string);
        if let Some(i) = &id {
            self.flags(i, c.no);
        }
        let got: Got = match n.name.as_str() {
            "g" => return self.group(n, &ctx, id, out, bg),
            "a" => {
                let href = n.attr("href").unwrap_or("");
                self.notes.add(
                    c.no,
                    if AUDIO_EXTS.contains(&ext_of(href).as_str()) {
                        Sort::Audio
                    } else {
                        Sort::Link
                    },
                );
                return self.children(n, &ctx, out, bg);
            }
            "switch" => return self.children(n, &ctx, out, bg),
            "rect" => {
                let first_child = out.is_empty();
                self.rect(n, &ctx, id.as_deref(), first_child, bg)
            }
            "circle" | "ellipse" => ellipse(n, &ctx),
            "line" => self.line(n, &ctx, id.as_deref()),
            "polyline" | "polygon" => self.poly(n, &ctx),
            "text" | "textarea" => self.text(n, &ctx),
            "image" => self.image(n, &ctx, id.as_deref()),
            "foreignObject" => self.foreign(n, &ctx),
            _ => {
                match ignored(n) {
                    Some(Some(sort)) => self.notes.add(c.no, sort),
                    Some(None) => {}
                    None => self.notes.add(c.no, Sort::UnknownObject),
                }
                Ok(None)
            }
        };
        match got {
            Ok(Some(item)) if !finite(&item) => self.notes.add(c.no, Sort::Unreadable),
            Ok(Some(item)) => {
                if self.dialect == Dialect::Iwb
                    && !matches!(n.name.as_str(), "rect" | "image")
                    && id
                        .as_deref()
                        .is_some_and(|i| self.refs.flag(i, "background"))
                {
                    self.notes.add(c.no, Sort::BackgroundObject);
                }
                self.count()?;
                out.push((id, item));
            }
            Ok(None) => {}
            Err(Bad) => self.notes.add(c.no, Sort::Unreadable),
        }
        Ok(())
    }

    fn group(
        &mut self,
        n: &Node,
        c: &Ctx,
        id: Option<String>,
        out: &mut Out,
        bg: &mut Option<Rgb>,
    ) -> Result<(), BoardError> {
        if self.dialect == Dialect::Ubz {
            if let Some(stroke) = pressure_stroke(n, c) {
                if !finite(&stroke) {
                    self.notes.add(c.no, Sort::Unreadable);
                    return Ok(());
                }
                self.count()?;
                out.push((id, stroke));
                return Ok(());
            }
        }
        let inner_ctx = Ctx {
            top: false,
            ..c.clone()
        };
        let mut inner: Out = Vec::new();
        self.children(n, &inner_ctx, &mut inner, bg)?;
        if !inner.is_empty()
            && self.dialect == Dialect::Iwb
            && id
                .as_deref()
                .is_some_and(|i| self.refs.flag(i, "background"))
        {
            self.notes.add(c.no, Sort::BackgroundObject);
        }
        match inner.len() {
            0 => {}
            1 => {
                if let Some((_, item)) = inner.pop() {
                    out.push((id, item));
                }
            }
            _ => out.push((id, Item::Group(inner.into_iter().map(|(_, i)| i).collect()))),
        }
        Ok(())
    }

    fn rect(
        &mut self,
        n: &Node,
        c: &Ctx,
        id: Option<&str>,
        first_child: bool,
        bg: &mut Option<Rgb>,
    ) -> Got {
        let (x, y, w, h) = (
            length_attr(n, "x", 0.0)?,
            length_attr(n, "y", 0.0)?,
            length_attr(n, "width", 0.0)?,
            length_attr(n, "height", 0.0)?,
        );
        if w < 0.0 || h < 0.0 {
            return Err(Bad);
        }
        let fill = fill_of(&c.style);
        let wants_bg = match self.dialect {
            Dialect::Iwb => id.is_some_and(|i| self.refs.flag(i, "background")),
            Dialect::Ubz => c.top && first_child && bg.is_none() && fill.is_some(),
            Dialect::Notebook => c.top && first_child && bg.is_none() && fill.is_some(),
        };
        if wants_bg {
            if let Some(color) = fill.filter(|_| self.covers(&c.m, x, y, w, h)) {
                *bg = Some(color);
                return Ok(None);
            }
            if self.dialect == Dialect::Iwb {
                self.notes.add(c.no, Sort::BackgroundObject);
            }
        }
        if n.attr("rx").and_then(length).unwrap_or(0.0) > 0.0
            || n.attr("ry").and_then(length).unwrap_or(0.0) > 0.0
        {
            self.notes.add(c.no, Sort::Rounded);
        }
        let (color, width) = outline(&c.style, fill);
        Ok(Some(Item::Shape {
            kind: ShapeKind::Rect,
            m: c.m,
            x0: x,
            y0: y,
            x1: x + w,
            y1: y + h,
            color,
            width,
            fill,
        }))
    }

    fn line(&mut self, n: &Node, c: &Ctx, id: Option<&str>) -> Got {
        let (x1, y1, x2, y2) = (
            length_attr(n, "x1", 0.0)?,
            length_attr(n, "y1", 0.0)?,
            length_attr(n, "x2", 0.0)?,
            length_attr(n, "y2", 0.0)?,
        );
        let arrow = id.is_some_and(|i| self.refs.value(i, "stroke-lineshape-end") == Some("arrow"));
        let (color, width) = outline(&c.style, fill_of(&c.style));
        let kind = if arrow {
            ShapeKind::Arrow
        } else {
            ShapeKind::Line
        };
        Ok(Some(Item::Shape {
            kind,
            m: c.m,
            x0: x1,
            y0: y1,
            x1: x2,
            y1: y2,
            color,
            width,
            fill: None,
        }))
    }

    fn poly(&mut self, n: &Node, c: &Ctx) -> Got {
        let v = numbers(n.attr("points").unwrap_or("")).ok_or(Bad)?;
        if v.len() < 2 || v.len() / 2 > MAX_POINTS as usize {
            return Err(Bad);
        }
        let mut points: Vec<[f32; 3]> = v
            .as_chunks::<2>()
            .0
            .iter()
            .map(|&[x, y]| [x, y, 1.0])
            .collect();
        let fill = fill_of(&c.style);
        if n.name == "polygon" {
            if let Some(&p) = points.first() {
                points.push(p);
            }
            if fill.is_some() {
                self.notes.add(c.no, Sort::PolygonFill);
            }
        }
        let (color, width) = outline(&c.style, fill);
        Ok(Some(Item::Stroke {
            m: c.m,
            color,
            width,
            points,
        }))
    }

    fn text(&mut self, n: &Node, c: &Ctx) -> Got {
        let size = c
            .style
            .font_size
            .as_deref()
            .and_then(font_px)
            .unwrap_or(DEFAULT_SIZE);
        let color = c.style.fill.as_deref().and_then(color_of).unwrap_or(BLACK);
        if c.style
            .text_align
            .as_deref()
            .is_some_and(|a| !matches!(a, "" | "start" | "left"))
        {
            self.notes.add(c.no, Sort::TextAlign);
        }
        let base = Look {
            bold: c.style.font_weight.as_deref().is_some_and(is_bold),
            italic: c
                .style
                .font_style
                .as_deref()
                .is_some_and(|v| v == "italic" || v == "oblique"),
            underline: c
                .style
                .text_decoration
                .as_deref()
                .is_some_and(|v| v.contains("underline")),
            size: None,
            color: None,
            font: c.style.font_family.as_deref().map(family),
        };
        let mut looks = vec![base];
        let mut chars = Vec::new();
        collect(n, 0, &mut looks, &mut chars);
        let spans = spans_of(chars, &looks, n.attr("space") == Some("preserve"));
        if spans.len() > MAX_SPANS as usize {
            return Err(Bad);
        }
        if spans.iter().all(|s| s.text.trim().is_empty()) {
            return Ok(None);
        }
        let (x, y) = (first(n, "x")?, first(n, "y")?);
        let top = if n.name == "text" {
            y - size * ASCENT
        } else {
            y
        };
        let (ew, eh) = estimate(&spans, size);
        let w = n
            .attr("width")
            .and_then(length)
            .filter(|v| *v > 0.0)
            .unwrap_or(ew);
        let h = n
            .attr("height")
            .and_then(length)
            .filter(|v| *v > 0.0)
            .unwrap_or(eh);
        Ok(Some(Item::Text {
            m: c.m,
            x,
            y: top,
            w,
            h,
            size,
            color,
            spans,
        }))
    }

    fn image(&mut self, n: &Node, c: &Ctx, id: Option<&str>) -> Got {
        let href = n.attr("href").unwrap_or("").trim();
        if !is_local(href) {
            self.notes.add(c.no, Sort::RemoteImage);
            return Ok(None);
        }
        if !IMAGE_EXTS.contains(&ext_of(href).as_str()) {
            self.notes.add(c.no, Sort::ImageFormat);
            return Ok(None);
        }
        let (x, y, w, h) = (
            length_attr(n, "x", 0.0)?,
            length_attr(n, "y", 0.0)?,
            length_attr(n, "width", 0.0)?,
            length_attr(n, "height", 0.0)?,
        );
        if w <= 0.0 || h <= 0.0 {
            return Err(Bad);
        }
        if id.is_some_and(|i| self.refs.flag(i, "background")) {
            self.notes.add(c.no, Sort::BackgroundObject);
        }
        Ok(Some(Item::Image {
            m: c.m,
            x,
            y,
            w,
            h,
            href: normalize_href(href),
        }))
    }

    /// Texte d'OpenBoard (`foreignObject ub:type="text"`, D11) ; tout autre `foreignObject` (HTML) : jamais rendu.
    fn foreign(&mut self, n: &Node, c: &Ctx) -> Got {
        if n.attr("type") != Some("text") {
            self.notes.add(c.no, Sort::HtmlObject);
            return Ok(None);
        }
        let html = n
            .attr("itemTextContent")
            .map(str::to_string)
            .or_else(|| inner_text(n, "itemTextContent"))
            .unwrap_or_default();
        let qt = read_qt_html(&html);
        if qt.reduced {
            self.notes.add(c.no, Sort::TextReduced);
        }
        if qt.spans.iter().all(|s| s.text.trim().is_empty()) {
            return Ok(None);
        }
        let size = qt.size.unwrap_or(DEFAULT_SIZE);
        let (ew, eh) = estimate(&qt.spans, size);
        let (x, y) = (first(n, "x")?, first(n, "y")?);
        let w = n
            .attr("width")
            .and_then(length)
            .filter(|v| *v > 0.0)
            .unwrap_or(ew);
        let h = n
            .attr("height")
            .and_then(length)
            .filter(|v| *v > 0.0)
            .unwrap_or(eh);
        Ok(Some(Item::Text {
            m: c.m,
            x,
            y,
            w,
            h,
            size,
            color: qt.color.unwrap_or(BLACK),
            spans: qt.spans,
        }))
    }
}

/// Lit un `content.xml` IWB, un `.iwb` en SVG brut (`dialect` Iwb) ou une page `pageNNN.svg` (Ubz) ; `first_page`
/// numérote les avertissements (1 pour un `.iwb` ; rang de la page pour un `.ubz`).
pub fn read_svg(xml: &[u8], dialect: Dialect, first_page: u32) -> Result<BoardList, BoardError> {
    let body = xml.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(xml);
    let text = std::str::from_utf8(body).map_err(|_| broken("texte non UTF-8"))?;
    let mut notes = Notes::default();
    let root = parse_tree(text, &mut notes)?;
    let svg: &Node = match root.name.as_str() {
        "svg" => &root,
        "iwb" => root
            .nodes()
            .find(|n| n.name == "svg")
            .ok_or_else(|| broken("aucune balise svg"))?,
        other => return Err(broken(&format!("racine inattendue <{other}>"))),
    };
    let frame = frame_of(svg)?;
    let refs = if root.name == "iwb" {
        refs_of(&root, &mut notes)
    } else {
        Refs::default()
    };
    let mut nodes: Vec<&Node> = Vec::new();
    pages_of(svg, &mut nodes);
    if nodes.is_empty() {
        nodes.push(svg);
    }
    let total = nodes.len();
    let base = Style::default().inherit(svg);
    let pages = {
        let mut st = State {
            frame: &frame,
            dialect,
            refs: &refs,
            notes: &mut notes,
            objects: 0,
        };
        let mut pages = Vec::with_capacity(total.min(MAX_PAGES));
        for (i, node) in nodes.iter().take(MAX_PAGES).enumerate() {
            pages.push(st.page(node, &base, first_page + i as u32)?);
        }
        pages
    };
    let mut list = encode(&pages);
    let mut warnings = Vec::new();
    if total > MAX_PAGES {
        warnings.push(format!("{MAX_PAGES} premières pages importées sur {total}"));
    }
    warnings.extend(notes.lines());
    list.warnings = warnings;
    Ok(list)
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
        let got = items(&iwb(
            body,
            r#"<iwb:element ref="l" stroke-lineshape-end="arrow"/>"#,
        ));
        assert_eq!(
            got,
            vec![
                Item::Shape {
                    kind: ShapeKind::Rect,
                    m: S2,
                    x0: 10.0,
                    y0: 20.0,
                    x1: 110.0,
                    y1: 70.0,
                    color: [0, 0, 0],
                    width: 2.0,
                    fill: Some([255, 0, 0])
                },
                Item::Shape {
                    kind: ShapeKind::Ellipse,
                    m: S2,
                    x0: 40.0,
                    y0: 50.0,
                    x1: 60.0,
                    y1: 70.0,
                    color: [0, 0, 255],
                    width: 1.0,
                    fill: None
                },
                Item::Shape {
                    kind: ShapeKind::Arrow,
                    m: S2,
                    x0: 0.0,
                    y0: 0.0,
                    x1: 30.0,
                    y1: 40.0,
                    color: [0, 128, 0],
                    width: 3.0,
                    fill: None
                },
                Item::Stroke {
                    m: S2,
                    color: [0, 0, 0],
                    width: 4.0,
                    points: vec![[1.0, 2.0, 1.0], [3.0, 4.0, 1.0], [5.0, 6.0, 1.0]]
                },
            ]
        );
    }

    #[test]
    fn frame_rules_and_bad_frames() {
        let m_of = |attrs: &str| -> Result<Mat, String> {
            let xml = format!(
                r#"<svg xmlns="http://www.w3.org/2000/svg" {attrs}><rect width="1" height="1"/></svg>"#
            );
            let l = read_svg(xml.as_bytes(), Dialect::Ubz, 1).map_err(|e| e.to_string())?;
            match &parse(&l).expect("liste")[0].items[0] {
                Item::Shape { m, .. } => Ok(*m),
                other => panic!("{other:?}"),
            }
        };
        assert_eq!(m_of(r#"width="800" height="600""#).expect("taille")[0], 2.4);
        assert_eq!(m_of("").expect("défaut"), IDENTITY);
        assert_eq!(
            m_of(r#"viewBox="10 20 960 540""#).expect("décalé"),
            [2.0, 0.0, 0.0, 2.0, -20.0, -40.0]
        );
        assert_eq!(
            m_of(r#"viewBox="0 0 0 600""#).expect_err("refus"),
            "fichier endommagé : cadre de page invalide"
        );
        assert_eq!(
            m_of(r#"viewBox="0 0 abc 1""#).expect_err("refus"),
            "fichier endommagé : cadre de page invalide"
        );
    }

    /// Review Focus 2 : forme de `7-11 Maths 3.iwb` (CDATA, espaces, `tbreak`, retour).
    #[test]
    fn text_whitespace_cdata_tbreak_and_baseline() {
        let body = "<svg:textarea x=\"10\" y=\"20\" width=\"300\" height=\"80\" font-size=\"30\" fill=\"rgb(128,0,128)\" font-weight=\"bold\"><![CDATA[Magic  Square]]>   <svg:tbreak/>\n    suite </svg:textarea><svg:text x=\"5\" y=\"100\" font-size=\"20\">Ligne</svg:text>";
        let got = items(&iwb(body, ""));
        assert_eq!(
            got[0],
            Item::Text {
                m: S2,
                x: 10.0,
                y: 20.0,
                w: 300.0,
                h: 80.0,
                size: 30.0,
                color: [128, 0, 128],
                spans: vec![Span {
                    text: "Magic Square\nsuite".into(),
                    bold: true,
                    ..Span::default()
                }]
            }
        );
        match &got[1] {
            Item::Text { y, w, h, spans, .. } => {
                assert!((y - (100.0 - 20.0 * ASCENT)).abs() < 1e-4, "{y}");
                assert!(
                    (w - 60.0).abs() < 1e-3 && (h - 24.0).abs() < 1e-3,
                    "{w} {h}"
                );
                assert_eq!(
                    spans,
                    &vec![Span {
                        text: "Ligne".into(),
                        ..Span::default()
                    }]
                );
            }
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn tspan_spans_keep_only_their_own_attributes() {
        let body = r##"<svg:textarea x="0" y="0" font-size="24" fill="black" xml:space="preserve"><svg:tspan font-weight="bold">Bonjour </svg:tspan><svg:tspan font-size="32" fill="#ff0000" font-family="'Liberation Sans', sans-serif">monde</svg:tspan></svg:textarea>"##;
        match &items(&iwb(body, ""))[0] {
            Item::Text {
                size, color, spans, ..
            } => {
                assert_eq!((*size, *color), (24.0, [0, 0, 0]));
                assert_eq!(
                    spans,
                    &vec![
                        Span {
                            text: "Bonjour ".into(),
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
        assert!(matches!(
            &it[1],
            Item::Shape {
                kind: ShapeKind::Rect,
                ..
            }
        ));
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
        assert_eq!(
            warnings,
            vec!["page 1 : 1 objet de fond gardé comme objet".to_string()]
        );
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
        assert_eq!(
            l.warnings,
            vec![
                "1 déclaration DOCTYPE ignorée".to_string(),
                "1 entité inconnue ignorée".to_string()
            ]
        );
        match &parse(&l).expect("liste")[0].items[0] {
            Item::Text { spans, .. } => assert_eq!(spans[0].text, "avant après é&"),
            other => panic!("{other:?}"),
        }
        assert!(!l.texts.iter().any(|t| t.contains("root")));
    }

    #[test]
    fn unreadable_attribute_skips_its_object_only() {
        let (pages, warnings) = read(
            &iwb(
                r#"<svg:rect fill="&e;" width="1" height="1"/><svg:rect width="2" height="2"/>"#,
                "",
            ),
            Dialect::Iwb,
            1,
        );
        assert_eq!(pages[0].items.len(), 1);
        assert_eq!(
            warnings,
            vec!["page 1 : 1 objet illisible ignoré".to_string()]
        );
    }

    /// Forme de `rectangle2.iwb` : `<svg:page>` fermé par `</svg:pageset>`.
    #[test]
    fn malformed_xml_is_refused() {
        let xml = r#"<iwb xmlns:svg="http://www.w3.org/2000/svg"><svg:svg viewbox="0 0 10 10"><svg:pageset><svg:page><svg:rect/></svg:pageset></svg:svg></iwb>"#;
        let e = read_svg(xml.as_bytes(), Dialect::Iwb, 1)
            .expect_err("refus")
            .to_string();
        assert!(e.starts_with("fichier endommagé : XML mal formé"), "{e}");
    }

    #[test]
    fn first_500_pages_are_read_and_said() {
        let xml = format!(
            r#"<iwb xmlns:svg="http://www.w3.org/2000/svg"><svg:svg viewbox="0 0 10 10"><svg:pageset>{}</svg:pageset></svg:svg></iwb>"#,
            "<svg:page/>".repeat(501)
        );
        let (pages, warnings) = read(&xml, Dialect::Iwb, 1);
        assert_eq!(pages.len(), 500);
        assert_eq!(warnings[0], "500 premières pages importées sur 501");
    }

    #[test]
    fn more_than_100000_objects_is_refused() {
        let xml = iwb(&r#"<svg:rect width="1" height="1"/>"#.repeat(100_001), "");
        assert!(matches!(
            read_svg(xml.as_bytes(), Dialect::Iwb, 1),
            Err(BoardError::TooBig)
        ));
    }

    /// HU1-1 : trait à pression d'OpenBoard, outil, numéro de page reçu.
    #[test]
    fn ubz_pressure_stroke_and_tools_on_page_3() {
        let xml = r##"<svg xmlns="http://www.w3.org/2000/svg" xmlns:ub="http://uniboard.mnemis.com/document" viewBox="0 0 1920 1080"><g fill="#ffffff"><polygon points="100,100 200,100 200,110 100,110"/><polygon points="200,98 300,98 300,112 200,112"/></g><ub:ruler x="10" y="10" width="100" height="20"/></svg>"##;
        let (pages, warnings) = read(xml, Dialect::Ubz, 3);
        let k = 10.0f32 / 14.0;
        assert_eq!(
            pages[0].items,
            vec![Item::Stroke {
                m: IDENTITY,
                color: [255, 255, 255],
                width: 14.0,
                points: vec![[100.0, 105.0, k], [200.0, 105.0, k], [300.0, 105.0, 1.0]]
            }]
        );
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
        assert!(
            matches!(&items(&iwb(r#"<svg:rect x="1" x="5" width="2" height="2"/>"#, ""))[0], Item::Shape { x0, .. } if *x0 == 1.0)
        );
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
        let (_, warnings) = read(
            &iwb(
                r#"<svg:textarea x="0" y="0" text-align="center">a</svg:textarea>"#,
                "",
            ),
            Dialect::Iwb,
            1,
        );
        assert_eq!(
            warnings,
            vec!["page 1 : 1 alignement de texte non lu".to_string()]
        );
    }

    fn one_unreadable(body: &str) {
        let (pages, warnings) = read(&iwb(body, ""), Dialect::Iwb, 1);
        assert!(pages[0].items.is_empty(), "{body}");
        assert_eq!(
            warnings,
            vec!["page 1 : 1 objet illisible ignoré".to_string()]
        );
    }

    #[test]
    fn non_finite_results_make_the_object_unreadable() {
        one_unreadable(
            r#"<svg:g transform="scale(1e20)"><svg:g transform="scale(1e20)"><svg:rect width="1" height="1"/></svg:g></svg:g>"#,
        );
        one_unreadable(r#"<svg:rect x="3e38" width="3e38" height="10"/>"#);
        one_unreadable(
            r#"<svg:line x1="0" y1="0" x2="1" y2="1" stroke-width="1" transform="scale(1e30) scale(1e30)"/>"#,
        );
        // les voisins lisibles restent lus
        let (pages, _) = read(
            &iwb(
                r#"<svg:rect x="3e38" width="3e38" height="10"/><svg:rect width="2" height="2"/>"#,
                "",
            ),
            Dialect::Iwb,
            1,
        );
        assert_eq!(pages[0].items.len(), 1);
    }

    #[test]
    fn view_box_whose_scale_overflows_is_refused() {
        let xml = r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1e-38 1"><rect width="1" height="1"/></svg>"#;
        assert!(matches!(
            read_svg(xml.as_bytes(), Dialect::Iwb, 1),
            Err(BoardError::Broken(_))
        ));
    }

    #[test]
    fn background_flag_warns_for_every_kind() {
        let body = r#"<svg:text id="t" x="0" y="20">abc</svg:text>"#;
        let extra = r#"<iwb:element ref="t" background="true"/>"#;
        let (pages, warnings) = read(&iwb(body, extra), Dialect::Iwb, 1);
        assert_eq!(pages[0].items.len(), 1);
        assert_eq!(
            warnings,
            vec!["page 1 : 1 objet de fond gardé comme objet".to_string()]
        );
    }

    #[test]
    fn background_flag_on_a_group_warns() {
        let body = r#"<svg:g id="g"><svg:rect width="2" height="2"/><svg:rect width="3" height="3"/></svg:g>"#;
        let extra = r#"<iwb:element ref="g" background="true"/>"#;
        let (pages, warnings) = read(&iwb(body, extra), Dialect::Iwb, 1);
        assert_eq!(pages[0].items.len(), 1);
        assert_eq!(
            warnings,
            vec!["page 1 : 1 objet de fond gardé comme objet".to_string()]
        );
    }

    #[test]
    fn too_deep_nesting_is_refused() {
        let xml = format!("<svg>{}{}</svg>", "<g>".repeat(300), "</g>".repeat(300));
        let e = read_svg(xml.as_bytes(), Dialect::Iwb, 1).expect_err("refus");
        assert!(e.to_string().contains("imbrication trop profonde"), "{e}");
    }

    #[test]
    fn too_many_points_or_spans_skip_the_object_only() {
        let pts = "0 0 ".repeat(crate::board::MAX_POINTS as usize + 1);
        let body = format!(r#"<svg:polyline points="{pts}"/><svg:rect width="2" height="2"/>"#);
        let (pages, warnings) = read(&iwb(&body, ""), Dialect::Iwb, 1);
        assert_eq!(pages[0].items.len(), 1);
        assert_eq!(
            warnings,
            vec!["page 1 : 1 objet illisible ignoré".to_string()]
        );
        let spans = r#"<svg:tspan font-weight="bold">a</svg:tspan><svg:tspan>b</svg:tspan>"#
            .repeat(crate::board::MAX_SPANS as usize / 2 + 1);
        let body = format!(r#"<svg:text x="0" y="10">{spans}</svg:text>"#);
        one_unreadable(&body);
    }

    #[test]
    fn href_dot_slash_prefixes_are_all_removed() {
        assert_eq!(normalize_href("./././a\\b.png"), "a/b.png");
    }
}
