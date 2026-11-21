//! Élément `fill` (C8, Q11, DA-Z4) : Y.Map `{ id, kind: "fill", transform, w, h, color, contours }` ; `contours` est un
//! `Any::Array` d'`Any::Array` positionnels de f64 en repère local, l'extérieur d'abord, les trous ensuite. Écrit par la
//! zone du pot (`zone.rs`), lu par la vue, la collision et les anneaux (T2), et par les murs d'une zone suivante.
#![cfg_attr(not(feature = "zone"), allow(dead_code))]
use yrs::{Any, Array, In, Map, MapPrelim, MapRef, Out, ReadTxn};

use crate::commands::{Change, CommandError};
use crate::document::Document;
use crate::element::{
    any_f64, finite_positive, out_f64, out_string, out_transform, transform_to_any, Transform,
};
use crate::rich_text::valid_color;

pub const FILL_KIND: &str = "fill";

/// Champs lus d'un `fill` ; `rings` en repère local, extérieur d'abord, au moins un anneau de 3 points.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct FillFields {
    pub transform: Transform,
    pub w: f64,
    pub h: f64,
    pub color: String,
    pub rings: Vec<Vec<f64>>,
}

/// `None` si l'élément n'est pas un `fill` ou s'il est mal formé (transform, `w`, `h` finis > 0, couleur, anneaux de 3
/// points finis au moins) : la vue en fait alors un cadre inconnu (Q11).
impl FillFields {
    /// Anneaux locaux en f32 (lecture de la géométrie).
    pub(crate) fn rings_f32(&self) -> Vec<Vec<f32>> {
        self.rings
            .iter()
            .map(|r| r.iter().map(|v| *v as f32).collect())
            .collect()
    }
}

pub(crate) fn read_fill<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<FillFields> {
    if out_string(e.get(txn, "kind"))? != FILL_KIND {
        return None;
    }
    let transform = out_transform(e.get(txn, "transform"))?;
    let (w, h) = (out_f64(e.get(txn, "w"))?, out_f64(e.get(txn, "h"))?);
    if !(finite_positive(w) && finite_positive(h)) {
        return None;
    }
    let color = out_string(e.get(txn, "color")).filter(|c| valid_color(c))?;
    let Some(Out::Any(Any::Array(items))) = e.get(txn, "contours") else {
        return None;
    };
    let mut rings = Vec::with_capacity(items.len());
    for item in items.iter() {
        let Any::Array(values) = item else {
            return None;
        };
        if values.len() < 6 || !values.len().is_multiple_of(2) {
            return None;
        }
        rings.push(
            values
                .iter()
                .map(|v| any_f64(v).filter(|f| f.is_finite()))
                .collect::<Option<Vec<f64>>>()?,
        );
    }
    (!rings.is_empty()).then_some(FillFields {
        transform,
        w,
        h,
        color,
        rings,
    })
}

/// Y.Map d'un `fill` depuis des anneaux **monde** : translation au coin de leur boîte, `w`, `h` de la boîte (un build
/// d'avant C8 dessine ainsi le cadre inconnu à la bonne taille), anneaux ramenés en local. `None` sans anneau, avec un
/// anneau de moins de 3 points ou non fini, ou une boîte vide.
pub(crate) fn fill_prelim(id: &str, rings: &[Vec<f64>], color: &str) -> Option<MapPrelim> {
    if rings.is_empty()
        || rings
            .iter()
            .any(|r| r.len() < 6 || !r.len().is_multiple_of(2) || r.iter().any(|v| !v.is_finite()))
    {
        return None;
    }
    let (mut x0, mut y0, mut x1, mut y1) = (
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    );
    for p in rings.iter().flat_map(|r| r.as_chunks::<2>().0) {
        x0 = x0.min(p[0]);
        y0 = y0.min(p[1]);
        x1 = x1.max(p[0]);
        y1 = y1.max(p[1]);
    }
    let (w, h) = (x1 - x0, y1 - y0);
    if !(finite_positive(w) && finite_positive(h)) {
        return None;
    }
    let contours: Vec<Any> = rings
        .iter()
        .map(|r| {
            let local: Vec<Any> = r
                .as_chunks::<2>()
                .0
                .iter()
                .flat_map(|p| [Any::from(p[0] - x0), Any::from(p[1] - y0)])
                .collect();
            Any::Array(local.into())
        })
        .collect();
    let fields: Vec<(&str, In)> = vec![
        ("id", In::from(id)),
        ("kind", In::from(FILL_KIND)),
        (
            "transform",
            In::Any(transform_to_any(&[1.0, 0.0, 0.0, 1.0, x0, y0])),
        ),
        ("w", In::Any(Any::from(w))),
        ("h", In::Any(Any::from(h))),
        ("color", In::from(color)),
        ("contours", In::Any(Any::Array(contours.into()))),
    ];
    Some(fields.into_iter().collect())
}

impl Document {
    /// Nouvel élément `fill` en haut de `page` (C8, Q10) : une transaction, une étape, `Change.ids = [id neuf]` ;
    /// anneaux monde, extérieur d'abord ; anneaux illisibles : `BadFill`.
    pub(crate) fn insert_fill(
        &mut self,
        page: &str,
        rings: &[Vec<f64>],
        color: &str,
    ) -> Result<Change, CommandError> {
        let elements = self.page_elements_or_err(page)?;
        let id = yrs::uuid_v4().to_string();
        let prelim = fill_prelim(&id, rings, color).ok_or(CommandError::BadFill)?;
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, prelim);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }
}
