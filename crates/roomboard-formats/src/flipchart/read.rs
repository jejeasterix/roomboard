//! Lecture d'un `.flipchart` déjà extrait (C13 lot 3, N12, DA5) : document, pages, objets du niveau B, vers
//! `Vec<Page>` puis `board::encode` (aucune commande du cœur ici). Porté d'ActCraft (même auteur, U39, 0246),
//! `flipchart.cpp` : document et ressources (:300-440), page et fond (:546-700, :757), objets par sorte
//! (:850-1040), ordre de dessin couche → profondeur → arbre (§ 7.3), transformation locale (§ 7.4).
//!
//! Bornes (N13) : 100 000 objets comptés sur les index avant toute lecture d'objet, 500 pages, côté de page dans
//! `]0, 100 000]`, enfants de l'index au plus à 32 niveaux, groupes résolus avec un ensemble des visités (un
//! cycle est coupé et averti). Un `.io` illisible est averti par objet ou par page (U2), jamais fatal.

use std::borrow::Cow;
use std::collections::{BTreeMap, HashMap};

use super::ids;
use super::index::{parse_index, IndexNode};
use super::stream::{parse_object_stream_with_stats, StreamObject, Value, MAX_NESTING};
use crate::board::{
    compose, encode, BoardError, BoardList, Item, Mat, Page, Rgb, ShapeKind, Span, IDENTITY,
    MAX_OBJECTS, MAX_PAGES, PAGE_WIDTH,
};

/// Numéros de propriétés, recopiés à la main de `flipchartids.h` d'ActCraft, sous des noms à nous.
mod key {
    pub(super) const DOC_RESOURCES: u16 = 7;
    pub(super) const DOC_START_SIZE: u16 = 18;
    pub(super) const PAGE_SIZE: u16 = 6;
    pub(super) const PAGE_CURTAIN: u16 = 13;
    pub(super) const PAGE_SPOT: u16 = 18;
    pub(super) const PAGE_ORIGIN: u16 = 29;
    pub(super) const FILL_SOURCE: u16 = 2;
    pub(super) const FILL_STYLE: u16 = 3;
    pub(super) const FILL_PICTURE: u16 = 4;
    pub(super) const PLACEMENT: u16 = 2;
    pub(super) const BOX: u16 = 7;
    pub(super) const LAYER: u16 = 8;
    pub(super) const DEPTH: u16 = 9;
    pub(super) const PEN: u16 = 10;
    pub(super) const PIVOT: u16 = 12;
    pub(super) const OFFSET: u16 = 2;
    pub(super) const TURN: u16 = 3;
    pub(super) const FACTORS: u16 = 4;
    pub(super) const MIRROR_X: u16 = 5;
    pub(super) const MIRROR_Y: u16 = 6;
    pub(super) const PIVOT_POINT: u16 = 2;
    pub(super) const PEN_WIDTH: u16 = 3;
    pub(super) const PEN_COLOR: u16 = 7;
    pub(super) const PEN_FILL: u16 = 8;
    pub(super) const PEN_TINT: u16 = 9;
    pub(super) const STROKE_POINTS: u16 = 39;
    /// Ressource d'une ligne, d'une forme, d'une image, d'un texte.
    pub(super) const REF: u16 = 38;
    pub(super) const SHAPE_UNCLOSED: u16 = 42;
    pub(super) const SHAPE_INLINE: u16 = 49;
    pub(super) const RES_SOURCE_NAME: u16 = 3;
    /// Points, polygones ou lignes de texte d'une ressource.
    pub(super) const RES_DATA: u16 = 4;
    pub(super) const RUN_BASELINE: u16 = 3;
    pub(super) const RUN_COLOR: u16 = 5;
    pub(super) const RUN_TEXT: u16 = 6;
    pub(super) const RUN_FONT: u16 = 7;
    pub(super) const RUN_SIZE: u16 = 8;
    pub(super) const RUN_WEIGHT: u16 = 9;
    pub(super) const RUN_ITALIC: u16 = 10;
    pub(super) const RUN_UNDERLINE: u16 = 11;
}

/// Côté de page au plus (ActCraft `kMaxPageSide`) et taille par défaut.
const MAX_PAGE_SIDE: f64 = 100_000.0;
const DEFAULT_PAGE: (f64, f64) = (1024.0, 768.0);
/// Bornes de `board::parse` (points d'un trait, segments d'un texte), tenues ici pour que la page relise le flux.
const MAX_POINTS: usize = 1_000_000;
const MAX_SPANS: usize = 10_000;
const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

/// Sortes d'avertissements comptés par page.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
enum Sort {
    Tiff,
    ImageFormat,
    Action,
    Grid,
    Tag,
    Connector,
    Media,
    MathMl,
    VerticalText,
    Curtain,
    Spotlight,
    Origin,
    GroupCycle,
    TooDeep,
    UnknownKind,
    Unreadable,
    PageUnreadable,
}

fn label(sort: Sort, n: u32) -> &'static str {
    let (one, many) = match sort {
        Sort::Tiff => ("image TIFF non lue", "images TIFF non lues"),
        Sort::ImageFormat => (
            "image d'un format non lu (EMF, WMF…)",
            "images d'un format non lu (EMF, WMF…)",
        ),
        Sort::Action => ("action non lue", "actions non lues"),
        Sort::Grid => ("grille non lue", "grilles non lues"),
        Sort::Tag => ("étiquette non lue", "étiquettes non lues"),
        Sort::Connector => ("connecteur non lu", "connecteurs non lus"),
        Sort::Media => ("son ou vidéo non lu", "sons ou vidéos non lus"),
        Sort::MathMl => ("formule MathML non lue", "formules MathML non lues"),
        Sort::VerticalText => ("texte vertical non lu", "textes verticaux non lus"),
        Sort::Curtain => ("rideau non lu", "rideaux non lus"),
        Sort::Spotlight => ("projecteur non lu", "projecteurs non lus"),
        Sort::Origin => ("repère XY non lu", "repères XY non lus"),
        Sort::GroupCycle => ("groupe en cycle ignoré", "groupes en cycle ignorés"),
        Sort::TooDeep => (
            "objet trop imbriqué ignoré",
            "objets trop imbriqués ignorés",
        ),
        Sort::UnknownKind => ("objet d'un type non lu", "objets d'un type non lu"),
        Sort::Unreadable => ("objet illisible ignoré", "objets illisibles ignorés"),
        Sort::PageUnreadable => (
            "page illisible laissée vide",
            "pages illisibles laissées vides",
        ),
    };
    if n == 1 {
        one
    } else {
        many
    }
}

fn broken(m: impl Into<String>) -> BoardError {
    BoardError::Broken(m.into())
}

/// Lit les entrées `.in`, `.io`, `.ir` et `version` d'un `.flipchart`, et les images par leur seul nom (octets ignorés,
/// DA4) ; chemins de page `<page>.fpg/<nom>`. Les
/// avertissements de page sont numérotés à partir de `first_page`.
pub fn read(entries: &[(&str, &[u8])], first_page: u32) -> Result<BoardList, BoardError> {
    let files: HashMap<&str, &[u8]> = entries.iter().copied().collect();
    // Index de la racine : le premier `.in` dont la racine est le paperboard, sinon le premier lisible.
    let mut tree = None;
    let mut error = String::from("index du paperboard absent");
    for (name, data) in entries
        .iter()
        .filter(|(n, _)| !n.contains('/') && n.ends_with(".in"))
    {
        match parse_index(data) {
            Ok(t) if t.kind == u32::from(ids::DOCUMENT) => {
                tree = Some(t);
                break;
            }
            Ok(t) => {
                tree.get_or_insert(t);
            }
            Err(e) if tree.is_none() => {
                error = format!("index du paperboard {name} illisible : {e}")
            }
            Err(_) => {}
        }
    }
    let tree = tree.ok_or_else(|| broken(error))?;
    let doc_data = files
        .get(tree.storage_name().as_str())
        .copied()
        .ok_or_else(|| broken(format!("objet paperboard {} absent", tree.storage_name())))?;
    let mut reader = Reader {
        files,
        register: HashMap::new(),
        resources: HashMap::new(),
        notes: BTreeMap::new(),
        page: 0,
    };
    let mut head = Vec::new();
    let mut side_out_of_bounds = false;
    let mut start = DEFAULT_PAGE;
    match parse_object_stream_with_stats(doc_data) {
        Ok((doc, _)) => {
            reader.register_resources(&doc);
            match doc.find(key::DOC_START_SIZE).and_then(Value::as_size) {
                Some(s) if usable(s) => start = s,
                Some(_) => side_out_of_bounds = true,
                None => {}
            }
        }
        Err(e) => head.push(format!(
            "objet paperboard illisible ({e}) : ressources et taille de page ignorées"
        )),
    }

    let page_nodes: Vec<&IndexNode> = tree
        .children
        .iter()
        .filter(|n| n.kind == u32::from(ids::PAGE))
        .collect();
    if page_nodes.is_empty() {
        return Err(broken("aucune page dans l'index du paperboard"));
    }
    if page_nodes.len() > MAX_PAGES {
        head.insert(
            0,
            format!(
                "{MAX_PAGES} premières pages importées sur {}",
                page_nodes.len()
            ),
        );
    }
    let trees: Vec<Option<Cow<IndexNode>>> = page_nodes
        .iter()
        .take(MAX_PAGES)
        .map(|n| reader.page_tree(n))
        .collect();
    let objects: u64 = trees
        .iter()
        .flatten()
        .map(|t| u64::from(descendants(t)))
        .sum();
    if objects > MAX_OBJECTS as u64 {
        return Err(BoardError::TooBig);
    }

    let mut pages = Vec::with_capacity(trees.len());
    for (k, (node, tree)) in page_nodes.iter().zip(&trees).enumerate() {
        reader.page = first_page.saturating_add(u32::try_from(k).unwrap_or(u32::MAX));
        let page = tree
            .as_deref()
            .and_then(|t| reader.page(node.node_id, t, start, &mut side_out_of_bounds));
        pages.push(page.unwrap_or_else(|| {
            reader.note(Sort::PageUnreadable);
            Page::default()
        }));
    }
    if side_out_of_bounds {
        head.push(format!(
            "côté de page hors bornes : {} × {}",
            DEFAULT_PAGE.0, DEFAULT_PAGE.1
        ));
    }
    let mut list = encode(&pages);
    head.extend(
        reader
            .notes
            .iter()
            .map(|(&(page, sort), &n)| format!("page {page} : {n} {}", label(sort, n))),
    );
    list.warnings = head;
    Ok(list)
}

/// Côtés finis, dans `]0, 100 000]`, et échelle `1920 / largeur` finie en `f32` (un côté minuscule déborderait).
fn usable((w, h): (f64, f64)) -> bool {
    [w, h]
        .iter()
        .all(|v| v.is_finite() && *v > 0.0 && *v <= MAX_PAGE_SIDE)
        && (PAGE_WIDTH / w as f32).is_finite()
}

/// Nœuds sous `n` (lui exclu), sans récursion.
fn descendants(n: &IndexNode) -> u32 {
    let mut stack: Vec<&IndexNode> = n.children.iter().collect();
    let mut k = 0u32;
    while let Some(c) = stack.pop() {
        k = k.saturating_add(1);
        stack.extend(c.children.iter());
    }
    k
}

/// Objet de l'index lu, avant le tri et la résolution des groupes.
struct Pending {
    node: u32,
    layer: i64,
    depth: f64,
    what: What,
    children: Vec<Pending>,
}

enum What {
    Item(Item),
    /// Groupe : numéros des nœuds membres (références de l'index).
    Group(Vec<u32>),
    /// Fond de la page : couleur, image.
    Background(Option<Rgb>, Option<Item>),
    Nothing,
}

/// Ce qu'une page prête à ses objets : préfixe du conteneur, index, échelle de base, côtés.
struct Sheet<'t> {
    prefix: String,
    tree: &'t IndexNode,
    base: Mat,
    side: (f32, f32),
}

struct Reader<'a> {
    files: HashMap<&'a str, &'a [u8]>,
    /// Table des ressources du document : numéro → (entrée `.ir`, fichier de données).
    register: HashMap<u32, (String, String)>,
    /// Objets `.ir` déjà lus (ou illisibles), par numéro.
    resources: HashMap<u32, Option<StreamObject>>,
    notes: BTreeMap<(u32, Sort), u32>,
    /// Numéro de la page en cours.
    page: u32,
}

impl<'a> Reader<'a> {
    fn note(&mut self, sort: Sort) {
        self.note_n(sort, 1);
    }
    fn note_n(&mut self, sort: Sort, n: u32) {
        if n > 0 {
            let c = self.notes.entry((self.page, sort)).or_insert(0);
            *c = c.saturating_add(n);
        }
    }

    /// Flux d'objets ; les objets trop profonds sont comptés, une propriété illisible reste locale.
    fn stream(&mut self, data: &[u8]) -> Option<StreamObject> {
        let (o, stats) = parse_object_stream_with_stats(data).ok()?;
        self.note_n(Sort::TooDeep, stats.skipped_deep);
        Some(o)
    }

    /// Lignes `[numéro, entrée, fichier, empreinte, références]` de toutes les propriétés de la table.
    fn register_resources(&mut self, doc: &StreamObject) {
        let Some(table) = doc.find(key::DOC_RESOURCES).and_then(first_object) else {
            return;
        };
        for (_, field) in &table.fields {
            let Value::List(rows) = field else { continue };
            for row in rows {
                if let Value::List(cells) = row {
                    if let [Value::Int(id), Value::Str(entry), Value::Str(file), ..] =
                        cells.as_slice()
                    {
                        if let Ok(id) = u32::try_from(*id) {
                            self.register.insert(id, (entry.clone(), file.clone()));
                        }
                    }
                }
            }
        }
    }

    /// Objet `.ir` de la ressource `rid` : entrée de la table, sinon `<rid>.ir`.
    fn resource(&mut self, rid: u32) -> Option<&StreamObject> {
        if !self.resources.contains_key(&rid) {
            let entry = self
                .register
                .get(&rid)
                .map(|r| r.0.clone())
                .filter(|e| !e.is_empty())
                .unwrap_or_else(|| format!("{rid}.ir"));
            let data = self.files.get(entry.as_str()).copied();
            let object = data.and_then(|d| self.stream(d));
            self.resources.insert(rid, object);
        }
        self.resources.get(&rid).and_then(Option::as_ref)
    }

    /// Fichier de données de la ressource `rid`, à la racine : fichier de la table, nom d'origine, puis `<rid>.png`…
    /// (ActCraft `resourceFile`). Seul le nom compte : la page garde les octets des images (DA4) et n'en transmet que
    /// le nom. `Ok` : l'entrée transmise ; `Err` : les noms déclarés (table, nom d'origine), aucun transmis.
    fn data_file(&mut self, rid: u32) -> Result<&'a str, Vec<String>> {
        let mut declared: Vec<String> = Vec::new();
        if let Some((_, file)) = self.register.get(&rid) {
            declared.push(file.clone());
        }
        if let Some(n) = self
            .resource(rid)
            .and_then(|r| r.find(key::RES_SOURCE_NAME))
            .and_then(Value::as_str)
        {
            declared.push(n.to_string());
        }
        declared.retain(|n| !n.is_empty() && !n.contains('/'));
        let guessed = ["png", "jpg", "ird", "gif", "bmp", "tif"].map(|ext| format!("{rid}.{ext}"));
        declared
            .iter()
            .chain(guessed.iter())
            .find_map(|n| self.files.get_key_value(n.as_str()).map(|(k, _)| *k))
            .ok_or(declared)
    }

    /// Index de la page : `<page>.fpg/<page>.in`, sinon le nœud de l'index du document ; illisible : `None`.
    fn page_tree<'n>(&self, node: &'n IndexNode) -> Option<Cow<'n, IndexNode>> {
        let name = format!("{0}.fpg/{0}.in", node.node_id);
        match self.files.get(name.as_str()) {
            Some(d) => parse_index(d).ok().map(Cow::Owned),
            None => Some(Cow::Borrowed(node)),
        }
    }

    /// Page `id` d'index `tree` ; son objet illisible : `None`.
    fn page(
        &mut self,
        id: u32,
        tree: &IndexNode,
        start: (f64, f64),
        side_out_of_bounds: &mut bool,
    ) -> Option<Page> {
        let prefix = format!("{id}.fpg/");
        let data = self
            .files
            .get(format!("{prefix}{}", tree.storage_name()).as_str())
            .copied()?;
        let object = self.stream(data)?;
        let (w, h) = match object.find(key::PAGE_SIZE).and_then(Value::as_size) {
            Some(s) if usable(s) => s,
            Some(_) => {
                *side_out_of_bounds = true;
                DEFAULT_PAGE
            }
            None => start,
        };
        if object
            .find(key::PAGE_CURTAIN)
            .and_then(Value::as_number)
            .is_some()
        {
            self.note(Sort::Curtain);
        }
        if object
            .find(key::PAGE_SPOT)
            .and_then(Value::as_rect)
            .is_some()
        {
            self.note(Sort::Spotlight);
        }
        if object
            .find(key::PAGE_ORIGIN)
            .and_then(Value::as_point)
            .is_some()
        {
            self.note(Sort::Origin);
        }
        let s = PAGE_WIDTH / w as f32;
        let sheet = Sheet {
            prefix,
            tree,
            base: [s, 0.0, 0.0, s, 0.0, 0.0],
            side: (w as f32, h as f32),
        };
        let mut page = Page::default();
        let mut backdrop = None;
        let mut list = self.children(&sheet, tree, &sheet.base, 1);
        for p in &mut list {
            if matches!(p.what, What::Background(..)) {
                if let What::Background(color, image) =
                    std::mem::replace(&mut p.what, What::Nothing)
                {
                    page.background = color;
                    backdrop = image;
                }
            }
        }
        let mut flat = Vec::new();
        flatten(list, &mut flat);
        let mut cycles = 0;
        let mut deep = 0;
        page.items = grouped(flat, &mut cycles, &mut deep);
        if let Some(image) = backdrop {
            page.items.insert(0, image);
        }
        self.note_n(Sort::GroupCycle, cycles);
        self.note_n(Sort::TooDeep, deep);
        Some(page)
    }

    /// Enfants de `parent` à l'imbrication `nesting` (1 : ceux de la page), triés par couche puis profondeur ;
    /// le tri est stable, l'ordre de l'arbre départage (§ 7.3).
    fn children(
        &mut self,
        sheet: &Sheet,
        parent: &IndexNode,
        m: &Mat,
        nesting: usize,
    ) -> Vec<Pending> {
        let mut out: Vec<Pending> = parent
            .children
            .iter()
            .filter_map(|c| self.node(sheet, c, m, nesting))
            .collect();
        out.sort_by(|a, b| a.layer.cmp(&b.layer).then(a.depth.total_cmp(&b.depth)));
        out
    }

    fn node(
        &mut self,
        sheet: &Sheet,
        n: &IndexNode,
        parent: &Mat,
        nesting: usize,
    ) -> Option<Pending> {
        let kind = u16::try_from(n.kind).unwrap_or(u16::MAX);
        let warned = match kind {
            k if ids::is_action(k) => Some(Sort::Action),
            k if ids::is_grid(k) => Some(Sort::Grid),
            ids::TAG => Some(Sort::Tag),
            _ => None,
        };
        if let Some(sort) = warned {
            self.note(sort);
            return None;
        }
        let data = self
            .files
            .get(format!("{}{}", sheet.prefix, n.storage_name()).as_str())
            .copied();
        let Some(o) = data.and_then(|d| self.stream(d)) else {
            self.note(Sort::Unreadable);
            return None;
        };
        let bounds = o
            .find(key::BOX)
            .and_then(Value::as_rect)
            .map(|(x, y, w, h)| [fin(x), fin(y), fin(w), fin(h)])
            .unwrap_or([0.0; 4]);
        let local = placement(&o, &bounds);
        let m = compose(parent, &local);
        let m = if m.iter().all(|v| v.is_finite()) {
            m
        } else {
            *parent
        };
        let what = match kind {
            ids::STROKE => self.stroke(&o, m, key::STROKE_POINTS),
            ids::LINE => self.stroke(&o, m, key::REF),
            ids::SHAPE => self.shape(&o, m),
            ids::IMAGE => self.image(&o, m, &bounds),
            ids::TEXT => self.text(&o, m, &bounds),
            ids::GROUP => What::Group(n.refs.clone()),
            ids::BACKGROUND if nesting == 1 => self.background(sheet, &o),
            other => {
                self.note(match other {
                    ids::CONNECTOR => Sort::Connector,
                    ids::MEDIA => Sort::Media,
                    ids::MATHML => Sort::MathMl,
                    ids::VERTICAL_TEXT => Sort::VerticalText,
                    _ => Sort::UnknownKind,
                });
                What::Nothing
            }
        };
        let children = if n.children.is_empty() {
            Vec::new()
        } else if nesting >= MAX_NESTING {
            self.note_n(Sort::TooDeep, descendants(n));
            Vec::new()
        } else {
            self.children(sheet, n, &m, nesting + 1)
        };
        let layer = number(&o, key::LAYER).map_or(1, |v| v as i64);
        Some(Pending {
            node: n.node_id,
            layer,
            depth: number(&o, key::DEPTH).unwrap_or(0.0),
            what,
            children,
        })
    }

    fn unreadable(&mut self) -> What {
        self.note(Sort::Unreadable);
        What::Nothing
    }

    /// Points de la ressource désignée par la propriété `points` de `o` (trait, ligne : trait ouvert).
    fn stroke(&mut self, o: &StreamObject, m: Mat, points: u16) -> What {
        let pen = pen_of(o);
        let (color, width) = (rgb(pen, key::PEN_COLOR, BLACK), pen_width(pen));
        let pts = resource_id(o, points)
            .and_then(|r| self.resource(r))
            .and_then(|res| res.find(key::RES_DATA))
            .and_then(|v| v.as_polylines().first().map(|p| points_of(p)))
            .unwrap_or_default();
        if pts.is_empty() {
            return self.unreadable();
        }
        What::Item(Item::Stroke {
            m,
            color,
            width,
            points: pts,
        })
    }

    /// Forme : un seul contour fermé de quatre sommets d'axes → rectangle (règle de N7), sinon traits.
    fn shape(&mut self, o: &StreamObject, m: Mat) -> What {
        let pen = pen_of(o);
        let (color, width) = (rgb(pen, key::PEN_COLOR, BLACK), pen_width(pen));
        let fill = (pen.and_then(|p| number(p, key::PEN_FILL)).unwrap_or(0.0) != 0.0)
            .then(|| rgb(pen, key::PEN_TINT, WHITE));
        let mut polys: Vec<Vec<[f32; 2]>> = resource_id(o, key::REF)
            .and_then(|r| self.resource(r))
            .and_then(|res| res.find(key::RES_DATA))
            .map(|v| v.as_polylines().into_iter().map(<[_]>::to_vec).collect())
            .unwrap_or_default();
        polys.retain(|p| !p.is_empty());
        if polys.is_empty() {
            polys = o
                .find(key::SHAPE_INLINE)
                .map(|v| v.as_polylines().into_iter().map(<[_]>::to_vec).collect())
                .unwrap_or_default();
            polys.retain(|p| !p.is_empty());
        }
        let open = flag(o, key::SHAPE_UNCLOSED);
        if let ([only], false) = (polys.as_slice(), open) {
            if let Some((x0, y0, x1, y1)) = rect_of(only) {
                return What::Item(Item::Shape {
                    kind: ShapeKind::Rect,
                    m,
                    x0,
                    y0,
                    x1,
                    y1,
                    color,
                    width,
                    fill,
                });
            }
        }
        let mut strokes: Vec<Item> = polys
            .iter()
            .map(|p| points_of(p))
            .filter(|p| !p.is_empty())
            .map(|mut points| {
                if !open && points.len() > 1 && points.first() != points.last() {
                    points.push(points[0]);
                }
                Item::Stroke {
                    m,
                    color,
                    width,
                    points,
                }
            })
            .collect();
        match strokes.len() {
            0 => self.unreadable(),
            1 => What::Item(strokes.remove(0)),
            _ => What::Item(Item::Group(strokes)),
        }
    }

    /// Image de la ressource `rid`, si son format s'affiche (N14 : TIFF, EMF, WMF avertis).
    /// Une image jamais transmise (TIFF, EMF, WMF : jamais décompressées, N15) est avertie sur l'extension de son nom
    /// déclaré ; une autre, absente, est illisible.
    fn picture(&mut self, rid: Option<u32>, m: Mat, b: &[f32; 4]) -> Option<Item> {
        let name = match rid.map(|r| self.data_file(r)) {
            Some(Ok(name)) => name,
            Some(Err(declared)) => {
                let sort = declared
                    .iter()
                    .find_map(|n| match picture_kind(n) {
                        Picture::Tiff => Some(Sort::Tiff),
                        Picture::Other if is_unshown_image(n) => Some(Sort::ImageFormat),
                        _ => None,
                    })
                    .unwrap_or(Sort::Unreadable);
                self.note(sort);
                return None;
            }
            None => {
                self.note(Sort::Unreadable);
                return None;
            }
        };
        match picture_kind(name) {
            Picture::Shown => Some(Item::Image {
                m,
                x: b[0],
                y: b[1],
                w: b[2],
                h: b[3],
                href: name.to_string(),
            }),
            Picture::Tiff => {
                self.note(Sort::Tiff);
                None
            }
            Picture::Other => {
                self.note(Sort::ImageFormat);
                None
            }
        }
    }

    fn image(&mut self, o: &StreamObject, m: Mat, b: &[f32; 4]) -> What {
        self.picture(resource_id(o, key::REF), m, b)
            .map_or(What::Nothing, What::Item)
    }

    /// Texte : un segment par ligne mise en page de la ressource (police, taille en points, graisse, italique,
    /// souligné, couleur) ; une ligne de base plus basse commence une ligne.
    fn text(&mut self, o: &StreamObject, m: Mat, b: &[f32; 4]) -> What {
        let mut spans: Vec<Span> = Vec::new();
        if let Some(res) = resource_id(o, key::REF).and_then(|r| self.resource(r)) {
            let mut baseline: Option<f64> = None;
            for run in res
                .find(key::RES_DATA)
                .map(Value::as_objects)
                .unwrap_or_default()
                .into_iter()
                .take(MAX_SPANS)
            {
                let mut span = span_of(run);
                let y = run
                    .find(key::RUN_BASELINE)
                    .and_then(Value::as_point)
                    .map(|p| p.1);
                if let (Some(prev), Some(y)) = (baseline, y) {
                    if y > prev && !spans.last().is_some_and(|s| s.text.ends_with('\n')) {
                        span.text.insert(0, '\n');
                    }
                }
                baseline = y.or(baseline);
                spans.push(span);
            }
        }
        let Some(first) = spans.first() else {
            return self.unreadable();
        };
        let (size, color) = (first.size.unwrap_or(16.0), first.color.unwrap_or(BLACK));
        What::Item(Item::Text {
            m,
            x: b[0],
            y: b[1],
            w: b[2],
            h: b[3],
            size,
            color,
            spans,
        })
    }

    /// Fond de page (ActCraft `applyPageFill`) : remplissage de l'encre embarquée, image désignée par pointeur.
    fn background(&mut self, sheet: &Sheet, fill: &StreamObject) -> What {
        let pen = fill.find(key::FILL_STYLE).and_then(first_object);
        let color = (pen.and_then(|p| number(p, key::PEN_FILL)).unwrap_or(0.0) != 0.0)
            .then(|| rgb(pen, key::PEN_TINT, WHITE));
        let source = number(fill, key::FILL_SOURCE).unwrap_or(0.0);
        let pointer = fill.find(key::FILL_PICTURE).and_then(Value::as_pointer);
        let image = match pointer {
            Some(node) if node != 0 && (source == 1.0 || source == 2.0) => {
                let storage = find_node(sheet.tree, node).map_or(node, |n| n.storage_id);
                let name = format!("{storage}.io");
                let data = self
                    .files
                    .get(format!("{}{name}", sheet.prefix).as_str())
                    .or_else(|| self.files.get(name.as_str()))
                    .copied();
                match data.and_then(|d| self.stream(d)) {
                    Some(picture) => {
                        let side = [0.0, 0.0, sheet.side.0, sheet.side.1];
                        self.picture(resource_id(&picture, key::REF), sheet.base, &side)
                    }
                    None => {
                        self.note(Sort::Unreadable);
                        None
                    }
                }
            }
            _ => None,
        };
        What::Background(color, image)
    }
}

/// Parent puis enfants, à plat (l'imbrication est déjà bornée à 32 niveaux).
fn flatten(list: Vec<Pending>, out: &mut Vec<(u32, What)>) {
    for p in list {
        if matches!(p.what, What::Item(_) | What::Group(_)) {
            out.push((p.node, p.what));
        }
        flatten(p.children, out);
    }
}

/// Groupes résolus : chaque objet rejoint le premier groupe qui le désigne ; un cycle de groupes est coupé au
/// premier de ses groupes dans l'ordre de dessin, et compté. Un groupe prend la place du sien dans l'ordre de
/// dessin ; au-delà de 32 niveaux, ses membres sont mis à plat (comptés trop imbriqués).
fn grouped(flat: Vec<(u32, What)>, cycles: &mut u32, deep: &mut u32) -> Vec<Item> {
    let n = flat.len();
    let mut pos: HashMap<u32, usize> = HashMap::with_capacity(n);
    for (i, (node, _)) in flat.iter().enumerate() {
        pos.entry(*node).or_insert(i);
    }
    let mut parent: Vec<Option<usize>> = vec![None; n];
    for (i, (_, what)) in flat.iter().enumerate() {
        let What::Group(refs) = what else { continue };
        for r in refs {
            match pos.get(r) {
                Some(&j) if j == i => *cycles = cycles.saturating_add(1),
                Some(&j) if parent[j].is_none() => parent[j] = Some(i),
                _ => {}
            }
        }
    }
    // Chaque objet a au plus un parent : un parcours marqué par état trouve chaque cycle une fois.
    let mut state = vec![0u8; n];
    for begin in 0..n {
        let mut path = Vec::new();
        let mut u = begin;
        let cycle_at = loop {
            match state[u] {
                1 => break Some(u),
                2 => break None,
                _ => {}
            }
            state[u] = 1;
            path.push(u);
            match parent[u] {
                Some(p) => u = p,
                None => break None,
            }
        };
        if let Some(c) = cycle_at {
            let from = path.iter().position(|&x| x == c).unwrap_or(0);
            if let Some(&cut) = path[from..].iter().min() {
                parent[cut] = None;
                *cycles = cycles.saturating_add(1);
            }
        }
        for &x in &path {
            state[x] = 2;
        }
    }
    let mut kids: Vec<Vec<usize>> = vec![Vec::new(); n];
    let mut roots = Vec::new();
    for (i, p) in parent.iter().enumerate() {
        match p {
            Some(p) => kids[*p].push(i),
            None => roots.push(i),
        }
    }
    let mut slots: Vec<Option<What>> = flat.into_iter().map(|(_, w)| Some(w)).collect();
    roots
        .into_iter()
        .filter_map(|r| build(r, 1, &kids, &mut slots, deep))
        .collect()
}

fn build(
    i: usize,
    depth: usize,
    kids: &[Vec<usize>],
    slots: &mut [Option<What>],
    deep: &mut u32,
) -> Option<Item> {
    match slots.get_mut(i)?.take()? {
        What::Item(it) => Some(it),
        What::Group(_) => {
            let mut items = Vec::new();
            for &c in &kids[i] {
                if depth >= MAX_NESTING {
                    let mut stack = vec![c];
                    while let Some(j) = stack.pop() {
                        match slots.get_mut(j).and_then(Option::take) {
                            Some(What::Item(it)) => items.push(it),
                            Some(What::Group(_)) => {
                                *deep = deep.saturating_add(1);
                                stack.extend(kids[j].iter().rev());
                            }
                            _ => {}
                        }
                    }
                } else if let Some(it) = build(c, depth + 1, kids, slots, deep) {
                    items.push(it);
                }
            }
            (!items.is_empty()).then_some(Item::Group(items))
        }
        What::Background(..) | What::Nothing => None,
    }
}

/// Nœud `id` de l'index d'une page, sans récursion.
fn find_node(tree: &IndexNode, id: u32) -> Option<&IndexNode> {
    let mut stack = vec![tree];
    while let Some(n) = stack.pop() {
        if n.node_id == id {
            return Some(n);
        }
        stack.extend(n.children.iter());
    }
    None
}

/// Transformation locale (§ 7.4) : translate(décalage + pivot) ∘ rotation ∘ échelle ∘ translate(−pivot), le
/// miroir (dans le cadre local) appliqué d'abord ; non finie : identité.
fn placement(o: &StreamObject, b: &[f32; 4]) -> Mat {
    let Some(t) = o.find(key::PLACEMENT).and_then(first_object) else {
        return IDENTITY;
    };
    let point =
        |s: &StreamObject, k: u16, d: (f64, f64)| s.find(k).and_then(Value::as_point).unwrap_or(d);
    let (ox, oy) = point(t, key::OFFSET, (0.0, 0.0));
    let (sx, sy) = point(t, key::FACTORS, (1.0, 1.0));
    let (px, py) = o
        .find(key::PIVOT)
        .and_then(first_object)
        .map_or((0.0, 0.0), |p| point(p, key::PIVOT_POINT, (0.0, 0.0)));
    let (sin, cos) = number(t, key::TURN).unwrap_or(0.0).to_radians().sin_cos();
    let translate = |x: f64, y: f64| -> Mat { [1.0, 0.0, 0.0, 1.0, x as f32, y as f32] };
    let rotate: Mat = [cos as f32, sin as f32, -sin as f32, cos as f32, 0.0, 0.0];
    let scale: Mat = [sx as f32, 0.0, 0.0, sy as f32, 0.0, 0.0];
    let mut m = compose(
        &translate(ox + px, oy + py),
        &compose(&rotate, &compose(&scale, &translate(-px, -py))),
    );
    let (mx, my) = (flag(t, key::MIRROR_X), flag(t, key::MIRROR_Y));
    if mx || my {
        let flip: Mat = [
            if mx { -1.0 } else { 1.0 },
            0.0,
            0.0,
            if my { -1.0 } else { 1.0 },
            if mx { b[2] } else { 0.0 },
            if my { b[3] } else { 0.0 },
        ];
        m = compose(&m, &flip);
    }
    if m.iter().all(|v| v.is_finite()) {
        m
    } else {
        IDENTITY
    }
}

/// Règle de N7 (celle de `rect_of` de T3, absent de cette branche) : un contour fermé de quatre sommets distincts
/// (le premier éventuellement répété), côtés alignés sur les axes → `(x0, y0, x1, y1)`.
fn rect_of(poly: &[[f32; 2]]) -> Option<(f32, f32, f32, f32)> {
    let pts = match poly {
        [first, .., last] if poly.len() == 5 && first == last => &poly[..4],
        _ if poly.len() == 4 => poly,
        _ => return None,
    };
    let x0 = pts.iter().map(|p| p[0]).fold(f32::INFINITY, f32::min);
    let x1 = pts.iter().map(|p| p[0]).fold(f32::NEG_INFINITY, f32::max);
    let y0 = pts.iter().map(|p| p[1]).fold(f32::INFINITY, f32::min);
    let y1 = pts.iter().map(|p| p[1]).fold(f32::NEG_INFINITY, f32::max);
    let edges = (0..4).all(|i| {
        let (a, b) = (pts[i], pts[(i + 1) % 4]);
        (a[0] == b[0]) != (a[1] == b[1])
    });
    let corners = pts
        .iter()
        .all(|p| (p[0] == x0 || p[0] == x1) && (p[1] == y0 || p[1] == y1));
    let finite = [x0, y0, x1, y1].iter().all(|v| v.is_finite());
    (edges && corners && finite && x0 < x1 && y0 < y1).then_some((x0, y0, x1, y1))
}

enum Picture {
    Shown,
    Tiff,
    Other,
}

/// Format jugé sur l'extension du nom (la page garde les octets, DA4).
fn picture_kind(name: &str) -> Picture {
    match extension(name).as_deref() {
        Some("png" | "jpg" | "jpeg" | "gif" | "bmp") => Picture::Shown,
        Some("tif" | "tiff") => Picture::Tiff,
        _ => Picture::Other,
    }
}

/// Image d'un format que la page n'affiche pas (N14), reconnue sur la seule extension.
fn is_unshown_image(name: &str) -> bool {
    matches!(extension(name).as_deref(), Some("emf" | "wmf"))
}

fn extension(name: &str) -> Option<String> {
    name.rsplit_once('.').map(|(_, e)| e.to_ascii_lowercase())
}

fn span_of(run: &StreamObject) -> Span {
    let text = |k: u16| {
        run.find(k)
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string()
    };
    let points = number(run, key::RUN_SIZE)
        .filter(|v| *v > 0.0)
        .unwrap_or(12.0);
    let size = fin(points * 4.0 / 3.0);
    let font = text(key::RUN_FONT);
    Span {
        text: text(key::RUN_TEXT),
        bold: is_bold(number(run, key::RUN_WEIGHT).unwrap_or(50.0)),
        italic: flag(run, key::RUN_ITALIC),
        underline: flag(run, key::RUN_UNDERLINE),
        size: (size > 0.0).then_some(size),
        color: Some(rgb(Some(run), key::RUN_COLOR, BLACK)),
        font: (!font.is_empty()).then_some(font),
    }
}

/// Graisse Qt 4 (50 normal, 75 gras ; 0 vaut 50) ou Qt 6 (100 à 900) : grasse dès 600 en Qt 6 (ActCraft
/// `qt6Weight`, la valeur de table la plus proche ; 60 et moins restent à 500).
fn is_bold(w: f64) -> bool {
    if w >= 100.0 {
        w >= 600.0
    } else {
        w > 60.0
    }
}

fn number(o: &StreamObject, k: u16) -> Option<f64> {
    o.find(k)
        .and_then(Value::as_number)
        .filter(|v| v.is_finite())
}

fn flag(o: &StreamObject, k: u16) -> bool {
    o.find(k).and_then(Value::as_bool).unwrap_or(false)
}

fn rgb(o: Option<&StreamObject>, k: u16, fallback: Rgb) -> Rgb {
    o.and_then(|o| o.find(k))
        .and_then(Value::as_color)
        .map_or(fallback, |(r, g, b, _)| [r, g, b])
}

fn first_object(v: &Value) -> Option<&StreamObject> {
    v.as_objects().into_iter().next()
}

fn pen_of(o: &StreamObject) -> Option<&StreamObject> {
    o.find(key::PEN).and_then(first_object)
}

/// Épaisseur du contour : 1 par défaut, jamais négative.
fn pen_width(pen: Option<&StreamObject>) -> f32 {
    fin(pen.and_then(|p| number(p, key::PEN_WIDTH)).unwrap_or(1.0)).max(0.0)
}

/// Numéro de ressource d'une propriété (entier positif).
fn resource_id(o: &StreamObject, k: u16) -> Option<u32> {
    number(o, k)
        .filter(|v| *v >= 1.0 && *v <= f64::from(u32::MAX))
        .map(|v| v as u32)
}

/// Réel lu du fichier en `f32` fini (sinon 0).
fn fin(v: f64) -> f32 {
    let x = v as f32;
    if x.is_finite() {
        x
    } else {
        0.0
    }
}

/// Points d'un trait, finis, au plus [`MAX_POINTS`], troisième composante 1 (comme `board/read.rs`).
fn points_of(poly: &[[f32; 2]]) -> Vec<[f32; 3]> {
    poly.iter()
        .filter(|p| p[0].is_finite() && p[1].is_finite())
        .take(MAX_POINTS)
        .map(|&[x, y]| [x, y, 1.0])
        .collect()
}

#[cfg(test)]
mod tests {
    use super::super::ids;
    use super::super::writer::{index, Bytes, Node, Obj};
    use crate::board::{self, BoardError, BoardList, Item, Page, ShapeKind};
    use std::sync::mpsc;
    use std::time::Duration;

    // Numéros de propriétés de `flipchartids.h` d'ActCraft, recopiés ici sans passer par le lecteur.
    const DOC_RESOURCES: u16 = 7;
    const DOC_START_SIZE: u16 = 18;
    const PAGE_SIZE: u16 = 6;
    const PAGE_CURTAIN: u16 = 13;
    const PAGE_SPOT: u16 = 18;
    const PAGE_ORIGIN: u16 = 29;
    const ITEM_BOX: u16 = 7;
    const ITEM_LAYER: u16 = 8;
    const ITEM_DEPTH: u16 = 9;
    const ITEM_PEN: u16 = 10;
    const PEN_WIDTH: u16 = 3;
    const PEN_COLOR: u16 = 7;
    const PEN_FILL: u16 = 8;
    const PEN_TINT: u16 = 9;
    const FILL_SOURCE: u16 = 2;
    const FILL_PICTURE: u16 = 4;
    const FILL_STYLE: u16 = 3;
    const STROKE_POINTS: u16 = 39;
    const REF_38: u16 = 38;
    const RES_DATA: u16 = 4;
    const RES_MARKUP: u16 = 5;
    const RUN_BASELINE: u16 = 3;
    const RUN_COLOR: u16 = 5;
    const RUN_TEXT: u16 = 6;
    const RUN_FONT: u16 = 7;
    const RUN_SIZE: u16 = 8;
    const RUN_WEIGHT: u16 = 9;

    const DOC_NODE: u32 = 1;
    const DOC_STORAGE: u32 = 2;
    const PNG: &[u8] = b"\x89PNG\r\n\x1a\n\0\0\0\x0dIHDR";
    const TIFF: &[u8] = b"II*\0\x08\0\0\0";
    const EMF: &[u8] = &[1, 0, 0, 0, 0x6C, 0, 0, 0, 0, 0, 0, 0];

    /// Ressource : numéro, objet `.ir`, fichier de données de la racine éventuel.
    struct Res {
        id: u32,
        object: Obj,
        file: Option<(&'static str, Vec<u8>)>,
    }

    /// Points d'un trait ou d'une ligne.
    fn points(id: u32, pts: &[(f64, f64)]) -> Res {
        Res {
            id,
            object: Obj::new(0, id).points(RES_DATA, pts),
            file: None,
        }
    }

    /// Page fabriquée : nœud `node` (conteneur `<node>.fpg`), objet de page, nœuds enfants et leurs flux.
    struct Sheet {
        node: u32,
        page: Obj,
        kids: Vec<Node>,
        refs: Vec<u32>,
        streams: Vec<(u32, Vec<u8>)>,
    }

    impl Sheet {
        fn new(node: u32) -> Self {
            Sheet {
                node,
                page: Obj::new(ids::PAGE, node + 1).size_f(PAGE_SIZE, 1920.0, 1080.0),
                kids: Vec::new(),
                refs: Vec::new(),
                streams: Vec::new(),
            }
        }
        fn page(mut self, page: Obj) -> Self {
            self.page = page;
            self
        }
        /// Objet enfant de la page : nœud `id` de sorte `kind`, stockage `id + 50 000`.
        fn put(self, id: u32, kind: u16, o: Obj) -> Self {
            self.put_node(leaf(id, kind, id + 50_000), vec![(id + 50_000, o.stream())])
        }
        fn put_node(mut self, node: Node, streams: Vec<(u32, Vec<u8>)>) -> Self {
            self.refs.push(node.id);
            self.kids.push(node);
            self.streams.extend(streams);
            self
        }
    }

    fn leaf(id: u32, kind: u16, storage: u32) -> Node {
        Node::new(id, kind, storage, Vec::new(), Vec::new())
    }

    fn pen(rgb: (u8, u8, u8), width: f64) -> Obj {
        Obj::new(0, 0)
            .color(PEN_COLOR, rgb.0, rgb.1, rgb.2, 255)
            .real(PEN_WIDTH, width)
    }

    fn stroke(rid: u32, rgb: (u8, u8, u8)) -> Obj {
        Obj::new(ids::STROKE, 0)
            .object(ITEM_PEN, 4, &pen(rgb, 3.0))
            .integer(STROKE_POINTS, int(rid))
    }

    fn int(v: u32) -> i32 {
        i32::try_from(v).unwrap_or(i32::MAX)
    }

    fn document() -> Obj {
        Obj::new(ids::DOCUMENT, DOC_STORAGE)
    }

    /// Entrées d'un `.flipchart` extrait : `version`, index et document de la racine, ressources, pages.
    fn flipchart(doc: Obj, resources: &[Res], sheets: Vec<Sheet>) -> Vec<(String, Vec<u8>)> {
        let names: Vec<(u32, String, &str)> = resources
            .iter()
            .map(|r| {
                (
                    r.id,
                    format!("{}.ir", r.id),
                    r.file.as_ref().map_or("", |f| f.0),
                )
            })
            .collect();
        let rows: Vec<(u32, &str, &str, &str, u32)> = names
            .iter()
            .map(|(id, entry, file)| (*id, entry.as_str(), *file, "", 1))
            .collect();
        let doc = doc.object(DOC_RESOURCES, 4, &Obj::new(0, 0).resources(2, &rows));
        let mut out = vec![
            (String::from("version"), b"1".to_vec()),
            (format!("{DOC_STORAGE}.io"), doc.stream()),
        ];
        for r in resources {
            out.push((format!("{}.ir", r.id), r.object.stream()));
            if let Some((name, data)) = &r.file {
                out.push((String::from(*name), data.clone()));
            }
        }
        let mut page_nodes = Vec::new();
        for s in sheets {
            page_nodes.push(leaf(s.node, ids::PAGE, s.node + 1));
            let tree = Node::new(s.node, ids::PAGE, s.node + 1, s.kids, s.refs);
            out.push((format!("{0}.fpg/{0}.in", s.node), index(&tree)));
            out.push((format!("{}.fpg/{}.io", s.node, s.node + 1), s.page.stream()));
            for (storage, data) in s.streams {
                out.push((format!("{}.fpg/{storage}.io", s.node), data));
            }
        }
        let root = Node::new(DOC_NODE, ids::DOCUMENT, DOC_STORAGE, page_nodes, Vec::new());
        out.push((format!("{DOC_NODE}.in"), index(&root)));
        out
    }

    fn run(entries: &[(String, Vec<u8>)], first_page: u32) -> Result<BoardList, BoardError> {
        let refs: Vec<(&str, &[u8])> = entries
            .iter()
            .map(|(n, d)| (n.as_str(), d.as_slice()))
            .collect();
        crate::flipchart::read(&refs, first_page)
    }

    /// Pages relues par `board::parse` (le flux est celui de `encode`, DA5) et avertissements.
    fn pages_of(entries: &[(String, Vec<u8>)]) -> (Vec<Page>, Vec<String>) {
        let list = run(entries, 1).expect("fichier lu");
        (
            board::parse(&list).expect("flux BoardList valide"),
            list.warnings,
        )
    }

    fn colors(items: &[Item]) -> Vec<[u8; 3]> {
        items
            .iter()
            .filter_map(|it| match it {
                Item::Stroke { color, .. } => Some(*color),
                _ => None,
            })
            .collect()
    }

    fn xy(points: &[[f32; 3]]) -> Vec<(f32, f32)> {
        points.iter().map(|p| (p[0], p[1])).collect()
    }

    /// S4 : deux pages ; trait, ligne ouverte, rectangle plein, texte à deux segments, image PNG.
    #[test]
    fn two_pages_with_stroke_line_rect_text_image() {
        let resources = [
            points(101, &[(10.0, 20.0), (30.0, 40.0)]),
            points(102, &[(0.0, 0.0), (50.0, 0.0), (50.0, 50.0)]),
            Res {
                id: 103,
                object: Obj::new(0, 103).polygons(
                    RES_DATA,
                    &[&[(0.0, 0.0), (100.0, 0.0), (100.0, 50.0), (0.0, 50.0)]],
                ),
                file: None,
            },
            Res {
                id: 104,
                object: Obj::new(0, 104)
                    .string(RES_MARKUP, "<p>Bonjour monde</p>")
                    .objects(
                        RES_DATA,
                        &[
                            Obj::new(0, 0)
                                .string(RUN_TEXT, "Bonjour ")
                                .string(RUN_FONT, "Arial")
                                .real(RUN_SIZE, 24.0)
                                .integer(RUN_WEIGHT, 75)
                                .color(RUN_COLOR, 0, 0, 0, 255)
                                .point(RUN_BASELINE, 10.0, 40.0),
                            Obj::new(0, 0)
                                .string(RUN_TEXT, "monde")
                                .string(RUN_FONT, "Arial")
                                .real(RUN_SIZE, 24.0)
                                .integer(RUN_WEIGHT, 50)
                                .color(RUN_COLOR, 255, 0, 0, 255)
                                .point(RUN_BASELINE, 120.0, 40.0),
                        ],
                    ),
                file: None,
            },
            Res {
                id: 105,
                object: Obj::new(0, 105).string(3, "photo.png").size(5, 200, 100),
                file: Some(("115.png", PNG.to_vec())),
            },
        ];
        let background = Obj::new(ids::BACKGROUND, 0).integer(FILL_SOURCE, 0).object(
            FILL_STYLE,
            4,
            &Obj::new(0, 0)
                .integer(PEN_FILL, 1)
                .color(PEN_TINT, 250, 240, 230, 255),
        );
        let first = Sheet::new(10)
            .put(11, ids::BACKGROUND, background)
            .put(12, ids::STROKE, stroke(101, (255, 0, 0)))
            .put(
                13,
                ids::LINE,
                Obj::new(ids::LINE, 0)
                    .object(ITEM_PEN, 4, &pen((0, 128, 0), 2.0))
                    .integer(REF_38, 102),
            );
        let fill = pen((0, 0, 255), 2.0)
            .integer(PEN_FILL, 1)
            .color(PEN_TINT, 0, 255, 0, 255);
        let second = Sheet::new(20)
            .put(
                21,
                ids::SHAPE,
                Obj::new(ids::SHAPE, 0)
                    .object(ITEM_PEN, 4, &fill)
                    .integer(REF_38, 103),
            )
            .put(
                22,
                ids::TEXT,
                Obj::new(ids::TEXT, 0)
                    .float_rect(ITEM_BOX, 10.0, 20.0, 300.0, 40.0)
                    .integer(REF_38, 104),
            )
            .put(
                23,
                ids::IMAGE,
                Obj::new(ids::IMAGE, 0)
                    .float_rect(ITEM_BOX, 5.0, 6.0, 200.0, 100.0)
                    .integer(REF_38, 105),
            );
        let (pages, warnings) = pages_of(&flipchart(document(), &resources, vec![first, second]));
        assert!(warnings.is_empty(), "{warnings:?}");
        assert_eq!(pages.len(), 2);

        assert_eq!(pages[0].background, Some([250, 240, 230]));
        assert_eq!(pages[0].items.len(), 2, "{:?}", pages[0].items);
        let Item::Stroke {
            m,
            color,
            width,
            points,
        } = &pages[0].items[0]
        else {
            panic!("trait attendu : {:?}", pages[0].items[0]);
        };
        assert_eq!((*m, *color, *width), (board::IDENTITY, [255, 0, 0], 3.0));
        assert_eq!(xy(points), vec![(10.0, 20.0), (30.0, 40.0)]);
        let Item::Stroke { color, points, .. } = &pages[0].items[1] else {
            panic!("ligne attendue : {:?}", pages[0].items[1]);
        };
        assert_eq!(*color, [0, 128, 0]);
        assert_eq!(xy(points), vec![(0.0, 0.0), (50.0, 0.0), (50.0, 50.0)]);

        assert_eq!(pages[1].background, None);
        assert_eq!(pages[1].items.len(), 3, "{:?}", pages[1].items);
        assert_eq!(
            pages[1].items[0],
            Item::Shape {
                kind: ShapeKind::Rect,
                m: board::IDENTITY,
                x0: 0.0,
                y0: 0.0,
                x1: 100.0,
                y1: 50.0,
                color: [0, 0, 255],
                width: 2.0,
                fill: Some([0, 255, 0]),
            }
        );
        let Item::Text {
            m,
            x,
            y,
            w,
            h,
            spans,
            ..
        } = &pages[1].items[1]
        else {
            panic!("texte attendu : {:?}", pages[1].items[1]);
        };
        assert_eq!(
            (*m, *x, *y, *w, *h),
            (board::IDENTITY, 10.0, 20.0, 300.0, 40.0)
        );
        type Run<'s> = (&'s str, bool, Option<[u8; 3]>, Option<&'s str>);
        let runs: Vec<Run> = spans
            .iter()
            .map(|s| (s.text.as_str(), s.bold, s.color, s.font.as_deref()))
            .collect();
        assert_eq!(
            runs,
            vec![
                ("Bonjour ", true, Some([0, 0, 0]), Some("Arial")),
                ("monde", false, Some([255, 0, 0]), Some("Arial")),
            ]
        );
        assert_eq!(
            pages[1].items[2],
            Item::Image {
                m: board::IDENTITY,
                x: 5.0,
                y: 6.0,
                w: 200.0,
                h: 100.0,
                href: String::from("115.png"),
            }
        );
    }

    /// N7 : une forme qui n'est pas un rectangle d'axes devient un trait fermé.
    #[test]
    fn shape_not_rect_is_a_closed_stroke() {
        let triangle = Res {
            id: 101,
            object: Obj::new(0, 101)
                .polygons(RES_DATA, &[&[(0.0, 0.0), (40.0, 0.0), (20.0, 30.0)]]),
            file: None,
        };
        let sheet = Sheet::new(10).put(
            11,
            ids::SHAPE,
            Obj::new(ids::SHAPE, 0)
                .object(ITEM_PEN, 4, &pen((9, 9, 9), 1.0))
                .integer(REF_38, 101),
        );
        let (pages, _) = pages_of(&flipchart(document(), &[triangle], vec![sheet]));
        let Item::Stroke { color, points, .. } = &pages[0].items[0] else {
            panic!("trait fermé attendu : {:?}", pages[0].items);
        };
        assert_eq!(*color, [9, 9, 9]);
        assert_eq!(
            xy(points),
            vec![(0.0, 0.0), (40.0, 0.0), (20.0, 30.0), (0.0, 0.0)]
        );
    }

    /// S4, N14 : une image TIFF (ou EMF) n'est pas lue, elle est avertie ; la PNG voisine est lue.
    #[test]
    fn tiff_image_is_warned_not_read() {
        let image = |rid: u32| {
            Obj::new(ids::IMAGE, 0)
                .float_rect(ITEM_BOX, 0.0, 0.0, 10.0, 10.0)
                .integer(REF_38, int(rid))
        };
        let file = |id: u32, name: &'static str, data: &[u8]| Res {
            id,
            object: Obj::new(0, id).string(3, name),
            file: Some((name, data.to_vec())),
        };
        let resources = [
            file(101, "7.tif", TIFF),
            file(102, "8.emf", EMF),
            file(103, "9.png", PNG),
            file(104, "10.tiff", b"not really".as_slice()),
        ];
        let sheet = Sheet::new(10)
            .put(11, ids::IMAGE, image(101))
            .put(12, ids::IMAGE, image(102))
            .put(13, ids::IMAGE, image(103))
            .put(14, ids::IMAGE, image(104));
        let (pages, mut warnings) = pages_of(&flipchart(document(), &resources, vec![sheet]));
        warnings.sort();
        assert_eq!(
            warnings,
            vec![
                "page 1 : 1 image d'un format non lu (EMF, WMF…)".to_string(),
                "page 1 : 2 images TIFF non lues".to_string(),
            ]
        );
        assert_eq!(pages[0].items.len(), 1);
        assert!(
            matches!(&pages[0].items[0], Item::Image { href, .. } if href == "9.png"),
            "{:?}",
            pages[0].items
        );
    }

    /// T23 (DA4, N14, N15) : la page ne transmet que le nom des images gardées (octets vides) et jamais une TIFF ni
    /// une WMF. La PNG et le fond image sont lus sur leur nom ; TIFF et WMF sont averties sur l'extension du nom de
    /// la table des ressources, jamais comptées illisibles.
    #[test]
    fn named_images_are_read_and_absent_tiff_is_warned() {
        let image = |rid: u32| {
            Obj::new(ids::IMAGE, 0)
                .float_rect(ITEM_BOX, 0.0, 0.0, 10.0, 10.0)
                .integer(REF_38, int(rid))
        };
        let named = |id: u32, name: &'static str| Res {
            id,
            object: Obj::new(0, id).string(3, name),
            file: Some((name, Vec::new())),
        };
        let resources = [
            named(101, "photo.png"),
            named(102, "scan.tif"),
            named(103, "fond.png"),
            named(104, "dessin.wmf"),
        ];
        let background = Obj::new(ids::BACKGROUND, 0)
            .integer(FILL_SOURCE, 1)
            .pointer(FILL_PICTURE, 90, 90, ids::IMAGE);
        let mut sheet = Sheet::new(10)
            .put(11, ids::BACKGROUND, background)
            .put(12, ids::IMAGE, image(101))
            .put(13, ids::IMAGE, image(102))
            .put(14, ids::IMAGE, image(104));
        sheet.streams.push((90, image(103).stream()));
        let mut entries = flipchart(document(), &resources, vec![sheet]);
        entries.retain(|(n, _)| n != "scan.tif" && n != "dessin.wmf");
        let (pages, mut warnings) = pages_of(&entries);
        warnings.sort();
        assert_eq!(
            warnings,
            vec![
                "page 1 : 1 image TIFF non lue".to_string(),
                "page 1 : 1 image d'un format non lu (EMF, WMF…)".to_string(),
            ]
        );
        let mut hrefs: Vec<&str> = pages[0]
            .items
            .iter()
            .filter_map(|it| match it {
                Item::Image { href, .. } => Some(href.as_str()),
                _ => None,
            })
            .collect();
        hrefs.sort_unstable();
        assert_eq!(hrefs, vec!["fond.png", "photo.png"]);
    }

    /// S4 : les actions, médias, formules et textes verticaux sont avertis par sorte ; le trait est lu.
    #[test]
    fn action_is_warned() {
        let sheet = Sheet::new(10)
            .put(11, ids::STROKE, stroke(101, (1, 2, 3)))
            .put(12, 23, Obj::new(23, 0).integer(4, 2))
            .put(13, ids::TEXT_ACTION, Obj::new(ids::TEXT_ACTION, 0))
            .put(14, ids::MEDIA, Obj::new(ids::MEDIA, 0))
            .put(
                15,
                ids::MATHML,
                Obj::new(ids::MATHML, 0).string(52, "<math/>"),
            )
            .put(16, ids::VERTICAL_TEXT, Obj::new(ids::VERTICAL_TEXT, 0));
        let entries = flipchart(
            document(),
            &[points(101, &[(1.0, 1.0), (2.0, 2.0)])],
            vec![sheet],
        );
        let list = run(&entries, 3).expect("fichier lu");
        let mut warnings = list.warnings.clone();
        warnings.sort();
        assert_eq!(
            warnings,
            vec![
                "page 3 : 1 formule MathML non lue".to_string(),
                "page 3 : 1 son ou vidéo non lu".to_string(),
                "page 3 : 1 texte vertical non lu".to_string(),
                "page 3 : 2 actions non lues".to_string(),
            ]
        );
        let pages = board::parse(&list).expect("flux valide");
        assert_eq!(colors(&pages[0].items), vec![[1, 2, 3]]);
    }

    /// Patron refusé : suivre les références de groupe sans ensemble des visités (A → B → A boucle sans fin).
    #[test]
    fn group_cycle_is_ignored_with_warning() {
        let group = |id: u32, refs: Vec<u32>| {
            (
                Node::new(id, ids::GROUP, id + 50_000, Vec::new(), refs),
                vec![(id + 50_000, Obj::new(ids::GROUP, 0).stream())],
            )
        };
        let (a, a_streams) = group(11, vec![12, 13]);
        let (b, b_streams) = group(12, vec![11]);
        let sheet = Sheet::new(10)
            .put_node(a, a_streams)
            .put_node(b, b_streams)
            .put(13, ids::STROKE, stroke(101, (7, 7, 7)));
        let entries = flipchart(
            document(),
            &[points(101, &[(1.0, 1.0), (2.0, 2.0)])],
            vec![sheet],
        );
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            let _ = tx.send(pages_of(&entries));
        });
        let (pages, warnings) = rx
            .recv_timeout(Duration::from_secs(20))
            .expect("la lecture d'un groupe en cycle se termine");
        assert_eq!(
            warnings,
            vec!["page 1 : 1 groupe en cycle ignoré".to_string()]
        );
        fn strokes(items: &[Item]) -> usize {
            items
                .iter()
                .map(|it| match it {
                    Item::Stroke { .. } => 1,
                    Item::Group(inner) => strokes(inner),
                    _ => 0,
                })
                .sum()
        }
        assert_eq!(strokes(&pages[0].items), 1, "{:?}", pages[0].items);
        assert!(
            matches!(&pages[0].items[..], [Item::Group(_)]),
            "le trait reste dans son groupe : {:?}",
            pages[0].items
        );
    }

    /// N13 : un côté de page hors `]0, 100 000]` (ou non fini) donne 1024 × 768 et un seul avertissement.
    #[test]
    fn page_side_out_of_bounds_falls_back() {
        let sheet = |node: u32, size: Option<(f64, f64)>| {
            let page = Obj::new(ids::PAGE, 0);
            let page = match size {
                Some((w, h)) => page.size_f(PAGE_SIZE, w, h),
                None => page,
            };
            Sheet::new(node)
                .page(page)
                .put(node + 1, ids::STROKE, stroke(101, (1, 1, 1)))
        };
        let pts = [points(101, &[(1.0, 1.0), (2.0, 2.0)])];
        let scale = 1920.0 / 1024.0;
        let fallback = [scale, 0.0, 0.0, scale, 0.0, 0.0];
        let entries = flipchart(
            document(),
            &pts,
            vec![
                sheet(10, Some((0.0, 768.0))),
                sheet(20, Some((200_000.0, 1000.0))),
                sheet(30, Some((f64::NAN, 10.0))),
                sheet(40, Some((1024.0, 768.0))),
                sheet(50, None),
                sheet(60, Some((100_000.0, 100_000.0))),
            ],
        );
        let (pages, warnings) = pages_of(&entries);
        assert_eq!(
            warnings,
            vec!["côté de page hors bornes : 1024 × 768".to_string()]
        );
        let m_of = |p: &Page| match p.items.first() {
            Some(Item::Stroke { m, .. }) => Some(*m),
            _ => None,
        };
        for (k, p) in pages.iter().take(5).enumerate() {
            assert_eq!(m_of(p), Some(fallback), "page {}", k + 1);
        }
        let big = 1920.0 / 100_000.0;
        assert_eq!(m_of(&pages[5]), Some([big, 0.0, 0.0, big, 0.0, 0.0]));

        // La taille de départ du document est bornée de même.
        let doc = document().size_f(DOC_START_SIZE, 0.0, 5.0);
        let (pages, warnings) = pages_of(&flipchart(doc, &pts, vec![sheet(10, None)]));
        assert_eq!(
            warnings,
            vec!["côté de page hors bornes : 1024 × 768".to_string()]
        );
        assert_eq!(m_of(&pages[0]), Some(fallback));
    }

    /// § 7.3 : couche, puis profondeur, puis ordre de l'arbre (et non l'ordre de l'arbre seul).
    #[test]
    fn draw_order_follows_layer_then_depth() {
        let placed = |rgb: (u8, u8, u8), layer: Option<i32>, depth: Option<f64>| {
            let o = stroke(101, rgb);
            let o = match layer {
                Some(l) => o.integer(ITEM_LAYER, l),
                None => o,
            };
            match depth {
                Some(d) => o.real(ITEM_DEPTH, d),
                None => o,
            }
        };
        let sheet = Sheet::new(10)
            .put(11, ids::STROKE, placed((1, 0, 0), Some(2), Some(0.0)))
            .put(12, ids::STROKE, placed((2, 0, 0), Some(0), Some(5.0)))
            .put(13, ids::STROKE, placed((3, 0, 0), Some(0), Some(1.0)))
            .put(14, ids::STROKE, placed((4, 0, 0), None, None))
            .put(15, ids::STROKE, placed((5, 0, 0), Some(0), Some(1.0)));
        let entries = flipchart(
            document(),
            &[points(101, &[(1.0, 1.0), (2.0, 2.0)])],
            vec![sheet],
        );
        let (pages, _) = pages_of(&entries);
        assert_eq!(
            colors(&pages[0].items),
            vec![[3, 0, 0], [5, 0, 0], [2, 0, 0], [4, 0, 0], [1, 0, 0]]
        );
    }

    /// Sans index ni document, le fichier est refusé ; un objet dont le `.io` manque est averti, pas fatal.
    #[test]
    fn missing_io_is_broken() {
        let pts = [points(101, &[(1.0, 1.0), (2.0, 2.0)])];
        let good = flipchart(
            document(),
            &pts,
            vec![Sheet::new(10).put(11, ids::STROKE, stroke(101, (1, 1, 1)))],
        );
        assert!(run(&good, 1).is_ok());

        let without = |name: &str| -> Vec<(String, Vec<u8>)> {
            good.iter().filter(|(n, _)| n != name).cloned().collect()
        };
        assert!(matches!(
            run(&without("1.in"), 1),
            Err(BoardError::Broken(_))
        ));
        assert!(matches!(
            run(&without("2.io"), 1),
            Err(BoardError::Broken(_))
        ));
        assert!(matches!(run(&[], 1), Err(BoardError::Broken(_))));

        let (pages, warnings) = pages_of(&without("10.fpg/50011.io"));
        assert_eq!(
            warnings,
            vec!["page 1 : 1 objet illisible ignoré".to_string()]
        );
        assert_eq!(pages.len(), 1);
        assert!(pages[0].items.is_empty());
    }

    /// U2 : un type de valeur inconnu reste local à sa propriété ; un `.io` illisible est averti par objet.
    #[test]
    fn unknown_value_type_is_kept_local() {
        let unknown = || Bytes::default().u16(0x77).u32(0);
        let doc = document().raw(99, unknown());
        let sheet = Sheet::new(10)
            .page(
                Obj::new(ids::PAGE, 0)
                    .size_f(PAGE_SIZE, 1920.0, 1080.0)
                    .raw(98, unknown()),
            )
            .put(11, ids::STROKE, stroke(101, (4, 5, 6)).raw(4, unknown()))
            .put_node(
                leaf(12, ids::STROKE, 60_012),
                vec![(60_012, b"not a stream at all".to_vec())],
            );
        let entries = flipchart(doc, &[points(101, &[(1.0, 1.0), (2.0, 2.0)])], vec![sheet]);
        let (pages, warnings) = pages_of(&entries);
        assert_eq!(
            warnings,
            vec!["page 1 : 1 objet illisible ignoré".to_string()]
        );
        let Some(Item::Stroke { color, points, .. }) = pages[0].items.first() else {
            panic!("trait attendu : {:?}", pages[0].items);
        };
        assert_eq!(
            (*color, xy(points)),
            ([4, 5, 6], vec![(1.0, 1.0), (2.0, 2.0)])
        );
    }

    /// N13 : plus de 100 000 objets en tout (comptés sur l'index, avant toute lecture d'objet) : refus.
    #[test]
    fn more_than_100000_objects_is_too_big() {
        let crowded = |node: u32, n: usize| {
            let mut s = Sheet::new(node);
            s.streams.push((77, stroke(101, (1, 1, 1)).stream()));
            for i in 0..n {
                let id = node * 1_000_000 + u32::try_from(i).unwrap_or(0);
                s.kids.push(leaf(id, ids::STROKE, 77));
            }
            s
        };
        let pts = [points(101, &[(1.0, 1.0)])];
        let one = flipchart(document(), &pts, vec![crowded(10, board::MAX_OBJECTS + 1)]);
        assert_eq!(run(&one, 1), Err(BoardError::TooBig));
        let half = board::MAX_OBJECTS / 2 + 1;
        let two = flipchart(document(), &pts, vec![crowded(10, half), crowded(20, half)]);
        assert_eq!(run(&two, 1), Err(BoardError::TooBig));
    }

    /// S5 : objets imbriqués dans l'index au-delà de 32 niveaux, ou dans un flux au-delà de 32 : ignorés, comptés.
    #[test]
    fn deep_objects_are_warned() {
        let levels = 40u32;
        let mut node = leaf(100 + levels, ids::STROKE, 77);
        for k in (1..levels).rev() {
            node = Node::new(100 + k, ids::STROKE, 77, vec![node], Vec::new());
        }
        let deep_pen = (0..34).fold(Obj::new(0, 0), |inner, _| {
            Obj::new(0, 0).object(1, 4, &inner)
        });
        let sheet = Sheet::new(10)
            .put_node(node, vec![(77, stroke(101, (1, 1, 1)).stream())])
            .put(
                11,
                ids::STROKE,
                stroke(101, (2, 2, 2)).object(60, 4, &deep_pen),
            );
        let entries = flipchart(
            document(),
            &[points(101, &[(1.0, 1.0), (2.0, 2.0)])],
            vec![sheet],
        );
        let (pages, warnings) = pages_of(&entries);
        // 8 nœuds au-delà du 32e niveau de l'index ; 4 objets embarqués au-delà du 32e niveau du flux.
        assert_eq!(
            warnings,
            vec!["page 1 : 12 objets trop imbriqués ignorés".to_string()]
        );
        let c = colors(&pages[0].items);
        assert_eq!(c.iter().filter(|&&c| c == [1, 1, 1]).count(), 32);
        assert_eq!(c.iter().filter(|&&c| c == [2, 2, 2]).count(), 1);
    }

    /// N12 : grille (et ses niveaux), étiquettes, connecteur : avertis par sorte, une grille comptée une fois.
    #[test]
    fn grid_and_labels_are_warned() {
        let grid = Node::new(
            11,
            ids::GRID,
            50_011,
            vec![
                leaf(111, ids::GRID_LEVEL, 50_111),
                leaf(112, ids::GRID_LEVEL, 50_112),
            ],
            Vec::new(),
        );
        let sheet = Sheet::new(10)
            .put_node(
                grid,
                vec![
                    (50_011, Obj::new(ids::GRID, 0).stream()),
                    (50_111, Obj::new(ids::GRID_LEVEL, 0).stream()),
                    (50_112, Obj::new(ids::GRID_LEVEL, 0).stream()),
                ],
            )
            .put(12, ids::TAG, Obj::new(ids::TAG, 0).string(2, "légende"))
            .put(13, ids::TAG, Obj::new(ids::TAG, 0))
            .put(14, ids::CONNECTOR, Obj::new(ids::CONNECTOR, 0))
            .put(15, ids::STROKE, stroke(101, (3, 3, 3)));
        let entries = flipchart(
            document(),
            &[points(101, &[(1.0, 1.0), (2.0, 2.0)])],
            vec![sheet],
        );
        let (pages, mut warnings) = pages_of(&entries);
        warnings.sort();
        assert_eq!(
            warnings,
            vec![
                "page 1 : 1 connecteur non lu".to_string(),
                "page 1 : 1 grille non lue".to_string(),
                "page 1 : 2 étiquettes non lues".to_string(),
            ]
        );
        assert_eq!(colors(&pages[0].items), vec![[3, 3, 3]]);
    }

    /// N12 : rideau, projecteur et repère XY de la page sont avertis.
    #[test]
    fn presentation_settings_are_warned() {
        let page = Obj::new(ids::PAGE, 0)
            .size_f(PAGE_SIZE, 1920.0, 1080.0)
            .real(PAGE_CURTAIN, 40.0)
            .float_rect(PAGE_SPOT, 0.0, 0.0, 10.0, 10.0)
            .point(PAGE_ORIGIN, 5.0, 5.0);
        let (_, mut warnings) =
            pages_of(&flipchart(document(), &[], vec![Sheet::new(10).page(page)]));
        warnings.sort();
        assert_eq!(
            warnings,
            vec![
                "page 1 : 1 projecteur non lu".to_string(),
                "page 1 : 1 repère XY non lu".to_string(),
                "page 1 : 1 rideau non lu".to_string(),
            ]
        );
    }

    /// N13 : au-delà de 500 pages, les 500 premières sont lues, avec un avis.
    #[test]
    fn more_than_500_pages_keeps_500() {
        let sheets = (0..501u32).map(|k| Sheet::new(10 + 2 * k)).collect();
        let (pages, warnings) = pages_of(&flipchart(document(), &[], sheets));
        assert_eq!(pages.len(), 500);
        assert_eq!(
            warnings,
            vec!["500 premières pages importées sur 501".to_string()]
        );
    }

    /// N13 : aucune panique sur une entrée hostile ; un flux rendu est toujours relu par `board::parse`.
    #[test]
    fn read_never_panics_on_mutated_entries() {
        let resources = [
            points(101, &[(1.0, 2.0), (3.0, 4.0)]),
            Res {
                id: 102,
                object: Obj::new(0, 102).polygons(
                    RES_DATA,
                    &[&[(0.0, 0.0), (10.0, 0.0), (10.0, 5.0), (0.0, 5.0)]],
                ),
                file: None,
            },
            Res {
                id: 103,
                object: Obj::new(0, 103).objects(
                    RES_DATA,
                    &[Obj::new(0, 0).string(RUN_TEXT, "a").real(RUN_SIZE, 10.0)],
                ),
                file: None,
            },
            Res {
                id: 104,
                object: Obj::new(0, 104),
                file: Some(("104.png", PNG.to_vec())),
            },
        ];
        let placed = Obj::new(0, 0)
            .point(2, 5.0, 5.0)
            .real(3, 30.0)
            .point(4, 2.0, 2.0)
            .boolean(5, true);
        let group = Node::new(15, ids::GROUP, 50_015, Vec::new(), vec![12, 13]);
        let sheet = Sheet::new(10)
            .page(
                Obj::new(ids::PAGE, 0)
                    .size_f(PAGE_SIZE, 1024.0, 768.0)
                    .real(PAGE_CURTAIN, 1.0),
            )
            .put(
                12,
                ids::STROKE,
                stroke(101, (1, 2, 3))
                    .object(2, 4, &placed)
                    .integer(ITEM_LAYER, 2)
                    .real(ITEM_DEPTH, 1.0),
            )
            .put(
                13,
                ids::SHAPE,
                Obj::new(ids::SHAPE, 0)
                    .object(ITEM_PEN, 4, &pen((1, 1, 1), 1.0))
                    .integer(REF_38, 102),
            )
            .put(
                14,
                ids::TEXT,
                Obj::new(ids::TEXT, 0)
                    .float_rect(ITEM_BOX, 0.0, 0.0, 10.0, 10.0)
                    .integer(REF_38, 103),
            )
            .put(
                16,
                ids::IMAGE,
                Obj::new(ids::IMAGE, 0)
                    .float_rect(ITEM_BOX, 0.0, 0.0, 10.0, 10.0)
                    .integer(REF_38, 104),
            )
            .put_node(group, vec![(50_015, Obj::new(ids::GROUP, 0).stream())]);
        let good = flipchart(document(), &resources, vec![sheet]);
        let (pages, _) = pages_of(&good);
        assert_eq!(pages[0].items.len(), 3, "{:?}", pages[0].items);
        for (e, (_, data)) in good.iter().enumerate() {
            for i in 0..data.len() {
                for v in [0x00, 0x7F, 0x80, 0xFF] {
                    let mut entries = good.clone();
                    entries[e].1[i] = v;
                    if let Ok(list) = run(&entries, 1) {
                        if let Err(err) = board::parse(&list) {
                            panic!("entrée {e}, octet {i} = {v:#x} : {err}");
                        }
                    }
                }
            }
        }
    }
}
