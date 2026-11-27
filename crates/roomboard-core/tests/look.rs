//! OG11 (T1) : champs d'aspect facultatifs du lot 1 (`strokeStyle`, `roughness`, `seed`, `roundness`, `opacity`), en
//! scalaires du `Y.Map` de l'élément (D25, G12). Absent = neutre ; un aspect neutre n'écrit aucune clé (DA-5 : un
//! fichier ancien recoupé ou réenregistré garde ses octets) ; une valeur illisible est lue neutre et gardée telle quelle.
use std::path::PathBuf;

use roomboard_core::commands::{Command, CommandError, EraseMode};
use roomboard_core::document::Document;
use roomboard_core::element::{apply_transform, Look, StrokeStyle};
use roomboard_core::format::load;
use roomboard_core::rich_text::{SpanAttrs, SpanInput};
use roomboard_core::shape::ShapeKind;
use roomboard_core::style::StylePatch;
use yrs::updates::decoder::Decode;
use yrs::{
    Any, Array, ArrayRef, Doc, In, Map, MapPrelim, MapRef, Out, ReadTxn, StateVector, Transact,
    Update,
};

const LOOK_KEYS: [&str; 5] = ["strokeStyle", "roughness", "seed", "roundness", "opacity"];
const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 4.0,
    }
}

fn dashed() -> Look {
    Look {
        stroke_style: Some("dashed".into()),
        roughness: Some(1),
        seed: Some(7),
        roundness: Some("round".into()),
        opacity: Some(50),
        ..Look::default()
    }
}

/// Aspects neutres : défaut, opacité 100 (le neutre de l'arbitrage 0..100), tracé 0 (architecte) avec une graine.
fn neutral_looks() -> Vec<Look> {
    vec![
        Look::default(),
        Look {
            opacity: Some(100),
            ..Look::default()
        },
        Look {
            roughness: Some(0),
            seed: Some(9),
            ..Look::default()
        },
    ]
}

fn blank() -> Document {
    Document::blank() // Document::new() n'a aucune page
}

fn first_page(d: &Document) -> String {
    d.page_ids()[0].clone()
}

fn hline(y: f32) -> Vec<f32> {
    (0..=20)
        .flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5])
        .collect()
}

fn add_rect(d: &mut Document, look: Look) -> String {
    let page = first_page(d);
    d.apply(Command::AddShape {
        page,
        shape: ShapeKind::Rect,
        x0: 0.0,
        y0: 0.0,
        x1: 100.0,
        y1: 50.0,
        style: pen(),
        fill: None,
        look,
        line: roomboard_core::linear::LineInit::default(),
    })
    .expect("forme")
    .ids[0]
        .clone()
}

fn add_stroke(d: &mut Document, look: Look) -> String {
    let page = first_page(d);
    d.apply(Command::CommitStroke {
        page,
        points: hline(100.0),
        style: pen(),
        look,
    })
    .expect("trait")
    .ids[0]
        .clone()
}

fn set_text(d: &mut Document, id: Option<String>, content: &str, look: Look) -> Vec<String> {
    let page = first_page(d);
    d.apply(Command::SetText {
        page,
        id,
        x: 500.0,
        y: 500.0,
        content: content.into(),
        color: "#000000".into(),
        size: 36.0,
        box_width: 600.0,
        box_height: 45.0,
        spans: None,
        look,
    })
    .expect("texte")
    .ids
}

// --- Lecture brute (aide de `tests/element_inconnu.rs`, `raw_h1`) : un `Doc` yrs neuf relu depuis `encode_v1`. ---

fn raw_doc(d: &Document) -> (Doc, ArrayRef) {
    let raw = Doc::new();
    let pages = raw.get_or_insert_array("pages");
    raw.transact_mut()
        .apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
        .expect("application");
    (raw, pages)
}

fn find_raw<T: ReadTxn>(txn: &T, pages: &ArrayRef, id: &str) -> Option<MapRef> {
    for p in pages.iter(txn) {
        let Out::YMap(page) = p else { continue };
        let Some(Out::YArray(els)) = page.get(txn, "elements") else {
            continue;
        };
        for e in els.iter(txn) {
            let Out::YMap(e) = e else { continue };
            if matches!(e.get(txn, "id"), Some(Out::Any(Any::String(s))) if &*s == id) {
                return Some(e);
            }
        }
    }
    None
}

/// Clés brutes de l'élément `id`, triées.
fn raw_keys(d: &Document, id: &str) -> Vec<String> {
    let (raw, pages) = raw_doc(d);
    let txn = raw.transact();
    let e = find_raw(&txn, &pages, id).expect("élément brut");
    let mut keys: Vec<String> = e.keys(&txn).map(str::to_string).collect();
    keys.sort();
    keys
}

/// Valeur brute d'un champ en texte : chaîne telle quelle, nombre par `Display`.
fn raw_field(d: &Document, id: &str, key: &str) -> Option<String> {
    let (raw, pages) = raw_doc(d);
    let txn = raw.transact();
    let e = find_raw(&txn, &pages, id)?;
    match e.get(&txn, key)? {
        Out::Any(Any::String(s)) => Some(s.to_string()),
        Out::Any(Any::Number(n)) => n.as_f64().map(|x| x.to_string()),
        other => Some(format!("{other:?}")),
    }
}

/// Document relu après une écriture brute sur la première page, comme une autre version l'écrirait.
fn edit_raw(d: &Document, edit: impl FnOnce(&mut yrs::TransactionMut, &ArrayRef)) -> Document {
    let (raw, pages) = raw_doc(d);
    {
        let mut txn = raw.transact_mut();
        edit(&mut txn, &pages);
    }
    let bytes = raw
        .transact()
        .encode_state_as_update_v1(&StateVector::default());
    Document::from_update_v1(&bytes).expect("relecture")
}

fn with_raw_field(d: &Document, id: &str, key: &str, v: In) -> Document {
    edit_raw(d, |txn, pages| {
        let e = find_raw(txn, pages, id).expect("élément brut");
        e.insert(txn, key, v);
    })
}

/// Image brute (champs de `tests/parite_c6b.rs`, `image`) ajoutée à la première page.
fn with_raw_image(d: &Document, id: &'static str, extra: Vec<(&'static str, In)>) -> Document {
    edit_raw(d, |txn, pages| {
        let Some(Out::YMap(page)) = pages.get(txn, 0) else {
            panic!("page")
        };
        let Some(Out::YArray(els)) = page.get(txn, "elements") else {
            panic!("éléments")
        };
        let transform: Vec<Any> = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
            .into_iter()
            .map(Any::from)
            .collect();
        let mut fields: Vec<(&'static str, In)> = vec![
            ("id", In::from(id)),
            ("kind", In::from("image")),
            ("transform", In::Any(Any::Array(transform.into()))),
            ("asset", In::from(ABC)),
            ("w", In::from(640.0)),
            ("h", In::from(480.0)),
        ];
        fields.extend(extra);
        els.push_back(txn, MapPrelim::from_iter(fields));
    })
}

/// Élément brut minimal d'un genre donné (`fill` = zone du pot, `table`, `media`, `model3d`) posé sur la première page :
/// la fonctionnalité `zone` n'est active que dans `roomboard-wasm`, et ces genres ont leurs propres commandes.
fn with_raw_kind(d: &Document, id: &'static str, kind: &'static str) -> Document {
    edit_raw(d, |txn, pages| {
        let Some(Out::YMap(page)) = pages.get(txn, 0) else {
            panic!("page")
        };
        let Some(Out::YArray(els)) = page.get(txn, "elements") else {
            panic!("éléments")
        };
        let transform: Vec<Any> = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
            .into_iter()
            .map(Any::from)
            .collect();
        let fields: Vec<(&'static str, In)> = vec![
            ("id", In::from(id)),
            ("kind", In::from(kind)),
            ("transform", In::Any(Any::Array(transform.into()))),
        ];
        els.push_back(txn, MapPrelim::from_iter(fields));
    })
}

fn socle() -> Document {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/socle-v1.roomboard");
    load(&std::fs::read(path).expect("fixture du socle")).expect("ouverture")
}

// --- Écriture ---

#[test]
fn add_shape_writes_look_in_one_step() {
    let mut d = blank();
    let id = add_rect(&mut d, dashed());
    let el = d.element(&id).expect("vue");
    assert_eq!(el.look, Some(dashed()));
    let json = serde_json::to_value(&el).expect("json");
    assert_eq!(
        json["look"],
        serde_json::json!({ "strokeStyle": "dashed", "roughness": 1, "seed": 7, "roundness": "round", "opacity": 50 })
    );
    assert!(d.undo());
    assert!(d.element(&id).is_none(), "une seule étape");
}

#[test]
fn commit_stroke_and_new_text_write_look() {
    let mut d = blank();
    let s = add_stroke(&mut d, dashed());
    assert_eq!(d.element(&s).expect("trait").look, Some(dashed()));
    let t = set_text(&mut d, None, "Bonjour", dashed())[0].clone();
    assert_eq!(d.element(&t).expect("texte").look, Some(dashed()));
    assert!(d.undo());
    assert!(d.element(&t).is_none(), "texte : une seule étape");
    assert!(d.undo());
    assert!(d.element(&s).is_none(), "trait : une seule étape");
}

#[test]
fn set_text_on_existing_box_ignores_look() {
    let mut d = blank();
    let t = set_text(&mut d, None, "Bonjour", Look::default())[0].clone();
    set_text(&mut d, Some(t.clone()), "Bonjour !", dashed());
    let el = d.element(&t).expect("texte");
    assert_eq!(el.text.expect("vue texte").content, "Bonjour !");
    assert_eq!(
        el.look, None,
        "le style d'un texte existant passe par SetStyle (T2)"
    );
}

#[test]
fn neutral_look_is_absent() {
    let mut d = blank();
    let id = add_rect(&mut d, Look::default());
    let el = d.element(&id).expect("vue");
    assert_eq!(el.look, None);
    assert!(!serde_json::to_string(&el).expect("json").contains("look"));
}

/// Discrimine le patron écarté (`style_fields`, tableau fixe toujours écrit) : un aspect neutre n'écrit aucune clé, ni
/// sur une forme, ni sur un trait, ni sur une boîte de texte neuve.
#[test]
fn neutral_look_writes_no_key() {
    for look in neutral_looks() {
        let mut d = blank();
        let ids = [
            add_rect(&mut d, look.clone()),
            add_stroke(&mut d, look.clone()),
            set_text(&mut d, None, "Bonjour", look.clone())[0].clone(),
        ];
        for id in &ids {
            assert_eq!(d.element(id).expect("vue").look, None, "{look:?}");
            for k in LOOK_KEYS {
                assert_eq!(
                    raw_field(&d, id, k),
                    None,
                    "{k} écrit alors qu'il est neutre ({look:?})"
                );
            }
        }
    }
}

// --- Gomme partielle ---

#[test]
fn erase_partial_keeps_look() {
    let mut d = blank();
    let page = first_page(&d);
    let look = Look {
        stroke_style: Some("dotted".into()),
        roughness: Some(2),
        seed: Some(4_000_000_000),
        roundness: None,
        opacity: Some(40),
        ..Look::default()
    };
    add_stroke(&mut d, look.clone());
    let c = d
        .apply(Command::Erase {
            page,
            path: vec![200.0, 80.0, 200.0, 120.0],
            radius: 6.0,
            mode: EraseMode::Partial,
        })
        .expect("gomme");
    assert!(c.ids.len() >= 2, "deux morceaux");
    for id in &c.ids {
        assert_eq!(d.element(id).expect("morceau").look, Some(look.clone()));
    }
}

/// Discrimine le patron écarté côté fichier ancien : un trait du socle (sans aucun champ d'aspect), recoupé par la
/// gomme, donne des morceaux qui portent exactement les clés du trait d'origine.
#[test]
fn erase_partial_of_socle_stroke_adds_no_key() {
    let mut d = socle();
    let page = first_page(&d);
    let stroke = d
        .element_ids(&page)
        .into_iter()
        .find(|id| d.element(id).is_some_and(|e| e.kind == "stroke"))
        .expect("trait du socle");
    let before = raw_keys(&d, &stroke);
    assert!(LOOK_KEYS.iter().all(|k| !before.contains(&k.to_string())));
    let c = d
        .apply(Command::Erase {
            page,
            path: vec![200.0, 80.0, 200.0, 120.0],
            radius: 6.0,
            mode: EraseMode::Partial,
        })
        .expect("gomme");
    assert!(c.ids.len() >= 2, "deux morceaux");
    for id in &c.ids {
        assert_eq!(raw_keys(&d, id), before, "clés du morceau {id}");
        assert_eq!(d.element(id).expect("morceau").look, None);
    }
}

// --- Lecture ---

#[test]
fn image_look_read() {
    let d = with_raw_image(&blank(), "i1", vec![("opacity", In::from(40.0))]);
    assert_eq!(
        d.element("i1").expect("image").look,
        Some(Look {
            opacity: Some(40),
            ..Look::default()
        })
    );
    let d = with_raw_image(&blank(), "i2", vec![("opacity", In::from(100.0))]);
    assert_eq!(d.element("i2").expect("image").look, None, "100 = neutre");
    let d = with_raw_image(&blank(), "i3", vec![]);
    assert_eq!(d.element("i3").expect("image").look, None);
}

#[test]
fn unreadable_value_is_neutral_and_kept() {
    let mut d = blank();
    let id = add_rect(&mut d, Look::default());
    let cases: Vec<(&str, In)> = vec![
        ("strokeStyle", In::from("wavy")),
        ("strokeStyle", In::from(3.0)),
        ("roughness", In::from(1.5)),
        ("roughness", In::from(3.0)),
        ("seed", In::from(12.0)), // sans tracé lisible
        ("roundness", In::from("sharp")),
        ("opacity", In::from(-1.0)),
        ("opacity", In::from(101.0)),
        ("opacity", In::from(f64::NAN)),
        ("opacity", In::from("40")),
    ];
    for (k, v) in cases {
        let label = format!("{k} = {v:?}");
        let edited = with_raw_field(&d, &id, k, v);
        assert_eq!(edited.element(&id).expect("vue").look, None, "{label}");
        let kept = raw_field(&edited, &id, k);
        let reloaded = Document::from_update_v1(&edited.encode_v1()).expect("relecture");
        assert!(kept.is_some(), "{label} : gardé");
        assert_eq!(
            raw_field(&reloaded, &id, k),
            kept,
            "{label} : gardé au rechargement"
        );
    }
}

#[test]
fn reencode_keeps_bytes_with_look() {
    let mut d = blank();
    add_rect(&mut d, dashed());
    add_stroke(&mut d, Look::default());
    let a = d.encode_v1();
    let b = Document::from_update_v1(&a).expect("relecture").encode_v1();
    assert_eq!(a, b);
}

// --- Copie ---

#[test]
fn extract_keeps_look() {
    let mut d = blank();
    let page = first_page(&d);
    let id = add_rect(&mut d, dashed());
    let frag = d.extract(&page, &[id]).expect("extraction");
    let ins = d
        .insert_fragment(&frag, &page, 10.0, 10.0)
        .expect("insertion");
    assert_eq!(d.element(&ins.ids[0]).expect("copie").look, Some(dashed()));
}

// --- SetStyle (T2) ---

fn set_style(
    d: &mut Document,
    ids: &[&String],
    patch: StylePatch,
) -> Result<roomboard_core::commands::Change, CommandError> {
    d.apply(Command::SetStyle {
        ids: ids.iter().map(|s| s.to_string()).collect(),
        patch,
    })
}

/// Discrimine la transaction par id : deux éléments changés, une seule étape (historique sans fusion, délai 0).
#[test]
fn set_style_one_step() {
    let mut d = blank();
    let a = add_rect(&mut d, Look::default());
    let b = add_rect(&mut d, Look::default());
    let p = StylePatch {
        color: Some("#1d4ed8".into()),
        stroke_style: Some(Some("dashed".into())),
        ..Default::default()
    };
    let c = set_style(&mut d, &[&a, &b], p).expect("style");
    assert_eq!(c.ids, vec![a.clone(), b.clone()]);
    assert_eq!(d.element(&b).unwrap().style.unwrap().color, "#1d4ed8");
    assert_eq!(
        d.element(&a).unwrap().look.unwrap().stroke_style.as_deref(),
        Some("dashed")
    );
    assert!(d.undo());
    assert_eq!(d.element(&a).unwrap().style.unwrap().color, "#000000");
    assert_eq!(d.element(&a).unwrap().look, None);
    assert_eq!(d.element(&b).unwrap().style.unwrap().color, "#000000");
    assert_eq!(d.element(&b).unwrap().look, None);
}

/// Discrimine la transaction ouverte d'avance et la graine retirée au même tracé : un patch qui redit chaque valeur
/// déjà posée ne fait ni étape ni version.
#[test]
fn set_style_noop_no_step() {
    let mut d = blank();
    let a = add_rect(&mut d, dashed());
    let v = d.version();
    let same = StylePatch {
        color: Some("#000000".into()),
        width: Some(4.0),
        fill: Some(None),
        stroke_style: Some(Some("dashed".into())),
        roughness: Some(1),
        roundness: Some(Some("round".into())),
        opacity: Some(50.0),
        ..Default::default()
    };
    let c = set_style(&mut d, &[&a], same).expect("style");
    assert!(c.ids.is_empty());
    assert_eq!(d.version(), v);
    assert_eq!(c.version, v);
    assert_eq!(d.element(&a).unwrap().look, Some(dashed()), "graine gardée");
    let c = set_style(
        &mut d,
        &[&a],
        StylePatch {
            stroke_style: Some(Some("dashed".into())),
            ..Default::default()
        },
    )
    .expect("style");
    assert!(c.ids.is_empty());
    assert_eq!(d.version(), v);
}

/// Seuls les éléments changés sont rendus ; l'autre n'entre pas dans le `Change`.
#[test]
fn set_style_reports_only_changed() {
    let mut d = blank();
    let a = add_rect(&mut d, dashed());
    let b = add_rect(&mut d, Look::default());
    let c = set_style(
        &mut d,
        &[&a, &b],
        StylePatch {
            stroke_style: Some(Some("dashed".into())),
            ..Default::default()
        },
    )
    .expect("style");
    assert_eq!(c.ids, vec![b.clone()]);
    assert_eq!(c.pages, vec![first_page(&d)]);
}

#[test]
fn set_style_opacity_rounds() {
    let mut d = blank();
    let a = add_rect(&mut d, Look::default());
    let op = |o: f64| StylePatch {
        opacity: Some(o),
        ..Default::default()
    };
    set_style(&mut d, &[&a], op(44.6)).expect("44.6");
    assert_eq!(d.element(&a).unwrap().look.unwrap().opacity, Some(45));
    assert_eq!(raw_field(&d, &a, "opacity").as_deref(), Some("45"));
    set_style(&mut d, &[&a], op(95.0)).expect("95");
    assert_eq!(
        d.element(&a).unwrap().look.unwrap().opacity,
        Some(95),
        "95 écrit et relu (0..100)"
    );
    set_style(&mut d, &[&a], op(0.0)).expect("0");
    assert_eq!(d.element(&a).unwrap().look.unwrap().opacity, Some(0));
    set_style(&mut d, &[&a], op(99.6)).expect("99.6");
    assert_eq!(d.element(&a).unwrap().look, None, "99.6 arrondi à 100");
    assert_eq!(raw_field(&d, &a, "opacity"), None, "100 retire le champ");
}

/// Discrimine l'écriture d'une clé neutre, que `read_look` (passé par `sanitized`) lit `None` dans les deux cas :
/// seule la clé brute absente prouve le retrait.
#[test]
fn set_style_neutral_removes_key() {
    let mut d = blank();
    let a = add_rect(&mut d, dashed());
    let neutral = StylePatch {
        fill: Some(None),
        stroke_style: Some(None),
        roughness: Some(0),
        roundness: Some(None),
        opacity: Some(100.0),
        ..Default::default()
    };
    let c = set_style(&mut d, &[&a], neutral.clone()).expect("neutre");
    assert_eq!(c.ids, vec![a.clone()]);
    assert_eq!(d.element(&a).unwrap().look, None);
    for k in LOOK_KEYS {
        assert_eq!(
            raw_field(&d, &a, k),
            None,
            "{k} gardé alors qu'il est neutre"
        );
    }
    let v = d.version();
    let c = set_style(&mut d, &[&a], neutral).expect("neutre deux fois");
    assert!(c.ids.is_empty());
    assert_eq!(d.version(), v);
}

#[test]
fn set_style_out_of_range_refused() {
    let mut d = blank();
    let a = add_rect(&mut d, Look::default());
    let v = d.version();
    for bad in [150.0, 100.5, -1.0, f64::NAN, f64::INFINITY] {
        let r = set_style(
            &mut d,
            &[&a],
            StylePatch {
                color: Some("#1d4ed8".into()),
                opacity: Some(bad),
                ..Default::default()
            },
        );
        assert_eq!(r, Err(CommandError::BadStyle), "opacité {bad}");
    }
    let bads = [
        StylePatch {
            stroke_style: Some(Some("wavy".into())),
            ..Default::default()
        },
        StylePatch {
            roughness: Some(3),
            ..Default::default()
        },
        StylePatch {
            roundness: Some(Some("sharp".into())),
            ..Default::default()
        },
        StylePatch {
            color: Some("#zzzzzz".into()),
            ..Default::default()
        },
        StylePatch {
            fill: Some(Some("#12345".into())),
            ..Default::default()
        },
        StylePatch {
            width: Some(0.0),
            ..Default::default()
        },
        StylePatch {
            width: Some(f32::NAN),
            ..Default::default()
        },
    ];
    for p in bads {
        let label = format!("{p:?}");
        assert_eq!(
            set_style(&mut d, &[&a], p),
            Err(CommandError::BadStyle),
            "{label}"
        );
    }
    assert_eq!(CommandError::BadStyle.to_string(), "style invalide");
    assert_eq!(d.element(&a).unwrap().look, None, "rien d'écrit");
    assert_eq!(d.element(&a).unwrap().style.unwrap().color, "#000000");
    assert_eq!(d.version(), v);
}

/// Un id inconnu en fin de liste : rien d'écrit sur le premier (le plan est calculé avant toute écriture).
#[test]
fn set_style_unknown_id_writes_nothing() {
    let mut d = blank();
    let a = add_rect(&mut d, Look::default());
    let v = d.version();
    let ghost = "absent".to_string();
    let r = set_style(
        &mut d,
        &[&a, &ghost],
        StylePatch {
            color: Some("#1d4ed8".into()),
            ..Default::default()
        },
    );
    assert_eq!(r, Err(CommandError::UnknownElement(ghost)));
    assert_eq!(d.element(&a).unwrap().style.unwrap().color, "#000000");
    assert_eq!(d.version(), v);
}

#[test]
fn set_style_skips_inapplicable() {
    let mut d = blank();
    let page = first_page(&d);
    let e = d
        .apply(Command::AddShape {
            page,
            shape: ShapeKind::Ellipse,
            x0: 0.0,
            y0: 0.0,
            x1: 10.0,
            y1: 10.0,
            style: pen(),
            fill: None,
            look: Look::default(),
            line: roomboard_core::linear::LineInit::default(),
        })
        .unwrap()
        .ids[0]
        .clone();
    let s = add_stroke(&mut d, Look::default());
    let v = d.version();
    let c = set_style(
        &mut d,
        &[&e],
        StylePatch {
            roundness: Some(Some("round".into())),
            ..Default::default()
        },
    )
    .expect("ellipse");
    assert!(c.ids.is_empty());
    let c = set_style(
        &mut d,
        &[&s],
        StylePatch {
            fill: Some(Some("#ff0000".into())),
            stroke_style: Some(Some("dotted".into())),
            roughness: Some(2),
            roundness: Some(Some("round".into())),
            ..Default::default()
        },
    )
    .expect("trait");
    assert!(c.ids.is_empty());
    assert_eq!(d.version(), v);
    for k in ["fill", "strokeStyle", "roughness", "seed", "roundness"] {
        assert_eq!(raw_field(&d, &s, k), None, "{k} posé sur un trait");
    }
    let c = set_style(
        &mut d,
        &[&s],
        StylePatch {
            opacity: Some(40.0),
            ..Default::default()
        },
    )
    .expect("opacité du trait");
    assert_eq!(c.ids, vec![s.clone()]);
    assert_eq!(d.element(&s).unwrap().look.unwrap().opacity, Some(40));
}

#[test]
fn set_style_roughness_draws_seed() {
    let mut d = blank();
    let a = add_rect(&mut d, Look::default());
    let rough = |r: u8| StylePatch {
        roughness: Some(r),
        ..Default::default()
    };
    set_style(&mut d, &[&a], rough(2)).expect("2");
    let l1 = d.element(&a).unwrap().look.unwrap();
    assert_eq!(l1.roughness, Some(2));
    assert!(l1.seed.is_some(), "graine tirée");
    set_style(&mut d, &[&a], rough(1)).expect("1");
    let l2 = d.element(&a).unwrap().look.unwrap();
    assert_eq!(l2.roughness, Some(1));
    assert!(l2.seed.is_some());
    assert_ne!(l1.seed, l2.seed, "niveau changé : graine neuve");
    set_style(&mut d, &[&a], rough(0)).expect("0");
    assert_eq!(
        d.element(&a).unwrap().look,
        None,
        "0 retire roughness et seed"
    );
    assert_eq!(raw_field(&d, &a, "roughness"), None);
    assert_eq!(raw_field(&d, &a, "seed"), None);
}

// --- T2b : défauts relevés aux revues de T1 et T2 ---

/// G12 : la gomme recopie les cinq clés d'aspect telles quelles, même illisibles (comme `group`).
#[test]
fn erase_partial_copies_raw_look_keys() {
    let mut d = blank();
    let page = first_page(&d);
    let s = add_stroke(&mut d, Look::default());
    let d0 = with_raw_field(&d, &s, "strokeStyle", In::from("dashdot"));
    let mut d = with_raw_field(&d0, &s, "opacity", In::from(100.0));
    let c = d
        .apply(Command::Erase {
            page,
            path: vec![200.0, 80.0, 200.0, 120.0],
            radius: 6.0,
            mode: EraseMode::Partial,
        })
        .expect("gomme");
    assert!(c.ids.len() >= 2, "deux morceaux");
    for id in &c.ids {
        assert_eq!(raw_field(&d, id, "strokeStyle"), Some("dashdot".into()));
        assert_eq!(raw_field(&d, id, "opacity"), Some("100".into()));
        assert_eq!(raw_field(&d, id, "roughness"), None);
    }
}

#[test]
fn neutral_looks_are_neutral() {
    for l in neutral_looks() {
        assert!(l.is_neutral(), "{l:?}");
    }
    assert!(!dashed().is_neutral());
}

/// Valeurs hors domaine à la création : aucune clé d'aspect écrite.
#[test]
fn out_of_domain_look_at_creation_writes_no_key() {
    let bad = Look {
        stroke_style: Some("wavy".into()),
        roughness: Some(3),
        seed: Some(5),
        roundness: Some("sharp".into()),
        opacity: Some(150),
        ..Look::default()
    };
    let mut d = blank();
    let r = add_rect(&mut d, bad.clone());
    let s = add_stroke(&mut d, bad.clone());
    let t = set_text(&mut d, None, "abc", bad)[0].clone();
    for id in [&r, &s, &t] {
        let keys = raw_keys(&d, id);
        for k in LOOK_KEYS {
            assert!(!keys.contains(&k.to_string()), "{k} écrit sur {id}");
        }
    }
}

/// Au même niveau de tracé : aucune graine neuve, même sans graine lisible.
#[test]
fn set_style_same_roughness_draws_no_seed() {
    let mut d = blank();
    let a = add_rect(&mut d, Look::default());
    let mut d = with_raw_field(&d, &a, "roughness", In::from(1.0));
    let v = d.version();
    let c = set_style(
        &mut d,
        &[&a],
        StylePatch {
            roughness: Some(1),
            ..Default::default()
        },
    )
    .expect("même niveau");
    assert!(c.ids.is_empty());
    assert_eq!(d.version(), v);
    assert_eq!(raw_field(&d, &a, "seed"), None);
}

/// Sélection mixte, une commande : chaque genre ne reçoit que les champs qu'il admet.
#[test]
fn set_style_mixed_selection_field_by_field() {
    let mut d = blank();
    let r = add_rect(&mut d, Look::default());
    let s = add_stroke(&mut d, Look::default());
    let t = set_text(&mut d, None, "abc", Look::default())[0].clone();
    let mut d = with_raw_image(&d, "i1", vec![]);
    let i = "i1".to_string();
    set_style(
        &mut d,
        &[&r, &s, &t, &i],
        StylePatch {
            color: Some("#1d4ed8".into()),
            width: Some(8.0),
            fill: Some(Some("#ff0000".into())),
            opacity: Some(40.0),
            ..Default::default()
        },
    )
    .expect("mixte");
    let f = |id: &String, k: &str| raw_field(&d, id, k);
    let some = |x: &str| Some(x.to_string());
    assert_eq!(f(&r, "color"), some("#1d4ed8"));
    assert_eq!(f(&r, "width"), some("8"));
    assert_eq!(f(&r, "fill"), some("#ff0000"));
    assert_eq!(f(&r, "opacity"), some("40"));
    assert_eq!(f(&s, "color"), some("#1d4ed8"));
    assert_eq!(f(&s, "width"), some("8"));
    assert_eq!(f(&s, "fill"), None);
    assert_eq!(f(&s, "opacity"), some("40"));
    assert_eq!(f(&t, "color"), some("#1d4ed8"));
    assert_eq!(f(&t, "width"), None);
    assert_eq!(f(&t, "fill"), None);
    assert_eq!(f(&t, "opacity"), some("40"));
    assert_eq!(f(&i, "color"), None);
    assert_eq!(f(&i, "width"), None);
    assert_eq!(f(&i, "fill"), None);
    assert_eq!(f(&i, "opacity"), some("40"));
}

/// H17 : `color` règle la couleur de l'élément texte, sans effacer les couleurs posées sur une partie du texte.
#[test]
fn set_style_color_keeps_text_span_colors() {
    let mut d = blank();
    let page = first_page(&d);
    let red = SpanAttrs {
        color: Some("#dc2626".into()),
        ..SpanAttrs::default()
    };
    let spans = vec![
        SpanInput {
            text: "Le ".into(),
            attrs: SpanAttrs::default(),
        },
        SpanInput {
            text: "chat".into(),
            attrs: red,
        },
    ];
    let t = d
        .apply(Command::SetText {
            page,
            id: None,
            x: 0.0,
            y: 0.0,
            content: "Le chat".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
            spans: Some(spans),
            look: Look::default(),
        })
        .expect("texte")
        .ids[0]
        .clone();
    let before = d.element(&t).unwrap().text.unwrap().spans;
    set_style(
        &mut d,
        &[&t],
        StylePatch {
            color: Some("#1d4ed8".into()),
            ..Default::default()
        },
    )
    .expect("couleur");
    assert_eq!(d.element(&t).unwrap().style.unwrap().color, "#1d4ed8");
    assert_eq!(d.element(&t).unwrap().text.unwrap().spans, before);
}

// --- Lot 2 (T12) : `fillStyle`, `startArrowhead`, `endArrowhead`, `textAlign`, `link` ---

const LOOK2_KEYS: [&str; 5] = [
    "fillStyle",
    "startArrowhead",
    "endArrowhead",
    "textAlign",
    "link",
];

fn add_kind(d: &mut Document, shape: ShapeKind, look: Look) -> String {
    let page = first_page(d);
    d.apply(Command::AddShape {
        page,
        shape,
        x0: 0.0,
        y0: 0.0,
        x1: 50.0,
        y1: 20.0,
        style: pen(),
        fill: None,
        look,
        line: roomboard_core::linear::LineInit::default(),
    })
    .expect("forme")
    .ids[0]
        .clone()
}

fn look_of(d: &Document, id: &str) -> Look {
    d.element(id).expect("vue").look.unwrap_or_default()
}

fn heads(start: &str, end: &str) -> StylePatch {
    StylePatch {
        start_arrowhead: Some(Some(start.into())),
        end_arrowhead: Some(Some(end.into())),
        ..Default::default()
    }
}

/// Discrimine le patron écarté (écrire le défaut `endArrowhead: "arrow"` sur chaque flèche) : le défaut d'une pointe
/// n'est jamais écrit, ni à la création ni par `SetStyle`, et un retour au défaut retire la clé au lieu de l'écrire.
#[test]
fn arrowhead_default_not_written() {
    let mut d = blank();
    let defaults = Look {
        start_arrowhead: Some("none".into()),
        end_arrowhead: Some("arrow".into()),
        ..Look::default()
    };
    let a = add_kind(&mut d, ShapeKind::Arrow, defaults);
    assert_eq!(d.element(&a).expect("vue").look, None);
    for k in ["startArrowhead", "endArrowhead"] {
        assert_eq!(raw_field(&d, &a, k), None, "{k} écrit à la création");
    }
    let (v, bytes) = (d.version(), d.encode_v1());
    let c = set_style(&mut d, &[&a], heads("none", "arrow")).expect("défauts");
    assert!(c.ids.is_empty());
    assert_eq!(d.version(), v);
    assert_eq!(d.encode_v1(), bytes, "le défaut a changé les octets");
    set_style(&mut d, &[&a], heads("triangle", "none")).expect("pointes");
    let l = look_of(&d, &a);
    assert_eq!(
        (l.start_arrowhead.as_deref(), l.end_arrowhead.as_deref()),
        (Some("triangle"), Some("none"))
    );
    assert_eq!(raw_field(&d, &a, "endArrowhead").as_deref(), Some("none"));
    let c = set_style(&mut d, &[&a], heads("none", "arrow")).expect("retour au défaut");
    assert_eq!(c.ids, vec![a.clone()]);
    for k in ["startArrowhead", "endArrowhead"] {
        assert_eq!(raw_field(&d, &a, k), None, "{k} écrit au retour au défaut");
    }
    assert_eq!(d.element(&a).expect("vue").look, None);
    // Un défaut écrit par un autre client se lit neutre et reste tel quel.
    let d2 = with_raw_field(&d, &a, "endArrowhead", In::from("arrow"));
    assert_eq!(d2.element(&a).expect("vue").look, None);
    assert_eq!(raw_field(&d2, &a, "endArrowhead").as_deref(), Some("arrow"));
}

/// Un lien hors de `http://`, `https://`, `mailto:` ou de plus de 2 048 caractères est refusé (`BadStyle`, rien
/// d'écrit) ; à la création il n'écrit aucune clé ; lu dans un fichier, il est neutre et gardé tel quel.
#[test]
fn bad_link_refused() {
    let mut d = blank();
    let a = add_rect(&mut d, Look::default());
    let v = d.version();
    let too_long = format!("https://{}", "h".repeat(2049 - 8));
    for bad in [
        "javascript:alert(1)",
        "JavaScript:alert(1)",
        " https://example.org",
        "ftp://x",
        "data:text/html,x",
        "https:x",
        "",
        too_long.as_str(),
    ] {
        let r = set_style(
            &mut d,
            &[&a],
            StylePatch {
                link: Some(Some(bad.to_string())),
                ..Default::default()
            },
        );
        assert!(matches!(r, Err(CommandError::BadStyle)), "{bad:?} : {r:?}");
    }
    assert_eq!(d.version(), v);
    assert_eq!(raw_field(&d, &a, "link"), None);
    let longest = format!("https://{}", "é".repeat(2048 - 8));
    for good in [
        "http://example.org",
        "mailto:a@example.org",
        longest.as_str(),
        "https://example.org",
    ] {
        set_style(
            &mut d,
            &[&a],
            StylePatch {
                link: Some(Some(good.to_string())),
                ..Default::default()
            },
        )
        .expect(good);
        assert_eq!(look_of(&d, &a).link.as_deref(), Some(good));
    }
    let b = add_rect(
        &mut d,
        Look {
            link: Some("javascript:alert(1)".into()),
            ..Look::default()
        },
    );
    assert_eq!(raw_field(&d, &b, "link"), None);
    let d2 = with_raw_field(&d, &b, "link", In::from("javascript:alert(1)"));
    assert_eq!(d2.element(&b).expect("vue").look, None);
    assert_eq!(
        raw_field(&d2, &b, "link").as_deref(),
        Some("javascript:alert(1)")
    );
    set_style(
        &mut d,
        &[&a],
        StylePatch {
            link: Some(None),
            ..Default::default()
        },
    )
    .expect("retrait");
    assert_eq!(raw_field(&d, &a, "link"), None);
}

#[test]
fn text_align_on_text_only() {
    let mut d = blank();
    let r = add_rect(&mut d, Look::default());
    let s = add_stroke(&mut d, Look::default());
    let t = set_text(&mut d, None, "Bonjour", Look::default())[0].clone();
    let center = |v: &str| StylePatch {
        text_align: Some(Some(v.into())),
        ..Default::default()
    };
    let v = d.version();
    let c = set_style(&mut d, &[&r, &s], center("center")).expect("inapplicable");
    assert!(c.ids.is_empty());
    assert_eq!(d.version(), v);
    let c = set_style(&mut d, &[&r, &s, &t], center("right")).expect("texte");
    assert_eq!(c.ids, vec![t.clone()]);
    assert_eq!(look_of(&d, &t).text_align.as_deref(), Some("right"));
    for id in [&r, &s] {
        assert_eq!(raw_field(&d, id, "textAlign"), None);
    }
}

#[test]
fn fill_style_on_rect_and_ellipse_only() {
    let mut d = blank();
    let r = add_rect(&mut d, Look::default());
    let e = add_kind(&mut d, ShapeKind::Ellipse, Look::default());
    let a = add_kind(&mut d, ShapeKind::Arrow, Look::default());
    let s = add_stroke(&mut d, Look::default());
    let hachure = |v: Option<&str>| StylePatch {
        fill_style: Some(v.map(str::to_string)),
        ..Default::default()
    };
    let c = set_style(&mut d, &[&r, &e, &a, &s], hachure(Some("cross-hatch"))).expect("hachures");
    assert_eq!(c.ids, vec![r.clone(), e.clone()]);
    assert_eq!(look_of(&d, &e).fill_style.as_deref(), Some("cross-hatch"));
    for id in [&a, &s] {
        assert_eq!(raw_field(&d, id, "fillStyle"), None);
    }
    set_style(&mut d, &[&r], hachure(None)).expect("retrait");
    assert_eq!(raw_field(&d, &r, "fillStyle"), None);
    assert_eq!(
        raw_field(&d, &e, "fillStyle").as_deref(),
        Some("cross-hatch")
    );
}

#[test]
fn arrowheads_on_arrow_only() {
    let mut d = blank();
    let r = add_rect(&mut d, Look::default());
    let l = add_kind(&mut d, ShapeKind::Line, Look::default());
    let a = add_kind(&mut d, ShapeKind::Arrow, Look::default());
    let c = set_style(&mut d, &[&r, &l, &a], heads("arrow", "triangle_outline")).expect("pointes");
    assert_eq!(c.ids, vec![a.clone()]);
    for id in [&r, &l] {
        for k in ["startArrowhead", "endArrowhead"] {
            assert_eq!(raw_field(&d, id, k), None, "{k} hors d'une flèche");
        }
    }
    let la = look_of(&d, &a);
    assert_eq!(
        (la.start_arrowhead.as_deref(), la.end_arrowhead.as_deref()),
        (Some("arrow"), Some("triangle_outline"))
    );
}

/// Le lien vaut pour tout élément dont l'aspect est lu (forme, trait, texte, image).
#[test]
fn link_on_every_look_kind() {
    let mut d = blank();
    let r = add_rect(&mut d, Look::default());
    let s = add_stroke(&mut d, Look::default());
    let t = set_text(&mut d, None, "Bonjour", Look::default())[0].clone();
    let mut d = with_raw_image(&d, "img-1", vec![]);
    let i = "img-1".to_string();
    let c = set_style(
        &mut d,
        &[&r, &s, &t, &i],
        StylePatch {
            link: Some(Some("https://example.org".into())),
            ..Default::default()
        },
    )
    .expect("lien");
    assert_eq!(c.ids, vec![r.clone(), s.clone(), t.clone(), i.clone()]);
    for id in [&r, &s, &t, &i] {
        assert_eq!(look_of(&d, id).link.as_deref(), Some("https://example.org"));
    }
}

#[test]
fn lot2_out_of_domain_refused() {
    let mut d = blank();
    let a = add_kind(&mut d, ShapeKind::Arrow, Look::default());
    let v = d.version();
    let s = |v: &str| Some(Some(v.to_string()));
    for patch in [
        StylePatch {
            fill_style: s("solid"),
            ..Default::default()
        },
        StylePatch {
            fill_style: s("zigzag"),
            ..Default::default()
        },
        StylePatch {
            start_arrowhead: s("diamond"),
            ..Default::default()
        },
        StylePatch {
            end_arrowhead: s("Arrow"),
            ..Default::default()
        },
        StylePatch {
            text_align: s("left"),
            ..Default::default()
        },
        StylePatch {
            text_align: s("justify"),
            ..Default::default()
        },
        StylePatch {
            start_arrowhead: s("triangle"),
            link: s("javascript:alert(1)"),
            ..Default::default()
        },
    ] {
        let r = set_style(&mut d, &[&a], patch.clone());
        assert!(matches!(r, Err(CommandError::BadStyle)), "{patch:?}");
    }
    assert_eq!(d.version(), v);
    assert_eq!(d.element(&a).expect("vue").look, None);
}

/// Un aspect du lot 2 neutre ou hors domaine n'écrit aucune clé à la création (DA-5) ; une valeur illisible d'un fichier
/// est lue neutre et gardée telle quelle (G12).
#[test]
fn lot2_neutral_writes_no_key_and_unreadable_is_kept() {
    let odd = Look {
        fill_style: Some("solid".into()),
        start_arrowhead: Some("none".into()),
        end_arrowhead: Some("arrow".into()),
        text_align: Some("left".into()),
        link: Some("ftp://x".into()),
        ..Look::default()
    };
    for look in [Look::default(), odd] {
        assert!(look.is_neutral(), "{look:?}");
        let mut d = blank();
        let ids = [
            add_rect(&mut d, look.clone()),
            add_kind(&mut d, ShapeKind::Arrow, look.clone()),
            add_stroke(&mut d, look.clone()),
            set_text(&mut d, None, "Bonjour", look.clone())[0].clone(),
        ];
        for id in &ids {
            assert_eq!(d.element(id).expect("vue").look, None, "{look:?}");
            for k in LOOK2_KEYS {
                assert_eq!(raw_field(&d, id, k), None, "{k} écrit ({look:?})");
            }
        }
    }
    let mut d = blank();
    let a = add_kind(&mut d, ShapeKind::Arrow, Look::default());
    let d = with_raw_field(&d, &a, "fillStyle", In::from("zigzag"));
    let d = with_raw_field(&d, &a, "startArrowhead", In::Any(Any::from(3.0)));
    let d = with_raw_field(&d, &a, "textAlign", In::from("justify"));
    assert_eq!(d.element(&a).expect("vue").look, None);
    assert_eq!(raw_field(&d, &a, "fillStyle").as_deref(), Some("zigzag"));
    assert_eq!(raw_field(&d, &a, "textAlign").as_deref(), Some("justify"));
    assert!(raw_field(&d, &a, "startArrowhead").is_some());
}

/// La création écrit les champs du lot 2 non neutres, dans la même étape que l'élément.
#[test]
fn lot2_written_at_creation() {
    let mut d = blank();
    let look = Look {
        start_arrowhead: Some("triangle".into()),
        end_arrowhead: Some("none".into()),
        link: Some("mailto:a@example.org".into()),
        ..Look::default()
    };
    let a = add_kind(&mut d, ShapeKind::Arrow, look.clone());
    assert_eq!(look_of(&d, &a), look);
    assert_eq!(raw_field(&d, &a, "endArrowhead").as_deref(), Some("none"));
    let r = add_rect(
        &mut d,
        Look {
            fill_style: Some("hachure".into()),
            ..Look::default()
        },
    );
    assert_eq!(raw_field(&d, &r, "fillStyle").as_deref(), Some("hachure"));
    let t = set_text(
        &mut d,
        None,
        "Bonjour",
        Look {
            text_align: Some("center".into()),
            ..Look::default()
        },
    )[0]
    .clone();
    assert_eq!(look_of(&d, &t).text_align.as_deref(), Some("center"));
}

// --- OG23 (T1) : pression constante, champ `variability` (seul `"constant"` lu ; absent = variable, jamais écrit). ---

fn constant() -> Look {
    Look {
        variability: Some("constant".into()),
        ..Look::default()
    }
}

fn thick() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 16.0,
    }
}

/// Trait de x = `x0` à `x0 + 200` (pas 10) sur y = 100 ; pression donnée par point.
fn stroke_with(d: &mut Document, x0: f32, pressure: impl Fn(f32) -> f32, look: Look) -> String {
    let page = first_page(d);
    let points: Vec<f32> = (0..=20)
        .flat_map(|i| [x0 + i as f32 * 10.0, 100.0, pressure(i as f32 / 20.0)])
        .collect();
    d.apply(Command::CommitStroke {
        page,
        points,
        style: thick(),
        look,
    })
    .expect("trait")
    .ids[0]
        .clone()
}

/// Sommets monde finis du contour d'un trait.
fn world_outline(d: &Document, id: &str) -> Vec<(f64, f64)> {
    let t = d.element(id).expect("vue").transform;
    let poly = d.outline(id).expect("contour");
    poly.chunks(2)
        .filter(|c| c.len() == 2 && c[0].is_finite() && c[1].is_finite())
        .map(|c| apply_transform(&t, f64::from(c[0]), f64::from(c[1])))
        .collect()
}

/// Demi-hauteur du contour autour de l'abscisse monde `x` (sommets à 8 unités au plus).
fn half_height_at(d: &Document, id: &str, x: f64) -> f64 {
    let ys: Vec<f64> = world_outline(d, id)
        .into_iter()
        .filter(|(wx, _)| (wx - x).abs() <= 8.0)
        .map(|(_, wy)| wy)
        .collect();
    assert!(!ys.is_empty(), "sommets près de x = {x}");
    let lo = ys.iter().copied().fold(f64::MAX, f64::min);
    let hi = ys.iter().copied().fold(f64::MIN, f64::max);
    (hi - lo) / 2.0
}

/// Discrimine le patron écarté (la pression lue malgré `variability`) : même rampe de pression, contour d'épaisseur
/// constante avec le champ, variable sans.
#[test]
fn constant_outline_keeps_height() {
    let mut d = blank();
    let ramp = |t: f32| 0.1 + 0.9 * t;
    let c = stroke_with(&mut d, 0.0, ramp, constant());
    let (h1, h2) = (half_height_at(&d, &c, 50.0), half_height_at(&d, &c, 150.0));
    assert!(
        (h1 - h2).abs() / h1.max(h2) < 0.05,
        "constant : {h1} contre {h2}"
    );
    let v = stroke_with(&mut d, 0.0, ramp, Look::default());
    let (g1, g2) = (half_height_at(&d, &v, 50.0), half_height_at(&d, &v, 150.0));
    assert!(
        (g1 - g2).abs() / g1.min(g2) > 0.30,
        "variable : {g1} contre {g2}"
    );
}

#[test]
fn set_style_variability_stroke_only() {
    let mut d = blank();
    let r = add_rect(&mut d, Look::default());
    let s = add_stroke(&mut d, Look::default());
    let on = StylePatch {
        variability: Some(Some("constant".into())),
        ..Default::default()
    };
    let c = set_style(&mut d, &[&r, &s], on).expect("style");
    assert_eq!(c.ids, vec![s.clone()], "rectangle ignoré");
    assert_eq!(look_of(&d, &s).variability.as_deref(), Some("constant"));
    assert_eq!(
        raw_field(&d, &s, "variability").as_deref(),
        Some("constant")
    );
    assert!(!raw_keys(&d, &r).contains(&"variability".to_string()));
    let off = StylePatch {
        variability: Some(None),
        ..Default::default()
    };
    let c = set_style(&mut d, &[&s], off).expect("retrait");
    assert_eq!(c.ids, vec![s.clone()]);
    assert_eq!(look_of(&d, &s).variability, None);
    assert!(!raw_keys(&d, &s).contains(&"variability".to_string()));
    let v = d.version();
    let wavy = StylePatch {
        variability: Some(Some("wavy".into())),
        ..Default::default()
    };
    assert_eq!(set_style(&mut d, &[&s], wavy), Err(CommandError::BadStyle));
    assert_eq!(d.version(), v);
}

/// Discrimine le patron écarté (gomme au rayon variable sur un contour constant) : à pression 0,1, les morceaux gardent
/// `variability` et le trou entre leurs contours a la largeur de la gomme (2 × rayon) à 1 unité près.
#[test]
fn erase_partial_constant_keeps_variability_and_radius() {
    let mut d = blank();
    let page = first_page(&d);
    let id = stroke_with(&mut d, 100.0, |_| 0.1, constant());
    let radius = 6.0_f32;
    let c = d
        .apply(Command::Erase {
            page,
            path: vec![200.0, 60.0, 200.0, 140.0],
            radius,
            mode: EraseMode::Partial,
        })
        .expect("gomme");
    assert_eq!(c.removed, vec![id]);
    assert!(c.ids.len() >= 2, "deux morceaux");
    let (mut left, mut right) = (f64::MIN, f64::MAX);
    for p in &c.ids {
        assert_eq!(look_of(&d, p).variability.as_deref(), Some("constant"));
        let xs: Vec<f64> = world_outline(&d, p).into_iter().map(|(x, _)| x).collect();
        let (lo, hi) = (
            xs.iter().copied().fold(f64::MAX, f64::min),
            xs.iter().copied().fold(f64::MIN, f64::max),
        );
        if hi < 200.0 {
            left = left.max(hi);
        } else if lo > 200.0 {
            right = right.min(lo);
        }
    }
    let hole = right - left;
    assert!(
        (hole - 2.0 * f64::from(radius)).abs() <= 1.0,
        "trou {hole} pour une gomme de {}",
        2.0 * radius
    );
}

#[test]
fn old_stroke_has_no_variability_key() {
    let mut d = blank();
    let s = add_stroke(&mut d, Look::default());
    assert!(!raw_keys(&d, &s).contains(&"variability".to_string()));
    assert_eq!(look_of(&d, &s).variability, None);
    let w = add_stroke(
        &mut d,
        Look {
            variability: Some("wavy".into()),
            ..Look::default()
        },
    );
    assert!(
        !raw_keys(&d, &w).contains(&"variability".to_string()),
        "hors domaine : jamais écrit"
    );
    let k = add_stroke(&mut d, constant());
    assert_eq!(
        raw_field(&d, &k, "variability").as_deref(),
        Some("constant")
    );
}

// --- OG23 (T10) : `dragCopy` (seul `true` lu et écrit, booléen ; absent = déplacer, le neutre). ---

fn drag_copy(v: bool) -> StylePatch {
    StylePatch {
        drag_copy: Some(v),
        ..Default::default()
    }
}

/// Valeur `Any` brute d'un champ de l'élément.
fn raw_any(d: &Document, id: &str, key: &str) -> Option<Any> {
    let (raw, pages) = raw_doc(d);
    let txn = raw.transact();
    match find_raw(&txn, &pages, id)?.get(&txn, key) {
        Some(Out::Any(a)) => Some(a),
        _ => None,
    }
}

#[test]
fn set_style_drag_copy_one_step() {
    let mut d = blank();
    let r = add_rect(&mut d, Look::default());
    let s = add_stroke(&mut d, Look::default());
    let t = set_text(&mut d, None, "Bonjour", Look::default())[0].clone();
    let d = with_raw_kind(&d, "zone-brute", "fill");
    let z = "zone-brute".to_string();
    let mut d = with_raw_image(&d, "img-1", vec![]);
    let i = "img-1".to_string();
    let all = [&r, &s, &t, &i];
    let c = set_style(&mut d, &[&r, &s, &t, &i, &z], drag_copy(true)).expect("pose");
    assert_eq!(
        c.ids,
        vec![r.clone(), s.clone(), t.clone(), i.clone()],
        "zone ignorée sans erreur"
    );
    for id in all {
        assert_eq!(look_of(&d, id).drag_copy, Some(true));
        assert_eq!(raw_any(&d, id, "dragCopy"), Some(Any::Bool(true)));
    }
    assert!(!raw_keys(&d, &z).contains(&"dragCopy".to_string()));
    assert!(d.undo());
    for id in all {
        assert_eq!(look_of(&d, id).drag_copy, None, "une seule étape");
    }
    set_style(&mut d, &[&r, &s], drag_copy(true)).expect("pose");
    let v = d.version();
    let same = set_style(&mut d, &[&r], drag_copy(true)).expect("même valeur");
    assert_eq!(same.ids, Vec::<String>::new());
    assert_eq!(d.version(), v, "même valeur : aucune étape");
    let off = set_style(&mut d, &[&r], drag_copy(false)).expect("retrait");
    assert_eq!(off.ids, vec![r.clone()]);
    assert_eq!(look_of(&d, &r).drag_copy, None);
    assert!(!raw_keys(&d, &r).contains(&"dragCopy".to_string()));
    assert_eq!(look_of(&d, &s).drag_copy, Some(true));
    let v = d.version();
    set_style(&mut d, &[&r], drag_copy(false)).expect("retrait de l'absent");
    assert_eq!(d.version(), v, "retirer l'absent : aucune étape");
}

/// Une valeur non booléenne ou `false` gardée dans le fichier est lue neutre.
#[test]
fn drag_copy_unreadable_is_neutral() {
    let d = blank();
    let mut d = d;
    let r = add_rect(&mut d, Look::default());
    for v in [
        In::Any(Any::Bool(false)),
        In::from("true"),
        In::Any(Any::from(1.0)),
    ] {
        let e = with_raw_field(&d, &r, "dragCopy", v);
        assert_eq!(look_of(&e, &r).drag_copy, None);
        assert_eq!(e.element(&r).expect("vue").look, None);
    }
}

#[test]
fn drag_copy_kept_by_extract() {
    let mut d = blank();
    let page = first_page(&d);
    let id = add_rect(&mut d, Look::default());
    set_style(&mut d, &[&id], drag_copy(true)).expect("pose");
    let frag = d
        .extract(&page, std::slice::from_ref(&id))
        .expect("extraction");
    let ins = d
        .insert_fragment(&frag, &page, 10.0, 10.0)
        .expect("insertion");
    assert_eq!(look_of(&d, &ins.ids[0]).drag_copy, Some(true));
    assert_eq!(raw_any(&d, &ins.ids[0], "dragCopy"), Some(Any::Bool(true)));
}

/// Décision 29 : « glisser une copie » vaut pour tout objet (tableau, média, objet 3D compris), jamais pour une zone.
#[test]
fn set_style_drag_copy_every_object_kind() {
    let d = blank();
    let d = with_raw_kind(&d, "tab-1", "table");
    let d = with_raw_kind(&d, "med-1", "media");
    let mut d = with_raw_kind(&d, "m3d-1", "model3d");
    let ids: Vec<String> = ["tab-1", "med-1", "m3d-1"].map(String::from).to_vec();
    let refs: Vec<&String> = ids.iter().collect();
    let c = set_style(&mut d, &refs, drag_copy(true)).expect("pose");
    assert_eq!(c.ids, ids);
    for id in &ids {
        assert_eq!(raw_any(&d, id, "dragCopy"), Some(Any::Bool(true)), "{id}");
    }
    assert!(d.undo());
    for id in &ids {
        assert_eq!(raw_any(&d, id, "dragCopy"), None, "{id}");
    }
}

/// `variability` n'est écrit qu'avec un trait : jamais sur une forme ni un texte (comme `StylePatch`).
#[test]
fn look_variability_written_only_for_stroke() {
    let l = Look {
        variability: Some("constant".into()),
        ..Default::default()
    };
    let mut d = blank();
    let r = add_rect(&mut d, l.clone());
    let t = set_text(&mut d, None, "Bonjour", l.clone())[0].clone();
    let s = add_stroke(&mut d, l);
    assert!(!raw_keys(&d, &r).contains(&"variability".to_string()));
    assert!(!raw_keys(&d, &t).contains(&"variability".to_string()));
    assert_eq!(
        raw_field(&d, &s, "variability").as_deref(),
        Some("constant")
    );
}

/// Le cache des contours est clé par `constant` : changer `variability` d'un trait existant (SetStyle) fait relire un
/// contour différent (recalcul compté), et le retrait rend le premier contour au bit près.
#[test]
fn outline_cache_follows_variability_change() {
    let mut d = blank();
    let s = stroke_with(&mut d, 0.0, |p| 0.1 + 0.9 * p, Look::default());
    let bits = |d: &Document| -> Vec<u32> {
        d.outline(&s)
            .expect("contour")
            .iter()
            .map(|v| v.to_bits())
            .collect()
    };
    let variable = bits(&d);
    let m = d.outline_cache_misses();
    assert_eq!(bits(&d), variable);
    assert_eq!(d.outline_cache_misses(), m, "même aspect : servi du cache");
    let patch = |v: Option<&str>| StylePatch {
        variability: Some(v.map(String::from)),
        ..Default::default()
    };
    set_style(&mut d, &[&s], patch(Some("constant"))).expect("constant");
    let constant = bits(&d);
    assert_ne!(constant, variable, "contour à pression constante différent");
    assert_eq!(d.outline_cache_misses(), m + 1, "recalcul");
    set_style(&mut d, &[&s], patch(None)).expect("retrait");
    assert_eq!(bits(&d), variable);
}

/// OG23 (T22) : la vue d'un tableau, d'un média et d'un objet 3D porte `look.dragCopy` (décision 29) ; seul ce champ
/// d'aspect y est exposé, un élément sans bascule garde la même vue (`look` omis).
#[test]
fn drag_copy_is_in_the_view_of_table_media_and_model3d() {
    use roomboard_core::asset::AssetRef;
    use roomboard_core::media::MediaType;
    use roomboard_core::model3d::{Model3dFormat, DEFAULT_PITCH, DEFAULT_YAW};
    let asset = |c: char, name: &str, mime: &str| AssetRef {
        id: c.to_string().repeat(64),
        name: name.into(),
        mime: mime.into(),
        size: 1000.0,
    };
    let mut d = blank();
    let p = first_page(&d);
    let table = d
        .apply(Command::AddTable {
            page: p.clone(),
            x: 100.0,
            y: 200.0,
            cols: 2,
            rows: 2,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
        .clone();
    let media = d
        .apply(Command::AddMedia {
            page: p.clone(),
            asset: asset('a', "clip.webm", "video/webm"),
            linked: None,
            media_type: MediaType::Video,
            w: 320.0,
            h: 180.0,
            duration: 2.5,
            poster: None,
            matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 50.0],
        })
        .expect("média")
        .ids[0]
        .clone();
    let model = d
        .apply(Command::AddModel3d {
            page: p,
            asset: asset('b', "chaise.gltf", "model/gltf+json"),
            format: Model3dFormat::Gltf,
            files: vec![],
            w: 640.0,
            h: 480.0,
            yaw: DEFAULT_YAW,
            pitch: DEFAULT_PITCH,
            snapshot: None,
            matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        })
        .expect("objet 3D")
        .ids[0]
        .clone();
    let ids = [&table, &media, &model];
    for id in ids {
        assert_eq!(d.element(id).expect("vue").look, None, "neutre : omis");
    }
    set_style(&mut d, &ids, drag_copy(true)).expect("pose");
    for id in ids {
        let look = d.element(id).expect("vue").look.expect("look présent");
        assert_eq!(look.drag_copy, Some(true));
        assert_eq!(
            look,
            Look {
                drag_copy: Some(true),
                ..Look::default()
            }
        );
    }
    assert!(d.undo());
    for id in ids {
        assert_eq!(d.element(id).expect("vue").look, None);
    }
}
