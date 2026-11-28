//! Liaison wasm-bindgen du cœur RoomBoard (DA5, D10). Une méthode par commande ; objets (Change, ElementView,
//! Bounds, capacités) par serde-wasm-bindgen ; points et contours en Float32Array. Chaque méthode exposée délègue à
//! une méthode `_inner` sans JsValue, seule testée en natif (hors wasm32, tout appel à JS panique).
#[cfg(test)]
use std::collections::BTreeMap;
use std::fmt::Display;

use roomboard_core::arrange::ArrangeHow;
use roomboard_core::asset::AssetRef;
use roomboard_core::capabilities::{capabilities as core_capabilities, Platform};
use roomboard_core::commands::{BackdropInput, Change, Command, CommandError, EraseMode};
use roomboard_core::document::Document as CoreDocument;
use roomboard_core::element::{Look, PageLayout, StrokeStyle, Transform};
use roomboard_core::fill::FillTarget;
use roomboard_core::format::{self, FormatError, Parts, SaveMeta};
use roomboard_core::grid::{GridInput, GridLevelView, GridLines};
use roomboard_core::image::{ImageParamsInput, TransparentInput};
use roomboard_core::ink::builder::StrokeBuilder as CoreBuilder;
use roomboard_core::ink::outline::InkStyle;
use roomboard_core::ink::points::to_flat;
use roomboard_core::linear::{BindInput, LineInit, LinkDir};
use roomboard_core::media::{LinkedAsset, MediaType};
use roomboard_core::model3d::Model3dFormat;
use roomboard_core::query::Bounds;
use roomboard_core::rich_text::{SpanAttrs, SpanInput, TextAttr};
use roomboard_core::shape::ShapeKind;
use roomboard_core::style::StylePatch;
use roomboard_core::table::TableAxis;
use roomboard_core::table_links::LineSize;
use wasm_bindgen::prelude::*;

/// Version du cœur, pour vérifier que le module Wasm est chargé.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn to_js<T: serde::Serialize>(v: &T) -> Result<JsValue, JsError> {
    serde_wasm_bindgen::to_value(v).map_err(ser_err)
}

/// Change d'une commande vers JS, erreur comprise (OG35 : une seule copie de ce code, pas une par export).
#[inline(never)]
fn change_js(r: Result<Change, CommandError>) -> Result<JsValue, JsError> {
    to_js(&r.map_err(cmd_err)?)
}

#[inline(never)]
fn ser_err(e: serde_wasm_bindgen::Error) -> JsError {
    JsError::new(&e.to_string())
}

/// Message de l'Error JS : le `Display` du cœur (celui que `fake-core.ts` reproduit).
fn js_message<E: Display>(e: &E) -> String {
    e.to_string()
}

/// OG12 : liaison d'un bout reçue en deux paramètres positionnels. `(None, None)` : libre ; `(Some(id), Some([fx, fy]))` :
/// liée ; tout autre cas : `BadShape`.
fn binding_arg(
    id: Option<String>,
    fixed: Option<Vec<f64>>,
) -> Result<Option<BindInput>, CommandError> {
    match (id, fixed) {
        (None, None) => Ok(None),
        (Some(id), Some(f)) if f.len() == 2 => Ok(Some(BindInput {
            id,
            fx: f[0],
            fy: f[1],
        })),
        _ => Err(CommandError::BadShape),
    }
}

#[inline(never)]
fn cmd_err(e: CommandError) -> JsError {
    JsError::new(&js_message(&e))
}

/// Lien de case venu de JS : les trois champs ou aucun ; un triplet incomplet (JSON de la CLI) est refusé
/// (`BadTable`), comme par le faux cœur, au lieu de retirer le lien sans erreur.
fn cell_of(
    table: Option<String>,
    row: Option<String>,
    col: Option<String>,
) -> Result<Option<[String; 3]>, CommandError> {
    match (table, row, col) {
        (Some(t), Some(r), Some(c)) => Ok(Some([t, r, c])),
        (None, None, None) => Ok(None),
        _ => Err(CommandError::BadTable),
    }
}

/// OG11 : nombre venu de JS reçu en `f64` et vérifié avant conversion. Un paramètre `u8` ou `u32` serait tronqué par
/// wasm-bindgen sans erreur (257 deviendrait 1, 2^32 + 5 deviendrait 5) : la borne se contrôle ici, jamais après.
fn small_int(v: Option<f64>, max: f64) -> Result<Option<f64>, CommandError> {
    match v {
        None => Ok(None),
        Some(x) if x.is_finite() && x.fract() == 0.0 && (0.0..=max).contains(&x) => Ok(Some(x)),
        Some(_) => Err(CommandError::BadStyle),
    }
}

/// Tracé : entier de 0..=2.
fn roughness_arg(v: Option<f64>) -> Result<Option<u8>, CommandError> {
    Ok(small_int(v, 2.0)?.map(|x| x as u8))
}

/// Aspect d'une création (OG11) : bornes des nombres vérifiées (tracé entier 0..=2, graine entière 0..=u32::MAX,
/// opacité finie 0..=100 arrondie), hors bornes `BadStyle` ; le reste est assaini par le cœur (`Look::sanitized`).
/// `named` (T12) : `fillStyle`, `startArrowhead`, `endArrowhead`, `textAlign`, `link`, dans cet ordre ; un défaut de
/// pointe ou un lien hors des trois schémas n'écrit rien (`Look::sanitized`). OG23 : 6e nom, `variability` (seul
/// `constant` écrit).
fn look_of(
    stroke_style: Option<String>,
    roughness: Option<f64>,
    seed: Option<f64>,
    roundness: Option<String>,
    opacity: Option<f64>,
    named: [Option<String>; 6],
) -> Result<Look, CommandError> {
    let [fill_style, start_arrowhead, end_arrowhead, text_align, link, variability] = named;
    let opacity = match opacity {
        None => None,
        Some(o) if o.is_finite() && (0.0..=100.0).contains(&o) => Some(o.round() as u8),
        Some(_) => return Err(CommandError::BadStyle),
    };
    Ok(Look {
        stroke_style,
        roughness: roughness_arg(roughness)?,
        seed: small_int(seed, f64::from(u32::MAX))?.map(|x| x as u32),
        roundness,
        opacity,
        fill_style,
        start_arrowhead,
        end_arrowhead,
        text_align,
        link,
        variability,
        drag_copy: None,
        elbowed: None,
    })
}

#[inline(never)]
fn fmt_err(e: FormatError) -> JsError {
    JsError::new(&js_message(&e))
}

/// Disposition de page lue d'un nom JS (`PageLayout::parse`) ; illisible : le message de l'Error JS (que `fake-core.ts`
/// reproduit). Sans JsValue, testée en natif.
fn page_layout(mode: &str) -> Result<PageLayout, String> {
    PageLayout::parse(mode).ok_or_else(|| format!("mode de page inconnu : {mode}"))
}

/// Disposition `Arrange` lue d'un nom JS (`ArrangeHow::parse`) ; illisible : le message de l'Error JS (que
/// `fake-core.ts` reproduit). Sans JsValue, testée en natif.
fn arrange_how(how: &str) -> Result<ArrangeHow, String> {
    ArrangeHow::parse(how).ok_or_else(|| format!("disposition inconnue : {how}"))
}

/// `mode` facultatif venu de JS : absent → `None` ; illisible → Error, levée avant la commande.
fn layout_arg(mode: Option<String>) -> Result<Option<PageLayout>, JsError> {
    mode.as_deref()
        .map(page_layout)
        .transpose()
        .map_err(|m| JsError::new(&m))
}

fn parse_platform(name: &str) -> Option<Platform> {
    Some(match name {
        "web" => Platform::Web,
        "windows" => Platform::Windows,
        "macos" => Platform::MacOs,
        "linux" => Platform::Linux,
        "android" => Platform::Android,
        "ipados" => Platform::IPadOs,
        _ => return None,
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CapabilitiesView {
    desktop_annotation: bool,
    multi_window: bool,
}

/// Table des capacités (D23), appelée telle quelle.
#[wasm_bindgen]
pub fn capabilities(platform: &str) -> Result<JsValue, JsError> {
    let p = parse_platform(platform)
        .ok_or_else(|| JsError::new(&format!("plateforme inconnue : {platform}")))?;
    let c = core_capabilities(p);
    to_js(&CapabilitiesView {
        desktop_annotation: c.desktop_annotation,
        multi_window: c.multi_window,
    })
}

/// Les deux moitiés d'un `.roomboard` (K2) pour le Worker de la partie « reste » ; libérée par `free()` côté JS.
#[wasm_bindgen]
pub struct SavedParts {
    manifest: Vec<u8>,
    ybin: Vec<u8>,
}

#[wasm_bindgen]
impl SavedParts {
    pub fn manifest(&self) -> Vec<u8> {
        self.manifest.clone()
    }

    pub fn ybin(&self) -> Vec<u8> {
        self.ybin.clone()
    }
}

/// Axe reçu de JS (`row` : ligne, sinon colonne) des insertions et suppressions de tableau.
fn table_axis(row: bool) -> TableAxis {
    if row {
        TableAxis::Row
    } else {
        TableAxis::Col
    }
}

/// Fichiers liés d'un objet 3D (C15, X7) : listes parallèles de même longueur, sinon `BadModel3d`.
fn linked_files(
    paths: &[String],
    ids: &[String],
    names: &[String],
    mimes: &[String],
    sizes: &[f64],
) -> Result<Vec<(String, AssetRef)>, CommandError> {
    let n = paths.len();
    if [ids.len(), names.len(), mimes.len(), sizes.len()]
        .iter()
        .any(|l| *l != n)
    {
        return Err(CommandError::BadModel3d);
    }
    Ok((0..n)
        .map(|i| {
            (
                paths[i].clone(),
                asset_ref(&ids[i], &names[i], &mimes[i], sizes[i]),
            )
        })
        .collect())
}

/// Référence d'asset reçue de JS : métadonnées seules, jamais les octets (U4, K13).
fn asset_ref(id: &str, name: &str, mime: &str, size: f64) -> AssetRef {
    AssetRef {
        id: id.to_string(),
        name: name.to_string(),
        mime: mime.to_string(),
        size,
    }
}

/// Réglages d'image reçus de JS (C5, I6) : `crop` vide ou `[x, y, w, h]` ; `color` absente avec `transparent` vide, ou
/// présente avec `[tolérance, plume, contigu (0 ou 1)]`, ou `[tolérance, plume, contigu, x, y]` avec le départ de la
/// baguette (OG23, T10, pixels source) ; toute autre forme : `BadImageParams`. Les valeurs sont contrôlées par le cœur.
#[allow(clippy::too_many_arguments)]
fn image_params_input(
    crop: &[f64],
    flip_x: bool,
    flip_y: bool,
    quarter_turns: f64,
    brightness: f64,
    contrast: f64,
    color: Option<String>,
    transparent: &[f64],
) -> Result<ImageParamsInput, CommandError> {
    let crop = match crop {
        [] => None,
        [x, y, w, h] => Some([*x, *y, *w, *h]),
        _ => return Err(CommandError::BadImageParams),
    };
    let transparent = match (color, transparent) {
        (None, []) => None,
        (Some(color), [tolerance, soft, contiguous, seed @ ..]) => {
            let (x, y) = match seed {
                [] => (None, None),
                [x, y] => (Some(*x), Some(*y)),
                _ => return Err(CommandError::BadImageParams),
            };
            Some(TransparentInput {
                color,
                tolerance: *tolerance,
                soft: *soft,
                contiguous: *contiguous != 0.0,
                x,
                y,
            })
        }
        _ => return Err(CommandError::BadImageParams),
    };
    Ok(ImageParamsInput {
        crop,
        flip_x,
        flip_y,
        quarter_turns,
        brightness,
        contrast,
        transparent,
    })
}

/// Valeur d'un patch `FormatText` venue de la page (C7, T7) ; `null` arrive en `None` (retrait). Lue par
/// `WireVisitor` plutôt que par `#[serde(untagged)]`, qui tirait dans le module la machinerie `Content` de serde (T10) ;
/// mêmes valeurs acceptées : booléen, nombre (entier ou flottant), chaîne ou octets UTF-8 ; tout le reste est refusé.
#[derive(Debug, Clone, PartialEq)]
pub enum WireValue {
    Bool(bool),
    Number(f64),
    Text(String),
}

impl<'de> serde::Deserialize<'de> for WireValue {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        d.deserialize_any(WireVisitor)
    }
}

struct WireVisitor;

impl<'de> serde::de::Visitor<'de> for WireVisitor {
    type Value = WireValue;

    fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.write_str("un booléen, un nombre ou une chaîne")
    }

    fn visit_bool<E: serde::de::Error>(self, b: bool) -> Result<WireValue, E> {
        Ok(WireValue::Bool(b))
    }

    fn visit_i64<E: serde::de::Error>(self, n: i64) -> Result<WireValue, E> {
        Ok(WireValue::Number(n as f64))
    }

    fn visit_u64<E: serde::de::Error>(self, n: u64) -> Result<WireValue, E> {
        Ok(WireValue::Number(n as f64))
    }

    fn visit_f64<E: serde::de::Error>(self, n: f64) -> Result<WireValue, E> {
        Ok(WireValue::Number(n))
    }

    /// Refusé comme avec `untagged`, où un `char` ne se lisait pas en `String` (par défaut, serde le passerait à
    /// `visit_str`).
    fn visit_char<E: serde::de::Error>(self, c: char) -> Result<WireValue, E> {
        Err(E::invalid_type(serde::de::Unexpected::Char(c), &self))
    }

    fn visit_str<E: serde::de::Error>(self, s: &str) -> Result<WireValue, E> {
        Ok(WireValue::Text(s.to_owned()))
    }

    fn visit_string<E: serde::de::Error>(self, s: String) -> Result<WireValue, E> {
        Ok(WireValue::Text(s))
    }

    fn visit_bytes<E: serde::de::Error>(self, b: &[u8]) -> Result<WireValue, E> {
        match std::str::from_utf8(b) {
            Ok(s) => Ok(WireValue::Text(s.to_owned())),
            Err(_) => Err(E::invalid_value(serde::de::Unexpected::Bytes(b), &self)),
        }
    }
}

/// Emplacements d'un patch lu par `PatchVisitor`, dans l'ordre de `PATCH_KEYS`.
type PatchSlots = [Option<Option<WireValue>>; 6];

/// Emplacements → entrées du cœur (contrôle 1 de T7) : clé connue au mauvais type : `BadFormat`.
fn entries_of(slots: PatchSlots) -> Result<Vec<TextAttr>, CommandError> {
    let mut attrs = Vec::new();
    for (k, v) in PATCH_KEYS.iter().zip(slots) {
        if let Some(v) = v {
            attrs.push(wire_attr(k, v)?);
        }
    }
    Ok(attrs)
}

/// Une entrée du patch → entrée du cœur (contrôle 1 de T7) : clé inconnue ou valeur au mauvais type : `BadFormat`.
fn wire_attr(k: &str, v: Option<WireValue>) -> Result<TextAttr, CommandError> {
    Ok(match (k, v) {
        ("bold", None) => TextAttr::Bold(false),
        ("bold", Some(WireValue::Bool(b))) => TextAttr::Bold(b),
        ("italic", None) => TextAttr::Italic(false),
        ("italic", Some(WireValue::Bool(b))) => TextAttr::Italic(b),
        ("underline", None) => TextAttr::Underline(false),
        ("underline", Some(WireValue::Bool(b))) => TextAttr::Underline(b),
        ("color", None) => TextAttr::Color(None),
        ("color", Some(WireValue::Text(s))) => TextAttr::Color(Some(s)),
        ("size", None) => TextAttr::Size(None),
        ("size", Some(WireValue::Number(n))) => TextAttr::Size(Some(n as f32)),
        ("font", None) => TextAttr::Font(None),
        ("font", Some(WireValue::Text(s))) => TextAttr::Font(Some(s)),
        _ => return Err(CommandError::BadFormat),
    })
}

/// Patch de la page → entrées du cœur (contrôle 1 de T7), dans l'ordre des clés : clé inconnue ou valeur au mauvais
/// type : `BadFormat`. Les valeurs hors domaine (couleur, police, taille) sont refusées ensuite par le cœur
/// (`valid_attrs`). Réservée aux tests (T11) : la liaison lit le patch par `read_patch`.
#[cfg(test)]
pub fn wire_attrs(
    patch: BTreeMap<String, Option<WireValue>>,
) -> Result<Vec<TextAttr>, CommandError> {
    patch.into_iter().map(|(k, v)| wire_attr(&k, v)).collect()
}

/// Clés connues d'un patch, dans l'ordre où une `BTreeMap<String, _>` les range : celui des entrées rendues.
const PATCH_KEYS: [&str; 6] = ["bold", "color", "font", "italic", "size", "underline"];

/// Lit la table du patch clé par clé (T10 : sans instancier `BTreeMap<String, Option<WireValue>>` dans le module) ;
/// une clé répétée garde sa dernière valeur, comme l'insertion dans une `BTreeMap`.
struct PatchVisitor;

impl<'de> serde::de::Visitor<'de> for PatchVisitor {
    type Value = PatchSlots;

    fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.write_str("un objet")
    }

    fn visit_map<A: serde::de::MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
        let mut slots = Self::Value::default();
        while let Some(k) = map.next_key::<String>()? {
            let Some(i) = PATCH_KEYS.iter().position(|p| *p == k) else {
                return Err(serde::de::Error::custom("clé inconnue"));
            };
            slots[i] = Some(map.next_value()?);
        }
        Ok(slots)
    }
}

/// Lit le patch de `format_text` : chaque valeur en `Option` (une clé à `null` est un retrait, jamais une erreur) ;
/// pas un objet, ou valeur ni booléen, ni nombre, ni chaîne : `BadFormat`. Générique sur le désérialiseur pour être
/// testée en natif (hors wasm32, `serde_wasm_bindgen` panique).
fn read_patch<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Vec<TextAttr>, CommandError> {
    let slots = d
        .deserialize_map(PatchVisitor)
        .map_err(|_| CommandError::BadFormat)?;
    entries_of(slots)
}

/// Objet `attrs` d'un segment, lu par le `PatchVisitor` de `format_text`.
struct AttrsSeed;

impl<'de> serde::de::DeserializeSeed<'de> for AttrsSeed {
    type Value = PatchSlots;

    fn deserialize<D: serde::Deserializer<'de>>(self, d: D) -> Result<PatchSlots, D::Error> {
        d.deserialize_map(PatchVisitor)
    }
}

/// Un segment `{ text, attrs }` : les deux clés exigées, aucune autre.
struct SpanVisitor;

impl<'de> serde::de::Visitor<'de> for SpanVisitor {
    type Value = (String, PatchSlots);

    fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.write_str("un segment { text, attrs }")
    }

    fn visit_map<A: serde::de::MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
        let (mut text, mut attrs) = (None, None);
        while let Some(k) = map.next_key::<String>()? {
            match k.as_str() {
                "text" => text = Some(map.next_value::<String>()?),
                "attrs" => attrs = Some(map.next_value_seed(AttrsSeed)?),
                _ => return Err(serde::de::Error::custom("clé inconnue")),
            }
        }
        match (text, attrs) {
            (Some(t), Some(a)) => Ok((t, a)),
            _ => Err(serde::de::Error::custom("segment incomplet")),
        }
    }
}

struct SpanSeed;

impl<'de> serde::de::DeserializeSeed<'de> for SpanSeed {
    type Value = (String, PatchSlots);

    fn deserialize<D: serde::Deserializer<'de>>(self, d: D) -> Result<Self::Value, D::Error> {
        d.deserialize_map(SpanVisitor)
    }
}

/// Liste de segments.
struct SpansVisitor;

impl<'de> serde::de::Visitor<'de> for SpansVisitor {
    type Value = Vec<(String, PatchSlots)>;

    fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.write_str("une liste de segments")
    }

    fn visit_seq<A: serde::de::SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
        let mut out = Vec::new();
        while let Some(s) = seq.next_element_seed(SpanSeed)? {
            out.push(s);
        }
        Ok(out)
    }
}

/// Segments voulus de `set_text` et `set_table_cell` (C7b, R7) : une liste d'objets `{ text, attrs }`, `attrs` lu comme
/// le patch de `format_text` ; pas une liste, clé inconnue, type faux : `BadFormat`. Les valeurs hors domaine sont
/// refusées ensuite par le cœur (`valid_spans`). Générique pour être testée en natif, comme `read_patch`.
fn read_spans_input<'de, D: serde::Deserializer<'de>>(
    d: D,
) -> Result<Vec<SpanInput>, CommandError> {
    let raw = d
        .deserialize_seq(SpansVisitor)
        .map_err(|_| CommandError::BadFormat)?;
    let mut out = Vec::with_capacity(raw.len());
    for (text, slots) in raw {
        out.push(SpanInput {
            text,
            attrs: SpanAttrs::from_entries(entries_of(slots)?),
        });
    }
    Ok(out)
}

/// Paramètre `spans` de la page : `undefined` ou `null` = absent (comportement d'avant C7b).
fn spans_arg(v: JsValue) -> Result<Option<Vec<SpanInput>>, CommandError> {
    if v.is_undefined() || v.is_null() {
        return Ok(None);
    }
    read_spans_input(serde_wasm_bindgen::Deserializer::from(v)).map(Some)
}

/// Grille reçue de JS (G12, E1) : `nums` = 7 nombres par niveau (`sx, sy, ox, oy, snap, visible, lineWidth`, booléens en
/// 0 ou 1) ;
/// longueurs incohérentes : `BadGrid`. Les valeurs elles-mêmes sont contrôlées par le cœur (`SetGrid`).
fn grid_input(
    visible: bool,
    snap: bool,
    above: bool,
    kinds: Vec<String>,
    colors: Vec<String>,
    lines: Vec<String>,
    nums: &[f64],
) -> Result<GridInput, CommandError> {
    let n = kinds.len();
    if colors.len() != n || lines.len() != n || nums.len() != 7 * n {
        return Err(CommandError::BadGrid);
    }
    let levels = kinds
        .into_iter()
        .zip(colors)
        .zip(lines)
        .zip(nums.as_chunks::<7>().0)
        .map(|(((kind, color), line), v)| GridLevelView {
            kind,
            spacing_x: v[0],
            spacing_y: v[1],
            origin_x: v[2],
            origin_y: v[3],
            color,
            line,
            line_width: v[6],
            snap: v[4] != 0.0,
            visible: v[5] != 0.0,
        })
        .collect();
    Ok(GridInput {
        visible,
        snap,
        above,
        levels,
    })
}

/// Document exposé à JavaScript.
#[wasm_bindgen]
pub struct Document {
    core: CoreDocument,
    created: Option<String>,
}

#[wasm_bindgen]
impl Document {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Document {
        Self::wrap(CoreDocument::new(), None)
    }

    /// Document de démarrage : une page à la disposition `mode` (absent : Paysage), hors historique (D37) ; mode
    /// illisible : Error « mode de page inconnu : <valeur> ». `blank()` reste la forme Rust sans argument.
    #[wasm_bindgen(js_name = blank)]
    pub fn blank_js(mode: Option<String>) -> Result<Document, JsError> {
        Ok(Self::blank_with(layout_arg(mode)?))
    }

    /// Document d'un PDF importé (C12, PF6) : `sizes` = largeurs et hauteurs en points bout à bout ; hors historique.
    /// Lève une Error au message du cœur (`BadAsset`, `BadImage`).
    pub fn from_pdf_pages(
        id: &str,
        name: &str,
        mime: &str,
        size: f64,
        sizes: Vec<f64>,
    ) -> Result<Document, JsError> {
        Self::from_pdf_pages_inner(asset_ref(id, name, mime, size), &sizes, None).map_err(cmd_err)
    }

    /// Document d'un fichier Office converti en PDF (C16, O17) : comme `from_pdf_pages`, chaque fond cite l'original
    /// (`original_*`, métadonnée écrite). Lève une Error au message du cœur (`BadAsset`, `BadImage`).
    #[allow(clippy::too_many_arguments)]
    pub fn from_office_pages(
        id: &str,
        name: &str,
        mime: &str,
        size: f64,
        sizes: Vec<f64>,
        original_id: &str,
        original_name: &str,
        original_mime: &str,
        original_size: f64,
    ) -> Result<Document, JsError> {
        let original = asset_ref(original_id, original_name, original_mime, original_size);
        Self::from_pdf_pages_inner(asset_ref(id, name, mime, size), &sizes, Some(original))
            .map_err(cmd_err)
    }

    /// Lève une Error dont le message est le `Display` de `FormatError`.
    pub fn load(bytes: &[u8]) -> Result<Document, JsError> {
        Self::load_inner(bytes).map_err(fmt_err)
    }

    pub fn save(&mut self, now: String, app_version: String) -> Result<Vec<u8>, JsError> {
        self.save_inner(&now, &app_version).map_err(fmt_err)
    }

    /// Ouvre un document depuis ses deux moitiés (K2) ; mêmes erreurs que `load`.
    pub fn load_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, JsError> {
        Self::load_parts_inner(manifest, ybin).map_err(fmt_err)
    }

    pub fn save_parts(&mut self, now: String, app_version: String) -> Result<SavedParts, JsError> {
        let p = self.save_parts_inner(&now, &app_version).map_err(fmt_err)?;
        Ok(SavedParts {
            manifest: p.manifest,
            ybin: p.ybin,
        })
    }

    /// Grouper (C3, Z1) : une étape ; `BadGroup` sinon.
    pub fn group(&mut self, ids: Vec<String>) -> Result<JsValue, JsError> {
        change_js(self.group_inner(ids))
    }

    /// Dégrouper le niveau extérieur (C3, Z1) ; aucun élément groupé : aucune étape.
    pub fn ungroup(&mut self, ids: Vec<String>) -> Result<JsValue, JsError> {
        change_js(self.ungroup_inner(ids))
    }

    /// Document neuf d'une page qui porte une recopie des éléments `ids` de `page` (C3, Z5) ; aucune étape.
    pub fn extract(&self, page: &str, ids: Vec<String>) -> Result<Document, JsError> {
        self.extract_inner(page, &ids).map_err(cmd_err)
    }

    /// Éléments de la première page de `src` en haut de `page`, translatés ; une étape (C3, Z5).
    pub fn insert_fragment(
        &mut self,
        src: &Document,
        page: &str,
        dx: f64,
        dy: f64,
    ) -> Result<JsValue, JsError> {
        change_js(self.insert_fragment_inner(src, page, dx, dy))
    }

    /// Pages de `src` à la suite de `after` ; une étape (C3, Z5, Z12).
    pub fn insert_pages(&mut self, src: &Document, after: &str) -> Result<JsValue, JsError> {
        change_js(self.insert_pages_inner(src, after))
    }

    /// `.rbitem` sans asset (C3, Z6).
    pub fn save_fragment(
        &self,
        now: String,
        app_version: String,
        name: String,
    ) -> Result<Vec<u8>, JsError> {
        self.save_fragment_inner(&now, &app_version, &name)
            .map_err(fmt_err)
    }

    /// Manifeste et `document.ybin` d'un fragment, pour le conteneur avec assets (C3, Z6).
    pub fn save_fragment_parts(
        &self,
        now: String,
        app_version: String,
        name: String,
    ) -> Result<SavedParts, JsError> {
        let p = self
            .save_fragment_parts_inner(&now, &app_version, &name)
            .map_err(fmt_err)?;
        Ok(SavedParts {
            manifest: p.manifest,
            ybin: p.ybin,
        })
    }

    /// Lit un `.rbitem` sans asset ; un document est refusé (`WrongKind`).
    pub fn load_fragment(bytes: &[u8]) -> Result<Document, JsError> {
        Self::load_fragment_inner(bytes).map_err(fmt_err)
    }

    /// Lit un fragment depuis ses deux moitiés ; mêmes erreurs que `load_fragment`.
    pub fn load_fragment_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, JsError> {
        Self::load_fragment_parts_inner(manifest, ybin).map_err(fmt_err)
    }

    /// `.rbitem` de grille sans asset (C4, D2).
    pub fn save_grid(
        &self,
        now: String,
        app_version: String,
        name: String,
    ) -> Result<Vec<u8>, JsError> {
        format::save_resource(
            &self.core,
            &Self::resource_meta(&now, &app_version),
            format::KIND_GRID,
            &name,
        )
        .map_err(fmt_err)
    }

    /// Manifeste et `document.ybin` d'une grille, pour le conteneur avec assets (C4).
    pub fn save_grid_parts(
        &self,
        now: String,
        app_version: String,
        name: String,
    ) -> Result<SavedParts, JsError> {
        let p = format::save_resource_parts(
            &self.core,
            &Self::resource_meta(&now, &app_version),
            format::KIND_GRID,
            &name,
        )
        .map_err(fmt_err)?;
        Ok(SavedParts {
            manifest: p.manifest,
            ybin: p.ybin,
        })
    }

    /// Lit un `.rbitem` de grille sans asset ; un autre type est refusé (`WrongKind`).
    pub fn load_grid(bytes: &[u8]) -> Result<Document, JsError> {
        let (core, _) = format::load_resource(bytes, format::KIND_GRID).map_err(fmt_err)?;
        Ok(Self::wrap(core, None))
    }

    /// Lit une grille depuis ses deux moitiés ; mêmes erreurs que `load_grid`.
    pub fn load_grid_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, JsError> {
        let (core, _) =
            format::load_resource_parts(manifest, ybin, format::KIND_GRID).map_err(fmt_err)?;
        Ok(Self::wrap(core, None))
    }

    /// Type d'un manifeste (`document`, `fragment`, `grid`) ; format, version ou `kind` inconnus : erreur du cœur.
    pub fn manifest_kind(manifest: &[u8]) -> Result<String, JsError> {
        format::manifest_kind(manifest)
            .map(String::from)
            .map_err(fmt_err)
    }

    /// Type d'un conteneur entier (repli sans le module des formats).
    pub fn container_kind(bytes: &[u8]) -> Result<String, JsError> {
        format::container_kind(bytes)
            .map(String::from)
            .map_err(fmt_err)
    }

    /// Vue de page (K7) ; `null` pour une page inconnue.
    pub fn page(&self, id: &str) -> Result<JsValue, JsError> {
        match self.core.page(id) {
            Some(p) => to_js(&p),
            None => Ok(JsValue::NULL),
        }
    }

    pub fn cited_assets(&self) -> Result<JsValue, JsError> {
        to_js(&self.core.cited_assets())
    }

    /// Métadonnée d'un asset (K3, K4) ; `null` si le cœur n'en rend aucune.
    pub fn asset(&self, id: &str) -> Result<JsValue, JsError> {
        match self.core.asset(id) {
            Some(a) => to_js(&a),
            None => Ok(JsValue::NULL),
        }
    }

    /// `matrix` : six nombres ; seule la référence de l'asset traverse la liaison, jamais ses octets (K13).
    #[allow(clippy::too_many_arguments)]
    pub fn add_image(
        &mut self,
        page: &str,
        asset: &str,
        name: &str,
        mime: &str,
        size: f64,
        w: f64,
        h: f64,
        matrix: &[f64],
    ) -> Result<JsValue, JsError> {
        change_js(self.add_image_inner(page, asset_ref(asset, name, mime, size), [w, h], matrix))
    }

    /// C14 (M5) : média ; `linked` = chemin lié (M30), `null` pour un média inclus ; `poster` = empreinte du poster,
    /// `null` sans poster (ses `poster_*` sont alors ignorés). Seules les références traversent la liaison.
    #[allow(clippy::too_many_arguments)]
    pub fn add_media(
        &mut self,
        page: &str,
        asset: &str,
        name: &str,
        mime: &str,
        size: f64,
        linked: Option<String>,
        media_type: &str,
        w: f64,
        h: f64,
        duration: f64,
        poster: Option<String>,
        poster_name: &str,
        poster_mime: &str,
        poster_size: f64,
        matrix: &[f64],
    ) -> Result<JsValue, JsError> {
        let poster = poster.map(|id| asset_ref(&id, poster_name, poster_mime, poster_size));
        change_js(self.add_media_inner(
            page,
            asset_ref(asset, name, mime, size),
            linked,
            media_type,
            [w, h, duration],
            poster,
            matrix,
        ))
    }

    /// C14 (M6) : réglages voulus d'un média ; `trim_end` `null` = jusqu'à la fin.
    pub fn set_media(
        &mut self,
        id: &str,
        trim_start: f64,
        trim_end: Option<f64>,
        looped: bool,
        volume: f64,
    ) -> Result<JsValue, JsError> {
        change_js(self.set_media_inner(id, trim_start, trim_end, looped, volume))
    }

    /// C15 (X7) : objet 3D ; `file_*` : fichiers liés, listes de même longueur (sinon `BadModel3d`) ; `snapshot` `null` :
    /// sans instantané (ses `snapshot_*` sont ignorés). Seules les références traversent la liaison.
    #[allow(clippy::too_many_arguments)]
    pub fn add_model3d(
        &mut self,
        page: &str,
        asset: &str,
        name: &str,
        mime: &str,
        size: f64,
        format: &str,
        file_paths: Vec<String>,
        file_ids: Vec<String>,
        file_names: Vec<String>,
        file_mimes: Vec<String>,
        file_sizes: Vec<f64>,
        w: f64,
        h: f64,
        yaw: f64,
        pitch: f64,
        snapshot: Option<String>,
        snapshot_name: &str,
        snapshot_mime: &str,
        snapshot_size: f64,
        matrix: &[f64],
    ) -> Result<JsValue, JsError> {
        let files = linked_files(
            &file_paths,
            &file_ids,
            &file_names,
            &file_mimes,
            &file_sizes,
        )
        .map_err(cmd_err)?;
        let snapshot =
            snapshot.map(|id| asset_ref(&id, snapshot_name, snapshot_mime, snapshot_size));
        change_js(self.add_model3d_inner(
            page,
            asset_ref(asset, name, mime, size),
            format,
            files,
            [w, h, yaw, pitch],
            snapshot,
            matrix,
        ))
    }

    /// C15 (X7) : vue voulue d'un objet 3D et son instantané (`null` : retiré).
    #[allow(clippy::too_many_arguments)]
    pub fn set_model3d_view(
        &mut self,
        id: &str,
        yaw: f64,
        pitch: f64,
        snapshot: Option<String>,
        snapshot_name: &str,
        snapshot_mime: &str,
        snapshot_size: f64,
    ) -> Result<JsValue, JsError> {
        let snapshot = snapshot.map(|s| asset_ref(&s, snapshot_name, snapshot_mime, snapshot_size));
        change_js(self.set_model3d_view_inner(id, yaw, pitch, snapshot))
    }

    /// Réglages d'une image (C5, I6) : état voulu complet et nouvelle matrice ; voir `image_params_input` pour la forme
    /// de `crop`, `color` et `transparent`. `restore` : « Rétablir l'original » (C6b, B11).
    #[allow(clippy::too_many_arguments)]
    pub fn set_image_params(
        &mut self,
        id: &str,
        crop: &[f64],
        flip_x: bool,
        flip_y: bool,
        quarter_turns: f64,
        brightness: f64,
        contrast: f64,
        color: Option<String>,
        transparent: &[f64],
        matrix: &[f64],
        restore: bool,
    ) -> Result<JsValue, JsError> {
        let params = image_params_input(
            crop,
            flip_x,
            flip_y,
            quarter_turns,
            brightness,
            contrast,
            color,
            transparent,
        )
        .map_err(cmd_err)?;
        change_js(self.set_image_params_inner(id, params, matrix, restore))
    }

    /// C14 (M30) : `[{ id, path }]` des assets cités et liés, triés par id.
    pub fn linked_assets(&self) -> Result<JsValue, JsError> {
        to_js(&self.core.linked_assets())
    }

    /// C14 (M30) : `ids[i]` reçoit `paths[i]` ; hors historique, version inchangée ; rend le nombre réécrit.
    pub fn relink_assets(&mut self, ids: Vec<String>, paths: Vec<String>) -> u32 {
        u32::try_from(self.relink_assets_inner(&ids, &paths)).unwrap_or(u32::MAX)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn set_backdrop(
        &mut self,
        page: &str,
        asset: &str,
        name: &str,
        mime: &str,
        size: f64,
        w: f64,
        h: f64,
        fit: &str,
    ) -> Result<JsValue, JsError> {
        let input = BackdropInput {
            asset: asset_ref(asset, name, mime, size),
            w,
            h,
            fit: fit.to_string(),
        };
        change_js(self.set_backdrop_inner(page, Some(input)))
    }

    pub fn clear_backdrop(&mut self, page: &str) -> Result<JsValue, JsError> {
        change_js(self.set_backdrop_inner(page, None))
    }

    /// Grille de page (U31, G12) ; voir `grid_input` pour la forme de `nums`.
    #[allow(clippy::too_many_arguments)]
    pub fn set_grid(
        &mut self,
        page: &str,
        visible: bool,
        snap: bool,
        above: bool,
        kinds: Vec<String>,
        colors: Vec<String>,
        lines: Vec<String>,
        nums: &[f64],
    ) -> Result<JsValue, JsError> {
        let grid = grid_input(visible, snap, above, kinds, colors, lines, nums).map_err(cmd_err)?;
        change_js(self.set_grid_inner(page, Some(grid)))
    }

    pub fn clear_grid(&mut self, page: &str) -> Result<JsValue, JsError> {
        change_js(self.set_grid_inner(page, None))
    }

    /// Aspect complet de N pages (personnalisation-1b, DA1) : `asset` absent = aucun fond image ; `grid` faux = aucune
    /// grille (les tableaux qui suivent sont alors ignorés). `nums` comme `set_grid` (`grid_input`).
    #[allow(clippy::too_many_arguments)]
    pub fn apply_background(
        &mut self,
        pages: Vec<String>,
        color: &str,
        asset: Option<String>,
        name: &str,
        mime: &str,
        size: f64,
        w: f64,
        h: f64,
        fit: &str,
        grid: bool,
        visible: bool,
        snap: bool,
        above: bool,
        kinds: Vec<String>,
        colors: Vec<String>,
        lines: Vec<String>,
        nums: &[f64],
    ) -> Result<JsValue, JsError> {
        let backdrop = asset.map(|id| BackdropInput {
            asset: asset_ref(&id, name, mime, size),
            w,
            h,
            fit: fit.to_string(),
        });
        let grid = if grid {
            Some(grid_input(visible, snap, above, kinds, colors, lines, nums).map_err(cmd_err)?)
        } else {
            None
        };
        change_js(self.apply_background_inner(pages, color, backdrop, grid))
    }

    /// Tableau (C10a, T13) : `cols`, `rows` en u32 ; une valeur hors des u32 arrive comme u32::MAX (`toU32` de la page),
    /// refusée en `BadTable`.
    #[allow(clippy::too_many_arguments)]
    pub fn add_table(
        &mut self,
        page: &str,
        x: f64,
        y: f64,
        cols: u32,
        rows: u32,
        col_width: f64,
        row_height: f64,
        color: &str,
        size: f64,
    ) -> Result<JsValue, JsError> {
        change_js(self.add_table_inner(
            page,
            [x, y],
            [cols, rows],
            [col_width, row_height],
            color,
            size,
        ))
    }

    /// `row`, `col` : ids ; `row_height` : hauteur exigée mesurée par la page (T5) ; `spans` : C7b, état voulu des
    /// segments (`undefined` : absent).
    pub fn set_table_cell(
        &mut self,
        id: &str,
        row: &str,
        col: &str,
        content: &str,
        row_height: Option<f64>,
        spans: JsValue,
    ) -> Result<JsValue, JsError> {
        let spans = spans_arg(spans).map_err(cmd_err)?;
        change_js(self.set_table_cell_inner(id, [row, col], content, row_height, spans))
    }

    /// `row` : vrai pour une ligne, faux pour une colonne.
    pub fn insert_table_line(&mut self, id: &str, row: bool, at: u32) -> Result<JsValue, JsError> {
        change_js(self.insert_table_line_inner(id, row, at))
    }

    /// `to` : dernière ligne de la plage (C10b, F6) ; absent : `line` seule.
    pub fn remove_table_line(
        &mut self,
        id: &str,
        row: bool,
        line: &str,
        to: Option<String>,
    ) -> Result<JsValue, JsError> {
        change_js(self.remove_table_line_inner(id, row, line, to))
    }

    pub fn set_table_sizes(
        &mut self,
        id: &str,
        col_width: f64,
        row_height: f64,
    ) -> Result<JsValue, JsError> {
        change_js(self.set_table_sizes_inner(id, col_width, row_height))
    }

    /// `fill` absent ou null : retire le remplissage ; `to_row`, `to_col` : autre coin de la plage (C10b, F15).
    pub fn set_table_fill(
        &mut self,
        id: &str,
        row: &str,
        col: &str,
        fill: Option<String>,
        to_row: Option<String>,
        to_col: Option<String>,
    ) -> Result<JsValue, JsError> {
        let to = match (&to_row, &to_col) {
            (Some(r), Some(c)) => Some([r.as_str(), c.as_str()]),
            _ => None,
        };
        change_js(self.set_table_fill_inner(id, [row, col], to, fill))
    }

    /// Fusion (C10b, F3) : rectangle par ids.
    pub fn merge_table_cells(
        &mut self,
        id: &str,
        from_row: &str,
        from_col: &str,
        to_row: &str,
        to_col: &str,
    ) -> Result<JsValue, JsError> {
        change_js(self.merge_table_cells_inner(id, [from_row, from_col], [to_row, to_col]))
    }

    /// Division (C10b, F4) : `row`, `col` = ancre.
    pub fn split_table_cell(&mut self, id: &str, row: &str, col: &str) -> Result<JsValue, JsError> {
        change_js(self.split_table_cell_inner(id, [row, col]))
    }

    /// Ombrage (C10b, F9) : `shade` absent ou null : retire (révéler).
    pub fn set_table_shade(
        &mut self,
        id: &str,
        from_row: &str,
        from_col: &str,
        to_row: &str,
        to_col: &str,
        shade: Option<String>,
    ) -> Result<JsValue, JsError> {
        change_js(self.set_table_shade_inner(id, [from_row, from_col], [to_row, to_col], shade))
    }

    /// personnalisation-3 (D3) : `table`, `row`, `col` tous présents = case visée, sinon sortie de case ; `size_keys` =
    /// triplets (tableau, "row" | "col", ligne) bout à bout, `size_values` une taille par triplet.
    #[allow(clippy::too_many_arguments)]
    pub fn place_in_cell(
        &mut self,
        ids: Vec<String>,
        matrix: &[f64],
        table: Option<String>,
        row: Option<String>,
        col: Option<String>,
        size_keys: Vec<String>,
        size_values: &[f64],
    ) -> Result<JsValue, JsError> {
        let cell = cell_of(table, row, col).map_err(cmd_err)?;
        change_js(self.place_in_cell_inner(ids, matrix, cell, &size_keys, size_values))
    }

    /// personnalisation-3 (D4) : ids et tailles de même longueur, sinon `BadTable`.
    pub fn set_table_line_sizes(
        &mut self,
        id: &str,
        col_ids: Vec<String>,
        col_widths: &[f64],
        row_ids: Vec<String>,
        row_heights: &[f64],
    ) -> Result<JsValue, JsError> {
        change_js(self.set_table_line_sizes_inner(id, &col_ids, col_widths, &row_ids, row_heights))
    }

    /// personnalisation-3 (T7) : `fit` (`"grow"` ou `"shrink"`) et `header`, seulement ce qui est donné.
    pub fn set_table_options(
        &mut self,
        id: &str,
        fit: Option<String>,
        header: Option<bool>,
    ) -> Result<JsValue, JsError> {
        change_js(self.set_table_options_inner(id, fit, header))
    }

    /// personnalisation-3 (T9) : l'image logée `from` devient le fond de la case (`row`, `col`) ; `None` retire le fond.
    pub fn set_cell_image(
        &mut self,
        id: &str,
        row: &str,
        col: &str,
        from: Option<String>,
    ) -> Result<JsValue, JsError> {
        change_js(self.set_cell_image_inner(id, row, col, from))
    }

    /// Tableau rempli (C10b, F18) : `matrix` six nombres, `merges` quadruplets bout à bout.
    #[allow(clippy::too_many_arguments)]
    pub fn import_table(
        &mut self,
        page: &str,
        matrix: &[f64],
        col_width: f64,
        row_heights: &[f64],
        cols: u32,
        cells: Vec<String>,
        merges: &[u32],
        color: &str,
        size: f64,
    ) -> Result<JsValue, JsError> {
        change_js(self.import_table_inner(
            page,
            matrix,
            col_width,
            row_heights,
            cols,
            cells,
            merges,
            color,
            size,
        ))
    }

    /// Point aimanté `[x, y]` (G6) ; `undefined` sans accroche.
    pub fn snap_point(&self, page: &str, x: f64, y: f64) -> Option<Vec<f64>> {
        self.core.snap_point(page, x, y).map(|(a, b)| vec![a, b])
    }

    /// Déplacement aimanté `[dx, dy]` (G7), brut sans accroche.
    pub fn snap_delta(&self, page: &str, ids: Vec<String>, dx: f64, dy: f64) -> Vec<f64> {
        let (a, b) = self.core.snap_delta(page, &ids, dx, dy);
        vec![a, b]
    }

    /// Lignes visibles (G9) dans le rectangle monde ; `null` sans grille ou grille invisible.
    #[allow(clippy::too_many_arguments)]
    pub fn grid_lines(
        &self,
        page: &str,
        x0: f64,
        y0: f64,
        x1: f64,
        y1: f64,
        min_step: f64,
        min_dot_step: f64,
    ) -> Result<JsValue, JsError> {
        match self
            .core
            .grid_lines(page, Bounds { x0, y0, x1, y1 }, min_step, min_dot_step)
        {
            Some(g) => to_js(&g),
            None => Ok(JsValue::NULL),
        }
    }

    /// Lignes d'une grille non enregistrée (C9 éditeur, DAE1) : même calcul que `grid_lines` ; `nums` comme `set_grid`,
    /// `view` = `x0, y0, x1, y1, min_step, min_dot_step` (autre longueur : `BadGrid`). `null` : page inconnue ou grille
    /// invisible. Rien n'est écrit.
    #[allow(clippy::too_many_arguments)]
    pub fn grid_lines_of(
        &self,
        page: &str,
        visible: bool,
        snap: bool,
        above: bool,
        kinds: Vec<String>,
        colors: Vec<String>,
        lines: Vec<String>,
        nums: &[f64],
        view: &[f64],
    ) -> Result<JsValue, JsError> {
        let grid = grid_input(visible, snap, above, kinds, colors, lines, nums).map_err(cmd_err)?;
        match self
            .grid_lines_of_inner(page, &grid, view)
            .map_err(cmd_err)?
        {
            Some(g) => to_js(&g),
            None => Ok(JsValue::NULL),
        }
    }

    pub fn add_page(&mut self) {
        self.core.add_page();
    }

    pub fn page_count(&self) -> u32 {
        self.core.page_count()
    }

    pub fn page_ids(&self) -> Vec<String> {
        self.core.page_ids()
    }

    pub fn element_ids(&self, page: &str) -> Vec<String> {
        self.core.element_ids(page)
    }

    /// OE23 (Q7) : ids de `page` dont le `kind` brut vaut `kind`, dans l'ordre de la page ; page inconnue : vide.
    pub fn element_ids_of_kind(&self, page: &str, kind: &str) -> Vec<String> {
        self.core.element_ids_of_kind(page, kind)
    }

    /// `mode` illisible : Error « mode de page inconnu : <valeur> », avant tout contrôle de la page.
    pub fn add_page_after(
        &mut self,
        after: Option<String>,
        mode: Option<String>,
    ) -> Result<JsValue, JsError> {
        let layout = layout_arg(mode)?;
        change_js(self.add_page_after_mode_inner(after, layout))
    }

    pub fn remove_page(&mut self, page: &str) -> Result<JsValue, JsError> {
        change_js(self.remove_page_inner(page))
    }

    /// Disposition d'une page (`landscape`, `portrait`, `infinite`) ; illisible : Error « mode de page inconnu : … ».
    pub fn set_page_mode(&mut self, page: &str, mode: &str) -> Result<JsValue, JsError> {
        let layout = page_layout(mode).map_err(|m| JsError::new(&m))?;
        change_js(self.set_page_mode_inner(page, layout))
    }

    pub fn move_page(&mut self, page: &str, to: u32) -> Result<JsValue, JsError> {
        change_js(self.move_page_inner(page, to))
    }

    pub fn duplicate_page(&mut self, page: &str) -> Result<JsValue, JsError> {
        change_js(self.duplicate_page_inner(page))
    }

    /// Ordre des objets (décision 16) : les `ids` en un bloc dont le bas est au rang `to` (0 = arrière-plan), ids
    /// gardés, une étape ; même ordre : aucune ; pages mêlées : Error « objets de pages différentes ».
    pub fn restack(&mut self, ids: Vec<String>, to: u32) -> Result<JsValue, JsError> {
        change_js(self.restack_inner(ids, to))
    }

    /// OG11 : les onze arguments après `width` sont l'aspect (`look_of`, `variability` en dernier, OG23), contrôlé
    /// avant tout le reste ; personnalisation-3 : les trois derniers, la case qui loge le trait (`cell_of`).
    #[allow(clippy::too_many_arguments)]
    pub fn commit_stroke(
        &mut self,
        page: &str,
        points: &[f32],
        color: &str,
        width: f32,
        stroke_style: Option<String>,
        roughness: Option<f64>,
        seed: Option<f64>,
        roundness: Option<String>,
        opacity: Option<f64>,
        fill_style: Option<String>,
        start_arrowhead: Option<String>,
        end_arrowhead: Option<String>,
        text_align: Option<String>,
        link: Option<String>,
        variability: Option<String>,
        cell_table: Option<String>,
        cell_row: Option<String>,
        cell_col: Option<String>,
    ) -> Result<JsValue, JsError> {
        let named = [
            fill_style,
            start_arrowhead,
            end_arrowhead,
            text_align,
            link,
            variability,
        ];
        let look =
            look_of(stroke_style, roughness, seed, roundness, opacity, named).map_err(cmd_err)?;
        let cell = cell_of(cell_table, cell_row, cell_col).map_err(cmd_err)?;
        change_js(self.commit_stroke_inner(page, points, color, width, look, cell))
    }

    pub fn erase(
        &mut self,
        page: &str,
        path: &[f32],
        radius: f32,
        object: bool,
    ) -> Result<JsValue, JsError> {
        change_js(self.erase_inner(page, path, radius, object))
    }

    pub fn delete(&mut self, ids: Vec<String>) -> Result<JsValue, JsError> {
        change_js(self.delete_inner(ids))
    }

    #[allow(clippy::too_many_arguments)]
    pub fn add_shape(
        &mut self,
        page: &str,
        shape: &str,
        x0: f64,
        y0: f64,
        x1: f64,
        y1: f64,
        color: &str,
        width: f32,
        fill: Option<String>,
        stroke_style: Option<String>,
        roughness: Option<f64>,
        seed: Option<f64>,
        roundness: Option<String>,
        opacity: Option<f64>,
        fill_style: Option<String>,
        start_arrowhead: Option<String>,
        end_arrowhead: Option<String>,
        text_align: Option<String>,
        link: Option<String>,
        variability: Option<String>,
        elbowed: Option<bool>,
        points: Option<Vec<f64>>,
        start_id: Option<String>,
        start_fixed: Option<Vec<f64>>,
        end_id: Option<String>,
        end_fixed: Option<Vec<f64>>,
    ) -> Result<JsValue, JsError> {
        let named = [
            fill_style,
            start_arrowhead,
            end_arrowhead,
            text_align,
            link,
            variability,
        ];
        let mut look =
            look_of(stroke_style, roughness, seed, roundness, opacity, named).map_err(cmd_err)?;
        look.elbowed = elbowed;
        let line = LineInit {
            points: points.unwrap_or_default(),
            start: binding_arg(start_id, start_fixed).map_err(cmd_err)?,
            end: binding_arg(end_id, end_fixed).map_err(cmd_err)?,
        };
        change_js(self.add_shape_inner(
            page,
            shape,
            [x0, y0, x1, y1],
            color,
            width,
            fill,
            look,
            line,
        ))
    }

    /// OG12 (n° 12 b) : tous les points en monde (≥ 2) et les liaisons ; une étape.
    pub fn set_line_points(
        &mut self,
        id: &str,
        points: Vec<f64>,
        start_id: Option<String>,
        start_fixed: Option<Vec<f64>>,
        end_id: Option<String>,
        end_fixed: Option<Vec<f64>>,
    ) -> Result<JsValue, JsError> {
        let start = binding_arg(start_id, start_fixed).map_err(cmd_err)?;
        let end = binding_arg(end_id, end_fixed).map_err(cmd_err)?;
        change_js(self.set_line_points_inner(id, points, start, end))
    }

    /// OG12 lot 2a (n° 34) : rectangle, losange ou ellipse devient une ligne fermée ; une étape.
    pub fn shape_to_polygon(&mut self, id: &str) -> Result<JsValue, JsError> {
        to_js(&self.shape_to_polygon_inner(id).map_err(cmd_err)?)
    }

    /// OG12 (n° 27) : copie et flèche coudée liée ; direction inconnue : `BadShape`.
    pub fn add_linked(&mut self, id: &str, dir: &str) -> Result<JsValue, JsError> {
        change_js(self.add_linked_inner(id, dir))
    }

    /// OG12 (n° 17) : cible de liaison la plus proche ; `null` sans cible.
    pub fn bind_target(&self, page: &str, x: f64, y: f64, tol: f32) -> Result<JsValue, JsError> {
        to_js(&self.core.bind_target(page, x, y, tol))
    }

    /// OG11 (déc. 25) : `SetStyle`. Un champ `*_set` à faux laisse le champ ; à vrai avec `None`, le retire. Le tracé
    /// arrive en `f64` (entier 0..=2 vérifié ici), l'opacité en `f64` (0..=100, arrondie par le cœur) ; hors bornes :
    /// « style invalide », rien d'écrit ; rien ne change : aucune étape.
    #[allow(clippy::too_many_arguments)]
    pub fn set_style(
        &mut self,
        ids: Vec<String>,
        color: Option<String>,
        width: Option<f32>,
        fill_set: bool,
        fill: Option<String>,
        stroke_style_set: bool,
        stroke_style: Option<String>,
        roughness: Option<f64>,
        roundness_set: bool,
        roundness: Option<String>,
        opacity: Option<f64>,
        fill_style_set: bool,
        fill_style: Option<String>,
        start_arrowhead_set: bool,
        start_arrowhead: Option<String>,
        end_arrowhead_set: bool,
        end_arrowhead: Option<String>,
        text_align_set: bool,
        text_align: Option<String>,
        link_set: bool,
        link: Option<String>,
        variability_set: bool,
        variability: Option<String>,
        drag_copy: Option<bool>,
        elbowed_set: bool,
        elbowed: Option<bool>,
    ) -> Result<JsValue, JsError> {
        let patch = StylePatch {
            color,
            width,
            fill: fill_set.then_some(fill),
            stroke_style: stroke_style_set.then_some(stroke_style),
            roughness: roughness_arg(roughness).map_err(cmd_err)?,
            roundness: roundness_set.then_some(roundness),
            opacity,
            fill_style: fill_style_set.then_some(fill_style),
            start_arrowhead: start_arrowhead_set.then_some(start_arrowhead),
            end_arrowhead: end_arrowhead_set.then_some(end_arrowhead),
            text_align: text_align_set.then_some(text_align),
            link: link_set.then_some(link),
            variability: variability_set.then_some(variability),
            drag_copy,
            elbowed: elbowed_set.then_some(elbowed),
        };
        change_js(self.set_style_inner(ids, patch))
    }

    /// Avec un `id`, `page`, `x` et `y` ne placent rien (la position passe par `transform`) ; `x` et `y` restent
    /// contrôlés finis par le cœur.
    #[allow(clippy::too_many_arguments)]
    pub fn set_text(
        &mut self,
        page: &str,
        id: Option<String>,
        x: f64,
        y: f64,
        content: &str,
        color: &str,
        size: f32,
        box_width: f64,
        box_height: f64,
        spans: JsValue,
        stroke_style: Option<String>,
        roughness: Option<f64>,
        seed: Option<f64>,
        roundness: Option<String>,
        opacity: Option<f64>,
        fill_style: Option<String>,
        start_arrowhead: Option<String>,
        end_arrowhead: Option<String>,
        text_align: Option<String>,
        link: Option<String>,
        variability: Option<String>,
    ) -> Result<JsValue, JsError> {
        let named = [
            fill_style,
            start_arrowhead,
            end_arrowhead,
            text_align,
            link,
            variability,
        ];
        let look =
            look_of(stroke_style, roughness, seed, roundness, opacity, named).map_err(cmd_err)?;
        let spans = spans_arg(spans).map_err(cmd_err)?;
        change_js(self.set_text_inner(
            page,
            id,
            [x, y],
            content,
            color,
            size,
            [box_width, box_height],
            spans,
            look,
        ))
    }

    /// OG23 (DA-2) : aligner, répartir, retourner, tourner `ids` en une étape (`how` : `align-left` … `rotate-ccw`) ;
    /// `how` inconnu : Error « disposition inconnue : <how> », levée avant la commande (le faux cœur lève la même).
    pub fn arrange(&mut self, ids: Vec<String>, how: &str) -> Result<JsValue, JsError> {
        let how = arrange_how(how).map_err(|m| JsError::new(&m))?;
        change_js(self.arrange_inner(ids, how))
    }

    /// `matrix` : six nombres `a, b, c, d, e, f`, composés à gauche de la matrice de chaque élément.
    pub fn transform(&mut self, ids: Vec<String>, matrix: &[f64]) -> Result<JsValue, JsError> {
        change_js(self.transform_inner(ids, matrix))
    }

    /// C7 : `attrs` = patch `TextAttrsPatch` sans clé `undefined` (retirées par `wasm-core.ts`, T7) ; `null` = retrait ;
    /// `start`, `len` en unités UTF-16 du contenu.
    pub fn format_text(
        &mut self,
        id: &str,
        start: u32,
        len: u32,
        attrs: JsValue,
        box_height: Option<f64>,
    ) -> Result<JsValue, JsError> {
        let attrs = read_patch(serde_wasm_bindgen::Deserializer::from(attrs)).map_err(cmd_err)?;
        change_js(self.format_text_inner(id, start, len, attrs, box_height))
    }

    pub fn element(&self, id: &str) -> Result<JsValue, JsError> {
        match self.core.element(id) {
            Some(e) => to_js(&e),
            None => Ok(JsValue::NULL),
        }
    }

    pub fn points(&self, id: &str) -> Option<Vec<f32>> {
        self.core.stroke_points(id).map(|p| to_flat(&p))
    }

    /// Contour local, mis en cache par le cœur (`Document::cached_outline`, partagé avec la collision).
    pub fn outline(&self, id: &str) -> Option<Vec<f32>> {
        self.core.outline(id)
    }

    /// Anneaux locaux d'un `fill` (C8, Q12) : `[n, x0, y0, …]` par anneau ; absent pour tout autre élément.
    pub fn fill_rings(&self, id: &str) -> Option<Vec<f32>> {
        self.core.fill_rings(id)
    }

    pub fn hit_test(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<String> {
        self.core.hit_test(page, x, y, tol)
    }

    /// Pot (C6a, D12) : `target` = "edge", "inside" ou "background" ; `id` exigé sauf pour le fond ; `color` absent ou
    /// null : « Aucune ».
    pub fn fill(
        &mut self,
        page: &str,
        target: &str,
        id: Option<String>,
        color: Option<String>,
    ) -> Result<JsValue, JsError> {
        change_js(self.fill_inner(page, target, id.as_deref(), color))
    }

    /// Pot sur une image (C6b, B2) : nouvel asset (empreinte, nom, type, taille) et couleur contrôlée (absente ou null :
    /// « Aucune », zone effacée) ; voir `Document::cmd_fill_image`.
    #[allow(clippy::too_many_arguments)]
    pub fn fill_image(
        &mut self,
        page: &str,
        id: &str,
        asset: &str,
        name: &str,
        mime: &str,
        size: f64,
        color: Option<String>,
    ) -> Result<JsValue, JsError> {
        change_js(self.fill_image_inner(page, id, asset_ref(asset, name, mime, size), color))
    }

    /// Pot dans une zone fermée (C8, Q10) : `x`, `y`, `tol` en monde ; `color` absent ou null : « Aucune » ; voir
    /// `Document::cmd_fill_zone`.
    pub fn fill_zone(
        &mut self,
        page: &str,
        x: f64,
        y: f64,
        tol: f64,
        color: Option<String>,
    ) -> Result<JsValue, JsError> {
        change_js(self.fill_zone_inner(page, x, y, tol, color))
    }

    /// Cellules du masque d'un clic du pot sur `page` à `tol` (C8, Q18, `data-zone-cells`), lecture seule.
    pub fn zone_cells(&self, page: &str, tol: f64) -> u32 {
        self.core.zone_cells(page, tol)
    }

    /// Bord d'un rectangle ou d'une ellipse (C6a, DA2), lecture seule ; `tol` en unités monde.
    pub fn edge_hit(&self, id: &str, x: f64, y: f64, tol: f32) -> bool {
        self.core.edge_hit(id, x, y, tol)
    }

    pub fn hit_test_path(&self, page: &str, path: &[f32], radius: f32) -> Vec<String> {
        self.core.hit_test_path(page, path, radius)
    }

    pub fn ids_in_rect(&self, page: &str, x0: f64, y0: f64, x1: f64, y1: f64) -> Vec<String> {
        self.core.ids_in_rect(page, Bounds { x0, y0, x1, y1 })
    }

    pub fn bounds(&self, ids: Vec<String>) -> Result<JsValue, JsError> {
        match self.core.bounds(&ids) {
            Some(b) => to_js(&b),
            None => Ok(JsValue::NULL),
        }
    }

    pub fn undo(&mut self) -> Result<JsValue, JsError> {
        to_js(&self.undo_inner())
    }

    pub fn redo(&mut self) -> Result<JsValue, JsError> {
        to_js(&self.redo_inner())
    }

    pub fn can_undo(&self) -> bool {
        self.core.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.core.can_redo()
    }

    pub fn version(&self) -> f64 {
        self.core.version() as f64
    }
}

impl Document {
    /// Document de démarrage : une page, hors historique (D37).
    pub fn blank() -> Document {
        Self::blank_with(None)
    }

    /// Document de démarrage dont la page a la disposition `layout` (`CoreDocument::blank_with`).
    pub fn blank_with(layout: Option<PageLayout>) -> Document {
        Self::wrap(CoreDocument::blank_with(layout), None)
    }

    fn wrap(core: CoreDocument, created: Option<String>) -> Document {
        Document { core, created }
    }

    fn run(&mut self, cmd: Command) -> Result<Change, CommandError> {
        self.core.apply(cmd)
    }

    pub fn load_inner(bytes: &[u8]) -> Result<Document, FormatError> {
        let (core, manifest) = format::load_with_manifest(bytes)?;
        Ok(Self::wrap(core, Some(manifest.created)))
    }

    /// Couples `(w, h)` lus bout à bout ; une longueur impaire est refusée en `BadImage`. C16 : `original` cité par
    /// chaque fond.
    pub fn from_pdf_pages_inner(
        asset: AssetRef,
        sizes: &[f64],
        original: Option<AssetRef>,
    ) -> Result<Document, CommandError> {
        if !sizes.len().is_multiple_of(2) {
            return Err(CommandError::BadImage);
        }
        let pairs: Vec<(f64, f64)> = sizes
            .as_chunks::<2>()
            .0
            .iter()
            .map(|c| (c[0], c[1]))
            .collect();
        CoreDocument::from_pdf_pages(&asset, &pairs, original.as_ref())
            .map(|core| Self::wrap(core, None))
    }

    fn save_meta(&self, now: &str, app_version: &str) -> SaveMeta {
        SaveMeta {
            app_version: app_version.to_string(),
            now: now.to_string(),
            created: self.created.clone(),
        }
    }

    fn mark_saved(&mut self, now: &str) {
        if self.created.is_none() {
            self.created = Some(now.to_string());
        }
    }

    /// Le premier enregistrement fixe `created` ; les suivants le recopient (D24).
    pub fn save_inner(&mut self, now: &str, app_version: &str) -> Result<Vec<u8>, FormatError> {
        let bytes = format::save(&self.core, &self.save_meta(now, app_version))?;
        self.mark_saved(now);
        Ok(bytes)
    }

    /// Même règle de `created` que `save_inner` (D24), partagée entre les deux enregistrements.
    pub fn save_parts_inner(&mut self, now: &str, app_version: &str) -> Result<Parts, FormatError> {
        let parts = format::save_parts(&self.core, &self.save_meta(now, app_version))?;
        self.mark_saved(now);
        Ok(parts)
    }

    pub fn load_parts_inner(manifest: &[u8], ybin: &[u8]) -> Result<Document, FormatError> {
        let (core, m) = format::load_parts(manifest, ybin)?;
        Ok(Self::wrap(core, Some(m.created)))
    }

    pub fn group_inner(&mut self, ids: Vec<String>) -> Result<Change, CommandError> {
        self.run(Command::Group { ids })
    }

    pub fn ungroup_inner(&mut self, ids: Vec<String>) -> Result<Change, CommandError> {
        self.run(Command::Ungroup { ids })
    }

    pub fn extract_inner(&self, page: &str, ids: &[String]) -> Result<Document, CommandError> {
        Ok(Self::wrap(self.core.extract(page, ids)?, None))
    }

    pub fn insert_fragment_inner(
        &mut self,
        src: &Document,
        page: &str,
        dx: f64,
        dy: f64,
    ) -> Result<Change, CommandError> {
        self.core.insert_fragment(&src.core, page, dx, dy)
    }

    pub fn insert_pages_inner(
        &mut self,
        src: &Document,
        after: &str,
    ) -> Result<Change, CommandError> {
        self.core.insert_pages(&src.core, after)
    }

    /// Une ressource (fragment, grille) n'a pas d'historique d'enregistrement : `created` = maintenant.
    fn resource_meta(now: &str, app_version: &str) -> SaveMeta {
        SaveMeta {
            app_version: app_version.to_string(),
            now: now.to_string(),
            created: None,
        }
    }

    pub fn save_fragment_inner(
        &self,
        now: &str,
        app_version: &str,
        name: &str,
    ) -> Result<Vec<u8>, FormatError> {
        format::save_fragment(&self.core, &Self::resource_meta(now, app_version), name)
    }

    pub fn save_fragment_parts_inner(
        &self,
        now: &str,
        app_version: &str,
        name: &str,
    ) -> Result<Parts, FormatError> {
        format::save_fragment_parts(&self.core, &Self::resource_meta(now, app_version), name)
    }

    pub fn load_fragment_inner(bytes: &[u8]) -> Result<Document, FormatError> {
        let (core, _) = format::load_fragment(bytes)?;
        Ok(Self::wrap(core, None))
    }

    pub fn load_fragment_parts_inner(
        manifest: &[u8],
        ybin: &[u8],
    ) -> Result<Document, FormatError> {
        let (core, _) = format::load_fragment_parts(manifest, ybin)?;
        Ok(Self::wrap(core, None))
    }

    /// Longueur de matrice différente de 6 : `BadMatrix`.
    pub fn add_image_inner(
        &mut self,
        page: &str,
        asset: AssetRef,
        size: [f64; 2],
        matrix: &[f64],
    ) -> Result<Change, CommandError> {
        let m: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        self.run(Command::AddImage {
            page: page.to_string(),
            asset,
            w: size[0],
            h: size[1],
            matrix: m,
        })
    }

    /// Longueur de matrice différente de 6 : `BadMatrix` ; type ni `video` ni `audio` : `BadMedia`.
    #[allow(clippy::too_many_arguments)]
    pub fn add_media_inner(
        &mut self,
        page: &str,
        asset: AssetRef,
        linked: Option<String>,
        media_type: &str,
        box_duration: [f64; 3],
        poster: Option<AssetRef>,
        matrix: &[f64],
    ) -> Result<Change, CommandError> {
        let m: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        let media_type = MediaType::parse(media_type).ok_or(CommandError::BadMedia)?;
        let [w, h, duration] = box_duration;
        self.run(Command::AddMedia {
            page: page.to_string(),
            asset,
            linked,
            media_type,
            w,
            h,
            duration,
            poster,
            matrix: m,
        })
    }

    /// Réglages d'une image (C5, I6) : état voulu complet et nouvelle matrice.
    pub fn set_image_params_inner(
        &mut self,
        id: &str,
        params: ImageParamsInput,
        matrix: &[f64],
        restore: bool,
    ) -> Result<Change, CommandError> {
        let m: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        self.run(Command::SetImageParams {
            id: id.to_string(),
            params,
            matrix: m,
            restore,
        })
    }

    pub fn set_media_inner(
        &mut self,
        id: &str,
        trim_start: f64,
        trim_end: Option<f64>,
        looped: bool,
        volume: f64,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetMedia {
            id: id.to_string(),
            trim_start,
            trim_end,
            looped,
            volume,
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub fn add_model3d_inner(
        &mut self,
        page: &str,
        asset: AssetRef,
        format: &str,
        files: Vec<(String, AssetRef)>,
        box_view: [f64; 4],
        snapshot: Option<AssetRef>,
        matrix: &[f64],
    ) -> Result<Change, CommandError> {
        let m: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        let format = Model3dFormat::parse(format).ok_or(CommandError::BadModel3d)?;
        let [w, h, yaw, pitch] = box_view;
        self.run(Command::AddModel3d {
            page: page.to_string(),
            asset,
            format,
            files,
            w,
            h,
            yaw,
            pitch,
            snapshot,
            matrix: m,
        })
    }

    pub fn set_model3d_view_inner(
        &mut self,
        id: &str,
        yaw: f64,
        pitch: f64,
        snapshot: Option<AssetRef>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetModel3dView {
            id: id.to_string(),
            yaw,
            pitch,
            snapshot,
        })
    }

    /// Paires (`ids[i]`, `paths[i]`) ; les éléments en trop de la plus longue liste sont ignorés.
    pub fn relink_assets_inner(&mut self, ids: &[String], paths: &[String]) -> usize {
        let links: Vec<LinkedAsset> = ids
            .iter()
            .zip(paths)
            .map(|(id, path)| LinkedAsset {
                id: id.clone(),
                path: path.clone(),
            })
            .collect();
        self.core.relink_assets(&links)
    }

    /// `None` : retire le fond.
    pub fn set_backdrop_inner(
        &mut self,
        page: &str,
        backdrop: Option<BackdropInput>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetBackdrop {
            page: page.to_string(),
            backdrop,
        })
    }

    /// `None` : retire la grille.
    pub fn set_grid_inner(
        &mut self,
        page: &str,
        grid: Option<GridInput>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetGrid {
            page: page.to_string(),
            grid,
        })
    }

    /// Couleur, grille et fond image de N pages en une étape (personnalisation-1b, DA1).
    pub fn apply_background_inner(
        &mut self,
        pages: Vec<String>,
        color: &str,
        backdrop: Option<BackdropInput>,
        grid: Option<GridInput>,
    ) -> Result<Change, CommandError> {
        self.run(Command::ApplyBackground {
            pages,
            color: color.to_string(),
            backdrop,
            grid,
        })
    }

    /// Voir `grid_lines_of` ; `view` = `x0, y0, x1, y1, min_step, min_dot_step`.
    pub fn grid_lines_of_inner(
        &self,
        page: &str,
        grid: &GridInput,
        view: &[f64],
    ) -> Result<Option<GridLines>, CommandError> {
        let [x0, y0, x1, y1, min_step, min_dot_step] = view else {
            return Err(CommandError::BadGrid);
        };
        let rect = Bounds {
            x0: *x0,
            y0: *y0,
            x1: *x1,
            y1: *y1,
        };
        Ok(self
            .core
            .grid_lines_of(page, grid, rect, *min_step, *min_dot_step))
    }

    pub fn add_table_inner(
        &mut self,
        page: &str,
        origin: [f64; 2],
        dims: [u32; 2],
        sizes: [f64; 2],
        color: &str,
        size: f64,
    ) -> Result<Change, CommandError> {
        self.run(Command::AddTable {
            page: page.to_string(),
            x: origin[0],
            y: origin[1],
            cols: dims[0],
            rows: dims[1],
            col_width: sizes[0],
            row_height: sizes[1],
            color: color.to_string(),
            size,
        })
    }

    pub fn set_table_cell_inner(
        &mut self,
        id: &str,
        cell: [&str; 2],
        content: &str,
        row_height: Option<f64>,
        spans: Option<Vec<SpanInput>>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableCell {
            id: id.to_string(),
            row: cell[0].to_string(),
            col: cell[1].to_string(),
            content: content.to_string(),
            row_height,
            spans,
        })
    }

    pub fn insert_table_line_inner(
        &mut self,
        id: &str,
        row: bool,
        at: u32,
    ) -> Result<Change, CommandError> {
        self.run(Command::InsertTableLine {
            id: id.to_string(),
            axis: table_axis(row),
            at,
        })
    }

    pub fn remove_table_line_inner(
        &mut self,
        id: &str,
        row: bool,
        line: &str,
        to: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::RemoveTableLine {
            id: id.to_string(),
            axis: table_axis(row),
            line: line.to_string(),
            to,
        })
    }

    pub fn set_table_sizes_inner(
        &mut self,
        id: &str,
        col_width: f64,
        row_height: f64,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableSizes {
            id: id.to_string(),
            col_width,
            row_height,
        })
    }

    pub fn set_table_fill_inner(
        &mut self,
        id: &str,
        cell: [&str; 2],
        to: Option<[&str; 2]>,
        fill: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableFill {
            id: id.to_string(),
            row: cell[0].to_string(),
            col: cell[1].to_string(),
            to: to.map(|[r, c]| (r.to_string(), c.to_string())),
            fill,
        })
    }

    pub fn merge_table_cells_inner(
        &mut self,
        id: &str,
        from: [&str; 2],
        to: [&str; 2],
    ) -> Result<Change, CommandError> {
        self.run(Command::MergeTableCells {
            id: id.to_string(),
            from: (from[0].to_string(), from[1].to_string()),
            to: (to[0].to_string(), to[1].to_string()),
        })
    }

    pub fn split_table_cell_inner(
        &mut self,
        id: &str,
        cell: [&str; 2],
    ) -> Result<Change, CommandError> {
        self.run(Command::SplitTableCell {
            id: id.to_string(),
            row: cell[0].to_string(),
            col: cell[1].to_string(),
        })
    }

    pub fn set_table_shade_inner(
        &mut self,
        id: &str,
        from: [&str; 2],
        to: [&str; 2],
        shade: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableShade {
            id: id.to_string(),
            from: (from[0].to_string(), from[1].to_string()),
            to: (to[0].to_string(), to[1].to_string()),
            shade,
        })
    }

    /// Matrice qui n'a pas six nombres : `BadMatrix` ; clés qui ne vont pas par trois ou axe inconnu : `BadTable`.
    pub fn place_in_cell_inner(
        &mut self,
        ids: Vec<String>,
        matrix: &[f64],
        cell: Option<[String; 3]>,
        size_keys: &[String],
        size_values: &[f64],
    ) -> Result<Change, CommandError> {
        let matrix: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        if size_keys.len() != 3 * size_values.len() {
            return Err(CommandError::BadTable);
        }
        let sizes = size_keys
            .chunks(3)
            .zip(size_values)
            .map(|(k, s)| {
                let axis = match k[1].as_str() {
                    "row" => TableAxis::Row,
                    "col" => TableAxis::Col,
                    _ => return Err(CommandError::BadTable),
                };
                Ok(LineSize {
                    table: k[0].clone(),
                    axis,
                    line: k[2].clone(),
                    size: *s,
                })
            })
            .collect::<Result<Vec<_>, _>>()?;
        self.run(Command::PlaceInCell {
            ids,
            matrix,
            cell,
            sizes,
        })
    }

    pub fn set_table_line_sizes_inner(
        &mut self,
        id: &str,
        col_ids: &[String],
        col_widths: &[f64],
        row_ids: &[String],
        row_heights: &[f64],
    ) -> Result<Change, CommandError> {
        if col_ids.len() != col_widths.len() || row_ids.len() != row_heights.len() {
            return Err(CommandError::BadTable);
        }
        self.run(Command::SetTableLineSizes {
            id: id.to_string(),
            cols: col_ids
                .iter()
                .cloned()
                .zip(col_widths.iter().copied())
                .collect(),
            rows: row_ids
                .iter()
                .cloned()
                .zip(row_heights.iter().copied())
                .collect(),
        })
    }

    pub fn set_table_options_inner(
        &mut self,
        id: &str,
        fit: Option<String>,
        header: Option<bool>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableOptions {
            id: id.to_string(),
            fit,
            header,
        })
    }

    pub fn set_cell_image_inner(
        &mut self,
        id: &str,
        row: &str,
        col: &str,
        from: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetCellImage {
            id: id.to_string(),
            row: row.to_string(),
            col: col.to_string(),
            from,
        })
    }

    /// Matrice qui n'a pas six nombres ou fusions qui ne vont pas par quatre : `BadTable` (comme le cœur, PC1).
    #[allow(clippy::too_many_arguments)]
    pub fn import_table_inner(
        &mut self,
        page: &str,
        matrix: &[f64],
        col_width: f64,
        row_heights: &[f64],
        cols: u32,
        cells: Vec<String>,
        merges: &[u32],
        color: &str,
        size: f64,
    ) -> Result<Change, CommandError> {
        let Ok(matrix) = <[f64; 6]>::try_from(matrix) else {
            return Err(CommandError::BadTable);
        };
        if !merges.len().is_multiple_of(4) {
            return Err(CommandError::BadTable);
        }
        let merges: Vec<[u32; 4]> = merges.as_chunks::<4>().0.to_vec();
        self.run(Command::ImportTable {
            page: page.to_string(),
            matrix,
            col_width,
            row_heights: row_heights.to_vec(),
            cols,
            cells,
            merges,
            color: color.to_string(),
            size,
        })
    }

    pub fn set_style_inner(
        &mut self,
        ids: Vec<String>,
        patch: StylePatch,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetStyle { ids, patch })
    }

    pub fn fill_inner(
        &mut self,
        page: &str,
        target: &str,
        id: Option<&str>,
        color: Option<String>,
    ) -> Result<Change, CommandError> {
        let target = match (target, id) {
            ("edge", Some(id)) => FillTarget::Edge { id: id.to_string() },
            ("inside", Some(id)) => FillTarget::Inside { id: id.to_string() },
            ("background", _) => FillTarget::Background,
            _ => return Err(CommandError::BadFill),
        };
        self.run(Command::Fill {
            page: page.to_string(),
            target,
            color,
        })
    }

    pub fn fill_image_inner(
        &mut self,
        page: &str,
        id: &str,
        asset: AssetRef,
        color: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::Fill {
            page: page.to_string(),
            target: FillTarget::Image {
                id: id.to_string(),
                asset,
            },
            color,
        })
    }

    pub fn fill_zone_inner(
        &mut self,
        page: &str,
        x: f64,
        y: f64,
        tol: f64,
        color: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::Fill {
            page: page.to_string(),
            target: FillTarget::Zone { x, y, tol },
            color,
        })
    }

    pub fn add_page_after_inner(&mut self, after: Option<String>) -> Result<Change, CommandError> {
        self.run(Command::add_page(after))
    }

    pub fn add_page_after_mode_inner(
        &mut self,
        after: Option<String>,
        mode: Option<PageLayout>,
    ) -> Result<Change, CommandError> {
        self.run(Command::AddPage { after, mode })
    }

    pub fn remove_page_inner(&mut self, page: &str) -> Result<Change, CommandError> {
        self.run(Command::RemovePage {
            page: page.to_string(),
        })
    }

    pub fn set_page_mode_inner(
        &mut self,
        page: &str,
        mode: PageLayout,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetPageMode {
            page: page.to_string(),
            mode,
        })
    }

    pub fn move_page_inner(&mut self, page: &str, to: u32) -> Result<Change, CommandError> {
        self.run(Command::MovePage {
            page: page.to_string(),
            to,
        })
    }

    pub fn duplicate_page_inner(&mut self, page: &str) -> Result<Change, CommandError> {
        self.run(Command::DuplicatePage {
            page: page.to_string(),
        })
    }

    pub fn arrange_inner(
        &mut self,
        ids: Vec<String>,
        how: ArrangeHow,
    ) -> Result<Change, CommandError> {
        self.run(Command::Arrange { ids, how })
    }

    pub fn restack_inner(&mut self, ids: Vec<String>, to: u32) -> Result<Change, CommandError> {
        self.run(Command::Restack { ids, to })
    }

    pub fn commit_stroke_inner(
        &mut self,
        page: &str,
        points: &[f32],
        color: &str,
        width: f32,
        look: Look,
        cell: Option<[String; 3]>,
    ) -> Result<Change, CommandError> {
        let style = StrokeStyle {
            color: color.to_string(),
            width,
        };
        self.run(Command::CommitStroke {
            page: page.to_string(),
            points: points.to_vec(),
            style,
            look,
            cell,
        })
    }

    pub fn erase_inner(
        &mut self,
        page: &str,
        path: &[f32],
        radius: f32,
        object: bool,
    ) -> Result<Change, CommandError> {
        let mode = if object {
            EraseMode::Object
        } else {
            EraseMode::Partial
        };
        self.run(Command::Erase {
            page: page.to_string(),
            path: path.to_vec(),
            radius,
            mode,
        })
    }

    pub fn delete_inner(&mut self, ids: Vec<String>) -> Result<Change, CommandError> {
        self.run(Command::Delete { ids })
    }

    /// Nom de forme inconnu : `BadShape`, comme des coins non finis.
    #[allow(clippy::too_many_arguments)]
    pub fn add_shape_inner(
        &mut self,
        page: &str,
        shape: &str,
        corners: [f64; 4],
        color: &str,
        width: f32,
        fill: Option<String>,
        look: Look,
        line: LineInit,
    ) -> Result<Change, CommandError> {
        let shape = ShapeKind::parse(shape).ok_or(CommandError::BadShape)?;
        let [x0, y0, x1, y1] = corners;
        self.run(Command::AddShape {
            page: page.to_string(),
            shape,
            x0,
            y0,
            x1,
            y1,
            style: StrokeStyle {
                color: color.to_string(),
                width,
            },
            fill,
            look,
            line,
        })
    }

    pub fn set_line_points_inner(
        &mut self,
        id: &str,
        points: Vec<f64>,
        start: Option<BindInput>,
        end: Option<BindInput>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetLinePoints {
            id: id.to_string(),
            points,
            start,
            end,
        })
    }

    pub fn shape_to_polygon_inner(&mut self, id: &str) -> Result<Change, CommandError> {
        self.run(Command::ShapeToPolygon { id: id.to_string() })
    }

    pub fn add_linked_inner(&mut self, id: &str, dir: &str) -> Result<Change, CommandError> {
        let dir = LinkDir::parse(dir).ok_or(CommandError::BadShape)?;
        self.run(Command::AddLinked {
            id: id.to_string(),
            dir,
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub fn set_text_inner(
        &mut self,
        page: &str,
        id: Option<String>,
        at: [f64; 2],
        content: &str,
        color: &str,
        size: f32,
        boxes: [f64; 2],
        spans: Option<Vec<SpanInput>>,
        look: Look,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetText {
            page: page.to_string(),
            id,
            x: at[0],
            y: at[1],
            content: content.to_string(),
            color: color.to_string(),
            size,
            box_width: boxes[0],
            box_height: boxes[1],
            spans,
            look,
        })
    }

    /// Longueur différente de 6 : `BadMatrix`, comme une matrice non finie ou non inversible.
    pub fn transform_inner(
        &mut self,
        ids: Vec<String>,
        matrix: &[f64],
    ) -> Result<Change, CommandError> {
        let m: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        self.run(Command::Transform { ids, matrix: m })
    }

    pub fn format_text_inner(
        &mut self,
        id: &str,
        start: u32,
        len: u32,
        attrs: Vec<TextAttr>,
        box_height: Option<f64>,
    ) -> Result<Change, CommandError> {
        self.run(Command::FormatText {
            id: id.to_string(),
            start,
            len,
            attrs,
            box_height,
        })
    }

    /// `full = true` (tout invalider) seulement si une étape a été défaite.
    pub fn undo_inner(&mut self) -> Change {
        let full = self.core.undo();
        Change {
            full,
            version: self.core.version(),
            ..Default::default()
        }
    }

    /// `full = true` (tout invalider) seulement si une étape a été refaite.
    pub fn redo_inner(&mut self) -> Change {
        let full = self.core.redo();
        Change {
            full,
            version: self.core.version(),
            ..Default::default()
        }
    }
}

impl Default for Document {
    fn default() -> Self {
        Self::new()
    }
}

/// Encre vive (D20, DA7) : la page pousse les points accumulés une fois par image. `push` rend les polygones
/// séparés par une paire NaN, NaN.
#[wasm_bindgen]
pub struct StrokeBuilder(CoreBuilder);

#[wasm_bindgen]
impl StrokeBuilder {
    #[wasm_bindgen(constructor)]
    /// OG23 : `constant` (`variability: "constant"`) donne l'encre vive à épaisseur constante, comme le contour final.
    pub fn new(width: f32, constant: bool) -> StrokeBuilder {
        StrokeBuilder(CoreBuilder::new(InkStyle { width, constant }))
    }

    pub fn push(&mut self, points: &[f32]) -> Vec<f32> {
        self.0.push(points)
    }

    /// Comme `push`, contour prolongé par des points provisoires (prédits) que le trait ne garde pas (OF44).
    pub fn push_ahead(&mut self, points: &[f32], ahead: &[f32]) -> Vec<f32> {
        self.0.push_ahead(points, ahead)
    }

    pub fn finish(&self) -> Vec<f32> {
        self.0.finish()
    }

    pub fn point_count(&self) -> u32 {
        self.0.points().len() as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use roomboard_core::rich_text::{SpanAttrs, SpanInput};

    // Constat C2-2 : un lien de case incomplet est refusé, jamais lu comme « aucun lien ».
    #[test]
    fn cell_of_refuses_partial_triplet() {
        let s = |v: &str| Some(v.to_string());
        assert_eq!(cell_of(None, None, None), Ok(None));
        assert_eq!(
            cell_of(s("t"), s("r"), s("c")),
            Ok(Some(["t".into(), "r".into(), "c".into()]))
        );
        assert_eq!(cell_of(s("t"), s("r"), None), Err(CommandError::BadTable));
        assert_eq!(cell_of(None, None, s("c")), Err(CommandError::BadTable));
    }

    // personnalisation-1b (DA1) : deux pages, une étape, par `apply_background_inner`.
    #[test]
    fn apply_background_inner_two_pages_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let q = d.core.add_page();
        let c = d
            .apply_background_inner(vec![p.clone(), q.clone()], "#1f2a2e", None, None)
            .expect("fond");
        assert_eq!(c.pages, vec![p.clone(), q.clone()]);
        assert_eq!(d.core.page(&q).expect("page").background, "#1f2a2e");
        assert!(d.core.undo());
        assert_eq!(d.core.page(&p).expect("page").background, "#ffffff");
        assert_eq!(d.core.page(&q).expect("page").background, "#ffffff");
    }

    // C8 (Q10, Q18) : pot dans une zone fermée par son `_inner` ; cellules du masque.
    #[test]
    fn fill_zone_inner_fills_a_square_of_strokes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        for pts in [
            [100.0, 100.0, 0.5, 500.0, 100.0, 0.5],
            [500.0, 100.0, 0.5, 500.0, 500.0, 0.5],
            [500.0, 500.0, 0.5, 100.0, 500.0, 0.5],
            [100.0, 500.0, 0.5, 100.0, 100.0, 0.5],
        ] {
            d.commit_stroke_inner(&p, &pts, "#000000", 4.0, Look::default(), None)
                .expect("trait");
        }
        assert!(d.zone_cells(&p, 2.0) > 160_000);
        let c = d
            .fill_zone_inner(&p, 300.0, 300.0, 2.0, Some("#facc15".into()))
            .expect("zone");
        assert_eq!(c.ids.len(), 1);
        assert_eq!(d.core.element_ids(&p).len(), 5);
        assert_eq!(
            d.fill_zone_inner(&p, 300.0, 300.0, 0.0, None),
            Err(CommandError::BadFill)
        );
    }

    fn c3_rect(d: &mut Document, p: &str, x: f64) -> String {
        d.add_shape_inner(
            p,
            "rect",
            [x, 100.0, x + 50.0, 150.0],
            "#000000",
            4.0,
            None,
            Look::default(),
            LineInit::default(),
        )
        .expect("forme")
        .ids[0]
            .clone()
    }

    #[test]
    fn c3_group_and_ungroup_inner() {
        let mut d = Document::blank();
        let p = d.core.page_ids()[0].clone();
        let a = c3_rect(&mut d, &p, 0.0);
        let b = c3_rect(&mut d, &p, 100.0);
        assert_eq!(d.group_inner(vec![a.clone()]), Err(CommandError::BadGroup));
        assert_eq!(
            d.group_inner(vec![a.clone(), b.clone()])
                .expect("group")
                .ids
                .len(),
            2
        );
        assert!(d.core.element(&a).expect("vue").group.is_some());
        assert_eq!(
            d.ungroup_inner(vec![a.clone(), b])
                .expect("ungroup")
                .ids
                .len(),
            2
        );
        assert_eq!(d.core.element(&a).expect("vue").group, None);
    }

    #[test]
    fn c3_extract_insert_fragment_inner() {
        let mut s = Document::blank();
        let sp = s.core.page_ids()[0].clone();
        let a = c3_rect(&mut s, &sp, 0.0);
        let frag = s.extract_inner(&sp, &[a]).expect("extract");
        let mut d = Document::blank();
        let p = d.core.page_ids()[0].clone();
        let c = d
            .insert_fragment_inner(&frag, &p, 5.0, 5.0)
            .expect("insert");
        assert_eq!(c.ids.len(), 1);
        assert!(d.core.can_undo());
    }

    #[test]
    fn c3_insert_pages_inner() {
        let mut s = Document::blank();
        s.add_page_after_inner(None).expect("page");
        let mut d = Document::blank();
        let p = d.core.page_ids()[0].clone();
        assert_eq!(d.insert_pages_inner(&s, &p).expect("pages").pages.len(), 2);
        assert_eq!(d.core.page_count(), 3);
    }

    #[test]
    fn c3_fragment_save_load_inner() {
        let mut s = Document::blank();
        let sp = s.core.page_ids()[0].clone();
        let a = c3_rect(&mut s, &sp, 0.0);
        let frag = s.extract_inner(&sp, &[a]).expect("extract");
        let bytes = frag
            .save_fragment_inner("n", "v", "Sélection")
            .expect("save");
        assert_eq!(
            Document::load_fragment_inner(&bytes)
                .expect("load")
                .core
                .page_count(),
            1
        );
        let parts = frag
            .save_fragment_parts_inner("n", "v", "Sélection")
            .expect("parts");
        assert!(Document::load_fragment_parts_inner(&parts.manifest, &parts.ybin).is_ok());
    }

    #[test]
    fn c3_load_refuses_fragment() {
        let s = Document::blank();
        let sp = s.core.page_ids()[0].clone();
        let frag = s.extract_inner(&sp, &[]).expect("extract");
        let bytes = frag.save_fragment_inner("n", "v", "x").expect("save");
        assert!(matches!(
            Document::load_inner(&bytes),
            Err(FormatError::WrongKind { .. })
        ));
    }

    fn hline(y: f32) -> Vec<f32> {
        (0..=40)
            .flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5])
            .collect()
    }

    #[test]
    fn version_is_not_empty() {
        assert!(!version().is_empty());
    }

    #[test]
    fn wasm_document_counts_pages() {
        let mut d = Document::new();
        d.add_page();
        assert_eq!(d.page_count(), 1);
    }

    #[test]
    fn blank_has_one_page_and_nothing_to_undo() {
        let d = Document::blank();
        assert_eq!(d.page_ids().len(), 1);
        assert!(!d.can_undo());
    }

    #[test]
    fn commit_then_undo_inner() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d
            .commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0, Look::default(), None)
            .expect("commit");
        assert_eq!(c.ids.len(), 1);
        let u = d.undo_inner();
        assert!(u.full);
        assert!(d.element_ids(&p).is_empty());
    }

    #[test]
    fn erase_inner_partial_splits() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0, Look::default(), None)
            .expect("commit");
        let c = d
            .erase_inner(&p, &[300.0, 50.0, 300.0, 150.0], 10.0, false)
            .expect("gomme");
        assert_eq!((c.removed.len(), c.ids.len()), (1, 2));
    }

    #[test]
    fn outline_is_cached_and_stable() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0, Look::default(), None)
            .expect("commit")
            .ids[0]
            .clone();
        let first = d.outline(&id).expect("contour");
        assert!(!first.is_empty());
        let misses = d.core.outline_cache_misses();
        assert_eq!(d.outline(&id), Some(first));
        assert_eq!(
            d.core.outline_cache_misses(),
            misses,
            "second appel servi du cache"
        );
    }

    #[test]
    fn remove_last_page_inner_is_refused() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(d.remove_page_inner(&p), Err(CommandError::LastPage));
    }

    #[test]
    fn save_then_load_inner_keeps_elements() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0, Look::default(), None)
            .expect("commit");
        let bytes = d.save_inner("2026-11-16T12:00:00Z", "0.1.0").expect("save");
        let e = Document::load_inner(&bytes).expect("load");
        assert_eq!(e.element_ids(&p), d.element_ids(&p));
        assert_eq!(e.created.as_deref(), Some("2026-11-16T12:00:00Z"));
    }

    #[test]
    fn stroke_builder_push_and_finish() {
        let mut b = StrokeBuilder::new(6.0, false);
        assert!(!b.push(&hline(10.0)).is_empty());
        assert_eq!(b.point_count(), 41);
        assert!(!b.finish().is_empty());
    }

    #[test]
    fn parse_platform_knows_six_names() {
        for n in ["web", "windows", "macos", "linux", "android", "ipados"] {
            assert!(parse_platform(n).is_some(), "{n}");
        }
        assert!(parse_platform("amiga").is_none());
    }

    // Tests ajoutés : chacun rougit sous un défaut que les tests du plan laissent passer.

    /// D24 : la date de création d'un nouveau fichier est celle du premier enregistrement, pas du dernier.
    #[test]
    fn second_save_keeps_first_created() {
        let mut d = Document::blank();
        d.save_inner("2026-11-16T12:00:00Z", "0.1.0")
            .expect("premier save");
        let bytes = d
            .save_inner("2026-11-17T09:30:00Z", "0.1.0")
            .expect("second save");
        let e = Document::load_inner(&bytes).expect("load");
        assert_eq!(e.created.as_deref(), Some("2026-11-16T12:00:00Z"));
    }

    /// `full = true` seulement si une étape a été défaite ou refaite (sinon le moteur redessine tout pour rien).
    #[test]
    fn undo_and_redo_with_nothing_are_not_full() {
        let mut d = Document::blank();
        assert!(!d.undo_inner().full);
        assert!(!d.redo_inner().full);
    }

    /// Le message de l'Error JS est le `Display` du cœur, celui que `fake-core.ts` lève aussi.
    #[test]
    fn js_message_is_core_display() {
        assert_eq!(
            js_message(&CommandError::LastPage),
            "la dernière page ne se supprime pas"
        );
        assert_eq!(
            js_message(&CommandError::UnknownPage("p9".into())),
            "page inconnue : p9"
        );
    }

    // Lot 4 (T54) : les trois commandes neuves par leurs `_inner`.

    #[test]
    fn add_shape_inner_reads_back_shape() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d
            .add_shape_inner(
                &p,
                "ellipse",
                [10.0, 10.0, 30.0, 5.0],
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default(),
            )
            .expect("forme");
        let e = d.core.element(&c.ids[0]).expect("élément");
        assert_eq!(e.kind, "shape");
        assert_eq!(
            e.shape.map(|s| (s.shape, s.w, s.h, s.fill)),
            Some(("ellipse".to_string(), 20.0, 5.0, None))
        );
    }

    #[test]
    fn set_line_points_inner_rewrites_points() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_shape_inner(
                &p,
                "line",
                [0.0, 0.0, 50.0, 40.0],
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default(),
            )
            .expect("ligne")
            .ids[0]
            .clone();
        let c = d
            .set_line_points_inner(&id, vec![10.0, 10.0, 110.0, 90.0, 210.0, 10.0], None, None)
            .expect("points");
        assert_eq!(c.ids, vec![id.clone()]);
        let e = d.core.element(&id).expect("élément");
        let pts = e.shape.and_then(|s| s.points).expect("points lus");
        assert_eq!(pts, vec![100.0, 80.0]);
    }

    #[test]
    fn set_line_points_inner_one_point_is_bad_points() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_shape_inner(
                &p,
                "line",
                [0.0, 0.0, 50.0, 40.0],
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default(),
            )
            .expect("ligne")
            .ids[0]
            .clone();
        assert_eq!(
            d.set_line_points_inner(&id, vec![0.0, 0.0], None, None),
            Err(CommandError::BadPoints)
        );
    }

    #[test]
    fn add_linked_inner_unknown_dir_is_bad_shape() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_shape_inner(
                &p,
                "rect",
                [0.0, 0.0, 100.0, 50.0],
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default(),
            )
            .expect("rect")
            .ids[0]
            .clone();
        assert_eq!(
            d.add_linked_inner(&id, "diagonale"),
            Err(CommandError::BadShape)
        );
        assert_eq!(d.add_linked_inner(&id, "right").expect("lié").ids.len(), 2);
    }

    #[test]
    fn binding_arg_needs_id_and_two_numbers() {
        assert_eq!(binding_arg(None, None), Ok(None));
        assert_eq!(
            binding_arg(Some("a".into()), Some(vec![0.5, 1.0])),
            Ok(Some(BindInput {
                id: "a".into(),
                fx: 0.5,
                fy: 1.0
            }))
        );
        assert_eq!(
            binding_arg(Some("a".into()), Some(vec![0.5])),
            Err(CommandError::BadShape)
        );
        assert_eq!(
            binding_arg(Some("a".into()), None),
            Err(CommandError::BadShape)
        );
        assert_eq!(
            binding_arg(None, Some(vec![0.5, 1.0])),
            Err(CommandError::BadShape)
        );
    }

    #[test]
    fn add_shape_inner_unknown_kind_is_bad_shape() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(
            d.add_shape_inner(
                &p,
                "triangle",
                [0.0, 0.0, 1.0, 1.0],
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default()
            ),
            Err(CommandError::BadShape)
        );
    }

    #[test]
    fn set_text_inner_creates_and_removes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .set_text_inner(
                &p,
                None,
                [100.0, 200.0],
                "Bonjour",
                "#000000",
                36.0,
                [600.0, 45.0],
                None,
                Look::default(),
            )
            .expect("texte")
            .ids[0]
            .clone();
        assert_eq!(
            d.core.element(&id).and_then(|e| e.text).map(|t| t.content),
            Some("Bonjour".into())
        );
        let c = d
            .set_text_inner(
                &p,
                Some(id.clone()),
                [0.0, 0.0],
                "",
                "#000000",
                36.0,
                [600.0, 45.0],
                None,
                Look::default(),
            )
            .expect("vider");
        assert_eq!(c.removed, vec![id]);
    }

    #[test]
    fn transform_inner_checks_length() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0, Look::default(), None)
            .expect("trait")
            .ids[0]
            .clone();
        assert_eq!(
            d.transform_inner(vec![id.clone()], &[1.0, 0.0, 0.0, 1.0]),
            Err(CommandError::BadMatrix)
        );
        let c = d
            .transform_inner(vec![id.clone()], &[1.0, 0.0, 0.0, 1.0, 10.0, 0.0])
            .expect("translation");
        assert_eq!(c.ids, vec![id]);
    }

    /// Chaque nom désigne sa plateforme (un repli sur `Web` passerait `parse_platform_knows_six_names`).
    #[test]
    fn parse_platform_maps_each_name() {
        let got: Vec<Option<Platform>> = ["web", "windows", "macos", "linux", "android", "ipados"]
            .iter()
            .map(|n| parse_platform(n))
            .collect();
        assert_eq!(
            got,
            vec![
                Some(Platform::Web),
                Some(Platform::Windows),
                Some(Platform::MacOs),
                Some(Platform::Linux),
                Some(Platform::Android),
                Some(Platform::IPadOs),
            ]
        );
    }

    // C2 (T8) : image, fond, parties séparées, par leurs `_inner`.

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    fn png() -> AssetRef {
        AssetRef {
            id: ABC.into(),
            name: "photo.png".into(),
            mime: "image/png".into(),
            size: 3.0,
        }
    }

    #[test]
    fn add_image_inner_reads_back_image_and_meta() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d
            .add_image_inner(&p, png(), [640.0, 480.0], &[1.0, 0.0, 0.0, 1.0, 5.0, 6.0])
            .expect("image");
        let e = d.core.element(&c.ids[0]).expect("vue");
        assert_eq!(e.kind, "image");
        assert_eq!(d.core.cited_assets(), vec![png()]);
        assert_eq!(
            d.add_image_inner(&p, png(), [1.0, 1.0], &[1.0, 0.0]),
            Err(CommandError::BadMatrix)
        );
    }

    /// C14 : média lié ajouté, type inconnu refusé, réglages relus, lien réécrit hors historique.
    #[test]
    fn add_media_inner_then_set_media_and_links() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let webm = AssetRef {
            id: ABC.into(),
            name: "clip.webm".into(),
            mime: "video/webm".into(),
            size: 10.0,
        };
        let m = [1.0, 0.0, 0.0, 1.0, 5.0, 6.0];
        let c = d
            .add_media_inner(
                &p,
                webm.clone(),
                Some("clips/clip.webm".into()),
                "video",
                [320.0, 180.0, 2.5],
                None,
                &m,
            )
            .expect("média");
        let id = c.ids[0].clone();
        let e = d.core.element(&id).expect("vue");
        assert_eq!(e.kind, "media");
        assert_eq!(
            e.media.as_ref().map(|v| (v.media_type.as_str(), v.w, v.h)),
            Some(("video", 320.0, 180.0))
        );
        assert_eq!(
            d.add_media_inner(
                &p,
                webm.clone(),
                None,
                "hologram",
                [320.0, 180.0, 2.5],
                None,
                &m
            ),
            Err(CommandError::BadMedia)
        );
        assert_eq!(
            d.add_media_inner(
                &p,
                webm,
                None,
                "audio",
                [320.0, 180.0, 2.5],
                None,
                &[1.0, 0.0]
            ),
            Err(CommandError::BadMatrix)
        );
        d.set_media_inner(&id, 0.5, Some(2.0), true, 0.4)
            .expect("réglages");
        let v = d.core.element(&id).and_then(|v| v.media).expect("média");
        assert_eq!(
            (v.trim_start, v.trim_end, v.looped, v.volume),
            (0.5, Some(2.0), true, 0.4)
        );
        let version = d.core.version();
        assert_eq!(
            d.relink_assets_inner(&[ABC.to_string()], &["../clips/clip.webm".to_string()]),
            1
        );
        assert_eq!(d.core.version(), version);
        assert_eq!(
            d.core.linked_assets(),
            vec![LinkedAsset {
                id: ABC.into(),
                path: "../clips/clip.webm".into()
            }]
        );
    }

    /// C15 : objet 3D ajouté et relu, format inconnu et matrice de 5 refusés, vue relue, listes inégales refusées.
    #[test]
    fn add_model3d_inner_then_set_view() {
        use roomboard_core::model3d::{DEFAULT_PITCH, DEFAULT_YAW};
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let glb = AssetRef {
            id: ABC.into(),
            name: "chaise.glb".into(),
            mime: "model/gltf-binary".into(),
            size: 10.0,
        };
        let m = [1.0, 0.0, 0.0, 1.0, 5.0, 6.0];
        let view = [640.0, 480.0, DEFAULT_YAW, DEFAULT_PITCH];
        let files = linked_files(
            &["tex/a.png".to_string()],
            &[ABC.to_string()],
            &["a.png".to_string()],
            &["image/png".to_string()],
            &[3.0],
        )
        .expect("listes de même longueur");
        let c = d
            .add_model3d_inner(&p, glb.clone(), "glb", files, view, None, &m)
            .expect("objet 3D");
        let id = c.ids[0].clone();
        let e = d.core.element(&id).expect("vue");
        assert_eq!(e.kind, "model3d");
        assert_eq!(
            e.model3d
                .as_ref()
                .map(|v| (v.format.as_str(), v.w, v.h, v.files.len(), v.yaw)),
            Some(("glb", 640.0, 480.0, 1, DEFAULT_YAW))
        );
        assert_eq!(
            d.add_model3d_inner(&p, glb.clone(), "fbx", vec![], view, None, &m),
            Err(CommandError::BadModel3d)
        );
        assert_eq!(
            d.add_model3d_inner(&p, glb.clone(), "glb", vec![], view, None, &m[..5]),
            Err(CommandError::BadMatrix)
        );
        d.set_model3d_view_inner(&id, 1.0, -0.5, Some(glb))
            .expect("vue");
        let v = d
            .core
            .element(&id)
            .and_then(|v| v.model3d)
            .expect("objet 3D");
        assert_eq!(
            (v.yaw, v.pitch, v.snapshot.as_deref()),
            (1.0, -0.5, Some(ABC))
        );
        assert_eq!(
            linked_files(
                &["a.png".to_string(), "b.bin".to_string()],
                &[ABC.to_string()],
                &["a.png".to_string()],
                &["image/png".to_string()],
                &[3.0],
            ),
            Err(CommandError::BadModel3d)
        );
        assert_eq!(
            linked_files(&[], &[], &[], &[], &[1.0]),
            Err(CommandError::BadModel3d)
        );
    }

    // OG23 (T10) : départ de la baguette en 4e et 5e nombres ; toute autre longueur refusée.
    #[test]
    fn image_params_input_reads_seed() {
        let input = |t: &[f64]| {
            image_params_input(&[], false, false, 0.0, 0.0, 0.0, Some("#ffffff".into()), t)
                .map(|p| p.transparent.map(|t| (t.contiguous, t.x, t.y)))
        };
        assert_eq!(input(&[10.0, 0.0, 1.0]), Ok(Some((true, None, None))));
        assert_eq!(
            input(&[10.0, 0.0, 0.0, 4.0, 7.0]),
            Ok(Some((false, Some(4.0), Some(7.0))))
        );
        for bad in [
            &[10.0, 0.0, 1.0, 4.0][..],
            &[10.0, 0.0, 1.0, 4.0, 7.0, 1.0],
            &[10.0, 0.0],
        ] {
            assert_eq!(input(bad), Err(CommandError::BadImageParams), "{bad:?}");
        }
    }

    #[test]
    fn set_style_drag_copy_through_the_bridge() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_image_inner(&p, png(), [64.0, 48.0], &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0])
            .expect("image")
            .ids[0]
            .clone();
        let patch = |b: bool| StylePatch {
            drag_copy: Some(b),
            ..StylePatch::default()
        };
        let c = d
            .set_style_inner(vec![id.clone()], patch(true))
            .expect("pose");
        assert_eq!(c.ids, vec![id.clone()]);
        let look = |d: &Document| {
            d.core
                .element(&id)
                .and_then(|e| e.look)
                .and_then(|l| l.drag_copy)
        };
        assert_eq!(look(&d), Some(true));
        d.set_style_inner(vec![id.clone()], patch(false))
            .expect("retrait");
        assert_eq!(look(&d), None);
    }

    // C5 (I6) : réglages d'image par leur `_inner`.

    #[test]
    fn set_image_params_inner_writes_and_reads_back() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_image_inner(&p, png(), [640.0, 480.0], &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0])
            .expect("image")
            .ids[0]
            .clone();
        let params = image_params_input(
            &[0.0, 0.0, 320.0, 240.0],
            true,
            false,
            1.0,
            10.0,
            -10.0,
            Some("#ffffff".into()),
            &[10.0, 5.0, 1.0],
        )
        .expect("entrée");
        let c = d
            .set_image_params_inner(&id, params, &[1.0, 0.0, 0.0, 1.0, 5.0, 6.0], false)
            .expect("réglages");
        assert_eq!(c.ids, vec![id.clone()]);
        let i = d.core.element(&id).and_then(|e| e.image).expect("image");
        assert_eq!(
            (i.crop, i.flip_x, i.quarter_turns, i.brightness, i.contrast),
            (Some([0, 0, 320, 240]), true, 1, 10, -10)
        );
        assert_eq!(
            i.transparent
                .map(|t| (t.color, t.tolerance, t.soft, t.contiguous)),
            Some(("#ffffff".to_string(), 10, 5, true))
        );
        assert_eq!(
            d.set_image_params_inner(&id, ImageParamsInput::default(), &[1.0, 0.0], false),
            Err(CommandError::BadMatrix)
        );
    }

    // C6b (B2, B11) : pot sur image et « Rétablir l'original » par leurs `_inner`.
    #[test]
    fn fill_image_inner_and_restore_flag() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_image_inner(&p, png(), [640.0, 480.0], &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0])
            .expect("image")
            .ids[0]
            .clone();
        let next = AssetRef {
            id: "cd".repeat(32),
            name: "photo.png".into(),
            mime: "image/png".into(),
            size: 9.0,
        };
        let c = d
            .fill_image_inner(&p, &id, next.clone(), Some("#facc15".into()))
            .expect("remplissage");
        assert_eq!(c.ids, vec![id.clone()]);
        let i = d.core.element(&id).and_then(|e| e.image).expect("image");
        assert_eq!(
            (i.asset.as_str(), i.source_asset.as_deref()),
            (next.id.as_str(), Some(ABC))
        );
        assert_eq!(
            d.fill_image_inner(
                &p,
                &id,
                AssetRef {
                    id: "x".into(),
                    ..next.clone()
                },
                None
            ),
            Err(CommandError::BadAsset)
        );
        d.set_image_params_inner(
            &id,
            ImageParamsInput::default(),
            &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
            true,
        )
        .expect("rétablir");
        let i = d.core.element(&id).and_then(|e| e.image).expect("image");
        assert_eq!((i.asset.as_str(), i.source_asset), (ABC, None));
    }

    #[test]
    fn image_params_input_refuses_bad_shapes() {
        let none: &[f64] = &[];
        assert_eq!(
            image_params_input(&[1.0, 2.0], false, false, 0.0, 0.0, 0.0, None, none),
            Err(CommandError::BadImageParams)
        );
        assert_eq!(
            image_params_input(
                none,
                false,
                false,
                0.0,
                0.0,
                0.0,
                Some("#ffffff".into()),
                &[10.0]
            ),
            Err(CommandError::BadImageParams)
        );
        assert_eq!(
            image_params_input(none, false, false, 0.0, 0.0, 0.0, None, &[10.0, 0.0, 1.0]),
            Err(CommandError::BadImageParams)
        );
        assert_eq!(
            image_params_input(none, false, false, 0.0, 0.0, 0.0, None, none),
            Ok(ImageParamsInput::default())
        );
    }

    #[test]
    fn set_backdrop_inner_then_clear() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let input = BackdropInput {
            asset: png(),
            w: 1000.0,
            h: 500.0,
            fit: "width".into(),
        };
        d.set_backdrop_inner(&p, Some(input)).expect("fond");
        assert_eq!(
            d.core
                .page(&p)
                .and_then(|v| v.backdrop)
                .and_then(|b| b.rect)
                .map(|r| r.y1),
            Some(960.0)
        );
        d.set_backdrop_inner(&p, None).expect("retrait");
        assert_eq!(d.core.page(&p).and_then(|v| v.backdrop), None);
    }

    /// C12 (PF6) : couples `(w, h)` bout à bout ; longueur impaire refusée en `BadImage`.
    #[test]
    fn from_pdf_pages_inner_reads_pairs_and_refuses_odd_length() {
        let pdf = AssetRef {
            id: ABC.into(),
            name: "cours.pdf".into(),
            mime: "application/pdf".into(),
            size: 10.0,
        };
        let d = Document::from_pdf_pages_inner(pdf.clone(), &[612.0, 792.0, 792.0, 612.0], None)
            .expect("document");
        let ids = d.page_ids();
        let b = d.core.page(&ids[1]).and_then(|p| p.backdrop).expect("fond");
        assert_eq!(
            (ids.len(), b.page, b.w, b.h),
            (2, Some(1), Some(792.0), Some(612.0))
        );
        assert_eq!(
            Document::from_pdf_pages_inner(pdf, &[612.0], None).err(),
            Some(CommandError::BadImage)
        );
    }

    /// C16 (O17) : `from_office_pages` = `from_pdf_pages` + `original` sur chaque fond.
    #[test]
    fn from_pdf_pages_inner_with_original_sets_it_on_each_backdrop() {
        let sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        let pdf = AssetRef {
            id: ABC.into(),
            name: "cours.pdf".into(),
            mime: "application/pdf".into(),
            size: 10.0,
        };
        let docx = AssetRef {
            id: sha.into(),
            name: "cours.docx".into(),
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document".into(),
            size: 7.0,
        };
        let d = Document::from_pdf_pages_inner(pdf, &[612.0, 792.0, 792.0, 612.0], Some(docx))
            .expect("document");
        let o: Vec<Option<String>> = d
            .page_ids()
            .iter()
            .map(|id| {
                d.core
                    .page(id)
                    .and_then(|p| p.backdrop)
                    .and_then(|b| b.original)
            })
            .collect();
        assert_eq!(o, vec![Some(sha.to_string()), Some(sha.to_string())]);
    }

    #[test]
    fn save_parts_then_load_parts_inner_keeps_document_and_created() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.add_image_inner(&p, png(), [2.0, 2.0], &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0])
            .expect("image");
        let parts = d
            .save_parts_inner("2026-11-20T00:00:00Z", "0.1.0")
            .expect("parts");
        let mut e = Document::load_parts_inner(&parts.manifest, &parts.ybin).expect("load_parts");
        assert_eq!(e.core.cited_assets(), vec![png()]);
        let again = e
            .save_parts_inner("2026-11-21T00:00:00Z", "0.1.0")
            .expect("parts 2");
        let (_, m) =
            roomboard_core::format::load_parts(&again.manifest, &again.ybin).expect("relu");
        assert_eq!(m.created, "2026-11-20T00:00:00Z");
    }

    /// `save` et `save_parts` partagent `created` : un `save_parts` d'abord fixe la date que `save` recopie ensuite.
    #[test]
    fn save_parts_first_fixes_created_for_save() {
        let mut d = Document::blank();
        d.save_parts_inner("2026-11-20T00:00:00Z", "0.1.0")
            .expect("parts");
        let bytes = d.save_inner("2026-11-22T00:00:00Z", "0.1.0").expect("save");
        let e = Document::load_inner(&bytes).expect("load");
        assert_eq!(e.created.as_deref(), Some("2026-11-20T00:00:00Z"));
    }

    // C7 (T6) : liaison `format_text`, par `read_patch`, `wire_attrs` et `format_text_inner`.

    /// Valeur JS simulée en natif, lue comme par `serde_wasm_bindgen` : `null` donne `None` à une option, `()` sinon.
    #[derive(Clone, Copy)]
    enum Js {
        Null,
        Bool(bool),
        Num(f64),
        Str(&'static str),
    }

    impl<'de> serde::de::IntoDeserializer<'de> for Js {
        type Deserializer = Self;

        fn into_deserializer(self) -> Self {
            self
        }
    }

    impl<'de> serde::Deserializer<'de> for Js {
        type Error = serde::de::value::Error;

        fn deserialize_any<V: serde::de::Visitor<'de>>(
            self,
            v: V,
        ) -> Result<V::Value, Self::Error> {
            match self {
                Js::Null => v.visit_unit(),
                Js::Bool(b) => v.visit_bool(b),
                Js::Num(n) => v.visit_f64(n),
                Js::Str(s) => v.visit_str(s),
            }
        }

        fn deserialize_option<V: serde::de::Visitor<'de>>(
            self,
            v: V,
        ) -> Result<V::Value, Self::Error> {
            match self {
                Js::Null => v.visit_none(),
                _ => v.visit_some(self),
            }
        }

        serde::forward_to_deserialize_any! {
            bool i8 i16 i32 i64 i128 u8 u16 u32 u64 u128 f32 f64 char str string bytes byte_buf unit unit_struct
            newtype_struct seq tuple tuple_struct map struct enum identifier ignored_any
        }
    }

    fn read(pairs: Vec<(&'static str, Js)>) -> Result<Vec<TextAttr>, CommandError> {
        read_patch(serde::de::value::MapDeserializer::<
            _,
            serde::de::value::Error,
        >::new(pairs.into_iter()))
    }

    /// Patron écarté (T6) : lu en `HashMap<String, WireValue>` sans `Option`, un `null` de la page (retrait) serait
    /// une erreur ; lu sans contrôle de type, `bold: "oui"` passerait. Les deux rougissent ici, à la désérialisation.
    #[test]
    fn read_patch_takes_null_as_removal_and_checks_types() {
        assert_eq!(
            read(vec![
                ("color", Js::Null),
                ("bold", Js::Null),
                ("size", Js::Num(72.0)),
                ("italic", Js::Bool(true)),
            ]),
            Ok(vec![
                TextAttr::Bold(false),
                TextAttr::Color(None),
                TextAttr::Italic(true),
                TextAttr::Size(Some(72.0))
            ])
        );
        assert_eq!(
            read(vec![("font", Js::Str("Georgia")), ("underline", Js::Null)]),
            Ok(vec![
                TextAttr::Font(Some("Georgia".into())),
                TextAttr::Underline(false)
            ])
        );
        for bad in [
            ("bold", Js::Str("oui")),
            ("size", Js::Str("72")),
            ("color", Js::Num(5.0)),
            ("font", Js::Bool(true)),
            ("href", Js::Null),
        ] {
            assert_eq!(read(vec![bad]), Err(CommandError::BadFormat), "{}", bad.0);
        }
    }

    fn patch(pairs: Vec<(&str, Option<WireValue>)>) -> BTreeMap<String, Option<WireValue>> {
        pairs.into_iter().map(|(k, v)| (k.to_string(), v)).collect()
    }

    /// T7 : `null` (None) et `false` retirent ; clé inconnue ou valeur au mauvais type : `BadFormat`.
    #[test]
    fn wire_attrs_maps_values_and_refuses_bad_ones() {
        assert_eq!(
            wire_attrs(patch(vec![
                ("bold", Some(WireValue::Bool(true))),
                ("color", None),
                ("size", Some(WireValue::Number(72.0))),
            ])),
            Ok(vec![
                TextAttr::Bold(true),
                TextAttr::Color(None),
                TextAttr::Size(Some(72.0))
            ])
        );
        assert_eq!(
            wire_attrs(patch(vec![
                ("bold", None),
                ("font", Some(WireValue::Text("Georgia".into()))),
                ("italic", Some(WireValue::Bool(false))),
            ])),
            Ok(vec![
                TextAttr::Bold(false),
                TextAttr::Font(Some("Georgia".into())),
                TextAttr::Italic(false)
            ])
        );
        for bad in [
            ("href", Some(WireValue::Text("x".into()))),
            ("bold", Some(WireValue::Text("oui".into()))),
            ("size", Some(WireValue::Text("72".into()))),
            ("color", Some(WireValue::Number(5.0))),
        ] {
            assert_eq!(wire_attrs(patch(vec![bad])), Err(CommandError::BadFormat));
        }
    }

    #[test]
    fn format_text_inner_formats_and_reads_spans() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .set_text_inner(
                &p,
                None,
                [100.0, 200.0],
                "Le chat noir",
                "#000000",
                36.0,
                [600.0, 45.0],
                None,
                Look::default(),
            )
            .expect("texte")
            .ids[0]
            .clone();
        let red = vec![TextAttr::Color(Some("#ff0000".into()))];
        let c = d
            .format_text_inner(&id, 3, 4, red, Some(60.0))
            .expect("format");
        assert_eq!(c.ids, vec![id.clone()]);
        let t = d.core.element(&id).and_then(|e| e.text).expect("texte");
        assert_eq!(t.box_height, 60.0);
        let texts: Vec<&str> = t.spans.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(texts, vec!["Le ", "chat", " noir"]);
        assert_eq!(t.spans[1].attrs.color.as_deref(), Some("#ff0000"));
        assert_eq!(
            d.format_text_inner("absent", 0, 1, vec![TextAttr::Bold(true)], None),
            Err(CommandError::UnknownElement("absent".into()))
        );
    }

    // C9 (T6) : grille de page par `grid_input` et `set_grid_inner`.

    fn squares(s: f64) -> GridLevelView {
        GridLevelView {
            kind: "squares".into(),
            spacing_x: s,
            spacing_y: s,
            origin_x: 0.0,
            origin_y: 0.0,
            color: "#cccccc".into(),
            line: "solid".into(),
            line_width: 1.0,
            snap: true,
            visible: true,
        }
    }

    /// G12, E1 : sept nombres par niveau, `sx, sy, ox, oy, snap, visible, lineWidth`, booléens en 0 ou 1.
    #[test]
    fn grid_input_reads_seven_numbers_per_level() {
        let g = grid_input(
            true,
            true,
            false,
            vec!["squares".into(), "dots".into()],
            vec!["#cccccc".into(), "#000000".into()],
            vec!["solid".into(), "dashed".into()],
            &[
                40.0, 40.0, 0.0, 0.0, 1.0, 1.0, 1.0, 20.0, 10.0, 5.0, -3.0, 0.0, 1.0, 2.5,
            ],
        )
        .expect("grille");
        assert_eq!((g.visible, g.snap, g.above), (true, true, false));
        assert_eq!(g.levels[0], squares(40.0));
        assert_eq!(
            g.levels[1],
            GridLevelView {
                kind: "dots".into(),
                spacing_x: 20.0,
                spacing_y: 10.0,
                origin_x: 5.0,
                origin_y: -3.0,
                color: "#000000".into(),
                line: "dashed".into(),
                line_width: 2.5,
                snap: false,
                visible: true,
            }
        );
    }

    /// G12 : longueurs incohérentes (dont l'ancienne forme à six nombres) → `BadGrid`.
    #[test]
    fn grid_input_rejects_inconsistent_lengths() {
        let s = |len: usize| vec![String::from("x"); len];
        for (k, c, l, n) in [
            (1, 1, 1, 6),
            (1, 1, 1, 8),
            (1, 0, 1, 7),
            (1, 1, 2, 7),
            (0, 0, 0, 7),
        ] {
            assert_eq!(
                grid_input(true, true, false, s(k), s(c), s(l), &vec![1.0; n]),
                Err(CommandError::BadGrid),
                "{k} {c} {l} {n}"
            );
        }
        assert!(grid_input(true, false, false, vec![], vec![], vec![], &[]).is_ok());
    }

    /// DAE1, S3 : `grid_lines_of_inner` = lignes de `grid_lines` après `SetGrid` de la même grille ; vue de longueur ≠ 6 :
    /// `BadGrid` ; page inconnue : `None`.
    #[test]
    fn grid_lines_of_inner_matches_grid_lines_after_set_grid() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let g = GridInput {
            visible: true,
            snap: true,
            above: false,
            levels: vec![GridLevelView {
                line_width: 2.0,
                ..squares(40.0)
            }],
        };
        let view = [0.0, 0.0, 100.0, 100.0, 4.0, 8.0];
        for bad in [&view[..5], &[0.0; 7][..]] {
            assert_eq!(
                d.grid_lines_of_inner(&p, &g, bad),
                Err(CommandError::BadGrid)
            );
        }
        let preview = d
            .grid_lines_of_inner(&p, &g, &view)
            .expect("vue")
            .expect("lignes");
        assert_eq!(preview.levels[0].line_width, 2.0);
        assert_eq!(d.grid_lines_of_inner("nulle-part", &g, &view), Ok(None));
        d.set_grid_inner(&p, Some(g)).expect("grille");
        let r = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 100.0,
        };
        assert_eq!(d.core.grid_lines(&p, r, 4.0, 8.0), Some(preview));
    }

    #[test]
    fn set_grid_inner_then_snap_lines_and_clear() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let g = GridInput {
            visible: true,
            snap: true,
            above: false,
            levels: vec![squares(40.0)],
        };
        let c = d.set_grid_inner(&p, Some(g.clone())).expect("grille");
        assert_eq!(c.pages, vec![p.clone()]);
        assert_eq!(d.core.page(&p).and_then(|v| v.grid), Some(g));
        assert_eq!(d.core.snap_point(&p, 118.0, 97.0), Some((120.0, 80.0)));
        let r = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 100.0,
        };
        let lines = d.core.grid_lines(&p, r, 4.0, 8.0).expect("visible");
        assert_eq!(lines.levels[0].segments.len(), (3 + 3) * 4);
        d.set_grid_inner(&p, None).expect("retrait");
        assert_eq!(d.core.page(&p).and_then(|v| v.grid), None);
    }

    /// G6, G7 : les méthodes de la liaison rendent `[x, y]` et `[dx, dy]` du cœur (S4, S3) ; élément aligné ramené à
    /// sa place → déplacement exactement nul ; sans élément, brut.
    #[test]
    fn binding_snap_point_and_snap_delta_return_pairs() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(d.snap_point(&p, 118.0, 97.0), None);
        let g = GridInput {
            visible: true,
            snap: true,
            above: false,
            levels: vec![squares(40.0)],
        };
        d.set_grid_inner(&p, Some(g)).expect("grille");
        assert_eq!(d.snap_point(&p, 118.0, 97.0), Some(vec![120.0, 80.0]));
        let mut rect = |c: [f64; 4]| {
            d.add_shape_inner(
                &p,
                "rect",
                c,
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default(),
            )
            .expect("forme")
            .ids[0]
                .clone()
        };
        let a = rect([13.0, 17.0, 113.0, 77.0]);
        let b = rect([70.0, 50.0, 170.0, 110.0]);
        assert_eq!(d.snap_delta(&p, vec![a], 52.0, 31.0), vec![57.0, 33.0]);
        assert_eq!(d.snap_delta(&p, vec![b], 1.3, 0.7), vec![0.0, 0.0]);
        assert_eq!(d.snap_delta(&p, vec![], 52.0, 31.0), vec![52.0, 31.0]);
    }

    // C10a (T6) : tableau par les `*_inner`.

    fn table_of(d: &Document, id: &str) -> roomboard_core::table::TableView {
        d.core.element(id).and_then(|e| e.table).expect("tableau")
    }

    #[test]
    fn add_table_inner_creates_and_refuses() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d
            .add_table_inner(&p, [100.0, 200.0], [4, 3], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau");
        let t = table_of(&d, &c.ids[0]);
        assert_eq!((t.cols.len(), t.rows.len()), (4, 3));
        assert_eq!(
            d.add_table_inner(
                &p,
                [0.0, 0.0],
                [u32::MAX, 3],
                [240.0, 64.0],
                "#000000",
                36.0
            ),
            Err(CommandError::BadTable)
        );
        assert_eq!(
            d.add_table_inner(&p, [0.0, 0.0], [0, 3], [240.0, 64.0], "#000000", 36.0),
            Err(CommandError::BadTable)
        );
    }

    #[test]
    fn table_cell_line_size_fill_inner() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_table_inner(&p, [0.0, 0.0], [2, 2], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau")
            .ids[0]
            .clone();
        let t = table_of(&d, &id);
        let (r0, c0) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        d.set_table_cell_inner(&id, [r0.as_str(), c0.as_str()], "Lundi", Some(150.0), None)
            .expect("cellule");
        assert_eq!(table_of(&d, &id).rows[0].height, 150.0);
        d.insert_table_line_inner(&id, false, 2).expect("colonne");
        assert_eq!(table_of(&d, &id).cols.len(), 3);
        d.remove_table_line_inner(&id, true, &r0, None)
            .expect("ligne");
        assert!(table_of(&d, &id).cells.is_empty());
        d.set_table_sizes_inner(&id, 200.0, 70.0).expect("uniforme");
        assert!(table_of(&d, &id).cols.iter().all(|c| c.width == 200.0));
        let t = table_of(&d, &id);
        let (r1, c1) = (t.rows[0].id.clone(), t.cols[1].id.clone());
        d.set_table_fill_inner(
            &id,
            [r1.as_str(), c1.as_str()],
            None,
            Some("#fef08a".into()),
        )
        .expect("jaune");
        assert_eq!(table_of(&d, &id).cells[0].fill.as_deref(), Some("#fef08a"));
        d.set_table_fill_inner(&id, [r1.as_str(), c1.as_str()], None, None)
            .expect("aucun");
        assert!(table_of(&d, &id).cells.is_empty());
    }

    // C10b (T7) : fusion, division, ombrage, plages, import par les `*_inner`.

    #[test]
    fn c10b_table_commands_inner() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_table_inner(&p, [0.0, 0.0], [3, 3], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau")
            .ids[0]
            .clone();
        let t = table_of(&d, &id);
        let r: Vec<&str> = t.rows.iter().map(|x| x.id.as_str()).collect();
        let c: Vec<&str> = t.cols.iter().map(|x| x.id.as_str()).collect();
        d.merge_table_cells_inner(&id, [r[0], c[0]], [r[0], c[1]])
            .expect("fusion");
        assert_eq!(table_of(&d, &id).merges.len(), 1);
        assert_eq!(
            d.split_table_cell_inner(&id, [r[0], c[1]]),
            Err(CommandError::BadTable)
        );
        d.split_table_cell_inner(&id, [r[0], c[0]])
            .expect("division");
        assert!(table_of(&d, &id).merges.is_empty());
        d.set_table_shade_inner(&id, [r[0], c[2]], [r[2], c[2]], Some("#94a3b8".into()))
            .expect("ombre");
        assert_eq!(
            table_of(&d, &id)
                .cells
                .iter()
                .filter(|x| x.shade.is_some())
                .count(),
            3
        );
        d.set_table_fill_inner(
            &id,
            [r[0], c[0]],
            Some([r[1], c[1]]),
            Some("#fef08a".into()),
        )
        .expect("plage");
        assert_eq!(
            table_of(&d, &id)
                .cells
                .iter()
                .filter(|x| x.fill.is_some())
                .count(),
            4
        );
        d.remove_table_line_inner(&id, true, r[0], Some(r[1].to_string()))
            .expect("deux lignes");
        assert_eq!(table_of(&d, &id).rows.len(), 1);
    }

    // personnalisation-3 (D3, D4) : `PlaceInCell` et `SetTableLineSizes` par les `*_inner`.
    #[test]
    fn place_in_cell_inner_links_and_sizes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_table_inner(&p, [0.0, 0.0], [3, 3], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau")
            .ids[0]
            .clone();
        let t = table_of(&d, &id);
        let s = d
            .add_shape_inner(
                &p,
                "rect",
                [1000.0, 1000.0, 1400.0, 1300.0],
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default(),
            )
            .expect("forme")
            .ids[0]
            .clone();
        let keys = vec![
            id.clone(),
            "col".into(),
            t.cols[1].id.clone(),
            id.clone(),
            "row".into(),
            t.rows[1].id.clone(),
        ];
        let cell = [id.clone(), t.rows[1].id.clone(), t.cols[1].id.clone()];
        d.place_in_cell_inner(
            vec![s.clone()],
            &[1.0, 0.0, 0.0, 1.0, -752.0, -928.0],
            Some(cell.clone()),
            &keys,
            &[416.0, 316.0],
        )
        .expect("logé");
        let after = table_of(&d, &id);
        assert_eq!((after.cols[1].width, after.rows[1].height), (416.0, 316.0));
        assert_eq!(d.core.element(&s).and_then(|e| e.cell), Some(cell));
        assert!(d
            .place_in_cell_inner(vec![s.clone()], &[1.0], None, &[], &[])
            .is_err());
        assert!(d
            .place_in_cell_inner(vec![s], &IDENTITY_6, None, &keys[..3], &[])
            .is_err());
        let bad_axis = vec![id.clone(), "diag".into(), t.cols[1].id.clone()];
        assert!(d
            .place_in_cell_inner(vec![], &IDENTITY_6, None, &bad_axis, &[300.0])
            .is_err());
        assert!(d
            .set_table_line_sizes_inner(&id, &[t.cols[0].id.clone()], &[], &[], &[])
            .is_err());
        d.set_table_line_sizes_inner(&id, &[t.cols[0].id.clone()], &[300.0], &[], &[])
            .expect("colonne");
        assert_eq!(table_of(&d, &id).cols[0].width, 300.0);
    }

    const IDENTITY_6: [f64; 6] = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

    #[test]
    fn import_table_inner_reads_flat_merges() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let cells: Vec<String> = ["Titre", "", "a", "b"].map(String::from).to_vec();
        let c = d
            .import_table_inner(
                &p,
                &[1.0, 0.0, 0.0, 1.0, 10.0, 20.0],
                240.0,
                &[64.0, 64.0],
                2,
                cells.clone(),
                &[0, 0, 1, 2],
                "#000000",
                36.0,
            )
            .expect("import");
        let t = table_of(&d, &c.ids[0]);
        assert_eq!((t.merges.len(), t.cells.len()), (1, 3));
        assert_eq!(
            d.import_table_inner(
                &p,
                &[1.0, 0.0, 0.0, 1.0],
                240.0,
                &[64.0, 64.0],
                2,
                cells.clone(),
                &[],
                "#000000",
                36.0
            ),
            Err(CommandError::BadTable),
            "matrice de quatre nombres"
        );
        assert_eq!(
            d.import_table_inner(
                &p,
                &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
                240.0,
                &[64.0, 64.0],
                2,
                cells,
                &[0, 0, 1],
                "#000000",
                36.0
            ),
            Err(CommandError::BadTable),
            "fusions incomplètes"
        );
    }

    #[test]
    fn table_inner_refuses_with_core_errors() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_table_inner(&p, [0.0, 0.0], [1, 1], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau")
            .ids[0]
            .clone();
        let t = table_of(&d, &id);
        assert_eq!(
            d.insert_table_line_inner(&id, true, u32::MAX),
            Err(CommandError::BadTable)
        );
        assert_eq!(
            d.remove_table_line_inner(&id, true, &t.rows[0].id, None),
            Err(CommandError::BadTable)
        );
        assert_eq!(
            d.set_table_cell_inner("absent", ["r", "c"], "x", None, None),
            Err(CommandError::UnknownElement("absent".into()))
        );
    }

    // C7b (T12) : segments voulus lus depuis la page ; `set_text_inner` et `set_table_cell_inner` avec `spans`.

    /// Valeur JS simulée en natif, objets et listes compris, lue comme par `serde_wasm_bindgen`.
    #[derive(Clone)]
    enum Jv {
        Null,
        Bool(bool),
        Num(f64),
        Str(&'static str),
        Map(Vec<(&'static str, Jv)>),
        List(Vec<Jv>),
    }

    impl<'de> serde::de::IntoDeserializer<'de> for Jv {
        type Deserializer = Self;

        fn into_deserializer(self) -> Self {
            self
        }
    }

    impl<'de> serde::Deserializer<'de> for Jv {
        type Error = serde::de::value::Error;

        fn deserialize_any<V: serde::de::Visitor<'de>>(
            self,
            v: V,
        ) -> Result<V::Value, Self::Error> {
            match self {
                Jv::Null => v.visit_unit(),
                Jv::Bool(b) => v.visit_bool(b),
                Jv::Num(n) => v.visit_f64(n),
                Jv::Str(s) => v.visit_str(s),
                Jv::Map(m) => v.visit_map(serde::de::value::MapDeserializer::new(m.into_iter())),
                Jv::List(l) => v.visit_seq(serde::de::value::SeqDeserializer::new(l.into_iter())),
            }
        }

        fn deserialize_option<V: serde::de::Visitor<'de>>(
            self,
            v: V,
        ) -> Result<V::Value, Self::Error> {
            match self {
                Jv::Null => v.visit_none(),
                _ => v.visit_some(self),
            }
        }

        serde::forward_to_deserialize_any! {
            bool i8 i16 i32 i64 i128 u8 u16 u32 u64 u128 f32 f64 char str string bytes byte_buf unit unit_struct
            newtype_struct seq tuple tuple_struct map struct enum identifier ignored_any
        }
    }

    fn seg(text: &'static str, attrs: Vec<(&'static str, Jv)>) -> Jv {
        Jv::Map(vec![("text", Jv::Str(text)), ("attrs", Jv::Map(attrs))])
    }

    #[test]
    fn read_spans_input_reads_text_and_attrs() {
        let got = read_spans_input(Jv::List(vec![
            seg("Le ", vec![]),
            seg(
                "chat",
                vec![
                    ("bold", Jv::Bool(true)),
                    ("color", Jv::Str("#dc2626")),
                    ("size", Jv::Num(48.0)),
                    ("italic", Jv::Null),
                    ("underline", Jv::Bool(false)),
                ],
            ),
        ]));
        assert_eq!(
            got,
            Ok(vec![
                SpanInput {
                    text: "Le ".into(),
                    attrs: SpanAttrs::default()
                },
                SpanInput {
                    text: "chat".into(),
                    attrs: SpanAttrs {
                        bold: true,
                        color: Some("#dc2626".into()),
                        size: Some(48.0),
                        ..SpanAttrs::default()
                    },
                },
            ])
        );
        assert_eq!(read_spans_input(Jv::List(vec![])), Ok(vec![]));
    }

    /// Patron écarté (R7) : `read_patch` lit un objet seul ; ici une liste. Pas une liste, segment incomplet, clé
    /// inconnue (segment ou attributs), type faux : `BadFormat`, jamais une panique.
    #[test]
    fn read_spans_input_refuses_bad_shapes() {
        for bad in [
            Jv::Map(vec![("text", Jv::Str("x"))]),
            Jv::List(vec![Jv::Map(vec![("text", Jv::Str("x"))])]),
            Jv::List(vec![Jv::Map(vec![
                ("text", Jv::Str("x")),
                ("attrs", Jv::Map(vec![])),
                ("href", Jv::Str("y")),
            ])]),
            Jv::List(vec![seg("x", vec![("href", Jv::Str("y"))])]),
            Jv::List(vec![seg("x", vec![("bold", Jv::Str("oui"))])]),
            Jv::List(vec![Jv::Map(vec![
                ("text", Jv::Str("x")),
                ("attrs", Jv::Num(1.0)),
            ])]),
            Jv::List(vec![Jv::Str("x")]),
        ] {
            assert_eq!(read_spans_input(bad), Err(CommandError::BadFormat));
        }
    }

    #[test]
    fn set_text_inner_with_spans_formats_in_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let bold = SpanAttrs {
            bold: true,
            ..SpanAttrs::default()
        };
        let spans = vec![
            SpanInput {
                text: "Le ".into(),
                attrs: SpanAttrs::default(),
            },
            SpanInput {
                text: "chat".into(),
                attrs: bold.clone(),
            },
        ];
        let id = d
            .set_text_inner(
                &p,
                None,
                [100.0, 200.0],
                "Le chat",
                "#000000",
                36.0,
                [600.0, 45.0],
                Some(spans),
                Look::default(),
            )
            .expect("texte")
            .ids[0]
            .clone();
        let t = d.core.element(&id).and_then(|e| e.text).expect("texte");
        assert_eq!(t.spans[1].attrs, bold);
        let bad = vec![SpanInput {
            text: "Le cha".into(),
            attrs: SpanAttrs::default(),
        }];
        assert_eq!(
            d.set_text_inner(
                &p,
                Some(id),
                [0.0, 0.0],
                "Le chat",
                "#000000",
                36.0,
                [600.0, 45.0],
                Some(bad),
                Look::default()
            ),
            Err(CommandError::BadFormat)
        );
    }

    #[test]
    fn set_table_cell_inner_with_spans_formats_the_cell() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_table_inner(&p, [0.0, 0.0], [2, 2], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau")
            .ids[0]
            .clone();
        let t = d.core.element(&id).and_then(|e| e.table).expect("vue");
        let bold = SpanAttrs {
            bold: true,
            ..SpanAttrs::default()
        };
        let spans = vec![SpanInput {
            text: "Total".into(),
            attrs: bold.clone(),
        }];
        d.set_table_cell_inner(
            &id,
            [t.rows[0].id.as_str(), t.cols[0].id.as_str()],
            "Total",
            None,
            Some(spans),
        )
        .expect("cellule");
        let cells = d
            .core
            .element(&id)
            .and_then(|e| e.table)
            .expect("vue")
            .cells;
        assert_eq!(cells[0].spans[0].attrs, bold);
    }
    // C6a (T1) : pot de peinture par `fill_inner`, bord par `edge_hit`.

    #[test]
    fn fill_inner_and_edge_hit() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let r = d
            .add_shape_inner(
                &p,
                "rect",
                [100.0, 100.0, 300.0, 200.0],
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default(),
            )
            .expect("forme")
            .ids[0]
            .clone();
        d.fill_inner(&p, "inside", Some(&r), Some("#facc15".into()))
            .expect("intérieur");
        d.fill_inner(&p, "edge", Some(&r), Some("#dc2626".into()))
            .expect("contour");
        let e = d.core.element(&r).expect("élément");
        assert_eq!(
            (e.style.map(|s| s.color), e.shape.and_then(|s| s.fill)),
            (Some("#dc2626".to_string()), Some("#facc15".to_string()))
        );
        d.fill_inner(&p, "background", None, Some("#1d4ed8".into()))
            .expect("fond");
        assert_eq!(d.core.page(&p).expect("page").background, "#1d4ed8");
        assert_eq!(
            d.fill_inner(&p, "inside", None, None),
            Err(CommandError::BadFill)
        );
        assert_eq!(
            d.fill_inner(&p, "zone", Some(&r), None),
            Err(CommandError::BadFill)
        );
        assert!(d.edge_hit(&r, 103.0, 150.0, 6.0));
        assert!(!d.edge_hit(&r, 200.0, 150.0, 6.0));
    }

    /// OG11 (T4) : aucune troncature silencieuse ; un `u8` de wasm-bindgen ferait de 257 un 1.
    #[test]
    fn look_bounds_checked_before_conversion() {
        let bad = |r: Result<Look, CommandError>| matches!(r, Err(CommandError::BadStyle));
        for r in [257.0, 1.5, -1.0, 3.0, f64::NAN, f64::INFINITY] {
            assert!(
                bad(look_of(None, Some(r), None, None, None, Default::default())),
                "tracé {r}"
            );
            assert!(
                matches!(roughness_arg(Some(r)), Err(CommandError::BadStyle)),
                "tracé {r}"
            );
        }
        for seed in [4_294_967_296.0, 4_294_967_301.0, -1.0, 1.5, f64::NAN] {
            assert!(
                bad(look_of(
                    None,
                    Some(1.0),
                    Some(seed),
                    None,
                    None,
                    Default::default()
                )),
                "graine {seed}"
            );
        }
        for o in [300.0, 296.0, 100.5, -1.0, f64::NAN, f64::NEG_INFINITY] {
            assert!(
                bad(look_of(None, None, None, None, Some(o), Default::default())),
                "opacité {o}"
            );
        }
        let l = look_of(
            Some("dashed".into()),
            Some(2.0),
            Some(4_294_967_295.0),
            Some("round".into()),
            Some(44.6),
            Default::default(),
        )
        .expect("dans les bornes");
        assert_eq!(l.roughness, Some(2));
        assert_eq!(l.seed, Some(u32::MAX));
        assert_eq!(l.opacity, Some(45));
        assert_eq!(roughness_arg(Some(0.0)).ok(), Some(Some(0)));
        assert_eq!(roughness_arg(None).ok(), Some(None));
    }

    /// OG11 (T12) : les cinq champs du lot 2 traversent `look_of` dans l'ordre ; un défaut de pointe et un lien
    /// `javascript:` n'y survivent pas (rien d'écrit à la création).
    #[test]
    fn look_of_carries_lot2_fields() {
        let s = |v: &str| Some(v.to_string());
        let named = [
            s("hachure"),
            s("triangle"),
            s("none"),
            s("right"),
            s("https://example.org"),
            None,
        ];
        let l = look_of(None, None, None, None, None, named).expect("aspect");
        let want = Look {
            fill_style: s("hachure"),
            start_arrowhead: s("triangle"),
            end_arrowhead: s("none"),
            text_align: s("right"),
            link: s("https://example.org"),
            ..Look::default()
        };
        assert_eq!(l.sanitized(), want);
        let named = [
            None,
            s("none"),
            s("arrow"),
            None,
            s("javascript:alert(1)"),
            None,
        ];
        let l = look_of(None, None, None, None, None, named).expect("aspect");
        assert!(l.is_neutral());
    }

    #[test]
    fn set_style_inner_one_step_then_noop() {
        let mut d = Document::blank();
        let page = d.page_ids()[0].clone();
        let id = d
            .add_shape_inner(
                &page,
                "rect",
                [0.0, 0.0, 10.0, 10.0],
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default(),
            )
            .expect("forme")
            .ids[0]
            .clone();
        let patch = StylePatch {
            opacity: Some(44.6),
            ..Default::default()
        };
        assert_eq!(
            d.set_style_inner(vec![id.clone()], patch.clone())
                .expect("style")
                .ids,
            vec![id.clone()]
        );
        assert!(d
            .set_style_inner(vec![id], patch)
            .expect("même valeur")
            .ids
            .is_empty());
    }

    // Personnalisation 1a : disposition lue par le pont, commandes de page par leur `_inner`.
    #[test]
    fn set_page_mode_unknown_is_an_error() {
        assert_eq!(
            page_layout("a4"),
            Err("mode de page inconnu : a4".to_string())
        );
        assert_eq!(page_layout("portrait"), Ok(PageLayout::Portrait));
        let mut d = Document::blank();
        assert_eq!(
            d.set_page_mode_inner("nulle-part", PageLayout::Portrait),
            Err(CommandError::UnknownPage("nulle-part".into()))
        );
    }

    #[test]
    fn move_page_through_the_bridge_is_one_step() {
        let mut d = Document::blank();
        let a = d.page_ids()[0].clone();
        let b = d.add_page_after_inner(Some(a.clone())).expect("page").pages[0].clone();
        let c = d.move_page_inner(&a, 1).expect("move");
        assert_eq!(c.pages, vec![a.clone()]);
        assert_eq!(d.page_ids(), vec![b.clone(), a.clone()]);
        d.undo_inner();
        assert_eq!(d.page_ids(), vec![a.clone(), b.clone()]);
        assert!(d
            .move_page_inner(&a, 0)
            .expect("même rang")
            .pages
            .is_empty());
        assert_eq!(d.move_page_inner(&a, 2), Err(CommandError::BadIndex));
    }

    /// OG23 (T1) : `Arrange` par le pont, une étape ; un `undo_inner` rend les deux positions.
    #[test]
    fn arrange_through_the_bridge_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let [a, b] = [100.0, 300.0].map(|x| {
            d.add_shape_inner(
                &p,
                "rect",
                [x, x / 2.0, x + 50.0, x / 2.0 + 20.0],
                "#000000",
                4.0,
                None,
                Look::default(),
                LineInit::default(),
            )
            .expect("forme")
            .ids[0]
                .clone()
        });
        let x0 = |d: &Document, id: &String| {
            d.core.snap_box(std::slice::from_ref(id)).expect("boîte").x0
        };
        let v = d.core.version();
        let ch = d
            .arrange_inner(vec![a.clone(), b.clone()], ArrangeHow::AlignLeft)
            .expect("aligner");
        assert_eq!((ch.pages, ch.ids), (vec![p.clone()], vec![b.clone()]));
        assert_eq!(d.core.version(), v + 1);
        assert_eq!((x0(&d, &a), x0(&d, &b)), (100.0, 100.0));
        d.undo_inner();
        assert_eq!((x0(&d, &a), x0(&d, &b)), (100.0, 300.0), "une étape");
    }

    #[test]
    fn arrange_unknown_how_message() {
        assert_eq!(
            arrange_how("spin"),
            Err("disposition inconnue : spin".to_string())
        );
        assert_eq!(arrange_how("flip-h"), Ok(ArrangeHow::FlipH));
    }

    #[test]
    fn restack_through_the_bridge_keeps_ids_in_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let [a, b, c] = [100.0, 200.0, 300.0].map(|y| {
            d.commit_stroke_inner(
                &p,
                &[100.0, y, 0.5, 500.0, y, 0.5],
                "#000000",
                4.0,
                Look::default(),
                None,
            )
            .expect("trait")
            .ids[0]
                .clone()
        });
        let ch = d.restack_inner(vec![a.clone()], 2).expect("premier plan");
        assert_eq!((ch.pages, ch.ids), (vec![p.clone()], vec![a.clone()]));
        assert_eq!(
            d.core.element_ids(&p),
            vec![b.clone(), c.clone(), a.clone()]
        );
        d.undo_inner();
        assert_eq!(
            d.core.element_ids(&p),
            vec![a.clone(), b.clone(), c.clone()]
        );
        assert!(d
            .restack_inner(vec![a.clone()], 0)
            .expect("même ordre")
            .pages
            .is_empty());
        let q = d.add_page_after_inner(Some(p.clone())).expect("page").pages[0].clone();
        let x = d
            .commit_stroke_inner(
                &q,
                &[100.0, 100.0, 0.5, 500.0, 100.0, 0.5],
                "#000000",
                4.0,
                Look::default(),
                None,
            )
            .expect("trait")
            .ids[0]
            .clone();
        assert_eq!(
            d.restack_inner(vec![a, x], 0),
            Err(CommandError::MixedPages)
        );
    }

    #[test]
    fn page_mode_add_duplicate_and_blank_with_through_the_bridge() {
        let mut d = Document::blank_with(Some(PageLayout::Portrait));
        let p = d.page_ids()[0].clone();
        assert_eq!(d.core.page(&p).expect("page").height, 1920.0 * 16.0 / 9.0);
        let q = d
            .add_page_after_mode_inner(Some(p.clone()), Some(PageLayout::Infinite))
            .expect("page")
            .pages[0]
            .clone();
        assert_eq!(d.core.page(&q).expect("page").mode, "infinite");
        d.set_page_mode_inner(&p, PageLayout::Landscape)
            .expect("mode");
        assert_eq!(d.core.page(&p).expect("page").height, 1080.0);
        let c = d.duplicate_page_inner(&q).expect("copie");
        assert_eq!(d.page_ids(), vec![p, q, c.pages[0].clone()]);
    }
}
