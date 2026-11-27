//! Pot de peinture (C6a, DA1, DA2) : commande `Fill` (contour, intérieur, fond de page), une transaction, aucune étape
//! sans effet (D38), et requête `edge_hit` (bord d'un rectangle ou d'une ellipse, mesuré comme `hit_test`). Mots et
//! cellules gardent `FormatText`, `SetTableCell`, `SetTableFill` (D6, D8, D9). C6b : zone d'une image
//! (`FillTarget::Image`, écrite par `image.rs`, `cmd_fill_image`) ; C8 : zone fermée (`FillTarget::Zone`,
//! `cmd_fill_zone`, `zone.rs`) ; un `fill` se recolore par `color`.
use yrs::{In, Map, MapRef, Out, ReadTxn, TransactionMut};

use crate::asset::AssetRef;
use crate::commands::{read_shape, Change, CommandError};
use crate::document::Document;
use crate::element::{out_string, out_transform, DEFAULT_BACKGROUND};
use crate::fill_element::FILL_KIND;
use crate::ink::hit::dist_to_edges;
use crate::query::world_outline;
use crate::rich_text::valid_color;
use crate::shape::shape_polygon;

/// Pose `v` sous `key` (ou retire la clé si `None`) ; faux si la valeur lue dans `txn` est déjà celle-là (aucune
/// écriture, D38). Partagée par `cmd_fill` et `cmd_set_style` (OG11, T2).
pub(crate) fn set_or_remove(
    map: &MapRef,
    txn: &mut TransactionMut,
    key: &str,
    v: Option<In>,
) -> bool {
    let current = map.get(txn, key);
    match (current, v) {
        (None, None) => false,
        (Some(_), None) => {
            map.remove(txn, key);
            true
        }
        (cur, Some(next)) => {
            if cur.as_ref().is_some_and(|c| same_value(c, &next)) {
                return false;
            }
            map.insert(txn, key, next);
            true
        }
    }
}

/// Même scalaire : `Any` comparé par yrs (un `Number::Int` relu d'un fichier égale le `Number::Float` du même nombre).
pub(crate) fn same_value(cur: &Out, next: &In) -> bool {
    matches!((cur, next), (Out::Any(a), In::Any(b)) if a == b)
}

/// Cible du pot (D12) : contour d'une forme ou d'un trait (`color`), intérieur d'un rectangle ou d'une ellipse (`fill`),
/// fond de la page (`background`) ; C6b (B2) : image, avec le nouvel asset calculé par la page (pixels remplis ou effacés).
#[derive(Debug, Clone, PartialEq)]
pub enum FillTarget {
    Edge {
        id: String,
    },
    Inside {
        id: String,
    },
    Background,
    Image {
        id: String,
        asset: AssetRef,
    },
    /// C8 (Q10, DA-Z3) : zone fermée au point (x, y) monde, tolérance de fermeture `tol` monde (2 px de la vue / zoom) ;
    /// décidée à l'écriture par le cœur, sinon le fond.
    Zone {
        x: f64,
        y: f64,
        tol: f64,
    },
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
        Some(FILL_KIND) => Some("color"),
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
        if let FillTarget::Image { id, asset } = target {
            return self.cmd_fill_image(page, id, asset);
        }
        if let FillTarget::Zone { x, y, tol } = target {
            return self.cmd_fill_zone(page, *x, *y, *tol, color);
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
                FillTarget::Image { .. } | FillTarget::Zone { .. } => {
                    return Err(CommandError::BadFill)
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
            set_or_remove(&map, &mut txn, key, value.as_deref().map(In::from));
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids,
            ..Default::default()
        }))
    }

    /// C8 (Q10, DA-Z3) : page, puis `x`, `y`, `tol` finis et `tol` > 0, sinon `BadFill`. Zone fermée : nouvel élément
    /// `fill` en haut de la page (« Aucune » : fond `#ffffff`, HC8-6) ; clic sur un mur dilaté : aucune étape ; hors de
    /// la boîte des murs, zone ouverte, ou cœur sans `zone` : `Background` (C6a).
    fn cmd_fill_zone(
        &mut self,
        page: &str,
        x: f64,
        y: f64,
        tol: f64,
        color: Option<&str>,
    ) -> Result<Change, CommandError> {
        {
            let txn = self.read();
            if self.find_page(&txn, page).is_none() {
                return Err(CommandError::UnknownPage(page.to_string()));
            }
        }
        if !(tol.is_finite() && tol > 0.0 && x.is_finite() && y.is_finite()) {
            return Err(CommandError::BadFill);
        }
        #[cfg(feature = "zone")]
        {
            use crate::zone::{closed_zone, Zone};
            match closed_zone(&self.zone_walls(page), x, y, tol) {
                Zone::OnWall => return Ok(self.unchanged()),
                Zone::Closed(rings) => {
                    if let Some(c) = color {
                        return self.insert_fill(page, &rings, c);
                    }
                }
                Zone::Outside | Zone::Open => {}
            }
        }
        self.cmd_fill(page, &FillTarget::Background, color)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::Command;
    use crate::fill_element::read_fill;

    fn zone(p: &str, x: f64, y: f64, tol: f64, color: Option<&str>) -> Command {
        Command::Fill {
            page: p.to_string(),
            target: FillTarget::Zone { x, y, tol },
            color: color.map(str::to_string),
        }
    }
    fn background(d: &Document, p: &str) -> String {
        d.page(p).expect("page").background
    }

    /// Q10, effet de bord 1 : page sans mur : `Zone` = `Background` (une étape) ; même valeur : aucune étape (D38).
    #[test]
    fn zone_on_empty_page_is_background_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d
            .apply(zone(&p, 300.0, 300.0, 2.0, Some("#1d4ed8")))
            .expect("zone");
        assert_eq!((c.pages.clone(), c.ids.len()), (vec![p.clone()], 0));
        assert_eq!(background(&d, &p), "#1d4ed8");
        let v = d.version();
        d.apply(zone(&p, 300.0, 300.0, 2.0, Some("#1d4ed8")))
            .expect("même");
        assert_eq!(d.version(), v);
    }

    /// PC2, Q10 : couleur, puis page, puis `tol` non fini ou ≤ 0 (et `x`, `y` non finis) → `BadFill`.
    #[test]
    fn zone_refusals_follow_pc2_order() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(
            d.apply(zone("nope", 1.0, 1.0, 0.0, Some("#12"))),
            Err(CommandError::BadFill)
        );
        assert_eq!(
            d.apply(zone("nope", 1.0, 1.0, 0.0, Some("#facc15"))),
            Err(CommandError::UnknownPage("nope".into()))
        );
        for (x, tol) in [
            (1.0, 0.0),
            (1.0, -2.0),
            (1.0, f64::NAN),
            (1.0, f64::INFINITY),
            (f64::NAN, 2.0),
        ] {
            assert_eq!(
                d.apply(zone(&p, x, 1.0, tol, Some("#facc15"))),
                Err(CommandError::BadFill)
            );
        }
    }

    /// Q14 : `Fill Inside { id }` et `Edge { id }` d'un `fill` écrivent `color` (une étape) ; « Aucune » : aucune étape.
    #[test]
    fn fill_inside_recolors_fill_and_none_is_no_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .insert_fill(
                &p,
                &[vec![100.0, 100.0, 500.0, 100.0, 500.0, 500.0, 100.0, 500.0]],
                "#facc15",
            )
            .expect("fill")
            .ids[0]
            .clone();
        let color = |d: &Document| {
            let txn = d.read();
            let f = d.find_element(&txn, &id).expect("élément");
            read_fill(&txn, &f.element).expect("fill lisible").color
        };
        let c = d
            .apply(Command::Fill {
                page: p.clone(),
                target: FillTarget::Inside { id: id.clone() },
                color: Some("#dc2626".into()),
            })
            .expect("recolorer");
        assert_eq!(c.ids, vec![id.clone()]);
        assert_eq!(color(&d), "#dc2626");
        let v = d.version();
        d.apply(Command::Fill {
            page: p.clone(),
            target: FillTarget::Inside { id: id.clone() },
            color: None,
        })
        .expect("aucune");
        assert_eq!((d.version(), color(&d)), (v, "#dc2626".to_string()));
        d.apply(Command::Fill {
            page: p.clone(),
            target: FillTarget::Edge { id: id.clone() },
            color: Some("#16a34a".into()),
        })
        .expect("contour");
        assert_eq!(color(&d), "#16a34a");
    }

    /// Q10 : cœur construit sans `zone` (pour `formats`, qui n'envoie jamais de commande) : `Zone` = `Background`.
    #[cfg(not(feature = "zone"))]
    #[test]
    fn zone_without_feature_is_background() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .insert_fill(
                &p,
                &[vec![100.0, 100.0, 500.0, 100.0, 500.0, 500.0, 100.0, 500.0]],
                "#facc15",
            )
            .expect("fill")
            .ids[0]
            .clone();
        let c = d
            .apply(zone(&p, 300.0, 300.0, 2.0, Some("#1d4ed8")))
            .expect("zone");
        assert!(c.ids.is_empty());
        assert_eq!(background(&d, &p), "#1d4ed8");
        assert_eq!(d.element_ids(&p), vec![id]);
    }
}
