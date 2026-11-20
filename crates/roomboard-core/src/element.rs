//! Valeurs du schéma D2 : constantes, vues, conversions entre les valeurs yrs (`Out`, `Any`) et les types Rust.
use std::sync::Arc;

use yrs::{Any, In, Map, MapRef, Number, Out, ReadTxn};

use crate::asset::is_asset_id;
use crate::grid::GridView;
use crate::query::Bounds;
use crate::rich_text::TextSpanView;
use crate::table::TableView;

pub const SCHEMA: u32 = 1;
pub const PAGE_WIDTH: f64 = 1920.0;
pub const PAGE_HEIGHT: f64 = 1080.0;
pub const DEFAULT_BACKGROUND: &str = "#ffffff";

/// Transformation affine [a, b, c, d, e, f] : x' = a·x + c·y + e ; y' = b·x + d·y + f (D4).
pub type Transform = [f64; 6];
pub const IDENTITY: Transform = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct StrokeStyle {
    pub color: String,
    pub width: f32,
}

/// Types d'élément que ce cœur sait lire (C10a : `table`) ; tout autre `kind` est gardé et rendu comme élément inconnu
/// (U3, K8).
pub const KNOWN_KINDS: [&str; 5] = ["stroke", "shape", "text", "image", "table"];
/// Boîte d'un élément inconnu sans `w`, `h` lisibles (K8, HK7).
pub const UNKNOWN_BOX: f64 = 100.0;
/// Seul ajustement de fond écrit par cette version : largeur de la page (K6, HK1).
pub const FIT_WIDTH: &str = "width";

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct PageView {
    pub id: String,
    pub width: f64,
    pub height: f64,
    pub background: String,
    pub backdrop: Option<BackdropView>,
    /// Grille de page (U31, C9) ; `None` sans champ `grid` lisible (G4).
    pub grid: Option<GridView>,
}

/// Fond de page (U6, K6, K9) : valeurs brutes, `rect` calculé par le cœur (DAK4).
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct BackdropView {
    pub asset: String,
    pub kind: String,
    pub w: Option<f64>,
    pub h: Option<f64>,
    pub fit: String,
    pub rect: Option<Bounds>,
}

/// Image (U5, K5) : boîte locale (0, 0)-(w, h), taille source en pixels.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ImageView {
    pub asset: String,
    pub w: f64,
    pub h: f64,
}

/// Élément d'un `kind` inconnu (U3, K8) : dessiné comme un cadre ; `source_kind` = le `kind` lu.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnknownView {
    pub source_kind: String,
    pub w: f64,
    pub h: f64,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ElementView {
    pub id: String,
    pub kind: String,
    pub transform: Transform,
    /// Présent pour `stroke`, `shape`, `text` ; absent pour `image` et `unknown` (K8).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<StrokeStyle>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shape: Option<ShapeView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<TextView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<ImageView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unknown: Option<UnknownView>,
    /// Tableau (C10a, T13) ; absent pour tout autre `kind`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub table: Option<TableView>,
}

impl ElementView {
    /// Vue sans champ propre ; chaque branche de `Document::element` complète le sien.
    pub(crate) fn bare(id: &str, kind: &str, transform: Transform) -> ElementView {
        ElementView {
            id: id.to_string(),
            kind: kind.to_string(),
            transform,
            style: None,
            shape: None,
            text: None,
            image: None,
            unknown: None,
            table: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ShapeView {
    pub shape: String,
    pub w: f64,
    pub h: f64,
    pub fill: Option<String>,
}

/// Texte d'un élément (D14) ; le contenu vient du `Y.Text` de l'élément.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextView {
    pub content: String,
    pub size: f32,
    pub box_width: f64,
    pub box_height: f64,
    /// Segments (C7, T8) : attributs normalisés, embeds sautés ; un seul segment sans attribut pour un texte du socle.
    pub spans: Vec<TextSpanView>,
}

/// `m ∘ t` : applique `t` puis `m` (Transform du lot 4, CL4-8).
pub fn compose(m: &Transform, t: &Transform) -> Transform {
    [
        m[0] * t[0] + m[2] * t[1],
        m[1] * t[0] + m[3] * t[1],
        m[0] * t[2] + m[2] * t[3],
        m[1] * t[2] + m[3] * t[3],
        m[0] * t[4] + m[2] * t[5] + m[4],
        m[1] * t[4] + m[3] * t[5] + m[5],
    ]
}

pub fn apply_transform(t: &Transform, x: f64, y: f64) -> (f64, f64) {
    (t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5])
}

pub fn invert(t: &Transform) -> Option<Transform> {
    let det = t[0] * t[3] - t[1] * t[2];
    // NaN explicite : un déterminant NaN (rang 1 à 1e200, inf - inf) est refusé, comme par la fausse liaison.
    if det.is_nan() || det.abs() < 1e-12 {
        return None;
    }
    let (a, b, c, d) = (t[3] / det, -t[1] / det, -t[2] / det, t[0] / det);
    let e = -(a * t[4] + c * t[5]);
    let f = -(b * t[4] + d * t[5]);
    Some([a, b, c, d, e, f])
}

pub(crate) fn any_f64(a: &Any) -> Option<f64> {
    match a {
        Any::Number(Number::Float(f)) => Some(*f),
        Any::Number(Number::Int(i)) => Some(*i as f64),
        _ => None,
    }
}

pub(crate) fn out_f64(o: Option<Out>) -> Option<f64> {
    match o {
        Some(Out::Any(a)) => any_f64(&a),
        _ => None,
    }
}

pub(crate) fn out_string(o: Option<Out>) -> Option<String> {
    match o {
        Some(Out::Any(Any::String(s))) => Some(s.to_string()),
        _ => None,
    }
}

#[allow(dead_code)] // appelée par commands.rs / format (lot 2)
pub(crate) fn out_bytes(o: Option<Out>) -> Option<Arc<[u8]>> {
    match o {
        Some(Out::Any(Any::Buffer(b))) => Some(b),
        _ => None,
    }
}

#[allow(dead_code)] // appelée par commands.rs / format (lot 2)
pub(crate) fn transform_to_any(t: &Transform) -> Any {
    Any::Array(t.iter().map(|v| Any::from(*v)).collect::<Vec<Any>>().into())
}

pub(crate) fn out_transform(o: Option<Out>) -> Option<Transform> {
    match o {
        Some(Out::Any(Any::Array(items))) if items.len() == 6 => {
            let mut t = [0.0; 6];
            for (slot, a) in t.iter_mut().zip(items.iter()) {
                *slot = any_f64(a)?;
            }
            Some(t)
        }
        _ => None,
    }
}

/// Style d'un trait, rangé en champs du `Y.Map` de l'élément (`color`, `width`, `tool`) : jamais en `Any::Map`,
/// que yrs encode dans l'ordre d'itération d'un `HashMap` à graine aléatoire, reconstruit à chaque chargement
/// (octets différents d'un rechargement à l'autre, contraire à D25).
pub(crate) fn style_fields(s: &StrokeStyle) -> [(&'static str, In); 3] {
    [
        ("color", In::from(s.color.as_str())),
        ("width", In::Any(Any::from(f64::from(s.width)))),
        ("tool", In::from("pen")),
    ]
}

pub(crate) fn read_style<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<StrokeStyle> {
    Some(StrokeStyle {
        color: out_string(e.get(txn, "color"))?,
        width: out_f64(e.get(txn, "width"))? as f32,
    })
}

pub(crate) fn finite_positive(v: f64) -> bool {
    v.is_finite() && v > 0.0
}

/// Géométrie que le polygone (f32) et la liaison tiennent (constat 3 de T60) : chaque valeur reste finie en f32.
pub(crate) fn fits_f32(values: &[f64]) -> bool {
    values.iter().all(|v| (*v as f32).is_finite())
}

/// Image (K5) : transform et vue ; `None` si l'élément n'en est pas une ou est mal formé (asset non conforme, boîte ≤ 0).
pub(crate) fn read_image<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, ImageView)> {
    if out_string(e.get(txn, "kind"))? != "image" {
        return None;
    }
    Some((
        out_transform(e.get(txn, "transform"))?,
        ImageView {
            asset: out_string(e.get(txn, "asset")).filter(|a| is_asset_id(a))?,
            w: out_f64(e.get(txn, "w")).filter(|v| finite_positive(*v))?,
            h: out_f64(e.get(txn, "h")).filter(|v| finite_positive(*v))?,
        },
    ))
}

/// Élément inconnu (K8) : transform et vue ; `None` pour un `kind` connu. `kind` absent ou non textuel : `""`.
pub(crate) fn read_unknown<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, UnknownView)> {
    let kind = out_string(e.get(txn, "kind")).unwrap_or_default();
    if KNOWN_KINDS.contains(&kind.as_str()) {
        return None;
    }
    unknown_view(txn, e)
}

/// Vue « inconnu » de tout élément (K8), aussi le repli d'un tableau mal formé (C10a, T2) : `source_kind` = le `kind`
/// lu (`""` sans `kind` textuel) ; sans `transform` lisible : identité, rien n'est écrit ; boîte `w`, `h` s'ils sont tous
/// deux finis > 0, sinon 100 × 100. Toujours `Some`.
pub(crate) fn unknown_view<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, UnknownView)> {
    let source_kind = out_string(e.get(txn, "kind")).unwrap_or_default();
    let (w, h) = match (out_f64(e.get(txn, "w")), out_f64(e.get(txn, "h"))) {
        (Some(w), Some(h)) if finite_positive(w) && finite_positive(h) => (w, h),
        _ => (UNKNOWN_BOX, UNKNOWN_BOX),
    };
    Some((
        out_transform(e.get(txn, "transform")).unwrap_or(IDENTITY),
        UnknownView { source_kind, w, h },
    ))
}

/// Champs bruts du fond d'une page (K9) ; `None` si la page n'a pas de champ `backdrop`.
pub(crate) struct RawBackdrop {
    pub asset: Option<String>,
    pub kind: Option<String>,
    pub w: Option<f64>,
    pub h: Option<f64>,
    pub fit: Option<String>,
}

/// Fond rangé en champs d'un `Y.Map` (jamais `Any::Map`, G4) ; une autre valeur donne des champs vides (K9).
pub(crate) fn read_backdrop<T: ReadTxn>(txn: &T, page: &MapRef) -> Option<RawBackdrop> {
    Some(match page.get(txn, "backdrop")? {
        Out::YMap(b) => RawBackdrop {
            asset: out_string(b.get(txn, "asset")),
            kind: out_string(b.get(txn, "kind")),
            w: out_f64(b.get(txn, "w")),
            h: out_f64(b.get(txn, "h")),
            fit: out_string(b.get(txn, "fit")),
        },
        _ => RawBackdrop {
            asset: None,
            kind: None,
            w: None,
            h: None,
            fit: None,
        },
    })
}

/// Vue du fond (K6, K9, DAK4) : `None` sans asset conforme ; `rect` calé sur la largeur de la page (page à hauteur
/// infinie : coin en (0, 0), hauteur = h × largeur / w) dès que `w`, `h` et la largeur de page sont finis > 0 et la hauteur calculée finie, quel que soit `fit`.
pub(crate) fn backdrop_view(r: RawBackdrop, page_width: f64) -> Option<BackdropView> {
    let asset = r.asset.filter(|a| is_asset_id(a))?;
    let w = r.w.filter(|v| finite_positive(*v));
    let h = r.h.filter(|v| finite_positive(*v));
    let page_width = Some(page_width).filter(|v| finite_positive(*v));
    let rect = match (w, h, page_width) {
        (Some(w), Some(h), Some(page_width)) => {
            let y1 = h * page_width / w;
            y1.is_finite().then_some(Bounds {
                x0: 0.0,
                y0: 0.0,
                x1: page_width,
                y1,
            })
        }
        _ => None,
    };
    Some(BackdropView {
        asset,
        kind: r.kind.unwrap_or_default(),
        w,
        h,
        fit: r.fit.unwrap_or_default(),
        rect,
    })
}

#[cfg(test)]
mod backdrop_tests {
    use super::*;

    fn raw(w: f64, h: f64) -> RawBackdrop {
        RawBackdrop {
            asset: Some("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into()),
            kind: Some("image".into()),
            w: Some(w),
            h: Some(h),
            fit: Some("width".into()),
        }
    }

    #[test]
    fn backdrop_view_without_usable_page_width_has_no_rect() {
        for width in [0.0, -5.0, f64::NAN, f64::INFINITY] {
            let v = backdrop_view(raw(1000.0, 500.0), width).expect("vue");
            assert_eq!(v.rect, None, "largeur de page {width}");
        }
        let ok = backdrop_view(raw(1000.0, 500.0), 1920.0).expect("vue");
        assert_eq!(ok.rect.map(|r| r.y1), Some(960.0));
    }

    #[test]
    fn backdrop_view_with_overflowing_height_has_no_rect() {
        let v = backdrop_view(raw(1e-300, 1e10), 1920.0).expect("vue");
        assert_eq!(v.rect, None);
        assert_eq!((v.w, v.h), (Some(1e-300), Some(1e10)));
    }
}
