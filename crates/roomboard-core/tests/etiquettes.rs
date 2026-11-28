//! OG33 (lot 2b, morceau 3, choix 8) : texte d'une forme, clé `label` de la forme elle-même (jamais un élément `text`
//! lié). Les clés brutes du Y.Doc sont lues pour distinguer « clé retirée » de « clé vide écrite » (GC8).

use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::linear::{LineInit, LinkDir};
use roomboard_core::shape::ShapeKind;
use yrs::updates::decoder::Decode;
use yrs::{Any, Array, ArrayRef, Doc, Map, Out, ReadTxn, StateVector, Transact, Update};

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 4.0,
    }
}

fn blank() -> Document {
    Document::blank() // Document::new() n'a aucune page
}

fn first_page(d: &Document) -> String {
    d.page_ids()[0].clone()
}

fn add_shape(d: &mut Document, kind: ShapeKind) -> String {
    let page = first_page(d);
    d.apply(Command::AddShape {
        page,
        shape: kind,
        x0: 100.0,
        y0: 100.0,
        x1: 300.0,
        y1: 200.0,
        style: pen(),
        fill: None,
        look: Look::default(),
        line: LineInit::default(),
    })
    .expect("forme")
    .ids[0]
        .clone()
}

fn add_rect(d: &mut Document) -> String {
    add_shape(d, ShapeKind::Rect)
}

fn set_label(d: &mut Document, id: &str, label: &str) -> Result<(), CommandError> {
    d.apply(Command::SetShapeLabel {
        id: id.to_string(),
        label: label.to_string(),
    })
    .map(|_| ())
}

fn label(d: &Document, id: &str) -> Option<String> {
    d.element(id).expect("élément").shape.expect("forme").label
}

fn raw_doc(d: &Document) -> (Doc, ArrayRef) {
    let raw = Doc::new();
    let pages = raw.get_or_insert_array("pages");
    raw.transact_mut()
        .apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
        .expect("application");
    (raw, pages)
}

/// Clés brutes de l'élément `id` de la première page (`None` : absent) et nombre d'éléments de cette page.
fn raw_keys(d: &Document, id: &str) -> (Option<Vec<String>>, u32) {
    let (raw, pages) = raw_doc(d);
    let txn = raw.transact();
    let Some(Out::YMap(page)) = pages.get(&txn, 0) else {
        panic!("page")
    };
    let Some(Out::YArray(els)) = page.get(&txn, "elements") else {
        panic!("éléments")
    };
    let mut found = None;
    for el in els.iter(&txn) {
        if let Out::YMap(m) = el {
            if matches!(m.get(&txn, "id"), Some(Out::Any(Any::String(s))) if &*s == id) {
                found = Some(m.keys(&txn).map(str::to_string).collect());
            }
        }
    }
    (found, els.len(&txn))
}

fn has_raw_label(d: &Document, id: &str) -> bool {
    raw_keys(d, id)
        .0
        .expect("élément brut")
        .iter()
        .any(|k| k == "label")
}

/// S12 : « Bonjour » sur un rectangle, un losange, une ellipse : une étape, sur la forme même (aucun élément de plus),
/// annulée d'un coup.
#[test]
fn label_one_step_undo() {
    for kind in [ShapeKind::Rect, ShapeKind::Diamond, ShapeKind::Ellipse] {
        let mut d = blank();
        let id = add_shape(&mut d, kind);
        let (_, count) = raw_keys(&d, &id);
        let v0 = d.version();
        let ch = d
            .apply(Command::SetShapeLabel {
                id: id.clone(),
                label: "Bonjour".into(),
            })
            .expect("texte");
        assert_eq!(ch.ids, vec![id.clone()], "{kind:?}");
        assert_eq!(label(&d, &id).as_deref(), Some("Bonjour"), "{kind:?}");
        assert_eq!(d.version(), v0 + 1, "{kind:?} : une étape");
        assert_eq!(raw_keys(&d, &id).1, count, "{kind:?} : aucun élément texte lié");
        assert!(d.undo());
        assert_eq!(label(&d, &id), None, "{kind:?}");
        assert!(!has_raw_label(&d, &id), "{kind:?} : l'annulation retire la clé");
    }
}

/// D38 : même texte, aucune étape ; vide sur une forme sans texte, aucune étape.
#[test]
fn label_same_text_no_step() {
    let mut d = blank();
    let id = add_rect(&mut d);
    let v0 = d.version();
    set_label(&mut d, &id, "").expect("vide");
    assert_eq!(d.version(), v0);
    set_label(&mut d, &id, "Bonjour").expect("texte");
    let v1 = d.version();
    set_label(&mut d, &id, "Bonjour").expect("même texte");
    assert_eq!(d.version(), v1);
}

/// GC8 : une forme sans texte n'a pas de clé `label` ; le vide retire la clé (jamais `""` ni `null` écrit).
#[test]
fn label_empty_removes_key() {
    let mut d = blank();
    let id = add_rect(&mut d);
    assert!(!has_raw_label(&d, &id), "forme neuve sans clé");
    set_label(&mut d, &id, "Bonjour").expect("texte");
    assert!(has_raw_label(&d, &id));
    let v = d.version();
    set_label(&mut d, &id, "").expect("vide");
    assert_eq!(d.version(), v + 1);
    assert_eq!(label(&d, &id), None);
    assert!(!has_raw_label(&d, &id), "le vide retire la clé");
}

#[test]
fn label_refused_on_line_and_unknown() {
    let mut d = blank();
    let line = add_shape(&mut d, ShapeKind::Line);
    let arrow = add_shape(&mut d, ShapeKind::Arrow);
    let v = d.version();
    assert_eq!(set_label(&mut d, &line, "x"), Err(CommandError::BadShape));
    assert_eq!(set_label(&mut d, &arrow, "x"), Err(CommandError::BadShape));
    assert_eq!(
        set_label(&mut d, "absent", "x"),
        Err(CommandError::UnknownElement("absent".into()))
    );
    assert_eq!(d.version(), v);
    assert!(!has_raw_label(&d, &line));
}

/// Plafond en caractères, pas en octets : 10 000 « é » (20 000 octets) passent, 10 001 sont refusés sans écriture.
#[test]
fn label_too_long_bad_text() {
    let mut d = blank();
    let id = add_rect(&mut d);
    let max = "é".repeat(roomboard_core::label::MAX_LABEL_CHARS);
    set_label(&mut d, &id, &max).expect("au plafond");
    assert_eq!(label(&d, &id), Some(max.clone()));
    let v = d.version();
    let over = "é".repeat(roomboard_core::label::MAX_LABEL_CHARS + 1);
    assert_eq!(set_label(&mut d, &id, &over), Err(CommandError::BadText));
    assert_eq!(d.version(), v);
    assert_eq!(label(&d, &id), Some(max));
}

/// Choix 8 : le texte est une clé de la forme, il suit `Rotate` et la copie sans liaison à tenir.
#[test]
fn label_follows_rotate_and_copy() {
    let mut d = blank();
    let p = first_page(&d);
    let id = add_rect(&mut d);
    set_label(&mut d, &id, "Bonjour").expect("texte");
    d.apply(Command::Rotate {
        ids: vec![id.clone()],
        angle: 30.0,
    })
    .expect("rotation");
    assert_eq!(label(&d, &id).as_deref(), Some("Bonjour"));
    let frag = d
        .extract(&p, std::slice::from_ref(&id))
        .expect("extraction");
    let ch = d.insert_fragment(&frag, &p, 10.0, 10.0).expect("collage");
    assert_eq!(ch.ids.len(), 1, "un seul élément collé");
    assert_ne!(ch.ids[0], id);
    assert_eq!(label(&d, &ch.ids[0]).as_deref(), Some("Bonjour"));
}

/// U3 : une clé `label` qui n'est pas une chaîne (autre version) se lit absente, sans erreur, et reste telle quelle.
#[test]
fn label_non_string_reads_absent() {
    let mut d = blank();
    let id = add_rect(&mut d);
    let (raw, pages) = raw_doc(&d);
    {
        let mut txn = raw.transact_mut();
        let Some(Out::YMap(page)) = pages.get(&txn, 0) else {
            panic!("page")
        };
        let Some(Out::YArray(els)) = page.get(&txn, "elements") else {
            panic!("éléments")
        };
        let Some(Out::YMap(e)) = els.get(&txn, 0) else {
            panic!("élément")
        };
        e.insert(&mut txn, "label", Any::from(42.0));
    }
    let bytes = raw
        .transact()
        .encode_state_as_update_v1(&StateVector::default());
    let d2 = Document::from_update_v1(&bytes).expect("relecture");
    assert_eq!(label(&d2, &id), None);
    assert!(has_raw_label(&d2, &id), "valeur étrangère gardée");
}

/// H5 : la conversion en ligne fermée retire la clé dans la même étape ; l'annulation rend le texte.
#[test]
fn shape_to_polygon_drops_label_undo_restores() {
    let mut d = blank();
    let id = add_rect(&mut d);
    set_label(&mut d, &id, "Bonjour").expect("texte");
    let v = d.version();
    d.apply(Command::ShapeToPolygon { id: id.clone() })
        .expect("conversion");
    assert_eq!(d.version(), v + 1);
    assert!(!has_raw_label(&d, &id), "la ligne n'emporte pas la clé");
    assert!(d.undo());
    assert_eq!(label(&d, &id).as_deref(), Some("Bonjour"));
}

/// Choix 8 : la copie d'`AddLinked` part sans texte ; l'objet d'origine garde le sien.
#[test]
fn add_linked_copy_has_no_label() {
    let mut d = blank();
    let id = add_rect(&mut d);
    set_label(&mut d, &id, "Bonjour").expect("texte");
    let ch = d
        .apply(Command::AddLinked {
            id: id.clone(),
            dir: LinkDir::Right,
        })
        .expect("objet relié");
    let copy = &ch.ids[0];
    assert_eq!(label(&d, copy), None);
    assert!(!has_raw_label(&d, copy), "aucune clé sur la copie");
    assert_eq!(label(&d, &id).as_deref(), Some("Bonjour"));
}
