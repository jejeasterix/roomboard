//! Géométrie des lignes et des flèches (OG12, DA-1, DA-5) : chemin complet, courbe, boîte d'accroche, ancrage d'une
//! extrémité liée, écritures d'une ligne. T4 y ajoute le suivi, la route coudée et `AddLinked`.
//! Courbe adaptée de `curveCatmullRomCubicApproxPoints` (packages/math/src/curve.ts) et écart de `getBindingGap`
//! (packages/element/src/binding.ts) d'Excalidraw (https://github.com/excalidraw/excalidraw), Copyright (c) 2020
//! Excalidraw, licence MIT (THIRD_PARTY_NOTICES.md). Route simple adaptée de `getSimpleRoute`
//! (packages/element/src/elbowArrow.ts) et objet relié de `addNewNodes` / `createBindingArrow`
//! (packages/element/src/flowchart.ts) d'Excalidraw, même licence.
use std::collections::HashSet;

use yrs::{Any, Array, In, Map, MapRef, Out, ReadTxn, TransactionMut};

use crate::commands::{read_shape, read_text, Change, CommandError, ShapeFields};
use crate::document::Document;
use crate::element::{
    any_f64, apply_transform, finite_positive, fits_f32, invert, out_string, out_transform,
    read_image, transform_to_any, Transform,
};
use crate::fill::set_or_remove;
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

/// Contour d'accroche (OG12 lot 2a, n° 33) : boîte, ellipse inscrite ou losange inscrit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outline {
    Box,
    Ellipse,
    Diamond,
}

/// Boîte d'accroche d'un objet (n° 6) : `t` place la boîte locale (0, 0)-(w, h) ; `gap` en unités monde (H7).
#[derive(Debug, Clone, PartialEq)]
pub struct BindBox {
    pub id: String,
    pub t: Transform,
    pub w: f64,
    pub h: f64,
    pub outline: Outline,
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
    let (t, w, h, outline, width) = match kind.as_str() {
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
                match s.kind {
                    ShapeKind::Ellipse => Outline::Ellipse,
                    ShapeKind::Diamond => Outline::Diamond,
                    _ => Outline::Box,
                },
                f64::from(s.style.width),
            )
        }
        "text" => {
            let tf = read_text(txn, e)?;
            (
                out_transform(e.get(txn, "transform"))?,
                tf.box_width,
                tf.box_height,
                Outline::Box,
                0.0,
            )
        }
        "image" => {
            let (t, i) = read_image(txn, e)?;
            let (bw, bh) = i.display_size();
            (t, bw, bh, Outline::Box, 0.0)
        }
        k if k == TABLE_KIND => {
            let tb = table::read_raw(txn, e)?;
            (tb.transform, tb.width(), tb.height(), Outline::Box, 0.0)
        }
        k if k == MEDIA_KIND => {
            let (t, m) = read_media(txn, e)?;
            (t, m.w, m.h, Outline::Box, 0.0)
        }
        k if k == MODEL3D_KIND => {
            let (t, m) = read_model3d(txn, e)?;
            (t, m.w, m.h, Outline::Box, 0.0)
        }
        _ => return None,
    };
    (finite_positive(w) && finite_positive(h)).then(|| BindBox {
        id,
        t,
        w,
        h,
        outline,
        gap: bind_gap(width),
    })
}

/// Point local `q` sur le contour ou dehors : au plus 0,5 unité locale à l'intérieur (n° 4 : le mode se déduit du point).
pub fn on_outline(b: &BindBox, q: (f64, f64)) -> bool {
    const IN: f64 = 0.5;
    match b.outline {
        Outline::Ellipse => {
            let (rx, ry) = (b.w / 2.0 - IN, b.h / 2.0 - IN);
            if rx <= 0.0 || ry <= 0.0 {
                return true;
            }
            ((q.0 - b.w / 2.0) / rx).powi(2) + ((q.1 - b.h / 2.0) / ry).powi(2) >= 1.0
        }
        Outline::Diamond => {
            let (cx, cy) = (b.w / 2.0 - IN, b.h / 2.0 - IN);
            if cx <= 0.0 || cy <= 0.0 {
                return true;
            }
            (q.0 - b.w / 2.0).abs() / cx + (q.1 - b.h / 2.0).abs() / cy >= 1.0
        }
        Outline::Box => q.0 <= IN || q.1 <= IN || q.0 >= b.w - IN || q.1 >= b.h - IN,
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
    let s = match b.outline {
        Outline::Ellipse => 1.0 / ((dx / cx).powi(2) + (dy / cy).powi(2)).sqrt(),
        Outline::Diamond => 1.0 / (dx.abs() / cx + dy.abs() / cy),
        Outline::Box => 1.0 / (dx.abs() / cx).max(dy.abs() / cy),
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
    /// Cible d'une liaison, cherchée sur la page `page` de la ligne seulement (C1) : `find_element` parcourt toutes les
    /// pages, et une cible d'une autre page n'est ni accrochable, ni suivie, ni lue (vue : liaison libre) ; une cible
    /// sans `bind_box` non plus. Rend sa `bind_box`, calculée une seule fois (C4a).
    pub(crate) fn bound_target<T: ReadTxn>(
        &self,
        txn: &T,
        page: &str,
        id: &str,
    ) -> Option<BindBox> {
        self.page_elements(txn, page)?
            .iter(txn)
            .find_map(|o| match o {
                Out::YMap(e) if out_string(e.get(txn, "id")).as_deref() == Some(id) => Some(e),
                _ => None,
            })
            // OG12 lot 2a (n° 9, 34) : une cible devenue non accrochable (forme convertie en ligne fermée) se lit libre.
            .and_then(|e| bind_box(txn, &e))
    }

    /// Liaison demandée (n° 12 b) : rapport fini, cible connue sur la page `page` de la ligne et accrochable ; rapport
    /// borné à ±10 ; sinon `BadShape`.
    pub(crate) fn checked_binding<T: ReadTxn>(
        &self,
        txn: &T,
        page: &str,
        b: &BindInput,
    ) -> Result<(BindInput, BindBox), CommandError> {
        if !b.fx.is_finite() || !b.fy.is_finite() {
            return Err(CommandError::BadShape);
        }
        let bx = self
            .bound_target(txn, page, &b.id)
            .ok_or(CommandError::BadShape)?;
        let fixed = BindInput {
            id: b.id.clone(),
            fx: b.fx.clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
            fy: b.fy.clamp(-BIND_RATIO_MAX, BIND_RATIO_MAX),
        };
        Ok((fixed, bx))
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// T4 : route coudée (n° 11, DA-3).

/// Marge de sortie d'une flèche coudée (`BASE_PADDING` d'Excalidraw).
pub const ELBOW_PADDING: f64 = 40.0;

/// Bout d'une coudée : point monde et normale sortante (axe dominant), `None` pour un bout libre.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ElbowEnd {
    pub p: (f64, f64),
    pub normal: Option<(f64, f64)>,
}

fn toward(from: (f64, f64), to: (f64, f64)) -> (f64, f64) {
    let (dx, dy) = (to.0 - from.0, to.1 - from.1);
    if dx.abs() >= dy.abs() {
        (if dx < 0.0 { -1.0 } else { 1.0 }, 0.0)
    } else {
        (0.0, if dy < 0.0 { -1.0 } else { 1.0 })
    }
}

/// Route simple (n° 11, DA-3) : sortie perpendiculaire au côté lié (vers l'autre bout si libre), en Z quand les deux
/// sorties se font face sur le même axe, sinon sortie à 40, un coude, entrée à 40 ; au plus 5 segments, sans A*.
pub fn elbow_route(a: ElbowEnd, b: ElbowEnd) -> Vec<(f64, f64)> {
    let da = a.normal.unwrap_or_else(|| toward(a.p, b.p));
    let db = b.normal.unwrap_or_else(|| toward(b.p, a.p));
    let horiz = |d: (f64, f64)| d.0 != 0.0;
    let mut pts = vec![a.p];
    if horiz(da) && horiz(db) && da.0 * (b.p.0 - a.p.0) > 0.0 && db.0 * (a.p.0 - b.p.0) > 0.0 {
        let mx = (a.p.0 + b.p.0) / 2.0;
        pts.extend([(mx, a.p.1), (mx, b.p.1)]);
    } else if !horiz(da)
        && !horiz(db)
        && da.1 * (b.p.1 - a.p.1) > 0.0
        && db.1 * (a.p.1 - b.p.1) > 0.0
    {
        let my = (a.p.1 + b.p.1) / 2.0;
        pts.extend([(a.p.0, my), (b.p.0, my)]);
    } else {
        let ea = (a.p.0 + da.0 * ELBOW_PADDING, a.p.1 + da.1 * ELBOW_PADDING);
        let eb = (b.p.0 + db.0 * ELBOW_PADDING, b.p.1 + db.1 * ELBOW_PADDING);
        let c = if horiz(da) {
            (ea.0, eb.1)
        } else {
            (eb.0, ea.1)
        };
        pts.extend([ea, c, eb]);
    }
    pts.push(b.p);
    simplify(pts)
}

/// Points confondus et points alignés sur un même axe retirés (les bouts restent).
fn simplify(pts: Vec<(f64, f64)>) -> Vec<(f64, f64)> {
    let mut out: Vec<(f64, f64)> = Vec::with_capacity(pts.len());
    for p in pts {
        if out
            .last()
            .is_some_and(|q| (q.0 - p.0).abs() < 1e-9 && (q.1 - p.1).abs() < 1e-9)
        {
            continue;
        }
        if out.len() >= 2 {
            let (a, b) = (out[out.len() - 2], out[out.len() - 1]);
            let same_x = (a.0 - b.0).abs() < 1e-9 && (b.0 - p.0).abs() < 1e-9;
            let same_y = (a.1 - b.1).abs() < 1e-9 && (b.1 - p.1).abs() < 1e-9;
            if same_x || same_y {
                out.pop();
            }
        }
        out.push(p);
    }
    out
}

/// Normale monde sortante du côté le plus proche du rapport `fixed` (haut, droite, bas, gauche), ramenée à l'axe dominant.
pub(crate) fn side_normal(b: &BindBox, fixed: [f64; 2]) -> (f64, f64) {
    let d = [fixed[1], 1.0 - fixed[0], 1.0 - fixed[1], fixed[0]];
    let k = (0..4).min_by(|i, j| d[*i].total_cmp(&d[*j])).unwrap_or(0);
    let local = [(0.0, -1.0), (1.0, 0.0), (0.0, 1.0), (-1.0, 0.0)][k];
    let (x, y) = (
        b.t[0] * local.0 + b.t[2] * local.1,
        b.t[1] * local.0 + b.t[3] * local.1,
    );
    toward((0.0, 0.0), (x, y))
}

// ---------------------------------------------------------------------------------------------------------------------
// T4 : suivi et rupture (n° 7, 8), reroutage (n° 12 c).

/// Points monde d'une ligne lue, sa matrice et ses champs.
fn world_of(t: &Transform, s: &ShapeFields) -> Vec<(f64, f64)> {
    path(s)
        .into_iter()
        .map(|(x, y)| apply_transform(t, x, y))
        .collect()
}

/// Bout coudé : ancre et normale du côté lié, ou point libre (bout libre, ou cible absente de la page `page` de la
/// ligne : n° 9, C1).
fn elbow_end<T: ReadTxn>(
    doc: &Document,
    txn: &T,
    page: &str,
    b: Option<&BindInput>,
    p: (f64, f64),
) -> ElbowEnd {
    let target = b.and_then(|b| doc.bound_target(txn, page, &b.id).map(|bx| (b, bx)));
    match target {
        Some((b, bx)) => ElbowEnd {
            p: anchor(&bx, [b.fx, b.fy]),
            normal: Some(side_normal(&bx, [b.fx, b.fy])),
        },
        None => ElbowEnd { p, normal: None },
    }
}

/// Géométrie recalculée d'une ligne (n° 7, 11) : bouts liés recalés sur leur ancre (cible présente), coudée reroutée.
fn settle<T: ReadTxn>(
    doc: &Document,
    txn: &T,
    page: &str,
    s: &ShapeFields,
    mut world: Vec<(f64, f64)>,
    start: Option<&BindInput>,
    end: Option<&BindInput>,
) -> Vec<(f64, f64)> {
    let last = world.len() - 1;
    let a = elbow_end(doc, txn, page, start, world[0]);
    let b = elbow_end(doc, txn, page, end, world[last]);
    if s.elbowed {
        return elbow_route(a, b);
    }
    world[0] = a.p;
    world[last] = b.p;
    world
}

/// Route d'une coudée pour `SetLinePoints` (n° 12 b) : `settle` sur les points demandés.
pub(crate) fn settle_route<T: ReadTxn>(
    doc: &Document,
    txn: &T,
    page: &str,
    s: &ShapeFields,
    world: Vec<(f64, f64)>,
    start: Option<&BindInput>,
    end: Option<&BindInput>,
) -> Vec<(f64, f64)> {
    settle(doc, txn, page, s, world, start, end)
}

/// Applique les écritures d'une ligne (seules celles qui changent) ; rend vrai si une clé a changé.
fn write_line(
    txn: &mut TransactionMut,
    e: &MapRef,
    t: &Transform,
    world: &[(f64, f64)],
    start: Option<&BindInput>,
    end: Option<&BindInput>,
) -> bool {
    let Ok(writes) = line_writes(t, world, start, end) else {
        return false;
    };
    let mut any = false;
    for (k, v) in writes {
        any |= set_or_remove(e, txn, k, v);
    }
    any
}

/// Suivi et rupture (n° 7, 8), dans la transaction de la commande qui a bougé `moved` (une étape, S1) ; `m` : matrice du
/// `Transform` (`None` : boîte d'un texte changée). Rend les ids réécrits (Change). Aucun `boundElements` (DA-2) : on
/// parcourt les éléments de toutes les pages.
pub(crate) fn follow(
    doc: &Document,
    txn: &mut TransactionMut,
    moved: &[String],
    m: Option<&Transform>,
) -> Vec<String> {
    let moved: HashSet<&str> = moved.iter().map(String::as_str).collect();
    let mut work: Vec<(MapRef, String, String, Transform, ShapeFields)> = Vec::new();
    for page in doc.pages_ref().iter(&*txn) {
        let Out::YMap(pm) = page else { continue };
        let Some(Out::YArray(els)) = pm.get(&*txn, "elements") else {
            continue;
        };
        let page_id = out_string(pm.get(&*txn, "id")).unwrap_or_default();
        for o in els.iter(&*txn) {
            let Out::YMap(e) = o else { continue };
            let Some(s) = read_shape(&*txn, &e)
                .filter(|s| s.kind.is_segment() && (s.start.is_some() || s.end.is_some()))
            else {
                continue;
            };
            let (Some(id), Some(t)) = (
                out_string(e.get(&*txn, "id")),
                out_transform(e.get(&*txn, "transform")),
            ) else {
                continue;
            };
            work.push((e, page_id.clone(), id, t, s));
        }
    }
    let mut out = Vec::new();
    for (e, page, id, t, s) in work {
        let in_moved =
            |b: &Option<BindInput>| b.as_ref().is_some_and(|b| moved.contains(b.id.as_str()));
        let (sm, em) = (in_moved(&s.start), in_moved(&s.end));
        let self_moved = moved.contains(id.as_str());
        let (start, end) = if self_moved {
            // Rupture : chaque liaison dont la cible ne bouge pas avec la ligne est retirée.
            (s.start.clone().filter(|_| sm), s.end.clone().filter(|_| em))
        } else if sm || em {
            (s.start.clone(), s.end.clone())
        } else {
            continue;
        };
        let mut world = world_of(&t, &s);
        if let (false, true, true, Some(m)) = (self_moved, sm, em, m) {
            // Deux bouts liés à des cibles qui bougent ensemble : les points intérieurs suivent en bloc.
            let last = world.len() - 1;
            for p in &mut world[1..last] {
                *p = apply_transform(m, p.0, p.1);
            }
        }
        let world = settle(doc, &*txn, &page, &s, world, start.as_ref(), end.as_ref());
        if write_line(txn, &e, &t, &world, start.as_ref(), end.as_ref()) {
            out.push(id);
        }
    }
    out
}

/// Reroutage d'une flèche qui vient de passer coudée (n° 12 c), dans la transaction de `SetStyle`.
pub(crate) fn reroute(doc: &Document, txn: &mut TransactionMut, page: &str, e: &MapRef) {
    let (Some(s), Some(t)) = (
        read_shape(&*txn, e),
        out_transform(e.get(&*txn, "transform")),
    ) else {
        return;
    };
    let world = settle(
        doc,
        &*txn,
        page,
        &s,
        world_of(&t, &s),
        s.start.as_ref(),
        s.end.as_ref(),
    );
    write_line(txn, e, &t, &world, s.start.as_ref(), s.end.as_ref());
}

// ---------------------------------------------------------------------------------------------------------------------
// T4 : objet relié (n° 27, DA-4).

/// Écart entre un nœud et son objet relié (`VERTICAL_OFFSET` / `HORIZONTAL_OFFSET` d'Excalidraw).
pub const LINK_GAP: f64 = 100.0;
/// Glissements au plus quand la place est prise.
const LINK_TRIES: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LinkDir {
    Up,
    Down,
    Left,
    Right,
}

impl LinkDir {
    pub fn parse(s: &str) -> Option<LinkDir> {
        Some(match s {
            "up" => LinkDir::Up,
            "down" => LinkDir::Down,
            "left" => LinkDir::Left,
            "right" => LinkDir::Right,
            _ => return None,
        })
    }
    fn unit(self) -> (f64, f64) {
        match self {
            LinkDir::Up => (0.0, -1.0),
            LinkDir::Down => (0.0, 1.0),
            LinkDir::Left => (-1.0, 0.0),
            LinkDir::Right => (1.0, 0.0),
        }
    }
    /// Milieu du côté de la source qui regarde la direction ; le côté opposé de la copie est `(1 - fx, 1 - fy)`.
    fn ratio(self) -> [f64; 2] {
        match self {
            LinkDir::Up => [0.5, 0.0],
            LinkDir::Down => [0.5, 1.0],
            LinkDir::Left => [0.0, 0.5],
            LinkDir::Right => [1.0, 0.5],
        }
    }
}

/// Boîte monde alignée d'une boîte d'accroche.
fn world_box(b: &BindBox) -> (f64, f64, f64, f64) {
    let c =
        [(0.0, 0.0), (b.w, 0.0), (b.w, b.h), (0.0, b.h)].map(|(x, y)| apply_transform(&b.t, x, y));
    let xs = c.map(|p| p.0);
    let ys = c.map(|p| p.1);
    let min = |v: [f64; 4]| v.iter().copied().fold(f64::INFINITY, f64::min);
    let max = |v: [f64; 4]| v.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    (min(xs), min(ys), max(xs), max(ys))
}

impl Document {
    /// `AddLinked` (n° 27, DA-4) : plan sous une lecture fermée (copie par `copy_prelims`, jamais `insert_fragment`, qui
    /// ouvrirait sa propre transaction), puis une seule `transact_local` : une étape.
    pub(crate) fn cmd_add_linked(
        &mut self,
        id: &str,
        dir: LinkDir,
    ) -> Result<Change, CommandError> {
        let (page, into, copy_id, copy, arrow) = {
            let txn = self.read();
            let found = self
                .find_element(&txn, id)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let s = read_shape(&txn, &found.element)
                .filter(|s| {
                    matches!(
                        s.kind,
                        ShapeKind::Rect | ShapeKind::Ellipse | ShapeKind::Diamond
                    )
                })
                .ok_or(CommandError::BadShape)?;
            let src = bind_box(&txn, &found.element).ok_or(CommandError::BadShape)?;
            let into = self
                .page_elements(&txn, &found.page_id)
                .ok_or_else(|| CommandError::UnknownPage(found.page_id.clone()))?;
            let others: Vec<(f64, f64, f64, f64)> = into
                .iter(&txn)
                .filter_map(|o| match o {
                    Out::YMap(e) => Some(e),
                    _ => None,
                })
                .filter_map(|e| bind_box(&txn, &e))
                .filter(|b| b.id != id)
                .map(|b| world_box(&b))
                .collect();
            let (x0, y0, x1, y1) = world_box(&src);
            let (sw, sh) = (x1 - x0, y1 - y0);
            let (ux, uy) = dir.unit();
            let (mut dx, mut dy) = (ux * (sw + LINK_GAP), uy * (sh + LINK_GAP));
            let hits = |dx: f64, dy: f64| {
                others
                    .iter()
                    .any(|o| x0 + dx < o.2 && x1 + dx > o.0 && y0 + dy < o.3 && y1 + dy > o.1)
            };
            for _ in 0..LINK_TRIES {
                if !hits(dx, dy) {
                    break;
                }
                if ux != 0.0 {
                    dy += sh + LINK_GAP;
                } else {
                    dx += sw + LINK_GAP;
                }
            }
            let mut prelims = crate::copy::copy_prelims(
                &txn,
                std::slice::from_ref(&found.element),
                &mut Default::default(),
                dx,
                dy,
            );
            let (copy_id, mut copy) = prelims.remove(0);
            copy.remove("group");
            // C1 : une copie reliée n'hérite ni du lien de sa source ni de sa graine (tracé neuf, comme un groupe neuf).
            copy.remove("link");
            // OG33 (choix 8) : la copie reliée part sans texte.
            copy.remove("label");
            if copy.contains_key("seed") {
                copy.insert(
                    "seed".into(),
                    In::Any(Any::from(f64::from(crate::style::random_seed()))),
                );
            }
            let dst = BindBox {
                id: copy_id.clone(),
                t: [
                    src.t[0],
                    src.t[1],
                    src.t[2],
                    src.t[3],
                    src.t[4] + dx,
                    src.t[5] + dy,
                ],
                ..src.clone()
            };
            let [fx, fy] = dir.ratio();
            let start = BindInput {
                id: id.to_string(),
                fx,
                fy,
            };
            let end = BindInput {
                id: copy_id.clone(),
                fx: 1.0 - fx,
                fy: 1.0 - fy,
            };
            // C1 : normale du côté lié dans le repère de la source (tournée : le côté droit local peut regarder en bas).
            let route = elbow_route(
                ElbowEnd {
                    p: anchor(&src, [fx, fy]),
                    normal: Some(side_normal(&src, [fx, fy])),
                },
                ElbowEnd {
                    p: anchor(&dst, [end.fx, end.fy]),
                    normal: Some(side_normal(&dst, [end.fx, end.fy])),
                },
            );
            let arrow = linked_arrow_fields(&route, &s.style, &start, &end)?;
            (found.page_id, into, copy_id, copy, arrow)
        };
        let arrow_id = arrow.0.clone();
        {
            let mut txn = self.transact_local();
            let n = into.len(&txn);
            into.insert(&mut txn, n, copy);
            into.push_back(&mut txn, arrow.1);
        }
        Ok(self.done(Change {
            pages: vec![page],
            ids: vec![copy_id, arrow_id],
            ..Default::default()
        }))
    }
}

/// Champs de la flèche coudée d'`AddLinked` : comme `cmd_add_shape`, `elbowed: true`, couleur et épaisseur de la source,
/// pointe de fin neutre (`arrow`, non écrite), liaisons et points de la route.
fn linked_arrow_fields(
    route: &[(f64, f64)],
    style: &crate::element::StrokeStyle,
    start: &BindInput,
    end: &BindInput,
) -> Result<(String, yrs::MapPrelim), CommandError> {
    let id = yrs::uuid_v4().to_string();
    let mut fields: Vec<(&str, In)> = vec![
        ("id", In::from(id.as_str())),
        ("kind", In::from("shape")),
        ("shape", In::from("arrow")),
        ("color", In::from(style.color.as_str())),
        ("width", In::Any(Any::from(f64::from(style.width)))),
    ];
    for (k, v) in line_writes(&crate::element::IDENTITY, route, Some(start), Some(end))? {
        if let Some(v) = v {
            fields.push((k, v));
        }
    }
    fields.push(("elbowed", In::Any(Any::Bool(true))));
    Ok((id, fields.into_iter().collect()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn elbow_route_is_orthogonal_and_short() {
        let r = elbow_route(
            ElbowEnd {
                p: (107.0, 25.0),
                normal: Some((1.0, 0.0)),
            },
            ElbowEnd {
                p: (393.0, 225.0),
                normal: Some((-1.0, 0.0)),
            },
        );
        assert_eq!(
            r,
            vec![(107.0, 25.0), (250.0, 25.0), (250.0, 225.0), (393.0, 225.0)]
        );
        let r = elbow_route(
            ElbowEnd {
                p: (0.0, 0.0),
                normal: Some((1.0, 0.0)),
            },
            ElbowEnd {
                p: (-200.0, 300.0),
                normal: Some((0.0, -1.0)),
            },
        );
        assert!(
            r.len() <= 6 && r.windows(2).all(|s| s[0].0 == s[1].0 || s[0].1 == s[1].1),
            "{r:?}"
        );
        let free = elbow_route(
            ElbowEnd {
                p: (0.0, 0.0),
                normal: None,
            },
            ElbowEnd {
                p: (100.0, 0.0),
                normal: None,
            },
        );
        assert_eq!(free, vec![(0.0, 0.0), (100.0, 0.0)]);
    }
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
            outline: Outline::Box,
            gap: 7.0,
        };
        assert_eq!(anchor(&b, [1.0, 0.5]), (117.0, 45.0));
        assert_eq!(anchor(&b, [0.3, 0.4]), (40.0, 40.0), "dedans : sans écart");
        let e = BindBox {
            outline: Outline::Ellipse,
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

    /// C1 constat 2 : liaison écrite vers un objet d'une autre page (fichier, pair distant) : lue libre par la vue, jamais
    /// suivie. Sous le patron fautif (`find_element` sur toutes les pages), la vue montre `start` et le déplacement de la
    /// cible réécrit la flèche.
    #[test]
    fn binding_to_other_page_reads_free_and_never_follows() {
        let mut d = Document::blank();
        let p1 = d.page_ids()[0].clone();
        let p2 = d
            .apply(Command::AddPage {
                after: None,
                mode: None,
            })
            .expect("page")
            .pages[0]
            .clone();
        let add = |d: &mut Document, page: &str, shape: ShapeKind, c: [f64; 4]| {
            d.apply(Command::AddShape {
                page: page.to_string(),
                shape,
                x0: c[0],
                y0: c[1],
                x1: c[2],
                y1: c[3],
                style: StrokeStyle {
                    color: "#000000".into(),
                    width: 4.0,
                },
                fill: None,
                look: Look::default(),
                line: LineInit::default(),
            })
            .expect("ajout")
            .ids[0]
                .clone()
        };
        let r = add(&mut d, &p2, ShapeKind::Rect, [0.0, 0.0, 100.0, 50.0]);
        let f = add(&mut d, &p1, ShapeKind::Arrow, [200.0, 25.0, 400.0, 25.0]);
        {
            let txn = d.read();
            let e = d.find_element(&txn, &f).expect("élément").element;
            drop(txn);
            let mut w = d.transact_local();
            e.insert(&mut w, "startBound", In::from(r.as_str()));
            e.insert(&mut w, "startFixed", nums_in(&[1.0, 0.5]));
        }
        let before = serde_json::to_value(d.element(&f).expect("vue")).expect("json");
        assert!(
            before["shape"].get("start").is_none(),
            "lue libre : {before}"
        );
        let ch = d
            .apply(Command::Transform {
                ids: vec![r.clone()],
                matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 100.0],
            })
            .expect("déplacer");
        assert_eq!(ch.ids, vec![r.clone()], "flèche non suivie");
        let after = serde_json::to_value(d.element(&f).expect("vue")).expect("json");
        assert_eq!(after, before);
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
