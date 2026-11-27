//! OG11 (déc. 25, DA-1, DA-5) : `SetStyle` — un patch de style appliqué aux éléments qui admettent chaque champ, en une
//! seule étape d'annulation. Les écritures effectives sont calculées d'abord dans une transaction de lecture : aucune
//! transaction d'écriture ni étape quand rien ne change (D38). Un neutre retire le champ, jamais il ne s'écrit (G12).
use yrs::{Any, In, Map, MapRef, ReadTxn};

use crate::commands::{Change, CommandError};
use crate::document::Document;
use crate::element::{out_string, read_look, STROKE_STYLES};
use crate::fill::{same_value, set_or_remove};
use crate::rich_text::valid_color;

/// Patch de style : `None` laisse le champ ; `Some(None)` le retire (neutre). `roughness: Some(0)` retire `roughness` et
/// `seed` ; `opacity` dans [0, 100], arrondie, `Some(100.0)` retire `opacity`.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct StylePatch {
    pub color: Option<String>,
    pub width: Option<f32>,
    pub fill: Option<Option<String>>,
    pub stroke_style: Option<Option<String>>,
    pub roughness: Option<u8>,
    pub roundness: Option<Option<String>>,
    pub opacity: Option<f64>,
}

impl StylePatch {
    /// Tout le patch est validé avant la moindre lecture ; rend l'opacité arrondie.
    fn validate(&self) -> Result<Option<u8>, CommandError> {
        let bad = Err(CommandError::BadStyle);
        if self.color.as_deref().is_some_and(|c| !valid_color(c)) {
            return bad;
        }
        if self.width.is_some_and(|w| !(w.is_finite() && w > 0.0)) {
            return bad;
        }
        if matches!(&self.fill, Some(Some(c)) if !valid_color(c)) {
            return bad;
        }
        if matches!(&self.stroke_style, Some(Some(s)) if !STROKE_STYLES.contains(&s.as_str())) {
            return bad;
        }
        if self.roughness.is_some_and(|r| r > 2) {
            return bad;
        }
        if matches!(&self.roundness, Some(Some(s)) if s != "round") {
            return bad;
        }
        match self.opacity {
            None => Ok(None),
            Some(o) if o.is_finite() && (0.0..=100.0).contains(&o) => Ok(Some(o.round() as u8)),
            Some(_) => bad,
        }
    }
}

/// Nombre écrit comme `style_fields` et `look_fields` (`Any` d'un `f64`).
fn num(x: f64) -> In {
    In::Any(Any::from(x))
}

fn text(s: &str) -> In {
    In::from(s)
}

/// Graine neuve (`apply`) : FNV-1a des octets d'un `uuid_v4` de yrs.
pub(crate) fn random_seed() -> u32 {
    let u = yrs::uuid_v4();
    u.as_bytes().iter().fold(0x811c_9dc5_u32, |h, b| {
        (h ^ u32::from(*b)).wrapping_mul(0x0100_0193)
    })
}

/// Écritures du patch pour un élément de genre `kind` (forme `shape`), champs inapplicables sautés (DA-1, déc. 25).
/// `seed` : `Some(graine)` à écrire avec le tracé, `None` si le tracé ne demande pas de graine neuve.
fn writes_for(
    kind: &str,
    shape: Option<&str>,
    p: &StylePatch,
    opacity: Option<u8>,
    seed: Option<u32>,
) -> Vec<(&'static str, Option<In>)> {
    let is_shape = kind == "shape";
    let mut w = Vec::new();
    if let Some(c) = &p.color {
        if matches!(kind, "stroke" | "shape" | "text") {
            w.push(("color", Some(text(c))));
        }
    }
    if let Some(x) = p.width {
        if matches!(kind, "stroke" | "shape") {
            w.push(("width", Some(num(f64::from(x)))));
        }
    }
    if let Some(f) = &p.fill {
        if is_shape && matches!(shape, Some("rect" | "ellipse")) {
            w.push(("fill", f.as_deref().map(text)));
        }
    }
    if let Some(s) = &p.stroke_style {
        if is_shape {
            w.push(("strokeStyle", s.as_deref().map(text)));
        }
    }
    if let Some(r) = p.roughness {
        if is_shape {
            if r == 0 {
                w.push(("roughness", None));
                w.push(("seed", None));
            } else {
                w.push(("roughness", Some(num(f64::from(r)))));
                if let Some(s) = seed {
                    w.push(("seed", Some(num(f64::from(s)))));
                }
            }
        }
    }
    if let Some(s) = &p.roundness {
        if is_shape && shape == Some("rect") {
            w.push(("roundness", s.as_deref().map(text)));
        }
    }
    if let Some(o) = opacity {
        if matches!(kind, "stroke" | "shape" | "text" | "image") {
            w.push(("opacity", (o < 100).then(|| num(f64::from(o)))));
        }
    }
    w
}

/// Vrai si écrire `v` sous `key` changerait l'élément (même règle que `set_or_remove`).
fn differs<T: ReadTxn>(txn: &T, e: &MapRef, key: &str, v: Option<&In>) -> bool {
    match (e.get(txn, key), v) {
        (None, None) => false,
        (Some(_), None) | (None, Some(_)) => true,
        (Some(cur), Some(next)) => !same_value(&cur, next),
    }
}

impl Document {
    /// `SetStyle` (T2) : validation, puis plan des écritures effectives (lecture), puis une seule `transact_local`.
    /// La graine est tirée par `new_seed` seulement quand le tracé passe à 1 ou 2 depuis un autre niveau (ou sans
    /// graine lisible) : au même niveau, la graine reste (`actionProperties.tsx:783` d'Excalidraw).
    pub(crate) fn cmd_set_style(
        &mut self,
        ids: &[String],
        patch: &StylePatch,
        mut new_seed: impl FnMut() -> u32,
    ) -> Result<Change, CommandError> {
        let opacity = patch.validate()?;
        let mut plan: Vec<(MapRef, &'static str, Option<In>)> = Vec::new();
        let mut pages: Vec<String> = Vec::new();
        let mut touched: Vec<String> = Vec::new();
        {
            let txn = self.read();
            for id in ids {
                let found = self
                    .find_element(&txn, id)
                    .ok_or_else(|| CommandError::UnknownElement(id.clone()))?;
                let e = found.element;
                let kind = out_string(e.get(&txn, "kind")).unwrap_or_default();
                let shape = out_string(e.get(&txn, "shape"));
                let seed = match patch.roughness {
                    Some(r @ 1..=2) if kind == "shape" => {
                        let l = read_look(&txn, &e);
                        if l.roughness == Some(r) && l.seed.is_some() {
                            None
                        } else {
                            Some(new_seed())
                        }
                    }
                    _ => None,
                };
                let mut any = false;
                for (key, v) in writes_for(&kind, shape.as_deref(), patch, opacity, seed) {
                    if differs(&txn, &e, key, v.as_ref()) {
                        plan.push((e.clone(), key, v));
                        any = true;
                    }
                }
                if any && !touched.contains(id) {
                    touched.push(id.clone());
                    if !pages.contains(&found.page_id) {
                        pages.push(found.page_id.clone());
                    }
                }
            }
        }
        if plan.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for (map, key, v) in plan {
                set_or_remove(&map, &mut txn, key, v);
            }
        }
        Ok(self.done(Change {
            pages,
            ids: touched,
            ..Default::default()
        }))
    }
}
