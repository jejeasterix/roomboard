//! Liaison wasm-bindgen du cœur RoomBoard (DA5, D10). Une méthode par commande ; objets (Change, ElementView,
//! Bounds, capacités) par serde-wasm-bindgen ; points et contours en Float32Array. Chaque méthode exposée délègue à
//! une méthode `_inner` sans JsValue, seule testée en natif (hors wasm32, tout appel à JS panique).
use std::fmt::Display;

use roomboard_core::capabilities::{capabilities as core_capabilities, Platform};
use roomboard_core::commands::{Change, Command, CommandError, EraseMode};
use roomboard_core::document::Document as CoreDocument;
use roomboard_core::element::StrokeStyle;
use roomboard_core::format::{self, FormatError, SaveMeta};
use roomboard_core::ink::builder::StrokeBuilder as CoreBuilder;
use roomboard_core::ink::outline::InkStyle;
use roomboard_core::ink::points::to_flat;
use roomboard_core::query::Bounds;
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

    /// Le premier enregistrement fixe `created` ; les suivants le recopient (D24).
    pub fn save_inner(&mut self, now: &str, app_version: &str) -> Result<Vec<u8>, FormatError> {
        let meta = SaveMeta {
            app_version: app_version.to_string(),
            now: now.to_string(),
            created: self.created.clone(),
        };
        let bytes = format::save(&self.core, &meta)?;
        if self.created.is_none() {
            self.created = Some(now.to_string());
        }
        Ok(bytes)
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
}
