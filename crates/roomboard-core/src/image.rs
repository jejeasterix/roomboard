//! Réglages non destructifs d'une image (C5, U29, I2-I8) : lecture tolérante des champs du `Y.Map` de l'élément (un
//! champ illisible est lu comme absent, U3), domaine (I5), boîte affichée (I8). Champ neutre = champ absent (I4) ;
//! `crop` en `Any::Array` positionnel, `transparent` en `Y.Map` de champs scalaires, jamais `Any::Map` (I2, G4).
//! L'écriture (`Command::SetImageParams`) suit le patron de `fill.rs` ; l'asset n'est jamais réécrit.
use yrs::{Any, Map, MapRef, Out, ReadTxn};

use crate::element::{any_f64, out_f64, out_string};

/// Couleur rendue transparente (I5, I12-I14) : `color` en `#rrggbb` minuscules ; `tolerance`, `soft` de 0 à 100.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct TransparentView {
    pub color: String,
    pub tolerance: u8,
    pub soft: u8,
    pub contiguous: bool,
}

/// Couleur transparente demandée (I6) : valeurs brutes, contrôlées par `transparent_of`.
#[derive(Debug, Clone, PartialEq)]
pub struct TransparentInput {
    pub color: String,
    pub tolerance: f64,
    pub soft: f64,
    pub contiguous: bool,
}

/// Réglages normalisés (I4, I5) : neutres à `None`, `false` ou 0 ; `crop` = `[x, y, w, h]` en pixels source, jamais
/// l'image entière ; `quarter_turns` 0 à 3, sens horaire.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ImageParams {
    pub crop: Option<[u32; 4]>,
    pub flip_x: bool,
    pub flip_y: bool,
    pub quarter_turns: u8,
    pub brightness: i8,
    pub contrast: i8,
    pub transparent: Option<TransparentView>,
}

/// Plafond des entiers d'un rognage (u32).
const MAX_INT: f64 = 4_294_967_295.0;

/// `v` si c'est un entier fini de `lo` à `hi`.
fn int_in(v: f64, lo: f64, hi: f64) -> Option<f64> {
    (v.is_finite() && v.fract() == 0.0 && v >= lo && v <= hi).then_some(v)
}

/// `#rrggbb` en hexadécimal minuscule (I5) ; `None` pour toute autre forme (nom CSS, majuscules, `#rgb`) : `valid_color`
/// de `rich_text.rs` accepte des noms, inutilisables pour des pixels.
pub fn parse_rgb_hex(c: &str) -> Option<[u8; 3]> {
    let hex = c.strip_prefix('#')?;
    if hex.len() != 6
        || !hex
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return None;
    }
    let byte = |i: usize| u8::from_str_radix(&hex[i..i + 2], 16).ok();
    Some([byte(0)?, byte(2)?, byte(4)?])
}

/// Rognage `[x, y, w, h]` d'une image `w × h` (I5) : `None` hors domaine (entiers, `x, y ≥ 0`, `w, h ≥ 1`, dans
/// l'image) ; `Some(None)` pour l'image entière (neutre, I4).
fn crop_of(c: [f64; 4], w: f64, h: f64) -> Option<Option<[u32; 4]>> {
    let x = int_in(c[0], 0.0, MAX_INT)?;
    let y = int_in(c[1], 0.0, MAX_INT)?;
    let cw = int_in(c[2], 1.0, MAX_INT)?;
    let ch = int_in(c[3], 1.0, MAX_INT)?;
    if x + cw > w || y + ch > h {
        return None;
    }
    let full = x == 0.0 && y == 0.0 && cw == w && ch == h;
    Some((!full).then_some([x as u32, y as u32, cw as u32, ch as u32]))
}

/// Domaine de la couleur transparente (I5).
fn transparent_of(t: &TransparentInput) -> Option<TransparentView> {
    parse_rgb_hex(&t.color)?;
    Some(TransparentView {
        color: t.color.clone(),
        tolerance: int_in(t.tolerance, 0.0, 100.0)? as u8,
        soft: int_in(t.soft, 0.0, 100.0)? as u8,
        contiguous: t.contiguous,
    })
}

fn out_bool(o: Option<Out>) -> Option<bool> {
    match o {
        Some(Out::Any(Any::Bool(b))) => Some(b),
        _ => None,
    }
}

fn read_crop(o: Option<Out>, w: f64, h: f64) -> Option<[u32; 4]> {
    let Some(Out::Any(Any::Array(items))) = o else {
        return None;
    };
    if items.len() != 4 {
        return None;
    }
    let mut c = [0.0; 4];
    for (slot, a) in c.iter_mut().zip(items.iter()) {
        *slot = any_f64(a)?;
    }
    crop_of(c, w, h).flatten()
}

fn read_transparent<T: ReadTxn>(txn: &T, o: Option<Out>) -> Option<TransparentView> {
    let Some(Out::YMap(m)) = o else {
        return None;
    };
    transparent_of(&TransparentInput {
        color: out_string(m.get(txn, "color"))?,
        tolerance: out_f64(m.get(txn, "tolerance"))?,
        soft: out_f64(m.get(txn, "soft"))?,
        contiguous: out_bool(m.get(txn, "contiguous"))?,
    })
}

/// Réglages de l'image `e` de taille source `w × h`, champ par champ : un champ illisible ou hors domaine est lu comme
/// absent (U3), l'élément reste lisible ; rien n'est réécrit à la lecture.
pub(crate) fn read_params<T: ReadTxn>(txn: &T, e: &MapRef, w: f64, h: f64) -> ImageParams {
    let int =
        |key: &str, lo: f64, hi: f64| out_f64(e.get(txn, key)).and_then(|v| int_in(v, lo, hi));
    ImageParams {
        crop: read_crop(e.get(txn, "crop"), w, h),
        flip_x: out_bool(e.get(txn, "flipX")).unwrap_or(false),
        flip_y: out_bool(e.get(txn, "flipY")).unwrap_or(false),
        quarter_turns: int("quarterTurns", 0.0, 3.0).map_or(0, |v| v as u8),
        brightness: int("brightness", -100.0, 100.0).map_or(0, |v| v as i8),
        contrast: int("contrast", -100.0, 100.0).map_or(0, |v| v as i8),
        transparent: read_transparent(txn, e.get(txn, "transparent")),
    }
}

/// Boîte affichée (I8) : taille du rognage (ou de l'image), échangée si le nombre de quarts de tour est impair.
pub fn display_size(w: f64, h: f64, crop: Option<[u32; 4]>, quarter_turns: u8) -> (f64, f64) {
    let (cw, ch) = crop.map_or((w, h), |c| (f64::from(c[2]), f64::from(c[3])));
    if quarter_turns % 2 == 1 {
        (ch, cw)
    } else {
        (cw, ch)
    }
}

pub(crate) fn is_zero_u8(v: &u8) -> bool {
    *v == 0
}

pub(crate) fn is_zero_i8(v: &i8) -> bool {
    *v == 0
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Arc;

    use yrs::{Any, In, Map, MapPrelim};

    use super::*;
    use crate::asset::AssetRef;
    use crate::commands::Command;
    use crate::document::Document;
    use crate::element::{ImageView, Transform, IDENTITY};
    use crate::query::Bounds;

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    /// Image `w × h` placée par `m` sur la première page : (page, id).
    fn add(d: &mut Document, w: f64, h: f64, m: Transform) -> (String, String) {
        let p = d.page_ids()[0].clone();
        let id = d
            .apply(Command::AddImage {
                page: p.clone(),
                asset: AssetRef {
                    id: ABC.into(),
                    name: "a.png".into(),
                    mime: "image/png".into(),
                    size: 3.0,
                },
                w,
                h,
                matrix: m,
            })
            .expect("image")
            .ids[0]
            .clone();
        (p, id)
    }

    /// Écrit un champ brut de l'élément (comme une autre version le ferait), hors commande.
    fn put(d: &Document, id: &str, key: &str, v: In) {
        let e = {
            let txn = d.read();
            d.find_element(&txn, id).expect("élément").element
        };
        let mut txn = d.transact_local();
        e.insert(&mut txn, key, v);
    }

    fn nums(v: &[f64]) -> In {
        In::Any(Any::Array(
            v.iter().map(|x| Any::from(*x)).collect::<Vec<Any>>().into(),
        ))
    }

    fn color_map(color: &str, tolerance: f64) -> In {
        In::Map(MapPrelim::from([
            ("color", In::from(color)),
            ("tolerance", In::Any(Any::from(tolerance))),
            ("soft", In::Any(Any::from(0.0))),
            ("contiguous", In::Any(Any::Bool(true))),
        ]))
    }

    /// Forme interdite (I2, G4) : `Any::Map`, encodé par yrs dans l'ordre d'un `HashMap` à graine aléatoire.
    fn any_map(fields: &[(&str, Any)]) -> In {
        let m: HashMap<String, Any> = fields
            .iter()
            .map(|(k, v)| ((*k).to_string(), v.clone()))
            .collect();
        In::Any(Any::Map(Arc::new(m)))
    }

    fn params_of(d: &Document, id: &str) -> ImageParams {
        d.element(id)
            .and_then(|e| e.image)
            .expect("image lisible")
            .params()
    }

    #[test]
    fn read_params_reads_each_field() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        put(&d, &id, "crop", nums(&[10.0, 20.0, 100.0, 50.0]));
        put(&d, &id, "flipX", In::Any(Any::Bool(true)));
        put(&d, &id, "quarterTurns", In::Any(Any::from(1.0)));
        put(&d, &id, "brightness", In::Any(Any::from(30.0)));
        put(&d, &id, "contrast", In::Any(Any::from(-20.0)));
        put(&d, &id, "transparent", color_map("#ffffff", 10.0));
        assert_eq!(
            params_of(&d, &id),
            ImageParams {
                crop: Some([10, 20, 100, 50]),
                flip_x: true,
                flip_y: false,
                quarter_turns: 1,
                brightness: 30,
                contrast: -20,
                transparent: Some(TransparentView {
                    color: "#ffffff".into(),
                    tolerance: 10,
                    soft: 0,
                    contiguous: true,
                }),
            }
        );
        let i = d.element(&id).and_then(|e| e.image).expect("image");
        assert_eq!(i.display_size(), (50.0, 100.0));
    }

    /// Review Focus 4 (I4, I5, U3) : champ illisible lu comme absent, l'élément reste lisible.
    #[test]
    fn unreadable_fields_read_as_absent() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        for (key, v) in [
            ("crop", nums(&[0.0, 0.0, 0.0, 5.0])),
            ("flipX", In::from("oui")),
            ("flipY", In::Any(Any::from(1.0))),
            ("quarterTurns", In::Any(Any::from(4.0))),
            ("brightness", In::Any(Any::from(101.0))),
            ("contrast", In::Any(Any::from(2.5))),
            ("transparent", In::Any(Any::from("#ffffff"))),
        ] {
            put(&d, &id, key, v);
        }
        assert_eq!(params_of(&d, &id), ImageParams::default());
        for c in [
            [600.0, 0.0, 100.0, 10.0],
            [0.5, 0.0, 10.0, 10.0],
            [-1.0, 0.0, 10.0, 10.0],
        ] {
            put(&d, &id, "crop", nums(&c));
            assert_eq!(params_of(&d, &id).crop, None, "{c:?}");
        }
        put(&d, &id, "transparent", color_map("white", 10.0));
        assert_eq!(params_of(&d, &id).transparent, None);
        put(&d, &id, "transparent", color_map("#FFFFFF", 10.0));
        assert_eq!(params_of(&d, &id).transparent, None);
        put(&d, &id, "transparent", color_map("#ffffff", 101.0));
        assert_eq!(params_of(&d, &id).transparent, None);
    }

    /// Patron écarté (I2, G4) : des réglages valides rangés en `Any::Map` (un champ `params`, ou `transparent` en
    /// `Any::Map` au lieu d'un `Y.Map`) ne sont pas lus ; seuls les champs scalaires du `Y.Map` de l'élément comptent,
    /// comme `transform` et le fond (`read_backdrop`).
    #[test]
    fn any_map_params_read_as_absent() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        let crop = Any::Array(
            vec![
                Any::from(0.0),
                Any::from(0.0),
                Any::from(200.0),
                Any::from(100.0),
            ]
            .into(),
        );
        let transparent = [
            ("color", Any::from("#ffffff")),
            ("tolerance", Any::from(10.0)),
            ("soft", Any::from(0.0)),
            ("contiguous", Any::Bool(true)),
        ];
        put(
            &d,
            &id,
            "params",
            any_map(&[
                ("crop", crop),
                ("flipX", Any::Bool(true)),
                ("quarterTurns", Any::from(1.0)),
                ("brightness", Any::from(30.0)),
            ]),
        );
        put(&d, &id, "transparent", any_map(&transparent));
        assert_eq!(params_of(&d, &id), ImageParams::default());
        let i = d.element(&id).and_then(|e| e.image).expect("image");
        assert_eq!(i.display_size(), (640.0, 480.0));
        assert_eq!(
            d.hit_test(&p, 500.0, 300.0, 0.0),
            Some(id.clone()),
            "boîte source entière"
        );
        put(&d, &id, "transparent", color_map("#ffffff", 10.0));
        assert_eq!(
            params_of(&d, &id).transparent.map(|t| t.tolerance),
            Some(10),
            "Y.Map lu"
        );
    }

    #[test]
    fn full_crop_reads_as_absent() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        put(&d, &id, "crop", nums(&[0.0, 0.0, 640.0, 480.0]));
        assert_eq!(params_of(&d, &id).crop, None);
    }

    /// Effet de bord 1 (I8) : collision, bornes et rectangle suivent la boîte affichée.
    #[test]
    fn image_box_follows_crop_and_turns() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        put(&d, &id, "crop", nums(&[0.0, 0.0, 200.0, 100.0]));
        let b = d.bounds(std::slice::from_ref(&id)).expect("bornes");
        assert_eq!((b.x0, b.y0, b.x1, b.y1), (100.0, 50.0, 300.0, 150.0));
        assert_eq!(d.hit_test(&p, 250.0, 100.0, 0.0), Some(id.clone()));
        assert_eq!(
            d.hit_test(&p, 500.0, 100.0, 0.0),
            None,
            "hors du rognage : plus de collision"
        );
        put(&d, &id, "quarterTurns", In::Any(Any::from(1.0)));
        let b = d.bounds(std::slice::from_ref(&id)).expect("bornes");
        assert_eq!((b.x0, b.y0, b.x1, b.y1), (100.0, 50.0, 200.0, 250.0));
        assert_eq!(d.hit_test(&p, 150.0, 200.0, 0.0), Some(id.clone()));
        assert_eq!(d.hit_test(&p, 250.0, 100.0, 0.0), None);
        let rect = Bounds {
            x0: 90.0,
            y0: 40.0,
            x1: 210.0,
            y1: 260.0,
        };
        assert_eq!(d.ids_in_rect(&p, rect), vec![id]);
    }

    #[test]
    fn image_view_serializes_camel_case_without_neutral_fields() {
        let plain = ImageView {
            asset: ABC.into(),
            w: 640.0,
            h: 480.0,
            ..ImageView::default()
        };
        assert_eq!(
            serde_json::to_value(&plain).expect("json"),
            serde_json::json!({ "asset": ABC, "w": 640.0, "h": 480.0 })
        );
        let full = ImageView {
            crop: Some([1, 2, 3, 4]),
            flip_x: true,
            flip_y: true,
            quarter_turns: 3,
            brightness: -5,
            contrast: 7,
            transparent: Some(TransparentView {
                color: "#ffffff".into(),
                tolerance: 10,
                soft: 2,
                contiguous: false,
            }),
            ..plain.clone()
        };
        assert_eq!(
            serde_json::to_value(&full).expect("json"),
            serde_json::json!({
                "asset": ABC, "w": 640.0, "h": 480.0, "crop": [1, 2, 3, 4], "flipX": true, "flipY": true,
                "quarterTurns": 3, "brightness": -5, "contrast": 7,
                "transparent": { "color": "#ffffff", "tolerance": 10, "soft": 2, "contiguous": false }
            })
        );
    }
}
