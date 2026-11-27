//! Géométrie des lignes et des flèches (OG12, DA-1, DA-5) : chemin complet, courbe, boîte d'accroche, ancrage d'une
//! extrémité liée, écritures d'une ligne. T4 y ajoute le suivi, la route coudée et `AddLinked`.
//! Courbe adaptée de `curveCatmullRomCubicApproxPoints` (packages/math/src/curve.ts) et écart de `getBindingGap`
//! (packages/element/src/binding.ts) d'Excalidraw (https://github.com/excalidraw/excalidraw), Copyright (c) 2020
//! Excalidraw, licence MIT (THIRD_PARTY_NOTICES.md).
use yrs::{Any, In, Map, MapRef, Out, ReadTxn};

use crate::commands::{read_shape, read_text, CommandError, ShapeFields};
use crate::document::Document;
use crate::element::{
    any_f64, apply_transform, finite_positive, fits_f32, invert, out_string, out_transform,
    read_image, transform_to_any, Transform,
};
use crate::media::{read_media, MEDIA_KIND};
use crate::model3d::{read_model3d, MODEL3D_KIND};
use crate::shape::ShapeKind;
use crate::table::{self, TABLE_KIND};

/// Plafond des points intérieurs (H8) ; `SetLinePoints` en admet deux de plus (les extrémités).
pub const MAX_INNER_POINTS: usize = 512;
/// Pas d'aplatissement de la courbe par segment (n° 3), le même dans `shapes.ts`.
pub const CURVE_STEPS: usize = 16;
pub const CURVE_TENSION: f64 = 0.5;
/// Rapport de boîte d'une liaison, borné (n° 4).
pub const BIND_RATIO_MAX: f64 = 10.0;
/// Écart de base entre la pointe et le contour (n° 5, `BASE_BINDING_GAP` d'Excalidraw).
pub const BASE_BINDING_GAP: f64 = 5.0;
/// Points d'accroche (n° 18) : milieux des côtés haut, droit, bas, gauche, en rapports de boîte.
pub const ANCHOR_RATIOS: [[f64; 2]; 4] = [[0.5, 0.0], [1.0, 0.5], [0.5, 1.0], [0.0, 0.5]];

/// Liaison demandée ou lue : id de l'objet et rapport de sa boîte locale (`fixedPoint` d'Excalidraw).
#[derive(Debug, Clone, PartialEq, Default)]
pub struct BindInput {
    pub id: String,
    pub fx: f64,
    pub fy: f64,
}

/// Champs neufs d'`AddShape` (n° 12 a) : points intérieurs en monde, liaisons ; vide = forme du socle.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct LineInit {
    pub points: Vec<f64>,
    pub start: Option<BindInput>,
    pub end: Option<BindInput>,
}

impl LineInit {
    pub fn is_empty(&self) -> bool {
        self.points.is_empty() && self.start.is_none() && self.end.is_none()
    }
}

/// Bout d'une ligne.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum End {
    Start,
    End,
}

impl End {
    pub(crate) fn bound_key(self) -> &'static str {
        match self {
            End::Start => "startBound",
            End::End => "endBound",
        }
    }
    pub(crate) fn fixed_key(self) -> &'static str {
        match self {
            End::Start => "startFixed",
            End::End => "endFixed",
        }
    }
}

/// Tous les points locaux (DA-1) : (0, 0), les points intérieurs, (w, h).
pub fn path_of(w: f64, h: f64, inner: &[f64]) -> Vec<(f64, f64)> {
    let mut out = Vec::with_capacity(inner.len() / 2 + 2);
    out.push((0.0, 0.0));
    out.extend(inner.as_chunks::<2>().0.iter().map(|c| (c[0], c[1])));
    out.push((w, h));
    out
}

#[allow(dead_code)] // lu par T4
pub(crate) fn path(s: &ShapeFields) -> Vec<(f64, f64)> {
    path_of(s.w, s.h, &s.points)
}

/// Segments de Bézier cubiques de Catmull-Rom (tension 0,5, extrémités doublées) : `[départ, c1, c2, arrivée]`.
pub fn catmull_rom(pts: &[(f64, f64)]) -> Vec<[(f64, f64); 4]> {
    let n = pts.len();
    if n < 2 {
        return Vec::new();
    }
    (0..n - 1)
        .map(|i| {
            let p0 = pts[i.saturating_sub(1)];
            let p1 = pts[i];
            let p2 = pts[(i + 1).min(n - 1)];
            let p3 = pts[(i + 2).min(n - 1)];
            let t1 = ((p2.0 - p0.0) * CURVE_TENSION, (p2.1 - p0.1) * CURVE_TENSION);
            let t2 = ((p3.0 - p1.0) * CURVE_TENSION, (p3.1 - p1.1) * CURVE_TENSION);
            [
                p1,
                (p1.0 + t1.0 / 3.0, p1.1 + t1.1 / 3.0),
                (p2.0 - t2.0 / 3.0, p2.1 - t2.1 / 3.0),
                p2,
            ]
        })
        .collect()
}

/// Chemin aplati : tel quel sans courbe ou avec deux points ; sinon `CURVE_STEPS` pas par segment de Bézier.
pub fn flatten(pts: &[(f64, f64)], curve: bool) -> Vec<(f64, f64)> {
    if !curve || pts.len() < 3 {
        return pts.to_vec();
    }
    let mut out = vec![pts[0]];
    for [a, b, c, d] in catmull_rom(pts) {
        for k in 1..=CURVE_STEPS {
            let t = k as f64 / CURVE_STEPS as f64;
            let u = 1.0 - t;
            let (w0, w1, w2, w3) = (u * u * u, 3.0 * u * u * t, 3.0 * u * t * t, t * t * t);
            out.push((
                w0 * a.0 + w1 * b.0 + w2 * c.0 + w3 * d.0,
                w0 * a.1 + w1 * b.1 + w2 * c.1 + w3 * d.1,
            ));
        }
    }
    out
}

/// Nombres d'un `Any::Array` ; `None` si la valeur n'en est pas un ou porte autre chose qu'un nombre.
pub(crate) fn nums(v: Option<Out>) -> Option<Vec<f64>> {
    let Some(Out::Any(Any::Array(a))) = v else {
        return None;
    };
    a.iter().map(any_f64).collect()
}

/// `Any::Array` de nombres à plat (jamais `Any::Map`, D25).
pub(crate) fn nums_in(v: &[f64]) -> In {
    In::Any(Any::Array(
        v.iter().map(|x| Any::from(*x)).collect::<Vec<Any>>().into(),
    ))
}

/// Points intérieurs lus : paires finies, au plus `MAX_INNER_POINTS` ; sinon aucun (segment du socle, U3).
pub(crate) fn read_inner<T: ReadTxn>(txn: &T, e: &MapRef) -> Vec<f64> {
    nums(e.get(txn, "points"))
        .filter(|p| {
            p.len().is_multiple_of(2)
                && p.len() <= 2 * MAX_INNER_POINTS
                && p.iter().all(|v| v.is_finite())
        })
        .unwrap_or_default()
}

/// Liaison lue : id chaîne et deux nombres finis, rapport borné ; sinon libre (U3).
pub(crate) fn read_binding<T: ReadTxn>(txn: &T, e: &MapRef, end: End) -> Option<BindInput> {
    let id = out_string(e.get(txn, end.bound_key()))?;
    let f = nums(e.get(txn, end.fixed_key()))
        .filter(|f| f.len() == 2 && f.iter().all(|v| v.is_finite()))?;
    Some(BindInput {
        id,
        fx: f[0].clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
        fy: f[1].clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
    })
}

/// Boîte d'accroche d'un objet (n° 6) : `t` place la boîte locale (0, 0)-(w, h) ; `gap` en unités monde (H7).
#[derive(Debug, Clone, PartialEq)]
pub struct BindBox {
    pub id: String,
    pub t: Transform,
    pub w: f64,
    pub h: f64,
    pub ellipse: bool,
    pub gap: f64,
}

/// Écart de liaison (n° 5) : 5 + épaisseur / 2.
pub fn bind_gap(width: f64) -> f64 {
    BASE_BINDING_GAP + width / 2.0
}

/// Rectangle, ellipse, texte, image, tableau, média, objet 3D ; ni trait, ni ligne, ni flèche, ni `fill`, ni élément
/// inconnu ; boîte nulle ou non finie : aucune (n° 6, H13).
pub(crate) fn bind_box<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<BindBox> {
    let id = out_string(e.get(txn, "id"))?;
    let kind = out_string(e.get(txn, "kind"))?;
    let (t, w, h, ellipse, width) = match kind.as_str() {
        "shape" => {
            let s = read_shape(txn, e)?;
            if s.kind.is_segment() {
                return None;
            }
            let t = out_transform(e.get(txn, "transform"))?;
            (
                t,
                s.w,
                s.h,
                s.kind == ShapeKind::Ellipse,
                f64::from(s.style.width),
            )
        }
        "text" => {
            let tf = read_text(txn, e)?;
            (
                out_transform(e.get(txn, "transform"))?,
                tf.box_width,
                tf.box_height,
                false,
                0.0,
            )
        }
        "image" => {
            let (t, i) = read_image(txn, e)?;
            let (bw, bh) = i.display_size();
            (t, bw, bh, false, 0.0)
        }
        k if k == TABLE_KIND => {
            let tb = table::read_raw(txn, e)?;
            (tb.transform, tb.width(), tb.height(), false, 0.0)
        }
        k if k == MEDIA_KIND => {
            let (t, m) = read_media(txn, e)?;
            (t, m.w, m.h, false, 0.0)
        }
        k if k == MODEL3D_KIND => {
            let (t, m) = read_model3d(txn, e)?;
            (t, m.w, m.h, false, 0.0)
        }
        _ => return None,
    };
    (finite_positive(w) && finite_positive(h)).then(|| BindBox {
        id,
        t,
        w,
        h,
        ellipse,
        gap: bind_gap(width),
    })
}

/// Point local `q` sur le contour ou dehors : au plus 0,5 unité locale à l'intérieur (n° 4 : le mode se déduit du point).
pub fn on_outline(b: &BindBox, q: (f64, f64)) -> bool {
    const IN: f64 = 0.5;
    if b.ellipse {
        let (rx, ry) = (b.w / 2.0 - IN, b.h / 2.0 - IN);
        if rx <= 0.0 || ry <= 0.0 {
            return true;
        }
        ((q.0 - b.w / 2.0) / rx).powi(2) + ((q.1 - b.h / 2.0) / ry).powi(2) >= 1.0
    } else {
        q.0 <= IN || q.1 <= IN || q.0 >= b.w - IN || q.1 >= b.h - IN
    }
}

/// Point monde d'une extrémité liée (n° 4, 5, 17) : rapport × boîte ; sur le contour, projeté depuis le centre sur le
/// contour puis écarté de `gap` (monde) dans la même direction ; dedans, le point lui-même, sans écart.
pub fn anchor(b: &BindBox, fixed: [f64; 2]) -> (f64, f64) {
    let (cx, cy) = (b.w / 2.0, b.h / 2.0);
    let q = (fixed[0] * b.w, fixed[1] * b.h);
    let (dx, dy) = (q.0 - cx, q.1 - cy);
    if !on_outline(b, q) || dx.hypot(dy) < 1e-9 {
        return apply_transform(&b.t, q.0, q.1);
    }
    let s = if b.ellipse {
        1.0 / ((dx / cx).powi(2) + (dy / cy).powi(2)).sqrt()
    } else {
        1.0 / (dx.abs() / cx).max(dy.abs() / cy)
    };
    let edge = apply_transform(&b.t, cx + s * dx, cy + s * dy);
    let center = apply_transform(&b.t, cx, cy);
    let (ux, uy) = (edge.0 - center.0, edge.1 - center.1);
    let l = ux.hypot(uy);
    if l < 1e-9 {
        return edge;
    }
    (edge.0 + ux / l * b.gap, edge.1 + uy / l * b.gap)
}

/// Écritures d'une ligne (DA-1) : partie linéaire de `t` gardée, translation = premier point, (w, h) = dernier point,
/// points intérieurs locaux (absents s'il n'y en a pas) ; liaisons écrites ou retirées. `world` a au moins deux points.
pub(crate) fn line_writes(
    t: &Transform,
    world: &[(f64, f64)],
    start: Option<&BindInput>,
    end: Option<&BindInput>,
) -> Result<Vec<(&'static str, Option<In>)>, CommandError> {
    let p0 = world[0];
    let inv = invert(&[t[0], t[1], t[2], t[3], 0.0, 0.0]).ok_or(CommandError::BadMatrix)?;
    let local: Vec<(f64, f64)> = world
        .iter()
        .map(|p| apply_transform(&inv, p.0 - p0.0, p.1 - p0.1))
        .collect();
    let (w, h) = local[local.len() - 1];
    let inner: Vec<f64> = local[1..local.len() - 1]
        .iter()
        .flat_map(|p| [p.0, p.1])
        .collect();
    let nt = [t[0], t[1], t[2], t[3], p0.0, p0.1];
    if !fits_f32(&[nt[4], nt[5], w, h]) || !fits_f32(&inner) {
        return Err(CommandError::BadPoints);
    }
    let mut v = vec![
        ("transform", Some(In::Any(transform_to_any(&nt)))),
        ("w", Some(In::Any(Any::from(w)))),
        ("h", Some(In::Any(Any::from(h)))),
        ("points", (!inner.is_empty()).then(|| nums_in(&inner))),
    ];
    for (e, b) in [(End::Start, start), (End::End, end)] {
        v.push((e.bound_key(), b.map(|b| In::from(b.id.as_str()))));
        v.push((e.fixed_key(), b.map(|b| nums_in(&[b.fx, b.fy]))));
    }
    Ok(v)
}

impl Document {
    /// Liaison demandée (n° 12 b) : rapport fini, cible connue et accrochable ; rapport borné à ±10 ; sinon `BadShape`.
    pub(crate) fn checked_binding<T: ReadTxn>(
        &self,
        txn: &T,
        b: &BindInput,
    ) -> Result<(BindInput, BindBox), CommandError> {
        if !b.fx.is_finite() || !b.fy.is_finite() {
            return Err(CommandError::BadShape);
        }
        let found = self
            .find_element(txn, &b.id)
            .ok_or(CommandError::BadShape)?;
        let bx = bind_box(txn, &found.element).ok_or(CommandError::BadShape)?;
        let fixed = BindInput {
            id: b.id.clone(),
            fx: b.fx.clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
            fy: b.fy.clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
        };
        Ok((fixed, bx))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::Command;
    use crate::element::{Look, StrokeStyle};

    #[test]
    fn flatten_keeps_two_points_and_passes_through_inner_points() {
        let two = [(0.0, 0.0), (100.0, 0.0)];
        assert_eq!(flatten(&two, true), two.to_vec());
        let three = [(0.0, 0.0), (50.0, -80.0), (100.0, 0.0)];
        let f = flatten(&three, true);
        assert_eq!(f.len(), 1 + 2 * CURVE_STEPS);
        assert!(f
            .iter()
            .any(|p| (p.0 - 50.0).abs() < 1e-9 && (p.1 + 80.0).abs() < 1e-9));
        assert_eq!(f[f.len() - 1], (100.0, 0.0));
    }

    #[test]
    fn anchor_projects_on_outline_with_gap_and_keeps_inside_points() {
        let b = BindBox {
            id: "a".into(),
            t: [1.0, 0.0, 0.0, 1.0, 10.0, 20.0],
            w: 100.0,
            h: 50.0,
            ellipse: false,
            gap: 7.0,
        };
        assert_eq!(anchor(&b, [1.0, 0.5]), (117.0, 45.0));
        assert_eq!(anchor(&b, [0.3, 0.4]), (40.0, 40.0), "dedans : sans écart");
        let e = BindBox {
            ellipse: true,
            ..b.clone()
        };
        let (x, y) = anchor(&e, [0.5, 0.0]);
        assert!(
            (x - 60.0).abs() < 1e-9 && (y - 13.0).abs() < 1e-9,
            "haut de l'ellipse : ({x}, {y})"
        );
    }

    /// Review Focus 3 (U3) : champs illisibles lus neutres, gardés tels quels après une autre commande.
    #[test]
    fn unreadable_line_fields_read_neutral_and_kept() {
        let mut d = Document::blank();
        let page = d.page_ids()[0].clone();
        let id = d
            .apply(Command::AddShape {
                page,
                shape: ShapeKind::Arrow,
                x0: 0.0,
                y0: 0.0,
                x1: 100.0,
                y1: 0.0,
                style: StrokeStyle {
                    color: "#000000".into(),
                    width: 4.0,
                },
                fill: None,
                look: Look::default(),
                line: LineInit::default(),
            })
            .expect("flèche")
            .ids[0]
            .clone();
        {
            let txn = d.read();
            let e = d.find_element(&txn, &id).expect("élément").element;
            drop(txn);
            let mut w = d.transact_local();
            e.insert(&mut w, "points", nums_in(&[1.0]));
            e.insert(&mut w, "startBound", In::from("x"));
            e.insert(&mut w, "startFixed", nums_in(&[0.5]));
            e.insert(&mut w, "elbowed", In::from("oui"));
        }
        let v = serde_json::to_value(d.element(&id).expect("vue")).expect("json");
        assert!(v["shape"].get("points").is_none());
        assert!(v["shape"].get("start").is_none());
        assert!(v.get("look").is_none_or(|l| l.get("elbowed").is_none()));
        d.apply(Command::Transform {
            ids: vec![id.clone()],
            matrix: [1.0, 0.0, 0.0, 1.0, 5.0, 5.0],
        })
        .expect("déplacer");
        let txn = d.read();
        let e = d.find_element(&txn, &id).expect("élément").element;
        assert_eq!(
            nums(e.get(&txn, "points")),
            Some(vec![1.0]),
            "gardé tel quel"
        );
        assert_eq!(out_string(e.get(&txn, "elbowed")).as_deref(), Some("oui"));
    }

    /// Review Focus 1, n° 14 (accès brut à la carte yrs) : `AddShape` avec `LineInit::default()` n'écrit aucune clé neuve.
    #[test]
    fn default_line_writes_no_new_keys() {
        let mut d = Document::blank();
        let page = d.page_ids()[0].clone();
        let id = d
            .apply(Command::AddShape {
                page,
                shape: ShapeKind::Arrow,
                x0: 0.0,
                y0: 0.0,
                x1: 100.0,
                y1: 40.0,
                style: StrokeStyle {
                    color: "#000000".into(),
                    width: 4.0,
                },
                fill: None,
                look: Look::default(),
                line: LineInit::default(),
            })
            .expect("flèche")
            .ids[0]
            .clone();
        let txn = d.read();
        let e = d.find_element(&txn, &id).expect("élément").element;
        for key in [
            "points",
            "startBound",
            "startFixed",
            "endBound",
            "endFixed",
            "elbowed",
        ] {
            assert!(
                e.get(&txn, key).is_none(),
                "clé {key} écrite pour une flèche du socle"
            );
        }
    }
}
