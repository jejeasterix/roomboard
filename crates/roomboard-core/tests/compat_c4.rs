//! C4 (D2, D3, D21) : grille enregistrée en ressource `.rbitem` (`kind: "grid"`), refus croisés, `kind` inconnu.
use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{
    container_kind, load_fragment, load_parts, load_resource, load_resource_parts,
    load_with_manifest, manifest_kind, open, save, save_fragment, save_resource, FormatError,
    SaveMeta, KIND_DOCUMENT, KIND_FRAGMENT, KIND_GRID,
};
use roomboard_core::grid::{GridInput, GridLevelView};

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "c4-test".into(),
        now: "2026-11-21T08:00:00Z".into(),
        created: None,
    }
}

fn grid() -> GridInput {
    GridInput {
        visible: true,
        snap: false,
        above: false,
        levels: vec![GridLevelView {
            kind: "squares".into(),
            spacing_x: 40.0,
            spacing_y: 40.0,
            origin_x: 0.0,
            origin_y: 0.0,
            color: "#7aa7d8".into(),
            line: "solid".into(),
            line_width: 1.0,
            snap: false,
            visible: true,
        }],
    }
}

fn grid_doc() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    d.apply(Command::SetGrid {
        page: p,
        grid: Some(grid()),
    })
    .expect("SetGrid");
    d
}

#[test]
fn grid_resource_round_trips_with_same_bytes() {
    let bytes = save_resource(&grid_doc(), &meta(), KIND_GRID, "Seyès").expect("écrite");
    let (g, m) = load_resource(&bytes, KIND_GRID).expect("relue");
    assert_eq!(m.kind.as_deref(), Some(KIND_GRID));
    assert_eq!(m.name.as_deref(), Some("Seyès"));
    assert_eq!(m.bounds, None, "une grille n'a aucun élément");
    let p = g.page_ids()[0].clone();
    assert_eq!(g.page(&p).and_then(|v| v.grid), Some(grid()));
    let again = save_resource(
        &g,
        &SaveMeta {
            created: Some(m.created.clone()),
            ..meta()
        },
        KIND_GRID,
        "Seyès",
    )
    .expect("réécrite");
    assert_eq!(again, bytes, "un .rbitem de grille rechargé garde ses octets");
}

#[test]
fn grid_resource_is_refused_as_fragment_and_as_document() {
    let bytes = save_resource(&grid_doc(), &meta(), KIND_GRID, "Seyès").expect("écrite");
    let as_fragment = load_fragment(&bytes).err();
    assert_eq!(
        as_fragment,
        Some(FormatError::WrongKind {
            expected: KIND_FRAGMENT,
            found: KIND_GRID
        })
    );
    assert_eq!(
        as_fragment.unwrap().to_string(),
        "ce fichier est une grille RoomBoard : déposez-la sur une page"
    );
    assert_eq!(
        load_with_manifest(&bytes).err(),
        Some(FormatError::WrongKind {
            expected: KIND_DOCUMENT,
            found: KIND_GRID
        })
    );
}

#[test]
fn messages_of_before_c4_are_unchanged() {
    let frag = save_fragment(&Document::blank(), &meta(), "Sélection").expect("fragment");
    assert_eq!(
        load_with_manifest(&frag).err().map(|e| e.to_string()).as_deref(),
        Some("ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page")
    );
    let doc = save(&Document::blank(), &meta()).expect("document");
    assert_eq!(
        load_fragment(&doc).err().map(|e| e.to_string()).as_deref(),
        Some("ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages")
    );
    assert_eq!(
        load_resource(&doc, KIND_GRID).err(),
        Some(FormatError::WrongKind {
            expected: KIND_GRID,
            found: KIND_DOCUMENT
        })
    );
}

/// Distingue le patron interdit « message choisi sur `expected` » (`format/mod.rs:90-96` avant C4) : pour chacune
/// des six paires (type du fichier, type attendu) différentes, le message nomme ce que le fichier **est**, quel que
/// soit l'attendu, par le conteneur entier comme par ses deux moitiés. Sous l'ancien patron, une grille lue comme
/// fragment se dirait « document », lue comme document se dirait « objet », et un document lu comme grille « objet ».
#[test]
fn wrong_kind_message_names_what_the_file_is() {
    const DOC: &str = "ce fichier est un document RoomBoard (.roomboard), pas un objet : ouvrez-le ou insérez ses pages";
    const OBJ: &str =
        "ce fichier est un objet RoomBoard (.rbitem) : déposez-le ou importez-le sur une page";
    const GRID: &str = "ce fichier est une grille RoomBoard : déposez-la sur une page";
    let files = [
        (
            KIND_DOCUMENT,
            save(&Document::blank(), &meta()).expect("document"),
            DOC,
        ),
        (
            KIND_FRAGMENT,
            save_fragment(&Document::blank(), &meta(), "x").expect("fragment"),
            OBJ,
        ),
        (
            KIND_GRID,
            save_resource(&grid_doc(), &meta(), KIND_GRID, "Seyès").expect("grille"),
            GRID,
        ),
    ];
    for (found, bytes, message) in &files {
        let found: &'static str = found;
        for expected in [KIND_DOCUMENT, KIND_FRAGMENT, KIND_GRID] {
            if expected == found {
                continue;
            }
            let whole = if expected == KIND_DOCUMENT {
                load_with_manifest(bytes).err()
            } else {
                load_resource(bytes, expected).err()
            };
            assert_eq!(
                whole,
                Some(FormatError::WrongKind { expected, found }),
                "{found} lu comme {expected}"
            );
            assert_eq!(
                whole.unwrap().to_string(),
                *message,
                "{found} lu comme {expected}"
            );
            let o = open(bytes).expect("open accepte tout type connu");
            let halves = if expected == KIND_DOCUMENT {
                load_parts(&o.parts.manifest, &o.parts.ybin).err()
            } else {
                load_resource_parts(&o.parts.manifest, &o.parts.ybin, expected).err()
            };
            assert_eq!(
                halves,
                Some(FormatError::WrongKind { expected, found }),
                "{found} lu comme {expected}, par moitiés"
            );
        }
    }
}

#[test]
fn manifest_and_container_kind() {
    let g = save_resource(&grid_doc(), &meta(), KIND_GRID, "Seyès").expect("grille");
    assert_eq!(container_kind(&g), Ok(KIND_GRID));
    let d = save(&Document::blank(), &meta()).expect("document");
    assert_eq!(container_kind(&d), Ok(KIND_DOCUMENT));
    let f = save_fragment(&Document::blank(), &meta(), "x").expect("fragment");
    assert_eq!(container_kind(&f), Ok(KIND_FRAGMENT));
    let pack = br#"{"format":"roomboard","formatVersion":1,"schema":1,"appVersion":"x","created":"c","modified":"m","kind":"pack"}"#;
    let e = manifest_kind(pack).err();
    assert_eq!(
        e,
        Some(FormatError::UnknownKind {
            found: "pack".into()
        })
    );
    assert_eq!(
        e.unwrap().to_string(),
        "ce fichier est un paquet RoomBoard (.rbpack) : importez-le dans la bibliothèque"
    );
    let autre = manifest_kind(br#"{"format":"roomboard","formatVersion":1,"schema":1,"appVersion":"x","created":"c","modified":"m","kind":"autre"}"#);
    assert_eq!(
        autre.err().map(|e| e.to_string()).as_deref(),
        Some("type de fichier RoomBoard inconnu (« autre ») : pris en charge dans une prochaine version")
    );
}

#[test]
fn save_resource_refuses_a_document_kind() {
    assert!(matches!(
        save_resource(&Document::blank(), &meta(), KIND_DOCUMENT, "x"),
        Err(FormatError::Corrupt(_))
    ));
}
