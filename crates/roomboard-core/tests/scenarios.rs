//! Scénarios S2 et S3 du cadrage, au niveau du cœur (sans interface).
use roomboard_core::commands::{Command, CommandError, EraseMode};
use roomboard_core::document::Document;
use roomboard_core::element::StrokeStyle;
use roomboard_core::format::{load, save, SaveMeta};

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#1e40af".into(),
        width: 4.0,
    }
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-16T14:00:00Z".into(),
        created: None,
    }
}

fn hline(y: f32) -> Vec<f32> {
    (0..=40)
        .flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.3 + i as f32 / 100.0])
        .collect()
}

fn commit(d: &mut Document, page: &str, pts: Vec<f32>) -> String {
    d.apply(Command::CommitStroke {
        page: page.into(),
        points: pts,
        style: pen(),
    })
    .expect("commit")
    .ids[0]
        .clone()
}

#[test]
fn s2_three_strokes_erase_undo_redo_save_load() {
    let mut d = Document::blank();
    assert!(!d.undo(), "Ctrl+Z sur un document neuf ne fait rien");
    assert_eq!(d.page_count(), 1);
    let p = d.page_ids()[0].clone();
    for y in [100.0, 200.0, 300.0] {
        commit(&mut d, &p, hline(y));
    }
    let erase = Command::Erase {
        page: p.clone(),
        path: vec![300.0, 150.0, 300.0, 250.0],
        radius: 10.0,
        mode: EraseMode::Partial,
    };
    d.apply(erase).expect("gomme");
    assert_eq!(d.element_ids(&p).len(), 4);
    assert!(d.undo());
    assert_eq!(d.element_ids(&p).len(), 3);
    assert!(d.redo());
    assert_eq!(d.element_ids(&p).len(), 4);

    let bytes = save(&d, &meta()).expect("save");
    let e = load(&bytes).expect("load");
    assert_eq!(e.page_ids(), vec![p.clone()]);
    assert_eq!(e.element_ids(&p), d.element_ids(&p));
    for id in d.element_ids(&p) {
        assert_eq!(e.element(&id), d.element(&id), "élément {id}");
        assert_eq!(e.stroke_points(&id), d.stroke_points(&id), "points {id}");
    }
    assert!(!e.can_undo());
}

#[test]
fn s3_pages_save_load_remove_undo() {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    let p2 = d
        .apply(Command::AddPage {
            after: Some(p1.clone()),
        })
        .expect("p2")
        .pages[0]
        .clone();
    let p3 = d
        .apply(Command::AddPage {
            after: Some(p2.clone()),
        })
        .expect("p3")
        .pages[0]
        .clone();
    let s = commit(&mut d, &p2, hline(500.0));

    let mut e = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(e.page_ids(), vec![p1.clone(), p2.clone(), p3.clone()]);
    assert!(e.element_ids(&p1).is_empty() && e.element_ids(&p3).is_empty());
    assert_eq!(e.element_ids(&p2), vec![s.clone()]);

    e.apply(Command::RemovePage { page: p2.clone() })
        .expect("suppression");
    assert_eq!(e.page_ids(), vec![p1.clone(), p3.clone()]);
    assert!(e.undo());
    assert_eq!(e.page_ids(), vec![p1, p2.clone(), p3]);
    assert_eq!(e.element_ids(&p2), vec![s.clone()]);
    assert_eq!(e.stroke_points(&s), d.stroke_points(&s));
}

#[test]
fn s3_last_page_cannot_be_removed() {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    let p2 = d.apply(Command::AddPage { after: None }).expect("p2").pages[0].clone();
    d.apply(Command::RemovePage { page: p1 })
        .expect("première suppression");
    assert_eq!(
        d.apply(Command::RemovePage { page: p2 }),
        Err(CommandError::LastPage)
    );
    assert_eq!(d.page_count(), 1);
}
