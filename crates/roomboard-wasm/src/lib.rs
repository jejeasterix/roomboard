//! Liaison wasm-bindgen du cœur RoomBoard (DA5, D10). Une méthode par commande ; objets (Change, ElementView,
//! Bounds, capacités) par serde-wasm-bindgen ; points et contours en Float32Array. Chaque méthode exposée délègue à
//! une méthode `_inner` sans JsValue, seule testée en natif (hors wasm32, tout appel à JS panique).
#[cfg(test)]
use std::collections::BTreeMap;
use std::fmt::Display;

use roomboard_core::asset::AssetRef;
use roomboard_core::capabilities::{capabilities as core_capabilities, Platform};
use roomboard_core::commands::{BackdropInput, Change, Command, CommandError, EraseMode};
use roomboard_core::document::Document as CoreDocument;
use roomboard_core::element::{StrokeStyle, Transform};
use roomboard_core::format::{self, FormatError, Parts, SaveMeta};
use roomboard_core::ink::builder::StrokeBuilder as CoreBuilder;
use roomboard_core::ink::outline::InkStyle;
use roomboard_core::ink::points::to_flat;
use roomboard_core::query::Bounds;
use roomboard_core::rich_text::TextAttr;
use roomboard_core::shape::ShapeKind;
use wasm_bindgen::prelude::*;

/// Version du cœur, pour vérifier que le module Wasm est chargé.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn to_js<T: serde::Serialize>(v: &T) -> Result<JsValue, JsError> {
    serde_wasm_bindgen::to_value(v).map_err(|e| JsError::new(&e.to_string()))
}

/// Message de l'Error JS : le `Display` du cœur (celui que `fake-core.ts` reproduit).
fn js_message<E: Display>(e: &E) -> String {
    e.to_string()
}

fn cmd_err(e: CommandError) -> JsError {
    JsError::new(&js_message(&e))
}

fn fmt_err(e: FormatError) -> JsError {
    JsError::new(&js_message(&e))
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

/// Référence d'asset reçue de JS : métadonnées seules, jamais les octets (U4, K13).
fn asset_ref(id: &str, name: &str, mime: &str, size: f64) -> AssetRef {
    AssetRef {
        id: id.to_string(),
        name: name.to_string(),
        mime: mime.to_string(),
        size,
    }
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
    type Value = [Option<Option<WireValue>>; 6];

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
    let mut attrs = Vec::new();
    for (k, v) in PATCH_KEYS.iter().zip(slots) {
        if let Some(v) = v {
            attrs.push(wire_attr(k, v)?);
        }
    }
    Ok(attrs)
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

    /// Document de démarrage : une page, hors historique (D37).
    pub fn blank() -> Document {
        Self::wrap(CoreDocument::blank(), None)
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
        to_js(
            &self
                .add_image_inner(page, asset_ref(asset, name, mime, size), [w, h], matrix)
                .map_err(cmd_err)?,
        )
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
        to_js(
            &self
                .set_backdrop_inner(page, Some(input))
                .map_err(cmd_err)?,
        )
    }

    pub fn clear_backdrop(&mut self, page: &str) -> Result<JsValue, JsError> {
        to_js(&self.set_backdrop_inner(page, None).map_err(cmd_err)?)
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

    pub fn add_page_after(&mut self, after: Option<String>) -> Result<JsValue, JsError> {
        to_js(&self.add_page_after_inner(after).map_err(cmd_err)?)
    }

    pub fn remove_page(&mut self, page: &str) -> Result<JsValue, JsError> {
        to_js(&self.remove_page_inner(page).map_err(cmd_err)?)
    }

    pub fn commit_stroke(
        &mut self,
        page: &str,
        points: &[f32],
        color: &str,
        width: f32,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .commit_stroke_inner(page, points, color, width)
                .map_err(cmd_err)?,
        )
    }

    pub fn erase(
        &mut self,
        page: &str,
        path: &[f32],
        radius: f32,
        object: bool,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .erase_inner(page, path, radius, object)
                .map_err(cmd_err)?,
        )
    }

    pub fn delete(&mut self, ids: Vec<String>) -> Result<JsValue, JsError> {
        to_js(&self.delete_inner(ids).map_err(cmd_err)?)
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
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .add_shape_inner(page, shape, [x0, y0, x1, y1], color, width, fill)
                .map_err(cmd_err)?,
        )
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
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .set_text_inner(
                    page,
                    id,
                    [x, y],
                    content,
                    color,
                    size,
                    [box_width, box_height],
                )
                .map_err(cmd_err)?,
        )
    }

    /// `matrix` : six nombres `a, b, c, d, e, f`, composés à gauche de la matrice de chaque élément.
    pub fn transform(&mut self, ids: Vec<String>, matrix: &[f64]) -> Result<JsValue, JsError> {
        to_js(&self.transform_inner(ids, matrix).map_err(cmd_err)?)
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
        to_js(
            &self
                .format_text_inner(id, start, len, attrs, box_height)
                .map_err(cmd_err)?,
        )
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

    pub fn hit_test(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<String> {
        self.core.hit_test(page, x, y, tol)
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

    pub fn add_page_after_inner(&mut self, after: Option<String>) -> Result<Change, CommandError> {
        self.run(Command::AddPage { after })
    }

    pub fn remove_page_inner(&mut self, page: &str) -> Result<Change, CommandError> {
        self.run(Command::RemovePage {
            page: page.to_string(),
        })
    }

    pub fn commit_stroke_inner(
        &mut self,
        page: &str,
        points: &[f32],
        color: &str,
        width: f32,
    ) -> Result<Change, CommandError> {
        let style = StrokeStyle {
            color: color.to_string(),
            width,
        };
        self.run(Command::CommitStroke {
            page: page.to_string(),
            points: points.to_vec(),
            style,
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
    pub fn add_shape_inner(
        &mut self,
        page: &str,
        shape: &str,
        corners: [f64; 4],
        color: &str,
        width: f32,
        fill: Option<String>,
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
    pub fn new(width: f32) -> StrokeBuilder {
        StrokeBuilder(CoreBuilder::new(InkStyle { width }))
    }

    pub fn push(&mut self, points: &[f32]) -> Vec<f32> {
        self.0.push(points)
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
            .commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0)
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
        d.commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0)
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
            .commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0)
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
        d.commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0)
            .expect("commit");
        let bytes = d.save_inner("2026-11-16T12:00:00Z", "0.1.0").expect("save");
        let e = Document::load_inner(&bytes).expect("load");
        assert_eq!(e.element_ids(&p), d.element_ids(&p));
        assert_eq!(e.created.as_deref(), Some("2026-11-16T12:00:00Z"));
    }

    #[test]
    fn stroke_builder_push_and_finish() {
        let mut b = StrokeBuilder::new(6.0);
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
            .add_shape_inner(&p, "ellipse", [10.0, 10.0, 30.0, 5.0], "#000000", 4.0, None)
            .expect("forme");
        let e = d.core.element(&c.ids[0]).expect("élément");
        assert_eq!(e.kind, "shape");
        assert_eq!(
            e.shape.map(|s| (s.shape, s.w, s.h, s.fill)),
            Some(("ellipse".to_string(), 20.0, 5.0, None))
        );
    }

    #[test]
    fn add_shape_inner_unknown_kind_is_bad_shape() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(
            d.add_shape_inner(&p, "triangle", [0.0, 0.0, 1.0, 1.0], "#000000", 4.0, None),
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
            )
            .expect("vider");
        assert_eq!(c.removed, vec![id]);
    }

    #[test]
    fn transform_inner_checks_length() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0)
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
}
