//! Réglages non destructifs d'une image (C5, U29, I2-I8) : lecture tolérante des champs du `Y.Map` de l'élément (un
//! champ illisible est lu comme absent, U3), domaine (I5), boîte affichée (I8). Champ neutre = champ absent (I4) ;
//! `crop` en `Any::Array` positionnel, `transparent` en `Y.Map` de champs scalaires, jamais `Any::Map` (I2, G4).
//! L'écriture (`Command::SetImageParams`) suit le patron de `fill.rs` ; l'asset n'est réécrit que par le pot (C6b,
//! `cmd_fill_image`) et par « Rétablir l'original » (`restore`).
use yrs::{Any, In, Map, MapPrelim, MapRef, Out, ReadTxn};

use crate::asset::AssetRef;
use crate::commands::{valid_asset, valid_matrix, Change, CommandError};
use crate::document::Document;
use crate::element::{any_f64, out_f64, out_string, read_image, transform_to_any, Transform};

/// Couleur rendue transparente (I5, I12-I14) : `color` en `#rrggbb` minuscules ; `tolerance`, `soft` de 0 à 100.
/// OG23 (T10) : départ `x`, `y` de la baguette en pixels source, les deux ou aucun, dans l'image ; avec un départ, seule
/// la zone jointe au point touché s'efface (`contiguous` ignoré). Un départ illisible rend toute la couleur illisible
/// (lue absente, comme `crop`) : `plan` la réécrit alors sans lui, une fois.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct TransparentView {
    pub color: String,
    pub tolerance: u8,
    pub soft: u8,
    pub contiguous: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<u32>,
}

/// Couleur transparente demandée (I6) : valeurs brutes, contrôlées par `transparent_of`.
#[derive(Debug, Clone, PartialEq)]
pub struct TransparentInput {
    pub color: String,
    pub tolerance: f64,
    pub soft: f64,
    pub contiguous: bool,
    pub x: Option<f64>,
    pub y: Option<f64>,
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

/// Domaine de la couleur transparente d'une image `w × h` (I5) ; départ (T10) : les deux ou aucun, entiers,
/// `0 ≤ x < w`, `0 ≤ y < h`.
fn transparent_of(t: &TransparentInput, w: f64, h: f64) -> Option<TransparentView> {
    parse_rgb_hex(&t.color)?;
    let (x, y) = match (t.x, t.y) {
        (None, None) => (None, None),
        (Some(x), Some(y)) => (
            Some(int_in(x, 0.0, w - 1.0)? as u32),
            Some(int_in(y, 0.0, h - 1.0)? as u32),
        ),
        _ => return None,
    };
    Some(TransparentView {
        color: t.color.clone(),
        tolerance: int_in(t.tolerance, 0.0, 100.0)? as u8,
        soft: int_in(t.soft, 0.0, 100.0)? as u8,
        contiguous: t.contiguous,
        x,
        y,
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

fn read_transparent<T: ReadTxn>(
    txn: &T,
    o: Option<Out>,
    w: f64,
    h: f64,
) -> Option<TransparentView> {
    let Some(Out::YMap(m)) = o else {
        return None;
    };
    // Départ présent mais non numérique : NaN, refusé par `transparent_of` comme un départ hors de l'image.
    let seed = |key: &str| {
        m.get(txn, key)
            .map(|v| out_f64(Some(v)).unwrap_or(f64::NAN))
    };
    transparent_of(
        &TransparentInput {
            color: out_string(m.get(txn, "color"))?,
            tolerance: out_f64(m.get(txn, "tolerance"))?,
            soft: out_f64(m.get(txn, "soft"))?,
            contiguous: out_bool(m.get(txn, "contiguous"))?,
            x: seed("x"),
            y: seed("y"),
        },
        w,
        h,
    )
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
        transparent: read_transparent(txn, e.get(txn, "transparent"), w, h),
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

/// Réglages demandés par `SetImageParams` (I6) : état voulu complet, valeurs brutes de la liaison (nombres de JS),
/// contrôlées par `normalize` (I5). `crop: None` : aucun rognage ; `transparent: None` : aucune couleur transparente.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ImageParamsInput {
    pub crop: Option<[f64; 4]>,
    pub flip_x: bool,
    pub flip_y: bool,
    pub quarter_turns: f64,
    pub brightness: f64,
    pub contrast: f64,
    pub transparent: Option<TransparentInput>,
}

/// Domaine de I5, neutres normalisés (I4) ; `None` hors domaine. Mêmes règles que la lecture (`read_params`).
pub(crate) fn normalize(p: &ImageParamsInput, w: f64, h: f64) -> Option<ImageParams> {
    Some(ImageParams {
        crop: match p.crop {
            None => None,
            Some(c) => crop_of(c, w, h)?,
        },
        flip_x: p.flip_x,
        flip_y: p.flip_y,
        quarter_turns: int_in(p.quarter_turns, 0.0, 3.0)? as u8,
        brightness: int_in(p.brightness, -100.0, 100.0)? as i8,
        contrast: int_in(p.contrast, -100.0, 100.0)? as i8,
        transparent: match &p.transparent {
            None => None,
            Some(t) => Some(transparent_of(t, w, h)?),
        },
    })
}

/// `transparent` en `Y.Map` de champs scalaires (I2, comme `backdrop`) ; `x`, `y` seulement s'ils sont là (T10).
fn transparent_prelim(t: &TransparentView) -> In {
    let mut fields = vec![
        ("color", In::from(t.color.as_str())),
        ("tolerance", In::Any(Any::from(f64::from(t.tolerance)))),
        ("soft", In::Any(Any::from(f64::from(t.soft)))),
        ("contiguous", In::Any(Any::Bool(t.contiguous))),
    ];
    if let (Some(x), Some(y)) = (t.x, t.y) {
        fields.push(("x", In::Any(Any::from(f64::from(x)))));
        fields.push(("y", In::Any(Any::from(f64::from(y)))));
    }
    In::Map(MapPrelim::from_iter(fields))
}

/// Écritures du passage de `cur` (lu, normalisé) à `next` : seuls les champs qui changent ; voulu neutre = champ retiré
/// s'il est présent, même illisible (I4) ; `None` = retrait.
fn plan<T: ReadTxn>(
    txn: &T,
    e: &MapRef,
    cur: &ImageParams,
    next: &ImageParams,
) -> Vec<(&'static str, Option<In>)> {
    let num = |v: f64| In::Any(Any::from(v));
    let wanted: [(&'static str, bool, Option<In>); 7] = [
        (
            "crop",
            cur.crop == next.crop,
            next.crop.map(|c| {
                In::Any(Any::Array(
                    c.iter()
                        .map(|v| Any::from(f64::from(*v)))
                        .collect::<Vec<Any>>()
                        .into(),
                ))
            }),
        ),
        (
            "flipX",
            cur.flip_x == next.flip_x,
            next.flip_x.then_some(In::Any(Any::Bool(true))),
        ),
        (
            "flipY",
            cur.flip_y == next.flip_y,
            next.flip_y.then_some(In::Any(Any::Bool(true))),
        ),
        (
            "quarterTurns",
            cur.quarter_turns == next.quarter_turns,
            (next.quarter_turns != 0).then(|| num(f64::from(next.quarter_turns))),
        ),
        (
            "brightness",
            cur.brightness == next.brightness,
            (next.brightness != 0).then(|| num(f64::from(next.brightness))),
        ),
        (
            "contrast",
            cur.contrast == next.contrast,
            (next.contrast != 0).then(|| num(f64::from(next.contrast))),
        ),
        (
            "transparent",
            cur.transparent == next.transparent,
            next.transparent.as_ref().map(transparent_prelim),
        ),
    ];
    wanted
        .into_iter()
        .filter_map(|(key, same, want)| match want {
            None if e.get(txn, key).is_some() => Some((key, None)),
            Some(v) if !same => Some((key, Some(v))),
            _ => None,
        })
        .collect()
}

/// Champs de pixels de C5 cuits dans le nouvel asset par un remplissage (B4) : retirés dans la même transaction.
const BAKED: [&str; 3] = ["brightness", "contrast", "transparent"];

impl Document {
    /// Pot sur une image (C6b, B2-B4) : refus dans l'ordre page, élément de cette page, image lisible (`BadFill`), asset
    /// (`BadAsset`) ; même asset que l'actuel : aucune étape (D38). Une transaction : `asset` ← nouvel asset ;
    /// `sourceAsset` ← ancien asset s'il est absent (l'original reste celui d'avant le premier remplissage) ; luminosité,
    /// contraste et couleur transparente retirés (cuits par la page) ; géométrie et matrice gardées ; métadonnée du nouvel
    /// asset (K3). La couleur est contrôlée par `cmd_fill`, jamais écrite : les pixels la portent.
    pub(crate) fn cmd_fill_image(
        &mut self,
        page: &str,
        id: &str,
        asset: &AssetRef,
    ) -> Result<Change, CommandError> {
        let (element, view) = {
            let txn = self.read();
            self.find_page(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            let found = self
                .find_element(&txn, id)
                .filter(|f| f.page_id == page)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let (_, view) = read_image(&txn, &found.element).ok_or(CommandError::BadFill)?;
            (found.element, view)
        };
        if !valid_asset(asset) {
            return Err(CommandError::BadAsset);
        }
        if asset.id == view.asset {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            element.insert(&mut txn, "asset", In::from(asset.id.as_str()));
            if view.source_asset.is_none() {
                element.insert(&mut txn, "sourceAsset", In::from(view.asset.as_str()));
            }
            for key in BAKED {
                if element.get(&txn, key).is_some() {
                    element.remove(&mut txn, key);
                }
            }
            self.insert_asset_meta(&mut txn, asset);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }

    /// `SetImageParams` (I6) : refus dans l'ordre id inconnu, cible qui n'est pas une image lisible, réglages hors
    /// domaine, matrice ; plan sous une lecture fermée, puis au plus une transaction (une étape) ; aucun champ à écrire
    /// et même matrice : aucune (D38). C6b (B11) : `restore` et un `sourceAsset` lisible : `asset` ← `sourceAsset` dans la
    /// même étape ; `sourceAsset` retiré, même illisible.
    pub(crate) fn cmd_set_image_params(
        &mut self,
        id: &str,
        p: &ImageParamsInput,
        m: &Transform,
        restore: bool,
    ) -> Result<Change, CommandError> {
        let (element, page, transform, ops) = {
            let txn = self.read();
            let found = self
                .find_element(&txn, id)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let (transform, view) =
                read_image(&txn, &found.element).ok_or(CommandError::BadImageParams)?;
            let next = normalize(p, view.w, view.h).ok_or(CommandError::BadImageParams)?;
            if !valid_matrix(m) {
                return Err(CommandError::BadMatrix);
            }
            let mut ops = plan(&txn, &found.element, &view.params(), &next);
            if restore {
                if let Some(src) = &view.source_asset {
                    ops.push(("asset", Some(In::from(src.as_str()))));
                }
                if found.element.get(&txn, "sourceAsset").is_some() {
                    ops.push(("sourceAsset", None));
                }
            }
            (found.element, found.page_id, transform, ops)
        };
        if ops.is_empty() && *m == transform {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for (key, v) in ops {
                match v {
                    Some(v) => {
                        element.insert(&mut txn, key, v);
                    }
                    None => {
                        element.remove(&mut txn, key);
                    }
                }
            }
            if *m != transform {
                element.insert(&mut txn, "transform", transform_to_any(m));
            }
        }
        Ok(self.done(Change {
            pages: vec![page],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
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
    use crate::element::Look;
    use std::collections::HashMap;
    use std::sync::Arc;

    use yrs::{Any, In, Map, MapPrelim};

    use super::*;
    use crate::asset::AssetRef;
    use crate::commands::tests::writes;
    use crate::commands::{Change, Command, CommandError};
    use crate::document::Document;
    use crate::element::StrokeStyle;
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
                    x: None,
                    y: None,
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
                x: None,
                y: None,
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
    fn white_input(contiguous: bool) -> TransparentInput {
        TransparentInput {
            color: "#ffffff".into(),
            tolerance: 10.0,
            soft: 0.0,
            contiguous,
            x: None,
            y: None,
        }
    }

    fn full_input() -> ImageParamsInput {
        ImageParamsInput {
            crop: Some([10.0, 20.0, 300.0, 200.0]),
            flip_x: true,
            flip_y: false,
            quarter_turns: 1.0,
            brightness: 30.0,
            contrast: -20.0,
            transparent: Some(white_input(true)),
        }
    }

    fn set(
        d: &mut Document,
        id: &str,
        params: ImageParamsInput,
        matrix: Transform,
    ) -> Result<Change, CommandError> {
        d.apply(Command::SetImageParams {
            id: id.into(),
            params,
            matrix,
            restore: false,
        })
    }

    const KEYS: [&str; 7] = [
        "crop",
        "flipX",
        "flipY",
        "quarterTurns",
        "brightness",
        "contrast",
        "transparent",
    ];

    /// Champs de réglage présents dans le `Y.Map` de l'élément, lus ou non.
    fn present(d: &Document, id: &str) -> Vec<&'static str> {
        let txn = d.read();
        let e = d.find_element(&txn, id).expect("élément").element;
        KEYS.into_iter()
            .filter(|k| e.get(&txn, k).is_some())
            .collect()
    }

    #[test]
    fn set_image_params_is_one_step_and_reads_back() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        let c = set(&mut d, &id, full_input(), [1.0, 0.0, 0.0, 1.0, 5.0, 6.0]).expect("réglages");
        assert_eq!((c.pages, c.ids), (vec![p], vec![id.clone()]));
        let v = d.element(&id).expect("vue");
        assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 5.0, 6.0]);
        assert_eq!(
            v.image.map(|i| i.params()),
            Some(ImageParams {
                crop: Some([10, 20, 300, 200]),
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
                    x: None,
                    y: None,
                }),
            })
        );
        assert!(d.undo());
        let v = d.element(&id).expect("vue");
        assert_eq!(
            (v.transform, v.image.map(|i| i.params())),
            (IDENTITY, Some(ImageParams::default()))
        );
        assert!(
            d.can_undo(),
            "reste l'ajout de l'image : une seule étape pour les réglages"
        );
        assert!(d.undo());
        assert!(!d.can_undo());
    }

    #[test]
    fn same_state_and_matrix_is_no_step() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        let w = writes(&d);
        let neutral = ImageParamsInput {
            crop: Some([0.0, 0.0, 640.0, 480.0]),
            ..ImageParamsInput::default()
        };
        assert_eq!(
            set(&mut d, &id, neutral, IDENTITY).expect("neutre").ids,
            Vec::<String>::new()
        );
        assert_eq!(
            w.since(),
            0,
            "état neutre sur une image brute : aucune transaction"
        );
        set(&mut d, &id, full_input(), IDENTITY).expect("réglages");
        let n = w.since();
        assert_eq!(
            set(&mut d, &id, full_input(), IDENTITY)
                .expect("même état")
                .ids,
            Vec::<String>::new()
        );
        assert_eq!(w.since(), n, "même état, même matrice : aucune transaction");
        let moved =
            set(&mut d, &id, full_input(), [1.0, 0.0, 0.0, 1.0, 1.0, 0.0]).expect("matrice seule");
        assert_eq!(moved.ids, vec![id]);
    }

    /// Review Focus 4 : « Rétablir l'original » (état neutre) retire chaque champ, illisible compris.
    #[test]
    fn neutral_state_removes_every_field_even_unreadable() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        set(&mut d, &id, full_input(), IDENTITY).expect("réglages");
        assert_eq!(
            present(&d, &id),
            vec![
                "crop",
                "flipX",
                "quarterTurns",
                "brightness",
                "contrast",
                "transparent"
            ]
        );
        put(&d, &id, "flipY", In::from("illisible"));
        set(&mut d, &id, ImageParamsInput::default(), IDENTITY).expect("rétablir");
        assert_eq!(present(&d, &id), Vec::<&str>::new());
    }

    /// Clés brutes de la carte `transparent` de l'élément, triées.
    fn transparent_keys(d: &Document, id: &str) -> Vec<String> {
        let txn = d.read();
        let e = d.find_element(&txn, id).expect("élément").element;
        let Some(yrs::Out::YMap(m)) = e.get(&txn, "transparent") else {
            return Vec::new();
        };
        let mut keys: Vec<String> = m.keys(&txn).map(str::to_string).collect();
        keys.sort();
        keys
    }

    fn seeded_map(x: Option<f64>, y: Option<f64>) -> In {
        let mut fields = vec![
            ("color", In::from("#ffffff")),
            ("tolerance", In::Any(Any::from(10.0))),
            ("soft", In::Any(Any::from(0.0))),
            ("contiguous", In::Any(Any::Bool(true))),
        ];
        fields.extend(x.map(|v| ("x", In::Any(Any::from(v)))));
        fields.extend(y.map(|v| ("y", In::Any(Any::from(v)))));
        In::Map(MapPrelim::from_iter(fields))
    }

    /// Patron écarté (T10) : `cur.transparent == next.transparent` ne doit pas cacher un départ gardé mais illisible
    /// (hors de l'image, ou un seul des deux). Lu absent (I4, U3) ; le même état voulu sans départ le retire en une
    /// transaction, puis plus aucune (D38) : jamais réécrit à chaque appel.
    #[test]
    fn unreadable_seed_removed_once_then_no_step() {
        for (x, y) in [
            (Some(100.0), Some(0.0)),
            (Some(0.0), Some(80.0)),
            (Some(3.5), Some(2.0)),
            (Some(3.0), None),
            (None, Some(2.0)),
        ] {
            let mut d = Document::blank();
            let (_, id) = add(&mut d, 100.0, 80.0, IDENTITY);
            put(&d, &id, "transparent", seeded_map(x, y));
            assert_eq!(
                params_of(&d, &id).transparent,
                None,
                "départ illisible {x:?} {y:?} : couleur lue absente"
            );
            let want = ImageParamsInput {
                transparent: Some(white_input(true)),
                ..ImageParamsInput::default()
            };
            let w = writes(&d);
            assert_eq!(
                set(&mut d, &id, want.clone(), IDENTITY)
                    .expect("sans départ")
                    .ids,
                vec![id.clone()],
                "{x:?} {y:?}"
            );
            assert_eq!(w.since(), 1, "une transaction ({x:?} {y:?})");
            assert_eq!(
                transparent_keys(&d, &id),
                ["color", "contiguous", "soft", "tolerance"],
                "départ illisible retiré ({x:?} {y:?})"
            );
            assert_eq!(
                set(&mut d, &id, want, IDENTITY).expect("même état").ids,
                Vec::<String>::new()
            );
            assert_eq!(
                w.since(),
                1,
                "plus rien à retirer : aucune transaction ({x:?} {y:?})"
            );
        }
    }

    /// Départ lisible gardé, puis retiré par le même état sans départ : une transaction, `x` et `y` partis.
    #[test]
    fn readable_seed_removed_by_state_without_seed() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 100.0, 80.0, IDENTITY);
        put(&d, &id, "transparent", seeded_map(Some(99.0), Some(79.0)));
        let t = params_of(&d, &id).transparent.expect("lue");
        assert_eq!((t.x, t.y), (Some(99), Some(79)));
        let want = ImageParamsInput {
            transparent: Some(white_input(true)),
            ..ImageParamsInput::default()
        };
        set(&mut d, &id, want, IDENTITY).expect("sans départ");
        assert_eq!(
            transparent_keys(&d, &id),
            ["color", "contiguous", "soft", "tolerance"]
        );
    }

    #[test]
    fn rejects_out_of_domain_without_transaction() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        let stroke = d
            .apply(Command::CommitStroke {
                page: p,
                points: vec![0.0, 0.0, 0.5, 50.0, 0.0, 0.5, 100.0, 0.0, 0.5],
                style: StrokeStyle {
                    color: "#000000".into(),
                    width: 4.0,
                },
                look: Look::default(),
            })
            .expect("trait")
            .ids[0]
            .clone();
        let w = writes(&d);
        let color = |f: fn(&mut TransparentInput)| {
            let mut t = white_input(true);
            f(&mut t);
            ImageParamsInput {
                transparent: Some(t),
                ..ImageParamsInput::default()
            }
        };
        let base = ImageParamsInput::default;
        let bad = [
            ImageParamsInput {
                crop: Some([600.0, 0.0, 100.0, 10.0]),
                ..base()
            },
            ImageParamsInput {
                crop: Some([0.0, 0.0, 0.0, 10.0]),
                ..base()
            },
            ImageParamsInput {
                crop: Some([0.5, 0.0, 10.0, 10.0]),
                ..base()
            },
            ImageParamsInput {
                quarter_turns: 4.0,
                ..base()
            },
            ImageParamsInput {
                quarter_turns: 1.5,
                ..base()
            },
            ImageParamsInput {
                brightness: 101.0,
                ..base()
            },
            ImageParamsInput {
                contrast: -101.0,
                ..base()
            },
            ImageParamsInput {
                brightness: f64::NAN,
                ..base()
            },
            color(|t| t.color = "#FFFFFF".into()),
            color(|t| t.color = "white".into()),
            color(|t| t.tolerance = 101.0),
            color(|t| t.soft = -1.0),
        ];
        for params in bad {
            assert_eq!(
                set(&mut d, &id, params.clone(), IDENTITY),
                Err(CommandError::BadImageParams),
                "{params:?}"
            );
        }
        assert_eq!(
            set(
                &mut d,
                &id,
                ImageParamsInput {
                    brightness: 101.0,
                    ..base()
                },
                [0.0; 6]
            ),
            Err(CommandError::BadImageParams),
            "réglages contrôlés avant la matrice"
        );
        assert_eq!(
            set(&mut d, &id, base(), [0.0; 6]),
            Err(CommandError::BadMatrix)
        );
        assert_eq!(
            set(&mut d, "nulle-part", base(), IDENTITY),
            Err(CommandError::UnknownElement("nulle-part".into()))
        );
        assert_eq!(
            set(&mut d, &stroke, base(), IDENTITY),
            Err(CommandError::BadImageParams)
        );
        assert_eq!(w.since(), 0);
    }

    #[test]
    fn bad_image_params_message_is_readable() {
        assert!(CommandError::BadImageParams
            .to_string()
            .starts_with("réglages d'image invalides"));
    }

    /// I2, S4 : rognage en `Any::Array`, couleur en `Y.Map` ; trente rechargements gardent les octets.
    /// La matrice est posée dès l'ajout : un champ remplacé (ici `transform`) laisse un contenu supprimé que l'annulation
    /// garde dans l'original et que le rechargement ramasse ; les octets différeraient dès le premier rechargement, avec
    /// ou sans réglages (préexistant, hors de cette commande).
    #[test]
    fn image_params_reload_keep_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let m = [2.0, 0.0, 0.0, 1.0, 5.0, 6.0];
        let (_, id) = add(&mut d, 640.0, 480.0, m);
        set(&mut d, &id, full_input(), m).expect("réglages");
        let ybin = d.encode_v1();
        let file = save(&d, &meta).expect("save");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert!(r.encode_v1() == ybin, "ybin différent au rechargement {i}");
            assert!(
                save(&r, &meta).expect("resave") == file,
                "fichier différent au rechargement {i}"
            );
            assert_eq!(
                r.element(&id).and_then(|e| e.image),
                d.element(&id).and_then(|e| e.image)
            );
        }
    }

    /// Effet de bord : copier, coller et `.rbitem` gardent les réglages (recopie profonde, `copy.rs:62`).
    #[test]
    fn copy_keeps_image_params() {
        use crate::format::{load_fragment, save_fragment, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        set(&mut d, &id, full_input(), IDENTITY).expect("réglages");
        let want = d.element(&id).and_then(|e| e.image);
        let f = d.extract(&p, std::slice::from_ref(&id)).expect("extract");
        let fid = f.element_ids(&f.page_ids()[0])[0].clone();
        assert_eq!(f.element(&fid).and_then(|e| e.image), want);
        let mut t = Document::blank();
        let tp = t.page_ids()[0].clone();
        let pasted = t.insert_fragment(&f, &tp, 10.0, 0.0).expect("collage").ids[0].clone();
        assert_eq!(t.element(&pasted).and_then(|e| e.image), want);
        let (r, _) =
            load_fragment(&save_fragment(&f, &meta, "image").expect("rbitem")).expect("relu");
        let rid = r.element_ids(&r.page_ids()[0])[0].clone();
        assert_eq!(r.element(&rid).and_then(|e| e.image), want);
    }

    /// Patron écarté (`cmd_set_backdrop`, `commands.rs:1007-1018`, réécrit tout le `Y.Map`) : changer la seule
    /// luminosité n'écrit qu'un champ, l'horloge du document avance d'une unité (dix si les sept champs étaient
    /// réécrits : `transparent` compte cinq) ; comparaison sur l'état lu et normalisé : un champ brut égal au neutre est
    /// retiré, sans aucune insertion.
    #[test]
    fn only_changed_fields_are_rewritten() {
        let clock = |d: &Document| -> u32 { d.read().state_vector().iter().map(|(_, c)| *c).sum() };
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        set(&mut d, &id, full_input(), IDENTITY).expect("réglages");
        let brighter = || ImageParamsInput {
            brightness: 40.0,
            ..full_input()
        };
        let before = clock(&d);
        set(&mut d, &id, brighter(), IDENTITY).expect("luminosité");
        assert_eq!(clock(&d) - before, 1, "seule la luminosité est réécrite");
        assert_eq!(params_of(&d, &id).brightness, 40);
        put(&d, &id, "flipY", In::Any(Any::Bool(false)));
        let before = clock(&d);
        let c = set(&mut d, &id, brighter(), IDENTITY).expect("neutre brut");
        assert_eq!(
            c.ids,
            vec![id.clone()],
            "champ brut égal au neutre : retiré"
        );
        assert_eq!(clock(&d), before, "un retrait n'insère rien");
        assert!(!present(&d, &id).contains(&"flipY"));
    }

    /// Clés de l'élément `id` touchées par `f`, triées, et nombre de transactions de `f`.
    fn touched(d: &mut Document, id: &str, f: impl FnOnce(&mut Document)) -> (Vec<String>, usize) {
        use std::sync::Mutex;
        use yrs::Observable;
        let element = {
            let txn = d.read();
            d.find_element(&txn, id).expect("élément").element
        };
        let keys = Arc::new(Mutex::new(Vec::<String>::new()));
        let sink = Arc::clone(&keys);
        element.observe("cles-touchees", move |txn, e| {
            sink.lock()
                .expect("verrou")
                .extend(e.keys(txn).keys().map(|k| k.to_string()));
        });
        let w = writes(d);
        f(d);
        element.unobserve("cles-touchees");
        let mut got = keys.lock().expect("verrou").clone();
        got.sort();
        (got, w.since())
    }

    fn fill_image(d: &mut Document, page: &str, id: &str, c: char) -> Change {
        d.apply(Command::Fill {
            page: page.into(),
            target: crate::fill::FillTarget::Image {
                id: id.into(),
                asset: AssetRef {
                    id: c.to_string().repeat(64),
                    name: "a.png".into(),
                    mime: "image/png".into(),
                    size: 9.0,
                },
            },
            color: Some("#facc15".into()),
        })
        .expect("remplissage")
    }

    /// Patron écarté (C6b, B2-B4, B11) : `cmd_fill` écrit une clé par transaction, `cmd_set_backdrop` réécrit tout le
    /// `Y.Map`. Un remplissage est **une** transaction (donc une étape) qui n'écrit que les clés qui changent ; le second
    /// ne réécrit pas `sourceAsset` ; « Rétablir » rend l'asset dans la même transaction que les réglages.
    #[test]
    fn fill_and_restore_are_one_transaction_writing_only_changed_keys() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        set(
            &mut d,
            &id,
            ImageParamsInput {
                crop: Some([10.0, 20.0, 300.0, 200.0]),
                quarter_turns: 1.0,
                brightness: 30.0,
                transparent: Some(white_input(true)),
                ..ImageParamsInput::default()
            },
            IDENTITY,
        )
        .expect("réglages");
        let first = touched(&mut d, &id, |d| {
            fill_image(d, &p, &id, '1');
        });
        assert_eq!(
            first,
            (
                vec![
                    "asset".to_string(),
                    "brightness".into(),
                    "sourceAsset".into(),
                    "transparent".into()
                ],
                1
            ),
            "premier remplissage : asset, original, champs cuits retirés ; géométrie et matrice non réécrites"
        );
        let second = touched(&mut d, &id, |d| {
            fill_image(d, &p, &id, '2');
        });
        assert_eq!(
            second,
            (vec!["asset".to_string()], 1),
            "second remplissage : sourceAsset gardé, non réécrit"
        );
        let restored = touched(&mut d, &id, |d| {
            set_restore(d, &id, ImageParamsInput::default(), IDENTITY, true).expect("rétablir");
        });
        assert_eq!(
            restored,
            (
                vec![
                    "asset".to_string(),
                    "crop".into(),
                    "quarterTurns".into(),
                    "sourceAsset".into()
                ],
                1
            ),
            "Rétablir : asset d'origine et réglages dans la même transaction"
        );
    }

    fn set_restore(
        d: &mut Document,
        id: &str,
        params: ImageParamsInput,
        matrix: Transform,
        restore: bool,
    ) -> Result<Change, CommandError> {
        d.apply(Command::SetImageParams {
            id: id.into(),
            params,
            matrix,
            restore,
        })
    }

    /// B12 : `sourceAsset` lu tolérant (non conforme = absent, U3) ; un premier remplissage le remplace par l'original.
    #[test]
    fn source_asset_read_tolerant_and_first_fill_overwrites_unreadable() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        put(&d, &id, "sourceAsset", In::from("illisible"));
        assert_eq!(
            d.element(&id)
                .and_then(|e| e.image)
                .and_then(|i| i.source_asset),
            None
        );
        let next = AssetRef {
            id: "cd".repeat(32),
            name: "a.png".into(),
            mime: "image/png".into(),
            size: 9.0,
        };
        d.apply(Command::Fill {
            page: p,
            target: crate::fill::FillTarget::Image {
                id: id.clone(),
                asset: next,
            },
            color: None,
        })
        .expect("remplissage");
        assert_eq!(
            d.element(&id)
                .and_then(|e| e.image)
                .and_then(|i| i.source_asset)
                .as_deref(),
            Some(ABC)
        );
    }

    #[test]
    fn image_view_serializes_source_asset_camel_case() {
        let v = ImageView {
            asset: ABC.into(),
            w: 1.0,
            h: 1.0,
            source_asset: Some(ABC.into()),
            ..ImageView::default()
        };
        assert_eq!(
            serde_json::to_value(&v).expect("json"),
            serde_json::json!({ "asset": ABC, "w": 1.0, "h": 1.0, "sourceAsset": ABC })
        );
    }
}
