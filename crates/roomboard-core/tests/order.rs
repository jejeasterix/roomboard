//! OG11 (DA-2) : la `Restack` d'OG4 (`commands.rs`, décision 16) garde les champs du lot 2 (remplissage). Les autres
//! cas (premier plan, arrière-plan, même ordre, pages mêlées, une étape, hors bornes, vide, inconnu) sont les tests
//! `restack_*` de `commands.rs`.
use roomboard_core::commands::Command;
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
        line: roomboard_core::linear::LineInit::default(),
    })
    .unwrap()
    .ids[0]
        .clone()
}

fn order(d: &Document) -> Vec<String> {
    let p = d.page_ids()[0].clone();
    d.element_ids(&p)
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
            look: Look {
                fill_style: Some("hachure".into()),
                link: Some("https://example.org".into()),
                ..Look::default()
            },
            line: roomboard_core::linear::LineInit::default(),
        })
        .unwrap()
        .ids[0]
        .clone();
    let b = add(&mut d);
    let view = format!("{:?}", d.element(&a));
    assert!(
        view.contains("hachure") && view.contains("https://example.org"),
        "{view}"
    );
    d.apply(Command::Restack {
        ids: vec![a.clone()],
        to: 1,
    })
    .unwrap();
    assert_eq!(order(&d), vec![b, a.clone()]);
    assert_eq!(format!("{:?}", d.element(&a)), view);
}
