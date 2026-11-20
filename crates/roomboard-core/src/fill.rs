//! Pot de peinture (C6a, DA1, DA2) : commande `Fill` (contour, intérieur, fond de page), une transaction, aucune étape
//! sans effet (D38), et requête `edge_hit` (bord d'un rectangle ou d'une ellipse, mesuré comme `hit_test`). Mots et
//! cellules gardent `FormatText`, `SetTableCell`, `SetTableFill` (D6, D8, D9). C6b et C8 ajouteront une variante de
//! `FillTarget`.
use yrs::{In, Map, MapRef, ReadTxn};

use crate::commands::{read_shape, Change, CommandError};
use crate::document::Document;
use crate::element::{out_string, out_transform, DEFAULT_BACKGROUND};
use crate::ink::hit::dist_to_edges;
use crate::query::world_outline;
use crate::rich_text::valid_color;
use crate::shape::shape_polygon;

/// Cible du pot (D12) : contour d'une forme ou d'un trait (`color`), intérieur d'un rectangle ou d'une ellipse (`fill`),
/// fond de la page (`background`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FillTarget {
    Edge { id: String },
    Inside { id: String },
    Background,
}

/// Clé écrite pour une cible d'élément ; `None` si la cible ne convient pas (intérieur d'une ligne, d'une flèche, d'un
/// trait ; texte, image, tableau, élément inconnu ou mal formé).
fn field_for<T: ReadTxn>(txn: &T, e: &MapRef, inside: bool) -> Option<&'static str> {
    match out_string(e.get(txn, "kind")).as_deref() {
        Some("stroke") if !inside => Some("color"),
        Some("shape") => {
            let s = read_shape(txn, e)?;
            if inside {
                (!s.kind.is_segment()).then_some("fill")
            } else {
                Some("color")
            }
        }
        _ => None,
    }
}

impl Document {
    /// Ordre des refus (PC2) : couleur, page, élément cherché sur cette page (PC3), cible ; puis même valeur : aucune
    /// étape. « Aucune » : intérieur retiré, fond à `#ffffff`, contour ou trait sans effet (D11).
    pub(crate) fn cmd_fill(
        &mut self,
        page: &str,
        target: &FillTarget,
        color: Option<&str>,
    ) -> Result<Change, CommandError> {
        if color.is_some_and(|c| !valid_color(c)) {
            return Err(CommandError::BadFill);
        }
        let (map, key, value, ids) = {
            let txn = self.read();
            let (_, page_map) = self
                .find_page(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            match target {
                FillTarget::Background => (
                    page_map,
                    "background",
                    Some(color.unwrap_or(DEFAULT_BACKGROUND).to_string()),
                    Vec::new(),
                ),
                FillTarget::Edge { id } | FillTarget::Inside { id } => {
                    let found = self
                        .find_element(&txn, id)
                        .filter(|f| f.page_id == page)
                        .ok_or_else(|| CommandError::UnknownElement(id.clone()))?;
                    let inside = matches!(target, FillTarget::Inside { .. });
                    let key =
                        field_for(&txn, &found.element, inside).ok_or(CommandError::BadFill)?;
                    if key == "color" && color.is_none() {
                        return Ok(self.unchanged());
                    }
                    (
                        found.element,
                        key,
                        color.map(str::to_string),
                        vec![id.clone()],
                    )
                }
            }
        };
        let current = {
            let txn = self.read();
            out_string(map.get(&txn, key))
        };
        if current == value {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            match &value {
                Some(v) => {
                    map.insert(&mut txn, key, In::from(v.as_str()));
                }
                None => {
                    map.remove(&mut txn, key);
                }
            }
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids,
            ..Default::default()
        }))
    }

    /// Bord d'un rectangle ou d'une ellipse (D5, DA2) : distance du point (monde) au tracé `shape_polygon(kind, w, h,
    /// 0.0)` porté en monde comme `hit_test`, au plus `tol` + demi-épaisseur × échelle de la matrice (similitude : son
    /// facteur ; sinon racine du déterminant). Faux pour une ligne, une flèche, un trait, tout autre élément, un id inconnu.
    pub fn edge_hit(&self, id: &str, x: f64, y: f64, tol: f32) -> bool {
        let txn = self.read();
        let Some(found) = self.find_element(&txn, id) else {
            return false;
        };
        let e = &found.element;
        let (Some(s), Some(t)) = (read_shape(&txn, e), out_transform(e.get(&txn, "transform")))
        else {
            return false;
        };
        if s.kind.is_segment() {
            return false;
        }
        let scale = (t[0] * t[3] - t[1] * t[2]).abs().sqrt();
        let band = f64::from(tol) + f64::from(s.style.width) / 2.0 * scale;
        let outline = world_outline(&t, &shape_polygon(s.kind, s.w, s.h, 0.0));
        f64::from(dist_to_edges(&outline, x as f32, y as f32)) <= band
    }
}
