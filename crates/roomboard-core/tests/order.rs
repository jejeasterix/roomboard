//! OG11 (DA-2) : `Restack`, ordre des objets d'une page, en une étape d'annulation.
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::shape::ShapeKind;

fn add(d: &mut Document) -> String {
    let page = d.page_ids()[0].clone();
    d.apply(Command::AddShape {
        page,
        shape: ShapeKind::Rect,
        x0: 0.0,
        y0: 0.0,
        x1: 10.0,
        y1: 10.0,
        style: StrokeStyle {
            color: "#000000".into(),
            width: 4.0,
        },
        fill: None,
        look: Look::default(),
    })
    .unwrap()
    .ids[0]
        .clone()
}

fn order(d: &Document) -> Vec<String> {
    let p = d.page_ids()[0].clone();
    d.element_ids(&p)
}

#[test]
fn restack_to_front() {
    let mut d = Document::blank();
    let (a, b, c) = (add(&mut d), add(&mut d), add(&mut d));
    d.apply(Command::Restack {
        ids: vec![a.clone()],
        to: 2,
    })
    .unwrap();
    assert_eq!(order(&d), vec![b.clone(), c.clone(), a.clone()]);
    d.undo();
    assert_eq!(order(&d), vec![a, b, c]);
}

#[test]
fn restack_keeps_relative_order() {
    let mut d = Document::blank();
    let (a, b, c, e) = (add(&mut d), add(&mut d), add(&mut d), add(&mut d));
    d.apply(Command::Restack {
        ids: vec![c.clone(), a.clone()],
        to: 0,
    })
    .unwrap();
    assert_eq!(order(&d), vec![a, c, b, e]);
}

#[test]
fn restack_same_order_no_step() {
    let mut d = Document::blank();
    let a = add(&mut d);
    add(&mut d);
    let c = d
        .apply(Command::Restack {
            ids: vec![a],
            to: 0,
        })
        .unwrap();
    assert!(c.ids.is_empty());
}

#[test]
fn restack_out_of_range_refused() {
    let mut d = Document::blank();
    let a = add(&mut d);
    assert_eq!(
        d.apply(Command::Restack {
            ids: vec![a],
            to: 5
        }),
        Err(CommandError::BadOrder)
    );
}

#[test]
fn restack_mixed_pages_refused() {
    let mut d = Document::blank();
    let a = add(&mut d);
    d.apply(Command::AddPage { after: None }).unwrap();
    let p2 = d.page_ids()[1].clone();
    let b = d
        .apply(Command::AddShape {
            page: p2,
            shape: ShapeKind::Rect,
            x0: 0.0,
            y0: 0.0,
            x1: 1.0,
            y1: 1.0,
            style: StrokeStyle {
                color: "#000000".into(),
                width: 4.0,
            },
            fill: None,
            look: Look::default(),
        })
        .unwrap()
        .ids[0]
        .clone();
    assert_eq!(
        d.apply(Command::Restack {
            ids: vec![a, b],
            to: 0
        }),
        Err(CommandError::BadOrder)
    );
}

/// Discrimine le patron interdit : un bloc de deux objets déplacé en une transaction par élément laisserait, après un
/// seul `undo`, l'ordre à moitié rétabli ; ici un `undo` rend l'ordre d'avant et le suivant annule le dernier ajout.
#[test]
fn restack_block_is_one_step() {
    let mut d = Document::blank();
    let (a, b, c, e) = (add(&mut d), add(&mut d), add(&mut d), add(&mut d));
    let change = d
        .apply(Command::Restack {
            ids: vec![c.clone(), a.clone()],
            to: 2,
        })
        .unwrap();
    assert_eq!(order(&d), vec![b.clone(), e.clone(), a.clone(), c.clone()]);
    assert_eq!(change.ids, vec![a.clone(), c.clone()]);
    assert!(change.removed.is_empty());
    assert!(d.undo());
    assert_eq!(order(&d), vec![a.clone(), b.clone(), c.clone(), e]);
    assert!(d.undo());
    assert_eq!(order(&d), vec![a, b, c]);
}

/// Discrimine l'étape vide : même ordre visé, aucune transaction ; le `undo` suivant annule le dernier ajout, pas une
/// réécriture à l'identique.
#[test]
fn restack_unchanged_leaves_history() {
    let mut d = Document::blank();
    let (a, b) = (add(&mut d), add(&mut d));
    let before = d.version();
    let change = d
        .apply(Command::Restack {
            ids: vec![b.clone()],
            to: 1,
        })
        .unwrap();
    assert_eq!(change.version, before);
    assert!(change.pages.is_empty());
    assert!(d.undo());
    assert_eq!(order(&d), vec![a]);
}

/// Les ids et tous les champs sont gardés (la vue de l'élément est la même après le déplacement).
#[test]
fn restack_keeps_ids_and_fields() {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let a = d
        .apply(Command::AddShape {
            page,
            shape: ShapeKind::Ellipse,
            x0: 2.0,
            y0: 3.0,
            x1: 40.0,
            y1: 30.0,
            style: StrokeStyle {
                color: "#1e1e1e".into(),
                width: 2.0,
            },
            fill: Some("#ffc9c9".into()),
            look: Look::default(),
        })
        .unwrap()
        .ids[0]
        .clone();
    let b = add(&mut d);
    let view = format!("{:?}", d.element(&a));
    d.apply(Command::Restack {
        ids: vec![a.clone()],
        to: 1,
    })
    .unwrap();
    assert_eq!(order(&d), vec![b, a.clone()]);
    assert_eq!(format!("{:?}", d.element(&a)), view);
}

#[test]
fn restack_unknown_or_empty_refused() {
    let mut d = Document::blank();
    let a = add(&mut d);
    assert_eq!(
        d.apply(Command::Restack {
            ids: vec![a, "inconnu".into()],
            to: 0
        }),
        Err(CommandError::BadOrder)
    );
    assert_eq!(
        d.apply(Command::Restack { ids: vec![], to: 0 }),
        Err(CommandError::BadOrder)
    );
}
