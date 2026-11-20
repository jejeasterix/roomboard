//! Garde de compatibilité (C9 éditeur, E1, CR7, effet de bord 1) : `grille-pr12.roomboard` a été écrit une fois par le
//! code de `main` 8247215 (PR 12 : niveaux sans `lineWidth`). Il ne se régénère pas : le code actuel écrit `lineWidth`.
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::query::Bounds;

const FIXTURE: &[u8] = include_bytes!("fixtures/grille-pr12.roomboard");

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

#[test]
fn grid_pr12_fixture_reads_line_width_one_and_resaves_identically() {
    let d = load(FIXTURE).expect("load");
    let p = d.page_ids()[0].clone();
    let g = d.page(&p).and_then(|v| v.grid).expect("grille lue");
    assert_eq!(
        g.levels
            .iter()
            .map(|l| (l.kind.as_str(), l.line_width))
            .collect::<Vec<_>>(),
        vec![("squares", 1.0), ("dots", 1.0)]
    );
    let r = Bounds {
        x0: 0.0,
        y0: 0.0,
        x1: 400.0,
        y1: 400.0,
    };
    let lines = d.grid_lines(&p, r, 4.0, 8.0).expect("visible");
    assert_eq!(lines.levels.len(), 2);
    assert!(lines.levels.iter().all(|l| l.line_width == 1.0));
    assert!(
        save(&d, &meta()).expect("resave") == FIXTURE,
        "fichier de la PR 12 réenregistré à l'identique"
    );
}
