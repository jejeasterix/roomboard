//! Pot sur une image (C6b, B2-B4, B11, B12 ; S2) par l'API publique du cœur.
use roomboard_core::asset::AssetRef;
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{ImageView, Look, StrokeStyle, Transform};
use roomboard_core::fill::FillTarget;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::image::{ImageParams, ImageParamsInput, TransparentInput};
use roomboard_core::shape::ShapeKind;

const ORIG: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const M: Transform = [1.0, 0.0, 0.0, 1.0, 100.0, 80.0];
const YELLOW: &str = "#facc15";

/// Empreinte conforme faite d'un seul chiffre hexadécimal.
fn hash(c: char) -> String {
    c.to_string().repeat(64)
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-21T00:00:00Z".into(),
        created: None,
    }
}

fn png(id: &str) -> AssetRef {
    AssetRef {
        id: id.into(),
        name: "photo.png".into(),
        mime: "image/png".into(),
        size: 9.0,
    }
}

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 4.0,
    }
}

/// Image 200 × 150 retouchée par C5 : rognage, un quart de tour, luminosité 20, blanc transparent.
fn retouched() -> (Document, String, String) {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddImage {
            page: p.clone(),
            asset: AssetRef {
                id: ORIG.into(),
                name: "photo.jpg".into(),
                mime: "image/jpeg".into(),
                size: 3.0,
            },
            w: 200.0,
            h: 150.0,
            matrix: M,
        })
        .expect("image")
        .ids[0]
        .clone();
    d.apply(Command::SetImageParams {
        id: id.clone(),
        params: ImageParamsInput {
            crop: Some([10.0, 20.0, 160.0, 120.0]),
            quarter_turns: 1.0,
            brightness: 20.0,
            transparent: Some(TransparentInput {
                color: "#ffffff".into(),
                tolerance: 10.0,
                soft: 0.0,
                contiguous: true,
            }),
            ..ImageParamsInput::default()
        },
        matrix: M,
        restore: false,
    })
    .expect("réglages");
    (d, p, id)
}

fn fill(p: &str, id: &str, a: AssetRef, color: Option<&str>) -> Command {
    Command::Fill {
        page: p.into(),
        target: FillTarget::Image {
            id: id.into(),
            asset: a,
        },
        color: color.map(str::to_string),
    }
}

fn restore(id: &str) -> Command {
    Command::SetImageParams {
        id: id.into(),
        params: ImageParamsInput::default(),
        matrix: M,
        restore: true,
    }
}

fn image(d: &Document, id: &str) -> ImageView {
    d.element(id).and_then(|e| e.image).expect("image")
}

fn cited(d: &Document) -> Vec<String> {
    d.cited_assets().into_iter().map(|a| a.id).collect()
}

fn sorted(mut v: Vec<String>) -> Vec<String> {
    v.sort();
    v
}

#[test]
fn fill_image_is_one_step_new_asset_source_and_baked_fields_removed() {
    let (mut d, p, id) = retouched();
    let mid = hash('1');
    let c = d
        .apply(fill(&p, &id, png(&mid), Some(YELLOW)))
        .expect("remplissage");
    assert_eq!((c.pages, c.ids), (vec![p.clone()], vec![id.clone()]));
    let i = image(&d, &id);
    assert_eq!(
        (i.asset.as_str(), i.source_asset.as_deref()),
        (mid.as_str(), Some(ORIG))
    );
    assert_eq!(
        i.params(),
        ImageParams {
            crop: Some([10, 20, 160, 120]),
            quarter_turns: 1,
            ..ImageParams::default()
        },
        "géométrie gardée, pixels de C5 retirés (cuits)"
    );
    assert_eq!(d.element(&id).expect("vue").transform, M);
    assert_eq!(
        d.asset(&mid).map(|a| (a.name, a.mime)),
        Some(("photo.png".to_string(), "image/png".to_string()))
    );
    assert!(d.undo());
    let i = image(&d, &id);
    assert_eq!(
        (i.asset.as_str(), i.source_asset, i.brightness),
        (ORIG, None, 20)
    );
    assert!(
        i.transparent.is_some(),
        "Annuler rend la couleur transparente dans la même étape"
    );
}

#[test]
fn second_fill_keeps_first_source_and_two_undos_restore_start() {
    let (mut d, p, id) = retouched();
    let start = image(&d, &id);
    d.apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("premier");
    d.apply(fill(&p, &id, png(&hash('2')), None))
        .expect("second");
    let i = image(&d, &id);
    assert_eq!(
        (i.asset, i.source_asset.as_deref()),
        (hash('2'), Some(ORIG))
    );
    assert!(d.undo() && d.undo());
    assert_eq!(image(&d, &id), start);
}

/// Effet de bord : « Rétablir l'original » rend aussi l'asset d'origine, en une étape (B11).
#[test]
fn restore_brings_back_source_asset_in_one_step() {
    let (mut d, p, id) = retouched();
    d.apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("remplissage");
    let v = d.version();
    let c = d.apply(restore(&id)).expect("rétablir");
    assert_eq!(c.ids, vec![id.clone()]);
    assert!(d.version() > v);
    let i = image(&d, &id);
    assert_eq!(
        (i.asset.as_str(), i.source_asset.clone(), i.params()),
        (ORIG, None, ImageParams::default())
    );
    assert!(d.undo());
    let i = image(&d, &id);
    assert_eq!(
        (i.asset, i.source_asset.as_deref(), i.crop),
        (hash('1'), Some(ORIG), Some([10, 20, 160, 120]))
    );
}

/// B11 : sans `sourceAsset`, `restore` se comporte comme C5 (tous les champs retirés, même asset).
#[test]
fn restore_without_source_asset_is_c5_unchanged() {
    let (mut d, _, id) = retouched();
    d.apply(restore(&id)).expect("rétablir");
    let i = image(&d, &id);
    assert_eq!(
        (i.asset.as_str(), i.source_asset.clone(), i.params()),
        (ORIG, None, ImageParams::default())
    );
    assert!(
        d.apply(restore(&id)).expect("même état").ids.is_empty(),
        "image brute sans sourceAsset : aucune étape (D38)"
    );
}

/// B2 : même asset que l'actuel : aucune étape ; refus dans l'ordre couleur, page, élément de cette page, image
/// lisible, asset ; aucun refus n'écrit.
#[test]
fn same_asset_is_no_step_and_refusals_keep_core_order() {
    let (mut d, p, id) = retouched();
    let v = d.version();
    let same = AssetRef {
        id: ORIG.into(),
        name: "photo.jpg".into(),
        mime: "image/jpeg".into(),
        size: 3.0,
    };
    assert!(d
        .apply(fill(&p, &id, same, Some(YELLOW)))
        .expect("même asset")
        .ids
        .is_empty());
    assert_eq!(d.version(), v);
    let stroke = d
        .apply(Command::CommitStroke {
            page: p.clone(),
            points: vec![0.0, 0.0, 0.5, 50.0, 0.0, 0.5],
            style: pen(),
            look: Look::default(),
            cell: None,
        })
        .expect("trait")
        .ids[0]
        .clone();
    let other = d.add_page();
    let v = d.version();
    let bad = AssetRef {
        id: "x".into(),
        ..png(&hash('1'))
    };
    let cases = [
        (
            fill("nope", &id, png(&hash('1')), Some("#12")),
            CommandError::BadFill,
        ),
        (
            fill("nope", &id, png(&hash('1')), Some(YELLOW)),
            CommandError::UnknownPage("nope".into()),
        ),
        (
            fill(&p, "nope", png(&hash('1')), Some(YELLOW)),
            CommandError::UnknownElement("nope".into()),
        ),
        (
            fill(&other, &id, png(&hash('1')), Some(YELLOW)),
            CommandError::UnknownElement(id.clone()),
        ),
        (fill(&p, &stroke, bad.clone(), None), CommandError::BadFill),
        (fill(&p, &id, bad, None), CommandError::BadAsset),
    ];
    for (cmd, want) in cases {
        assert_eq!(d.apply(cmd), Err(want));
    }
    assert_eq!(d.version(), v, "aucun refus n'écrit");
}

/// S2 : le fichier cite l'original et la version courante seulement ; la métadonnée de la version intermédiaire reste
/// dans `assets` (C2 K3, aucun ménage implicite).
#[test]
fn saved_file_cites_original_and_current_and_keeps_intermediate_meta() {
    let (mut d, p, id) = retouched();
    d.apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("premier");
    d.apply(fill(&p, &id, png(&hash('2')), None))
        .expect("second");
    let want = sorted(vec![hash('2'), ORIG.to_string()]);
    assert_eq!(cited(&d), want);
    let r = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(cited(&r), want);
    assert_eq!(
        r.asset(&hash('1')).map(|a| a.mime),
        Some("image/png".to_string()),
        "métadonnée intermédiaire gardée (K3)"
    );
    assert_eq!(image(&r, &id).source_asset.as_deref(), Some(ORIG));
}

/// Effet de bord : copier-coller une image remplie emporte l'original et la version courante (`cited_by`).
#[test]
fn copy_paste_of_filled_image_carries_both_assets() {
    let (mut d, p, id) = retouched();
    d.apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("remplissage");
    let f = d.extract(&p, std::slice::from_ref(&id)).expect("extract");
    let mut t = Document::blank();
    let tp = t.page_ids()[0].clone();
    let pasted = t.insert_fragment(&f, &tp, 10.0, 0.0).expect("collage").ids[0].clone();
    assert_eq!(sorted(cited(&t)), sorted(vec![hash('1'), ORIG.to_string()]));
    assert_eq!(image(&t, &pasted).source_asset.as_deref(), Some(ORIG));
}

/// Review Focus RF3 : une image d'un groupe se remplit seule ; son groupe et l'autre membre restent (B19, C6a D4).
#[test]
fn grouped_image_fills_alone_and_keeps_its_group() {
    let (mut d, p, id) = retouched();
    let r = d
        .apply(Command::AddShape {
            page: p.clone(),
            shape: ShapeKind::Rect,
            x0: 0.0,
            y0: 0.0,
            x1: 50.0,
            y1: 50.0,
            style: pen(),
            fill: None,
            look: Look::default(),
        })
        .expect("forme")
        .ids[0]
        .clone();
    d.apply(Command::Group {
        ids: vec![id.clone(), r.clone()],
    })
    .expect("groupe");
    let group = d.element(&id).expect("vue").group;
    let rect = d.element(&r);
    let c = d
        .apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("remplissage");
    assert_eq!(c.ids, vec![id.clone()]);
    assert_eq!(d.element(&id).expect("vue").group, group);
    assert_eq!(d.element(&r), rect);
}
