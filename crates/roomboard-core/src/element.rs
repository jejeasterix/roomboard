//! Valeurs du schéma D2 : constantes, vues, conversions entre les valeurs yrs (`Out`, `Any`) et les types Rust.
use std::sync::Arc;

use yrs::{Any, In, Map, MapRef, Number, Out, ReadTxn};

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

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct PageView {
    pub id: String,
    pub width: f64,
    pub height: f64,
    pub background: String,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ShapeView {
    pub shape: String,
    pub w: f64,
    pub h: f64,
    pub fill: Option<String>,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ElementView {
    pub id: String,
    pub kind: String,
    pub transform: Transform,
    pub style: StrokeStyle,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shape: Option<ShapeView>,
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
    if det.abs() < 1e-12 {
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
